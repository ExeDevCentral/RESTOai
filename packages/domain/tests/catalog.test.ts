import { describe, it, expect } from 'vitest';
import { CatalogService } from '../src/catalog/catalogService.js';

describe('Catalog & Versioned Pricing Invariants', () => {
  it('creates menu items with price in bigint cents and station mapping', () => {
    const item = CatalogService.createItem({
      id: 'item-bife-chorizo',
      organizationId: 'org-kobe-1',
      name: 'Bife de Chorizo Madurado 400g',
      category: 'PARRILLA',
      station: 'GRILL',
      priceCents: 2450000n, // $24.500,00
      allergens: []
    });

    expect(item.priceCents).toBe(2450000n);
    expect(item.station).toBe('GRILL');
  });

  it('rejects items with invalid or floating prices', () => {
    expect(() => {
      CatalogService.createItem({
        id: 'item-error',
        organizationId: 'org-kobe-1',
        name: 'Plato Invalido',
        category: 'PARRILLA',
        station: 'GRILL',
        priceCents: 150.50 as any, // Float violation
        allergens: []
      });
    }).toThrow();
  });
});
