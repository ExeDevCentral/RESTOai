import { Router } from 'express';
import { db } from '../db.js';

export const inventoryRouter = Router();

inventoryRouter.get('/inventory', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.inventory || [] });
});

inventoryRouter.post('/inventory', (req, res) => {
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

inventoryRouter.patch('/inventory/:id/adjust', (req, res) => {
  const { id } = req.params;
  const { delta, reason } = req.body;
  const data = db.getData();
  const lot = (data.inventory || []).find(l => l.id === id);
  if (!lot) return res.status(404).json({ success: false, message: 'Lote no encontrado' });

  lot.currentQuantity = Math.max(0, lot.currentQuantity + Number(delta));
  db.saveData(data);
  res.json({ success: true, data: lot, reason: reason || 'Ajuste manual' });
});

inventoryRouter.get('/inventory/scan/:barcode', (req, res) => {
  const { barcode } = req.params;
  const data = db.getData();
  const item = (data.inventory || []).find(l => l.barcode === barcode);
  if (!item) {
    return res.status(404).json({ success: false, message: `Código ${barcode} no registrado` });
  }
  res.json({ success: true, data: item });
});

inventoryRouter.get('/suppliers', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.suppliers || [] });
});

inventoryRouter.post('/suppliers', (req, res) => {
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

inventoryRouter.get('/purchase-orders', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.purchaseOrders || [] });
});

inventoryRouter.post('/purchase-orders', async (req, res) => {
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
    status: 'EMITIDA',
    createdAt: new Date().toISOString(),
    deliveryDate: deliveryDate || '2026-10-02',
    notes: notes || '',
    items: items || [],
    totalEstimated
  };

  supplier.activeOrders = (supplier.activeOrders || 0) + 1;
  data.purchaseOrders.unshift(po);
  db.saveData(data);

  try {
    const { AuditLedger } = await import('../../packages/domain/dist/index.js');
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

inventoryRouter.put('/purchase-orders/:id/receive', async (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const po = (data.purchaseOrders || []).find(p => p.id === id);
  if (!po) return res.status(404).json({ success: false, message: 'Orden de compra no encontrada' });

  po.status = 'RECIBIDA';
  po.receivedAt = new Date().toISOString();

  const supplier = (data.suppliers || []).find(s => s.id === po.supplierId);
  if (supplier && supplier.activeOrders > 0) supplier.activeOrders--;

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
