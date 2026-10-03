#!/usr/bin/env node

/**
 * RESTOia / KOBE MCP (Model Context Protocol) Server
 * Proporciona herramientas estándar para que LLMs, asistentes IDE y agentes autónomos
 * puedan consultar métricas, exportar datasets a Pandas, sincronizar MySQL y emitir facturación fiscal.
 */

import { db } from '../../server/db.js';
import { logger } from '../../server/logger.js';
import { formatOrdersForPandas, formatInventoryForPandas, generateMySqlDump, processFiscalInvoice } from '../../server/routes/integrations.js';

const TOOLS = [
  {
    name: 'restoia_get_kpis',
    description: 'Obtiene las métricas operativas y financieras en tiempo real de RESTOia (ventas, ocupación de salón, comandas en cocina y estado de caja).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'restoia_export_pandas_dataset',
    description: 'Exporta los datos de ventas o inventario en formato tabular estructurado optimizado para análisis con Pandas en Python.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: {
          type: 'string',
          enum: ['sales', 'inventory'],
          description: 'Dataset a exportar: "sales" para comandas y facturación, "inventory" para rotación y stock FEFO.'
        }
      },
      required: ['dataset']
    }
  },
  {
    name: 'restoia_sync_mysql',
    description: 'Genera el script transaccional SQL y estado de sincronización hacia una base de datos relacional MySQL / MariaDB externa.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'restoia_emit_fiscal_invoice',
    description: 'Emite una factura fiscal electrónica formal (Factura A o B) con CAE homologado según normativa ARCA / AFIP utilizando el motor KOBE.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'ID de la comanda a facturar' },
        invoiceType: { type: 'string', enum: ['A', 'B'], description: 'Tipo de comprobante: A (Resp. Inscripto) o B (Consumidor Final)' },
        customerDoc: { type: 'string', description: 'CUIT o DNI del cliente' },
        netAmountARS: { type: 'number', description: 'Importe neto gravado en Pesos Argentinos' },
        ivaRate: { type: 'number', enum: [10.5, 21.0], description: 'Alícuota de IVA aplicable (21% o 10.5%)' }
      },
      required: ['orderId', 'invoiceType', 'netAmountARS']
    }
  },
  {
    name: 'restoia_get_system_logs',
    description: 'Consulta los logs estructurados recientes del servidor RESTOia filtrados por etiqueta ([API], [DATABASE], [PAYMENT], [FISCAL], [AI], [ERROR]).',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: 'Etiqueta de filtrado opcional (ej: "[FISCAL]", "[ERROR]")' }
      }
    }
  }
];

async function handleToolCall(name, args) {
  const data = db.getData();

  switch (name) {
    case 'restoia_get_kpis': {
      const orders = data.orders || [];
      const tables = data.tables || [];
      const occupiedTables = tables.filter(t => t.status === 'ocupada').length;
      const totalSalesCents = orders
        .filter(o => o.status === 'cobrado')
        .reduce((sum, o) => sum + Math.round((o.total || 0) * 100), 0);

      return {
        totalOrders: orders.length,
        occupiedTables,
        totalTables: tables.length,
        occupancyRate: `${Math.round((occupiedTables / (tables.length || 1)) * 100)}%`,
        totalSalesARS: totalSalesCents / 100,
        activeCashSession: data.cashSession?.activeSession?.status || 'CLOSED'
      };
    }

    case 'restoia_export_pandas_dataset': {
      if (args.dataset === 'inventory') {
        const records = formatInventoryForPandas(data.inventory || []);
        return { count: records.length, dataset: records };
      }
      const records = formatOrdersForPandas(data.orders || []);
      return { count: records.length, dataset: records };
    }

    case 'restoia_sync_mysql': {
      const sqlDump = generateMySqlDump(data);
      return {
        success: true,
        ordersCount: (data.orders || []).length,
        sqlDump
      };
    }

    case 'restoia_emit_fiscal_invoice': {
      const cents = BigInt(Math.round(args.netAmountARS * 100));
      const res = await processFiscalInvoice({
        orderId: args.orderId,
        invoiceType: args.invoiceType,
        customerDoc: args.customerDoc,
        netAmountCents: cents,
        ivaRate: args.ivaRate || 21
      });
      return {
        success: true,
        orderId: res.orderId,
        invoiceType: res.invoiceType,
        cae: res.cae,
        vencimientoCae: res.vencimientoCae,
        totalARS: Number(res.totalCents) / 100
      };
    }

    case 'restoia_get_system_logs': {
      return {
        logs: logger.getRecentLogs(args.tag)
      };
    }

    default:
      throw new Error(`Herramienta no reconocida: ${name}`);
  }
}

// Interfaz JSON-RPC stdio
process.stdin.setEncoding('utf8');

let buffer = '';

async function processMessage(raw) {
  if (!raw.trim()) return;
  try {
    const msg = JSON.parse(raw);
    const id = msg.id;

    if (msg.method === 'initialize') {
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'restoia-mcp', version: '1.0.0' }
      });
    } else if (msg.method === 'tools/list') {
      sendResponse(id, { tools: TOOLS });
    } else if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params || {};
      const result = await handleToolCall(name, args || {});
      sendResponse(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      });
    } else if (msg.method === 'notifications/initialized' || msg.method === 'ping') {
      if (id !== undefined) {
        sendResponse(id, {});
      }
    } else if (id !== undefined) {
      sendResponse(id, { error: { code: -32601, message: 'Method not found' } });
    }
  } catch (e) {
    console.error('[MCP] Parse error:', e.message);
  }
}

const CONTENT_LENGTH_REGEX = /^Content-Length:\s*(\d+)\r?\n\r?\n/i;

process.stdin.on('data', async (chunk) => {
  buffer += chunk;

  while (buffer.length > 0) {
    // 1. Check for Content-Length header framing
    const headerMatch = CONTENT_LENGTH_REGEX.exec(buffer);
    if (headerMatch) {
      const contentLength = Number.parseInt(headerMatch[1], 10);
      const headerLength = headerMatch[0].length;
      if (buffer.length < headerLength + contentLength) {
        // Await remaining payload chunk
        break;
      }
      const jsonPayload = buffer.slice(headerLength, headerLength + contentLength);
      buffer = buffer.slice(headerLength + contentLength);
      await processMessage(jsonPayload);
      continue;
    }

    // 2. Check for newline-delimited JSON
    const newlineIndex = buffer.indexOf('\n');
    if (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        if (!/^Content-Length:/i.test(line)) {
          await processMessage(line);
        }
      }
      continue;
    }

    // Await more data
    break;
  }
});

function sendResponse(id, payload) {
  const res = { jsonrpc: '2.0', id, ...payload };
  process.stdout.write(JSON.stringify(res) + '\n');
}

process.stderr.write('[MCP] Servidor MCP RESTOia inicializado en modo stdio\n');
