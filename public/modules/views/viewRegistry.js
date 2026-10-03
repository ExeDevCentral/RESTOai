// View Registry & Lifecycle Manager (mount, render, cleanup)

export class ViewRegistry {
  constructor() {
    this.views = new Map();
    this.activeTabId = null;
  }

  register(tabId, view) {
    this.views.set(tabId, view);
    return this;
  }

  getView(tabId) {
    return this.views.get(tabId) || null;
  }

  getActiveTabId() {
    return this.activeTabId;
  }

  activate(tabId, state) {
    if (this.activeTabId && this.activeTabId !== tabId) {
      const currentView = this.views.get(this.activeTabId);
      if (currentView && typeof currentView.cleanup === 'function') {
        try {
          currentView.cleanup();
        } catch (e) {
          console.warn(`[VIEW] Error during cleanup of ${this.activeTabId}:`, e);
        }
      }
    }

    this.activeTabId = tabId;
    const nextView = this.views.get(tabId);
    if (nextView) {
      if (typeof nextView.mount === 'function') {
        try {
          nextView.mount(state);
        } catch (e) {
          console.warn(`[VIEW] Error during mount of ${tabId}:`, e);
        }
      }
      if (typeof nextView.render === 'function') {
        try {
          nextView.render(state);
        } catch (e) {
          console.warn(`[VIEW] Error during render of ${tabId}:`, e);
        }
      }
    }
  }

  renderActive(state) {
    if (!this.activeTabId) return;
    const view = this.views.get(this.activeTabId);
    if (view && typeof view.render === 'function') {
      view.render(state);
    }
  }

  renderAll(state) {
    for (const view of this.views.values()) {
      if (view && typeof view.render === 'function') {
        try {
          view.render(state);
        } catch (e) {
          console.warn('[VIEW] Error in renderAll:', e);
        }
      }
    }
  }
}
