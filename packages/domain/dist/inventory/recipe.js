export class Recipe {
    id;
    menuItemId;
    name;
    ingredients;
    constructor(config) {
        this.id = config.id;
        this.menuItemId = config.menuItemId;
        this.name = config.name;
        this.ingredients = config.ingredients;
    }
    calculateRequirements(portions) {
        if (portions <= 0)
            return [];
        return this.ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            unit: ing.unit,
            quantity: ing.quantity * portions
        }));
    }
}
//# sourceMappingURL=recipe.js.map