# Sprint 5 — Frontends (ثلاثة أسابيع)

## الهدف العام

بناء الواجهات الأمامية الثلاث بشكل كامل وجاهز للإنتاج: Admin Dashboard (Next.js) خلال أسبوع، Runner PWA (React + Vite) خلال أسبوع، وتطبيق Android (Kotlin) خلال أسبوع ونصف مع مراجعة. جميع الواجهات تتصل بالـ Backend API المبني في الـ Sprints السابقة.

---

## المهام الفرعية

---

### 5.1 Admin Dashboard (Next.js 14 — App Router) — أسبوع

**الوصف:**
إتمام وتطوير لوحة الإدارة المبنية أساسياً في Sprint 2 و Sprint 4 لتصبح كاملة ومصقولة وجاهزة للإنتاج. اللوحة مُوجّهة لفريق الإدارة فقط. وفق القسمين 9.4 و 10.3.

**خطوات التنفيذ التفصيلية:**

#### 5.1.1 صفحة Dashboard الرئيسية

**الوصف:**
بناء صفحة `GET /admin/dashboard` تعرض إحصائيات عامة.

- **Endpoint المستخدم:** `GET /api/v1/admin/dashboard`
- **المحتوى:**
  - عدد الطلبات حسب الحالة (PENDING_REVIEW, IN_PROGRESS, OUT_FOR_DELIVERY, إلخ)
  - عدد المندوبين النشطين (AVAILABLE) والمشغولين (ON_MISSION)
  - عدد المستخدمين بانتظار التفعيل (PENDING_VERIFICATION)
  - إجمالي الإيرادات اليوم (platformShare)
  - عدد التسويات المعلقة (PENDING)
- **WebSocket:** تستمع لكل أحداث الإدارة في room `admin:all`:
  - `order:new` — تحديث عداد الطلبات الجديدة مع صوت `new_order`
  - `order:status_changed` — تحديث الإحصائيات
  - `user:new_registration` — تحديث عداد انتظار التفعيل
  - `settlement:reminder` — عرض تنبيه مع صوت `urgent`

#### 5.1.2 صفحة إدارة المستخدمين (العملاء)

**الوصف:**
صفحة عرض وإدارة حسابات العملاء.

- **Endpoints المستخدمة:**
  - `GET /api/v1/admin/users` — قائمة مع Pagination
  - `GET /api/v1/admin/users/:id` — تفاصيل عميل
  - `PUT /api/v1/admin/users/:id/verify` — تفعيل حساب
  - `PUT /api/v1/admin/users/:id/reject` — رفض حساب
  - `PUT /api/v1/admin/users/:id/suspend` — تعليق حساب
- **المحتوى:**
  - جدول يعرض: الاسم، WhatsApp، الحالة، تاريخ التسجيل
  - فلاتر: الحالة (PENDING_VERIFICATION, VERIFIED, REJECTED, SUSPENDED)
  - أزرار الإجراءات: تفعيل (أخضر)، رفض (أحمر)، تعليق (برتقالي)
  - صفحة تفاصيل العميل: بياناته + عنوانه + إحصائياته (completedOrders, totalFeesPaid)

#### 5.1.3 صفحة إدارة المندوبين

**الوصف:**
صفحة عرض وإدارة حسابات المندوبين.

- **Endpoints المستخدمة:**
  - `GET /api/v1/admin/runners` — قائمة مع Pagination
  - `POST /api/v1/admin/runners` — إنشاء مندوب جديد
  - `PUT /api/v1/admin/runners/:id` — تعديل بيانات
  - `PUT /api/v1/admin/runners/:id/visibility` — إخفاء/إظهار
- **المحتوى:**
  - جدول يعرض: الاسم، WhatsApp، الحالة (AVAILABLE/ON_MISSION/UNAVAILABLE)، التقييم (avgRating)، الظهور (isVisible)
  - نموذج إنشاء مندوب جديد: الاسم، WhatsApp، كلمة المرور
  - أزرار: تعديل، إخفاء/إظهار
  - ملاحظات داخلية (notes) — تظهر فقط للإدارة

#### 5.1.4 صفحة إدارة الطلبات

**الوصف:**
صفحة عرض وإدارة جميع الطلبات مع كل العمليات المتاحة.

- **Endpoints المستخدمة:**
  - `GET /api/v1/admin/orders` — قائمة مع Pagination وFilters
  - `GET /api/v1/admin/orders/:id` — تفاصيل طلب كاملة
  - `GET /api/v1/admin/orders/:id/audit` — سجل أحداث الطلب
  - `PUT /api/v1/admin/orders/:id/approve` — اعتماد + تحديد peripheral
  - `PUT /api/v1/admin/orders/:id/reject` — رفض
  - `PUT /api/v1/admin/orders/:id/assign-runner` — تعيين مندوب
  - `PUT /api/v1/admin/orders/:id/cancel` — إلغاء
- **المحتوى:**
  - جدول يعرض: رقم الطلب (orderNumber)، اسم العميل، الحالة، الرسم، التاريخ
  - فلاتر: الحالة، المندوب، العميل، نطاق التاريخ
  - صفحة تفاصيل الطلب تشمل:
    - معلومات العميل وعنوان التسليم (مع خريطة Leaflet)
    - قائمة المواد مع المتاجر
    - صور الإيصالات
    - معلومات المندوب المُعيّن
    - التسعير الكامل (baseFee, peripheralFee, extraStoresFee, totalFee)
    - Timeline: سجل الأحداث (AuditLog) مرتب زمنياً
    - التقييم (إذا وُجد): stars + note
  - نموذج الاعتماد: checkbox لـ `isPeripheral` + حقل ملاحظات
  - نموذج تعيين المندوب: dropdown يعرض المندوبين المتاحين (status: AVAILABLE)
  - زر إلغاء مع حقل لسبب الإلغاء

#### 5.1.5 صفحة التسويات المالية

**الوصف:**
صفحة إدارة التسويات اليومية والسجل المالي.

- **Endpoints المستخدمة:**
  - `GET /api/v1/admin/settlements` — قائمة التسويات
  - `GET /api/v1/admin/settlements/pending` — التسويات المعلقة
  - `POST /api/v1/admin/settlements/close-day` — إغلاق يوم
  - `PUT /api/v1/admin/settlements/:id/mark-settled` — تأكيد التسوية
  - `GET /api/v1/admin/ledger` — السجل المالي
- **المحتوى:**
  - عرض التسويات المعلقة بارزة في الأعلى
  - جدول التسويات: التاريخ، المندوب، عدد الطلبات، المبالغ، الحالة
  - زر "إغلاق يوم": نموذج اختيار التاريخ + ملاحظات
  - زر "تأكيد التسوية" لكل تسوية معلقة
  - السجل المالي (Ledger): جدول يعرض كل entries مع فلاتر

#### 5.1.6 إعداد HTTP Client + WebSocket Client + JWT Refresh

**الوصف:**
إتمام الـ HTTP client والـ WebSocket client مع JWT refresh تلقائي.

- HTTP client يستخدم `NEXT_PUBLIC_API_URL`
- يُضيف `Authorization: Bearer` header تلقائياً
- يُجدد Access Token تلقائياً قبل انتهائه بـ 10 دقائق (القسم 17)
- عند فشل التجديد: يُعيد التوجيه لصفحة Login
- WebSocket client يتصل بـ `NEXT_PUBLIC_WS_URL` namespace `/admin`
- ينضم لـ room `admin:all`
- يتعامل مع انقطاع الاتصال وإعادة الربط

**المخرج المتوقع:**
- Admin Dashboard كامل ومصقول بكل الصفحات المذكورة
- جميع الـ Endpoints مربوطة ووظيفية
- WebSocket events تعمل مع تحديث فوري للبيانات
- أصوات الإشعار تعمل
- JWT refresh تلقائي
- Pagination وFilters تعمل في كل القوائم

**الاعتماديات:** Sprints 1-4 مكتملة

---

### 5.2 Runner PWA (React + Vite) — أسبوع

**الوصف:**
إتمام وتطوير Runner PWA المبني أساسياً في Sprint 3 ليصبح كاملاً ومصقولاً وجاهزاً للإنتاج. الـ PWA يُستخدم من المندوبين عبر متصفح الهاتف. وفق القسمين 9.3 و 9.3.1.

**خطوات التنفيذ التفصيلية:**

#### 5.2.1 شاشة تسجيل الدخول (LoginPage)

- **Endpoint:** `POST /api/v1/auth/login`
- حقول: WhatsApp + كلمة مرور
- عند النجاح: حفظ tokens في localStorage + انتقال للشاشة الرئيسية
- عند الفشل: عرض رسالة خطأ

#### 5.2.2 شاشة "أنا متاح" (AvailablePage)

- **Endpoints:**
  - `PUT /api/v1/runner/me/status` — تبديل AVAILABLE/UNAVAILABLE
  - `GET /api/v1/runner/me` — بيانات المندوب
- **المحتوى:**
  - زر تبديل كبير وواضح: "أنا متاح" / "غير متاح"
  - عرض حالة المندوب الحالية
  - عرض التقييم: `avgRating` + `totalRatings`
- **WebSocket:**
  - تستمع لحدث `order:assigned` في room `runner:{runnerId}`
  - عند وصول طلب جديد (القسم 9.3.1):
    - تشغيل صوت تنبيه `new_order`
    - الانتقال تلقائياً لشاشة `ActiveOrderPage` بدون أي إجراء من المندوب
  - **ملاحظة:** لا يوجد push notification في MVP — الـ PWA يجب أن يكون مفتوحاً في المتصفح ليستقبل الإشعار (القسم 9.3.1)

#### 5.2.3 شاشة الطلب النشط (ActiveOrderPage)

- **Endpoints:**
  - `GET /api/v1/runner/orders/active` — الطلب النشط
  - `PUT /api/v1/runner/orders/:id/start` — بدأت
  - `GET /api/v1/runner/orders/:id/stores` — المتاجر
  - `POST /api/v1/runner/orders/:id/stores` — إضافة متجر
  - `DELETE /api/v1/runner/orders/:id/stores/:storeId` — حذف متجر
  - `PUT /api/v1/runner/orders/:id/stores/:storeId/purchase` — تأكيد الشراء
  - `PUT /api/v1/runner/orders/:id/stores/:storeId/skip` — تخطي
  - `POST /api/v1/runner/orders/:id/stores/:storeId/receipts/presigned-url` — طلب URL رفع
  - `POST /api/v1/runner/orders/:id/stores/:storeId/receipts` — تأكيد رفع
  - `DELETE /api/v1/runner/orders/:id/stores/:storeId/receipts/:receiptId` — حذف صورة
  - `POST /api/v1/runner/orders/:id/items` — إضافة مادة
  - `PUT /api/v1/runner/orders/:id/proceed-to-delivery` — انتقل للتوصيل
  - `PUT /api/v1/runner/orders/:id/deliver` — تم التسليم
- **المحتوى:**
  - **مرحلة ASSIGNED:**
    - عرض تفاصيل الطلب: رقم الطلب، اسم العميل، المواد، المتاجر
    - خريطة عنوان التسليم (Leaflet + OpenStreetMap)
    - زر "بدأت" كبير وواضح
  - **مرحلة IN_PROGRESS:**
    - قائمة المتاجر مع حالة كل متجر (PENDING/PURCHASED/SKIPPED)
    - لكل متجر بحالة PENDING:
      - عرض المواد المطلوبة
      - زر "تم الشراء" + زر "لم يتم الشراء (تخطي)"
      - زر رفع إيصال (يفتح الكاميرا أو معرض الصور)
      - عرض الإيصالات المرفوعة مع إمكانية الحذف
    - زر "إضافة متجر جديد"
    - زر "إضافة مادة" لمتجر موجود
    - الرسم الحالي (يتحدث تلقائياً عند كل purchase)
    - زر "انتقل للتوصيل" (يظهر فقط بعد التعامل مع جميع المتاجر)
  - **مرحلة OUT_FOR_DELIVERY:**
    - خريطة عنوان التسليم
    - زر "تم التسليم" كبير وواضح
  - **رفع الإيصالات:**
    - يطلب Presigned URL من API
    - يرفع الصورة مباشرة لـ Cloudflare R2
    - يُبلّغ API بالرفع
    - يعرض الصورة المرفوعة مع زر حذف

#### 5.2.4 شاشة التسويات (SettlementsPage)

- **Endpoints:**
  - `GET /api/v1/runner/settlements` — سجل التسويات
  - `GET /api/v1/runner/settlements/current` — تسوية اليوم
- **المحتوى:**
  - تسوية اليوم في الأعلى: عدد الطلبات، المبلغ الإجمالي، حصة المندوب
  - سجل التسويات السابقة مع Pagination

#### 5.2.5 إعدادات PWA

- `manifest.json` كامل
- Service Worker: precaching للأصول الثابتة
- أيقونات التطبيق بأحجام مختلفة
- `display: standalone` ليبدو كتطبيق أصلي
- اتجاه RTL مدعوم

**المخرج المتوقع:**
- Runner PWA كامل ومصقول بكل الشاشات
- يعمل كـ PWA من المتصفح (installable)
- WebSocket يعمل لاستقبال الطلبات الجديدة
- رفع الإيصالات يعمل عبر Presigned URL
- خرائط Leaflet تعرض عنوان التسليم
- JWT refresh تلقائي

**الاعتماديات:** Sprints 1-4 مكتملة

---

### 5.3 Android App (Kotlin — Native Android) — أسبوع ونصف مع مراجعة

**الوصف:**
بناء تطبيق أندرويد أصلي للعملاء وفق القسم 18 من الوثيقة. التطبيق يدعم RTL بالكامل (جمهور عربي).

**خطوات التنفيذ التفصيلية:**

#### 5.3.1 إعداد المشروع

- إنشاء مشروع Kotlin في `apps/android/`
- **Stack التقني** (القسم 18.1):
  - Kotlin 1.9+, Android 8+ (API 26)
  - Gradle (Kotlin DSL)
  - Jetpack Compose 1.5+
  - Compose Navigation 2.7+
  - Dagger Hilt 2.48+
  - Retrofit 2.9+ + Moshi
  - OKHttp WebSocket
  - Room 2.6+ + Preferences DataStore
  - WorkManager
  - Sentry Android SDK
  - Google Maps SDK
  - Android Location API
  - Glide (عرض صور)
  - Kotlinx Coroutines 1.7+
  - lifecycle-viewmodel-compose

- **Architecture:** MVVM (القسم 18.2):
  ```
  Compose UI → ViewModel (UiState + Intent) → Use Cases → Repository → Data Layer (Retrofit + Room)
  ```

- إعداد RTL:
  - `android:supportsRtl="true"` في AndroidManifest
  - `LayoutDirection.Rtl` في Compose

- إعداد Hilt Modules (القسم 18.4):
  - `NetworkModule`: OkHttpClient + Retrofit + AuthInterceptor + RefreshTokenInterceptor
  - `DatabaseModule`: Room Database + DAOs
  - `RepositoryModule`: Repository bindings
  - `ViewModelModule`: ViewModel bindings

#### 5.3.2 Data Layer

- **FawrunApiService** (Retrofit interface — القسم 18.5):
  - `POST auth/login`
  - `POST auth/refresh`
  - `POST customer/orders`
  - `GET customer/orders` (مع pagination + status filter)
  - `GET customer/orders/{id}`
  - `POST customer/orders/{id}/ratings`
  - `PUT customer/orders/{id}/ratings`
  - `PUT customer/me`
  - `PUT customer/me/address`
  - `GET customer/me`
  - `GET customer/me/address`
  - `GET customer/runners`
  - `DELETE customer/orders/{id}`

- **AuthInterceptor** (القسم 18.5): يُضيف `Authorization: Bearer` header تلقائياً
- **RefreshTokenInterceptor** (القسم 18.5): يعالج 401 ويُجدد Access Token عبر `/auth/refresh`
  - عند فشل التجديد: إعادة التوجيه لشاشة Login

- **Room Database** (القسم 18.6):
  - Entities: `OrderEntity`, `OrderStoreEntity`, `OrderItemEntity`, `ReceiptEntity`, `RatingEntity`, `CustomerEntity`, `RunnerEntity`, `LedgerEntryEntity`, `SettlementEntity`
  - DAOs: `OrderDao`, `OrderStoreDao`, `OrderItemDao`, `ReceiptDao`, `RatingDao`, `CustomerDao`, `RunnerDao`, `LedgerEntryDao`, `SettlementDao`
  - كل entity كما ورد في القسم 18.6

- **TokenManager** (Preferences DataStore — القسم 18.6):
  - `saveTokens(accessToken, refreshToken)`
  - `getAccessToken()`
  - `clearTokens()`
  - يحفظ أيضاً: `USER_ID`, `USER_ROLE`

- **WebSocket** (القسم 18.5):
  - OKHttp WebSocket
  - Connection trigger: عند فتح التطبيق
  - Events: `order:status_changed`, `order:runner_assigned`, `order:fee_updated`, `order:store_purchased`, `order:out_for_delivery`, `order:delivered`, `order:cancelled`, `account:verified`
  - Reconnection: exponential backoff (1s, 2s, 4s, 8s, 16s)

- **Sync Strategy** (القسم 18.6):
  - Orders sync: عند توفر الشبكة، تحديث من الخادم
  - Offline queue: إذا فشلت الشبكة، تخزين في Room، إعادة المحاولة مع WorkManager
  - Data retention: 7 أيام cache محلي

#### 5.3.3 Domain Layer

- **Models** (القسم 18.8): `Order`, `OrderItem`, `OrderStore`, `Receipt`, `Rating`, `Customer`, `Runner`, `Settlement`
- **Use Cases** (القسم 18.8):
  - `CreateOrderUseCase`
  - `GetOrdersUseCase`
  - `GetOrderDetailUseCase`
  - `SubmitRatingUseCase`
  - `LoginUseCase`
  - `RefreshTokenUseCase`
  - `UpdateProfileUseCase`
  - `UpdateAddressUseCase`

#### 5.3.4 Presentation Layer — الشاشات

**الشاشات المطلوبة (MVP)** — القسم 18.7:

| # | الشاشة | الـ API | الوظيفة |
|---|--------|--------|---------|
| 1 | `LoginScreen` | `POST /auth/login` | تسجيل الدخول (WhatsApp + كلمة مرور) |
| 2 | `HomeScreen` | `GET /customer/me` | شاشة رئيسية: shortcut لإنشاء طلب جديد + رؤية طلبات نشطة |
| 3 | `CreateOrderScreen` | `POST /customer/orders` | إضافة مواد نص حر، تحديد موقع بالسحب على الخريطة، ملاحظات، مندوب مفضل |
| 4 | `OrdersListScreen` | `GET /customer/orders` | قائمة الطلبات مع فلتر الحالة |
| 5 | `OrderDetailScreen` | `GET /customer/orders/:id` | تتبع الحالة، متاجر، مواد، المندوب، الرسم |
| 6 | `RatingScreen` | `POST/PUT /customer/orders/:id/ratings` | إرسال/تعديل تقييم المندوب (نجوم 1-5 + ملاحظة) — فقط بعد DELIVERED |
| 7 | `AccountScreen` | `GET/PUT /customer/me`, `PUT /customer/me/address` | الملف الشخصي، تغيير كلمة المرور، العنوان |

**ملاحظات (القسم 18.7):**
- لا توجد شاشة Register في MVP — التسجيل يتم عبر وسيلة أخرى (WhatsApp)
- لا شاشة Admin — Admin Dashboard هو Next.js
- لا شاشة Runner — Runner PWA هو React

**Navigation** (القسم 18.3):
```kotlin
NavHost(navController, startDestination = "login") {
    composable("login") { LoginScreen(...) }
    composable("home") { HomeScreen(...) }
    composable("create_order") { CreateOrderScreen(...) }
    composable("orders") { OrdersListScreen(...) }
    composable("order_detail/{orderId}") { OrderDetailScreen(...) }
    composable("rating/{orderId}") { RatingScreen(...) }
    composable("account") { AccountScreen(...) }
}
```

**الانتقالات (القسم 18.3):**
- Login → Home: بعد تسجيل الدخول الناجح (`NavOptions popUpTo(login) inclusive`)
- Home → CreateOrder: action
- OrdersList → OrderDetail: action مع argument `orderId`
- OrderDetail → Rating: action (فقط بعد DELIVERED)
- أي شاشة → Account: action

**كل شاشة تحتوي على:**
- ViewModel: يحتفظ بـ `UiState` (StateFlow) ويستقبل `Intent` (sealed interface)
- Screen: Composable يقرأ UiState ويُرسل Intents

**UiState Pattern** (القسم 18.2):
```kotlin
data class OrderCreateUiState(
    val items: List<OrderItemUi> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val orderNumber: String? = null
)
```

**Intent Pattern** (القسم 18.2):
```kotlin
sealed interface OrderCreateIntent {
    data class AddItem(val itemName: String, val quantity: String, val storeName: String?) : OrderCreateIntent
    data class RemoveItem(val index: Int) : OrderCreateIntent
    data object Submit : OrderCreateIntent
}
```

#### 5.3.5 تفاصيل شاشة CreateOrderScreen

- إضافة مواد (نص حر): اسم المادة + الكمية (نص حر مثل "2 كغ" أو "3 حبات")
- تحديد المتجر لكل مادة: حقل نص حر اختياري (`customStoreName`) + خيار "أي متجر" (`anyStore`)
- **لا يوجد قائمة متاجر مسبقة — المتاجر تُكتب يدوياً من العميل كنص حر** (القسم 1)
- تحديد الموقع: خريطة Google Maps SDK مع marker قابل للسحب
- زر "موقعي الحالي": يستخدم Android Location API
- حقل ملاحظات (اختياري)
- اختيار مندوب مفضل (اختياري): قائمة من `GET /customer/runners`
- خيار "انتظر المندوب المفضل" (checkbox)
- زر "أرسل الطلب"

#### 5.3.6 تفاصيل شاشة OrderDetailScreen

- عرض حالة الطلب مع Timeline بصري
- عرض المواد مع المتاجر وحالاتها
- عرض بيانات المندوب (إذا معيّن): الاسم + التقييم
- عرض التسعير: baseFee + peripheralFee + extraStoresFee = totalFee
- عرض صور الإيصالات (Glide لتحميل الصور)
- زر إلغاء (إذا كان قبل IN_PROGRESS)
- زر تقييم (إذا DELIVERED ولم يُقيَّم)

#### 5.3.7 Folder Structure

وفق القسم 18.8:
```
apps/android/app/src/main/java/com/fawrun/customer/
├── FawrunApp.kt
├── navigation/FawrunNavGraph.kt
├── di/ (NetworkModule, DatabaseModule, RepositoryModule, ViewModelModule)
├── data/
│   ├── api/ (FawrunApiService, AuthInterceptor, RefreshTokenInterceptor)
│   ├── repository/ (AuthRepository, OrderRepository, RatingRepository, ProfileRepository)
│   ├── local/
│   │   ├── db/ (FawrunDatabase, dao/*, entities/*)
│   │   └── preferences/ (TokenManager)
│   └── websocket/ (WebSocketService, WebSocketRepository)
├── domain/
│   ├── model/ (Order, OrderItem, OrderStore, Receipt, Rating, Customer, Runner, Settlement)
│   └── usecase/ (CreateOrderUseCase, GetOrdersUseCase, ...)
├── presentation/
│   ├── auth/ (LoginScreen, LoginViewModel)
│   ├── home/ (HomeScreen, HomeViewModel)
│   ├── order/ (CreateOrderScreen, CreateOrderViewModel, OrdersListScreen, OrdersListViewModel, OrderDetailScreen, OrderDetailViewModel)
│   ├── rating/ (RatingScreen, RatingViewModel)
│   └── account/ (AccountScreen, AccountViewModel)
├── utils/ (UiState, Intent, Extensions, Constants)
└── resources/ (values/strings.xml, colors.xml, themes.xml, mipmap-hdpi/)
```

**المخرج المتوقع:**
- تطبيق Android أصلي يعمل بـ Kotlin + Jetpack Compose
- يدعم RTL بالكامل
- MVVM architecture مع UiState + Intent patterns
- كل الشاشات السبع مبنية ووظيفية
- Retrofit + Moshi للشبكة مع JWT refresh تلقائي
- OKHttp WebSocket مع reconnection
- Room DB للتخزين المحلي
- Google Maps SDK لتحديد الموقع
- Offline queue مع WorkManager

**الاعتماديات:** Sprints 1-4 مكتملة

---

## معايير الإنجاز (Definition of Done) — Sprint 5

- [ ] **Admin Dashboard:**
  - [ ] صفحات: Dashboard, Users, Runners, Orders, Settlements/Ledger كلها تعمل
  - [ ] WebSocket events تُحدّث الواجهة فورياً
  - [ ] أصوات الإشعار تعمل (new_order, urgent, success)
  - [ ] Pagination وFilters تعمل في كل القوائم
  - [ ] خرائط Leaflet تعرض مواقع التسليم
  - [ ] JWT refresh تلقائي
- [ ] **Runner PWA:**
  - [ ] شاشات: Login, Available, ActiveOrder, Settlements كلها تعمل
  - [ ] استقبال الطلبات عبر WebSocket مع صوت وانتقال تلقائي
  - [ ] إدارة المتاجر (شراء، تخطي، إضافة، حذف) تعمل
  - [ ] رفع الإيصالات عبر Presigned URL يعمل
  - [ ] PWA installable من المتصفح
  - [ ] JWT refresh تلقائي
- [ ] **Android App:**
  - [ ] الشاشات السبع (Login, Home, CreateOrder, OrdersList, OrderDetail, Rating, Account) تعمل
  - [ ] RTL بالكامل
  - [ ] MVVM architecture مع Hilt DI
  - [ ] Retrofit + JWT refresh تلقائي
  - [ ] WebSocket مع reconnection
  - [ ] Room DB + offline sync
  - [ ] Google Maps SDK لتحديد الموقع
  - [ ] المواد والمتاجر نص حر (لا كتالوج)
