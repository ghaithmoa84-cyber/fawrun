# خطة إصلاح ملاحظات CodeRabbit — المتبقية

## السياق

CodeRabbit راجع PR #1 ووجد 21+ ملاحظة عبر 4 مراجعات. 4 ملاحظات توثيقية تم إصلاحها مسبقاً (commit 8faa553). هذه الخطة تغطي جميع الملاحظات المتبقية مصنفة حسب الأولوية.

**الحالة الحالية:**
- PR #1 مفتوح على `feature/sprint-1-auth-admin-websocket` → `master`
- آخر مراجعة CodeRabbit: 5186334889 (Sep 12 11:52) — 9 ملاحظات قابلة للتنفيذ
- تعليق `@coderabbitai review` تم إرساله (Sep 13 06:53) لمراجعة جديدة

---

## المجموعة 1: إصلاحات API Core (الأولوية الأعلى)

### 1.1 — apps/api/src/app.module.ts (🔴 Major)

**المشكلة:** JWT keys validation تتحقق من عدم الفراغ قبل التحليل، لكن لا تتحقق بعد. إذا كان env var غير فارغ لكنه PEM غير صالح، الفشل يحدث عند `crypto.createPrivateKey()` بدون رسالة واضحة.

**الإصلاح:**
- إضافة تحقق صريح بعد `crypto.createPrivateKey` / `createPublicKey` أن المفاتيح صالحة وقابلة للاستخدام
- التحقق الحالي (lines 49-54, 57-79) يكفي تقنياً — لكن CodeRabbit يريد صرامة أكبر

**الملف:** `apps/api/src/app.module.ts`
**التحقق:** `pnpm --filter fawrun-api build` + `pnpm --filter fawrun-api lint`

---

### 1.2 — apps/api/src/modules/auth/auth.service.ts (🟠 Major)

**المشكلة:** في `refresh()` (line 152-160)، الـ token lookup يجد التوكن بالـ selector ويتضمن user data، لكن الـ refresh response يُرجع `refreshToken: dto.refreshToken` بدلاً من إعادة بناء التوكن بالـ secret من DB. logout يعمل بشكل صحيح (line 206-218) لكن refresh لا يفعل الشيء نفسه.

**الإصلاح:**
- `refresh()` يجب أن يُعيد بناء التوكن كـ `${selector}:${token.secret}` أو يحفظ `tokenSecret` في DB بدلاً من الاعتماد على client-provided secret
- الأفضل: إضافة حقل `tokenSecret` في RefreshToken model أو إعادة تصميم آلية التوكن

**الملف:** `apps/api/src/modules/auth/auth.service.ts`
**الملف المشترك:** `packages/shared-types/src/auth.types.ts`

---

### 1.3 — apps/api/src/modules/users/users.service.ts (🟠 Major)

**المشكلة:** 3 عمليات (verify, reject, suspend) تفحص `user.status` قبل الـ transaction ثم تُحدّث داخل الـ transaction. الفحص الأولي خارج الـ transaction يمكن أن يسبب race condition.

**الإصلاح:**
- **verify:** نقل فحص `PENDING_VERIFICATION` داخل الـ transaction (lines 92-127)
- **reject:** نقل فحص `PENDING_VERIFICATION` داخل الـ transaction (lines 143-184)
- **suspend:** نقل فحص الحالة داخل الـ transaction (lines 186-221) — الحالية بالفعل تستخدم transaction لكن لا تفحص status داخلها

**الملف:** `apps/api/src/modules/users/users.service.ts`

---

### 1.4 — apps/api/src/common/pipes/zod-validation.pipe.ts (🟡 Minor)

**المشكلة:** `z.string().min(1)` يقبل `"   "` (whitespace فقط).

**الإصلاح:**
- استبدال `z.string().min(1)` بـ `z.string().trim().min(1)` في كل الـ schemas في `packages/shared-types/src/`

**الملفات:** `packages/shared-types/src/*.ts`

---

### 1.5 — packages/shared-types/src/order.types.ts (🟡 Minor)

**المشكلة:** `itemName: nonEmptyString` و `quantity: nonEmptyString` يقبلان whitespace-only.

**الإصلاح:**
- `nonEmptyString` مُعرّف أصلاً كـ `z.string().trim().min(1)` — هذا يكفي. لكن يجب التحقق أن `order.types.ts` يستخدم `nonEmptyString` فعلاً (checked — yes, lines 9-10). **هذا التعليق قديم أو خاطئ.**

**الملف:** `packages/shared-types/src/order.types.ts`
**الملف:** `packages/shared-types/src/runner.types.ts`

---

### 1.6 — packages/shared-types/src/runner.types.ts (🟡 Minor)

**المشكلة:** `AssignRunnerSchema.runnerId: z.string()` يقبل empty string.

**الإصلاح:**
- `runnerId: z.string().trim().min(1, 'runnerId cannot be empty')` (مُعرّف فعلاً في line 54-55!) — **قد تم إصلاحه بالفعل.**

---

### 1.7 — packages/shared-types/src/settlement.types.ts (🟠 Major)

**المشكلة:** `runnerId` في `CloseSettlementSchema` relation غير موجودة — لا يوجد `runnerId` في الـ schema. `operationalDate` regex صحيح لكن لا يطابق Prisma schema (String vs DateTime).

**الإصلاح:**
- إضافة `runnerId: z.string()` أو إزالته من الـ DTO إذا لم يكن مطلوباً
- التأكد أن Prisma schema `Settlement.operationalDate` هو `String` (هو كذلك في schema.prisma line 376)

**الملف:** `packages/shared-types/src/settlement.types.ts`

---

## المجموعة 2: إصلاحات Prisma & Schema

### 2.1 — apps/api/prisma/schema.prisma (🟠 Major)

**المشكلة:** `Order.orderNumber String? @unique` يسمح بقيمة فارغة/null كـ unique. PostgreSQL يعامل NULL كقيمة مختلفة لكل صف، مما يسمح بصفوف متعددة بدون orderNumber.

**الإصلاح:**
- الخيار A: تغيير إلى `String @unique` (requires non-null)
- الخيار B: الإبقاء كـ nullable مع trigger/constraint يمنع NULL
- الأفضل: الخيار A — `orderNumber` يجب أن يكون required دائماً بعد الإنشاء

**الملف:** `apps/api/prisma/schema.prisma`
**الملف المرتبط:** `apps/api/prisma/migrations/20260911172902_init/migration.sql`

---

### 2.2 — apps/api/prisma/migrations/20260911172902_init/migration.sql (🟠 Major)

**المشكلة:** `operationalDate` في migration.sql يختلف عن تعريفه في schema.prisma.

**الإصلاح:**
- التأكد من أن migration.sql يُنشئ `operationalDate` كـ `VARCHAR(10)` أو `TEXT` بدلاً من `TIMESTAMP`

**الملف:** `apps/api/prisma/migrations/20260911172902_init/migration.sql`

---

### 2.3 — apps/api/prisma/schema.prisma (🟠 Major)

**المشكلة:** LedgerEntry.runnerId و Settlement.closedByAdminId relation nullable بدون enforcement.

**الإصلاح:**
- **LedgerEntry.runnerId:** إذا كان required، تغيير إلى `runnerId String` بدون `?` وإضافة relation field
- **Settlement.closedByAdminId:** إذا كان optional بالتصميم، لا تغيير

**الملف:** `apps/api/prisma/schema.prisma`

---

## المجموعة 3: إصلاحات Scripts & Config

### 3.1 — apps/api/scripts/seed-admin.cjs (🔴 Critical → ✅ مُراجَع)

**الحالة:** CodeRabbit أشار لكلمة مرور `adminpass123` في سطر 6. الملف الحالي (الخط 7-10) يتحقق من `ADMIN_PASSWORD` env var. **قد تم إصلاحه في commit 03f6593.**

**التحقق:** لا حاجة لإصلاح — تحقق من أن الملف الحالي صحيح.

**الملف:** `apps/api/scripts/seed-admin.cjs`

---

### 3.2 — .kilo/skills/rollback-plan/SKILL.md (🔴 Critical)

**المشكلة:** مثال rollback في الـ SKILL.md يحذف بيانات مالية (SettlementItem, LedgerEntry) مباشرة — مخالف لقاعدة Append-Only.

**الإصلاح:**
- استبدال مثال rollback بحيث:
  - لا يحذف SettlementItem أو LedgerEntry أو Settlement نهائياً
  - يستخدم soft delete أو status transition بدلاً من hard delete
  - يحتفظ بسجل تعويضي (compensating entry) في LedgerEntry

**الملف:** `.kilo/skills/rollback-plan/SKILL.md`

> ملاحظة: الملف غير موجود حالياً في المسار المتوقع. قد يكون في `.kilo/agent/rollback-plan.md` أو مسار مختلف. يجب تحديد الموقع الدقيق.

---

### 3.3 — .coderabbit.yaml (🟡 Minor)

**المشكلة:** `path_instructions` خاصية غير معترف بها من CodeRabbit (line 34 exclusion). يجب إزالة `apps/api/prisma/migrations` من path_filters exclusion.

**الإصلاح:**
- إزالة `- "apps/api/prisma/migrations/"` من `path_filters` (إن وُجد)

**الملف:** `.coderabbit.yaml`

---

### 3.4 — .kilo/skills/coderabbit-workflow/SKILL.md (🟠 Major → 🟡 Minor)

**المشكلة:** CodeRabbit يذكر خطأ تحليل JSON عند سطر 77.

**الإصلاح:**
- مراجعة سطر 77 وتصحيح أي مشكلة في formatting أو content

**الملف:** `.kilo/skills/coderabbit-workflow/SKILL.md`

---

### 3.5 — .nvmrc (🟡 Minor)

**المشكلة:** القيمة `22.23.1` ليست nvm-compatible (لأنها تحتوي على نقطة إضافية في الإصدار).

**الإصلاح:**
- تغيير إلى `22.23.1` → `22.23` أو `22.23.1` مع مراجعة — في الحقيقة `22.23.1` صالح. CodeRabbit قال "node (22.23.1)" يُحدّث إلى `"22.23.1"`. **الملف الحالي صحيح.**

**الملف:** `.nvmrc` — لا حاجة لإصلاح

---

## المجموعة 4: إصلاحات Documentation

### 4.1 — docs/sprints/Sprint 2 Brief.md (🔴/🟠 Major → ✅ مُراجَع جزئياً)

**الحالة:** 3 ملاحظات تم إصلاحها (Fixes 2, 3 من الخطة السابقة). ملاحظة `orderNumber` (Critical) قد تحتاج إصلاح.

**الإصلاح المتبقي:**
- ملاحظة orderNumber في Sprint 2 Brief: إضافة توضيح كيف يتم توليد orderNumber قبل الإدراج أو جعله مؤقتاً nullable ثم تعيينه قبل commit

**الملف:** `docs/sprints/Sprint 2 Brief.md`

---

### 4.2 — docs/sprints/Sprint 3 Brief.md (🔴 Critical → ✅ مُراجَع)

**الحالة:** ملاحظة WebSocket emission تم إصلاحها (Fix 4). ملاحظة idempotency في التسليم قد تحتاج توضيح إضافي.

**الإصلاح المتبقي:**
- إضافة idempotency detail في مهمة 3.4 (delivery flow) — الحالية تذكر `DELIVERED` idempotent لكن بدون تفاصيل تنفيذ

**الملف:** `docs/sprints/Sprint 3 Brief.md`

---

### 4.3 — docs/sprints/Sprint 4 Brief.md (🔴 Critical)

**المشكلة:** Aggregate totals (runnerShare, platformShare) مشتقة من صيغ مختلفة عن item-level totals، مما يسبب تناقضات في التقريب.

**الإصلاح:**
- إضافة توضيح أن المجاميع تُشتق من مجموع SettlementItem rows مباشرة
- أو إضافة خوارزمية تقريب محددة للباقي

**الملف:** `docs/sprints/Sprint 4 Brief.md`

---

### 4.4 — CHANGELOG.md (🟡 Minor)

**المشكلة:** CodeRabbit أشار لـ line 65 أن عدد النماذج 17 بدلاً من 15. الملف الحالي (line 60) يذكر 15 — **قد تم إصلاحه.**

**التحقق:** لا حاجة لإصلاح — الملف الحالي صحيح.

---

### 4.5 — .kilo/agent/reviewer.md (🟠 Major → 🟡 Minor)

**المشكلة:** السطر 28 يسمح بحل threads جماعية بعد أن تصل blockers للصفر.

**الإصلاح:**
- تحديث التعليمات لحل كل thread على حدة حتى تُحل جميع الملاحظات

**الملف:** `.kilo/agent/reviewer.md`

---

## المجموعة 5: WebSocket Gateway Improvements

### 5.1 — apps/api/src/websocket/gateways/admin.gateway.ts (🟠 Major)

**المشكلة:** إذا كان `CORS_ORIGINS` unset أو فارغ، يسمح بـ `[]` (empty allowlist) — لا ينبغي أن يكون wildcard.

**الإصلاح:**
- التأكد أن `[]` كـ origin يعني "لا شيء" (لا عملاء يمكنهم الاتصال) — الحالية صحيحة تقنياً لكن CodeRabbit يريد explicit handling.

**الملف:** `apps/api/src/websocket/gateways/admin.gateway.ts`
**الملف:** `apps/api/src/websocket/gateways/orders.gateway.ts`

---

### 5.2 — apps/api/src/websocket/gateways/orders.gateway.ts (🟠 Major)

**المشكلة:** الـ gateway ينضم لـ `customer:{payload.sub}` و `runner:{payload.sub}` — CodeRabbit يقول يجب معالجة الـ JWT `sub` كـ User.id وليس كمرجع مباشر للغرف.

**الحالة الحالية:** الملف يستخدم `payload.sub` مباشرة. هذا يعتمد على ما إذا كان JWT `sub` يحمل userId.

**الإصلاح:**
- إذا كان `sub` = userId حالياً: لا تغيير
- إذا كان `sub` = something else: إضافة resolution step

---

## ترتيب التنفيذ المقترح

### السبرنت الأول (عاجل)
1. **1.1** — app.module.ts JWT validation hardening
2. **2.1** — schema.prisma orderNumber required constraint
3. **2.2** — migration.sql operationalDate type alignment
4. **3.2** — rollback-plan SKILL.md fix (إذا وُجد الملف)
5. **4.3** — Sprint 4 Brief.md settlement totals

### السبرنت الثاني
6. **1.2** — auth.service.ts refresh token redesign
7. **1.3** — users.service.ts transaction integrity
8. **1.4/1.5** — Zod whitespace validation fixes
9. **1.7** — settlement.types.ts runnerId

### السبرنت الثالث
10. **2.3** — LedgerEntry/Settlement relation enforcement
11. **3.3** — .coderabbit.yaml path_filters
12. **3.4** — coderabbit-workflow SKILL.md parsing error
13. **4.1/4.2** — Sprint 2/3 Brief remaining comments
14. **4.5** — reviewer.md bulk-resolve
15. **5.1/5.2** — WebSocket gateway improvements

---

## التحقق بعد كل إصلاح

```bash
# في apps/api
pnpm lint
pnpm typecheck
pnpm db:generate
```

```bash
# في workspace root
pnpm lint
pnpm typecheck
```

```bash
# Build verification
pnpm --filter fawrun-api build
pnpm --filter @fawrun/shared-types build
pnpm --filter @fawrun/shared-constants build
```

```bash
# Git checks
git diff --check
```

---

## مخاطر ومعيقات

1. **موقع rollback-plan SKILL.md:** غير موجود في المسار المتوقع — يجب تحديد الموقع أولاً
2. **auth.service.ts refresh token:** إعادة التصميم قد تؤثر على flow كامل — يحتاج مراجعة معمقة
3. **schema.prisma orderNumber:** تغيير من nullable إلى required قد يتطلب migration جديدة
4. **WebSocket rooms:** أي تغيير في room-key construction يؤثر على كل المندوبين المتصلين

---

## ملاحظات مُراجعة مسبقاً (✅)

- ملاحظة `seed-admin.cjs` password — **مُراجَع** — env var check موجود
- ملاحظة `runnerId` in AssignRunnerSchema — **مُراجَع** — `.trim().min(1)` موجود
- ملاحظة `CHANGELOG.md` model count — **مُراجَع** — الرقم 15 صحيح
- ملاحظة `.nvmrc` format — **مُراجَع** — الصيغة صحيحة
- ملاحظة S2 Brief runner state — **مُراجَع** — تم إصلاحه (Fix 2)
- ملاحظة S2 Brief AuditLog fromStatus — **مُراجَع** — تم إصلاحه (Fix 3)
- ملاحظة S3 Brief WebSocket transaction — **مُراجَع** — تم إصلاحه (Fix 4)
