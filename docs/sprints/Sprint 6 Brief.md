# Sprint 6 — QA + Launch (أسبوع)

## الهدف العام

ضمان جودة المنتج النهائي قبل الإطلاق: كتابة Integration Tests للـ State Machine والـ Pricing Engine، مراجعة أمنية شاملة، قياس أداء أساسي (Performance Baseline)، نشر نهائي على Railway + Vercel، واختبار ميداني أولي مع عميل واحد أو اثنين.

---

## المهام الفرعية

---

### 6.1 Integration Tests — Order State Machine

**الوصف:**
كتابة اختبارات تكاملية شاملة للـ Order State Machine تغطي كل الانتقالات والسيناريوهات الطرفية، وفق ما ورد في القسم 6.1.

**خطوات التنفيذ التفصيلية:**

1. إنشاء ملفات الاختبار في `apps/api/test/`:
   - `order-state-machine.integration.spec.ts`
   - `order-lifecycle.integration.spec.ts`

2. **سيناريوهات الاختبار المطلوبة:**

   **السيناريو الأساسي — دورة حياة كاملة ناجحة:**
   - إنشاء طلب (`PENDING_REVIEW`)
   - Admin يفتح للمراجعة (`UNDER_REVIEW`)
   - Admin يعتمد (`AWAITING_RUNNER`)
   - Admin يعيّن مندوب (`ASSIGNED`)
   - Runner يبدأ (`IN_PROGRESS`)
   - Runner ينتقل للتوصيل (`OUT_FOR_DELIVERY`)
   - Runner يُسلّم (`DELIVERED`)
   - التحقق من: AuditLog (كل الأحداث مسجلة)، LedgerEntry (3 سجلات)، Runner status (عاد AVAILABLE)، Customer إحصائيات

   **سيناريو المندوب المفضل:**
   - إنشاء طلب مع `preferredRunnerId` و `waitForPreferred: true`
   - Admin يعتمد → `AWAITING_PREFERRED_RUNNER` (إذا المندوب غير متاح)
   - ثم → `ASSIGNED` عند التوفر

   **سيناريو إلغاء من العميل:**
   - إلغاء من `PENDING_REVIEW` → نجاح
   - إلغاء من `ASSIGNED` → نجاح + Runner يعود AVAILABLE
   - إلغاء من `IN_PROGRESS` → فشل (422 BUSINESS_RULE_VIOLATION)

   **سيناريو إلغاء من Admin:**
   - إلغاء من `IN_PROGRESS` → نجاح
   - إلغاء من `OUT_FOR_DELIVERY` → نجاح
   - إلغاء من `DELIVERED` → فشل (لا تراجع عن DELIVERED)

   **سيناريو Idempotency:**
   - إرسال "تم التسليم" مرتين → التنفيذ مرة واحدة فقط (409 أو 200)
   - لا يتم إنشاء LedgerEntry مكرر

   **انتقالات ممنوعة:**
   - `DRAFT` → `ASSIGNED` (تخطي مراحل) → فشل
   - `DELIVERED` → أي حالة → فشل
   - `CANCELLED` → أي حالة → فشل

3. **إعداد Test Database:**
   - استخدام PostgreSQL منفصلة للاختبارات (أو نفس DB مع schema مختلف)
   - إعداد seed data: Admin, Customer, Runner
   - تنظيف البيانات بعد كل اختبار

4. **الأدوات:**
   - Jest كـ test framework
   - `@nestjs/testing` لبناء TestingModule
   - Supertest للـ HTTP requests
   - Prisma Client للتحقق من البيانات في DB مباشرة

**المخرج المتوقع:**
- ملفات اختبار تكاملية تغطي كل سيناريوهات State Machine
- جميع الاختبارات تمر بنجاح
- تغطية كل الانتقالات المسموحة والممنوعة

**الاعتماديات:** Sprints 1-5 مكتملة

---

### 6.2 Integration Tests — Pricing Engine

**الوصف:**
كتابة اختبارات تكاملية لمحرك التسعير تغطي جميع حالات الحساب، وفق القسم 8.

**خطوات التنفيذ التفصيلية:**

1. إنشاء ملف: `apps/api/test/pricing.integration.spec.ts`

2. **سيناريوهات الاختبار المطلوبة:**

   **الحساب الأساسي:**
   - طلب عادي (غير طرفي) مع متجر واحد: `totalFee = 60`
   - طلب طرفي مع متجر واحد: `totalFee = 100` (60 + 40)
   - طلب عادي مع متجرين: `totalFee = 80` (60 + 20)
   - طلب طرفي مع 3 متاجر: `totalFee = 140` (60 + 40 + 40)

   **حصص التوزيع:**
   - `totalFee = 60`: `runnerShare = 45`, `platformShare = 15`
   - `totalFee = 100`: `runnerShare = 75`, `platformShare = 25`
   - التحقق من: `runnerShare = Math.floor(totalFee * 0.75)`, `platformShare = Math.ceil(totalFee * 0.25)`

   **إعادة الحساب التلقائية:**
   - إنشاء طلب → `totalFee = 60`
   - Admin يعتمد مع `isPeripheral: true` → `totalFee = 100`
   - Runner يشتري من متجر أول → `totalFee = 100` (لا تغيير — المتجر الأول لا يُحسب إضافي)
   - Runner يشتري من متجر ثاني → `totalFee = 120` (+20)
   - التحقق من WebSocket event `order:fee_updated` عند كل تغيير

   **متاجر SKIPPED لا تُحسب:**
   - طلب مع 3 متاجر: متجر PURCHASED + متجر SKIPPED + متجر PURCHASED
   - `extraStoresFee = 20` (متجران PURCHASED فقط = متجر إضافي واحد)

   **القفل عند التسليم:**
   - بعد DELIVERED: الرسم لا يتغير حتى لو تغيرت بيانات أخرى

3. **تحقق من دالة `calculateFee()` في `@fawrun/shared-constants`:**
   - Unit tests مباشرة على الدالة مع مختلف المدخلات
   - التأكد من أن `Math.floor` للـ runnerShare و `Math.ceil` للـ platformShare يعملان بشكل صحيح (لا يوجد فقدان في الأرقام)

**المخرج المتوقع:**
- اختبارات تكاملية تغطي كل حالات التسعير
- اختبارات وحدة (unit tests) لدالة `calculateFee()`
- جميع الاختبارات تمر بنجاح

**الاعتماديات:** المهمة 6.1 (بنية الاختبارات)

---

### 6.3 Security Review — مراجعة أمنية

**الوصف:**
مراجعة أمنية شاملة لجميع الطبقات وفق القسم 14 من الوثيقة.

**خطوات التنفيذ التفصيلية:**

1. **التحقق من Helmet.js:**
   - التأكد من أن Helmet مُفعّل في `main.ts`
   - التحقق من HTTP security headers في Response: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, إلخ

2. **التحقق من Rate Limiting:**
   - `POST /auth/login`: 10 محاولات / 15 دقيقة لكل IP
   - `POST /auth/register`: 3 محاولات / ساعة لكل IP
   - باقي الـ endpoints: 100 طلب / دقيقة
   - اختبار: إرسال طلبات أكثر من الحد → التحقق من 429

3. **التحقق من Input Validation (Zod):**
   - مراجعة كل endpoint والتأكد من أن كل request body يُحقق عبر Zod
   - اختبار: إرسال بيانات غير صالحة → 400 VALIDATION_ERROR
   - اختبار: إرسال حقول إضافية غير متوقعة → يجب تجاهلها أو رفضها

4. **التحقق من SQL Injection:**
   - التأكد من أن جميع الاستعلامات تمر عبر Prisma (لا raw queries بدون parameterization)
   - اختبار: إرسال payload بأحرف SQL خاصة → لا تأثير

5. **التحقق من Passwords:**
   - bcrypt مع 12 rounds
   - التأكد من أن كلمات المرور لا تُخزّن بنص واضح أبداً
   - التأكد من أن كلمات المرور لا تُرجع في أي Response

6. **التحقق من JWT:**
   - RS256 (مفتاح خاص/عام) — ليس HS256
   - Access Token صالح ساعتين فقط
   - Refresh Token مُجزّأ بـ bcrypt في DB
   - التأكد من أن JWT payload لا يحتوي على بيانات حساسة

7. **التحقق من R2 Presigned URLs:**
   - صالحة 5 دقائق فقط
   - التحقق من النوع (jpg/png) والحجم (5MB) قبل الإصدار
   - لا يمكن الوصول للملفات بدون Presigned URL

8. **التحقق من HTTPS:**
   - التأكد من أن الاتصالات غير المشفرة مرفوضة في الإنتاج

9. **التحقق من Environment Variables:**
   - لا أسرار في الكود (grep للبحث عن hardcoded secrets)
   - `.env` في `.gitignore`
   - كل المفاتيح في env variables

10. **التحقق من CORS:**
    - محدود بـ Origins المعتمدة فقط
    - اختبار: طلب من origin غير معتمد → مرفوض

11. **التحقق من Database Connection Pooling:**
    - `connection_limit` مُعدّ في `DATABASE_URL` (القسم 14 و 15)

12. **التحقق من Ownership Checks:**
    - العميل لا يرى طلبات غيره
    - المندوب لا يرى طلبات غيره
    - مراجعة كل endpoint فيه ownership check

13. **التحقق من Soft Delete:**
    - لا حذف نهائي في أي مكان (القسم 17)
    - AuditLog و LedgerEntry: لا حذف أبداً
    - Receipts: `isDeleted = true` فقط

**المخرج المتوقع:**
- تقرير مراجعة أمنية يغطي جميع النقاط أعلاه
- إصلاح أي ثغرات مكتشفة
- اختبارات أمنية أساسية

**الاعتماديات:** Sprints 1-5 مكتملة

---

### 6.4 Performance Baseline — قياس الأداء

**الوصف:**
قياس أداء أساسي للنظام لتحديد خط الأساس قبل الإطلاق.

**خطوات التنفيذ التفصيلية:**

1. **قياس زمن الاستجابة لأهم الـ Endpoints:**
   - `POST /auth/login` — يجب أن يكون < 500ms
   - `POST /customer/orders` — يجب أن يكون < 1s
   - `GET /customer/orders` — يجب أن يكون < 300ms
   - `PUT /runner/orders/:id/deliver` — يجب أن يكون < 1s (transaction معقدة)
   - `POST /admin/settlements/close-day` — يُقاس بدون حد (يعتمد على عدد الطلبات)

2. **قياس WebSocket:**
   - زمن وصول الإشعار بعد تغيير الحالة
   - عدد الاتصالات المتزامنة المدعومة

3. **قياس أداء Database:**
   - التحقق من أن الفهارس (indexes) المُعرّفة في Prisma Schema تعمل
   - مراجعة الاستعلامات البطيئة (slow queries)
   - التحقق من `connection_limit` في Railway PostgreSQL

4. **قياس أداء R2:**
   - زمن توليد Presigned URL
   - زمن رفع صورة 5MB

5. **قياس حجم Frontend bundles:**
   - Admin Dashboard (Next.js)
   - Runner PWA (React + Vite)
   - Android APK size

6. **توثيق النتائج:**
   - إنشاء ملف `docs/performance-baseline.md` يحتوي على كل القياسات
   - يُستخدم كمرجع لمقارنة الأداء مستقبلاً

**المخرج المتوقع:**
- قياسات أداء موثقة لكل endpoint رئيسي
- تحديد أي bottlenecks واضحة
- ملف `docs/performance-baseline.md`

**الاعتماديات:** Sprints 1-5 مكتملة

---

### 6.5 Deployment نهائي — Railway + Vercel

**الوصف:**
نشر المشروع بالكامل على بيئة الإنتاج وفق القسم 15 من الوثيقة.

**خطوات التنفيذ التفصيلية:**

1. **Backend (NestJS + PostgreSQL) — Railway:**
   - إنشاء Project في Railway
   - **Service 1: Node.js App (NestJS):**
     - ربط الـ repository
     - Root directory: `apps/api`
     - Build command: يبني الـ packages المشتركة أولاً ثم الـ API
     - Start command: `node dist/main.js`
     - Port: 3000 (Railway يوفر HTTPS تلقائياً)
   - **Service 2: PostgreSQL Plugin:**
     - إنشاء PostgreSQL instance مدمج
     - نسخ `DATABASE_URL` مع `connection_limit=10`
   - **Environment Variables:**
     ```
     DATABASE_URL=        # مع connection_limit=10
     JWT_PRIVATE_KEY=     # مفتاح RS256 خاص
     JWT_PUBLIC_KEY=      # مفتاح RS256 عام
     R2_ACCOUNT_ID=
     R2_ACCESS_KEY_ID=
     R2_SECRET_ACCESS_KEY=
     R2_BUCKET_NAME=fawrun-receipts
     SENTRY_DSN=
     CORS_ORIGINS=        # URLs الـ Admin + Runner PWA
     ```
   - تشغيل Prisma migrations: `npx prisma migrate deploy`
   - التحقق من أن الـ API يعمل: `GET /api/v1/health` (إضافة health check endpoint إذا لم يكن موجوداً)

2. **Admin Dashboard (Next.js) — Vercel:**
   - إنشاء Project في Vercel
   - ربط الـ repository
   - Root directory: `apps/admin-web`
   - Framework: Next.js (Vercel يكتشفه تلقائياً)
   - **Environment Variables:**
     ```
     NEXT_PUBLIC_API_URL=https://<railway-url>/api/v1
     NEXT_PUBLIC_WS_URL=wss://<railway-url>
     ```
   - التحقق من أن الموقع يعمل ويتصل بالـ API

3. **Runner PWA (React + Vite) — Vercel:**
   - إنشاء Project في Vercel
   - ربط الـ repository
   - Root directory: `apps/runner-pwa`
   - Build command: `pnpm build`
   - Output directory: `dist`
   - **Environment Variables:**
     ```
     VITE_API_URL=https://<railway-url>/api/v1
     VITE_WS_URL=wss://<railway-url>
     ```
   - التحقق من أن PWA يعمل ويمكن تثبيته

4. **Receipts Storage — Cloudflare R2:**
   - إنشاء Bucket باسم `fawrun-receipts`
   - إنشاء API Token مع صلاحيات Read/Write
   - التحقق من أن رفع الصور يعمل من Runner PWA

5. **Error Tracking — Sentry:**
   - إنشاء Project في Sentry
   - إعداد Backend DSN في env variables
   - إعداد Frontend DSN في Admin + Runner PWA
   - التحقق من أن الأخطاء تظهر في Sentry Dashboard

6. **إنشاء حساب Admin أولي:**
   - إنشاء seed script يُنشئ أول Admin:
     ```
     name: "Admin"
     whatsapp: "<رقم admin>"
     password: "<كلمة مرور قوية>"
     role: ADMIN
     status: VERIFIED
     ```
   - تشغيل الـ seed: `npx prisma db seed`

7. **التحقق النهائي:**
   - تسجيل دخول Admin من Dashboard
   - إنشاء مندوب من Dashboard
   - تسجيل دخول Runner من PWA
   - WebSocket يعمل بين جميع الأطراف

**المخرج المتوقع:**
- Backend يعمل على Railway مع HTTPS
- Admin Dashboard يعمل على Vercel
- Runner PWA يعمل على Vercel
- Cloudflare R2 مُعدّ ويعمل
- Sentry مُعدّ ويرصد الأخطاء
- حساب Admin أولي موجود
- جميع الأطراف تتصل ببعضها بنجاح

**الاعتماديات:** المهام 6.1, 6.2, 6.3, 6.4

---

### 6.6 اختبار ميداني أولي

**الوصف:**
إجراء اختبار ميداني حقيقي مع عميل واحد أو اثنين ومندوب واحد للتحقق من أن النظام يعمل كما هو متوقع في سيناريو حقيقي.

**خطوات التنفيذ التفصيلية:**

1. **التحضير:**
   - إنشاء حسابات حقيقية: عميل واحد أو اثنين + مندوب واحد
   - تفعيل حسابات العملاء (Admin يتحقق عبر WhatsApp ويفعّل)
   - التأكد من أن تطبيق Android / PWA مُثبّت لدى العملاء
   - التأكد من أن Runner PWA مفتوح لدى المندوب

2. **السيناريو الأول — طلب بسيط:**
   - العميل يُنشئ طلباً بمادة واحدة من متجر واحد
   - Admin يعتمد ويعيّن المندوب
   - المندوب يستقبل الطلب (يجب أن يصل عبر WebSocket مع صوت)
   - المندوب يبدأ → يشتري → يرفع إيصال → ينتقل للتوصيل → يُسلّم
   - العميل يُقيّم المندوب
   - التحقق من: الإشعارات وصلت للعميل، الرسم صحيح، التسوية تُولّد

3. **السيناريو الثاني — طلب معقد (اختياري):**
   - العميل يُنشئ طلباً بمواد متعددة من متاجر مختلفة
   - المندوب يضيف متجراً جديداً + يتخطى متجراً
   - التحقق من أن الرسم يتحدّث ديناميكياً

4. **السيناريو الثالث — إلغاء (اختياري):**
   - العميل يُنشئ طلباً ثم يلغيه
   - التحقق من أن المندوب يُستلم إشعار إلغاء

5. **تسجيل الملاحظات:**
   - أي مشاكل في تجربة المستخدم
   - أي أخطاء تقنية (تظهر في Sentry)
   - أي تأخيرات أو بطء
   - اقتراحات تحسين

6. **إصلاح الأخطاء الحرجة:**
   - إصلاح أي أخطاء حرجة تم اكتشافها
   - إعادة النشر إذا لزم الأمر

**المخرج المتوقع:**
- اختبار ميداني ناجح مع سيناريو حقيقي واحد على الأقل
- قائمة ملاحظات وأخطاء (إن وُجدت) مع إصلاحات
- تأكيد أن النظام جاهز للإطلاق

**الاعتماديات:** المهمة 6.5

---

## معايير الإنجاز (Definition of Done) — Sprint 6

- [ ] Integration Tests للـ Order State Machine تمر — تغطي: دورة حياة كاملة، إلغاء من العميل (قبل/بعد IN_PROGRESS)، إلغاء من Admin، Idempotency، انتقالات ممنوعة
- [ ] Integration Tests للـ Pricing Engine تمر — تغطي: حساب أساسي، peripheral، متاجر متعددة، SKIPPED لا تُحسب، قفل عند التسليم
- [ ] مراجعة أمنية مكتملة تغطي: Helmet, Rate Limiting, Zod validation, SQL Injection protection, bcrypt passwords, RS256 JWT, Presigned URLs, HTTPS, env variables, CORS, connection pooling, ownership checks, soft delete
- [ ] قياسات أداء موثقة في `docs/performance-baseline.md`
- [ ] Backend منشور على Railway مع PostgreSQL مع `connection_limit=10`
- [ ] Admin Dashboard منشور على Vercel ويتصل بالـ API
- [ ] Runner PWA منشور على Vercel ويعمل كـ PWA
- [ ] Cloudflare R2 bucket `fawrun-receipts` مُعدّ ويعمل
- [ ] Sentry مُعدّ ويرصد الأخطاء من Backend وFrontends
- [ ] حساب Admin أولي موجود ويعمل
- [ ] اختبار ميداني ناجح: طلب حقيقي من عميل → مندوب → تسليم → تقييم → تسوية
- [ ] جميع الأخطاء الحرجة المكتشفة في الاختبار الميداني مُصلحة
