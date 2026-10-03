import { describe, it, expect } from 'vitest';
import { cashView, getDiscrepancyMeta } from './cashView.js';

describe('cashView Lifecycle & Helpers', () => {
  it('implements view lifecycle contract (render, mount, cleanup)', () => {
    expect(typeof cashView.render).toBe('function');
    expect(typeof cashView.mount).toBe('function');
    expect(typeof cashView.cleanup).toBe('function');
  });

  it('calculates discrepancy metadata correctly', () => {
    const surplus = getDiscrepancyMeta(1500);
    expect(surplus.color).toBe('#457b9d');
    expect(surplus.text).toBe('+$1.500');

    const deficit = getDiscrepancyMeta(-500);
    expect(deficit.color).toBe('#ef4444');
    expect(deficit.text).toBe('$-500');

    const exact = getDiscrepancyMeta(0);
    expect(exact.color).toBe('#2a9d8f');
    expect(exact.text).toBe('Exacto');
  });
});
