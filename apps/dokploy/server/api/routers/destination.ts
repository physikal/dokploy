import {
	createDestintation,
	execAsync,
	execAsyncRemote,
	findDestinationById,
	IS_CLOUD,
	removeDestinationById,
	updateDestinationById,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import {
	apiCreateDestination,
	apiCreateGoogleDriveDestination,
	apiFindOneDestination,
	apiRemoveDestination,
	apiUpdateDestination,
	apiUpdateGoogleDriveDestination,
	destinations,
} from "@/server/db/schema";

export const destinationRouter = createTRPCRouter({
	create: adminProcedure
		.input(apiCreateDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				return await createDestintation(
					input,
					ctx.session.activeOrganizationId,
				);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Error creating the destination",
					cause: error,
				});
			}
		}),
	createGoogleDrive: adminProcedure
		.input(apiCreateGoogleDriveDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				return await createDestintation(
					{
						name: input.name,
						destinationType: "google-drive",
						serviceAccountJSON: input.serviceAccountJSON,
						googleDriveFolderId: input.googleDriveFolderId || "",
						accessKey: "",
						secretAccessKey: "",
						bucket: "",
						region: "",
						endpoint: "",
						provider: "",
					},
					ctx.session.activeOrganizationId,
				);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Error creating Google Drive destination",
					cause: error,
				});
			}
		}),
	testConnection: adminProcedure
		.input(apiCreateDestination)
		.mutation(async ({ input }) => {
			const { secretAccessKey, bucket, region, endpoint, accessKey, provider } =
				input;
			try {
				const rcloneFlags = [
					`--s3-access-key-id="${accessKey}"`,
					`--s3-secret-access-key="${secretAccessKey}"`,
					`--s3-region="${region}"`,
					`--s3-endpoint="${endpoint}"`,
					"--s3-no-check-bucket",
					"--s3-force-path-style",
					"--retries 1",
					"--low-level-retries 1",
					"--timeout 10s",
					"--contimeout 5s",
				];
				if (provider) {
					rcloneFlags.unshift(`--s3-provider="${provider}"`);
				}
				const rcloneDestination = `:s3:${bucket}`;
				const rcloneCommand = `rclone ls ${rcloneFlags.join(" ")} "${rcloneDestination}"`;

				if (IS_CLOUD && !input.serverId) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Server not found",
					});
				}

				if (IS_CLOUD) {
					await execAsyncRemote(input.serverId || "", rcloneCommand);
				} else {
					await execAsync(rcloneCommand);
				}
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						error instanceof Error
							? error?.message
							: "Error connecting to bucket",
					cause: error,
				});
			}
		}),
	testGoogleDriveConnection: adminProcedure
		.input(apiCreateGoogleDriveDestination)
		.mutation(async ({ input }) => {
			try {
				// Check if rclone is installed first
				try {
					if (IS_CLOUD) {
						await execAsyncRemote(
							input.serverId || "",
							"which rclone",
						);
					} else {
						await execAsync("which rclone");
					}
				} catch {
					throw new Error(
						"rclone is not installed. Please install rclone to use Google Drive destinations.",
					);
				}

				const saBase64 = Buffer.from(input.serviceAccountJSON).toString(
					"base64",
				);
				const saFilePath = "/tmp/dokploy-gdrive-test-sa.json";
				const setupCmd = `echo "${saBase64}" | base64 -d > "${saFilePath}"`;
				const cleanupCmd = `rm -f "${saFilePath}"`;

				const rcloneFlags = [
					`--drive-service-account-file="${saFilePath}"`,
					"--retries 1",
					"--low-level-retries 1",
					"--timeout 10s",
					"--contimeout 5s",
				];
				if (input.googleDriveFolderId) {
					rcloneFlags.push(
						`--drive-root-folder-id="${input.googleDriveFolderId}"`,
					);
				}
				const rcloneCommand = `${setupCmd} && rclone lsd ${rcloneFlags.join(" ")} ":drive:" && ${cleanupCmd}`;

				if (IS_CLOUD && !input.serverId) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Server not found",
					});
				}

				if (IS_CLOUD) {
					await execAsyncRemote(input.serverId || "", rcloneCommand);
				} else {
					await execAsync(rcloneCommand);
				}
			} catch (error) {
				// Sanitize error message to never expose credentials/base64 data
				let message = "Error connecting to Google Drive";
				if (error instanceof Error) {
					if (error.message.includes("rclone is not installed")) {
						message = error.message;
					} else if (error.message.includes("rclone: not found")) {
						message =
							"rclone is not installed. Please install rclone to use Google Drive destinations.";
					} else if (
						error.message.includes("Failed to configure token")
					) {
						message =
							"Invalid service account credentials. Please check your JSON key.";
					} else if (error.message.includes("couldn't list directory")) {
						message =
							"Could not access Google Drive. Check that the Drive API is enabled and the folder is shared with the service account.";
					} else {
						// Strip any base64 or long encoded data from the message
						message = error.message
							.replace(/echo\s+"[A-Za-z0-9+/=]{20,}"/g, 'echo "***"')
							.replace(/base64[^"]*"/g, 'base64 ***"')
							.substring(0, 300);
					}
				}
				throw new TRPCError({
					code: "BAD_REQUEST",
					message,
				});
			}
		}),
	one: protectedProcedure
		.input(apiFindOneDestination)
		.query(async ({ input, ctx }) => {
			const destination = await findDestinationById(input.destinationId);
			if (destination.organizationId !== ctx.session.activeOrganizationId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this destination",
				});
			}
			return destination;
		}),
	all: protectedProcedure.query(async ({ ctx }) => {
		return await db.query.destinations.findMany({
			where: eq(destinations.organizationId, ctx.session.activeOrganizationId),
			orderBy: [desc(destinations.createdAt)],
		});
	}),
	remove: adminProcedure
		.input(apiRemoveDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				const destination = await findDestinationById(input.destinationId);

				if (destination.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to delete this destination",
					});
				}
				return await removeDestinationById(
					input.destinationId,
					ctx.session.activeOrganizationId,
				);
			} catch (error) {
				throw error;
			}
		}),
	update: adminProcedure
		.input(apiUpdateDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				const destination = await findDestinationById(input.destinationId);
				if (destination.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to update this destination",
					});
				}
				return await updateDestinationById(input.destinationId, {
					...input,
					organizationId: ctx.session.activeOrganizationId,
				});
			} catch (error) {
				throw error;
			}
		}),
	updateGoogleDrive: adminProcedure
		.input(apiUpdateGoogleDriveDestination)
		.mutation(async ({ input, ctx }) => {
			try {
				const destination = await findDestinationById(input.destinationId);
				if (destination.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to update this destination",
					});
				}
				return await updateDestinationById(input.destinationId, {
					name: input.name,
					serviceAccountJSON: input.serviceAccountJSON,
					googleDriveFolderId: input.googleDriveFolderId || "",
					organizationId: ctx.session.activeOrganizationId,
				});
			} catch (error) {
				throw error;
			}
		}),
});
