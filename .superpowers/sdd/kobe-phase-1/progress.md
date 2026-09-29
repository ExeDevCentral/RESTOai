# SDD ledger — plan: docs/plans/2026-09-29-kobe-phase-1-plan.md

## Pre-flight scan
- Task 1 produces: MenuItem, CatalogCategory, CatalogService
- Task 2 consumes Task 1, produces Order, OrderState, OrderStateMachine
- Task 3 consumes Task 2, produces KitchenTicket, KitchenStation, KitchenDispatcher
- Task 4 consumes Tasks 2-3 & AuditLedger, produces IdempotentOrderIngestor
Pre-flight: all interfaces coherent.

## Progress
