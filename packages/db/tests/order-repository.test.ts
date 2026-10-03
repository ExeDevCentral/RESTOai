import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryKobeDb } from '../src/client.js';
import { OrderRepository } from '../src/repository.js';
import { organizations, locations } from '../src/schema/schema.js';

describe('OrderRepository (Deep Module Seam)', () => {
  let dbClient: ReturnType<typeof createInMemoryKobeDb>;
  let repo: OrderRepository;
  const defaultOrgId = '00000000-0000-4000-8000-000000000001';
  const defaultLocId = '00000000-0000-4000-8000-000000000002';

  beforeEach(async () => {
    dbClient = createInMemoryKobeDb();
    
    // Configurar tenant y sucursal base
    await dbClient.db.insert(organizations).values({
      id: defaultOrgId,
      name: 'RESTOia Gastronomy Group',
      taxId: '30-71829301-4',
      legalName: 'RESTOia S.R.L.'
    });

    await dbClient.db.insert(locations).values({
      id: defaultLocId,
      organizationId: defaultOrgId,
      name: 'Salón Central',
      address: 'Bv. Oroño 1234'
    });

    repo = new OrderRepository(dbClient.db, {
      defaultOrganizationId: defaultOrgId,
      defaultLocationId: defaultLocId
    });
  });

  it('creates an order with items and records SHA-256 audit ledger atomically', async () => {
    const input = {
      clientOrderId: 'cli-ord-001',
      tableNumber: 'M-04',
      actorId: 'usr-waiter-01',
      items: [
        {
          menuItemId: 'dish-1',
          name: 'Bife de Chorizo Madurado',
          quantity: 2,
          unitPriceCents: 2450000n, // $24.500,00
          station: 'GRILL'
        },
        {
          menuItemId: 'dish-8',
          name: 'Empanadas Criollas',
          quantity: 1,
          unitPriceCents: 780000n, // $7.800,00
          station: 'COLD_APPETIZERS'
        }
      ]
    };

    const created = await repo.createOrder(input);

    expect(created.id).toBeDefined();
    expect(created.clientOrderId).toBe('cli-ord-001');
    expect(created.tableNumber).toBe('M-04');
    expect(created.state).toBe('CONFIRMED');
    expect(created.totalCents).toBe(2450000n * 2n + 780000n); // 5680000n
    expect(created.items).toHaveLength(2);

    // Verificar consulta por ID
    const found = await repo.getOrderById(created.id);
    expect(found).not.toBeNull();
    expect(found?.clientOrderId).toBe('cli-ord-001');
    expect(found?.items).toHaveLength(2);

    // Verificar que el bloque de auditoría fue creado con hash SHA-256
    const auditEntries = await repo.getOrderAuditTimeline(created.id);
    expect(auditEntries.length).toBeGreaterThan(0);
    expect(auditEntries[0].action).toBe('ORDER_CREATED');
    expect(auditEntries[0].hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('guarantees idempotency when creating an order with the same clientOrderId', async () => {
    const input = {
      clientOrderId: 'cli-ord-idempotent-99',
      tableNumber: 'M-02',
      actorId: 'usr-waiter-01',
      items: [
        {
          menuItemId: 'dish-6',
          name: 'Provoleta Especial',
          quantity: 1,
          unitPriceCents: 1150000n,
          station: 'GRILL'
        }
      ]
    };

    const first = await repo.createOrder(input);
    const second = await repo.createOrder(input);

    expect(second.id).toBe(first.id);
    expect(second.isDuplicate).toBe(true);

    const all = await repo.listOrders();
    const matches = all.filter(o => o.clientOrderId === 'cli-ord-idempotent-99');
    expect(matches).toHaveLength(1);
  });

  it('updates order status and atomically records status transition in audit ledger', async () => {
    const input = {
      clientOrderId: 'cli-ord-state-01',
      tableNumber: 'M-01',
      actorId: 'usr-waiter-01',
      items: [
        {
          menuItemId: 'dish-4',
          name: 'Raviolones de Cordero',
          quantity: 1,
          unitPriceCents: 1980000n,
          station: 'PASTA_OVEN'
        }
      ]
    };

    const order = await repo.createOrder(input);
    const updated = await repo.updateOrderStatus(order.id, 'IN_PREPARATION', 'usr-chef-01');

    expect(updated.state).toBe('IN_PREPARATION');

    const timeline = await repo.getOrderAuditTimeline(order.id);
    expect(timeline).toHaveLength(2);
    expect(timeline[1].action).toBe('ORDER_STATUS_CHANGED');
    expect(timeline[1].actorId).toBe('usr-chef-01');
    expect(timeline[1].prevHash).toBe(timeline[0].hash);
  });
});
