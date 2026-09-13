# FAWRUN - Current State

## Last Updated
2026-09-11 (Sprint 1 Complete)

## Last Completed Sprint
Sprint 1 — Foundation

## Current Sprint
None (Sprint 1 Complete)

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

## Completed Endpoints
- `POST /api/v1/auth/register` — Register customer (201, PENDING_VERIFICATION)
- `POST /api/v1/auth/login` — Login (JWT RS256 access, 64-byte refresh)
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Logout (revokes refresh token)
- `GET /api/v1/admin/users` — List customers (paginated)
- `GET /api/v1/admin/users/:id` — Customer details
- `PUT /api/v1/admin/users/:id/verify` — Verify account
- `PUT /api/v1/admin/users/:id/reject` — Reject account
- `PUT /api/v1/admin/users/:id/suspend` — Suspend account (revokes tokens)
- `GET /api/v1/admin/runners` — List runners (paginated)
- `POST /api/v1/admin/runners` — Create runner
- `PUT /api/v1/admin/runners/:id` — Update runner
- `PUT /api/v1/admin/runners/:id/visibility` — Toggle runner visibility

## Architecture Decisions
1. **Architecture**: Modular Monolith in Monorepo
2. **Stack**: NestJS 12 + PostgreSQL + Prisma 5 + Socket.IO 4 + Zod 3 + JWT (RS256)
3. **Package Manager**: pnpm 9 + Turborepo 2
4. **State Machine**: Order/OrderStore/Runner state machines defined in spec
5. **Financial**: Append-only Ledger, every financial op = LedgerEntry
6. **Pricing**: Base 60 SYP, Peripheral +40, Extra store +20, Runner 75%/Platform 25%
7. **Auth**: Access Token 2hr (JWT RS256), Refresh Token 64-byte (permanent, revocable in DB)
8. **Order Number**: FW-XXXXXX from autoincrement seqNumber
9. **Error Format**: { statusCode, error, message } per spec section 9.0
10. **Rate Limiting**: 100/min default, 10/15min login, 3/hr register

## Blockers
- None

## Next Actions
1. Start Sprint 2 (Order State Machine, Order creation, Pricing Engine)
2. Implement customer order endpoints
3. Implement admin order review/approve flow
4. Implement runner execution flow
