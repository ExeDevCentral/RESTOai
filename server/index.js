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

app.post('/api/orders', (req, res) => {
  const { tableId, tableNumber, waiter, items } = req.body;
  const data = db.getData();

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const newOrder = {
    id: Date.now(),
    tableId: parseInt(tableId),
    tableNumber: tableNumber || `M-${tableId}`,
    waiter: waiter || "Mozo Asignado",
    status: "pendiente",
    createdAt: new Date().toISOString(),
    items: items.map(i => ({
      ...i,
      status: "pendiente"
    })),
    total
  };

  data.orders.push(newOrder);

  // Actualizar mesa a 'ocupada' y ligar id de comanda
  const table = data.tables.find(t => t.id === parseInt(tableId));
  if (table) {
    table.status = 'ocupada';
    table.currentOrderId = newOrder.id;
  }

  db.saveData(data);
  res.status(201).json({ success: true, data: newOrder });
});

app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = db.getData();

  const order = data.orders.find(o => o.id === parseInt(id));
  if (!order) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

  order.status = status;

  // Si se cobra, liberar la mesa y registrar en analítica
  if (status === 'cobrado') {
    const table = data.tables.find(t => t.id === order.tableId);
    if (table) {
      table.status = 'libre';
      table.currentOrderId = null;
    }
  }

  db.saveData(data);
  res.json({ success: true, data: order });
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
  const totalActiveSales = data.orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalOrders = data.orders.length;
  const occupiedTables = data.tables.filter(t => t.status === 'ocupada').length;
  const freeTables = data.tables.filter(t => t.status === 'libre').length;

  res.json({
    success: true,
    data: {
      totalActiveSales,
      totalOrders,
      occupiedTables,
      freeTables,
      totalTables: data.tables.length,
      salesHistory: data.salesHistory
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 RESTOia Suite Server ejecutándose en: http://localhost:${PORT}`);
});
