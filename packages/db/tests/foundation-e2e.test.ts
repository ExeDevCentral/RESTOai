import { describe, it, expect, beforeEach } from 'vitest';
import { 
  TenancyManager, 
  RbacManager, 
  AuditLedger, 
  MoneySchema 
} from '../../domain/src/index.js';

describe('Phase 0 End-to-End Foundation Integration', () => {
  const orgKobeId = 'org-kobe-chain-arg';
  const locRosario = 'loc-rosario-pellegrini';
  const locFunes = 'loc-funes-gardens';

  const userOwner = 'usr-owner-patron';
  const userWaiterRosario = 'usr-waiter-pellegrini';

  beforeEach(() => {
    RbacManager.clearAssignments();
    AuditLedger.clearLedger();

    // Configurar roles y membresías
    RbacManager.assignRole({
      userId: userOwner,
      roleCode: 'OWNER',
      scope: 'ORGANIZATION',
      organizationId: orgKobeId,
      permissions: ['orders:create', 'orders:cancel', 'cash:open', 'cash:close', 'audit:read']
    });

    RbacManager.assignRole({
      userId: userWaiterRosario,
      roleCode: 'WAITER',
      scope: 'LOCATION',
      organizationId: orgKobeId,
      locationId: locRosario,
      permissions: ['orders:create', 'kds:view']
    });
  });

  it('proves Phase 0 Exit Criteria: Tenancy Isolation + RBAC Enforcement + Tamper-Proof Audit Chain', () => {
    // 1. Sesión y Contexto del Mozo en Rosario
    const sessionWaiter = 'sess-waiter-1';
    TenancyManager.setContext(sessionWaiter, {
      tenantId: orgKobeId,
      locationId: locRosario,
      userId: userWaiterRosario
    });

    // 2. Verificación de permisos de mozo: puede crear en Rosario, no en Funes
    expect(RbacManager.hasPermission(userWaiterRosario, 'orders:create', {
      organizationId: orgKobeId,
      locationId: locRosario
    })).toBe(true);

    expect(RbacManager.hasPermission(userWaiterRosario, 'orders:create', {
      organizationId: orgKobeId,
      locationId: locFunes
    })).toBe(false);

    // 3. Crear orden y registrar en Audit Ledger con moneda bigint (centavos)
    const orderTotalCents = MoneySchema.parse(8450000n); // $84.500,00 en centavos
    const auditEvent1 = AuditLedger.appendRecord({
      organizationId: orgKobeId,
      locationId: locRosario,
      actorId: userWaiterRosario,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: 'ord-kobe-777',
      payload: { totalCents: orderTotalCents.toString(), table: 'M-04' },
      requestId: 'req-e2e-001'
    });

    // 4. Operación del Dueño: Apertura de Caja y Auditoría
    const sessionOwner = 'sess-owner-root';
    TenancyManager.setContext(sessionOwner, {
      tenantId: orgKobeId,
      userId: userOwner
    });

    const auditEvent2 = AuditLedger.appendRecord({
      organizationId: orgKobeId,
      locationId: locRosario,
      actorId: userOwner,
      action: 'CASH_REGISTER_OPENED',
      entityType: 'CashRegisterSession',
      entityId: 'cash-sess-01',
      payload: { initialFloatCents: '5000000' },
      requestId: 'req-e2e-002'
    });

    // 5. Verificación de invariantes:
    // a. Hash chain conectada criptográficamente
    expect(auditEvent2.prevHash).toBe(auditEvent1.hash);
    expect(AuditLedger.verifyIntegrity(orgKobeId).isValid).toBe(true);

    // b. Auditoría sólo accesible para el dueño
    expect(RbacManager.hasPermission(userOwner, 'audit:read', { organizationId: orgKobeId })).toBe(true);
    expect(RbacManager.hasPermission(userWaiterRosario, 'audit:read', { organizationId: orgKobeId })).toBe(false);

    // c. Aislamiento estricto de datos por sucursal
    const ordersInDb = [
      { id: 'ord-1', organizationId: orgKobeId, locationId: locRosario },
      { id: 'ord-2', organizationId: orgKobeId, locationId: locFunes },
      { id: 'ord-3', organizationId: 'another-tenant', locationId: 'loc-other' }
    ];

    const waiterVisibleOrders = TenancyManager.applyLocationFilter(sessionWaiter, ordersInDb);
    expect(waiterVisibleOrders).toHaveLength(1);
    expect(waiterVisibleOrders[0].id).toBe('ord-1');
  });
});
