# خطة Triage CodeRabbit — Sprint 1 (فئة أ فقط)

## السياق

5 جولات مع CodeRabbit. المطلوب الآن Triage وليس تنفيذ كل الملاحظات. نُفّذ فقط الفئة أ (3 إصلاحات حقيقية)، ونوثّق التأجيل في CHANGELOG.

---

## الفئة أ — إصلاح الآن (Blockers حقيقية)

### A1 — orderNumber يجب أن يكون nullable

**الملف:** `apps/api/prisma/schema.prisma`
- `orderNumber String @unique` → `orderNumber String? @unique`

**الملف:** `apps/api/prisma/migrations/20260911172902_init/migration.sql`
- `"orderNumber" TEXT NOT NULL` → `"orderNumber" TEXT`

**السبب:** Sprint 2 Brief يوضح أن orderNumber يُولَّد **بعد** الإدراج (post-create via seqNumber). القيد NOT NULL يمنع إنشاء الطلب.

---

### A2 — حذف tokenSecret من قاعدة البيانات (ثغرة أمنية)

**الملف:** `apps/api/prisma/schema.prisma`
- إزالة `tokenSecret String` من نموذج RefreshToken

**الملف:** `apps/api/prisma/migrations/20260911172902_init/migration.sql`
- إزالة `"tokenSecret" TEXT NOT NULL,` من جدول RefreshToken
- **يبقى:** indexes على selector و tokenHash

**الملف:** `apps/api/src/modules/auth/auth.service.ts`
- `login()`: إزالة `tokenSecret: refreshTokenSecret,` من create call
- `refresh()`: العودة لـ `dto.refreshToken` بدل `${selector}:${token.tokenSecret}`

**السبب:** تخزين plaintext tokenSecret = ثغرة أمنية. التحقق الأصيل عبر bcrypt hash كافٍ.

---

### A3 — حذف runnerId من CloseSettlementSchema

**الملف:** `packages/shared-types/src/settlement.types.ts`
- إزالة `runnerId: z.string().trim().min(1, ...)` من CloseSettlementSchema
- الـ Schema يبقى: `operationalDate` + `notes` فقط

**السبب:** `runnerId` لا يُرسل من العميل — الخادم يحدده من الطلبات المكتملة لذلك اليوم.

---

## الفئة ب — تأجيل لـ Sprint 2/3 (توثيق في CHANGELOG)

| الملاحظة | الوجهة | السبب |
|----------|--------|--------|
| Refresh token rotation | Sprint 2 | تحسين أمني — يُنفّذ مع ميزة التدوير |
| Outbox pattern details | Sprint 3 | تفاصيل تنفيذ Sprint 3 |
| WebSocket event types (sound field) | Sprint 3 | Sprint 3 — إضافة SoundType |
| CORS empty allowlist handling | Sprint 2 | تحسين — لا يمنع Sprint 2 |
| Transaction concurrency (row locking) | Sprint 2/3 | تحسين — لا يمنع Sprint 2 |
| Settlement runnerId removal | Sprint 4 | مرتبط بـ Sprint 4 settlement |
| Rating transaction safety | Sprint 4 | مرتبط بـ Sprint 4 ratings |
| coderabbit-workflow SKILL.md | Sprint 2 | ملف غير موجود — يُنشئ لاحقاً |

---

## الفئة ج — قرارات تصميم متعمدة (نرفضها)

لا توجد في الجولة الأخيرة. جميع الملاحظات إما Blockers حقيقية (الفئة أ) أو مرتبطة بمراحل لاحقة (الفئة ب).

---

## تنفيذ CHANGELOG.md — توثيق التأجيل

**الملف:** `CHANGELOG.md`
**أضف entry تحت `## [Unreleased]`:**

```markdown
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
- `pnpm --filter @fawrun/shared-types build` → قيد التنفيذ
- `pnpm --filter fawrun-api db:generate` → قيد التنفيذ
- `pnpm --filter fawrun-api build` → قيد التنفيذ
```

---

## الترتيب التنفيذي

| الخطوة | المهمة | الاعتماديات |
|--------|--------|-------------|
| 1 | A1 — orderNumber revert (schema + migration) | لا شيء |
| 2 | A2 — tokenSecret revert (schema + migration + auth.service) | 1 |
| 3 | A3 — runnerId remove (settlement.types.ts) | لا شيء |
| 4 | CHANGELOG.md — Add triage entry | 1-3 |
| 5 | Verify: build + lint + diff check | 4 |

---

## التحقق النهائي

```bash
pnpm --filter @fawrun/shared-types build
pnpm --filter fawrun-api db:generate
pnpm --filter fawrun-api build
pnpm lint
git diff --check
```

**يجب أن تنجح جميعها.**

---

## المخاطر

1. العودة لـ `dto.refreshToken` في refresh() هي الحالة الأصلية — لا خطر
2. orderNumber nullable يسمح NULL — وهذا مقصود (يُولَّد بعد الإدراج)
3. لا توجد migration جديدة — كل التغييرات تراجعات
