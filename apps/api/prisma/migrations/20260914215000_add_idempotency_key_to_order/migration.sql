-- AddIdempotencyKeyToOrder
-- Add idempotencyKey column to Order table for DELIVERED transition idempotency

-- AddColumn
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");