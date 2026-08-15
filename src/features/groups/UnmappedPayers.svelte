<script lang="ts">
  import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { t } from '../../lib/i18n';
  import type { Group } from '../../lib/types';

  let { group }: { group: Group } = $props();

  interface UnmappedEntry {
    name: string;
    count: number;
    docIds: string[];
  }

  let loading = $state(false);
  let checked = $state(false);
  let entries = $state<UnmappedEntry[]>([]);
  let selection = $state<Record<string, string>>({});
  let applying = $state<Record<string, boolean>>({});
  let error = $state('');

  async function load() {
    loading = true;
    error = '';
    try {
      const snap = await getDocs(collection(db, 'groups', group.id, 'expenses'));
      const byName = new Map<string, string[]>();
      for (const d of snap.docs) {
        const paidBy = d.data().paidBy as string;
        if (paidBy in group.members) continue;
        byName.set(paidBy, [...(byName.get(paidBy) ?? []), d.id]);
      }
      entries = [...byName.entries()]
        .map(([name, docIds]) => ({ name, count: docIds.length, docIds }))
        .sort((a, b) => b.count - a.count);
      checked = true;
    } catch (e) {
      error = e instanceof Error ? e.message : $t('unmapped.checkFailed');
    } finally {
      loading = false;
    }
  }

  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async function applyMapping(entry: UnmappedEntry) {
    const uid = selection[entry.name];
    if (!uid) return;
    applying[entry.name] = true;
    try {
      for (const idsBatch of chunk(entry.docIds, 400)) {
        const batch = writeBatch(db);
        for (const id of idsBatch) {
          batch.update(doc(db, 'groups', group.id, 'expenses', id), { paidBy: uid });
        }
        await batch.commit();
      }
      entries = entries.filter((e) => e.name !== entry.name);
    } catch (e) {
      error = e instanceof Error ? e.message : $t('unmapped.applyFailed');
    } finally {
      applying[entry.name] = false;
    }
  }
</script>

<div class="card stack">
  <h3 style="margin:0">{$t('unmapped.title')}</h3>
  <p class="muted">{$t('unmapped.description')}</p>

  {#if !checked}
    <button onclick={load} disabled={loading}>{loading ? $t('unmapped.checking') : $t('unmapped.check')}</button>
  {:else if entries.length === 0}
    <p class="muted">{$t('unmapped.none')}</p>
  {:else}
    <div class="stack">
      {#each entries as entry (entry.name)}
        <div class="row" style="justify-content: space-between">
          <span>{entry.name} <span class="muted">({$t('unmapped.expenseCount', { count: entry.count })})</span></span>
          <div class="row">
            <select bind:value={selection[entry.name]}>
              <option value="">{$t('unmapped.mapTo')}</option>
              {#each Object.entries(group.members) as [uid, member] (uid)}
                <option value={uid}>{member.displayName}</option>
              {/each}
            </select>
            <button
              disabled={!selection[entry.name] || applying[entry.name]}
              onclick={() => applyMapping(entry)}
            >
              {applying[entry.name] ? $t('unmapped.applying') : $t('unmapped.apply')}
            </button>
          </div>
        </div>
      {/each}
    </div>
    <button onclick={load} disabled={loading}>{$t('unmapped.recheck')}</button>
  {/if}
  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}
</div>
