# FORERUN Android — دليل التقدم والقرارات

> **الغرض:** مرجع شامل لكل ما تم إنجازه في تطبيق Android.
> **الجمهور:** المطوّر، الوكيل، أي طرف ينضم للمشروع.
> **آخر تحديث:** Sprint 1.2 + إصلاح statusBarColor

---

## 1. نظرة عامة

**FORERUN** (فَوْراً) — منصة توصيل بقالة محلية في القنجرة، سوريا.

### الحالة الراهنة

| المكوّن | الحالة |
|---------|--------|
| Backend (NestJS) | ✅ يعمل في الإنتاج على Railway |
| Admin Dashboard | ✅ يعمل على Vercel |
| Runner PWA | ✅ يعمل على Vercel |
| Customer Web | ✅ يعمل على Vercel |
| **Android App** | 🟡 **قيد التطوير — Sprint 1.2 مكتمل** |

### الهدف من Android

بديل أصلي لتطبيق `customer-web` الحالي، بلغة Kotlin و Jetpack Compose.

---

## 2. القرارات الاستراتيجية المُثبَّتة

| # | القرار | التفصيل |
|---|--------|---------|
| 1 | **الاسم** | `FORERUN` بالإنجليزية، `فَوْراً` بالعربية |
| 2 | **Package Name** | `com.forerun.customer` |
| 3 | **Repository** | `github.com/ghaithmoa84-cyber/forerun` (أُعيد تسميته) |
| 4 | **minSdk** | API 26 (Android 8.0) |
| 5 | **targetSdk / compileSdk** | 35 |
| 6 | **الخدمات في v1** | البقالة فقط. الطرود/راكب = روابط واتساب (خارج التطبيق) |
| 7 | **Firebase** | معتمد لـ FCM (Push Notifications) |
| 8 | **الخرائط** | MapLibre + OpenStreetMap (مجاني، متوافق مع الويب) |
| 9 | **Offline** | متصل دائماً (لا offline-first في v1) |
| 10 | **التوزيع** | APK مباشر (لا Google Play في v1) |
| 11 | **الفريق** | وكيل AI واحد |

---

## 3. البيئة التطويرية

### المتطلبات المثبَّتة

| المكوّن | المسار |
|---------|--------|
| **JDK 21** | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` |
| **Android SDK** | `C:\Users\Dell User\AppData\Local\Android\Sdk` |
| **Android Studio** | `C:\Program Files\Android\Android Studio` |
| **Terminal** | MINGW64 (Git Bash) داخل Antigravity |
| **Antigravity** | بيئة التطوير الرئيسية |

### إعدادات `~/.bashrc`

```bash
# === FORERUN Android Environment ===
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot"
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
# === End FORERUN Android ===
```

### الأوامر الأساسية

```bash
# البناء
cd apps/android
./gradlew clean assembleDebug

# APK الناتج
ls -la app/build/outputs/apk/debug/app-debug.apk

# التحقق من JAVA
java -version   # يجب أن يعرض 21.x
```

### ⚠️ ملاحظات بيئية

- **JDK 25 (JBR من Android Studio)** غير متوافق مع AGP 8.7 → نستخدم JDK 21
- **`buildToolsVersion`** محذوف — AGP يختار تلقائياً
- **`local.properties`** في `apps/android/` (gitignored)
- **`google-services.json`** لم يُضف بعد (يُضاف في Sprint FCM)

---

## 4. الشاشات المُصمَّمة (Stitch)

**18 شاشة جاهزة كمرجع بصري:**

| # | الشاشة | ملاحظات |
|---|--------|---------|
| 1 | Splash | auto-dismiss بعد 1.5s |
| 2-4 | Onboarding (3 شاشات) | من نحن، مندوبون موثوقون، كل ما تحتاجه |
| 5 | Home (default) | للمستخدم بلا طلبات |
| 6 | Home (active order) | CTA يصبح FAB |
| 7 | Sign Up | 3 حقول فقط |
| 8 | Pending Verification | مع polling + WebSocket |
| 9 | Login | WhatsApp + password |
| 10 | Suspended | حساب موقوف |
| 11-14 | Create Order (4 states) | Quick + Structured + Location Modal + Loading |
| 15-17 | Order Detail (3 states) | Active + Delivered + Cancelled+Modal |
| 18 | Orders List | List + Empty + Skeleton |

**ملاحظة:** تصاميم Stitch مرجع عام. عند بناء Compose، تُصحَّح الألوان (بعض الشاشات أنتجت ألواناً داكنة بدل `#00C1A7`).

---

## 5. Design System (المُطبَّق في Compose)

### الألوان (`Color.kt`)

| الاسم | القيمة | الاستخدام |
|-------|--------|-----------|
| `ForerunGreen` | `#00C1A7` | Primary |
| `ForerunGreenDark` | `#008F7D` | Gradient end |
| `ForerunGreenLight` | `#E6F9F6` | Soft backgrounds |
| `WhatsAppGreen` | `#25D366` | أزرار الواتساب |
| `ForerunBackground` | `#FFFFFF` | الخلفية |
| `ForerunSoftSurface` | `#F1F5F9` | بطاقات ثانوية |
| `ForerunBorder` | `#E2E8F0` | الحدود |
| `ForerunTextPrimary` | `#0F172A` | النص الأساسي |
| `ForerunTextMuted` | `#64748B` | النص الثانوي |
| `ForerunDanger` | `#EF4444` | الأخطاء |
| `ForerunWarning` | `#F59E0B` | التحذيرات |
| `ForerunSuccess` | `#10B981` | النجاح |

### الخطوط

- **Cairo** — 4 أوزان: Regular (400), Medium (500), SemiBold (600), Bold (700)
- الملفات في `app/src/main/res/font/`
- **ملاحظة:** Cairo يغطي العربية واللاتينية معاً

### Typography Scale

| الاسم | الحجم | الوزن |
|-------|-------|-------|
| `displayLarge` | 32sp | Bold |
| `headlineMedium` | 24sp | Bold |
| `headlineSmall` | 20sp | SemiBold |
| `titleLarge` | 18sp | SemiBold |
| `titleMedium` | 16sp | SemiBold |
| `bodyLarge` | 16sp | Normal |
| `bodyMedium` | 14sp | Normal |
| `bodySmall` | 12sp | Normal |
| `labelLarge` | 14sp | Bold |
| `labelMedium` | 12sp | SemiBold |
| `labelSmall` | 11sp | Medium |

### المسافات (`Dimens.kt`)

- **Grid:** 4dp
- **القيم:** 2, 4, 8, 10, 12, 16, 20, 24, 32, 48
- **Screen margin:** 16dp
- **Card padding:** 16dp
- **Button height:** 52dp / 56dp

### Corner Radii

- Small: 8dp
- Medium: 12dp
- Large: 16dp
- XLarge: 20dp
- Pill: 999dp

---

## 6. بنية مشروع Android

```
apps/android/
├── settings.gradle.kts
├── build.gradle.kts                (root)
├── gradle.properties
├── local.properties                (gitignored)
├── .gitignore
├── gradle/
│   ├── libs.versions.toml
│   └── wrapper/
├── gradlew
├── gradlew.bat
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/forerun/customer/
        │   ├── ForerunApp.kt
        │   ├── MainActivity.kt
        │   └── ui/theme/
        │       ├── Color.kt
        │       ├── Type.kt
        │       ├── Dimens.kt
        │       └── Theme.kt
        └── res/
            ├── font/
            │   ├── cairo_regular.ttf
            │   ├── cairo_medium.ttf
            │   ├── cairo_semibold.ttf
            │   └── cairo_bold.ttf
            ├── values/
            │   ├── strings.xml
            │   ├── colors.xml
            │   └── themes.xml
            └── mipmap-anydpi-v26/
                └── ic_launcher.xml
```

### الإصدارات المُثبَّتة

| المكوّن | الإصدار |
|---------|---------|
| Kotlin | 2.0.21 |
| AGP | 8.7.3 |
| Gradle | 8.11.1 |
| Compose BOM | 2024.12.01 |
| Material 3 | (من BOM) |
| JDK | 21 |
| minSdk | 26 |
| targetSdk | 35 |
| compileSdk | 35 |

---

## 7. Sprints المُنجزة

### Sprint 1.1 — Skeleton ✅

**التاريخ:** جلسة واحدة

**المُخرَج:**
- مشروع Android كامل
- Compose جاهز
- Build ناجح
- APK: 12.27 MB
- Push للفرع: `feature/android-sprint-1-1-skeleton`
- Commit: `3b91d1e` (scaffold) + `7b076b5` (design system)

**المشاكل المُواجهة:**
- `buildToolsVersion = "36.0.0"` مع `compileSdk = 35` — غير قياسي → حُذف السطر
- AGP اختار `build-tools;34.0.0` تلقائياً — لا مشكلة

### Sprint 1.2 — Design System ✅

**التاريخ:** جلسة واحدة

**المُخرَج:**
- Cairo fonts (4 أوزان، ~41 KB لكل واحد)
- `Color.kt` — 15 لون
- `Type.kt` — 11 نمط
- `Dimens.kt` — نظام مسافات
- `Theme.kt` — `ForerunTheme`
- `MainActivity` — DesignSystemPreview
- APK: 12.36 MB (+90 KB للخطوط)

### Fix — statusBarColor Deprecation ✅

**التاريخ:** جلسة واحدة

**المُخرَج:**
- `enableEdgeToEdge` في `MainActivity`
- حذف `WindowCompat` من `Theme.kt`
- APK: 12.36 MB (بلا تغيير)
- Commit: `198f997`

---

## 8. المشاكل المُواجهة وحلولها

| المشكلة | السبب | الحل |
|---------|-------|------|
| `java: command not found` | JAVA_HOME غير محدَّد | إعداد `~/.bashrc` |
| `Unsupported class file major version` (متوقع) | JDK 25 من Android Studio JBR | تثبيت JDK 21 منفصل |
| `buildToolsVersion = "36.0.0"` مع SDK 35 | تعارض إصدارات | حذف السطر |
| `statusBarColor is deprecated` | Android 15 API change | `enableEdgeToEdge` |
| `gradle wrapper` مفقود | لم يكن موجوداً | تنزيل يدوي من GitHub |
| Repo name `fawrun` مع اسم داخلي `forerun` | عدم اتساق | `gh repo rename` |

---

## 9. حالة Backend الحالي

### Endpoints المُتاحة

| الفئة | العدد | المسار الأساسي |
|-------|-------|----------------|
| Auth | 4 | `/api/v1/auth/*` |
| Customer | 5 | `/api/v1/customer/*` |
| Customer Orders | 4 | `/api/v1/customer/orders/*` |
| Ratings | 2 | `/api/v1/customer/orders/:id/ratings` |
| Admin | 20+ | `/api/v1/admin/*` |
| Runner | 15+ | `/api/v1/runner/*` |
| Settlements | 5 | `/api/v1/*/settlements/*` |

### WebSocket

- **Namespace:** `/orders`
- **Auth:** `{ token }` في `auth` payload
- **Room تلقائي:** `customer:{userId}`
- **Events للعميل:** 8 (status_changed, runner_assigned, fee_updated, store_purchased, out_for_delivery, delivered, cancelled, account_verified)

### State Machine

- 10 حالات Order
- 3 حالات OrderStore
- 3 حالات Runner
- كل transition عبر `OrderStateMachine.transition()`

### قيود

- **Backend = بقالة فقط.** لا يدعم الطرود/راكب.
- **`items.min(1)`** — لا يمكن إنشاء Order بلا مواد
- **لا `serviceType`** في Order
- **`LedgerEntry`** يحمل `orderId` اختياري + `meta` JSON

---

## 10. الخطوات القادمة

### Sprint 1.3 — Hilt + Networking (3-4 أيام)

- إضافة Hilt + Retrofit + OkHttp + Moshi
- Interceptors: Auth, Refresh, Logging, Header
- `ApiResponse<T>` + `ResultWrapper<T>`
- Encrypted storage للتوكنات
- Test: login من الـ app

### Sprint 1.4 — Auth Flow (4-5 أيام)

- Splash
- Onboarding (3 شاشات، يُعرض مرة واحدة)
- Login
- Register
- Pending Verification
- Navigation بسيط

### Sprint 2+ (لاحقاً)

- Home + Address Setup
- Create Order
- Orders List + Detail
- Rating + Account
- FCM + MapLibre
- Testing + APK release

---

## 11. ملاحظات للمطورين المستقبليين

### قواعد صارمة

1. **Server is source of truth** — لا حساب رسوم في Android
2. **كل حالة عبر State Machine** — لا mutation مباشر
3. **`shared-types` أولاً** — لأي DTO جديد (Kotlin translation يدوي)
4. **RTL طبيعي** — Compose يتعامل معه تلقائياً عند `supportsRtl="true"`
5. **Cairo إلزامي** — لا خط بديل
6. **الألوان من `Color.kt` فقط** — لا hardcoded hex
7. **المسافات من `Dimens.kt`** — لا `16.dp` مباشر

### Git Workflow

- **Branch per Sprint:** `feature/android-sprint-N-<description>`
- **Semantic commits:** `feat(android):`, `fix(android):`, `chore(android):`
- **Push إلى remote** بعد كل sprint
- **مراجعة قبل merge إلى master**

### التواصل مع Backend

- **Base URL (Debug):** `http://10.0.2.2:3000/api/v1` (emulator)
- **Base URL (Release):** `https://forerun-api.up.railway.app/api/v1` (يُحدَّث لاحقاً)
- **WebSocket:** `ws://10.0.2.2:3000/orders` (debug)

### قيود معروفة

- **BUG-016:** `deliver` idempotency path غير قابل للوصول
- **Settlement idempotency TODO:** طلبات مسلَّمة قد لا تدخل التسوية في حالات نادرة
- **Firebase Setup:** يحتاج `google-services.json` قبل Sprint FCM
- **MapLibre Setup:** يحتاج اختبار على جهاز حقيقي

---

## نهاية الوثيقة

**آخر commit على الفرع:** `198f997`
**ال الفرع النشط:** `feature/android-sprint-1-1-skeleton`
**الحالة:** جاهز لبدء Sprint 1.3