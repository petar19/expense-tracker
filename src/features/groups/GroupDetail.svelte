<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { currentUser } from '../../lib/stores/auth';
  import { t } from '../../lib/i18n';
  import {
    activeGroupId,
    deleteGroup,
    inviteMemberByEmail,
    myGroups,
    removeMember,
    renameGroup,
    setMemberExpectedPct,
    setMemberRole,
  } from '../../lib/stores/groups';
  import {
    disableNotifications,
    enableNotifications,
    notificationPref,
  } from '../../lib/stores/notifications';
  import UnmappedPayers from './UnmappedPayers.svelte';
  import WhatsAppBridge from './WhatsAppBridge.svelte';

  let { params }: { params: { groupId: string } } = $props();

  let group = $derived($myGroups.find((g) => g.id === params.groupId) ?? null);
  let isAdmin = $derived(
    group && $currentUser ? group.members[$currentUser.uid]?.role === 'admin' : false,
  );
  let pctTotal = $derived(
    group ? Object.values(group.members).reduce((sum, m) => sum + m.expectedPct, 0) : 0,
  );

  let inviteEmail = $state('');
  let error = $state('');
  let busy = $state(false);
  let nameDraft = $state('');
  let editingName = $state(false);

  async function handleInvite() {
    if (!group) return;
    error = '';
    busy = true;
    try {
      await inviteMemberByEmail(group, inviteEmail);
      inviteEmail = '';
    } catch (e) {
      error = e instanceof Error ? e.message : $t('groupDetail.inviteFailed');
    } finally {
      busy = false;
    }
  }

  async function handleRemove(uid: string) {
    if (!group) return;
    if (!confirm($t('groupDetail.removeConfirm'))) return;
    await removeMember(group, uid);
  }

  async function handlePctChange(uid: string, value: string) {
    if (!group) return;
    const pct = parseFloat(value);
    if (Number.isNaN(pct)) return;
    await setMemberExpectedPct(group, uid, pct);
  }

  async function handleRoleToggle(uid: string, isCurrentlyAdmin: boolean) {
    if (!group) return;
    await setMemberRole(group, uid, isCurrentlyAdmin ? 'member' : 'admin');
  }

  function startEditName() {
    if (!group) return;
    nameDraft = group.name;
    editingName = true;
  }

  async function saveName() {
    if (!group) return;
    const name = nameDraft.trim();
    if (name) await renameGroup(group, name);
    editingName = false;
  }

  async function handleDelete() {
    if (!group) return;
    if (!confirm($t('groupDetail.deleteConfirm', { name: group.name }))) return;
    await deleteGroup(group.id);
    push('/groups');
  }

  function setActive() {
    if (!group) return;
    activeGroupId.set(group.id);
  }

  let notifyBusy = $state(false);
  let notifyError = $state('');

  async function toggleNotifications() {
    if (!group) return;
    notifyError = '';
    notifyBusy = true;
    try {
      if ($notificationPref?.enabled) {
        await disableNotifications(group.id);
      } else {
        await enableNotifications(group.id);
      }
    } catch (e) {
      notifyError = $t('notifications.enableFailed', { error: e instanceof Error ? e.message : String(e) });
    } finally {
      notifyBusy = false;
    }
  }
</script>

<div class="page stack">
  {#if !group}
    <p class="muted">{$t('groupDetail.notFound')}</p>
  {:else}
    <div class="row" style="justify-content: space-between">
      {#if editingName}
        <form class="row" onsubmit={(e) => { e.preventDefault(); saveName(); }}>
          <input bind:value={nameDraft} />
          <button class="primary" type="submit">{$t('common.save')}</button>
          <button type="button" onclick={() => (editingName = false)}>{$t('common.cancel')}</button>
        </form>
      {:else}
        <h2 style="margin:0">{group.name}</h2>
        {#if isAdmin}
          <button onclick={startEditName}>{$t('groupDetail.rename')}</button>
        {/if}
      {/if}
    </div>

    <div class="row">
      {#if $activeGroupId === group.id}
        <span class="muted">{$t('groupDetail.activeGroup')}</span>
      {:else}
        <button onclick={setActive}>{$t('groupDetail.setActive')}</button>
      {/if}
    </div>

    <div class="card stack">
      <h3 style="margin:0">{$t('groupDetail.members')}</h3>
      {#each Object.entries(group.members) as [uid, member] (uid)}
        <div class="row" style="justify-content: space-between">
          <div>
            <strong>{member.displayName}</strong>
            <span class="muted">— {member.email}</span>
            {#if member.role === 'admin'}<span class="muted">{$t('groupDetail.admin')}</span>{/if}
          </div>
          {#if isAdmin}
            <div class="row">
              <input
                type="number"
                style="width:5em"
                value={member.expectedPct}
                onchange={(e) => handlePctChange(uid, (e.target as HTMLInputElement).value)}
              />
              <span class="muted">%</span>
              <button onclick={() => handleRoleToggle(uid, member.role === 'admin')}>
                {member.role === 'admin' ? $t('groupDetail.makeMember') : $t('groupDetail.makeAdmin')}
              </button>
              {#if uid !== $currentUser?.uid}
                <button class="danger" onclick={() => handleRemove(uid)}>{$t('common.remove')}</button>
              {/if}
            </div>
          {:else}
            <span class="muted">{member.expectedPct}%</span>
          {/if}
        </div>
      {/each}
      {#if Math.abs(pctTotal - 100) > 0.01}
        <p class="muted" style="color: var(--danger)">
          {$t('groupDetail.pctWarning', { pct: pctTotal })}
        </p>
      {/if}
    </div>

    <div class="card stack">
      <h3 style="margin:0">{$t('notifications.title')}</h3>
      <p class="muted">{$t('notifications.description')}</p>
      <div class="row">
        <button onclick={toggleNotifications} disabled={notifyBusy}>
          {#if notifyBusy}
            {$t('notifications.enabling')}
          {:else if $notificationPref?.enabled}
            {$t('notifications.disable')}
          {:else}
            {$t('notifications.enable')}
          {/if}
        </button>
      </div>
      {#if notifyError}<p class="muted" style="color: var(--danger)">{notifyError}</p>{/if}
    </div>

    {#if isAdmin}
      <div class="card stack">
        <h3 style="margin:0">{$t('groupDetail.inviteTitle')}</h3>
        <p class="muted">{$t('groupDetail.inviteDescription')}</p>
        <form class="row" onsubmit={(e) => { e.preventDefault(); handleInvite(); }}>
          <input type="email" placeholder={$t('allowlist.emailPlaceholder')} bind:value={inviteEmail} />
          <button class="primary" type="submit" disabled={busy}>{$t('groupDetail.invite')}</button>
        </form>
        {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}
      </div>

      <UnmappedPayers {group} />

      <WhatsAppBridge {group} />

      <button class="danger" onclick={handleDelete}>{$t('groupDetail.deleteGroup')}</button>
    {/if}
  {/if}
</div>
