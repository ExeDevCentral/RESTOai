import { describe, it, expect, beforeEach } from 'vitest';
import { RbacManager, type RoleAssignment } from '../../domain/src/rbac.js';

describe('Hierarchical Gastronomy RBAC & Matrix Invariants', () => {
  const orgId = 'org-kobe-rosario';
  const locCentro = 'loc-pellegrini';
  const locPichincha = 'loc-alvear';

  const userOwner = 'usr-owner';
  const userAdmin = 'usr-admin';
  const userManager = 'usr-manager';
  const userAuditor = 'usr-auditor';
  const userCashier = 'usr-cashier';
  const userChef = 'usr-chef';
  const userCook = 'usr-cook';
  const userBartender = 'usr-bartender';
  const userWaiter = 'usr-waiter';
  const userRunner = 'usr-runner';

  beforeEach(() => {
    RbacManager.clearAssignments();

    // 1. Owner (Org scope)
    RbacManager.assignRole({
      userId: userOwner,
      roleCode: 'OWNER',
      scope: 'ORGANIZATION',
      organizationId: orgId
    });

    // 2. Admin (Org scope)
    RbacManager.assignRole({
      userId: userAdmin,
      roleCode: 'ADMIN',
      scope: 'ORGANIZATION',
      organizationId: orgId
    });

    // 3. Manager (Location scope Centro)
    RbacManager.assignRole({
      userId: userManager,
      roleCode: 'MANAGER',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });

    // 3. Auditor (Location scope Centro)
    RbacManager.assignRole({
      userId: userAuditor,
      roleCode: 'AUDITOR',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });

    // 4. Cashier (Location scope Centro)
    RbacManager.assignRole({
      userId: userCashier,
      roleCode: 'CASHIER',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });

    // 4. Chef (Location scope Centro)
    RbacManager.assignRole({
      userId: userChef,
      roleCode: 'CHEF',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });

    // 5. Cook (Location scope Centro)
    RbacManager.assignRole({
      userId: userCook,
      roleCode: 'COOK',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });

    // 5. Bartender (Location scope Centro)
    RbacManager.assignRole({
      userId: userBartender,
      roleCode: 'BARTENDER',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });

    // 6. Waiter (Location scope Centro)
    RbacManager.assignRole({
      userId: userWaiter,
      roleCode: 'WAITER',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });

    // 7. Runner / Host (Location scope Centro)
    RbacManager.assignRole({
      userId: userRunner,
      roleCode: 'RUNNER_HOST',
      scope: 'LOCATION',
      organizationId: orgId,
      locationId: locCentro
    });
  });

  it('Owner has access to all domains including billing, multi-location and audit', () => {
    const scopeCentro = { organizationId: orgId, locationId: locCentro };
    const scopePichincha = { organizationId: orgId, locationId: locPichincha };

    expect(RbacManager.hasPermission(userOwner, 'tenant:billing', scopeCentro)).toBe(true);
    expect(RbacManager.hasPermission(userOwner, 'audit:read', scopePichincha)).toBe(true);
    expect(RbacManager.hasPermission(userOwner, 'orders:void', scopeCentro)).toBe(true);
  });

  it('Admin manages system and catalog but CANNOT see sensitive financial reports or billing', () => {
    const scope = { organizationId: orgId, locationId: locCentro };

    expect(RbacManager.hasPermission(userAdmin, 'system:config', scope)).toBe(true);
    expect(RbacManager.hasPermission(userAdmin, 'system:printers', scope)).toBe(true);
    expect(RbacManager.hasPermission(userAdmin, 'catalog:edit', scope)).toBe(true);

    expect(RbacManager.hasPermission(userAdmin, 'tenant:billing', scope)).toBe(false);
    expect(RbacManager.hasPermission(userAdmin, 'reports:financial_sensitive', scope)).toBe(false);
  });

  it('Auditor has strictly READ-ONLY permissions and zero write/mutation permissions', () => {
    const scope = { organizationId: orgId, locationId: locCentro };

    expect(RbacManager.hasPermission(userAuditor, 'audit:read', scope)).toBe(true);
    expect(RbacManager.hasPermission(userAuditor, 'reports:financial_sensitive', scope)).toBe(true);
    expect(RbacManager.hasPermission(userAuditor, 'inventory:read', scope)).toBe(true);

    // Cero escritura
    expect(RbacManager.hasPermission(userAuditor, 'orders:create', scope)).toBe(false);
    expect(RbacManager.hasPermission(userAuditor, 'cash:open', scope)).toBe(false);
    expect(RbacManager.hasPermission(userAuditor, 'inventory:waste', scope)).toBe(false);
  });

  it('Cashier can collect and count cash but cannot edit stock or catalog', () => {
    const scope = { organizationId: orgId, locationId: locCentro };

    expect(RbacManager.hasPermission(userCashier, 'cash:collect', scope)).toBe(true);
    expect(RbacManager.hasPermission(userCashier, 'cash:count', scope)).toBe(true);

    expect(RbacManager.hasPermission(userCashier, 'catalog:edit', scope)).toBe(false);
    expect(RbacManager.hasPermission(userCashier, 'inventory:adjust', scope)).toBe(false);
  });

  it('Chef manages recipes, stock and waste; Cook and Bartender are station-limited', () => {
    const scope = { organizationId: orgId, locationId: locCentro };

    // Chef
    expect(RbacManager.hasPermission(userChef, 'recipes:manage', scope)).toBe(true);
    expect(RbacManager.hasPermission(userChef, 'inventory:waste', scope)).toBe(true);

    // Cook: Solo KDS de cocina
    expect(RbacManager.hasPermission(userCook, 'kds:kitchen:view', scope)).toBe(true);
    expect(RbacManager.hasPermission(userCook, 'kds:kitchen:status', scope)).toBe(true);
    expect(RbacManager.hasPermission(userCook, 'recipes:manage', scope)).toBe(false);

    // Bartender: Solo barra y stock de bebidas
    expect(RbacManager.hasPermission(userBartender, 'kds:bar:view', scope)).toBe(true);
    expect(RbacManager.hasPermission(userBartender, 'kds:kitchen:view', scope)).toBe(false);
  });

  it('Waiter can create orders and request bill, but cannot collect or void orders', () => {
    const scope = { organizationId: orgId, locationId: locCentro };

    expect(RbacManager.hasPermission(userWaiter, 'orders:create', scope)).toBe(true);
    expect(RbacManager.hasPermission(userWaiter, 'orders:request_bill', scope)).toBe(true);

    expect(RbacManager.hasPermission(userWaiter, 'cash:collect', scope)).toBe(false);
    expect(RbacManager.hasPermission(userWaiter, 'orders:void', scope)).toBe(false);
  });

  it('Critical action (orders:void) requires Manager/Owner or supervisor PIN approval', () => {
    const scope = { organizationId: orgId, locationId: locCentro };

    // 1. Waiter intentando anular directamente: RECHAZADO
    const directWaiter = RbacManager.canExecuteCriticalAction(userWaiter, 'orders:void', scope);
    expect(directWaiter.allowed).toBe(false);

    // 2. Manager intentando anular directamente: APROBADO
    const directManager = RbacManager.canExecuteCriticalAction(userManager, 'orders:void', scope);
    expect(directManager.allowed).toBe(true);

    // 3. Waiter autorizando con PIN de supervisor Manager: APROBADO
    RbacManager.registerSupervisorPin(userManager, '9988');
    const pinApproval = RbacManager.canExecuteCriticalAction(userWaiter, 'orders:void', scope, '9988');
    expect(pinApproval.allowed).toBe(true);

    // 4. Waiter con PIN erróneo: RECHAZADO
    const badPin = RbacManager.canExecuteCriticalAction(userWaiter, 'orders:void', scope, '0000');
    expect(badPin.allowed).toBe(false);
  });

  it('Enforces Segregation of Duties (SoD) between cashier and refund approver/auditor', () => {
    // Quien cobró (userCashier) NO puede auditarse o auto-aprobarse un refund
    const isSeparated = RbacManager.validateSegregationOfDuties(userCashier, userManager);
    expect(isSeparated).toBe(true);

    const selfAudit = RbacManager.validateSegregationOfDuties(userCashier, userCashier);
    expect(selfAudit).toBe(false);
  });
});
