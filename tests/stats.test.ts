import { describe, expect, it } from 'vitest';
import { aggregateByCategory, aggregateBySpender, filterExpenses, sortExpenses } from '../src/lib/utils/stats';
import type { Expense } from '../src/lib/types';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: overrides.id ?? Math.random().toString(),
    name: 'lidl',
    price: 10,
    paidBy: 'u1',
    categories: ['food'],
    date: '2024-01-01',
    location: null,
    subitems: [],
    createdBy: 'u1',
    createdAt: 0,
    source: 'manual',
    ...overrides,
  };
}

describe('filterExpenses', () => {
  it('filters by date range', () => {
    const expenses = [
      makeExpense({ date: '2024-01-01' }),
      makeExpense({ date: '2024-02-01' }),
      makeExpense({ date: '2024-03-01' }),
    ];
    const result = filterExpenses(expenses, { from: '2024-01-15', to: '2024-02-15' });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-02-01');
  });

  it('filters by category (OR match)', () => {
    const expenses = [
      makeExpense({ categories: ['food'] }),
      makeExpense({ categories: ['auto'] }),
    ];
    expect(filterExpenses(expenses, { categoryIds: ['food'] })).toHaveLength(1);
  });

  it('filters by search text against name+description', () => {
    const expenses = [makeExpense({ name: 'Zoo City', description: 'cat food' })];
    expect(filterExpenses(expenses, { search: 'cat' })).toHaveLength(1);
    expect(filterExpenses(expenses, { search: 'dog' })).toHaveLength(0);
  });
});

describe('sortExpenses', () => {
  it('sorts by price descending', () => {
    const expenses = [makeExpense({ price: 1 }), makeExpense({ price: 5 }), makeExpense({ price: 3 })];
    expect(sortExpenses(expenses, 'price-desc').map((e) => e.price)).toEqual([5, 3, 1]);
  });
});

describe('aggregateByCategory / aggregateBySpender', () => {
  it('sums price per category, counting multi-category expenses in each', () => {
    const expenses = [
      makeExpense({ price: 10, categories: ['food', 'meat'] }),
      makeExpense({ price: 5, categories: ['food'] }),
    ];
    const byCategory = aggregateByCategory(expenses);
    expect(byCategory.find((c) => c.key === 'food')?.total).toBe(15);
    expect(byCategory.find((c) => c.key === 'meat')?.total).toBe(10);
  });

  it('sums price per spender', () => {
    const expenses = [
      makeExpense({ price: 10, paidBy: 'a' }),
      makeExpense({ price: 5, paidBy: 'a' }),
      makeExpense({ price: 20, paidBy: 'b' }),
    ];
    const bySpender = aggregateBySpender(expenses);
    expect(bySpender.find((s) => s.key === 'a')?.total).toBe(15);
    expect(bySpender.find((s) => s.key === 'b')?.total).toBe(20);
  });
});
