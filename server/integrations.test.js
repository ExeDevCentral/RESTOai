import { describe, it, expect } from 'vitest';

describe('Integrations API (Pandas, MySQL, Fiscal)', () => {
  it('exports integrationsRouter', async () => {
    const { integrationsRouter } = await import('./routes/integrations.js');
    expect(typeof integrationsRouter).toBe('function');
  });

  it('formatOrdersForPandas returns structured dataset for pandas DataFrame', async () => {
    const { formatOrdersForPandas } = await import('./routes/integrations.js');
    const mockOrders = [
      { id: 101, tableNumber: 'M-01', total: 25000, status: 'cobrado', createdAt: '2026-10-03T12:00:00Z', items: [{ name: 'Bife', price: 25000 }] }
    ];
    const dataset = formatOrdersForPandas(mockOrders);
    expect(Array.isArray(dataset)).toBe(true);
    expect(dataset[0]).toHaveProperty('order_id', 101);
    expect(dataset[0]).toHaveProperty('table_number', 'M-01');
    expect(dataset[0]).toHaveProperty('total_ars', 25000);
    expect(dataset[0]).toHaveProperty('status', 'cobrado');
  });

  it('processFiscalInvoice computes legal invoice with fiscalEngine', async () => {
    const { processFiscalInvoice } = await import('./routes/integrations.js');
    const invoiceResult = await processFiscalInvoice({
      orderId: 101,
      invoiceType: 'B',
      customerDoc: '20-12345678-9',
      netAmountCents: 2000000n, // $20.000,00 ARS in BigInt cents
      ivaRate: 21
    });
    expect(invoiceResult.success).toBe(true);
    expect(invoiceResult.cae).toBeDefined();
    expect(typeof invoiceResult.totalCents).toBe('bigint');
  });
});
