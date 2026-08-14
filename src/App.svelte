<script lang="ts">
  import Router from 'svelte-spa-router';
  import { routes } from './lib/router';
  import Nav from './lib/components/Nav.svelte';
  import Login from './features/auth/Login.svelte';
  import NotAllowed from './lib/components/NotAllowed.svelte';
  import {
    allowedLoading,
    allowedRole,
    authInitializing,
    currentUser,
  } from './lib/stores/auth';
</script>

{#if $authInitializing}
  <div class="center-screen"><p class="muted">Loading…</p></div>
{:else if !$currentUser}
  <Login />
{:else if $allowedLoading}
  <div class="center-screen"><p class="muted">Checking access…</p></div>
{:else if !$allowedRole}
  <NotAllowed />
{:else}
  <Nav />
  <Router {routes} />
{/if}
