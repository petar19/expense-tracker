<script lang="ts">
  import { link, push } from 'svelte-spa-router';
  import { createGroup, myGroups, myGroupsLoading } from '../../lib/stores/groups';
  import { t } from '../../lib/i18n';

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
      error = e instanceof Error ? e.message : $t('groups.createFailed');
    } finally {
      creating = false;
    }
  }
</script>

<div class="page stack">
  <h2>{$t('groups.title')}</h2>

  <form class="card row" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
    <input placeholder={$t('groups.newNamePlaceholder')} bind:value={newName} />
    <button class="primary" type="submit" disabled={creating}>{$t('groups.create')}</button>
  </form>
  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}

  {#if $myGroupsLoading}
    <p class="muted">{$t('groups.loading')}</p>
  {:else if $myGroups.length === 0}
    <p class="muted">{$t('groups.empty')}</p>
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
            <p class="muted" style="margin:0">
              {$t('groups.memberCount', { count: Object.keys(group.members).length })}
            </p>
          </div>
          <span class="muted">›</span>
        </a>
      {/each}
    </div>
  {/if}
</div>
