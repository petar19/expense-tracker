<script lang="ts">
  import { currentUser, signOutUser } from '../stores/auth';
  import { t } from '../i18n';
</script>

<div class="center-screen">
  <h1>{$t('notAllowed.title')}</h1>
  <p class="muted">{$t('notAllowed.body', { email: $currentUser?.email ?? '' })}</p>
  <button onclick={signOutUser}>{$t('nav.signOut')}</button>
</div>
