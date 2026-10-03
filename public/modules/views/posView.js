// POS & Floor Plan View Module
import { formatCurrency } from '../money.js';


export function renderTablesGrid(state) {
  const container = document.getElementById('tables-grid');
  if (!container) return;

  const filtered = state.selectedArea === 'all' 
    ? state.tables 
    : state.tables.filter(t => t.area === state.selectedArea);

  container.innerHTML = filtered.map(table => {
    const currentOrder = state.orders.find(o => o.id === table.currentOrderId);
    const orderTotal = currentOrder ? formatCurrency(currentOrder.total) : '-';

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

export function renderFloorPlan(state) {
  const canvas = document.getElementById('floor-plan-canvas');
  if (!canvas) return;

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
    const orderTotal = currentOrder ? formatCurrency(currentOrder.total) : '';

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

export function formatStatus(status) {
  const map = {
    'libre': 'Libre',
    'ocupada': 'Ocupada',
    'cuenta_pedida': 'Cuenta Pedida',
    'reservada': 'Reservada'
  };
  return map[status] || status;
}

export function setupFloorPlanEvents() {
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
      if (window.renderFloorPlan) window.renderFloorPlan();
    });
  }
}

export const posView = {
  render(state) {
    renderTablesGrid(state);
    renderFloorPlan(state);
  },
  mount(state) {
    setupFloorPlanEvents();
  },
  cleanup() {}
};

