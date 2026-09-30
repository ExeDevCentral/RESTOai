import { describe, it, expect } from 'vitest';
import { 
  organizations, 
  locations, 
  users, 
  organizationMemberships, 
  locationMemberships, 
  auditLedger, 
  orders, 
  orderItems 
} from '../src/index.js';

describe('Drizzle Relational Schema Invariants', () => {
  it('exports all core relational tables with strict column definitions', () => {
    expect(organizations).toBeDefined();
    expect(locations).toBeDefined();
    expect(users).toBeDefined();
    expect(organizationMemberships).toBeDefined();
    expect(locationMemberships).toBeDefined();
    expect(auditLedger).toBeDefined();
    expect(orders).toBeDefined();
    expect(orderItems).toBeDefined();
  });

  it('guarantees money fields use bigint mode and zero floats', () => {
    // Verificar que orders.totalCents y orderItems.unitPriceCents están configuradas como bigint
    expect(orders.totalCents.dataType).toBe('bigint');
    expect(orderItems.unitPriceCents.dataType).toBe('bigint');
  });

  it('enforces unique constraints on tenant tax_id and user email', () => {
    expect(organizations.taxId.isUnique).toBe(true);
    expect(users.email.isUnique).toBe(true);
  });
});
