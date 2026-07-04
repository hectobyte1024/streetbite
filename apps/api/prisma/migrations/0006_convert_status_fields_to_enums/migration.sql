DO $$
BEGIN
  CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR_OWNER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "VendorStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE "UserRole" USING role::"UserRole",
  ALTER COLUMN role SET DEFAULT 'CUSTOMER';

DROP INDEX IF EXISTS vendors_status_category_idx;
DROP INDEX IF EXISTS vendors_active_category_idx;

ALTER TABLE vendors
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "VendorStatus" USING status::"VendorStatus",
  ALTER COLUMN status SET DEFAULT 'DRAFT';

CREATE INDEX vendors_status_category_idx ON vendors(status, category);
CREATE INDEX vendors_active_category_idx
  ON vendors(category, created_at DESC)
  WHERE status = 'ACTIVE';
