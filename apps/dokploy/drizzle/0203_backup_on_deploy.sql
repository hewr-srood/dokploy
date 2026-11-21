-- Idempotent so both of these databases reach the same columns:
-- * a fresh v0.31.4 database, which has never seen this feature
-- * an existing database that already applied the v0.30.8-era feature
--   migrations (0197_normal_shape through 0200_remove_application_deploy_backup_ids).
-- Those old files are not in this journal. Drizzle orders by the journal
-- `when` timestamp, and those timestamps are older than v0.31.4's 0197-0202,
-- so re-adding the files would either be skipped or collide with upstream
-- migration numbers. This statement runs after 0202 instead.
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "deployBackupEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "deployVolumeBackupIds" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN IF NOT EXISTS "deployBackupEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN IF NOT EXISTS "deployBackupIds" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN IF NOT EXISTS "deployVolumeBackupIds" text[] DEFAULT '{}';--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'application'
      AND column_name = 'deployVolumeBackupId'
  ) THEN
    EXECUTE $sql$
      UPDATE "application"
      SET "deployVolumeBackupIds" = ARRAY["deployVolumeBackupId"]::text[]
      WHERE "deployVolumeBackupId" IS NOT NULL
        AND (
          "deployVolumeBackupIds" IS NULL
          OR cardinality("deployVolumeBackupIds") = 0
        )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'compose'
      AND column_name = 'deployBackupId'
  ) THEN
    EXECUTE $sql$
      UPDATE "compose"
      SET "deployBackupIds" = ARRAY["deployBackupId"]::text[]
      WHERE "deployBackupId" IS NOT NULL
        AND (
          "deployBackupIds" IS NULL
          OR cardinality("deployBackupIds") = 0
        )
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'compose'
      AND column_name = 'deployVolumeBackupId'
  ) THEN
    EXECUTE $sql$
      UPDATE "compose"
      SET "deployVolumeBackupIds" = ARRAY["deployVolumeBackupId"]::text[]
      WHERE "deployVolumeBackupId" IS NOT NULL
        AND (
          "deployVolumeBackupIds" IS NULL
          OR cardinality("deployVolumeBackupIds") = 0
        )
    $sql$;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "application" DROP COLUMN IF EXISTS "deployBackupId";--> statement-breakpoint
ALTER TABLE "application" DROP COLUMN IF EXISTS "deployVolumeBackupId";--> statement-breakpoint
ALTER TABLE "application" DROP COLUMN IF EXISTS "deployBackupIds";--> statement-breakpoint
ALTER TABLE "compose" DROP COLUMN IF EXISTS "deployBackupId";--> statement-breakpoint
ALTER TABLE "compose" DROP COLUMN IF EXISTS "deployVolumeBackupId";
