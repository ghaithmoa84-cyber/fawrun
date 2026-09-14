# CodeRabbit Category A Fixes — Sprint 2

## Context
CodeRabbit identified 4 critical issues in the current PR that affect code correctness, data integrity, and financial logic. All must be fixed before merge.

**Branch:** `feature/sprint-2-order-core`
**Base:** `origin/master` (Sprint 1 merged)
**Validation:** `pnpm build && pnpm test` (59/59 must pass)

---

## Fix 1: Customer ID Resolution — `orders.service.ts`

### Problem
`Order.customerId` references `Customer.id` (cuid), but controllers pass `user.userId` (User.id). This causes:
- Ownership check failure: `order.customerId !== user.userId` always true for valid customers
- Wrong customer linked to orders

### Files Changed
- `apps/api/src/modules/orders/orders.service.ts`

### Changes

#### 1a. `createOrder` — signature + customer lookup (lines 50-54)

**Before:**
```typescript
async createOrder(
  customerId: string,
  dto: CreateOrderRequest,
): Promise<CreateOrderResult> {
  const storeGroups = new Map<string, typeof dto.items>();
```

**After:**
```typescript
async createOrder(
  userId: string,
  dto: CreateOrderRequest,
): Promise<CreateOrderResult> {
  const customer = await this.prisma.customer.findUnique({
    where: { userId },
  });
  if (!customer) {
    throw new NotFoundException('Customer not found');
  }

  const storeGroups = new Map<string, typeof dto.items>();
```

#### 1b. `createOrder` — order creation (line 105)

**Before:** `customerId,`
**After:** `customer.id,`

#### 1c. `createOrder` — audit logs (lines 163, 176)

**Before:** `actorId: customerId,` (×2)
**After:** `actorId: userId,` (×2)

#### 1d. `createOrder` — admin notification (line 195)

**Before:** `customerId,`
**After:** `customer.id,`

#### 1e. `cancelOrder` — signature (line 363)

**Before:** `async cancelOrder(orderId: string, customerId: string)`
**After:** `async cancelOrder(orderId: string, userId: string)`

#### 1f. `cancelOrder` — ownership check (line 371)

**Before:** `if (!order || order.customerId !== customerId)`
**After:** Add customer lookup before this check:
```typescript
const customer = await tx.prisma.customer.findUnique({ where: { userId } });
if (!customer) {
  throw new NotFoundException('Customer not found');
}
if (!order || order.customerId !== customer.id)
```

#### 1g. `cancelOrder` — cancelledByUserId (line 385)

**Before:** `cancelledByUserId: customerId,`
**After:** `cancelledByUserId: userId,`

#### 1h. `cancelOrder` — audit actorId (line 402)

**Before:** `actorId: customerId,`
**After:** `actorId: userId,`

#### 1i. `getOrderDetails` — signature + ownership check

**Before:** `async getOrderDetails(orderId: string, customerId: string)`
**After:** `async getOrderDetails(orderId: string, userId: string)`
And inside: lookup Customer by userId, use `customer.id` for `where.customerId`

#### 1j. `listCustomerOrders` — same pattern as 1i

---

## Fix 2: Remove Duplicate PricingService — `order-transitions.ts`

### Problem
`order-transitions.ts` contains duplicate definitions of `FeeResult`, `RecalculateFeeResult`, and full `PricingService` class. These duplicate the canonical implementations in `pricing.service.ts`.

### File Changed
- `apps/api/src/state-machine/order-transitions.ts`

### Changes (delete lines 1-8 and 96-259)

#### 2a. Remove unused imports (lines 1-8)
**Delete:**
```typescript
import { ORDER_STATUSES, ORDER_STORE_STATUSES } from '@fawrun/shared-constants';
import type { OrderStatus, OrderStoreStatus } from '@fawrun/shared-constants';
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PRICING } from '@fawrun/shared-constants';
import { PrismaService } from '../database/prisma.service.js';
import { AuditService } from '../modules/audit/audit.service.js';
import { NotificationsService } from '../modules/notifications/notifications.service.js';
import type { Prisma } from '@prisma/client';
```

**Replace with:**
```typescript
import { ORDER_STATUSES, ORDER_STORE_STATUSES } from '@fawrun/shared-constants';
import type { OrderStatus, OrderStoreStatus } from '@fawrun/shared-constants';
```

#### 2b. Delete duplicate interfaces (lines 96-114)
Delete: `FeeResult` interface and `RecalculateFeeResult` interface

#### 2c. Delete duplicate PricingService class (lines 116-258)
Delete: entire `@Injectable() export class PricingService { ... }` block

**Keep:**
- `export { ORDER_STATUSES }` (line 90)
- `export { ORDER_STORE_STATUSES }` (line 91)
- `TERMINAL_ORDER_STATUSES` (line 93)
- `TERMINAL_ORDER_STORE_STATUSES` (line 94)
- Transition arrays (lines 26-83, 85-88)

---

## Fix 3: Transaction Client Type — `pricing.service.ts`

### Problem
`recalculateFee` accepts `tx?: PrismaClient` but transaction callbacks provide `PrismaTransactionClient`. This means the passed transaction client may not be fully typed.

### File Changed
- `apps/api/src/modules/pricing/pricing.service.ts`

### Change (line 69)

**Before:** `tx?: PrismaClient,`
**After:** `tx?: Prisma.TransactionClient,`

---

## Fix 4: approveOrder Fee Calculation — `orders.service.ts`

### Problem
`approveOrder` calculates fee with `purchasedStoreCount: 0` always, which means:
- `extraStoresFee` always = 0
- Fee changes incorrectly when `isPeripheral` changes
- Original fee is not preserved properly

### File Changed
- `apps/api/src/modules/orders/orders.service.ts` (lines 684-687)

### Change

**Before:**
```typescript
const newFee = this.pricingService.calculateFee({
  isPeripheral: dto.isPeripheral,
  purchasedStoreCount: 0,
});
```

**After:**
```typescript
const purchasedStoreCount = order.orderStores.filter(
  (s) => s.status === 'PURCHASED',
).length;
const newFee = this.pricingService.calculateFee({
  isPeripheral: dto.isPeripheral,
  purchasedStoreCount,
});
```

---

## Validation

After all 4 fixes:

```bash
# 1. Build all packages
pnpm build

# 2. Run full test suite
pnpm test
# Expected: 59/59 tests pass

# 3. Type check
pnpm --filter fawrun-api exec tsc --noEmit
```

If all pass:
```bash
git add -A
git commit -m "fix: CodeRabbit triage — customerId resolution, transitions cleanup, tx type, approveOrder fee"
git push origin feature/sprint-2-order-core --force
```

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Controller calls may break if service interface changed | Controllers already pass `user.userId` — rename is internal only |
| Prisma types may not have `TransactionClient` | Verify via `pnpm build` — should resolve automatically |
| `orderStores` filter in approveOrder may miss pending stores | Only purchased stores count toward fee — matches `recalculateFee` logic |
| Force push may affect other developers | Coordinate with team before force push |
