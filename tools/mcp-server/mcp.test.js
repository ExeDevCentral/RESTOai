import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_SCRIPT = path.join(__dirname, 'index.js');

describe('RESTOia MCP Server Protocol', () => {
  it('handles initialize and tools/list via JSON-RPC', async () => {
    const proc = spawn('node', [MCP_SCRIPT], { stdio: ['pipe', 'pipe', 'inherit'] });

    let stdoutBuffer = '';
    const pendingResolvers = [];

    proc.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop(); // keep remainder

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const resolver = pendingResolvers.shift();
          if (resolver) resolver(parsed);
        } catch (e) {
          // ignore non-json
        }
      }
    });

    const sendAndReceive = (msg) => {
      return new Promise((resolve) => {
        pendingResolvers.push(resolve);
        proc.stdin.write(JSON.stringify(msg) + '\n');
      });
    };

    // 1. Initialize
    const initRes = await sendAndReceive({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(initRes.id).toBe(1);
    expect(initRes.serverInfo.name).toBe('restoia-mcp');

    // 2. Tools list
    const toolsRes = await sendAndReceive({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    expect(toolsRes.id).toBe(2);
    expect(Array.isArray(toolsRes.tools)).toBe(true);
    const toolNames = toolsRes.tools.map(t => t.name);
    expect(toolNames).toContain('restoia_get_kpis');
    expect(toolNames).toContain('restoia_export_pandas_dataset');
    expect(toolNames).toContain('restoia_sync_mysql');
    expect(toolNames).toContain('restoia_emit_fiscal_invoice');

    // 3. Call tool restoia_get_kpis
    const callRes = await sendAndReceive({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'restoia_get_kpis', arguments: {} }
    });
    expect(callRes.id).toBe(3);
    const parsed = JSON.parse(callRes.content[0].text);
    expect(parsed).toHaveProperty('totalOrders');
    expect(parsed).toHaveProperty('totalTables');

    proc.kill();
  });
});
