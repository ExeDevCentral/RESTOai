import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import { requirePermission } from './rbac.js';

describe('Server RBAC Middleware Enforcement', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    app.post('/test/catalog', requirePermission('catalog:edit'), (req, res) => {
      res.json({ success: true, message: 'Plato editado' });
    });

    app.post('/test/orders', requirePermission('orders:create'), (req, res) => {
      res.json({ success: true, message: 'Comanda creada' });
    });

    app.post('/test/cash-open', requirePermission('cash:open'), (req, res) => {
      res.json({ success: true, message: 'Caja abierta' });
    });

    app.post('/test/void', requirePermission('orders:void'), (req, res) => {
      res.json({ success: true, message: 'Comanda anulada' });
    });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('denies COOK from opening cash or editing catalog', async () => {
    const resCash = await fetch(`${baseUrl}/test/cash-open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Role': 'COOK' },
      body: JSON.stringify({})
    });
    expect(resCash.status).toBe(403);
    const jsonCash = await resCash.json();
    expect(jsonCash.message).toContain('⛔ Acceso Denegado por RBAC');

    const resCatalog = await fetch(`${baseUrl}/test/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Role': 'COOK' },
      body: JSON.stringify({})
    });
    expect(resCatalog.status).toBe(403);
  });

  it('allows WAITER to create orders but rejects voiding without PIN', async () => {
    const resOrder = await fetch(`${baseUrl}/test/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Role': 'WAITER' },
      body: JSON.stringify({})
    });
    expect(resOrder.status).toBe(200);

    // Waiter intentando anular sin PIN: denegado
    const resVoidFail = await fetch(`${baseUrl}/test/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Role': 'WAITER' },
      body: JSON.stringify({})
    });
    expect(resVoidFail.status).toBe(403);
    const jsonVoid = await resVoidFail.json();
    expect(jsonVoid.message).toContain('⛔ Acción Crítica Denegada por RBAC');

    // Waiter con PIN supervisor (1234): aprobado
    const resVoidOk = await fetch(`${baseUrl}/test/void`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-User-Role': 'WAITER',
        'X-Supervisor-Pin': '1234'
      },
      body: JSON.stringify({})
    });
    expect(resVoidOk.status).toBe(200);
  });

  it('allows OWNER full authority on all domains', async () => {
    const res = await fetch(`${baseUrl}/test/catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Role': 'OWNER' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(200);
  });
});

