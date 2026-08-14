<script lang="ts">
  import { signInWithGoogle } from '../../lib/stores/auth';

  let error = $state('');
  let signingIn = $state(false);

  async function handleSignIn() {
    error = '';
    signingIn = true;
    try {
      await signInWithGoogle();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Sign-in failed';
    } finally {
      signingIn = false;
    }
  }
</script>

<div class="center-screen">
  <h1>Expense Tracker</h1>
  <p class="muted">Sign in with the Google account your group uses.</p>
  <button class="primary" onclick={handleSignIn} disabled={signingIn}>
    {signingIn ? 'Signing in…' : 'Sign in with Google'}
  </button>
  {#if error}
    <p class="muted" style="color: var(--danger)">{error}</p>
  {/if}
</div>
