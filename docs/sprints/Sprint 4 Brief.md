# Sprint 4 — Financial + Ratings (أسبوع)

## الهدف العام

بناء نظام التسوية المالية الكامل (Settlement module) مع Cron Job للتذكير اليومي، ونظام تقييم المندوبين من العملاء (نجوم + ملاحظة خاصة)، وإتمام سجل الطلبات والتفاصيل للعميل وتقرير التسوية اليومية للمندوب.

---

## المهام الفرعية

---

### 4.1 بناء Settlement Module — إغلاق يوم التسوية

**الوصف:**
بناء نظام التسوية اليومية الكامل وفق القسم 13 من الوثيقة. الإدارة تُغلق يوم التسوية يدوياً، والنظام يُجمّع الطلبات المكتملة لكل مندوب ويحسب حصص كل طرف.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/settlements/`:
   - `settlements.module.ts`
   - `settlements.controller.ts`
   - `settlements.service.ts`

2. **`POST /api/v1/admin/settlements/close-day`** — إغلاق يوم التسوية:
   - Auth: Admin فقط
   - Request:
     ```json
     {
       "operationalDate": "2025-09-10",
       "notes": "string | null"
     }
     ```
   - المنطق (وفق القسم 13 — `closeSettlementDay()`):
     a. جلب كل الطلبات بحالة `DELIVERED` التي `operationalDate` لها يساوي التاريخ المُرسل
        - **قاعدة `operationalDate`** (القسم 13):
          - اليوم التشغيلي يُحدَّد بوقت بداية الطلب (`createdAt`) لا وقت تسليمه
          - طلب أُنشئ قبل منتصف الليل بتوقيت دمشق ينتمي لذلك اليوم حتى لو سُلِّم بعد منتصف الليل
          - جميع التواريخ تُخزَّن بـ UTC في DB، لكن `operationalDate` تُحسب بتوقيت Damascus (`Asia/Damascus`)
          - مثال: طلب أُنشئ 2025-09-10 23:45 Damascus، سُلِّم 2025-09-11 00:15 → `operationalDate = "2025-09-10"`
     b. تجميع الطلبات حسب المندوب (`runnerId`)
     c. لكل مندوب لديه طلبات مكتملة:
        - **Idempotent check:** إذا وُجد `Settlement` لنفس المندوب ونفس اليوم (`@@unique([runnerId, operationalDate])`) → تخطّى هذا المندوب
        - إنشاء `Settlement` record:
          - `runnerId`
          - `operationalDate`: التاريخ المُرسل
          - `status`: `PENDING`
          - `totalOrders`: عدد الطلبات
          - `totalFees`: مجموع `totalFee` لكل الطلبات
         - **`runnerShare`:** `Math.floor(totalFees * 0.75)` — حصة المندوب (75%)
         - **`platformShare`:** `Math.ceil(totalFees * 0.25)` — حصة FAWRUN (25%)
         - **ملاحظة تقريب:** `runnerShare + platformShare` قد يختلف عن `totalFees` بفرق ±1 بسبب التقريب. الفرق يُعالج عبر `SettlementItem` الفردي — كل `SettlementItem` يحسب حصته من `orderFee` الخاص به (`Math.floor(orderFee * 0.75)` + `Math.ceil(orderFee * 0.25)`)، ومجموع الـ SettlementItems يُطابق مجموع `totalFees` بدقة لأن التقريب لكل طلب يلغي بعضه. المجاميع في `Settlement` نفسها (runnerShare, platformShare) تُشتق من مجموع الـ SettlementItem rows مباشرة: `runnerShare = Σ SettlementItem.runnerShare`, `platformShare = Σ SettlementItem.platformShare`.
         - إنشاء `SettlementItem` لكل طلب:
          - `orderId`
          - `orderFee`: `totalFee` للطلب
          - `runnerShare`: `Math.floor(orderFee * 0.75)`
          - `platformShare`: `Math.ceil(orderFee * 0.25)`
        - إنشاء `LedgerEntry` من نوع `RUNNER_SHARE` و `PLATFORM_SHARE` (إذا لم تُنشأ سابقاً — تكون أُنشئت عند التسليم)
     d. تسجيل `AuditLog`: `SETTLEMENT_CLOSED`
     e. WebSocket: إشعار للإدارة بالإغلاق
   - كل ما سبق داخل Prisma transaction واحدة

3. **`PUT /api/v1/admin/settlements/:id/mark-settled`** — تأكيد التسوية مع مندوب:
   - Auth: Admin فقط
   - يُغيّر `status` من `PENDING` إلى `SETTLED`
   - `closedAt = now()`
   - إنشاء `LedgerEntry` من نوع `SETTLEMENT_PAID`:
     - `amount`: `platformShare`
     - `description`: "المندوب سدّد حصة FAWRUN"
   - تسجيل `AuditLog`: `SETTLEMENT_MARKED_SETTLED`

4. **`GET /api/v1/admin/settlements`** — قائمة التسويات:
   - Auth: Admin فقط
   - يدعم Pagination
   - يدعم Filters: `status` (PENDING/SETTLED), `runnerId`, `dateFrom`, `dateTo`

5. **`GET /api/v1/admin/settlements/pending`** — التسويات غير المغلقة:
   - Auth: Admin فقط
   - يعرض فقط التسويات بحالة `PENDING`
   - مجمّعة حسب المندوب مع المبالغ

**المخرج المتوقع:**
- `POST /api/v1/admin/settlements/close-day` يعمل — Idempotent
- `PUT /api/v1/admin/settlements/:id/mark-settled` يعمل
- `GET /api/v1/admin/settlements` و `/pending` تعملان مع Pagination
- LedgerEntry يُنشأ عند كل عملية مالية
- AuditLog يُسجّل كل عملية
- `operationalDate` تُحسب بتوقيت دمشق

**الاعتماديات:** Sprint 3 مكتمل (Ledger Module + Delivery)

---

### 4.2 بناء Cron Job لتذكير التسوية

**الوصف:**
بناء Cron Job يعمل كل يوم في الساعة 23:00 بتوقيت دمشق لتذكير الإدارة بالتسويات المعلقة، وفق القسم 13.

**خطوات التنفيذ التفصيلية:**

1. استخدام `@nestjs/schedule` مع `@Cron` decorator.

2. في `settlements.service.ts` — إضافة الـ Cron Job:
   ```typescript
   @Cron('0 23 * * *', { timeZone: 'Asia/Damascus' })
   async settlementReminder() {
     const today = getOperationalDate(); // اليوم بتوقيت دمشق
     const hasOpenSettlement = await this.checkPendingOrders(today);
     if (hasOpenSettlement) {
       this.notificationsService.emitToAdmin('settlement:reminder', {
         date: today,
         pendingRunnerCount: /* عدد المندوبين الذين لديهم طلبات مكتملة بدون تسوية */,
         message: 'لديك تسوية معلقة لم تُغلق بعد',
       });
     }
   }
   ```

3. إنشاء دالة مساعدة `getOperationalDate()`:
   - تُرجع تاريخ اليوم بتوقيت دمشق بالشكل `YYYY-MM-DD`
   - تستخدم `Intl.DateTimeFormat` أو مكتبة مساعدة مع `Asia/Damascus`

4. إنشاء دالة `checkPendingOrders(date: string)`:
   - تتحقق من وجود طلبات بحالة `DELIVERED` لهذا اليوم بدون `SettlementItem` مرتبط

**المخرج المتوقع:**
- Cron Job يعمل يومياً في 23:00 بتوقيت دمشق
- WebSocket event `settlement:reminder` يُرسل للإدارة إذا وُجدت تسويات معلقة
- دالة `getOperationalDate()` تعمل بتوقيت دمشق

**الاعتماديات:** المهمة 4.1

---

### 4.3 بناء نظام التقييم (Ratings)

**الوصف:**
بناء نظام تقييم المندوبين من العملاء وفق القسمين 9.2 و 5 (model Rating). التقييم للمندوب فقط — المتاجر نص حر ولا تُقيَّم بشكل منفصل في MVP.

**خطوات التنفيذ التفصيلية:**

1. إنشاء الملفات في `apps/api/src/modules/ratings/`:
   - `ratings.module.ts`
   - `ratings.controller.ts`
   - `ratings.service.ts`

2. **`POST /api/v1/customer/orders/:id/ratings`** — إرسال تقييم:
   - Auth: Customer فقط
   - Ownership check: الطلب يجب أن يكون للعميل الحالي
   - الطلب يجب أن يكون بحالة `DELIVERED`
   - يُرجع 422 إذا لم يكن `DELIVERED`
   - يُرجع 409 إذا وُجد تقييم سابق لنفس الطلب والمندوب (`@@unique([orderId, runnerId])`)
   - يستقبل:
     ```json
     {
       "stars": 4,
       "note": "string | null"
     }
     ```
   - Validation:
     - `stars`: عدد صحيح بين 1 و 5
     - `note`: نص اختياري — خاص للإدارة فقط (القسم 5: "خاص — للإدارة فقط")
   - إنشاء `Rating` record:
     - `orderId`
     - `customerId`
     - `runnerId`: المندوب المُعيّن للطلب
     - `stars`
     - `note`
     - `expiresAt`: `createdAt + 24 ساعة`
     - `isFinal`: `false`
   - **تحديث متوسط تقييم المندوب:**
     - `runner.totalRatings += 1`
     - `runner.avgRating = (مجموع كل التقييمات) / totalRatings`
     - أو حساب المتوسط المتحرك: `newAvg = ((oldAvg * (totalRatings - 1)) + newStars) / totalRatings`

3. **`PUT /api/v1/customer/orders/:id/ratings`** — تعديل تقييم:
   - Auth: Customer فقط
   - Ownership check
   - مسموح فقط خلال 24 ساعة من الإنشاء (`expiresAt > now()`)
   - بعد 24 ساعة: `isFinal = true` ولا يُسمح بالتعديل → يُرجع 422
   - يمكن تعديل: `stars`, `note`
   - **إعادة حساب متوسط تقييم المندوب** بعد التعديل

4. **صلاحية رؤية نصوص التقييمات** (القسم 7.2):
   - العميل يرى فقط: `stars` (لا يرى نصوص تقييمات الآخرين)
   - Runner يرى: `stars` فقط (لا يرى `note`)
   - Admin يرى: كل شيء (`stars` + `note`)

**المخرج المتوقع:**
- `POST /api/v1/customer/orders/:id/ratings` يعمل — فقط بعد DELIVERED
- `PUT /api/v1/customer/orders/:id/ratings` يعمل — خلال 24 ساعة فقط
- متوسط تقييم المندوب يُحدّث تلقائياً
- `note` خاص للإدارة فقط
- Unique constraint على `(orderId, runnerId)`

**الاعتماديات:** Sprint 3 مكتمل (Delivery flow)

---

### 4.4 إتمام سجل الطلبات والتفاصيل للعميل

**الوصف:**
التأكد من أن سجل الطلبات وتفاصيل الطلب للعميل (المبنية في Sprint 2) تعرض البيانات الكاملة بما في ذلك التقييمات والمعلومات المالية.

**خطوات التنفيذ التفصيلية:**

1. تحديث `GET /api/v1/customer/orders` ليشمل:
   - حقل `hasRating`: هل العميل قيّم هذا الطلب
   - حقل `canRate`: هل يمكن التقييم (الطلب DELIVERED + لم يمض 24 ساعة + لم يُقيَّم بعد)

2. تحديث `GET /api/v1/customer/orders/:id` ليشمل:
   - بيانات Runner (إذا معيّن): `name`, `avgRating`, `totalRatings`
   - بيانات التسعير الكاملة: `baseFee`, `peripheralFee`, `extraStoresFee`, `totalFee`
   - تفصيل المتاجر: كل `OrderStore` مع حالته (`PENDING`/`PURCHASED`/`SKIPPED`)
   - تفصيل المواد: كل `OrderItem` مع ربطها بالمتجر
   - التقييم (إذا وُجد): `stars` فقط (بدون `note`)
   - الإيصالات: URLs الصور لكل متجر (غير المحذوفة)
   - Timeline: التواريخ الرئيسية (`createdAt`, `reviewedAt`, `assignedAt`, `startedAt`, `deliveredAt`, `cancelledAt`)

3. التأكد من أن Ownership check مُطبّق: العميل يرى طلباته فقط.

**المخرج المتوقع:**
- `GET /api/v1/customer/orders` و `/:id` تعرض بيانات كاملة ومُحدّثة
- معلومات التقييم والمالية مُضمّنة

**الاعتماديات:** المهمة 4.3 + Sprint 2 (orders endpoints)

---

### 4.5 بناء Runner: تقرير التسوية اليومية

**الوصف:**
بناء endpoints تسوية المندوب ليرى حصته المالية وتفاصيل التسوية اليومية، وفق القسم 9.3.

**خطوات التنفيذ التفصيلية:**

1. **`GET /api/v1/runner/settlements`** — سجل التسويات:
   - Auth: Runner فقط
   - يعرض تسويات المندوب الحالي فقط (ownership check)
   - يدعم Pagination
   - يعرض: `operationalDate`, `status` (PENDING/SETTLED), `totalOrders`, `totalFees`, `runnerShare`, `platformShare`

2. **`GET /api/v1/runner/settlements/current`** — تسوية اليوم الحالي:
   - Auth: Runner فقط
   - يجلب تسوية `operationalDate` = اليوم بتوقيت دمشق
   - إذا لم توجد: يُرجع ملخص مؤقت من الطلبات المكتملة اليوم:
     ```json
     {
       "operationalDate": "2025-09-10",
       "status": "NOT_CLOSED",
       "totalOrders": 5,
       "totalFees": 500,
       "estimatedRunnerShare": 375,
       "estimatedPlatformShare": 125,
       "orders": [
         { "orderNumber": "FW-000001", "totalFee": 80, "deliveredAt": "..." }
       ]
     }
     ```

3. **صلاحيات المندوب في الـ Ledger** (القسم 7.2):
   - Runner يرى فقط حصته المالية (لا يرى كل الـ Ledger)
   - يتم ذلك عبر endpoint التسوية، ليس عبر `/admin/ledger`

**المخرج المتوقع:**
- `GET /api/v1/runner/settlements` يعمل مع Pagination
- `GET /api/v1/runner/settlements/current` يعرض تسوية اليوم أو ملخص مؤقت
- المندوب يرى حصته فقط

**الاعتماديات:** المهمة 4.1

---

### 4.6 بناء Admin Dashboard الأساسي

**الوصف:**
إضافة صفحة التسوية المالية لتلوحة إدارة Admin.

**خطوات التنفيذ التفصيلية:**

1. تحديث `apps/admin-web/` بإضافة صفحة التسويات:
   - **صفحة التسويات** (`/settlements`):
     - عرض قائمة التسويات مع فلاتر (الحالة، المندوب، التاريخ)
     - زر "إغلاق يوم" يفتح نموذجاً لاختيار التاريخ
     - زر "تأكيد التسوية" لتغيير الحالة من PENDING إلى SETTLED
     - عرض التفاصيل: عدد الطلبات، المبالغ، حصة كل طرف

2. تحديث صفحة الـ Dashboard بإحصائيات مالية:
   - إجمالي الإيرادات اليوم
   - عدد التسويات المعلقة
   - عدد المندوبين النشطين

3. إضافة WebSocket listener لحدث `settlement:reminder`:
   - عند وصوله: إظهار تنبيه للإدارة مع صوت `urgent`

**المخرج المتوقع:**
- صفحة التسويات تعمل في Admin Dashboard
- Dashboard يعرض إحصائيات مالية
- تنبيه التسوية يصل عبر WebSocket

**الاعتماديات:** المهام 4.1, 4.2 + Admin Dashboard (Sprint 2)

---

## معايير الإنجاز (Definition of Done) — Sprint 4

- [ ] `POST /api/v1/admin/settlements/close-day` يُغلق يوم التسوية — Idempotent (نفس المندوب + نفس اليوم لا يُكرَّر)
- [ ] `PUT /api/v1/admin/settlements/:id/mark-settled` يُؤكد التسوية مع المندوب
- [ ] Settlement يُنشئ SettlementItem لكل طلب مع حساب الحصص (75%/25%)
- [ ] LedgerEntry يُنشأ مع كل عملية Settlement
- [ ] `operationalDate` تُحسب بتوقيت دمشق (`Asia/Damascus`) بناءً على `createdAt`
- [ ] Cron Job يعمل يومياً في 23:00 بتوقيت دمشق ويُرسل تذكير WebSocket إذا وُجدت تسويات معلقة
- [ ] `POST /api/v1/customer/orders/:id/ratings` يعمل — فقط بعد DELIVERED
- [ ] `PUT /api/v1/customer/orders/:id/ratings` يعمل — خلال 24 ساعة فقط
- [ ] `stars`: 1-5, `note`: خاص للإدارة فقط
- [ ] متوسط تقييم المندوب يُحدّث تلقائياً عند كل تقييم جديد أو تعديل
- [ ] Unique constraint `(orderId, runnerId)` يمنع التكرار
- [ ] `GET /api/v1/customer/orders` و `/:id` تعرض بيانات كاملة (تقييمات + مالية + timeline)
- [ ] `GET /api/v1/runner/settlements` و `/current` تعملان — المندوب يرى حصته فقط
- [ ] صفحة التسويات في Admin Dashboard تعمل
