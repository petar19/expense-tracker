<script lang="ts">
  import {
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    writeBatch,
  } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { allowedRole, currentUser } from '../../lib/stores/auth';
  import { myGroups } from '../../lib/stores/groups';
  import { categories as categoriesStore } from '../../lib/stores/categories';
  import { parseWhatsAppExport, type FailedLine, type ParsedLine } from '../../lib/utils/parsing/whatsapp';
  import { convertIfNeeded, needsConversion } from '../../lib/utils/currency';
  import { normalizeText } from '../../lib/utils/normalize';
  import { suggestCategories, AUTO_CHECK_THRESHOLD } from '../../lib/utils/categorize';
  import { LEGACY_CATEGORIES, LEGACY_FIXES } from './legacyData';

  let fileName = $state('');
  let parsed = $state<ParsedLine[]>([]);
  let failed = $state<FailedLine[]>([]);
  let targetGroupId = $state('');
  let spenderMap = $state<Record<string, string>>({});
  let alreadyImported = $state(false);
  let checkingImportStatus = $state(false);
  let importing = $state(false);
  let importProgress = $state('');
  let importDone = $state(false);
  let skipped = $state<Set<number>>(new Set());
  let manualResolveDrafts = $state<Record<number, { date: string; spender: string; place: string; amount: string }>>({});

  $effect(() => {
    for (const line of failed) {
      manualResolveDrafts[line.lineNumber] ??= { date: '', spender: '', place: '', amount: '' };
    }
  });

  let targetGroup = $derived($myGroups.find((g) => g.id === targetGroupId) ?? null);
  let distinctSpenders = $derived([...new Set(parsed.map((p) => p.spender))].sort());
  let allSpendersMapped = $derived(
    distinctSpenders.length > 0 && distinctSpenders.every((s) => spenderMap[s]),
  );
  let activeParsed = $derived(parsed.filter((_, i) => !skipped.has(i)));
  let convertedCount = $derived(activeParsed.filter((p) => needsConversion(p.date)).length);

  $effect(() => {
    if (!targetGroupId) return;
    checkingImportStatus = true;
    getDoc(doc(db, 'groups', targetGroupId, 'migrationRuns', 'legacy-import')).then((snap) => {
      alreadyImported = snap.exists();
      checkingImportStatus = false;
    });
  });

  async function handleFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    fileName = file.name;
    const text = await file.text();
    const result = parseWhatsAppExport(text, LEGACY_FIXES);
    parsed = result.parsed;
    failed = result.failed;
    skipped = new Set();
    importDone = false;
  }

  function resolveManually(line: FailedLine) {
    const draft = manualResolveDrafts[line.lineNumber];
    if (!draft) return;
    const amount = parseFloat(draft.amount);
    if (!draft.date || !draft.place.trim() || Number.isNaN(amount) || amount <= 0) return;
    parsed = [
      ...parsed,
      {
        lineNumber: line.lineNumber,
        raw: line.raw,
        date: draft.date,
        time: '00:00',
        spender: draft.spender.trim(),
        place: draft.place.trim(),
        amount,
      },
    ];
    failed = failed.filter((f) => f.lineNumber !== line.lineNumber);
    delete manualResolveDrafts[line.lineNumber];
  }

  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async function runImport() {
    if (!targetGroup || !$currentUser) return;
    importing = true;
    importDone = false;
    try {
      // 1. Seed legacy categories if this project has none yet.
      importProgress = 'Checking categories…';
      const existingCategories = await getDocs(collection(db, 'categories'));
      let liveCategories = $categoriesStore;
      if (existingCategories.empty) {
        const catBatch = writeBatch(db);
        const newCats: { id: string; name: string; keywords: string[] }[] = [];
        for (const cat of LEGACY_CATEGORIES) {
          const ref = doc(collection(db, 'categories'));
          catBatch.set(ref, { name: cat.name, keywords: cat.keywords });
          newCats.push({ id: ref.id, ...cat });
        }
        await catBatch.commit();
        liveCategories = newCats;
      }

      // 2. Write expenses in batches of 400.
      const rows = activeParsed;
      const batches = chunk(rows, 400);
      let written = 0;
      const nameCounts = new Map<string, { displayName: string; count: number }>();

      for (const batchRows of batches) {
        const batch = writeBatch(db);
        for (const row of batchRows) {
          const paidBy = spenderMap[row.spender];
          const price = convertIfNeeded(row.date, row.amount);
          const catScores = suggestCategories(row.place, liveCategories);
          const autoCategories = catScores
            .filter((s) => s.score >= AUTO_CHECK_THRESHOLD)
            .map((s) => s.categoryId);

          const ref = doc(collection(db, 'groups', targetGroup.id, 'expenses'));
          batch.set(ref, {
            name: row.place,
            price,
            paidBy,
            categories: autoCategories,
            date: row.date,
            location: null,
            subitems: [],
            createdBy: $currentUser.uid,
            createdAt: Date.now(),
            source: 'migrated',
          });

          const key = normalizeText(row.place);
          if (key) {
            const existing = nameCounts.get(key);
            nameCounts.set(key, { displayName: row.place, count: (existing?.count ?? 0) + 1 });
          }
        }
        await batch.commit();
        written += batchRows.length;
        importProgress = `Imported ${written} / ${rows.length} expenses…`;
      }

      // 3. Seed knownNames.
      importProgress = 'Seeding autocomplete names…';
      const nameBatches = chunk([...nameCounts.entries()], 400);
      for (const batchEntries of nameBatches) {
        const batch = writeBatch(db);
        for (const [key, { displayName, count }] of batchEntries) {
          batch.set(
            doc(db, 'groups', targetGroup.id, 'knownNames', key),
            { displayName, count: increment(count), lastUsed: Date.now() },
            { merge: true },
          );
        }
        await batch.commit();
      }

      // 4. Mark this group as migrated.
      await writeBatch(db)
        .set(doc(db, 'groups', targetGroup.id, 'migrationRuns', 'legacy-import'), {
          importedAt: Date.now(),
          rowCount: rows.length,
          importedBy: $currentUser.uid,
        })
        .commit();

      alreadyImported = true;
      importDone = true;
      importProgress = `Done — imported ${rows.length} expenses.`;
    } catch (e) {
      importProgress = `Failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      importing = false;
    }
  }
</script>

<div class="page stack">
  <h2>Migrate old WhatsApp export</h2>

  {#if $allowedRole !== 'admin'}
    <p class="muted">Admins only.</p>
  {:else}
    <div class="card stack">
      <label>
        Target group
        <select bind:value={targetGroupId}>
          <option value="">Choose a group…</option>
          {#each $myGroups as group (group.id)}
            <option value={group.id}>{group.name}</option>
          {/each}
        </select>
      </label>
      {#if checkingImportStatus}
        <p class="muted">Checking import history…</p>
      {:else if alreadyImported}
        <p class="muted" style="color: var(--danger)">
          This group already has a completed legacy import. Running it again will add
          duplicate expenses.
        </p>
      {/if}
    </div>

    <div class="card stack">
      <label>
        WhatsApp export (.txt)
        <input type="file" accept=".txt" onchange={handleFile} />
      </label>
      {#if fileName}
        <p class="muted">
          {fileName}: {parsed.length} lines parsed, {failed.length} need review.
        </p>
      {/if}
    </div>

    {#if failed.length > 0}
      <div class="card stack">
        <h3 style="margin:0">Needs review ({failed.length})</h3>
        <div class="stack" style="max-height:300px; overflow-y:auto">
          {#each failed as line (line.lineNumber)}
            <div class="row" style="align-items:flex-start">
              <span class="muted" style="min-width:3em">#{line.lineNumber}</span>
              <code style="flex:1">{line.raw}</code>
            </div>
            {#if manualResolveDrafts[line.lineNumber]}
              <form
                class="row"
                onsubmit={(e) => { e.preventDefault(); resolveManually(line); }}
              >
                <input type="date" placeholder="date" bind:value={manualResolveDrafts[line.lineNumber].date} />
                <input placeholder="spender" bind:value={manualResolveDrafts[line.lineNumber].spender} />
                <input placeholder="place" bind:value={manualResolveDrafts[line.lineNumber].place} />
                <input
                  placeholder="amount"
                  type="number"
                  step="0.01"
                  bind:value={manualResolveDrafts[line.lineNumber].amount}
                />
                <button type="submit">Resolve</button>
              </form>
            {/if}
          {/each}
        </div>
      </div>
    {/if}

    {#if distinctSpenders.length > 0}
      <div class="card stack">
        <h3 style="margin:0">Map spenders to group members</h3>
        {#each distinctSpenders as spender (spender)}
          <div class="row" style="justify-content: space-between">
            <span>{spender}</span>
            <select bind:value={spenderMap[spender]}>
              <option value="">— unmapped —</option>
              {#if targetGroup}
                {#each Object.entries(targetGroup.members) as [uid, member] (uid)}
                  <option value={uid}>{member.displayName}</option>
                {/each}
              {/if}
            </select>
          </div>
        {/each}
      </div>
    {/if}

    {#if parsed.length > 0}
      <div class="card stack">
        <h3 style="margin:0">Parsed rows ({activeParsed.length} of {parsed.length})</h3>
        <p class="muted">{convertedCount} will be converted from HRK to EUR (peg 7.5345).</p>
        <div class="stack" style="max-height:400px; overflow-y:auto">
          {#each parsed as row, i (row.lineNumber + row.raw)}
            <div class="row" style={skipped.has(i) ? 'opacity:0.4' : ''}>
              <input type="checkbox" checked={!skipped.has(i)} onchange={() => {
                const next = new Set(skipped);
                if (next.has(i)) next.delete(i); else next.add(i);
                skipped = next;
              }} />
              <input type="date" bind:value={row.date} style="width:9em" />
              <input bind:value={row.place} style="flex:1" />
              <input type="number" step="0.01" bind:value={row.amount} style="width:6em" />
              <span class="muted" style="min-width:5em">{row.spender}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if parsed.length > 0 && targetGroup}
      <div class="card stack">
        <button
          class="primary"
          disabled={!allSpendersMapped || importing}
          onclick={runImport}
        >
          {importing ? 'Importing…' : `Import ${activeParsed.length} expenses`}
        </button>
        {#if !allSpendersMapped}
          <p class="muted">Map every spender to a group member first.</p>
        {/if}
        {#if importProgress}<p class="muted">{importProgress}</p>{/if}
        {#if importDone}<p class="muted" style="color: var(--success)">Import complete.</p>{/if}
      </div>
    {/if}
  {/if}
</div>
