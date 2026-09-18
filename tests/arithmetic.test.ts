import { describe, expect, it } from 'vitest';
import { evaluateArithmetic } from '../src/lib/utils/arithmetic';

describe('evaluateArithmetic', () => {
  it('sums +-joined amounts (the original migration format)', () => {
    expect(evaluateArithmetic('30+12+12+20+16+9')).toBe(99);
  });

  it('supports multiplication, division, subtraction', () => {
    expect(evaluateArithmetic('45*5')).toBe(225);
    expect(evaluateArithmetic('10/2')).toBe(5);
    expect(evaluateArithmetic('10-3')).toBe(7);
  });

  it('respects standard operator precedence', () => {
    expect(evaluateArithmetic('2+3*4')).toBe(14); // not 20
  });

  it('handles a standalone negative correction', () => {
    expect(evaluateArithmetic('-20')).toBe(-20);
  });

  it('rejects malformed input instead of guessing', () => {
    expect(evaluateArithmetic('abc')).toBeNull();
    expect(evaluateArithmetic('5+')).toBeNull();
    expect(evaluateArithmetic('5 5')).toBeNull();
  });
});
