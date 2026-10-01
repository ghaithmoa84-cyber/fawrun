# FAWRUN — Next Tasks

> **آخر تحديث:** 2026-10-01
> **المرجع الكامل:** [HANDOFF.md](HANDOFF.md)، [PROJECT_STATUS.md](PROJECT_STATUS.md)
> **خريطة التوثيق:** [PROJECT_STATUS.md §11](PROJECT_STATUS.md#11-خريطة-التوثيق--أي-ملف-يملك-أي-حقيقة)

---

## مؤجَّل بقرار — لا يُنفَّذ قبل MVP

| # | المهمة | الحالة | المسؤول | ملاحظات |
|---|---|---|---|---|
| B1 | **R2 + ميزة رفع الإيصالات — مؤجَّلة لما بعد MVP** | ⏔ **مؤجَّل بقرار 2026-09-30** | — | **ليست عائقاً — لا شيء في MVP يتوقف عليها.** القرار مسجَّل في [PROJECT_STATUS.md §12 · D5](PROJECT_STATUS.md#12-سجل-القرارات). عند المراجعة: (1) قراءة `R2_*` من Railway · (2) ربط bucket `fawrun-receipts` · (3) استبدال رسالة الخطأ الإنجليزية في `runner-pwa/src/components/ReceiptUploader.tsx:44` برسالة عربية · (4) اعتماد `docs/android/ROADMAP.md` Sprint 9 كموعد المراجعة. |

> **ما يجب معرفته:** المندوب لو حاول رفع إيصال اليوم يرى رسالة إنجليزية تسرّب أسماء `R2_*`. إصلاحها **جزء من هذه المهمة المؤجَّلة** وليس منفصلاً.

---

## مسار Android (مرقّم 8D–10 — لا يدخل ترقيم `Sprint N` الخاص بـ backend)

| # | المهمة | الأولوية | الحالة | المسؤول | ملاحظات |
|---|---|---|---|---|---|
| A0 | **Sprint 8D** — معماري | منجَز | ✅ **مُدمج في `1055b5f`** | @feature-dev | **247 `@Test` ناجح (+24)** · `lint` 0 · APKs موقّعة · تم تنظيف الـ DI وحذف 1MB والـ DTO mapping. |
| A1 | **Sprint 8E** — WebSocket Port | منجَز | ✅ **مُدمج في `b6acfaf`** | @code-architect | **261 `@Test` ناجح (+14)** · `lint` 0 · `assembleDebug` ناجح · تم فصل WebSocket عن `core` عبر `OrderEventsGateway` وإغلاق فجوة D23 (`account:verified`) واستهلاك `connectionState`. المرجع: [docs/android/ROADMAP.md](docs/android/ROADMAP.md). |
| A2 | **Firebase** — إعداد النشر | عالية | ✅ **مُنجَز** | المستخدم | تم إنشاء مشروع Firebase ووضع `google-services.json` الحقيقي وتوفير `Service Account`. |
| A3 | **Sprint 8F** — إشعارات FCM والنشر | عالية | ✅ **مُنجَز في `090d261`** | @feature-dev | تم إنشاء `DeviceToken` في الـ DB ونقاط نهاية `POST/DELETE /api/v1/customer/me/device-token` وخدمة `FcmService` وإرسال إشعارات تغيير حالة الطلب. |

---

## بنود Sprint 6 الـ backend المتبقية (موروثة — انظر `docs/sprints/Sprint 6 Brief.md`)

| # | المهمة | الأولوية | الحالة | المسؤول | ملاحظات |
|---|---|---|---|---|---|
| S1 | اختبار تكامل Pricing | متوسطة | ⏳ غير مُنجَز | @feature-dev | `apps/api/vitest.config.ts:21` يستثني `test/integration/**` — لا تغطية تسعير. |
| S2 | مراجعة أمنية موثّقة | عالية | ⏳ غير مُنجَز | @test-engineer | لا توجد وثيقة مراجعة أمنية موقّعة. |
| S3 | خط أساس الأداء `docs/performance-baseline.md` | متوسطة | ⏳ **الملف غير موجود** | @test-engineer | مُشار إليه في Sprint 6 Brief لكنه لم يُنشأ. |
| S4 | Sentry — تفعيل على الإنتاج | منخفضة | ⏸️ مؤجل | @feature-dev | `SENTRY_DSN` غير مضبوط. |
| S5 | **اختبار ميداني** بعميل حقيقي 1–2 | عالية | ⏳ غير مُنجَز | @test-engineer | **هذا هو المتبقّي من بند «اختبار يدوي لكل الشاشات»** — ليس تغطية شاشات آلية، بل رحلة طلب حقيقية على الإنتاج. |

---

> **ملاحظة:** أُلغي البند القديم «اختبار يدوي لكل الشاشات» — غطّته آليًا 223 اختبار Android + 184 اختبار وحدة. حُلّ محلًا بالبند S5 أعلاه.

---

للتفاصيل الكاملة عن الحالة، القرارات، والأخطاء المعروفة — ارجع إلى [PROJECT_STATUS.md](PROJECT_STATUS.md).
**نهاية الملف.**
