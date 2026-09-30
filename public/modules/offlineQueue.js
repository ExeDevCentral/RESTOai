// ============================================================================
// RESTOia / KOBE — Offline Queue & Resilient Ingestion
// ============================================================================

const OFFLINE_QUEUE_KEY = 'restoia_offline_orders_queue_v1';

export function getOfflineOrdersQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveOfflineOrdersQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error guardando en cola offline:', err);
  }
  updateOfflineQueueIndicator();
}

export function updateOfflineQueueIndicator() {
  const queue = getOfflineOrdersQueue();
  let badge = document.getElementById('offline-queue-indicator');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'offline-queue-indicator';
    badge.style.cssText = 'position: fixed; bottom: 18px; right: 20px; z-index: 9999; padding: 8px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: none; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.4);';
    document.body.appendChild(badge);
  }

  if (queue.length > 0) {
    badge.style.display = 'flex';
    badge.style.background = '#e76f51';
    badge.style.color = '#fff';
    badge.innerHTML = `<span>📡 Cola Offline: ${queue.length} comanda(s) pendiente(s)</span> <button id="btn-flush-offline-queue" style="background: rgba(255,255,255,0.25); border: none; color: #fff; padding: 2px 8px; border-radius: 10px; cursor: pointer; font-size: 0.75rem;">Sincronizar</button>`;
    const btn = document.getElementById('btn-flush-offline-queue');
    if (btn) btn.onclick = flushOfflineOrdersQueue;
  } else {
    badge.style.display = 'none';
  }
}

export async function flushOfflineOrdersQueue(onComplete) {
  const queue = getOfflineOrdersQueue();
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  saveOfflineOrdersQueue(remaining);
  if (remaining.length === 0) {
    console.log('✅ Todas las comandas offline se sincronizaron con éxito.');
    if (typeof onComplete === 'function') {
      await onComplete();
    }
  }
}

export function generateClientOrderId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'ord-cl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

export function setupOfflineListeners(onSyncSuccess) {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión de red restablecida. Vaciando cola offline...');
    flushOfflineOrdersQueue(onSyncSuccess);
    const pill = document.getElementById('connection-status-pill');
    if (pill) {
      pill.style.background = 'rgba(72,169,124,0.15)';
      pill.style.color = 'var(--accent-green)';
      pill.style.borderColor = 'rgba(72,169,124,0.3)';
      pill.innerHTML = '<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green);"></span> En línea';
    }
  });

  window.addEventListener('offline', () => {
    console.warn('⚠️ Se perdió la conexión de red.');
    const pill = document.getElementById('connection-status-pill');
    if (pill) {
      pill.style.background = 'rgba(239,68,68,0.15)';
      pill.style.color = 'var(--accent-red)';
      pill.style.borderColor = 'rgba(239,68,68,0.3)';
      pill.innerHTML = '<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-red);"></span> Desconectado (Modo Offline)';
    }
  });

  updateOfflineQueueIndicator();
}
