-- AddForeignKey (idempotent: check if constraint already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Settlement_closedByAdminId_fkey'
  ) THEN
    ALTER TABLE "Settlement"
    ADD CONSTRAINT "Settlement_closedByAdminId_fkey"
    FOREIGN KEY ("closedByAdminId") REFERENCES "Admin"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;