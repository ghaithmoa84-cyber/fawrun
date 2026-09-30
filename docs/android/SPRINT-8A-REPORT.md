# تقرير Sprint 8A — الإصلاحات المعمارية الحرجة (Customer App)

**التاريخ:** 30 سبتمبر 2026  
**الفرع:** `feature/android-sprint-8a-architecture`  
**الـ Commit:** `081cad4` (`fix(android): sprint 8a - critical architectural fixes`)  
**المرجع:** `docs/android/CODE-REVIEW.md`

---

## 1. جدول الملفات المعدلة الـ 12

| الملف | الأسطر التقريبية | نوع التغيير | يتعلق بـ | آمن؟ |
|---|---|---|---|---|
| `MainActivity.kt` | 27 سطراً | تعديل وحذف+إضافة | [DEEP-CRITICAL-04] Deep Link + Splash | **نعم** — تم نقل معالجة الـ Intent إلى `DeepLinkHolder` لمنع التوجيه المزدوج المبكر مع فحص مسار الشاشة الحالية. |
| `RefreshInterceptor.kt` | سطرين | تعديل | [DEEP-CRITICAL-03] 401 طرد بدون تجديد | **نعم** — إجبار التجديد بـ `force = true` عند 401، ومحمي من الحلقات برأس `X-Retry-After-Refresh`. |
| `DeepLinkHolder.kt` | 26 سطراً *(ملف جديد)* | إضافة فقط | [DEEP-CRITICAL-04] Deep Link + Splash | **نعم** — Singleton خيطي آمن (`StateFlow`) يضمن استهلاك الرابط مرة واحدة فقط. |
| `SocketManager.kt` | 8 أسطر | تعديل | [DEEP-CRITICAL-01] و [DEEP-MEDIUM-05] | **نعم** — تحويل الكلاس والدوال إلى `open` دون تعديل أي منطق تشغيلي لتمكين الـ Mocking والاختبار. |
| `AuthRepositoryImpl.kt` | 53 سطراً | تعديل وحذف+إضافة | [DEEP-CRITICAL-01], [DEEP-CRITICAL-02], [DEEP-MEDIUM-05] | **نعم** — يربط السوكيت عند الدخول، يقطعه عند الخروج، ويحدّث الحالة من السيرفر مع fallback كامل عند انقطاع الشبكة. |
| `TokenRefreshManager.kt` | 6 أسطر | تعديل | [DEEP-CRITICAL-03] 401 طرد بدون تجديد | **نعم** — إضافة معامل `force = false` لتجاوز الفحص الزمني المحلي فقط بطلب صريح من مسار 401. |
| `AddressSetupViewModel.kt` | 61 سطراً | تعديل وحذف+إضافة | [DEEP-CRITICAL-05] Double-submit | **نعم** — حماية ذرية `AtomicBoolean` متزامنة مع `try/finally` (فارق الأسطر ناتج عن إعادة محاذاة الكود). |
| `LoginViewModel.kt` | 6 أسطر | تعديل وإضافة | [DEEP-CRITICAL-01] WebSocket connect | **نعم** — استدعاء احترازي لـ `socketManager?.connect()` داخل `try/catch` عند نجاح الدخول. |
| `ForerunNavGraph.kt` | 43 سطراً | تعديل وحذف+إضافة | [DEEP-CRITICAL-04] Deep Link + Splash | **نعم** — توجيه آمن لوجهة `OrderDetail` مع إبقاء الـ Home كوجهة خلفية في المكدس. |
| `CreateOrderViewModel.kt` | 66 سطراً | تعديل وحذف+إضافة | [DEEP-CRITICAL-05] Double-submit | **نعم** — حماية ذرية `isSubmittingGuard` وإعادة ضبطها في `finally` وعند إخفاقات التحقق (فرق الأسطر بسبب المسافات البادئة). |
| `RatingViewModel.kt` | 40 سطراً | تعديل وحذف+إضافة | [DEEP-CRITICAL-05] Double-submit | **نعم** — حماية ذرية وإعادة ضبط في `finally` بدون المساس بمنطق مهلة الـ 24 ساعة. |
| `SplashViewModel.kt` | 13 سطراً | تعديل وإضافة | [DEEP-CRITICAL-04] Deep Link + Splash | **نعم** — استهلاك الـ deep link فقط إذا كانت حالة المستخدم المعادة من السيرفر `VERIFIED`. |

---

## 2. تفاصيل `AuthRepositoryImpl.kt` (الملف الأهم)

### أ. آلية عمل `checkSession` الجديد (خطوة بخطوة):
1. **فحص شاشة الإعداد الأولية (Onboarding):** إذا كان المستخدم لم يكملها، يُعاد `SessionState.NeedsOnboarding` فوراً.
2. **التحقق من التوكن محلياً:** يُفحص `tokenStorage.hasValidAccessToken()`. إذا انتهت صلاحيته محلياً ولكن يوجد Refresh Token، يتم استدعاء `tokenRefreshManager.refreshTokenIfNeeded(force = false)` لمحاولة تجديده في الخلفية.
3. **الاستعلام الحي من السيرفر (`GET /customer/me`):**
   - يتم طلب واجهة العميل عبر `customerApiProvider?.get()?.me()`.
   - عند النجاح (`ApiResponse.Success`): يتم تحديث حالة المستخدم `status` واسمه في `TokenStorage` فوراً، مما يفك حظر المستخدم الذي وافق عليه المشرف وانتقل من `PENDING` إلى `VERIFIED`.
   - عند استلام كود `401 Unauthorized`: يتم طلب تجديد إجباري للتوكن (`force = true`) وإعادة الاستعلام عن `me()` مرة ثانية. وإذا فشل التجديد يُعاد `SessionState.Unauthenticated`.
4. **آلية الأمان والاحتياط (Offline Fallback):**
   - استدعاء السيرفر محمي بالكامل داخل كتلة `try { ... } catch (_: Exception)`.
   - في حال انقطاع الإنترنت أو بطء الشبكة أو تعثر السيرفر، **لا يُطرد المستخدم** ولا يتعطل التطبيق، بل يتم تجاوز الاستعلام ومتابعة تسجيل الدخول بناءً على البيانات المخزنة محلياً في الكاش (`getCurrentUser()`).
5. **إعادة الحالة النهائية:** إرجاع `SessionState.Authenticated(user)`.

### ب. ماذا يحدث عند فشل `GET /customer/me`؟
- **فشل بسبب الشبكة (Timeout / Network Offline):** يتجاوز الاستثناء فوراً ويعتمد المستخدم المخزن محلياً دون أي انقطاع في تجربة الاستخدام.
- **فشل بسبب انتهاء الصلاحية (401):** يقوم بتجديد التوكن بقوة وإعادة المحاولة لمرة واحدة. إذا فشل التجديد (بسبب انتهاء صلاحية الـ Refresh Token نفسه)، يُعاد `SessionState.Unauthenticated` لطلب تسجيل الدخول.

### ج. كيف يعمل `logout` الجديد؟
1. إلغاء تسجيل توكن الإشعارات: `fcmTokenManager?.unregisterDeviceToken()`.
2. **قطع اتصال الـ WebSocket فوراً وتصفية الموارد:** `socketManager?.disconnect()`.
3. إرسال طلب تسجيل الخروج للسيرفر لإبطال الـ Refresh Token عبر الشبكة.
4. تصفية التخزين المحلي بالكامل: `tokenStorage.clearAll()`.

### د. هل `Provider<CustomerApi>` حلّ مشكلة الاعتماد الدائري؟
**نعم بنسبة 100%.**  
حقن `CustomerApi` المباشر في `AuthRepositoryImpl` كان سينشئ دورة حقن تمنع بناء الـ Dependency Graph في Hilt:  
`AuthRepositoryImpl` ➔ `CustomerApi` ➔ `OkHttpClient` ➔ `RefreshInterceptor` ➔ `TokenRefreshManager` ➔ `AuthApi` ➔ `AuthRepository`  
باستخدام `javax.inject.Provider<CustomerApi>` تم تحويل عملية جلب الـ API إلى استدعاء مؤجل (Lazy) لا يتم إنشاؤه إلا عند تنفيذ `checkSession` داخل الـ Coroutine، مما كسر حلقة الاعتماد تماماً وسمح بالبناء والتجميع بدون أي تحذيرات.

---

## 3. آلية منع الحلقة اللانهائية في `RefreshInterceptor.kt`

عند استدعاء التجديد بقوة `refreshTokenIfNeeded(force = true)`، يتم منع أي حلقة تكرار عبر 3 صمامات أمان صارمة:
1. **ترويسة المحاولة الواحدة (`X-Retry-After-Refresh`):**
   عند اعتراض أول خطأ 401 ونجاح التجديد، يُعاد إرسال الطلب حاملاً الترويسة:
   ```kotlin
   .header(HEADER_RETRY_AFTER_REFRESH, "true")
   ```
   فإذا فشل الطلب المعاد ورد عليه السيرفر مجدداً بـ 401، يقرأ الإنترسبتور الشرط:
   ```kotlin
   val isRetry = request.header(HEADER_RETRY_AFTER_REFRESH) == "true"
   if (isRetry) {
       tokenRefreshManager.handleSessionExpired()
   }
   ```
   ويقوم بإنهاء الجلسة فوراً دون أي إعادة طلب أو تجديد ثانٍ.
2. **حظر مسارات المصادقة (`isAuthEndpoint`):**
   أي استدعاء يتضمن `/auth/` (مثل طلب الـ refresh ذاته) مستثنى من الإنترسبتور لمنع التجديد التعاقبي.
3. **تزامن الـ Mutex في `TokenRefreshManager`:**
   يضمن أن خيطاً واحداً فقط ينفذ التجديد وتنتظر باقي الطلبات المتزامنة نتيجته.

---

## 4. تحليل ملفات ViewModels: (لماذا ~60 سطراً لكل ملف؟)

### الملفات:
- `CreateOrderViewModel.kt` (~66 سطراً معدلاً)
- `AddressSetupViewModel.kt` (~61 سطراً معدلاً)
- `RatingViewModel.kt` (~40 سطراً معدلاً)

### هل كل التغييرات متعلقة بـ Double-Submit؟
**نعم، 100% من التغييرات متعلقة حصراً بمنع النقر المزدوج والسباق (Double-Submit Protection).**

### هل يوجد أي تغيير خفي؟
**لا يوجد أي تغيير خفي على الإطلاق.**  
السبب في وصول عدد الأسطر في الـ Diff إلى ~60 سطراً هو:
1. **كتلة `try { ... } finally { guard.set(false) }`:** تم تغليف جسم دالة المعالجة بالكامل داخل `try/finally` لضمان تحرير القفل الذري `AtomicBoolean` تحت أي ظرف (سواء نجاح أو فشل أو إلقاء استثناء)، مما تسبب في تغيير المسافة البادئة (Indentation) لعشرات الأسطر فاعتبرها Git أسطراً محذوفة ومعاد إضافتها.
2. **تحرير الحارس عند فشل التحقق (Validation Early Returns):** إضافة `guard.set(false)` قبل كل نقطة `return` مبكرة عند عدم اكتمال الحقول أو فراغ السلة أو خطأ التنسيق.

---

## 5. فحص التغييرات الخارجية

**لا توجد أي تغييرات خارج نطاق المشاكل الـ 6 المتفق عليها.**  
التعديلات المرافقة الأخرى كانت فقط:
- تحويل فئة `SocketManager` إلى `open` لتمكين الـ Unit Tests من محاكاتها بدون مكتبات mocking خارجية.
- إضافة دوال تأخير وعدادات استدعاء خفيفة في الـ `FakeOrderRepository` لاختبارات الـ Double-Submit.
- إنشاء اختبارات الوحدة الإضافية لتغطية المشاكل الست بدقة.

---

## 6. تقييم الأمان والتوصية النهائية

| المعيار | النتيجة |
|---|---|
| اختبارات الوحدة (Unit Tests) | **172 / 172 ناجحة 100%** (157 سابقة + 15 جديدة) |
| فحص الجودة (Lint) | **0 أخطاء (0 Errors)** |
| تجميع النسخة التجريبية (assembleDebug) | **BUILD SUCCESSFUL** |
| تجميع نسخة الإنتاج (assembleRelease) | **BUILD SUCCESSFUL** (R8 Proguard + LintVital ناجح) |
| سلامة فرع `master` | **نظيف تماماً وغير ممسوس** |

### التوصية:
**الفرع `feature/android-sprint-8a-architecture` آمن وجاهز تماماً للدمج (Production-Ready).**  
جميع المشاكل المعمارية تم علاجها بحلول نظيفة تتوافق مع مبادئ Clean Architecture و Hilt Dependency Injection، مع الحفاظ على التراجع التلقائي (Graceful Degradation) ودون أي أثر جانبي على استقرار التطبيق.
