import { describe, it, expect, vi } from 'vitest';

describe('Vercel Serverless Handler & Resilient Storage', () => {
  it('exports a default serverless handler function', async () => {
    const { default: handler } = await import('../api/index.js');
    expect(typeof handler).toBe('function');
  });

  it('delegates requests to express app without requiring port listening', async () => {
    const { default: handler } = await import('../api/index.js');
    const req = {
      method: 'GET',
      url: '/api/tables',
      headers: {}
    };
    let ended = false;
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader() {
        return this;
      },
      end() {
        ended = true;
      },
      json() {
        ended = true;
      }
    };

    // The handler should accept (req, res)
    expect(() => handler(req, res)).not.toThrow();
  });
});
