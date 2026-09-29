import { describe, it, expect } from 'vitest';
import { TenancyManager } from '../../domain/src/tenancyManager.js';

describe('Tenancy & RLS Invariants', () => {
  const orgAId = 'a0000000-0000-0000-0000-000000000001';
  const orgBId = 'b0000000-0000-0000-0000-000000000002';

  const mockLocations = [
    { id: 'loc-1', organizationId: orgAId, name: 'Kobe Rosario Centro', address: 'Pellegrini 1200' },
    { id: 'loc-2', organizationId: orgAId, name: 'Kobe Pichincha', address: 'Alvear 450' },
    { id: 'loc-3', organizationId: orgBId, name: 'Bistró Funes Jardín', address: 'Ruta 9 km 315' }
  ];

  it('strictly isolates records by tenant_id', () => {
    const sessionA = 'session-tenant-a';
    TenancyManager.setContext(sessionA, { tenantId: orgAId });

    const tenantARecords = TenancyManager.applyTenantFilter(sessionA, mockLocations);
    expect(tenantARecords).toHaveLength(2);
    expect(tenantARecords.every(r => r.organizationId === orgAId)).toBe(true);

    const sessionB = 'session-tenant-b';
    TenancyManager.setContext(sessionB, { tenantId: orgBId });
    const tenantBRecords = TenancyManager.applyTenantFilter(sessionB, mockLocations);
    expect(tenantBRecords).toHaveLength(1);
    expect(tenantBRecords[0].name).toBe('Bistró Funes Jardín');
  });

  it('rejects query execution if no tenant context is established (Breach Prevention)', () => {
    expect(() => {
      TenancyManager.applyTenantFilter('unauthenticated-session', mockLocations);
    }).toThrow('RLS Breach Prevention: No tenant context set for this session');
  });

  it('supports sub-tenancy filtering by location when specified', () => {
    const sessionSub = 'session-sub-location';
    TenancyManager.setContext(sessionSub, { tenantId: orgAId, locationId: 'loc-1' });

    const locRecords = TenancyManager.applyLocationFilter(sessionSub, [
      { id: 'order-1', organizationId: orgAId, locationId: 'loc-1', total: 1000n },
      { id: 'order-2', organizationId: orgAId, locationId: 'loc-2', total: 2000n },
      { id: 'order-3', organizationId: orgBId, locationId: 'loc-3', total: 5000n }
    ]);

    expect(locRecords).toHaveLength(1);
    expect(locRecords[0].id).toBe('order-1');
  });
});
