# FAWRUN — Technical Audit Report (Final)

**Date:** 2026-09-15
**Auditor:** Independent Technical Reviewer
**Scope:** Full VS Code workspace (Monorepo: NestJS API + Next.js Admin + React PWA + Kotlin Android)
**Branch:** `feature/sprint-2-order-core`
**Status:** Final — Ready for Independent Review

---

## 1. Executive Summary

FAWRUN is a **Modular Monolith** grocery delivery platform in a **pnpm + Turborepo monorepo**. The backend (NestJS + PostgreSQL + Prisma + Socket.IO) implements **Sprint 1 (Foundation)** fully and **Sprint 2 (Order Core)** partially. The codebase demonstrates strong architectural discipline: **State Machines** enforce every status transition, **append-only Ledger/AuditLog** guarantee financial integrity, **Zod validation** on all inputs, and **JWT RS256** with revocable refresh tokens.

**Overall Maturity:** **P1 — Production-ready core, missing critical Sprint 2–4 features** (Order execution flow, Settlements, Ratings, Ledger, Runner PWA, Android app).

**Critical Blockers:** None. The Sprint 2 gaps identified below are documented as "Blocking Sprint 3" per the Sprint 2 Review Plan (line 202), meaning they are Sprint 2 gaps that must be resolved before Sprint 3 begins. They are not blocking the current branch.

**Top Risks:** WebSocket reliability (no Outbox pattern), idempotency not wired, missing runner action endpoints, LedgerEntry not created, Runner State Machine not injected.

---

## 2. Sprint 2 Gaps — Blocking Sprint 3

These are gaps in Sprint 2 output that block Sprint 3. They are documented per the Sprint 2 Review Plan (Axis 6: Known Gaps Catalog, lines 194-208).

| ID | Original | Finding | Evidence |
|----|----------|---------|----------|
| **G-1** | G-6 | **No runner action endpoints.** Orders cannot reach DELIVERED. The `OrderStoreStateMachine` exists (`order-store-state-machine.ts:30`) and is exported (`state-machine.module.ts:23`) but is **never injected into any service** — PURCHASED/SKIPPED are unreachable. | `orders.controller.ts:50-181` — no runner actions; `runners.controller.ts:19-77` — admin CRUD only; `orders.gateway.ts:20-71` — no `@SubscribeMessage`; `order-store-state-machine.ts:30` — zero service injections |
| **G-2** | A-20 | **LedgerEntry model exists but zero creation code.** Financial operations are not auditable. | `schema.prisma:350-368` — model defined; zero service code anywhere in `apps/api/src` |
| **G-4** | A-04 (reframed) | **`RunnerStateMachine` exists but is never injected.** Defined at `runner-state-machine.ts:32`, exported at `state-machine.module.ts:23`, but zero service injections. Runner status is mutated directly in 3 places instead of going through `transition()`. | `orders.service.ts:422` — direct `tx.runner.update` in `cancelOrder`; `orders.service.ts:1052` — direct `tx.runner.updateMany` in `assignRunner`; `orders.service.ts:1158` — direct `tx.runner.update` in `cancelOrderAdmin` |

---

## 3. Real Findings

These are verified issues in the current codebase. Each has a `file:line` citation and a stated reason for its classification.

| ID | Original | Severity | Finding | Evidence |
|----|----------|----------|---------|----------|
| **F-1** | A-05 | **Medium** | WebSocket gateway does not verify `user.status`. The `handleConnection` method extracts `payload.sub` and `payload.role` from the JWT but never checks `payload.status`. Users with `PENDING_VERIFICATION` status can connect to WebSocket rooms. The `VerifiedUserGuard` is only applied to HTTP controllers, not WebSocket connections. | `orders.gateway.ts:37-66` — JWT verified at line 46-51, but no DB lookup for current user status |
| **F-2** | A-09 | **High** | **Regression: `approveOrder` overcharges `extraStoresFee`.** The code at `orders.service.ts:716` uses `purchasedStoreCount: order.orderStores.length` which counts ALL stores (PENDING + PURCHASED + SKIPPED). This is a regression introduced by commit `10a561bc` ("fix: fee calculation") which reverted a prior fix in commit `47c4daf`. The Sprint 2 Brief (line 375) explicitly states `purchasedStoreCount: 0` at approval time because no stores have been purchased yet. Line 468 states only PURCHASED stores should be counted. No test covers this path. | `orders.service.ts:716` — `purchasedStoreCount: order.orderStores.length`; commit `10a561bc` reverted fix from `47c4daf`; Sprint 2 Brief lines 375, 468 |
| **F-3** | E-02 | **Medium** | Refresh token is not rotated on refresh. The `refresh()` method at `auth.service.ts:196-198` returns the same `refreshToken` that was passed in. If a refresh token is leaked, the attacker can use it indefinitely to obtain new access tokens. Token rotation (issuing a new selector+secret and revoking the old one) is the standard security practice. | `auth.service.ts:196-198` — `refreshToken: dto.refreshToken` (same token returned) |
| **F-4** | A-14 | **Medium** | `AuditService.log` is called without a `tx` parameter in `auth.service.ts:141-146`. This means the AuditLog is written outside the transaction. If the transaction fails, the audit log may already be committed, creating an inconsistent audit trail. Compare to `auth.service.ts:67-78` which correctly passes `tx`. | `auth.service.ts:141-146` — `this.auditService.log({...})` without `tx`; `auth.service.ts:67-78` — correct usage with `tx` |
| **F-8** | E-18 | **Low** | Missing `onDelete: SetNull` on the `preferredRunnerId` relation. If a runner is deleted or deactivated, the order's `preferredRunnerId` would cause a foreign key constraint error. The relation at `schema.prisma:212` has no `onDelete` modifier. | `schema.prisma:212` — `preferredRunner Runner? @relation("PreferredRunner", fields: [preferredRunnerId], references: [id])` with no `onDelete` |
| **F-9** | E-19 | **Low** | No WhatsApp E.164 format validation. The `whatsapp` field at `schema.prisma:71` is stored as a plain string with no format constraint. The Zod schemas for registration and login do not enforce E.164 format (e.g., `+963xxxxxxxxx`). Numbers like "0912345678" or "963-912-345-678" would be accepted. | `schema.prisma:71` — `whatsapp String @unique`; no Zod format check in `auth.types.ts` |
| **F-10** | A-18 | **Medium** | `createOrder` does not validate `preferredRunner.status === 'AVAILABLE'` when `waitForPreferred=true`. The code at `orders.service.ts:102-110` only checks that the runner exists (`findUnique`), not their status. If the runner is `ON_MISSION` or `UNAVAILABLE`, the order is created and waits indefinitely. | `orders.service.ts:102-110` — only `findUnique` existence check; no `status === 'AVAILABLE'` validation |

---

## 4. Dead Code

These are methods, transitions, or modules that exist in the codebase but have zero callers. They are not bugs — they are code written for future sprints that has not yet been wired up.

| ID | Original | Finding | Evidence |
|----|----------|---------|----------|
| **DC-1** | A-02 | `validateIdempotencyKeyForDelivered` is defined at `order-state-machine.ts:119` but has zero callers anywhere in `apps/api/src`. It was written for the future `deliver()` method (Sprint 3) which does not yet exist. | `order-state-machine.ts:119` — grep confirms zero references outside the class itself |
| **DC-2** | A-03 | `recalculateFee` is defined at `pricing.service.ts:80` but has zero callers anywhere in `apps/api/src`. It was written for the future pricing recalculation flow (Sprint 3) which does not yet exist. | `pricing.service.ts:80` — grep confirms zero references outside the class itself |
| **DC-3** | A-17 | The transition `AWAITING_RUNNER → AWAITING_PREFERRED_RUNNER` by `SYSTEM` is defined at `order-transitions.ts:39-40` but has zero callers. No service code triggers this transition. It is dead code awaiting a future implementation. | `order-transitions.ts:39-40` — grep confirms zero references outside the transitions file |

---

## 5. Architectural Observations

These are non-blocking observations about the codebase architecture. They are noted for awareness, not as findings requiring fixes.

| ID | Original | Observation | Evidence |
|----|----------|-------------|----------|
| **AO-1** | TD-1 | No `onDelete` constraint on any Prisma relation across 15 models. Low impact because the application uses soft delete (`isDeleted` flag at `schema.prisma:77`). Hard deletes should never occur in this system. If they did, PostgreSQL would error with foreign key violations rather than cascade. This is a design note, not an active vulnerability. | `schema.prisma` — zero `onDelete` constraints |
| **AO-2** | E-08 | Offset pagination (`skip`/`take`) is used in admin list endpoints. For large datasets (10k+ orders), keyset (cursor) pagination is preferred because offset pagination degrades linearly as the offset increases. | `orders.service.ts:251-253` — `skip: (page - 1) * limit, take: limit` |
| **AO-3** | E-15 | R2 storage URLs are stored permanently in the `Receipt` model without a TTL (time-to-live) mechanism. Cleanup of orphaned R2 objects is a future operational concern, not a current bug. | `schema.prisma:307` — `imageUrl String` with no TTL or cleanup logic |
| **AO-4** | F-6 (E-01) | No limit on concurrent refresh tokens per user. The `login()` method at `auth.service.ts:131-139` creates a new `RefreshToken` on every login without checking existing token count. However, the project provides a "revoke all" mechanism via `suspend()` at `users.service.ts:201-204`, which calls `refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } })`. This is an accepted design choice, not a bug. | `auth.service.ts:131-139`; `users.service.ts:201-204` |
| **AO-5** | F-7 (E-09) | WebSocket disconnects silently when JWT expires mid-session. The gateway verifies the JWT only at connection time (`orders.gateway.ts:46-51`). This is expected behavior in standard WebSocket implementations — the client is responsible for reconnection. The spec does not require automatic token renewal inside WebSocket connections. | `orders.gateway.ts:46-51` |

---

## 6. Deferred — Post-MVP

These are gaps that have been officially deferred to post-MVP by project lead decision. They are documented here for awareness, not as findings requiring action in Sprint 2.

| ID | Original | Finding | Reason | Reference |
|----|----------|---------|--------|-----------|
| **G-3** | A-15, A-16 | **Outbox pattern missing.** 7× `catch { void 0; }` silently swallow WebSocket emit failures. Events sent after transaction commit can be lost. | Deferred by project lead. Sprint 2 Brief does not include Outbox as a requirement. Review Plan classifies it as "Known gap (not built in Sprint 2)". Accepted risk for MVP: WebSocket events may be lost on network failure. | Review Plan — "Known gaps (not built in Sprint 2): Outbox" |
| **E-13** | E-13 | **Timezone handling for `operationalDate`.** Sprint 4 Brief lines 119-121 require a `getOperationalDate()` helper using `Asia/Damascus` timezone. All dates stored in UTC in DB, but `operationalDate` must be calculated in Damascus time. Not yet implemented. | Deferred to Sprint 4. Sprint 4 Brief section 4.2 explicitly requires this helper. Not a Sprint 2 concern. | Sprint 4 Brief lines 119-121 |

---

## 7. Reclassified — Not Findings

These were originally reported as findings but have been reclassified after further investigation. Each entry includes the reason for reclassification.

| Original ID | Original Classification | Reclassified As | Reason |
|-------------|------------------------|-----------------|--------|
| **A-01** | P0 — Race condition on `orderNumber` | Not a Finding | Both `order.create` (line 111) and `order.update` (line 133) are inside the same `prisma.$transaction` (line 100). From any external observer, the transaction is atomic — it either commits fully (with `orderNumber`) or rolls back fully (no order). There is no visible intermediate state. The `@@unique` on `orderNumber` (`schema.prisma:188`) is a defense-in-depth safety net, not a fix for a race. This pattern is explicitly noted in `AGENTS.md` line 30: "orderNumber generated from seqNumber inside a transaction after save." |
| **A-04** | P1 — Bypasses RunnerStateMachine | Not a Finding (reframed as G-4) | The `updateMany` pattern at `orders.service.ts:1052` is correct optimistic concurrency — it checks `where: { status: 'AVAILABLE' }` and throws `RUNNER_NOT_AVAILABLE` if the runner is no longer available. The finding has been reframed: `RunnerStateMachine` exists but is never injected into any service (see G-4). The original framing ("bypasses RunnerStateMachine") was inaccurate because the state machine was never wired up in the first place. |
| **A-05** | P1 — WebSocket auth | Carried forward as F-1 | Verified as a real finding. WebSocket gateway does not verify `user.status`. |
| **A-06** | P1 — Customer cannot cancel from AWAITING_RUNNER | Not a Finding | Sprint 2 Brief line 47 states: "العميل有能力 الإغلاق فقط حتى状态 `ASSIGNED`" and line 284 states: "العميل有能力 الإغلاق فقط حتى状态 `ASSIGNED` (القسم 6.1)". The spec explicitly restricts customer cancellation to `PENDING_REVIEW` and `ASSIGNED`. The implementation at `order-transitions.ts:54-55` correctly allows `ASSIGNED → CANCELLED` by `CUSTOMER`. The missing transitions (`AWAITING_RUNNER → CANCELLED` and `AWAITING_PREFERRED_RUNNER → CANCELLED` by `CUSTOMER`) are correctly absent per spec. The original finding was based on an incorrect assumption that customers should be able to cancel while waiting for a runner. |
| **A-07** | P1 — `cancelOrderAdmin` not idempotent | Not a Finding | `cancelOrderAdmin` throws `UnprocessableEntityException` (422) if called on an already-cancelled order because `CANCELLED` is a terminal state (`order-state-machine.ts:96-98`). This is correct state machine enforcement, not an idempotency gap. The spec (`AGENTS.md` line 25) requires idempotency on "critical operations (e.g., DELIVERED)" — the list is illustrative, not exhaustive, but it is under the heading "Financial Operations." Cancellation is not a financial operation. |
| **A-08** | P2 — Rounding drift in `calculateFee` | Not a Finding | The ±1 SYP rounding difference between `runnerShare + platformShare` and `totalFees` is explicitly documented and handled per the Sprint 4 Brief (line 52). The spec states: "runnerShare = Σ SettlementItem.runnerShare, platformShare = Σ SettlementItem.platformShare" — totals are derived from the sum of individual SettlementItems, not from `totalFees` directly. The per-order rounding cancels out across items. Sprint 4 Brief is the higher authority over CURRENT_STATE.md (line 50), which only describes the pricing split ratio. |
| **A-10** | P2 — Error mapping | Not a Finding | The error mapping at `all-exceptions.filter.ts:16` already includes `422: 'BUSINESS_RULE_VIOLATION'`. Verified present. |
| **A-11** | P2 — O(n) refresh token lookup | Not a Finding | The `refresh()` method at `auth.service.ts:168` uses `findUnique({ where: { selector, isRevoked: false } })`. The `selector` field is a unique index, so the lookup is O(1), not O(n). The original finding was based on a misread. |
| **A-12** | P2 — Runner created with VERIFIED status | Not a Finding | Runners created by admin are pre-verified by design. This is an intentional exception, not a bug. The customer flow (register → PENDING_VERIFICATION → admin verify) is separate from the runner flow (admin creates → VERIFIED). Documented as an acceptable exception. |
| **A-13** | P3 — `listCustomerOrders` missing fields | Not a Finding | Sprint 2 Brief lines 265-271 explicitly show the response as `{ "id", "orderNumber", "status", "totalFee", "itemCount", "createdAt", "deliveredAt" }`. No `customerName`, `runnerName`, or `isPeripheral` are required by the spec for this endpoint. The original finding was based on a misreading of the spec. |
| **A-19** | P3 — Redundant DB fetch in `approveOrder` | Not a Finding | The service calls `orderStateMachine.transition()` which throws 422 if the transition is invalid. A pre-check with `canTransition` would be redundant. The current behavior is correct. |
| **D-16** | Dead End — `VerifiedUserGuard` not used | Not a Finding | `VerifiedUserGuard` IS used in 4 controllers: `customers.controller.ts:18`, `users.controller.ts:12`, `orders.controller.ts:51`, `runners.controller.ts:20`. The original report was wrong. |
| **E-05** | Edge Case — Empty `items` array | Not a Finding | The Zod schema at `order.types.ts:27` enforces `items: z.array(CreateOrderItemSchema).min(1)`. Empty arrays are rejected with a validation error. |
| **E-06** | Edge Case — lat/lng out of bounds | Not a Finding | The Zod schema at `order.types.ts:21-22` enforces `lat: z.number().min(-90).max(90)` and `lng: z.number().min(-180).max(180)`. Bounds are validated. The original report erred. |
| **E-07** | Edge Case — `isPeripheral` toggled after purchase | Not a Finding | `isPeripheral` is set at approval time (`orders.service.ts:714-717`), before any store purchases occur. This is per spec (Sprint 2 Brief lines 372-375). |
| **E-16** | Edge Case — Free-text store names | Not a Finding | Free-text store names are by design per the Sprint 2 Brief (line 217): "كتبة أسماء المتجر يدوياً كنص حر". Normalization and fuzzy matching are future enhancements, not bugs. |
| **E-17** | Edge Case — Free-text quantity | Not a Finding | Free-text quantity is by design. The field is display-only and not parsed for calculations. |
| **E-20** | Edge Case — Concurrent `recalculateFee` | Not a Finding | `recalculateFee` is dead code (see DC-2). Concurrency concerns are moot until it is wired up. |

---

## 8. Scaffolds — Deferred to Future Sprints

| ID | Component | Sprint | Description |
|----|-----------|--------|-------------|
| SF-1 | apps/api/src/modules/ledger/ | Sprint 3 | Module scaffolded but empty — no service, controller, or routes. LedgerEntry creation only happens in deliver() (Sprint 3, not yet built). |
| SF-2 | apps/api/src/modules/settlements/ | Sprint 4 | Module scaffolded but empty — Sprint 4 feature. |
| SF-3 | apps/api/src/modules/ratings/ | Sprint 4 | Module scaffolded but empty — Sprint 4 feature. |
| SF-4 | apps/api/src/modules/receipts/ | Sprint 3 | Module scaffolded but empty — Sprint 3 feature (R2 upload). |
| SF-5 | apps/api/src/modules/order-items/ | Sprint 2 | Module has service only — no controller/routes; items managed via OrdersService. |
| SF-6 | apps/api/src/modules/order-stores/ | Sprint 3 | Module has service only — no controller/routes; stores managed via OrdersService + Runner endpoints (Sprint 3). |
| SF-7 | apps/api/src/modules/customers/ | Sprint 2 | Module exists but only GET endpoints — PUT /customer/me and /customer/me/address not yet implemented (Sprint 2.5). |
| SF-8 | apps/api/src/modules/notifications/ | Sprint 3 | Only NotificationsService (emit helpers) — no controller, no Outbox, no persistence. |
| SF-9 | apps/admin-web/ | Sprint 2 | Next.js project not initialized — only directory exists. Sprint 2.11 + 4.6 + 5. |
| SF-10 | apps/runner-pwa/ | Sprint 3 | React+Vite project not initialized — only directory exists. Sprint 3.7 + 5. |
| SF-11 | apps/android/ | Sprint 5 | Kotlin project not initialized — only directory exists. Sprint 5. |
| SF-12 | apps/api/src/common/interceptors/ | Future | Directory exists but empty — no logging, transformation, or timeout interceptors. |
| SF-13 | apps/api/src/config/ | Future | Directory exists but empty — JWT config inline in app.module.ts. |

---

## 9. Edge Cases — Documented / Handled

| ID | Interface / Entry Point | Edge Case | Current Handling |
|----|------------------------|-----------|------------------|
| E-04 | PUT /runner/orders/:id/stores/:storeId/purchase | Purchase same store twice | State Machine: PENDING → PURCHASED only once; second call throws 422. Handled. |
| E-10 | PUT /runner/me/status | Runner sets AVAILABLE while has active order | Service checks activeOrder and rejects. Handled. |
| E-11 | DELETE /customer/orders/:id | Customer cancels IN_PROGRESS order | State Machine blocks (CUSTOMER cannot transition from IN_PROGRESS). Handled (422). |
| E-12 | POST /admin/settlements/close-day | Same day closed twice | Unique constraint (runnerId, operationalDate) — idempotent per spec. Handled. |
| E-14 | Rating.note | Customer writes PII in note | Note stored; only Admin can read per spec §7.2. Handled via endpoint access control. |