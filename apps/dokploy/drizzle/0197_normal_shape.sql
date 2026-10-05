ALTER TABLE "application" ADD COLUMN "deployBackupEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "deployBackupId" text;--> statement-breakpoint
ALTER TABLE "application" ADD COLUMN "deployVolumeBackupId" text;--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN "deployBackupEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN "deployBackupId" text;--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN "deployVolumeBackupId" text;