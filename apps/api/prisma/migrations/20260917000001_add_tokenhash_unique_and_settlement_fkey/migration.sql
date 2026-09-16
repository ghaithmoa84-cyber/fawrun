-- Add unique constraint on RefreshToken.tokenHash
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_tokenHash_key" UNIQUE ("tokenHash");

-- Add foreign key from Settlement.closedByAdminId to Admin.id with ON DELETE SET NULL
ALTER TABLE "Settlement" DROP CONSTRAINT IF EXISTS "Settlement_closedByAdminId_fkey";

ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_closedByAdminId_fkey"
FOREIGN KEY ("closedByAdminId") REFERENCES "Admin"("id")
ON DELETE SET NULL ON UPDATE CASCADE;