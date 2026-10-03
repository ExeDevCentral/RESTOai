import { describe, it, expect, vi } from 'vitest';
import { ViewRegistry } from './viewRegistry.js';

describe('ViewRegistry Lifecycle (mount, render, cleanup)', () => {
  it('registers and retrieves views by tab identifier', () => {
    const registry = new ViewRegistry();
    const dummyView = { render: vi.fn() };

    registry.register('tab-test', dummyView);
    expect(registry.getView('tab-test')).toBe(dummyView);
  });

  it('orchestrates mount, render, and cleanup when transitioning tabs', () => {
    const registry = new ViewRegistry();
    const mockState = { currentTab: 'tab-a', counter: 1 };

    const viewA = {
      mount: vi.fn(),
      render: vi.fn(),
      cleanup: vi.fn()
    };

    const viewB = {
      mount: vi.fn(),
      render: vi.fn(),
      cleanup: vi.fn()
    };

    registry.register('tab-a', viewA);
    registry.register('tab-b', viewB);

    // Activar vista A
    registry.activate('tab-a', mockState);
    expect(viewA.mount).toHaveBeenCalledWith(mockState);
    expect(viewA.render).toHaveBeenCalledWith(mockState);
    expect(viewA.cleanup).not.toHaveBeenCalled();

    // Transicionar a vista B
    registry.activate('tab-b', mockState);
    expect(viewA.cleanup).toHaveBeenCalledTimes(1);
    expect(viewB.mount).toHaveBeenCalledWith(mockState);
    expect(viewB.render).toHaveBeenCalledWith(mockState);
  });

  it('renders currently active view on state update', () => {
    const registry = new ViewRegistry();
    const mockState = { orders: [] };
    const view = { render: vi.fn() };

    registry.register('tab-active', view);
    registry.activate('tab-active', mockState);

    registry.renderActive(mockState);
    expect(view.render).toHaveBeenCalledTimes(2); // activate + renderActive
  });
});
