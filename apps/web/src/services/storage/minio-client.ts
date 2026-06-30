import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	ListObjectsV2Command,
	CreateMultipartUploadCommand,
	UploadPartCommand,
	CompleteMultipartUploadCommand,
	AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { webEnv } from "@/env/web";

const s3Client = new S3Client({
	region: "us-east-1", // MinIO uses us-east-1 by default
	endpoint: `http${webEnv.MINIO_USE_SSL ? "s" : ""}://${webEnv.MINIO_ENDPOINT}:${webEnv.MINIO_PORT}`,
	credentials: {
		accessKeyId: webEnv.MINIO_ACCESS_KEY,
		secretAccessKey: webEnv.MINIO_SECRET_KEY,
	},
	forcePathStyle: true, // Required for MinIO
});

const BUCKET = webEnv.MINIO_BUCKET;

/**
 * Ensure the MinIO bucket exists.
 * Call this during server startup.
 */
export async function ensureBucket(): Promise<void> {
	const { HeadBucketCommand, CreateBucketCommand } = await import(
		"@aws-sdk/client-s3"
	);
	try {
		await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
	} catch {
		try {
			await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));
			console.log(`[minio] Created bucket: ${BUCKET}`);
		} catch (err) {
			console.error(`[minio] Failed to create bucket: ${BUCKET}`, err);
		}
	}
}

/**
 * Upload a complete file to MinIO.
 * Returns the object key.
 */
export async function putObject({
	key,
	body,
	contentType,
}: {
	key: string;
	body: Buffer;
	contentType: string;
}): Promise<string> {
	await s3Client.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
	return key;
}

/**
 * Generate a presigned URL for downloading an object.
 * Default expiry: 7 days (604800 seconds).
 */
export async function getDownloadUrl({
	key,
	expiresIn = 604800,
}: {
	key: string;
	expiresIn?: number;
}): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});
	const url = await getSignedUrl(s3Client as any, command as any, { expiresIn });

	// If MINIO_PUBLIC_URL is set, rewrite the internal URL to the public one
	if (webEnv.MINIO_PUBLIC_URL) {
		const urlObj = new URL(url);
		const publicUrl = new URL(webEnv.MINIO_PUBLIC_URL);
		urlObj.protocol = publicUrl.protocol;
		urlObj.host = publicUrl.host;
		return urlObj.toString();
	}

	return url;
}

/**
 * Delete an object from MinIO.
 */
export async function deleteObject({ key }: { key: string }): Promise<void> {
	await s3Client.send(
		new DeleteObjectCommand({
			Bucket: BUCKET,
			Key: key,
		}),
	);
}

/**
 * Initiate a multipart upload and return the upload ID.
 */
export async function createMultipartUpload({
	key,
	contentType,
}: {
	key: string;
	contentType: string;
}): Promise<string> {
	const result = await s3Client.send(
		new CreateMultipartUploadCommand({
			Bucket: BUCKET,
			Key: key,
			ContentType: contentType,
		}),
	);
	return result.UploadId!;
}

/**
 * Upload a single part of a multipart upload.
 * Returns the ETag for the part.
 */
export async function uploadPart({
	key,
	uploadId,
	partNumber,
	body,
}: {
	key: string;
	uploadId: string;
	partNumber: number;
	body: Buffer;
}): Promise<string> {
	const result = await s3Client.send(
		new UploadPartCommand({
			Bucket: BUCKET,
			Key: key,
			UploadId: uploadId,
			PartNumber: partNumber,
			Body: body,
		}),
	);
	return result.ETag!;
}

/**
 * Complete a multipart upload.
 */
export async function completeMultipartUpload({
	key,
	uploadId,
	parts,
}: {
	key: string;
	uploadId: string;
	parts: { ETag: string; PartNumber: number }[];
}): Promise<void> {
	await s3Client.send(
		new CompleteMultipartUploadCommand({
			Bucket: BUCKET,
			Key: key,
			UploadId: uploadId,
			MultipartUpload: { Parts: parts },
		}),
	);
}

/**
 * Abort a multipart upload (cleanup on failure).
 */
export async function abortMultipartUpload({
	key,
	uploadId,
}: {
	key: string;
	uploadId: string;
}): Promise<void> {
	await s3Client.send(
		new AbortMultipartUploadCommand({
			Bucket: BUCKET,
			Key: key,
			UploadId: uploadId,
		}),
	);
}

/**
 * Get a direct URL for embedding in <video> / <img> tags.
 * For short-lived preview, uses a 1-hour presigned URL.
 */
export async function getPreviewUrl({ key }: { key: string }): Promise<string> {
	return getDownloadUrl({ key, expiresIn: 3600 });
}

export { s3Client };
