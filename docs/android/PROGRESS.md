# FORERUN Android — Progress & Decisions Log

> **Purpose:** Track what has been built, what decisions were made,
> and what comes next.
> **Last updated:** After Sprint 5 (FCM Push Notifications + MapLibre Polish)

---

## Current Status

| Component | Status |
|-----------|--------|
| **Sprint 1.1** — Skeleton | ✅ Complete |
| **Sprint 1.2** — Design System | ✅ Complete |
| **Fix** — statusBarColor deprecation | ✅ Complete |
| **Sprint 1.3** — Hilt + Networking | ✅ Complete |
| **Sprint 1.4** — Auth Flow | ✅ Complete |
| **Sprint 2** — Home, Address & Orders | ✅ مكتملة (غير مدموجة في master) |
| **Sprint 3** — Order Detail, Rating & Socket.IO | ✅ مكتملة (غير مدموجة في master) |
| **Sprint 4** — Account, Support & WebSocket Hardening | ✅ مكتملة (غير مدموجة في master) |
| **Sprint 5** — FCM Push Notifications & MapLibre Polish | ✅ مكتملة (غير مدموجة في master) |
| **UI Polish Pass** — مراجعة يدوية من المستخدم | ⏳ Next |
| **Sprint 6** — Testing + QA + Final Polish | ⏳ Pending |

**Active branch:** `feature/android-sprint-5-fcm-maplibre`

**Last commit:** `abf02d8` (`feat(android): add FCM push notifications + maplibre polish`)
**Total tests:** 135/135 passed (100% passing)
**APK size (ABI split):**
- `app-arm64-v8a-debug.apk`: 29.12 MB (29,123,417 bytes)
- `app-armeabi-v7a-debug.apk`: 26.16 MB (26,163,367 bytes)
- `app-x86_64-debug.apk`: 29.41 MB (29,410,712 bytes)

---

## Environment

| Component | Path / Value |
|-----------|--------------|
| JDK 21 | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` |
| Android SDK | `C:\Users\Dell User\AppData\Local\Android\Sdk` |
| Android Studio | `C:\Program Files\Android\Android Studio` |
| Terminal | MINGW64 (Git Bash) inside Antigravity |
| IDE | Antigravity (primary) + Android Studio (preview) |
| minSdk / targetSdk | 26 / 35 |
| Kotlin | 2.0.21 |
| AGP | 8.7.3 |
| Gradle | 8.11.1 |
| Compose BOM | 2024.12.01 |

### `~/.bashrc` Setup

```bash
# === FORERUN Android Environment ===
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot"
export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
# === End FORERUN Android ===
```

### Common Commands

```bash
cd apps/android
./gradlew clean assembleDebug     # build APK
./gradlew lint                    # lint
./gradlew test                    # unit tests

ls -la app/build/outputs/apk/debug/app-debug.apk   # check APK
java -version                     # verify JDK 21
```

---

## Sprint 1.1 — Skeleton ✅

**Completed:** First session

**Deliverables:**
- Full Android project structure
- Compose set up
- `./gradlew assembleDebug` succeeds
- APK: 12.27 MB
- Branch: `feature/android-sprint-1-1-skeleton`
- Commits: `3b91d1e` (initial), `7b076b5` (design system)

**Issues encountered:**
- `buildToolsVersion = "36.0.0"` with `compileSdk = 35` — non-standard
- **Fix:** Removed the line; AGP auto-selected `build-tools;34.0.0`

---

## Sprint 1.2 — Design System ✅

**Completed:** Second session

**Deliverables:**
- Cairo font (4 weights: Regular, Medium, SemiBold, Bold)
- Each ~41 KB in `res/font/`
- `Color.kt` — 15 colors
- `Type.kt` — 11 text styles
- `Dimens.kt` — spacing + radii
- `Theme.kt` — `ForerunTheme`
- `MainActivity.kt` — `DesignSystemPreview` composable
- APK: 12.36 MB (+90 KB for fonts)

**Files created:**
```
app/src/main/java/com/forerun/customer/ui/theme/
├── Color.kt
├── Type.kt
├── Dimens.kt
└── Theme.kt
```

---

## Fix — statusBarColor Deprecation ✅

**Completed:** Third session

**Change:**
- Migrated from `Window.statusBarColor` (deprecated in Android 15) to `enableEdgeToEdge()`
- Removed `WindowCompat` usage from `Theme.kt`
- Added `enableEdgeToEdge()` in `MainActivity.onCreate()`

**Result:**
- Warning disappeared from build
- APK unchanged: 12.36 MB
- Commit: `198f997`

---

## Problems Encountered & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| `java: command not found` | JAVA_HOME not set in bash | Configured `~/.bashrc` |
| JDK 25 from Android Studio JBR | Incompatible with AGP 8.7 | Installed Temurin JDK 21 |
| `buildToolsVersion = "36.0.0"` mismatch | Manual pinning conflict | Removed the line |
| `gradle wrapper` missing | Not in repo | Downloaded from GitHub |
| Repo name `fawrun` vs `forerun` | Naming inconsistency | `gh repo rename` |
| `statusBarColor is deprecated` | Android 15 API change | `enableEdgeToEdge()` |

---

## Design System Summary

### Colors

| Name | Value |
|------|-------|
| Primary | `#00C1A7` (mint green) |
| Primary Dark | `#008F7D` |
| Primary Light | `#E6F9F6` |
| WhatsApp Green | `#25D366` |
| Background | `#FFFFFF` |
| Soft Surface | `#F1F5F9` |
| Border | `#E2E8F0` |
| Text Primary | `#0F172A` |
| Text Muted | `#64748B` |
| Danger | `#EF4444` |
| Warning | `#F59E0B` |
| Success | `#10B981` |

### Typography

**Font:** Cairo (400/500/600/700)

**Scale:** 11 styles from 11sp (labelSmall) to 32sp (displayLarge)

### Spacing

4dp grid: 2, 4, 8, 10, 12, 16, 20, 24, 32, 48

### Corner Radii

8 / 12 / 16 / 20 / pill (999)

---

## Backend Status (unchanged)

- **Production:** Railway (`forerun-api-production.up.railway.app`)
- **Database:** PostgreSQL
- **WebSocket:** Socket.IO on `/orders` namespace
- **Auth:** JWT RS256, access 2h + refresh (rotated)
- **Endpoints:** 55+ under `/api/v1/`
- **State Machine:** 10 order states, enforced server-side
- **Limitation:** Backend is grocery-only. No `serviceType` field.

**WebSocket events for customer (8):**
- `order:status_changed`
- `order:runner_assigned`
- `order:fee_updated`
- `order:store_purchased`
- `order:out_for_delivery`
- `order:delivered`
- `order:cancelled`
- `account:verified`

---

## Screens Designed (Google Stitch)

**18 screens ready as visual reference:**

1. Splash
2. Onboarding — Identity
3. Onboarding — Trust
4. Onboarding — Services
5. Home (default)
6. Home (with active order)
7. Sign Up
8. Pending Verification
9. Login
10. Suspended
11. Create Order — Quick Mode
12. Create Order — Structured Mode
13. Create Order — Location Modal
14. Create Order — Submit Loading
15. Order Detail — Active
16. Order Detail — Delivered
17. Order Detail — Cancelled
18. Orders List (List + Empty + Skeleton)

**Note:** Stitch designs are a visual reference, not a spec. Colors
must be corrected to match `Color.kt` during Compose implementation.

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| Session 1 | Rename FAWRUN → FORERUN | User preference |
| Session 1 | Package: `com.forerun.customer` | Final |
| Session 2 | Maps: MapLibre + OSM | Free, no credit card |
| Session 2 | WebSocket: Socket.IO client | Backend uses Socket.IO |
| Session 3 | Firebase for FCM | Industry standard, free |
| Session 3 | No Room / no offline | Always-online in v1 |
| Session 3 | Services: grocery only | Packages/rides via WhatsApp |
| Session 4 | Direct APK distribution | No Play Store |
| Session 4 | Design System: mint green + Cairo | Matches brand |

---

## Sprint 1.3 — Hilt + Networking ✅

**Completed:** Session 5
**Branch:** `feature/android-sprint-1-3-networking`

**Deliverables:**
- Hilt DI configured with KSP (`hilt-android`, `hilt-compiler` 2.53.1)
- Retrofit 2.11.0 + OkHttp 4.12.0 + Moshi 1.15.1 (codegen via KSP)
- `ApiResponse<T>` sealed interface (`Success`, `Error`) with custom `ApiCallAdapter` & `ApiCallAdapterFactory`
- Interceptors:
  1. `HeaderInterceptor` (`Accept-Language: ar-SY`, `X-Client: android`)
  2. `AuthInterceptor` (`Authorization: Bearer <token>`)
  3. `RefreshInterceptor` (single refresh attempt on 401, `X-Retry-After-Refresh: true`)
  4. `HttpLoggingInterceptor` (BODY on debug, NONE on release)
- Secure token storage via `EncryptedSharedPreferences` (`TokenStorage` + `EncryptedTokenStorage`)
- `TokenRefreshManager` with `Mutex` for concurrent request synchronization
- `UiError` sealed hierarchy + `ErrorMapper` with localized Arabic error mapping
- Hilt Modules: `NetworkModule`, `StorageModule`, `ApiModule`
- API Interfaces: `AuthApi` (`login`, `refresh`, `logout`) + `CustomerApi` (`me`)
- DTOs strictly aligned with `shared-types` and MVP Tech Spec
- Unit test suite for `ApiCallAdapter` (via `MockWebServer`) and `ErrorMapper` (6 passing tests)
- Temporary "Test Login" button integrated in `MainActivity.kt` with secure masked token logging
- Production Base URL verified & fixed: `https://fawrun-api-production.up.railway.app/api/v1/`

---

## Handoff from Sprint 1.3

### 1. `handleSessionExpired()` Mechanism
- `TokenRefreshManager` exposes `val sessionExpiredEvent: SharedFlow<Unit>`.
- When a 401 response occurs and silent refresh fails, `handleSessionExpired()` clears tokens via `TokenStorage.clearAll()` and emits to `sessionExpiredEvent`.
- **Sprint 1.4 action:** Collect `sessionExpiredEvent` in `MainActivity` or root `ForerunNavGraph` and navigate to the `login` route, clearing the back stack.

### 2. Sprint 1.3 Remaining TODOs (for Sprint 1.4+)
- [ ] Add unit test for `HeaderInterceptor` (`Accept-Language: ar-SY`, `X-Client: android`).
- [ ] Add unit test for `TokenRefreshManager` covering concurrent `Mutex` access and token expiry calculations.
- [ ] Consider separating `ApiErrorParser` if `ApiCall.kt` exceeds 150 lines.
- [ ] Review 13 unstaged docs/config files in root repo before first production APK.

### 3. Production Base URL
- Verified and fixed in spec and code: `https://fawrun-api-production.up.railway.app/api/v1/`

---

## Sprint 1.4: Auth Flow ✅ (مكتمل ومُعتمد 100%)

**Status:** مكتمل بنسبة 100% — معتمد نهائياً بعد إتمام اختبارات E2E على المحاكي
**Completed:** Session 6
**Branch:** `feature/android-sprint-1-4-auth-flow`

**Deliverables:**
- **Navigation Infrastructure:** `ForerunNavGraph.kt` with NavHost and 7 routes (`splash`, `onboarding`, `login`, `register`, `pending_verification`, `suspended`, `home`).
- **DataStore Storage:** `OnboardingPrefs` interface + `DefaultOnboardingPrefs` using AndroidX DataStore Preferences for the `onboarding_seen` flag (clean separation from `EncryptedSharedPreferences`).
- **Auth Domain Layer:**
  - Models: `User`, `UserStatus` (`PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `SUSPENDED`), `SessionState` (`NeedsOnboarding`, `Unauthenticated`, `Authenticated`).
  - Repository: `AuthRepository` interface.
  - Use Cases: `LoginUseCase`, `RegisterUseCase`, `LogoutUseCase`, `CheckSessionUseCase`.
- **Auth Data Layer:**
  - `AuthRepositoryImpl` implementing `AuthRepository`.
  - DTOs: `AddressDto`, `RegisterRequest`, `RegisterResponse`, `LoginResponse` (with optional `expiresIn`).
  - Endpoints: added `POST auth/register` to `AuthApi`.
  - Hilt DI: `RepositoryModule` with `@Binds` for `AuthRepository`.
- **Screens & ViewModels (100% Compose + Cairo font + Mint Green `#00C1A7`):**
  1. **Splash:** `SplashScreen` + `SplashViewModel` with scale/fade animations, branding, and automatic session-based routing.
  2. **Onboarding:** `OnboardingScreen` + `OnboardingViewModel` with 3-screen `HorizontalPager`, animated dot indicators, "تخطي" / "التالي" / "ابدأ الآن" buttons, saving state to DataStore.
  3. **Login:** `LoginScreen` + `LoginViewModel` with Syrian phone validation (`^09\d{8}$`), password input with visibility toggle, localized Arabic errors from `strings.xml`.
  4. **Register:** `RegisterScreen` + `RegisterViewModel` with full client-side validation, Al-Qanjara address stub (`lat = 35.5234`, `lng = 35.9876`), and routing to pending verification.
  5. **Pending Verification:** `PendingVerificationScreen` + `PendingVerificationViewModel` with status warning badge, WhatsApp direct button (`wa.me`), and logout.
  6. **Suspended:** `SuspendedScreen` + `SuspendedViewModel` with danger badge, support contact button, and logout.
  7. **Home (Stub):** `HomeScreen` + `HomeViewModel` displaying personalized greeting, verified badge, Sprint 2 coming soon notice, and logout.
- **Session Expiration Event Handling:**
  - `MainActivity` injects `@Singleton TokenRefreshManager` and provides it to `ForerunNavGraph`.
  - When silent refresh fails (`handleSessionExpired()`), `sessionExpiredEvent` emits and automatically resets navigation backstack directly to `Routes.LOGIN`.
- **Unit Testing Suite:**
  - Tested with `kotlinx-coroutines-test`, `Turbine`, and `FakeAuthRepository` / `FakeTokenStorage`.
  - `AuthRepositoryImplTest`: repository login token storage and session state determination.
  - `LoginViewModelTest`: phone formatting, validation errors, successful auth, network/API failure handling.
  - `SplashViewModelTest`: complete routing coverage for all session and user status variants.
  - `RegisterViewModelTest`: form validation, conflict/failure handling, and successful registration.
- **Quality Gates:**
  - `./gradlew test`: 100% passed (both debug and release).
  - `./gradlew lint`: 0 errors.
  - `./gradlew clean assembleDebug`: successful clean build.
  - APK Size: **14.93 MB** (well below the 16.0 MB maximum budget).

### Known Issues & Technical Debt

#### BUG-ANDROID-001: ADMIN_WHATSAPP Placeholder
- **File:** `PendingVerificationScreen.kt:118`
- **Value:** `963951111111` (placeholder)
- **Impact:** زر "فتح WhatsApp" في PendingVerification يوجّه لرقم غير حقيقي.
- **Fix:** استبداله بالرقم الإنتاجي قبل أول APK يُوزَّع.
- **Blocker:** يجب الحصول على الرقم الحقيقي من الإدارة.

#### Known Gap — S5b: Active Session Expiration Ejection (مؤجل إلى Sprint 2)
- **الوصف:** سيناريو طرد المستخدم النشط لشاشة تسجيل الدخول (`sessionExpiredEvent` -> `Routes.LOGIN`) عند استلام 401 وفشل الـ Silent Refresh تلقائياً أثناء استخدام التطبيق.
- **الوضع الحالي:** تم التحقق منه معمارياً وتغطيته بالكامل عبر اختبارات الـ Unit Tests في `ForerunNavGraph` و `AuthRepositoryImplTest`.
- **سبب التأجيل:** يتطلب محاكاة حية لاستدعاءات محمية حقيقية تتلقى 401 بعد انتهاء الصلاحية. تم تأجيل الاختبار اليدوي الحي إلى **Sprint 2** تزامناً مع استدعاء نقاط النهاية الفعلية للطلبات والعميل (`GET /api/v1/customer/me` و `POST /api/v1/orders`).

### Test Fixtures

#### Test Fixture: Production Test Account
- **whatsapp:** `0999999999`
- **userId:** `cmuk9n8e1000624il3fg7soqp`
- **status:** `PENDING_VERIFICATION`
- **purpose:** Contract verification (Sprint 1.4 live curl test)
- **action:** Do not delete — may be useful for future tests and fixtures.

### Session Prep — 2026-09-28

- **Task 1 — cmdline-tools & AVD:**
  - Installed Android `cmdline-tools:latest` (12.0) and accepted SDK licenses.
  - Installed `platforms;android-34` and `system-images;android-34;google_apis;x86_64`.
  - Created AVD: `ForerunTest` (Pixel 6 profile, API 34).
  - AVD readiness: **Yes (`ForerunTest` verified in `emulator -list-avds`)**.
- **Task 2 — Code Review & Robustness Fixes (`4d63c7b`):**
  - Resolved session expired navigation re-entry loop in `ForerunNavGraph.kt`.
  - Added 4-second timeout and exception safety in `SplashViewModel.kt`.
  - Prevented double-tap duplicate submissions in `LoginViewModel.kt` and `RegisterViewModel.kt`.
  - Added `FLAG_ACTIVITY_NEW_TASK` to WhatsApp Intent in `PendingVerificationScreen.kt`.
  - Verified 23/23 unit tests pass.
- **Task 3 — Automated E2E Test Script (`055106c`):**
  - Created automated PowerShell E2E test script: `apps/android/scripts/e2e-test.ps1`.
- **Task 4 — Repository Alignment Cleanup (`a14d871`):**
  - Cleaned up and committed 14 documentation and config references (`fawrun-api` -> `forerun-api`).
- **New TODOs (Architectural Hardening):**
  - `TokenStorage`: Combine token and user persistence into an atomic DataStore transaction (`saveUserSession`).
  - `TokenRefreshManager`: Add `AtomicBoolean` guard against race conditions in concurrent silent refresh requests.
- **E2E Testing Results (Executed on ForerunTest / Android 34):**
  - **S1 (Onboarding):** ✅ نجح (التنقل بين الشرائح الثلاث وتخطيها/إكمالها).
  - **S2 (Register):** ✅ نجح (إنشاء حساب جديد والتوجيه التلقائي لشاشة المراجعة).
  - **S3 (WhatsApp Intent):** ✅ نجح (فتح الرابط الخارجي للدعم دون أي تعليق).
  - **S4 (Logout / Login):** ✅ نجح (تسجيل الخروج والعودة لتسجيل الدخول بنجاح مع استعادة حالة الحساب).
  - **S5 (Session Persistence):** ✅ نجح (إعادة فتح التطبيق تحتفظ بالتوكنات وتوجّه مباشرة لشاشة قيد المراجعة عبر Splash).
  - **تحليل Logcat:** 0 انهيارات (0 Fatal, 0 AndroidRuntime exceptions, 0 ANR).
  - **حالة الاعتماد:** **معتمد 100% — جاهز للانطلاق إلى Sprint 2.**

---

## Sprint 2: Home, Address & Orders ✅ (مكتملة — غير مدموجة في master)

**Status:** مكتملة بنسبة 100% (غير مدموجة في master)
**Completed:** Session 7 (2026-09-28)
**Branch:** `feature/android-sprint-2-home-order`

### Deliverables Breakdown

1. **Commit 1 — Home Screen & Bottom Navigation (`5cac4a2`, `7cb0285`):**
   - Bottom navigation bar with 3 tabs: الرئيسية (Home), طلباتي (Orders), حسابي (Account).
   - Modern Google Stitch dashboard layout with greeting, verified account status badge, and stats summary card.
   - Active order card banner (showing active order status, runner ETA, quick track button) and quick actions (طلب جديد, إضافة عنوان).
   - `HomeViewModel` + `FakeHomeRepository` with complete intent processing (`HomeIntent.Load`, `HomeIntent.Refresh`).

2. **Logo Optimization & Brand Refresh (`d14b6ce`):**
   - Converted 3.4 MB oversized raster logo to modern WebP format (~36 KB), maintaining ultra-crisp resolution with 99% size reduction.

3. **Sprint 1.4 Deferred Verifications (S5a & S5b) (`e172a7e`, `6a1f80c`):**
   - **S5a (Pull to Refresh):** Added Material 3 `PullToRefreshBox` to `HomeScreen` with non-blocking refresh indicator and `HomeIntent.Refresh`.
   - **S5b (Active Session Expiration Ejection):** Added debug session expiry trigger on `AccountScreen` (calling `/auth/logout` and clearing access token while retaining refresh token). Verified live on emulator that triggering refresh on expired session rejects with 401, fails silent refresh, emits `sessionExpiredEvent`, and immediately resets navigation backstack to `Routes.LOGIN`.

4. **Commit 2 — Account Screen (`6a1f80c`):**
   - Customer profile details, verified badge, quick navigation to Address Setup and Orders, and secure logout.

5. **Commit 3 — Address Setup Screen (MapLibre Native Android + OSM) (`dedb86d`, `99dcee9`, `776e9c3`):**
   - Integrated MapLibre Native Android SDK (`org.maplibre.gl:android-sdk:11.5.1`) with OpenStreetMap raster tile style JSON (`styles/osm_raster.json`).
   - Center pin with coordinate tracking on camera idle (`onCameraIdle`).
   - Reverse geocoding via OpenStreetMap Nominatim API (`https://nominatim.openstreetmap.org/reverse?lat=&lon=&format=json`) with custom User-Agent `Forerun/1.0 (android)` and 500ms debounce.
   - Runtime GPS permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) with animated "موقعي الحالي" FAB.
   - Full API integration: `GET /customer/me/address` (detects create vs. edit mode) and `PUT /customer/me/address` with validation.
   - **ABI Splits Configured:** Excluded obsolete `x86`, generating targeted APKs for `arm64-v8a`, `armeabi-v7a`, and `x86_64`.

6. **Commit 4 — Create Order Screen (`b8e01de`):**
   - Google Stitch dynamic item builder with Arabic UI.
   - Dynamic items list: item description, quantity counter, "أي متجر" toggle or custom store name input.
   - Preferred Runner picker fetching available captains (`GET /customer/runners`) with "انتظار الكابتن المفضل" checkbox toggle.
   - General notes field for runner instructions.
   - Saved address preview card with "تغيير" navigation button.
   - Strict client-side validation (at least 1 non-empty item, store specified if not any-store, address selected).
   - Backend integration: `POST /customer/orders`.
   - **Server Source of Truth:** Zero local fee calculation; server calculates and returns official fees.
   - Live verified on production Railway backend: created order **`FW-000015`** with 3 items and 80 SYP fee.

7. **Commit 5 — Order Confirmation Screen (`3786974`):**
   - Pure argument-driven screen (no ViewModel) receiving `orderNumber` and `estimatedFee` from navigation arguments.
   - Success badge, order number, estimated fee, and disclaimer note: *"الرسم النهائي يُحدد بعد المراجعة"*.
   - Action buttons: "تتبع الطلب" (navigates to Orders tab) and "طلب جديد" (re-opens Create Order with cleared stack).

8. **Commit 6 — Orders List Screen (`de1ba2b`):**
   - Full integration with `GET /customer/orders?page=&limit=&status=`.
   - Material 3 `PullToRefreshBox` for seamless manual refresh.
   - Pagination support with infinite scrolling ("جاري تحميل المزيد…").
   - Filter chips: **الكل** (ALL), **النشطة** (ACTIVE), **المكتملة** (DELIVERED), **الملغاة** (CANCELLED).
   - Order cards displaying: `orderNumber`, status badge with themed color and Arabic label, `totalFee` formatted with Syrian Pound ("80 ل.س"), item count, and localized Arabic date/time (`dd/MM/yyyy - hh:mm a`).
   - Arabic empty state illustration and CTA ("ابدأ طلباً جديداً").
   - MVI/MVVM: `OrdersListViewModel` + `OrdersListUiState` + `OrdersListIntent`.
   - **Live Verification:** Verified live order **`FW-000015`** displayed correctly on emulator under "النشطة" and "الكل" with status "قيد المراجعة".

---

## Sprint 3: Order Detail, Rating & Socket.IO ✅ (مكتملة — غير مدموجة في master)

**Status:** مكتملة بنسبة 100% (غير مدموجة في master)
**Branch:** `feature/android-sprint-3-order-detail`
**Commit:** `9d02b4f`

### Deliverables Breakdown
1. **Order Detail Screen & Tracking (`OrderDetailScreen`):**
   - Live order tracking with dynamic Arabic status badges and order progression timeline.
   - Store purchase items list (`isPurchased` badges and store grouping).
   - Dynamic runner info card with direct WhatsApp and phone call intent launchers.
   - Price breakdown (base fee, peripheral fee, extra stores, total).
2. **Real-time Socket.IO Integration:**
   - Dedicated `/orders` namespace connection with JWT authentication.
   - Event listeners for `order:status_changed`, `order:runner_assigned`, `order:fee_updated`, `order:store_purchased`, `order:delivered`, `order:cancelled`.
   - Foreground lifecycle integration and automatic reconnect with exponential backoff.
3. **Rating BottomSheet & Screen (`RatingScreen`):**
   - 5-star interactive rating component with optional customer feedback note.
   - Integrated with backend `POST /customer/orders/{id}/rating`.

---

## Sprint 4: Account, Support & WebSocket Hardening ✅ (مكتملة — غير مدموجة في master)

**Status:** مكتملة بنسبة 100% (غير مدموجة في master)
**Branch:** `feature/android-sprint-4-account-support`
**Commits:** `a364571`, `1aeb02c`

### Deliverables Breakdown
1. **Account Screen Management (`AccountScreen`):**
   - Full profile display and update via `PATCH /customer/me` (selective update sending only modified fields).
   - Saved address shortcut, order history shortcut, and secure token revocation on logout.
   - Debug session expiration trigger guarded by `BuildConfig.DEBUG`.
2. **Support Screen (`SupportScreen`):**
   - Support info retrieval via `GET /customer/support/info`.
   - Contact channels: direct WhatsApp launch with prefilled message, phone dialer intent, and working hours display.
3. **WebSocket & Session Hardening:**
   - Improved socket event handling, lifecycle binding, and token rotation auto-reconnect.

---

## Sprint 5: FCM Push Notifications & MapLibre Polish ✅ (مكتملة — غير مدموجة في master)

**Status:** مكتملة بنسبة 100% (غير مدموجة في master)
**Branch:** `feature/android-sprint-5-fcm-maplibre`
**Commit:** `abf02d8`

### Deliverables Breakdown
1. **Firebase Cloud Messaging (FCM) Integration:**
   - Firebase BOM `33.7.0` + `firebase-messaging` integrated cleanly with `google-services` plugin 4.4.2.
   - `ForerunFirebaseMessagingService` handling background push notifications and token refreshes.
   - High-priority Notification Channel: "FORERUN — تحديثات الطلبات" (`IMPORTANCE_HIGH`) with custom sound and vibration.
   - Runtime `POST_NOTIFICATIONS` permission request flow for Android 13+ (API 33+).
   - Deep linking navigation: extracts `orderId` from notification payload and opens `OrderDetailScreen` directly.
2. **Device Token Management (`DeviceTokenRepository`):**
   - Registration: `POST /customer/me/device-token` on login and token refresh.
   - Unregistration: `DELETE /customer/me/device-token` on user logout.
3. **MapLibre & Geocoding Polish:**
   - Reverse geocoding in-memory LRU cache (`AddressReverseGeocodeCache`) with 4-decimal coordinate rounding to eliminate redundant network hits.
   - MapLibre lifecycle handling enhancements in `AddressSetupScreen`.

---

### Quality & Verification Summary

| Gate | Target | Result | Status |
|------|--------|--------|--------|
| **Unit Tests** | 100% passing | 135 / 135 passed | ✅ PASS |
| **Lint** | 0 errors | 0 errors (`lint` clean) | ✅ PASS |
| **Build** | Debug APKs | Clean build (`assembleDebug`) | ✅ PASS |
| **Server Truth** | Zero client fee logic | 100% server calculated fees | ✅ PASS |
| **APK Split Sizes** | < 30 MB per ABI | 26.16 MB (armeabi-v7a) / 29.12 MB (arm64-v8a) / 29.41 MB (x86_64) | ✅ PASS |

---

## Known Gaps

1. **FCM (Firebase Cloud Messaging):** ملف `google-services.json` الحالي هو ملف هيكلي تجريبي (Placeholder مستثنى من git)؛ يتطلب ربط مشروع Firebase فعلي لاستقبال التنبيهات من السيرفر على الأجهزة الحقيقية.
2. **4 فروع غير مدموجة في master:** الفروع (`sprint-2`, `sprint-3`, `sprint-4`, `sprint-5`) تراكمية ومكتملة محلياً، ولم يتم دمجها في `master` بانتظار إشارة المستخدم ومراجعة PR الشامل.
3. **غياب اختبارات E2E المؤتمتة:** لا توجد بنية CI/CD لتشغيل اختبارات E2E مؤتمتة على المحاكي، والاعتماد حالياً على 135 unit test مع التحقق اليدوي على المحاكي.
4. **زر تجربة انتهاء الجلسة في AccountScreen:** زر تجربة انتهاء الجلسة محمي بشرط `BuildConfig.DEBUG` لضمان عدم ظهوره نهائياً في نسخ الإنتاج (Release builds).

---

## Next: UI Polish Pass (يدوي من المستخدم)

- مراجعة يدوية شاملة للواجهات الـ 17 من قبل المستخدم للتدقيق البصري وتناسق الألوان، التباعدات، دعم RTL، والتجاوب مع أحجام الشاشات المختلفة.
- يليها Sprint 6: Testing + QA + Final Polish.

---

## Contact & Handoff

**Repository:** `github.com/ghaithmoa84-cyber/forerun`  
**Active branch:** `feature/android-sprint-5-fcm-maplibre`  
**Last commit:** `abf02d8`  
**Next Step:** UI Polish Pass (يدوي من المستخدم) → Sprint 6: Testing + QA + Final Polish  

**Reference documents:**
- `AGENTS.md` — rules and standards
- `PROJECT_BRIEF.md` — project overview
- `MASTER-SPEC.md` — Android master specification
- `CURRENT_STATE.md` — Android current state summary

---

**End of PROGRESS.md**
