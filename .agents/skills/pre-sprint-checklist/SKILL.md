---
name: pre-sprint-checklist
description: "Verifies architecture, Prisma schema compatibility, shared types, State Machine rules, and financial safety before starting a Sprint or major module in FAWRUN."
---

# Pre-Sprint Checklist Skill — FAWRUN

## Purpose
Before each Sprint or new module, verify that the foundation is ready for development. This prevents wasted effort on incompatible schemas, outdated types, or State Machine conflicts.

## When to Run
- At the start of every new Sprint
- Before creating any new module or major feature
- When switching between major work areas (e.g., from Orders to Settlements)

## Checks Performed

### 1. Prisma Schema Compatibility
- [ ] All models referenced in the Sprint task exist in `prisma/schema.prisma`
- [ ] Enum values match the State Machine transitions defined in the spec
- [ ] No missing relations or incorrect foreign keys
- [ ] Migration can be generated without errors (`pnpm db:migrate dev --name check` or `pnpm db:generate`)

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

### 5. Code Quality Gates
- [ ] Full verification command succeeds:
  `pnpm build && pnpm typecheck && pnpm lint && pnpm --filter fawrun-api test`
- [ ] No `findUnique` without null handling (`findUniqueOrThrow` or explicit check)
- [ ] No `catch { void 0 }` — every catch logs via Logger
- [ ] Every status change uses `updateMany` with `where: { status: currentStatus }` and verifies `count === 1`
- [ ] No hardcoded values in fee calculations
- [ ] Every WebSocket room assignment relies on role from DB, not from JWT

## Output
Creates or updates `PRE_SPRINT_CHECKLIST.md` with results for the audit trail.
