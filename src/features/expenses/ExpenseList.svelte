<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { activeGroup, myGroups, myGroupsLoading } from '../../lib/stores/groups';
  import { categories } from '../../lib/stores/categories';
  import { deleteExpense, expenses, expensesLoading } from '../../lib/stores/expenses';
  import ExpenseForm from './ExpenseForm.svelte';
  import type { Expense } from '../../lib/types';

  let showForm = $state(false);
  let editingExpense = $state<Expense | null>(null);

  function categoryName(id: string): string {
    return $categories.find((c) => c.id === id)?.name ?? id;
  }

  function memberName(uid: string): string {
    if (!$activeGroup) return uid;
    return $activeGroup.members[uid]?.displayName ?? uid;
  }

  function startAdd() {
    editingExpense = null;
    showForm = true;
  }

  function startEdit(expense: Expense) {
    editingExpense = expense;
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingExpense = null;
  }

  async function handleDelete(expense: Expense) {
    if (!$activeGroup) return;
    if (!confirm(`Delete "${expense.name}"?`)) return;
    await deleteExpense($activeGroup.id, expense.id);
  }

  const currency = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' });
</script>

<div class="page stack">
  {#if $myGroupsLoading}
    <p class="muted">Loading…</p>
  {:else if $myGroups.length === 0}
    <div class="center-screen">
      <h2>No groups yet</h2>
      <p class="muted">Create a group to start tracking shared expenses.</p>
      <a href="/groups" use:link><button class="primary">Go to groups</button></a>
    </div>
  {:else if $activeGroup}
    <div class="row" style="justify-content: space-between">
      <h2 style="margin:0">{$activeGroup.name}</h2>
      <button class="primary" onclick={startAdd}>+ Add expense</button>
    </div>

    {#if showForm}
      <ExpenseForm group={$activeGroup} expense={editingExpense} onDone={closeForm} />
    {/if}

    {#if $expensesLoading}
      <p class="muted">Loading expenses…</p>
    {:else if $expenses.length === 0}
      <p class="muted">No expenses yet.</p>
    {:else}
      <div class="stack">
        {#each $expenses as expense (expense.id)}
          <div class="card stack">
            <div class="row" style="justify-content: space-between">
              <div>
                <strong>{expense.name}</strong>
                {#if expense.description}
                  <span class="muted"> — {expense.description}</span>
                {/if}
              </div>
              <strong>{currency.format(expense.price)}</strong>
            </div>
            <div class="row muted">
              <span>{expense.date}</span>
              <span>· paid by {memberName(expense.paidBy)}</span>
              {#if expense.itemCount}<span>· {expense.itemCount} items</span>{/if}
              {#if expense.subitems.length > 0}<span>· {expense.subitems.length} subitems</span>{/if}
              {#if expense.location}<span>· 📍 location</span>{/if}
              {#if expense.source === 'migrated'}<span>· migrated</span>{/if}
            </div>
            {#if expense.categories.length > 0}
              <div class="row">
                {#each expense.categories as catId (catId)}
                  <span class="muted card" style="padding: 0.1em 0.6em">{categoryName(catId)}</span>
                {/each}
              </div>
            {/if}
            <div class="row">
              <button onclick={() => startEdit(expense)}>Edit</button>
              <button class="danger" onclick={() => handleDelete(expense)}>Delete</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
