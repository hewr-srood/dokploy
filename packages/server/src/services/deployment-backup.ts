import { execAsync, execAsyncRemote } from "../utils/process/execAsync";
import { encodeBase64 } from "../utils/docker/utils";
import { findBackupById } from "./backup";
import { findVolumeBackupById } from "./volume-backups";
import { runPostgresBackup } from "../utils/backups/postgres";
import { runMySqlBackup } from "../utils/backups/mysql";
import { runMariadbBackup } from "../utils/backups/mariadb";
import { runMongoBackup } from "../utils/backups/mongo";
import { runLibsqlBackup } from "../utils/backups/libsql";
import { runWebServerBackup } from "../utils/backups/web-server";
import { runComposeBackup } from "../utils/backups/compose";
import { keepLatestNBackups } from "../utils/backups";
import { runVolumeBackup } from "../utils/volume-backups";

interface RunDeploymentBackupParams {
	deployBackupId?: string | null;
	deployVolumeBackupId?: string | null;
	logPath: string;
	serverId?: string | null;
}

export const runDeploymentBackups = async ({
	deployBackupId,
	deployVolumeBackupId,
	logPath,
	serverId,
}: RunDeploymentBackupParams) => {
	let backupCommand = "";

	try {
		backupCommand += `echo "=== Running Pre-Deployment Backup ===" >> ${logPath};`;

		if (deployBackupId) {
			backupCommand += `echo "Running database backup..." >> ${logPath};`;

			const backup = await findBackupById(deployBackupId);

			if (backup.backupType === "database") {
				const databaseType = backup.databaseType;

				if (databaseType === "postgres" && backup.postgres) {
					await runPostgresBackup(backup.postgres, backup);
					await keepLatestNBackups(backup, backup.postgres.serverId);
				} else if (databaseType === "mysql" && backup.mysql) {
					await runMySqlBackup(backup.mysql, backup);
					await keepLatestNBackups(backup, backup.mysql.serverId);
				} else if (databaseType === "mariadb" && backup.mariadb) {
					await runMariadbBackup(backup.mariadb, backup);
					await keepLatestNBackups(backup, backup.mariadb.serverId);
				} else if (databaseType === "mongo" && backup.mongo) {
					await runMongoBackup(backup.mongo, backup);
					await keepLatestNBackups(backup, backup.mongo.serverId);
				} else if (databaseType === "libsql" && backup.libsql) {
					await runLibsqlBackup(backup.libsql, backup);
					await keepLatestNBackups(backup, backup.libsql.serverId);
				} else if (databaseType === "web-server") {
					await runWebServerBackup(backup);
					await keepLatestNBackups(backup);
				}
			} else if (backup.backupType === "compose" && backup.compose) {
				await runComposeBackup(backup.compose, backup);
				await keepLatestNBackups(backup, backup.compose.serverId);
			}

			backupCommand += `echo "✓ Database backup completed successfully" >> ${logPath};`;
		}

		if (deployVolumeBackupId) {
			backupCommand += `echo "Running volume backup..." >> ${logPath};`;

			await runVolumeBackup(deployVolumeBackupId);

			backupCommand += `echo "✓ Volume backup completed successfully" >> ${logPath};`;
		}

		backupCommand += `echo "=== Pre-Deployment Backup Completed ===" >> ${logPath};`;
		backupCommand += `echo "" >> ${logPath};`;

		if (serverId) {
			await execAsyncRemote(serverId, backupCommand);
		} else {
			await execAsync(backupCommand);
		}
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Unknown error during backup";
		const encodedMessage = encodeBase64(message);

		let errorCommand = `echo "${encodedMessage}" | base64 -d >> "${logPath}";`;
		errorCommand += `echo "" >> ${logPath};`;
		errorCommand += `echo "❌ Pre-deployment backup failed. Aborting deployment to preserve data integrity." >> ${logPath};`;
		errorCommand += `echo "" >> ${logPath};`;

		if (serverId) {
			await execAsyncRemote(serverId, errorCommand);
		} else {
			await execAsync(errorCommand);
		}

		throw new Error(
			`Pre-deployment backup failed: ${message}. Deployment aborted to preserve data integrity.`,
		);
	}
};
