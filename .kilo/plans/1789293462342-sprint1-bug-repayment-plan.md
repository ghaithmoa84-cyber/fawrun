# Sprint 1 Fix Plan: Critical Bug Repayment & Structural Cleanup

## Context Summary

Verified via code inspection + Sprint 1 Brief spec (`docs/sprints/Sprint 1 Brief.md`):

| # | Issue | Severity | Verified | Spec Reference |
|---|-------|----------|----------|----------------|
| 1A | `JwtAuthGuard` attaches `user.userId`, but Controllers read `user.id` → `undefined` | 🔴 Critical | ✅ Confirmed | §1.8, line 516 |
| 1B | `login()` and `refresh()` reject `PENDING_VERIFICATION` users | 🔴 Critical | ✅ Confirmed | §1.9, lines 552-554 |
| 2A | Auth DTOs locally redefine Zod schemas already in `@fawrun/shared-types` | 🟡 Structural | ✅ Confirmed | §1.5, line 350 |
| 2B | 8 module directories missing (`customers`, `orders`, etc.) | 🟡 Structural | ✅ Confirmed | §1.4, lines 244-273 |

No test files (`.spec.ts`) exist in the codebase. Validation must rely on `pnpm typecheck`, `pnpm build`, and `pnpm lint`.

---

## Scope Boundaries (What IS and IS NOT in Scope)

### In Scope (this plan)
- Fix the `user.id` → `user.userId` mismatch in **6 controller method sites** across 2 files.
- Fix the `PENDING_VERIFICATION` login/refresh block in `auth.service.ts`.
- Repoint Auth DTO imports from local redefinitions to `@fawrun/shared-types`.
- Create 8 missing module directories.

### Out of Scope (explicitly deferred)
- Applying `VerifiedUserGuard` to future operation endpoints — those don't exist yet (Orders module is Sprint 2). `VerifiedUserGuard` is already implemented correctly and ready for Sprint 2 use.
- Adding `LogoutSchema` to `@fawrun/shared-types` — spec §1.3 does not list it; it remains a local DTO.
- Any frontend (admin-web, runner-pwa, android) changes — affected types are backend-internal.

---

## Task Ordering & Dependencies

```
Task 1 (Fix #1A) → Task 2 (Fix #1B) → Task 3 (Fix #2A) → Task 4 (Fix #2B)
   ↓                 ↓                 ↓                 ↓
  typecheck         typecheck        typecheck        build
```

All four tasks are **mutually independent** (no file overlaps). Execution order is for safety review, not technical dependency.

---

## Task 1: Fix User ID Mismatch (Fix #1A)

### Goal
Make controllers read the correct property key (`userId`) from `request.user`, matching what `JwtAuthGuard` attaches and what Sprint 1 Brief §1.8 specifies.

### Files & Exact Changes

#### 1a. `apps/api/src/modules/users/users.controller.ts`
**Change type annotations** on all 3 `@CurrentUser()` usages (lines 36, 44, 52):

```diff
-@CurrentUser() user: { id: string; role: string; status: string },
+@CurrentUser() user: { userId: string; role: string; status: string },
```

**Change property access** on all 3 method calls (lines 38, 46, 54):

```diff
-this.usersService.verify(id, user.id);
+this.usersService.verify(id, user.userId);
```
```diff
-this.usersService.reject(id, user.id);
+this.usersService.reject(id, user.userId);
```
```diff
-this.usersService.suspend(id, user.id);
+this.usersService.suspend(id, user.userId);
```

#### 1b. `apps/api/src/modules/runners/runners.controller.ts`
**Change type annotations** on all 3 `@CurrentUser()` usages (lines 40, 54, 69):

```diff
-@CurrentUser() user: { id: string; role: string; status: string },
+@CurrentUser() user: { userId: string; role: string; status: string },
```

**Change property access** on all 3 service calls (lines 47, 62, 74):

```diff
-}, user.id);
+}, user.userId);
```

### What does NOT change
- `jwt-auth.guard.ts` — stays as `userId: payload.sub` (correct per spec §1.8 line 516).
- `AuthenticatedRequest` interface in `jwt-auth.guard.ts` — already declares `userId`, no change.
- `roles.guard.ts` — reads `user.role`, unaffected.
- `verified-user.guard.ts` — reads `user.status`, unaffected.
- WebSocket gateways — use `payload.sub` directly, not `request.user`. Unaffected.

### Validation
- `pnpm typecheck` — confirms TypeScript type changes compile.
- `pnpm build` — confirms no import/side-effect breakage.

---

## Task 2: Allow PENDING_VERIFICATION Login (Fix #1B)

### Goal
Allow users with `PENDING_VERIFICATION` status to obtain JWT tokens (login + refresh), while still blocking `REJECTED` and `SUSPENDED` users. This matches spec §1.9 (lines 552-554) which states PENDING_VERIFICATION users "يمكنهم تسجيل الدخول (يحصلون على tokens)".

### Files & Exact Changes

#### `apps/api/src/modules/auth/auth.service.ts`

**2a. Fix `login()` method (line 98-100):**

Current:
```typescript
if (user.status !== 'VERIFIED') {
  throw new UnauthorizedException('Account is not verified');
}
```

Replace with:
```typescript
if (user.status === 'REJECTED' || user.status === 'SUSPENDED') {
  throw new UnauthorizedException('Account is not active');
}
```

Rationale: `VERIFIED` and `PENDING_VERIFICATION` should pass through. `REJECTED` and `SUSPENDED` should still be blocked. `isDeleted` is already checked on line 94.

**2b. Fix `refresh()` method (line 173-175):**

Current:
```typescript
if (user.isDeleted || user.status !== 'VERIFIED') {
  throw new UnauthorizedException('Account is not active');
}
```

Replace with:
```typescript
if (user.isDeleted || user.status === 'REJECTED' || user.status === 'SUSPENDED') {
  throw new UnauthorizedException('Account is not active');
}
```

### Risk: PENDING_VERIFICATION users gaining access
- **Mitigation**: `VerifiedUserGuard` (already implemented at `verified-user.guard.ts:10-27`) returns 403 for non-VERIFIED users. It must be applied to all operation endpoints when those are built in Sprint 2. This is a **documented readiness item**, not a gap in this sprint.
- **Current state**: No operation endpoints exist yet (no Orders module), so no risk of PENDING_VERIFICATION users performing operations in the current codebase.

### Validation
- `pnpm typecheck` — type check.
- Build verification: confirm the app starts (login endpoint returns 200 for PENDING_VERIFICATION, 401 for REJECTED/SUSPENDED).
- `pnpm lint` — no lint errors.

---

## Task 3: Repoint Auth DTO Schemas to shared-types (Fix #2A)

### Goal
Eliminate duplicate Zod schema definitions by importing from `@fawrun/shared-types` as required by spec §1.5 (line 350).

### Current State (duplicated schemas)
| Local File | Exports | Already in `@fawrun/shared-types` |
|---|---|---|
| `register.dto.ts` | `RegisterSchema`, `RegisterDto` | ✅ `RegisterSchema`, `RegisterRequest` |
| `login.dto.ts` | `LoginSchema`, `LoginDto` | ✅ `LoginSchema`, `LoginRequest` |
| `refresh.dto.ts` | `RefreshSchema`, `RefreshDto` | ✅ `RefreshSchema`, `RefreshRequest` |
| `logout.dto.ts` | `LogoutSchema`, `LogoutDto` | ❌ Not in shared-types |

### Files & Exact Changes

#### 3a. Update `apps/api/src/modules/auth/auth.controller.ts`

Replace local imports (lines 4-11):

```diff
-import { RegisterSchema } from './dto/register.dto.js';
-import type { RegisterDto } from './dto/register.dto.js';
-import { LoginSchema } from './dto/login.dto.js';
-import type { LoginDto } from './dto/login.dto.js';
-import { RefreshSchema } from './dto/refresh.dto.js';
-import type { RefreshDto } from './dto/refresh.dto.js';
+import { RegisterSchema, LoginSchema, RefreshSchema } from '@fawrun/shared-types';
+import type { RegisterRequest, LoginRequest, RefreshRequest } from '@fawrun/shared-types';
 import { LogoutSchema } from './dto/logout.dto.js';
 import type { LogoutDto } from './dto/logout.dto.js';
```

Update method signatures (lines 22, 30, 38):

```diff
-  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
+  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterRequest) {
```
```diff
-  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto, ...) {
+  login(@Body(new ZodValidationPipe(LoginSchema)) dto: LoginRequest, ...) {
```
```diff
-  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: RefreshDto) {
+  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: RefreshRequest) {
```

#### 3b. Update `apps/api/src/modules/auth/auth.service.ts`

Replace local type imports (lines 13-15):

```diff
-import type { RegisterDto } from './dto/register.dto.js';
-import type { LoginDto } from './dto/login.dto.js';
-import type { RefreshDto } from './dto/refresh.dto.js';
+import type { RegisterRequest, LoginRequest, RefreshRequest } from '@fawrun/shared-types';
```

Update method signatures (lines 31, 89, 149):

```diff
-  async register(dto: RegisterDto) {
+  async register(dto: RegisterRequest) {
```
```diff
-  async login(dto: LoginDto, deviceInfo?: string) {
+  async login(dto: LoginRequest, deviceInfo?: string) {
```
```diff
-  async refresh(dto: RefreshDto) {
+  async refresh(dto: RefreshRequest) {
```

#### 3c. Delete redundant local DTO files

These files are no longer imported by anything after 3a/3b:

- `apps/api/src/modules/auth/dto/register.dto.ts` — **delete**
- `apps/api/src/modules/auth/dto/login.dto.ts` — **delete**
- `apps/api/src/modules/auth/dto/refresh.dto.ts` — **delete**

Keep `apps/api/src/modules/auth/dto/logout.dto.ts` — not in shared-types, remains local.

### Pre-verification needed before deleting
Run grep to confirm no other files import from these 3 local DTOs:
```bash
grep -r "from.*auth/dto/" apps/api/src/
```
Expected: only `auth.controller.ts` and `auth.service.ts` — both will be updated in this task.

### Validation
- `pnpm typecheck` — confirms all type renames compile.
- `pnpm build` — confirms no broken imports.

---

## Task 4: Create Missing Module Directories (Fix #2B)

### Goal
Create the 8 module directories specified in spec §1.4 (lines 244-273, requirement line 328).

### Changes

Create these directories with a `.gitkeep` placeholder (so they persist in git):

```
apps/api/src/modules/customers/
apps/api/src/modules/orders/
apps/api/src/modules/order-items/
apps/api/src/modules/order-stores/
apps/api/src/modules/settlements/
apps/api/src/modules/ledger/
apps/api/src/modules/ratings/
apps/api/src/modules/receipts/
```

### Validation
- `ls apps/api/src/modules/` — confirm all 14 directories present (6 existing + 8 new).
- No build/typecheck impact expected (empty directories).

---

## Pre-Fix Safety Checklist

Before starting any edits, confirm:

1. **`git status` clean** — no uncommitted work to avoid confusion.
2. **No `.spec.ts` test files exist** — confirmed via `glob`, none found. Validation relies on typecheck/build/lint only.
3. **JWT RS256 keys are configured** for local dev (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`) — check `.env`. If missing, app won't start. [Pre-existing infra requirement, not introduced by this plan.]
4. **`@fawrun/shared-types` is built** — check `packages/shared-types/package.json` for build script. Run `pnpm build` from root or `pnpm build -F @fawrun/shared-types` first, to ensure the package is compiled before the API depends on it.

---

## Post-Implementation Validation Plan

Run in order:

```bash
# 1. Type check everything
pnpm typecheck

# 2. Build all packages (shared-types, shared-constants, then api)
pnpm build

# 3. Lint
pnpm lint

# 4. Verify module directory structure
ls apps/api/src/modules/

# 5. Verify no remaining local schema duplication
grep -r "import { z } from 'zod'" apps/api/src/modules/auth/dto/
# Expected: only logout.dto.ts should still import z directly
```

### Expected pass criteria
- `pnpm typecheck` — zero errors.
- `pnpm build` — zero errors.
- `pnpm lint` — zero errors.
- `ls apps/api/src/modules/` — 14 directories present.
- `logout.dto.ts` is the only file in `auth/dto/` that imports `z` directly.

---

## Rollback Plan

Since these are local development changes (no database migrations, no production deploys):

- If any task produces a `typecheck` or `build` failure: revert that task's file using `git checkout -- <file>` and re-examine.
- All changes are isolated to:
  - `users.controller.ts` (6 lines)
  - `runners.controller.ts` (6 lines)
  - `auth.service.ts` (2 blocks, ~5 lines)
  - `auth.controller.ts` (imports + 3 type signatures)
  - `auth/dto/register.dto.ts` (deleted)
  - `auth/dto/login.dto.ts` (deleted)
  - `auth/dto/refresh.dto.ts` (deleted)
  - 8 new empty directories

No database schema changes, no data migrations, no environment modifications.

---

## Open Questions (None blocking — all resolved)

| Q | Resolution |
|---|------------|
| Should the Guard change `userId` to `id`, or the Controllers change `id` to `userId`? | **Controllers** — Guard is correct per spec §1.8 line 516 which explicitly says `userId`. |
| Should PENDING_VERIFICATION be the only allowed non-VERIFIED login status? | Yes — `REJECTED` and `SUSPENDED` remain blocked. VerifiedUserGuard handles operation-level enforcement. |
| Should LogoutSchema be moved to shared-types? | No — spec §1.3 does not list it. Remains local. |
| Are frontend consumers affected by the DTO rename? | No — all affected types are backend-internal imports. |
