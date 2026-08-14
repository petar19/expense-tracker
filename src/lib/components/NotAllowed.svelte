<script lang="ts">
  import { currentUser, signOutUser } from '../stores/auth';
</script>

<div class="center-screen">
  <h1>Not on the list</h1>
  <p class="muted">
    {$currentUser?.email} isn't allowed to use this app yet. Ask the admin to add
    you.
  </p>
  <button onclick={signOutUser}>Sign out</button>
</div>
