import { describe, expect, it } from 'vitest';
import { sortOrdersByAge } from './kdsView.js';

describe('sortOrdersByAge', () => {
  it('prioritizes the oldest orders and keeps invalid timestamps at the end', () => {
    const orders = [
      { id: 'recent', createdAt: '2026-09-30T12:10:00.000Z' },
      { id: 'invalid-a', createdAt: 'not-a-date' },
      { id: 'oldest', createdAt: '2026-09-30T12:00:00.000Z' },
      { id: 'invalid-b' }
    ];

    expect(sortOrdersByAge(orders).map(order => order.id)).toEqual([
      'oldest',
      'recent',
      'invalid-a',
      'invalid-b'
    ]);
  });
});