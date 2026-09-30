import { Router } from 'express';
import { db } from '../db.js';

export const printRouter = Router();

printRouter.get('/printers', async (req, res) => {
  try {
    const { PrintDispatcher } = await import('../../packages/domain/dist/index.js');
    const printers = PrintDispatcher.listPrinters('org-kobe-chain-arg', 'loc-centro-arg');

    if (printers.length === 0) {
      const defaultPrinters = [
        {
          id: 'prn-cocina-epson',
          tenantId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          name: 'Comandera Cocina (Epson TM-T20III Red)',
          kind: 'THERMAL_ESCPOS',
          transport: 'TCP9100',
          address: '192.168.1.201:9100',
          paperWidthMm: 80,
          charset: 'CP858',
          cut: true,
          drawer: false,
          status: 'ONLINE'
        },
        {
          id: 'prn-barra-star',
          tenantId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          name: 'Comandera Barra (Star Micronics TSP100 LAN)',
          kind: 'THERMAL_ESCPOS',
          transport: 'TCP9100',
          address: '192.168.1.202:9100',
          paperWidthMm: 80,
          charset: 'CP858',
          cut: true,
          drawer: false,
          status: 'ONLINE'
        },
        {
          id: 'prn-caja-bixolon',
          tenantId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          name: 'Caja Principal (Bixolon SRP-350 USB/Agent)',
          kind: 'THERMAL_ESCPOS',
          transport: 'AGENT',
          address: 'agent-restoia-caja',
          paperWidthMm: 80,
          charset: 'CP858',
          cut: true,
          drawer: true,
          status: 'ONLINE'
        }
      ];
      defaultPrinters.forEach(p => PrintDispatcher.registerPrinter(p));
      PrintDispatcher.setRoutes([
        { id: 'r1', tenantId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg', docType: 'KITCHEN_TICKET', station: 'cocina', printerId: 'prn-cocina-epson', copies: 1, priority: 10 },
        { id: 'r2', tenantId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg', docType: 'BAR_TICKET', station: 'barra', printerId: 'prn-barra-star', copies: 1, priority: 10 },
        { id: 'r3', tenantId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg', docType: 'INVOICE', printerId: 'prn-caja-bixolon', copies: 1, priority: 10 },
        { id: 'r4', tenantId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg', docType: 'PRE_BILL', printerId: 'prn-caja-bixolon', copies: 1, priority: 10 }
      ]);
      return res.json({ success: true, data: defaultPrinters });
    }
    res.json({ success: true, data: printers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

printRouter.post('/jobs', async (req, res) => {
  const { docType, orderId, station, format = 'ESCPOS', openDrawer = false } = req.body;
  const data = db.getData();
  const order = data.orders.find(o => String(o.id) === String(orderId) || o.id === parseInt(orderId));

  if (!order) return res.status(404).json({ success: false, message: 'Comanda no encontrada' });

  try {
    const { ReceiptBuilder, EscPosRenderer, HtmlReceiptRenderer, PrintDispatcher, AuditLedger } = await import('../../packages/domain/dist/index.js');

    let payload = '';
    if (docType === 'KITCHEN_TICKET') {
      const buf = EscPosRenderer.renderKitchenTicket({
        station: station || 'Cocina Caliente',
        orderId: order.id,
        tableNumber: order.tableNumber,
        waiter: order.waiter || 'Personal de Salón',
        items: order.items || []
      });
      payload = buf.toString('base64');
    } else {
      const receipt = ReceiptBuilder.buildReceipt({
        order,
        paymentMethod: order.paymentMethod || 'Mercado Pago (QR)'
      });
      if (format === 'ESCPOS') {
        const buf = EscPosRenderer.renderReceipt(receipt, { columns: 48 });
        payload = buf.toString('base64');
      } else {
        payload = HtmlReceiptRenderer.renderReceiptHtml(receipt);
      }
    }

    const idempotencyKey = `PRN-${docType}-${order.id}-${Date.now().toString().slice(-4)}`;
    const jobs = PrintDispatcher.enqueueJob({
      tenantId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      docType: docType || 'RECEIPT',
      format,
      payload,
      station,
      idempotencyKey,
      openDrawer
    });

    AuditLedger.appendRecord({
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      actorId: 'usr-cajero-01',
      action: 'PRINT_JOB_ENQUEUED',
      entityType: 'PRINT_JOB',
      entityId: jobs[0]?.id || `job-${Date.now()}`,
      requestId: `req-${Date.now()}`,
      payload: { docType, orderId, count: jobs.length }
    });

    res.json({ success: true, message: `Trabajo de impresión encolado (${jobs.length} impresora(s))`, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
