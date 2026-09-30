import { Router } from 'express';
import { db } from '../db.js';

export const tablesRouter = Router();

tablesRouter.get('/', (req, res) => {
  const data = db.getData();
  res.json({ success: true, data: data.tables });
});

tablesRouter.put('/:id/status', (req, res) => {
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
