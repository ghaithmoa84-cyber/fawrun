# FAWRUN Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Version](https://semver.org/spec/v2.0.0.html).

### 2026-09-12 18:18 — CodeRabbit review documentation fixes (Sprint 2/3 Brief)

**الملفات والدوال المعدّلة:**
- `docs/sprints/Sprint 2 Brief.md` — Fix 1: `BadRequestException` → `UnprocessableEntityException` (line 85); Fix 2: Added runner AVAILABLE/VERIFIED check + status update to ON_MISSION in transaction (lines 94-102); Fix 3: `fromStatus: 'AWAITING_RUNNER'` → `fromStatus: order.status` (line 111)
- `docs/sprints/Sprint 3 Brief.md` — Fix 4: Replaced "ذرّية إرسال الأحداث" WebSocket transaction guidance with Outbox Pattern pattern (lines 331-338)

**السبب:**
معالجة 4 ملاحظات من CodeRabbit في توثيق Sprint 2 و Sprint 3 Briefs: استثناء غير صحيح، حالة runner مفقودة في transaction، status ثابت في AuditLog، ونمط إرسال WebSocket الخاطئ.

**الأوامر والنتائج:**
- `git add && git commit -m "fix: CodeRabbit review fixes - Sprint 2/3 brief documentation"` → نجح، commit 8faa553
- `git push origin feature/sprint-1-auth-admin-websocket` → نجح

**الأخطاء والحلول:**
- خطأ `oldString not found` في Fix 2 و Fix 4 بسبب عدم تطابق المسافات/الفواصل → تم إصلاح بتطابق دقيق للنص بعد قراءة الأسطر الحالية

## [Unreleased]

### 2026-09-12 18:14 — إكمال التحقق من إصلاحات CodeRabbit

**الملفات والدوال المعدّلة:**
- `CHANGELOG.md` — توثيق نتائج التحقق النهائية

**السبب:**
إكمال خطة التحقق و记录 حالة الأوامر الناجحة والفاشلة دون تعديل ملفات API خارج نطاق الخطة.

**الأوامر والنتائج:**
- `pnpm --filter fawrun-api test` → لم يُعثَر على ملفات اختبارات، exit code 1
- `pnpm --filter @fawrun/shared-types build` → نجح
- `pnpm --filter @fawrun/shared-constants lint` → نجح
- `pnpm --filter fawrun-api exec prisma validate` → نجح
- `git diff --check` → نجح

**الأخطاء والحلول:**
- أخطاء `apps/api/src/app.module.ts:90` و`apps/api/src/config/jwt.config.ts:26` موجودة في `HEAD` ولم تُعدّل ضمن هذه الخطة.
- لم يتوفر `DATABASE_URL` أو `psql` محليًا، لذا لم يُنفّذ `pnpm db:push --force`.

### 2026-09-12 17:50 — إصلاح مراجعات CodeRabbit اليدوية

**الملفات والدوال المعدّلة:**
- `AGENTS.md` — إزالة الأحرف التحكمية من قواعد Types First وقائمة المهارات
- `CHANGELOG.md` — تصحيح القوس الزائد في مهمة Auto room assignment
- `apps/api/prisma/migrations/20260911172902_init/migration.sql` — تصحيح `orderNumber` و`operationalDate` وعلاقات LedgerEntry وإضافة فهرس Rating الفريد

**السبب:**
معالجة البنود غير المؤجلة في خطة مراجعات CodeRabbit اليدوية والحفاظ على سلامة الهجرة الأولية.

**الأوامر والنتائج:**
- `pnpm --filter @fawrun/shared-types lint` → نجح
- `pnpm --filter fawrun-api db:generate` → نجح
- `pnpm --filter fawrun-api lint` → فشل بسبب أخطاء parsing/type موجودة مسبقًا في `apps/api/src/app.module.ts:90` و`apps/api/src/config/jwt.config.ts:26`
- `pnpm lint` → فشل لنفس أخطاء API الموجودة مسبقًا
- `pnpm typecheck` → لم يُنفّذ أي مهمة بسبب إعدادات Turbo الحالية
- `pnpm --filter fawrun-api build` → فشل بنفس أخطاء API الموجودة مسبقًا
- `git diff --check` → نجح

**الأخطاء والحلول:**
- لم يتوفر `DATABASE_URL` أو `psql` محليًا، لذا لم يُنفّذ `pnpm db:push --force`.

### 2026-09-12 16:30 — إكمال تنفيذ خطة مراجعات CodeRabbit

**الملفات والدوال المعدّلة:**
- `apps/api/src/app.module.ts` — إصلاح خطأ بنائي: إغلاق `JwtModule.registerAsync` بشكل صحيح
- `apps/api/src/config/jwt.config.ts` — إصلاح `normalize.sep` → `sep` (استيراد مباشر من `path`) للتحقق من مسار المجلد
- `packages/shared-constants/src/pricing.ts` — إزالة `calculateFee` (نقلت إلى الـ API layer)
- `apps/api/src/modules/pricing/pricing.service.ts` — إنشاء PricingService جديد في الـ API
- `apps/api/src/modules/pricing/pricing.module.ts` — إنشاء PricingModule
- `apps/api/prisma/schema.prisma` — تصحيح `@@unique([orderId, runnerId])` → `@@unique([orderId, customerId])` للفهرس الفريد
- `docs/sprints/Sprint 2 Brief.md` — إضافة قسم ضمان الذرّية في انتقالات الحالة
- `docs/sprints/Sprint 1 Brief.md` — إضافة أمثلة payloads WebSocket وقواعد الإرسال
- `docs/sprints/Sprint 3 Brief.md` — إضافة قاعدة ذرّية إرسال الأحداث

**السبب:**
نقل منطق التسعير إلى طبقة الـ API وفق قاعدة Server is Source of Truth، وتوثيق انتقالات الحالة الذرّية وقواعد WebSocket.

**الأوامر والنتائج:**
- `pnpm lint` → نجح (3/3)
- `pnpm --filter fawrun-api build` → نجح
- `pnpm --filter @fawrun/shared-types build` → نجح
- `pnpm --filter @fawrun/shared-constants build` → نجح
- `pnpm --filter fawrun-api db:generate` → نجح
- `git diff --check` → نجح

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
- Auto room assignment: customer:{id}, runner:{id}, admin:all
- NotificationsService: emitToCustomer/Runner/Admin helpers
- Rate limiting: 100/min default, login 10/15min, register 3/hr
- CORS configured from env, Helmet enabled
- Global prefix /api/v1, Port 3000
- .env + .env.example with all variables documented
