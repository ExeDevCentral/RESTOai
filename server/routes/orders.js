import { Router } from 'express';
import { db } from '../db.js';
import { recordOrderStatus } from '../operationsMetrics.js';

export const ordersRouter = Router();

ordersRouter.get('/', (req, res) => {
  const data = db.getData();
  const { status } = req.query;
  let orders = data.orders;
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  res.json({ success: true, data: orders });
});

ordersRouter.get('/:id/receipt', async (req, res) => {
  const { id } = req.params;
  const { format = 'html', isReprint = 'false' } = req.query;
  const data = db.getData();

  const order = data.orders.find(o => String(o.id) === String(id) || o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Comanda no encontrada' });

  try {
    const { ReceiptBuilder, EscPosRenderer, HtmlReceiptRenderer, AuditLedger } = await import('../../packages/domain/dist/index.js');
    const reprintBool = isReprint === 'true';

    let orderHash = `HASH-${order.id}`;
    try {
      const ledger = AuditLedger.getLedger('org-kobe-chain-arg');
      const rec = ledger.find(r => r.entityId === String(order.id) || (r.payload && r.payload.orderId === order.id));
      if (rec) orderHash = rec.hash;
    } catch (e) {}

    const receipt = ReceiptBuilder.buildReceipt({
      order,
      orderHash,
      isReprint: reprintBool,
      reprintCount: reprintBool ? (order.reprintCount = (order.reprintCount || 0) + 1) : 0,
      paymentMethod: order.paymentMethod || 'Mercado Pago (QR)'
    });

    if (reprintBool) {
      db.saveData(data);
    }

    if (format === 'raw' || format === 'escpos') {
      const escposBuffer = EscPosRenderer.renderReceipt(receipt, { columns: 48 });
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${receipt.orderShortHash}.bin"`);
      return res.send(escposBuffer);
    }

    if (format === 'html') {
      const html = HtmlReceiptRenderer.renderReceiptHtml(receipt);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    const serializedReceipt = JSON.parse(JSON.stringify(receipt, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    res.json({ success: true, data: serializedReceipt });
  } catch (err) {
    console.error('Error generando receipt:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

ordersRouter.get('/:id/invoice', async (req, res) => {
  const { id } = req.params;
  const data = db.getData();

  const order = data.orders.find(o => String(o.id) === String(id) || o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Comanda no encontrada' });

  try {
    const { FiscalEngine, MockFiscalProvider } = await import('../../packages/domain/dist/index.js');
    const invoiceReq = {
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      orderId: String(order.id),
      seller: {
        cuit: '30712345678',
        taxCategory: 'RESPONSABLE_INSCRIPTO',
        businessName: 'KOBE Gastronomía S.A.',
        pointOfSale: 1
      },
      buyer: {
        taxCategory: 'CONSUMIDOR_FINAL',
        businessName: `Comensal Mesa ${order.tableNumber}`
      },
      totalAmountCents: BigInt(Math.round((order.total || 0) * 100))
    };

    let invoice = FiscalEngine.issueInvoice(invoiceReq);
    const provider = new MockFiscalProvider();
    const auth = await provider.authorizeInvoice(invoiceReq);
    if (auth.success && auth.cae) {
      invoice = {
        ...invoice,
        cae: auth.cae,
        caeExpirationDate: auth.caeExpirationDate || invoice.caeExpirationDate,
        invoiceNumber: auth.invoiceNumber || invoice.invoiceNumber,
        qrPayload: auth.qrPayload
      };
    }

    const serialized = {
      ...invoice,
      netAmountCents: invoice.netAmountCents.toString(),
      vatAmountCents: invoice.vatAmountCents.toString(),
      totalAmountCents: invoice.totalAmountCents.toString()
    };

    res.json({ success: true, data: serialized });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

ordersRouter.post('/', async (req, res) => {
  const { clientOrderId, tableId, tableNumber, waiter, items } = req.body;
  const data = db.getData();

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'La comanda debe contener al menos un ítem.' });
  }

  const effectiveClientOrderId = clientOrderId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const mapStation = (cat = '') => {
    const c = cat.toLowerCase();
    if (c.includes('carne') || c.includes('josper') || c.includes('grill') || c.includes('parrilla')) return 'GRILL';
    if (c.includes('pasta') || c.includes('horno')) return 'PASTA_OVEN';
    if (c.includes('postre') || c.includes('dulce')) return 'DESSERTS';
    if (c.includes('bebida') || c.includes('coctel') || c.includes('vino') || c.includes('barra')) return 'BAR';
    return 'COLD_APPETIZERS';
  };

  const domainItems = items.map(item => ({
    menuItemId: String(item.id || item.menuItemId || 'item-custom'),
    name: String(item.name || 'Plato'),
    quantity: Math.max(1, Number(item.quantity) || 1),
    unitPriceCents: BigInt(Math.round(Number(item.price || 0) * 100)),
    station: mapStation(item.category),
    notes: item.notes || ''
  }));

  try {
    const { IdempotentOrderIngestor } = await import('../../packages/domain/dist/index.js');

    const ingestResult = IdempotentOrderIngestor.ingest({
      clientOrderId: effectiveClientOrderId,
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      tableNumber: tableNumber || (tableId ? `M-${tableId}` : 'M-01'),
      actorId: waiter || 'usr-waiter-01',
      items: domainItems
    });

    const domainOrder = ingestResult.order;
    let existingOrderInDb = data.orders.find(o => o.clientOrderId === effectiveClientOrderId || String(o.id) === domainOrder.id);

    if (existingOrderInDb) {
      return res.status(200).json({
        success: true,
        data: existingOrderInDb,
        isDuplicate: true,
        message: 'Comanda ya procesada previamente (Idempotencia garantizada).'
      });
    }

    const total = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);

    const newOrder = {
      id: domainOrder.id,
      clientOrderId: effectiveClientOrderId,
      tableId: parseInt(tableId) || 1,
      tableNumber: tableNumber || (tableId ? `M-${tableId}` : 'M-01'),
      waiter: waiter || "Mozo Asignado",
      status: "pendiente",
      createdAt: domainOrder.createdAt,
      items: items.map(i => ({
        ...i,
        status: "pendiente"
      })),
      total,
      totalCents: Number(domainOrder.totalCents)
    };
    recordOrderStatus(newOrder, newOrder.status, newOrder.createdAt);

    data.orders.push(newOrder);

    if (tableId) {
      const table = data.tables.find(t => t.id === parseInt(tableId));
      if (table) {
        table.status = 'ocupada';
        table.currentOrderId = newOrder.id;
      }
    }

    db.saveData(data);
    await db.recordOrderInDrizzle(newOrder);

    res.status(201).json({
      success: true,
      data: newOrder,
      isDuplicate: false,
      message: 'Comanda ingresada exitosamente y asentada en el Audit Ledger.'
    });
  } catch (err) {
    console.error('Error al ingresar orden en el dominio:', err);
    res.status(500).json({ success: false, message: 'Error interno en el motor transaccional de órdenes.' });
  }
});

ordersRouter.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, paymentMethod } = req.body;
  const data = db.getData();

  const order = data.orders.find(o => String(o.id) === String(id) || o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

  const statusToDomainState = {
    'pendiente': 'CONFIRMED',
    'en_cocina': 'IN_PREPARATION',
    'listo': 'READY',
    'servido': 'DELIVERED',
    'cobrado': 'CLOSED',
    'cancelado': 'CANCELLED'
  };

  const targetDomainState = statusToDomainState[status] || status;
  const currentDomainState = statusToDomainState[order.status] || order.status || 'CONFIRMED';

  try {
    const { OrderStateMachine } = await import('../../packages/domain/dist/index.js');
    if (!OrderStateMachine.canTransition(currentDomainState, targetDomainState)) {
      return res.status(400).json({
        success: false,
        message: `⛔ Transición de estado inválida: no se puede pasar una orden de ${currentDomainState} (${order.status}) a ${targetDomainState} (${status}).`
      });
    }
  } catch (err) {
    console.warn('Advertencia validando máquina de estados:', err);
  }

  if (order.status !== status) recordOrderStatus(order, status);
  order.status = status;

  if ((status === 'en_cocina' || status === 'listo') && !order.stockDeducted) {
    order.stockDeducted = true;
    if (data.inventory && Array.isArray(data.inventory)) {
      const recipeMap = {
        1: [{ ingredientName: 'Bife de Chorizo', qty: 400, unit: 'g' }],
        2: [{ ingredientName: 'Bife de Chorizo', qty: 350, unit: 'g' }],
        3: [{ ingredientName: 'Salmón Rosado', qty: 250, unit: 'g' }],
        5: [{ ingredientName: 'Hongos Silvestres', qty: 150, unit: 'g' }],
        12: [{ ingredientName: 'Vino Malbec', qty: 1, unit: 'unidades' }]
      };

      for (const item of order.items) {
        const ingredients = recipeMap[item.menuItemId] || [];
        for (const ing of ingredients) {
          const totalQtyToDeduct = ing.qty * item.quantity;
          const lot = data.inventory.find(l => l.name.toLowerCase().includes(ing.ingredientName.toLowerCase()));
          if (lot) {
            lot.currentQuantity = Math.max(0, lot.currentQuantity - totalQtyToDeduct);
          }
        }
      }

      try {
        const { AuditLedger } = await import('../../packages/domain/dist/index.js');
        AuditLedger.appendRecord({
          organizationId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          actorId: 'usr-chef-01',
          action: 'STOCK_CONSUMED_BY_RECIPE',
          entityType: 'ORDER',
          entityId: String(order.id),
          requestId: `req-${Date.now()}`,
          payload: { orderId: order.id, status, itemCount: order.items.length }
        });
      } catch (e) {
        console.warn('Audit error on stock recipe deduction:', e);
      }
    }
  }

  let invoice = null;
  if (status === 'cobrado') {
    const table = data.tables.find(t => t.id === order.tableId);
    if (table) {
      table.status = 'libre';
      table.currentOrderId = null;
    }

    try {
      const { AuditLedger, FiscalEngine, JournalAutomator, MockFiscalProvider } = await import('../../packages/domain/dist/index.js');
      
      const invoiceReq = {
        organizationId: 'org-kobe-chain-arg',
        locationId: 'loc-centro-arg',
        orderId: String(order.id),
        seller: {
          cuit: '30712345678',
          taxCategory: 'RESPONSABLE_INSCRIPTO',
          businessName: 'KOBE Gastronomía S.A.',
          pointOfSale: 1
        },
        buyer: {
          taxCategory: 'CONSUMIDOR_FINAL',
          businessName: `Comensal Mesa ${order.tableNumber}`
        },
        totalAmountCents: BigInt(order.total * 100)
      };

      invoice = FiscalEngine.issueInvoice(invoiceReq);

      // Autorización con FiscalProvider (ARCA / WSFE) para obtención de QR y CAE oficial
      const fiscalProvider = new MockFiscalProvider();
      const authResult = await fiscalProvider.authorizeInvoice(invoiceReq);
      if (authResult.success && authResult.cae) {
        invoice = {
          ...invoice,
          cae: authResult.cae,
          caeExpirationDate: authResult.caeExpirationDate || invoice.caeExpirationDate,
          invoiceNumber: authResult.invoiceNumber || invoice.invoiceNumber,
          qrPayload: authResult.qrPayload
        };
      }

      const isSplit = paymentMethod === 'SPLIT';
      const cashAmt = isSplit ? (Number(req.body.splitCashAmount) || 0) : (paymentMethod === 'CASH' ? order.total : 0);
      const digitalAmt = isSplit ? (Number(req.body.splitDigitalAmount) || 0) : (paymentMethod === 'DIGITAL' ? order.total : 0);

      if (cashAmt > 0) {
        JournalAutomator.postSale({
          organizationId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          orderId: String(order.id),
          totalAmountCents: BigInt(Math.round(cashAmt * 100)),
          paymentMethod: 'CASH'
        });
      }
      if (digitalAmt > 0) {
        JournalAutomator.postSale({
          organizationId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          orderId: String(order.id),
          totalAmountCents: BigInt(Math.round(digitalAmt * 100)),
          paymentMethod: 'DIGITAL'
        });
      }

      AuditLedger.appendRecord({
        organizationId: 'org-kobe-chain-arg',
        locationId: 'loc-centro-arg',
        actorId: 'usr-cajero-01',
        action: isSplit ? 'ORDER_PAID_SPLIT_PAYMENT' : 'ORDER_PAID_AND_INVOICED',
        entityType: 'INVOICE',
        entityId: invoice.id,
        requestId: `req-${Date.now()}`,
        payload: {
          orderId: order.id,
          invoiceType: invoice.invoiceType,
          paymentMethod,
          cashPartCents: (cashAmt * 100).toString(),
          digitalPartCents: (digitalAmt * 100).toString(),
          cae: invoice.cae,
          totalCents: (order.total * 100).toString()
        }
      });

      if (data.cashSessions) {
        const activeCashSession = data.cashSessions.find(s => s.status === 'OPEN');
        if (activeCashSession) {
          if (digitalAmt > 0) {
            activeCashSession.digitalSales = (activeCashSession.digitalSales || 0) + digitalAmt;
          }
          if (cashAmt > 0) {
            activeCashSession.cashInflow = (activeCashSession.cashInflow || 0) + cashAmt;
            activeCashSession.expectedCash += cashAmt;
            activeCashSession.movements.unshift({
              id: `MOV-${Date.now().toString().slice(-4)}`,
              type: 'INGRESO',
              amount: cashAmt,
              reason: `Cobro Comanda Mesa ${order.tableNumber}${isSplit ? ' (Parte Efectivo)' : ''}`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {
      console.warn('Advertencia registrando en ledger KOBE:', e.message);
    }
  }

  if (db.orderRepository) {
    try {
      await db.orderRepository.updateOrderStatus(String(order.id), targetDomainState, req.body.actorId || 'usr-supervisor');
    } catch (err) {
      console.warn('[AUDIT] No se pudo asentar estado en OrderRepository:', err.message);
    }
  }

  db.saveData(data);
  await db.recordOrderInDrizzle(order);
  const serializedInvoice = invoice ? {
    ...invoice,
    netAmountCents: invoice.netAmountCents.toString(),
    vatAmountCents: invoice.vatAmountCents.toString(),
    totalAmountCents: invoice.totalAmountCents.toString()
  } : null;

  res.json({ success: true, data: order, invoice: serializedInvoice });
});

ordersRouter.get('/:id/audit-trail', async (req, res) => {
  const { id } = req.params;
  if (!db.orderRepository) {
    return res.status(503).json({ success: false, message: 'Motor relacional no disponible' });
  }
  try {
    const timeline = await db.orderRepository.getOrderAuditTimeline(String(id));
    res.json({
      success: true,
      orderId: id,
      count: timeline.length,
      timeline
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


ordersRouter.post('/:id/void', async (req, res) => {
  const { id } = req.params;
  const { role, supervisorPin, reason } = req.body;
  const data = db.getData();

  const order = data.orders.find(o => String(o.id) === String(id) || o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

  try {
    const { RbacManager, AuditLedger } = await import('../../packages/domain/dist/index.js');
    
    const actorId = `usr-${(role || 'WAITER').toLowerCase()}-01`;
    RbacManager.clearAssignments();
    RbacManager.assignRole({
      userId: actorId,
      roleCode: role || 'WAITER',
      scope: 'LOCATION',
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg'
    });
    RbacManager.registerSupervisorPin('usr-manager-master', '1234');
    RbacManager.assignRole({
      userId: 'usr-manager-master',
      roleCode: 'MANAGER',
      scope: 'LOCATION',
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg'
    });

    const check = RbacManager.canExecuteCriticalAction(
      actorId,
      'orders:void',
      { organizationId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg' },
      supervisorPin
    );

    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        message: `⛔ Operación Crítica Denegada: ${check.reason || 'Se requiere rol Manager/Owner o PIN de supervisor válido (ej: 1234).'}`
      });
    }

    order.status = 'anulado';
    order.voidReason = reason || 'Anulado por solicitud de salón';

    const table = data.tables.find(t => t.id === order.tableId);
    if (table) {
      table.status = 'libre';
      table.currentOrderId = null;
    }

    db.saveData(data);

    AuditLedger.appendRecord({
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      actorId: actorId,
      action: 'ORDER_VOIDED',
      entityType: 'ORDER',
      entityId: String(order.id),
      requestId: `req-${Date.now()}`,
      payload: {
        tableNumber: order.tableNumber,
        reason: order.voidReason,
        authorizedByPin: Boolean(supervisorPin)
      }
    });

    res.json({ success: true, message: `Comanda #${order.id} anulada correctamente`, data: order });
  } catch (err) {
    console.error('Error en void order:', err);
    res.status(500).json({ success: false, message: 'Error interno procesando anulación' });
  }
});

ordersRouter.post('/:id/discount', async (req, res) => {
  const { id } = req.params;
  const { role, supervisorPin, discountPercent } = req.body;
  const data = db.getData();

  const order = data.orders.find(o => String(o.id) === String(id) || o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

  try {
    const { RbacManager, AuditLedger } = await import('../../packages/domain/dist/index.js');
    
    const actorId = `usr-${(role || 'WAITER').toLowerCase()}-01`;
    RbacManager.clearAssignments();
    RbacManager.assignRole({
      userId: actorId,
      roleCode: role || 'WAITER',
      scope: 'LOCATION',
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg'
    });
    RbacManager.registerSupervisorPin('usr-manager-master', '1234');
    RbacManager.assignRole({
      userId: 'usr-manager-master',
      roleCode: 'MANAGER',
      scope: 'LOCATION',
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg'
    });

    const check = RbacManager.canExecuteCriticalAction(
      actorId,
      'orders:discount',
      { organizationId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg' },
      supervisorPin
    );

    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        message: `⛔ Descuento Denegado: ${check.reason || 'Se requiere rol Manager/Owner o PIN de supervisor válido (ej: 1234).'}`
      });
    }

    const pct = Math.min(Math.max(Number(discountPercent) || 10, 1), 100);
    const discountAmount = Math.round(order.total * (pct / 100));
    order.discount = { percent: pct, amount: discountAmount };
    order.total = Math.max(0, order.total - discountAmount);

    db.saveData(data);

    AuditLedger.appendRecord({
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      actorId: actorId,
      action: 'ORDER_DISCOUNT_APPLIED',
      entityType: 'ORDER',
      entityId: String(order.id),
      requestId: `req-${Date.now()}`,
      payload: {
        tableNumber: order.tableNumber,
        percent: pct,
        discountAmount,
        newTotal: order.total,
        authorizedByPin: Boolean(supervisorPin)
      }
    });

    res.json({ success: true, message: `Descuento del ${pct}% aplicado correctamente`, data: order });
  } catch (err) {
    console.error('Error en discount order:', err);
    res.status(500).json({ success: false, message: 'Error interno aplicando descuento' });
  }
});
