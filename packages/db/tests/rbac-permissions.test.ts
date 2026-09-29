import { describe, it, expect, beforeEach } from 'vitest';
import { RbacManager } from '../../domain/src/rbac.js';

describe('RBAC & Permission Invariants', () => {
  const orgId = 'org-kobe-rosario';
  const locCentro = 'loc-pellegrini';
  const locPichincha = 'loc-alvear';

  const userOwner = 'user-owner';
  const userWaiterCentro = 'user-waiter-1';

  beforeEach(() => {
    RbacManager.clearAssignments();

    // 1. Dueño con alcance a nivel Organización
    RbacManager.assignRole({
      userId: userOwner,
      roleCode: 'OWNER',
      scope: 'ORGANIZATION',
      organizationId: orgId,
      permissions: ['orders:create', 'orders:cancel', 'cash:open', 'cash:close', 'audit:read']
    });

    // 2. Mozo asignado únicamente a sucursal Pellegrini
    RbacManager.assignRole({
      userId: userWaiterCentro,
      roleCode: 'WAITER',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro,
      permissions: ['orders:create', 'kds:view']
    });
  });

  it('allows owner to exercise permissions across all branches/locations of their organization', () => {
    expect(RbacManager.hasPermission(userOwner, 'orders:create', { organizationId: orgId, locationId: locCentro })).toBe(true);
    expect(RbacManager.hasPermission(userOwner, 'orders:create', { organizationId: orgId, locationId: locPichincha })).toBe(true);
    expect(RbacManager.hasPermission(userOwner, 'cash:close', { organizationId: orgId, locationId: locPichincha })).toBe(true);
  });

  it('strictly limits location-scoped staff to their assigned location', () => {
    // Mozo en Pellegrini puede crear órdenes en Pellegrini
    expect(RbacManager.hasPermission(userWaiterCentro, 'orders:create', { organizationId: orgId, locationId: locCentro })).toBe(true);

    // Mozo en Pellegrini NO puede crear órdenes en Pichincha
    expect(RbacManager.hasPermission(userWaiterCentro, 'orders:create', { organizationId: orgId, locationId: locPichincha })).toBe(false);

    // Mozo NO tiene permisos privilegiados de caja ni auditoría
    expect(RbacManager.hasPermission(userWaiterCentro, 'cash:close', { organizationId: orgId, locationId: locCentro })).toBe(false);
    expect(RbacManager.hasPermission(userWaiterCentro, 'audit:read', { organizationId: orgId, locationId: locCentro })).toBe(false);
  });
});
