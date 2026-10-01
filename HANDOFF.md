# FORERUN — Handoff

> **آخر تحديث:** 2026-10-01
> **نطاق هذا الملف:** قواعد التعامل ومسار العمل فقط. **ليس** مرجع الحقيقة الوحيد.
> **خريطة التوثيق (أي ملف يملك أي حقيقة):** [PROJECT_STATUS.md §11](PROJECT_STATUS.md#11-خريطة-التوثيق--أي-ملف-يملك-أي-حقيقة)

---

## آخر Commit
للحصول على تفاصيل آخر commit وتأريخ التغييرات، شغّل:
```bash
git log -1 --stat
```

## حالة الإنتاج (Production)
| المكوّن | الحالة | ملاحظات |
|---|---|---|
| API | ✅ نشط | Railway — `https://fawrun-api-production.up.railway.app/api/v1` |
| Admin Dashboard | ✅ نشر | Vercel |
| Runner PWA | ✅ نشر | Vercel |
| Customer Web | ✅ نشر | Vercel |
| Android App | ✅ APK موقَّع (v2 · 3 ABI) · جاهز للنشر | APK مباشر — مفتاح التوقيع موجود ومربوط بـ Firebase project `forerun-c819d`. تم إكمال Sprint 8D/8E/8F. |
| قاعدة البيانات | ✅ نشطة | PostgreSQL على Railway — 7 migrations مُطبَّقة — Schema Drift = 0 |

**E2E:** نجح كاملًا على الإنتاج.

---

## الأنظمة والخدمات الجانبية
| الخدمة | الحالة | ملاحظات |
|---|---|---|
| Telegram Bot | ✅ نشط | إرسال إشعارات فورية للإدارة عبر البوت عند إنشاء طلب جديد أو تسجيل عميل جديد (Railway) |
| Firebase FCM | ✅ نشط | إرسال Push Notifications لهواتف العملاء عند تحديثات الطلب (قناة `forerun_orders_channel` + رابط عميق) |
| Sentry | ⏸️ مؤجل | بعد المراجعة المحلية |
| Cloudflare R2 | ⏔ **مؤجَّل بقرار** | **ميزة رفع الإيصالات مُؤجَّلة لما بعد MVP** (قرار 2026-09-30). الكود موجود ويعمل لكنه غير مُفعَّل: `r2.service.ts:32` يرمي ما دام `R2_*` = `<dummy-for-now>`. التفاصيل والآثار في [PROJECT_STATUS.md §12 · D5](PROJECT_STATUS.md#12-سجل-القرارات). |

---

## الفحص المحلي (Local Checks)
| الفحص | الحالة | التفاصيل |
|---|---|---|
| `pnpm lint` | ✅ نجح | 6/6 packages — 0 أخطاء |
| `pnpm typecheck` | ✅ نجح | 6/6 packages |
| `pnpm test` | ✅ نجح | 14 ملفات اختبار، 192 اختبارًا نجحوا جميعها (**وحدة فقط** — تشمل اختبارات `telegram.service.spec.ts` و`fcm.service.spec.ts`) |
| Android Gradle `test` | ✅ نجح | **261 `@Test`** في 36 ملف اختبار · 0 lint errors — مشروع Gradle مستقل، لا يشمله `pnpm test` |

## الخطوة التالية (Next Action)
1. ✅ تشغيل `pnpm lint` + `pnpm typecheck` + `pnpm test` محليًا — مكتمل.
2. ⏭️ **Sprint 9 (Android UI Polish)** — المرجع: [docs/android/ROADMAP.md](docs/android/ROADMAP.md) (نقل 81 نصاً إلى `strings.xml`، توحيد ترجمة الحالات، معالجة الدوران وحقول الإدخال). وبشكل موازٍ: بنود Sprint 6 الـ backend المتبقية (اختبارات تكامل التسعير، مراجعة أمنية، خط أساس أداء، Sentry) — [docs/sprints/Sprint 6 Brief.md](docs/sprints/Sprint%206%20Brief.md).
3. ⏔ **R2 والإيصالات مؤجَّلة لما بعد MVP** بقرار 2026-09-30 — ليست عائقاً. المرجع: [PROJECT_STATUS.md §12 · D5](PROJECT_STATUS.md#12-سجل-القرارات).

> **ملاحظة:** أُلغي بند «اختبار يدوي لكل الشاشات» كخطوة أولى — 261 اختبار Android + 192 اختبار وحدة غطّتاه آليًا. المتبقّي هو **اختبار ميداني** بعميل حقيقي 1–2 (بند Sprint 6 غير المُنجَز).

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
4. **فرع لكل سبرنت ثم `git merge --no-ff` إلى `master`**

### قواعد Git
- Commits نموذجية: feat:, fix:, refactor:, إلخ
- فرع لكل Sprint: feature/sprint-N-<description>
- **فرع لكل سبرنت ثم `git merge --no-ff` إلى `master`** (لا fast-forward — يبقى سجل الدمج مرئيًا)

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
