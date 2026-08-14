<script lang="ts">
  import { activeGroup } from '../../lib/stores/groups';
  import { expenses, knownNames } from '../../lib/stores/expenses';
  import { categories } from '../../lib/stores/categories';
  import { nameAliases, saveAlias } from '../../lib/stores/nameAliases';
  import ChartView from '../../lib/components/ChartView.svelte';
  import {
    aggregateByCategory,
    aggregateByName,
    aggregateBySpender,
    aggregateByTime,
    filterExpenses,
    sortExpenses,
    suggestBucketSize,
    type BucketSize,
    type SortKey,
  } from '../../lib/utils/stats';

  let from = $state('');
  let to = $state('');
  let selectedCategories = $state<string[]>([]);
  let selectedSpenders = $state<string[]>([]);
  let search = $state('');
  let sortKey = $state<SortKey>('date-desc');
  let bucket = $state<BucketSize | 'auto'>('auto');

  const currency = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' });

  let filtered = $derived(
    filterExpenses($expenses, {
      from: from || undefined,
      to: to || undefined,
      categoryIds: selectedCategories.length ? selectedCategories : undefined,
      spenderUids: selectedSpenders.length ? selectedSpenders : undefined,
      search: search || undefined,
    }),
  );
  let sorted = $derived(sortExpenses(filtered, sortKey));
  let total = $derived(filtered.reduce((sum, e) => sum + e.price, 0));

  let effectiveBucket = $derived(bucket === 'auto' ? suggestBucketSize(filtered) : bucket);
  let timeAgg = $derived(aggregateByTime(filtered, effectiveBucket));
  let categoryAgg = $derived(aggregateByCategory(filtered));
  let spenderAgg = $derived(aggregateBySpender(filtered));

  let nameCounts = $derived(
    Object.fromEntries($knownNames.map((k) => [k.displayName, k.count])) as Record<string, number>,
  );
  let nameResult = $derived(aggregateByName(filtered, nameCounts, $nameAliases));

  function categoryName(id: string): string {
    return $categories.find((c) => c.id === id)?.name ?? id;
  }
  function memberName(uid: string): string {
    return $activeGroup?.members[uid]?.displayName ?? uid;
  }
  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function clustersToReview() {
    return nameResult.clusters.filter((c) => c.members.length > 1);
  }

  async function acceptCluster(canonicalName: string, members: string[]) {
    if (!$activeGroup) return;
    await saveAlias($activeGroup.id, members, canonicalName);
  }

  let timeChartConfig = $derived({
    type: 'bar' as const,
    data: {
      labels: timeAgg.map((a) => a.key),
      datasets: [{ label: 'Spent', data: timeAgg.map((a) => a.total), backgroundColor: '#4f46e5' }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  let categoryChartConfig = $derived({
    type: 'doughnut' as const,
    data: {
      labels: categoryAgg.map((a) => categoryName(a.key)),
      datasets: [
        {
          data: categoryAgg.map((a) => a.total),
          backgroundColor: [
            '#4f46e5', '#818cf8', '#f59e0b', '#16a34a', '#dc2626', '#0ea5e9', '#a855f7', '#eab308',
          ],
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
</script>

<div class="page stack">
  <h2>Stats</h2>

  {#if !$activeGroup}
    <p class="muted">Pick an active group first.</p>
  {:else}
    <div class="card stack">
      <div class="row">
        <label>From <input type="date" bind:value={from} /></label>
        <label>To <input type="date" bind:value={to} /></label>
        <label>
          Sort
          <select bind:value={sortKey}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="price-desc">Highest price</option>
            <option value="price-asc">Lowest price</option>
            <option value="name-asc">Name (A-Z)</option>
          </select>
        </label>
        <label>
          Bucket
          <select bind:value={bucket}>
            <option value="auto">Auto</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
      </div>
      <input placeholder="Search name/description" bind:value={search} />
      <div class="row">
        <span class="muted">Categories:</span>
        {#each $categories as cat (cat.id)}
          <button
            type="button"
            onclick={() => (selectedCategories = toggle(selectedCategories, cat.id))}
            style={selectedCategories.includes(cat.id) ? 'background:var(--accent); color:var(--accent-text)' : ''}
          >
            {cat.name}
          </button>
        {/each}
      </div>
      {#if $activeGroup}
        <div class="row">
          <span class="muted">Spender:</span>
          {#each Object.entries($activeGroup.members) as [uid, member] (uid)}
            <button
              type="button"
              onclick={() => (selectedSpenders = toggle(selectedSpenders, uid))}
              style={selectedSpenders.includes(uid) ? 'background:var(--accent); color:var(--accent-text)' : ''}
            >
              {member.displayName}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card row" style="justify-content: space-between">
      <strong>{filtered.length} expenses</strong>
      <strong>{currency.format(total)}</strong>
    </div>

    {#if timeAgg.length > 0}
      <div class="card">
        <h3>Over time ({effectiveBucket})</h3>
        <ChartView config={timeChartConfig} />
      </div>
    {/if}

    {#if categoryAgg.length > 0}
      <div class="card">
        <h3>By category</h3>
        <ChartView config={categoryChartConfig} />
      </div>
    {/if}

    <div class="card stack">
      <h3 style="margin:0">By spender</h3>
      {#each spenderAgg as agg (agg.key)}
        <div class="row" style="justify-content: space-between">
          <span>{memberName(agg.key)}</span>
          <span>{currency.format(agg.total)} <span class="muted">({agg.count})</span></span>
        </div>
      {/each}
    </div>

    <div class="card stack">
      <h3 style="margin:0">By name (fuzzy-grouped)</h3>
      {#each nameResult.aggregates.slice(0, 25) as agg (agg.key)}
        <div class="row" style="justify-content: space-between">
          <span>{agg.key}</span>
          <span>{currency.format(agg.total)} <span class="muted">({agg.count})</span></span>
        </div>
      {/each}
      {#if clustersToReview().length > 0}
        <details>
          <summary class="muted">Suggested groupings ({clustersToReview().length})</summary>
          <div class="stack">
            {#each clustersToReview() as cluster (cluster.canonicalName + cluster.members.join())}
              <div class="row" style="justify-content: space-between">
                <span>{cluster.members.join(' + ')} → <strong>{cluster.canonicalName}</strong></span>
                <button onclick={() => acceptCluster(cluster.canonicalName, cluster.members)}>
                  Save as alias
                </button>
              </div>
            {/each}
          </div>
        </details>
      {/if}
    </div>

    <div class="card stack">
      <h3 style="margin:0">Expenses ({sorted.length})</h3>
      <div class="stack" style="max-height:400px; overflow-y:auto">
        {#each sorted as expense (expense.id)}
          <div class="row" style="justify-content: space-between">
            <span>{expense.date} · {expense.name}</span>
            <span>{currency.format(expense.price)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
