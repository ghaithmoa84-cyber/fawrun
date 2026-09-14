# Sprint 2 Comprehensive Review Plan

**Status:** Draft — Ready for implementation  
**Scope:** Audit the FAWRUN monorepo backend (Sprint 2 output) across 7 axes  
**Mode:** Code Mode — uses built-in `@explore` subagent (read-only auditor)  
**Constraints:** I am in Ask Mode (read-only). This plan is executable only in Code Mode.

---

## Context

### Project structure (read so far)
```
apps/api/src/
├── app.module.ts
├── main.ts
├── config/jwt.config.ts
├── database/{prisma.module,prisma.service}.ts
├── state-machine/{index,order-transitions,order-state-machine,order-store-state-machine,state-machine.module}.ts
├── common/{guards/{jwt-auth,roles,verified-user}.guard.ts,
│         decorators/{current-user,public,roles}.decorator.ts,
│         pipes/zod-validation.pipe.ts,
│         filters/all-exceptions.filter.ts}
├── modules/{auth,orders,customers,runners,users,notifications,pricing,audit}/
│   ├── auth/{auth.module,auth.controller,auth.service,dto/logout.dto}.ts
│   ├── orders/orders.{module,controller,service}.ts   ← 1233 lines
│   ├── customers/customers.{module,controller,service}.ts  ← 199 lines
│   ├── runners/runners.{module,controller,service}.ts   ← 182 lines
│   ├── users/users.{module,controller,service}.ts      ← 221 lines
│   ├── audit/audit.{module,service}.ts                 ← 33 lines
│   ├── notifications/notifications.{module,service}.ts ← 38 lines
│   └── pricing/pricing.{module,service}.ts             ← 170 lines
└── websocket/{websocket.module.ts,
               gateways/{admin,orders,socket-registry,cors-origins}.ts}
```

### Shared packages
```
packages/shared-types/src/{index,auth,customer,order,runner,settlement,websocket.events}.ts
packages/shared-constants/src/{index,config,order-status,pricing}.ts
```

### Migration
```
apps/api/prisma/migrations/20260911172902_init/migration.sql   (407 lines)
apps/api/prisma/schema.prisma                                (427 lines)
```

### Reference documents
- `AGENTS.md` — FAWRUN Coding Standards & Workflow
- `docs/sprints/Sprint 2 Brief.md` — 632-line specification
- `.kilo/agent/{code-architect,debugger,feature-dev,reviewer,test-engineer}.md`
- `.kilo/skills/{fawrun-domain-gate,api-contract-security,coderabbit-workflow,pre-sprint-checklist,rollback-plan}.ts`
- `kilo.json` — 4 registered agents (code-architect, feature-dev, test-engineer, debugger)

---

## Execution Plan

### Phase 0: Bootstrap — one read-only session to ingest project context

```
@explore read and analyze ALL documentation and project configuration:
- AGENTS.md
- .kilo/agent/*.md (5 agent definitions)
- .kilo/skills/*.md (5 skill definitions + SKILL.md)
- .kilo/command/*.md (pre-sprint.md, pr.md, rollback-plan.md if any)
- kilo.json
- docs/sprints/Sprint 2 Brief.md
- apps/api/prisma/migrations/20260911172902_init/migration.sql
Return a concise summary of: the FAWRUN workflow (sprint flow, agents, skills, commands), the Sprint 2 scope/goals, and key rules from AGENTS.md + Skill gates.
```

⏱ **Estimated:** 1 read-only session, ~1 min.

---

### Phase 1: Axis 1 — Data Model (schema vs migration vs spec)

```
@explore compare every model in apps/api/prisma/schema.prisma against
docs/sprints/Sprint 2 Brief.md (sections 6.1, 6.2, 17).

For each model (User, RefreshToken, Customer, CustomerAddress, Runner,
Admin, Order, OrderItem, OrderStore, Receipt, Rating, LedgerEntry,
Settlement, SettlementItem, AuditLog):
  - Check relations + FK constraints match migration.sql
  - Check indexes (@@index, @@unique) are present in migration.sql
  - Check field types/enums/defaults match schema.prisma
  - Check soft-delete pattern (isDeleted) where applicable
  - Note append-only fields: LedgerEntry, AuditLog (no updatedAt)
  - Note orderNumber generation from seqNumber (inside transaction per 17)

Flag any discrepancies.
```

### Phase 2: Axis 2 — State Machine (transitions tracked to DB commit)

```
@explore trace every status transition from request to DB commit in
apps/api/src/modules/orders/orders.service.ts:

For each method that changes order.status:
  - createOrder: DRAFT → PENDING_REVIEW
  - cancelOrder: * → CANCELLED (customer)
  - approveOrder: UNDER_REVIEW → AWAITING_*
  - rejectOrder: UNDER_REVIEW → CANCELLED
  - startOrderReview: PENDING_REVIEW → UNDER_REVIEW
  - assignRunner: AWAITING_* → ASSIGNED
  - cancelOrderAdmin: * → CANCELLED

For each:
  - Confirm the transition goes through OrderStateMachine.transition()
  - Confirm the result status is written to order.status within the same $transaction
  - Confirm AuditLog entry created inside the same $transaction
  - Confirm no direct status field mutations bypassing the SM

Check also:
  - OrderStoreStateMachine exists but is never used — flag as gap
  - Runner status is updated manually (no Runner SM) — flag as gap
  - Compare transitions in orders.service.ts against the transition table
    in docs/sprints/Sprint 2 Brief.md section 2.1
```

### Phase 3: Axis 3 — Transactions (multi-step atomicity)

```
@explore analyze every $transaction block in apps/api/src/modules/orders/orders.service.ts,
apps/api/src/modules/customers/customers.service.ts,
apps/api/src/modules/runners/runners.service.ts,
apps/api/src/modules/auth/auth.service.ts,
apps/api/src/modules/users/users.service.ts,
and apps/api/src/modules/pricing/pricing.service.ts.

For each transaction:
  1. List all DB writes inside the callback
  2. Identify which steps could succeed while others fail
  3. Check if AuditLog writes are inside the same transaction
  4. Check if WebSocket emissions are OUTSIDE the transaction (best-effort)
  5. Flag any partial-failure risk (e.g., status change without audit log)

Specifically:
  - createOrder: writes order, orderNumber, orderStores, orderItems, 2x AuditLog
  - cancelOrder: writes order.status, runner.status, AuditLog
  - approveOrder: writes order (status, fee, isPeripheral), 3x AuditLog
  - assignRunner (orders.service): writes order.status + runnerId — BUT does NOT
    write runner.status = 'ON_MISSION' (Sprint 2 section 2.7 step 2e missing)
```

### Phase 4: Axis 4+5 — Security + Layer Contracts (one combined explore)

```
@explore audit every endpoint and all DTO contracts:

Security per endpoint (read orders.controller.ts, customers.controller.ts,
users.controller.ts, runners.controller.ts, auth.controller.ts):
  - JwtAuthGuard global APP_GUARD registered in app.module.ts
  - @Roles('ADMIN') / @Roles('CUSTOMER') + RolesGuard per route
  - @UseGuards(VerifiedUserGuard) class-level where needed
  - @Public() on register/login/refresh — CHECK logout: missing @Public (SECURITY GAP)
  - ZodValidationPipe on all @Body params
  - Ownership checks: getOrderDetails, listCustomerOrders, cancelOrder use
    customerId from JWT
  - No object-level access control missing

Layer contracts (packages/shared-types/src/ vs service returns):
  - Compare each DTO type (CreateOrderResponse, AdminOrderListItem,
    CustomerOrderDetails, CustomerOrderListItem, etc.) against what
    orders.service.ts actually returns
  - Flag: import { CreateOrderRequest } in orders.service.ts line 9 —
    imported as value not type (isolatedModules risk)
  - Flag: PurchaseResponse, CloseSettlementSchema, RunnerStatusUpdateSchema
    exist in shared-types but have zero endpoints using them
```

### Phase 5: Axis 6 + 7 — Known Gaps + Code Quality (one combined explore)

```
@explore audit code quality AND catalog known gaps:

Code quality:
  - orders.service.ts: 1233 lines → split by domain (CreateOrderService,
    CancelOrderService, AdminOrderService)
  - mapOrderItem() duplicated between getOrderDetails() and getAdminOrderDetails()
  - Unused imports: e.g., Prisma.Module import in order-transitions.ts
    (re-exports ORDER_STATUSES), OrderStoreStateMachine injected nowhere
  - PricingService imports AuditModule + NotificationsModule but
    recalculateFee() never called anywhere — dead code path
  - Transaction callback pattern repeated verbatim 7 times —
    candidate for a reusable withTransaction() helper
  - catch { void 0; } anti-pattern used 7 times in orders.service.ts
    (errors silently swallowed — should at least log)

Known gaps (not built in Sprint 2):
  - Ledger: schema model exists, zero LedgerEntry creation code
  - Outbox: notifications fire-and-forget, no durability
  - Idempotency: no idempotency keys on DELIVERED or financial ops
  - Runner SM: no Runner Status Machine — runner.status updates scattered
  - Runner actions: no endpoints for IN_PROGRESS, OUT_FOR_DELIVERY,
    DELIVERED transitions (state machine allows them, frontend can't trigger)
  - Store purchase/skip endpoints: OrderStoreStateMachine exists but
    no endpoints wire up PURCHASED/SKIPPED
  - Receipt upload: no POST endpoint for Receipt
  - Rating: no endpoints
  - Settlement: no endpoints / SettlementService
```

---

## Parallelization Plan

| Session | Reads | Parallelizable? |
|---------|-------|-----------------|
| Phase 0 | Docs only | Before everything |
| Phase 1 | schema + migration + Sprint Brief | ✅ Yes |
| Phase 2 | orders.service.ts + order-transitions.ts | ✅ Yes |
| Phase 3 | orders + customers + runners + auth + users + pricing services | ✅ Yes |
| Phase 4 | 5 controllers + 6 shared-types files | ✅ Yes |
| Phase 5 | orders.service.ts + pricing.service.ts + shared-types | ✅ Yes |

**Max parallelism:** Phases 1, 2, 3, 4, 5 can run in a single Code Mode
turn with 5 parallel `@explore` calls — each gets its own isolated context.

---

## Final Output

After collecting all `@explore` summaries, the main agent will write:

```
docs/review/sprint-2-comprehensive-review-plan.md
```

### Structure of the output document:
```markdown
1. Executive Summary
2. Axis 1: Data Model Audit
   - Per-model findings
   - Discrepancy table
3. Axis 2: State Machine Audit
   - Transition trace table
   - Gaps: OrderStore SM unused, Runner SM missing
4. Axis 3: Transaction Audit
   - Per-method transaction boundaries
   - Risks: partial failure points
5. Axis 4: Security Audit
   - Per-endpoint guard coverage
   - Gap: logout missing @Public
6. Axis 5: Layer Contract Audit
   - DTO vs service return mismatches
   - Dead code in shared-types
7. Axis 6: Known Gaps Catalog
   - Ledger / Outbox / Idempotency / Runner SM
   - Sprint 3 impact assessment
8. Axis 7: Code Quality Report
   - Large files, duplicates, smells
9. Recommendations
   - Priority-ordered fix list
10. Open Questions
```

---

## Notes & Risks

- **In Ask Mode now:** none of the `@explore` invocations or document
  creation can execute. This plan is a blueprint for Code Mode.
- **Redundant reads:** orders.service.ts (~1233 lines) will be read by
  Phases 2, 3, 5 — acceptable cost for focused analysis.
- **Cross-axis blind spots:** Security issues discovered in Phase 4 might
  relate to code quality in Phase 5 — the final synthesis step should
  cross-reference findings.
- **Spec file:** `FAWRUN — MVP Technical Specification.DOCX` exists as a
  project file outside the repo (not under version control). The review
  relies on `docs/sprints/Sprint 2 Brief.md`, which is derived from the
  spec and is sufficient for all comparisons.
