# Code Review — 2026-09-30

## ملخص تنفيذي
- **إجمالي المشاكل البرمجية والمعمارية:** 26 مشكلة (14 من الجولة الأولى + 12 من المراجعة المعمارية العميقة) بالإضافة إلى 81 نصاً عربياً hardcoded.
- **المشاكل الحرجة (Critical):** 10 مشاكل (5 سطحية/وظيفية + 5 معمارية عميقة تؤدي لتعطل الـ WebSocket، الجلسة، والازدواج المالي).
- **المشاكل المتوسطة (Medium):** 13 مشكلة (6 من الجولة الأولى + 7 معمارية ووظيفية).
- **المشاكل السطحية (Surface):** 3 مشاكل بصرية وتكرار كود.

---

## المشاكل الحرجة (تؤثر على الاستخدام)

### [CRITICAL-01] زر تقييم الكابتن متاح دائماً للضغط حتى بعد انتهاء مهلة الـ 24 ساعة
- **الملف:** [OrderDetailScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L241-L246)
- **السطر:** 241 و 457
- **الوصف:** في [OrderDetailScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L241)، يتم التحقق فقط من كون حالة الطلب `order.status == "DELIVERED"` لعرض بطاقة التقييم `DeliveredRatingCard` وتفعيل زر `Button(onClick = onRateClick)` بشكل دائم، مع تجاهل فحص الخاصية المحسوبة [uiState.canRate](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailViewModel.kt#L54-L67).
- **التأثير:** يستطيع المستخدم الضغط على زر تقييم الكابتن لطلبات تم تسليمها منذ أيام أو أسابيع، وينتقل لشاشة التقييم [RatingScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/rating/RatingScreen.kt) ليتفاجأ بأن النجوم معطلة والزر معطل وتظهر له رسالة انتهاء المهلة، بدلاً من إخفاء بطاقة التقييم أو تعطيل الزر من شاشة تفاصيل الطلب مباشرة.
- **الإصلاح المقترح:**
```kotlin
if (order.status == "DELIVERED" && uiState.canRate) {
    DeliveredRatingCard(order = order, onRateClick = { onNavigateToRating(order.id) })
}
```

---

### [CRITICAL-02] شاشتا التحقق والتعليق بدون تمرير (No Scroll) مما يقطع الأزرار على الشاشات الصغيرة
- **الملف:** [PendingVerificationScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/PendingVerificationScreen.kt#L67) و [SuspendedScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/SuspendedScreen.kt#L64)
- **السطر:** [PendingVerificationScreen.kt:67](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/PendingVerificationScreen.kt#L67) و [SuspendedScreen.kt:64](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/SuspendedScreen.kt#L64)
- **الوصف:** تستخدم الشاشتان حاوية `Column` بكامل الشاشة `fillMaxSize()` ومحاذاة رأسية `Arrangement.Center` دون إضافة معدل التمرير `verticalScroll(rememberScrollState())`.
- **التأثير:** على الأجهزة ذات الشاشات الصغيرة (مثل شاشات 4.7 إلى 5.5 إنش)، أو عند تفعيل تكبير النصوص من إعدادات إمكانية الوصول (Accessibility Font Scale > 1.15x)، أو عند تدوير الجهاز أفقياً (Landscape)، يختفي زر الواتساب أو زر تسجيل الخروج أسفل الشاشة تماماً دون إمكانية التمرير للوصول إليهما، مما يحبس المستخدم داخل الشاشة دون مخرج.
- **الإصلاح المقترح:**
```kotlin
Column(
    modifier = modifier.fillMaxSize().background(ForerunBackground).verticalScroll(rememberScrollState()).padding(horizontal = Dimens.ScreenMargin, vertical = Dimens.Space24),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.Center
)
```

---

### [CRITICAL-03] غياب مؤشر التحميل (Loading Indicator) وحالة إعادة المحاولة في شاشة الحساب
- **الملف:** [AccountScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountScreen.kt#L120-L135)
- **السطر:** 120-135
- **الوصف:** بالرغم من احتواء [AccountUiState](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L24) على خاصية `val isLoading: Boolean` وقيام [AccountViewModel](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L55) بتفعيلها أثناء الاتصال، فإن [AccountScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountScreen.kt) تتجاهل هذه الحالة كلياً ولا تملك أي فحص لـ `uiState.isLoading`.
- **التأثير:** عند فتح شاشة الحساب، تظهر الشاشة فوراً بحقول فارغة وعدادات إحصائيات صفرية ("0 طلبات"، "0 ل.س") لبرهة من الوقت توهم المستخدم بضياع بياناته حتى يكتمل الطلب. وفي حال فشل الاتصال، لا يتوفر زر لإعادة المحاولة (Retry Button) ويبقى المستخدم عاجزاً عن استعادة بيانات حسابه.
- **الإصلاح المقترح:**
```kotlin
if (uiState.isLoading && uiState.profile == null) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = ForerunGreen) }
} else { ... }
```

---

### [CRITICAL-04] فشل تحميل قائمة الطلبات يعرض حالة فارغة مضللة بدلاً من رسالة الخطأ وزر الإعادة
- **الملف:** [OrdersScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersScreen.kt#L144-L148)
- **السطر:** 144-148
- **الوصف:** عند فشل الاتصال بالشبكة في الجلب الأول للطلبات، تكون القائمة `uiState.displayedOrders` فارغة ومتغير `uiState.errorMessage` يحمل رسالة الخطأ. الشرط في السطر 144 يعرض فوراً [OrdersEmptyState](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersScreen.kt#L475) مع عبارة "لا توجد طلبات هنا — ابدأ طلباً جديداً" ويكتفي بـ Snackbar عابر يختفي سريعاً.
- **التأثير:** يعتقد العميل خطأً أن حسابه لا يحتوي على أية طلبات أو أن طلباته حُذفت، ولا يجد زراً ثابتاً لإعادة المحاولة (Retry) بعد عودة الإنترنت.
- **الإصلاح المقترح:**
```kotlin
uiState.errorMessage != null && uiState.displayedOrders.isEmpty() -> {
    OrdersErrorState(message = uiState.errorMessage!!, onRetry = { viewModel.onIntent(OrdersListIntent.Refresh) })
}
```

---

### [CRITICAL-05] خوارزمية تنظيف رقم الكابتن قد تنتج رمز دولة مكرراً وتفشل رابط الواتساب
- **الملف:** [OrderDetailScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L260-L262)
- **السطر:** 260-262
- **الوصف:** يتم تنظيف رقم الكابتن عبر:
  ```kotlin
  val cleaned = phone.removePrefix("+").removePrefix("0")
  val url = "https://wa.me/963$cleaned"
  ```
  إذا كان السيرفر يعيد رقم الكابتن بصيغة دولية كاملة مثل `+963912345678` أو `963912345678`، فإن `removePrefix("+")` تترك `963912345678`، ثم `removePrefix("0")` لا تفعل شيئاً لأن الرقم لا يبدأ بصفر. الرابط الناتج يصبح: `"https://wa.me/963963912345678"`.
- **التأثير:** فتح تطبيق واتساب برقم خاطئ وظهور خطأ "رقم الهاتف غير مسجل في واتساب"، مما يمنع العميل من التواصل مع الكابتن لتنسيق استلام طلبه.
- **الإصلاح المقترح:**
```kotlin
val cleaned = phone.removePrefix("+").removePrefix("963").removePrefix("0")
val url = "https://wa.me/963$cleaned"
```

---

## المشاكل المتوسطة

### [MEDIUM-01] تداخل Scaffolds داخلية مع الـ Scaffold الرئيسي للـ NavGraph
- **الملف:**
  - [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L217) (السطر 217)
  - [CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt#L193) (السطر 193)
  - [OrderDetailScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L133) (السطر 133)
  - [OrderConfirmationScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/confirmation/OrderConfirmationScreen.kt#L68) (السطر 68)
  - [RatingScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/rating/RatingScreen.kt#L104) (السطر 104)
  - [SupportScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/support/SupportScreen.kt#L79) (السطر 79)
- **الوصف:** يُعرّف [ForerunNavGraph.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/navigation/ForerunNavGraph.kt#L78) هيكل `Scaffold` خارجي أساسي يقوم بحساب الـ `innerPadding` وتطبيقه على حاوية `NavHost`. ثم تقوم الشاشات الفرعية الست المذكورة بتعريف `Scaffold` داخلي خاص بها بكامل الشاشة `fillMaxSize()`.
- **التأثير:** تداخل واستهلاك مزدوج للـ Window Insets (Status Bar & Navigation Bar Padding)، مما قد يؤدي لهوامش بيضاء فارغة أعلى شريط الـ TopAppBar أو أسفل الأزرار السفلية في نظام Android 14+ و Edge-to-Edge.
- **الإصلاح المقترح:** إما إزالة الـ Scaffold الداخلي واستخدام `Column` مع الـ `TopAppBar` مباشرة، أو ضبط `contentWindowInsets = WindowInsets(0, 0, 0, 0)` في الـ Scaffold الداخلي لتفادي الهوامش المزدوجة.

---

### [MEDIUM-02] استخدام `remember` بدلاً من `rememberSaveable` لحقول النماذج وتفاعلات الواجهة
- **الملف:**
  - [AccountScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountScreen.kt#L93-L100) (الأسطر 93-100: `nameInput`, `altPhoneInput`, `isPasswordExpanded`, `newPasswordInput`, `confirmPasswordInput`, `showPassword`)
  - [LoginScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/login/LoginScreen.kt#L80) (السطر 80: `passwordVisible`)
  - [RegisterScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/register/RegisterScreen.kt#L78) (السطر 78: `passwordVisible`)
  - [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L176) (السطر 176: `showServiceDialog`)
- **الوصف:** تعريف المتغيرات الحالة المحلية للـ Composables باستخدام `remember { mutableStateOf(...) }` بدلاً من `rememberSaveable`.
- **التأثير:** عند تدوير الشاشة (Screen Rotation)، أو الانتقال لتطبيق آخر ثم العودة مع استعادة النشاط (Process Recreation)، يفقد المستخدم النصوص غير المحفوظة وحالة إظهار كلمة المرور وتغلق النوافذ المنبثقة قيد التفاعل.
- **الإصلاح المقترح:**
```kotlin
var nameInput by rememberSaveable { mutableStateOf("") }
var passwordVisible by rememberSaveable { mutableStateOf(false) }
```

---

### [MEDIUM-03] حجب بطاقة العنوان بواسطة لوحة المفاتيح وافتراض إزاحة ثابتة للدبوس (200dp)
- **الملف:** [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L331-L435)
- **السطر:** 331 و 428-435
- **الوصف:**
  1. البطاقة السفلية لإدخال وصف العنوان وزر الحفظ تفتقر لمعدل `Modifier.imePadding()`.
  2. تم تثبيت إزاحة دبوس الخريطة بهامش قسري ثابت `padding(bottom = 200.dp)` في السطر 331 بافتراض أن البطاقة السفلية تشغل 200dp دائماً.
- **التأثير:** عند الضغط على حقل وصف العنوان لتدوينه، ترتفع لوحة المفاتيح فتحجب حقل الإدخال وزر "تأكيد وحفظ العنوان". كما أن الدبوس لا يتطابق مع منتصف الخريطة المرئي بدقة على مختلف أحجام الشاشات أو عند ظهور أسطر إضافية لرسائل التوجيه الجغرافي.
- **الإصلاح المقترح:**
```kotlin
Card(
    modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().imePadding()
)
```

---

### [MEDIUM-04] قيم افتراضية وهمية (Hardcoded Placeholders) لبيانات العنوان أثناء التسجيل
- **الملف:** [RegisterViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/register/RegisterViewModel.kt#L24-L26)
- **السطر:** 24-26
- **الوصف:** يبدأ نموذج التسجيل بقيم ثابتة مسبقاً:
  ```kotlin
  val addressDescription: String = "القنجرة - الشارع الرئيسي",
  val lat: Double = 35.5234,
  val lng: Double = 35.9876
  ```
- **التأثير:** إذا قام المستخدم بإنشاء حسابه دون تعديل العنوان، يُسجل الحساب بعنوان ووصف غير صحيح لا يمثل موقع العميل الفعلي، مما يتسبب في إرسال الكابتن لمكان خاطئ عند طلب أول توصيلة.
- **الإصلاح المقترح:** تفريغ القيمة الافتراضية `addressDescription = ""` وفرض التحقق الإلزامي من تعبئة المستخدم لعنوانه أو تحديد موقعه الفعلي.

---

### [MEDIUM-05] غياب بطاقة الحالة الفارغة للطلب الجاري في شاشة الرئيسية
- **الملف:** [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L420-L426)
- **السطر:** 420-426
- **الوصف:** عند كون `activeOrder == null`، تختفي منطقة الطلب الجاري كلياً دون إظهار أية بطاقة تشجيعية، بالرغم من تجهيز النصوص مسبقاً في الموارد [strings.xml](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/res/values/strings.xml#L71-L72): `home_no_active_orders` ("لا توجد طلبات جارية حالياً") و `home_no_active_orders_desc` ("ابدأ طلباً جديداً ليصلك كل ما تحتاجه فوراً!").
- **التأثير:** ترك فراغ مفاجئ في هيكل الشاشة وتجاهل موارد تم تجهيزها خصيصاً لتحسين تفاعل المستخدم.
- **الإصلاح المقترح:**
```kotlin
if (activeOrder != null) {
    ActiveOrderCard(order = activeOrder, onClick = { onOrderDetailClick(activeOrder.id) })
} else {
    HomeNoActiveOrderCard(onNewOrderClick = onNewOrderClick)
}
```

---

### [MEDIUM-06] وجود دوال اختبارية وبيانات اعتماد وهمية غير محمية في MainActivity
- **الملف:** [MainActivity.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/MainActivity.kt#L51-L147)
- **السطر:** 51 و 128-147 و 213-222
- **الوصف:** حقن `AuthApi` داخل `MainActivity` لاستدعاء دالة `testLogin()` تحتوي على هاتف وكلمة مرور ثابتين (`"0900000000"`, `"testpassword"`). كذلك وجود زر `Test Login` في المعاينة غير محمي بشرط `BuildConfig.DEBUG`.
- **التأثير:** بقايا كود اختباري (Dead Code) يزيد من حجم ملف التطبيق ويخالف معايير الأمان (No hardcoded test credentials in production activity).
- **الإصلاح المقترح:** حذف دالة `testLogin()` وحقن `AuthApi` غير المستخدم من `MainActivity`.

---

## المشاكل السطحية

### [SURFACE-01] دمج رمز السهم كنص صريح (" ←") في شاشة الرئيسية
- **الملف:** [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L846)
- **السطر:** 846
- **الوصف:** استخدام `stringResource(R.string.home_track_order) + " ←"` لربط رمز السهم برمجياً مع النص.
- **التأثير:** قد يسبب ارتباكاً في اتجاه السهم عند تباين اتجاه القراءة أو تنسيق الخطوط، والأفضل استخدام أيقونة سهم تنقل `Icons.AutoMirrored.Filled.ArrowBack` أو إضافة السهم للمورد المترجم.
- **الإصلاح المقترح:** فصل الأيقونة بجانب النص في `Row` باستخدام `Icon(Icons.AutoMirrored.Filled.ArrowBack)`.

---

### [SURFACE-02] تكرار دوال ترجمة الحالات (`mapStatusToArabic` و `getStatusBadgeLabel`) كنصوص صريحة
- **الملف:** [HomeScreen.kt:926](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L926-L937) و [OrderDetailScreen.kt:1084](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L1084-L1098)
- **السطر:** [HomeScreen.kt:926](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L926) و [OrderDetailScreen.kt:1084](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L1084)
- **الوصف:** كل شاشة تقوم بتعريف دالة محلية خاصة بها تعيد نصوص الحالات باللغة العربية داخل الكود المصدري ("مسودة"، "قيد الشراء"، "تم التسليم"، إلخ) بالرغم من توفر موارد معتمدة في [strings.xml](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/res/values/strings.xml#L204-L213) تحت أسماء `orders_status_*`.
- **التأثير:** ازدواجية في الكود وتفاوت محتمل في الترجمة وصعوبة الصيانة عند تغيير أي مسمى مستقبلاً.
- **الإصلاح المقترح:** توحيد ترجمة الحالات في دالة مساعدة عامة بملف `domain/model/OrderModels.kt` تعيد معرف مورد السلسلة `@StringRes`.

---

### [SURFACE-03] عدم استخدام وزن (Weight) لحقل النص في صف خيارات المتجر
- **الملف:** [CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt#L850-L864)
- **السطر:** 850-864
- **الوصف:** في صف `Row` الخاص باختيار المتجر داخل بطاقة المادة المنظمة، تم وضع `Text` بجانب `Switch` دون تحديد `Modifier.weight(1f)`.
- **التأثير:** عند زيادة حجم الخط في إعدادات النظام، قد يتمدد النص ويزاحم زر التبديل `Switch` خارج حدود الشاشة.
- **الإصلاح المقترح:** إضافة `modifier = Modifier.weight(1f)` لـ `Text`.

---

## نصوص hardcoded (تحتاج strings.xml)

| الملف | السطر | النص العربي | المورد المقترح |
|---|---|---|---|
| [LoginScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/login/LoginScreen.kt#L216) | 216 | `"إخفاء"` / `"إظهار"` | `action_hide_password` / `action_show_password` |
| [LoginViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/login/LoginViewModel.kt#L100) | 100 | `"حدث خطأ أثناء تسجيل الدخول"` | `error_login_failed` |
| [RegisterScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/register/RegisterScreen.kt#L310) | 310 | `"إخفاء"` / `"إظهار"` | `action_hide_password` / `action_show_password` |
| [RegisterViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/register/RegisterViewModel.kt#L24) | 24 | `"القنجرة - الشارع الرئيسي"` | (حذف القيمة الوهمية) |
| [RegisterViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/register/RegisterViewModel.kt#L133) | 133 | `"حدث خطأ أثناء إنشاء الحساب"` | `error_register_failed` |
| [PendingVerificationScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/PendingVerificationScreen.kt#L118) | 118 | `"مرحباً، أود تفعيل حسابي في تطبيق فَوْراً"` | `whatsapp_msg_activate_account` |
| [SuspendedScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/SuspendedScreen.kt#L115) | 115 | `"مرحباً إدارة فَوْراً، أود الاستفسار عن سبب تعليق حسابي"` | `whatsapp_msg_suspended_inquiry` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L270) | 270 | `"صباح الخير، "` | `home_greeting_morning` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L284) | 284 | `"القنجرة ومحيطها"` | `home_location_label` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L312) | 312 | `"الإشعارات"` | `cd_notifications` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L348) | 348 | `"اطلب في ثواني"` | `home_hero_badge` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L360) | 360 | `"⚡ توصيل فوري"` | `home_hero_tag` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L371) | 371 | `"شو محتاج اليوم؟"` | `home_hero_headline` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L380) | 380 | `"حاجيات، طرود، أو مشوار — إحنا جاهزين"` | `home_hero_subtext` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L407) | 407 | `"اطلب الآن"` | `home_hero_cta_btn` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L774) | 774 | `"الكابتن "` | `runner_prefix` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L780) | 780 | `"مندوب معتمد ✓"` | `runner_verified_badge` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L802) | 802 | `"واتساب الكابتن"` | `cd_runner_whatsapp` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L823) | 823 | `"اتصال بالكابتن"` | `cd_runner_call` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L866) | 866 | `"تم الاستلام", "جاري الشراء", "في الطريق", "تم التسليم"` | `stepper_step_1 .. 4` |
| [HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt#L927-L935) | 927-935 | نصوص الحالات (9 حالات) | استخدام `R.string.orders_status_*` |
| [HomeViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeViewModel.kt#L74) | 74, 99 | `"تعذر تحميل البيانات"` | `error_load_data_failed` |
| [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L166) | 166 | `"يرجى تفعيل خدمة تحديد الموقع (GPS)"` | `address_enable_gps_prompt` |
| [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L193) | 193 | `"تعذر تحديد موقعك الحالي بدقة، يمكنك سحب الخريطة لتحديده"` | `address_gps_drag_prompt` |
| [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L245) | 245 | `"إغلاق"` | `action_close` |
| [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L351) | 351 | `"موقع التوصيل المحدد"` | `cd_selected_location` |
| [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L489) | 489 | `"جاري تحديد العنوان تلقائياً…"` | `address_geocoding_in_progress` |
| [AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt#L496) | 496 | `"تعذر تحديد العنوان تلقائياً، يمكنك إدخاله يدوياً"` | `address_geocoding_failed_manual` |
| [AddressSetupViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupViewModel.kt#L99) | 99, 109 | `"تعذر تحديد العنوان تلقائياً"` | `error_geocoding_auto_failed` |
| [AddressSetupViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupViewModel.kt#L173) | 173 | `"يرجى إدخال وصف للعنوان"` | `error_address_desc_empty` |
| [AddressSetupViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupViewModel.kt#L200) | 200 | `"فشل حفظ العنوان"` | `error_save_address_failed` |
| [CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt#L210) | 210 | `"الرجوع"` | `action_back` |
| [CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt#L249) | 249 | `"العنوان جاهز ✓"` / `"العنوان غير محدد ⚠️"` | `create_order_address_ready` / `create_order_address_missing_warn` |
| [CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt#L722) | 722 | `"$lineCount مواد"` | `create_order_items_count_summary` |
| [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L200) | 200 | `"يرجى تحديد عنوان التوصيل أولاً قبل إرسال الطلب"` | `create_order_validation_address_missing` |
| [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L211) | 211, 226 | `"يرجى إضافة مادة واحدة على الأقل"` | `create_order_validation_empty_items` |
| [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L232) | 232 | `"يرجى كتابة اسم المادة"` | `create_order_validation_item_name` |
| [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L236) | 236 | `"يرجى تحديد الكمية للمادة: ..."` | `create_order_validation_item_quantity` |
| [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L240) | 240 | `"يرجى تحديد اسم المتجر للمادة: ... أو تفعيل خيار أي متجر"` | `create_order_validation_custom_store` |
| [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L278) | 278 | `"فشل إنشاء الطلب"` | `error_create_order_failed` |
| [OrderDetailScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L1024) | 1024 | `"القنجرة"` (fallback للعنوان) | `address_default_city` |
| [OrderDetailScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt#L1086-L1095) | 1086-1095 | شارات الحالات الـ 10 | استخدام `R.string.orders_status_*` |
| [OrderDetailViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailViewModel.kt#L98) | 98 | `"معرف الطلب غير صحيح"` | `error_invalid_order_id` |
| [OrdersScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersScreen.kt#L221) | 221 | `"سجل ومتابعة طلباتك في فَوْراً"` | `orders_subtitle` |
| [OrdersScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersScreen.kt#L243) | 243 | `"$activeCount جارية"` | `orders_active_badge_format` |
| [OrdersScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersScreen.kt#L431) | 431 | `"رسوم التوصيل"` | `orders_fee_label` |
| [OrdersScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersScreen.kt#L463) | 463 | `"الكابتن: "` | `home_runner_label` |
| [OrdersListViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersListViewModel.kt#L120) | 120 | `"حدث خطأ أثناء تحميل الطلبات"` | `orders_error_loading` |
| [RatingViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/rating/RatingViewModel.kt#L53) | 53 | `"معرف الطلب غير صحيح"` | `error_invalid_order_id` |
| [RatingViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/rating/RatingViewModel.kt#L77) | 77 | `"الكابتن"` | `runner_default_name` |
| [RatingViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/rating/RatingViewModel.kt#L120) | 120 | `"انتهت مهلة التقييم (يمكن التقييم خلال 24 ساعة فقط بعد تسليم الطلب)"` | `rating_expired_warning` |
| [RatingViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/rating/RatingViewModel.kt#L127) | 127 | `"يرجى اختيار عدد النجوم (من 1 إلى 5)"` | `rating_validation_stars_required` |
| [AccountScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountScreen.kt#L489) | 489 | `"إخفاء"` / `"إظهار"` | `action_hide_password` / `action_show_password` |
| [AccountScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountScreen.kt#L715) | 715 | `"أدوات التطوير (Debug Tools)"` | `debug_tools_title` |
| [AccountScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountScreen.kt#L725) | 725 | `"🔧 محاكاة انتهاء الجلسة (Debug S5b)"` | `debug_simulate_session_expiry` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L65) | 65 | `"فشل في تحميل بيانات الحساب"` | `account_error_load_failed` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L93) | 93 | `"الاسم يجب أن يكون حرفين على الأقل"` | `error_name_short` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L99) | 99 | `"الرقم البديل يجب أن يبدأ بـ 09 ويتكون من 10 أرقام"` | `error_phone_invalid` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L119) | 119 | `"تم حفظ معلومات الحساب بنجاح"` | `account_profile_saved` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L125) | 125 | `"فشل حفظ معلومات الحساب"` | `account_error_save_failed` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L134) | 134 | `"كلمة المرور يجب أن تكون 8 أحرف على الأقل"` | `error_password_short` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L138) | 138 | `"كلمة المرور لا يجب أن تتجاوز 72 بايت"` | `error_password_max_bytes` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L142) | 142 | `"كلمتا المرور غير متطابقتين"` | `account_error_passwords_dont_match` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L160) | 160 | `"تم تغيير كلمة المرور بنجاح"` | `account_password_changed` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L166) | 166 | `"فشل تغيير كلمة المرور"` | `account_error_password_change_failed` |
| [AccountViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/account/AccountViewModel.kt#L193) | 193 | `"تم إبطال التوكن بنجاح! انتقل لشاشة Home واسحب للتحديث"` | `debug_token_invalidated_notice` |
| [SupportScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/support/SupportScreen.kt#L94) | 94 | `"رجوع"` | `action_back` |
| [SupportViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/support/SupportViewModel.kt#L38) | 38 | `"مرحباً إدارة فَوْراً، أحتاج إلى مساعدة واستفسار بخصوص التطبيق."` | `support_default_whatsapp_msg` |
| [SupportViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/support/SupportViewModel.kt#L46-L67) | 46-67 | نصوص الأسئلة الشائعة (5 أسئلة و 5 إجابات كاملة) | `support_faq_q1..q5` و `support_faq_a1..a5` |
| [NotificationHelper.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/notification/NotificationHelper.kt#L16) | 16 | `"FORERUN — تحديثات الطلبات"` | `notification_channel_orders_name` |
| [NotificationHelper.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/notification/NotificationHelper.kt#L17) | 17 | `"إشعارات تحديث حالة الطلبات والتوصيل"` | `notification_channel_orders_desc` |
| [ApiCall.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/network/ApiCall.kt#L41) | 41, 79 | `"تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت"` | `error_network` |
| [ApiCall.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/network/ApiCall.kt#L46) | 46, 84, 111, 121 | `"حدث خطأ غير متوقع"` / `"خطأ غير متوقع"` | `error_generic` |

---

## Bottom Nav — تحليل شامل

### آلية العرض الحالية في ForerunNavGraph.kt:
يتم التحكم في ظهور شريط التنقل السفلي عبر السطر التالي في [ForerunNavGraph.kt:76](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/navigation/ForerunNavGraph.kt#L76):
```kotlin
val currentRoute = navBackStackEntry?.destination?.route
val showBottomBar = currentRoute in setOf(Routes.HOME, Routes.ORDERS, Routes.ACCOUNT)
```
الـ `BottomNavBar` يُعرض فقط إذا كان المسار الحالي واحداً من الوجهات الثلاث الرئيسية:
1. `home`
2. `orders`
3. `account`

### الشاشات التي لا يظهر فيها والسبب لكل واحدة:
1. **SplashScreen (`splash`):**
   - **السبب:** شاشة تمهيدية تعتمد على فحص جلسة المستخدم وتوجيهه فورياً دون تفاعل واجهة.
2. **OnboardingScreen (`onboarding`):**
   - **السبب:** مرحلة تعريفية أولى للعميل الجديد قبل الدخول أو التسجيل؛ ظهور التبويبات يشتت مسار البداية.
3. **LoginScreen (`login`) و RegisterScreen (`register`):**
   - **السبب:** مسارات مصادقة (Auth flows) تتطلب تركيز المستخدم على تعبئة الحقول، ووجود التبويبات السفلية يتيح التنقل غير المصرح لشاشات تحتاج مصادقة.
4. **PendingVerificationScreen (`pending_verification`) و SuspendedScreen (`suspended`):**
   - **السبب:** شاشات احتجاز وظيفي للحساب غير المفعل أو المعلق؛ إخفاء الشريط يمنع فتح الطلبات أو إجراء عمليات حتى حل مشكلة الحساب.
5. **AddressSetupScreen (`address_setup`):**
   - **السبب:** شاشة خريطة تفاعلية كاملة الحجم مع بطاقة سفلية مخصصة لحفظ العنوان؛ ظهور الـ BottomBar سيتداخل مع بطاقة الحفظ ويقلص مساحة الخريطة.
6. **CreateOrderScreen (`create_order`):**
   - **السبب:** مسار إنشاء الطلب يحتوي على شريط سفلي خاص به (Bottom Action Dock) يحتوي على عداد المواد وزر الإرسال "أرسل الطلب الآن 🚀".
7. **OrderConfirmationScreen (`order_confirmation/{orderNumber}...`):**
   - **السبب:** شاشة إشعار نجاح بمظهر مستقل؛ التوجيه منها يكون إما بالضغط على زر "تتبع الطلب" أو "طلب جديد".
8. **OrderDetailScreen (`orders/{orderId}`):**
   - **السبب:** شاشة فرعية تفصيلية مستقلة؛ العودة منها تكون عبر زر الرجوع في الـ TopAppBar إلى شاشة `orders` الرئيسية التي تملك الـ BottomBar.
9. **RatingScreen (`orders/{orderId}/rating`):**
   - **السبب:** مسار فرعي لتقييم الكابتن ينتهي تلقائياً بالعودة فور إرسال التقييم.
10. **SupportScreen (`support`):**
    - **السبب:** شاشة مساعدة تم استدعاؤها من شاشة الحساب وتملك زر رجوع `TopAppBar` للعودة لتبويب الحساب.

---

## شاشات بحاجة لمراجعة بصرية من المستخدم

1. **[AddressSetupScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupScreen.kt):**
   - فحص البطاقة السفلية البيضاء عند فتح لوحة المفاتيح لكتابة العنوان (التأكد من عدم اختفاء زر "تأكيد وحفظ العنوان").
   - فحص تمركز دبوس الخريطة ومطابقته للنقطة الجغرافية الفعلية مع الإزاحة `bottom = 200.dp`.

2. **[OrderDetailScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/detail/OrderDetailScreen.kt):**
   - فحص بطاقة الكابتن: زرا "تواصل عبر واتساب" و "اتصال هاتفي" في سطر واحد؛ التأكد من عدم قص النص على الشاشات الصغيرة مع تفعيل الخطوط الكبيرة.
   - فحص التباعد بين بطاقة التقييم ومخطط المراحل (Timeline Stepper) وأزرار الإلغاء.

3. **[CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt):**
   - فحص التبديل بين وضعي "إدخال سريع ✏️" و "إدخال منظّم 📋".
   - فحص صف خيارات المتجر مع مفتاح `أي متجر متاح` داخل بطاقات المواد لضمان عدم التفاف النص بشكل يشوه المفتاح.
   - فحص شريط الإجراء السفلي الثابت (Bottom Dock) لضمان عدم حجبه لآخر مادة مضافة في الـ LazyColumn.

4. **[PendingVerificationScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/PendingVerificationScreen.kt) و [SuspendedScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/status/SuspendedScreen.kt):**
   - فحص الشاشتين على جهاز بشاشة صغيرة أو في الوضع الأفقي للتأكد من سهولة الضغط على زري الواتساب وتسجيل الخروج.

5. **[HomeScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeScreen.kt):**
   - مراجعة تباعد بطاقات الخدمات (شبكة عمودين: طرود ومشاوير) مقابل بطاقة البقالة الكاملة العرض لضمان تناسق الظلال والارتفاعات.

---

# القسم الثاني: المراجعة المعمارية العميقة (Deep Architectural Review)

## المشاكل المعمارية والوظيفية الحرجة (Deep Criticals)

### [DEEP-CRITICAL-01] عدم اتصال الـ WebSocket تلقائياً بعد تسجيل الدخول (Socket Disconnected on Login)
- **الملف:** [SocketManager.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/websocket/SocketManager.kt#L74) و [LoginViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/auth/login/LoginViewModel.kt#L91) و [ForerunApp.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ForerunApp.kt#L37)
- **السطر:** [SocketManager.kt:74](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/websocket/SocketManager.kt#L74)
- **الوصف:** دالة `socketManager.connect()` تُستدعى فقط في `ForerunApp.onActivityStarted`. عند فتح التطبيق والمستخدم مسجل خروج، تفشل محاولة الاتصال فوراً لعدم توفر توكن (`tokenStorage.getAccessToken().isNullOrBlank()`). عند تسجيل الدخول بنجاح، لا يقوم `LoginViewModel` ولا `AuthRepositoryImpl` باستدعاء `socketManager.connect()`. وبما أن الـ Activity لا يُعاد إنشاؤه بعد تسجيل الدخول، تظل قناة الـ WebSocket في حالة `DISCONNECTED` بصورة دائمة!
- **التأثير:** لا يستقبل التطبيق أي تحديثات لحظية عبر Socket.IO (مثل تعيين الكابتن، تحديث الفاتورة، وصول الطلب) بعد تسجيل الدخول مباشرة ما لم يقم المستخدم بإرسال التطبيق للخلفية وإعادته للأمام لتفعيل `onActivityStarted`.
- **الإصلاح المقترح:**
```kotlin
// في AuthRepositoryImpl.login() بعد تخزين التوكنات بنجاح أو في LoginViewModel:
socketManager.connect()
```

---

### [DEEP-CRITICAL-02] انحباس المستخدم المعتمد في شاشة "قيد المراجعة" بسبب قراءة الحالة المخزنة محلياً فقط في Splash
- **الملف:** [AuthRepositoryImpl.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/data/remote/repository/AuthRepositoryImpl.kt#L131-L135)
- **السطر:** 131-135 و 156-162
- **الوصف:** في `checkSession()`، عندما يكون `hasValidToken` صحيحاً، يتم استدعاء `getCurrentUser()` الذي يقرأ `status` المخزنة محلياً في SharedPreferences (`tokenStorage.getUserStatus()`). هذه القيمة لا يتم تحديثها من السيرفر إطلاقاً إلا عند تسجيل دخول جديد.
- **التأثير:** إذا أنشأ مستخدم حساباً جديداً ودخل في حالة `PENDING_VERIFICATION`، ثم قام المسؤول في لوحة التحكم باعتماد الحساب ليصبح `VERIFIED`؛ عند إغلاق التطبيق وإعادة فتحه، يقوم `SplashViewModel` بقراءة الحالة القديمة المخزنة محلياً وتوجيهه دائماً إلى `PendingVerificationScreen` حتى انتهاء صلاحية الجلسة، مما يحرمه من استخدام التطبيق بعد الموافقة عليه!
- **الإصلاح المقترح:**
```kotlin
// في checkSession() عند توفر توكن صالح، يجب تحديث الملف الشخصي والحالة من السيرفر:
val profileRes = customerApi.me()
if (profileRes is ApiResponse.Success) { tokenStorage.setUserStatus(profileRes.data.user.status) }
```

---

### [DEEP-CRITICAL-03] إبطال الجلسة خطأً عند استجابة 401 بسبب شرط `shouldRefresh()` الزمني المعكوس في Interceptor
- **الملف:** [RefreshInterceptor.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/network/interceptor/RefreshInterceptor.kt#L27-L43) و [TokenRefreshManager.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/data/remote/token/TokenRefreshManager.kt#L26-L38)
- **السطر:** [RefreshInterceptor.kt:27](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/core/network/interceptor/RefreshInterceptor.kt#L27) و [TokenRefreshManager.kt:35](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/data/remote/token/TokenRefreshManager.kt#L35)
- **الوصف:** عندما يعيد السيرفر كود `401 Unauthorized`، يقوم `RefreshInterceptor` باستدعاء `tokenRefreshManager.refreshTokenIfNeeded()`. داخل هذه الدالة يوجد شرط زمني: `if (!shouldRefresh()) return true`. إذا كان فارق التوقيت المحلي يفترض أن التوكن لا يزال صالحاً (مثلاً قام السيرفر بإلغاء التوكن، أو بسبب عدم دقة ساعة الهاتف)، تُرجع الدالة `true` مباشرة دون طلب تجديد من السيرفر! يُعيد الـ Interceptor إرسال الطلب بنفس التوكن القديم، فيرفضه السيرفر بـ 401 مرة أخرى، فيقوم الـ Interceptor باعتبار الجلسة منتهية فوراً وطرد العميل لشاشة تسجيل الدخول بدلاً من تجديد التوكن!
- **التأثير:** تسجيل خروج مفاجئ للمستخدمين عند حدوث أي 401 حتى بوجود Refresh Token سليم.
- **الإصلاح المقترح:**
```kotlin
// في TokenRefreshManager توفير دالة تجديد إجباري تتجاوز فحص الوقت المحلي:
suspend fun forceRefreshToken(): Boolean = refreshMutex.withLock { performRefreshCall() }
```

---

### [DEEP-CRITICAL-04] تضارب مسار الإشعار التوجيهي (Cold-Start Deep Link) مع Splash Navigation
- **الملف:** [MainActivity.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/MainActivity.kt#L96-L103) و [SplashViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/splash/SplashViewModel.kt#L41-L54)
- **السطر:** 96-103
- **الوصف:** عند فتح التطبيق بالنقر على إشعار وارد (تطبيق مغلق تماماً Cold Start)، يضبط `MainActivity` متغير `pendingDeepLinkOrderId` فوراً، مما يشغّل `LaunchedEffect` وينقل `navController` إلى `Routes.orderDetail(orderId)`. في نفس اللحظة، تعمل شاشة `Splash` في الخلفية وتنتظر 500ms لفحص الجلسة، ثم تصدر توجيهاً إلى `Routes.HOME` مع تفريغ `Routes.SPLASH`، مما يؤدي لمسح شاشة تفاصيل الطلب أو وضع شاشة `HOME` فوقها وضياع شاشة الطلب التي نقر عليها المستخدم.
- **التأثير:** النقر على إشعارات الطلبات أثناء إغلاق التطبيق لا يفتح شاشة الطلب المحددة بشكل موثوق.
- **الإصلاح المقترح:**
```kotlin
// تأجيل معالجة pendingDeepLinkOrderId حتى اكتمال التحقق من جلسة الـ Splash ووصول الـ NavGraph لشاشة HOME
```

---

### [DEEP-CRITICAL-05] غياب حماية النقر المزدوج (Double-Submit Race Condition) عند إنشاء الطلب وتحديد العنوان
- **الملف:** [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L195-L204) و [AddressSetupViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupViewModel.kt#L168-L177)
- **السطر:** [CreateOrderViewModel.kt:195](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L195) و [AddressSetupViewModel.kt:168](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupViewModel.kt#L168)
- **الوصف:** دوال `submitOrder()` و `saveAddress()` لا تحتويان في بدايتهما على شرط حماية `if (_uiState.value.isSubmitting) return` أو `if (_uiState.value.isSaving) return`. النقر السريع المتكرر (Double-Tap) على زر الإرسال قبل اكتمال إعادة التكوين (Recomposition) يطلق كورووتينين متزامنين لطلب الـ API.
- **التأثير:** إنشاء طلبات مكررة (Duplicate Orders) للعميل لنفس السلة مما يسبب اقتطاع رسوم مكررة وتكليف كابتنين للطلب ذاته (انتهاك مباشر لقاعدة Financial Idempotency).
- **الإصلاح المقترح:**
```kotlin
private fun submitOrder() {
    if (_uiState.value.isSubmitting) return
    ...
```

---

## المشاكل المعمارية المتوسطة والوظيفية (Deep Mediums)

### [DEEP-MEDIUM-01] عدم تحديث العنوان في شاشة إنشاء الطلب عند العودة من شاشة الخريطة
- **الملف:** [CreateOrderViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderViewModel.kt#L106-L121) و [CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt#L405)
- **الوصف:** دالة `loadInitialData()` تُستدعى فقط في كتل الـ `init` للـ ViewModel. عندما ينتقل المستخدم من شاشة إنشاء الطلب إلى `AddressSetupScreen` لتعيين عنوانه، ثم يحفظ العنوان ويعود بالـ BackStack، لا يتم إعادة إنشاء الـ ViewModel ولا تستمع الشاشة لـ Lifecycle `ON_RESUME`.
- **التأثير:** يظل العنوان معروضاً كـ "العنوان غير محدد ⚠️" ويبقى زر الإرسال معطلاً أو يظهر تحذيراً حتى يخرج المستخدم من إنشاء الطلب ويفقد ما كتبه في السلة.
- **الإصلاح المقترح:** إضافة `LifecycleEventEffect(Lifecycle.Event.ON_RESUME)` في `CreateOrderScreen` لإعادة تحميل العنوان عند العودة.

---

### [DEEP-MEDIUM-02] الشاشة الرئيسية وقائمة الطلبات لا تستمعان لأحداث الـ WebSocket
- **الملف:** [HomeViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/home/HomeViewModel.kt#L61) و [OrdersListViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersListViewModel.kt#L65)
- **الوصف:** فقط شاشة تفاصيل الطلب `OrderDetailViewModel` هي التي تشترك في تدفق `observeOrderEventsUseCase`. الشاشة الرئيسية (بطاقة الطلب النشط) وقائمة الطلبات تظلان بحالات قديمة حتى يسحب المستخدم الشاشة يدوياً لتحديث البيانات.
- **التأثير:** بطاقة الطلب النشط في الرئيسية تظل "قيد المراجعة" حتى بعد قبول الطلب أو خروجه للتوصيل.

---

### [DEEP-MEDIUM-03] فلترة قائمة الطلبات تتم على الذاكرة المحلية فقط وتتعطل مع التصفح بالصفحات (Pagination)
- **الملف:** [OrdersListViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/orders/OrdersListViewModel.kt#L41-L47)
- **الوصف:** يتم جلب الطلبات بـ `status = null` من السيرفر بالصفحة (20 طلب)، ثم يتم تطبيق الفلترة محلياً عبر `allOrders.filter { ... }`.
- **التأثير:** إذا كانت أول 20 طلب كلها مسلمة (Delivered)، وقام المستخدم بضغط تبويب "النشطة"، ستظهر الشاشة فارغة "لا توجد طلبات نشطة" ولن يتم جلب الطلبات النشطة الموجودة في الصفحات التالية من السيرفر.
- **الإصلاح المقترح:** تمرير `filter` كمعامل `status` مباشرة إلى `getCustomerOrdersUseCase(page, limit, status)` وإعادة تصفير الصفحة عند تغيير التبويب.

---

### [DEEP-MEDIUM-04] إحداثيات افتراضية لخريطة العنوان في اللاذقية بدلاً من دمشق
- **الملف:** [AddressSetupViewModel.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupViewModel.kt#L29-L30) و [150-151](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/address/AddressSetupViewModel.kt#L150-L151)
- **الوصف:** تم ضبط الإحداثيات الافتراضية كـ `lat = 35.5500, lng = 35.8000` (اللاذقية) بينما مركز دمشق المعتمد في باقي أنظمة فورن هو `33.5138, 36.2765`.
- **التأثير:** فتح الخريطة في موقع جغرافي بعيد تماماً عن نطاق الخدمة عند أول استخدام للمستخدم.

---

### [DEEP-MEDIUM-05] عدم إغلاق اتصال الـ WebSocket عند تسجيل الخروج (Socket Leak on Logout)
- **الملف:** [AuthRepositoryImpl.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/data/remote/repository/AuthRepositoryImpl.kt#L108-L123)
- **الوصف:** دالة `logout()` تقوم بمسح التوكنات، لكنها لا تستدعي `socketManager.disconnect()`.
- **التأثير:** بقاء اتصال الـ WebSocket نشطاً في الخلفية بالتوكن الملغى حتى إغلاق التطبيق.

---

### [DEEP-MEDIUM-06] تضارب واجهة تأكيد الطلب بين Dialog داخلي وشاشة منفصلة
- **الملف:** [CreateOrderScreen.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/order/create/CreateOrderScreen.kt#L112-L191)
- **الوصف:** يحتوي الملف على `AlertDialog` كامل لتأكيد الطلب بالإضافة إلى توجيه فوري لشاشة `OrderConfirmationScreen`.
- **التأثير:** وميض حواري سريع مشتت قبل الانتقال للشاشة. يجب توحيد المسار إما بالشاشة أو بالـ Dialog.

---

### [DEEP-MEDIUM-07] نقص تعريف الـ Intent-Filter لروابط الويب في AndroidManifest
- **الملف:** [AndroidManifest.xml](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/AndroidManifest.xml#L28-L36) و [ForerunNavGraph.kt](file:///d:/FAWRUNF/FAWRUN/apps/android/app/src/main/java/com/forerun/customer/ui/navigation/ForerunNavGraph.kt#L293)
- **الوصف:** معرّف في الـ NavGraph مسار `https://forerun.app/orders/{orderId}`، بينما الـ Manifest لا يحتوي إلا على `scheme="forerun"`.
- **التأثير:** روابط الويب المرسلة للعملاء عبر الرسائل أو المتصفح لن تفتح التطبيق.
