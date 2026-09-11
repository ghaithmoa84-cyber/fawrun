# FAWRUN Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Version](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Exception filter** — Standardized error responses: All exceptions now return `{ statusCode, error, message }` via `HTTP_ERROR_MAP` instead of NestJS default format (1:1, 400, 401, 409, 429, 404).
- **ESLint flat config** — Created `eslint.config.mjs` for ESLint 9 compatibility (was missing entire config).
- **TypeScript tsconfig** — Fixed `declarationMap` error by adding `declarationMap: false` override.
- **Unused imports** — Removed `Server` from notifications.service.ts, `Body` and `BadRequestException` from users.controller.ts, `CONFIG` from users.service.ts, `MessageBody`/`SubscribeMessage`/`ConnectedSocket` from orders.gateway.ts.
- **Zod validation** — Replaced `any` types in ZodValidationPipe (`ZodSchema<any,any>` → `ZodSchema`, `value: any` → `value: unknown`).
- **Runner controller** — Added Zod schemas (`CreateRunnerSchema`, `UpdateRunnerSchema`, `UpdateVisibilitySchema`) to shared-types, integrated `ZodValidationPipe` on all endpoints.
- **Type safety** — Replaced `any` types in audit.service.ts, auth.service.ts, runners.controller.ts, runners.service.ts with proper types (`Prisma.InputJsonValue`, `Prisma.UserUpdateInput`, etc.).

### Added
- Zod schemas for runner create/update operations in `packages/shared-types/src/runner.types.ts`

### Validated
- ESLint: 0 errors
- TypeScript: 0 errors (tsc --noEmit)
- Build: nest build succeeds
- Runtime: 200 auth tests passing (register, login, refresh, logout, protected endpoint, rate limiting, SQL injection, invalid JSON)

### Added
- FAWRUN MVP Technical Specification (from spec v1.1)
- Monorepo structure: apps/api, apps/admin-web, apps/runner-pwa, apps/android, packages/shared-types, packages/shared-constants
- pnpm + Turborepo workspace configuration
- Prisma schema from spec section 5
- 4 sub-agents: code-architect, feature-dev, test-engineer, debugger
- 3 skills: pre-sprint-checklist, rollback-plan, coderabbit-workflow
- Command shortcuts: /pre-sprint, /rollback-plan, /pr
- AGENTS.md with full coding standards and workflow
- CURRENT_STATE.md for session memory
- Semantic commit enforcement via commitlint
- Kilo agent configuration in kilo.json

### Changed
- None

### Fixed
- None

### Security
- None yet

---

## [0.1.0] - 2026-09-11

### Added
- Project initialization
- MVP Technical Specification imported
- Monorepo directory structure created
- Workflow agents and skills configured

## Sprint 1 Complete — Foundation

- pnpm-workspace.yaml, turbo.json, tsconfig.json, .gitignore
- packages/shared-constants: ORDER_STATUSES, PRICING+calculateFee, CONFIG
- packages/shared-types: Auth/Order/Runner/Settlement DTOs + Zod schemas + WebSocket event types
- apps/api: NestJS 12 app with ESM, TS strict, full Prisma schema (15 models, 7 enums)
- First migration applied to PostgreSQL
- Auth: register (201, PENDING_VERIFICATION, bcrypt 12 rounds, transaction)
- Auth: login (JWT RS256 2h, 64-byte refresh token bcrypt-hashed in DB)
- Auth: refresh (silent access token renewal)
- Auth: logout (revokes refresh token in DB)
- JWT Auth Guard + Roles Guard as global APP_GUARD
- @Public, @Roles, @CurrentUser decorators
- ZodValidationPipe for all request bodies
- AllExceptionsFilter with standardized error format per spec 9.0
- VerifiedUserGuard ready for Sprint 2 order endpoints
- Admin: user list/details/verify/reject/suspend (all with AuditLog)
- Admin: runner list/create/update/visibility endpoints
- AuditService: append-only AuditLog for all status changes
- WebSocket: OrdersGateway (/orders) + AdminGateway (/admin) with JWT auth on connect
- Auto room assignment: customer:{id}, runner:{id}, admin:all}
- NotificationsService: emitToCustomer/Runner/Admin helpers
- Rate limiting: 100/min default, login 10/15min, register 3/hr
- CORS configured from env, Helmet enabled
- Global prefix /api/v1, Port 3000
- .env + .env.example with all variables documented
