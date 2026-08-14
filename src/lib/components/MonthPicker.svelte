<script lang="ts">
  import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';

  let { onSelect }: { onSelect: (from: string, to: string) => void } = $props();

  let cursor = $state(startOfMonth(new Date()));

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
  <button type="button" onclick={prev} aria-label="Previous month">‹</button>
  <button type="button" onclick={jumpToThisMonth} title="Jump to this month">
    {format(cursor, 'MMMM yyyy')}
  </button>
  <button type="button" onclick={next} aria-label="Next month">›</button>
</div>

<style>
  .month-picker {
    gap: 0.25rem;
  }
  .month-picker button {
    padding: 0.4em 0.7em;
  }
</style>
