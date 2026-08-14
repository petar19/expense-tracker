import { describe, expect, it } from 'vitest';
import { suggestCategories } from '../src/lib/utils/categorize';
import type { Category } from '../src/lib/types';

const categories: Category[] = [
  { id: 'food', name: 'Food', keywords: ['lidl', 'konzum', 'meso', 'steak'] },
  { id: 'meat', name: 'Meat', keywords: ['meso', 'steak', 'piletina'] },
  { id: 'auto', name: 'Auto', keywords: ['gorivo', 'benzin'] },
];

describe('suggestCategories', () => {
  it('suggests multiple categories for overlapping keywords', () => {
    const result = suggestCategories('steak', categories);
    const ids = result.map((r) => r.categoryId);
    expect(ids).toContain('food');
    expect(ids).toContain('meat');
    expect(ids).not.toContain('auto');
  });

  it('matches substrings like the legacy script did', () => {
    const result = suggestCategories('lidl dolac', categories);
    expect(result.map((r) => r.categoryId)).toContain('food');
  });

  it('tolerates small typos via fuzzy matching', () => {
    const result = suggestCategories('goriv', categories);
    expect(result.map((r) => r.categoryId)).toContain('auto');
  });

  it('returns nothing for unrelated text', () => {
    const result = suggestCategories('xyzabc', categories);
    expect(result).toEqual([]);
  });
});
