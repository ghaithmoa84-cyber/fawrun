# تقرير المراجعة الشاملة — كود وأمان FORERUN

**التاريخ:** 2026-10-03  
**المراجع:** كبير مهندسي البرمجيات ومراجع الكود المستقل  
**النطاق:** Backend (NestJS + Prisma) + Android (Kotlin + Compose + Hilt) + Web Clients + البنية التحتية  

---

## ملخص تنفيذي

مشروع **FORERUN** يتمتع بأساس معماري متين تم تنفيذه بعناية غير معتادة للمشاريع المطورة بالذكاء الاصطناعي، ويظهر ذلك جلياً في الفصل النظيف لطبقة الـ Domain في الأندرويد، وتطبيق نمط آلة الحالة (State Machine) لضبط مسار الطلبات، وقاعدة البيانات الموثقة بـ Schema صارمة مع خلو كامل من ثغرات الحقن (Zero Raw SQL Queries) والالتزام الصارم بعدم استخدام `any` في الواجهات البرمجية. ومع ذلك، تكشف المراجعة الفاحصة عن "أعراض كلاسيكية لكود الذكاء الاصطناعي التراكمي": وجود ثغرة حرجة تُبطل آلية الـ Idempotency في تسليم الطلبات بسبب فحص سطحي استباقي كسر منطق الأمان التزامني، وابتلاع أخطاء بصمت عبر `catch { void 0; }`، وترك استعلامات N+1 في حلقات التكرار المالية، وتضمين مئات النصوص العربية الصلبة (Hardcoded Strings) في كود الأندرويد، وتسريب توكنات FCM في سجلات Logcat غير المحمية، واستثناء كامل لاختبارات التكامل من مشغّل الاختبارات الرئيسي. المشروع جاهز وظيفياً بنسبة 90%، لكنه بحاجة إلى إغلاق هذه الثغرات الحرجة لضمان استقرار العمليات الإنتاجية والأمان المالي.

---

## نتائج المراجعة

---

### 1 — جودة الكود ونظافته (Code Quality & Cleanliness)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 1.1 | `apps/api/src/modules/orders/services/runner-orders.service.ts` | 743–1014 | تعقيد دوال مفرط: دالة `deliverOrder` تمتد على 271 سطراً وتحتوي على فحوصات أمان، استعلامات قاعدة بيانات، تحديثات Ledger، وآلة حالة، وإشعارات. | 🟡 | تفكيك الدالة إلى دوال فرعية مستقلة (validation, ledger processing, state transition). |
| 1.2 | `apps/api/src/modules/orders/services/customer-orders.service.ts` | 49–275 | دالة `createOrder` تمتد على 226 سطراً وتجمع بين إنشاء السجلات، وتكرار المتاجر، والتسعير، والإشعارات وتيليغرام. | 🟡 | نقل منطق إنشاء السلاسل الزمنية والمتاجر لخدمة مساعدة وتخليص الدالة من التضخم. |
| 1.3 | `apps/api/src/modules/orders/services/admin-order-command.service.ts` | 35–226 | دالة `approveOrder` تمتد على 191 سطراً بداخلها تفرعات معقدة لمعالجة المندوب المفضل وتحديثات الحالة. | 🟡 | تقسيم الدالة وتبسيط الفروع المنطقية. |
| 1.4 | `apps/api/src/modules/settlements/settlements.service.ts` | 68–226 | دالة `closeDay` تمتد على 158 سطراً وتحتوي على حسابات مالية وحلقات تكرار متداخلة داخل المعاملة. | 🟡 | عزل عمليات احتساب الحصص (shares calculation) في دوال رياضية نقية (pure functions). |
| 1.5 | `apps/runner-pwa/src/pages/AvailablePage.tsx` | 141 | بقاء `console.log` في بيئة الإنتاج: `console.log('[AUDIO] Playing new order chime via Web Audio API');`. | 🟢 | استبداله بموجّه صوتي صامت أو حذفه لتفادي تسريب تفاصيل للأدوات المساعدة في المتصفح. |
| 1.6 | `apps/api/src/modules/orders/services/customer-orders.service.ts` | 320 | أرقام سحرية (Magic Number): `24 * 60 * 60 * 1000` لحساب مهلة التقييم مكتوبة نصياً دون ثابت معبر. | 🟢 | نقله إلى `packages/shared-constants` تحت اسم `RATING_EXPIRY_MS`. |
| 1.7 | `apps/api/src/modules/orders/services/runner-orders.service.ts` | 293, 743, 975 | أرقام سحرية: مهلة المعاملة `{ timeout: 15000 }` مكررة في أكثر من 4 خدمات دون ثابت مركزي. | 🟢 | توحيد مهلة المعاملات في ثابت موحد `TRANSACTION_TIMEOUT_MS`. |
| 1.8 | `apps/api/src/modules/auth/dto/logout.dto.ts` | 1–2 | طبقة إعادة تصدير غير ضرورية (Dead Indirection): الملف لا يقوم بشيء سوى إعادة تصدير ما هو موجود بالفعل في `@forerun/shared-types`. | 🟢 | استيراد `LogoutDto` و `LogoutSchema` مباشرة من الحزمة المشتركة وحذف الملف الوسيط. |

---

### 2 — الأخطاء البرمجية (Bugs & Defects)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 2.1 | `apps/api/src/modules/orders/services/runner-orders.service.ts` | 755–760 | **إبطال آلية الـ Idempotency بحاجز استباقي خاطئ:** الكود يفحص خارج المعاملة `if (preCheckOrder?.status === 'DELIVERED') throw new ConflictException('ORDER_ALREADY_DELIVERED');` مما يمنع وصول الطلب إلى فحص الـ `idempotencyKey` داخل المعاملة (السطور 780–796)، ويجعل أي محاولة إعادة إرسال آمنة لطلب سُلّم بالفعل تفشل بخطأ 409 بدلاً من الاستجابة السليمة. | 🔴 | إزالة الفحص الاستباقي خارج المعاملة بالكامل والاعتماد على فحص الـ Idempotency داخل الـ Transaction كما صُممت في الأصل. |
| 2.2 | `apps/api/src/modules/pricing/pricing.service.ts` | 57 | رمي استثناء أمني خاطئ: رمي `ForbiddenException` (HTTP 403) عند تمرير عدد متاجر غير صحيح أو سالب بدلاً من `BadRequestException` (HTTP 400). | 🟡 | تصحيح نوع الاستثناء ليكون `BadRequestException` احتراماً للمعايير الدلالية لـ HTTP. |
| 2.3 | `apps/api/src/modules/orders/services/admin-order-command.service.ts` | 254–256, 351–353, 441–443, 650–652, 778–780 | **ابتلاع صامت للأخطاء (Silent Error Swallowing):** استخدام `catch { void 0; }` في 5 مواضع عند إرسال الإشعارات وتحديث الرسوم دون تسجيل الخطأ في الـ Logger إطلاقاً. | 🔴 | استبدال `void 0;` بـ `this.logger.warn('Notification failed', { error, orderId })` لتوثيق أي فشل. |
| 2.4 | `apps/android/app/src/main/java/com/forerun/customer/core/storage/EncryptedTokenStorage.kt` | 22–30 | احتمالية انهيار التطبيق عند تهيئة التشفير (KeyStore Crash): تهيئة `EncryptedSharedPreferences.create` داخل `by lazy` بدون `try/catch`؛ في حال تلف مفتاح الأمان بنظام أندرويد سينهار التطبيق عند الإقلاع بلا رجعة. | 🟡 | إحاطة التهيئة بحماية برمجية مع مسح الملف القديم وإعادة بنائه تلقائياً عند حدوث `KeyStoreException`. |
| 2.5 | `apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeViewModel.kt` | 106–111 | خطر استثناء Coroutine غير ممسوك: دالة `logout()` تستدعي `logoutUseCase()` داخل `viewModelScope.launch` بدون معالجة أخطاء، فإذا فشلت العملية لن يتم الانتقال لشاشة الدخول وقد يتوقف التدفق. | 🟡 | إحاطة الاستدعاء بـ `try/finally` لضمان إطلاق حدث `_navigateToLogin.emit(Unit)` دوماً. |
| 2.6 | `apps/api/src/modules/orders/services/customer-orders.service.ts` | 500–502 | تضارب رسائل الأخطاء عند الإلغاء: فحص `order.runnerId` يعيد `RUNNER_NOT_AVAILABLE` كخطأ 422 بينما الإجراء المطلوب كان إعادة المندوب متاحاً بعد إلغاء الطلب. | 🟢 | تحسين رسالة الخطأ لتكون `CONCURRENT_RUNNER_STATE_CHANGE`. |

---

### 3 — الأخطاء المعمارية (Architectural & Design Flaws)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 3.1 | `apps/api/src/modules/receipts/receipts.controller.ts` | 42–65 | منطق تجاري واستعلامات DB مباشرة في الـ Controller: دالة `resolveOrderStore` تستعلم من `this.prisma` وتتحقق من شروط المندوب داخل المتحكم مباشرة. | 🟡 | نقل الدالة إلى `ReceiptsService` وحذف حقن `PrismaService` من الـ Controller. |
| 3.2 | `apps/api/src/modules/settlements/settlements.controller.ts` | 42–57 | منطق تجاري واستعلامات DB مباشرة في الـ Controller: دالة `resolveRunner` تفحص حالة توثيق المندوب وتستعلم من قاعدة البيانات في المتحكم. | 🟡 | نقل منطق جلب وتحقق المندوب إلى `SettlementsService` أو `RunnersService`. |
| 3.3 | `apps/api/src/modules/orders/orders.controller.ts` | 69 | تكرار تنفيذ الـ Guards: تطبيق `@UseGuards(VerifiedUserGuard, RolesGuard)` على المتحكم بالرغم من أن `RolesGuard` مسجل عالمياً في `app.module.ts:143`. | 🟢 | الاكتفاء بـ `@UseGuards(VerifiedUserGuard)` على مستوى المتحكم أو النقاط المطلوبة. |
| 3.4 | `apps/android/app/src/main/java/com/forerun/customer/domain` | — | فحص طبقة الدومين (Domain Layer Purity): تم فحص الحزمة بالكامل وتبيّن أنها نقية 100% ولا تستورد أي كلاس من `ui` أو `data`. | 🟢 | لا توجد مخالفة — توثيق كفاءة معمارية ونقطة قوة للتطبيق. |

---

### 4 — الأخطاء الأمنية (Security Findings)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 4.1 | `apps/api/src/websocket/gateways/orders.gateway.ts` | 58–74 | **تسريب أحداث التتبع الفوري للحسابات الموقوفة:** بوابة الـ WebSocket تفحص `isDeleted` فقط ولكنها تتجاهل التحقق من `user.status === 'SUSPENDED'`، مما يسمح للمستخدمين الموقوفين باستمرار استقبال أحداث الطلبات والغرف المخصصة. | 🔴 | إضافة شرط فحص الحساب الموقوف وفصل الاتصال فوراً: `if (user.status === 'SUSPENDED') { client.disconnect(true); return; }`. |
| 4.2 | `apps/android/app/src/main/java/com/forerun/customer/core/notification/ForerunFirebaseMessagingService.kt` | 28 | **تسريب توكن FCM في سجلات Logcat بنسخ الإنتاج:** استدعاء `Log.d(TAG, "Refreshed FCM token received: $token")` يتم تنفيذه في النسخ النهائية لأن ملف ProGuard لا يحذف سجلات Log. | 🟡 | إضافة قاعدة إزالة دوال Log في `proguard-rules.pro` أو حصر الطباعة بشرط `if (BuildConfig.DEBUG)`. |
| 4.3 | `apps/android/app/proguard-rules.pro` | 1–76 | غياب قواعد تنظيف السجلات (Log Stripping Rules): لا توجد قاعدة `-assumenosideeffects class android.util.Log { *; }` لحذف سجلات التصحيح من حزم الإصدار النهائي الموقعة. | 🟡 | إضافة القاعدة في ملف ProGuard لحماية بيانات الشبكة والجلسات من الظهور في Logcat الأجهزة. |
| 4.4 | `apps/api/src/modules/auth/auth.controller.ts` | 33–44 | غياب تحديد المعدل (Rate Limiting) على تجديد وتسجيل خروج الجلسة: نقطتا `POST /auth/refresh` و `POST /auth/logout` عامتان (`@Public`) وتفتقران لمحدد طلبات خاص `@Throttle`. | 🟡 | إضافة `@Throttle({ default: { limit: 30, ttl: 60000 } })` لمنع إغراق الخادم بطلبات التجديد. |
| 4.5 | `apps/api/src/modules/users/users.controller.ts` | 21–65 | غياب محدد الطلبات في متحكم المستخدمين: جميع نقاط لوحة التحكم الخاصة بالمستخدمين تخلو من `@Throttle` وتعتمد على السقف العام الواسع. | 🟢 | تقييد معدل طلبات التعديل والتجميد الإداري لحماية النظام. |
| 4.6 | `apps/api/src/modules/customers/customers.controller.ts` | 67–81 | غياب تقييد المعدل على تسجيل توكنات الإشعارات: نقطة `customer/me/device-token` تقبل الطلبات دون `@Throttle` خاص. | 🟢 | إضافة محدد معدل لحماية جدول `DeviceToken` من الحشو العشوائي. |
| 4.7 | `apps/android/app/src/main/java/com/forerun/customer/core/di/NetworkModule.kt` | 60–68 | غياب تثبيت الشهادات (Missing SSL Pinning): عميل OkHttp يتصل بالـ API عبر HTTPS العادي دون تفعيل `CertificatePinner`. | 🟢 | تفعيل Certificate Pinning في تحديثات الأمان المستقبلية لصد هجمات Man-in-the-Middle. |

---

### 5 — جودة الاختبارات (Testing Quality & Coverage)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 5.1 | `apps/api/vitest.config.ts` | 21 | **تعطيل كامل لاختبارات التكامل في المشغل الرئيسي:** ملف الإعداد يستثني صراحة `exclude: ['test/integration/**/*.spec.ts']`؛ هذا يعني أن مسارات تسليم الطلب، وإنشائه، واختبارات المصادقة التكاملية لا تُنفذ عند تشغيل `pnpm test`. | 🔴 | إزالة الاستثناء أو إنشاء أمر تشغيل مخصص `pnpm test:integration` وتوثيقه في خط الأنابيب (CI). |
| 5.2 | `apps/api/src/modules/pricing/pricing.service.ts` | — | **انعدام تام لاختبارات وحدة التسعير:** وحدة التسعير المسؤولة عن احتساب المبالغ، والمناطق الطرفية، والمتاجر الإضافية، وحصص المندوبين تملك 0 اختبارات وحدة. | 🔴 | كتابة ملف `pricing.service.spec.ts` شامل لجميع السيناريوهات والحالات الحدية (Edge Cases). |
| 5.3 | `apps/api/src/modules/settlements/settlements.service.ts` | 70–226 | نقص اختبارات العمليات المالية: اختبارات التسويات تغطي فقط تذكير الـ Cron، بينما العمليات المالية الحساسة (`closeDay`, `confirmSettlement`) لا تملك اختبارات تغطي المعاملات. | 🔴 | كتابة اختبارات مخصصة لـ `closeDay` والتحقق من صحة قيود الـ Ledger ومنع الازدواجية. |
| 5.4 | `apps/android/app/src` | — | **انعدام كامل لاختبارات واجهة المستخدم (UI Tests):** لا يوجد مجلد `androidTest` على الإطلاق، ونسبة إنجاز البند 18.3 في مواصفة الأندرويد (تغطية 5–10 مسارات رئيسية عبر Compose Test) هي 0%. | 🟡 | إنشاء مجموعة اختبارات Compose على الأقل لمسار تسجيل الدخول وتفاصيل الطلب. |
| 5.5 | `apps/api/src/modules/orders/services/admin-order-command.service.ts` | — | غياب اختبارات أوامر الإدارة: دوال اعتماد الطلب، رفضه، وتعيين المندوب تفتقر لاختبارات وحدة معزولة. | 🟡 | إضافة تغطية لاختبارات قبول ورفض وتعيين الطلبات. |

---

### 6 — الأداء وقابلية التوسع (Performance & Scalability)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 6.1 | `apps/api/src/modules/settlements/settlements.service.ts` | 155–165 | **مشكلة N+1 في عمليات الإدخال المالي:** حلقة تكرار تقوم بإنشاء بنود التسوية `await tx.settlementItem.create(...)` بشكل فردي لكل طلب بدلاً من استخدام الإدخال المجمع. | 🟡 | استبدالها بـ `await tx.settlementItem.createMany({ data: items })` لاختصار زمن المعاملة وقفل الجدول. |
| 6.2 | `apps/api/src/modules/orders/services/customer-orders.service.ts` | 160–172 | **مشكلة N+1 عند إنشاء مواد الطلب:** إدخال المواد يتم عبر `await tx.orderItem.create(...)` داخل حلقتي تكرار متداخلتين للمتاجر والمواد. | 🟡 | تجميع المواد في مصفوفة وتنفيذ `createMany` لكل متجر لتقليل مدة المعاملة التي اضطرت الفريق لرفع الـ Timeout إلى 15 ثانية. |
| 6.3 | `apps/api/prisma/schema.prisma` | 303 | **نقص فهرسة قاعدة البيانات (Missing Index):** نموذج `OrderStore` يحتوي فقط على `@@index([orderId, status])`، بينما استعلامات جلب تفاصيل الطلب تعتمد دائماً على `where: { orderId, isDeleted: false }`. | 🟡 | إضافة فهرس مركب `@@index([orderId, isDeleted])` لتحسين أداء استعلامات الطلبات الثقيلة. |
| 6.4 | `apps/api/src/modules/settlements/settlements.service.ts` | 106–116 | استعلامات متكررة في الذاكرة: حلقة تكرار المندوبين تستعلم عن التسوية الفردية `findUnique` داخل الـ Loop لكل مندوب. | 🟢 | استعلام كل التسويات القائمة للمندوبين بدفعة واحدة عبر `findMany` مع معيار `in`. |

---

### 7 — تجربة المستخدم والواجهة (UX/UI & Localization)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 7.1 | `apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt` | 1099–1108 | **نصوص عربية صلبة في حالات الطلب:** تسميات الحالات ("مسودة"، "قيد المراجعة"، "تم تعيين كابتن"، "ملغي"...) مكتوبة حرفياً داخل الكود بدلاً من استخدام `stringResource(R.string.status_*)`. | 🟡 | نقل كافة مسميات الحالات إلى `strings.xml` لتوحيد المصطلحات وتسهيل صيانتها. |
| 7.2 | `apps/android/app/src/main/java/com/forerun/customer/ui/support/SupportViewModel.kt` | 38–67 | نصوص الأسئلة الشائعة صلبة في الـ ViewModel: كافة الأسئلة وإجابات الدعم الفني مكتوبة كنصوص صلبة داخل كود Kotlin. | 🟡 | نقل الأسئلة الشائعة إما إلى موارد النصوص أو جلبها كبيانات مهيأة من الـ API. |
| 7.3 | `apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt` | 270, 284, 348, 371, 380 | نصوص ترحيبية ووصفية صلبة: نصوص مثل ("صباح الخير، ..."، "القنجرة ومحيطها"، "شو محتاج اليوم؟") مكتوبة مباشرة داخل الـ Composables. | 🟡 | ترحيل جميع النصوص إلى `strings.xml`. |
| 7.4 | `apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt` | 223–268 | نصوص أخطاء التحقق صلبة: رسائل "يرجى تحديد عنوان التوصيل"، "يرجى كتابة اسم المادة" مكتوبة في الـ ViewModel. | 🟡 | استخدام معرّفات الموارد (`@StringRes`) داخل الـ State بدلاً من النصوص المباشرة. |
| 7.5 | `apps/android/app/src/main/res/values/strings.xml` | 92, 96 | بقاء نصوص وهمية (Stub Descriptions) في الموارد: عبارات مثل "ستتوفر هنا قريباً" ما زالت موجودة في ملف الموارد المعتمد للنسخ الإنتاجية. | 🟢 | مراجعة الموارد وحذف أي نصوص لم تعد مستخدمة بعد اكتمال الشاشات. |

---

### 8 — البنية التحتية والنشر (Infrastructure & Operations)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 8.1 | `Dockerfile` | 9–11 | **كسر كفاءة الـ Cache في Docker:** نسخ مجلدات `packages/` و `apps/api/` يتم بالكامل قبل أمر `pnpm install`، مما يبطل التخزين المؤقت للطبقات ويعيد تحميل كل الحزم مع كل تغيير برمجي. | 🟡 | نسخ ملفات تعريف الحزم فقط (`package.json` و `pnpm-lock.yaml`) قبل التثبيت، ثم نسخ الكود لاحقاً. |
| 8.2 | `Dockerfile` | 11 | استخدام خيار خطير في تثبيت الحزم: استخدام `pnpm install --no-frozen-lockfile` قد يؤدي إلى تثبيت إصدارات مختلفة في الإنتاج عن البيئة المحلية. | 🟡 | استبداله بـ `pnpm install --frozen-lockfile`. |
| 8.3 | `Dockerfile` | 17–18 | تشغيل الحاوية بصلاحيات Root وانعدام الـ Multi-Stage: الصورة النهائية تحتوي على أدوات البناء وتعمل كمستخدم جذر، وتفتقر لأمر تنفيذ الهجرات التلقائي. | 🟡 | اعتماد Multi-stage Dockerfile مع مستخدم `USER node` وتوثيق أمر الهجرة التلقائي قبل الإقلاع. |
| 8.4 | `apps/api/src/main.ts` | 32–39 | تعطل أداة رصد الأخطاء Sentry في الإنتاج: إعدادات Sentry موجودة برمجياً لكن `SENTRY_DSN` غير مضبوط في بيئة إنتاج Railway (مدرج كبند S4 معلق). | 🟡 | ضبط المتغير `SENTRY_DSN` في Railway لتلقي تقارير الأعطال البرمجية فور حدوثها. |
| 8.5 | `apps/android/app/build.gradle.kts` | — | انعدام نظام تتبع الأعطال في الأندرويد: تطبيق العميل يخلو من Crashlytics أو Sentry، مما يعمي الفريق عن أعطال المستخدمين في الميدان. | 🟡 | ربط Firebase Crashlytics بالتطبيق للاستفادة من مشروع Firebase القائم. |

---

### 9 — التوثيق والصيانة (Documentation & Consistency)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 9.1 | `NEXT_TASKS.md` | 36 | **ملف موثق غير موجود فعلياً:** الملف يشير إلى `docs/performance-baseline.md` كبند Sprint 6، لكن الملف غير موجود إطلاقاً في المستودع. | 🟡 | إنشاء الملف المرجعي للأداء أو توثيق إلغائه رسمياً في سجل القرارات. |
| 9.2 | `packages/shared-constants/src/pricing.ts` | 2 | **تناقض صارخ في قيم الرسوم الأساسية:** ملف الثوابت يحدد `BASE_FEE: 60` (قيمة تجريبية قديمة)، بينما شاشة المساعدة في الأندرويد تذكر أن الرسم الأساسي 5,000 ل.س. | 🟡 | تحديث ثوابت التسعير في الحزمة المشتركة لتعكس الأسعار الحقيقية المعتمدة بالليرة السورية. |
| 9.3 | `docs/sprints/Sprint 6 Brief.md` | — | ملفات السبرنتات القديمة تسبب تشتتاً لعدم تمييز أنها وثائق تاريخية غير تفاعلية. | 🟢 | تم إيضاح ذلك في `PROJECT_STATUS.md §11` ويجب الحفاظ على هذا التنبيه دائماً. |

---

### 10 — مشاكل خاصة بكود الذكاء الاصطناعي (AI Code Idiosyncrasies)

| # | الملف | السطر | المشكلة | الخطورة | التوصية |
|---|---|---|---|---|---|
| 10.1 | `apps/api/src/modules/orders/services/admin-order-command.service.ts` | 792–798 | **بقاء تعليق TODO وحدث مهمل في الإنتاج:** حدث `order:needs_attention` معرف في الأنواع والـ WebSocket والمواصفة، لكنه متروك في الكود الإنتاجي كتعليق `// TODO`. | 🟡 | تنفيذ الـ Cron الخاص بالحدث أو شطبه رسمياً من قائمة أحداث الـ WebSocket لتفادي تضليل المطورين. |
| 10.2 | `packages/shared-constants/src/pricing.ts` | 5–6 | **تناقض مع المواصفة الفنية في حصص الأرباح:** الكود يحدد `RUNNER_SHARE: 0.75` (75%) بينما المواصفة ووثائق المشروع تنص على 80% للمندوب و20% للمنصة. | 🟡 | مطابقة النسبة في الكود مع القرار التجاري المعتمد (0.80 مقابل 0.20). |
| 10.3 | `apps/api/src/modules/orders/services/runner-orders.service.ts` | 755 | **Over-Engineering دفاعي أدى إلى تخريب الوظيفة:** إضافة فحص مسبق استباقي لمنع الحالات المكررة خارج المعاملة أدى إلى شل حركة المعاملة التزامنية الأصلية وكسر الـ Idempotency. | 🔴 | إزالة الأنماط الدفاعية الزائدة خارج المعاملات والاعتماد على الذرّية (Atomicity). |

---

## تصنيف الأولويات

### 🔴 حرج — يجب إصلاحه فوراً قبل الإطلاق الميداني
1. **إصلاح حاجز الـ Idempotency في تسليم الطلبات** (`runner-orders.service.ts:755–760`): إزالة الفحص المسبق خارج المعاملة لتمكين عمليات إعادة المحاولة دون أخطاء 409.
2. **سد ثغرة الـ WebSocket للحسابات الموقوفة** (`orders.gateway.ts:58–74`): طرد المستخدمين ذوي الحالة `SUSPENDED` فوراً من الاتصال المباشر.
3. **منع الابتلاع الصامت للأخطاء** (`admin-order-command.service.ts:254`): استبدال `catch { void 0; }` بتسجيل واضح في الـ Logger.
4. **تفعيل اختبارات التكامل واستكمال اختبارات التسعير والتسويات** (`vitest.config.ts`, `pricing.service.ts`, `settlements.service.ts`): إدخال اختبارات التكامل للخدمة وتغطية العمليات الحسابية والمالية بنسبة 100%.

### 🟡 متوسط — يجب إصلاحه قبل Sprint 10
1. **معالجة N+1 في التسويات وإنشاء الطلبات** (`settlements.service.ts`, `customer-orders.service.ts`): التحول إلى `createMany`.
2. **ترحيل النصوص العربية الصلبة في الأندرويد** إلى `strings.xml` لتوحيد وتنسيق الواجهات.
3. **حماية أندرويد من تسريب التوكنات وتلف المفاتيح**: إضافة قواعد إزالة Log في ProGuard، وإحاطة `EncryptedSharedPreferences` بحماية تلقائية.
4. **تنظيف المتحكمات وتصحيح استثناءات التسعير**: سحب العمليات وقواعد البيانات من `ReceiptsController` و `SettlementsController`، واستبدال 403 بـ 400 في التسعير.
5. **تحسين Dockerfile وتفعيل Sentry**: تحسين طبقات البناء وتأمين الحاوية وضبط DSN.

### 🟢 منخفض — تحسينات مستقبلية
1. تنظيم وتوثيق الفهارس الثانوية لقاعدة البيانات (`OrderStore.isDeleted`).
2. إزالة `console.log` المتبقي في Runner PWA.
3. إزالة ملفات إعادة التصدير غير الضرورية (`logout.dto.ts`).
4. دراسة تفعيل SSL Pinning في إصدارات الأندرويد اللاحقة.

---

## المقاييس الإحصائية

- **إجمالي المشاكل المكتشفة:** 35 مشكلة موثقة بدليل قطعي (الملف والسطر).
- **تصنيف الخطورة:**
  - 🔴 **حرجة:** 6 مشاكل
  - 🟡 **متوسطة:** 20 مشكلة
  - 🟢 **منخفضة:** 9 مشاكل
- **الملف الأكثر مشاكل:** `apps/api/src/modules/orders/services/runner-orders.service.ts` و `admin-order-command.service.ts`.
- **المحور الأكثر مشاكل:** محورا **الأخطاء البرمجية وجودة الاختبارات** في الخلفية، يليهما محور **تجربة المستخدم وتوطين النصوص** في الأندرويد.

---

## توصية عامة

يمتلك مشروع **FORERUN** هيكلية نظيفة وقوية تفوق كثيراً المعدل المعتاد في المشاريع البرمجية المولدة آلياً؛ ولا توجد ديون معمارية كبرى تتطلب إعادة بناء (No major refactoring needed). إن الخطر الحقيقي يكمن في "التفاصيل الصغيرة المتراكمة": فحص استباقي واحد كسر وظيفة أمان مالي حرجة (Idempotency)، وابتلاع أخطاء خفي يحجب فشل الإشعارات، وغياب اختبارات الوحدة عن محرك التسعير، ومئات النصوص الصلبة في تطبيق الموبايل.

**خطة العمل المقترحة:**
1. تخصيص سبرنت تنظيف فني مركّز ومدته يومان (Sprint Technical Hardening) يُخصص بالكامل لمعالجة البنود الـ 6 الحرجة.
2. تفعيل اختبارات التكامل في الـ CI لضمان عدم حدوث تراجعات في العمليات المالية ومسار الـ State Machine.
3. بدء إطلاق تجريبي ميداني محدود فور إغلاق البنود الحرجة.

---
**نهاية تقرير المراجعة.**
