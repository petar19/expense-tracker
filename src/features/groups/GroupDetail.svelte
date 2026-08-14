<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { currentUser } from '../../lib/stores/auth';
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
      error = e instanceof Error ? e.message : 'Failed to invite';
    } finally {
      busy = false;
    }
  }

  async function handleRemove(uid: string) {
    if (!group) return;
    if (!confirm('Remove this member from the group?')) return;
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
    if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    await deleteGroup(group.id);
    push('/groups');
  }

  function setActive() {
    if (!group) return;
    activeGroupId.set(group.id);
  }
</script>

<div class="page stack">
  {#if !group}
    <p class="muted">Group not found (or you're not a member).</p>
  {:else}
    <div class="row" style="justify-content: space-between">
      {#if editingName}
        <form class="row" onsubmit={(e) => { e.preventDefault(); saveName(); }}>
          <input bind:value={nameDraft} />
          <button class="primary" type="submit">Save</button>
          <button type="button" onclick={() => (editingName = false)}>Cancel</button>
        </form>
      {:else}
        <h2 style="margin:0">{group.name}</h2>
        {#if isAdmin}
          <button onclick={startEditName}>Rename</button>
        {/if}
      {/if}
    </div>

    <div class="row">
      {#if $activeGroupId === group.id}
        <span class="muted">✓ Active group</span>
      {:else}
        <button onclick={setActive}>Set as active group</button>
      {/if}
    </div>

    <div class="card stack">
      <h3 style="margin:0">Members</h3>
      {#each Object.entries(group.members) as [uid, member] (uid)}
        <div class="row" style="justify-content: space-between">
          <div>
            <strong>{member.displayName}</strong>
            <span class="muted">— {member.email}</span>
            {#if member.role === 'admin'}<span class="muted">(admin)</span>{/if}
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
                {member.role === 'admin' ? 'Make member' : 'Make admin'}
              </button>
              {#if uid !== $currentUser?.uid}
                <button class="danger" onclick={() => handleRemove(uid)}>Remove</button>
              {/if}
            </div>
          {:else}
            <span class="muted">{member.expectedPct}%</span>
          {/if}
        </div>
      {/each}
      {#if Math.abs(pctTotal - 100) > 0.01}
        <p class="muted" style="color: var(--danger)">
          Expected shares add up to {pctTotal}%, not 100% — settle-up numbers will be
          off until this is fixed.
        </p>
      {/if}
    </div>

    {#if isAdmin}
      <div class="card stack">
        <h3 style="margin:0">Invite a member</h3>
        <p class="muted">They must already be on the app's allowlist and have signed in once.</p>
        <form class="row" onsubmit={(e) => { e.preventDefault(); handleInvite(); }}>
          <input type="email" placeholder="name@example.com" bind:value={inviteEmail} />
          <button class="primary" type="submit" disabled={busy}>Invite</button>
        </form>
        {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}
      </div>

      <button class="danger" onclick={handleDelete}>Delete group</button>
    {/if}
  {/if}
</div>
