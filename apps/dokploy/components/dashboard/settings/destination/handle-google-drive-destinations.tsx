import { zodResolver } from "@hookform/resolvers/zod";
import { PenBoxIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";

const addGoogleDriveDestination = z.object({
	name: z.string().min(1, "Name is required"),
	serviceAccountJSON: z.string().min(1, "Service Account JSON is required"),
	googleDriveFolderId: z.string().min(1, "Folder ID is required — service accounts cannot store files without a shared folder"),
});

type AddGoogleDriveDestination = z.infer<typeof addGoogleDriveDestination>;

interface Props {
	destinationId?: string;
}

export const HandleGoogleDriveDestinations = ({ destinationId }: Props) => {
	const [open, setOpen] = useState(false);
	const utils = api.useUtils();

	const { mutateAsync: createMutation, isError: isCreateError, error: createError, isLoading: isCreateLoading } =
		api.destination.createGoogleDrive.useMutation();

	const { mutateAsync: updateMutation, isError: isUpdateError, error: updateError, isLoading: isUpdateLoading } =
		api.destination.updateGoogleDrive.useMutation();

	const mutateAsync = destinationId ? updateMutation : createMutation;
	const isError = destinationId ? isUpdateError : isCreateError;
	const error = destinationId ? updateError : createError;
	const isLoading = destinationId ? isUpdateLoading : isCreateLoading;

	const { data: destination } = api.destination.one.useQuery(
		{
			destinationId: destinationId || "",
		},
		{
			enabled: !!destinationId,
			refetchOnWindowFocus: false,
		},
	);

	const {
		mutateAsync: testConnection,
		isLoading: isLoadingConnection,
		error: connectionError,
		isError: isErrorConnection,
	} = api.destination.testGoogleDriveConnection.useMutation();

	const form = useForm<AddGoogleDriveDestination>({
		defaultValues: {
			name: "",
			serviceAccountJSON: "",
			googleDriveFolderId: "",
		},
		resolver: zodResolver(addGoogleDriveDestination),
	});

	useEffect(() => {
		if (destination && destination.destinationType === "google-drive") {
			form.reset({
				name: destination.name,
				serviceAccountJSON: destination.serviceAccountJSON || "",
				googleDriveFolderId: destination.googleDriveFolderId || "",
			});
		} else {
			form.reset();
		}
	}, [form, form.reset, form.formState.isSubmitSuccessful, destination]);

	const onSubmit = async (data: AddGoogleDriveDestination) => {
		await mutateAsync({
			name: data.name,
			serviceAccountJSON: data.serviceAccountJSON,
			googleDriveFolderId: data.googleDriveFolderId,
			destinationId: destinationId || "",
		})
			.then(async () => {
				toast.success(
					`Google Drive destination ${destinationId ? "updated" : "created"}`,
				);
				await utils.destination.all.invalidate();
				if (destinationId) {
					await utils.destination.one.invalidate({ destinationId });
				}
				setOpen(false);
			})
			.catch(() => {
				toast.error(
					`Error ${destinationId ? "updating" : "creating"} the destination`,
				);
			});
	};

	const handleTestConnection = async () => {
		const result = await form.trigger(["serviceAccountJSON", "googleDriveFolderId"]);
		if (!result) {
			toast.error("Please provide the Service Account JSON and Folder ID");
			return;
		}

		await testConnection({
			name: "Test",
			serviceAccountJSON: form.getValues("serviceAccountJSON"),
			googleDriveFolderId: form.getValues("googleDriveFolderId"),
		})
			.then(() => {
				toast.success("Connection Success");
			})
			.catch((e) => {
				toast.error("Error connecting to Google Drive", {
					description: e.message,
				});
			});
	};

	const validateJSON = (value: string) => {
		try {
			const parsed = JSON.parse(value);
			if (!parsed.type || parsed.type !== "service_account") {
				return false;
			}
			return true;
		} catch {
			return false;
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{destinationId ? (
					<Button
						variant="ghost"
						size="icon"
						className="group hover:bg-blue-500/10"
					>
						<PenBoxIcon className="size-3.5 text-primary group-hover:text-blue-500" />
					</Button>
				) : (
					<Button className="cursor-pointer space-x-3">
						<PlusIcon className="h-4 w-4" />
						Add Google Drive
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{destinationId ? "Update" : "Add"} Google Drive Destination
					</DialogTitle>
					<DialogDescription>
						Connect your Google Drive using a service account. You'll need to
						create a service account in Google Cloud Console, enable the Drive
						API, and share a folder with the service account email.
					</DialogDescription>
				</DialogHeader>
				{(isError || isErrorConnection) && (
					<AlertBlock type="error" className="w-full">
						{connectionError?.message || error?.message}
					</AlertBlock>
				)}

				<Form {...form}>
					<form
						id="hook-form-gdrive-destination-add"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="My Google Drive Backup" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="serviceAccountJSON"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Service Account JSON</FormLabel>
									<FormControl>
										<Textarea
											placeholder='Paste the full JSON key file contents here...'
											className="min-h-[120px] font-mono text-xs"
											{...field}
											onChange={(e) => {
												field.onChange(e);
												if (e.target.value && !validateJSON(e.target.value)) {
													form.setError("serviceAccountJSON", {
														message:
															'Invalid JSON or not a service account key (must have "type": "service_account")',
													});
												} else {
													form.clearErrors("serviceAccountJSON");
												}
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="googleDriveFolderId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Folder ID</FormLabel>
									<FormControl>
										<Input
											placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2wtIs"
											{...field}
										/>
									</FormControl>
									<p className="text-xs text-muted-foreground">
										Create a folder in Google Drive, share it with your service
										account email (Editor access), then copy the ID from the
										URL: drive.google.com/drive/folders/<b>THIS_PART</b>
									</p>
									<FormMessage />
								</FormItem>
							)}
						/>
					</form>

					<DialogFooter className="flex w-full !justify-between gap-4">
						<Button
							isLoading={isLoadingConnection}
							type="button"
							variant="secondary"
							onClick={handleTestConnection}
						>
							Test connection
						</Button>

						<Button
							isLoading={isLoading}
							form="hook-form-gdrive-destination-add"
							type="submit"
						>
							{destinationId ? "Update" : "Create"}
						</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
