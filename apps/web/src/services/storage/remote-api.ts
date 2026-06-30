import type {
	MaterialListResponse,
	MaterialUrlResponse,
	UploadInitResponse,
	UploadChunkResponse,
	UploadCompleteResponse,
	ClientMediaMetadata,
	RemoteMaterial,
} from "./remote-types";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

/**
 * Client-side API for interacting with server-side materials.
 * All methods call the Next.js API routes under /api/materials.
 */
class MaterialApiClient {
	private baseUrl = "/api/materials";

	/**
	 * List materials with optional type filter and pagination.
	 */
	async list({
		type = "all",
		page = 1,
		pageSize = 20,
	}: {
		type?: "image" | "video" | "audio" | "all";
		page?: number;
		pageSize?: number;
	} = {}): Promise<MaterialListResponse> {
		const params = new URLSearchParams({
			type,
			page: String(page),
			pageSize: String(pageSize),
		});
		const res = await fetch(`${this.baseUrl}?${params}`);
		if (!res.ok) {
			throw new Error(`Failed to list materials: ${res.status} ${res.statusText}`);
		}
		return res.json();
	}

	/**
	 * Get a single material by ID.
	 */
	async get(id: string): Promise<RemoteMaterial> {
		const res = await fetch(`${this.baseUrl}/${id}`);
		if (!res.ok) {
			throw new Error(`Material not found: ${id}`);
		}
		const data = await res.json();
		return data.material;
	}

	/**
	 * Get a presigned download URL for a material.
	 */
	async getUrl(
		id: string,
		purpose: "download" | "preview" | "thumbnail" = "download",
	): Promise<MaterialUrlResponse> {
		const params = new URLSearchParams({ purpose });
		const res = await fetch(`${this.baseUrl}/${id}/url?${params}`);
		if (!res.ok) {
			throw new Error(`Failed to get URL for material: ${id}`);
		}
		return res.json();
	}

	/**
	 * Download a material as a Blob.
	 * Fetches the signed URL, then downloads the file.
	 */
	async downloadBlob(
		id: string,
		purpose: "download" | "preview" | "thumbnail" = "download",
	): Promise<Blob> {
		const { url } = await this.getUrl(id, purpose);
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Failed to download material: ${res.status}`);
		}
		return res.blob();
	}

	/**
	 * Download a material as a File object.
	 */
	async downloadFile(
		id: string,
		filename: string,
		purpose: "download" | "preview" | "thumbnail" = "download",
	): Promise<File> {
		const blob = await this.downloadBlob(id, purpose);
		return new File([blob], filename, { type: blob.type });
	}

	/**
	 * Delete a material.
	 */
	async delete(id: string): Promise<void> {
		const res = await fetch(`${this.baseUrl}/${id}`, { method: "DELETE" });
		if (!res.ok) {
			throw new Error(`Failed to delete material: ${id}`);
		}
	}

	/**
	 * Upload a file using chunked upload.
	 *
	 * @param file - The file to upload
	 * @param metadata - Optional client-side extracted metadata
	 * @param onProgress - Progress callback (0-100)
	 * @returns The created material record
	 */
	async upload(
		file: File,
		metadata?: ClientMediaMetadata,
		onProgress?: (progress: number) => void,
	): Promise<RemoteMaterial> {
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

		// 1. Initialize upload
		const initRes = await fetch(`${this.baseUrl}/upload/init`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				filename: file.name,
				mimeType: file.type,
				size: file.size,
				totalChunks,
			}),
		});

		if (!initRes.ok) {
			const err = await initRes.json().catch(() => ({}));
			throw new Error(err.error ?? "Failed to initialize upload");
		}

		const init: UploadInitResponse = await initRes.json();
		const { uploadId, minioUploadId } = init;

		// 2. Upload chunks
		const parts: { ETag: string; PartNumber: number }[] = [];

		for (let i = 0; i < totalChunks; i++) {
			const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
			const formData = new FormData();
			formData.append("uploadId", uploadId);
			formData.append("minioUploadId", minioUploadId);
			formData.append("chunkIndex", String(i));
			formData.append("chunk", chunk);

			const chunkRes = await fetch(`${this.baseUrl}/upload/chunk`, {
				method: "POST",
				body: formData,
			});

			if (!chunkRes.ok) {
				const err = await chunkRes.json().catch(() => ({}));
				throw new Error(err.error ?? `Failed to upload chunk ${i}`);
			}

			const chunkData: UploadChunkResponse = await chunkRes.json();
			parts.push({
				ETag: chunkData.etag,
				PartNumber: i + 1, // MinIO uses 1-based part numbers
			});

			onProgress?.(Math.round(((i + 1) / totalChunks) * 90)); // 0-90% for upload
		}

		// 3. Complete upload
		const completeRes = await fetch(`${this.baseUrl}/upload/complete`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				uploadId,
				minioUploadId,
				parts,
				metadata,
			}),
		});

		if (!completeRes.ok) {
			const err = await completeRes.json().catch(() => ({}));
			throw new Error(err.error ?? "Failed to complete upload");
		}

		onProgress?.(100);

		const completeData: UploadCompleteResponse = await completeRes.json();
		return completeData.material;
	}
}

export const materialApi = new MaterialApiClient();
