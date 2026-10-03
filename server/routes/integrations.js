import { Router } from 'express';
import { db } from '../db.js';
import { logger } from '../logger.js';

export const integrationsRouter = Router();

/**
 * Transforma una lista de órdenes a formato tabular plano optimizado para Pandas / Data Science.
 */
export function formatOrdersForPandas(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map(order => ({
    order_id: order.id,
    table_number: order.tableNumber || '',
    created_at: order.createdAt || new Date().toISOString(),
    status: order.status || 'desconocido',
    total_ars: order.total || 0,
    items_count: Array.isArray(order.items) ? order.items.length : 0,
    payment_method: order.paymentMethod || 'Efectivo',
    waiter: order.waiter || 'Sistema'
  }));
}

/**
 * Transforma el inventario a formato tabular con lotes para análisis de rotación y mermas en Pandas.
 */
export function formatInventoryForPandas(inventory) {
  if (!Array.isArray(inventory)) return [];
  return inventory.map(item => ({
    item_id: item.id,
    name: item.name,
    category: item.category || 'General',
    unit: item.unit || 'un',
    current_stock: item.stock || 0,
    min_stock: item.minStock || 0,
    cost_ars: item.cost || 0,
    total_valuation_ars: (item.stock || 0) * (item.cost || 0),
    is_low_stock: (item.stock || 0) <= (item.minStock || 0)
  }));
}

/**
 * Procesa facturación fiscal formal invocando el motor de dominio KOBE.
 */
export async function processFiscalInvoice({ orderId, invoiceType = 'B', customerDoc, netAmountCents, ivaRate = 21 }) {
  try {
    const { FiscalEngine, MockFiscalProvider } = await import('../../packages/domain/dist/index.js');
    
    const cents = typeof netAmountCents === 'bigint' ? netAmountCents : BigInt(Math.round(Number(netAmountCents) * 100));
    const totalWithVat = (cents * BigInt(100 + (ivaRate || 21))) / 100n;

    const invoiceReq = {
      organizationId: '00000000-0000-4000-8000-000000000001',
      locationId: '00000000-0000-4000-8000-000000000002',
      orderId: String(orderId),
      seller: {
        taxCategory: 'RESPONSABLE_INSCRIPTO',
        cuit: '30-71829301-4',
        businessName: 'RESTOia S.R.L.',
        pointOfSale: 1
      },
      buyer: {
        taxCategory: invoiceType === 'A' ? 'RESPONSABLE_INSCRIPTO' : 'CONSUMIDOR_FINAL',
        cuit: customerDoc || '20000000001'
      },
      totalAmountCents: totalWithVat,
      vatRatePercent: ivaRate || 21
    };

    const invoice = FiscalEngine.issueInvoice(invoiceReq);
    const provider = new MockFiscalProvider();
    const authResult = await provider.authorizeInvoice(invoiceReq);

    logger.fiscal(`Comprobante fiscal emitido para Comanda #${orderId}`, {
      cae: authResult.cae || invoice.cae,
      tipo: invoice.invoiceType,
      totalARS: Number(invoice.totalAmountCents) / 100
    });

    return {
      success: true,
      orderId,
      invoiceType: invoice.invoiceType,
      cae: authResult.cae || invoice.cae,
      vencimientoCae: authResult.caeExpirationDate || invoice.caeExpirationDate,
      netCents: invoice.netAmountCents,
      ivaCents: invoice.vatAmountCents,
      totalCents: invoice.totalAmountCents
    };
  } catch (err) {
    logger.error('[FISCAL]', 'Fallo emisión fiscal', err);
    throw err;
  }
}

/**
 * Genera script SQL de inserción/sincronización con bases de datos MySQL externas.
 */
export function generateMySqlDump(data) {
  const lines = [
    '-- RESTOia Export SQL Dump para MySQL / MariaDB',
    `-- Generado: ${new Date().toISOString()}`,
    'CREATE TABLE IF NOT EXISTS resto_orders (',
    '  id VARCHAR(64) PRIMARY KEY,',
    '  table_number VARCHAR(16),',
    '  status VARCHAR(32),',
    '  total_cents BIGINT,',
    '  created_at DATETIME',
    ');',
    ''
  ];

  if (Array.isArray(data.orders)) {
    data.orders.forEach(o => {
      const cents = Math.round((o.total || 0) * 100);
      lines.push(`INSERT INTO resto_orders (id, table_number, status, total_cents, created_at) VALUES ('${o.id}', '${o.tableNumber}', '${o.status}', ${cents}, NOW()) ON DUPLICATE KEY UPDATE status = VALUES(status), total_cents = VALUES(total_cents);`);
    });
  }

  return lines.join('\n');
}

// ==========================================
// RUTAS HTTP DE INTEGRACIÓN
// ==========================================

// 1. Exportación de Ventas para Pandas
integrationsRouter.get('/pandas/sales', (req, res) => {
  const data = db.getData();
  const format = req.query.format;
  const records = formatOrdersForPandas(data.orders || []);

  if (format === 'csv') {
    if (records.length === 0) return res.send('order_id,table_number,created_at,status,total_ars,items_count,payment_method,waiter\n');
    const header = Object.keys(records[0]).join(',');
    const rows = records.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="restoia_sales_pandas.csv"');
    return res.send(`${header}\n${rows}`);
  }

  res.json({
    success: true,
    count: records.length,
    dataset: records
  });
});

// 2. Exportación de Inventario para Pandas
integrationsRouter.get('/pandas/inventory', (req, res) => {
  const data = db.getData();
  const records = formatInventoryForPandas(data.inventory || []);
  res.json({
    success: true,
    count: records.length,
    dataset: records
  });
});

// 3. Emisión Fiscal Directa
integrationsRouter.post('/fiscal/invoice', async (req, res) => {
  const { orderId, invoiceType, customerDoc, netAmountCents, ivaRate } = req.body;
  try {
    const result = await processFiscalInvoice({
      orderId,
      invoiceType,
      customerDoc,
      netAmountCents: netAmountCents ? BigInt(netAmountCents) : 100000n,
      ivaRate
    });
    res.json({
      success: true,
      data: {
        ...result,
        netCents: result.netCents.toString(),
        ivaCents: result.ivaCents.toString(),
        totalCents: result.totalCents.toString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Sincronización MySQL
integrationsRouter.post('/mysql/sync', (req, res) => {
  const data = db.getData();
  const sqlDump = generateMySqlDump(data);
  logger.database('Sincronización MySQL ejecutada', { ordersSynced: (data.orders || []).length });
  res.json({
    success: true,
    message: 'Script de sincronización transaccional MySQL generado con éxito',
    recordsProcessed: (data.orders || []).length,
    sql: sqlDump
  });
});

// 5. Estado de Módulos de Integración
integrationsRouter.get('/status', (req, res) => {
  res.json({
    success: true,
    seams: {
      pandas: { active: true, endpoints: ['/api/integrations/pandas/sales', '/api/integrations/pandas/inventory'] },
      fiscal: { active: true, engine: '@kobe/domain (ARCA / AFIP CAE)', provider: 'MockFiscalProvider' },
      mysql: { active: true, dialect: 'MySQL / MariaDB UPSERT', endpoint: '/api/integrations/mysql/sync' },
      mcp: { active: true, serverPath: 'tools/mcp-server/index.js' }
    }
  });
});
