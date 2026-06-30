import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/auth/api-auth";
import { db, materials } from "@/db";
import { deleteObject } from "@/services/storage/minio-client";

/**
 * GET /api/materials/[id] - Get a single material by ID
 */
export const GET = withAuth(async (_request, { params, userId }) => {
	const { id } = await params;

	const [material] = await db
		.select()
		.from(materials)
		.where(and(eq(materials.id, id), eq(materials.userId, userId)))
		.limit(1);

	if (!material) {
		return NextResponse.json({ error: "Material not found" }, { status: 404 });
	}

	return NextResponse.json({ material });
});

/**
 * DELETE /api/materials/[id] - Delete a material
 */
export const DELETE = withAuth(async (_request, { params, userId }) => {
	const { id } = await params;

	const [material] = await db
		.select()
		.from(materials)
		.where(and(eq(materials.id, id), eq(materials.userId, userId)))
		.limit(1);

	if (!material) {
		return NextResponse.json({ error: "Material not found" }, { status: 404 });
	}

	// Delete from MinIO first
	const keysToDelete = [
		material.originalKey,
		material.thumbnailKey,
		material.previewKey,
	].filter((k): k is string => k !== null);

	await Promise.all(keysToDelete.map((key) => deleteObject({ key })));

	// Delete from database
	await db
		.delete(materials)
		.where(and(eq(materials.id, id), eq(materials.userId, userId)));

	return NextResponse.json({ success: true });
});
