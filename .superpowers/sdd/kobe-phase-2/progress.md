# SDD ledger — plan: docs/plans/2026-09-29-kobe-phase-2-plan.md

## Pre-flight scan
- Task 1 produces: UnitConverter, Ingredient
- Task 2 consumes Task 1, produces StockLot, StockMovement, InventoryLedger
- Task 3 consumes Tasks 1-2, produces Recipe, RecipeIngredient
- Task 4 consumes Tasks 1-3 & Order, produces FefoAllocator
Pre-flight: all interfaces coherent.

## Progress
