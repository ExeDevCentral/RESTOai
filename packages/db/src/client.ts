import { newDb, IMemoryDb } from 'pg-mem';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
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

  const client = mem.adapters.createPg().Client;
  const pgClient = new client();
  pgClient.connect();

  const db = drizzle(pgClient, { schema });
  return { db, mem };
}

export * from './schema/index.js';
