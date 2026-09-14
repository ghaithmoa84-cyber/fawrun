---
name: fawrun-domain-gate
description: "Enforces FAWRUN domain invariants for state transitions, financial operations, and data integrity"
---

# FAWRUN Domain Gate Skill

## Purpose

Apply a mandatory domain-integrity gate before and after changes that affect order or runner state, financial records, persistence, migrations, or business workflows. The backend remains the source of truth, and every state or financial change must be auditable, transactional, and safe against duplicate execution.

## When to Run

Run this skill:

- Before implementing or reviewing an order, runner, pricing, settlement, or ledger change
- Before merging a migration that changes status, financial, audit, or order-number behavior
- After any change to a state machine, service transaction, repository write, or domain event
- Whenever a task touches `Order`, `Runner`, `LedgerEntry`, `Settlement`, `AuditLog`, or fee calculation

## Gate Checks

### 1. State Machine Enforcement

- [ ] No code assigns a status field directly on a model or DTO
- [ ] Every transition uses the designated State Machine or transition service
- [ ] The requested transition is allowed from the current persisted state
- [ ] Invalid transitions return the standardized business-rule error
- [ ] Critical transitions, especially `DELIVERED`, are idempotent
- [ ] Every successful transition creates the required `AuditLog` entry
- [ ] State change, audit write, and related persistence use the correct transaction boundary
- [ ] Domain events are emitted only after the transaction succeeds, using the project event/outbox approach where required

### 2. Financial Operation Safety

- [ ] Every financial operation creates the required `LedgerEntry` records
- [ ] `LedgerEntry` is treated as append-only: no updates and no deletes
- [ ] Multi-step financial operations run in a database transaction
- [ ] Financial values use the project's decimal-safe representation
- [ ] Debits, credits, fees, runner shares, and platform shares reconcile
- [ ] Duplicate requests cannot create duplicate financial effects
- [ ] Negative balances and impossible settlement states are rejected
- [ ] A rollback plan exists before executing a financial migration or production operation

### 3. Data Integrity

- [ ] Production data uses soft deletion through `isDeleted`; no hard deletes
- [ ] `AuditLog` and `LedgerEntry` are never deleted
- [ ] `orderNumber` is generated from `seqNumber` inside a transaction after the order is saved
- [ ] Required relations, unique constraints, and indexes match the Prisma schema
- [ ] Migration changes preserve existing data and include a rollback path
- [ ] Frontend code does not calculate fees or decide business state

### 4. Verification Evidence

- [ ] Tests cover a valid transition and an invalid transition
- [ ] Tests cover duplicate execution of a critical transition
- [ ] Tests verify the expected `AuditLog` and `LedgerEntry` records
- [ ] Tests verify transaction rollback when a later step fails
- [ ] Relevant lint, typecheck, and test commands pass

## Required Commands

Run the commands that apply to the changed packages:

```bash
pnpm --filter fawrun-api lint
pnpm --filter fawrun-api typecheck
pnpm --filter fawrun-api test
pnpm --filter fawrun-api db:generate
pnpm lint
pnpm typecheck
```

If a command fails, record the failure and do not mark the gate as passed. Distinguish a new failure from a pre-existing repository failure.

## Output

Produce a concise gate report containing:

- Pass/fail status for each applicable check
- Files and symbols inspected
- State-machine and transaction evidence
- Test and validation results
- Blocking findings and the exact fix required

Do not approve a change with an unchecked financial operation, direct status mutation, missing audit trail, or absent idempotency control.

## Integration

- `@code-architect` runs this gate during design and pre-sprint validation
- `@feature-dev` applies the gate while implementing domain changes
- `@test-engineer` verifies the evidence before push or merge
- `rollback-plan` is mandatory when the change affects Ledger, Settlement, or order fees
