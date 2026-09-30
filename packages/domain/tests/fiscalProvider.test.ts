import { describe, it, expect } from 'vitest';
import { MockFiscalProvider, ArcaWsfeClient, mapCbteTipo } from '../src/fiscal/fiscalProvider.js';
import type { InvoiceRequest } from '../src/fiscal/fiscalEngine.js';

describe('FiscalProvider Seam & ARCA WSFE Client Adapter', () => {
  const requestA: InvoiceRequest = {
    organizationId: 'org-kobe-1',
    locationId: 'loc-centro',
    orderId: 'ord-test-01',
    seller: {
      cuit: '30712345678',
      taxCategory: 'RESPONSABLE_INSCRIPTO',
      businessName: 'KOBE Gastronomía S.A.',
      pointOfSale: 2
    },
    buyer: {
      cuit: '30998877665',
      taxCategory: 'RESPONSABLE_INSCRIPTO',
      businessName: 'Corporativo Eventos SRL'
    },
    totalAmountCents: 12100000n
  };

  it('maps invoice types to official AFIP / ARCA numeric codes', () => {
    expect(mapCbteTipo('FACTURA_A')).toBe(1);
    expect(mapCbteTipo('FACTURA_B')).toBe(6);
    expect(mapCbteTipo('FACTURA_C')).toBe(11);
  });

  it('MockFiscalProvider authorizes invoice returning 14-digit CAE and QR verification link', async () => {
    const provider = new MockFiscalProvider();
    const result = await provider.authorizeInvoice(requestA);

    expect(result.success).toBe(true);
    expect(result.cae).toBeDefined();
    expect(result.cae).toHaveLength(14);
    expect(result.invoiceNumber).toBe(1);
    expect(result.qrPayload).toContain('https://www.afip.gob.ar/fe/qr/?p=');
  });

  it('MockFiscalProvider increments consecutive invoice numbers per point of sale', async () => {
    const provider = new MockFiscalProvider();
    const res1 = await provider.authorizeInvoice(requestA);
    const res2 = await provider.authorizeInvoice(requestA);

    expect(res1.invoiceNumber).toBe(1);
    expect(res2.invoiceNumber).toBe(2);
  });

  it('ArcaWsfeClient negotiates WSAA token and fulfills authorization through provider interface', async () => {
    const arca = new ArcaWsfeClient({
      cuit: '30712345678',
      production: false
    });

    const tokenData = await arca.getWsaaToken();
    expect(tokenData.cuit).toBe('30712345678');
    expect(tokenData.token).toBeDefined();
    expect(tokenData.sign).toBeDefined();

    const authResult = await arca.authorizeInvoice(requestA);
    expect(authResult.success).toBe(true);
    expect(authResult.cae).toHaveLength(14);
  });
});
