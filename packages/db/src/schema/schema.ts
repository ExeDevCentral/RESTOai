import { pgTable, text, uuid, varchar, timestamp, boolean, jsonb, bigint, integer, index } from 'drizzle-orm/pg-core';

// ============================================================================
// 1. ORGANIZATIONS (TENANTS)
// ============================================================================
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  taxId: varchar('tax_id', { length: 50 }).notNull().unique(), // CUIT en Argentina
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ============================================================================
// 2. LOCATIONS (SUCURSALES FÍSICAS)
// ============================================================================
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ============================================================================
// 3. USERS (IDENTIDADES)
// ============================================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ============================================================================
// 4. MEMBERSHIPS & RBAC
// ============================================================================
export const organizationMemberships = pgTable('organization_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // OWNER, ADMIN, AUDITOR
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const locationMemberships = pgTable('location_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // CHEF, WAITER, CASHIER, MANAGER
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ============================================================================
// 5. AUDIT LEDGER (TAMPER-PROOF CRIPTOGRÁFICO SHA-256)
// ============================================================================
export const auditLedger = pgTable('audit_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id),
  actorId: uuid('actor_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  requestId: varchar('request_id', { length: 100 }).notNull(),
  prevHash: varchar('prev_hash', { length: 64 }),
  hash: varchar('hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('idx_audit_timeline').on(table.organizationId, table.createdAt)
]);

// ============================================================================
// 6. ORDERS & TRANSACTIONS (OPERACIONAL CON BIGINT CENTS)
// ============================================================================
export const orders = pgTable('orders', {
  id: varchar('id', { length: 100 }).primaryKey(),
  clientOrderId: varchar('client_order_id', { length: 100 }).notNull().unique(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
  tableNumber: varchar('table_number', { length: 50 }).notNull(),
  state: varchar('state', { length: 50 }).notNull(), // DRAFT, CONFIRMED, IN_PREPARATION, READY, DELIVERED, CANCELLED, CLOSED
  totalCents: bigint('total_cents', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: varchar('order_id', { length: 100 }).references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: varchar('menu_item_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: bigint('unit_price_cents', { mode: 'bigint' }).notNull(),
  station: varchar('station', { length: 50 }).notNull(), // GRILL, PASTA_OVEN, COLD_APPETIZERS, DESSERTS, BAR
  notes: text('notes')
});
