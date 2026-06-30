import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withAuth } from "@/auth/api-auth";
import { db, uploadSessions, materials } from "@/db";
import {
	completeMultipartUpload,
	abortMultipartUpload,
} from "@/services/storage/minio-client";

const completeSchema = z.object({
	uploadId: z.string().uuid(),
	minioUploadId: z.string(),
	parts: z.array(
		z.object({
			ETag: z.string(),
			PartNumber: z.number().int().positive(),
		}),
	),
	// Optional metadata from client-side processing
	metadata: z
		.object({
			width: z.number().int().positive().optional(),
			height: z.number().int().positive().optional(),
			duration: z.number().positive().optional(),
			fps: z.number().positive().optional(),
			hasAudio: z.boolean().optional(),
			thumbnailDataUrl: z.string().optional(),
		})
		.optional(),
});

/**
 * POST /api/materials/upload/complete
 * Complete a chunked upload: merge parts in MinIO, create material record.
 */
export const POST = withAuth(async (request, { userId }) => {
	const body = await request.json();
	const parsed = completeSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	const { uploadId, minioUploadId, parts, metadata } = parsed.data;

	// Verify session
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

	if (session.receivedChunks !== session.totalChunks) {
		return NextResponse.json(
			{
				error: `Missing chunks: received ${session.receivedChunks}/${session.totalChunks}`,
			},
			{ status: 400 },
		);
	}

	// Complete multipart upload in MinIO
	try {
		await completeMultipartUpload({
			key: session.objectKey,
			uploadId: minioUploadId,
			parts,
		});
	} catch (error) {
		console.error("[upload/complete] Failed to complete multipart upload:", error);
		// Mark session as failed
		await db
			.update(uploadSessions)
			.set({ status: "failed" })
			.where(eq(uploadSessions.id, uploadId));
		return NextResponse.json(
			{ error: "Failed to merge file parts" },
			{ status: 500 },
		);
	}

	// Create material record
	const [material] = await db
		.insert(materials)
		.values({
			userId,
			filename: session.filename,
			mimeType: session.mimeType,
			size: session.size,
			originalKey: session.objectKey,
			width: metadata?.width ?? null,
			height: metadata?.height ?? null,
			duration: metadata?.duration ?? null,
			fps: metadata?.fps ?? null,
			hasAudio: metadata?.hasAudio ?? null,
			status: "ready", // Thumbnail generation can be done async later
		})
		.returning();

	// Mark upload session as completed
	await db
		.update(uploadSessions)
		.set({ status: "completed" })
		.where(eq(uploadSessions.id, uploadId));

	return NextResponse.json({ material }, { status: 201 });
});
