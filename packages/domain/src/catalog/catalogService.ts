import { MenuItem, MenuItemSchema } from './menuItem.js';

export class CatalogService {
  private static readonly items = new Map<string, MenuItem>();

  static createItem(data: unknown): MenuItem {
    const parsed = MenuItemSchema.parse(data);
    this.items.set(parsed.id, parsed);
    return parsed;
  }

  static getItem(id: string): MenuItem | undefined {
    return this.items.get(id);
  }

  static clearCatalog() {
    this.items.clear();
  }
}
