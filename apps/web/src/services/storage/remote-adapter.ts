import type { StorageAdapter, MediaAssetData } from "./types";
import { materialApi } from "./remote-api";
import { mediaTypeFromMime } from "./remote-types";
import type { RemoteMaterial } from "./remote-types";

/**
 * RemoteMaterialAdapter implements StorageAdapter<MediaAssetData> by delegating
 * to the server-side materials API. This allows the existing StorageService
 * to transparently switch between local (IndexedDB/OPFS) and remote storage.
 *
 * For metadata operations, this adapter calls the REST API.
 * For file blobs, it downloads from MinIO via presigned URLs.
 *
 * Local IndexedDB is used as a cache layer to avoid redundant downloads.
 */
export class RemoteMaterialAdapter implements StorageAdapter<MediaAssetData> {
	private cacheAdapter: StorageAdapter<MediaAssetData> | null = null;

	/**
	 * Set a local cache adapter for offline/fast access.
	 */
	setCacheAdapter(adapter: StorageAdapter<MediaAssetData>): void {
		this.cacheAdapter = adapter;
	}

	async get(key: string): Promise<MediaAssetData | null> {
		// Try local cache first
		if (this.cacheAdapter) {
			const cached = await this.cacheAdapter.get(key);
			if (cached) return cached;
		}

		// Fetch from server
		try {
			const material = await materialApi.get(key);
			const data = remoteMaterialToMediaAssetData(material);

			// Update cache
			if (this.cacheAdapter) {
				await this.cacheAdapter.set({ key, value: data });
			}

			return data;
		} catch {
			return null;
		}
	}

	async set({ key, value }: { key: string; value: MediaAssetData }): Promise<void> {
		// Metadata is managed server-side; only update local cache
		if (this.cacheAdapter) {
			await this.cacheAdapter.set({ key, value });
		}
	}

	async remove(key: string): Promise<void> {
		// Delete from server
		try {
			await materialApi.delete(key);
		} catch {
			// Ignore if already deleted
		}

		// Remove from cache
		if (this.cacheAdapter) {
			await this.cacheAdapter.remove(key);
		}
	}

	async list(): Promise<string[]> {
		try {
			const result = await materialApi.list({ pageSize: 100 });
			return result.materials.map((m) => m.id);
		} catch {
			// Fallback to cache if offline
			if (this.cacheAdapter) {
				return this.cacheAdapter.list();
			}
			return [];
		}
	}

	async clear(): Promise<void> {
		if (this.cacheAdapter) {
			await this.cacheAdapter.clear();
		}
	}

	/**
	 * List all remote materials with full metadata.
	 * This is an extension beyond StorageAdapter for UI use.
	 */
	async listRemote({
		type = "all",
		page = 1,
		pageSize = 50,
	}: {
		type?: "image" | "video" | "audio" | "all";
		page?: number;
		pageSize?: number;
	} = {}) {
		return materialApi.list({ type, page, pageSize });
	}

	/**
	 * Download a material file blob from the server.
	 */
	async downloadFile(id: string, filename: string): Promise<File> {
		return materialApi.downloadFile(id, filename, "download");
	}

	/**
	 * Get a presigned URL for direct access.
	 */
	async getPresignedUrl(
		id: string,
		purpose: "download" | "preview" | "thumbnail" = "download",
	): Promise<string> {
		const result = await materialApi.getUrl(id, purpose);
		return result.url;
	}
}

/**
 * Convert a RemoteMaterial from the server API to the local MediaAssetData format.
 */
function remoteMaterialToMediaAssetData(material: RemoteMaterial): MediaAssetData {
	return {
		id: material.id,
		name: material.filename,
		type: mediaTypeFromMime(material.mimeType),
		size: material.size,
		lastModified: new Date(material.createdAt).getTime(),
		width: material.width ?? undefined,
		height: material.height ?? undefined,
		duration: material.duration ?? undefined,
		fps: material.fps ?? undefined,
		hasAudio: material.hasAudio ?? undefined,
		thumbnailUrl: undefined, // Will be generated from presigned URL when needed
	};
}
