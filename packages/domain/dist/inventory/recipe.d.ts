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
export declare class Recipe {
    readonly id: string;
    readonly menuItemId: string;
    readonly name: string;
    readonly ingredients: RecipeIngredient[];
    constructor(config: RecipeConfig);
    calculateRequirements(portions: number): RecipeIngredient[];
}
//# sourceMappingURL=recipe.d.ts.map