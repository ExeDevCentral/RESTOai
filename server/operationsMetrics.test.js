import { describe, expect, it } from 'vitest';
import { calculateServiceMetrics, recordOrderStatus } from './operationsMetrics.js';

describe('calculateServiceMetrics', () => {
  it('summarizes order-to-ready and ready-to-served durations', () => {
    const orders = [
      {
        statusHistory: [
          { status: 'pendiente', at: '2026-09-30T12:00:00.000Z' },
          { status: 'en_cocina', at: '2026-09-30T12:02:00.000Z' },
          { status: 'listo', at: '2026-09-30T12:10:00.000Z' },
          { status: 'servido', at: '2026-09-30T12:15:00.000Z' }
        ]
      },
      {
        statusHistory: [
          { status: 'pendiente', at: '2026-09-30T13:00:00.000Z' },
          { status: 'en_cocina', at: '2026-09-30T13:05:00.000Z' },
          { status: 'listo', at: '2026-09-30T13:20:00.000Z' },
          { status: 'servido', at: '2026-09-30T13:30:00.000Z' }
        ]
      }
    ];

    expect(calculateServiceMetrics(orders)).toEqual({
      orderToReady: { sampleSize: 2, medianMinutes: 15, p90Minutes: 20 },
      readyToServed: { sampleSize: 2, medianMinutes: 7.5, p90Minutes: 10 }
    });
  });

  it('excludes missing, invalid, and negative durations from the sample', () => {
    const orders = [
      { statusHistory: [{ status: 'pendiente', at: '2026-09-30T12:00:00.000Z' }] },
      {
        statusHistory: [
          { status: 'pendiente', at: '2026-09-30T12:10:00.000Z' },
          { status: 'listo', at: '2026-09-30T12:00:00.000Z' }
        ]
      },
      {
        statusHistory: [
          { status: 'pendiente', at: 'invalid' },
          { status: 'listo', at: '2026-09-30T12:20:00.000Z' }
        ]
      }
    ];

    expect(calculateServiceMetrics(orders)).toEqual({
      orderToReady: { sampleSize: 0, medianMinutes: null, p90Minutes: null },
      readyToServed: { sampleSize: 0, medianMinutes: null, p90Minutes: null }
    });
  });
});

describe('recordOrderStatus', () => {
  it('records each status transition once with its event timestamp', () => {
    const order = { statusHistory: [] };

    recordOrderStatus(order, 'pendiente', '2026-09-30T12:00:00.000Z');
    recordOrderStatus(order, 'en_cocina', '2026-09-30T12:02:00.000Z');
    recordOrderStatus(order, 'en_cocina', '2026-09-30T12:03:00.000Z');

    expect(order.statusHistory).toEqual([
      { status: 'pendiente', at: '2026-09-30T12:00:00.000Z' },
      { status: 'en_cocina', at: '2026-09-30T12:02:00.000Z' }
    ]);
  });
});