import type { apiRestoreBackup } from "@dokploy/server/db/schema";
import type { Destination } from "@dokploy/server/services/destination";
import type { Postgres } from "@dokploy/server/services/postgres";
import type { z } from "zod";
import {
	getDestinationCredentials,
	getDestinationRemotePath,
	wrapWithDestinationSetup,
} from "../backups/utils";
import { execAsync, execAsyncRemote } from "../process/execAsync";
import { getRestoreCommand } from "./utils";

export const restorePostgresBackup = async (
	postgres: Postgres,
	destination: Destination,
	backupInput: z.infer<typeof apiRestoreBackup>,
	emit: (log: string) => void,
) => {
	try {
		const { appName, databaseUser, serverId } = postgres;

		const rcloneFlags = getDestinationCredentials(destination);
		const backupPath = getDestinationRemotePath(destination, backupInput.backupFile);

		const rcloneCommand = `rclone cat ${rcloneFlags.join(" ")} "${backupPath}" | gunzip`;

		emit("Starting restore...");
		emit(`Backup path: ${backupPath}`);

		const command = getRestoreCommand({
			appName,
			credentials: {
				database: backupInput.databaseName,
				databaseUser,
			},
			type: "postgres",
			rcloneCommand,
			restoreType: "database",
		});

		emit(`Executing command: ${command}`);

		const finalCommand = wrapWithDestinationSetup(destination, command);
		if (serverId) {
			await execAsyncRemote(serverId, finalCommand);
		} else {
			await execAsync(finalCommand);
		}

		emit("Restore completed successfully!");
	} catch (error) {
		emit(
			`Error: ${
				error instanceof Error
					? error.message
					: "Error restoring postgres backup"
			}`,
		);
		throw error;
	}
};
