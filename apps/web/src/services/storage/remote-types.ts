import type { MediaType } from "@/media/types";

/**
 * Material metadata as returned by the server API.
 * Mirrors the `materials` database table.
 */
export interface RemoteMaterial {
	id: string;
	userId: string;
	filename: string;
	mimeType: string;
	size: number;
	width: number | null;
	height: number | null;
	duration: number | null;
	fps: number | null;
	hasAudio: boolean | null;
	thumbnailKey: string | null;
	previewKey: string | null;
	originalKey: string;
	status: "processing" | "ready" | "failed";
	createdAt: string;
	updatedAt: string;
}

/**
 * Pagination info from the server.
 */
export interface PaginationInfo {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

/**
 * Response from GET /api/materials
 */
export interface MaterialListResponse {
	materials: RemoteMaterial[];
	pagination: PaginationInfo;
}

/**
 * Response from GET /api/materials/[id]/url
 */
export interface MaterialUrlResponse {
	url: string;
	expiresIn: number;
	material: {
		id: string;
		filename: string;
		mimeType: string;
		size: number;
	};
}

/**
 * Response from POST /api/materials/upload/init
 */
export interface UploadInitResponse {
	uploadId: string;
	minioUploadId: string;
	objectKey: string;
	expiresAt: string;
}

/**
 * Response from POST /api/materials/upload/chunk
 */
export interface UploadChunkResponse {
	success: boolean;
	chunkIndex: number;
	etag: string;
	receivedChunks: number;
	totalChunks: number;
}

/**
 * Response from POST /api/materials/upload/complete
 */
export interface UploadCompleteResponse {
	material: RemoteMaterial;
}

/**
 * Client-side metadata extracted from a file before upload.
 * Sent to the server during upload/complete.
 */
export interface ClientMediaMetadata {
	width?: number;
	height?: number;
	duration?: number;
	fps?: number;
	hasAudio?: boolean;
	thumbnailDataUrl?: string;
}

/**
 * Infer MediaType from MIME type string.
 */
export function mediaTypeFromMime(mimeType: string): MediaType {
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType.startsWith("video/")) return "video";
	return "audio";
}
