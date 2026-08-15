<script lang="ts">
  import { link } from 'svelte-spa-router';
  import active from 'svelte-spa-router/active';
  import { allowedRole, currentUser, signOutUser } from '../stores/auth';
</script>

<header class="nav card" style="border-radius:0; border-width: 0 0 1px">
  <div class="nav-inner">
    <div class="row top-row">
      <a href="/" use:link class="brand">💶 Troškovi</a>
      <div class="row user">
        {#if $currentUser?.photoURL}
          <img src={$currentUser.photoURL} alt="" class="avatar" />
        {/if}
        <span class="muted user-email">{$currentUser?.email}</span>
        <button onclick={signOutUser}>Sign out</button>
      </div>
    </div>
    <nav>
      <a href="/" use:link use:active>Expenses</a>
      <a href="/groups" use:link use:active>Groups</a>
      <a href="/stats" use:link use:active>Stats</a>
      <a href="/settleup" use:link use:active>Settle up</a>
      <a href="/categories" use:link use:active>Categories</a>
      <a href="/export-import" use:link use:active>Export/Import</a>
      {#if $allowedRole === 'admin'}
        <a href="/admin/allowlist" use:link use:active>Allowlist</a>
        <a href="/admin/migrate" use:link use:active>Migrate</a>
      {/if}
    </nav>
  </div>
</header>

<style>
  .nav-inner {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0.6rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .top-row {
    justify-content: space-between;
  }
  .brand {
    font-weight: 700;
    text-decoration: none;
    color: var(--text);
    white-space: nowrap;
  }
  nav {
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
  }
  nav a {
    text-decoration: none;
    color: var(--text-dim);
    font-size: 0.92em;
    padding: 0.25em 0;
    white-space: nowrap;
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

  /* Below ~640px, tabs become a horizontally scrollable single-line strip
     instead of hiding behind a hamburger menu — all of them stay visible and
     reachable with a swipe, nothing tucked away. */
  @media (max-width: 640px) {
    nav {
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 0.2rem;
    }
    nav a {
      flex: 0 0 auto;
    }
  }
</style>
