<script lang="ts">
  import { currentUser } from '../../lib/stores/auth';
  import { categories } from '../../lib/stores/categories';
  import { addExpense, knownNames, updateExpense } from '../../lib/stores/expenses';
  import { suggestCategories, AUTO_CHECK_THRESHOLD } from '../../lib/utils/categorize';
  import { normalizeText } from '../../lib/utils/normalize';
  import type { Expense, Group } from '../../lib/types';

  let {
    group,
    expense = null,
    onDone,
  }: { group: Group; expense?: Expense | null; onDone: () => void } = $props();

  const today = new Date().toISOString().slice(0, 10);

  let name = $state(expense?.name ?? '');
  let description = $state(expense?.description ?? '');
  let price = $state(expense ? String(expense.price) : '');
  let itemCount = $state(expense?.itemCount ? String(expense.itemCount) : '');
  let paidBy = $state(expense?.paidBy ?? $currentUser?.uid ?? '');
  let date = $state(expense?.date ?? today);
  let selectedCategories = $state<string[]>(expense?.categories ?? []);
  let error = $state('');
  let saving = $state(false);
  let categoriesTouched = $state(Boolean(expense));

  let nameMatches = $derived(
    name.trim().length > 0
      ? $knownNames
          .filter((k) => k.name.startsWith(normalizeText(name)) && k.displayName.toLowerCase() !== name.toLowerCase())
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
      : [],
  );

  let suggestions = $derived(suggestCategories(`${name} ${description}`, $categories));

  $effect(() => {
    if (categoriesTouched) return;
    const strong = suggestions.filter((s) => s.score >= AUTO_CHECK_THRESHOLD).map((s) => s.categoryId);
    if (strong.length > 0) selectedCategories = strong;
  });

  function toggleCategory(id: string) {
    categoriesTouched = true;
    selectedCategories = selectedCategories.includes(id)
      ? selectedCategories.filter((c) => c !== id)
      : [...selectedCategories, id];
  }

  function pickName(displayName: string) {
    name = displayName;
  }

  async function handleSubmit() {
    error = '';
    const priceNum = parseFloat(price);
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      error = 'Price must be a positive number';
      return;
    }
    saving = true;
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        itemCount: itemCount ? parseInt(itemCount, 10) : undefined,
        paidBy,
        categories: selectedCategories,
        date,
        location: expense?.location ?? null,
        subitems: expense?.subitems ?? [],
      };
      if (expense) {
        await updateExpense(group.id, expense.id, data);
      } else {
        await addExpense(group.id, data);
      }
      onDone();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save';
    } finally {
      saving = false;
    }
  }
</script>

<form class="card stack" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  <div class="stack" style="position:relative">
    <label>
      Name
      <input bind:value={name} autocomplete="off" required />
    </label>
    {#if nameMatches.length > 0}
      <div class="card stack" style="padding:0.4rem">
        {#each nameMatches as match (match.name)}
          <button type="button" style="text-align:left; border:none" onclick={() => pickName(match.displayName)}>
            {match.displayName} <span class="muted">({match.count}×)</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <label>
    Description <span class="muted">(optional)</span>
    <input bind:value={description} />
  </label>

  <div class="row">
    <label style="flex:1">
      Price (€)
      <input type="number" step="0.01" min="0" bind:value={price} required />
    </label>
    <label style="flex:1">
      Item count <span class="muted">(optional)</span>
      <input type="number" min="1" bind:value={itemCount} />
    </label>
  </div>

  <div class="row">
    <label style="flex:1">
      Paid by
      <select bind:value={paidBy}>
        {#each Object.entries(group.members) as [uid, member] (uid)}
          <option value={uid}>{member.displayName}</option>
        {/each}
      </select>
    </label>
    <label style="flex:1">
      Date
      <input type="date" bind:value={date} required />
    </label>
  </div>

  <div class="stack">
    <span>Categories</span>
    <div class="row">
      {#each $categories as category (category.id)}
        {@const suggestion = suggestions.find((s) => s.categoryId === category.id)}
        <button
          type="button"
          onclick={() => toggleCategory(category.id)}
          style={selectedCategories.includes(category.id)
            ? 'background: var(--accent); color: var(--accent-text); border-color: var(--accent)'
            : suggestion
              ? 'border-color: var(--accent)'
              : ''}
        >
          {category.name}
        </button>
      {/each}
    </div>
  </div>

  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}

  <div class="row">
    <button class="primary" type="submit" disabled={saving}>
      {expense ? 'Save changes' : 'Add expense'}
    </button>
    <button type="button" onclick={onDone}>Cancel</button>
  </div>
</form>
