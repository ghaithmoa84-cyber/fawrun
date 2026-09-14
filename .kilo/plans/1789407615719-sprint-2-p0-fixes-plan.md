# Sprint 2 P0 Fixes — Implementation Plan

**Status:** Ready for implementation  
**Scope:** 5 P0 fixes from comprehensive review  
**Branch:** `feature/sprint-2-p0-fixes`

---

## Task List (Execution Order)

### 1. Fix `assignRunner` Transaction — `orders.service.ts`

**File:** `apps/api/src/modules/orders/orders.service.ts`  
**Method:** `assignRunner` (lines ~1026-1079)

**Changes inside the `$transaction` callback:**
1. After finding runner (line ~1041), add verification checks:
   ```typescript
   const runner = await tx.runner.findUnique({ where: { id: runnerId } });
   if (!runner || runner.status !== 'AVAILABLE' || runner.user?.status !== 'VERIFIED') {
     throw new UnprocessableEntityException('Runner not available or not verified');
   }
   ```
2. Update runner status to `ON_MISSION`:
   ```typescript
   await tx.runner.update({
     where: { id: runnerId },
     data: { status: 'ON_MISSION' },
   });
   ```
3. Add `assignedAt` to order update:
   ```typescript
   await tx.order.update({
     where: { id },
     data: {
       status: transitionResult.to,
       runnerId,
       assignedAt: new Date(),
     },
   });
   ```

**Validation:** `pnpm test` — existing `assignRunner` tests should pass + new behavior verified.

---

### 2. Create `RunnerStateMachine` — `state-machine/`

**New Files:**
- `apps/api/src/state-machine/runner-state-machine.ts`
- `apps/api/src/state-machine/runner-transitions.ts`
- Update `apps/api/src/state-machine/index.ts` (export)
- Update `apps/api/src/state-machine/state-machine.module.ts` (register provider)
- `apps/api/test/state-machine/runner-state-machine.spec.ts`

**Transitions (from `RunnerStatus` enum):**

| From | To | Actor | Condition |
|------|-----|-------|-----------|
| `UNAVAILABLE` | `AVAILABLE` | ADMIN / RUNNER | Runner goes online |
| `AVAILABLE` | `ON_MISSION` | SYSTEM | Order assigned (via `assignRunner`) |
| `ON_MISSION` | `AVAILABLE` | SYSTEM | Order cancelled/delivered |
| `AVAILABLE` | `UNAVAILABLE` | ADMIN / RUNNER | Runner goes offline |
| `ON_MISSION` | `UNAVAILABLE` | ADMIN | Force offline (admin only) |

**Rules:**
- No direct `runner.status` mutations — all via `RunnerStateMachine.transition()`
- Every transition creates `AuditLog` with `actorRole: 'SYSTEM'` (or ADMIN/RUNNER)
- `DELIVERED` order transition triggers `ON_MISSION → AVAILABLE` via service call

**Validation:** Unit tests for all allowed/forbidden transitions.

---

### 3. Add `@Public()` to `logout` — `auth.controller.ts`

**File:** `apps/api/src/modules/auth/auth.controller.ts`  
**Line:** ~38 (the `logout` method)

**Change:**
```typescript
@Post('logout')
@Public()  // ADD THIS
@UsePipes(new ZodValidationPipe(LogoutSchema))
async logout(@Body() dto: LogoutDto) { ... }
```

**Validation:** `curl -X POST /api/v1/auth/logout` without Bearer token → 200 (not 401).

---

### 4. Add `AuditLog` to `register` — `auth.service.ts`

**File:** `apps/api/src/modules/auth/auth.service.ts`  
**Method:** `register` (lines ~40-68)

**Change:** Inside the existing `$transaction` callback, after creating `CustomerAddress`, add:
```typescript
await this.auditService.log(
  {
    orderId: null,
    actorId: user.id,
    actorRole: 'CUSTOMER',
    event: 'USER_REGISTERED',
    fromStatus: null,
    toStatus: 'PENDING_VERIFICATION',
    meta: { userId: user.id, role: 'CUSTOMER' },
  },
  tx,
);
```

**Validation:** Check `AuditLog` table after registration → `USER_REGISTERED` entry exists.

---

### 5. Add `idempotencyKey` for DELIVERED — `Order` model + transition

**Files:**
- `apps/api/prisma/schema.prisma` — add field to `Order` model
- `apps/api/src/state-machine/order-transitions.ts` — add check in transition logic
- `apps/api/src/modules/orders/orders.service.ts` — future DELIVERED endpoint will use it

**Schema change:**
```prisma
model Order {
  // ... existing fields ...
  idempotencyKey String? @unique  // ADD THIS
}
```

**Migration:** Generate and apply after schema change.

**Transition guard (in `order-transitions.ts` or `order-state-machine.ts`):**
Before allowing `OUT_FOR_DELIVERY → DELIVERED`, check:
```typescript
if (currentOrder.idempotencyKey && currentOrder.idempotencyKey !== providedKey) {
  throw new ConflictException('Idempotency key mismatch');
}
```

**Note:** The actual DELIVERED endpoint is Sprint 3. This task only adds the field and validation infrastructure.

---

## Dependencies

```
Task 1 (assignRunner fix) → independent
Task 2 (Runner SM)        → independent, but Task 1 should use it once created
Task 3 (logout @Public)   → independent
Task 4 (register AuditLog) → independent
Task 5 (idempotencyKey)   → requires migration (run after schema change)
```

**Recommended execution order:** 3 → 4 → 1 → 2 → 5

---

## Validation Commands

```bash
# After each task or all together:
pnpm --filter fawrun-api lint
pnpm --filter fawrun-api typecheck
pnpm --filter fawrun-api test
pnpm --filter fawrun-api db:generate  # after Task 5 schema change
pnpm build
```

---

## Rollback Plan

If any task breaks existing tests:
1. Revert that task's changes
2. Run full test suite to confirm baseline
3. Re-implement with smaller increments

---

## Out of Scope (Sprint 3)

- Runner action endpoints (`IN_PROGRESS`, `OUT_FOR_DELIVERY`, `DELIVERED`)
- Store purchase/skip endpoints (`PURCHASED`, `SKIPPED`)
- Receipt upload endpoint
- LedgerEntry creation on financial operations
- Outbox pattern implementation
- Settlement endpoints