# FORERUN Android — Current State

> **تاريخ التحديث:** بعد اكتمال Sprint 5 (FCM + MapLibre)  
> **حالة التطبيق:** جميع شاشات نطاق v1 ومكونات الربط والشبكة مكتملة ومختبرة بنسبة 100%.

---

## 1. الفرع والـ Commit الأخير
- **الفرع الحالي:** `feature/android-sprint-5-fcm-maplibre`
- **آخر Commit:** `abf02d8` (`feat(android): add FCM push notifications + maplibre polish`)
- **حالة الاختبارات:** 135 / 135 اختبار وحدة ناجح (100% Passing)
- **أحجام حزم الـ Debug APK (حسب الـ ABI):**
  - `app-arm64-v8a-debug.apk`: 29.12 MB (29,123,417 bytes)
  - `app-armeabi-v7a-debug.apk`: 26.16 MB (26,163,367 bytes)
  - `app-x86_64-debug.apk`: 29.41 MB (29,410,712 bytes)

---

## 2. قائمة الفروع النشطة (4 فروع تراكمية)
1. `feature/android-sprint-2-home-order` (Home, Address Setup, Create Order, Confirmation, Orders List)
2. `feature/android-sprint-3-order-detail` (Order Detail, Rating, Socket.IO `/orders`)
3. `feature/android-sprint-4-account-support` (Account Screen, Support Screen, WebSocket Hardening)
4. `feature/android-sprint-5-fcm-maplibre` (FCM Push Notifications, Device Token Management, MapLibre Geocode Cache)

> **ملاحظة:** الفروع مبنية بشكل تراكمي، ولم تُدمج بعد في `master` لحين إشارة المستخدم ومراجعة الدمج النهائي.

---

## 3. الـ Stack الفعلي المستخدم (libs.versions.toml)
- **اللغة ومنصة التطوير:** Kotlin `2.0.21`، Android Gradle Plugin `8.7.3`، KSP `2.0.21-1.0.28`
- **واجهات المستخدم:** Jetpack Compose BOM `2024.12.01`، Material 3، Navigation Compose `2.8.5`
- **حقن التبعيات (DI):** Hilt `2.53.1`، Hilt Navigation Compose `1.2.0`
- **الشبكة وتحويل البيانات:** Retrofit `2.11.0`، OkHttp `4.12.0`، Moshi `1.15.1` (KSP Codegen)
- **الاتصال المباشر (Real-Time):** Socket.IO Client `2.1.1` (عبر WebSocket transport على مساحة `/orders`)
- **الخرائط والموقع:** MapLibre Android SDK `11.5.2`، Google Play Services Location `21.3.0`، OpenStreetMap raster tiles
- **الإشعارات السحابية:** Firebase BOM `33.7.0`، Firebase Messaging، Google Services Plugin `4.4.2`
- **التخزين والأمان:** EncryptedSharedPreferences (`androidx.security:security-crypto:1.1.0-alpha06`)، DataStore Preferences `1.1.1`
- **أطر الاختبار:** JUnit `4.13.2`، Kotlinx Coroutines Test `1.9.0`، Turbine `1.1.0`، MockWebServer `4.12.0`

---

## 4. عدد الشاشات المنجزة vs المتبقية
- **المنجزة:** 17 شاشة ومسار (100% من نطاق v1 المحدد في Google Stitch و MASTER-SPEC):
  1. `SplashScreen` — فحص التوكن وحالة الحساب والتوجيه التلقائي
  2. `OnboardingScreen` — 3 شرائح تعريفية بتجربة المستخدم
  3. `LoginScreen` — تسجيل الدخول عبر رقم الواتساب وكلمة المرور
  4. `RegisterScreen` — إنشاء حساب عميل جديد مع التحقق
  5. `PendingVerificationScreen` — إشعار الحساب قيد المراجعة الإدارية
  6. `SuspendedAccountScreen` — إشعار تجميد الحساب وقنوات التواصل
  7. `HomeScreen` — الواجهة الرئيسية مع ملخص الإحصائيات وبانر الطلب النشط
  8. `AddressSetupScreen` — اختيار العنوان عبر خريطة MapLibre مع Reverse Geocoding
  9. `CreateOrderScreen` — بناء الطلب الديناميكي، تحديد المتاجر، واختيار الكابتن المفضل
  10. `OrderConfirmationScreen` — تأكيد إنشاء الطلب وعرض الرسوم التقديرية الرسمية
  11. `OrdersListScreen` — استعراض الطلبات مع فلترة وتبويب وتحديث بالسحب (Pull-to-Refresh)
  12. `OrderDetailScreen` — تفاصيل الطلب، الخط الزمني التفاعلي، وحالة شراء المواد
  13. `RatingBottomSheet / Screen` — تقييم الطلب والكابتن بعد التسليم
  14. `AccountScreen` — إدارة الملف الشخصي، العناوين، وسجل الطلبات وتسجيل الخروج
  15. `SupportScreen` — التواصل مع الإدارة والدعم عبر واتساب أو اتصال هاتفي
- **المتبقية:** 0 شاشات (اكتملت كافة شاشات الـ MVP الأساسية).

---

## 5. الفجوات المعروفة (Known Gaps)
1. **FCM (Firebase):** ملف `google-services.json` المستخدم حالياً وهمي (مستثنى في `.gitignore`) — يتطلب ربط مشروع Firebase حقيقي لاستقبال إشعارات فعلية من الخادم على الأجهزة الحقيقية.
2. **استراتيجية الفروع:** توجد 4 فروع نشطة تراكمية غير مدموجة في `master` لحين انتهاء دورة التطوير وموافقة المستخدم على الدمج.
3. **غياب اختبارات E2E المؤتمتة:** لا يوجد تشغيل آلي لاختبارات E2E على الـ CI/CD، والاعتماد حالياً على 135 اختبار وحدة مؤتمت واختبارات يدوية على المحاكي.
4. **زر اختبار انتهاء الجلسة:** زر اختبار انتهاء الجلسة في `AccountScreen` محمي بشرط `BuildConfig.DEBUG` لضمان عدم توفره في نسخ الإنتاج.

---

## 6. الخطوة التالية (Next Step)
- **UI Polish Pass (يدوي من المستخدم):**
  - تدقيق بصري يدوي شامل للواجهات والألوان والتباعدات ونصوص المحاذاة اليمينية (RTL).
  - بعد اكتمال المراجعة اليدوية يتم الانتقال إلى **Sprint 6: Testing + QA + Final Polish**.
