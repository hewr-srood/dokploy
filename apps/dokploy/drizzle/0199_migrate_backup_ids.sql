-- Migrate single backup IDs to arrays for applications
ALTER TABLE "application" ADD COLUMN "deployBackupIds" text[] DEFAULT '{}';
ALTER TABLE "application" ADD COLUMN "deployVolumeBackupIds" text[] DEFAULT '{}';

-- Migrate existing single IDs to arrays (if they exist and are not null)
UPDATE "application" 
SET "deployBackupIds" = ARRAY["deployBackupId"]::text[]
WHERE "deployBackupId" IS NOT NULL;

UPDATE "application" 
SET "deployVolumeBackupIds" = ARRAY["deployVolumeBackupId"]::text[]
WHERE "deployVolumeBackupId" IS NOT NULL;

-- Drop old single ID columns
ALTER TABLE "application" DROP COLUMN IF EXISTS "deployBackupId";
ALTER TABLE "application" DROP COLUMN IF EXISTS "deployVolumeBackupId";

-- Migrate single backup IDs to arrays for compose
ALTER TABLE "compose" ADD COLUMN "deployBackupIds" text[] DEFAULT '{}';
ALTER TABLE "compose" ADD COLUMN "deployVolumeBackupIds" text[] DEFAULT '{}';

-- Migrate existing single IDs to arrays (if they exist and are not null)
UPDATE "compose" 
SET "deployBackupIds" = ARRAY["deployBackupId"]::text[]
WHERE "deployBackupId" IS NOT NULL;

UPDATE "compose" 
SET "deployVolumeBackupIds" = ARRAY["deployVolumeBackupId"]::text[]
WHERE "deployVolumeBackupId" IS NOT NULL;

-- Drop old single ID columns
ALTER TABLE "compose" DROP COLUMN IF EXISTS "deployBackupId";
ALTER TABLE "compose" DROP COLUMN IF EXISTS "deployVolumeBackupId";
