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

### 2026-09-18 10:40 — Sprint 3 Task 3.1: Runner endpoints implementation and fixes

**الملفات والدوال المعدّلة:**
- `apps/api/src/modules/runners/runners.service.ts` — دالة `getMyProfile`: إضافة `altPhone` للاستجابة؛ دالة `updateMyStatus`: إضافة فحص الطلبات النشطة قبل السماح بالانتقال AVAILABLE→UNAVAILABLE (يرفض بـ 422 عند وجود طلب نشط)؛ دالة `getActiveOrder`: إضافة `orderStores` مع `items` و `receipts`، و `pricing` (baseFee/peripheralFee/extraStoresFee/totalFee)، و `deliveryAddress` (lat/lng/description)
- `apps/api/src/modules/orders/services\runner-orders.service.ts` — دالة `startOrder`: إضافة `sound: 'status_update'` إلى جميع إرساليات WebSocket (customer, runner, admin)
- `packages/shared-types/src/runner.types.ts` — تحديث `RunnerProfileResponseSchema` بإضافة `altPhone`؛ إضافة `ActiveOrderDeliveryAddressSchema`، `ActiveOrderPricingSchema`، `ActiveOrderStoreItemSchema`، `ActiveOrderStoreSchema`؛ تحديث `ActiveOrderResponseSchema` ليشمل `deliveryAddress`، `pricing`، `orderStores`
- `CHANGELOG.md` — تسجيل التغييرات

**السبب:**
تطبيق Sprint 3 المهمة 3.1 (Runner endpoints) مع تصحيح الفجوات المكتشفة في المراجعة:
1. `PUT /api/v1/runner/me/status` يجب أن يرفض 422 عند محاولة التحول UNAVAILABLE مع طلب نشط (ASSIGNED/IN_PROGRESS/OUT_FOR_DELIVERY)
2. `GET /api/v1/runner/orders/active` يجب أن يشمل OrderStores + Receipts + Pricing + Delivery Address
3. `GET /api/v1/runner/me` يجب أن يُرجع altPhone
4. `PUT /api/v1/runner/orders/:id/start` WebSocket يجب أن يتضمن sound: 'status_update'

**الأوامر والنتائج:**
- `git checkout -b feature/sprint-3-runner-endpoints` → نجح
- `pnpm build` → نجح، 3/3 حزم
- `pnpm typecheck` → نجح، 3/3 حزم
- `pnpm lint` → نجح، 3/3 حزم
- `pnpm --filter fawrun-api test` → نجح، 7 ملفات و148 اختبارًا

**الأخطاء والحلول:**
- لا توجد أخطاء تشغيل

## [Unreleased]

### 2026-09-18 16:12 — Sprint 3 PR Created

**السبب:**
إنهاء موسم Sprint 3 وإنشاء PR على GitHub للمراجعة.

**الأوامر والنتائج:**
- `git add -A && git commit -m "feat: Sprint 3 - Runner execution flow..."` → نجح (53 files changed, commit 9134fda)
- `git push origin feature/sprint-3-runner-endpoints` → نجح
- `gh pr create --title "feat: Sprint 3 — Runner Execution Flow"` → نجح
- PR URL: https://github.com/ghaithmoa84-cyber/fawrun/pull/5
- `pnpm build && pnpm typecheck && pnpm lint && pnpm --filter fawrun-api test` → All passed (4/4 packages build, 0 type errors, 0 lint errors, 148/148 tests)

**الأخطاء والحلول:**
- `App.css` was re-added by `git add -A` after being untracked; deleted from filesystem and committed removal
- `.gitignore` updated to exclude `dev-dist/` build artifacts

### 2026-09-18 15:52 — Runner PWA scaffold: install + build fixes

**الملفات والدوال المعدّلة:**
- `apps/runner-pwa/package.json` — Fix `@types/react-dom` version `^19.3.7` → `^19.3.0` (19.3.7 doesn't exist on npm)
- `apps/runner-pwa/.oxlintrc.json` — Fix `ignores` → `ignorePatterns` (invalid oxlint config field); added `dev-dist/` to ignore patterns
- `apps/runner-pwa/src/hooks/useAuth.ts` → `useAuth.tsx` — Renamed from `.ts` to `.tsx` (file contains JSX; TypeScript couldn't parse JSX in `.ts` files)
- `apps/runner-pwa/src/main.tsx` — Fix import `./App.tsx` → `./App` (TS5097: `.tsx` extension requires `allowImportingTsExtensions`)
- `apps/runner-pwa/src/api/client.ts` — Fix axios config: `credentials: 'include'` → `withCredentials: true` (correct Axios property name)
- `apps/runner-pwa/src/components/StoreCard.tsx` — Add `ActiveOrderStoreReceipt` type and annotate `receipt` callback param
- `apps/runner-pwa/src/pages/AvailablePage.tsx` — Remove unused `useAuth` import; annotate `prev` param in `setProfile` callback; cast `response.data.status` to `RunnerProfileResponse['status']`
- `apps/runner-pwa/src/pages/ActiveOrderPage.tsx` — Remove unused `error` state + `setError` calls; annotate `.every`/`.some` callback params; remove unused `ItemsList` import
- `apps/runner-pwa/src/hooks/useWebSocket.ts` — Refactor from `useRef` to `useState` for socket (fixes React ref-during-render warning); remove unused `useRef` import

**السبب:**
Runner PWA scaffold had blocking errors preventing typecheck, lint, and build from passing. Root causes: missing `@types/react-dom` install (blocked `pnpm install`), incorrect file extension for JSX-containing file, wrong axios property name, invalid oxlint config schema, and missing type annotations for implicit-any callback params.

**الأوامر والنتائج:**
- `pnpm install` → Fixed by correcting `@types/react-dom` version
- `pnpm typecheck --filter runner-pwa` → نجح (0 errors)
- `pnpm lint --filter runner-pwa` → نجح (0 errors, 4 warnings for standard data-fetching patterns)
- `pnpm build --filter runner-pwa` → نجح (161 modules transformed, PWA manifest + service worker generated)

**الأخطاء والحلول:**
- `Cannot find module '@fawrun/shared-types'` → Resolved by `pnpm install` (pnpm workspace symlinks not yet linked)
- `TS1005: '>' expected` in `useAuth.ts:102` → JSX syntax in `.ts` file; renamed to `.tsx`
- `TS5097: An import path can only end with '.tsx'` → Removed explicit `.tsx` extension from import
- `TS2353: 'credentials' does not exist` → Changed to `withCredentials: true`
- `TS7006: Parameter implicitly has 'any' type` → Added explicit type annotations
- `oxlint: unknown field 'ignores'` → Changed to `ignorePatterns`

### 2026-09-18 17:04 — تصحيح إشعارات إعادة تعيين المندوب

**الملفات والدوال المعدّلة:**
- `apps/api/src/modules/orders/services/admin-order-command.service.ts` — دالة `assignRunner`: إرسال `order:reassigned` إلى `result.oldRunnerUserId` عند إعادة التعيين، ثم إرسال `order:assigned` مع `assignedPayload` و`sound: 'new_order'` إلى `result.runnerUserId`؛ إزالة إرسال `order:assignment_cancelled` أثناء إعادة التعيين.

**السبب:**
مطابقة spec: المندوب القديم يتلقى إشعار نقل الطلب، والمندوب الجديد يتلقى الطلب كاملًا، بينما يُ保留 `order:assignment_cancelled` لحالات إلغاء التعيين كليًا.

**الأوامر والنتائج:**
- `pnpm build && pnpm typecheck && pnpm lint && pnpm --filter fawrun-api test` → نجح؛ البناء وفحص الأنواع وlint نجحت، و7 ملفات اختبار و148 اختبارًا نجحت.

**الأخطاء والحلول:**
- لا توجد أخطاء تشغيل.

### 2026-09-17 21:20 — إكمال المرحلة R09 والتجميع النهائي وقرار الجاهزية الشامل

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-09-final-synthesis.md` — التقرير النهائي الشامل لمراجعة مشروع FAWRUN ودمج نتائج R01–R08
- `.kilo/plans/1789646023666-review-09-handoff.md` — حزمة تسليم المرحلة R09 وقرار الجاهزية الرسمي
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R09 إلى مكتملة وتسجيل القرار النهائي NO-GO وخطة المعالجة

**السبب:**
إنجاز التوليف النهائي الشامل لجميع المراجعات من R01 إلى R08 وتوحيد خط الأساس، وتصنيف 15 مشكلة P0 حرج و21 مشكلة P1 عالي، وإصدار قرار NO-GO الصريح مع تحديد معايير الدخول للمرحلة القادمة وخطة معالجة مرتبة حسب الأولوية دون أي تعديل على كود المصدر.

**الأوامر والنتائج:**
- مراجعة وتوليف 8 حزم تسليم (R01–R08) وتوحيد سجل انحراف المواصفات (Spec Drift).
- مطابقة 40 نقطة نهاية و15 نموذج Prisma ومصفوفات التزامن والعمليات المالية.
- تأكيد عدم إجراء أي تعديل على كود المصدر.

**الأخطاء والحلول:**
- لا توجد أخطاء تشغيل؛ اكتملت المراجعة بتوثيق دقيق ومبني حصريًا على الأدلة الموثقة.


### 2026-09-17 16:39 — تصحيح مسار R02 في مركز التنسيق

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-control-center.md` — تصحيح مسار حزمة R02 بعد تحديث حالة R08

**السبب:**
كان مسار R02 يحتوي على أرقام مكررة بالخطأ؛ تم تصحيحه ليطابق الملف الفعلي.

**الأوامر والنتائج:**
- قراءة ملف مركز التنسيق والتحقق من وجود `.kilo/plans/1789646023666-review-02-handoff.md` → تم التحقق

**الأخطاء والحلول:**
- خطأ نسخ في مسار R02 ← تم استبداله بالمسار الصحيح.


### 2026-09-17 16:38 — استلام وتسليم مراجعة R08

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-08-handoff.md` — حفظ نتائج مراجعة الاختبارات والنشر والواجهات
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R08 إلى مكتملة وتسجيل جاهزية R09

**السبب:**
تثبيت نتائج R08 في حزمة تسليم قابلة لإعادة الاستخدام، بما في ذلك غياب integration/E2E، ملف E2E config مفقود، غياب CI/CD والواجهات، وNo-op لمهمة typecheck.

**الأوامر والنتائج:**
- `pnpm build` → نجح، 3/3 حزم
- `pnpm lint` → نجح، 3/3 حزم
- `pnpm typecheck` → NO-OP
- `pnpm test` → نجح، 7 ملفات و148 اختبارًا
- عمليات glob للـ workflows وDocker وE2E وhealth → لم تُعثر على الملفات المتوقعة

**الأخطاء والحلول:**
- لا توجد أخطاء تشغيل؛ اكتملت المراجعة دون تعديل مصدر.


### 2026-09-17 16:14 — استلام وتسليم مراجعة R07

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-07-handoff.md` — حفظ نتائج مراجعة WebSocket والموثوقية والتفويض
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R07 إلى مكتملة وتسجيل جاهزية R08

**السبب:**
تثبيت نتائج R07 في حزمة تسليم قابلة لإعادة الاستخدام، بما في ذلك غياب Outbox، استخدام دور JWT القديم في الغرف، فشل إرسال Admin الصامت، وعدم وجود تنظيف reconnect/disconnect.

**الأوامر والنتائج:**
- قراءة وفحص event catalog وGateways وNotifications وSocket Registry وجميع emit call sites → اكتملت
- لم يتوفر خادم Socket.IO أو قاعدة بيانات للاختبار runtime

**الأخطاء والحلول:**
- انتهت جلسة R07 برسالة فارغة؛ أُعيدت الجلسة بسياق محفوظ وطُلب منها تسليم مختصر، فنجحت.


### 2026-09-17 16:08 — استلام وتسليم مراجعة R06

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-06-handoff.md` — حفظ نتائج مراجعة Pricing وLedger وSettlement والنزاهة المالية
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R06 إلى مكتملة وتسجيل جاهزية R07

**السبب:**
تثبيت نتائج R06 في حزمة تسليم قابلة لإعادة الاستخدام، بما في ذلك blockers مالية حرجة: عدم وجود تسوية، غياب rollback للإلغاء، تحديث حالة التسليم غير المشروط، وغياب فرض Append-only على مستوى قاعدة البيانات.

**الأوامر والنتائج:**
- `git log --oneline -5` → نجح
- قراءة وفحص ملفات Pricing وLedger وOrders وSettlement وSchema والمigrations وRollback plans → اكتملت
- لم تُشغّل `db:push` أو `migrate reset` أو أي عملية قاعدة بيانات

**الأخطاء والحلول:**
- محاولة `git show --stat` تعثرت بسبب استخدام pipeline مع `head`؛ تم الاعتماد على `git log` والقراءة المباشرة بدل تكرار الأمر.


### 2026-09-17 15:59 — استلام وتسليم مراجعة R05

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-05-handoff.md` — حفظ نتائج مراجعة State Machines وTransactions وConcurrency وIdempotency
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R05 إلى مكتملة وتسجيل جاهزية R06

**السبب:**
تثبيت نتائج R05 في حزمة تسليم قابلة لإعادة الاستخدام، بما في ذلك مخاطر P0 الخاصة بالتحديثات غير المشروطة وسباق الإلغاء مع التسليم، وتأكد المسار المالي داخل Transaction.

**الأوامر والنتائج:**
- `git show 2457aff --stat` → نجح
- `git status` → الشجرة مطابقة للـ Commit
- عمليات grep/read-only لحالات `status` وTransactions وraw SQL → اكتملت
- لم تُشغّل `db:push` أو `migrate reset` أو أي عملية قاعدة بيانات

**الأخطاء والحلول:**
- لا توجد أخطاء تشغيل؛ اكتملت المراجعة دون تعديل مصدر.


### 2026-09-17 15:18 — إنهاء مراجعة R03 بعد تعثر الجلسة القديمة

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-03-handoff.md` — حفظ نتائج مراجعة قاعدة البيانات وPrisma والمigrations
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R03 إلى مكتملة وتسجيل جاهزية R05

**السبب:**
الجلسة القديمة لـ R03 دخلت في تكرار ثم فشلت بسبب compaction؛ أُعيدت المراجعة كجلسة جديدة ضيقة القراءة فقط، مع حد أقصى للنتائج ومنع تكرار الاستكشاف، حتى لا تضيع الجلسة في حلقة.

**الأوامر والنتائج:**
- قراءة وفحص `schema.prisma` و5 ملفات migrations وخدمات Audit/Ledger/Auth/Order ذات الصلة فقط
- لم تُشغّل `db:push` أو `migrate reset` أو أي عملية تغير قاعدة البيانات

**الأخطاء والحلول:**
- خطأ الجلسة القديمة: تكرار استكشاف ثم `Compaction worker returned an empty response`
- الحل: بدء جلسة R03 جديدة بنطاق أضيق، وقراءة أولية واحدة، وإخراج Handoff مباشرة دون تكرار


### 2026-09-17 14:20 — استلام وتسليم مراجعة R04

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-04-handoff.md` — حفظ نتائج مراجعة REST API وAuthentication وAuthorization وSecurity
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R04 إلى مكتملة بشروط وبقاء R03 قيد التنفيذ

**السبب:**
تثبيت نتائج R04 في حزمة تسليم قابلة لإعادة الاستخدام، بما في ذلك جرد 40 endpoint وفجوات التحقق والصلاحيات وسلوك Refresh Token ومخاطر WebSocket.

**الأوامر والنتائج:**
- `pnpm --filter fawrun-api test` → نجح، 7 ملفات و148 اختبارًا
- `pnpm --filter fawrun-api lint` → نجح
- `pnpm --filter fawrun-api exec tsc --noEmit` → نجح
- فحص PEM الآمن → لم يُعثر على مادة مفتاح خاص متعقبة؛ الزوج المحلي موجود وصالح دون طباعة محتواه

**الأخطاء والحلول:**
- انتهت جلسة R04 برسالة فارغة؛ أُعيدت الجلسة بسياق محفوظ وطُلب منها تسليم مختصر، فنجحت.


### 2026-09-17 13:48 — استلام وتسليم مراجعة R02

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-02-handoff.md` — حفظ نتائج مراجعة البنية والوثائق والعقود
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R02 إلى مكتملة وتسجيل بقاء R03/R04 قيد التنفيذ

**السبب:**
تثبيت نتائج R02 في حزمة تسليم قابلة لإعادة الاستخدام، بما في ذلك نتائج build/lint/test وفجوات الواجهات وOutbox وtypecheck ومخاطر المفاتيح.

**الأوامر والنتائج:**
- `pnpm build` → نجح، 3/3 حزم
- `pnpm lint` → نجح، 3/3 حزم
- `pnpm typecheck` → لم يُنفذ أي task بسبب غياب مهمة typecheck في Turbo
- `pnpm test` → نجح، 7 suites و148 اختبارًا

**الأخطاء والحلول:**
- انتهت جلسة R02 الأولى بـ idle timeout؛ أُعيدت الجلسة بسياق محفوظ وطُلب منها تسليم مختصر بدل تكرار المراجعة، فنجحت.


### 2026-09-17 13:32 — تسليم R01 وتشغيل المراجعات المتوازية R02–R04

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-01-handoff.md` — نقل نتائج مراجعة Baseline وGit History إلى حزمة تسليم موحدة
- `.kilo/plans/1789646023666-review-control-center.md` — تحديث حالة R01 إلى مكتملة وتسجيل تشغيل R02/R03/R04 بالتوازي

**السبب:**
تمكين المتابعة السريعة للمراجعة الشاملة دون فقدان سياق R01، وتشغيل ثلاث مراجعات مستقلة على نفس Commit لتقليل الاعتماد على محادثة واحدة طويلة.

**الأوامر والنتائج:**
- لم تُنفذ أوامر تشغيل على المشروع؛ تم إنشاء ملفات تسليم وتحديث حالة التنسيق فقط.
- R02 وR03 وR04 أُطلقت كجلسات مراجعة مستقلة في الخلفية.

**الأخطاء والحلول:**
- لا توجد أخطاء مسجلة.


### 2026-09-17 13:14 — تنظيم خطة المراجعة الشاملة إلى مراجعات مستقلة

**الملفات والدوال المعدّلة:**
- `.kilo/plans/1789646023666-review-control-center.md` — مركز تنسيق المراجعات وخريطة التبعيات وحالات R00–R09
- `.kilo/plans/1789646023666-review-handoff-template.md` — قالب تسليم موحد للمراجعات المستقلة
- `.kilo/plans/1789646023666-review-01-baseline-history.md` — خطة مراجعة خط الأساس وGit history
- `.kilo/plans/1789646023666-review-02-architecture-docs.md` — خطة مراجعة البنية والوثائق والعقود
- `.kilo/plans/1789646023666-review-03-db-migrations.md` — خطة مراجعة قاعدة البيانات وPrisma والمigrations
- `.kilo/plans/1789646023666-review-04-api-auth-security.md` — خطة مراجعة REST API وAuthentication وAuthorization وSecurity
- `.kilo/plans/1789646023666-review-05-state-transactions-concurrency.md` — خطة مراجعة State Machines وTransactions وConcurrency وIdempotency
- `.kilo/plans/1789646023666-review-06-finance-ledger-settlement.md` — خطة مراجعة التسعير وLedger وSettlement
- `.kilo/plans/1789646023666-review-07-websocket-reliability.md` — خطة مراجعة WebSocket والموثوقية
- `.kilo/plans/1789646023666-review-08-tests-deployment-frontends.md` — خطة مراجعة الاختبارات والنشر والواجهات
- `.kilo/plans/1789646023666-review-09-final-synthesis.md` — خطة التجميع النهائي وقرار Go/No-Go

**السبب:**
تقسيم المراجعة الشاملة الطويلة إلى خطط مستقلة قابلة للتنفيذ في محادثات منفصلة، مع مركز تنسيق وقالب Handoff لمنع تكرار العمل وفقدان النتائج.

**الأوامر والنتائج:**
- لم تُنفذ أوامر تشغيل؛ العمل اقتصر على إنشاء وتنظيم ملفات الخطط.

**الأخطاء والحلول:**
- لا توجد أخطاء مسجلة.

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
