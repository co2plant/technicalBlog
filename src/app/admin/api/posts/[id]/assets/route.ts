import { NextResponse, type NextRequest } from "next/server";
import {
  adminApiErrorResponse,
  AdminRequestError,
  parseAdminPostId,
} from "@/lib/admin-api-response";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { uploadPostAsset } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const postId = parseAdminPostId((await context.params).id);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new AdminRequestError("file is required.");
    }

    const asset = await uploadPostAsset(postId, {
      file,
      role: parseAssetRole(formData),
      altText: optionalString(formData, "altText"),
      caption: optionalString(formData, "caption"),
    });

    return NextResponse.json({
      ...asset,
      altText: optionalString(formData, "altText"),
      caption: optionalString(formData, "caption"),
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}

function parseAssetRole(formData: FormData): "cover" | "inline" | "attachment" | "embedded_pdf" {
  const value = String(formData.get("role") ?? "");

  if (value === "cover" || value === "inline" || value === "attachment" || value === "embedded_pdf") {
    return value;
  }

  throw new AdminRequestError("role must be cover, inline, attachment, or embedded_pdf.");
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}
