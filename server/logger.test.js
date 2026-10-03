import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger.js';

describe('Structured Logger for AI and Observability', () => {
  it('records and formats tagged log entries', () => {
    logger.api('Test endpoint invoked', { method: 'POST', path: '/api/orders' });
    const logs = logger.getRecentLogs('[API]');
    expect(logs.length).toBeGreaterThan(0);
    const last = logs[logs.length - 1];
    expect(last.tag).toBe('[API]');
    expect(last.message).toBe('Test endpoint invoked');
    expect(last.metadata.method).toBe('POST');
  });

  it('records error with stack trace and tag', () => {
    logger.error('[DATABASE]', 'Query failed', new Error('Timeout connection'));
    const logs = logger.getRecentLogs('[DATABASE]');
    const last = logs[logs.length - 1];
    expect(last.tag).toBe('[DATABASE]');
    expect(last.level).toBe('ERROR');
    expect(last.metadata.error).toBe('Timeout connection');
  });
});
