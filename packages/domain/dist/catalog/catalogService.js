import { MenuItemSchema } from './menuItem.js';
export class CatalogService {
    static items = new Map();
    static createItem(data) {
        const parsed = MenuItemSchema.parse(data);
        this.items.set(parsed.id, parsed);
        return parsed;
    }
    static getItem(id) {
        return this.items.get(id);
    }
    static clearCatalog() {
        this.items.clear();
    }
}
//# sourceMappingURL=catalogService.js.map