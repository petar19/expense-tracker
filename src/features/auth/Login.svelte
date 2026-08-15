<script lang="ts">
  import { signInWithGoogle } from '../../lib/stores/auth';
  import { t } from '../../lib/i18n';

  let error = $state('');
  let signingIn = $state(false);

  async function handleSignIn() {
    error = '';
    signingIn = true;
    try {
      await signInWithGoogle();
    } catch (e) {
      error = e instanceof Error ? e.message : $t('login.error');
    } finally {
      signingIn = false;
    }
  }
</script>

<div class="center-screen">
  <h1>{$t('login.title')}</h1>
  <p class="muted">{$t('login.subtitle')}</p>
  <button class="primary" onclick={handleSignIn} disabled={signingIn}>
    {signingIn ? $t('login.signingIn') : $t('login.signIn')}
  </button>
  {#if error}
    <p class="muted" style="color: var(--danger)">{error}</p>
  {/if}
</div>
