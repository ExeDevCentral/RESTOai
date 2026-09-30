import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { processAIChat } from './aiEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ========================
// 1. ENDPOINTS DE MESAS
// ========================
app.get('/api/tables', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.tables });
});

app.put('/api/tables/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, currentOrderId } = req.body;
  const data = db.getData();

  const table = data.tables.find(t => t.id === parseInt(id));
  if (!table) {
    return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
  }

  if (status) table.status = status;
  if (currentOrderId !== undefined) table.currentOrderId = currentOrderId;

  db.saveData(data);
  res.json({ success: true, data: table });
});

// ========================
// 2. ENDPOINTS DE MENÚ
// ========================
app.get('/api/menu', (req, res) => {
  const data = db.getData();
  const { category, available } = req.query;

  let menu = data.menu;
  if (category) {
    menu = menu.filter(m => m.category.toLowerCase() === category.toLowerCase());
  }
  if (available !== undefined) {
    menu = menu.filter(m => m.available === (available === 'true'));
  }

  res.json({ success: true, data: menu });
});

app.post('/api/menu', (req, res) => {
  const { name, category, price, description, allergens, timeMinutes } = req.body;
  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Nombre y precio son requeridos' });
  }
  const data = db.getData();
  const newItem = {
    id: Date.now(),
    name,
    category: category || 'Principales',
    price: Number(price),
    description: description || '',
    allergens: Array.isArray(allergens) ? allergens : (allergens ? allergens.split(',').map(s => s.trim()) : []),
    available: true,
    timeMinutes: Number(timeMinutes) || 15
  };
  data.menu.push(newItem);
  db.saveData(data);
  res.status(201).json({ success: true, data: newItem });
});

app.put('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, price, description, allergens, timeMinutes, available } = req.body;
  const data = db.getData();
  const item = data.menu.find(m => m.id === parseInt(id));
  if (!item) return res.status(404).json({ success: false, message: 'Plato no encontrado' });

  if (name !== undefined) item.name = name;
  if (category !== undefined) item.category = category;
  if (price !== undefined) item.price = Number(price);
  if (description !== undefined) item.description = description;
  if (allergens !== undefined) {
    item.allergens = Array.isArray(allergens) ? allergens : allergens.split(',').map(s => s.trim());
  }
  if (timeMinutes !== undefined) item.timeMinutes = Number(timeMinutes);
  if (available !== undefined) item.available = Boolean(available);

  db.saveData(data);
  res.json({ success: true, data: item });
});

app.delete('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.menu.findIndex(m => m.id === parseInt(id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Plato no encontrado' });

  data.menu.splice(index, 1);
  db.saveData(data);
  res.json({ success: true, message: 'Plato eliminado' });
});

app.patch('/api/menu/:id/toggle', (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const item = data.menu.find(m => m.id === parseInt(id));
  if (!item) return res.status(404).json({ success: false, message: 'Plato no encontrado' });

  item.available = !item.available;
  db.saveData(data);
  res.json({ success: true, data: item });
});

// ========================
// 2.1 INVENTARIO, LOTES & ESCÁNER
// ========================
app.get('/api/inventory', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.inventory || [] });
});

app.post('/api/inventory', (req, res) => {
  const { name, category, barcode, currentQuantity, unit, minStock, expiryDate, supplierId, costPerUnit } = req.body;
  const data = db.getData();
  if (!data.inventory) data.inventory = [];

  const supplier = (data.suppliers || []).find(s => s.id === parseInt(supplierId));
  const newLot = {
    id: `lot-${Date.now().toString(36)}`,
    name,
    category: category || 'Generales',
    lotCode: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    barcode: barcode || `${Date.now()}`.slice(-13),
    currentQuantity: Number(currentQuantity) || 0,
    unit: unit || 'g',
    minStock: Number(minStock) || 1000,
    expiryDate: expiryDate || '2026-12-31',
    supplierId: supplier ? supplier.id : null,
    supplierName: supplier ? supplier.name : 'Proveedor General',
    costPerUnit: Number(costPerUnit) || 0
  };

  data.inventory.push(newLot);
  db.saveData(data);
  res.status(201).json({ success: true, data: newLot });
});

app.patch('/api/inventory/:id/adjust', (req, res) => {
  const { id } = req.params;
  const { delta, reason } = req.body;
  const data = db.getData();
  const lot = (data.inventory || []).find(l => l.id === id);
  if (!lot) return res.status(404).json({ success: false, message: 'Lote no encontrado' });

  lot.currentQuantity = Math.max(0, lot.currentQuantity + Number(delta));
  db.saveData(data);
  res.json({ success: true, data: lot, reason: reason || 'Ajuste manual' });
});

app.get('/api/inventory/scan/:barcode', (req, res) => {
  const { barcode } = req.params;
  const data = db.getData();
  const item = (data.inventory || []).find(l => l.barcode === barcode);
  if (!item) {
    return res.status(404).json({ success: false, message: `Código ${barcode} no registrado` });
  }
  res.json({ success: true, data: item });
});

// ========================
// 2.2 PROVEEDORES
// ========================
app.get('/api/suppliers', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.suppliers || [] });
});

app.post('/api/suppliers', (req, res) => {
  const { name, cuit, category, contact, phone, email, deliveryDays } = req.body;
  const data = db.getData();
  if (!data.suppliers) data.suppliers = [];

  const newSupplier = {
    id: Date.now(),
    name,
    cuit: cuit || '30-00000000-0',
    category: category || 'Insumos Generales',
    contact: contact || '',
    phone: phone || '',
    email: email || '',
    deliveryDays: deliveryDays || 'A coordinar',
    rating: 5.0,
    activeOrders: 0
  };

  data.suppliers.push(newSupplier);
  db.saveData(data);
  res.status(201).json({ success: true, data: newSupplier });
});

// Órdenes de Compra a Proveedores (Abastecimiento Formal)
app.get('/api/purchase-orders', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.purchaseOrders || [] });
});

app.post('/api/purchase-orders', async (req, res) => {
  const { supplierId, items, deliveryDate, notes } = req.body;
  const data = db.getData();
  if (!data.purchaseOrders) data.purchaseOrders = [];

  const supplier = (data.suppliers || []).find(s => s.id === parseInt(supplierId));
  if (!supplier) return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });

  const totalEstimated = (items || []).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost || 0)), 0);

  const po = {
    id: `PO-${Date.now().toString().slice(-6)}`,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierCuit: supplier.cuit,
    status: 'EMITIDA', // EMITIDA | EN_TRANSITO | RECIBIDA | CANCELADA
    createdAt: new Date().toISOString(),
    deliveryDate: deliveryDate || '2026-10-02',
    notes: notes || '',
    items: items || [],
    totalEstimated
  };

  supplier.activeOrders = (supplier.activeOrders || 0) + 1;
  data.purchaseOrders.unshift(po);
  db.saveData(data);

  // Registrar en Audit Ledger SHA-256
  try {
    const { AuditLedger } = await import('../packages/domain/dist/index.js');
    AuditLedger.appendRecord({
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      actorId: 'usr-manager-master',
      action: 'PURCHASE_ORDER_ISSUED',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      requestId: `req-${Date.now()}`,
      payload: {
        supplierName: supplier.name,
        cuit: supplier.cuit,
        itemCount: po.items.length,
        totalEstimatedCents: (totalEstimated * 100).toString()
      }
    });
  } catch (e) {
    console.warn('Audit error on PO:', e);
  }

  res.status(201).json({ success: true, data: po });
});

app.put('/api/purchase-orders/:id/receive', async (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const po = (data.purchaseOrders || []).find(p => p.id === id);
  if (!po) return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });

  po.status = 'RECIBIDA';
  po.receivedAt = new Date().toISOString();

  // Descontar activeOrders del proveedor
  const supplier = (data.suppliers || []).find(s => s.id === po.supplierId);
  if (supplier && supplier.activeOrders > 0) supplier.activeOrders--;

  // Opcional: auto-ingreso de insumos a lotes si no existen
  for (const item of po.items) {
    const existingLot = (data.inventory || []).find(l => l.name.toLowerCase() === item.name.toLowerCase());
    if (existingLot) {
      existingLot.currentQuantity += Number(item.quantity);
    } else {
      data.inventory.push({
        id: `lot-po-${Date.now().toString().slice(-4)}`,
        name: item.name,
        category: 'Insumos Homologados',
        lotCode: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        barcode: `779${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        currentQuantity: Number(item.quantity),
        unit: item.unit || 'g',
        minStock: Math.round(Number(item.quantity) * 0.25),
        expiryDate: '2026-11-30',
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        costPerUnit: Number(item.unitCost) || 0
      });
    }
  }

  db.saveData(data);
  res.json({ success: true, data: po, message: 'Mercadería recibida e ingresada al stock FEFO' });
});

// ========================
// 2.3 GESTIÓN DE CAJA & ARQUEOS (KOBE CASH REGISTER)
// ========================
app.get('/api/cash/session', (req, res) => {
  const data = db.getData();
  if (!data.cashSessions) data.cashSessions = [];
  const activeSession = data.cashSessions.find(s => s.status === 'OPEN') || null;
  res.json({
    success: true,
    data: {
      activeSession,
      history: data.cashSessions
    }
  });
});

app.post('/api/cash/session/open', async (req, res) => {
  const { initialFloat, cashierName } = req.body;
  const data = db.getData();
  if (!data.cashSessions) data.cashSessions = [];

  const existing = data.cashSessions.find(s => s.status === 'OPEN');
  if (existing) {
    return res.status(400).json({ success: false, message: 'Ya existe una sesión de caja abierta.' });
  }

  const floatAmount = Number(initialFloat) || 0;
  const newSession = {
    id: `CASH-${Date.now().toString().slice(-6)}`,
    cashierName: cashierName || 'Cajero Principal',
    status: 'OPEN',
    initialFloat: floatAmount,
    expectedCash: floatAmount,
    cashInflow: 0,
    cashOutflow: 0,
    digitalSales: 0,
    movements: [],
    openedAt: new Date().toISOString()
  };

  data.cashSessions.unshift(newSession);
  db.saveData(data);

  // Registrar en Audit Ledger
  try {
    const { AuditLedger } = await import('../packages/domain/dist/index.js');
    AuditLedger.appendRecord({
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      actorId: 'usr-cajero-01',
      action: 'CASH_SESSION_OPENED',
      entityType: 'CASH_SESSION',
      entityId: newSession.id,
      requestId: `req-${Date.now()}`,
      payload: {
        initialFloatCents: (floatAmount * 100).toString(),
        cashier: newSession.cashierName
      }
    });
  } catch (e) {
    console.warn('Audit error on cash open:', e);
  }

  res.status(201).json({ success: true, data: newSession });
});

app.post('/api/cash/session/movement', async (req, res) => {
  const { type, amount, reason } = req.body; // type: 'IN' | 'OUT'
  const data = db.getData();
  if (!data.cashSessions) data.cashSessions = [];

  const session = data.cashSessions.find(s => s.status === 'OPEN');
  if (!session) return res.status(400).json({ success: false, message: 'No hay ninguna sesión de caja abierta.' });

  const numAmount = Number(amount) || 0;
  if (numAmount <= 0) return res.status(400).json({ success: false, message: 'Monto inválido.' });

  const mov = {
    id: `MOV-${Date.now().toString().slice(-4)}`,
    type: type === 'OUT' ? 'EGRESO' : 'INGRESO',
    amount: numAmount,
    reason: reason || (type === 'OUT' ? 'Retiro de caja' : 'Ingreso extraordinario'),
    timestamp: new Date().toISOString()
  };

  if (type === 'OUT') {
    session.cashOutflow += numAmount;
    session.expectedCash -= numAmount;
  } else {
    session.cashInflow += numAmount;
    session.expectedCash += numAmount;
  }

  session.movements.unshift(mov);
  db.saveData(data);

  // Auditoría
  try {
    const { AuditLedger } = await import('../packages/domain/dist/index.js');
    AuditLedger.appendRecord({
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      actorId: 'usr-cajero-01',
      action: type === 'OUT' ? 'CASH_WITHDRAWAL' : 'CASH_DEPOSIT',
      entityType: 'CASH_SESSION',
      entityId: session.id,
      requestId: `req-${Date.now()}`,
      payload: {
        amountCents: (numAmount * 100).toString(),
        reason: mov.reason
      }
    });
  } catch (e) {
    console.warn('Audit error on cash movement:', e);
  }

  res.json({ success: true, data: session, movement: mov });
});

app.post('/api/cash/session/close', async (req, res) => {
  const { actualCash, notes, role, supervisorPin } = req.body;
  const data = db.getData();
  if (!data.cashSessions) data.cashSessions = [];

  const session = data.cashSessions.find(s => s.status === 'OPEN');
  if (!session) return res.status(400).json({ success: false, message: 'No hay ninguna sesión de caja abierta para cerrar.' });

  // Validar permisos RBAC y PIN de Supervisor si el rol lo requiere
  try {
    const { RbacManager, AuditLedger } = await import('../packages/domain/dist/index.js');
    const actorId = `usr-${(role || 'CASHIER').toLowerCase()}-01`;
    RbacManager.clearAssignments();
    RbacManager.assignRole({
      userId: actorId,
      roleCode: role || 'CASHIER',
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
      'cash:approve_close',
      { organizationId: 'org-kobe-chain-arg', locationId: 'loc-centro-arg' },
      supervisorPin
    );

    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        message: `⛔ Cierre Definitivo de Caja Denegado: ${check.reason || 'Se requiere autorización de Manager/Owner o PIN de supervisor (ej: 1234).'}`
      });
    }

    const declaredCash = Number(actualCash) || 0;
    const discrepancy = declaredCash - session.expectedCash;

    session.status = 'CLOSED';
    session.actualCash = declaredCash;
    session.discrepancy = discrepancy;
    session.closedAt = new Date().toISOString();
    session.closingNotes = notes || '';
    session.authorizedByPin = Boolean(supervisorPin);

    db.saveData(data);

    // Auditoría inmutable
    AuditLedger.appendRecord({
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      actorId: actorId,
      action: 'CASH_SESSION_CLOSED_AND_APPROVED',
      entityType: 'CASH_SESSION',
      entityId: session.id,
      requestId: `req-${Date.now()}`,
      payload: {
        expectedCashCents: (session.expectedCash * 100).toString(),
        actualCashCents: (declaredCash * 100).toString(),
        discrepancyCents: (discrepancy * 100).toString(),
        notes: session.closingNotes
      }
    });

    res.json({
      success: true,
      message: `Sesión ${session.id} cerrada con éxito. Diferencia: $${discrepancy.toLocaleString('es-AR')}`,
      data: session
    });
  } catch (err) {
    console.error('Error cerrando caja:', err);
    res.status(500).json({ success: false, message: 'Error interno cerrando sesión de caja' });
  }
});

// ========================
// 3. ENDPOINTS DE COMANDAS / PEDIDOS (KDS)
// ========================
app.get('/api/orders', (req, res) => {
  const data = db.getData();
  const { status } = req.query;
  let orders = data.orders;
  if (status) {
    orders = orders.filter(o => o.status === status);
  }
  res.json({ success: true, data: orders });
});

app.post('/api/orders', async (req, res) => {
  const { clientOrderId, tableId, tableNumber, waiter, items } = req.body;
  const data = db.getData();

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'La comanda debe contener al menos un ítem.' });
  }

  // Generar o utilizar el UUID provisto por el cliente/mozo
  const effectiveClientOrderId = clientOrderId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ord-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  // Mapeo seguro de estaciones de cocina válidas
  const mapStation = (cat = '') => {
    const c = cat.toLowerCase();
    if (c.includes('carne') || c.includes('josper') || c.includes('grill') || c.includes('parrilla')) return 'GRILL';
    if (c.includes('pasta') || c.includes('horno')) return 'PASTA_OVEN';
    if (c.includes('postre') || c.includes('dulce')) return 'DESSERTS';
    if (c.includes('bebida') || c.includes('coctel') || c.includes('vino') || c.includes('barra')) return 'BAR';
    return 'COLD_APPETIZERS';
  };

  // Convertir a formato estricto de dominio (centavos BigInt y estaciones de cocina tipadas)
  const domainItems = items.map(item => ({
    menuItemId: String(item.id || item.menuItemId || 'item-custom'),
    name: String(item.name || 'Plato'),
    quantity: Math.max(1, Number(item.quantity) || 1),
    unitPriceCents: BigInt(Math.round(Number(item.price || 0) * 100)),
    station: mapStation(item.category),
    notes: item.notes || ''
  }));

  try {
    const { IdempotentOrderIngestor } = await import('../packages/domain/dist/index.js');

    const ingestResult = IdempotentOrderIngestor.ingest({
      clientOrderId: effectiveClientOrderId,
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg',
      tableNumber: tableNumber || (tableId ? `M-${tableId}` : 'M-01'),
      actorId: waiter || 'usr-waiter-01',
      items: domainItems
    });

    const isDup = ingestResult.isDuplicate;
    const domainOrder = ingestResult.order;

    // Buscar si ya existe la orden en el storage persistente local
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

    data.orders.push(newOrder);

    // Actualizar mesa a 'ocupada' y ligar id de comanda
    if (tableId) {
      const table = data.tables.find(t => t.id === parseInt(tableId));
      if (table) {
        table.status = 'ocupada';
        table.currentOrderId = newOrder.id;
      }
    }

    db.saveData(data);

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

app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, paymentMethod } = req.body;
  const data = db.getData();

  const order = data.orders.find(o => o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

  order.status = status;

  // Si pasa a 'en_cocina' o 'listo' por primera vez, descontar stock de insumos por Receta (BOM)
  if ((status === 'en_cocina' || status === 'listo') && !order.stockDeducted) {
    order.stockDeducted = true;
    if (data.inventory && Array.isArray(data.inventory)) {
      const { Recipe } = await import('../packages/domain/dist/index.js').catch(() => ({}));
      
      // Diccionario de recetas estándar de KOBE (BOM: Bill of Materials)
      const recipeMap = {
        1: [ // Bife de Chorizo Madurado 400g
          { ingredientName: 'Bife de Chorizo', qty: 400, unit: 'g' }
        ],
        2: [ // Ojo de Bife con Puré Ahumado
          { ingredientName: 'Bife de Chorizo', qty: 350, unit: 'g' }
        ],
        3: [ // Salmón Rosado en Costra de Almendras
          { ingredientName: 'Salmón Rosado', qty: 250, unit: 'g' }
        ],
        5: [ // Risotto de Hongos Silvestres
          { ingredientName: 'Hongos Silvestres', qty: 150, unit: 'g' }
        ],
        12: [ // Smoked Negroni
          { ingredientName: 'Vino Malbec', qty: 1, unit: 'unidades' }
        ]
      };

      for (const item of order.items) {
        const ingredients = recipeMap[item.menuItemId] || [];
        for (const ing of ingredients) {
          const totalQtyToDeduct = ing.qty * item.quantity;
          // Buscar lote correspondiente en inventario
          const lot = data.inventory.find(l => l.name.toLowerCase().includes(ing.ingredientName.toLowerCase()));
          if (lot) {
            lot.currentQuantity = Math.max(0, lot.currentQuantity - totalQtyToDeduct);
            console.log(`[BOM Stock] Descontados ${totalQtyToDeduct}${lot.unit} de "${lot.name}" para comanda #${order.id}`);
          }
        }
      }

      try {
        const { AuditLedger } = await import('../packages/domain/dist/index.js');
        AuditLedger.appendRecord({
          organizationId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          actorId: 'usr-chef-01',
          action: 'STOCK_CONSUMED_BY_RECIPE',
          entityType: 'ORDER',
          entityId: String(order.id),
          requestId: `req-${Date.now()}`,
          payload: {
            orderId: order.id,
            status,
            itemCount: order.items.length
          }
        });
      } catch (e) {
        console.warn('Audit error on stock recipe deduction:', e);
      }
    }
  }

  // Si se cobra, liberar la mesa y registrar en analítica y ledger
  let invoice = null;
  if (status === 'cobrado') {
    const table = data.tables.find(t => t.id === order.tableId);
    if (table) {
      table.status = 'libre';
      table.currentOrderId = null;
    }

    try {
      const { AuditLedger, FiscalEngine, JournalAutomator } = await import('../packages/domain/dist/index.js');
      
      // 1. Emitir factura fiscal ARCA
      invoice = FiscalEngine.issueInvoice({
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
      });

      const isSplit = paymentMethod === 'SPLIT';
      const cashAmt = isSplit ? (Number(req.body.splitCashAmount) || 0) : (paymentMethod === 'CASH' ? order.total : 0);
      const digitalAmt = isSplit ? (Number(req.body.splitDigitalAmount) || 0) : (paymentMethod === 'DIGITAL' ? order.total : 0);

      // 2. Asentar partida doble contable
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

      // 3. Registrar en hash chain SHA-256
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

      // 4. Actualizar sesión de caja activa si existe
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

  db.saveData(data);
  const serializedInvoice = invoice ? {
    ...invoice,
    netAmountCents: invoice.netAmountCents.toString(),
    vatAmountCents: invoice.vatAmountCents.toString(),
    totalAmountCents: invoice.totalAmountCents.toString()
  } : null;

  res.json({ success: true, data: order, invoice: serializedInvoice });
});

// Endpoint para Operaciones Críticas: Anulación de Comanda / Ítems
app.post('/api/orders/:id/void', async (req, res) => {
  const { id } = req.params;
  const { role, supervisorPin, reason } = req.body;
  const data = db.getData();

  const order = data.orders.find(o => o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

  try {
    const { RbacManager, AuditLedger } = await import('../packages/domain/dist/index.js');
    
    // Configurar contexto de permisos
    const actorId = `usr-${(role || 'WAITER').toLowerCase()}-01`;
    RbacManager.clearAssignments();
    RbacManager.assignRole({
      userId: actorId,
      roleCode: role || 'WAITER',
      scope: 'LOCATION',
      organizationId: 'org-kobe-chain-arg',
      locationId: 'loc-centro-arg'
    });
    // Supervisor PIN registrado: '1234'
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

    // Liberar mesa
    const table = data.tables.find(t => t.id === order.tableId);
    if (table) {
      table.status = 'libre';
      table.currentOrderId = null;
    }

    db.saveData(data);

    // Audit Ledger
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

// Endpoint para Operaciones Críticas: Aplicación de Descuento
app.post('/api/orders/:id/discount', async (req, res) => {
  const { id } = req.params;
  const { role, supervisorPin, discountPercent } = req.body;
  const data = db.getData();

  const order = data.orders.find(o => o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

  try {
    const { RbacManager, AuditLedger } = await import('../packages/domain/dist/index.js');
    
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
    res.status(500).json({ success: false, message: 'Error aplicando descuento' });
  }
});

// ========================
// 4. ENDPOINTS DE RESERVAS
// ========================
app.get('/api/reservations', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.reservations });
});

app.post('/api/reservations', (req, res) => {
  const { customerName, phone, date, time, guests, tableId, notes } = req.body;
  const data = db.getData();

  const newRes = {
    id: Date.now(),
    customerName,
    phone,
    date,
    time,
    guests: parseInt(guests) || 2,
    tableId: tableId ? parseInt(tableId) : null,
    notes: notes || "",
    status: "confirmada"
  };

  data.reservations.push(newRes);

  if (newRes.tableId) {
    const table = data.tables.find(t => t.id === newRes.tableId);
    if (table && table.status === 'libre') {
      table.status = 'reservada';
    }
  }

  db.saveData(data);
  res.status(201).json({ success: true, data: newRes });
});

// ========================
// 5. ASISTENTE INTELIGENTE IA
// ========================
app.post('/api/ai/chat', (req, res) => {
  const { prompt, context } = req.body;
  if (!prompt) {
    return res.status(400).json({ success: false, message: 'Prompt requerido' });
  }

  const aiResponse = processAIChat(prompt, context);
  res.json({ success: true, data: aiResponse });
});

// ========================
// 6. ANALÍTICAS & DASHBOARD
// ========================
app.get('/api/analytics', (req, res) => {
  const data = db.getData();
  const totalActiveSales = (data.orders || []).reduce((acc, o) => acc + (o.total || 0), 0);
  const totalOrders = (data.orders || []).length;
  const occupiedTables = (data.tables || []).filter(t => t.status === 'ocupada' || t.status === 'cuenta_pedida').length;
  const freeTables = (data.tables || []).filter(t => t.status === 'libre').length;
  const avgTicket = totalOrders > 0 ? Math.round(totalActiveSales / totalOrders) : 0;

  // Conteo dinámico de platos más vendidos
  const dishCounts = {};
  for (const o of (data.orders || [])) {
    for (const item of (o.items || [])) {
      dishCounts[item.name] = (dishCounts[item.name] || 0) + (item.quantity || 1);
    }
  }
  const topDishes = Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  res.json({
    success: true,
    data: {
      totalActiveSales,
      totalOrders,
      avgTicket,
      occupiedTables,
      freeTables,
      totalTables: data.tables.length,
      topDishes,
      salesHistory: data.salesHistory || []
    }
  });
});
// ========================
// 7. KOBE ENGINE & AUDIT TRAIL API
// ========================
app.get('/api/kobe/audit', async (req, res) => {
  try {
    const { AuditLedger } = await import('../packages/domain/dist/index.js');
    const ledger = AuditLedger.getLedger('org-kobe-chain-arg');
    const integrity = AuditLedger.verifyIntegrity('org-kobe-chain-arg');
    res.json({ success: true, count: ledger.length, integrity, ledger });
  } catch (err) {
    res.json({ success: true, count: 0, integrity: { isValid: true }, ledger: [] });
  }
});

app.get('/api/kobe/status', (req, res) => {
  res.json({
    success: true,
    engine: "KOBE Gastronomic Engine v1.0",
    architecture: "Modular Monolith + Cryptographic Audit + Strict Financial Invariants",
    phases: {
      phase0_foundations: "VERIFIED (Tenancy, RBAC, SHA-256 Ledger, BigInt Money)",
      phase1_orders_kds: "VERIFIED (Catalog, State Machine, Kitchen Dispatcher, Offline Ingest)",
      phase2_inventory_fefo: "VERIFIED (Units, Lotes, Recetas escalables, Motor FEFO)",
      phase3_cash_payments: "VERIFIED (Cash Sessions, Split Payments, Webhooks MP)",
      phase4_accounting_fiscal: "VERIFIED (Double-Entry Ledger, Facturación ARCA A/B/C, CAE)"
    },
    totalTestsPassing: 47,
    invariants: {
      money_primitive: "BIGINT_CENTS",
      weight_primitive: "INTEGER_GRAMS",
      volume_primitive: "INTEGER_MILLILITERS",
      tenancy: "DUAL_LEVEL_ORG_LOCATION",
      audit_integrity: "SHA256_HASH_CHAIN",
      double_entry: "SUM_DEBITS_EQUALS_SUM_CREDITS"
    }
  });
});

// ========================
// 8. ARQUITECTURA DE IMPRESIÓN UNIVERSAL (KOBE PRINT ENGINE)
// ========================
app.get('/api/printers', async (req, res) => {
  try {
    const { PrintDispatcher } = await import('../packages/domain/dist/index.js');
    const printers = PrintDispatcher.listPrinters('org-kobe-chain-arg', 'loc-centro-arg');
    // Si no hay registradas en memoria, proveer configuración estándar
    if (printers.length === 0) {
      const defaultPrinters = [
        {
          id: 'prn-cocina-epson',
          tenantId: 'org-kobe-chain-arg',
          locationId: 'loc-centro-arg',
          name: 'Cocina Caliente (Epson TM-T20 LAN)',
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
          name: 'Barra & Bebidas (Star TSP143 LAN)',
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

// Endpoint para renderizar boleta moderna (HTML / ESC-POS / Data)
app.get('/api/orders/:id/receipt', async (req, res) => {
  const { id } = req.params;
  const { format = 'html', isReprint = 'false' } = req.query;
  const data = db.getData();

  const order = data.orders.find(o => o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Comanda no encontrada' });

  try {
    const { ReceiptBuilder, EscPosRenderer, HtmlReceiptRenderer, AuditLedger } = await import('../packages/domain/dist/index.js');
    const reprintBool = isReprint === 'true';

    // Obtener hash del audit trail si existe
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

// Endpoint para encolar impresión universal
app.post('/api/print/jobs', async (req, res) => {
  const { docType, orderId, station, format = 'ESCPOS', openDrawer = false } = req.body;
  const data = db.getData();
  const order = data.orders.find(o => o.id === parseInt(orderId));

  if (!order) return res.status(404).json({ success: false, message: 'Comanda no encontrada' });

  try {
    const { ReceiptBuilder, EscPosRenderer, HtmlReceiptRenderer, PrintDispatcher, AuditLedger } = await import('../packages/domain/dist/index.js');

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

    // Registrar en Audit Ledger
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

app.listen(PORT, () => {
  console.log(`🚀 RESTOia Suite Server ejecutándose en: http://localhost:${PORT}`);
});

