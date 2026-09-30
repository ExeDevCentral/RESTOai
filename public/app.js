// RESTOia - Frontend Application Logic (ESM Modular Architecture)
import { toCents, formatCurrency, formatCurrencyFromCents } from './modules/money.js';
import { 
  getOfflineOrdersQueue, 
  saveOfflineOrdersQueue, 
  updateOfflineQueueIndicator, 
  flushOfflineOrdersQueue, 
  generateClientOrderId, 
  setupOfflineListeners 
} from './modules/offlineQueue.js';

// Exponer a window para interactividad HTML onclick
window.toCents = toCents;
window.formatCurrency = formatCurrency;
window.formatCurrencyFromCents = formatCurrencyFromCents;
window.flushOfflineOrdersQueue = flushOfflineOrdersQueue;

const state = {
  currentTab: 'tab-pos',
  tables: [],
  menu: [],
  orders: [],
  reservations: [],
  inventory: [],
  suppliers: [],
  purchaseOrders: [],
  cashSession: { activeSession: null, history: [] },
  analytics: {},
  printers: [],
  trayItems: [], // Ítems seleccionados para la comanda actual
  selectedArea: 'all',
  selectedStation: 'all',
  selectedCategory: 'all',
  selectedTableForOrder: null
};

// ========================
// INICIALIZACIÓN
// ========================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAreaFilters();
  setupStationFilters();
  setupCategoryFilters();
  setupOrderTrayEvents();
  setupReservationForm();
  setupAIChat();
  setupModalEvents();
  setupInventoryEvents();
  setupSupplierEvents();
  setupPurchaseOrderEvents();
  setupCashSessionEvents();
  setupMenuManagementEvents();
  setupFloorPlanEvents();
  setupOfflineListeners(fetchAllData);

  // Cargar datos iniciales
  fetchAllData();

  // Polling automático cada 8 segundos para simular KDS y mesas en vivo
  setInterval(fetchOrdersAndTables, 8000);
});

// ========================
// SERVICIOS API
// ========================
async function fetchAllData() {
  await Promise.all([
    fetchTables(),
    fetchMenu(),
    fetchOrders(),
    fetchReservations(),
    fetchInventory(),
    fetchSuppliers(),
    fetchPurchaseOrders(),
    fetchCashSession(),
    fetchPrinters(),
    fetchAnalytics()
  ]);
  renderAll();
}

async function fetchOrdersAndTables() {
  await Promise.all([fetchTables(), fetchOrders()]);
  renderTables();
  renderKDS();
  updateKdsBadge();
}

async function fetchTables() {
  try {
    const res = await fetch('/api/tables');
    const json = await res.json();
    if (json.success) state.tables = json.data;
  } catch (e) {
    console.error('Error cargando mesas', e);
  }
}

async function fetchMenu() {
  try {
    const res = await fetch('/api/menu');
    const json = await res.json();
    if (json.success) state.menu = json.data;
  } catch (e) {
    console.error('Error cargando menú', e);
  }
}

async function fetchOrders() {
  try {
    const res = await fetch('/api/orders');
    const json = await res.json();
    if (json.success) state.orders = json.data;
  } catch (e) {
    console.error('Error cargando comandas', e);
  }
}

async function fetchReservations() {
  try {
    const res = await fetch('/api/reservations');
    const json = await res.json();
    if (json.success) state.reservations = json.data;
  } catch (e) {
    console.error('Error cargando reservas', e);
  }
}

async function fetchAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const json = await res.json();
    if (json.success) state.analytics = json.data;
  } catch (e) {
    console.error('Error cargando analíticas', e);
  }
}

async function fetchInventory() {
  try {
    const res = await fetch('/api/inventory');
    const json = await res.json();
    if (json.success) state.inventory = json.data;
  } catch (e) {
    console.error('Error cargando inventario', e);
  }
}

async function fetchSuppliers() {
  try {
    const res = await fetch('/api/suppliers');
    const json = await res.json();
    if (json.success) state.suppliers = json.data;
  } catch (e) {
    console.error('Error cargando proveedores', e);
  }
}

async function fetchPurchaseOrders() {
  try {
    const res = await fetch('/api/purchase-orders');
    const json = await res.json();
    if (json.success) state.purchaseOrders = json.data;
  } catch (e) {
    console.error('Error cargando órdenes de compra', e);
  }
}

async function fetchCashSession() {
  try {
    const res = await fetch('/api/cash/session');
    const json = await res.json();
    if (json.success) state.cashSession = json.data;
  } catch (e) {
    console.error('Error cargando sesiones de caja', e);
  }
}

async function fetchPrinters() {
  try {
    const res = await fetch('/api/printers');
    const json = await res.json();
    if (json.success) {
      state.printers = json.data;
      renderPrinters();
    }
  } catch (e) {
    console.error('Error cargando impresoras', e);
  }
}

// ========================
// RENDERIZADO GENERAL
// ========================
function renderAll() {
  renderTables();
  renderKDS();
  renderMenu();
  renderInventory();
  renderSuppliers();
  renderPurchaseOrders();
  renderCashSession();
  renderPrinters();
  renderReceiptOrderSelect();
  renderTableSelects();
  renderReservations();
  renderAnalytics();
  updateKdsBadge();
  updateStatsBar();
}

function updateKdsBadge() {
  const pendingCount = state.orders.filter(o => o.status === 'pendiente' || o.status === 'en_cocina').length;
  const badge = document.getElementById('kds-badge');
  if (badge) {
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }
}

function updateStatsBar() {
  document.getElementById('stat-total-tables').textContent = state.tables.length;
  document.getElementById('stat-occupied-tables').textContent = state.tables.filter(t => t.status === 'ocupada' || t.status === 'cuenta_pedida').length;
  document.getElementById('stat-free-tables').textContent = state.tables.filter(t => t.status === 'libre').length;
  
  const totalSales = state.orders.reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('stat-active-sales').textContent = `$${totalSales.toLocaleString('es-AR')}`;
}

// ========================
// VISTA: MESAS (POS)
// ========================
// VISTA: MESAS (POS)
// ========================
function renderTables() {
  renderTablesGrid();
  renderFloorPlan();
}

function renderTablesGrid() {
  const container = document.getElementById('tables-grid');
  if (!container) return;

  const filtered = state.selectedArea === 'all' 
    ? state.tables 
    : state.tables.filter(t => t.area === state.selectedArea);

  container.innerHTML = filtered.map(table => {
    const currentOrder = state.orders.find(o => o.id === table.currentOrderId);
    const orderTotal = currentOrder ? `$${currentOrder.total.toLocaleString('es-AR')}` : '-';

    return `
      <div class="table-card status-${table.status}" onclick="openTableModal(${table.id})">
        <div class="table-card-top">
          <span class="table-badge">${formatStatus(table.status)}</span>
          <span style="font-size: 0.8rem; color: #94a3b8;">${table.capacity} Personas</span>
        </div>
        <div class="table-number">${table.number}</div>
        <div class="table-details">${table.area}</div>
        <div class="table-bill-amount">
          <span>Cuenta:</span>
          <strong>${orderTotal}</strong>
        </div>
      </div>
    `;
  }).join('');
}

function renderFloorPlan() {
  const canvas = document.getElementById('floor-plan-canvas');
  if (!canvas) return;

  // Mapa de posiciones espaciales (x%, y%) por ID de mesa
  const floorPositions = {
    1: { left: '15%', top: '25%', shape: 'square', width: '90px', height: '90px' },
    2: { left: '32%', top: '25%', shape: 'circle', width: '80px', height: '80px' },
    3: { left: '50%', top: '22%', shape: 'rect', width: '130px', height: '85px' },
    4: { left: '72%', top: '25%', shape: 'square', width: '90px', height: '90px' },
    5: { left: '72%', top: '55%', shape: 'square', width: '90px', height: '90px' },
    6: { left: '50%', top: '60%', shape: 'circle', width: '80px', height: '80px' },
    7: { left: '15%', top: '65%', shape: 'bar', width: '100px', height: '65px' },
    8: { left: '30%', top: '65%', shape: 'bar', width: '100px', height: '65px' }
  };

  const statusColors = {
    'libre': { bg: 'rgba(42, 157, 143, 0.15)', border: 'var(--accent-green)', glow: 'rgba(42, 157, 143, 0.4)' },
    'ocupada': { bg: 'rgba(233, 196, 106, 0.18)', border: 'var(--accent-gold)', glow: 'rgba(233, 196, 106, 0.4)' },
    'cuenta_pedida': { bg: 'rgba(231, 111, 81, 0.22)', border: 'var(--accent-red)', glow: 'rgba(231, 111, 81, 0.5)' },
    'reservada': { bg: 'rgba(69, 123, 157, 0.18)', border: 'var(--accent-blue)', glow: 'rgba(69, 123, 157, 0.4)' }
  };

  const filtered = state.selectedArea === 'all'
    ? state.tables
    : state.tables.filter(t => t.area === state.selectedArea);

  canvas.innerHTML = filtered.map(table => {
    const pos = floorPositions[table.id] || { left: `${(table.id * 10) % 80 + 10}%`, top: '40%', shape: 'square', width: '90px', height: '90px' };
    const col = statusColors[table.status] || statusColors['libre'];
    const currentOrder = state.orders.find(o => o.id === table.currentOrderId);
    const orderTotal = currentOrder ? `$${(currentOrder.total).toLocaleString('es-AR')}` : '';
    const borderRadius = pos.shape === 'circle' ? '50%' : '14px';

    return `
      <div 
        class="floor-table-node" 
        onclick="openTableModal(${table.id})"
        title="Mesa ${table.number} (${table.area}) - ${table.status}"
        style="
          position: absolute;
          left: ${pos.left};
          top: ${pos.top};
          width: ${pos.width};
          height: ${pos.height};
          border-radius: ${borderRadius};
          background: ${col.bg};
          border: 2px solid ${col.border};
          box-shadow: 0 4px 16px ${col.glow};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          user-select: none;
          z-index: 5;
        "
        onmouseenter="this.style.transform='scale(1.08)'"
        onmouseleave="this.style.transform='scale(1)'"
      >
        <span style="font-weight: 700; font-size: 1rem; color: #fff;">${table.number}</span>
        <span style="font-size: 0.68rem; color: #94a3b8;">${table.capacity}p</span>
        ${orderTotal ? `<span style="font-size: 0.7rem; font-weight: 700; color: var(--accent-gold); margin-top: 2px;">${orderTotal}</span>` : ''}
      </div>
    `;
  }).join('');
}

function setupFloorPlanEvents() {
  const btnGrid = document.getElementById('btn-view-grid');
  const btnFloor = document.getElementById('btn-view-floor');
  const gridView = document.getElementById('tables-grid');
  const floorView = document.getElementById('floor-plan-view');

  if (btnGrid && btnFloor && gridView && floorView) {
    btnGrid.addEventListener('click', () => {
      btnGrid.classList.add('active');
      btnGrid.style.background = 'var(--primary)';
      btnGrid.style.color = '#12100e';
      btnGrid.style.fontWeight = '600';

      btnFloor.classList.remove('active');
      btnFloor.style.background = 'transparent';
      btnFloor.style.color = 'var(--text-muted)';
      btnFloor.style.fontWeight = '500';

      gridView.style.display = 'grid';
      floorView.style.display = 'none';
    });

    btnFloor.addEventListener('click', () => {
      btnFloor.classList.add('active');
      btnFloor.style.background = 'var(--primary)';
      btnFloor.style.color = '#12100e';
      btnFloor.style.fontWeight = '600';

      btnGrid.classList.remove('active');
      btnGrid.style.background = 'transparent';
      btnGrid.style.color = 'var(--text-muted)';
      btnGrid.style.fontWeight = '500';

      gridView.style.display = 'none';
      floorView.style.display = 'block';
      renderFloorPlan();
    });
  }
}

function formatStatus(status) {
  const map = {
    'libre': '🟢 Libre',
    'ocupada': '🟡 Ocupada',
    'cuenta_pedida': '🔴 Cuenta Pedida',
    'reservada': '🔵 Reservada'
  };
  return map[status] || status;
}

// ========================
// VISTA: COCINA KDS
// ========================
function renderKDS() {
  const listPendiente = document.getElementById('kds-list-pendiente');
  const listCocina = document.getElementById('kds-list-cocina');
  const listListo = document.getElementById('kds-list-listo');

  // Filtrado por estación: COCINA vs BARRA vs ALL
  const station = state.selectedStation || 'all';

  const filterOrderItems = (order) => {
    if (station === 'all') return order.items;
    return order.items.filter(item => {
      // Buscar en el menú local para conocer la categoría
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

  document.getElementById('count-pending').textContent = pendientes.length;
  document.getElementById('count-cooking').textContent = enCocina.length;
  document.getElementById('count-ready').textContent = listos.length;

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

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const diffMins = Math.floor((new Date() - new Date(isoString)) / 60000);
  if (diffMins < 1) return 'Hace instantes';
  return `Hace ${diffMins} min`;
}

async function updateOrderStatus(orderId, nextStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) {
      await fetchOrdersAndTables();
    }
  } catch (e) {
    console.error('Error actualizando comanda', e);
  }
}

// ========================
// VISTA: CARTA & TOMA DE COMANDA
// ========================
function renderMenu() {
  const container = document.getElementById('menu-grid');
  if (!container) return;

  const filtered = state.selectedCategory === 'all'
    ? state.menu
    : state.menu.filter(m => m.category.toLowerCase() === state.selectedCategory.toLowerCase());

  container.innerHTML = filtered.map(item => `
    <div class="menu-item-card" style="position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <h4 style="margin: 0;">${item.name}</h4>
        <div style="display: flex; gap: 6px;">
          <button title="Editar plato" onclick="openEditDishModal(${item.id})" style="background: none; border: none; cursor: pointer; font-size: 0.9rem;">✏️</button>
          <button title="Eliminar plato" onclick="deleteDish(${item.id})" style="background: none; border: none; cursor: pointer; font-size: 0.9rem;">🗑️</button>
        </div>
      </div>
      <p style="margin-top: 6px;">${item.description}</p>
      ${item.allergens && item.allergens.length ? `
        <div style="font-size: 0.72rem; color: #e9c46a; margin-bottom: 8px;">
          ⚠️ Alérgenos: ${item.allergens.join(', ')}
        </div>
      ` : ''}
      <div class="menu-item-footer">
        <span class="item-price">$${item.price.toLocaleString('es-AR')}</span>
        <button class="btn-add-item" onclick="addToTray(${item.id})">➕ Agregar</button>
      </div>
    </div>
  `).join('');
}

function addToTray(itemId) {
  const menuItem = state.menu.find(m => m.id === itemId);
  if (!menuItem) return;

  const existing = state.trayItems.find(i => i.menuItemId === itemId);
  if (existing) {
    existing.quantity++;
  } else {
    state.trayItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      notes: ""
    });
  }
  renderTray();
}

function changeTrayQty(itemId, delta) {
  const item = state.trayItems.find(i => i.menuItemId === itemId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.trayItems = state.trayItems.filter(i => i.menuItemId !== itemId);
  }
  renderTray();
}

function renderTray() {
  const container = document.getElementById('tray-items');
  if (!container) return;

  if (state.trayItems.length === 0) {
    container.innerHTML = `<div class="empty-tray">Selecciona ítems de la carta para agregarlos a la comanda</div>`;
    document.getElementById('tray-subtotal').textContent = '$0';
    document.getElementById('tray-service').textContent = '$0';
    document.getElementById('tray-total').textContent = '$0';
    return;
  }

  container.innerHTML = state.trayItems.map(item => `
    <div class="tray-row">
      <div>
        <strong>${item.name}</strong>
        <div style="color: #94a3b8; font-size: 0.78rem;">$${item.price.toLocaleString('es-AR')} c/u</div>
      </div>
      <div class="tray-row-actions">
        <button class="qty-btn" onclick="changeTrayQty(${item.menuItemId}, -1)">-</button>
        <span>${item.quantity}</span>
        <button class="qty-btn" onclick="changeTrayQty(${item.menuItemId}, 1)">+</button>
      </div>
    </div>
  `).join('');

  const subtotal = state.trayItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const service = Math.round(subtotal * 0.10);
  const total = subtotal + service;

  document.getElementById('tray-subtotal').textContent = `$${subtotal.toLocaleString('es-AR')}`;
  document.getElementById('tray-service').textContent = `$${service.toLocaleString('es-AR')}`;
  document.getElementById('tray-total').textContent = `$${total.toLocaleString('es-AR')}`;
}

function renderTableSelects() {
  const selectOrder = document.getElementById('select-target-table');
  const selectRes = document.getElementById('res-table');

  const options = state.tables.map(t => `<option value="${t.id}">Mesa ${t.number} (${t.area}) - ${t.status}</option>`).join('');
  if (selectOrder) selectOrder.innerHTML = options;
  if (selectRes) selectRes.innerHTML = `<option value="">Asignación Automática / Al Llegar</option>` + options;
}

// ========================
// (Cola offline y despacho idempotente gestionados en ./modules/offlineQueue.js)

function setupOrderTrayEvents() {
  const btnSend = document.getElementById('btn-send-to-kitchen');
  if (!btnSend) return;

  // Revisar cola al iniciar
  updateOfflineQueueIndicator();
  if (navigator.onLine) {
    flushOfflineOrdersQueue();
  }

  btnSend.addEventListener('click', async () => {
    if (state.trayItems.length === 0) {
      alert('Agrega al menos un plato a la comanda.');
      return;
    }

    const select = document.getElementById('select-target-table');
    const tableId = select.value;
    const table = state.tables.find(t => t.id === parseInt(tableId));
    const clientOrderId = generateClientOrderId();

    const orderPayload = {
      clientOrderId,
      tableId,
      tableNumber: table ? table.number : `M-${tableId}`,
      waiter: state.selectedRole || "Facundo M.",
      items: [...state.trayItems]
    };

    btnSend.disabled = true;
    btnSend.textContent = 'Enviando comanda...';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (res.ok) {
        state.trayItems = [];
        renderTray();
        await fetchAllData();
        // Cambiar a pestaña KDS
        const kdsTab = document.querySelector('[data-tab="tab-kds"]');
        if (kdsTab) kdsTab.click();
      } else {
        throw new Error(`Servidor devolvió status ${res.status}`);
      }
    } catch (e) {
      console.warn('⚠️ Falla de red o desconexión. Encolando comanda localmente...', e);
      const queue = getOfflineOrdersQueue();
      queue.push(orderPayload);
      saveOfflineOrdersQueue(queue);

      // Limpiar bandeja local y alertar al usuario
      state.trayItems = [];
      renderTray();
      alert(`⚠️ Sin conexión al servidor o red inestable.\n\nLa comanda para la Mesa ${orderPayload.tableNumber} fue guardada localmente con ID seguro:\n${clientOrderId}\n\nSe enviará automáticamente apenas vuelva la conexión.`);
      
      const kdsTab = document.querySelector('[data-tab="tab-kds"]');
      if (kdsTab) kdsTab.click();
    } finally {
      btnSend.disabled = false;
      btnSend.textContent = '🔥 Enviar Comanda a Cocina';
    }
  });
}

// ========================
// VISTA: RESERVAS
// ========================
function renderReservations() {
  const container = document.getElementById('reservations-list');
  if (!container) return;

  if (state.reservations.length === 0) {
    container.innerHTML = `<p style="color: #94a3b8;">No hay reservas registradas hoy.</p>`;
    return;
  }

  container.innerHTML = state.reservations.map(res => `
    <div class="res-item-card">
      <div>
        <strong>${res.customerName}</strong>
        <div style="font-size: 0.8rem; color: #94a3b8;">
          ⏰ ${res.time} hs | 👥 ${res.guests} comensales | 📞 ${res.phone}
        </div>
        ${res.notes ? `<div style="font-size: 0.78rem; color: #e9c46a; margin-top: 4px;">📝 ${res.notes}</div>` : ''}
      </div>
      <div>
        <span class="table-badge" style="background: rgba(69, 123, 157, 0.2); color: #457b9d;">
          ${res.tableId ? `Mesa M-0${res.tableId}` : 'Sin Mesa'}
        </span>
      </div>
    </div>
  `).join('');
}

function setupReservationForm() {
  const form = document.getElementById('form-new-reservation');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('res-name').value;
    const phone = document.getElementById('res-phone').value;
    const guests = document.getElementById('res-guests').value;
    const date = document.getElementById('res-date').value;
    const time = document.getElementById('res-time').value;
    const tableId = document.getElementById('res-table').value;
    const notes = document.getElementById('res-notes').value;

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, phone, guests, date, time, tableId, notes })
      });

      if (res.ok) {
        form.reset();
        await fetchReservations();
        await fetchTables();
        renderReservations();
        renderTables();
        alert('✅ Reserva registrada con éxito.');
      }
    } catch (e) {
      console.error('Error creando reserva', e);
    }
  });
}

// ========================
// VISTA: COPILOT IA
// ========================
function setupAIChat() {
  const btnSend = document.getElementById('btn-send-ai');
  const input = document.getElementById('ai-input');
  const chips = document.querySelectorAll('.quick-chip');

  const sendMessage = async (text) => {
    if (!text || !text.trim()) return;

    appendChatMessage('user', text);
    input.value = '';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const json = await res.json();
      if (json.success) {
        appendChatMessage('bot', json.data.message, json.data.title);
      }
    } catch (e) {
      appendChatMessage('bot', 'Hubo un error de conexión con el motor de IA.');
    }
  };

  btnSend.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(input.value);
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      sendMessage(prompt);
    });
  });
}

function appendChatMessage(sender, text, title = '') {
  const box = document.getElementById('ai-chat-box');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${sender}`;

  // Formato markdown simple a HTML
  const formattedText = text
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  msgDiv.innerHTML = `
    <div class="msg-avatar">${sender === 'bot' ? '🤖' : '👤'}</div>
    <div class="msg-content">
      ${title ? `<strong>${title}</strong>` : ''}
      <p>${formattedText}</p>
    </div>
  `;

  box.appendChild(msgDiv);
  box.scrollTop = box.scrollHeight;
}

// ========================
// MODAL DETALLE DE MESA
// ========================
window.openTableModal = function(tableId) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;

  const currentOrder = state.orders.find(o => o.id === table.currentOrderId);
  const modal = document.getElementById('modal-table-detail');
  const title = document.getElementById('modal-table-title');
  const body = document.getElementById('modal-table-body');
  const footer = document.getElementById('modal-table-footer');

  title.textContent = `Mesa ${table.number} (${table.area})`;

  let contentHtml = `
    <p><strong>Estado:</strong> ${formatStatus(table.status)}</p>
    <p><strong>Capacidad:</strong> ${table.capacity} comensales</p>
  `;

  if (currentOrder) {
    contentHtml += `
      <hr style="border: var(--glass-border); margin: 12px 0;">
      <h4>Comanda #${currentOrder.id} (${currentOrder.waiter})</h4>
      <ul style="list-style: none; margin: 10px 0;">
        ${currentOrder.items.map(i => `
          <li style="display:flex; justify-content:space-between; padding: 4px 0;">
            <span>${i.quantity}x ${i.name}</span>
            <span>${formatCurrency(i.price * i.quantity)}</span>
          </li>
        `).join('')}
      </ul>
      <div style="display:flex; justify-content:space-between; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.08); font-size: 1.05rem;">
        <strong>Total Comanda:</strong>
        <strong style="color: var(--accent-gold);">${formatCurrency(currentOrder.total)}</strong>
      </div>
      <div style="margin-top: 14px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px;">
        <label style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">Medio de Pago:</label>
        <div style="display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="payment-method-${currentOrder.id}" value="CASH" checked onchange="document.getElementById('split-payment-inputs-${currentOrder.id}').style.display='none'"> 💵 Efectivo
          </label>
          <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="payment-method-${currentOrder.id}" value="DIGITAL" onchange="document.getElementById('split-payment-inputs-${currentOrder.id}').style.display='none'"> 💳 Tarjeta / QR
          </label>
          <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="payment-method-${currentOrder.id}" value="SPLIT" onchange="document.getElementById('split-payment-inputs-${currentOrder.id}').style.display='block'"> ⚖️ Pago Mixto (Split)
          </label>
        </div>
        <div id="split-payment-inputs-${currentOrder.id}" style="display: none; margin-top: 10px; padding: 8px; background: rgba(224,169,109,0.08); border-radius: 6px;">
          <div style="display: flex; gap: 8px;">
            <div style="flex: 1;">
              <label style="font-size: 0.75rem; color: var(--text-muted);">Parte Efectivo ($):</label>
              <input type="number" id="split-cash-${currentOrder.id}" class="input-text" value="${Math.round(currentOrder.total / 2)}" min="0" max="${currentOrder.total}" oninput="document.getElementById('split-digital-${currentOrder.id}').value = Math.max(0, ${currentOrder.total} - Number(this.value))" />
            </div>
            <div style="flex: 1;">
              <label style="font-size: 0.75rem; color: var(--text-muted);">Parte Tarjeta / QR ($):</label>
              <input type="number" id="split-digital-${currentOrder.id}" class="input-text" value="${Math.round(currentOrder.total / 2)}" min="0" max="${currentOrder.total}" oninput="document.getElementById('split-cash-${currentOrder.id}').value = Math.max(0, ${currentOrder.total} - Number(this.value))" />
            </div>
          </div>
        </div>
      </div>
    `;

    footer.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" style="border-color: #ef4444; color: #ef4444;" onclick="voidCurrentOrder('${currentOrder.id}')">❌ Anular Comanda</button>
          <button class="btn btn-secondary" style="border-color: var(--primary); color: var(--primary);" onclick="applyDiscountToOrder('${currentOrder.id}')">🏷️ Descuento (%)</button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="closeTableModal()">Cerrar</button>
          <button class="btn btn-primary" onclick="settleBillWithFiscal('${currentOrder.id}')">🧾 Cobrar &amp; Facturar ARCA</button>
        </div>
      </div>
    `;
  } else {
    contentHtml += `<p style="margin-top: 14px; color: #94a3b8;">La mesa está libre y lista para recibir comensales.</p>`;
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="closeTableModal()">Cerrar</button>
      <button class="btn btn-primary" onclick="startNewOrderForTable(${table.id})">📋 Abrir Comanda</button>
    `;
  }

  body.innerHTML = contentHtml;
  modal.classList.add('open');
};

window.voidCurrentOrder = async function(orderId) {
  const currentRole = document.getElementById('select-session-role')?.value || 'WAITER';
  let pin = '';

  // Si no es OWNER ni MANAGER, solicitar PIN de supervisor
  if (currentRole !== 'OWNER' && currentRole !== 'MANAGER') {
    pin = prompt(`🔐 Acción Crítica (RBAC Nivel 3 requerido):\nTu rol actual es "${currentRole}". Para anular la comanda ingresa el PIN de Supervisor (Demo: 1234):`);
    if (!pin) return;
  }

  const reason = prompt('Motivo de la anulación (opcional):', 'Comensal canceló pedido');

  try {
    const res = await fetch(`/api/orders/${orderId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: currentRole, supervisorPin: pin, reason })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      alert(`✅ ${json.message}`);
      closeTableModal();
      await fetchAllData();
    } else {
      alert(json.message || 'Error al anular la comanda');
    }
  } catch (err) {
    alert('Error de conexión al anular comanda');
  }
};

window.applyDiscountToOrder = async function(orderId) {
  const currentRole = document.getElementById('select-session-role')?.value || 'WAITER';
  let pin = '';

  if (currentRole !== 'OWNER' && currentRole !== 'MANAGER') {
    pin = prompt(`🔐 Acción Crítica (RBAC Nivel 3 requerido):\nTu rol actual es "${currentRole}". Para aplicar un descuento ingresa el PIN de Supervisor (Demo: 1234):`);
    if (!pin) return;
  }

  const percentStr = prompt('Porcentaje de descuento (1 - 100):', '15');
  if (!percentStr) return;

  try {
    const res = await fetch(`/api/orders/${orderId}/discount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: currentRole,
        supervisorPin: pin,
        discountPercent: Number(percentStr)
      })
    });
    const json = await res.json();
    if (res.ok && json.success) {
      alert(`✅ ${json.message}`);
      await fetchAllData();
      const currentTable = state.tables.find(t => t.currentOrderId === orderId);
      if (currentTable) openTableModal(currentTable.id);
    } else {
      alert(json.message || 'Error al aplicar descuento');
    }
  } catch (err) {
    alert('Error de conexión al aplicar descuento');
  }
};

window.closeTableModal = function() {
  document.getElementById('modal-table-detail').classList.remove('open');
};

window.settleBillWithFiscal = async function(orderId) {
  const radio = document.querySelector(`input[name="payment-method-${orderId}"]:checked`);
  const paymentMethod = radio ? radio.value : 'CASH';

  let splitCashAmount = 0;
  let splitDigitalAmount = 0;

  if (paymentMethod === 'SPLIT') {
    splitCashAmount = Number(document.getElementById(`split-cash-${orderId}`)?.value || 0);
    splitDigitalAmount = Number(document.getElementById(`split-digital-${orderId}`)?.value || 0);
  }

  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'cobrado',
        paymentMethod,
        splitCashAmount,
        splitDigitalAmount
      })
    });
    const json = await res.json();
    closeTableModal();
    await fetchAllData();

    if (json.invoice) {
      showFiscalInvoiceModal(json.invoice, json.data, paymentMethod, splitCashAmount, splitDigitalAmount);
    }
  } catch (err) {
    alert('Error al procesar cobro');
  }
};

window.showFiscalInvoiceModal = function(invoice, order, paymentMethod, splitCash, splitDigital) {
  const modal = document.getElementById('modal-fiscal-invoice');
  if (!modal) return;

  const letterBadge = document.getElementById('invoice-letter-badge');
  const titleText = document.getElementById('invoice-title-text');
  const dateText = document.getElementById('invoice-date-text');
  const buyerText = document.getElementById('invoice-buyer-text');
  const tableText = document.getElementById('invoice-table-text');
  const payMethodText = document.getElementById('invoice-payment-method-text');
  const itemsContainer = document.getElementById('invoice-items-list');
  const netText = document.getElementById('invoice-net-text');
  const vatText = document.getElementById('invoice-vat-text');
  const totalText = document.getElementById('invoice-total-text');
  const caeText = document.getElementById('invoice-cae-text');
  const caeExpText = document.getElementById('invoice-cae-exp-text');

  const letter = invoice.invoiceType === 'FACTURA_A' ? 'A' : invoice.invoiceType === 'FACTURA_C' ? 'C' : 'B';
  if (letterBadge) letterBadge.textContent = letter;
  if (titleText) titleText.textContent = `${invoice.invoiceType.replace('_', ' ')} N° 0001-${String(invoice.invoiceNumber || 42).padStart(8, '0')}`;
  if (dateText) dateText.textContent = new Date(invoice.issuedAt || Date.now()).toLocaleString('es-AR');
  if (buyerText) buyerText.textContent = invoice.buyerCategory === 'RESPONSABLE_INSCRIPTO' ? `Resp. Inscripto (CUIT ${invoice.buyerCuit || '30-XXXXXXXX-X'})` : 'Consumidor Final';
  if (tableText) tableText.textContent = order ? `Mesa ${order.tableNumber || '-'}` : 'Salón';
  
  if (payMethodText) {
    if (paymentMethod === 'SPLIT') {
      payMethodText.textContent = `⚖️ Mixto ($${(splitCash || 0).toLocaleString('es-AR')} Efvo + $${(splitDigital || 0).toLocaleString('es-AR')} Digital)`;
    } else if (paymentMethod === 'DIGITAL') {
      payMethodText.textContent = '💳 Tarjeta / Transferencia QR';
    } else {
      payMethodText.textContent = '💵 Efectivo (Gaveta de Caja)';
    }
  }

  if (itemsContainer && order && order.items) {
    itemsContainer.innerHTML = order.items.map(item => `
      <div style="display: flex; justify-content: space-between; padding: 2px 0;">
        <span>${item.quantity}x ${item.name}</span>
        <span>$${(item.price * item.quantity).toLocaleString('es-AR')}</span>
      </div>
    `).join('');
  }

  const net = Number(invoice.netAmountCents) / 100;
  const vat = Number(invoice.vatAmountCents) / 100;
  const total = Number(invoice.totalAmountCents) / 100;

  if (netText) netText.textContent = `$${net.toLocaleString('es-AR')}`;
  if (vatText) vatText.textContent = `$${vat.toLocaleString('es-AR')}`;
  if (totalText) totalText.textContent = `$${total.toLocaleString('es-AR')}`;
  if (caeText) caeText.textContent = invoice.cae || '74391823901923';
  if (caeExpText) caeExpText.textContent = invoice.caeExpirationDate ? new Date(invoice.caeExpirationDate).toLocaleDateString('es-AR') : '10 Días';

  modal.classList.add('active');
};

window.startNewOrderForTable = function(tableId) {
  closeTableModal();
  document.querySelector('[data-tab="tab-menu"]').click();
  const select = document.getElementById('select-target-table');
  if (select) select.value = tableId;
};

function setupModalEvents() {
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeTableModal);
}

// ========================
// FILTROS Y NAVEGACIÓN
// ========================
function setupNavigation() {
  const buttons = document.querySelectorAll('.nav-item');
  const panes = document.querySelectorAll('.tab-pane');
  const viewTitle = document.getElementById('view-title');
  const viewDesc = document.getElementById('view-desc');

  const titlesMap = {
    'tab-pos': { title: 'Mapa de Salón y Mesas (POS)', desc: 'Supervisión en tiempo real de ocupación, comandas y cuentas.' },
    'tab-kds': { title: 'Kitchen Display System (KDS)', desc: 'Gestión y control de tiempos de preparación en cocina.' },
    'tab-menu': { title: 'Carta & Toma de Pedidos', desc: 'Catálogo de platos y armado dinámico de comandas.' },
    'tab-inventory': { title: 'Control de Stock, Lotes FEFO & Escáner', desc: 'Ingreso por código de barras, vencimientos y valorización de inventario.' },
    'tab-suppliers': { title: 'Directorio de Proveedores & Compras', desc: 'Homologación de distribuidores, CUIT fiscal y órdenes de abastecimiento.' },
    'tab-reservations': { title: 'Gestión de Reservas', desc: 'Planificación de comensales y turnos de sala.' },
    'tab-copilot': { title: 'Copilot IA Gastronómico', desc: 'Asesor de maridaje, alérgenos y sugerencias de optimización.' },
    'tab-analytics': { title: 'Métricas & Desempeño', desc: 'Facturación acumulada, platos estrella y tiempos medios.' },
    'tab-cash': { title: 'Control de Caja & Arqueos de Turno', desc: 'Apertura de gaveta, arqueo ciego, conciliación digital y egresos autorizados.' },
    'tab-printers': { title: 'Arquitectura de Impresión Universal', desc: 'Ruteo por estación, spooler outbox, emulador ESC/POS y tickets fiscales.' },
    'tab-kobe-engine': { title: 'KOBE Gastronomic Engine — Audit & Status', desc: 'Auditoría inmutable con hash chain SHA-256 e integridad transaccional.' }
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      const currentRole = document.getElementById('select-session-role')?.value || 'MANAGER';

      // Regla de Negocio: La pestaña de auditoría solo es accesible para Owner, Auditor y Manager
      if (tab === 'tab-kobe-engine') {
        const allowedRoles = ['OWNER', 'AUDITOR', 'MANAGER'];
        if (!allowedRoles.includes(currentRole)) {
          alert(`⛔ Acceso Denegado por RBAC: La pestaña de Auditoría Criptográfica exige rol Owner, Auditor o Manager. Tu rol actual es ${currentRole}.`);
          return;
        }
      }

      buttons.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(tab);
      if (targetPane) targetPane.classList.add('active');

      if (tab === 'tab-kobe-engine') {
        fetchKobeAudit();
      }

      if (titlesMap[tab]) {
        viewTitle.textContent = titlesMap[tab].title;
        viewDesc.textContent = titlesMap[tab].desc;
      }
    });
  });

  // Listener para el selector de roles de sesión
  const roleSelect = document.getElementById('select-session-role');
  const roleLabel = document.getElementById('current-user-role-label');
  if (roleSelect && roleLabel) {
    roleSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      const optionText = e.target.options[e.target.selectedIndex].text;
      roleLabel.textContent = optionText;
    });
  }

  const btnRefresh = document.getElementById('btn-refresh');
  if (btnRefresh) btnRefresh.addEventListener('click', () => fetchAllData());

  const btnQuickOrder = document.getElementById('btn-quick-order');
  if (btnQuickOrder) btnQuickOrder.addEventListener('click', () => {
    document.querySelector('[data-tab="tab-menu"]').click();
  });
}

function setupAreaFilters() {
  const pills = document.querySelectorAll('.area-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedArea = pill.getAttribute('data-area');
      renderTables();
    });
  });
}

function setupStationFilters() {
  const pills = document.querySelectorAll('.kds-station-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedStation = pill.getAttribute('data-station') || 'all';
      renderKDS();
    });
  });
}

function setupCategoryFilters() {
  const pills = document.querySelectorAll('.cat-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedCategory = pill.getAttribute('data-cat');
      renderMenu();
    });
  });
}

// ========================
// KOBE AUDIT TRAIL STREAM
// ========================
window.fetchKobeAudit = async function() {
  const container = document.getElementById('kobe-audit-stream');
  if (!container) return;

  try {
    const res = await fetch('/api/kobe/audit');
    const json = await res.json();

    if (!json.success || !json.ledger || json.ledger.length === 0) {
      container.innerHTML = `
        <div style="color: #94a3b8; font-style: italic;">
          🔒 El Ledger criptográfico está inicializado. Los eventos emitidos por órdenes y mozos aparecerán aquí en vivo con su hash SHA-256 encadenado.
        </div>
      `;
      return;
    }

    const isValid = json.integrity?.isValid !== false;
    const bannerHtml = `
      <div style="background: ${isValid ? 'rgba(72,169,124,0.15)' : 'rgba(239,68,68,0.15)'}; border: 1px solid ${isValid ? 'var(--accent-green)' : '#ef4444'}; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: ${isValid ? 'var(--accent-green)' : '#ef4444'};">
            ${isValid ? '✅ CADENA CRIPTOGRÁFICA VERIFICADA' : '❌ VIOLACIÓN DETECTADA'}
          </strong>
          <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 2px;">
            Inmutabilidad garantizada: ${json.count} bloques SHA-256 encadenados punto a punto.
          </span>
        </div>
        <span style="font-size: 0.8rem; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; color: var(--accent-gold);">
          ${json.count} Bloques
        </span>
      </div>
    `;

    const blocksHtml = json.ledger.map((entry, idx) => `
      <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding: 10px 0; font-family: 'Courier New', monospace; font-size: 0.82rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: #2a9d8f; font-weight: 700;">[Bloque #${idx + 1}] ${new Date(entry.createdAt).toLocaleTimeString('es-AR')}</span>
          <span style="background: rgba(224,169,109,0.15); color: var(--primary); padding: 1px 6px; border-radius: 4px; font-size: 0.72rem;">${entry.actorId}</span>
        </div>
        <div>
          <strong style="color: #e9c46a; font-size: 0.9rem;">${entry.action}</strong>
          <span style="color: #94a3b8;"> &bull; ${entry.entityType} ID: <code>${entry.entityId}</code></span>
        </div>
        <div style="color: #64748b; font-size: 0.72rem; margin-top: 4px; word-break: break-all;">
          <strong>Prev:</strong> ${entry.prevHash || 'ROOT_GENESIS_0000000000000000000000000000000000000000000000000000000000000000'}
        </div>
        <div style="color: #d4a373; font-size: 0.72rem; word-break: break-all; margin-top: 2px;">
          <strong>Hash:</strong> ${entry.hash}
        </div>
      </div>
    `).join('');

    container.innerHTML = bannerHtml + blocksHtml;
  } catch (err) {
    container.innerHTML = `<span style="color: #e76f51;">Error consultando Audit Ledger.</span>`;
  }
};

// ========================
// VISTA: STOCK & ESCÁNER DE LOTES
// ========================
function renderInventory() {
  const container = document.getElementById('inventory-table-container');
  if (!container) return;

  const lots = state.inventory || [];
  const lowStockCount = lots.filter(l => l.currentQuantity <= l.minStock).length;
  const totalValuation = lots.reduce((sum, l) => sum + (l.currentQuantity * (l.costPerUnit || 0)), 0);

  const statLow = document.getElementById('stat-low-stock');
  const statLots = document.getElementById('stat-total-lots');
  const statVal = document.getElementById('stat-stock-valuation');

  if (statLow) statLow.textContent = lowStockCount;
  if (statLots) statLots.textContent = lots.length;
  if (statVal) statVal.textContent = `$${Math.round(totalValuation).toLocaleString('es-AR')}`;

  if (lots.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 16px;">No hay lotes de insumos registrados aún.</p>`;
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border-color); color: var(--primary);">
          <th style="padding: 10px 8px;">Código / Lote</th>
          <th style="padding: 10px 8px;">Insumo</th>
          <th style="padding: 10px 8px;">Categoría</th>
          <th style="padding: 10px 8px;">Stock Disponible</th>
          <th style="padding: 10px 8px;">Vencimiento (FEFO)</th>
          <th style="padding: 10px 8px;">Proveedor</th>
          <th style="padding: 10px 8px; text-align: right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${lots.map(lot => {
          const isLow = lot.currentQuantity <= lot.minStock;
          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); ${isLow ? 'background: rgba(217,107,82,0.08);' : ''}">
              <td style="padding: 12px 8px;">
                <code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; color: var(--accent-gold);">${lot.lotCode}</code>
                <div style="font-size: 0.75rem; color: #94a3b8;">EAN: ${lot.barcode}</div>
              </td>
              <td style="padding: 12px 8px; font-weight: 600;">${lot.name}</td>
              <td style="padding: 12px 8px; color: var(--text-muted);">${lot.category}</td>
              <td style="padding: 12px 8px;">
                <strong style="color: ${isLow ? 'var(--accent-red)' : 'var(--accent-green)'};">
                  ${lot.currentQuantity.toLocaleString('es-AR')} ${lot.unit}
                </strong>
                ${isLow ? '<span style="font-size: 0.72rem; color: var(--accent-red); display: block;">⚠️ Bajo Mínimo</span>' : ''}
              </td>
              <td style="padding: 12px 8px; color: #e9c46a;">${lot.expiryDate}</td>
              <td style="padding: 12px 8px; color: var(--text-muted);">${lot.supplierName || '-'}</td>
              <td style="padding: 12px 8px; text-align: right; white-space: nowrap;">
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 4px;" title="Ver e Imprimir Rótulo de Frío" onclick="showBarcodeLabelModal('${lot.id}')">🏷️ Etiqueta</button>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="adjustStockPrompt('${lot.id}')">⚖️ Ajustar</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

window.showBarcodeLabelModal = function(lotId) {
  const lot = (state.inventory || []).find(l => l.id === lotId);
  if (!lot) return;

  const modal = document.getElementById('modal-barcode-label');
  if (!modal) return;

  const nameEl = document.getElementById('label-lot-name');
  const metaEl = document.getElementById('label-lot-meta');
  const digitsEl = document.getElementById('label-barcode-digits');
  const expiryEl = document.getElementById('label-expiry');
  const supplierEl = document.getElementById('label-supplier');
  const linesContainer = document.getElementById('barcode-lines-container');

  if (nameEl) nameEl.textContent = lot.name;
  if (metaEl) metaEl.textContent = `Lote: ${lot.lotCode} • ${lot.category}`;
  if (digitsEl) digitsEl.textContent = lot.barcode || '7791234567890';
  if (expiryEl) expiryEl.textContent = lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString('es-AR') : '-';
  if (supplierEl) supplierEl.textContent = lot.supplierName || 'Proveedor Homologado';

  // Generar barras alternadas realistas simulando EAN-13
  if (linesContainer) {
    const rawBarcode = lot.barcode || '7791234567890';
    let barsHtml = '';
    for (let i = 0; i < rawBarcode.length; i++) {
      const digit = parseInt(rawBarcode[i], 10) || 1;
      const w1 = (digit % 3) + 1;
      const w2 = ((digit + 1) % 3) + 1;
      barsHtml += `<div style="width: ${w1}px; height: 100%; background: #000;"></div>`;
      barsHtml += `<div style="width: ${w2}px; height: 100%; background: #fff;"></div>`;
      barsHtml += `<div style="width: 2px; height: 100%; background: #000;"></div>`;
      barsHtml += `<div style="width: 1px; height: 100%; background: #fff;"></div>`;
    }
    linesContainer.innerHTML = barsHtml;
  }

  modal.classList.add('active');
};

window.adjustStockPrompt = async function(lotId) {
  const deltaStr = prompt('Ingrese cantidad para sumar (+) o restar (-) al stock (en unidad del lote):');
  if (!deltaStr) return;
  const delta = Number(deltaStr);
  if (isNaN(delta)) return alert('Cantidad inválida');

  const reason = prompt('Motivo del ajuste (ej: "Merma de cocina", "Ajuste de inventario", "Uso Josper"):') || 'Ajuste manual';

  try {
    const res = await fetch(`/api/inventory/${lotId}/adjust`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, reason })
    });
    if (res.ok) {
      await fetchInventory();
      renderInventory();
    }
  } catch (err) {
    alert('Error al ajustar stock');
  }
};

// ========================
// ESCÁNER DE CÓDIGO DE BARRAS
// ========================
function setupInventoryEvents() {
  const btnScan = document.getElementById('btn-scan-barcode');
  const inputScan = document.getElementById('scanner-input');
  const btnSimulate = document.getElementById('btn-simulate-camera-scan');

  const performScan = async (code) => {
    if (!code) return;
    const banner = document.getElementById('scanner-result-banner');
    try {
      const res = await fetch(`/api/inventory/scan/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const item = json.data;
        if (banner) {
          banner.style.display = 'block';
          banner.innerHTML = `
            <strong>✅ Insumo Escaneado con Éxito:</strong> ${item.name} (${item.lotCode})<br>
            <span>Stock Actual: <strong>${item.currentQuantity} ${item.unit}</strong> | Vencimiento: ${item.expiryDate} | Proveedor: ${item.supplierName}</span>
          `;
        }
      } else {
        if (banner) {
          banner.style.display = 'block';
          banner.innerHTML = `<span style="color: var(--accent-red);">❌ Código ${code} no encontrado en base de datos.</span>`;
        }
      }
    } catch (e) {
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `<span style="color: var(--accent-red);">Error al consultar escáner.</span>`;
      }
    }
  };

  if (btnScan && inputScan) {
    btnScan.addEventListener('click', () => performScan(inputScan.value.trim()));
    inputScan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performScan(inputScan.value.trim());
    });
  }

  if (btnSimulate) {
    btnSimulate.addEventListener('click', () => {
      // Simular selección aleatoria de un lote existente
      const lots = state.inventory || [];
      if (lots.length > 0) {
        const sample = lots[Math.floor(Math.random() * lots.length)];
        if (inputScan) inputScan.value = sample.barcode;
        performScan(sample.barcode);
      } else {
        alert('No hay lotes registrados para simular');
      }
    });
  }

  // Modal Nuevo Lote
  const btnOpenLot = document.getElementById('btn-open-new-lot-modal');
  const modalLot = document.getElementById('modal-lot');
  const closeLot = document.getElementById('modal-lot-close');
  const cancelLot = document.getElementById('btn-cancel-lot');
  const formLot = document.getElementById('form-lot');

  if (btnOpenLot && modalLot) {
    btnOpenLot.addEventListener('click', () => {
      // Poblar select de proveedores
      const suppSelect = document.getElementById('lot-supplier-select');
      if (suppSelect) {
        suppSelect.innerHTML = (state.suppliers || []).map(s => `
          <option value="${s.id}">${s.name} (${s.category})</option>
        `).join('');
      }
      modalLot.classList.add('active');
    });
  }

  const closeLotModal = () => modalLot?.classList.remove('active');
  if (closeLot) closeLot.addEventListener('click', closeLotModal);
  if (cancelLot) cancelLot.addEventListener('click', closeLotModal);

  if (formLot) {
    formLot.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('lot-name').value,
        barcode: document.getElementById('lot-barcode').value,
        category: document.getElementById('lot-category').value,
        currentQuantity: Number(document.getElementById('lot-quantity').value),
        unit: document.getElementById('lot-unit').value,
        expiryDate: document.getElementById('lot-expiry').value,
        minStock: Number(document.getElementById('lot-min-stock').value),
        supplierId: document.getElementById('lot-supplier-select').value
      };

      try {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          formLot.reset();
          closeLotModal();
          await fetchInventory();
          renderInventory();
        }
      } catch (err) {
        alert('Error al registrar lote');
      }
    });
  }
}

// ========================
// VISTA: PROVEEDORES
// ========================
function renderSuppliers() {
  const container = document.getElementById('suppliers-grid');
  if (!container) return;

  const suppliers = state.suppliers || [];
  if (suppliers.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 16px;">No hay proveedores registrados aún.</p>`;
    return;
  }

  container.innerHTML = suppliers.map(s => `
    <div class="glass-box" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 3px solid var(--primary);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${s.name}</h4>
          <span style="color: #e9c46a; font-size: 0.85rem;">⭐ ${s.rating || '5.0'}</span>
        </div>
        <p style="color: var(--primary); font-size: 0.85rem; margin: 4px 0 10px 0;">${s.category}</p>
        
        <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
          <div><strong>CUIT:</strong> ${s.cuit}</div>
          <div><strong>Contacto:</strong> ${s.contact || 'No especificado'}</div>
          <div><strong>Teléfono:</strong> <a href="tel:${s.phone}" style="color: var(--text-main);">${s.phone}</a></div>
          <div><strong>Email:</strong> <a href="mailto:${s.email}" style="color: var(--text-main);">${s.email}</a></div>
          <div><strong>Días de Entrega:</strong> ${s.deliveryDays}</div>
        </div>
      </div>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.8rem; color: var(--accent-green);">● Homologado KOBE</span>
        <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="openCreatePOModal(${s.id})">📦 Emitir Orden de Compra</button>
      </div>
    </div>
  `).join('');
}

function renderPurchaseOrders() {
  const container = document.getElementById('purchase-orders-container');
  if (!container) return;

  const orders = state.purchaseOrders || [];
  if (orders.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; padding: 12px 0;">No se han emitido órdenes de compra aún.</p>`;
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border-color); color: var(--primary);">
          <th style="padding: 10px 8px;">N° Orden</th>
          <th style="padding: 10px 8px;">Proveedor</th>
          <th style="padding: 10px 8px;">CUIT</th>
          <th style="padding: 10px 8px;">Fecha Entrega</th>
          <th style="padding: 10px 8px;">Ítems Solicitados</th>
          <th style="padding: 10px 8px;">Total Est.</th>
          <th style="padding: 10px 8px;">Estado</th>
          <th style="padding: 10px 8px; text-align: right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(po => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 12px 8px;"><strong style="color: var(--accent-gold);">${po.id}</strong></td>
            <td style="padding: 12px 8px; font-weight: 600;">${po.supplierName}</td>
            <td style="padding: 12px 8px; color: var(--text-muted);">${po.supplierCuit}</td>
            <td style="padding: 12px 8px;">${po.deliveryDate}</td>
            <td style="padding: 12px 8px;">
              ${po.items.map(i => `<span style="display:block; font-size: 0.78rem;">• ${i.quantity} ${i.unit || 'g'} - ${i.name}</span>`).join('')}
            </td>
            <td style="padding: 12px 8px; font-weight: 700; color: var(--text-main);">$${(po.totalEstimated || 0).toLocaleString('es-AR')}</td>
            <td style="padding: 12px 8px;">
              <span class="table-badge" style="background: ${po.status === 'RECIBIDA' ? 'rgba(42, 157, 143, 0.2)' : 'rgba(233, 196, 106, 0.2)'}; color: ${po.status === 'RECIBIDA' ? 'var(--accent-green)' : 'var(--accent-gold)'};">
                ${po.status}
              </span>
            </td>
            <td style="padding: 12px 8px; text-align: right;">
              ${po.status !== 'RECIBIDA' ? `
                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 0.78rem;" onclick="receivePurchaseOrder('${po.id}')">📥 Recibir Mercadería</button>
              ` : `
                <span style="font-size: 0.75rem; color: var(--text-muted);">Recibido ${po.receivedAt ? formatTimeAgo(po.receivedAt) : ''}</span>
              `}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.openCreatePOModal = function(supplierId) {
  const supplier = (state.suppliers || []).find(s => s.id === supplierId);
  if (!supplier) return;

  const modal = document.getElementById('modal-po');
  document.getElementById('po-supplier-id').value = supplier.id;
  document.getElementById('po-supplier-name').textContent = supplier.name;
  document.getElementById('po-supplier-meta').textContent = `CUIT: ${supplier.cuit} | Rubro: ${supplier.category} | Días de Entrega: ${supplier.deliveryDays}`;
  
  // Set default delivery date (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('po-delivery-date').value = tomorrow.toISOString().split('T')[0];

  modal?.classList.add('active');
};

window.receivePurchaseOrder = async function(poId) {
  if (!confirm(`¿Confirmar recepción de mercadería para la Orden ${poId}?\nLos insumos ingresarán automáticamente a la cámara de frío con control FEFO.`)) return;

  try {
    const res = await fetch(`/api/purchase-orders/${poId}/receive`, { method: 'PUT' });
    const json = await res.json();
    if (res.ok) {
      alert(`✅ ${json.message}`);
      await Promise.all([fetchPurchaseOrders(), fetchInventory()]);
      renderPurchaseOrders();
      renderInventory();
    } else {
      alert(json.message || 'Error al recibir mercadería');
    }
  } catch (e) {
    alert('Error de conexión al recibir orden');
  }
};

function setupPurchaseOrderEvents() {
  const modal = document.getElementById('modal-po');
  const closeBtn = document.getElementById('modal-po-close');
  const cancelBtn = document.getElementById('btn-cancel-po');
  const form = document.getElementById('form-po');
  const btnAddRow = document.getElementById('btn-po-add-row');
  const rowsContainer = document.getElementById('po-items-rows');

  const closeModal = () => modal?.classList.remove('active');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (btnAddRow && rowsContainer) {
    btnAddRow.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'form-row';
      row.style.alignItems = 'center';
      row.style.marginTop = '6px';
      row.innerHTML = `
        <input type="text" class="input-text po-item-name" placeholder="Insumo adicional" style="flex: 2;" required />
        <input type="number" class="input-text po-item-qty" placeholder="Cant." style="flex: 1;" min="1" required />
        <select class="input-select po-item-unit" style="flex: 1;">
          <option value="g">Gramos (g)</option>
          <option value="unidades">Unidades</option>
          <option value="ml">Mililitros</option>
        </select>
        <input type="number" class="input-text po-item-cost" placeholder="$ Costo" style="flex: 1;" min="0" required />
        <button type="button" class="btn btn-secondary" style="padding: 4px 8px; color: #ef4444;" onclick="this.parentElement.remove()">✕</button>
      `;
      rowsContainer.appendChild(row);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const supplierId = document.getElementById('po-supplier-id').value;
      const deliveryDate = document.getElementById('po-delivery-date').value;
      const notes = document.getElementById('po-notes').value;

      const names = Array.from(document.querySelectorAll('.po-item-name'));
      const qtys = Array.from(document.querySelectorAll('.po-item-qty'));
      const units = Array.from(document.querySelectorAll('.po-item-unit'));
      const costs = Array.from(document.querySelectorAll('.po-item-cost'));

      const items = names.map((nameInput, idx) => ({
        name: nameInput.value.trim(),
        quantity: Number(qtys[idx]?.value || 1),
        unit: units[idx]?.value || 'g',
        unitCost: Number(costs[idx]?.value || 0)
      })).filter(i => i.name.length > 0);

      try {
        const res = await fetch('/api/purchase-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierId, deliveryDate, notes, items })
        });
        const json = await res.json();
        if (res.ok) {
          alert(`✅ Orden de Compra ${json.data.id} emitida con éxito para ${json.data.supplierName}`);
          closeModal();
          form.reset();
          await fetchPurchaseOrders();
          renderPurchaseOrders();
        } else {
          alert(json.message || 'Error al emitir orden de compra');
        }
      } catch (err) {
        alert('Error de conexión emitiendo orden de compra');
      }
    });
  }
}

function setupSupplierEvents() {
  const btnOpen = document.getElementById('btn-open-new-supplier-modal');
  const modal = document.getElementById('modal-supplier');
  const closeBtn = document.getElementById('modal-supplier-close');
  const cancelBtn = document.getElementById('btn-cancel-supplier');
  const form = document.getElementById('form-supplier');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.add('active'));
  }

  const closeModal = () => modal?.classList.remove('active');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('supp-name').value,
        cuit: document.getElementById('supp-cuit').value,
        category: document.getElementById('supp-category').value,
        contact: document.getElementById('supp-contact').value,
        phone: document.getElementById('supp-phone').value,
        email: document.getElementById('supp-email').value,
        deliveryDays: document.getElementById('supp-delivery').value
      };

      try {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          form.reset();
          closeModal();
          await fetchSuppliers();
          renderSuppliers();
        }
      } catch (err) {
        alert('Error al registrar proveedor');
      }
    });
  }
}

// ========================
// GESTIÓN DE CARTA (MODIFICACIONES DE MENÚ)
// ========================
function setupMenuManagementEvents() {
  const btnOpenDish = document.getElementById('btn-open-new-dish-modal');
  const modalDish = document.getElementById('modal-dish');
  const closeDish = document.getElementById('modal-dish-close');
  const cancelDish = document.getElementById('btn-cancel-dish');
  const formDish = document.getElementById('form-dish');
  const modalTitle = document.getElementById('modal-dish-title');

  if (btnOpenDish && modalDish) {
    btnOpenDish.addEventListener('click', () => {
      document.getElementById('dish-id').value = '';
      if (formDish) formDish.reset();
      if (modalTitle) modalTitle.textContent = 'Agregar Plato a la Carta';
      modalDish.classList.add('active');
    });
  }

  const closeDishModal = () => modalDish?.classList.remove('active');
  if (closeDish) closeDish.addEventListener('click', closeDishModal);
  if (cancelDish) cancelDish.addEventListener('click', closeDishModal);

  if (formDish) {
    formDish.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dishId = document.getElementById('dish-id').value;
      const payload = {
        name: document.getElementById('dish-name').value,
        category: document.getElementById('dish-category').value,
        price: Number(document.getElementById('dish-price').value),
        timeMinutes: Number(document.getElementById('dish-time').value),
        allergens: document.getElementById('dish-allergens').value,
        description: document.getElementById('dish-description').value
      };

      try {
        const url = dishId ? `/api/menu/${dishId}` : '/api/menu';
        const method = dishId ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          formDish.reset();
          closeDishModal();
          await fetchMenu();
          renderMenu();
        }
      } catch (err) {
        alert('Error al guardar plato');
      }
    });
  }
}

window.openEditDishModal = function(dishId) {
  const item = state.menu.find(m => m.id === dishId);
  if (!item) return;

  const modalDish = document.getElementById('modal-dish');
  const modalTitle = document.getElementById('modal-dish-title');

  document.getElementById('dish-id').value = item.id;
  document.getElementById('dish-name').value = item.name;
  document.getElementById('dish-category').value = item.category;
  document.getElementById('dish-price').value = item.price;
  document.getElementById('dish-time').value = item.timeMinutes || 15;
  document.getElementById('dish-allergens').value = Array.isArray(item.allergens) ? item.allergens.join(', ') : (item.allergens || '');
  document.getElementById('dish-description').value = item.description || '';

  if (modalTitle) modalTitle.textContent = `Editar Plato: ${item.name}`;
  if (modalDish) modalDish.classList.add('active');
};

window.deleteDish = async function(dishId) {
  const item = state.menu.find(m => m.id === dishId);
  if (!item) return;

  if (!confirm(`¿Estás seguro de eliminar "${item.name}" de la carta?`)) return;

  try {
    const res = await fetch(`/api/menu/${dishId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchMenu();
      renderMenu();
    }
  } catch (err) {
    alert('Error al eliminar plato');
  }
};

// ========================
// GESTIÓN DE CAJA & ARQUEOS DE TURNO
// ========================
function renderCashSession() {
  const session = state.cashSession?.activeSession;
  const statusCard = document.getElementById('cash-status-card');
  const statusText = document.getElementById('cash-session-status-text');
  const metaText = document.getElementById('cash-session-meta');
  const expectedAmount = document.getElementById('cash-expected-amount');
  const inflowOutflowSub = document.getElementById('cash-inflow-outflow-sub');
  const digitalAmount = document.getElementById('cash-digital-amount');
  const movementsContainer = document.getElementById('cash-movements-table-container');
  const historyContainer = document.getElementById('cash-history-table-container');

  // Modal close display values
  const closeExpectedDisplay = document.getElementById('close-cash-expected-display');
  const closeDigitalDisplay = document.getElementById('close-cash-digital-display');

  if (session && session.status === 'OPEN') {
    if (statusText) {
      statusText.textContent = `TURNO ABIERTO (#${session.id})`;
      statusText.style.color = '#2a9d8f';
    }
    if (metaText) {
      const openedDate = new Date(session.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      metaText.textContent = `Responsable: ${session.cashierName} | Inicio: ${openedDate} hs`;
    }
    if (expectedAmount) expectedAmount.textContent = `$${(session.expectedCash || 0).toLocaleString('es-AR')}`;
    if (inflowOutflowSub) {
      inflowOutflowSub.textContent = `Fondo: $${(session.initialFloat || 0).toLocaleString('es-AR')} | Cobros Efvo: +$${(session.cashInflow || 0).toLocaleString('es-AR')} | Egresos: -$${(session.cashOutflow || 0).toLocaleString('es-AR')}`;
    }
    if (digitalAmount) digitalAmount.textContent = `$${(session.digitalSales || 0).toLocaleString('es-AR')}`;
    if (closeExpectedDisplay) closeExpectedDisplay.textContent = `$${(session.expectedCash || 0).toLocaleString('es-AR')}`;
    if (closeDigitalDisplay) closeDigitalDisplay.textContent = `$${(session.digitalSales || 0).toLocaleString('es-AR')}`;

    // Render movimientos
    if (movementsContainer) {
      const movs = session.movements || [];
      if (movs.length === 0) {
        movementsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No se han registrado movimientos extraordinarios de gaveta en este turno.</p>';
      } else {
        movementsContainer.innerHTML = `
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th>ID</th>
                <th>Hora</th>
                <th>Operación</th>
                <th>Concepto / Motivo</th>
                <th style="text-align: right;">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${movs.map(m => `
                <tr>
                  <td><code>${m.id}</code></td>
                  <td>${new Date(m.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <span class="badge ${m.type === 'INGRESO' ? 'badge-confirmed' : 'badge-occupied'}" style="font-size: 0.75rem;">
                      ${m.type === 'INGRESO' ? '💰 INGRESO' : '💸 RETIRO'}
                    </span>
                  </td>
                  <td>${m.reason}</td>
                  <td style="text-align: right; font-weight: 600; color: ${m.type === 'INGRESO' ? '#2a9d8f' : '#ef4444'};">
                    ${m.type === 'INGRESO' ? '+' : '-'}$${(m.amount || 0).toLocaleString('es-AR')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  } else {
    // Sin sesión activa
    if (statusText) {
      statusText.textContent = 'SIN SESIÓN ABIERTA';
      statusText.style.color = '#ef4444';
    }
    if (metaText) metaText.textContent = 'Abre un turno con fondo inicial para habilitar cobros en gaveta y arqueo.';
    if (expectedAmount) expectedAmount.textContent = '$0';
    if (inflowOutflowSub) inflowOutflowSub.textContent = 'Fondo: $0 | Ingresos: $0 | Egresos: $0';
    if (digitalAmount) digitalAmount.textContent = '$0';
    if (closeExpectedDisplay) closeExpectedDisplay.textContent = '$0';
    if (closeDigitalDisplay) closeDigitalDisplay.textContent = '$0';

    if (movementsContainer) {
      movementsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">Abre un turno de caja para registrar y visualizar movimientos de gaveta en vivo.</p>';
    }
  }

  // Render Historial de Sesiones Pasadas
  if (historyContainer) {
    const closedSessions = (state.cashSession?.history || []).filter(s => s.status === 'CLOSED');
    if (closedSessions.length === 0) {
      historyContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 0;">No hay turnos cerrados registrados todavía.</p>';
    } else {
      historyContainer.innerHTML = `
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th>ID Turno</th>
              <th>Cajero</th>
              <th>Apertura</th>
              <th>Cierre</th>
              <th style="text-align: right;">Fondo Inicial</th>
              <th style="text-align: right;">Esperado</th>
              <th style="text-align: right;">Real Declarado</th>
              <th style="text-align: right;">Diferencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${closedSessions.map(s => {
              const diff = s.discrepancy || 0;
              const diffColor = diff === 0 ? '#2a9d8f' : diff > 0 ? '#457b9d' : '#ef4444';
              const diffText = diff === 0 ? 'Exacto' : `${diff > 0 ? '+' : ''}$${diff.toLocaleString('es-AR')}`;
              return `
                <tr>
                  <td><strong>${s.id}</strong></td>
                  <td>${s.cashierName}</td>
                  <td>${new Date(s.openedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td style="text-align: right;">$${(s.initialFloat || 0).toLocaleString('es-AR')}</td>
                  <td style="text-align: right;">$${(s.expectedCash || 0).toLocaleString('es-AR')}</td>
                  <td style="text-align: right;">$${(s.actualCash || 0).toLocaleString('es-AR')}</td>
                  <td style="text-align: right; font-weight: 600; color: ${diffColor};">${diffText}</td>
                  <td>
                    <span class="badge ${diff === 0 ? 'badge-confirmed' : 'badge-occupied'}" style="font-size: 0.72rem;">
                      ${s.authorizedByPin ? '🔐 APROBADO PIN' : '✅ SUPERVISADO'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  }
}

function setupCashSessionEvents() {
  // Modal Abrir Turno
  const btnOpenModal = document.getElementById('btn-open-cash-modal');
  const modalOpen = document.getElementById('modal-open-cash');
  const closeOpenBtn = document.getElementById('modal-open-cash-close');
  const cancelOpenBtn = document.getElementById('btn-cancel-open-cash');
  const formOpen = document.getElementById('form-open-cash');

  // Modal Movimiento Extraordinario
  const btnMovModal = document.getElementById('btn-cash-movement-modal');
  const modalMov = document.getElementById('modal-cash-movement');
  const closeMovBtn = document.getElementById('modal-cash-movement-close');
  const cancelMovBtn = document.getElementById('btn-cancel-cash-movement');
  const formMov = document.getElementById('form-cash-movement');

  // Modal Cierre de Caja
  const btnCloseModal = document.getElementById('btn-close-cash-modal');
  const modalClose = document.getElementById('modal-close-cash');
  const closeCloseBtn = document.getElementById('modal-close-cash-close');
  const cancelCloseBtn = document.getElementById('btn-cancel-close-cash');
  const formClose = document.getElementById('form-close-cash');
  const pinGroup = document.getElementById('close-cash-pin-group');

  // Apertura
  if (btnOpenModal && modalOpen) {
    btnOpenModal.addEventListener('click', () => {
      if (state.cashSession?.activeSession) {
        alert(`Ya hay un turno de caja abierto (#${state.cashSession.activeSession.id}). Debes cerrarlo antes de iniciar otro.`);
        return;
      }
      modalOpen.classList.add('active');
    });
  }
  const closeOpenModal = () => modalOpen?.classList.remove('active');
  if (closeOpenBtn) closeOpenBtn.addEventListener('click', closeOpenModal);
  if (cancelOpenBtn) cancelOpenBtn.addEventListener('click', closeOpenModal);

  if (formOpen) {
    formOpen.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cashierName = document.getElementById('open-cash-name').value;
      const initialFloat = Number(document.getElementById('open-cash-float').value) || 0;

      try {
        const res = await fetch('/api/cash/session/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cashierName, initialFloat })
        });
        const json = await res.json();
        if (res.ok) {
          alert(`✅ Turno ${json.data.id} iniciado correctamente con fondo de $${initialFloat.toLocaleString('es-AR')}`);
          formOpen.reset();
          closeOpenModal();
          await fetchCashSession();
          renderCashSession();
        } else {
          alert(json.message || 'Error al iniciar turno de caja');
        }
      } catch (err) {
        alert('Error de conexión al abrir turno de caja');
      }
    });
  }

  // Movimiento
  if (btnMovModal && modalMov) {
    btnMovModal.addEventListener('click', () => {
      if (!state.cashSession?.activeSession) {
        alert('No hay un turno de caja abierto para registrar movimientos.');
        return;
      }
      modalMov.classList.add('active');
    });
  }
  const closeMovModal = () => modalMov?.classList.remove('active');
  if (closeMovBtn) closeMovBtn.addEventListener('click', closeMovModal);
  if (cancelMovBtn) cancelMovBtn.addEventListener('click', closeMovModal);

  if (formMov) {
    formMov.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.getElementById('cash-mov-type').value;
      const amount = Number(document.getElementById('cash-mov-amount').value) || 0;
      const reason = document.getElementById('cash-mov-reason').value;

      try {
        const res = await fetch('/api/cash/session/movement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount, reason })
        });
        const json = await res.json();
        if (res.ok) {
          alert(`✅ Movimiento asentado: ${type === 'OUT' ? 'Retiro' : 'Ingreso'} de $${amount.toLocaleString('es-AR')}`);
          formMov.reset();
          closeMovModal();
          await fetchCashSession();
          renderCashSession();
        } else {
          alert(json.message || 'Error al registrar movimiento');
        }
      } catch (err) {
        alert('Error de conexión al registrar movimiento');
      }
    });
  }

  // Cierre de Caja
  if (btnCloseModal && modalClose) {
    btnCloseModal.addEventListener('click', () => {
      if (!state.cashSession?.activeSession) {
        alert('No hay ningún turno de caja abierto para cerrar.');
        return;
      }
      const currentRole = document.getElementById('select-session-role')?.value || 'MANAGER';
      // Si el rol es CASHIER u otro rol operativo que requiera elevación, mostrar grupo de PIN
      if (pinGroup) {
        if (['CASHIER', 'WAITER', 'COOK', 'CHEF'].includes(currentRole)) {
          pinGroup.style.display = 'block';
        } else {
          pinGroup.style.display = 'none';
        }
      }
      modalClose.classList.add('active');
    });
  }
  const closeCloseModal = () => modalClose?.classList.remove('active');
  if (closeCloseBtn) closeCloseBtn.addEventListener('click', closeCloseModal);
  if (cancelCloseBtn) cancelCloseBtn.addEventListener('click', closeCloseModal);

  if (formClose) {
    formClose.addEventListener('submit', async (e) => {
      e.preventDefault();
      const actualCash = Number(document.getElementById('close-cash-actual').value) || 0;
      const notes = document.getElementById('close-cash-notes').value;
      const supervisorPin = document.getElementById('close-cash-pin')?.value || '';
      const currentRole = document.getElementById('select-session-role')?.value || 'MANAGER';

      try {
        const res = await fetch('/api/cash/session/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualCash,
            notes,
            role: currentRole,
            supervisorPin
          })
        });
        const json = await res.json();
        if (res.ok) {
          const diff = json.data.discrepancy || 0;
          const diffMsg = diff === 0 ? 'Arqueo exacto sin diferencias.' : `Diferencia de arqueo: ${diff > 0 ? 'Sobrante +' : 'Faltante -'}$${Math.abs(diff).toLocaleString('es-AR')}`;
          alert(`✅ ${json.message}\n${diffMsg}`);
          formClose.reset();
          closeCloseModal();
          await fetchCashSession();
          renderCashSession();
        } else {
          alert(json.message || 'Error al cerrar caja');
        }
      } catch (err) {
        alert('Error de conexión al cerrar turno de caja');
      }
    });
  }
}

// ========================
// VISTA: ANALÍTICAS Y REPORTES
// ========================
function renderAnalytics() {
  const analytics = state.analytics || {};
  const totalSalesEl = document.getElementById('analytics-total-sales');
  const totalOrdersEl = document.getElementById('analytics-total-orders');
  const avgTicketEl = document.getElementById('analytics-avg-ticket');
  const occupancySubEl = document.getElementById('analytics-occupancy-sub');
  const topDishesList = document.getElementById('analytics-top-dishes-list');
  const chartEl = document.getElementById('analytics-history-chart');

  // Facturación acumulada
  const totalSales = analytics.totalActiveSales || state.orders.reduce((sum, o) => sum + (o.total || 0), 0);
  if (totalSalesEl) totalSalesEl.textContent = `$${totalSales.toLocaleString('es-AR')}`;

  // Comandas gestionadas
  const totalOrders = analytics.totalOrders !== undefined ? analytics.totalOrders : state.orders.length;
  if (totalOrdersEl) totalOrdersEl.textContent = `${totalOrders} comandas registradas`;

  // Ticket promedio
  const avgTicket = analytics.avgTicket || (totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0);
  if (avgTicketEl) avgTicketEl.textContent = `$${avgTicket.toLocaleString('es-AR')}`;

  // Ocupación
  const occupied = analytics.occupiedTables !== undefined ? analytics.occupiedTables : state.tables.filter(t => t.status === 'ocupada' || t.status === 'cuenta_pedida').length;
  const totalTables = analytics.totalTables || state.tables.length;
  if (occupancySubEl) occupancySubEl.textContent = `${occupied} de ${totalTables} mesas ocupadas (${totalTables > 0 ? Math.round((occupied / totalTables) * 100) : 0}% aforo)`;

  // Top platos más vendidos
  if (topDishesList) {
    const topDishes = analytics.topDishes || [];
    if (topDishes.length === 0) {
      topDishesList.innerHTML = `<li style="color: var(--text-muted); font-size: 0.85rem; padding: 6px 0;">No hay comandas procesadas aún.</li>`;
    } else {
      const maxCount = Math.max(...topDishes.map(d => d.count), 1);
      topDishesList.innerHTML = topDishes.map((dish, idx) => {
        const pct = Math.round((dish.count / maxCount) * 100);
        return `
          <li style="display: flex; flex-direction: column; gap: 4px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span><strong>#${idx + 1}</strong> ${dish.name}</span>
              <span style="color: var(--accent-gold); font-weight: 600;">${dish.count} servidas</span>
            </div>
            <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, var(--accent-gold), var(--primary)); width: ${pct}%; height: 100%;"></div>
            </div>
          </li>
        `;
      }).join('');
    }
  }

  // Gráfico de historial
  if (chartEl) {
    const history = analytics.salesHistory && analytics.salesHistory.length > 0 ? analytics.salesHistory : [
      { time: '12:00', amount: 34000 },
      { time: '13:00', amount: 68000 },
      { time: '14:00', amount: 89000 },
      { time: '15:00', amount: 45000 },
      { time: '20:00', amount: 92000 },
      { time: '21:00', amount: 125000 },
      { time: '22:00', amount: 110000 }
    ];

    const maxAmt = Math.max(...history.map(h => h.amount), 1);
    chartEl.innerHTML = `
      <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 180px; gap: 14px; padding: 20px 10px 10px 10px; width: 100%;">
        ${history.map(h => {
          const heightPct = Math.max(12, Math.round((h.amount / maxAmt) * 100));
          return `
            <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; gap: 6px;">
              <span style="font-size: 0.72rem; color: var(--accent-gold); font-weight: 600;">$${(h.amount / 1000).toFixed(0)}k</span>
              <div style="width: 100%; max-width: 44px; height: ${heightPct}%; background: linear-gradient(180deg, var(--primary) 0%, rgba(224,169,109,0.3) 100%); border-radius: 4px 4px 0 0; transition: height 0.4s ease;"></div>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${h.time}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// ========================
// VISTA: IMPRESIÓN UNIVERSAL & BOLETA MODERNA
// ========================
function renderPrinters() {
  const container = document.getElementById('printers-list-table-container');
  if (!container) return;

  const printers = state.printers || [];
  if (printers.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 12px;">Cargando catálogo de impresoras...</p>`;
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border-color); color: var(--primary);">
          <th style="padding: 10px 8px;">Nombre / Estación</th>
          <th style="padding: 10px 8px;">Tipo</th>
          <th style="padding: 10px 8px;">Transporte</th>
          <th style="padding: 10px 8px;">Dirección / Endpoint</th>
          <th style="padding: 10px 8px;">Papel / Charset</th>
          <th style="padding: 10px 8px;">Estado</th>
          <th style="padding: 10px 8px; text-align: right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${printers.map(p => `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
            <td style="padding: 10px 8px; font-weight: 600;">${p.name}</td>
            <td style="padding: 10px 8px;"><code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${p.kind}</code></td>
            <td style="padding: 10px 8px; color: var(--accent-gold); font-weight: 600;">${p.transport}</td>
            <td style="padding: 10px 8px; color: var(--text-muted);">${p.address}</td>
            <td style="padding: 10px 8px;">${p.paperWidthMm}mm · ${p.charset}</td>
            <td style="padding: 10px 8px;">
              <span class="table-badge" style="background: rgba(72,169,124,0.15); color: var(--accent-green);">
                ${p.status}
              </span>
            </td>
            <td style="padding: 10px 8px; text-align: right;">
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="testPrintPrinter('${p.id}')">🖨️ Test Print</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderReceiptOrderSelect() {
  const select = document.getElementById('select-receipt-order');
  if (!select) return;

  const orders = state.orders || [];
  if (orders.length === 0) {
    select.innerHTML = `<option value="">No hay comandas disponibles</option>`;
    return;
  }

  select.innerHTML = orders.map(o => `
    <option value="${o.id}">Comanda #${o.id} - Mesa ${o.tableNumber} ($${(o.total || 0).toLocaleString('es-AR')})</option>
  `).join('');
}

window.loadReceiptPreview = async function() {
  const select = document.getElementById('select-receipt-order');
  const container = document.getElementById('receipt-preview-container');
  if (!select || !container) return;

  const orderId = select.value;
  if (!orderId) {
    alert('Selecciona una comanda primero.');
    return;
  }

  try {
    container.innerHTML = `<span style="color: var(--accent-gold);">Generando boleta térmica moderna...</span>`;
    const res = await fetch(`/api/orders/${orderId}/receipt?format=html`);
    if (res.ok) {
      const html = await res.text();
      container.innerHTML = `
        <div style="background: #fff; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); overflow: hidden; max-width: 380px; width: 100%;">
          <iframe id="receipt-iframe" srcdoc="${html.replace(/"/g, '&quot;')}" style="width: 100%; height: 560px; border: none;"></iframe>
        </div>
      `;
    } else {
      container.innerHTML = `<span style="color: var(--accent-red);">Error al obtener boleta.</span>`;
    }
  } catch (e) {
    container.innerHTML = `<span style="color: var(--accent-red);">Error de conexión al generar boleta.</span>`;
  }
};

window.printReceiptBrowser = function() {
  const iframe = document.getElementById('receipt-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  } else {
    // Si no está cargado el iframe, cargarlo y luego imprimir
    const select = document.getElementById('select-receipt-order');
    if (select && select.value) {
      window.open(`/api/orders/${select.value}/receipt?format=html`, '_blank');
    } else {
      alert('Selecciona una comanda para imprimir.');
    }
  }
};

window.downloadEscPosBinary = function() {
  const select = document.getElementById('select-receipt-order');
  if (!select || !select.value) {
    alert('Selecciona una comanda primero.');
    return;
  }
  window.location.href = `/api/orders/${select.value}/receipt?format=raw`;
};

window.testPrintPrinter = async function(printerId) {
  const orders = state.orders || [];
  if (orders.length === 0) {
    alert('No hay comandas para emitir prueba de impresión.');
    return;
  }
  const sampleOrder = orders[0];
  try {
    const res = await fetch('/api/print/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docType: 'RECEIPT',
        orderId: sampleOrder.id,
        format: 'ESCPOS'
      })
    });
    const json = await res.json();
    if (res.ok) {
      alert(`✅ Trabajo de impresión enviado a spooler (${printerId}).\n${json.message}`);
    } else {
      alert(`Error al imprimir: ${json.message}`);
    }
  } catch (e) {
    alert('Error enviando trabajo a la cola de impresión.');
  }
};




