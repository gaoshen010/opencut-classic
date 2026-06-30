import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/auth/api-auth";
import { db, uploadSessions } from "@/db";
import { createMultipartUpload } from "@/services/storage/minio-client";
import { nanoid } from "nanoid";

const initSchema = z.object({
	filename: z.string().min(1).max(255),
	mimeType: z.string().min(1),
	size: z.number().int().positive().max(5 * 1024 * 1024 * 1024), // 5GB max
	totalChunks: z.number().int().positive().max(1000),
});

/**
 * POST /api/materials/upload/init
 * Initialize a chunked upload session.
 * Creates a multipart upload in MinIO and records the session in the database.
 */
export const POST = withAuth(async (request, { userId }) => {
	const body = await request.json();
	const parsed = initSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	const { filename, mimeType, size, totalChunks } = parsed.data;

	// Generate a unique object key
	const ext = filename.split(".").pop() ?? "bin";
	const objectKey = `uploads/${userId}/${nanoid()}.${ext}`;

	// Create multipart upload in MinIO
	let uploadId: string;
	try {
		uploadId = await createMultipartUpload({ key: objectKey, contentType: mimeType });
	} catch (error) {
		console.error("[upload/init] Failed to create multipart upload:", error);
		return NextResponse.json(
			{ error: "Failed to initialize upload" },
			{ status: 500 },
		);
	}

	// Record upload session in database (expires in 2 hours)
	const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
	const [session] = await db
		.insert(uploadSessions)
		.values({
			userId,
			filename,
			mimeType,
			size,
			totalChunks,
			receivedChunks: 0,
			objectKey,
			status: "uploading",
			expiresAt,
		})
		.returning();

	return NextResponse.json({
		uploadId: session.id,
		minioUploadId: uploadId,
		objectKey,
		expiresAt: session.expiresAt.toISOString(),
	});
});
