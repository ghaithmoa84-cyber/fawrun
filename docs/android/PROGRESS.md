# FORERUN Android — Progress & Decisions Log

> **Purpose:** Track what has been built, what decisions were made, and what comes next.
> **Last updated:** 30 September 2026 (after Sprint 8C merged into `master`)

---

## Current Status

| Sprint | الحالة | آخر commit |
|--------|--------|------------|
| **1.1** Skeleton | ✅ Done | `3b91d1e` |
| **1.2** Design System | ✅ Done | `7b076b5` |
| **1.3** Hilt + Networking | ✅ Done | `db3e290` |
| **1.4** Auth Flow | ✅ Done | `2d7a77a` |
| **2** Home + Address + Create Order | ✅ Done | `e60efc8` |
| **3** Order Detail + Rating + Socket.IO | ✅ Done | `9d02b4f` |
| **4** Account + Support + WebSocket Hardening | ✅ Done | `1aeb02c` |
| **5** FCM + MapLibre Polish | ✅ Done | `0570467` |
| **6** UI Redesign (Stitch) + Global RTL | ✅ Done | `9be1637` |
| **7** Production Readiness & Release Pipeline | ✅ Done | `fd42d5e` |
| **8A** Critical Architecture Fixes | ✅ Done | `081cad4` |
| **8B** Quick Wins + UI Blockers | ✅ Done | `a880d1d` / `c752b28` / `5c78cd4` |
| **8C** Account Clean Architecture | ✅ Done | `6e25aed` |
| **8D-10** | ⏳ Planned | — see [`ROADMAP.md`](./ROADMAP.md) |

**Active branch:** `master` (Android work is fully merged; no open Android feature branch)

**Last commit on `master`:** `e5bfbc1` — `merge(android): sprint 8c - account clean architecture`
**Total tests:** 223 `@Test` / 223 passing (100%)
**Lint status:** 0 errors (clean)
**Release APK sizes (ABI split, R8 minified):**
- `app-arm64-v8a-release.apk`: 15.07 MB
- `app-armeabi-v7a-release.apk`: 12.25 MB
- `app-x86_64-release.apk`: 15.35 MB

> **Debug APKs** (for reference): arm64-v8a 36.13 MB · armeabi-v7a 33.31 MB · x86_64 36.40 MB

---

## Completed Sprints

### Sprint 1-6: البنية + Features

Foundation and the full v1 feature surface, delivered across six sprints:

- **1.1 Skeleton** — project structure, Compose, first building APK. `buildToolsVersion` pinning conflict removed; AGP auto-selects.
- **1.2 Design System** — Cairo font (4 weights), 15 colors, 11 text styles, spacing + radii, `ForerunTheme`.
- **1.3 Hilt + Networking** — Hilt/KSP, Retrofit + OkHttp + Moshi, `ApiResponse<T>` sealed interface with `ApiCallAdapter`, 4 interceptors, `EncryptedSharedPreferences` token storage, `TokenRefreshManager` with `Mutex`, base URL fixed to the production Railway host.
- **1.4 Auth Flow** — NavGraph with 7 routes, DataStore onboarding prefs, auth domain + data layers, 6 auth screens, session-expiry navigation, and the first live E2E pass on the `ForerunTest` AVD (5/5 scenarios, 0 crashes).
- **2 Home / Address / Create Order** — bottom nav, MapLibre + OSM with Nominatim reverse geocoding, dynamic item builder, preferred-runner picker, order confirmation, orders list with filters and pagination. Verified live on production: order `FW-000015` created with server-calculated fees.
- **3 Order Detail / Rating / Socket.IO** — live tracking timeline, store-purchase grouping, runner contact actions, `/orders` namespace with JWT auth and exponential-backoff reconnect, 5-star rating bottom sheet.
- **4 Account / Support / WebSocket Hardening** — profile update via `PATCH /customer/me` (modified fields only), support screen with WhatsApp + dialer, socket lifecycle and token-rotation reconnect.
- **5 FCM + MapLibre Polish** — Firebase messaging, high-priority notification channel, `POST_NOTIFICATIONS` runtime flow, notification deep links, device-token register/unregister, reverse-geocode LRU cache.
- **6 UI Redesign + RTL** — 17 screens realigned to the Google Stitch designs; global `LayoutDirection.Rtl` via `CompositionLocalProvider`.

### Sprint 7: Production Readiness

Release pipeline, nothing shipped without it:

- Release signing pipeline (`keystore.properties.example` template; keystores and credentials gitignored).
- `isMinifyEnabled` + `isShrinkResources` for release, with a `proguard-rules.pro` covering Moshi (codegen), Retrofit 2, Socket.IO / Engine.IO, OkHttp 3, and MapLibre.
- Pre-production audit: debug tools gated behind `BuildConfig.DEBUG`, no TODO/FIXME/placeholder text left in UI.
- `RELEASE-CHECKLIST.md` written.

**Quality gates at Sprint 7:** 152/152 tests · 0 lint errors · debug + release builds clean · all three ABI APKs under 30 MB.

### Sprint 8A: Critical Architecture Fixes (6 مشاكل)

`081cad4` — refactor/fix sprint driven by the deep architectural review. Six critical issues closed:

| # | المشكلة | الحل |
|---|---------|------|
| DEEP-CRITICAL-01 | WebSocket not connected after login | `socketManager.connect()` invoked on successful login (defensive `try/catch`) |
| DEEP-CRITICAL-02 | Verified user stuck on "قيد المراجعة" | `checkSession` now queries `GET /customer/me` live and refreshes stored status, with full offline fallback |
| DEEP-CRITICAL-03 | 401 wrongly invalidated sessions | `refreshTokenIfNeeded(force = true)` on 401 + `X-Retry-After-Refresh` retry header + auth-path exclusion + `Mutex` |
| DEEP-CRITICAL-04 | Cold-start deep link clashed with splash routing | Intent handling moved to thread-safe `DeepLinkHolder` (single-consumption `StateFlow`); consumed only when server state is `VERIFIED` |
| DEEP-CRITICAL-05 | Double-submit race on order/address/rating | `AtomicBoolean` guards with `try/finally` reset, released on validation early-returns |
| DEEP-MEDIUM-05 | Socket leak on logout | `logout` now disconnects the socket and unregisters the FCM token before clearing storage |

**Result:** 172/172 tests, 0 lint errors, debug + release builds successful. Full analysis in [`SPRINT-8A-REPORT.md`](./SPRINT-8A-REPORT.md).

### Sprint 8B: Quick Wins + UI Blockers (5 مشاكل UI)

`a880d1d` + `c752b28` + `5c78cd4`. Closed the user-facing blockers and the debug-scaffolding leaks:

| # | المشكلة | الحل |
|---|---------|------|
| CRITICAL-01 | Rating button stayed tappable after the 24h window | Button hidden/disabled once the rating deadline passes |
| CRITICAL-02 | Pending/Suspended screens unscrollable — buttons cut off | `verticalScroll` added; redundant top `Spacer` removed |
| CRITICAL-03 | Account screen had no loading or retry state | `AccountUiState.isLoading` (defaults `true` so the first frame is the spinner) + retry action |
| CRITICAL-04 | Orders list load failure showed a misleading empty state | Explicit error state with retry; the snackbar is now limited to the non-empty-list case |
| CRITICAL-05 | Runner phone cleanup could emit a duplicate country code | WhatsApp URL builder corrected; `wa.me` link verified |
| MEDIUM (A1/A6/A24/A25) | Debug code shipped in release | `NotificationPayloadParser.toDestinationRoute/deepLinkUrl/hasDeepLink` deleted (removes the `core → ui` inverted edge), `MainActivity.testLogin()` + `authApi` + preview composables removed, `triggerSessionExpiry` and the release debug button removed, dead `ErrorMapper`/`UiError` deleted |
| DEEP-MEDIUM-01 | Address not refreshed after returning from the map | Address reloaded on Activity resume |

**Result:** 196/196 tests, 0 lint errors.

### Sprint 8C: Account Clean Architecture (A2, A4, A5, A9, A20)

`6e25aed` — the Account feature was the last feature still wired straight to the data layer. Closed end to end:

| Item | Resolution |
|---|---|
| **A2** `AccountRepository` imported DTOs | Contract is now `Result<CustomerProfile>`; zero `data.remote` imports remain in `domain/` |
| **A4** `ui/navigation` imported `data.remote.token` | `ForerunNavGraph` now takes `core.auth.SessionExpiryNotifier`; `ui/navigation` has zero `data.*` imports |
| **A5** `AccountUiState.profile` was a DTO | Replaced with the `CustomerProfile` domain model |
| **A9** `AccountViewModel` injected a repository | Injects `GetAccountProfileUseCase`, `UpdateAccountProfileUseCase`, `ChangeAccountPasswordUseCase`, `GetCustomerAddressUseCase`, `LogoutUseCase` |
| **A16** Redundant `provideTokenRefreshManager` | Deleted; the `@Inject constructor` is the only binding (`SessionModule` added) |
| **A20** `AccountRepositoryImpl` wrapped two repositories | Constructor is `CustomerApi` only; the 3 delegation methods (and latent Cycle 3) removed |
| **D8/D12/D13/D14** dead members | `saveProfile()`, `getAddress`, `updateAddress`, `logout` and the DTO-building defaults all deleted |
| **A21 (Account part)** no mapper files existed | `data/remote/mapper/AccountMapper.kt` — the project's first mapper |

New tests: `AccountMapperTest`, `AccountRepositoryImplTest`, and 3 UseCase tests plus a rewritten `AccountViewModelTest`.

**Deferred:** A17 (see Known Gaps). Follow-up: `CustomerProfile.status` is still `String`, not `UserStatus`.

**Result:** 223/223 tests, 0 lint errors.

### Branch Cleanup: 12 فرع محذوف

`480b812` — 21 local branches → 9. All 12 deleted branches were verified fully merged (`git log master..<branch>` empty) and removed with the safe `git branch -d`; no force deletion, no remote pushes.

| # | Branch removed | Reference commit |
|:-:|---|:---:|
| 1 | `feature/android-sprint-1-1-skeleton` | `21b9195` |
| 2 | `feature/android-sprint-1-3-networking` | `db3e290` |
| 3 | `feature/android-sprint-1-4-auth-flow` | `2d7a77a` |
| 4 | `feature/android-sprint-2-home-order` | `e60efc8` |
| 5 | `feature/android-sprint-3-order-detail` | `9d02b4f` |
| 6 | `feature/android-sprint-4-account-support` | `1aeb02c` |
| 7 | `feature/android-sprint-5-fcm-maplibre` | `0570467` |
| 8 | `feature/android-sprint-6-ui-redesign` | `9be1637` |
| 9 | `feature/android-sprint-7-production` | `fd42d5e` |
| 10 | `feature/android-sprint-8a-architecture` | `081cad4` |
| 11 | `feature/android-sprint-8b-ui-blockers` | `ab9a119` |
| 12 | `feature/android-stitch-ui-redesign` | `0570467` |

Sprint 8C was merged into `master` and deleted afterwards (`e5bfbc1`, branch tip `6e25aed`).

**Retained (8 backend branches + `master` + `tmp-master`):** `feature/admin-mobile-responsive`, `feature/review-session-fixes`, `feature/sprint-2-clean-review`, `feature/sprint-2-order-core`, `feature/sprint-3-runner-endpoints`, `feature/sprint-4-financial-ratings`, `fix/node-version-dockerfile`, `tmp-master`. Full table in [`BRANCH-CLEANUP.md`](./BRANCH-CLEANUP.md).

---

## Test Count Evolution

| Sprint | @Test count | Δ | Notes |
|--------|-------------|---|-------|
| Sprint 7 | 152 | — | Baseline for the release pipeline |
| Sprint 8A | 172 | +20 | 15 new deep-architecture tests + supporting coverage |
| Sprint 8B | 196 | +24 | UI blocker regressions + ViewModel state coverage |
| Sprint 8C | 223 | +27 | Mapper, repository, 3 UseCases, rewritten AccountViewModel |

All 223 pass. No test has ever been deleted to make a gate pass.

---

## Decisions Log

| التاريخ | القرار | السبب |
|---------|--------|-------|
| Session 1 | Rename FAWRUN → FORERUN | User preference |
| Session 1 | Package: `com.forerun.customer` | Final |
| Session 2 | Maps: MapLibre + OSM | Free, no credit card required |
| Session 2 | WebSocket: Socket.IO client | Backend already runs Socket.IO |
| Session 3 | Firebase for FCM | Industry standard, free tier |
| Session 3 | No Room / no offline mode | Always-online is the v1 model |
| Session 3 | Services: grocery only | Packages/rides routed through WhatsApp |
| Session 4 | Direct APK distribution | No Play Store in v1 |
| Session 4 | Design System: mint green + Cairo | Matches brand |
| 2026-09-28 | E2E verified on a real AVD (`ForerunTest`, API 34) | Automated unit tests alone did not prove the auth/navigation flows |
| 2026-09-30 | Merge Android sprints 1-8C into `master` (`3fc4119`, then `e5bfbc1`) | Android became the source of truth on master; the cumulative-branch strategy had served its purpose |
| 2026-09-30 | Delete only fully-merged branches with `git branch -d` | Never risk losing unmerged work; `-D` was explicitly rejected |
| 2026-09-30 | Keep `TokenRefreshManager` in `data/remote/token/` (A17 deferred) | Moving it would relocate the violation, not fix it — the real fix is the `Authenticator` conversion in Sprint 8D |
| 2026-09-30 | Adopt the `core.*` ownership pattern for cross-layer singletons | `SessionExpiryNotifier` proves a `core` interface + `data` implementation keeps `ui` free of `data` imports |

---

## Known Gaps

| # | Gap | Impact | Target |
|---|-----|--------|--------|
| 1 | **A17 — `TokenRefreshManager` still in `data/`** | `core.network.interceptor` imports `data.remote.token`; 3 cycles remain, silently broken by `Provider`. Deferred because the correct fix is the `Authenticator` conversion | Sprint 8D |
| 2 | **81 نص hardcoded** | 73 table rows spanning ~14 files, including 9+10 duplicated order-status labels, 4× `"إخفاء"/"إظهار"`, and 10 FAQ strings. Blocks translation and consistent terminology | Sprint 9 |
| 3 | **FCM without a real Firebase project** | `google-services.json` is a test file (gitignored); no server push reaches real devices | Sprint 8F (needs user setup) |
| 4 | **No automated E2E** | `scripts/e2e-test.ps1` exists but is manual; no CI. 223 unit tests cannot catch navigation or process-death regressions | Sprint 10 |
| 5 | **DEEP-MEDIUM-02/03/06/07 still open** | Home and Orders do not observe socket events; order filtering is client-side and breaks under pagination; duplicate order-confirmation UI (dialog + screen); `https://forerun.app/orders/{id}` has no manifest intent-filter | Sprint 8E / 8F / 9 |
| 6 | **D23 `WebSocketEvent.AccountVerified` unhandled** | The socket subscribes to `account:verified` with no consumer — a live feature gap, not a stub | Sprint 8E |
| 7 | **B3/B5/B6 Gradle debt** | Unused `libs.material` (~1 MB APK weight), `isReturnDefaultValues` masks missing mocks, `security-crypto` pinned to `1.1.0-alpha06` | Sprint 8D |
| 8 | **Production keystore not provisioned** | `keystore.properties` and the real key must come from the owner before `assembleRelease` is distributable | Sprint 8F |

---

## Environment

| Component | Path / Value |
|-----------|--------------|
| JDK 21 | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` |
| Android SDK | `C:\Users\Dell User\AppData\Local\Android\Sdk` |
| Android Studio | `C:\Program Files\Android\Android Studio` |
| AVD | `ForerunTest` (Pixel 6 profile, API 34) |
| Terminal | MINGW64 (Git Bash) |
| IDE | Antigravity (primary) + Android Studio (preview) |
| minSdk / targetSdk | 26 / 35 |
| Kotlin | 2.0.21 |
| AGP | 8.7.3 |
| KSP | 2.0.21-1.0.28 |
| Gradle | 8.11.1 |
| Hilt | 2.53.1 |
| Compose BOM | 2024.12.01 |
| Retrofit / OkHttp / Moshi | 2.11.0 / 4.12.0 / 1.15.1 |
| Socket.IO client | 2.1.1 |
| MapLibre | 11.5.2 |
| Firebase BOM | 33.7.0 |
| Test stack | JUnit 4.13.2 · Coroutines Test 1.9.0 · Turbine 1.1.0 · MockWebServer 4.12.0 |

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
./gradlew clean assembleDebug     # build debug APKs
./gradlew assembleRelease         # release APKs (needs keystore.properties)
./gradlew lint                    # lint
./gradlew test                    # unit tests (223)
```

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

**Font:** Cairo (400/500/600/700) — 11 styles from 11sp (`labelSmall`) to 32sp (`displayLarge`)

### Spacing & Shape

4dp grid: 2, 4, 8, 10, 12, 16, 20, 24, 32, 48 · Radii: 8 / 12 / 16 / 20 / pill (999)

---

## Backend Status

- **Production:** Railway (`forerun-api-production.up.railway.app`)
- **Database:** PostgreSQL
- **WebSocket:** Socket.IO on the `/orders` namespace
- **Auth:** JWT RS256, 2h access + rotated refresh
- **Endpoints:** 55+ under `/api/v1/`
- **State Machine:** 10 order states, enforced server-side
- **Limitation:** Backend is grocery-only. No `serviceType` field.
- **Fee policy:** the server is the source of truth — the client never computes fees.

**WebSocket events for the customer (8):** `order:status_changed`, `order:runner_assigned`, `order:fee_updated`, `order:store_purchased`, `order:out_for_delivery`, `order:delivered`, `order:cancelled`, `account:verified`

---

## Reference Documents

| Document | Contents |
|----------|----------|
| [`ARCHITECTURE-REVIEW.md`](./ARCHITECTURE-REVIEW.md) | 37 violations catalogued (A1-A25, B1-B9, D1-D24), dependency graph, cycles, §6 = Sprint 8C resolution matrix |
| [`CODE-REVIEW.md`](./CODE-REVIEW.md) | 26 code/UI issues (CRITICAL-01..05, MEDIUM, SURFACE, DEEP-CRITICAL, DEEP-MEDIUM) + the 81 hardcoded-string table + bottom-nav analysis |
| [`SPRINT-8A-REPORT.md`](./SPRINT-8A-REPORT.md) | Per-file diff analysis for the 6 critical fixes |
| [`BRANCH-CLEANUP.md`](./BRANCH-CLEANUP.md) | The 12 deleted branches and the 9 retained, with unmerged-commit counts |
| [`ROADMAP.md`](./ROADMAP.md) | Sprints 8D-10 |
| [`CURRENT_STATE.md`](./CURRENT_STATE.md) | Point-in-time snapshot |
| [`RELEASE-CHECKLIST.md`](./RELEASE-CHECKLIST.md) | Release + signing runbook |
| [`MASTER-SPEC.md`](./MASTER-SPEC.md) | Full Android specification |
| `AGENTS.md` (repo root) | Development standards |

---

**End of PROGRESS.md**
