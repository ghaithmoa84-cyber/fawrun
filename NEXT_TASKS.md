# FAWRUN — Next Tasks

> **آخر تحديث:** 2026-09-24
> **المرجع الكامل:** [HANDOFF.md](HANDOFF.md)، [PROJECT_STATUS.md](PROJECT_STATUS.md)

---

| # | المهمة | الأولوية | الحالة | المسؤول | ملاحظات |
|---|---|---|---|---|---|
| 1 | **مراجعة محلية** — اختبار يدوي لكل الشاشات على الواجهات الثلاث (Admin, Runner, Customer) | عالية | ⏳ معلَّقة | @test-engineer | بعد `pnpm lint` + `pnpm typecheck` + `pnpm test` اللذين نجحا محليًا (184 اختبارًا). يجب تغطية جميع المسارات: إنشاء طلب، الموافقة/الرفض، تعيين المندوب، شراء المتاجر، رفع الفواتير، التسليم، التقييمات، التسويات، إدارة المستخدمين. |
| 2 | **Sentry** — تفعيل تتبع الأخطاء على الإنتاج | متوسطة | ⏸️ مؤجل | @feature-dev | تم تأجيله بعد المراجعة المحلية. راجع `SENTRY_DSN` في [PROJECT_STATUS.md §3.1](PROJECT_STATUS.md) وأضف DSN حقيقي على Railway + Vercel. |
| 3 | **R2 حقيقي** — استبدال قيم R2 الوهمية بقيم حقيقية على الإنتاج | عالية | ⏸️ معلَّقة | @feature-dev | القيم الحالية (`<dummy-for-now>`) مضبوطة في Railway Variables. انظر [PROJECT_STATUS.md §3.1](PROJECT_STATUS.md) و[Q3.2](#04-module-status) و[HANDOFF.md §R2](HANDOFF.md). الخطوة التالية: ربط الـ bucket الحقيقي وتشغيل `node scripts/diff-schema.js` للتحقق. |

---

للتفاصيل الكاملة عن الحالة، القرارات، والأخطاء المعروفة — ارجع إلى [PROJECT_STATUS.md](PROJECT_STATUS.md).
**نهاية الملف.**
