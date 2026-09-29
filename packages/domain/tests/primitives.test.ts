import { describe, it, expect } from 'vitest';
import { MoneySchema, WeightGramsSchema } from '../src/primitives.js';

describe('Domain Invariants - Financial & Physical Primitives', () => {
  it('enforces money as non-negative bigint (cents), rejecting floats', () => {
    const validCents = 150000n;
    expect(MoneySchema.parse(validCents)).toBe(150000n);

    // Number float must be rejected
    expect(() => MoneySchema.parse(150.5)).toThrow();
  });

  it('enforces weight in integer grams, rejecting fractional grams in integer schema', () => {
    expect(WeightGramsSchema.parse(350)).toBe(350);
    expect(() => WeightGramsSchema.parse(350.75)).toThrow();
  });
});
