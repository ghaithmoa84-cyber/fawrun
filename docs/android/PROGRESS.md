# FORERUN Android — Progress & Decisions Log

> **Purpose:** Track what has been built, what decisions were made,
> and what comes next.
> **Last updated:** After Sprint 1.2 + statusBarColor fix

---

## Current Status

| Component | Status |
|-----------|--------|
| **Sprint 1.1** — Skeleton | ✅ Complete |
| **Sprint 1.2** — Design System | ✅ Complete |
| **Fix** — statusBarColor deprecation | ✅ Complete |
| **Sprint 1.3** — Hilt + Networking | ✅ Complete |
| **Sprint 1.4** — Auth Flow | ⏳ Next |
| **Sprints 2-6** — Features | ⏳ Pending |

**Active branch:** `feature/android-sprint-1-3-networking`

**Last commit:** `198f997` (edge-to-edge fix)
**APK size:** 12.36 MB

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

## Sprint 1.4: Auth Flow ✅

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
- **E2E Status:**
  - Ready for execution on `ForerunTest` emulator using `apps/android/scripts/e2e-test.ps1`.

---

## Contact & Handoff

**Repository:** `github.com/ghaithmoa84-cyber/forerun`
**Active branch:** `feature/android-sprint-1-4-auth-flow`
**Next Sprint:** Sprint 2 (Home + Address + Create Order)



**Reference documents:**
- `AGENTS.md` — rules and standards
- `PROJECT_BRIEF.md` — project overview
- `MASTER-SPEC.md` (this folder) — Android spec
- `FAWRUN — MVP Technical Specification.txt` — original spec (archive)

**Any session resuming work must:**
1. Read MASTER-SPEC.md first
2. Verify `java -version` shows 21.x
3. Verify branch is up to date: `git pull`
4. Continue from the "Next" section above

---

**End of PROGRESS.md**
