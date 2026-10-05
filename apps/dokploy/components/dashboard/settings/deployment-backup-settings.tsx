import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { CheckIcon, ChevronsUpDown, InfoIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

const Schema = z.object({
	deployBackupEnabled: z.boolean(),
	deployBackupIds: z.array(z.string()).optional(),
	deployVolumeBackupIds: z.array(z.string()).optional(),
});

interface Props {
	serviceId: string;
	serviceType: "application" | "compose";
}

export const DeploymentBackupSettings = ({
	serviceId,
	serviceType,
}: Props) => {
	const { data: service, refetch } =
		serviceType === "application"
			? api.application.one.useQuery({ applicationId: serviceId })
			: api.compose.one.useQuery({ composeId: serviceId });

	const { mutateAsync: updateApplication } =
		api.application.update.useMutation();
	const { mutateAsync: updateCompose } = api.compose.update.useMutation();

	const { data: backups, isLoading: isLoadingBackups, refetch: refetchBackups } =
		api.backup.allByCompose.useQuery(
			{ composeId: serviceId },
			{ enabled: serviceType === "compose" && !!serviceId },
		);

	const { data: volumeBackups, isLoading: isLoadingVolumeBackups, refetch: refetchVolumeBackups } =
		serviceType === "application"
			? api.volumeBackups.allByApplication.useQuery(
					{ applicationId: serviceId },
					{ enabled: !!serviceId },
				)
			: api.volumeBackups.allByCompose.useQuery(
					{ composeId: serviceId },
					{ enabled: !!serviceId },
				);

	const hasDeployments =
		service && service.deployments && service.deployments.length > 0;

	if (!hasDeployments) {
		return null;
	}

	const [databaseBackupOpen, setDatabaseBackupOpen] = useState(false);
	const [volumeBackupOpen, setVolumeBackupOpen] = useState(false);

	const form = useForm({
		defaultValues: {
			deployBackupEnabled: false,
			deployBackupIds: [] as string[],
			deployVolumeBackupIds: [] as string[],
		},
		resolver: zodResolver(Schema),
	});

	useEffect(() => {
		if (service) {
			const validBackupIds =
				service.deployBackupIds?.filter((id: string | null) => id !== null) ||
				[];
			const validVolumeBackupIds =
				service.deployVolumeBackupIds?.filter(
					(id: string | null) => id !== null,
				) || [];

			form.reset({
				deployBackupEnabled: service.deployBackupEnabled || false,
				deployBackupIds: validBackupIds,
				deployVolumeBackupIds: validVolumeBackupIds,
			});
		}
	}, [service, form.reset]);

	const onSubmit = async (data: z.infer<typeof Schema>) => {
		try {
			const updateFn =
				serviceType === "application" ? updateApplication : updateCompose;
			const idField =
				serviceType === "application" ? "applicationId" : "composeId";

			await updateFn({
				[idField]: serviceId,
				deployBackupEnabled: data.deployBackupEnabled,
				deployBackupIds: data.deployBackupIds || [],
				deployVolumeBackupIds: data.deployVolumeBackupIds || [],
			} as any);

			toast.success("Deployment backup settings updated");
			await refetch();
		} catch (error) {
			toast.error("Error updating deployment backup settings");
		}
	};

	const watchEnabled = form.watch("deployBackupEnabled");
	const watchBackupIds = form.watch("deployBackupIds") || [];
	const watchVolumeBackupIds = form.watch("deployVolumeBackupIds") || [];

	const hasBackups =
		(serviceType === "compose" && backups && backups.length > 0) ||
		(volumeBackups && volumeBackups.length > 0);

	const backupsPath =
		serviceType === "application"
			? `/dashboard/project/${service?.environment?.projectId}/services/application/${serviceId}?tab=backups`
			: `/dashboard/project/${service?.environment?.projectId}/services/compose/${serviceId}?tab=backups`;

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="grid w-full gap-4 border rounded-lg p-4"
			>
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<h3 className="text-lg font-semibold">Backup on Deploy</h3>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<InfoIcon className="size-4 text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent className="max-w-sm">
									<p>
										When enabled, selected backups will be automatically triggered
										before each deployment. If any backup fails, the deployment
										will be aborted.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<FormDescription>
						Automatically create backups before deploying this service
					</FormDescription>
				</div>

				<FormField
					control={form.control}
					name="deployBackupEnabled"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
							<div className="space-y-0.5">
								<FormLabel>Enable Backup on Deploy</FormLabel>
								<FormDescription>
									Run backups before each deployment
								</FormDescription>
							</div>
							<FormControl>
								<Switch
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
						</FormItem>
					)}
				/>

				{watchEnabled && (
					<>
						{!hasBackups ? (
							<div className="flex flex-col items-center gap-3 min-h-[15vh] justify-center border rounded-lg p-6">
								<InfoIcon className="size-8 text-muted-foreground" />
								<span className="text-base text-muted-foreground text-center">
									To enable Backup on Deploy, you need to create a backup
									configuration first. Please, go to{" "}
									<Link href={backupsPath} className="text-foreground">
										Backups
									</Link>{" "}
									to do so.
								</span>
							</div>
						) : (
							<>
								{serviceType === "compose" && backups && backups.length > 0 && (
									<FormField
										control={form.control}
										name="deployBackupIds"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Database Backups</FormLabel>
												<Popover
													open={databaseBackupOpen}
													onOpenChange={setDatabaseBackupOpen}
												>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																variant="outline"
																className={cn(
																	"w-full justify-between",
																	(!field.value || field.value.length === 0) &&
																		"text-muted-foreground",
																)}
															>
																{isLoadingBackups
																	? "Loading..."
																	: field.value && field.value.length > 0
																		? `${field.value.length} backup${field.value.length > 1 ? "s" : ""} selected`
																		: "Select Database Backups"}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent className="p-0" align="start">
														<Command>
															<CommandInput
																placeholder="Search backups..."
																className="h-9"
															/>
															<CommandEmpty>No backups found.</CommandEmpty>
															<CommandList>
																<ScrollArea className="h-64">
																	<CommandGroup>
																		{backups?.map((backup: any) => {
																			const isSelected =
																				field.value?.includes(backup.backupId) ||
																				false;
																			return (
																				<CommandItem
																					key={backup.backupId}
																					onSelect={() => {
																						const currentValue = field.value || [];
																						const newValue = isSelected
																							? currentValue.filter(
																									(id: string) =>
																										id !== backup.backupId,
																								)
																							: [...currentValue, backup.backupId];
																						field.onChange(newValue);
																					}}
																				>
																					<Checkbox
																						checked={isSelected}
																						className="mr-2"
																					/>
																					{backup.prefix || backup.database} (
																					{backup.database})
																					<CheckIcon
																						className={cn(
																							"ml-auto h-4 w-4",
																							isSelected ? "opacity-100" : "opacity-0",
																						)}
																					/>
																				</CommandItem>
																			);
																		})}
																	</CommandGroup>
																</ScrollArea>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>
												<FormDescription>
													Select which database backups to run before deployment
												</FormDescription>
												{watchBackupIds.length > 0 && (
													<div className="flex flex-wrap gap-2 mt-2">
														{watchBackupIds.map((backupId: string) => {
															const backup = backups?.find(
																(b: any) => b.backupId === backupId,
															);
															if (!backup) return null;
															return (
																<div
																	key={backupId}
																	className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
																>
																	{backup.prefix || backup.database}
																	<button
																		type="button"
																		onClick={() => {
																			const newValue = watchBackupIds.filter(
																				(id: string) => id !== backupId,
																			);
																			form.setValue("deployBackupIds", newValue);
																		}}
																		className="ml-1 text-muted-foreground hover:text-foreground"
																	>
																		×
																	</button>
																</div>
															);
														})}
													</div>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>
								)}

								{volumeBackups && volumeBackups.length > 0 && (
									<FormField
										control={form.control}
										name="deployVolumeBackupIds"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Volume Backups</FormLabel>
												<Popover
													open={volumeBackupOpen}
													onOpenChange={setVolumeBackupOpen}
												>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																variant="outline"
																className={cn(
																	"w-full justify-between",
																	(!field.value || field.value.length === 0) &&
																		"text-muted-foreground",
																)}
															>
																{isLoadingVolumeBackups
																	? "Loading..."
																	: field.value && field.value.length > 0
																		? `${field.value.length} backup${field.value.length > 1 ? "s" : ""} selected`
																		: "Select Volume Backups"}
																<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent className="p-0" align="start">
														<Command>
															<CommandInput
																placeholder="Search volume backups..."
																className="h-9"
															/>
															<CommandEmpty>No volume backups found.</CommandEmpty>
															<CommandList>
																<ScrollArea className="h-64">
																	<CommandGroup>
																		{volumeBackups?.map((backup: any) => {
																			const isSelected =
																				field.value?.includes(
																					backup.volumeBackupId,
																				) || false;
																			return (
																				<CommandItem
																					key={backup.volumeBackupId}
																					onSelect={() => {
																						const currentValue = field.value || [];
																						const newValue = isSelected
																							? currentValue.filter(
																									(id: string) =>
																										id !== backup.volumeBackupId,
																								)
																							: [
																									...currentValue,
																									backup.volumeBackupId,
																								];
																						field.onChange(newValue);
																					}}
																				>
																					<Checkbox
																						checked={isSelected}
																						className="mr-2"
																					/>
																					{backup.name} ({backup.volumeName})
																					<CheckIcon
																						className={cn(
																							"ml-auto h-4 w-4",
																							isSelected ? "opacity-100" : "opacity-0",
																						)}
																					/>
																				</CommandItem>
																			);
																		})}
																	</CommandGroup>
																</ScrollArea>
															</CommandList>
														</Command>
													</PopoverContent>
												</Popover>
												<FormDescription>
													Select which volume backups to run before deployment
												</FormDescription>
												{watchVolumeBackupIds.length > 0 && (
													<div className="flex flex-wrap gap-2 mt-2">
														{watchVolumeBackupIds.map((backupId: string) => {
															const backup = volumeBackups?.find(
																(b: any) => b.volumeBackupId === backupId,
															);
															if (!backup) return null;
															return (
																<div
																	key={backupId}
																	className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm"
																>
																	{backup.name}
																	<button
																		type="button"
																		onClick={() => {
																			const newValue = watchVolumeBackupIds.filter(
																				(id: string) => id !== backupId,
																			);
																			form.setValue(
																				"deployVolumeBackupIds",
																				newValue,
																			);
																		}}
																		className="ml-1 text-muted-foreground hover:text-foreground"
																	>
																		×
																	</button>
																</div>
															);
														})}
													</div>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
							</>
						)}
					</>
				)}

				<Button type="submit" className="w-full">
					Save Settings
				</Button>
			</form>
		</Form>
	);
};
