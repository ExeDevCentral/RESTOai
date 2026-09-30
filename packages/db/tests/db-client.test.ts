import { describe, it, expect } from 'vitest';
import { createInMemoryKobeDb } from '../src/index.js';

describe('Kobe Database In-Memory Client', () => {
  it('initializes in-memory database with drizzle query engine', () => {
    const { db, mem } = createInMemoryKobeDb();
    expect(db).toBeDefined();
    expect(mem).toBeDefined();
  });

  it('allows registering and executing SQL statements on the in-memory engine', async () => {
    const { mem } = createInMemoryKobeDb();
    const result = mem.public.many(`SELECT gen_random_uuid() as id;`);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBeDefined();
  });
});
