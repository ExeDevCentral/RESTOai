import crypto from 'crypto';
import { eq, desc, asc, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/schema.js';
import { orders, orderItems, auditLedger } from './schema/schema.js';

export interface OrderItemInput {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: bigint;
  station: string;
  notes?: string;
}

export interface CreateOrderInput {
  id?: string;
  clientOrderId: string;
  organizationId?: string;
  locationId?: string;
  tableNumber: string;
  actorId: string;
  items: OrderItemInput[];
}

export interface StoredOrder {
  id: string;
  clientOrderId: string;
  organizationId: string;
  locationId: string;
  tableNumber: string;
  state: string;
  totalCents: bigint;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    name: string;
    quantity: number;
    unitPriceCents: bigint;
    station: string;
    notes?: string | null;
  }>;
  isDuplicate?: boolean;
}

export interface RepositoryOptions {
  defaultOrganizationId: string;
  defaultLocationId: string;
}

export class OrderRepository {
  constructor(
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly options: RepositoryOptions
  ) {}

  async createOrder(input: CreateOrderInput): Promise<StoredOrder> {
    const orgId = input.organizationId || this.options.defaultOrganizationId;
    const locId = input.locationId || this.options.defaultLocationId;

    // Idempotencia: Verificar si clientOrderId ya fue procesada
    const existing = await this.db.select().from(orders).where(eq(orders.clientOrderId, input.clientOrderId));
    if (existing.length > 0) {
      const existingOrder = existing[0];
      const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, existingOrder.id));
      return {
        ...existingOrder,
        items,
        isDuplicate: true
      };
    }

    const orderId = input.id || (crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`);
    let totalCents = 0n;
    for (const item of input.items) {
      totalCents += BigInt(item.quantity) * BigInt(item.unitPriceCents);
    }

    const now = new Date();

    // Inserción en Drizzle
    await this.db.insert(orders).values({
      id: orderId,
      clientOrderId: input.clientOrderId,
      organizationId: orgId,
      locationId: locId,
      tableNumber: input.tableNumber,
      state: 'CONFIRMED',
      totalCents,
      createdAt: now,
      updatedAt: now
    });

    const insertedItems: StoredOrder['items'] = [];
    for (const item of input.items) {
      const itemId = crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random()}`;
      await this.db.insert(orderItems).values({
        id: itemId,
        orderId: orderId,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        station: item.station,
        notes: item.notes || null
      });
      insertedItems.push({
        id: itemId,
        orderId,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        station: item.station,
        notes: item.notes || null
      });
    }

    // Auditoría SHA-256 Atómica encadenada
    const lastAuditRecords = await this.db.select()
      .from(auditLedger)
      .where(eq(auditLedger.organizationId, orgId))
      .orderBy(desc(auditLedger.createdAt))
      .limit(1);

    const prevHash = lastAuditRecords.length > 0 ? lastAuditRecords[0].hash : null;
    const auditId = crypto.randomUUID ? crypto.randomUUID() : `aud-${Date.now()}`;
    const requestId = `req-${input.clientOrderId}`;
    const payload = {
      tableNumber: input.tableNumber,
      itemCount: input.items.length,
      totalCents: totalCents.toString()
    };

    const rawPayload = [
      prevHash || '',
      orgId,
      locId,
      input.actorId,
      'ORDER_CREATED',
      'Order',
      orderId,
      JSON.stringify(payload),
      requestId,
      now.toISOString()
    ].join('|');

    const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    await this.db.insert(auditLedger).values({
      id: auditId,
      organizationId: orgId,
      locationId: locId,
      actorId: input.actorId,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: orderId,
      payload,
      requestId,
      prevHash,
      hash,
      createdAt: now
    });

    return {
      id: orderId,
      clientOrderId: input.clientOrderId,
      organizationId: orgId,
      locationId: locId,
      tableNumber: input.tableNumber,
      state: 'CONFIRMED',
      totalCents,
      createdAt: now,
      updatedAt: now,
      items: insertedItems,
      isDuplicate: false
    };
  }

  async getOrderById(id: string): Promise<StoredOrder | null> {
    const rows = await this.db.select().from(orders).where(eq(orders.id, id));
    if (rows.length === 0) return null;

    const order = rows[0];
    const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, id));

    return {
      ...order,
      items
    };
  }

  async listOrders(filters?: { status?: string; tableNumber?: string }): Promise<StoredOrder[]> {
    let allOrders = await this.db.select().from(orders).orderBy(desc(orders.createdAt));

    if (filters?.status) {
      allOrders = allOrders.filter(o => o.state === filters.status);
    }
    if (filters?.tableNumber) {
      allOrders = allOrders.filter(o => o.tableNumber === filters.tableNumber);
    }

    const result: StoredOrder[] = [];
    for (const order of allOrders) {
      const items = await this.db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      result.push({
        ...order,
        items
      });
    }
    return result;
  }

  async updateOrderStatus(orderId: string, newState: string, actorId: string): Promise<StoredOrder> {
    const existing = await this.getOrderById(orderId);
    if (!existing) {
      throw new Error(`Order ${orderId} not found`);
    }

    const now = new Date();
    await this.db.update(orders)
      .set({ state: newState, updatedAt: now })
      .where(eq(orders.id, orderId));

    // Auditoría encadenada
    const lastAuditRecords = await this.db.select()
      .from(auditLedger)
      .where(eq(auditLedger.organizationId, existing.organizationId))
      .orderBy(desc(auditLedger.createdAt))
      .limit(1);

    const prevHash = lastAuditRecords.length > 0 ? lastAuditRecords[0].hash : null;
    const auditId = crypto.randomUUID ? crypto.randomUUID() : `aud-${Date.now()}`;
    const requestId = `req-status-${orderId}-${Date.now()}`;
    const payload = {
      previousState: existing.state,
      newState
    };

    const rawPayload = [
      prevHash || '',
      existing.organizationId,
      existing.locationId,
      actorId,
      'ORDER_STATUS_CHANGED',
      'Order',
      orderId,
      JSON.stringify(payload),
      requestId,
      now.toISOString()
    ].join('|');

    const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    await this.db.insert(auditLedger).values({
      id: auditId,
      organizationId: existing.organizationId,
      locationId: existing.locationId,
      actorId,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'Order',
      entityId: orderId,
      payload,
      requestId,
      prevHash,
      hash,
      createdAt: now
    });

    const updated = await this.getOrderById(orderId);
    return updated!;
  }

  async getOrderAuditTimeline(orderId: string) {
    return await this.db.select()
      .from(auditLedger)
      .where(eq(auditLedger.entityId, orderId))
      .orderBy(asc(auditLedger.createdAt));
  }
}
