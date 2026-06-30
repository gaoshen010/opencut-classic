import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth/server";

/**
 * Extract the current user session from a Next.js API request.
 * Returns null if the user is not authenticated.
 */
export async function getSessionUser(): Promise<{
	id: string;
	email: string;
	name: string;
} | null> {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session?.user) return null;
		return {
			id: session.user.id,
			email: session.user.email,
			name: session.user.name,
		};
	} catch {
		return null;
	}
}

/**
 * Higher-order function that wraps an API handler with authentication.
 * Returns 401 if no valid session is found.
 */
export function withAuth(
	handler: (
		request: NextRequest,
		context: { params: Promise<Record<string, string>>; userId: string },
	) => Promise<NextResponse>,
) {
	return async (
		request: NextRequest,
		context: { params: Promise<Record<string, string>> },
	): Promise<NextResponse> => {
		const user = await getSessionUser();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		return handler(request, { ...context, userId: user.id });
	};
}
