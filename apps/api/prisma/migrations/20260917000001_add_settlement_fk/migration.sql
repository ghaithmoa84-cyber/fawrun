-- AddForeignKey (idempotent: check if constraint already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Settlement_closedByAdminId_fkey'
      AND conrelid = 'Settlement'::regclass
  ) THEN
    ALTER TABLE "Settlement"
    ADD CONSTRAINT "Settlement_closedByAdminId_fkey"
    FOREIGN KEY ("closedByAdminId") REFERENCES "Admin"("id")
    NOT VALID
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'Settlement_closedByAdminId_fkey'
      AND conrelid = 'Settlement'::regclass
  ) THEN
    ALTER TABLE "Settlement" 
      VALIDATE CONSTRAINT "Settlement_closedByAdminId_fkey";
  END IF;
END $$;