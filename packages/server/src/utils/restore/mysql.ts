import type { apiRestoreBackup } from "@dokploy/server/db/schema";
import type { Destination } from "@dokploy/server/services/destination";
import type { MySql } from "@dokploy/server/services/mysql";
import type { z } from "zod";
import {
	getDestinationCredentials,
	getDestinationRemotePath,
	wrapWithDestinationSetup,
} from "../backups/utils";
import { execAsync, execAsyncRemote } from "../process/execAsync";
import { getRestoreCommand } from "./utils";

export const restoreMySqlBackup = async (
	mysql: MySql,
	destination: Destination,
	backupInput: z.infer<typeof apiRestoreBackup>,
	emit: (log: string) => void,
) => {
	try {
		const { appName, databaseRootPassword, serverId } = mysql;

		const rcloneFlags = getDestinationCredentials(destination);
		const backupPath = getDestinationRemotePath(destination, backupInput.backupFile);

		const rcloneCommand = `rclone cat ${rcloneFlags.join(" ")} "${backupPath}" | gunzip`;

		const command = getRestoreCommand({
			appName,
			type: "mysql",
			credentials: {
				database: backupInput.databaseName,
				databasePassword: databaseRootPassword,
			},
			restoreType: "database",
			rcloneCommand,
		});

		emit("Starting restore...");

		emit(`Executing command: ${command}`);

		const finalCommand = wrapWithDestinationSetup(destination, command);
		if (serverId) {
			await execAsyncRemote(serverId, finalCommand);
		} else {
			await execAsync(finalCommand);
		}

		emit("Restore completed successfully!");
	} catch (error) {
		console.error(error);
		emit(
			`Error: ${
				error instanceof Error ? error.message : "Error restoring mysql backup"
			}`,
		);
		throw new Error(
			error instanceof Error ? error.message : "Error restoring mysql backup",
		);
	}
};
