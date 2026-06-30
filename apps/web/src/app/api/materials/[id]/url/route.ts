import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withAuth } from "@/auth/api-auth";
import { db, materials } from "@/db";
import { getDownloadUrl } from "@/services/storage/minio-client";

/**
 * GET /api/materials/[id]/url - Get a presigned download URL for a material
 */
export const GET = withAuth(async (request, { params, userId }) => {
	const { id } = await params;
	const url = new URL(request.url);
	const purpose = url.searchParams.get("purpose") ?? "download"; // "download" | "preview" | "thumbnail"

	const [material] = await db
		.select()
		.from(materials)
		.where(and(eq(materials.id, id), eq(materials.userId, userId)))
		.limit(1);

	if (!material) {
		return NextResponse.json({ error: "Material not found" }, { status: 404 });
	}

	// Determine which object key to return based on purpose
	let objectKey: string | null = null;
	switch (purpose) {
		case "thumbnail":
			objectKey = material.thumbnailKey ?? material.originalKey;
			break;
		case "preview":
			objectKey = material.previewKey ?? material.originalKey;
			break;
		case "download":
		default:
			objectKey = material.originalKey;
			break;
	}

	const signedUrl = await getDownloadUrl({ key: objectKey });

	return NextResponse.json({
		url: signedUrl,
		expiresIn: purpose === "preview" ? 3600 : 604800,
		material: {
			id: material.id,
			filename: material.filename,
			mimeType: material.mimeType,
			size: material.size,
		},
	});
});
