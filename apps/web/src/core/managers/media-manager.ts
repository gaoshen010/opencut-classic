import type { EditorCore } from "@/core";
import { toast } from "sonner";
import type { MediaAsset } from "@/media/types";
import { storageService } from "@/services/storage/service";
import { generateUUID } from "@/utils/id";
import { videoCache } from "@/services/video-cache/service";
import { waveformCache } from "@/services/waveform-cache/service";
import { BatchCommand, RemoveMediaAssetCommand } from "@/commands";
import type {
	RemoteMaterial,
	ClientMediaMetadata,
} from "@/services/storage/remote-types";

export class MediaManager {
	private assets: MediaAsset[] = [];
	private isLoading = false;
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	async addMediaAsset({
		projectId,
		asset,
	}: {
		projectId: string;
		asset: Omit<MediaAsset, "id">;
	}): Promise<MediaAsset | null> {
		const newAsset: MediaAsset = {
			...asset,
			id: generateUUID(),
		};

		this.assets = [...this.assets, newAsset];
		this.notify();

		try {
			await storageService.saveMediaAsset({ projectId, mediaAsset: newAsset });
			this.editor.project.ratchetFpsForImportedMedia({
				importedAssets: [newAsset],
			});
			return newAsset;
		} catch (error) {
			console.error("Failed to save media asset:", error);
			this.assets = this.assets.filter((asset) => asset.id !== newAsset.id);
			this.notify();

			if (storageService.isQuotaExceededError({ error })) {
				toast.error("Not enough browser storage", {
					description: error instanceof Error ? error.message : undefined,
				});
			}

			return null;
		}
	}

	removeMediaAsset({ projectId, id }: { projectId: string; id: string }): void {
		this.removeMediaAssets({ projectId, ids: [id] });
	}

	removeMediaAssets({
		projectId,
		ids,
	}: {
		projectId: string;
		ids: string[];
	}): void {
		const uniqueIds = [...new Set(ids)];
		if (uniqueIds.length === 0) {
			return;
		}

		const command =
			uniqueIds.length === 1
				? new RemoveMediaAssetCommand({
						projectId,
						assetId: uniqueIds[0],
					})
				: new BatchCommand(
						uniqueIds.map((id) =>
							new RemoveMediaAssetCommand({
								projectId,
								assetId: id,
							}),
						),
					);

		this.editor.command.execute({ command });
	}

	async loadProjectMedia({ projectId }: { projectId: string }): Promise<void> {
		this.isLoading = true;
		this.notify();

		try {
			const mediaAssets = await storageService.loadAllMediaAssets({
				projectId,
			});
			this.assets = mediaAssets;
			this.notify();
		} catch (error) {
			console.error("Failed to load media assets:", error);
		} finally {
			this.isLoading = false;
			this.notify();
		}
	}

	async clearProjectMedia({ projectId }: { projectId: string }): Promise<void> {
		waveformCache.clearAll();

		this.assets.forEach((asset) => {
			if (asset.url) {
				URL.revokeObjectURL(asset.url);
			}
			if (asset.thumbnailUrl) {
				URL.revokeObjectURL(asset.thumbnailUrl);
			}
		});

		const mediaIds = this.assets.map((asset) => asset.id);
		this.assets = [];
		this.notify();

		try {
			await Promise.all(
				mediaIds.map((id) =>
					storageService.deleteMediaAsset({ projectId, id }),
				),
			);
		} catch (error) {
			console.error("Failed to clear media assets from storage:", error);
		}
	}

	clearAllAssets(): void {
		videoCache.clearAll();
		waveformCache.clearAll();

		this.assets.forEach((asset) => {
			if (asset.url) {
				URL.revokeObjectURL(asset.url);
			}
			if (asset.thumbnailUrl) {
				URL.revokeObjectURL(asset.thumbnailUrl);
			}
		});

		this.assets = [];
		this.notify();
	}

	getAssets(): MediaAsset[] {
		return this.assets;
	}

	setAssets({ assets }: { assets: MediaAsset[] }): void {
		this.assets = assets;
		this.notify();
	}

	isLoadingMedia(): boolean {
		return this.isLoading;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	// ──────────────────────────────────────────────────────
	// Remote Material Methods (Phase 2)
	// ──────────────────────────────────────────────────────

	/**
	 * Upload a file to the server and add it to the project as a media asset.
	 * The file is uploaded via chunked upload, then downloaded back to create
	 * a local blob URL for the rendering pipeline.
	 */
	async uploadToServer({
		projectId,
		file,
		metadata,
		onProgress,
	}: {
		projectId: string;
		file: File;
		metadata?: ClientMediaMetadata;
		onProgress?: (progress: number) => void;
	}): Promise<MediaAsset | null> {
		try {
			// Upload to server
			const remoteMaterial = await storageService.uploadMaterialToServer({
				file,
				metadata,
				onProgress,
			});

			// Load it back as a MediaAsset (downloads + caches locally)
			const asset = await storageService.loadRemoteMaterialAsAsset({
				material: remoteMaterial,
			});

			if (!asset) {
				toast.error("上传成功但无法加载素材");
				return null;
			}

			// Add to local project state (already uploaded to server, so skip local save)
			this.assets = [...this.assets, asset];
			this.notify();

			this.editor.project.ratchetFpsForImportedMedia({
				importedAssets: [asset],
			});

			return asset;
		} catch (error) {
			console.error("Failed to upload material to server:", error);
			toast.error("上传素材失败", {
				description:
					error instanceof Error ? error.message : "请重试",
			});
			return null;
		}
	}

	/**
	 * Load remote materials from the server (list only, no download).
	 * Returns the paginated list of RemoteMaterial records.
	 */
	async loadRemoteMaterials({
		type = "all",
		page = 1,
		pageSize = 50,
	}: {
		type?: "image" | "video" | "audio" | "all";
		page?: number;
		pageSize?: number;
	} = {}) {
		return storageService.listRemoteMaterials({ type, page, pageSize });
	}

	/**
	 * Add an existing remote material to the current project.
	 * Downloads the file from the server and creates a local MediaAsset.
	 */
	async addRemoteMaterialToProject({
		projectId,
		material,
	}: {
		projectId: string;
		material: RemoteMaterial;
	}): Promise<MediaAsset | null> {
		// Check if already loaded
		if (this.assets.some((a) => a.id === material.id)) {
			return this.assets.find((a) => a.id === material.id) ?? null;
		}

		const asset = await storageService.loadRemoteMaterialAsAsset({
			material,
		});

		if (!asset) {
			toast.error("无法加载远程素材");
			return null;
		}

		this.assets = [...this.assets, asset];
		this.notify();

		this.editor.project.ratchetFpsForImportedMedia({
			importedAssets: [asset],
		});

		return asset;
	}

	/**
	 * Remove a remote material from the server and local state.
	 */
	async removeRemoteMaterial({
		projectId,
		id,
	}: {
		projectId: string;
		id: string;
	}): Promise<void> {
		// Remove from local state
		const asset = this.assets.find((a) => a.id === id);
		if (asset) {
			if (asset.url) URL.revokeObjectURL(asset.url);
			if (asset.thumbnailUrl) URL.revokeObjectURL(asset.thumbnailUrl);
		}
		this.assets = this.assets.filter((a) => a.id !== id);
		this.notify();

		// Delete from server
		try {
			await storageService.deleteRemoteMaterial({ id });
		} catch (error) {
			console.error("Failed to delete remote material:", error);
		}
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}
