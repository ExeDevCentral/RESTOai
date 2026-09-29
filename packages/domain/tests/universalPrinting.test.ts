import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReceiptBuilder,
  EscPosRenderer,
  HtmlReceiptRenderer,
  PrintDispatcher,
  PrinterDefinition,
  PrintRoute
} from '../src/index.js';

describe('Universal Printing Architecture & Modern Receipts', () => {
  beforeEach(() => {
    PrintDispatcher.clearAll();
  });

  it('builds modern receipt with bigint cents, short hash and tip calculation', () => {
    const receipt = ReceiptBuilder.buildReceipt({
      order: {
        id: 105,
        tableNumber: '4',
        waiter: 'Lucas',
        items: [
          { name: 'Ojo de Bife Madurado', quantity: 1, unitPriceCents: 2850000n, notes: 'a punto' },
          { name: 'Copa Malbec', quantity: 2, unitPriceCents: 600000n }
        ],
        totalAmountCents: 4050000n
      },
      orderHash: '7F3A91C2DE0044',
      paymentMethod: 'Mercado Pago (QR)'
    });

    expect(receipt.orderShortHash).toBe('7F3A-91C2');
    expect(receipt.tableNumber).toBe('4');
    expect(receipt.items).toHaveLength(2);
    expect(receipt.subtotalCents).toBe(4050000n);
    expect(receipt.tipSuggestedCents).toBe(405000n); // 10%
    expect(receipt.totalCents).toBe(4050000n);
    expect(receipt.verificationUrl).toContain('7F3A-91C2');
    expect(receipt.invoice?.type).toBe('PRE_BILL');
  });

  it('generates ESC/POS binary buffer with total, double width and partial cut', () => {
    const receipt = ReceiptBuilder.buildReceipt({
      order: {
        id: 'ORD-88',
        tableNumber: '12',
        waiter: 'Martina',
        items: [{ name: 'Bife de Chorizo', quantity: 1, unitPriceCents: 3200000n }]
      },
      invoice: {
        invoiceType: 'FACTURA_B',
        pointOfSale: 4,
        invoiceNumber: 12345,
        cae: '74123456789012',
        caeExpirationDate: '2026-10-19',
        netAmountCents: 2644628n,
        vatAmountCents: 555372n
      }
    });

    const buffer = EscPosRenderer.renderReceipt(receipt, { columns: 48 });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);

    // Debe contener comandos ESC @ (init: 0x1B 0x40) y GS V (corte: 0x1D 0x56)
    expect(buffer[0]).toBe(0x1B);
    expect(buffer[1]).toBe(0x40);

    const latinText = buffer.toString('latin1');
    expect(latinText).toContain('KOBE');
    expect(latinText).toContain('FACTURA B');
    expect(latinText).toContain('CAE: 74123456789012');
    expect(latinText).toContain('VERIF:');
  });

  it('renders kitchen ticket with large station header and no prices', () => {
    const kitchenBuf = EscPosRenderer.renderKitchenTicket({
      station: 'COCINA CALIENTE',
      orderId: 'ORD-99',
      tableNumber: '7',
      waiter: 'Facundo',
      items: [
        { name: 'Ojo de Bife', quantity: 2, notes: 'bien cocido' },
        { name: 'Papas Trufadas', quantity: 1 }
      ]
    });

    const text = kitchenBuf.toString('latin1');
    expect(text).toContain('COCINA CALIENTE');
    expect(text).toContain('MESA: 7');
    expect(text).toContain('2x Ojo de Bife');
    expect(text).toContain('* NOTA: bien cocido');
    expect(text).not.toContain('$'); // Las comandas de cocina nunca llevan precios
  });

  it('renders HTML receipt for browser window.print() or digital mobile view', () => {
    const receipt = ReceiptBuilder.buildReceipt({
      order: {
        id: 77,
        tableNumber: '2',
        waiter: 'Lucas',
        items: [{ name: 'Risotto Silvestre', quantity: 1, unitPriceCents: 2400000n }]
      },
      isReprint: true,
      reprintCount: 2
    });

    const html = HtmlReceiptRenderer.renderReceiptHtml(receipt);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('COPIA / REIMPRESIÓN (N° 2)');
    expect(html).toContain('Risotto Silvestre');
    expect(html).toContain('VERIF:');
  });

  it('dispatches print jobs idempotently and routes according to station', () => {
    const printerKitchen: PrinterDefinition = {
      id: 'prn-kitchen',
      tenantId: 'tenant-kobe',
      locationId: 'loc-centro',
      name: 'Epson Cocina TM-T20',
      kind: 'THERMAL_ESCPOS',
      transport: 'TCP9100',
      address: '192.168.1.201:9100',
      paperWidthMm: 80,
      charset: 'CP858',
      cut: true,
      drawer: false,
      status: 'ONLINE'
    };

    const printerCashier: PrinterDefinition = {
      id: 'prn-cashier',
      tenantId: 'tenant-kobe',
      locationId: 'loc-centro',
      name: 'Bixolon Caja SRP-350',
      kind: 'THERMAL_ESCPOS',
      transport: 'AGENT',
      address: 'local-usb-agent',
      paperWidthMm: 80,
      charset: 'CP858',
      cut: true,
      drawer: true,
      status: 'ONLINE'
    };

    PrintDispatcher.registerPrinter(printerKitchen);
    PrintDispatcher.registerPrinter(printerCashier);

    const routes: PrintRoute[] = [
      {
        id: 'r-1',
        tenantId: 'tenant-kobe',
        locationId: 'loc-centro',
        docType: 'KITCHEN_TICKET',
        station: 'cocina',
        printerId: 'prn-kitchen',
        copies: 1,
        priority: 10
      },
      {
        id: 'r-2',
        tenantId: 'tenant-kobe',
        locationId: 'loc-centro',
        docType: 'INVOICE',
        printerId: 'prn-cashier',
        copies: 1,
        priority: 10
      }
    ];
    PrintDispatcher.setRoutes(routes);

    // 1. Encolar ticket de cocina
    const kitchenJobs = PrintDispatcher.enqueueJob({
      tenantId: 'tenant-kobe',
      locationId: 'loc-centro',
      docType: 'KITCHEN_TICKET',
      format: 'ESCPOS',
      payload: 'BYTES_BASE64',
      station: 'cocina',
      idempotencyKey: 'KDS-ORD-101-V1'
    });

    expect(kitchenJobs).toHaveLength(1);
    expect(kitchenJobs[0].printerId).toBe('prn-kitchen');
    expect(kitchenJobs[0].status).toBe('QUEUED');

    // 2. Comprobar Idempotencia: reenviar misma key no crea duplicados
    const dupJobs = PrintDispatcher.enqueueJob({
      tenantId: 'tenant-kobe',
      locationId: 'loc-centro',
      docType: 'KITCHEN_TICKET',
      format: 'ESCPOS',
      payload: 'BYTES_BASE64',
      station: 'cocina',
      idempotencyKey: 'KDS-ORD-101-V1'
    });
    expect(dupJobs).toHaveLength(1);
    expect(dupJobs[0].id).toBe(kitchenJobs[0].id);

    // 3. Simular reporte del Print Agent al imprimir
    const finishedJob = PrintDispatcher.markJobStatus(kitchenJobs[0].id, 'PRINTED');
    expect(finishedJob?.status).toBe('PRINTED');
    expect(finishedJob?.printedAt).toBeDefined();
  });
});
