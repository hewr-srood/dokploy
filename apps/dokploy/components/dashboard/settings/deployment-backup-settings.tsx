import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import {
	CheckIcon,
	ChevronsUpDown,
	InfoIcon,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
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
	deployBackupId: z.string().optional(),
	deployVolumeBackupId: z.string().optional(),
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

	const { data: backups, isLoading: isLoadingBackups } =
		serviceType === "application"
			? api.backup.allByApplication.useQuery(
					{ applicationId: serviceId },
					{ enabled: !!serviceId },
				)
			: api.backup.allByCompose.useQuery(
					{ composeId: serviceId },
					{ enabled: !!serviceId },
				);

	const { data: volumeBackups, isLoading: isLoadingVolumeBackups } =
		serviceType === "application"
			? api.volumeBackup.allByApplication.useQuery(
					{ applicationId: serviceId },
					{ enabled: !!serviceId },
				)
			: api.volumeBackup.allByCompose.useQuery(
					{ composeId: serviceId },
					{ enabled: !!serviceId },
				);

	const form = useForm({
		defaultValues: {
			deployBackupEnabled: false,
			deployBackupId: undefined,
			deployVolumeBackupId: undefined,
		},
		resolver: zodResolver(Schema),
	});

	useEffect(() => {
		if (service) {
			form.reset({
				deployBackupEnabled: service.deployBackupEnabled || false,
				deployBackupId: service.deployBackupId || undefined,
				deployVolumeBackupId: service.deployVolumeBackupId || undefined,
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
				deployBackupId: data.deployBackupId || null,
				deployVolumeBackupId: data.deployVolumeBackupId || null,
			} as any);

			toast.success("Deployment backup settings updated");
			await refetch();
		} catch (error) {
			toast.error("Error updating deployment backup settings");
		}
	};

	const watchEnabled = form.watch("deployBackupEnabled");

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
										When enabled, a backup will be automatically triggered before
										each deployment using the selected backup configuration.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<FormDescription>
						Automatically create a backup before deploying this service
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
									Run a backup before each deployment
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
						{backups && backups.length > 0 && (
							<FormField
								control={form.control}
								name="deployBackupId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Database Backup</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"w-full justify-between",
															!field.value && "text-muted-foreground",
														)}
													>
														{isLoadingBackups
															? "Loading..."
															: field.value
																? backups?.find(
																		(backup) => backup.backupId === field.value,
																	)?.prefix ||
																	backups?.find(
																		(backup) => backup.backupId === field.value,
																	)?.database
																: "Select Database Backup"}
														<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="p-0" align="start">
												<Command>
													<CommandInput
														placeholder="Search backup..."
														className="h-9"
													/>
													<CommandEmpty>No backups found.</CommandEmpty>
													<ScrollArea className="h-64">
														<CommandGroup>
															<CommandItem
																onSelect={() => {
																	form.setValue("deployBackupId", undefined);
																}}
															>
																None
																<CheckIcon
																	className={cn(
																		"ml-auto h-4 w-4",
																		!field.value ? "opacity-100" : "opacity-0",
																	)}
																/>
															</CommandItem>
															{backups?.map((backup) => (
																<CommandItem
																	value={backup.backupId}
																	key={backup.backupId}
																	onSelect={() => {
																		form.setValue(
																			"deployBackupId",
																			backup.backupId,
																		);
																	}}
																>
																	{backup.prefix || backup.database} ({backup.database})
																	<CheckIcon
																		className={cn(
																			"ml-auto h-4 w-4",
																			backup.backupId === field.value
																				? "opacity-100"
																				: "opacity-0",
																		)}
																	/>
																</CommandItem>
															))}
														</CommandGroup>
													</ScrollArea>
												</Command>
											</PopoverContent>
										</Popover>
										<FormDescription>
											Select which database backup configuration to use
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{volumeBackups && volumeBackups.length > 0 && (
							<FormField
								control={form.control}
								name="deployVolumeBackupId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Volume Backup</FormLabel>
										<Popover>
											<PopoverTrigger asChild>
												<FormControl>
													<Button
														variant="outline"
														className={cn(
															"w-full justify-between",
															!field.value && "text-muted-foreground",
														)}
													>
														{isLoadingVolumeBackups
															? "Loading..."
															: field.value
																? volumeBackups?.find(
																		(backup) =>
																			backup.volumeBackupId === field.value,
																	)?.name
																: "Select Volume Backup"}
														<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
													</Button>
												</FormControl>
											</PopoverTrigger>
											<PopoverContent className="p-0" align="start">
												<Command>
													<CommandInput
														placeholder="Search volume backup..."
														className="h-9"
													/>
													<CommandEmpty>No volume backups found.</CommandEmpty>
													<ScrollArea className="h-64">
														<CommandGroup>
															<CommandItem
																onSelect={() => {
																	form.setValue(
																		"deployVolumeBackupId",
																		undefined,
																	);
																}}
															>
																None
																<CheckIcon
																	className={cn(
																		"ml-auto h-4 w-4",
																		!field.value ? "opacity-100" : "opacity-0",
																	)}
																/>
															</CommandItem>
															{volumeBackups?.map((backup) => (
																<CommandItem
																	value={backup.volumeBackupId}
																	key={backup.volumeBackupId}
																	onSelect={() => {
																		form.setValue(
																			"deployVolumeBackupId",
																			backup.volumeBackupId,
																		);
																	}}
																>
																	{backup.name} ({backup.volumeName})
																	<CheckIcon
																		className={cn(
																			"ml-auto h-4 w-4",
																			backup.volumeBackupId === field.value
																				? "opacity-100"
																				: "opacity-0",
																		)}
																	/>
																</CommandItem>
															))}
														</CommandGroup>
													</ScrollArea>
												</Command>
											</PopoverContent>
										</Popover>
										<FormDescription>
											Select which volume backup configuration to use
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{(!backups || backups.length === 0) &&
							(!volumeBackups || volumeBackups.length === 0) && (
								<div className="text-sm text-muted-foreground border rounded-lg p-4 bg-muted/50">
									No backup configurations found. Create a database backup or
									volume backup first to enable backup on deploy.
								</div>
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
