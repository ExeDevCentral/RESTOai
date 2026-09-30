import { describe, expect, it } from 'vitest';
import { filterAvailableMenu, getTableLabel } from './guestMenu.js';

describe('guest menu helpers', () => {
  it('filters unavailable dishes and applies the selected category and search', () => {
    const menu = [
      { name: 'Bife madurado', category: 'Principales', available: true },
      { name: 'Raviolones', category: 'Pastas', available: true },
      { name: 'Bife agotado', category: 'Principales', available: false }
    ];

    expect(filterAvailableMenu(menu, 'Principales', 'bife').map(item => item.name))
      .toEqual(['Bife madurado']);
  });

  it('accepts only simple table labels from QR parameters', () => {
    expect(getTableLabel('?mesa=M-01')).toBe('M-01');
    expect(getTableLabel('?mesa=%3Cscript%3E')).toBeNull();
    expect(getTableLabel('?otra=M-01')).toBeNull();
  });
});