<script lang="ts">
  import { onMount } from 'svelte';
  import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { t } from '../../lib/i18n';
  import type { BotStatus, ChatFolderMapping, DiscoveredWhatsAppGroup } from '../../lib/types';

  let botStatus = $state<BotStatus | null>(null);
  let discoveredGroups = $state<DiscoveredWhatsAppGroup[]>([]);
  let mappings = $state<ChatFolderMapping[]>([]);
  let loading = $state(true);
  let error = $state('');

  let selectedJid = $state('');
  let folderPath = $state('');
  let label = $state('');
  let saving = $state(false);

  const BOT_ONLINE_WINDOW_MS = 10 * 60 * 1000;
  let botOnline = $derived(
    botStatus !== null && Date.now() - botStatus.lastSeenAt < BOT_ONLINE_WINDOW_MS,
  );

  function groupName(jid: string): string {
    return discoveredGroups.find((g) => g.jid === jid)?.subject ?? jid;
  }

  // A chat already mapped shouldn't be offered again in the "add" dropdown.
  let availableGroups = $derived(
    discoveredGroups.filter((g) => !mappings.some((m) => m.whatsappGroupJid === g.jid)),
  );

  onMount(() => {
    const unsubs = [
      onSnapshot(doc(db, 'botStatus', 'whatsapp'), (snap) => {
        botStatus = snap.exists() ? (snap.data() as BotStatus) : null;
      }),
      onSnapshot(collection(db, 'whatsappGroups'), (snap) => {
        discoveredGroups = snap.docs.map((d) => d.data() as DiscoveredWhatsAppGroup);
      }),
      onSnapshot(
        collection(db, 'chatFolderMappings'),
        (snap) => {
          mappings = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatFolderMapping, 'id'>) }));
          loading = false;
        },
        () => {
          loading = false;
        },
      ),
    ];
    return () => unsubs.forEach((u) => u());
  });

  async function addMapping() {
    if (!selectedJid || !folderPath.trim()) return;
    error = '';
    saving = true;
    try {
      await setDoc(doc(collection(db, 'chatFolderMappings')), {
        whatsappGroupJid: selectedJid,
        folderPath: folderPath.trim(),
        label: label.trim() || undefined,
      });
      selectedJid = '';
      folderPath = '';
      label = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to add mapping';
    } finally {
      saving = false;
    }
  }

  async function removeMapping(id: string) {
    if (!confirm($t('chatFolders.removeConfirm'))) return;
    error = '';
    try {
      await deleteDoc(doc(db, 'chatFolderMappings', id));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to remove mapping';
    }
  }
</script>

<div class="page stack">
  <div class="row" style="justify-content: space-between">
    <h2 style="margin:0">{$t('chatFolders.title')}</h2>
    <span class="muted">
      {#if botStatus === null}
        {$t('whatsappBridge.statusUnknown')}
      {:else if botOnline}
        🟢 {$t('whatsappBridge.statusOnline')}
      {:else}
        🔴 {$t('whatsappBridge.statusOffline')}
      {/if}
    </span>
  </div>
  <p class="muted">{$t('chatFolders.description')}</p>

  {#if loading}
    <p class="muted">{$t('common.loading')}</p>
  {:else}
    {#if mappings.length > 0}
      <div class="stack">
        {#each mappings as mapping (mapping.id)}
          <div class="card row" style="justify-content: space-between">
            <div>
              <strong>{mapping.label || groupName(mapping.whatsappGroupJid)}</strong>
              <div class="muted">{groupName(mapping.whatsappGroupJid)} → {mapping.folderPath}</div>
            </div>
            <button class="danger" onclick={() => removeMapping(mapping.id)}>{$t('common.remove')}</button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="card stack">
      <h3 style="margin:0">{$t('chatFolders.addTitle')}</h3>
      {#if discoveredGroups.length === 0}
        <p class="muted">{$t('whatsappBridge.noGroupsDiscovered')}</p>
      {:else if availableGroups.length === 0}
        <p class="muted">{$t('chatFolders.allGroupsMapped')}</p>
      {:else}
        <label>
          {$t('chatFolders.chooseGroup')}
          <select bind:value={selectedJid}>
            <option value="">{$t('whatsappBridge.chooseGroup')}</option>
            {#each availableGroups as g (g.jid)}
              <option value={g.jid}>{g.subject}</option>
            {/each}
          </select>
        </label>
        <label>
          {$t('chatFolders.folderPath')}
          <input placeholder="/home/komp/Documents/Računi" bind:value={folderPath} />
        </label>
        <label>
          {$t('chatFolders.label')} <span class="muted">{$t('expenseForm.optional')}</span>
          <input bind:value={label} />
        </label>
        <div class="row">
          <button class="primary" disabled={!selectedJid || !folderPath.trim() || saving} onclick={addMapping}>
            {$t('common.save')}
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}
</div>
