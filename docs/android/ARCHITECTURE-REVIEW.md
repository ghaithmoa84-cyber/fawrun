# Architecture & Engineering Review — 2026-09-30

**Branch:** `feature/android-sprint-8a-architecture`
**Scope:** Architecture (Layers) · Engineering Structure · File Interconnections · Calls & Functions
**Out of scope:** UI/UX, strings, colors, hardcoded text, business logic, functional bugs (see `CODE-REVIEW.md`)

---

## Executive Summary

| Metric | Value |
|---|---|
| MVVM + Clean Architecture compliance | **6/10** |
| Total violations | **37** (Critical: 6 · Medium: 16 · Minor: 15) |
| Total production Kotlin files | 79 |
| Files > 500 lines | 6 (all Composables) |
| Confirmed dead code (production) | 2 whole files + 24 members |
| Circular dependencies | 3 real, 2 latent |

**Assessment:** The skeleton is sound. Layering is *mostly* correct in the happy path: `domain/` has zero `android.*` imports, `data/` has zero `ui/` imports, 11 of 14 ViewModels depend on UseCases only, and the DI composition root is centralized in `core/di/`. The failures are concentrated in four seams — the **Account feature**, the **notification/deep-link path**, the **domain↔core boundary**, and **debug scaffolding shipped inside production files**. These are structural, not cosmetic, and each has a bounded fix.

---

## 1. Architectural Structure

### Strengths

| # | Strength | Evidence |
|---|---|---|
| S1 | `domain/` is free of Android framework imports | Zero `android.*` / `androidx.*` imports across all 17 domain files |
| S2 | `data/` never imports `ui/` | Scanned all 28 data files — 0 violations |
| S3 | Most ViewModels use the UseCase seam only | 11/14 VMs inject UseCases exclusively (`HomeViewModel`, `OrdersListViewModel`, `OrderDetailViewModel`, `RatingViewModel`, `CreateOrderViewModel`, `AddressSetupViewModel`, `SplashViewModel`, `LoginViewModel`, `RegisterViewModel`, `PendingVerificationViewModel`, `SuspendedViewModel`) |
| S4 | Repository interfaces live in `domain/repository/` only | 6 interfaces, 0 declared outside `domain/` |
| S5 | Repository impls implement domain interfaces correctly | All 6 `*Impl` classes implement their contract; DI `@Binds` complete for all 6 |
| S6 | DTOs are fully encapsulated inside `data/remote/dto/` | No Composable or ViewModel receives a DTO except `AccountViewModel` (violation A5) |
| S7 | Socket.IO JSON parsing is isolated | `SocketManager.parseEvent` + `WebSocketEvent` sealed interface — no raw JSON escapes to UI |
| S8 | Token refresh race is handled | `TokenRefreshManager` uses `Mutex` + double-check (TokenRefreshManager.kt:37-42) |
| S9 | DI cycle on token refresh is correctly broken | `Provider<AuthApi>` in `NetworkModule.kt:36` and `Provider<CustomerApi>` in `AuthRepositoryImpl.kt:26` |

### Violations

| # | File | Line | Layer | Violation | Severity |
|---|---|---|---|---|---|
| **A1** | `core/notification/NotificationPayloadParser.kt` | 6, 21 | Core → UI | `import com.forerun.customer.ui.navigation.Routes`; `toDestinationRoute()` returns `Routes.orderDetail(...)`. **Inverted dependency** — the lowest layer imports the highest. Sole justification: a method used only by tests (D3). | **Critical** |
| **A2** | `domain/repository/AccountRepository.kt` | 3-5, 9-16 | Domain → Data | Interface imports 3 DTOs (`ChangePasswordRequest`, `CustomerProfileDto`, `UpdateProfileRequest`) and exposes `Result<CustomerProfileDto>` as its contract. The domain contract is now defined by the wire format. | **Critical** |
| **A3** | `ui/account/AccountViewModel.kt` | 7, 40, 188 | UI → Data | Imports and injects `data.remote.api.AuthApi` (Retrofit interface) and calls `authApi.logout(...)` directly. ViewModel bypasses the entire data layer. | **Critical** |
| **A4** | `ui/navigation/ForerunNavGraph.kt` | 13, 59 | UI → Data | Imports `data.remote.token.TokenRefreshManager` and takes it as a Composable parameter. Presentation layer depends on a `data.remote` class. | **Critical** |
| **A5** | `ui/account/AccountViewModel.kt` | 9, 25 | UI → Data | `AccountUiState.profile: CustomerProfileDto?` — a wire DTO is the ViewModel's public state contract, consumed by `AccountScreen.kt`. | **Critical** |
| **A6** | `ui/account/AccountViewModel.kt` | 182-199 | Presentation | `triggerSessionExpiry()` is debug instrumentation wired to a production button (`AccountScreen.kt:722`) with `Log.d("ForerunTest", …)` and a `debugStatus` UI field (`AccountScreen.kt:728-731`). Ships a test-only code path and a manual logout trigger in release. | **Critical** |
| A7 | `domain/repository/AccountRepository.kt` | 3 | Domain → Core | `ApiResponse` import. Same in `AuthRepository.kt:3`, `DeviceTokenRepository.kt:3`, `LoginUseCase.kt:3`, `LogoutUseCase.kt:3`, `RegisterUseCase.kt:3`. Domain return type is an HTTP transport envelope. | Medium |
| A8 | `domain/usecase/order/ObserveOrderEventsUseCase.kt` | 3-4 | Domain → Core | Imports `core.websocket.SocketManager` + `WebSocketEvent`. The UseCase depends on a concrete infrastructure class, not a domain port — untestable without a Socket.IO instance. | Medium |
| A9 | `ui/account/AccountViewModel.kt` | 38 | Presentation | Injects `AccountRepository` directly — the **only** VM in the app with no UseCase layer. Breaks the MVVM seam for one whole feature. | Medium |
| A10 | `ui/account/AccountViewModel.kt` | 39 | Presentation → Core | Injects `TokenStorage` (infrastructure) to read the refresh token. | Medium |
| A11 | `ui/onboarding/OnboardingViewModel.kt` | 6, 13 | Presentation → Core | Injects `OnboardingPrefs` (DataStore wrapper) directly; no UseCase. | Medium |
| A12 | `ui/auth/login/LoginViewModel.kt` | 35 | Presentation → Core | Injects `SocketManager?` with a `= null` default to sidestep the DI graph. Nullable-with-default constructor injection defeats compile-time DI verification — a missing binding silently becomes `null`. | Medium |
| A13 | `ui/splash/SplashViewModel.kt` | 30 | Presentation → Core | Same anti-pattern: `deepLinkHolder: DeepLinkHolder? = null`. | Medium |
| A14 | `ui/address/AddressSetupViewModel.kt` | 9, 54 | Presentation → Domain Service | Injects `GeocodingService` directly (an infrastructure port, not a UseCase). | Medium |
| A15 | `ui/support/SupportViewModel.kt` | 3, 24, 38 | Presentation → Core | Uses `AppConfig` static object directly for config lookup and URL building. | Medium |
| A16 | `core/di/NetworkModule.kt` | 34-46 | DI | `provideTokenRefreshManager` is **redundant** — `TokenRefreshManager` already has an `@Inject constructor` (`TokenRefreshManager.kt:15`). The `@Provides` shadows it and forces fully-qualified type names throughout the body. | Medium |
| A17 | `core/network/interceptor/RefreshInterceptor.kt` | 4 | Core → Data | Core interceptor imports `data.remote.token.TokenRefreshManager`. `TokenRefreshManager` is misplaced — it is network/auth infrastructure and belongs in `core/auth/` or `core/network/`. | Medium |
| A18 | `data/remote/geocoding/NominatimGeocodingService.kt` | 36 | Data | `cache: AddressReverseGeocodeCache = AddressReverseGeocodeCache()` — the default argument **overrides Hilt injection**. The `@Singleton` cache is constructed with `new` and discarded; DI provides nothing. | Medium |
| A19 | `data/remote/geocoding/NominatimGeocodingService.kt` | 39-46 | Data | Builds its own `OkHttpClient` with hardcoded 5s timeouts, bypassing the DI-configured client (logging, auth, retry interceptors, 15/30s timeouts). Duplicate networking stack with divergent behavior. | Medium |
| A20 | `data/remote/repository/AccountRepositoryImpl.kt` | 19-20, 42-53 | Data | Injects `AddressRepository` **and** `AuthRepository`; 3 of its 5 methods (`getAddress`, `updateAddress`, `logout`) are pure delegation. Repo-to-repo coupling plus a wrapper that adds no value. | Medium |
| A21 | `data/remote/repository/OrderRepositoryImpl.kt` | 113-201 | Data | `getOrderDetail` performs ~90 lines of inline DTO→domain mapping with 60+ fully-qualified `com.forerun.customer.domain.model.*` references. No mapper file exists anywhere in the project — mapping is hand-inlined in every repository. | Medium |
| A22 | `data/remote/repository/OrderRepositoryImpl.kt` | 17 | Data | `OrderRepositoryImpl` depends on `CustomerApi` to serve `getAvailableRunners()`. The `OrderApi` interface also exposes `customer/orders/*`, so order endpoints are split across two API interfaces. | Medium |
| A23 | `core/notification/NotificationPayloadParser.kt` | 15-23 | Core | `hasDeepLink`, `deepLinkUrl`, `toDestinationRoute()` have **zero production callers** (test-only). `toDestinationRoute` is the *only* reason `core` imports `ui`. | Medium |
| A24 | `MainActivity.kt` | 47-48, 135-155 | Presentation | `testLogin()` is a private method that is never called; the `@Inject lateinit var authApi` field exists solely to serve it. Debug login against hardcoded credentials in a production file. | Medium |
| A25 | `MainActivity.kt` | 158-263 | Presentation | `DesignSystemPreview` + `ColorSwatch` + `TypographySample` (~105 lines of `@Preview`-only Compose) live in the production Activity file. They belong in a `debug` source set or a dedicated preview file. | Medium |

**No layer violations found in:** `data/` → `ui/` (0), `domain/` → `android.*` (0), `ui/` Composables → any Repository (0 — all 15 Screens consume ViewModels only).

---

## 2. Engineering Structure

### 2.1 File & Folder Organization

**Package-per-feature is inconsistent.** `ui/order/` is split three ways while `ui/account/`, `ui/address/`, `ui/rating/` are flat:

```
ui/order/create/       ui/order/detail/      ui/order/confirmation/
ui/orders/             (no ui/order/list/)
```

`OrdersScreen.kt` + `OrdersListViewModel.kt` live in `ui/orders/` while its sibling `OrderDetailViewModel.kt` lives in `ui/order/detail/`. The singular/plural split means "the orders feature" has no single home. *Severity: Minor — recommend collapsing to `ui/order/{list,create,detail,confirmation}/`.*

| Oversized file | Lines | Note |
|---|---|---|
| `ui/order/detail/OrderDetailScreen.kt` | 1056 | Largest file in the project; exceeds the 500-line threshold by 2× |
| `ui/home/HomeScreen.kt` | 938 | |
| `ui/order/create/CreateOrderScreen.kt` | 847 | |
| `ui/account/AccountScreen.kt` | 704 | Contains the debug `triggerSessionExpiry` button |
| `ui/address/AddressSetupScreen.kt` | 604 | |
| `ui/orders/OrdersScreen.kt` | 546 | |

All six are single-file Composable dumps holding their private sub-composables inline. None exceed a sane limit for **stateless** rendering, but all six mix rendering with state derivation. *Severity: Minor — extract sub-composables to sibling files when touched; no urgent refactor.*

**Misplaced files:**

| File | Problem | Severity |
|---|---|---|
| `data/remote/token/TokenRefreshManager.kt` | Token/session infrastructure sitting in `data.remote`, imported by `core.network.interceptor` and `ui.navigation`. The only file in the project that three layers must reach into. Should be `core/auth/` or `core/network/session/`. | Medium |
| `data/remote/geocoding/NominatimGeocodingService.kt:17-34` | `NominatimResponse` + `NominatimAddress` DTOs declared inside the service file instead of `data/remote/dto/geocoding/`. Breaks the project's own DTO convention. | Minor |
| `core/error/ErrorMapper.kt`, `core/error/UiError.kt` | Pure presentation error-mapping; belongs in `ui/`. Also entirely dead (D1). | Minor |
| `core/config/AppConfig.kt` | Holds admin WhatsApp numbers + URL builder while the API base URL lives in `NetworkModule.kt:24` and again in `SocketManager.kt:39` — three sources of environment config, none overridable per build type. | Medium |

### 2.2 Naming Consistency

| Observation | Detail | Severity |
|---|---|---|
| Inconsistent test naming | `DeviceTokenRepositoryTest.kt` tests `DeviceTokenRepositoryImpl`; all siblings use the `…ImplTest` suffix (`AuthRepositoryImplTest`, `AddressRepositoryImplTest`). | Minor |
| Mismatched Screen/ViewModel pair | `OrdersScreen.kt` ↔ `OrdersListViewModel.kt` — the "List" qualifier appears on only one of the pair. | Minor |
| Ambiguous names justified | `SocketManager`, `NotificationHelper`, `ApiCallAdapterFactory`, `ErrorMapper` — all have clear single responsibilities; acceptable. `Manager` is used only for the socket singleton, which is idiomatic. | OK |
| UiState style split | `HomeUiState` / `SplashDestination` are sealed interfaces; `OrdersListUiState` / `RatingUiState` / `AddressSetupUiState` are data classes; `LoginUiState` / `AccountUiState` are data classes with `Int?` string-resource IDs. Three conventions, no rule. | Minor |

### 2.3 Dependency Injection

| # | Finding | File:Line | Severity |
|---|---|---|---|
| DI-1 | Redundant `@Provides` shadowing an `@Inject constructor` | `core/di/NetworkModule.kt:34-46` | Medium |
| DI-2 | `provideOnboardingPrefs` uses `@Provides` returning the injected impl; should be `@Binds` (same pattern already used correctly in `StorageModule.kt` and `RepositoryModule.kt`) | `core/di/PreferencesModule.kt:29-33` | Minor |
| DI-3 | Fully-qualified inline type names inside module bodies instead of imports — inconsistent within the same file (`ApiModule.kt:14-22` imports, `:26-32` FQNs) | `core/di/ApiModule.kt`, `NetworkModule.kt`, `RepositoryModule.kt` | Minor |
| DI-4 | `@Inject` on concrete types in a Composable-reachable position | `MainActivity.kt:47-48` (`authApi` — dead), `ui/auth/login/LoginViewModel.kt:35`, `ui/splash/SplashViewModel.kt:30` | Medium |
| DI-5 | `ForerunFirebaseMessagingService` uses field `@Inject lateinit var` (lines 17-22) — correct for the Android framework, but `deviceTokenRepository` duplicates what `FcmTokenManager` already wraps. Two paths perform FCM token registration with different error handling. | `core/notification/ForerunFirebaseMessagingService.kt:26-38` vs `FcmTokenManager.kt:17-35` | Minor |
| DI-6 | Field injection (`lateinit var`) is correct only here | `MainActivity.kt:47-49`, `ForerunApp.kt:15`, `ForerunFirebaseMessagingService.kt:17-22` | OK |

### 2.4 Build & Gradle

| # | Finding | Location | Severity |
|---|---|---|---|
| B1 | Dependency declared outside the version catalog: `implementation("androidx.compose.material:material-icons-extended")` — unpinned, relies on BOM resolution rather than the declared version catalog. | `app/build.gradle.kts:94` | Minor |
| B2 | Test dependency outside the catalog: `testImplementation("org.json:json:20240303")` | `app/build.gradle.kts:146` | Minor |
| B3 | Unused dependency: `implementation(libs.material)` (`com.google.android.material:material:1.12.0`) — **0 usages** across all main + test sources; the app is 100% Compose + Material3. ~1MB of dead APK weight. | `app/build.gradle.kts:89` | Medium |
| B4 | `testInstrumentationRunner` configured but no `androidTest` source set exists | `app/build.gradle.kts:25` | Minor |
| B5 | `unitTests.isReturnDefaultValues = true` returns null/0 for unmocked Android framework calls instead of failing. Masks missing Robolectric/mock setup — `SocketManagerTest` and `ErrorMapperTest` rely on `android.util.Log` stubs. | `app/build.gradle.kts:82` | Medium |
| B6 | Alpha dependency in production: `androidx.security-crypto = "1.1.0-alpha06"`. This library also deprecated `EncryptedSharedPreferences`; the alpha pin compounds the risk. | `gradle/libs.versions.toml:16` | Medium |
| B7 | All other versions are internally consistent and pinned. Kotlin 2.0.21 / AGP 8.7.3 / KSP 2.0.21-1.0.28 / Hilt 2.53.1 are a compatible set. | `gradle/libs.versions.toml` | OK |
| B8 | No duplicate-purpose libraries found. Retrofit + OkHttp + Moshi + Socket.IO + Firebase is a minimal, justified set. | `app/build.gradle.kts:86-147` | OK |
| B9 | ABI splits enabled with `arm64-v8a`, `armeabi-v7a`, `x86_64`, `isUniversalApk = false` — no `x86_64` variant is missing, but no `foss`/free-tier configuration exists. | `app/build.gradle.kts:72-79` | OK |

---

## 3. File Interconnections

### 3.1 Dependency Graph (textual)

```
                        ┌──────────────────────────┐
                        │  ui/  (Presentation)     │
                        │  Screen → ViewModel      │
                        └────────────┬─────────────┘
                                     │ 4 cross-layer violations
                 ┌───────────────────┼────────────────────┐
                 │                   │                    │
        (A3,A5) AuthApi        (A4) TokenRefresh    (A10,A11,A12..A15)
                 │                   │                    │
        ┌────────▼────────┐  ┌───────▼─────────┐  ┌───────▼──────────┐
        │ data.remote.api │  │ data.remote.token│  │ core.storage      │
        │ core.storage    │  │ core.network     │  │ core.config       │
        │ core.websocket  │  │ core.notification│  │ core.websocket    │
        └────────┬────────┘  └──────────────────┘  └──────────────────┘
                 │
        ┌────────▼─────────────────────────────────┐
        │  domain/usecase/        ← CLEAN SEAM     │
        │  14 UseCases, 0 android.* imports        │
        │  except: LoginUseCase.kt:3               │
        │          LogoutUseCase.kt:3              │
        │          RegisterUseCase.kt:3  → core   │
        │          ObserveOrderEventsUseCase:3-4   │
        └────────┬─────────────────────────────────┘
                 │
        ┌────────▼─────────────────────────────────┐
        │  domain/repository/   ← CLEAN SEAM      │
        │  6 interfaces — EXCEPT                   │
        │  AccountRepository.kt:3-5 → data.dto ✗   │
        │  AuthRepository.kt:3      → core  ✗     │
        │  DeviceTokenRepository:3  → core  ✗     │
        └────────┬─────────────────────────────────┘
                 │
        ┌────────▼─────────────────────────────────┐
        │  data/remote/repository/  ← CLEAN       │
        │  6 Impls, 0 ui imports ✓                 │
        │  mapping inlined, no mapper files ✗      │
        │  AccountRepositoryImpl → 2 other repos ✗ │
        └────────┬─────────────────────────────────┘
                 │
        ┌────────▼─────────────────────────────────┐
        │  core/di/  (composition root)             │
        │  ApiModule · NetworkModule · Preferences │
        │  RepositoryModule · StorageModule        │
        └──────────────────────────────────────────┘

   ⤶ INVERTED EDGE (A1): core/notification/NotificationPayloadParser.kt:6
                          ──▶ ui/navigation/Routes
```

### 3.2 Cross-Layer Calls (violations)

| From | To | Location | Nature |
|---|---|---|---|
| `ui/navigation/ForerunNavGraph.kt` | `data.remote.token.TokenRefreshManager` | :13, :59 | Navigation Composable receives a data-layer class to collect `sessionExpiredEvent` |
| `ui/account/AccountViewModel.kt` | `data.remote.api.AuthApi` | :7, :188 | Direct HTTP call from a ViewModel |
| `ui/account/AccountViewModel.kt` | `data.remote.dto.*` | :8, :9, :25, :109, :152 | DTOs in state and in ViewModel bodies |
| `ui/account/AccountViewModel.kt` | `domain.repository.AccountRepository` | :38 | Repository injected without a UseCase |
| `ui/onboarding/OnboardingViewModel.kt` | `core.storage.OnboardingPrefs` | :6 | DataStore wrapper injected without a UseCase |
| `ui/auth/login/LoginViewModel.kt` | `core.websocket.SocketManager` | :35 | Infrastructure injected with nullable default |
| `ui/splash/SplashViewModel.kt` | `core.notification.DeepLinkHolder` | :30 | Same pattern |
| `ui/address/AddressSetupViewModel.kt` | `domain.service.GeocodingService` | :9 | Domain port injected without a UseCase |
| `ui/support/SupportViewModel.kt` | `core.config.AppConfig` | :3 | Static config access |
| `core/notification/NotificationPayloadParser.kt` | `ui.navigation.Routes` | :6, :21 | **Inverted: core depends on UI** |
| `core/network/interceptor/RefreshInterceptor.kt` | `data.remote.token.TokenRefreshManager` | :4 | Core depends on data |
| `domain/repository/AccountRepository.kt` | `data.remote.dto.customer.*` | :3-5 | **Domain depends on data** |

### 3.3 Circular Dependencies

**Cycle 1 — Token refresh (real, broken with `Provider`)**

```
Retrofit ──▶ OkHttpClient ──▶ RefreshInterceptor ──▶ TokenRefreshManager
   ▲                                                            │
   └──────────── Provider<AuthApi> ◀───────────────────────────┘
```

- Declared at `NetworkModule.kt:36` (`javax.inject.Provider<AuthApi>`), `:66-81` (`provideRetrofit`).
- The cycle is **silently broken** by lazy `Provider` injection. This works, but nothing documents it, so the next contributor replacing `Provider` with a direct dependency gets a Dagger cycle error with no hint.
- Severity: **Medium** — add a comment; or better, move refresh out of the interceptor into an `Authenticator` (`okhttp3.Authenticator`), which is the idiomatic escape and removes the cycle entirely.

**Cycle 2 — Auth status refresh (real, broken with `Provider`)**

```
CustomerApi ──▶ Retrofit ──▶ ... ──▶ TokenRefreshManager ──▶ Provider<AuthApi>
     ▲
     └── AuthRepositoryImpl.kt:26 (Provider<CustomerApi>)
```

- `AuthRepositoryImpl` takes `customerApiProvider: Provider<CustomerApi>?` **with a nullable default** (`AuthRepositoryImpl.kt:26`) purely for this. Severity: **Medium**.

**Cycle 3 — `AccountRepositoryImpl` aggregation (latent, non-cyclic but fragile)**

```
AccountRepositoryImpl ──▶ AddressRepository ──▶ CustomerApi
AccountRepositoryImpl ──▶ AuthRepository     ──▶ AuthApi + TokenRefreshManager
```

Currently acyclic because `AddressRepository` and `AuthRepository` do not depend back on `AccountRepository`. Any future `AccountRepository` method that delegates to something those two depend on creates a real cycle. Severity: **Medium** — the aggregation layer should not exist (see A20).

**Latent — `core` ↔ `ui` (currently one-directional, will invert further)**

```
core/notification/NotificationPayloadParser ──▶ ui/navigation/Routes
```

Not circular today because `ui/` does not import `core.notification`. But `MainActivity.kt` and `SplashViewModel` both consume `DeepLinkHolder` from `core.notification`, so the day a UI class reaches for `NotificationPayload` directly, the cycle closes. Severity: **Medium**.

### 3.4 Feature-to-Feature Interdependence

| Relationship | Assessment |
|---|---|
| Cross-feature **imports** between `ui/*` features | **None.** No feature package imports another. Clean. |
| Cross-feature **navigation** | Correct. All transitions declared in the single `ForerunNavGraph.kt` (340 lines); no feature builds its own `NavController`. Bottom-nav tabs use `saveState`/`restoreState`/`launchSingleTop` correctly (`ForerunNavGraph.kt:92-100`). |
| Cross-feature **deep links** | Declared once at `ForerunNavGraph.kt:316-319` (`forerun://orders/{orderId}` + `https://forerun.app/orders/{orderId}`), consumed once in `MainActivity.kt:65-105`. Single source of truth. Good. |
| Cross-feature **shared state** | Effectively none — no shared ViewModel, no `NavBackStackEntry` state sharing, no global event bus. Each feature re-fetches its own data. The cost is duplicate network calls (e.g. `customer/me` fetched by both `HomeRepositoryImpl` and `AccountRepositoryImpl`; `customer/orders` by both `HomeRepositoryImpl` and `OrdersListViewModel`). Acceptable at this scale; a repository-level cache would be the fix if it becomes measurable. |
| Feature → `core/` usage | Correct and consistent, **except** the 7 ViewModels in §1 A10-A15 that inject `core/` infrastructure directly instead of routing through UseCases. |

---

## 4. Calls & Functions

### 4.1 Dead Code — Complete Files

| File | Lines | Confirmed by |
|---|---|---|
| `core/error/ErrorMapper.kt` | 20 | `toUiError` appears only in itself and `core/error/ErrorMapperTest.kt`. Zero production callers. |
| `core/error/UiError.kt` | 16 | All 8 sealed subclasses referenced only from `ErrorMapper.kt` + `ErrorMapperTest.kt`. |

The pair implements a `UiError` sealed hierarchy that the app never constructs. Every ViewModel surfaces raw strings instead — `throwable.message ?: "تعذر تحميل البيانات"` (`HomeViewModel.kt:70`), `error.localizedMessage` (`CreateOrderViewModel`, `AddressSetupViewModel.kt:208`), `response.message` (`LoginViewModel.kt:88`). The abstraction was designed and then bypassed.

*Recommendation: delete both files and `ErrorMapperTest.kt`, or adopt them. Do not keep an unused error layer.*

### 4.2 Dead Code — Members (0 production callers)

| # | Member | File:Line | Notes |
|---|---|---|---|
| D1 | `ApiResponse.Error.toUiError()` | `core/error/ErrorMapper.kt:5` | Test-only |
| D2 | `hasDeepLink` | `core/notification/NotificationPayloadParser.kt:15` | Test-only; also the reason A1 exists |
| D3 | `deepLinkUrl` | `core/notification/NotificationPayloadParser.kt:18` | Test-only |
| D4 | `toDestinationRoute()` | `core/notification/NotificationPayloadParser.kt:21` | Test-only; **sole cause of the core→ui import** |
| D5 | `MainActivity.testLogin()` | `MainActivity.kt:135-155` | Private, never called; forces the `authApi` field injection |
| D6 | `MainActivity.authApi` | `MainActivity.kt:47-48` | Injected solely for D5 |
| D7 | `AccountViewModel.triggerSessionExpiry()` | `ui/account/AccountViewModel.kt:182-199` | Debug tool bound to a release button (`AccountScreen.kt:722`) |
| D8 | `AccountViewModel.saveProfile()` | `ui/account/AccountViewModel.kt:86-88` | Alias for `updateProfile`; only `AccountViewModelTest` calls it |
| D9 | `HomeViewModel.handleIntent()` | `ui/home/HomeViewModel.kt:54-58` | Public duplicate of `onIntent` (`:50-52`), which delegates to it. `HomeScreen` calls `handleIntent`, breaking the `onIntent` convention used by 7 other VMs |
| D10 | `DeviceTokenRepository.registerCurrentToken()` | `domain/repository/DeviceTokenRepository.kt:8` | Impl at `DeviceTokenRepositoryImpl.kt:30`, test at `DeviceTokenRepositoryTest` — no production caller |
| D11 | `DeviceTokenRepository.unregisterCurrentToken()` | `domain/repository/DeviceTokenRepository.kt:9` | Same |
| D12 | `AccountRepository.updateAddress()` | `domain/repository/AccountRepository.kt:15` | Implemented by delegation at `AccountRepositoryImpl.kt:49-54`; `AddressSetupViewModel` uses `AddressRepository` instead. Dead 3-hop chain |
| D13 | `AccountRepository.updateProfile(name, altPhone)` default | `domain/repository/AccountRepository.kt:12-13` | Default method; `AccountViewModel:109` builds the DTO inline instead |
| D14 | `AccountRepository.changePassword(password)` default | `domain/repository/AccountRepository.kt:14-16` | Same — `AccountViewModel:152` builds the DTO inline |
| D15 | `SocketManager.reconnect()` | `core/websocket/SocketManager.kt:117-121` | Test-only |
| D16 | `SocketManager.emitEvent()` | `core/websocket/SocketManager.kt:156-158` | Test-only |
| D17 | `SocketManager.isConnectingState` | `core/websocket/SocketManager.kt:52-53` | Test-only |
| D18 | `SocketManager.connectionState` + `SocketConnectionState` | `core/websocket/SocketManager.kt:56`, `:26-31` | `StateFlow` is produced (5 transitions in `setupListeners`) but **never observed by any consumer**. The app has no connection indicator |
| D19 | `DeepLinkHolder.peekPendingOrderId()` | `core/notification/DeepLinkHolder.kt:19` | Single occurrence = the declaration itself |
| D20 | `AddressReverseGeocodeCache.contains()/size()/clear()` | `data/remote/geocoding/AddressReverseGeocodeCache.kt:35-43` | Test-only |
| D21 | `NotificationPayloadParser.extractOrderIdFromUrl()` | `core/notification/NotificationPayloadParser.kt:41-46` | Only reached via `extractOrderId` (`:96`) — fine, but its 6 test-only assertions inflate the test count |
| D22 | `WebSocketEvent.RawEvent` | `core/websocket/WebSocketEvent.kt:43-48` | Produced by `SocketManager.parseEvent` else-branch (`:265-270`); consumed by no ViewModel (`OrderDetailViewModel.handleWebSocketEvent` ends in `else -> Unit`) |
| D23 | `WebSocketEvent.AccountVerified` | `core/websocket/WebSocketEvent.kt:38-41` | Parsed and emitted (`:263`), consumed by nothing. The socket subscribes to `account:verified` (`:184`) with no handler — **a live feature gap dressed as a stub** |
| D24 | `TokenStorage.getDeviceToken()/setDeviceToken()` default impls | `core/storage/TokenStorage.kt:25-26` | Interface-level defaults return `null` / no-op silently. `FakeTokenStorage` relies on them; any future impl that forgets them fails silently instead of at compile time |

### 4.3 ViewModel → UseCase Pattern

| ViewModel | Dependencies | Compliant? |
|---|---|---|
| `HomeViewModel` | `GetHomeDataUseCase`, `LogoutUseCase` | ✅ |
| `OrdersListViewModel` | `GetCustomerOrdersUseCase` | ✅ |
| `OrderDetailViewModel` | `GetOrderDetailUseCase`, `CancelOrderUseCase`, `ObserveOrderEventsUseCase` | ✅ |
| `RatingViewModel` | `GetOrderDetailUseCase`, `SubmitRatingUseCase` | ✅ |
| `CreateOrderViewModel` | `CreateOrderUseCase`, `GetAvailableRunnersUseCase`, `GetCustomerAddressUseCase` | ✅ |
| `AddressSetupViewModel` | `GetCustomerAddressUseCase`, `UpdateCustomerAddressUseCase` + `GeocodingService` | ⚠️ A14 |
| `SplashViewModel` | `CheckSessionUseCase` + `DeepLinkHolder` | ⚠️ A13 |
| `LoginViewModel` | `LoginUseCase` + `SocketManager` | ⚠️ A12 |
| `RegisterViewModel` | `RegisterUseCase` | ✅ |
| `PendingVerificationViewModel` | `LogoutUseCase` | ✅ |
| `SuspendedViewModel` | `LogoutUseCase` | ✅ |
| `SupportViewModel` | *(none — `@Inject constructor()`)* | ⚠️ A15 |
| `OnboardingViewModel` | *(none — `OnboardingPrefs`)* | ❌ A11 |
| `AccountViewModel` | *(none — `AccountRepository` + `TokenStorage` + `AuthApi`)* | ❌ A3, A5, A9, A10 |

**7 of 14 ViewModels are fully compliant; 4 have a minor infrastructure injection; 3 have no UseCase layer at all.**

### 4.4 Intent Convention Consistency

`onIntent(Intent)` is used by `HomeViewModel`, `OrdersListViewModel`, `OrderDetailViewModel`, `RatingViewModel`, `CreateOrderViewModel`, `AddressSetupViewModel` — a consistent MVI-style entry point. Deviations:

- `HomeViewModel` exposes **both** `onIntent` and `handleIntent` (D9); `HomeScreen.kt` calls `handleIntent`, bypassing the convention.
- `LoginViewModel`, `RegisterViewModel`, `AccountViewModel`, `SupportViewModel`, `PendingVerificationViewModel`, `SuspendedViewModel`, `OnboardingViewModel`, `SplashViewModel` expose **no Intent type** — direct command methods (`login()`, `register()`, `toggleFaq(id)`).

Severity: **Minor** — the majority convention is sound; the 8 command-style VMs are consistent among themselves and acceptable.

### 4.5 UseCase → Repository Analysis

| Repository | UseCases | Direct ViewModel access | Verdict |
|---|---|---|---|
| `AuthRepository` | `LoginUseCase`, `LogoutUseCase`, `RegisterUseCase`, `CheckSessionUseCase` | `AccountViewModel.logout()` uses `AccountRepository.logout()` which delegates to `AuthRepository` (3 hops) | ⚠️ Duplicate logout paths |
| `HomeRepository` | `GetHomeDataUseCase` | — | ✅ |
| `AddressRepository` | `GetCustomerAddressUseCase`, `UpdateCustomerAddressUseCase` | — | ✅ |
| `OrderRepository` | `CreateOrderUseCase`, `GetAvailableRunnersUseCase`, `GetCustomerOrdersUseCase`, `GetOrderDetailUseCase`, `CancelOrderUseCase`, `SubmitRatingUseCase` | — | ✅ 6/6 covered |
| `AccountRepository` | **none** | `AccountViewModel` (direct) | ❌ A9 |
| `DeviceTokenRepository` | **none** (correctly — infra-only consumer) | — | ✅ Intentional |
| `GeocodingService` | **none** | `AddressSetupViewModel` (direct) | ⚠️ A14 |

Every UseCase wraps exactly one repository. No multi-repository UseCase. No UseCase without a repository. No orphan repository.

### 4.6 Repository → Api/Dao Analysis

- All 6 impls wrap their Retrofit calls correctly; no Api call leaks outside `data/remote/` **except** `AccountViewModel` (A3) and `MainActivity` (D5/D6).
- **No mapper files exist anywhere in the project.** Mapping is hand-inlined in `OrderRepositoryImpl` (13 inline mappings), `HomeRepositoryImpl` (2), `AddressRepositoryImpl` (2), `AccountRepositoryImpl` (0 — returns DTOs raw, A2). Inconsistent *and* absent.
- `AccountRepositoryImpl` is the only impl returning DTOs unmapped (`:24-40`), which is the direct cause of A5.

---

## 5. Recommendations

### Fix First — critical (target: next sprint)

1. **Break `core → ui`** (A1). Delete `NotificationPayloadParser.toDestinationRoute()`, `deepLinkUrl`, `hasDeepLink` (D2-D4). Removing the single method that references `Routes` eliminates the inverted edge with zero refactoring elsewhere.
2. **Purge `AccountViewModel`'s data-layer access** (A3, A5, A9, A10). Introduce `AccountUseCase` / `UpdateProfileUseCase` / `ChangePasswordUseCase` / `LogoutAccountUseCase`, add `domain/model/CustomerProfile`, and map `CustomerProfileDto → CustomerProfile` in `AccountRepositoryImpl`. Update `AccountScreen.kt` to read `CustomerProfile`. This single change resolves 4 of the 6 critical violations.
3. **Strip debug scaffolding from production** (A6, D5-D8, A24, A25). Delete `MainActivity.testLogin()` + `authApi`, move `DesignSystemPreview`/`ColorSwatch`/`TypographySample` into `src/debug/`, delete `AccountViewModel.triggerSessionExpiry()` and `AccountScreen.kt:718-735`, and remove `AccountViewModel.saveProfile()`. Removes a release-build logout trigger and ~140 lines of dead UI.
4. **Decouple `ForerunNavGraph` from data** (A4). Wrap `TokenRefreshManager.sessionExpiredEvent` in a `SessionExpiryNotifier` interface exposed by a `core/`-owned singleton that the Composable receives. `ui/navigation` must never import `data.*`.

### Fix Next — medium (target: sprint 8b)

5. Introduce `AccountUseCase`s (part of #2) and an `ObserveOnboardingUseCase` (A11); inject `GeocodingService` via a `ReverseGeocodeUseCase` (A14).
6. Replace nullable-default constructor injection (A12, A13) with mandatory dependencies. Both already have Hilt bindings — the defaults exist only for tests and can be handled with `@Inject` test constructors instead.
7. Move `TokenRefreshManager` to `core/auth/` (A17). Update `RefreshInterceptor.kt:4`, `NetworkModule.kt:36-46`, `AuthRepositoryImpl.kt:21`, `ForerunNavGraph.kt:13`.
8. Delete redundant `provideTokenRefreshManager` (A16) and switch `provideOnboardingPrefs` to `@Binds` (DI-2).
9. Fix `NominatimGeocodingService` (A18, A19): remove the `= AddressReverseGeocodeCache()` default so Hilt injects the singleton, and inject a qualified `OkHttpClient` (or a dedicated `GeocodingClient` binding) instead of constructing one inline.
10. Decompose `AccountRepositoryImpl` (A20) — delete `getAddress`/`updateAddress` (D12) and let `AccountViewModel` use `AddressRepository` through a UseCase; extract the 3 mapper methods into `AccountMapper`.
11. Extract `OrderRepositoryImpl.getOrderDetail` mapping into `data/remote/mapper/OrderDetailMapper.kt` (A21) and consolidate runner endpoints into `OrderApi` (A22).
12. Convert `RefreshInterceptor` to an `okhttp3.Authenticator` (Cycle 1) and make `AuthRepositoryImpl`'s `CustomerApi` dependency non-nullable via the `Authenticator` change (Cycle 2).
13. Gradle hygiene (B3, B5, B6): remove `libs.material`, replace `isReturnDefaultValues` with Robolectric or explicit mocks, and pin `security-crypto` to a stable release or document the alpha requirement.
14. Decide the fate of D23 (`WebSocketEvent.AccountVerified`): either handle it — a `VERIFIED` socket event should force a re-check of session status — or stop subscribing to `account:verified` at `SocketManager.kt:184`.

### Can Be Deferred

- **Composable file sizes** (§2.1). Six files exceed 500 lines, but all are stateless rendering with inline private sub-composables. Split opportunistically when each file is next modified; no dedicated refactor sprint.
- **`ui/order/` vs `ui/orders/` package split** (§2.1). Cosmetic; rename in one focused commit when `ui/order/` is next touched.
- **`UiState` convention split** (§2.2). Pick one style and apply to new ViewModels only.
- **Intent convention for the 8 command-style ViewModels** (§4.4). They are internally consistent; migrating them to MVI is a style preference, not a defect.
- **Test-file naming** (`DeviceTokenRepositoryTest`). Cosmetic.
- **Inline Gradle deps** (B1, B2), unused `testInstrumentationRunner` (B4), fully-qualified type names in DI modules (DI-3). Cosmetic.
- **Home/Orders duplicate fetching** (§3.4). No measurable cost at current scale.

### Acceptable As-Is

- `domain/` containing zero `android.*` imports — the framework-independence guarantee holds.
- `data/` containing zero `ui/` imports — boundary is clean.
- Order endpoints reachable from two API interfaces (A22) — a naming/organization nit, not an architectural fault.
- `SocketManager`/`NotificationHelper`/`ApiCallAdapterFactory` naming — each has one clear responsibility; `Manager` is used only where it is idiomatic.
- `TokenStorage` interface breadth — a single storage port is the right shape for an app this size.
- ABI splits, signing config, minify/shrink configuration — production-ready.
- Version alignment across Kotlin/AGP/KSP/Hilt — a coherent, working toolchain.

---

*Scope note: this review examined architecture, engineering structure, file interconnections, and call graph only. UI/UX, string resources, and business-logic correctness were excluded by instruction and are covered in `CODE-REVIEW.md`. No source file was modified and no Gradle task was executed.*