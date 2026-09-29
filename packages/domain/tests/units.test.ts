import { describe, it, expect } from 'vitest';
import { UnitConverter } from '../src/inventory/units.js';

describe('Unit Conversion Invariants', () => {
  it('converts kilograms to integer grams without floats', () => {
    const grams = UnitConverter.toGrams(20, 'KG');
    expect(grams).toBe(20000);
  });

  it('converts liters to integer milliliters without floats', () => {
    const ml = UnitConverter.toMl(5, 'L');
    expect(ml).toBe(5000);
  });

  it('rejects negative or fractional unit conversions', () => {
    expect(() => UnitConverter.toGrams(-5, 'KG')).toThrow();
  });
});
