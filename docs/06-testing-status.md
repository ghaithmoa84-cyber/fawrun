# 06. تقرير ووضعية الاختبارات (Testing Status & Coverage Audit)

يعمل نظام الاختبارات في المشروع باستخدام إطار **Vitest**، وينقسم إلى اختبارات وحدات (Unit Tests) واختبارات تكامل (Integration Tests) كما هو محدد في [apps/api/vitest.config.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/vitest.config.ts) و [apps/api/vitest.config.integration.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/vitest.config.integration.ts).

---

## إجمالي الاختبارات
- **العدد الإجمالي:** 184 اختبارًا (تم التحديث من 176).

---

## 1. الوحدات المختبرة ومستوى التغطية (Tested Modules & Test Suites)

### أ. اختبارات آلات الحالة (State Machines - Unit Tests)
- **آلة حالة الطلب (`OrderStateMachine`)**:
  - **الملف**: [apps/api/test/state-machine/order-state-machine.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/state-machine/order-state-machine.spec.ts#L1).
  - **المحتوى**: اختبار التغيرات المسموحة والمحظورة لـ 10 حالات، الحالات الانتهائية (Terminal States)، وسلامة جدول الانتقالات.
- **آلة حالة متجر الطلب (`OrderStoreStateMachine`)**:
  - **الملف**: [apps/api/test/state-machine/order-store-state-machine.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/state-machine/order-store-state-machine.spec.ts#L1).
  - **المحتوى**: اختبار تحولات الحالات (`PENDING` -> `PURCHASED` / `SKIPPED`).
- **آلة حالة المندوب (`RunnerStateMachine`)**:
  - **الملف**: [apps/api/test/state-machine/runner-state-machine.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/state-machine/runner-state-machine.spec.ts#L1).
  - **المحتوى**: اختبار التحول بين (`UNAVAILABLE`, `AVAILABLE`, `ON_MISSION`).

---

### ب. اختبارات التوثيق والتحقق (Auth & Input Validation Tests)
- **التحقق من صحة أرقام الواتساب السورية**:
  - **الملفات**: [apps/api/test/auth/whatsapp-validation.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/auth/whatsapp-validation.spec.ts#L1)، [apps/api/test/auth/whatsapp.schema.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/auth/whatsapp.schema.spec.ts#L1).
  - **المحتوى**: اختبار مخططات Zod لإنشاء ورسم تنسيق الأرقام المحلية (`09XXXXXXXX`).
- **التكامل للتوثيق والتوكنات (`Auth Integration`)**:
  - **الملف**: [apps/api/test/integration/auth/auth.integration.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/integration/auth/auth.integration.spec.ts#L1).
  - **المحتوى**: اختبار الربط الفعلي مع قاعدة البيانات لقاعدة `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` وتوليد توكنات RS256.
- **حارس المصادقة JWT (`JwtAuthGuard`)**:
  - **الملف**: [apps/api/test/auth/jwt-auth.guard.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/auth/jwt-auth.guard.spec.ts#L1).
  - **المحتوى**: اختبار التحقق من صلاحية التوكن، انتهاء الصلاحية، ومنع الوصول بدون توكن.
- **خط معالجة Zod العام (`ZodValidationPipe`)**:
  - **الملف**: [apps/api/test/common/zod-validation.pipe.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/common/zod-validation.pipe.spec.ts#L1).
  - **المحتوى**: اختبار تحويل أخطاء Zod إلى VALIDATION_ERROR مع الترجمة العربية.
- **خدمة إدارة المستخدمين (`UsersService`)**:
  - **الملف**: [apps/api/test/users/users.service.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/users/users.service.spec.ts#L1).
  - **المحتوى**: اختبار تفعيل/رفض/تعليق/إلغاء تعليق الحسابات وتسجيل أحداث AuditLog المرتبطة.

---

### ج. اختبارات دورة حياة الطلبات المكتملة (`Orders Integration Tests`)
- **إنشاء الطلب وحساب التسعير**:
  - **الملف**: [apps/api/test/integration/orders/create-order.integration.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/integration/orders/create-order.integration.spec.ts#L1).
  - **المحتوى**: إنشاء طلب حقيقي وتوليد رقم الطلب التسلسلي `FW-XXXXXX` وحساب الرسوم والتأكد من المعاملة المباشرة في DB.
- **تسليم الطلب وإنشاء قيود الدفتر**:
  - **الملف**: [apps/api/test/integration/orders/deliver-order.integration.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/integration/orders/deliver-order.integration.spec.ts#L1).
  - **المحتوى**: اختبار الانتقال إلى `DELIVERED` وتوليد 3 قيود حقيقية في `LedgerEntry` (إجمالي 100%، حصة المندوب 75%، حصة المنصة 25%).

---

### د. اختبارات الدفتر والتسويات والتقييمات (`Ledger, Ratings & Settlements`)
- **خدمة ومتحكم الدفتر (`Ledger Module`)**:
  - **الملفات**: [apps/api/test/ledger/ledger.service.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/ledger/ledger.service.spec.ts#L1)، [apps/api/test/ledger/ledger.controller.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/ledger/ledger.controller.spec.ts#L1).
  - **المحتوى**: اختبار التزويد المباشر للدفتر ومنع التعديل/الحذف وحساب الفلترة للإدارة.
- **خدمة التقييمات (`Ratings Service`)**:
  - **الملف**: [apps/api/test/ratings/ratings.service.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/ratings/ratings.service.spec.ts#L1).
  - **المحتوى**: اختبار نافذة الـ 24 ساعة للتقييم، وحساب متوسط تقييم المندوب، والتقييمات الخاصة.
- **مساعدات التسوية واليوم التشغيلي (`Settlements Helpers`)**:
  - **الملف**: [apps/api/test/settlements/settlements.cron.spec.ts](file:///d:/FAWRUNF/FAWRUN/apps/api/test/settlements/settlements.cron.spec.ts#L1).
  - **المحتوى**: اختبار استخراج اليوم التشغيلي حسب توقيت دمشق وفحص الطلبات المعلقة والتنبيهات.

---

## 2. المكونات والخدمات التي لم تُختبر تلقائياً (Untested & Gaps)

1. **متحكم الفواتير وخدمة Cloudflare R2 (`ReceiptsController` / `R2Service`)**:
   - لا توجد ملفات اختبارات أوتوماتيكية مخصصة لرفع صور الفواتير توليد Presigned URLs لـ S3/R2؛ يتم التثبت منها عبر خادم mock يدوياً.
2. **بوابات Socket.IO اللحظية (`OrdersGateway` / `AdminGateway`)**:
   - لم يتم إنشاء اختبارات E2E لربط الغرف والتحقق من التوكن داخل وصلات الـ WebSocket (`WsJwtAuthGuard`).
3. **تطبيقات الواجهة الأمامية (`admin-web`, `runner-pwa`, `customer-web`)**:
   - لا توجد اختبارات مكونات أو واجهات مستخدم باستخدام React Testing Library أو Playwright / Cypress حالياً.
4. **خدمة الإشعارات المباشرة (`NotificationsService`)**:
   - الخدمة حالياً مجرد Stub داخلي ولم يتم ربطها بمزود FCM/SMS خارجي متبوع باختبارات آلية.
