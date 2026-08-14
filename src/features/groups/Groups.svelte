<script lang="ts">
  import { link, push } from 'svelte-spa-router';
  import { createGroup, myGroups, myGroupsLoading } from '../../lib/stores/groups';

  let newName = $state('');
  let error = $state('');
  let creating = $state(false);

  async function handleCreate() {
    error = '';
    const name = newName.trim();
    if (!name) return;
    creating = true;
    try {
      const id = await createGroup(name);
      newName = '';
      push(`/groups/${id}`);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create group';
    } finally {
      creating = false;
    }
  }
</script>

<div class="page stack">
  <h2>Groups</h2>

  <form class="card row" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
    <input placeholder="New group name" bind:value={newName} />
    <button class="primary" type="submit" disabled={creating}>Create</button>
  </form>
  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}

  {#if $myGroupsLoading}
    <p class="muted">Loading…</p>
  {:else if $myGroups.length === 0}
    <p class="muted">You're not in any groups yet — create one above.</p>
  {:else}
    <div class="stack">
      {#each $myGroups as group (group.id)}
        <a
          class="card row"
          style="text-decoration:none; color:inherit; justify-content:space-between"
          href={`/groups/${group.id}`}
          use:link
        >
          <div>
            <strong>{group.name}</strong>
            <p class="muted" style="margin:0">{Object.keys(group.members).length} member(s)</p>
          </div>
          <span class="muted">›</span>
        </a>
      {/each}
    </div>
  {/if}
</div>
