import { NextResponse, type NextRequest } from "next/server";
import { adminApiErrorResponse } from "@/lib/admin-api-response";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { parseCategoryInput } from "@/lib/admin-post-payload";
import { createBlogCategory, getAdminCategories } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await getAdminCategories();

  return NextResponse.json({
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const category = await createBlogCategory(parseCategoryInput(await request.json()));

    return NextResponse.json(
      {
        id: category.id,
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
      },
      { status: 201 },
    );
  } catch (error) {
    return adminApiErrorResponse(error);
  }
}
