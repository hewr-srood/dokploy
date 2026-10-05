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
	deployBackupIds?: string[] | null;
	deployVolumeBackupIds?: string[] | null;
	logPath: string;
	serverId?: string | null;
}

export const runDeploymentBackups = async ({
	deployBackupIds,
	deployVolumeBackupIds,
	logPath,
	serverId,
}: RunDeploymentBackupParams) => {
	let backupCommand = "";

	try {
		backupCommand += `echo "=== Running Pre-Deployment Backups ===" >> ${logPath};`;

		if (deployBackupIds && deployBackupIds.length > 0) {
			const validBackupIds = deployBackupIds.filter(
				(id): id is string => id !== null && id !== undefined,
			);

			for (const backupId of validBackupIds) {
				try {
					backupCommand += `echo "Running database backup (${backupId.substring(0, 8)}...)..." >> ${logPath};`;

					const backup = await findBackupById(backupId);

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
				} catch (error) {
					throw error;
				}
			}
		}

		if (deployVolumeBackupIds && deployVolumeBackupIds.length > 0) {
			const validVolumeBackupIds = deployVolumeBackupIds.filter(
				(id): id is string => id !== null && id !== undefined,
			);

			for (const volumeBackupId of validVolumeBackupIds) {
				try {
					backupCommand += `echo "Running volume backup (${volumeBackupId.substring(0, 8)}...)..." >> ${logPath};`;

					await runVolumeBackup(volumeBackupId);

					backupCommand += `echo "✓ Volume backup completed successfully" >> ${logPath};`;
				} catch (error) {
					throw error;
				}
			}
		}

		backupCommand += `echo "=== Pre-Deployment Backups Completed ===" >> ${logPath};`;
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
		errorCommand += `echo "❌ Pre-deployment backups failed. Aborting deployment to preserve data integrity." >> ${logPath};`;
		errorCommand += `echo "" >> ${logPath};`;

		if (serverId) {
			await execAsyncRemote(serverId, errorCommand);
		} else {
			await execAsync(errorCommand);
		}

		throw new Error(
			`Pre-deployment backups failed: ${message}. Deployment aborted to preserve data integrity.`,
		);
	}
};
