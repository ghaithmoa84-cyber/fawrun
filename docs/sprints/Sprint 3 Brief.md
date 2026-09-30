# Sprint 3 — Execution Flow (أسبوعان)

## الهدف العام

بناء تدفق التنفيذ الكامل للمندوب: استقبال المهام وبدء التنفيذ، إدارة المتاجر داخل الطلب (شراء، تخطي، إضافة)، رفع صور الإيصالات عبر Cloudflare R2، الانتقال إلى التوصيل وتأكيد التسليم، بناء جميع WebSocket Events المتبقية مع أصوات الإشعار، وتسجيل LedgerEntry عند كل طلب مكتمل.

---

## المهام الفرعية

---

### 3.1 بناء Runner: استقبال المهام + بدء التنفيذ

**الوصف:**
بناء endpoints المندوب لعرض الطلب النشط وبدء التنفيذ، وفق القسمين 9.3 و 9.3.1.

**خطوات التنفيذ التفصيلية:**

1. إنشاء أو تحديث الملفات في `apps/api/src/modules/runners/`:
   - `runners.controller.ts` (إضافة routes `/runner/*`)
   - `runners.service.ts`

2. **`GET /api/v1/runner/me`** — بيانات الملف + الإحصائيات:
   - Auth: Runner فقط
   - يُرجع: `id`, `name`, `whatsapp`, `altPhone`, `status` (AVAILABLE/ON_MISSION/UNAVAILABLE), `avgRating`, `totalRatings`, `isVisible`

3. **`PUT /api/v1/runner/me/status`** — تغيير الحالة:
   - Auth: Runner فقط
   - يستقبل: `{ "status": "AVAILABLE" | "UNAVAILABLE" }`
   - يستخدم Runner Status Machine (القسم 6.3):
     - `UNAVAILABLE` → `AVAILABLE`: مسموح
     - `AVAILABLE` → `UNAVAILABLE`: مسموح فقط إذا لم يكن لديه طلب نشط
     - `ON_MISSION` → لا يمكن التغيير يدوياً (يتغير آلياً فقط)
   - يُرجع 422 إذا كان لديه طلب نشط ويحاول التحول لـ `UNAVAILABLE`

4. **`GET /api/v1/runner/orders/active`** — الطلب النشط الحالي:
   - Auth: Runner فقط
   - يجلب الطلب بحالة `ASSIGNED` أو `IN_PROGRESS` أو `OUT_FOR_DELIVERY` المُعيّن لهذا المندوب
   - إذا لم يوجد: يُرجع `null` أو 404
   - يشمل: Order + OrderItems + OrderStores (مع حالاتها) + Receipts + عنوان التسليم + التسعير

5. **`PUT /api/v1/runner/orders/:id/start`** — بدأت تنفيذ الطلب:
   - Auth: Runner فقط
   - Ownership check: الطلب يجب أن يكون مُعيّناً لهذا المندوب
   - يستخدم Order State Machine: `ASSIGNED` → `IN_PROGRESS`
   - تحديث: `startedAt = now()`
   - تسجيل `AuditLog`: `ORDER_STARTED`
   - WebSocket:
     - `order:status_changed` للعميل: `{ orderId, orderNumber, newStatus: 'IN_PROGRESS', oldStatus: 'ASSIGNED' }`
     - `order:status_changed` للإدارة

6. **تجربة استقبال الطلب (القسم 9.3.1):**
   - الـ Runner يبقى على شاشة "أنا متاح" مفتوحة في المتصفح (PWA)
   - عند تعيينه لطلب (من المهمة 2.7 في Sprint 2):
     - يصله حدث `order:assigned` عبر WebSocket مع صوت تنبيه `new_order`
     - تنتقل الشاشة تلقائياً لتفاصيل الطلب بدون أي إجراء منه
   - لا يوجد push notification في MVP — الـ PWA يجب أن يكون مفتوحاً في المتصفح
   - إذا كان التطبيق مغلقاً أو في الخلفية، لن يصل الإشعار

**المخرج المتوقع:**
- `GET /api/v1/runner/me` يعمل
- `PUT /api/v1/runner/me/status` يعمل مع Runner Status Machine
- `GET /api/v1/runner/orders/active` يُرجع الطلب النشط
- `PUT /api/v1/runner/orders/:id/start` يُنفّذ الانتقال `ASSIGNED` → `IN_PROGRESS`
- AuditLog وWebSocket events تُسجّل وتُرسل

**الاعتماديات:** Sprint 2 مكتمل

---

### 3.2 بناء Runner: إدارة OrderStores (شراء، تخطي، إضافة، حذف)

**الوصف:**
بناء endpoints إدارة المتاجر داخل الطلب من قبل المندوب، وفق القسم 9.3 والقسم 6.2.

**خطوات التنفيذ التفصيلية:**

1. **`GET /api/v1/runner/orders/:id/stores`** — قائمة متاجر الطلب:
   - Auth: Runner فقط
   - Ownership check
   - يُرجع كل OrderStores مع حالاتها وموادها

2. **`POST /api/v1/runner/orders/:id/stores`** — إضافة متجر جديد:
   - Auth: Runner فقط
   - Ownership check
   - الطلب يجب أن يكون بحالة `IN_PROGRESS`
   - يستقبل: `{ "storeName": "string" }`
   - يُنشئ `OrderStore` بـ:
     - `storeName`: النص المُرسل
     - `addedBy`: `"RUNNER"`
     - `isExtra`: `true` (متجر إضافي — يُحسب +20)
     - `status`: `PENDING`
   - تسجيل `AuditLog`: `STORE_ADDED`
   - لا يُعاد حساب الرسم حتى يصبح المتجر `PURCHASED`

3. **`DELETE /api/v1/runner/orders/:id/stores/:storeId`** — حذف متجر:
   - Auth: Runner فقط
   - Ownership check
   - مسموح فقط قبل `PURCHASED` (أي المتجر بحالة `PENDING`)
   - يُرجع 422 إذا كان المتجر بحالة `PURCHASED` أو `SKIPPED`
   - يُعيد ربط المواد التابعة للمتجر المحذوف (إذا وُجدت) — أو يحذفها حسب السياق
   - تسجيل `AuditLog`: `STORE_REMOVED`

4. **`PUT /api/v1/runner/orders/:id/stores/:storeId/purchase`** — تأكيد الشراء من متجر:
   - Auth: Runner فقط
   - Ownership check
   - يستخدم OrderStore State Machine: `PENDING` → `PURCHASED`
   - تحديث: `purchasedAt = now()`
   - **إعادة حساب الرسم** عبر `PricingService.recalculateFee()`:
     - يحسب عدد OrderStores بحالة `PURCHASED`
     - إذا أكثر من متجر واحد: `extraStoresFee += 20`
   - تسجيل `AuditLog`: `STORE_PURCHASED` + `ORDER_FEE_UPDATED` (إذا تغيّر)
   - WebSocket:
     - `order:store_purchased` للعميل: `{ orderId, storeName }`
     - `order:fee_updated` للعميل (إذا تغيّر الرسم): `{ orderId, oldFee, newFee, reason }`
   - Response:
     ```json
     {
       "orderStore": { "id": "...", "status": "PURCHASED" },
       "updatedFee": { "extraStoresFee": 20, "totalFee": 80 },
       "customerNotified": true
     }
     ```

5. **`PUT /api/v1/runner/orders/:id/stores/:storeId/skip`** — تخطي متجر:
   - Auth: Runner فقط
   - Ownership check
   - يستخدم OrderStore State Machine: `PENDING` → `SKIPPED`
   - لا يُعيد حساب الرسم (المتاجر المتخطاة لا تُحسب)
   - تسجيل `AuditLog`: `STORE_SKIPPED`

6. **`POST /api/v1/runner/orders/:id/items`** — إضافة مادة لمتجر موجود:
   - Auth: Runner فقط
   - Ownership check
   - الطلب يجب أن يكون بحالة `IN_PROGRESS`
   - يستقبل: `{ "itemName": "string", "quantity": "string", "orderStoreId": "string" }`
   - يُنشئ `OrderItem` مرتبط بالـ `OrderStore` المحدد
   - تسجيل `AuditLog`: (يدخل ضمن تعديلات الطلب)

**المخرج المتوقع:**
- جميع endpoints إدارة المتاجر تعمل
- State Machine تُطبّق على كل انتقال
- الرسم يُعاد حسابه عند كل `PURCHASED`
- AuditLog وWebSocket events تُسجّل وتُرسل

**الاعتماديات:** المهمة 3.1 + Pricing Engine (Sprint 2)

---

### 3.3 بناء Runner: رفع صور الإيصالات (Cloudflare R2)

**الوصف:**
بناء نظام رفع وحذف صور الإيصالات عبر Cloudflare R2 وفق القسم 12 من الوثيقة.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/receipts/`:
   - `receipts.module.ts`
   - `receipts.controller.ts`
   - `receipts.service.ts`
   - `r2.service.ts` (خدمة Cloudflare R2)

2. إعداد `r2.service.ts`:
   - استخدام `@aws-sdk/client-s3` (Cloudflare R2 متوافق مع S3 API)
   - تهيئة الاتصال بـ:
     - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` من env
     - `R2_BUCKET_NAME`: `fawrun-receipts`
     - Endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
   - دالة `generatePresignedUrl(key: string)`: تُولّد Presigned URL للرفع المباشر (صالحة 5 دقائق)
   - دالة `deleteObject(key: string)`: تحذف الملف من R2

3. **`POST /api/v1/runner/orders/:id/stores/:storeId/receipts/presigned-url`** — طلب Presigned URL:
   - Auth: Runner فقط
   - Ownership check (الطلب مُعيّن لهذا المندوب)
   - **التحقق قبل إصدار الـ URL:**
     - نوع الملف: `jpg` أو `png` فقط (يُرسل في body أو query)
     - حجم الملف: لا يتجاوز 5 MB (يُتحقق على Frontend أيضاً)
     - عدد الصور الحالية لهذا المتجر: لا يتجاوز 5 صور
   - توليد Key بالشكل: `receipts/{orderId}/{orderStoreId}/{timestamp}_{random}.jpg`
   - Response:
     ```json
     {
       "presignedUrl": "https://...",
       "r2Key": "receipts/abc/def/1234_xyz.jpg",
       "expiresIn": 300
     }
     ```

4. **`POST /api/v1/runner/orders/:id/stores/:storeId/receipts`** — تأكيد رفع الإيصال:
   - يُستدعى بعد رفع الصورة مباشرة لـ R2 من Frontend
   - يستقبل: `{ "r2Key": "string" }`
   - يُنشئ سجل `Receipt` في DB:
     - `orderStoreId`
     - `imageUrl`: URL العام للصورة
     - `r2Key`: المفتاح في R2
     - `isDeleted: false`
     - `uploadedAt: now()`
   - تسجيل `AuditLog`: `RECEIPT_UPLOADED`

5. **`DELETE /api/v1/runner/orders/:id/stores/:storeId/receipts/:receiptId`** — حذف صورة:
   - Auth: Runner فقط
   - Ownership check
   - **قبل `PURCHASED`:**
     - الخادم يحذف الملف من R2 فعلياً
     - يُحدّث: `isDeleted = true`, `deletedAt = now()`
   - **بعد `PURCHASED`:**
     - `isDeleted = true`, `deletedAt = now()` في DB فقط
     - الملف يبقى في R2 للمراجعة (القسم 12)
   - تسجيل `AuditLog`: `RECEIPT_DELETED`

6. **ملاحظة مهمة:** الـ Frontend يرفع الصورة مباشرة لـ R2 عبر Presigned URL — لا تمر عبر الخادم (القسم 12).

**المخرج المتوقع:**
- Cloudflare R2 مُعدّ ومتصل
- Presigned URL يُولَّد مع تحقق من النوع والحجم والعدد
- سجلات Receipt تُنشأ في DB بعد الرفع
- الحذف يعمل بشكل مختلف قبل/بعد Purchase
- AuditLog يُسجّل كل عملية

**الاعتماديات:** المهمة 3.2

---

### 3.4 بناء Runner: الانتقال للتوصيل + تأكيد التسليم

**الوصف:**
بناء endpoints الانتقال إلى مرحلة التوصيل وتأكيد التسليم النهائي، وفق القسم 9.3 والقسم 6.1.

**خطوات التنفيذ التفصيلية:**

1. **`PUT /api/v1/runner/orders/:id/proceed-to-delivery`** — الانتقال إلى التوصيل:
   - Auth: Runner فقط
   - Ownership check
   - يستخدم Order State Machine: `IN_PROGRESS` → `OUT_FOR_DELIVERY`
   - تسجيل `AuditLog`: `PROCEEDED_TO_DELIVERY`
   - WebSocket:
     - `order:out_for_delivery` للعميل: `{ orderId }` (مع صوت `status_update`)
     - `order:status_changed` للإدارة

2. **`PUT /api/v1/runner/orders/:id/deliver`** — تم التسليم:
   - Auth: Runner فقط
   - Ownership check
   - يستخدم Order State Machine: `OUT_FOR_DELIVERY` → `DELIVERED`
    - **Idempotent (القسم 17):** إذا أُرسلت مرتين، تُنفَّذ مرة واحدة فقط:
      - إذا كان الطلب بالفعل بحالة `DELIVERED`: يُرجع 409 CONFLICT (أو 200 مع البيانات الحالية) — لا يُنشئ LedgerEntry مكرر، لا يُحدّث Customer/Runner إحصائيات، لا يُكرّر AuditLog
      - الحماية عبر State Machine: الانتقال الوحيد المسموح هو `OUT_FOR_DELIVERY` → `DELIVERED`، وعند الوصول لـ `DELIVERED` لا يمكن تكرار الانتقال
      - أي استدعاء لاحق مع الطلب بالفعل `DELIVERED` لا يُغيّر أي حالة
   - داخل Prisma transaction واحدة:
     a. تحديث Order:
        - `status` → `DELIVERED`
        - `deliveredAt` = now()
     b. **إعادة حساب الرسم النهائي** عبر `PricingService.recalculateFee()`:
        - هذا هو الرسم المقفل النهائي
     c. تحديث Customer:
        - `completedOrders += 1`
        - `totalFeesPaid += totalFee`
     d. تحديث Runner status (Runner Status Machine — القسم 6.3):
        - `runner.status` → `AVAILABLE` (آلياً بعد التسليم)
     e. **إنشاء LedgerEntry** (القسم 17 — كل عملية مالية = LedgerEntry):
        - Entry 1: `type: ORDER_FEE_TOTAL`, `amount: totalFee`, `orderId`, `runnerId`
        - Entry 2: `type: RUNNER_SHARE`, `amount: runnerShare`, `orderId`, `runnerId`
        - Entry 3: `type: PLATFORM_SHARE`, `amount: platformShare`, `orderId`, `runnerId`
     f. تسجيل `AuditLog`: `ORDER_DELIVERED` + `LEDGER_ENTRY_CREATED`
   - WebSocket:
     - `order:delivered` للعميل: `{ orderId, deliveredAt }` (مع صوت `success`)
     - `order:status_changed` للإدارة

**المخرج المتوقع:**
- `PUT /api/v1/runner/orders/:id/proceed-to-delivery` يعمل
- `PUT /api/v1/runner/orders/:id/deliver` يعمل وهو Idempotent
- الرسم النهائي مقفل عند التسليم
- LedgerEntry يُنشأ (3 سجلات)
- Runner status يعود لـ `AVAILABLE` آلياً
- Customer إحصائيات تُحدَّث
- كل شيء في transaction واحدة

**الاعتماديات:** المهام 3.1, 3.2, Pricing Engine (Sprint 2)

---

### 3.5 بناء Ledger Module

**الوصف:**
بناء module الـ Ledger (السجل المالي) وفق القسم 5 (model LedgerEntry) والقسم 17.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/ledger/`:
   - `ledger.module.ts`
   - `ledger.controller.ts`
   - `ledger.service.ts`

2. في `ledger.service.ts`:
   - دالة `createEntry(data)`: تُنشئ سجل `LedgerEntry`
     - الحقول: `orderId?`, `runnerId?`, `type` (LedgerEntryType), `amount`, `description`, `meta?`
     - **الجدول Append-Only**: لا يوجد `updatedAt` — لا حذف ولا تعديل أبداً (القسم 5 و 17)
   - دالة `getEntriesByOrder(orderId)`: جلب كل entries لطلب معيّن
   - دالة `getEntriesByRunner(runnerId)`: جلب entries المندوب (حصته فقط — وفق صلاحيات القسم 7.2)

3. **`GET /api/v1/admin/ledger`** — السجل المالي (Admin فقط):
   - يدعم Pagination
   - يدعم Filters: `runnerId`, `type`, `dateFrom`, `dateTo`
   - يعرض كل الـ entries

4. **أنواع LedgerEntry** (القسم 5):
   ```
   ORDER_FEE_TOTAL    — إجمالي رسم الخدمة المحصّل
   RUNNER_SHARE       — حصة المندوب (75%)
   PLATFORM_SHARE     — حصة FAWRUN (25%)
   SETTLEMENT_PAID    — المندوب سدّد حصة FAWRUN
   ADMIN_ADJUSTMENT   — تعديل يدوي من الإدارة
   ```

5. ربط Ledger بعملية التسليم (المهمة 3.4):
   - التأكد من أن `deliver()` في orders.service يُنشئ 3 entries عند كل تسليم

**المخرج المتوقع:**
- `LedgerService` مع `createEntry()` يعمل
- `GET /api/v1/admin/ledger` يعمل مع Pagination وFilters
- الجدول Append-Only — لا update/delete
- LedgerEntry يُنشأ تلقائياً عند كل تسليم

**الاعتماديات:** المهمة 3.4

---

### 3.6 بناء WebSocket Events الكاملة + أصوات الإشعار

**الوصف:**
استكمال جميع أحداث WebSocket المتبقية وإضافة أنواع أصوات الإشعار، وفق القسمين 10 و 10.4.

**ذرّية إرسال الأحداث (Outbox Pattern):**

يتم تخزين كل حدث WebSocket في جدول `OutboxEntry` ضمن نفس الـ Prisma transaction التي تُنفّذ تغيير الحالة وتسجيل AuditLog. بعد نجاح الـ transaction، يُرسل الـ Outbox Dispatcher الأحداث إلى WebSocket مع إعادة محاولة تلقائية (retry) حتى التأكيد. القاعدة:

- العميل لا يجب أن يرى حالة جديدة (`status`) في الـ API بدون الحدث المقابل في WebSocket — والعكس صحيح
- فشل إرسال WebSocket لا يُلغي العملية (لا يوجد transaction roll-back) — الحدث يبقى في OutboxEntry بحالة PENDING حتى يُرسل بنجاح ثم يُحدّث إلى SENT
- كل حدث يُسجّل في OutboxEntry مع معرّف فريد وتاريخ محاولة الإرسال
- هذا يضمن أن كل حالة تغيير مُسجّلة في AuditLog ومُعلنة عبر WebSocket بشكل موثوق

**خطوات التنفيذ التفصيلية:**

1. **مراجعة وتكملة أحداث العميل** (القسم 10.1) — يستقبلها العميل في room `customer:{customerId}`:

   | الحدث | الـ Payload | متى يُرسل |
   |-------|----------|----------|
   | `order:status_changed` | `{ orderId, orderNumber, newStatus, oldStatus }` | عند كل تغيير حالة |
   | `order:runner_assigned` | `{ orderId, runnerName }` | عند تعيين مندوب |
   | `order:fee_updated` | `{ orderId, oldFee, newFee, reason }` | عند تغيير الرسم |
   | `order:store_purchased` | `{ orderId, storeName }` | عند شراء من متجر |
   | `order:out_for_delivery` | `{ orderId }` | عند انتقال المندوب للتوصيل |
   | `order:delivered` | `{ orderId, deliveredAt }` | عند التسليم |
   | `order:cancelled` | `{ orderId, reason, cancelledBy }` | عند الإلغاء |
   | `account:verified` | `{ message: "تم تفعيل حسابك" }` | عند تفعيل الحساب |

2. **مراجعة وتكملة أحداث Runner** (القسم 10.2) — في room `runner:{runnerId}`:

   | الحدث | الـ Payload | متى يُرسل |
   |-------|----------|----------|
   | `order:assigned` | `{ orderId, orderNumber, customerName, deliveryAddress, items, estimatedFee }` | عند تعيين طلب |
   | `order:reassigned` | `{ orderId }` | عند إعادة تعيين (نقل الطلب لمندوب آخر) |
   | `order:assignment_cancelled` | `{ orderId, reason }` | عند إلغاء التعيين |

3. **مراجعة وتكملة أحداث Admin** (القسم 10.3) — في room `admin:all`:

   | الحدث | الـ Payload | متى يُرسل |
   |-------|----------|----------|
   | `order:new` | `{ orderId, orderNumber, customerName, itemCount }` | عند إنشاء طلب جديد |
   | `order:status_changed` | `{ orderId, orderNumber, newStatus }` | عند تغيير حالة أي طلب |
   | `order:needs_attention` | `{ orderId, reason }` | عند حالات تحتاج تدخلاً |
   | `user:new_registration` | `{ userId, userName, whatsapp }` | عند تسجيل عميل جديد |
   | `settlement:reminder` | `{ date, pendingRunnerCount }` | تذكير التسوية (Sprint 4) |

4. **أصوات الإشعار** (القسم 10.4):
   - تعريف أنواع الأصوات في `@forerun/shared-types`:
     ```typescript
     type SoundType = 'new_order' | 'status_update' | 'urgent' | 'success';
     ```
   - الأصوات المطلوبة:
     - `new_order`: للـ Runner عند استقبال طلب جديد + للإدارة عند وصول طلب جديد
     - `status_update`: للعميل عند تغيير حالة الطلب
     - `urgent`: حالات تحتاج تدخلاً عاجلاً
     - `success`: عند تسليم ناجح
   - **الـ Frontend يُشغّل الصوت المناسب محلياً** عند وصول الإشعار (لا يُرسل الصوت من الخادم)
   - إضافة حقل `sound` اختياري في payload كل event: `{ ..., sound?: SoundType }`

5. **مراجعة شاملة**: التأكد من أن كل service يُرسل الـ events المناسبة عبر `NotificationsService`:
   - Orders Service: `order:status_changed`, `order:cancelled`, `order:new`
   - Order Assignment: `order:assigned`, `order:runner_assigned`, `order:assignment_cancelled`, `order:reassigned`
   - OrderStore Purchase: `order:store_purchased`, `order:fee_updated`
   - Delivery: `order:out_for_delivery`, `order:delivered`
   - Auth/Users: `account:verified`, `user:new_registration`

**المخرج المتوقع:**
- جميع أحداث WebSocket من القسم 10 مُنفّذة ومُرسلة فعلياً
- أنواع الأصوات معرّفة ومُرفقة بالـ events
- كل service يُرسل الأحداث المناسبة عبر `NotificationsService`

**الاعتماديات:** المهام 3.1, 3.2, 3.4, 3.5 + WebSocket Gateway (Sprint 1)

---

### 3.7 بناء Runner PWA الأساسي

**الوصف:**
إعداد مشروع Runner PWA بـ React + Vite في `apps/runner-pwa/` مع الشاشات الأساسية المطلوبة.

**خطوات التنفيذ التفصيلية:**

1. إنشاء مشروع React + Vite في `apps/runner-pwa/`:
   - `npx -y create-vite . --template react-ts`
   - تثبيت: `vite-plugin-pwa` (لتحويله إلى PWA)
   - تثبيت: `socket.io-client`, `leaflet`, `react-leaflet`, `@types/leaflet`

2. إعداد PWA:
   - `manifest.json` مع: `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`
   - Service Worker أساسي (precaching فقط في MVP)

3. إعداد هيكل المجلدات:
   ```
   src/
   ├── pages/
   │   ├── LoginPage.tsx
   │   ├── AvailablePage.tsx (شاشة "أنا متاح")
   │   ├── ActiveOrderPage.tsx
   │   └── SettlementsPage.tsx
   ├── components/
   │   ├── StoreCard.tsx
   │   ├── ItemsList.tsx
   │   ├── ReceiptUploader.tsx
   │   └── MapView.tsx
   └── hooks/
       ├── useAuth.ts
       ├── useWebSocket.ts
       └── useGeolocation.ts
   ```

4. بناء الصفحات:
   - **LoginPage**: تسجيل دخول (WhatsApp + كلمة مرور)
   - **AvailablePage**: شاشة "أنا متاح" — تعرض حالة المندوب مع زر تبديل AVAILABLE/UNAVAILABLE
     - تستمع لحدث `order:assigned` عبر WebSocket
     - عند وصول طلب: تنتقل تلقائياً لـ `ActiveOrderPage` مع تشغيل صوت `new_order`
   - **ActiveOrderPage**: تفاصيل الطلب النشط:
     - عرض المواد والمتاجر
     - أزرار: "بدأت"، "تم الشراء"، "تخطي"، "إضافة متجر"
     - رفع إيصالات
     - "انتقل للتوصيل"، "تم التسليم"
     - خريطة عنوان التسليم
   - **SettlementsPage**: سجل التسويات (يُبنى في Sprint 4)

5. إعداد HTTP client مع JWT refresh تلقائي:
   - يُجدد Access Token قبل انتهائه بـ 10 دقائق (القسم 17)

6. إعداد WebSocket client:
   - يتصل بـ namespace `/orders`
   - ينضم لـ room `runner:{runnerId}`

**المخرج المتوقع:**
- مشروع React + Vite يعمل كـ PWA في `apps/runner-pwa/`
- شاشات Login, Available, ActiveOrder جاهزة وظيفياً
- WebSocket مُعدّ لاستقبال الأحداث
- HTTP client مع JWT refresh تلقائي

**الاعتماديات:** المهام 3.1 — 3.6

---

## معايير الإنجاز (Definition of Done) — Sprint 3

> **تدقيق 2026-09-30 — قاعدة حاكمة: لا يُعلَّم `[x]` إلا بدليل `file:line` في الكود.** كل `[ ]` باقٍ يحمل سطر سبب. النتيجة: **9/13** ✅ · **4/13** ⬜

- [x] Runner يستطيع: عرض بياناته، تبديل حالته (AVAILABLE/UNAVAILABLE)، عرض الطلب النشط
      → `runners.controller.ts:84` (`GET runner/me`) · `:92` (`PUT runner/me/status`) · `:101` (`GET runner/orders/active`) · الانتقالات مسموحة لـ `RUNNER` في `runner-transitions.ts:16,26`
- [x] Runner يستطيع: بدء التنفيذ (`ASSIGNED` → `IN_PROGRESS`)
      → `runner-orders.service.ts:110-206` · الانتقال مُعرَّف في `order-transitions.ts:60` (actor `RUNNER`) · `orders.controller.ts:247`
- [x] Runner يستطيع: إضافة متجر، حذف متجر (قبل Purchase)، تأكيد الشراء، تخطي متجر
      → إضافة `:343` · حذف `:415` (يقصر على `PENDING` عند `:452`، أي قبل الشراء) · شراء `:208` · تخطي `:555`
- [x] Runner يستطيع: طلب Presigned URL ورفع إيصال وحذفه
      → `receipts.controller.ts:67` (presigned) · `:92` (تأكيد الرفع) · `:113` (حذف) · `receipts.service.ts:56,93,109`
- [ ] التحقق من نوع الملف (jpg/png) وحجمه (5MB) وعدد الصور (5 لكل متجر) يعمل
      → **جزئي.** النوع ✅ (Zod `order.types.ts:442` + `receipts.service.ts:61-68`) · الحجم ✅ (`receipts.service.ts:70`) · **العدد ⛔ قابل للتحايل**: عدّ الـ 5 يتم في `generatePresignedUrl` فقط (`receipts.service.ts:76-83`) و**ليس** في `createReceipt` (`:93-107`) — يطلب العميل 5 روابط بالتوازي ثم يؤكدها فيتجاوز 5 إيصالات حيّة. يحتاج إغلاق الثغرة في `createReceipt`.
- [x] Runner يستطيع: الانتقال للتوصيل (`IN_PROGRESS` → `OUT_FOR_DELIVERY`)
      → `runner-orders.service.ts:648-740` · يمنع الانتقال ما دام هناك متجر `PENDING` (`:675-682`)
- [x] Runner يستطيع: تأكيد التسليم (`OUT_FOR_DELIVERY` → `DELIVERED`) — Idempotent
      → `runner-orders.service.ts:742-1014` · مطالبة `idempotencyKey` ذرّية `updateMany ... idempotencyKey: null` (`:816-843`) · إعادة الطلب بالمفتاح نفسه تعيد `idempotent: true` بلا ledger جديد (`:780-796`).
      ⚠️ **دقّة**: إعادة الطلب على طلب مُسلَّم مسبقًا ترجع `409 ORDER_ALREADY_DELIVERED` من الفحص المسبق (`:755-760`) لا `200` بإعادة تشغيل. الأمان المالي محقّق (لا ازدواج في الرسم/Ledger) لكن سلوك «replay» حرفيًا غير مطابق.
- [ ] عند التسليم: الرسم النهائي يُقفل، LedgerEntry (3 سجلات) تُنشأ، Runner يعود AVAILABLE، Customer إحصائيات تُحدّث
      → **3 من 4 فقط.** الـ Ledger trio ✅ (`:892-920`: `ORDER_FEE_TOTAL` + `RUNNER_SHARE` + `PLATFORM_SHARE`) · Runner→`AVAILABLE` ✅ (`:870-882`) · إحصائيات Customer ✅ (`:884-890`: `completedOrders` + `totalFeesPaid`).
      ⛔ **«يُقفل» غير منفَّذ**: لا يوجد حقل `feeLocked` في `schema.prisma` ولا أي منطق قفل في `pricing.service.ts` (بحث: صفر نتيجة). الثبات العملي ناتج عن حاجز الحالة `DELIVERED` (`:798-802`) + الـ Ledger append-only، **لا** عن قفل صريح.
- [x] كل شيء في المهمة 3.4 يحدث في transaction واحدة
      → `runner-orders.service.ts:762` `prisma.$transaction` واحد يحوي: مطابقة الـ idempotency (`:816`) · تحديث الطلب (`:853`) · Runner (`:876`) · Customer (`:884`) · الـ Ledger trio (`:892`) · 3 سجلات AuditLog (`:922,937,951`) — كلها تمرّ بـ `tx`.
      ℹ️ **استثناء مقصود**: إشعارات WebSocket (`:978-1003`) خارج المعاملة عمدًا (best-effort لا يُفشل التسليم).
- [x] `GET /api/v1/admin/ledger` يعمل مع Pagination
      → `ledger.controller.ts:23` · DTO `LedgerQuerySchema` (`ledger.types.ts:14-22`, `page`/`limit` بحد أقصى 100) · `skip/take` + `total` في `ledger.service.ts:103-111` · استجابة `meta.totalPages` في `:113-121`
- [ ] جميع WebSocket events من القسم 10 مُنفّذة وتُرسل فعلياً
      → **15 من 16 فقط.** ⛔ `order:needs_attention` **غير مُنفَّذ إطلاقًا** — لا يوجد له emit site، فقط تعليق TODO في `admin-order-command.service.ts:792-798`. المؤجَّل إلى cron لم يُبنَ.
      ⛔ **نمط Outbox** الذي تفرضه المهمة 3.6 نفسها (`:333-340`) **غير موجود** — `OutboxEntry` لا وجود له في الكود؛ كل الإرسال fire-and-forget داخل `try/catch` بعد الـ commit. لا إعادة محاولة ولا سجل `PENDING/SENT`.
- [ ] أصوات الإشعار معرّفة ومُرفقة بالأحداث
      → **جزئي.** النوع معرَّف ✅ (`shared-types/websocket.events.ts:3-10`) ومُرفق في ~24 من ~30 موقع emit ✅ (`notifications.service.ts:16` يدمج `sound` في الـ payload).
      ⛔ لكن: `urgent` **لا يُرسله أي موقع إطلاقًا** (0 emit sites) · 5 أحداث بلا `sound` (`order:store_purchased` `runner-orders.service.ts:298` · `account:verified` ×2 `users.service.ts:137,269` · `user:new_registration` `auth.service.ts:85` · `settlement:reminder` `settlements.service.ts:458`) · **لا يوجد ملف صوتي واحد في المستودع** (0 `mp3/wav/ogg`) — كل الأصوات مولّدات Web Audio · `customer-web` يتجاهل حقل `sound` كليًا (`useCustomerWebSocket.ts:62-65`) ويلعب صفرة واحدة · `admin-web` يربط الصوت صلبًا بالحدث ويتجاهل `payload.sound` (`app/dashboard/page.tsx:258`) · `runner-pwa` وحده يقرأ `sound` (`AvailablePage.tsx:142`) لكن جدوله ثنائي مختزل: 3 من 4 قيم تسقط في نغمة واحدة.
- [x] Runner PWA يعمل: Login, شاشة Available مع استقبال أحداث, شاشة الطلب النشط
      → `apps/runner-pwa/src/pages/`: `LoginPage.tsx` · `AvailablePage.tsx` · `ActiveOrderPage.tsx` (المتطلبات موجودة). استقبال `order:assigned` في `AvailablePage.tsx:138-145`

---

**Sprint 3 — مكتمل جزئيًا (2026-09-30).** لم يُضبط ختم «Complete» لأن 4 بنود لم تتحقّق. البنود المتبقّية: قفل الرسم النهائي · `order:needs_attention` · نمط Outbox · إغلاق ثغرة عدّ الإيصالات + استكمال خريطة الأصوات.
