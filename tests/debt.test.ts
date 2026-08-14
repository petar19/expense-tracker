import { describe, expect, it } from 'vitest';
import { computeBalances, simplifyDebts } from '../src/lib/utils/debt';

describe('debt simplification', () => {
  it('produces zero transfers when everyone is already even', () => {
    const balances = computeBalances(
      [
        { uid: 'a', totalPaid: 50, expectedPct: 50 },
        { uid: 'b', totalPaid: 50, expectedPct: 50 },
      ],
      100,
    );
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it('settles a simple two-person imbalance', () => {
    const balances = computeBalances(
      [
        { uid: 'a', totalPaid: 100, expectedPct: 50 },
        { uid: 'b', totalPaid: 0, expectedPct: 50 },
      ],
      100,
    );
    const transfers = simplifyDebts(balances);
    expect(transfers).toEqual([{ from: 'b', to: 'a', amount: 50 }]);
  });

  it('minimizes transfers for a three-person group', () => {
    // Equal 1/3 shares of 120 is 40 each: a paid 90 (+50), b paid 30 (-10), c paid 0 (-40)
    const balances = computeBalances(
      [
        { uid: 'a', totalPaid: 90, expectedPct: 33.33 },
        { uid: 'b', totalPaid: 30, expectedPct: 33.33 },
        { uid: 'c', totalPaid: 0, expectedPct: 33.34 },
      ],
      120,
    );
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(2);
    const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBeCloseTo(50, 0);
  });
});
