import { type NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { withAuth } from "@/auth/api-auth";
import { db, uploadSessions } from "@/db";
import { uploadPart } from "@/services/storage/minio-client";

/**
 * POST /api/materials/upload/chunk
 * Upload a single chunk of a chunked upload.
 *
 * Expects multipart/form-data with:
 * - uploadId: string (our session ID)
 * - minioUploadId: string (MinIO's multipart upload ID)
 * - chunkIndex: number (0-based)
 * - chunk: Blob (the file chunk)
 */
export const POST = withAuth(async (request, { userId }) => {
	const formData = await request.formData();
	const uploadId = formData.get("uploadId") as string;
	const minioUploadId = formData.get("minioUploadId") as string;
	const chunkIndex = Number(formData.get("chunkIndex"));
	const chunk = formData.get("chunk") as Blob;

	if (!uploadId || !minioUploadId || isNaN(chunkIndex) || !chunk) {
		return NextResponse.json(
			{ error: "Missing required fields: uploadId, minioUploadId, chunkIndex, chunk" },
			{ status: 400 },
		);
	}

	// Verify the session belongs to this user
	const [session] = await db
		.select()
		.from(uploadSessions)
		.where(
			and(eq(uploadSessions.id, uploadId), eq(uploadSessions.userId, userId)),
		)
		.limit(1);

	if (!session) {
		return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
	}

	if (session.status !== "uploading") {
		return NextResponse.json(
			{ error: `Upload session is ${session.status}` },
			{ status: 400 },
		);
	}

	if (session.expiresAt < new Date()) {
		return NextResponse.json({ error: "Upload session expired" }, { status: 410 });
	}

	// Convert blob to buffer
	const buffer = Buffer.from(await chunk.arrayBuffer());

	// Upload part to MinIO (part numbers are 1-based)
	let etag: string;
	try {
		etag = await uploadPart({
			key: session.objectKey,
			uploadId: minioUploadId,
			partNumber: chunkIndex + 1,
			body: buffer,
		});
	} catch (error) {
		console.error(`[upload/chunk] Failed to upload part ${chunkIndex}:`, error);
		return NextResponse.json(
			{ error: "Failed to upload chunk" },
			{ status: 500 },
		);
	}

	// Update received chunks count
	await db
		.update(uploadSessions)
		.set({ receivedChunks: session.receivedChunks + 1 })
		.where(eq(uploadSessions.id, uploadId));

	return NextResponse.json({
		success: true,
		chunkIndex,
		etag,
		receivedChunks: session.receivedChunks + 1,
		totalChunks: session.totalChunks,
	});
});
