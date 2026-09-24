# FAWRUN — Current State

> **آخر تحديث:** 2026-09-23
> **المصدر الوحيد للحقيقة:** [PROJECT_STATUS.md](../PROJECT_STATUS.md) و [HANDOFF.md](../HANDOFF.md)
> **مهم:** أي وكيل أو مطوّر يبدأ العمل يجب أن يقرأ هذا الملف كاملًا قبل أي تعديل.

## آخر Sprint مكتمل
Sprint 5 — كامل.

## الحالة العامة
- **الواجهات الثلاث** (Admin Dashboard, Runner PWA, Customer Web) — منشورة على **Vercel**.
- **وحدات settlements, ratings, receipts** — كاملة.
- **Schema Drift** = 0 (آخر فحص: 2026-09-23).
- **6 migrations** مُسجَّلة؛ الأخيرة `20260923154000_add_order_store_soft_delete`.

## البنية التحتية
| المكوّن | التقنية | الاستضافة |
|---|---|---|
| API | NestJS 12 + Prisma 5.22 + Node 20 | Railway (Dockerfile, `node:20-slim`) |
| Database | PostgreSQL | Railway (internal network) |
| Admin Dashboard | Next.js 14.2 | Vercel |
| Runner PWA | Vite + vite-plugin-pwa | Vercel |
| Customer Web | Vite | Vercel |

روابط الإنتاج — انظر [PROJECT_STATUS.md بند 1.1](https://github.com/ghaithmoa84-cyber/fawrun/blob/master/PROJECT_STATUS.md#11-حالة-الاستضافة-وقاعدة-البيانات--2026-09-23).

## جدول الأعمدة (Sprints 1–5)
كل Sprint من 1 إلى 5 — **مكتمل**.

لتفاصيل كل Sprint وأسبابها، انظر [HANDOFF.md](https://github.com/ghaithmoa84-cyber/fawrun/blob/master/HANDOFF.md).

## قرارات لا تُنقَض (Don'ts)
للقواعد الحرجة (ما لا يجب فعله أبدًا)، انظر [PROJECT_STATUS.md بند 2](https://github.com/ghaithmoa84-cyber/fawrun/blob/master/PROJECT_STATUS.md#2-قرارات-لا-تنقض- donts).

## الأوامر السريعة
للأوامر التشخيصية والعمليات اليومية، انظر [PROJECT_STATUS.md بند 4](https://github.com/ghaithmoa84-cyber/fawrun/blob/master/PROJECT_STATUS.md#35-اوامل-تشخيص-سريعة-railway-console).

---

**ملاحظة:** هذا الملف ملخص سريع. لكل تفاصيل معمارية، إعدادات، أخطاء معروفة وحلولها، وسجل الأحداث الكامل — ارجع إلى [PROJECT_STATUS.md](../PROJECT_STATUS.md).
**نهاية الملف.**
