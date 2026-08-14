<script lang="ts">
  import { link } from 'svelte-spa-router';
  import active from 'svelte-spa-router/active';
  import { allowedRole, currentUser, signOutUser } from '../stores/auth';

  let menuOpen = $state(false);
</script>

<header class="nav card" style="border-radius:0; border-width: 0 0 1px">
  <div class="nav-inner">
    <a href="/" use:link class="brand">💶 Troškovi</a>
    <button class="menu-toggle" onclick={() => (menuOpen = !menuOpen)}>
      ☰
    </button>
    <nav class:open={menuOpen}>
      <a href="/" use:link use:active onclick={() => (menuOpen = false)}>Expenses</a>
      <a href="/groups" use:link use:active onclick={() => (menuOpen = false)}>Groups</a>
      <a href="/stats" use:link use:active onclick={() => (menuOpen = false)}>Stats</a>
      <a href="/settleup" use:link use:active onclick={() => (menuOpen = false)}>Settle up</a>
      <a href="/categories" use:link use:active onclick={() => (menuOpen = false)}>Categories</a>
      <a href="/export-import" use:link use:active onclick={() => (menuOpen = false)}>Export/Import</a>
      {#if $allowedRole === 'admin'}
        <a href="/admin/allowlist" use:link use:active onclick={() => (menuOpen = false)}>Allowlist</a>
        <a href="/admin/migrate" use:link use:active onclick={() => (menuOpen = false)}>Migrate</a>
      {/if}
    </nav>
    <div class="row user">
      {#if $currentUser?.photoURL}
        <img src={$currentUser.photoURL} alt="" class="avatar" />
      {/if}
      <span class="muted user-email">{$currentUser?.email}</span>
      <button onclick={signOutUser}>Sign out</button>
    </div>
  </div>
</header>

<style>
  .nav-inner {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0.6rem 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .brand {
    font-weight: 700;
    text-decoration: none;
    color: var(--text);
  }
  nav {
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
    flex: 1;
  }
  nav a {
    text-decoration: none;
    color: var(--text-dim);
    font-size: 0.92em;
    padding: 0.25em 0;
  }
  nav a:global(.active) {
    color: var(--accent);
    font-weight: 600;
  }
  .user {
    margin-left: auto;
  }
  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }
  .user-email {
    display: none;
  }
  .menu-toggle {
    display: none;
  }
  @media (max-width: 640px) {
    .user-email {
      display: none;
    }
    .menu-toggle {
      display: inline-block;
      margin-left: auto;
    }
    nav {
      display: none;
      width: 100%;
      flex-direction: column;
      order: 3;
      gap: 0.5rem;
    }
    nav.open {
      display: flex;
    }
    .user {
      margin-left: 0;
    }
  }
</style>
