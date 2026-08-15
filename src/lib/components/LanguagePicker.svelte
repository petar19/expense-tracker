<script lang="ts">
  import { locale, t, type Locale } from '../i18n';
  import { setUserLocale } from '../stores/auth';

  const options: { code: Locale; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'hr', label: 'HR' },
  ];
</script>

<div class="row lang-picker" role="group" aria-label={$t('language.label')}>
  {#each options as opt (opt.code)}
    <button
      type="button"
      class:active={$locale === opt.code}
      onclick={() => setUserLocale(opt.code)}
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .lang-picker {
    gap: 0.25rem;
  }
  .lang-picker button {
    padding: 0.3em 0.55em;
    font-size: 0.85em;
    color: var(--text-dim);
  }
  .lang-picker button.active {
    color: var(--accent-text);
    background: var(--accent);
    border-color: var(--accent);
  }
</style>
