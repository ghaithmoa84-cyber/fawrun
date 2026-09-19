# خطة مراجعة Sprint 4 — مالية وتقييمات

**الفرع**: `feature/sprint-4-financial-ratings`  
**المهام**: 4.1 – 4.6 (Settlement + Cron + Ratings + Customer Orders + Runner Settlements + Admin Dashboard)  
**المعايير المرجعية**: AGENTS.md (Spec Section 17)، FAWRUN MVP Technical Specification، PROJECT_BRIEF.md، CURRENT_STATE.md، Sprint 4 Brief.md

---

## المحور 1: منطق إغلاق يوم التسوية (`close-day`) والمعاملات

**الملفات**: `apps/api/src/modules/settlements/settlements.service.ts` (السطر 57-181)

**البروبمت**:

> افحص الدالة `closeDay()` بالكامل وكل ما يلي:
>
> 1. **المعاملة الواحدة**: هل كل شيء داخل `prisma.$transaction()` واحد؟ هل هناك أي عملية كتابة خارج المعاملة؟
> 2. **Idempotency**: هل فحص وجود Settlement لنفس (runnerId + operationalDate) يحدث BEFORE أي عملية إنشاء؟ هل يمكن أن يحدث race condition بين `findUnique` و `create` في بيئة إنتاج مع concurrent requests؟
> 3. **operationalDate Calculation**: دالة `getUtcRangeForOperationalDate()` تستخدم `+03:00` offset. هل هذا صحيح دائماً لـ Damascus؟ هل `Intl.DateTimeFormat` مع `timeZone: 'Asia/Damascus'` (الدالة المجاورة) أفضل؟ هل هناك تناقض بين الطريقتين؟
> 4. **الترقيم الدائري للرسوم**: هل `runnerShare = Σ SettlementItem.runnerShare` و `platformShare = Σ SettlementItem.platformShare` يتطابقان مع الـ Settlement نفسه؟ هل هناك حالة يكون فيها `Math.floor(totalFee * 0.75) + Math.ceil(totalFee * 0.25)` لا يساوي `totalFee` لكل طلب فردي؟
> 5. **الطلبات بدون مندوب**: `if (!order.runnerId) continue;` — هل طلب مُسلَّم بدون مندوب يُتجاهل نهائياً دون إشعار أو تسجيل؟
> 6. **الـ TODO من Sprint 3**: "قبل early return للـ Settlement الموجود، تحقق من DELIVERED orders التي لا تملك SettlementItems". هل هذا مُنفّذ؟
> 7. **الـ LedgerEntry**: هل يُنشأ LedgerEntry داخل `closeDay`؟ وفق "كل عملية مالية = LedgerEntry"، هل إنشاء Settlement و SettlementItem وحده يكفي؟
> 8. **AuditLog**: هل `SETTLEMENT_CLOSED` يُسجَّل بشكل صحيح؟ هل يُمرَّر الـ transaction client `tx`؟
> 9. **WebSocket**: هل `emitToAdmin` يُستدعى داخل المعاملة أم بعدها؟ ماذا لو فشلت المعاملة بعد إرسال الإشعار؟
> 10. **الأنواع**: هل `CloseDayResult` يُرجع بيانات مُنسّقة مع Zod schemas في shared-types أم نوع محلي منفصل؟
> 11. **الكود المكرر**: هل يمكن استخراج أي شيء إلى دالة مساعدة؟

---

## المحور 2: تأكيد التسوية (`mark-settled`) والـ Ledger والتدفق المالي الكامل

**الملفات**: `settlements.service.ts` (السطر 183-229), `settlements.controller.ts` (السطر 95-102)

**البروبمت**:

> افحص `markSettled()` والتدفق المالي بالكامل:
>
> 1. **Idempotency**: هل يمكن استدعاء `markSettled` مرتين لنفس الـ Settlement؟ ما الذي يحدث — هل يُنشئ LedgerEntry مكرر؟ هل هناك حماية؟
> 2. **LedgerEntry من نوع SETTLEMENT_PAID**: هل المبلغ يساوي `platformShare` فقط؟ هل يجب أن يشمل تسوية مسبقة من RUNNER_SHARE/PLATFORM_SHARE عند التسليم؟ هل المجموع يتطابق؟
> 3. **Ledger append-only**: هل الـ LedgerEntry يُنشأ بهذا الترتيب الصحيح؟ هل يمكن أن تفشل العملية بدون LedgerEntry مما يخلق تناقضاً؟
> 4. **Transaction**: هل `settlement.update` + `ledgerEntry.create` + `auditService.log` كلها داخل `prisma.$transaction()` واحد؟
> 5. **AuditLog**: هل `SETTLEMENT_MARKED_SETTLED` بـ `fromStatus: 'PENDING'` و `toStatus: 'SETTLED'`؟ هل `actorId` و `actorRole` صحيحان؟
> 6. **مجموع PlatformShare**: هل المجموع الفعلي يتطابق مع LedgerEntry السابقة؟ ماذا لو كان فرق بسبب التقريب؟
> 7. **صلاحيات Controller**: هل `@Roles('ADMIN')` و `VerifiedUserGuard` موجودان؟
> 8. **نوع المبلغ**: هل `settlement.platformShare` هو `Int` أم `Float`؟ هل فقدان للدقة؟
>
> تحقق: "Every financial operation = LedgerEntry" و "Ledger is append-only".

---

## المحور 3: نظام التقييم (Ratings) — الإنشاء والتعديل والحساب والصلاحيات

**الملفات**: `apps/api/src/modules/ratings/` (service, controller, mapper), `packages/shared-types/src/rating.types.ts`

**البروبمت**:

> افحص جميع ملفات Ratings بالكامل:
>
> 1. **Unique Constraint**: في `createRating` يُستخدم `orderId_runnerId` للبحث عن التقييم الموجود. لكن الـ Prisma schema يعرّف `@@unique([orderId, runnerId])`. في `updateRating` يُستخدم `orderId_customerId` — هل هذا صحيح؟ هل التقييم يُربط بـ (orderId + runnerId) أم (orderId + customerId)؟ هل هناك تناقض؟
> 2. **نافذة 24 ساعة**: هل `rating.expiresAt <= new Date()` صحيح؟ هل `expiresAt` يُحسب بدقة بتوقيت دمشق أم UTC؟ ماذا لو كان بعد منتصف الليل بتوقيت دمشق؟
> 3. **إعادة حساب المتوسط (updateRating)**: الصيغة `((avg * totalCount - oldStars + newStars) / totalCount)` — هل صحيحة؟ ماذا لو `totalCount = 1`, `oldStars = 3`, `newStars = 5`؟ النتيجة: `((3*1 - 3 + 5)/1) = 5` ✓. ماذا لو `totalCount = 5`, `avg = 3.0`? النتيجة: `(15 - 3 + 5)/5 = 3.4` ✓.
> 4. **تراكم خطأ التقريب (createRating)**: `avg = (oldAvg * oldTotal + newStars) / newTotal` — هل `oldAvg` مخزّن بدقة أم مقرب؟ هل يمكن أن يتراكم خطأ؟
> 5. **`note` خاص بالإدارة فقط**: هل يمكن للعميل إدخال note؟ هل `note` يُخفي في الـ mapper للعميل والـ Runner؟ راجع `rating.mapper.ts`.
> 6. **`isFinal` flag**: هل يُعاد تعيينه عند التعديل بعد انتهاء النافذة؟ ماذا لو كان `isFinal = false` عند التحديث — هل يبقى false حتى تُعاد تعيينه تلقائياً؟
> 7. **RATING_FINALIZED**: هل يُسجَّل في transaction منفصل خارج المعاملة الرئيسية؟ هل هذا مقبول أم يمكن أن يخلق تناقضاً؟
> 8. **Zod Schemas**: هل `CreateRatingSchema` و `CreateRatingBodySchema` مختلفان؟ أيهما يُستخدم فعلياً؟
> 9. **الحالة CANCELLED**: هل يمكن إرسال تقييم لطلب ملغى؟ هل يجب أن يكون DELIVERED فقط؟
> 10. **مستويات الرؤية**: هل `mapRating(rating, actor.role)` يُخفي `note` بشكل صحيح للعميل والـ Runner؟

---

## المحور 4: الامتثال لـ State Machine Enforcement

**الملفات**: جميع ملفات Sprint 4 + `apps/api/src/state-machine/`

**البروبمت**:

> راجع كل كود Sprint 4 وتحقق أنه لا ينتهك State Machine:
>
> 1. **`closeDay`**: هل يقرأ حالة الطلبات كـ `DELIVERED` فقط؟ هل يحاول تغيير حالة أي Order أو Settlement؟ هل يُغيّر حالة لأخرى غير مُعرَّفة؟
> 2. **`markSettled`**: هل يُغيّر `Settlement.status` مباشرة عبر `update` دون State Machine؟ هل Settlement له State Machine مُعرَّف؟ هل يجب أن يكون هناك؟ PENDING → SETTLED transition مقبول بدون State Machine؟
> 3. **`createRating`**: هل يقرأ حالة الطلب كـ `DELIVERED` فقط؟ هل يمكن أن يحدث تقييم لطلب في حالة وسيطة بسبب race condition؟
> 4. **`updateRating`**: هل يُغيّر حالة الطلب أبداً؟ هل يُغيّر حالة Rating مباشرة (مثل `isFinal`) دون State Machine؟ هل `RATING_FINALIZED` حدث AuditLog وليس State Machine (مما يعني أنه مقبول)؟
> 5. **الـ State Machine files**: راجع `order-state-machine.ts`, `order-store-state-machine.ts`, `runner-state-machine.ts`, `order-transitions.ts`, `runner-transitions.ts` — هل transitions Sprint 4 مغطاة؟
> 6. **الـ AuditLog events**: هل `SETTLEMENT_CLOSED` و `SETTLEMENT_MARKED_SETTTLED` و `RATING_CREATED` و `RATING_UPDATED` و `RATING_FINALIZED` مُعرَّفة في AuditLog events (spec section 10)؟

---

## المحور 5: الصلاحيات والتحقق والأمان (Authorization & Security)

**الملفات**: `settlements.controller.ts`, `ratings.controller.ts`, `common/guards/`, `common/pipes/`

**البروبمت**:

> راجع الـ Controllers والـ Guards والـ Pipes:
>
> 1. **`@Roles()` الصحيحة**: هل كل endpoint يحمل الـ Role الصحيح؟
>    - Admin endpoints: ADMIN ✓
>    - Runner endpoints: RUNNER ✓
>    - Customer endpoints: CUSTOMER ✓
> 2. **`VerifiedUserGuard`**: هل `@UseGuards(VerifiedUserGuard, RolesGuard)` يضمن أن المستخدم VERIFIED قبل التحقق من الدور؟ هل يمكن Runner غير متحقق يتجاوز؟
> 3. **`@Throttle`**: هل Rate Limiting موجود؟
>    - `close-day`: 5 محاولات/دقيقة (لمنع الإساءة المالية) ✓
>    - Ratings: 20/دقيقة ✓
>    - Runner settlements: 30/دقيقة ✓
>    - هل هذا يتطابق مع spec section 14.2 (100 طلب/دقيقة default)؟
> 4. **Zod Validation Pipe**: هل كل input (body, query, param) يمر عبر `ZodValidationPipe`؟
> 5. **Ownership Check**:
>    - `createRating`: هل يتحقق أن الطلب للعميل الحالي؟ ✓
>    - `updateRating`: هل يتحقق أن الـ Rating يخص العميل الحالي؟ (`orderId_customerId`)
>    - `GET /runner/settlements`: هل يضمن أن الـ Runner يرى تسوياته فقط؟
> 6. **CORS**: هل origins مُقيَّدة؟ راجع `cors-origins.ts`.
> 7. **Hardcoded secrets**: هل يوجد أي secret في الكود الجديد؟
> 8. **Helmet.js**: هل يُطبّق؟
> 9. **SQL Injection**: هل كل الاستعلامات عبر Prisma؟
> 10. **Standardized Error Format**: هل كل error يتبع `{ statusCode, error, message }`؟
>     - `UnprocessableEntityException` → هل يُنتج `422 BUSINESS_RULE_VIOLATION` أم `500`؟
> 11. **هل `GET /admin/settlements/pending` يدعم Pagination؟** يبدو أنه لا يدعمه — هل هذا مقبول لأنه مُجمّع حسب المندوب؟

---

## المحور 6: تصميم API والـ Contracts والمعايير

**الملفات**: `settlements.controller.ts`, `ratings.controller.ts`, `packages/shared-types/src/*.ts`

**البروبمت**:

> راجع الـ API endpoints مقابل مواصفات القسم 9 و shared-types:
>
> 1. **Prefix `/api/v1`**: هل الـ Controller يُسجَّل ب prefix صحيح في `app.module.ts`؟ المسارات تتطابق مع المواصفات؟
> 2. **Pagination**:
>    - `SettlementAdminQuerySchema`: `page`, `limit` مع `.min(1).max(100)` ✓
>    - `SettlementListResponseSchema`: `data + meta(total, page, limit, totalPages)` ✓
>    - `GET /admin/settlements/pending`: يدعم Pagination؟ (يبدو أنه لا — هل مقبول؟)
>    - `GET /runner/settlements`: يدعم Pagination عبر `RunnerSettlementsQuerySchema` ✓
> 3. **Zod Schemas**: هل كل DTO في shared-types ومرتبط بالـ Controller؟
>    - `CloseSettlementSchema` في `settlement.types.ts` ✓
>    - `CreateRatingSchema` و `CreateRatingBodySchema` مختلفان — أيهما يُستخدم؟
> 4. **Standardized Error Format**: هل كل error يتبع `{ statusCode, error, message }`؟
> 5. **Controller → Service**: هل الـ Controller لا يفعل شيء خارج الدعوة للـ Service؟
> 6. **`GET /admin/settlements/pending`**: هل الاستجابة تتبع أي schema في shared-types؟ هل تحتاج Zod schema؟
> 7. **Endpoints مفقودة**: هل هناك endpoint مُعرّف في المواصفات مفقود في Sprint 4؟

---

## المحور 7: WebSocket Events والإشعارات Real-time

**الملفات**: `apps/api/src/websocket/`, `packages/shared-types/src/websocket.events.ts`, `notifications.service.ts`

**البروبمت**:

> راجع تكامل WebSocket:
>
> 1. **`SETTLEMENT_CLOSED` event**: موجود في `ADMIN_EVENTS` ✓. هل يُبثّ فعلاً من الكود (السطر 174)؟ المواصفات تذكر `settlement:reminder` فقط — هل `settlement:closed` تناقض؟
> 2. **`SETTLEMENT_REMINDER` event**: هل يُبثّ بشكل صحيح من Cron Job (السطر 455)? هل يرسل لـ `admin:all` room?
> 3. **Notification sounds**: هل `settlement:reminder` يحمل `sound: 'urgent'` ✓. هل `settlement:closed` يحمل sound مناسب؟ (لا يوجد — هل يجب أن يكون هناك؟)
> 4. **`@Cron` في Service**: هل `this.notificationsService` متاح؟ هل `ScheduleModule` مُسجّل في `app.module.ts`?
> 5. **`emitToAdmin` implementation**: راجع `notifications.service.ts` — هل يُرسل فعلاً إلى `admin:all` room عبر Socket.IO؟ هل يعمل عبر adapter في Railway؟
> 6. **Race condition في Cron**: ماذا لو فشل Cron أو أُعيد تشغيله؟ هل هناك locking mechanism؟
> 7. **Socket Registry**: راجع `socket-registry.ts` — هل الـ Gateway والـ Service يتواصلان عبر الـ registry?
> 8. **Multiple instances**: هل Cron يعمل في كل instance أم مرة واحدة؟ هل هناك حاجة لـ Redis lock؟
> 9. **WebSocket Auth**: هل الـ Clients يُوثّقون عبر `token = accessToken` في auth header؟
> 10. **الأحداث المفقودة**: هل هناك event مُعرّف في spec section 10 يجب أن يكون مفعلاً؟

---

## المحور 8: Data Integrity و Prisma Schema والـ Constraints

**الملفات**: `apps/api/prisma/schema.prisma`, migrations

**البروبمت**:

> راجع الـ Schema والتكامل مع Sprint 4:
>
> 1. **Model Rating unique constraint**: هل `@@unique([orderId, runnerId])` صحيح؟ هل التقييم مفرد لكل (طلب + مندوب) أم لكل (طلب + عميل)؟ هل يمكن لعميل واحد تقييم عدة مناديب لنفس الطلب؟
> 2. **Model SettlementItem**: هل `orderId` هو `@unique` (طلب واحد فقط في تسوية واحدة)؟ هل هذا صحيح؟ هل يمكن أن يكون الطلب في أكثر من تسوية (أيام مختلفة)؟
> 3. **Model Settlement**: هل `@@unique([runnerId, operationalDate])` موجود؟ ✓ هل `operationalDate` String (YYYY-MM-DD) وليس DateTime؟ مقبول؟
> 4. **Model LedgerEntry**: هل `updatedAt` غائب (append-only)؟ هل `createdAt` فقط؟ هل الحقول `type`, `amount`, `description`, `meta` صحيحة؟
> 5. **الـ Migration**: هل هناك migration مُنشأة؟ هل `prisma migrate dev` يعمل؟ هل DB Schema يتطابق مع Prisma Schema؟
> 6. **الـ TODO في `closeDay`**: هل يتم التحقق من DELIVERED orders بدون SettlementItem قبل الـ early return؟
> 7. **`orderNumber`**: هل يُولَّد في transaction بعد الحفظ في أي عملية في Sprint 4؟
> 8. **Indexes**: هل `@@index([runnerId, operationalDate])` و `@@index([status, operationalDate])` موجودة؟ هل هناك حاجة لفهرسة إضافية على Rating؟
> 9. **Prisma Client محدّث**: هل `pnpm db:generate` يعمل بعد أي تغيير؟
> 10. **Relations onDelete**: هل العلاقات في Rating و Settlement و LedgerEntry لها actions صحيحة؟

---

## المحور 9: Endpoints العميل (Customer Orders) والتكامل مع التقييمات والمالية

**الملفات**: `apps/api/src/modules/orders/services/customer-orders.service.ts`, `orders.controller.ts`

**البروبمت**:

> راجع customer order endpoints:
>
> 1. **`GET /customer/orders`**: هل يشمل `hasRating` و `canRate` لكل طلب؟ هل `canRate` = `!hasRating && status === DELIVERED && expiresAt > now()`؟ هل `expiresAt` بتوقيت دمشق أم UTC؟
> 2. **N+1 Query**: هل `GET /customer/orders` يستدعي `rating.findUnique` لكل طلب في القائمة؟ ما الأثر على الأداء؟
> 3. **`GET /customer/orders/:id`**: هل يشمل كل المطلوب؟
>    - Runner data: name, avgRating, totalRatings ✓
>    - Pricing: baseFee, peripheralFee, extraStoresFee, totalFee ✓
>    - OrderStores مع status ✓
>    - OrderItems مع ربط بالمتجر ✓
>    - التقييم: stars فقط ✓
>    - Receipts: URLs ✓
>    - Timeline: createdAt, reviewedAt, assignedAt, startedAt, deliveredAt, cancelledAt ✓
> 4. **Ownership Check**: هل يتحقق أن الطلب للعميل الحالي؟ ماذا لو طلب عميل A طلب العميل B — 404 أم 403؟
> 5. **Schema في shared-types**: هل الـ Response يتبع أي schema مُعرّف؟
> 6. **إلغاء الطلب والتقييم**: إذا أُلغي طلب بعد التسليم والتقييم — هل التقييم يبقى؟ هل `runner.avgRating` يُحدّث عند الإلغاء؟
> 7. **`hasRating` vs `canRate`**: هل يمكن أن يكون `hasRating = true` و `canRate = true` في نفس الوقت؟ (لا يجب — إذا قيّم فلا يمكن التقييم مرة أخرى)

---

## المحور 10: Endpoints المندوب (Runner Settlements) وتكامل Ledger

**الملفات**: `settlements.controller.ts` (Runner endpoints), `settlements.service.ts` (`listRunnerSettlements`, `getCurrentSettlement`), `ledger.controller.ts`, `ledger.service.ts`

**البروبمت**:

> راجع runner settlement endpoints والـ Ledger visibility:
>
> 1. **`GET /runner/settlements`**: هل Runner يرى فقط تسوياته؟ ✓ هل يدعم Pagination ✓
> 2. **`GET /runner/settlements/current`**: هل يستخدم `getOperationalDate()` (Damascus time)؟ ✓ هل يُرجع `NOT_CLOSED` مع ملخص مؤقت إذا لم توجد Settlement؟ ✓
> 3. **Ledger visibility**: هل Runner يرى LedgerEntries الخاصة به فقط؟ هل لا يوجد endpoint يعرّض كل LedgerEntry للـ Runner؟ راجع `ledger.controller.ts`.
> 4. **`resolveRunner`**: هل يتحقق أن `runner.user.status === 'VERIFIED'`؟ ما إذا كان REJECTED أو SUSPENDED؟ هل SUSPENDED منع كامل؟
> 5. **`RunnerCurrentSettlementSchema.parse()`**: هل يُستخدم في الكود؟ ✓ هل الـ types تتطابق؟
> 6. **`listRunnerSettlements`**: هل يعرض كل التسويات (تاريخياً + معلقة) أم فقط الحالية؟ هل هذا مقبول؟
> 7. **`getCurrentSettlement` performance**: هل يحسب البيانات من DB (عبر rawOrders) بدون Settlement موجود — هل هذا الأداء مقبول؟ هل يمكن تحسينه؟
> 8. **`GET /admin/ledger`**: هل Admin فقط؟ هل يمكن للـ Runner رؤية ledger الآخرين عبر أي route؟
> 9. **الحماية**: هل هناك حماية ضد عرض بيانات مالية لـ Runner ليس لديه Settlement؟

---

## المحور 11: Cron Job والمهام المجدولة (Scheduling)

**الملفات**: `settlements.service.ts` (السطر 429-461)

**البروبمت**:

> راجع Cron Job بالتفصيل:
>
> 1. **التوقيت**: `@Cron('0 23 * * *', { timeZone: 'Asia/Damascus' })` — هل يعمل في 23:00 Damascus؟ هل NestJS Schedule يدعم `timeZone`؟ هل `cron-parser` version يدعمه؟
> 2. **`getOperationalDate()` vs Server Time**: هل `new Date()` في Server (UTC) مع `Intl.DateTimeFormat(timeZone: 'Asia/Damascus')` يُنتج تاريخ صحيح حتى عند منتصف الليل؟ هل يمكن أن يكون يوم خاطئ إذا استُدعيت قرب منتصف الليل؟
> 3. **`checkPendingOrders`**: هل تحقق من `DELIVERED` orders بدون `SettlementItem`؟ ✓ هل يغطي حالة وجود Settlement جزئي (تغطي بعض الطلبات فقط)؟
> 4. **`pendingRunnerCount`**: هل عدد المندوبين وليس عدد الطلبات؟ ✓ هل يطابق المواصفات؟
> 5. **Multiple instances**: هل Cron يعمل في كل instance من NestJS؟ هل Railway يُنشئ instances متعددة؟ هل هناك حاجة لـ locking؟
> 6. **إدارة الأخطاء**: ماذا لو فشل Cron؟ هل logging؟ retry؟ هل `emitToAdmin` قد يفشل ويوقف الدالة؟
> 7. **ScheduleModule**: هل مُسجّل في `app.module.ts`؟ هل `@nestjs/schedule` في `package.json`؟
> 8. **Server Time vs Damascus**: هل خادم Railway في timezone مختلف عن UTC؟ هل يؤثر على `new Date()`؟
> 9. **Persistent Cron**: هل يجب أن يُعوّض الأيام الفاترة إذا السيرفر كان مطفأ؟ أم يُشغّل فقط في وقته؟
> 10. **اختبار Cron**: كيف يمكن اختباره؟ هل يمكن محاكاة `getOperationalDate()`؟

---

## المحور 12: البنية الهندسية ونوعية الكود (Code Architecture & Quality)

**الملفات**: جميع ملفات Sprint 4 + `apps/api/src/modules/`

**البروبمت**:

> راجع البنية الهندسية ونوعية الكود:
>
> 1. **Modular Monolith**: هل كل module يتبع نمط Module/Service/Controller؟ هل يوجد separation query/command (كما في Orders module)؟ هل يجب أن يتبع Settlements نفس النمط؟
> 2. **Service layer**: هل الـ Services تحتوي على كل المنطق التجاري أم أن الـ Controllers تحتوي على منطق؟
> 3. **DTOs**: هل كل DTO مُعرّف في `packages/shared-types/src/` ومرتبط عبر `import '@fawrun/shared-types'`؟ هل هناك DTO محلي في Controller أو Service؟
> 4. **Mapper pattern**: هل `rating.mapper.ts` يفصل بين Domain Model و API Response بشكل صحيح؟ هل `mapRating(rating, actor.role)` معقد أكثر من اللازم؟
> 5. **Constants**: هل `CONFIG.RATING_EDIT_WINDOW_HOURS` مُعرّف في `shared-constants`؟ القيمة 24 ساعة صحيحة؟
> 6. **DRY**: هل `getOperationalDate()` مكرر؟ هل `getUtcRangeForOperationalDate()` يُستخدم في أكثر من مكان؟ هل يمكن استخراجه؟
> 7. **Error Handling**: هل الـ Services تُلقي exceptions مناسبة؟ هل الـ Controllers تتعامل معها عبر Exception Filters؟
> 8. **Type Safety**: هل `CloseDayResult` يحتوي على `Date` fields أم `string` (JSON serialization)؟ هل `Settlement` من shared-types يتطابق مع Prisma model؟
> 9. **الاختبارات**: هل هناك اختبارات لـ `settlements.service.ts` و `ratings.service.ts`؟
> 10. **الكود الجديد مقابل المواصفات**: هل كل مهمة في Sprint 4 Brief (4.1-4.6) مُنفّذة بالكامل؟ ما الناقص؟
> 11. **`SettlementListResponse` vs raw response**: هل `listAdmin` يُرجع `SettlementListResponse` أم بيانات خام؟ هل يمر عبر Zod parse؟
> 12. **`getPending`**: هل يستخدم Schema أم يُرجع object raw؟ هل يجب أن يتبع نمط موحّد؟
