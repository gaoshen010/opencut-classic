"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useEditor } from "@/editor/use-editor";
import { useRemoteMaterials } from "@/media/use-remote-materials";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/ui";
import type { RemoteMaterial } from "@/services/storage/remote-types";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	CloudUploadIcon,
	GridViewIcon,
	LeftToRightListDashIcon,
	Image02Icon,
	MusicNote03Icon,
	Video01Icon,
	Loading02Icon,
	ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

/**
 * RemoteMaterialLibrary shows server-side materials that can be
 * added to the current project. It provides:
 * - Type filter tabs (All / Video / Image / Audio)
 * - Grid/list view toggle
 * - Upload to server button
 * - Add to project on click
 */
export function RemoteMaterialLibrary() {
	const t = useT();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	const {
		materials,
		isLoading,
		error,
		pagination,
		typeFilter,
		setTypeFilter,
		loadNextPage,
		refresh,
		deleteMaterial,
	} = useRemoteMaterials();

	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

	// Load materials on mount
	useEffect(() => {
		refresh();
	}, [refresh]);

	const handleAddToProject = async (material: RemoteMaterial) => {
		if (!activeProject) {
			toast.error("请先打开一个项目");
			return;
		}

		setAddingIds((prev) => new Set(prev).add(material.id));

		try {
			const asset = await editor.media.addRemoteMaterialToProject({
				projectId: activeProject.metadata.id,
				material,
			});

			if (asset) {
				toast.success(`已添加: ${material.filename}`);
			}
		} catch (err) {
			toast.error("添加素材失败");
		} finally {
			setAddingIds((prev) => {
				const next = new Set(prev);
				next.delete(material.id);
				return next;
			});
		}
	};

	const handleDelete = async (id: string, filename: string) => {
		try {
			await deleteMaterial(id);
			toast.success(`已删除: ${filename}`);
		} catch {
			toast.error("删除失败");
		}
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const formatDuration = (seconds: number) => {
		const min = Math.floor(seconds / 60);
		const sec = Math.floor(seconds % 60);
		return `${min}:${sec.toString().padStart(2, "0")}`;
	};

	const isGrid = viewMode === "grid";

	return (
		<div className="flex h-full flex-col">
			{/* Type filter tabs */}
			<div className="flex items-center gap-1 border-b px-2 py-1.5">
				{(
					[
						{ key: "all", label: "全部" },
						{ key: "video", label: "视频" },
						{ key: "image", label: "图片" },
						{ key: "audio", label: "音频" },
					] as const
				).map(({ key, label }) => (
					<Button
						key={key}
						variant={typeFilter === key ? "default" : "ghost"}
						size="sm"
						className="h-6 px-2 text-xs"
						onClick={() => setTypeFilter(key)}
					>
						{label}
					</Button>
				))}

				<div className="flex-1" />

				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-6"
								onClick={() =>
									setViewMode(isGrid ? "list" : "grid")
								}
							>
								<HugeiconsIcon
									icon={
										isGrid
											? LeftToRightListDashIcon
											: GridViewIcon
									}
									className="size-3.5"
								/>
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{isGrid ? "列表视图" : "网格视图"}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-2">
				{error && (
					<div className="text-destructive py-4 text-center text-sm">
						{error}
						<Button
							variant="link"
							size="sm"
							onClick={refresh}
							className="ml-1"
						>
							重试
						</Button>
					</div>
				)}

				{!error && materials.length === 0 && !isLoading && (
					<div className="text-muted-foreground py-8 text-center text-sm">
						暂无云端素材
						<br />
						<span className="text-xs">上传素材后可在此处使用</span>
					</div>
				)}

				{isGrid ? (
					<div
						className="grid gap-2"
						style={{
							gridTemplateColumns: "repeat(auto-fill, 6rem)",
						}}
					>
						{materials.map((material) => {
							const isAdding = addingIds.has(material.id);
							return (
								<button
									key={material.id}
									className={cn(
										"group relative aspect-video overflow-hidden rounded border bg-muted transition-colors",
										"hover:border-primary hover:ring-1 hover:ring-primary/30",
										isAdding && "opacity-50",
									)}
									onClick={() =>
										handleAddToProject(material)
									}
									disabled={isAdding}
									title={`点击添加到项目: ${material.filename}`}
								>
									<RemoteMaterialThumbnail
										material={material}
									/>
									{material.duration && (
										<div className="absolute right-0.5 bottom-0.5 rounded bg-black/70 px-0.5 text-[10px] text-white">
											{formatDuration(material.duration)}
										</div>
									)}
									{isAdding && (
										<div className="absolute inset-0 flex items-center justify-center bg-black/40">
											<HugeiconsIcon
												icon={Loading02Icon}
												className="size-4 animate-spin text-white"
											/>
										</div>
									)}
									<div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/60 to-transparent p-1 group-hover:block">
										<span className="block truncate text-[10px] text-white">
											{material.filename}
										</span>
									</div>
								</button>
							);
						})}
					</div>
				) : (
					<div className="flex flex-col gap-1">
						{materials.map((material) => {
							const isAdding = addingIds.has(material.id);
							return (
								<button
									key={material.id}
									className={cn(
										"flex items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors",
										"hover:border-primary hover:bg-accent",
										isAdding && "opacity-50",
									)}
									onClick={() =>
										handleAddToProject(material)
									}
									disabled={isAdding}
								>
									<div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
										<RemoteMaterialIcon
											type={material.mimeType}
										/>
									</div>
									<div className="min-w-0 flex-1">
										<div className="truncate text-xs font-medium">
											{material.filename}
										</div>
										<div className="text-muted-foreground text-[10px]">
											{formatSize(material.size)}
											{material.duration
												? ` · ${formatDuration(material.duration)}`
												: ""}
											{material.width && material.height
												? ` · ${material.width}x${material.height}`
												: ""}
										</div>
									</div>
									{isAdding ? (
										<HugeiconsIcon
											icon={Loading02Icon}
											className="size-3.5 shrink-0 animate-spin"
										/>
									) : (
										<HugeiconsIcon
											icon={ArrowRight01Icon}
											className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
										/>
									)}
								</button>
							);
						})}
					</div>
				)}

				{/* Load more */}
				{pagination &&
					pagination.page < pagination.totalPages && (
						<div className="mt-3 flex justify-center">
							<Button
								variant="outline"
								size="sm"
								onClick={loadNextPage}
								disabled={isLoading}
								className="text-xs"
							>
								{isLoading ? "加载中..." : "加载更多"}
							</Button>
						</div>
					)}

				{isLoading && materials.length === 0 && (
					<div className="flex items-center justify-center py-8">
						<HugeiconsIcon
							icon={Loading02Icon}
							className="text-muted-foreground size-5 animate-spin"
						/>
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Thumbnail component for remote materials.
 * Shows a placeholder icon if no thumbnail key is available.
 */
function RemoteMaterialThumbnail({
	material,
}: {
	material: RemoteMaterial;
}) {
	// For now, show a type-based placeholder since thumbnail URLs
	// require a server round-trip. In production, thumbnailKey would
	// be populated and we'd use a presigned URL.
	return (
		<div className="flex size-full items-center justify-center">
			<RemoteMaterialIcon type={material.mimeType} />
		</div>
	);
}

function RemoteMaterialIcon({ type }: { type: string }) {
	const icon = type.startsWith("image/")
		? Image02Icon
		: type.startsWith("video/")
			? Video01Icon
			: MusicNote03Icon;

	return (
		<HugeiconsIcon
			icon={icon}
			className="text-muted-foreground size-4"
		/>
	);
}
