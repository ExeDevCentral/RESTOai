import { newDb, IMemoryDb } from 'pg-mem';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { applyIntegrationsToPool } from 'drizzle-pgmem';
import * as schema from './schema/schema.js';


export interface KobeDatabaseClient {
  db: NodePgDatabase<typeof schema>;
  mem: IMemoryDb;
}

export function createInMemoryKobeDb(): KobeDatabaseClient {
  const mem = newDb();

  // Registrar extensiones y funciones mock para PostgreSQL
  mem.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return '00000000-0000-4000-8000-000000000001';
    }
  });

  // Ejecutar DDL para crear las tablas relacionales en pg-mem
  mem.public.none(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      tax_id VARCHAR(50) NOT NULL UNIQUE,
      legal_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS locations (
      id UUID PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id),
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS organization_memberships (
      id UUID PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS location_memberships (
      id UUID PRIMARY KEY,
      location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_ledger (
      id UUID PRIMARY KEY,
      organization_id UUID NOT NULL,
      location_id UUID,
      actor_id VARCHAR(100) NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      payload JSONB NOT NULL,
      request_id VARCHAR(100) NOT NULL,
      prev_hash VARCHAR(64),
      hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(100) PRIMARY KEY,
      client_order_id VARCHAR(100) NOT NULL UNIQUE,
      organization_id UUID REFERENCES organizations(id),
      location_id UUID REFERENCES locations(id),
      table_number VARCHAR(50) NOT NULL,
      state VARCHAR(50) NOT NULL,
      total_cents BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY,
      order_id VARCHAR(100) REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents BIGINT NOT NULL,
      station VARCHAR(50) NOT NULL,
      notes TEXT
    );
  `);

  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  applyIntegrationsToPool(pool);

  const db = drizzle(pool, { schema });
  return { db, mem };
}

export * from './schema/index.js';
