ALTER TABLE "Order" DROP CONSTRAINT "Order_preferredRunnerId_fkey";

ALTER TABLE "Order" ADD CONSTRAINT "Order_preferredRunnerId_fkey"
FOREIGN KEY ("preferredRunnerId") REFERENCES "Runner"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
