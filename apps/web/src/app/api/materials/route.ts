import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, like, desc, sql } from "drizzle-orm";
import { withAuth } from "@/auth/api-auth";
import { db, materials } from "@/db";

const querySchema = z.object({
	type: z.enum(["image", "video", "audio", "all"]).default("all"),
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * GET /api/materials - List materials for the current user
 */
export const GET = withAuth(async (request, { userId }) => {
	const url = new URL(request.url);
	const parsed = querySchema.safeParse({
		type: url.searchParams.get("type"),
		page: url.searchParams.get("page") ?? undefined,
		pageSize: url.searchParams.get("pageSize") ?? undefined,
	});

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid parameters", details: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	const { type, page, pageSize } = parsed.data;
	const offset = (page - 1) * pageSize;

	// Build where conditions
	const mimeTypePrefix =
		type === "image"
			? "image/%"
			: type === "video"
				? "video/%"
				: type === "audio"
					? "audio/%"
					: null;

	const whereClause = mimeTypePrefix
		? and(eq(materials.userId, userId), like(materials.mimeType, mimeTypePrefix))
		: eq(materials.userId, userId);

	// Run data + count queries in parallel
	const [results, countResult] = await Promise.all([
		db
			.select()
			.from(materials)
			.where(whereClause)
			.orderBy(desc(materials.createdAt))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(materials)
			.where(whereClause),
	]);

	const total = countResult[0]?.count ?? 0;

	return NextResponse.json({
		materials: results,
		pagination: {
			page,
			pageSize,
			total,
			totalPages: Math.ceil(total / pageSize),
		},
	});
});
