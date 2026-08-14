<script lang="ts">
  import { currentUser } from '../../lib/stores/auth';
  import { categories } from '../../lib/stores/categories';
  import { addExpense, knownNames, updateExpense } from '../../lib/stores/expenses';
  import { suggestCategories, AUTO_CHECK_THRESHOLD } from '../../lib/utils/categorize';
  import { normalizeText } from '../../lib/utils/normalize';
  import MapPicker from '../../lib/components/MapPicker.svelte';
  import type { Expense, ExpenseLocation, Group, Subitem } from '../../lib/types';

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
  let location = $state<ExpenseLocation | null>(expense?.location ?? null);
  let showMap = $state(Boolean(expense?.location));
  let subitems = $state<Subitem[]>(expense?.subitems ?? []);
  let error = $state('');
  let saving = $state(false);
  let categoriesTouched = $state(Boolean(expense));

  let subitemsTotal = $derived(subitems.reduce((sum, s) => sum + s.price * (s.count ?? 1), 0));

  function addSubitem() {
    subitems = [...subitems, { name: '', price: 0, count: undefined }];
  }
  function removeSubitem(index: number) {
    subitems = subitems.filter((_, i) => i !== index);
  }

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
        location,
        subitems: subitems.filter((s) => s.name.trim() !== ''),
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

  <div class="stack">
    <div class="row" style="justify-content: space-between">
      <span>Subitems <span class="muted">(optional)</span></span>
      <button type="button" disabled title="Coming soon — scan a receipt photo to fill these in automatically">
        📷 Scan receipt
      </button>
    </div>
    {#each subitems as subitem, i (i)}
      <div class="row">
        <input placeholder="item name" bind:value={subitem.name} style="flex:1" />
        <input type="number" step="0.01" min="0" placeholder="price" bind:value={subitem.price} style="width:6em" />
        <input type="number" min="1" placeholder="count" bind:value={subitem.count} style="width:5em" />
        <button type="button" onclick={() => removeSubitem(i)}>✕</button>
      </div>
    {/each}
    <button type="button" onclick={addSubitem}>+ Add subitem</button>
    {#if subitems.length > 0}
      <p class="muted">Subitems total: {subitemsTotal.toFixed(2)}</p>
    {/if}
  </div>

  <div class="stack">
    {#if showMap}
      <MapPicker {location} onChange={(loc) => (location = loc)} />
      <button type="button" onclick={() => { showMap = false; location = null; }}>Remove location</button>
    {:else}
      <button type="button" onclick={() => (showMap = true)}>📍 Add location</button>
    {/if}
  </div>

  {#if error}<p class="muted" style="color: var(--danger)">{error}</p>{/if}

  <div class="row">
    <button class="primary" type="submit" disabled={saving}>
      {expense ? 'Save changes' : 'Add expense'}
    </button>
    <button type="button" onclick={onDone}>Cancel</button>
  </div>
</form>
