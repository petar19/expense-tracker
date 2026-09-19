<script lang="ts">
  import { doc, writeBatch, collection } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { activeGroup } from '../../lib/stores/groups';
  import { currentUser } from '../../lib/stores/auth';
  import { fetchAllExpenses } from '../../lib/stores/expenses';
  import { filterExpenses } from '../../lib/utils/stats';
  import { expenseImportFileSchema } from '../../lib/utils/validation';
  import { t } from '../../lib/i18n';

  let from = $state('');
  let to = $state('');
  let importResult = $state('');
  let importing = $state(false);
  let exporting = $state(false);

  // Export (any date range) and import (which needs every existing id to
  // dedupe against) both need the group's *complete* history — fetched fresh
  // here rather than read from the live expenses store, which defaults to a
  // recent window to save reads and may not have widened yet by the time
  // either action runs.
  async function handleExport() {
    if (!$activeGroup) return;
    exporting = true;
    try {
      const all = await fetchAllExpenses($activeGroup.id);
      const rows = filterExpenses(all, { from: from || undefined, to: to || undefined });
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const rangeLabel = from || to ? `_${from || 'start'}_to_${to || 'now'}` : '';
      a.href = url;
      a.download = `${$activeGroup.name.replace(/\s+/g, '-')}${rangeLabel}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      exporting = false;
    }
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
        importResult = $t('exportImport.invalidFile', {
          message: result.error.issues[0]?.message ?? $t('exportImport.schemaMismatch'),
        });
        return;
      }

      const allExisting = await fetchAllExpenses($activeGroup.id);
      const existingIds = new Set(allExisting.map((e) => e.id));
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

      importResult = $t('exportImport.importResult', { count: toImport.length, skipped: skippedCount });
    } catch (err) {
      importResult = $t('exportImport.importFailed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      importing = false;
      input.value = '';
    }
  }
</script>

<div class="page stack">
  <h2>{$t('exportImport.title')}</h2>

  {#if !$activeGroup}
    <p class="muted">{$t('exportImport.pickGroup')}</p>
  {:else}
    <div class="card stack">
      <h3 style="margin:0">{$t('exportImport.exportTitle')}</h3>
      <p class="muted">{$t('exportImport.exportHint')}</p>
      <div class="row">
        <label>{$t('stats.from')} <input type="date" bind:value={from} /></label>
        <label>{$t('stats.to')} <input type="date" bind:value={to} /></label>
      </div>
      <button class="primary" onclick={handleExport} disabled={exporting}>
        {exporting ? $t('exportImport.exporting') : $t('exportImport.download')}
      </button>
    </div>

    <div class="card stack">
      <h3 style="margin:0">{$t('exportImport.importTitle')}</h3>
      <p class="muted">{$t('exportImport.importHint')}</p>
      <input type="file" accept=".json" onchange={handleImportFile} disabled={importing} />
      {#if importResult}<p class="muted">{importResult}</p>{/if}
    </div>
  {/if}
</div>
