# Sprint 2 — Order Core (أسبوعان)

## الهدف العام

بناء نظام الطلبات الكامل: Order State Machine بكل انتقالاتها، إنشاء الطلبات من العميل مع كتابة أسماء المتاجر يدوياً وتحديد الموقع، مراجعة واعتماد الطلبات من الإدارة مع تحديد المنطقة الطرفية وتعيين المندوب، محرك التسعير (Pricing Engine)، نظام سجل الأحداث (Audit Log)، ودمج خرائط OpenStreetMap + Leaflet.

---

## المهام الفرعية

---

### 2.1 بناء Order State Machine

**الوصف:**
تنفيذ آلة حالة الطلب (Order State Machine) بالكامل وفق القسم 6.1 من الوثيقة. كل انتقال حالة يجب أن يمر عبر هذه الآلة — لا يُسمح بتغيير `status` مباشرة في الـ service بدون المرور بها (القسم 17).

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/state-machine/`:
   - `order-state-machine.ts`
   - `order-transitions.ts`
   - `index.ts`

2. تعريف جميع الانتقالات المسموحة كبيانات ثابتة في `order-transitions.ts`:

   | من (From) | إلى (To) | الشرط / الجهة |
   |-----------|----------|--------------|
   | `DRAFT` | `PENDING_REVIEW` | العميل يرسل الطلب |
   | `PENDING_REVIEW` | `UNDER_REVIEW` | Admin يفتح للمراجعة |
   | `PENDING_REVIEW` | `CANCELLED` | العميل يلغي |
   | `UNDER_REVIEW` | `AWAITING_RUNNER` | Admin يعتمد + أي مندوب |
   | `UNDER_REVIEW` | `AWAITING_PREFERRED_RUNNER` | Admin يعتمد + مندوب مفضل غير متاح |
   | `UNDER_REVIEW` | `CANCELLED` | Admin يرفض |
   | `AWAITING_RUNNER` | `ASSIGNED` | Admin يعيّن مندوب |
   | `AWAITING_PREFERRED_RUNNER` | `ASSIGNED` | المندوب المفضل يتوفر / العميل يغير رأيه |
   | `ASSIGNED` | `IN_PROGRESS` | Runner يضغط "بدأت" |
   | `ASSIGNED` | `CANCELLED` | العميل يلغي |
   | `IN_PROGRESS` | `OUT_FOR_DELIVERY` | Runner يضغط "انتقل للتوصيل" |
   | `IN_PROGRESS` | `CANCELLED` | Admin يلغي |
   | `OUT_FOR_DELIVERY` | `DELIVERED` | Runner يضغط "تم التسليم" |
   | `OUT_FOR_DELIVERY` | `CANCELLED` | Admin يلغي |

3. في `order-state-machine.ts` — إنشاء class `OrderStateMachine`:
   - دالة `canTransition(currentStatus: OrderStatus, targetStatus: OrderStatus, actorRole: UserRole): boolean` — تتحقق من صلاحية الانتقال
   - دالة `transition(currentStatus: OrderStatus, targetStatus: OrderStatus, actorRole: UserRole): OrderStatus` — تُنفّذ الانتقال أو تُلقي خطأ 422 (`BUSINESS_RULE_VIOLATION`) إذا كان غير مسموح
   - قاعدة صارمة: العميل يستطيع الإلغاء فقط حتى حالة `ASSIGNED` (أي من `PENDING_REVIEW`, `ASSIGNED`)
   - بعد `IN_PROGRESS` الإلغاء عبر Admin حصراً
   - `DELIVERED` حالة نهائية — لا تراجع عنها

4. كتابة Unit Tests للـ State Machine تغطي:
   - كل انتقال مسموح
   - كل انتقال ممنوع (يجب أن يُلقي خطأ)
   - محاولة العميل الإلغاء بعد `IN_PROGRESS` (يجب أن تفشل)
   - محاولة الانتقال من `DELIVERED` (يجب أن تفشل)

**المخرج المتوقع:**
- ملفات State Machine في `apps/api/src/state-machine/`
- جميع الانتقالات مُعرّفة ومحمية
- Unit Tests تغطي كل السيناريوهات
- الآلة تُستخدم حصرياً لتغيير حالة الطلب في كل الـ services

**الاعتماديات:** Sprint 1 مكتمل (NestJS skeleton + Prisma + Auth)

---

### 2.2 بناء OrderStore State Machine

**الوصف:**
تنفيذ آلة حالة المتجر داخل الطلب وفق القسم 6.2.

**خطوات التنفيذ التفصيلية:**

1. إضافة في `apps/api/src/state-machine/`:
   - `order-store-state-machine.ts`

2. تعريف الانتقالات:

   | من (From) | إلى (To) | الجهة |
   |-----------|----------|-------|
   | `PENDING` | `PURCHASED` | Runner يضغط "تم الشراء" |
   | `PENDING` | `SKIPPED` | Runner يضغط "لم يتم الشراء" |

3. القواعد:
   - قبل `PURCHASED` يمكن حذف المتجر إذا أُضيف بالخطأ
   - بعد `PURCHASED` لا تراجع — أي تصحيح عبر الإدارة
   - `PURCHASED` و `SKIPPED` حالات نهائية

**المخرج المتوقع:**
- `OrderStoreStateMachine` في `apps/api/src/state-machine/`
- Unit Tests تغطي الانتقالات المسموحة والممنوعة

**الاعتماديات:** المهمة 2.1

---

### 2.3 بناء Customer: إنشاء طلب جديد

**الوصف:**
بناء endpoint `POST /api/v1/customer/orders` وفق القسم 9.2 — يتيح للعميل إنشاء طلب جديد مع كتابة أسماء المتاجر يدوياً كنص حر.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/orders/`:
   - `orders.module.ts`
   - `orders.controller.ts` (يحتوي على routes `/customer/orders` و `/admin/orders`)
   - `orders.service.ts`
   - `dto/create-order.dto.ts`

2. إنشاء الملفات في `apps/api/src/modules/order-items/`:
   - `order-items.module.ts`
   - `order-items.service.ts`

3. إنشاء الملفات في `apps/api/src/modules/order-stores/`:
   - `order-stores.module.ts`
   - `order-stores.service.ts`

4. **`POST /api/v1/customer/orders`** — Request body (Zod validation):
   ```json
   {
     "items": [
       {
         "itemName": "حليب",
         "quantity": "2 لتر",
         "customStoreName": "دكان أبو علي | null",
         "anyStore": true
       }
     ],
     "notes": "string | null",
     "preferredRunnerId": "string | null",
     "waitForPreferred": false,
     "deliveryAddress": {
       "lat": 35.123,
       "lng": 35.456,
       "description": "بجانب المدرسة"
     }
   }
   ```

5. منطق `createOrder()` في `orders.service.ts`:
   - التحقق من أن المستخدم `VERIFIED` (عبر VerifiedUserGuard)
   - التحقق من وجود مادة واحدة على الأقل
   - إنشاء كل شيء داخل Prisma transaction واحدة:
     a. إنشاء سجل `Order` بـ:
        - `customerId`: من الـ JWT
        - `status`: `PENDING_REVIEW` (يتخطى `DRAFT` ويُرسل مباشرة — وفق الوثيقة: العميل يُنشئ ويُرسل)
        - `deliveryLat`, `deliveryLng`, `deliveryDesc`: Snapshot من العنوان المُرسل (لا يتأثر بتعديلات العميل اللاحقة لعنوانه)
        - `preferredRunnerId`: إذا أُرسل — التحقق من وجود Runner بهذا الـ ID
        - `waitForPreferred`: القيمة المُرسلة
        - `isPeripheral`: `false` (يُحدد لاحقاً من Admin)
        - `baseFee`: 60, `peripheralFee`: 0, `totalFee`: 60 (تقدير أولي)
     b. توليد `orderNumber`:
        - بعد إنشاء السجل مباشرة (لأن `seqNumber` يُولَّد بـ autoincrement من PostgreSQL)
        - `orderNumber = "FW-" + String(order.seqNumber).padStart(6, '0')`
        - تحديث السجل بالـ `orderNumber`
     c. تجميع المواد حسب المتجر:
        - المواد التي لها `customStoreName` محدد: تُجمّع في `OrderStore` واحد لكل اسم متجر مميز
        - المواد التي لها `anyStore: true` و `customStoreName` فارغ: تُجمّع في `OrderStore` واحد بـ `isAnyStore: true` و `storeName: "أي متجر"`
        - لكل `OrderStore`: `addedBy: "CUSTOMER"`, `isExtra: false` (يُحسب لاحقاً)
     d. إنشاء سجلات `OrderItem` لكل مادة مع ربطها بـ `OrderStore` المناسب
     e. تسجيل `AuditLog` بحدث `ORDER_CREATED` ثم `ORDER_SUBMITTED`
   - إرسال WebSocket event للإدارة: `order:new` مع `{ orderId, orderNumber, customerName, itemCount }`

6. Response:
   ```json
   {
     "id": "string",
     "orderNumber": "FW-000001",
     "status": "PENDING_REVIEW",
     "estimatedFee": {
       "baseFee": 60,
       "peripheralFee": 0,
       "extraStoresFee": 0,
       "totalFee": 60,
       "note": "الرسم النهائي يُحدد بعد المراجعة وبعد تأكيد المتاجر الفعلية"
     }
   }
   ```

**المخرج المتوقع:**
- `POST /api/v1/customer/orders` يعمل
- `orderNumber` يُولَّد بشكل `FW-XXXXXX`
- المواد تُجمَّع في OrderStores حسب اسم المتجر
- AuditLog يُسجّل
- WebSocket event يُرسل للإدارة

**الاعتماديات:** Sprint 1 مكتمل + المهمة 2.1

---

### 2.4 بناء Customer: عرض الطلبات وتفاصيل الطلب

**الوصف:**
بناء endpoints عرض سجل الطلبات وتفاصيل طلب للعميل وفق القسم 9.2.

**خطوات التنفيذ التفصيلية:**

1. **`GET /api/v1/customer/orders`** — سجل الطلبات:
   - Auth: Customer فقط
   - يعرض طلبات العميل الحالي فقط (ownership check)
   - يدعم Pagination: `page`, `limit`
   - يدعم Filter اختياري بـ `status`
   - Response بالشكل `PaginatedResponse`:
     ```json
     {
       "data": [{
         "id", "orderNumber", "status", "totalFee",
         "itemCount", "createdAt", "deliveredAt"
       }],
       "meta": { "total", "page", "limit", "totalPages" }
     }
     ```

2. **`GET /api/v1/customer/orders/:id`** — تفاصيل طلب:
   - Auth: Customer فقط
   - Ownership check: الطلب يجب أن يكون للعميل الحالي
   - يشمل: Order + OrderItems + OrderStores (مع حالاتها) + Runner info (إذا معيّن) + التسعير الكامل
   - يُرجع 404 إذا لم يُوجد أو ليس ملكه

3. **`DELETE /api/v1/customer/orders/:id`** — إلغاء طلب:
   - Auth: Customer فقط
   - Ownership check
   - يستخدم `OrderStateMachine` للتحقق من إمكانية الإلغاء
   - العميل يستطيع الإلغاء فقط حتى حالة `ASSIGNED` (القسم 6.1)
   - عند الإلغاء:
     - `status` → `CANCELLED`
     - `cancelledByUserId` = Customer's User ID
     - `cancelledAt` = now()
     - إذا كان مندوب معيّن: `runner.status` يعود إلى `AVAILABLE` آلياً (وفق القسم 6.3)
     - تسجيل `AuditLog` بحدث `ORDER_CANCELLED`
     - WebSocket event: `order:cancelled` للمندوب (إذا كان معيّناً) + `order:status_changed` للإدارة

**المخرج المتوقع:**
- `GET /api/v1/customer/orders` يعمل مع Pagination
- `GET /api/v1/customer/orders/:id` يعمل مع ownership check
- `DELETE /api/v1/customer/orders/:id` يعمل مع State Machine validation

**الاعتماديات:** المهمة 2.3

---

### 2.5 بناء Customer: بيانات الحساب والعنوان

**الوصف:**
بناء endpoints بيانات حساب العميل وعنوانه وفق القسم 9.2.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/customers/`:
   - `customers.module.ts`
   - `customers.controller.ts`
   - `customers.service.ts`

2. **`GET /api/v1/customer/me`** — بيانات الحساب + الإحصائيات:
   - Auth: Customer فقط
   - يُرجع: `id`, `name`, `whatsapp`, `altPhone`, `status`, `completedOrders`, `totalFeesPaid`, `createdAt`

3. **`PUT /api/v1/customer/me`** — تعديل بيانات:
   - يمكن تعديل: `name`, `altPhone`, `password` (اختياري — إذا أُرسل يُجزّأ بـ bcrypt)
   - Zod validation على كل حقل

4. **`GET /api/v1/customer/me/address`** — العنوان المحفوظ:
   - يُرجع: `lat`, `lng`, `description`

5. **`PUT /api/v1/customer/me/address`** — تعديل العنوان:
   - يستقبل: `lat`, `lng`, `description`
   - يُحدّث سجل `CustomerAddress`

6. **`GET /api/v1/customer/runners`** — قائمة المندوبين المتاحين:
   - Auth: Customer (VERIFIED)
   - يعرض فقط المندوبين بـ `isVisible: true` و `user.status: VERIFIED`
   - يُرجع: `id`, `name`, `avgRating`, `totalRatings`, `status`
   - يُستخدم من العميل لاختيار مندوب مفضل عند إنشاء الطلب

**المخرج المتوقع:**
- جميع endpoints `/customer/me`, `/customer/me/address`, `/customer/runners` تعمل
- Ownership check مُطبّق

**الاعتماديات:** Sprint 1 مكتمل

---

### 2.6 بناء Admin: مراجعة واعتماد الطلبات

**الوصف:**
بناء endpoints مراجعة واعتماد ورفض الطلبات من الإدارة وفق القسم 9.4.

**خطوات التنفيذ التفصيلية:**

1. تحديث `apps/api/src/modules/orders/orders.controller.ts` بإضافة routes Admin.

2. **`GET /api/v1/admin/orders`** — قائمة الطلبات:
   - Auth: Admin فقط
   - يدعم Pagination
   - يدعم Filters: `status`, `runnerId`, `customerId`, `dateFrom`, `dateTo`
   - يعرض كل الطلبات (ليس فقط طلبات عميل معيّن)

3. **`GET /api/v1/admin/orders/:id`** — تفاصيل طلب كاملة:
   - يشمل: Order + OrderItems + OrderStores + Receipts + Runner + Customer + التسعير + Ratings

4. **`GET /api/v1/admin/orders/:id/audit`** — سجل أحداث الطلب:
   - يُرجع كل سجلات `AuditLog` المرتبطة بالطلب مرتبة زمنياً
   - كل سجل يتضمن: `event`, `actorRole`, `fromStatus`, `toStatus`, `meta`, `createdAt`

5. **`PUT /api/v1/admin/orders/:id/approve`** — اعتماد الطلب:
   - Request:
     ```json
     { "isPeripheral": false, "notes": "string | null" }
     ```
   - يستخدم State Machine: `UNDER_REVIEW` → `AWAITING_RUNNER` (أو `AWAITING_PREFERRED_RUNNER`)
   - المنطق:
     a. تحديث `isPeripheral` في الطلب
     b. إعادة حساب الرسم عبر `calculateFee()` من `@fawrun/shared-constants`:
        - `isPeripheral`: القيمة المُرسلة من Admin
        - `purchasedStoreCount`: 0 (لم يُشترى شيء بعد — الرسم تقديري)
     c. تحديد الحالة التالية:
        - إذا الطلب له `preferredRunnerId` و `waitForPreferred: true` والمندوب المفضل ليس `AVAILABLE`: → `AWAITING_PREFERRED_RUNNER`
        - وإلا: → `AWAITING_RUNNER`
     d. تسجيل `AuditLog`: `ORDER_APPROVED` + `ORDER_PERIPHERAL_SET` (إذا peripheral) + `ORDER_FEE_UPDATED` (إذا تغيّر الرسم)
     e. WebSocket: `order:status_changed` للعميل + `order:fee_updated` للعميل (إذا تغيّر) + `order:status_changed` للإدارة

6. **`PUT /api/v1/admin/orders/:id/reject`** — رفض الطلب:
   - يستخدم State Machine: `UNDER_REVIEW` → `CANCELLED`
   - يستقبل `cancelReason` اختياري
   - `cancelledByUserId` = Admin's User ID
   - `cancelledAt` = now()
   - تسجيل `AuditLog`: `ORDER_REJECTED`
   - WebSocket: `order:cancelled` للعميل

**المخرج المتوقع:**
- جميع endpoints Admin للطلبات تعمل
- State Machine تُستخدم لكل انتقال
- `isPeripheral` يُؤثر على الرسم
- AuditLog يُسجّل لكل عملية
- WebSocket events تُرسل

**الاعتماديات:** المهام 2.1, 2.3

---

### 2.7 بناء Admin: تعيين مندوب للطلب

**الوصف:**
بناء endpoint تعيين مندوب لطلب وفق القسم 9.4 والقسم 6.1 و 6.3.

**خطوات التنفيذ التفصيلية:**

1. **`PUT /api/v1/admin/orders/:id/assign-runner`** — Request:
   ```json
   { "runnerId": "string" }
   ```

2. المنطق (داخل Prisma transaction واحدة — القسم 17):
   a. التحقق من أن الطلب بحالة `AWAITING_RUNNER` أو `AWAITING_PREFERRED_RUNNER`
   b. التحقق من أن المندوب موجود و `status: AVAILABLE` و `user.status: VERIFIED`
   c. استخدام State Machine: الانتقال إلى `ASSIGNED`
   d. تحديث الطلب:
      - `runnerId` = المندوب المُعيَّن
      - `assignedAt` = now()
   e. تحديث حالة المندوب (Runner Status Machine — القسم 6.3):
      - `runner.status` → `ON_MISSION`
   f. تسجيل `AuditLog`: `RUNNER_ASSIGNED`
   g. WebSocket:
      - `order:assigned` للمندوب: `{ orderId, orderNumber, customerName, deliveryAddress, items, estimatedFee }` (مع صوت `new_order`)
      - `order:runner_assigned` للعميل: `{ orderId, runnerName }`
      - `order:status_changed` للإدارة

3. **`PUT /api/v1/admin/orders/:id/cancel`** — إلغاء بأي مرحلة:
   - Admin يستطيع الإلغاء في أي حالة ما عدا `DELIVERED`
   - يستقبل `cancelReason`
   - إذا كان مندوب معيّن: `runner.status` → `AVAILABLE` آلياً
   - تسجيل `AuditLog`: `ORDER_CANCELLED`
   - WebSocket: `order:cancelled` للعميل + `order:assignment_cancelled` للمندوب (إذا كان معيّناً)

**المخرج المتوقع:**
- `PUT /api/v1/admin/orders/:id/assign-runner` يعمل
- Runner status يتغير إلى `ON_MISSION` آلياً
- `PUT /api/v1/admin/orders/:id/cancel` يعمل من أي حالة ما عدا `DELIVERED`
- كل العمليات داخل transaction واحدة

**الاعتماديات:** المهمة 2.6

---

### 2.8 بناء Pricing Engine

**الوصف:**
تنفيذ محرك التسعير الكامل وفق القسم 8 من الوثيقة. المحرك يستخدم دالة `calculateFee()` من `@fawrun/shared-constants`.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/pricing/`:
   - `pricing.module.ts`
   - `pricing.service.ts`

2. في `pricing.service.ts`:
   - دالة `recalculateFee(orderId: string)`: تجلب الطلب مع OrderStores بحالة `PURCHASED`، تحسب الرسم، تُحدّث الطلب
   - تستخدم `calculateFee()` من `@fawrun/shared-constants`

3. **متى يُعاد حساب الرسم** (القسم 8):
   - عند إنشاء الطلب — تقدير أولي: `baseFee: 60`, `peripheralFee: 0`, `totalFee: 60`
   - عند اعتماد Admin مع تحديد `isPeripheral` — الرسم قد يتغير (مثلاً يصبح 100 إذا peripheral)
   - عند كل `OrderStore` يصبح `PURCHASED` — إضافة +20 إذا كان متجراً إضافياً (أكثر من متجر واحد)
   - عند التسليم — الرسم النهائي مؤكد ومقفل

4. **قاعدة حساب المتاجر الإضافية:**
   - `extraStoresFee = Math.max(0, purchasedStoreCount - 1) * 20`
   - يُحسب فقط على OrderStores بحالة `PURCHASED` (المتاجر التي تم الشراء منها فعلاً)
   - المتاجر بحالة `SKIPPED` لا تُحسب

5. **تنبيه العميل:**
   - عند كل تغيير في الرسم: WebSocket event `order:fee_updated` → `{ orderId, oldFee, newFee, reason }`

6. تسجيل `AuditLog`: `ORDER_FEE_UPDATED` مع `meta: { oldFee, newFee, reason }`

**المخرج المتوقع:**
- `PricingService` مع `recalculateFee()` جاهز
- الرسم يُعاد حسابه تلقائياً في النقاط الأربع المحددة
- WebSocket event يُرسل عند تغيير الرسم
- AuditLog يُسجّل كل تغيير

**الاعتماديات:** المهام 2.3, 2.6 + حزمة `@fawrun/shared-constants`

---

### 2.9 تكامل نظام Audit Log الكامل

**الوصف:**
التأكد من أن نظام AuditLog (المُنشأ في Sprint 1 — المهمة 1.10) يغطي جميع الأحداث المطلوبة في القسم 11، وأن كل عملية في Orders تُسجّل فيه.

**خطوات التنفيذ التفصيلية:**

1. التأكد من أن `AuditService` يدعم تسجيل جميع الأحداث الواردة في القسم 11:
   ```typescript
   enum AuditEvent {
     // دورة حياة الطلب
     ORDER_CREATED, ORDER_SUBMITTED, ORDER_REVIEW_STARTED,
     ORDER_APPROVED, ORDER_REJECTED, ORDER_PERIPHERAL_SET,
     ORDER_FEE_UPDATED, RUNNER_ASSIGNED, RUNNER_REASSIGNED,
     ORDER_STARTED, ORDER_CANCELLED, ORDER_DELIVERED,
     // متاجر ومشتريات
     STORE_ADDED, STORE_REMOVED, STORE_PURCHASED,
     STORE_SKIPPED, ITEM_CANCELLED, RECEIPT_UPLOADED,
     RECEIPT_DELETED, PROCEEDED_TO_DELIVERY,
     // مالي
     LEDGER_ENTRY_CREATED, SETTLEMENT_CLOSED, SETTLEMENT_MARKED_SETTLED,
     // حسابات
     USER_VERIFIED, USER_REJECTED, USER_SUSPENDED, TOKEN_REVOKED,
   }
   ```

2. مراجعة كل service في Orders والتأكد من أن كل عملية تُسجّل:
   - `actorId`: ID المستخدم الذي أجرى العملية
   - `actorRole`: `'CUSTOMER' | 'RUNNER' | 'ADMIN' | 'SYSTEM'`
   - `fromStatus` و `toStatus`: الحالة قبل وبعد (إذا كان انتقال حالة)
   - `meta`: بيانات إضافية (JSON) حسب الحدث

3. الجدول Append-Only: لا يوجد `updatedAt` — لا حذف ولا تعديل أبداً (القسم 17)

**المخرج المتوقع:**
- جميع عمليات الطلبات تُسجّل في AuditLog
- كل الأحداث من القسم 11 معرّفة ومدعومة

**الاعتماديات:** المهام 2.3, 2.6, 2.7

---

### 2.10 دمج خرائط OpenStreetMap + Leaflet

**الوصف:**
إعداد تكامل خرائط OpenStreetMap مع مكتبة Leaflet في الـ Frontends (Admin Dashboard + Runner PWA) وفق القسم 4. الخرائط تُستخدم لعرض مواقع التسليم واختيار الموقع بالسحب والإفلات.

**خطوات التنفيذ التفصيلية:**

1. **لا يوجد عمل على Backend** — OpenStreetMap مجاني ولا يحتاج API key أو تكامل خادم.

2. **في Admin Dashboard (`apps/admin-web/`):**
   - تثبيت: `leaflet`, `react-leaflet`, `@types/leaflet`
   - إنشاء component `MapView`:
     - يعرض خريطة OpenStreetMap مع marker لموقع التسليم
     - يدعم عرض مواقع متعددة (لعرض كل طلبات اليوم مثلاً)
   - إنشاء component `LocationPicker` (للاستخدام لاحقاً):
     - يدعم السحب والإفلات (drag) لتحديد الموقع
     - يُخرج `{ lat, lng }`

3. **في Runner PWA (`apps/runner-pwa/`):**
   - نفس المكتبات والـ components
   - إضافة: زر "موقعي الحالي" يستخدم Browser Geolocation API:
     ```typescript
     navigator.geolocation.getCurrentPosition(
       (position) => { /* lat, lng */ },
       (error) => { /* handle error */ }
     );
     ```

4. ملاحظة: تحديد الموقع التلقائي عبر GPS يعمل عبر Browser Geolocation API في PWA وAndroid Location API في التطبيق — كلاهما مجاني ومدمج (القسم 4).

**المخرج المتوقع:**
- مكتبة Leaflet مثبتة ومُعدّة في Admin Dashboard و Runner PWA
- Component `MapView` لعرض المواقع
- Component `LocationPicker` للسحب والإفلات
- Geolocation API مدمج في Runner PWA

**الاعتماديات:** Sprint 1 مكتمل (هياكل apps)

---

### 2.11 بناء Admin Dashboard الأساسي

**الوصف:**
إعداد مشروع Admin Dashboard بـ Next.js 14 (App Router) في `apps/admin-web/` مع الشاشات الأساسية المطلوبة لمراجعة الطلبات وإدارة المستخدمين.

**خطوات التنفيذ التفصيلية:**

1. إنشاء مشروع Next.js 14 في `apps/admin-web/`:
   - `npx -y create-next-app@latest . --app --typescript --eslint --no-tailwind --src-dir --import-alias "@/*"`
   - أو إعداد يدوي مع App Router
2. إعداد هيكل المجلدات:
   ```
   src/
   ├── app/
   │   ├── layout.tsx
   │   ├── page.tsx (Dashboard)
   │   ├── login/
   │   ├── users/
   │   ├── orders/
   │   └── runners/
   ├── components/
   └── lib/
       ├── api.ts (HTTP client)
       └── ws.ts (WebSocket client)
   ```
3. إنشاء HTTP client في `lib/api.ts`:
   - يستخدم `NEXT_PUBLIC_API_URL` من env
   - يُضيف `Authorization: Bearer` header
   - يدعم التجديد التلقائي للـ Access Token (عبر `/auth/refresh`)
4. إنشاء WebSocket client في `lib/ws.ts`:
   - يتصل بـ `NEXT_PUBLIC_WS_URL`
   - ينضم لـ room `admin:all`
5. بناء الصفحات الأساسية (UI بسيط وظيفي — التصميم النهائي في Sprint 5):
   - صفحة Login
   - Dashboard: إحصائيات أساسية
   - قائمة المستخدمين + أزرار تفعيل/رفض/تعليق
   - قائمة الطلبات + أزرار مراجعة/اعتماد/رفض/تعيين مندوب
   - قائمة المندوبين + إنشاء مندوب جديد

**المخرج المتوقع:**
- مشروع Next.js يعمل في `apps/admin-web/`
- HTTP client وWebSocket client جاهزان
- صفحات أساسية وظيفية لإدارة المستخدمين والطلبات

**الاعتماديات:** المهام 2.6, 2.7, 2.10

---

## معايير الإنجاز (Definition of Done) — Sprint 2

- [ ] Order State Machine مبنية وتغطي كل الانتقالات من القسم 6.1
- [ ] OrderStore State Machine مبنية وتغطي القسم 6.2
- [ ] Unit Tests للـ State Machines تمر بنجاح
- [ ] `POST /api/v1/customer/orders` يُنشئ طلباً مع `orderNumber` بشكل `FW-XXXXXX`
- [ ] المواد تُجمَّع في OrderStores حسب اسم المتجر (نص حر)
- [ ] `GET /api/v1/customer/orders` يعمل مع Pagination
- [ ] `DELETE /api/v1/customer/orders/:id` يعمل حتى حالة `ASSIGNED` فقط
- [ ] `GET /api/v1/customer/me`, `/me/address`, `/runners` تعمل
- [ ] Admin يستطيع: عرض الطلبات، اعتماد مع `isPeripheral`، رفض، تعيين مندوب، إلغاء
- [ ] Pricing Engine يحسب الرسم بشكل صحيح ويُعيد الحساب عند كل تغيير
- [ ] كل انتقال حالة يمر عبر State Machine
- [ ] كل عملية تُسجّل في AuditLog
- [ ] WebSocket events تُرسل للعميل والإدارة عند كل تغيير
- [ ] خرائط Leaflet + OpenStreetMap مدمجة في Frontends
- [ ] Admin Dashboard (Next.js) يعرض الطلبات والمستخدمين مع العمليات الأساسية
