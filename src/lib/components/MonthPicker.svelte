<script lang="ts">
  import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
  import { hr as hrLocale } from 'date-fns/locale/hr';
  import { locale, t } from '../i18n';

  let { onSelect }: { onSelect: (from: string, to: string) => void } = $props();

  let cursor = $state(startOfMonth(new Date()));

  let monthLabel = $derived(
    format(cursor, 'LLLL yyyy', { locale: $locale === 'hr' ? hrLocale : undefined }),
  );

  function emit() {
    onSelect(format(cursor, 'yyyy-MM-dd'), format(endOfMonth(cursor), 'yyyy-MM-dd'));
  }

  function prev() {
    cursor = subMonths(cursor, 1);
    emit();
  }

  function next() {
    cursor = addMonths(cursor, 1);
    emit();
  }

  function jumpToThisMonth() {
    cursor = startOfMonth(new Date());
    emit();
  }
</script>

<div class="row month-picker">
  <button type="button" onclick={prev} aria-label={$t('monthPicker.prevMonth')}>‹</button>
  <button type="button" onclick={jumpToThisMonth} title={$t('monthPicker.jumpTooltip')}>
    {monthLabel}
  </button>
  <button type="button" onclick={next} aria-label={$t('monthPicker.nextMonth')}>›</button>
</div>

<style>
  .month-picker {
    gap: 0.25rem;
  }
  .month-picker button {
    padding: 0.4em 0.7em;
  }
</style>
