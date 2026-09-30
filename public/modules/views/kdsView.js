// Kitchen Display System (KDS) View Module
export function renderKDSView(state, onStatusUpdate) {
  const listPendiente = document.getElementById('kds-list-pendiente');
  const listCocina = document.getElementById('kds-list-cocina');
  const listListo = document.getElementById('kds-list-listo');

  if (!listPendiente || !listCocina || !listListo) return;

  const station = state.selectedStation || 'all';

  const filterOrderItems = (order) => {
    if (station === 'all') return order.items;
    return order.items.filter(item => {
      const menuItem = state.menu.find(m => m.id === item.menuItemId || m.name === item.name);
      const category = menuItem ? menuItem.category : '';
      const isBar = ['Bebidas', 'Vinos', 'Tragos', 'Cafetería'].includes(category);
      if (station === 'BARRA') return isBar;
      if (station === 'COCINA') return !isBar;
      return true;
    });
  };

  const getFilteredOrders = (status) => {
    return state.orders
      .filter(o => o.status === status)
      .map(o => ({
        ...o,
        filteredItems: filterOrderItems(o)
      }))
      .filter(o => o.filteredItems.length > 0);
  };

  const pendientes = getFilteredOrders('pendiente');
  const enCocina = getFilteredOrders('en_cocina');
  const listos = getFilteredOrders('listo');

  const countPending = document.getElementById('count-pending');
  const countCooking = document.getElementById('count-cooking');
  const countReady = document.getElementById('count-ready');

  if (countPending) countPending.textContent = pendientes.length;
  if (countCooking) countCooking.textContent = enCocina.length;
  if (countReady) countReady.textContent = listos.length;

  const renderCard = (order, nextStatus, nextLabel, btnClass = 'btn-primary') => {
    const elapsedMins = order.createdAt ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000) : 0;
    const isDelayed = elapsedMins >= 20;
    const isWarning = elapsedMins >= 10 && elapsedMins < 20;
    const borderColor = isDelayed ? '#ef4444' : isWarning ? '#e9c46a' : 'rgba(224,169,109,0.18)';
    const delayBadge = isDelayed 
      ? '<span style="background: rgba(239,68,68,0.2); color: #ef4444; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid #ef4444;">🚨 DEMORA CRÍTICA</span>' 
      : isWarning 
      ? '<span style="background: rgba(233,196,106,0.2); color: #e9c46a; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 600;">⚠️ ALERTA TIEMPO</span>' 
      : '';

    return `
      <div class="kds-card" style="border: 1px solid ${borderColor}; transition: transform 0.2s ease, border-color 0.2s ease;">
        <div class="kds-card-head">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong>Mesa ${order.tableNumber}</strong>
            ${delayBadge}
          </div>
          <span class="kds-time" style="color: ${isDelayed ? '#ef4444' : isWarning ? '#e9c46a' : 'inherit'}; font-weight: 600;">
            ⏱️ ${elapsedMins} min
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <small style="color: #94a3b8;">Mozo: ${order.waiter}</small>
          ${station !== 'all' ? `<span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: rgba(224,169,109,0.15); color: var(--primary);">Estación: ${station}</span>` : ''}
        </div>
        <ul class="kds-items">
          ${order.filteredItems.map(i => `
            <li>
              <span><strong>${i.quantity}x</strong> ${i.name}</span>
              ${i.notes ? `<div class="kds-note">Nota: ${i.notes}</div>` : ''}
            </li>
          `).join('')}
        </ul>
        <div class="kds-actions">
          ${nextStatus ? `
            <button class="btn ${btnClass} btn-block" onclick="updateOrderStatus('${order.id}', '${nextStatus}')">
              ${nextLabel}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  };

  listPendiente.innerHTML = pendientes.length > 0
    ? pendientes.map(o => renderCard(o, 'en_cocina', '🔥 Iniciar Preparación')).join('')
    : `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; text-align: center;">No hay comandas pendientes para ${station === 'all' ? 'ninguna estación' : station}</div>`;

  listCocina.innerHTML = enCocina.length > 0
    ? enCocina.map(o => renderCard(o, 'listo', '🛎️ Marcar Listo para Servir')).join('')
    : `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; text-align: center;">Sin preparaciones en marcha</div>`;

  listListo.innerHTML = listos.length > 0
    ? listos.map(o => renderCard(o, 'servido', '🍽️ Entregar a Mesa', 'btn-secondary')).join('')
    : `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; text-align: center;">Sin comandas listas</div>`;
}
