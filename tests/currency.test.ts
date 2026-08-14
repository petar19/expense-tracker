import { describe, expect, it } from 'vitest';
import { convertIfNeeded, needsConversion } from '../src/lib/utils/currency';

describe('currency', () => {
  it('flags pre-2023 dates for conversion', () => {
    expect(needsConversion('2022-12-31')).toBe(true);
    expect(needsConversion('2023-01-01')).toBe(false);
    expect(needsConversion('2023-06-01')).toBe(false);
  });

  it('converts HRK to EUR using the fixed peg for old dates', () => {
    expect(convertIfNeeded('2021-05-01', 753.45)).toBeCloseTo(100, 5);
  });

  it('leaves post-switch amounts untouched', () => {
    expect(convertIfNeeded('2023-06-01', 42.5)).toBe(42.5);
  });
});
