import { Router } from 'express';
import { db } from '../db.js';

export const menuRouter = Router();

menuRouter.get('/', (req, res) => {
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

menuRouter.post('/', (req, res) => {
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

menuRouter.put('/:id', (req, res) => {
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

menuRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.menu.findIndex(m => m.id === parseInt(id));
  if (index === -1) return res.status(404).json({ success: false, message: 'Plato no encontrado' });

  data.menu.splice(index, 1);
  db.saveData(data);
  res.json({ success: true, message: 'Plato eliminado' });
});

menuRouter.patch('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const data = db.getData();
  const item = data.menu.find(m => m.id === parseInt(id));
  if (!item) return res.status(404).json({ success: false, message: 'Plato no encontrado' });

  item.available = !item.available;
  db.saveData(data);
  res.json({ success: true, data: item });
});
