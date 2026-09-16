# FAWRUN — Pre-Sprint Checklist

**Date:** 2026-09-15
**Scope:** Audit-plan remediation for Sprint 2 gaps and Sprint 3 readiness
**Branch:** `feature/sprint-2-order-core`

## 1. Prisma Schema Compatibility

- [x] Order, Runner, Customer, OrderStore, OrderItem, LedgerEntry, Receipt, AuditLog, and Settlement models exist in `apps/api/prisma/schema.prisma`.
- [x] Enum values used by the state machines exist and match the transition tables.
- [x] `Order.idempotencyKey` exists for delivery idempotency.
- [x] `Order.preferredRunner` now declares `onDelete: SetNull`; the existing initial migration already contains the matching PostgreSQL `ON DELETE SET NULL` constraint.
- [ ] Outbox persistence is not present. `G-3` remains a documented deferred risk for this audit remediation; it is not required to unblock the current backend fixes.
- [x] `pnpm --filter fawrun-api exec prisma validate` → schema valid.
- [x] `pnpm --filter fawrun-api db:generate` → Prisma Client generated successfully.

## 2. Shared Types

- [x] Shared Zod contracts are used by backend controllers and services.
- [x] F-9 E.164 validation is centralized in `PhoneE164Schema` and applied to customer and runner auth contracts.
- [x] Ledger query/create contracts exist in `packages/shared-types/src/ledger.types.ts`.
- [ ] Runner action request/response contracts are still being wired with the runner endpoint implementation.
- [x] `pnpm --filter @fawrun/shared-types lint` → TypeScript check passed.

## 3. State Machine Conflict Check

- [x] Order transitions are defined in `order-transitions.ts` and covered by state-machine tests.
- [x] OrderStore transitions are defined and covered by state-machine tests.
- [x] Runner transitions are defined and covered by state-machine tests.
- [ ] Delivery idempotency helper exists but must be called by the delivery service method.
- [ ] Runner action endpoints and the final runner status updates are still being wired.
- [ ] No direct runner status mutation may remain after the domain fix lands.

## 4. Financial Operations Safety

- [x] `LedgerEntry` is append-only in the Prisma schema and the new Ledger service exposes create/list operations only.
- [x] `LedgerService.createMany()` uses one Prisma transaction for multi-entry creation.
- [x] `ROLLBACK_PLAN_runner-delivery-ledger.md` documents the delivery/Ledger operation, idempotency, append-only rollback rules, verification queries, and communication plan.
- [ ] Delivery must create exactly one `ORDER_FEE_TOTAL`, `RUNNER_SHARE`, and `PLATFORM_SHARE` entry per successful delivery.
- [ ] Delivery must be verified with a duplicate-request test and a transaction rollback test.

## 5. API Contract and Security

- [x] API routes use the global `/api/v1` prefix.
- [x] Existing HTTP endpoints use `ZodValidationPipe`, role guards, and verified-user guards.
- [x] WebSocket connection handling checks JWT, `user.status`, and `user.isDeleted`.
- [x] Refresh-token rotation revokes the presented token and issues a new token in one transaction.
- [x] Auth audit writes use the active transaction client.
- [ ] Runner endpoints must retain explicit role authorization, rate limits, and ownership checks after final wiring.

## 6. Verification Evidence

Completed in the continuation baseline:

- `git diff --check` → passed.
- `pnpm --filter fawrun-api exec prisma validate` → passed.
- `pnpm --filter fawrun-api db:generate` → passed.
- `pnpm --filter @fawrun/shared-types lint` → passed.
- `pnpm --filter @fawrun/shared-types build` → passed.
- `pnpm --filter fawrun-api test` → 7 files, 148 tests passed.

Continuation baseline failures to resolve before final approval:

- `pnpm --filter fawrun-api lint` → failed on six unused imports/types in `orders.service.ts`.
- `pnpm --filter fawrun-api exec tsc --noEmit -p tsconfig.json` → failed on missing shared runner-action exports and an invalid `RunnerController` reference in `runners.module.ts`.

## Blocking Findings Before Final Approval

1. Runner action endpoints and delivery/Ledger wiring must finish and pass focused tests.
2. All three direct runner status mutations must be replaced by `RunnerStateMachine.transition()` plus atomic persistence.
3. Delivery idempotency and duplicate LedgerEntry prevention must be tested.
4. `G-3` Outbox and `E-13` Damascus operational-date handling remain intentionally deferred and must be tracked for their target sprints.
