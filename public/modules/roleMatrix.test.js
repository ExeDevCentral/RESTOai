import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ROLE_DEFINITIONS, applyRoleAccessControl } from './roleMatrix.js';

describe('Frontend RBAC & Role Matrix UI Access Control', () => {
  let navButtons = [];
  let elements = {};
  let bodyDataset = {};

  beforeEach(() => {
    const tabs = [
      'tab-pos', 'tab-kds', 'tab-menu', 'tab-inventory',
      'tab-suppliers', 'tab-reservations', 'tab-copilot',
      'tab-analytics', 'tab-cash', 'tab-printers', 'tab-kobe-engine'
    ];

    navButtons = tabs.map((tab, idx) => ({
      dataset: { tab },
      classList: {
        _classes: new Set(idx === 0 ? ['active'] : []),
        contains(c) { return this._classes.has(c); },
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); }
      },
      style: { display: 'flex' },
      click: vi.fn(function() {
        navButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      })
    }));

    elements = {
      'btn-quick-order': { style: { display: 'inline-flex' } },
      'btn-open-new-dish-modal': { style: { display: 'inline-block' } },
      'btn-open-cash-modal': { style: { display: 'inline-block' } },
      'btn-cash-movement-modal': { style: { display: 'inline-block' } },
      'btn-close-cash-modal': { style: { display: 'inline-block' } },
      'btn-open-new-lot-modal': { style: { display: 'inline-block' } },
      'btn-open-new-supplier-modal': { style: { display: 'inline-block' } }
    };

    bodyDataset = {};

    global.document = {
      querySelectorAll: vi.fn((selector) => {
        if (selector === '.nav-menu .nav-item') {
          return navButtons;
        }
        return [];
      }),
      getElementById: vi.fn((id) => elements[id] || null),
      body: { dataset: bodyDataset }
    };
  });

  afterEach(() => {
    delete global.document;
  });

  it('restricts COOK to only tab-kds and tab-inventory, hiding management tabs', () => {
    applyRoleAccessControl('COOK');

    const kdsBtn = navButtons.find(b => b.dataset.tab === 'tab-kds');
    const invBtn = navButtons.find(b => b.dataset.tab === 'tab-inventory');
    const cashBtn = navButtons.find(b => b.dataset.tab === 'tab-cash');
    const kobeBtn = navButtons.find(b => b.dataset.tab === 'tab-kobe-engine');

    expect(kdsBtn.style.display).toBe('flex');
    expect(invBtn.style.display).toBe('flex');
    expect(cashBtn.style.display).toBe('none');
    expect(kobeBtn.style.display).toBe('none');

    // Action buttons for COOK
    expect(elements['btn-quick-order'].style.display).toBe('none');
    expect(elements['btn-open-new-dish-modal'].style.display).toBe('none');
    expect(elements['btn-open-cash-modal'].style.display).toBe('none');
    expect(elements['btn-open-new-lot-modal'].style.display).toBe('inline-block');
  });

  it('restricts WAITER to pos, menu, reservations and copilot, hiding cash and engine', () => {
    applyRoleAccessControl('WAITER');

    const posBtn = navButtons.find(b => b.dataset.tab === 'tab-pos');
    const menuBtn = navButtons.find(b => b.dataset.tab === 'tab-menu');
    const cashBtn = navButtons.find(b => b.dataset.tab === 'tab-cash');
    const kobeBtn = navButtons.find(b => b.dataset.tab === 'tab-kobe-engine');

    expect(posBtn.style.display).toBe('flex');
    expect(menuBtn.style.display).toBe('flex');
    expect(cashBtn.style.display).toBe('none');
    expect(kobeBtn.style.display).toBe('none');

    // Action buttons for WAITER
    expect(elements['btn-quick-order'].style.display).toBe('inline-flex');
    expect(elements['btn-open-cash-modal'].style.display).toBe('none');
    expect(elements['btn-open-new-dish-modal'].style.display).toBe('none');
  });

  it('allows OWNER full visibility across all 11 tabs and all actions', () => {
    applyRoleAccessControl('OWNER');

    navButtons.forEach(btn => {
      expect(btn.style.display).toBe('flex');
    });

    expect(elements['btn-quick-order'].style.display).toBe('inline-flex');
    expect(elements['btn-open-new-dish-modal'].style.display).toBe('inline-block');
    expect(elements['btn-open-cash-modal'].style.display).toBe('inline-block');
    expect(elements['btn-open-new-lot-modal'].style.display).toBe('inline-block');
    expect(document.body.dataset.userRole).toBe('OWNER');
  });

  it('auto-redirects if current active tab is unauthorized for the new role', () => {
    // Current active is tab-pos (index 0)
    expect(navButtons[0].classList.contains('active')).toBe(true);

    // When COOK activates, tab-pos is unauthorized, so first allowed tab (tab-kds) is clicked
    applyRoleAccessControl('COOK');

    const kdsBtn = navButtons.find(b => b.dataset.tab === 'tab-kds');
    expect(kdsBtn.click).toHaveBeenCalledTimes(1);
    expect(kdsBtn.classList.contains('active')).toBe(true);
  });
});
