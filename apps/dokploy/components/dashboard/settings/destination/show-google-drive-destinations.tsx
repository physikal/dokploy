import { FolderUp, HardDrive, Loader2, Trash2 } from "lucide-react";
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

export const ShowGoogleDriveDestinations = () => {
	const { data, isLoading, refetch } = api.destination.all.useQuery();
	const { mutateAsync, isLoading: isRemoving } =
		api.destination.remove.useMutation();

	const googleDriveDestinations = data?.filter(
		(d) => d.destinationType === "google-drive",
	);

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
						{isLoading ? (
							<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
								<span>Loading...</span>
								<Loader2 className="animate-spin size-4" />
							</div>
						) : (
							<>
								{!googleDriveDestinations?.length ? (
									<div className="flex flex-col items-center gap-3 min-h-[25vh] justify-center">
										<FolderUp className="size-8 self-center text-muted-foreground" />
										<span className="text-base text-muted-foreground text-center max-w-md">
											Connect a Google Drive service account to use it as a
											backup destination.
										</span>
										<HandleGoogleDriveDestinations />
									</div>
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
