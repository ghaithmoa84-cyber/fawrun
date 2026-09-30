# FORERUN Android — Master Specification

> **Version:** 1.0 — Ready for implementation
> **Target:** Kotlin Android app for FORERUN grocery delivery
> **Audience:** AI development agent
> **Prerequisite:** Read `AGENTS.md` and `PROJECT_BRIEF.md` first

---

## 1. Executive Summary

Build a native Android app for **FORERUN** (Arabic: فَوْراً), a local
grocery delivery service based in Al-Qanjara, Syria. The app replaces
the existing `customer-web` (React + Vite) with a native Kotlin +
Jetpack Compose application.

**v1 Scope:** Grocery only. Packages and rides are handled entirely
offline through WhatsApp (admin-managed). No backend changes for those
services.

**Core value:**
- Create grocery orders (free-text item lists, no catalog)
- Track active orders in real time via WebSocket
- Communicate with assigned runner (WhatsApp / Call)
- Rate delivered orders
- Manage profile and delivery address

---

## 2. Locked Decisions

These are non-negotiable. Do NOT revisit them.

| # | Decision | Value |
|---|----------|-------|
| 1 | App name (Latin) | `FORERUN` |
| 2 | App name (Arabic) | `فَوْراً` |
| 3 | Package name | `com.forerun.customer` |
| 4 | Repository | `github.com/ghaithmoa84-cyber/forerun` |
| 5 | minSdk | 26 (Android 8.0) |
| 6 | targetSdk / compileSdk | 35 |
| 7 | Maps | **MapLibre + OpenStreetMap** (free, no credit card) |
| 8 | WebSocket client | **Socket.IO client** (`io.socket:socket.io-client-java`) — NOT OkHttp WebSocket |
| 9 | Push notifications | **Firebase Cloud Messaging (FCM)** |
| 10 | Local storage | **DataStore only** — no Room, no offline-first |
| 11 | Primary color | `#00C1A7` (mint green) |
| 12 | Font | **Cairo** (4 weights: 400/500/600/700) |
| 13 | Services in v1 | Grocery only |
| 14 | Distribution | Direct APK (no Google Play) |
| 15 | Workflow | Branch per Sprint: `feature/android-sprint-N-<desc>` |

---

## 3. Inherited Rules (from AGENTS.md)

These apply to Android without exception:

1. **Server is source of truth** — never compute fees or change states
   locally. All pricing comes from the API.
2. **Every state change goes through backend State Machine** — the app
   only sends intents; never mutates status.
3. **Every financial operation = LedgerEntry on backend.**
4. **Use transactions on backend for composite ops.**
5. **Idempotency** — `PUT /deliver` returns 409 on duplicate.
6. **No history deletion** — soft delete only.
7. **`orderNumber` from `seqNumber`** — backend concern.
8. **Silent refresh token** — refresh 10 minutes before expiry.
9. **No stores in DB** — store names are free text.
10. **`shared-types` first** — any new DTO in `packages/shared-types`
    before using it in Kotlin (manual translation).
11. **`/api/v1/`** — every endpoint.
12. **Zod on backend** — the app mirrors validation but does not trust
    its own checks.
13. **No secrets in code** — all keys via Gradle properties or env.

---

## 4. Architecture

**Pattern:** MVVM + Clean Architecture (3 layers)

```
┌─────────────────────────────────────────┐
│  UI (Jetpack Compose)                   │
│  - Screens                              │
│  - ViewModels (UiState + Intents)       │
└────────────────┬────────────────────────┘
                 │ StateFlow / suspend
┌────────────────▼────────────────────────┐
│  Domain                                 │
│  - Use Cases (one per business action)  │
│  - Domain Models                        │
│  - Repository Interfaces                │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│  Data                                   │
│  - Repository Implementations           │
│  - Remote (Retrofit + Socket.IO)        │
│  - Local (DataStore for auth tokens)    │
│  - Mappers (DTO ↔ Domain)              │
└─────────────────────────────────────────┘
```

**Key principles:**
- ViewModels never touch Retrofit directly — always via Use Cases
- Domain layer has no Android dependencies
- Data layer is swappable
- One UiState per screen, exposed as `StateFlow<UiState>`
- One Intent sealed interface per screen

---

## 5. Tech Stack

| Layer | Library | Version |
|-------|---------|---------|
| Language | Kotlin | 2.0.21 |
| Build | AGP | 8.7.3 |
| Build | Gradle | 8.11.1 |
| JDK | Temurin | 21 |
| UI | Compose BOM | 2024.12.01 |
| UI | Material 3 | (from BOM) |
| Navigation | Compose Navigation | 2.8.5 |
| DI | Hilt | 2.53.1 |
| Async | Coroutines | 1.9.0 |
| JSON | Moshi | 1.15.1 |
| REST | Retrofit | 2.11.0 |
| WebSocket | socket.io-client-java | 2.1.1 |
| Local Storage | DataStore Preferences | 1.1.1 |
| Secure Storage | Security Crypto | 1.1.0-alpha06 |
| Image Loading | Coil | 3.0.4 |
| Maps | MapLibre Android | 11.5.2 |
| Push | Firebase Messaging | BOM 33.7.0 |

**Note:** `socket.io-client-java` is required because the backend uses
Socket.IO protocol (not raw WebSocket). Raw OkHttp WebSocket will NOT
work.

---

## 6. Project Structure

**Location:** `apps/android/`

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
        │   ├── ForerunApp.kt              (Application)
        │   ├── MainActivity.kt
        │   ├── core/
        │   │   ├── network/               (Retrofit, OkHttp, interceptors)
        │   │   ├── websocket/             (Socket.IO wrapper)
        │   │   ├── storage/               (DataStore, EncryptedPrefs)
        │   │   ├── di/                    (Hilt modules)
        │   │   ├── error/                 (ErrorMapper, AppError)
        │   │   └── result/                (Result wrapper)
        │   ├── data/
        │   │   ├── remote/
        │   │   │   ├── api/               (Retrofit interfaces)
        │   │   │   ├── dto/               (network DTOs)
        │   │   │   └── mapper/            (DTO ↔ Domain)
        │   │   ├── local/
        │   │   │   ├── datastore/
        │   │   │   └── secure/
        │   │   └── repository/            (Repository impls)
        │   ├── domain/
        │   │   ├── model/                 (Domain models)
        │   │   ├── repository/            (Repository interfaces)
        │   │   └── usecase/               (One class per action)
        │   └── ui/
        │       ├── theme/                 (Material 3, colors, typography)
        │       ├── components/            (Reusable composables)
        │       ├── navigation/            (NavGraph, routes)
        │       ├── splash/
        │       ├── onboarding/
        │       ├── auth/                  (Login, Register, Pending)
        │       ├── home/
        │       ├── address/               (Setup, Edit)
        │       ├── order/                 (Create, List, Detail)
        │       ├── rating/
        │       ├── account/
        │       └── support/
        └── res/
            ├── font/                      (Cairo TTF files)
            ├── values/                    (strings.xml — Arabic)
            ├── drawable/
            ├── mipmap-*/                  (launcher icons)
            └── xml/
```

---

## 7. Networking Layer

### 7.1 Base Configuration

**Base URL:**
- Debug (emulator): `http://10.0.2.2:3000/api/v1`
- Debug (device): `http://<local-ip>:3000/api/v1`
- Release: `https://fawrun-api-production.up.railway.app/api/v1`

**Timeouts:**
- Connect: 15s
- Read: 30s
- Write: 30s

**Interceptor chain (OkHttp):**
1. `AuthInterceptor` — adds `Authorization: Bearer <accessToken>`
2. `RefreshInterceptor` — on 401, attempts refresh once, retries
3. `LoggingInterceptor` (debug only)
4. `HeaderInterceptor` — adds `Accept-Language: ar-SY`, `X-Client: android`

### 7.2 API Interfaces

**AuthApi:**
```kotlin
interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): ApiResponse<RegisterResponse>

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): ApiResponse<LoginResponse>

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): ApiResponse<RefreshResponse>

    @POST("auth/logout")
    suspend fun logout(): ApiResponse<Unit>
}
```

**CustomerApi:**
```kotlin
interface CustomerApi {
    @GET("customer/me")
    suspend fun me(): ApiResponse<CustomerProfileDto>

    @PUT("customer/me")
    suspend fun updateProfile(@Body body: UpdateCustomerRequest): ApiResponse<CustomerProfileDto>

    @GET("customer/me/address")
    suspend fun getAddress(): ApiResponse<CustomerAddressDto>

    @PUT("customer/me/address")
    suspend fun updateAddress(@Body body: UpdateAddressRequest): ApiResponse<CustomerAddressDto>

    @GET("customer/runners")
    suspend fun availableRunners(): ApiResponse<List<AvailableRunnerDto>>
}
```

**OrderApi:**
```kotlin
interface OrderApi {
    @POST("customer/orders")
    suspend fun createOrder(@Body body: CreateOrderRequest): ApiResponse<CreateOrderResponse>

    @GET("customer/orders")
    suspend fun listOrders(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null
    ): ApiResponse<PaginatedResponse<OrderListItemDto>>

    @GET("customer/orders/{id}")
    suspend fun orderDetails(@Path("id") id: String): ApiResponse<OrderDetailsDto>

    @DELETE("customer/orders/{id}")
    suspend fun cancelOrder(@Path("id") id: String): ApiResponse<Unit>
}
```

**RatingApi:**
```kotlin
interface RatingApi {
    @POST("customer/orders/{id}/ratings")
    suspend fun createRating(
        @Path("id") orderId: String,
        @Body body: CreateRatingRequest
    ): ApiResponse<RatingResponse>

    @PUT("customer/orders/{id}/ratings")
    suspend fun updateRating(
        @Path("id") orderId: String,
        @Body body: UpdateRatingRequest
    ): ApiResponse<RatingResponse>
}
```

### 7.3 Response Wrapper

```kotlin
sealed interface ApiResponse<out T> {
    data class Success<T>(val data: T) : ApiResponse<T>
    data class Error(
        val statusCode: Int,
        val error: String,
        val message: String
    ) : ApiResponse<Nothing>
}
```

All Retrofit calls return `ApiResponse<T>` via a custom `CallAdapter.Factory`.

---

## 8. Data Models

### Enums

```kotlin
enum class OrderStatus {
    DRAFT, PENDING_REVIEW, UNDER_REVIEW,
    AWAITING_RUNNER, AWAITING_PREFERRED_RUNNER,
    ASSIGNED, IN_PROGRESS, OUT_FOR_DELIVERY,
    DELIVERED, CANCELLED;

    val isTerminal: Boolean get() = this == DELIVERED || this == CANCELLED
    val isActive: Boolean get() = !isTerminal
}

enum class UserStatus {
    PENDING_VERIFICATION, VERIFIED, REJECTED, SUSPENDED
}

enum class RunnerStatus { AVAILABLE, ON_MISSION, UNAVAILABLE }
```

### Domain Models

```kotlin
data class CustomerProfile(
    val id: String,
    val name: String,
    val whatsapp: String,
    val altPhone: String?,
    val status: UserStatus,
    val completedOrders: Int,
    val totalFeesPaid: Int,
    val createdAt: Instant
)

data class Address(
    val lat: Double,
    val lng: Double,
    val description: String
)

data class Order(
    val id: String,
    val orderNumber: String,
    val status: OrderStatus,
    val totalFee: Int,
    val pricing: Pricing,
    val deliveryAddress: Address,
    val items: List<OrderItem>,
    val stores: List<OrderStore>,
    val runner: Runner?,
    val notes: String?,
    val rating: Rating?,
    val timeline: Timeline,
    val createdAt: Instant
)

data class Pricing(
    val baseFee: Int,
    val peripheralFee: Int,
    val extraStoresFee: Int,
    val totalFee: Int
)

data class OrderItem(
    val id: String,
    val name: String,
    val quantity: String,
    val storeName: String?,
    val isPurchased: Boolean
)

data class Runner(
    val id: String,
    val name: String,
    val whatsapp: String?,
    val phone: String?,
    val avgRating: Double?
)

data class Rating(
    val stars: Int,
    val note: String?,
    val expiresAt: Instant?
)
```

**Money is ALWAYS `Int`** (Syrian pounds, integer). Never `Double`.

---

## 9. Authentication Flow

### 9.1 Token Storage

**Storage:** `EncryptedSharedPreferences` from `androidx.security:security-crypto`.

**Keys:**
- `access_token` — JWT, 2h expiry
- `refresh_token` — 64-byte random, rotated on every refresh
- `token_expiry` — epoch millis (parsed from JWT `exp`)
- `user_id`, `user_name`, `user_role`, `user_status`

### 9.2 Silent Refresh

**Trigger:** Before each request, check `token_expiry - now() < 10 minutes`.

**Concurrency safety:** Use a `Mutex`. Only one refresh executes; concurrent requests wait.

**On refresh failure:**
- Clear tokens
- Emit `AuthEvent.SessionExpired` → navigate to Login
- If `ACCOUNT_SUSPENDED` → navigate to Suspended screen

---

## 10. WebSocket (Socket.IO)

### 10.1 Connection

**Namespace:** `/orders`
**Auth payload:** `{ token: <accessToken> }` in `auth` callback
**Transports:** `["websocket"]` only
**Reconnection:** exponential backoff (1s → 16s), infinite retries

**Room assignment:** Backend auto-joins client to `customer:{userId}` based on JWT. The app does NOT send room info.

### 10.2 Events Listened To

| Event | Action |
|-------|--------|
| `order:status_changed` | Update order list/detail if matching ID |
| `order:runner_assigned` | Update order with runner info |
| `order:fee_updated` | Show snackbar + refetch order |
| `order:store_purchased` | Update store status in order detail |
| `order:out_for_delivery` | Show banner |
| `order:delivered` | Show success + enable rating |
| `order:cancelled` | Show cancellation banner |
| `account:verified` | Update user status, navigate to Home |

### 10.3 Foreground vs Background

**v1 decision:** Rely on **FCM** for updates when app is closed. WebSocket only when app is in foreground. No foreground service in v1.

---

## 11. Navigation

**Library:** Compose Navigation 2.8.5

**Routes:**
```
splash
onboarding
login
register
pending_verification
suspended
home
orders
orders/{orderId}
orders/{orderId}/rating
account
```

**Start destination logic (in SplashScreen):**
```
if (!isOnboardingSeen) → Onboarding
else if (!hasValidToken) → Login
else if (userStatus == PENDING_VERIFICATION) → PendingVerification
else if (userStatus == SUSPENDED) → Suspended
else → Home
```

**Bottom Navigation:** Home / Orders / Account

---

## 12. Design System (Already Implemented)

### 12.1 Colors (`Color.kt`)

| Name | Value | Usage |
|------|-------|-------|
| `ForerunGreen` | `#00C1A7` | Primary |
| `ForerunGreenDark` | `#008F7D` | Gradient end |
| `ForerunGreenLight` | `#E6F9F6` | Soft backgrounds |
| `WhatsAppGreen` | `#25D366` | WhatsApp buttons |
| `ForerunBackground` | `#FFFFFF` | Background |
| `ForerunSoftSurface` | `#F1F5F9` | Secondary cards |
| `ForerunBorder` | `#E2E8F0` | Borders |
| `ForerunTextPrimary` | `#0F172A` | Primary text |
| `ForerunTextMuted` | `#64748B` | Secondary text |
| `ForerunDanger` | `#EF4444` | Errors |
| `ForerunWarning` | `#F59E0B` | Warnings |
| `ForerunSuccess` | `#10B981` | Success |

### 12.2 Typography

**Font:** Cairo (4 weights: Regular, Medium, SemiBold, Bold)

Scale:
- `displayLarge` — 32sp Bold
- `headlineMedium` — 24sp Bold
- `headlineSmall` — 20sp SemiBold
- `titleLarge` — 18sp SemiBold
- `titleMedium` — 16sp SemiBold
- `bodyLarge` — 16sp Normal
- `bodyMedium` — 14sp Normal
- `bodySmall` — 12sp Normal
- `labelLarge` — 14sp Bold
- `labelMedium` — 12sp SemiBold
- `labelSmall` — 11sp Medium

### 12.3 Spacing (`Dimens.kt`)

4dp grid: 2, 4, 8, 10, 12, 16, 20, 24, 32, 48
- Screen margin: 16dp
- Card padding: 16dp
- Button height: 52dp / 56dp

### 12.4 Corner Radii
- Small: 8dp
- Medium: 12dp
- Large: 16dp
- XLarge: 20dp
- Pill: 999dp

---

## 13. Screens

**Reference:** Google Stitch designs (18 screens).

**v1 screens (in build order):**

| # | Screen | Priority |
|---|--------|----------|
| 1 | Splash | P0 |
| 2-4 | Onboarding (3 screens) | P0 |
| 5 | Login | P0 |
| 6 | Register | P0 |
| 7 | Pending Verification | P0 |
| 8 | Suspended | P1 |
| 9 | Home (default + active order) | P0 |
| 10 | Address Setup | P0 |
| 11 | Create Order | P0 |
| 12 | Order Confirmation | P0 |
| 13 | Orders List | P0 |
| 14 | Order Detail | P0 |
| 15 | Rating | P1 |
| 16 | Account | P1 |
| 17 | Support | P2 |

**Each screen must:**
- Have `ScreenNameViewModel` + `ScreenNameScreen`
- Use only components from `ui/components/`
- Have loading, empty, error, success states
- Handle RTL (Compose handles automatically with `supportsRtl="true"`)
- Use `stringResource(R.string.xxx)` for all user-facing text

---

## 14. Push Notifications (FCM)

### 14.1 Backend Changes Required

**Note to backend agent:** before Android push works, backend needs:

1. New Prisma model `DeviceToken`:
```prisma
model DeviceToken {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  token      String   @unique
  platform   String   // "android"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([userId])
}
```

2. New endpoints:
   - `POST /customer/me/device-token` — register FCM token
   - `DELETE /customer/me/device-token` — unregister

3. FCM send integration in `NotificationsService` — triggered on:
   - `order:runner_assigned`
   - `order:out_for_delivery`
   - `order:delivered`

4. Environment variable: `FIREBASE_SERVICE_ACCOUNT_JSON` (Railway).

### 14.2 Android Side

- `google-services.json` in `app/` (gitignored)
- `FirebaseMessagingService` subclass
- Request `POST_NOTIFICATIONS` permission on Android 13+
- On login → get FCM token → `POST /customer/me/device-token`
- On logout → `DELETE /customer/me/device-token`
- Notification channel: "FORERUN — تحديثات الطلبات" (HIGH importance)
- Deep linking: notification payload includes `orderId` → navigate to detail

---

## 15. Maps (MapLibre + OpenStreetMap)

### 15.1 Why MapLibre

- Free forever (no API key, no billing)
- Compatible with OSM tiles
- Same data source as web app (Leaflet + OSM)
- Arabic labels supported natively

### 15.2 Integration

- Library: `org.maplibre.gl:android-sdk:11.5.2`
- Address picker: full-screen map, center pin, drag to select
- Reverse geocoding: Nominatim (OSM) — free, rate-limited (1 req/sec)
- Cache results locally

### 15.3 Permissions

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

Request at runtime. If denied: fall back to manual map drag only.

---

## 16. Error Handling

### 16.1 Standard Error Shape

All API errors return:
```json
{
  "statusCode": 422,
  "error": "BUSINESS_RULE_VIOLATION",
  "message": "نص عربي"
}
```

### 16.2 Error Mapper

```kotlin
fun ApiResponse.Error.toUiError(): UiError = when (statusCode) {
    400 -> UiError.Validation(message)
    401 -> UiError.Unauthorized(message)
    403 -> UiError.Forbidden(message)
    404 -> UiError.NotFound(message)
    409 -> UiError.Conflict(message)
    422 -> UiError.BusinessRule(message)
    429 -> UiError.RateLimit(message)
    else -> UiError.Unknown(message)
}
```

### 16.3 UI Presentation

- Validation errors → inline below the field
- Business rule errors → snackbar
- Unauthorized → trigger logout + navigate to Login
- Network errors → full-screen retry state

**All error messages displayed to user MUST be Arabic** (from backend).

---

## 17. Backend API Reference

### 17.1 Authentication

| Method | Endpoint | Body / Notes |
|--------|----------|--------------|
| POST | `/auth/register` | `{ name, whatsapp, altPhone?, password }` |
| POST | `/auth/login` | `{ whatsapp, password }` → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | `{ refreshToken }` → `{ accessToken, refreshToken }` (rotated) |
| POST | `/auth/logout` | `{ refreshToken }` |

### 17.2 Customer

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/customer/me` | Profile + stats |
| PUT | `/customer/me` | Update name/altPhone/password |
| GET | `/customer/me/address` | Saved address |
| PUT | `/customer/me/address` | Update address |
| GET | `/customer/runners` | Available runners |

### 17.3 Orders

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/customer/orders` | Paginated, query: page, limit, status |
| POST | `/customer/orders` | Create order |
| GET | `/customer/orders/{id}` | Order detail |
| DELETE | `/customer/orders/{id}` | Cancel (PENDING_REVIEW or ASSIGNED only) |
| POST | `/customer/orders/{id}/ratings` | Create rating |
| PUT | `/customer/orders/{id}/ratings` | Update rating (within 24h) |

### 17.4 Create Order Payload

```json
{
  "items": [
    {
      "itemName": "حليب ٢ لتر",
      "quantity": "1",
      "customStoreName": null,
      "anyStore": true
    }
  ],
  "notes": "اتصل بي عند الوصول",
  "preferredRunnerId": null,
  "waitForPreferred": false,
  "deliveryAddress": {
    "lat": 35.5234,
    "lng": 35.9876,
    "description": "القنجرة - جانب جامع الهدى - طابق ٣"
  }
}
```

### 17.5 Order Status (State Machine)

10 states:
`DRAFT` → `PENDING_REVIEW` → `UNDER_REVIEW` →
`AWAITING_RUNNER` / `AWAITING_PREFERRED_RUNNER` → `ASSIGNED` →
`IN_PROGRESS` → `OUT_FOR_DELIVERY` → `DELIVERED`

Terminal: `DELIVERED`, `CANCELLED`

**Customer cancel allowed:** `PENDING_REVIEW`, `ASSIGNED` only.

---

## 18. Testing Strategy

### 18.1 Unit Tests
- ViewModels: state transitions with `kotlinx-coroutines-test`
- Use Cases: with fake repositories
- Mappers: DTO ↔ Domain
- Coverage target: 60% for domain + ui layers

### 18.2 Integration Tests
- Repository tests with MockWebServer
- WebSocket event parsing with sample payloads
- Silent refresh logic

### 18.3 UI Tests (Compose)
- Critical paths: login → home → create order → submit
- Tooling: `androidx.compose.ui:ui-test-junit4`
- Target: 5-10 critical flows

---

## 19. Build & Distribution

### 19.1 Build Variants
- `debug` — for development
- `release` — signed APK

### 19.2 Signing
- Keystore outside repo
- `keystore.properties` (gitignored)
- CI reads from env variables

### 19.3 Distribution
- Direct APK (no Play Store in v1)
- Download link (Railway-hosted static page or direct)
- On app start, check `GET /api/v1/app/version` (backend endpoint TBD)

---

## 20. Secrets Management

**Never commit:**
- `google-services.json`
- `keystore.jks` / `*.keystore`
- `keystore.properties`
- API keys

**Management:**
- Local: `.env.local` + `local.properties` (gitignored)
- CI: GitHub Secrets
- Production: Railway Variables

---

## 21. Sprint Roadmap

### Delivered (merged into `master`)

| Sprint | Duration | Deliverable |
|--------|----------|-------------|
| 1.1 | ✅ Complete | Project skeleton, Compose, APK builds |
| 1.2 | ✅ Complete | Design System (Cairo, Colors, Theme) |
| 1.3 | ✅ Complete | Hilt + Networking (Retrofit + Socket.IO + interceptors + encrypted storage) |
| 1.4 | ✅ Complete | Auth Flow (Splash + Onboarding + Login + Register + Pending) |
| 2 | ✅ Complete | Home + Address Setup + Create Order |
| 3 | ✅ Complete | Orders List + Order Detail + Rating |
| 4 | ✅ Complete | Account + Support + WebSocket integration |
| 5 | ✅ Complete | FCM + MapLibre + polish |
| 6 | ✅ Complete | UI Redesign (Google Stitch) + global RTL enforcement |
| 7 | ✅ Complete | Production Readiness: signing pipeline, R8/ProGuard, pre-production audit, release checklist |

**Refactoring track** (driven by `CODE-REVIEW.md` and `ARCHITECTURE-REVIEW.md`):

| Sprint | Status | Deliverable |
|--------|--------|-------------|
| 8A | ✅ Complete | 6 critical architecture fixes: socket-after-login, server-refreshed session status, forced 401 refresh, cold-start deep link vs. splash, double-submit guards, socket leak on logout. Tests 152 → 172 |
| 8B | ✅ Complete | 5 UI blockers (rating window, unscrollable auth screens, account loading/retry, orders error state, WhatsApp URL) + removal of debug scaffolding and the inverted `core → ui` edge. Tests 172 → 196 |
| 8C | ✅ Complete | Account clean architecture: domain `CustomerProfile`, `AccountMapper`, 3 UseCases, `SessionExpiryNotifier` (NavGraph decoupled from `data`), A2/A4/A5/A9/A16/A20 closed. Tests 196 → 223 |

**Sprints 1-8C are merged into `master`** (`3fc4119` for 1-8B, `e5bfbc1` for 8C). The cumulative-branch strategy is retired; each remaining sprint gets its own branch merged into `master`.

### Planned

| Sprint | Duration | Deliverable |
|--------|----------|-------------|
| 8D | 2-3 hours | Medium architecture: `TokenRefreshManager` → `core/auth` (A17), `RefreshInterceptor` → `okhttp3.Authenticator` (removes cycles 1-2), Nominatim DI fix (A18/A19), `OrderDetailMapper` (A21), onboarding/geocode UseCases, Gradle hygiene (B3/B5/B6) |
| 8E | 2 hours | WebSocket port: `OrderEventsGateway` in `domain`, clean `ObserveOrderEventsUseCase`, real `AccountVerified` handler (D23), socket events for Home + Orders |
| 8F | 2-3 hours + user setup | Real FCM (no placeholder) and app distribution. **Blocked on the user:** Firebase project, `google-services.json`, tester registration, production keystore |
| 9 | 3-4 hours | UI Polish: 81 hardcoded strings → `strings.xml`, unified order-status labels, `rememberSaveable`, remaining MEDIUM/SURFACE items |
| 10 | 4-6 hours | QA + Launch: integration tests, automated E2E, security review, performance baseline, first signed release 1.0.0 |

**Total remaining engineering:** ~13-18 hours of focused work across 5 sessions.
**Total elapsed for sprints 1-8C:** ~10-12 weeks.

Full detail in `docs/android/ROADMAP.md`.

---

## 22. Quality Gates

Before any merge:

```
./gradlew lint
./gradlew test
./gradlew assembleDebug
```

All three must pass. No exceptions.

**Rules:**
- Branch per Sprint
- Semantic commits: `feat(android):`, `fix(android):`, `chore(android):`
- No direct push to master
- Wait for review before merge

---

## 23. Out of Scope (v1)

- Package delivery (handled via WhatsApp, admin-only)
- Ride-hailing (handled via WhatsApp, admin-only)
- Offline-first (requires always-online)
- iOS app (not planned)
- Google Play Store distribution (direct APK only)
- Web app changes (separate track)

---

## 24. Open Questions

1. **Production API URL** — will be updated when domain purchased
2. **Firebase project name** — to be created before Sprint 5
3. **Keystore location** — to be decided before first release APK
4. **App version starting point** — `0.1.0` (current)

---

**End of MASTER-SPEC.md**
