# Current State — 30 September 2026

> **حالة التطبيق:** تطبيق العميل (Customer App) مكتمل وظيفياً ومنجز إلى `master`. كل مسارات v1، و223 اختبار وحدة، و0 أخطاء lint. المتبقي ديون معمارية ونصوص فقط.

---

## Last Commit

| | |
|---|---|
| **Branch** | `master` |
| **HEAD** | `b6acfaf` |
| **Message** | `merge(android): Sprint 8E — WebSocket port to domain layer` |
| **Content merge** | `ecd856d` — `refactor(android): Sprint 8E — WebSocket port to domain layer` |
| **Sprint 8 chain** | `3fc4119` (1-8b) → `e5bfbc1` (8c) → `1055b5f` (8d) → `b6acfaf` (8e) |

---

## Last APK

**Path:** `apps/android/app/build/outputs/apk/release/`

| Variant | Size |
|---------|------|
| `app-arm64-v8a-release.apk` | **15.07 MB** |
| `app-armeabi-v7a-release.apk` | **12.25 MB** |
| `app-x86_64-release.apk` | **15.35 MB** |

Debug build (for reference, not distributable): arm64-v8a 36.13 MB · armeabi-v7a 33.31 MB · x86_64 36.40 MB

Both variants build clean: R8 + ProGuard rules and LintVital pass. The release build **is signed** — `apksigner verify` returns `Verifies` (APK Signature Scheme **v2**, 1 signer), signer `CN=FORERUN` (cert SHA-256 `725b4683…09879`). Verified 2026-10-01; see `PROJECT_STATUS.md` §12 · D6.

---

## Feature Status

| Feature | الحالة | ملاحظات |
|---------|--------|---------|
| **Splash** | ✅ | Session check + `GET /customer/me` live status refresh; deep link consumed only when `VERIFIED` (DEEP-CRITICAL-02/04 fixed) |
| **Onboarding** (3 slides) | ✅ | DataStore-persisted; injected `OnboardingPrefs` directly in the VM (A11 → Sprint 8D) |
| **Login** | ✅ | Syrian phone validation, forced token refresh on 401, socket connects on success |
| **Register** | ✅ | Client-side validation; still carries a placeholder address string (MEDIUM-04) |
| **Pending Verification** | ✅ | Scrollable (CRITICAL-02 fixed); server status refresh unblocks approved users |
| **Suspended** | ✅ | Scrollable (CRITICAL-02 fixed) |
| **Home** | ✅ | Bottom nav, active-order card, stats; address refreshes on Activity resume; does not observe socket events (DEEP-MEDIUM-02) |
| **Address Setup** | ✅ | MapLibre + OSM, Nominatim reverse geocode w/ LRU cache, double-submit guard; Nominatim builds its own OkHttp client (A19 → 8D); default coords are Latakia not Damascus (DEEP-MEDIUM-04) |
| **Create Order** | ✅ | Dynamic items, store/runner selection, double-submit guard, server-calculated fees; confirm UI duplicated as dialog + screen (DEEP-MEDIUM-06) |
| **Order Confirmation** | ✅ | Argument-driven, no ViewModel |
| **Orders List** | ✅ | Pagination, filter chips, pull-to-refresh, explicit error+retry state (CRITICAL-04 fixed); filtering is client-side and breaks under pagination (DEEP-MEDIUM-03) |
| **Order Detail** | ✅ | Live timeline, runner contact actions, cancellation; ~90 lines of inline mapping (A21 → 8D) |
| **Rating** | ✅ | 24h window enforced and button hidden after expiry (CRITICAL-01 fixed) |
| **Account** | ✅ | Loading + retry states (CRITICAL-03 fixed); **fully refactored in 8C** to UseCases + `CustomerProfile` domain model + `AccountMapper`; zero DTOs in `UiState` |
| **Support** | ✅ | WhatsApp + dialer + working hours; FAQ text hardcoded |
| **Deep Links** | ⚠️ | `forerun://orders/{id}` works. `https://forerun.app/orders/{id}` has **no manifest intent-filter** (DEEP-MEDIUM-07) |
| **WebSocket** | ✅ | All 8 events handled and mapped via clean domain `OrderEventsGateway`; `account:verified` forces immediate session re-check in `SplashViewModel` (D23 closed); `connectionState` mapped and consumed via Gateway |
| **FCM Push** | ⛔ | Code complete, but `google-services.json` is a test file — no server push reaches real devices |
| **Onboarding → App** | ✅ | 15 screens + flows, 100% of the v1 scope |
| **Offline** | — | Out of scope for v1 (always-online); `checkSession` degrades gracefully to cached state |

---

## Known Issues

| # | Issue | Severity | Target |
|---|-------|----------|--------|
| 1 | ~~**A17**~~ **RESOLVED in 8D** — `TokenRefreshManager` in `core/auth`, `RefreshInterceptor` is `Authenticator` | Resolved | Sprint 8D |
| 2 | **Deep link guard at login is intentionally ignored** — `SplashViewModel` consumes a pending order id **only** when the server-reported state is `VERIFIED` (DEEP-CRITICAL-04 fix). Consequence: a notification opened while logged out is dropped rather than queued for post-login. Accepted trade-off, not a regression | By design | Revisit in 8E/9 if reported |
| 3 | **`OrdersEmptyState` shown under a filter with no results** — the explicit error state no longer masks the empty state (fixed in 8B), but a filter that legitimately returns nothing still renders the generic empty screen with no filter-specific copy | Cosmetic | Sprint 9 |
| 4 | **81 نص hardcoded** — 73 table rows across ~14 files, incl. 19 duplicated order-status labels, 4× `"إخفاء"/"إظهار"`, 10 FAQ strings | Medium | Sprint 9 |
| 5 | ~~**No production keystore**~~ **RESOLVED 2026-10-01** — `keystore.properties` and the key are provisioned, signing is wired (`app/build.gradle.kts:57`), and the 3 release APKs verify under v2. **Never regenerate the key** — it is not reproducible and would orphan installed copies. Remaining risk is only that no off-machine backup exists | Backups only | Immediately |
| 6 | **No real Firebase project** — `google-services.json` is gitignored/test-only | Blocker for push | Sprint 8F |
| 7 | **No automated E2E** — `scripts/e2e-test.ps1` is manual, no CI | Medium | Sprint 10 |
| 8 | **DEEP-MEDIUM-02/03/06/07** open | Medium | 8E / 8F / 9 |
| 9 | **Gradle debt** — unused `libs.material` (~1 MB APK), `isReturnDefaultValues` masking missing mocks, `security-crypto` on `1.1.0-alpha06` | Low | Sprint 8D |

---

## Test Coverage

| Gate | Result |
|------|--------|
| **Unit tests** | **261 `@Test` — 261 passing, 0 failures** (36 test files) |
| **Lint** | **0 errors** |
| **`assembleDebug`** | BUILD SUCCESSFUL (3 ABI splits) |
| **`assembleRelease`** | BUILD SUCCESSFUL (R8 + LintVital clean, 3 ABI splits) |

**Composition:** 6 Repository/Mapper tests · 17 UseCase tests · 14 ViewModel tests · networking (MockWebServer, interceptors, `ApiCallAdapter`) · Socket event parsing · DataStore/Encrypted storage · navigation & session-expiry.

**Not covered:** instrumentation / `androidTest` source set does not exist; no Compose UI tests; no CI pipeline. `unitTests.isReturnDefaultValues = true` (B5) is a known blind spot pending Sprint 8D.

---

## Branches

**Active:** `master` — Android work is fully merged; **no open Android feature branch**.

**Retained local branches (8 backend + 1 scratch):**

| Branch | Unmerged commits | Notes |
|--------|------------------|-------|
| `feature/admin-mobile-responsive` | 2 | Admin dashboard mobile responsiveness |
| `feature/review-session-fixes` | 1 | Backend session fixes + shared types S1-S5 |
| `feature/sprint-2-clean-review` | 5 | Backend sprint 2 review changes |
| `feature/sprint-2-order-core` | 13 | Order core |
| `feature/sprint-3-runner-endpoints` | 7 | Runner endpoints + integration tests |
| `feature/sprint-4-financial-ratings` | 2 | Settlements and ratings |
| `fix/node-version-dockerfile` | 1 | Node 22-slim |
| `tmp-master` | 1 | Scratch README commit |

None of these are Android. Full detail in [`BRANCH-CLEANUP.md`](./BRANCH-CLEANUP.md).

**Deleted:** 12 Android branches after verified merge (`git branch -d` only), then `feature/android-sprint-8c-account-clean` after `e5bfbc1`.

---

## Next Step

**Sprint 8D — Medium Architecture.** 13 bounded items from `ARCHITECTURE-REVIEW.md` §5 (5-13) plus Gradle hygiene; no user-visible behavior change. Order matters: items 1-3 (move `TokenRefreshManager` → `core/auth`, convert `RefreshInterceptor` to an `okhttp3.Authenticator`, drop the `Provider` shims) touch the same auth layer and should land as one commit series.

Then 8E (WebSocket port) → 9 (UI polish), with 8F (Firebase + signing) started in parallel as soon as the Firebase project and keystore are available. Full plan in [`ROADMAP.md`](./ROADMAP.md).

---

**End of CURRENT_STATE.md**
