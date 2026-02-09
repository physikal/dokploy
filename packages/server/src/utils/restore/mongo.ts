import type { apiRestoreBackup } from "@dokploy/server/db/schema";
import type { Destination } from "@dokploy/server/services/destination";
import type { Mongo } from "@dokploy/server/services/mongo";
import type { z } from "zod";
import {
	getDestinationCredentials,
	getDestinationRemotePath,
	wrapWithDestinationSetup,
} from "../backups/utils";
import { execAsync, execAsyncRemote } from "../process/execAsync";
import { getRestoreCommand } from "./utils";

export const restoreMongoBackup = async (
	mongo: Mongo,
	destination: Destination,
	backupInput: z.infer<typeof apiRestoreBackup>,
	emit: (log: string) => void,
) => {
	try {
		const { appName, databasePassword, databaseUser, serverId } = mongo;

		const rcloneFlags = getDestinationCredentials(destination);
		const backupPath = getDestinationRemotePath(destination, backupInput.backupFile);
		const rcloneCommand = `rclone copy ${rcloneFlags.join(" ")} "${backupPath}"`;

		const command = getRestoreCommand({
			appName,
			type: "mongo",
			credentials: {
				database: backupInput.databaseName,
				databaseUser,
				databasePassword,
			},
			restoreType: "database",
			rcloneCommand,
			backupFile: backupInput.backupFile,
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
				error instanceof Error ? error.message : "Error restoring mongo backup"
			}`,
		);
		throw new Error(
			error instanceof Error ? error.message : "Error restoring mongo backup",
		);
	}
};
