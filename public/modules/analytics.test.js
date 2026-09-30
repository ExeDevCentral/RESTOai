import { describe, expect, it } from 'vitest';
import { normalizeSalesHistory } from './analytics.js';

describe('normalizeSalesHistory', () => {
  it('accepts the API date/totalSales shape and the legacy time/amount shape', () => {
    expect(normalizeSalesHistory([
      { date: '2026-09-28', totalSales: 450000 },
      { time: '21:00', amount: 125000 }
    ])).toEqual([
      { label: '2026-09-28', amount: 450000 },
      { label: '21:00', amount: 125000 }
    ]);
  });

  it('drops entries with missing labels or non-finite sales', () => {
    expect(normalizeSalesHistory([
      { date: '2026-09-28', totalSales: 'not-money' },
      { totalSales: 100 },
      { time: '20:00', amount: 0 }
    ])).toEqual([{ label: '20:00', amount: 0 }]);
  });
});