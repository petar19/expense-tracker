<script lang="ts">
  import { doc, writeBatch, collection } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { activeGroup } from '../../lib/stores/groups';
  import { currentUser } from '../../lib/stores/auth';
  import { expenses } from '../../lib/stores/expenses';
  import { filterExpenses } from '../../lib/utils/stats';
  import { expenseImportFileSchema } from '../../lib/utils/validation';

  let from = $state('');
  let to = $state('');
  let importResult = $state('');
  let importing = $state(false);

  function handleExport() {
    if (!$activeGroup) return;
    const rows = filterExpenses($expenses, { from: from || undefined, to: to || undefined });
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const rangeLabel = from || to ? `_${from || 'start'}_to_${to || 'now'}` : '';
    a.href = url;
    a.download = `${$activeGroup.name.replace(/\s+/g, '-')}${rangeLabel}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async function handleImportFile(e: Event) {
    if (!$activeGroup || !$currentUser) return;
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importing = true;
    importResult = '';
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = expenseImportFileSchema.safeParse(json);
      if (!result.success) {
        importResult = `Invalid file: ${result.error.issues[0]?.message ?? 'schema mismatch'}`;
        return;
      }

      const existingIds = new Set($expenses.map((e) => e.id));
      const toImport = result.data.filter((row) => !existingIds.has(row.id));
      const skippedCount = result.data.length - toImport.length;

      for (const batchRows of chunk(toImport, 400)) {
        const batch = writeBatch(db);
        for (const row of batchRows) {
          const { id, createdBy: _createdBy, source: _source, ...data } = row;
          batch.set(doc(collection(db, 'groups', $activeGroup.id, 'expenses'), id), {
            ...data,
            createdBy: $currentUser.uid,
            source: 'manual',
          });
        }
        await batch.commit();
      }

      importResult = `Imported ${toImport.length} expenses (${skippedCount} already existed, skipped).`;
    } catch (err) {
      importResult = `Failed: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      importing = false;
      input.value = '';
    }
  }
</script>

<div class="page stack">
  <h2>Export / Import</h2>

  {#if !$activeGroup}
    <p class="muted">Pick an active group first.</p>
  {:else}
    <div class="card stack">
      <h3 style="margin:0">Export</h3>
      <p class="muted">Leave dates blank to export everything.</p>
      <div class="row">
        <label>From <input type="date" bind:value={from} /></label>
        <label>To <input type="date" bind:value={to} /></label>
      </div>
      <button class="primary" onclick={handleExport}>Download JSON</button>
    </div>

    <div class="card stack">
      <h3 style="margin:0">Import</h3>
      <p class="muted">
        Upload a JSON file previously exported from this app. Expenses whose id
        already exists in this group are skipped.
      </p>
      <input type="file" accept=".json" onchange={handleImportFile} disabled={importing} />
      {#if importResult}<p class="muted">{importResult}</p>{/if}
    </div>
  {/if}
</div>
