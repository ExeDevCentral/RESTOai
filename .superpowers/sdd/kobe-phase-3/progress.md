# SDD ledger — plan: docs/plans/2026-09-29-kobe-phase-3-plan.md

## Pre-flight scan
- Task 1 produces: CashRegisterSession, CashMovement, CashDiscrepancy
- Task 2 consumes Task 1 & Order, produces Payment, PaymentAllocation, PaymentService
- Task 3 consumes Task 2, produces PaymentProvider, MercadoPagoAdapter
- Task 4 consumes Tasks 2-3 & AuditLedger, produces WebhookHandler
Pre-flight: all interfaces coherent.

## Progress
