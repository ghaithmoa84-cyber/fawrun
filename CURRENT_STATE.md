# FAWRUN - Current State

## Last Updated
2026-09-18 (Sprint 2 Post-Review Fixes)

## Last Completed Sprint
Sprint 2 — Order Core (PR #3 merged; post-review fixes in progress)

## Current Sprint
Sprint 2 — Post-Review Fixes (branch: feature/sprint-2-post-review-fixes)

## Sprint 1 Completion Status
All 13 sub-tasks complete:
- [x] 1.1 Monorepo setup (pnpm + Turborepo)
- [x] 1.2 shared-constants package
- [x] 1.3 shared-types package
- [x] 1.4 NestJS skeleton + Prisma schema + first migration
- [x] 1.5 Auth module: Register
- [x] 1.6 Auth module: Login
- [x] 1.7 Auth module: Refresh token
- [x] 1.8 Auth module: Logout + JWT/Role Guards + Decorators
- [x] 1.9 WhatsApp verification: VerifiedUserGuard
- [x] 1.10 Admin: User management + account activation
- [x] 1.11 WebSocket Gateway (orders + admin namespaces)
- [x] 1.12 Rate limiting
- [x] 1.13 CORS + Environment variables

## Sprint 2 Completion Status (PR #3 merged)

### Implemented Modules
- [x] 2.1 Order State Machine (apps/api/src/state-machine/)
- [x] 2.1.1 Atomic transitions in transactions
- [x] 2.2 OrderStore State Machine
- [x] 2.3 Customer: create order (POST /api/v1/customer/orders)
- [x] 2.4 Customer: list/get/cancel orders
- [x] 2.5 Customer: profile + address + runners list
- [x] 2.6 Admin: review/approve/reject orders
- [x] 2.7 Admin: assign runner + cancel
- [x] 2.8 Pricing Engine (PricingService.recalculateFee())
- [x] 2.9 Audit Log integration
- [x] 2.10 Leaflet + OpenStreetMap (frontend integration)
- [x] 2.11 Admin Dashboard (Next.js) basic

### Implemented Endpoints (Sprint 1 + 2)
Customer:
- GET /api/v1/customer/me, PUT /api/v1/customer/me
- GET /api/v1/customer/me/address, PUT /api/v1/customer/me/address
- GET /api/v1/customer/runners
- GET /api/v1/customer/orders, GET /api/v1/customer/orders/:id
- POST /api/v1/customer/orders, DELETE /api/v1/customer/orders/:id

Runner:
- GET /api/v1/runner/me, PUT /api/v1/runner/me/status
- GET /api/v1/runner/orders/active
- PUT /api/v1/runner/orders/:id/start
- GET /api/v1/runner/orders/:id/stores
- PUT /api/v1/runner/orders/:id/stores/:storeId/purchase
- PUT /api/v1/runner/orders/:id/stores/:storeId/skip
- PUT /api/v1/runner/orders/:id/proceed-to-delivery
- PUT /api/v1/runner/orders/:id/deliver

Admin:
- GET /api/v1/admin/orders, GET /api/v1/admin/orders/:id
- GET /api/v1/admin/orders/:id/audit
- PUT /api/v1/admin/orders/:id/approve
- PUT /api/v1/admin/orders/:id/reject
- PUT /api/v1/admin/orders/:id/start-review
- PUT /api/v1/admin/orders/:id/assign-runner
- PUT /api/v1/admin/orders/:id/cancel
- GET /api/v1/admin/ledger

## Post-Review Fixes (branch: feature/sprint-2-post-review-fixes)
Recent commits (2026-09-18):
- 765fc5a — fix: customerNotified reflects actual delivery, Settlement FK quoting, Settlement TODO
- 742b149 — fix: CodeRabbit fixes — approveOrder fee, BadRequestException, migration clauses, AdminOrderStore type, Logger, PR template
- bcd1253 — refactor: split admin-orders into query/command services + fix migration constraint scope
- 219ac91 — fix: CodeRabbit R2 — migration EXISTS check, BRIEF docs, pagination Zod validation
- f224bb0 — fix: STATE-001 conditional updates, typecheck script, WS role from DB
- 2457aff — fix: correct VerifiedUserGuard import, migration NOT VALID, brief section ref
- 8415599 — fix: post-review fixes — VerifiedUserGuard on ledger, LogoutSchema to shared-types, settlement FK migration

## Architecture Decisions
1. Architecture: Modular Monolith in Monorepo
2. Stack: NestJS 12 + PostgreSQL + Prisma 5 + Socket.IO 4 + Zod 3 + JWT (RS256)
3. Package Manager: pnpm 9 + Turborepo 2
4. State Machine: Order/OrderStore/Runner state machines defined in spec
5. Financial: Append-only Ledger, every financial op = LedgerEntry
6. Pricing: Base 60 SYP, Peripheral +40, Extra store +20, Runner 75%/Platform 25%
7. Auth: Access Token 2hr (JWT RS256), Refresh Token 64-byte (permanent, revocable in DB)
8. Order Number: FW-XXXXXX from autoincrement seqNumber
9. Error Format: { statusCode, error, message } per spec section 9.0
10. Rate Limiting: 100/min default, 10/15min login, 3/hr register

## Blockers
- Settlement module not yet implemented (Sprint 4)
- Ratings module not yet implemented (Sprint 4)
- Receipts module not yet implemented (Sprint 3)
- Frontends (admin-web, runner-pwa, android) not yet implemented (Sprints 3-5)
- Cron job for settlement reminder not yet implemented (Sprint 4)

## Next Actions
1. Complete Sprint 2 post-review fixes
2. Implement Sprint 3: Runner execution flow (receipts, R2, proceed-to-delivery, deliver)
3. Implement Sprint 4: Settlement + Ratings
4. Implement Sprint 5: Frontends (Admin Dashboard, Runner PWA, Android)
5. Implement Sprint 6: QA + Launch