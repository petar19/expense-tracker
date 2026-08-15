<script lang="ts">
  import {
    addKeywordToCategory,
    categories,
    categoriesLoading,
    createCategory,
    deleteCategory,
    renameCategory,
    setCategoryKeywords,
  } from '../../lib/stores/categories';
  import { t } from '../../lib/i18n';

  let newCategoryName = $state('');
  let newKeywordDrafts = $state<Record<string, string>>({});

  async function handleCreate() {
    const name = newCategoryName.trim();
    if (!name) return;
    await createCategory(name, []);
    newCategoryName = '';
  }

  async function handleAddKeyword(categoryId: string) {
    const keyword = (newKeywordDrafts[categoryId] ?? '').trim().toLowerCase();
    if (!keyword) return;
    await addKeywordToCategory(categoryId, keyword);
    newKeywordDrafts[categoryId] = '';
  }

  async function removeKeyword(categoryId: string, keywords: string[], keyword: string) {
    await setCategoryKeywords(categoryId, keywords.filter((k) => k !== keyword));
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm($t('categoryAdmin.deleteConfirm', { name }))) return;
    await deleteCategory(id);
  }
</script>

<div class="page stack">
  <h2>{$t('categoryAdmin.title')}</h2>
  <p class="muted">{$t('categoryAdmin.description')}</p>

  <form class="card row" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
    <input placeholder={$t('categoryAdmin.newNamePlaceholder')} bind:value={newCategoryName} />
    <button class="primary" type="submit">{$t('categoryAdmin.addCategory')}</button>
  </form>

  {#if $categoriesLoading}
    <p class="muted">{$t('common.loading')}</p>
  {:else}
    <div class="stack">
      {#each $categories as category (category.id)}
        <div class="card stack">
          <div class="row" style="justify-content: space-between">
            <input
              value={category.name}
              onchange={(e) => renameCategory(category.id, (e.target as HTMLInputElement).value)}
              style="font-weight:600; max-width: 16em"
            />
            <button class="danger" onclick={() => handleDelete(category.id, category.name)}>
              {$t('common.delete')}
            </button>
          </div>
          <div class="row">
            {#each category.keywords as keyword (keyword)}
              <span class="card" style="padding: 0.2em 0.6em; display:flex; gap:0.4em; align-items:center">
                {keyword}
                <button
                  style="border:none; padding:0; background:none; color: var(--text-dim)"
                  onclick={() => removeKeyword(category.id, category.keywords, keyword)}
                  aria-label={$t('categoryAdmin.removeKeyword', { keyword })}
                >
                  ✕
                </button>
              </span>
            {:else}
              <span class="muted">{$t('categoryAdmin.noKeywords')}</span>
            {/each}
          </div>
          <form
            class="row"
            onsubmit={(e) => { e.preventDefault(); handleAddKeyword(category.id); }}
          >
            <input
              placeholder={$t('categoryAdmin.addKeywordPlaceholder')}
              style="max-width: 12em"
              bind:value={newKeywordDrafts[category.id]}
            />
            <button type="submit">{$t('common.add')}</button>
          </form>
        </div>
      {:else}
        <p class="muted">{$t('categoryAdmin.empty')}</p>
      {/each}
    </div>
  {/if}
</div>
