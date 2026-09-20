---
name: rollback-plan
description: "Mandatory for any task touching Ledger, Settlement, Order fee calculation, or financial state transitions in FAWRUN. Enforces documenting and verifying forward/rollback steps before execution."
---

# Rollback Plan Skill — FAWRUN

## Purpose
FAWRUN handles sensitive financial operations (Ledger, Settlement). Every task touching these must have a documented, tested rollback plan BEFORE execution.

## When Required
Mandatory for any task that:
- Creates/modifies `LedgerEntry` records
- Creates/modifies `Settlement` records
- Modifies Order fee calculations (`Pricing Engine`)
- Changes `OrderStateMachine` transitions affecting financial state
- Runs Settlement cron jobs or close-day operations

## Rollback Plan Template

Each plan must document:

### 1. Operation Description
- What financial change is being made
- Which tables/records affected
- Expected volume (e.g., "~50 orders/day")

### 2. Forward Migration Steps
- Exact SQL/Prisma operations to apply
- Order of operations (dependencies)
- Transaction boundaries

### 3. Rollback Steps (REQUIRED)
- Exact reverse operations
- How to detect if rollback is needed (error conditions)
- Time estimate for rollback
- Data validation queries to run after rollback

### 4. Verification Queries
- Queries to confirm forward migration worked
- Queries to confirm rollback restored correct state
- Key metrics to compare (total fees, runner shares, platform shares)

### 5. Communication Plan
- Who to notify if rollback is triggered
- Coordination channel
- Customer-facing impact (if any)

## Enforcement
- Financial tasks must NOT be executed without a completed rollback plan.
- Plan saved as `ROLLBACK_PLAN_<task-name>.md` in the task or docs directory.
- Test-engineer must verify rollback works in test/staging environment.
