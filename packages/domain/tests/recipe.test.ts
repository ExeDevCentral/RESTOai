import { describe, it, expect } from 'vitest';
import { Recipe } from '../src/inventory/recipe.js';

describe('Recipe & Dish Ingredients Invariants', () => {
  it('defines recipes with ingredients in base units and scales accurately by order quantity', () => {
    const bifeRecipe = new Recipe({
      id: 'rec-bife-chorizo',
      menuItemId: 'item-bife',
      name: 'Bife de Chorizo Madurado 400g',
      ingredients: [
        { ingredientId: 'ing-carne-madurada', quantity: 400, unit: 'G' },
        { ingredientId: 'ing-sal-marina', quantity: 5, unit: 'G' },
        { ingredientId: 'ing-aceite-oliva', quantity: 15, unit: 'ML' }
      ]
    });

    const scaledRequirements = bifeRecipe.calculateRequirements(3); // 3 porciones
    expect(scaledRequirements.find(r => r.ingredientId === 'ing-carne-madurada')?.quantity).toBe(1200);
    expect(scaledRequirements.find(r => r.ingredientId === 'ing-sal-marina')?.quantity).toBe(15);
    expect(scaledRequirements.find(r => r.ingredientId === 'ing-aceite-oliva')?.quantity).toBe(45);
  });
});
