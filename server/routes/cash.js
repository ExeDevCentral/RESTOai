import { Router } from 'express';
import { db } from '../db.js';

export const cashRouter = Router();

cashRouter.get('/session', (req, res) => {
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

cashRouter.get('/status', (req, res) => {
  const data = db.getData();
  if (!data.cashSessions) data.cashSessions = [];
  const activeSession = data.cashSessions.find(s => s.status === 'OPEN') || null;
  res.json({
    success: true,
    status: activeSession ? 'OPEN' : 'CLOSED',
    activeSession,
    history: data.cashSessions
  });
});

cashRouter.post('/session/open', async (req, res) => {
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

  try {
    const { AuditLedger } = await import('../../packages/domain/dist/index.js');
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

cashRouter.post('/session/movement', async (req, res) => {
  const { type, amount, reason } = req.body;
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

  try {
    const { AuditLedger } = await import('../../packages/domain/dist/index.js');
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

cashRouter.post('/session/close', async (req, res) => {
  const { actualCash, notes, role, supervisorPin } = req.body;
  const data = db.getData();
  if (!data.cashSessions) data.cashSessions = [];

  const session = data.cashSessions.find(s => s.status === 'OPEN');
  if (!session) return res.status(400).json({ success: false, message: 'No hay ninguna sesión de caja abierta para cerrar.' });

  try {
    const { RbacManager, AuditLedger } = await import('../../packages/domain/dist/index.js');
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
