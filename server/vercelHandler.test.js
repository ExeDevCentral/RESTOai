import { describe, it, expect } from 'vitest';
import http from 'http';

describe('Vercel Serverless Handler & Resilient Storage', () => {
  it('exports a default serverless handler function', async () => {
    const { default: handler } = await import('../api/index.js');
    expect(typeof handler).toBe('function');
  });

  it('delegates requests to express app in an http server instance', async () => {
    const { default: handler } = await import('../api/index.js');
    const server = http.createServer(handler);

    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const res = await fetch(`http://127.0.0.1:${port}/api/logs`);
    const json = await res.json();
    expect(json).toHaveProperty('success', true);
    expect(Array.isArray(json.logs)).toBe(true);

    await new Promise((resolve) => server.close(resolve));
  });
});
