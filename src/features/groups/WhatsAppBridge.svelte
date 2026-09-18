<script lang="ts">
  import { onMount } from 'svelte';
  import {
    collection,
    deleteDoc,
    deleteField,
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
  } from 'firebase/firestore';
  import { db } from '../../lib/firebase';
  import { t } from '../../lib/i18n';
  import { DEFAULT_ANNOUNCEMENT_TEMPLATE } from '../../lib/utils/template';
  import type {
    BotStatus,
    DiscoveredWhatsAppGroup,
    Group,
    UnmappedWhatsAppSender,
    WhatsAppIntegration,
  } from '../../lib/types';

  let { group }: { group: Group } = $props();

  let botStatus = $state<BotStatus | null>(null);
  let discoveredGroups = $state<DiscoveredWhatsAppGroup[]>([]);
  let integration = $state<WhatsAppIntegration | null>(null);
  let unmappedSenders = $state<UnmappedWhatsAppSender[]>([]);
  let loading = $state(true);
  let error = $state('');

  let selectedJid = $state('');
  let senderSelection = $state<Record<string, string>>({});
  let templateDraft = $state('');
  let templateSaved = $state(false);

  const BOT_ONLINE_WINDOW_MS = 10 * 60 * 1000;
  let botOnline = $derived(
    botStatus !== null && Date.now() - botStatus.lastSeenAt < BOT_ONLINE_WINDOW_MS,
  );

  function groupName(jid: string): string {
    return discoveredGroups.find((g) => g.jid === jid)?.subject ?? jid;
  }

  onMount(() => {
    const unsubs = [
      onSnapshot(doc(db, 'botStatus', 'whatsapp'), (snap) => {
        botStatus = snap.exists() ? (snap.data() as BotStatus) : null;
      }),
      onSnapshot(collection(db, 'whatsappGroups'), (snap) => {
        discoveredGroups = snap.docs.map((d) => d.data() as DiscoveredWhatsAppGroup);
      }),
      onSnapshot(
        doc(db, 'whatsappIntegrations', group.id),
        (snap) => {
          integration = snap.exists() ? (snap.data() as WhatsAppIntegration) : null;
          templateDraft = integration?.announcementTemplate ?? '';
          loading = false;
        },
        () => {
          loading = false;
        },
      ),
      onSnapshot(collection(db, 'whatsappIntegrations', group.id, 'unmappedSenders'), (snap) => {
        unmappedSenders = snap.docs.map((d) => d.data() as UnmappedWhatsAppSender);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  });

  async function linkGroup() {
    if (!selectedJid) return;
    error = '';
    try {
      await setDoc(
        doc(db, 'whatsappIntegrations', group.id),
        { whatsappGroupJid: selectedJid, senderMap: integration?.senderMap ?? {} },
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
      await updateDoc(doc(db, 'whatsappIntegrations', group.id), { whatsappGroupJid: null });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to unlink';
    }
  }

  async function mapSender(sender: UnmappedWhatsAppSender) {
    const uid = senderSelection[sender.jid];
    if (!uid) return;
    error = '';
    try {
      await setDoc(
        doc(db, 'whatsappIntegrations', group.id),
        { senderMap: { ...(integration?.senderMap ?? {}), [sender.jid]: uid } },
        { merge: true },
      );
      await deleteDoc(doc(db, 'whatsappIntegrations', group.id, 'unmappedSenders', sender.jid));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to map sender';
    }
  }

  async function unmapSender(jid: string) {
    if (!integration) return;
    const { [jid]: _removed, ...rest } = integration.senderMap;
    error = '';
    try {
      await setDoc(doc(db, 'whatsappIntegrations', group.id), { senderMap: rest });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to remove mapping';
    }
  }

  async function saveTemplate() {
    error = '';
    try {
      const value = templateDraft.trim();
      // An empty draft means "use the bot's built-in default" — remove the
      // override field entirely rather than writing the default as a literal
      // value, so the default stays defined in one place (the bot's code).
      await setDoc(
        doc(db, 'whatsappIntegrations', group.id),
        { announcementTemplate: value ? value : deleteField() },
        { merge: true },
      );
      templateSaved = true;
      setTimeout(() => (templateSaved = false), 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save template';
    }
  }
</script>

<div class="card stack">
  <div class="row" style="justify-content: space-between">
    <h3 style="margin:0">{$t('whatsappBridge.title')}</h3>
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

  {#if loading}
    <p class="muted">{$t('common.loading')}</p>
  {:else if integration?.whatsappGroupJid}
    <div class="row" style="justify-content: space-between">
      <span>{$t('whatsappBridge.linkedTo', { name: groupName(integration.whatsappGroupJid) })}</span>
      <button onclick={unlinkGroup}>{$t('whatsappBridge.unlink')}</button>
    </div>

    {#if unmappedSenders.length > 0}
      <div class="stack">
        <span class="muted">{$t('whatsappBridge.unmappedSenders')}</span>
        {#each unmappedSenders as sender (sender.jid)}
          <div class="row" style="justify-content: space-between">
            <span>{sender.pushName}</span>
            <div class="row">
              <select bind:value={senderSelection[sender.jid]}>
                <option value="">{$t('unmapped.mapTo')}</option>
                {#each Object.entries(group.members) as [uid, member] (uid)}
                  <option value={uid}>{member.displayName}</option>
                {/each}
              </select>
              <button disabled={!senderSelection[sender.jid]} onclick={() => mapSender(sender)}>
                {$t('unmapped.apply')}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if integration.senderMap && Object.keys(integration.senderMap).length > 0}
      <div class="stack">
        <span class="muted">{$t('whatsappBridge.mappedSenders')}</span>
        {#each Object.entries(integration.senderMap) as [jid, uid] (jid)}
          <div class="row" style="justify-content: space-between">
            <span>{group.members[uid]?.displayName ?? uid}</span>
            <button class="danger" onclick={() => unmapSender(jid)}>{$t('common.remove')}</button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="stack">
      <label>
        {$t('whatsappBridge.templateLabel')}
        <input placeholder={DEFAULT_ANNOUNCEMENT_TEMPLATE} bind:value={templateDraft} />
      </label>
      <p class="muted">{$t('whatsappBridge.templateHint')}</p>
      <div class="row">
        <button onclick={saveTemplate}>{$t('common.save')}</button>
        {#if templateSaved}<span class="muted">{$t('whatsappBridge.templateSaved')}</span>{/if}
      </div>
    </div>
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
