<script lang="ts">
  import { t } from '../../lib/i18n';
  import AllowlistAdmin from '../allowlist-admin/AllowlistAdmin.svelte';
  import Migration from '../migration/Migration.svelte';

  let tab = $state<'allowlist' | 'migrate'>('allowlist');
</script>

<div class="stack">
  <div class="row">
    <button class={tab === 'allowlist' ? 'primary' : ''} onclick={() => (tab = 'allowlist')}>
      {$t('nav.allowlist')}
    </button>
    <button class={tab === 'migrate' ? 'primary' : ''} onclick={() => (tab = 'migrate')}>
      {$t('nav.migrate')}
    </button>
  </div>
  {#if tab === 'allowlist'}
    <AllowlistAdmin />
  {:else}
    <Migration />
  {/if}
</div>
