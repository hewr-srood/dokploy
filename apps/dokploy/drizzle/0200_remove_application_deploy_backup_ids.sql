-- Remove deployBackupIds from application table
-- Applications only support volume backups, not database backups
ALTER TABLE "application" DROP COLUMN IF EXISTS "deployBackupIds";
