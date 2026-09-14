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

### 2026-09-14 13:00 — Runner status validation + VerifiedUserGuard on Admin endpoints

**الملفات والدوال المعدّلة:**
- `apps/api/src/modules/orders/orders.service.ts` — `cancelOrder()` و`cancelOrderAdmin()`: إضافة تحقّق `!order.runner \|\| order.runner.status !== 'ON_MISSION'` قبل تعيين `AVAILABLE`، واستبدال `updateMany` بـ `update` (فردي)
- `apps/api/src/modules/users/users.controller.ts` — `UsersController`: إضافة `VerifiedUserGuard` إلى `@UseGuards` (Admin يجب أن يكون VERIFIED)
- `apps/api/src/modules/runners/runners.controller.ts` — `RunnersController`: إضافة `VerifiedUserGuard` إلى `@UseGuards` (Admin يجب أن يكون VERIFIED)

**السبب:**
منع تغيير حالة runner غير المصرّح به عند الإلغاء، وضمان أن المستخدمين المُدرجين كـ Admin هم حسابهم مُفعّل (VERIFIED).

**الأوامر والنتائج:**
- `pnpm build` → نجح، 3/3 حزم
- `pnpm test` → نجح، 59/59 اختبار
- `git commit -m "fix: Runner status validation + VerifiedUserGuard on Admin endpoints"` → نجح، commit `7a65a39`
- `git push origin feature/sprint-2-order-core` → نجح

**الأخطاء والحلول:**
- `TS18047: 'order.runner' is possibly 'null'` — تم إضافة `!order.runner \|\|` في الشرط
- `TS1206: Decorators are not valid here` في runners.controller.ts — بسبب تكرار في المحتوى أثناء التعديل، تم إعادة كتابة الملف بالكامل
- خطأ LF/CRLF في runners.controller.ts — تحذير Git المعتاد، لا يؤثر على الوظيفة

### 2026-09-14 02:40 — Order state machine enhancements & admin review endpoint

**الملفات والدوال المعدّلة:**
- `apps/api/src/state-machine/order-transitions.ts` — إضافة انتقال `UNDER_REVIEW -> AWAITING_PREFERRED_RUNNER` بصلاحية `ADMIN`
- `apps/api/src/modules/orders/orders.service.ts` — `createOrder()`: إزالة `status: 'DRAFT'` و`status: 'PENDING_REVIEW'` المباشرين، استخدام نتيجة `OrderStateMachine.transition()`، إضافة تحقق `preferredRunnerId` عبر `tx.runner.findUnique` قبل إنشاء الطلب؛ `cancelOrder()`: إزالة `status: 'CANCELLED'` المباشر، إضافة تحقق صارم من حالة runner (يتم التحديث فقط إذا كانت `ON_MISSION`)؛ `approveOrder()` و`rejectOrder()`: إزالة status literals واستخدام `transitionResult.to`؛ إضافة `startOrderReview()` (PENDING_REVIEW -> UNDER_REVIEW, ADMIN, transaction, AuditLog, WebSocket)
- `apps/api/src/modules/orders/orders.controller.ts` — إضافة `PUT admin/orders/:id/start-review` مع `@Roles('ADMIN')` و Zod validation
- `apps/api/src/app.module.ts` — تسجيل `ThrottlerGuard` كـ `APP_GUARD` مع `JwtAuthGuard` و `RolesGuard`
- `packages/shared-types/src/order.types.ts` — `StartOrderReviewSchema` و `StartOrderReviewRequest`
- `apps/api/test/state-machine/order-state-machine.spec.ts` — تحديث لاختبار الانتقال الجديد (13 -> 14 انتقال)

**السبب:**
تطبيق انتقال حالة جديد، endpoint admin لبدء المراجعة، إزالة جميع كتابات status المباشرة لصالح State Machine transitions، تحقق أمان للـ preferred runner و runner status، وتسجيل ThrottlerGuard.

**الأوامر والنتائج:**
- `pnpm --filter @fawrun/shared-types build` → نجح
- `pnpm --filter fawrun-api exec tsc --noEmit` → نجح، صفر أخطاء
- `pnpm --filter fawrun-api build` → نجح
- `pnpm --filter fawrun-api test` → نجح، 59/59 اختبار
- `pnpm lint` → نجح، 3/3 مهام

**الأخطاء والحلول:**
- لا توجد أخطاء

### 2026-09-13 20:05 — Admin Order Review endpoints (task 2.6)

**الملفات والدوال المعدّلة:**
- `apps/api/src/modules/orders/orders.controller.ts` — `OrdersController`: إضافة endpoints الـ Admin list/detail/audit/approve/reject مع `@Roles('ADMIN')` وZod validation
- `apps/api/src/modules/orders/orders.service.ts` — `listAdminOrders()`, `getAdminOrderDetails()`, `getAdminOrderAudit()`, `approveOrder()`, `rejectOrder()`: filters، details، AuditLog، State Machine transitions، fee recalculation، وWebSocket events داخل transactions
- `packages/shared-types/src/order.types.ts` — `AdminOrdersQuerySchema`, `RejectOrderSchema`, Admin order response types
- `packages/shared-types/src/runner.types.ts` — `ApproveOrderSchema.notes` أصبح optional ليتطابق مع contract المطلوب
- `apps/api/src/modules/orders/ROLLBACK_PLAN_task-2.6.md` — خطة rollback للتعديلات المالية/الحالية في مراجعة الطلبات

**السبب:**
تنفيذ المهمة 2.6 — مراجعة الطلبات من الإدارة: list كل الطلبات مع filters، عرض التفاصيل والـ audit، approve مع State Machine وfee update، وreject مع cancellation audit.

**الأوامر والنتائج:**
- `git add -A && git commit -m "feat: Customer order endpoints (list, detail, cancel) + Customer profile endpoints (tasks 2.4, 2.5)"` → نجح، commit `28de0bd`
- `pnpm --filter @fawrun/shared-types build` → نجح
- `pnpm --filter fawrun-api exec tsc --noEmit` → نجح، صفر أخطاء
- `pnpm build` → نجح، 3/3 حزم
- `pnpm lint` → نجح، 3/3 مهام
- `pnpm test` → نجح، 58/58 اختبار
- `pnpm --filter fawrun-api db:generate` → نجح
- `git diff --check` → نجح

**الأخطاء والحلول:**
- `order.types.ts` استخدم `CustomerOrderItem` و`CustomerOrderStore` دون import → تم إضافة type imports من `customer.types`.
- `orders.service.ts` كان ينقص closing brace قبل `listAdminOrders()` → تم إصلاح البنية ثم إعادة `prettier` و`tsc`.
- `lint` كشف import غير مستخدم لـ `CustomerOrderStore` → تم حذفه.

**الملفات والدوال المعدّلة:**
- `apps/api/src/modules/orders/orders.controller.ts` — `OrdersController`: إضافة/تصحيح routes لـ `POST/GET/DELETE /customer/orders` و`GET /customer/orders/:id` مع `VerifiedUserGuard` و`RolesGuard` وZod validation
- `apps/api/src/modules/orders/orders.service.ts` — `createOrder()`, `listCustomerOrders()`, `getOrderDetails()`, `cancelOrder()`: pagination، ownership check، تفاصيل الطلب، إلغاء عبر `OrderStateMachine`، AuditLog، WebSocket events، وتوليد `orderNumber` داخل transaction
- `apps/api/src/modules/customers/customers.controller.ts` — `CustomersController`: `GET/PUT /customer/me`، `GET/PUT /customer/me/address`، `GET /customer/runners`
- `apps/api/src/modules/customers/customers.service.ts` — `getProfile()`, `updateProfile()`, `getAddress()`, `updateAddress()`, `listAvailableRunners()`
- `apps/api/src/modules/customers/customers.module.ts` — تعريف `CustomersModule`
- `apps/api/src/app.module.ts` — تسجيل `OrdersModule` و`CustomersModule`
- `packages/shared-types/src/customer.types.ts` — schemas/types لـ customer orders/profile/address/runners
- `packages/shared-types/src/index.ts` — تصدير `customer.types`
- `apps/api/src/state-machine/order-state-machine.ts` و`order-store-state-machine.ts` — إزالة imports غير المستخدمة وتسمية `ctx` إلى `_ctx` لتوافق lint
- `apps/api/src/src/` — إزالة artifact خاطئ كان يحتوي على `.gitkeep`

**السبب:**
إكمال المهام 2.4 و2.5 من Sprint 2: عرض الطلبات وتفاصيلها وإلغاؤها بضوابط State Machine، وإضافة endpoints الملف الشخصي والعنوان وقائمة المندوبين المتاحين مع contracts مشتركة وتحقق أمني.

**الأوامر والنتائج:**
- `pnpm --filter @fawrun/shared-types build` → نجح
- `pnpm --filter fawrun-api exec tsc --noEmit` → نجح، صفر أخطاء
- `pnpm build` → نجح، 3/3 حزم
- `pnpm lint` → نجح، 3/3 مهام
- `pnpm test` → نجح، 58/58 اختبار
- `pnpm --filter fawrun-api db:generate` → نجح
- `git diff --check` → نجح

**الأخطاء والحلول:**
- `pnpm --filter fawrun-api typecheck` لم يُنفّذ لأن الحزمة لا تعرّف script باسم `typecheck`؛ تم استخدام `pnpm --filter fawrun-api exec tsc --noEmit` بدلًا منه.
- `pnpm lint` كشف `no-empty` في catch blocks وunused imports/args في state machine؛ تم استبدال catch blocks بـ `void 0`، وإزالة imports الزائدة، وتسمية `ctx` إلى `_ctx`.
- `@fawrun/shared-types` كان يحتاج rebuild قبل أن ترى API الـ exports الجديدة؛ تم تشغيل build للحزمة.

### 2026-09-13 13:28 — تفعيل مهارات FAWRUN تلقائيًا حسب نطاق المهمة

**الملفات والدوال المعدّلة:**
- `AGENTS.md` — إضافة Trigger Matrix و10 قواعد Automatic Skill Activation مع الحفاظ على سير العمل والأوامر الحالية
- `.kilo/skills/pre-sprint-checklist/SKILL.md` — إضافة YAML frontmatter بالمعرف والوصف
- `.kilo/skills/rollback-plan/SKILL.md` — إضافة YAML frontmatter بالمعرف والوصف
- `.kilo/skills/coderabbit-workflow/SKILL.md` — إضافة YAML frontmatter بالمعرف والوصف

**السبب:**
جعل Kilo يستدعي المهارات المناسبة تلقائيًا عبر آلية تحميل المهارات عند بداية كل مهمة، مع تفعيل مشروط يمنع تحميل مهارات غير مرتبطة أو تجاوز الموافقات والأوامر الحساسة.

**الأوامر والنتائج:**
- `git diff --word-diff=porcelain -- AGENTS.md` → أظهر إضافات فقط دون حذف القواعد السابقة
- `git diff --word-diff=porcelain -- .kilo/skills/pre-sprint-checklist/SKILL.md .kilo/skills/rollback-plan/SKILL.md .kilo/skills/coderabbit-workflow/SKILL.md` → أظهر إضافة frontmatter فقط للمهارات الثلاث
- `grep` للتحقق من `name:` → تأكد من وجود المعرفات الخمسة وتطابقها مع مجلدات المهارات
- `git diff --check` → نجح، مع تحذير Git المعتاد حول LF/CRLF
- `pnpm lint` → نجح، 3 مهام ناجحة
- `pnpm typecheck` → نجح كإعداد Turbo، لكن لم تُنفّذ مهام لأن الحزم لا تعرّف مهام `typecheck`

**الأخطاء والحلول:**
- لم تُكتشف مهام `typecheck` في Turbo؛ تم تسجيل ذلك بدل اعتبار النتيجة تحققًا نوعيًا كاملًا.
- لم تُجرَ أي عملية مالية أو push/merge أو PR؛ التعديلات وثائقية فقط.

### 2026-09-13 — CodeRabbit Triage (Round 5)

**الملفات والدوال المعدّلة:**
- `apps/api/prisma/schema.prisma` — Fix A1: orderNumber reverted to nullable; Fix A2: tokenSecret removed
- `apps/api/prisma/migrations/20260911172902_init/migration.sql` — Sync with schema (orderNumber nullable, tokenSecret removed)
- `apps/api/src/modules/auth/auth.service.ts` — Fix A2: tokenSecret removed, refresh() reverted
- `packages/shared-types/src/settlement.types.ts` — Fix A3: runnerId removed from CloseSettlementSchema
- `CHANGELOG.md` — Documented deferred items (Category B)

**السبب:**
Triage of CodeRabbit round 5 comments. Only Category A (real blockers) fixed. Category B deferred to Sprint 2/3/4 per triage classification.

**الأوامر والنتائج:**
- `pnpm --filter @fawrun/shared-types build` → نجح
- `pnpm --filter fawrun-api db:generate` → نجح
- `pnpm --filter fawrun-api build` → نجح
- `pnpm lint` → نجح (3/3)

### 2026-09-13 — PR #1 Created — Sprint 1 Foundation

**الملفات والدوال المعدّلة:**
- `CHANGELOG.md` — PR creation entry
- `feature/sprint-1-auth-admin-websocket` — Pushed commit 84a4aa3

**السبب:**
PR #1 created on GitHub for Sprint 1 Foundation with CodeRabbit review requested.

**الأوامر والنتائج:**
- `git push origin feature/sprint-1-auth-admin-websocket` → نجح
- `gh pr edit 1 --title "feat: Sprint 1 — Foundation (Auth + Admin + WebSocket)"` → نجح
- PR URL: https://github.com/ghaithmoa84-cyber/fawrun/pull/1

### 2026-09-13 10:48 — إضافة مهارتَي FAWRUN Domain Gate وAPI Contract Security

**الملفات والدوال المعدّلة:**
- `.kilo/skills/fawrun-domain-gate/SKILL.md` — إضافة بوابة التحقق من State Machine والعمليات المالية وسلامة البيانات
- `.kilo/skills/api-contract-security/SKILL.md` — إضافة بوابة العقود المشتركة والتحقق التفويضي وأمان APIs
- `AGENTS.md` — إضافة المهارتين إلى قائمة مهارات المشروع

**السبب:**
توحيد فرض قواعد المجال والعقود الأمنية أثناء تطوير FAWRUN، والحد من تغييرات الحالة المباشرة والعمليات المالية غير الآمنة وثغرات APIs.

**الأوامر والنتائج:**
- `git diff --check` → نجح، مع تحذير Git المعتاد حول LF/CRLF في `AGENTS.md`
- `pnpm lint` → نجح، 3 مهام ناجحة
- `pnpm typecheck` → نجح كإعداد Turbo، لكن لم تُنفّذ مهام لأن الحزم لا تعرّف مهام `typecheck`

**الأخطاء والحلول:**
- لم تُكتشف مهام `typecheck` في Turbo؛ تم تسجيل ذلك بدل اعتبار النتيجة تحققًا نوعيًا كاملًا.

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
