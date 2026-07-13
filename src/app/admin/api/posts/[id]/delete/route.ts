import { NextResponse } from "next/server";
import { adminApiErrorResponse, parseAdminPostId } from "@/lib/admin-api-response";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { softDeletePost } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await softDeletePost(parseAdminPostId((await context.params).id));

    return NextResponse.json({
      status: "deleted",
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
