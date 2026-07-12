import { NextResponse, type NextRequest } from "next/server";
import { adminApiErrorResponse, parseAdminPostId } from "@/lib/admin-api-response";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { parseAdminPostInput, parseAdminPostSaveMode } from "@/lib/admin-post-payload";
import { savePostContentPreservingStatus } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const postId = parseAdminPostId((await context.params).id);
    const payload = await request.json();
    const input = parseAdminPostInput(payload);
    const saveMode = parseAdminPostSaveMode(payload);

    await savePostContentPreservingStatus(postId, input, {
      createRevision: saveMode === "manual",
    });

    return NextResponse.json({
      status: "saved",
      saveMode,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
