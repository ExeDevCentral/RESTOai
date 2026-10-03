import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { tablesRouter } from './routes/tables.js';
import { menuRouter } from './routes/menu.js';
import { ordersRouter } from './routes/orders.js';
import { inventoryRouter } from './routes/inventory.js';
import { cashRouter } from './routes/cash.js';
import { printRouter } from './routes/print.js';
import { commonRouter } from './routes/common.js';
import { integrationsRouter } from './routes/integrations.js';

import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware de Observabilidad y Logs Estructurados
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    logger.api(`${req.method} ${req.path}`, { ip: req.ip });
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Endpoint de Consulta de Logs del Sistema (para IA, MCP y Panel de Control)
app.get('/api/logs', (req, res) => {
  const tag = req.query.tag;
  res.json({ success: true, logs: logger.getRecentLogs(tag) });
});

// Enrutadores Modulares Limpios
app.use('/api/tables', tablesRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/cash', cashRouter);
app.use('/api/print', printRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api', inventoryRouter);
app.use('/api', commonRouter);

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RESTOia Suite Server ejecutándose:`);
    console.log(`   👉 Local:   http://localhost:${PORT}`);
    console.log(`   📱 Red WiFi / Tablets: http://192.168.100.51:${PORT}`);
  });
}

export default app;
