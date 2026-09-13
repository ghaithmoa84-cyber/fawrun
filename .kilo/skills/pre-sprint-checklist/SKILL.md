# Pre-Sprint Checklist Skill

## Purpose
Before each Sprint, Kilo verifies that the foundation is ready for development. This prevents wasted effort on incompatible schemas, outdated types, or State Machine conflicts.

## When to Run
- At the start of every new Sprint
- Before creating any new module or major feature
- When switching between major work areas (e.g., from Orders to Settlements)

## Checks Performed

### 1. Prisma Schema Compatibility
- [ ] All models referenced in the Sprint task exist in `prisma/schema.prisma`
- [ ] Enum values match the State Machine transitions defined in the spec
- [ ] No missing relations or incorrect foreign keys
- [ ] Migration can be generated without errors (`pnpm db:migrate dev --name check`)

### 2. Shared Types Updated
- [ ] All DTOs/Zod schemas for new endpoints exist in `packages/shared-types/src/`
- [ ] Types are exported and importable by both backend and frontends
- [ ] No `any` types in public APIs
- [ ] Zod schemas match Prisma model fields exactly

### 3. State Machine Conflict Check
- [ ] New transitions don't violate existing State Machine rules (spec sections 6.1, 6.2, 6.3)
- [ ] No duplicate or conflicting status values
- [ ] Idempotency keys defined for critical transitions (e.g., DELIVERED)
- [ ] AuditLog events defined for all new transitions

### 4. Financial Operations Safety (if applicable)
- [ ] LedgerEntry types cover all new financial events
- [ ] Settlement logic accounts for new fee types
- [ ] Rollback plan documented (see rollback-plan skill)

## Usage
Run this check by invoking the skill at Sprint start. Kilo will report pass/fail for each item and block work until all pass.

## Output
Creates/updates `PRE_SPRINT_CHECKLIST.md` with results for audit trail.