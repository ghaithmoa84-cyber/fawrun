# Sprint 2 Comprehensive Review Report

**Status:** Complete — All 7 Axes Audited  
**Date:** 2026-09-14  
**Scope:** FAWRUN Monorepo Backend (Sprint 2 Output)

---

## 1. Executive Summary

Sprint 2 delivered a **solid domain foundation** with correct Prisma schema, working Order State Machine, and all customer/admin endpoints for order lifecycle. However, **critical domain invariants are violated** in service implementation:

| Severity | Count | Category |
|----------|-------|----------|
| Critical | 3 | State Machine enforcement (Runner), Financial operations (Ledger), Idempotency |
| High | 3 | Transaction atomicity (assignRunner missing runner status), Missing AuditLog (register), Pricing fee updates non-atomic |
| Medium | 8 | Security gaps (logout, unvalidated params), Contract drift (receipts, duplicate types) |
| Low | 12 | Code quality (1233-line service, dead code, silent errors, duplication) |

**Blocking Sprint 3:** Runner State Machine, LedgerEntry creation, Idempotency keys, and `assignRunner` transaction completeness **must** pass `fawrun-domain-gate` before proceeding.

---

## 2. Axis 1: Data Model Audit

### Per-Model Findings

| Model | Schema ↔ Migration | Spec Alignment | Issues |
|-------|-------------------|----------------|--------|
| User | ✅ Match | ✅ | — |
| RefreshToken | ✅ Match | N/A | — |
| Customer | ✅ Match | ✅ 2.3 | — |
| CustomerAddress | ✅ Match | ✅ 2.3, 2.5 | — |
| Runner | ✅ Match | ⚠️ Spec 6.3 requires Runner SM | **No Runner SM implemented** |
| Admin | ✅ Match | ✅ | — |
| Order | ✅ Match | ⚠️ Spec 2.7 step 2d `assignedAt` | Not set in service |
| OrderItem | ✅ Match | ✅ 2.3 | — |
| OrderStore | ✅ Match | ✅ 2.2 | SM exists, no endpoints |
| Receipt | ✅ Match | ✅ 2.9 | Soft delete correct |
| Rating | ✅ Match | ✅ 2.9 | — |
| LedgerEntry | ✅ Match | ❌ Spec 2.9, 17 | **Zero creation code** |
| Settlement | ✅ Match | ✅ 2.9 | No endpoints/service |
| SettlementItem | ✅ Match | ✅ 2.9 | — |
| AuditLog | ✅ Match | ✅ 2.9 | Append-only correct |

### Discrepancy Table

| # | Component | Expected | Actual | Impact |
|---|-----------|----------|--------|--------|
| 1 | Runner SM | Section 6.3, 2.7 step 2e | Only `RunnerStatus` enum | Runner status mutated directly |
| 2 | OrderStore SM | Section 2.2 | Class exists, unused | `PURCHASED`/`SKIPPED` unreachable |
| 3 | `assignedAt` | Spec 2.7 step 2d | Not set in `assignRunner` | Missing audit trail timestamp |
| 4 | LedgerEntry | Spec 17, 2.9 | Model only, no writes | Financial ops not auditable |
| 5 | Idempotency | Spec 17 (DELIVERED) | None | Duplicate execution risk |

---

## 3. Axis 2: State Machine Audit

### Transition Trace Table

| Method | From → To | Actor | SM Used? | Status Written in TX? | AuditLog in TX? | Direct Mutation? |
|--------|-----------|-------|----------|----------------------|-----------------|------------------|
| `createOrder` | DRAFT → PENDING_REVIEW | CUSTOMER | ✅ | ✅ | ✅ (2×) | No |
| `cancelOrder` | * → CANCELLED | CUSTOMER | ✅ | ✅ | ✅ | No |
| `approveOrder` | UNDER_REVIEW → AWAITING_* | ADMIN | ✅ | ✅ | ✅ (1–3×) | No |
| `rejectOrder` | UNDER_REVIEW → CANCELLED | ADMIN | ✅ | ✅ | ✅ | No |
| `startOrderReview` | PENDING_REVIEW → UNDER_REVIEW | ADMIN | ✅ | ✅ | ✅ | No |
| `assignRunner` | AWAITING_* → ASSIGNED | ADMIN | ✅ | ✅ | ✅ | **Runner status NOT updated** |
| `cancelOrderAdmin` | * → CANCELLED | ADMIN | ✅ | ✅ | ✅ | No |

### Gaps Identified

1. **OrderStoreStateMachine** — Registered in `state-machine.module.ts`, exported, unit-tested, but **zero imports/injections** in any service. Transitions `PENDING → PURCHASED` and `PENDING → SKIPPED` are unreachable.

2. **Runner State Machine** — **Does not exist**. Spec section 6.3 and 2.7 step 2e require it. Runner status updated directly in `orders.service.ts`:
   - Line 422-425: `tx.runner.update({ data: { status: 'AVAILABLE' } })` in `cancelOrder`
   - Line 1148-1151: Same in `cancelOrderAdmin`
   - Line 1041: Only checks `runnerId` exists, **not** `status === 'AVAILABLE'` or `user.status === 'VERIFIED'`

3. **Spec vs Implementation Mismatches** (Sprint 2 Brief §2.1 table):
   - Missing transitions: `ASSIGNED → IN_PROGRESS`, `IN_PROGRESS → OUT_FOR_DELIVERY`, `OUT_FOR_DELIVERY → DELIVERED` (no runner endpoints)
   - `assignRunner` missing: `runner.status → ON_MISSION` (step 2e), `assignedAt` (step 2d), runner availability/verification check (step 2b)

---

## 4. Axis 3: Transaction Audit

### Per-Method Transaction Boundaries

| Method | DB Writes | AuditLog Writes | AuditLog IN TX? | WS OUTSIDE? | Partial-Failure Risk |
|--------|-----------|-----------------|-----------------|-------------|---------------------|
| `createOrder` | 4 types (order, orderNumber, orderStore×N, orderItem×N) | 2 | ✅ | ✅ | Low (ORDER_SUBMITTED from/to same status) |
| `cancelOrder` | 2 (order, runner conditional) | 1 | ✅ | ✅ | None |
| `approveOrder` | 1 (order + conditional fees) | 1–3 | ✅ | ✅ | None |
| `rejectOrder` | 1 (order) | 1 | ✅ | ✅ | None |
| `startOrderReview` | 1 (order) | 1 | ✅ | ✅ | None |
| `assignRunner` | 1 (order) | 1 | ✅ | ✅ | 🚩 **CRITICAL: runner.status NOT updated** |
| `cancelOrderAdmin` | 2 (order, runner conditional) | 1 | ✅ | ✅ | None |
| `updateProfile` (customers) | 1 (user) | 1 | ✅ | None | None |
| `updateAddress` (customers) | 1 (address upsert) | 1 | ✅ | None | None |
| `create` (runners) | 2 (user, runner) | 1 | ✅ | None | None |
| `update` (runners) | 2 (user, runner) | 1 | ✅ | None | None |
| `updateVisibility` (runners) | 1 (runner) | 1 | ✅ | None | None |
| `register` (auth) | 3 (user, customer, address) | **0** | ❌ | ✅ | 🚩 **HIGH: No AuditLog for account creation** |
| `verify` (users) | 1 (user updateMany) | 1 | ✅ | ✅ | None |
| `reject` (users) | 1 (user updateMany) | 1 | ✅ | None | None |
| `suspend` (users) | 2 (user, refreshTokens) | 1 | ✅ | None | ⚠️ No WS to terminate connection |
| `recalculateFee` (pricing) | 1–2 (order, audit conditional) | 0–1 | ⚠️ **Conditional** | None | 🚩 **HIGH: Non-atomic when called without tx; no LedgerEntry** |

### Critical Findings

| ID | Issue | File:Line | Domain Gate Check |
|----|-------|-----------|-------------------|
| C1 | `assignRunner` doesn't set `runner.status = 'ON_MISSION'` | orders.service.ts:1026-1079 | **FAIL** — State change without related persistence |
| C2 | `register` has zero AuditLog entries | auth.service.ts:40-68 | **FAIL** — No audit trail for state change |
| C3 | `recalculateFee` non-atomic, no LedgerEntry | pricing.service.ts:80-169 | **FAIL** — Financial op without ledger |

---

## 5. Axis 4: Security Audit

### Per-Endpoint Guard Coverage

| Controller | Endpoint | @Public | @Roles | VerifiedUserGuard | ZodValidationPipe | Throttle | Gap |
|------------|----------|---------|--------|-------------------|-------------------|----------|-----|
| Auth | register | ✅ | — | — | ✅ | register | — |
| Auth | login | ✅ | — | — | ✅ | login | — |
| Auth | refresh | ✅ | — | — | ✅ | — | — |
| Auth | logout | ❌ | — | — | ✅ | — | **Missing @Public** |
| Orders (cust) | create | — | CUSTOMER | Class | ✅ | — | — |
| Orders (cust) | list | — | CUSTOMER | Class | — | — | — |
| Orders (cust) | details | — | CUSTOMER | Class | ✅ (IdParam) | — | — |
| Orders (cust) | cancel | — | CUSTOMER | Class | ✅ (IdParam) | — | — |
| Orders (admin) | list | — | ADMIN | Class | — | — | — |
| Orders (admin) | details | — | ADMIN | Class | ✅ (IdParam) | — | — |
| Orders (admin) | audit | — | ADMIN | Class | ✅ (IdParam) | — | — |
| Orders (admin) | approve | — | ADMIN | Class | ✅ (IdParam, Body) | — | — |
| Orders (admin) | reject | — | ADMIN | Class | ✅ (IdParam, Body) | — | — |
| Orders (admin) | start-review | — | ADMIN | Class | ✅ (IdParam, Body) | — | — |
| Orders (admin) | assign-runner | — | ADMIN | Class | Local (weak) | — | No .trim() |
| Orders (admin) | cancel | — | ADMIN | Class | Local | — | Not shared |
| Customers | me | — | CUSTOMER (class) | Class | — | — | — |
| Customers | me (PUT) | — | CUSTOMER (class) | Class | ✅ | — | — |
| Customers | address | — | CUSTOMER (class) | Class | — | — | — |
| Customers | address (PUT) | — | CUSTOMER (class) | Class | ✅ | — | — |
| Customers | runners | — | CUSTOMER (class) | Class | — | — | — |
| Users | list | — | ADMIN (class) | Class | ❌ (raw @Param/@Query) | — | **No Zod on params** |
| Users | details | — | ADMIN (class) | Class | ❌ (raw @Param) | — | **No Zod on params** |
| Users | verify | — | ADMIN (class) | Class | ❌ (raw @Param) | — | **No Zod on params** |
| Users | reject | — | ADMIN (class) | Class | ❌ (raw @Param) | — | **No Zod on params** |
| Users | suspend | — | ADMIN (class) | Class | ❌ (raw @Param) | — | **No Zod on params** |
| Runners | list | — | ADMIN (class) | Class | — | — | — |
| Runners | create | — | ADMIN (class) | Class | ✅ | — | — |
| Runners | update | — | ADMIN (class) | Class | ❌ (raw @Param) | — | **No Zod on params** |
| Runners | visibility | — | ADMIN (class) | Class | ❌ (raw @Param) | — | **No Zod on params** |

### Security Gaps

| ID | Severity | Location | Issue |
|----|----------|----------|-------|
| 1.1 | Medium | auth.controller.ts:38 | `logout` missing `@Public()` — expired access token users cannot revoke refresh token |
| 1.2 | Low | auth/dto/logout.dto.ts | `LogoutSchema` not in shared-types (Types First violation) |
| 1.3 | Low | auth.controller.ts:38 | `logout` missing `@Throttle` override |
| 1.4 | Low | orders.controller.ts:38 | `AssignRunnerSchema` duplicated; local version lacks `.trim()` |
| 1.5 | Low | orders.controller.ts:42 | `CancelOrderSchema` not in shared-types |
| 1.6 | Medium | users.controller.ts:30,36,44,52 | Raw `@Param('id')` without ZodValidationPipe (4 endpoints) |
| 1.7 | Low | users.controller.ts:11 | Redundant `JwtAuthGuard` in `@UseGuards()` (already global) |
| 1.8 | Medium | runners.controller.ts:53,68 | Raw `@Param('id')` without ZodValidationPipe (2 endpoints) |
| 1.9 | Low | runners.controller.ts:20 | Redundant `JwtAuthGuard` in `@UseGuards()` (already global) |

**Ownership/Object-Level Access:** ✅ All customer endpoints correctly resolve `customerId` from JWT before querying. No gaps found.

---

## 6. Axis 5: Layer Contract Audit

### DTO vs Service Return Mismatches

| ID | Severity | Location | Issue |
|----|----------|----------|-------|
| 2.1 | Low | orders.service.ts:34 | `CreateOrderResult` duplicates `CreateOrderResponse` — should use shared type |
| 2.2 | Low | orders.service.ts:231 | Inline `meta` type instead of shared `PaginatedResponse<T>` |
| 2.3 | Low | orders.service.ts:379 | `runner.status` (string) not narrowed to `RUNNER_STATUS_VALUES` enum |
| 2.4 | Medium | orders.service.ts:625-645 | Service returns `receipts` on order stores; `CustomerOrderStore` type omits it |
| 2.5 | Low | orders.service.ts | `{order: {id, orderNumber, status}}` shape duplicated as inline types 3× |
| 2.6 | Medium | orders.service.ts:9 | `import { CreateOrderRequest }` should be `import type` (`isolatedModules: true`) |
| 2.7 | Low | runner.types.ts, settlement.types.ts | 7 DTOs unused: `PurchaseResponse`, `CloseSettlementSchema`, `CloseSettlementRequest`, `RunnerStatusUpdateSchema`, `RunnerStatusUpdate`, shared `AssignRunnerSchema`, `AssignRunnerRequest` |
| 2.8 | Low | runner.types.ts:46,53 | `ApproveOrderSchema` and `AssignRunnerSchema` misplaced in runner.types.ts |
| 2.9 | Low | auth/runners/users services | Missing explicit return type annotations; `LoginResponse` type exists but unused |

---

## 7. Axis 6: Known Gaps Catalog

| # | Gap | Spec Reference | Sprint 3 Impact |
|---|-----|----------------|-----------------|
| 1 | **LedgerEntry creation** | 17, 2.9 | **Blocking** — Financial ops require ledger |
| 2 | **Outbox pattern** | 17 (domain events) | **Blocking** — Notifications fire-and-forget, no durability |
| 3 | **Idempotency keys** | 17 (DELIVERED) | **Blocking** — Duplicate execution risk |
| 4 | **Runner State Machine** | 6.3, 2.7 step 2e | **Blocking** — Runner status mutated directly |
| 5 | **Runner action endpoints** | 2.1 table | **Blocking** — No IN_PROGRESS/OUT_FOR_DELIVERY/DELIVERED |
| 6 | **Store purchase/skip endpoints** | 2.2 | **Blocking** — OrderStore SM exists but unwired |
| 7 | **Receipt upload endpoint** | 2.9 | High — Runner cannot upload receipts |
| 8 | **Rating endpoints** | 2.9 | Medium — Customer cannot rate |
| 9 | **Settlement endpoints/service** | 2.9 | High — Daily closure not implemented |
| 10 | **assignedAt timestamp** | 2.7 step 2d | Low — Missing on runner assignment |

---

## 8. Axis 7: Code Quality Report

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| 1233-line monolithic service | orders.service.ts | High | Split: CreateOrderService, CustomerOrderService, AdminOrderService, OrderAuditService, OrderNotificationService |
| `mapOrderItem()` duplicated | lines 340-350, 624-635 | Medium | Use existing private method at line 1210 (currently unused in getOrderDetails) |
| Unused imports | order-transitions.ts:84-85 | Low | Remove redundant `ORDER_STATUSES` re-export |
| Dead `OrderStoreStateMachine` | Injected nowhere | Medium | Wire endpoints or remove |
| Dead `recalculateFee()` | pricing.service.ts | Medium | Never called — wire to store PURCHASED events or remove |
| 7× repeated `$transaction` pattern | orders.service.ts | Medium | Extract `withTransaction()` helper |
| 7× `catch { void 0; }` | orders.service.ts | High | Replace with `logger.error()` + outbox |
| Unused shared DTOs | runner.types.ts, settlement.types.ts | Low | Remove or wire endpoints |

---

## 9. Recommendations (Priority-Ordered)

### P0 — Must Fix Before Sprint 3 (Domain Gate Blocking)

1. **Implement `RunnerStateMachine`** with transitions `AVAILABLE ↔ ON_MISSION ↔ UNAVAILABLE` + AuditLog integration
2. **Wire `assignRunner` transaction**: add `runner.status = 'ON_MISSION'` and `assignedAt = now()` inside the transaction
3. **Add LedgerEntry creation** on: order approval, fee updates, DELIVERED transition, settlement closure
4. **Add idempotency keys** to DELIVERED transition and all financial operations
5. **Build runner action endpoints**: `POST /runner/orders/:id/start` (→ IN_PROGRESS), `POST /runner/orders/:id/deliver` (→ OUT_FOR_DELIVERY), `POST /runner/orders/:id/complete` (→ DELIVERED with idempotency key)
6. **Build store purchase/skip endpoints**: `POST /runner/orders/:id/stores/:storeId/purchase`, `POST /runner/orders/:id/stores/:storeId/skip`

### P1 — High Priority

7. **Add `AuditLog` to `auth/register`** transaction
8. **Make `recalculateFee` transactional** with LedgerEntry; remove optional `tx` param ambiguity
9. **Add receipt upload endpoint**: `POST /runner/orders/:id/stores/:storeId/receipts`
10. **Fix security gaps**: `@Public()` on logout, ZodValidationPipe on all `@Param`/`@Query`, remove redundant guards
11. **Fix contract drift**: Add `receipts` to `CustomerOrderStore`, use shared types consistently

### P2 — Code Quality

12. Split `orders.service.ts` into domain services
13. Extract `withTransaction()` helper
14. Replace `catch { void 0; }` with proper logging + outbox
15. Remove dead code (unused DTOs, unused `recalculateFee` or wire it)
16. Use shared `mapOrderItem()` method consistently

---

## 10. Open Questions

1. **Runner SM scope:** Should `RunnerStateMachine` live in `state-machine/` module or `runners` module?
2. **Outbox implementation:** Use Prisma-backed outbox table + background worker, or integrate with existing `NotificationsService`?
3. **Idempotency key storage:** New `IdempotencyKey` model or reuse `AuditLog` with unique constraint on `(actorId, event, meta.idempotencyKey)`?
4. **Settlement timing:** Daily at 00:00 Damascus time (cron) or manual admin trigger?
5. **Runner PWA offline support:** How to handle idempotency keys when runner is offline during DELIVERED confirmation?

---

## Appendix: Commands to Validate Fixes

```bash
# After implementing fixes:
pnpm --filter fawrun-api lint
pnpm --filter fawrun-api typecheck
pnpm --filter fawrun-api test
pnpm --filter fawrun-api db:generate
pnpm lint
pnpm typecheck
```

**All P0 items must pass `fawrun-domain-gate` and `api-contract-security` skill checks before Sprint 3 begins.**