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
| **Sprint 1.3** — Hilt + Networking | ⏳ Next |
| **Sprint 1.4** — Auth Flow | ⏳ Pending |
| **Sprints 2-6** — Features | ⏳ Pending |

**Active branch:** `feature/android-sprint-1-1-skeleton`
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

## Next: Sprint 1.3

**Goal:** Build networking layer + DI.

**Deliverables:**
- Hilt configured
- Retrofit + OkHttp + Moshi
- Interceptors: Auth, Refresh, Logging, Header
- `ApiResponse<T>` wrapper + custom CallAdapter
- `ErrorMapper`
- Encrypted storage for tokens
- Test login request works against backend

**Estimated:** 3-4 days.

---

## Next: Sprint 1.4

**Goal:** Auth flow end-to-end.

**Screens:**
- Splash
- Onboarding (3 screens, shown once via DataStore)
- Login
- Register
- Pending Verification

**Deliverables:**
- Navigation set up
- ViewModels + UiStates
- Integration with backend auth endpoints
- First real APK that logs in

**Estimated:** 4-5 days.

---

## Contact & Handoff

**Repository:** `github.com/ghaithmoa84-cyber/forerun`
**Active branch:** `feature/android-sprint-1-1-skeleton`
**Next session:** Continue from Sprint 1.3

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
