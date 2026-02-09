import {
	AlertTriangle,
	ExternalLink,
	FolderUp,
	HardDrive,
	Loader2,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DialogAction } from "@/components/shared/dialog-action";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";
import { HandleGoogleDriveDestinations } from "./handle-google-drive-destinations";

const RcloneNotInstalled = () => (
	<div className="flex flex-col items-center gap-4 min-h-[25vh] justify-center text-center">
		<AlertTriangle className="size-10 text-yellow-500" />
		<div className="flex flex-col gap-2 max-w-lg">
			<h3 className="text-base font-medium">
				rclone is required
			</h3>
			<p className="text-sm text-muted-foreground">
				Google Drive destinations require{" "}
				<span className="font-medium text-foreground">rclone</span> to be
				installed on your server. rclone handles the secure file transfers
				between your server and Google Drive.
			</p>
		</div>
		<div className="flex flex-col gap-3 items-center mt-2">
			<code className="bg-muted px-4 py-2 rounded-md text-sm font-mono">
				curl https://rclone.org/install.sh | sudo bash
			</code>
			<div className="flex flex-row gap-3">
				<a
					href="https://rclone.org/install/"
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 underline underline-offset-4"
				>
					Installation guide
					<ExternalLink className="size-3" />
				</a>
				<a
					href="https://rclone.org/drive/"
					target="_blank"
					rel="noopener noreferrer"
					className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 underline underline-offset-4"
				>
					Google Drive docs
					<ExternalLink className="size-3" />
				</a>
			</div>
		</div>
	</div>
);

const GoogleDriveSetupGuide = () => (
	<div className="flex flex-col items-center gap-3 min-h-[25vh] justify-center">
		<FolderUp className="size-8 self-center text-muted-foreground" />
		<span className="text-base text-muted-foreground text-center max-w-md">
			Connect a Google Drive service account to use it as a backup
			destination.
		</span>
		<details className="w-full max-w-lg mt-2">
			<summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
				How to set up a service account
			</summary>
			<ol className="text-sm text-muted-foreground mt-3 space-y-2 list-decimal list-inside">
				<li>
					Go to the{" "}
					<a
						href="https://console.cloud.google.com/projectcreate"
						target="_blank"
						rel="noopener noreferrer"
						className="underline underline-offset-4 hover:text-foreground"
					>
						Google Cloud Console
					</a>{" "}
					and create a project (free)
				</li>
				<li>
					Enable the{" "}
					<a
						href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
						target="_blank"
						rel="noopener noreferrer"
						className="underline underline-offset-4 hover:text-foreground"
					>
						Google Drive API
					</a>
				</li>
				<li>
					Go to{" "}
					<a
						href="https://console.cloud.google.com/iam-admin/serviceaccounts"
						target="_blank"
						rel="noopener noreferrer"
						className="underline underline-offset-4 hover:text-foreground"
					>
						Service Accounts
					</a>{" "}
					and create one
				</li>
				<li>Create a key (JSON type) and download it</li>
				<li>
					In Google Drive, create a folder for backups and share it
					with the service account email as{" "}
					<span className="font-medium text-foreground">Editor</span>
					{" "}(the email looks like{" "}
					<code className="text-xs bg-muted px-1 py-0.5 rounded">
						name@project.iam.gserviceaccount.com
					</code>
					). This is required — service accounts have no storage of their own.
				</li>
				<li>
					Copy the folder ID from the URL:{" "}
					<code className="text-xs bg-muted px-1 py-0.5 rounded">
						drive.google.com/drive/folders/<b>FOLDER_ID</b>
					</code>
				</li>
				<li>Paste the JSON key and folder ID below</li>
			</ol>
		</details>
		<HandleGoogleDriveDestinations />
	</div>
);

export const ShowGoogleDriveDestinations = () => {
	const { data, isLoading, refetch } = api.destination.all.useQuery();
	const { data: rcloneCheck, isLoading: isCheckingRclone } =
		api.destination.checkRcloneInstalled.useQuery();
	const { mutateAsync, isLoading: isRemoving } =
		api.destination.remove.useMutation();

	const googleDriveDestinations = data?.filter(
		(d) => d.destinationType === "google-drive",
	);

	const loading = isLoading || isCheckingRclone;

	return (
		<div className="w-full">
			<Card className="h-full bg-sidebar p-2.5 rounded-xl">
				<div className="rounded-xl bg-background shadow-md">
					<CardHeader>
						<CardTitle className="text-xl flex flex-row gap-2">
							<HardDrive className="size-6 text-muted-foreground self-center" />
							Google Drive Destinations
						</CardTitle>
						<CardDescription>
							Connect your Google Drive using a service account to use
							as a backup destination.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 py-8 border-t">
						{loading ? (
							<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
								<span>Loading...</span>
								<Loader2 className="animate-spin size-4" />
							</div>
						) : !rcloneCheck?.installed ? (
							<RcloneNotInstalled />
						) : (
							<>
								{!googleDriveDestinations?.length ? (
									<GoogleDriveSetupGuide />
								) : (
									<div className="flex flex-col gap-4 min-h-[25vh]">
										<div className="flex flex-col gap-4 rounded-lg">
											{googleDriveDestinations.map((destination, index) => (
												<div
													key={destination.destinationId}
													className="flex items-center justify-between bg-sidebar p-1 w-full rounded-lg"
												>
													<div className="flex items-center justify-between p-3.5 rounded-lg bg-background border w-full">
														<div className="flex flex-col gap-1">
															<span className="text-sm">
																{index + 1}. {destination.name}
															</span>
															<span className="text-xs text-muted-foreground">
																Created at:{" "}
																{new Date(
																	destination.createdAt,
																).toLocaleDateString()}
															</span>
														</div>
														<div className="flex flex-row gap-1">
															<HandleGoogleDriveDestinations
																destinationId={destination.destinationId}
															/>
															<DialogAction
																title="Delete Destination"
																description="Are you sure you want to delete this destination?"
																type="destructive"
																onClick={async () => {
																	await mutateAsync({
																		destinationId: destination.destinationId,
																	})
																		.then(() => {
																			toast.success(
																				"Destination deleted successfully",
																			);
																			refetch();
																		})
																		.catch(() => {
																			toast.error("Error deleting destination");
																		});
																}}
															>
																<Button
																	variant="ghost"
																	size="icon"
																	className="group hover:bg-red-500/10"
																	isLoading={isRemoving}
																>
																	<Trash2 className="size-4 text-primary group-hover:text-red-500" />
																</Button>
															</DialogAction>
														</div>
													</div>
												</div>
											))}
										</div>

										<div className="flex flex-row gap-2 flex-wrap w-full justify-end mr-4">
											<HandleGoogleDriveDestinations />
										</div>
									</div>
								)}
							</>
						)}
					</CardContent>
				</div>
			</Card>
		</div>
	);
};
