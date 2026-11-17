import { describe, it, expect } from 'vitest';
import http from 'http';
import app from './index.js';

async function withServer(fn) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe('Health and Reservations API', () => {
  it('returns service health telemetry from GET /api/health', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('kobe-gastronomic-engine');
      expect(typeof body.uptimeSeconds).toBe('number');
    });
  });

  it('rejects incomplete reservation payloads with 400', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: 'Exequiel' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  it('rejects non-positive guest counts with 400', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Exequiel',
          date: '2026-11-18',
          time: '21:00',
          guests: 0,
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });
});
