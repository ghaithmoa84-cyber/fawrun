---
name: rollback-plan
description: "Require and document a rollback plan before any FAWRUN financial operation involving Ledger, Settlement, order fees, or financial state"
---

# Rollback Plan Skill

## Purpose
FAWRUN handles sensitive financial operations (Ledger, Settlement). Every task touching these must have a documented, tested rollback plan BEFORE execution.

## When Required
Mandatory for any task that:
- Creates/modifies LedgerEntry records
- Creates/modifies Settlement records
- Modifies Order fee calculations (Pricing Engine)
- Changes OrderStateMachine transitions affecting financial state
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
- How to detect if rollback needed (error conditions)
- Time estimate for rollback
- Data validation queries to run after rollback

### 4. Verification Queries
- Queries to confirm forward migration worked
- Queries to confirm rollback restored correct state
- Key metrics to compare (total fees, runner shares, platform shares)

### 5. Communication Plan
- Who to notify if rollback triggered
- Slack/channel for coordination
- Customer-facing impact (if any)

## Example: Settlement Close-Day Rollback

```markdown
## Operation: Close Settlement Day 2025-09-10

### Forward
1. Find all DELIVERED orders with operationalDate = '2025-09-10'
2. Group by runnerId
3. For each runner: create Settlement + SettlementItems + LedgerEntries
4. Mark Settlement as SETTLED

### Rollback (if Step 3 fails or data mismatch)
1. DELETE FROM SettlementItem WHERE settlementId IN (SELECT id FROM Settlement WHERE operationalDate = '2025-09-10')
2. DELETE FROM LedgerEntry WHERE description LIKE '%2025-09-10%' AND type IN ('RUNNER_SHARE', 'PLATFORM_SHARE')
3. DELETE FROM Settlement WHERE operationalDate = '2025-09-10'

### Verification
- Forward: COUNT(Settlement) = COUNT(DISTINCT runnerId with orders that day)
- Forward: SUM(LedgerEntry.amount) WHERE type='PLATFORM_SHARE' = 25% of total fees
- Rollback: COUNT(Settlement) WHERE operationalDate = '2025-09-10' = 0
```

## Enforcement
- Kilo will NOT execute financial tasks without a completed rollback plan
- Plan saved as `ROLLBACK_PLAN_<task-name>.md` in task directory
- Test-engineer must verify rollback works in test environment