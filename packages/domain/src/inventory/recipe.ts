export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: 'G' | 'ML' | 'UNIT';
}

export interface RecipeConfig {
  id: string;
  menuItemId: string;
  name: string;
  ingredients: RecipeIngredient[];
}

export class Recipe {
  readonly id: string;
  readonly menuItemId: string;
  readonly name: string;
  readonly ingredients: RecipeIngredient[];

  constructor(config: RecipeConfig) {
    this.id = config.id;
    this.menuItemId = config.menuItemId;
    this.name = config.name;
    this.ingredients = config.ingredients;
  }

  calculateRequirements(portions: number): RecipeIngredient[] {
    if (portions <= 0) return [];
    return this.ingredients.map(ing => ({
      ingredientId: ing.ingredientId,
      unit: ing.unit,
      quantity: ing.quantity * portions
    }));
  }
}
