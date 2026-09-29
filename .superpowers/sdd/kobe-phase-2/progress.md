# SDD ledger — plan: docs/plans/2026-09-29-kobe-phase-2-plan.md

## Pre-flight scan
- Task 1 produces: UnitConverter, Ingredient
- Task 2 consumes Task 1, produces StockLot, StockMovement, InventoryLedger
- Task 3 consumes Tasks 1-2, produces Recipe, RecipeIngredient
- Task 4 consumes Tasks 1-3 & Order, produces FefoAllocator
Pre-flight: all interfaces coherent.

## Progress
- Task 1: complete (commits da1578a, tests: units.test.ts -> 3/3 pass)
- Task 2: complete (commits 3b33f68, tests: inventoryLedger.test.ts -> 2/2 pass)
- Task 3: complete (commits f676df5, tests: recipe.test.ts -> 1/1 pass)
- Task 4: complete (commits ccb9474, tests: fefoAllocator.test.ts -> 5/5 pass)

## Final review: self-review (no subagent tool)
- All 4 tasks of Phase 2 verified with TDD (30/30 total tests green in monorepo).
- FEFO strictly enforced: lot closest to expiration is always consumed first, with fractional split when necessary.
- Double-entry stock invariant: reservations reduce available balance without altering physical quantity; waste is properly tracked on cancelled cooked orders.
- UI palette updated: warm, human-centric organic bistro tones (deep espresso, warm amber, cream ivory, rounded smooth corners).
