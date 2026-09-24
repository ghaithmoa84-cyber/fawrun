# FAWRUN — Handoff

> **آخر تحديث:** 2026-09-24
> **المصدر الوحيد للحقيقة:** [PROJECT_STATUS.md](PROJECT_STATUS.md)
> **الحالة العامة للمشروع:** [CURRENT_STATE.md](CURRENT_STATE.md)

---

## آخر Commit
| الحقل | القيمة |
|---|---|
| **Hash** | `b102dcfcf121781be80f5aeb2ce19cc4c832f025` |
| **الرسالة** | `docs: sync documentation with current state` |
| **الملفات** | AGENTS.md, CURRENT_STATE.md, PROJECT_BRIEF.md, docs/02–04–06–07 |

---

## حالة الإنتاج (Production)
| المكوّن | الحالة | ملاحظات |
|---|---|---|
| API | ✅ نشط | Railway — `https://fawrun-api-production.up.railway.app/api/v1` |
| Admin Dashboard | ✅ نشر | Vercel |
| Runner PWA | ✅ نشر | Vercel |
| Customer Web | ✅ نشر | Vercel |
| قاعدة البيانات | ✅ نشطة | PostgreSQL على Railway — Schema Drift = 0 |

**E2E:** نجح كاملًا على الإنتاج.

---

## الأنظمة والخدمات الجانبية
| الخدمة | الحالة | ملاحظات |
|---|---|---|
| Sentry | ⏸️ مؤجل | بعد المراجعة المحلية |
| Cloudflare R2 | ⚠️ قيم وهمية | القيم الحقيقية معلقة (انظر PROJECT_STATUS.md بند 3.1) |

---

## الفحص المحلي (Local Checks)
| الفحص | الحالة | التفاصيل |
|---|---|---|
| `pnpm lint` | ✅ نجح | 6/6 packages — 0 أخطاء |
| `pnpm typecheck` | ✅ نجح | 6/6 packages |
| `pnpm test` | ✅ نجح | 12 ملفات اختبار، 184 اختبارًا نجحوا جميعها |

## الخطوة التالية (Next Action)
1. ✅ تشغيل `pnpm lint` + `pnpm typecheck` + `pnpm test` محليًا — مكتمل.
2. اختبار يدوي لكل الشاشات على الواجهات الثلاث (Admin, Runner, Customer).

---

## قواعد التعامل (Engagement Rules)

### 1. Server is Source of Truth
- لا يتم حساب الرسوم أو تغيير الحالات على الواجهة الأمامية
- كل المنطق التجاري يعيش في الخلفية

### 2. فرض آلة الحالة
- كل تغيير في الحالة يجب أن يمر عبر آلة الحالة
- لا تُعدِّل حقل الحالة مباشرة على الموديل
- كل الانتقالات تُسجَّل في AuditLog

### 3. العمليات المالية
- كل عملية مالية = LedgerEntry
- المحاسبة append-only (بدون تحديث، بدون حذف)
- العمليات المتعددة الخطوات تستخدم معاملات قاعدة البيانات
- idempotent على العمليات الحريرة (مثال: DELIVERED)

### 4. سلامة البيانات
- حذف ناعم فقط (علامة isDeleted) — لا حذف نهائي
- AuditLog و LedgerEntry: لا يُحذف بأي حال
- orderNumber يُنشأ من seqNumber داخل معاملة بعد الحفظ

### 5. الأنواع أولاً
- DTOs الجديدة تذهب إلى packages/shared-types أولاً
- مخططات Zod مشتركة بين الخلفية والواجهة الأمامية
- لا استخدام any في واجهات برمجة مكتوبة

### 6. معايير API
- جميع النقاط تحت /api/v1/
- تحقق Zod على كل إدخال
- متغيّرات بيئة لكل الأسرار
- استجابات أخطاء معيارية (بند 9.0 من المواصفة)

### تدفق Sprint
1. code-architect يشغّل /pre-sprint
2. feature-dev ينفّذ النقاط
3. test-engineer يشغّل فحصًا محليًا كاملًا
4. **دفع مباشر إلى master**

### قواعد Git
- Commits نموذجية: feat:, fix:, refactor:, إلخ
- فرع لكل Sprint: feature/sprint-N-<description>
- **دفع مباشر إلى master**

### قواعد الأمان
- لا أسرار مُخزّنة في الكود
- تفويض على كل نقطة نهاية
- تحديث معدل لكل نقطة نهاية
- تحقق Zod على كل إدخال
- انظر وكيل test-engineer لقائمة أمان كاملة

### خطط التراجع
العمليات المالية (Ledger, Settlement, رسوم الطلب) تتطلب خطة تراجع موثقة قبل التنفيذ. استخدم أمر `/rollback-plan`.

---

للتفاصيل الكاملة حول المعمارية، القرارات، الأخطاء المعروفة، وحلولها — ارجع إلى [PROJECT_STATUS.md](PROJECT_STATUS.md).
**نهاية الملف.**
