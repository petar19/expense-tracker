import { describe, expect, it } from 'vitest';
import { computePerItemPrice, computeTotalPrice } from '../src/lib/utils/pricing';

describe('computeTotalPrice', () => {
  it('multiplies price per item by the item count', () => {
    expect(computeTotalPrice(2.5, 3)).toBe(7.5);
  });

  it('treats a missing/zero count as a single item', () => {
    expect(computeTotalPrice(9.99, undefined)).toBe(9.99);
    expect(computeTotalPrice(9.99, null)).toBe(9.99);
    expect(computeTotalPrice(9.99, 0)).toBe(9.99);
  });

  it('rounds to two decimal places', () => {
    expect(computeTotalPrice(3.333, 3)).toBe(10);
  });
});

describe('computePerItemPrice', () => {
  it('divides the saved total back to a per-item figure for editing', () => {
    expect(computePerItemPrice(7.5, 3)).toBe(2.5);
  });

  it('treats a missing/zero count as a single item', () => {
    expect(computePerItemPrice(9.99, undefined)).toBe(9.99);
    expect(computePerItemPrice(9.99, 0)).toBe(9.99);
  });

  it('round-trips with computeTotalPrice for a clean multiple', () => {
    const perItem = 4;
    const count = 5;
    const total = computeTotalPrice(perItem, count);
    expect(computePerItemPrice(total, count)).toBe(perItem);
  });
});
