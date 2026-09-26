<script lang="ts">
  import { onMount } from 'svelte';
  import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { allowedRole } from '../../lib/stores/auth';
  import { t } from '../../lib/i18n';
  import { DEFAULT_OCR_INSTRUCTION } from '../../lib/utils/ocrInstruction';
  import type { BotStatus, DiscoveredWhatsAppGroup, Group, PhotoSavingConfig } from '../../lib/types';

  let { group }: { group: Group } = $props();

  // photoSavingConfig exposes a raw filesystem path on the bot's machine, so
  // it's site-admin only (unlike whatsappIntegrations, which any group admin
  // can edit) — a non-site-admin group admin would get a permission-denied
  // error from Firestore if this even tried to read it, so it's gated here
  // before that ever happens.
  let isSiteAdmin = $derived($allowedRole === 'admin');

  let botStatus = $state<BotStatus | null>(null);
  let discoveredGroups = $state<DiscoveredWhatsAppGroup[]>([]);
  let config = $state<PhotoSavingConfig | null>(null);
  let loading = $state(true);
  let error = $state('');

  let selectedJid = $state('');
  let folderPathDraft = $state('');
  let instructionDraft = $state('');
  let saved = $state(false);

  const BOT_ONLINE_WINDOW_MS = 10 * 60 * 1000;
  let botOnline = $derived(
    botStatus !== null && Date.now() - botStatus.lastSeenAt < BOT_ONLINE_WINDOW_MS,
  );

  function groupName(jid: string): string {
    return discoveredGroups.find((g) => g.jid === jid)?.subject ?? jid;
  }

  onMount(() => {
    if (!isSiteAdmin) {
      loading = false;
      return;
    }
    const unsubs = [
      onSnapshot(doc(db, 'botStatus', 'whatsapp'), (snap) => {
        botStatus = snap.exists() ? (snap.data() as BotStatus) : null;
      }),
      onSnapshot(collection(db, 'whatsappGroups'), (snap) => {
        discoveredGroups = snap.docs.map((d) => d.data() as DiscoveredWhatsAppGroup);
      }),
      onSnapshot(
        doc(db, 'photoSavingConfig', group.id),
        (snap) => {
          config = snap.exists() ? (snap.data() as PhotoSavingConfig) : null;
          folderPathDraft = config?.folderPath ?? '';
          instructionDraft = config?.ocrInstruction ?? '';
          loading = false;
        },
        () => {
          loading = false;
        },
      ),
    ];
    return () => unsubs.forEach((u) => u());
  });

  async function linkGroup() {
    if (!selectedJid) return;
    error = '';
    try {
      await setDoc(
        doc(db, 'photoSavingConfig', group.id),
        { whatsappGroupJid: selectedJid, folderPath: config?.folderPath ?? '', ocrEnabled: config?.ocrEnabled ?? false },
        { merge: true },
      );
      selectedJid = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to link';
    }
  }

  async function unlinkGroup() {
    error = '';
    try {
      await updateDoc(doc(db, 'photoSavingConfig', group.id), { whatsappGroupJid: null });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to unlink';
    }
  }

  async function saveFolderPath() {
    error = '';
    try {
      await setDoc(doc(db, 'photoSavingConfig', group.id), { folderPath: folderPathDraft.trim() }, { merge: true });
      saved = true;
      setTimeout(() => (saved = false), 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save folder path';
    }
  }

  async function toggleOcr() {
    if (!config) return;
    error = '';
    try {
      await setDoc(doc(db, 'photoSavingConfig', group.id), { ocrEnabled: !config.ocrEnabled }, { merge: true });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to update OCR setting';
    }
  }

  async function saveInstruction() {
    error = '';
    try {
      const value = instructionDraft.trim();
      await setDoc(
        doc(db, 'photoSavingConfig', group.id),
        { ocrInstruction: value || undefined },
        { merge: true },
      );
      saved = true;
      setTimeout(() => (saved = false), 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save instruction';
    }
  }
</script>

<div class="card stack">
  <div class="row" style="justify-content: space-between">
    <h3 style="margin:0">{$t('photoSaving.title')}</h3>
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

  {#if !isSiteAdmin}
    <p class="muted">{$t('photoSaving.siteAdminOnly')}</p>
  {:else if loading}
    <p class="muted">{$t('common.loading')}</p>
  {:else if config?.whatsappGroupJid}
    <div class="row" style="justify-content: space-between">
      <span>{$t('whatsappBridge.linkedTo', { name: groupName(config.whatsappGroupJid) })}</span>
      <button onclick={unlinkGroup}>{$t('whatsappBridge.unlink')}</button>
    </div>

    <label>
      {$t('photoSaving.folderPath')}
      <input bind:value={folderPathDraft} placeholder="/home/user/Documents/Bills" />
    </label>
    <div class="row">
      <button onclick={saveFolderPath}>{$t('common.save')}</button>
      {#if saved}<span class="muted">{$t('whatsappBridge.templateSaved')}</span>{/if}
    </div>

    <label class="row">
      <input type="checkbox" checked={config.ocrEnabled} onchange={toggleOcr} />
      {$t('photoSaving.ocrEnabled')}
    </label>

    {#if config.ocrEnabled}
      <label>
        {$t('photoSaving.ocrInstruction')}
        <textarea rows="3" placeholder={DEFAULT_OCR_INSTRUCTION} bind:value={instructionDraft}></textarea>
      </label>
      <p class="muted">{$t('photoSaving.ocrInstructionHint')}</p>
      <div class="row">
        <button onclick={saveInstruction}>{$t('common.save')}</button>
      </div>
    {/if}
  {:else}
    <p class="muted">{$t('whatsappBridge.notLinked')}</p>
    {#if discoveredGroups.length === 0}
      <p class="muted">{$t('whatsappBridge.noGroupsDiscovered')}</p>
    {:else}
      <div class="row">
        <select bind:value={selectedJid}>
          <option value="">{$t('whatsappBridge.chooseGroup')}</option>
          {#each discoveredGroups as g (g.jid)}
            <option value={g.jid}>{g.subject}</option>
          {/each}
        </select>
        <button class="primary" disabled={!selectedJid} onclick={linkGroup}>{$t('whatsappBridge.link')}</button>
      </div>
    {/if}
  {/if}

  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}
</div>
