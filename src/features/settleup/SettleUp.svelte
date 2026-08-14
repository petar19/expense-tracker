<script lang="ts">
  import { activeGroup } from '../../lib/stores/groups';
  import { expenses } from '../../lib/stores/expenses';
  import { filterExpenses } from '../../lib/utils/stats';
  import { computeBalances, simplifyDebts } from '../../lib/utils/debt';

  let from = $state('');
  let to = $state('');

  const currency = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' });

  let filtered = $derived(
    filterExpenses($expenses, { from: from || undefined, to: to || undefined }),
  );
  let subsetTotal = $derived(filtered.reduce((sum, e) => sum + e.price, 0));

  let memberInputs = $derived(
    $activeGroup
      ? Object.entries($activeGroup.members).map(([uid, member]) => ({
          uid,
          displayName: member.displayName,
          expectedPct: member.expectedPct,
          totalPaid: filtered.filter((e) => e.paidBy === uid).reduce((sum, e) => sum + e.price, 0),
        }))
      : [],
  );

  let balances = $derived(computeBalances(memberInputs, subsetTotal));
  let transfers = $derived(simplifyDebts(balances));

  function memberName(uid: string): string {
    return $activeGroup?.members[uid]?.displayName ?? uid;
  }
</script>

<div class="page stack">
  <h2>Settle up</h2>

  {#if !$activeGroup}
    <p class="muted">Pick an active group first.</p>
  {:else}
    <div class="card row">
      <label>From <input type="date" bind:value={from} /></label>
      <label>To <input type="date" bind:value={to} /></label>
    </div>

    <div class="card stack">
      <h3 style="margin:0">Paid vs. expected</h3>
      {#each memberInputs as m (m.uid)}
        <div class="row" style="justify-content: space-between">
          <span>{m.displayName} <span class="muted">({m.expectedPct}%)</span></span>
          <span>
            paid {currency.format(m.totalPaid)}, expected
            {currency.format((m.expectedPct / 100) * subsetTotal)}
          </span>
        </div>
      {/each}
      <div class="row" style="justify-content: space-between">
        <strong>Total</strong>
        <strong>{currency.format(subsetTotal)}</strong>
      </div>
    </div>

    <div class="card stack">
      <h3 style="margin:0">Who owes whom</h3>
      {#if transfers.length === 0}
        <p class="muted">Everyone's even.</p>
      {:else}
        {#each transfers as t (t.from + t.to)}
          <div class="row" style="justify-content: space-between">
            <span>{memberName(t.from)} → {memberName(t.to)}</span>
            <strong>{currency.format(t.amount)}</strong>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
