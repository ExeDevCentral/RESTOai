import { describe, it, expect } from 'vitest';
import { FiscalEngine, type TaxPayerInfo, type InvoiceRequest } from '../src/fiscal/fiscalEngine.js';

describe('Argentine Fiscal Billing Engine (ARCA / ex-AFIP)', () => {
  const seller: TaxPayerInfo = {
    cuit: '30712345678',
    taxCategory: 'RESPONSABLE_INSCRIPTO',
    businessName: 'KOBE Gastronomia S.A.',
    pointOfSale: 1
  };

  it('generates Factura A discriminating 21% VAT when buyer is Responsable Inscripto', () => {
    const buyer: TaxPayerInfo = {
      cuit: '30998877665',
      taxCategory: 'RESPONSABLE_INSCRIPTO',
      businessName: 'Corporativo Eventos SRL'
    };

    const request: InvoiceRequest = {
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      orderId: 'ord-corp-101',
      seller,
      buyer,
      totalAmountCents: 12100000n // $121.000,00 final
    };

    const invoice = FiscalEngine.issueInvoice(request);

    expect(invoice.invoiceType).toBe('FACTURA_A');
    expect(invoice.netAmountCents).toBe(10000000n); // $100.000,00 neto gravado
    expect(invoice.vatAmountCents).toBe(2100000n);  // $21.000,00 IVA 21%
    expect(invoice.totalAmountCents).toBe(12100000n);
    expect(invoice.cae).toBeDefined();
    expect(invoice.caeExpirationDate).toBeDefined();
  });

  it('generates Factura B without discriminating VAT when buyer is Consumidor Final', () => {
    const buyer: TaxPayerInfo = {
      taxCategory: 'CONSUMIDOR_FINAL',
      businessName: 'Juan Perez'
    };

    const request: InvoiceRequest = {
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      orderId: 'ord-cf-102',
      seller,
      buyer,
      totalAmountCents: 2420000n // $24.200,00
    };

    const invoice = FiscalEngine.issueInvoice(request);

    expect(invoice.invoiceType).toBe('FACTURA_B');
    expect(invoice.totalAmountCents).toBe(2420000n);
    // En Factura B para consumidor final, el IVA está contenido en el precio total
    expect(invoice.netAmountCents + invoice.vatAmountCents).toBe(2420000n);
    expect(invoice.cae).toHaveLength(14);
  });

  it('generates Factura C when seller is Monotributista', () => {
    const monotributistaSeller: TaxPayerInfo = {
      cuit: '20334455667',
      taxCategory: 'MONOTRIBUTO',
      businessName: 'Chef Independiente',
      pointOfSale: 1
    };

    const request: InvoiceRequest = {
      organizationId: 'org-mono-1',
      locationId: 'loc-foodtruck',
      orderId: 'ord-cf-103',
      seller: monotributistaSeller,
      buyer: { taxCategory: 'CONSUMIDOR_FINAL' },
      totalAmountCents: 1500000n
    };

    const invoice = FiscalEngine.issueInvoice(request);

    expect(invoice.invoiceType).toBe('FACTURA_C');
    expect(invoice.vatAmountCents).toBe(0n); // Monotributo no discrimina ni liquida IVA
    expect(invoice.netAmountCents).toBe(1500000n);
  });
});
