# SDD ledger — plan: docs/plans/2026-09-29-kobe-phase-4-plan.md

## Pre-flight scan
- Task 1 produces: Account, AccountType, ChartOfAccounts
- Task 2 consumes Task 1, produces JournalEntry, JournalLine, AccountingLedger
- Task 3 consumes Task 2 & Order/Payment/StockMovement, produces JournalAutomator
- Task 4 consumes Tasks 2-3 & AuditLedger, produces FiscalInvoice, FiscalEngine
Pre-flight: all interfaces coherent.

## Progress
