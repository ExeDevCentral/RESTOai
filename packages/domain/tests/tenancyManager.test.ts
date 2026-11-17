import { describe, it, expect, afterEach } from 'vitest';
import { TenancyManager } from '../src/tenancyManager.js';

describe('TenancyManager', () => {
  const sessionIds = ['sess-a', 'sess-b'];

  afterEach(() => {
    for (const id of sessionIds) {
      TenancyManager.clearContext(id);
    }
  });

  it('throws when no tenant context is set', () => {
    expect(() =>
      TenancyManager.applyTenantFilter('sess-missing', [{ organizationId: 'org-1' }])
    ).toThrow(/RLS Breach Prevention/);
  });

  it('filters records by organizationId and optional locationId', () => {
    TenancyManager.setContext('sess-a', { tenantId: 'org-1', locationId: 'loc-1' });
    const records = [
      { id: 1, organizationId: 'org-1', locationId: 'loc-1' },
      { id: 2, organizationId: 'org-1', locationId: 'loc-2' },
      { id: 3, organizationId: 'org-1' },
      { id: 4, organizationId: 'org-2', locationId: 'loc-1' },
    ];

    expect(TenancyManager.applyTenantFilter('sess-a', records).map((r) => r.id)).toEqual([1, 2, 3]);
    expect(TenancyManager.applyLocationFilter('sess-a', records).map((r) => r.id)).toEqual([1, 3]);

    TenancyManager.clearContext('sess-a');
    expect(TenancyManager.getContext('sess-a')).toBeUndefined();
  });
});
