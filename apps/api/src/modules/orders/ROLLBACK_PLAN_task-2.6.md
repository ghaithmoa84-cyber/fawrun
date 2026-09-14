# Rollback Plan — Task 2.6 Admin Order Review

## Operation Description
- Admin review/approval/rejection endpoints update `Order.status`, `Order.isPeripheral`, fee snapshot fields, `cancelledByUserId`, `cancelledAt`, `cancelReason`, and append `AuditLog` rows.
- No `LedgerEntry` or `Settlement` rows are created or modified in this task.
- Expected volume: development/test data only until the feature is deployed.

## Forward Steps
1. Deploy the Admin review endpoints from `apps/api/src/modules/orders/`.
2. On approval, transition `UNDER_REVIEW` to `AWAITING_RUNNER` or `AWAITING_PREFERRED_RUNNER` through `OrderStateMachine`.
3. Update `isPeripheral`, optional `notes`, and fee snapshot fields inside one Prisma transaction.
4. Append `ORDER_APPROVED`, optional `ORDER_PERIPHERAL_SET`, and optional `ORDER_FEE_UPDATED` audit rows in the same transaction.
5. On rejection, transition `UNDER_REVIEW` to `CANCELLED`, set cancellation fields, and append `ORDER_REJECTED` in the same transaction.

## Rollback Steps
If a deployment or runtime issue is detected before production use:
1. Disable the new Admin review routes or roll back the deployment.
2. Do not delete or edit `AuditLog` rows; they are append-only.
3. If a bad approval/rejection was already written in a non-production environment, restore the affected `Order` row from backup or re-run the domain transition through an admin-approved correction script.
4. Re-run `pnpm build`, `pnpm lint`, `pnpm --filter fawrun-api exec tsc --noEmit`, and `pnpm test`.

## Verification Queries
- Confirm approved orders moved only from `UNDER_REVIEW` to an allowed target status.
- Confirm rejected orders have `status = 'CANCELLED'`, `cancelledByUserId` set to the admin user, and `cancelledAt` populated.
- Confirm each successful transition has the expected `AuditLog` event.
- Confirm no `LedgerEntry` or `Settlement` rows were touched by this task.

## Communication Plan
- Notify the backend owner and QA if rollback is triggered.
- No customer-facing impact is expected because these endpoints are admin-only.
