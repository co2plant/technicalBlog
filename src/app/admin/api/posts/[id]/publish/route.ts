import { NextResponse, type NextRequest } from "next/server";
import { adminApiErrorResponse, parseAdminPostId } from "@/lib/admin-api-response";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { parseAdminPostInput } from "@/lib/admin-post-payload";
import { publishPost } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const postId = parseAdminPostId((await context.params).id);
    const input = parseAdminPostInput(await request.json());
    const publishedNumber = await publishPost(postId, input);

    return NextResponse.json({
      status: "published",
      publishedNumber,
      url: `/posts/${publishedNumber}`,
      publishedAt: new Date().toISOString(),
    });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
