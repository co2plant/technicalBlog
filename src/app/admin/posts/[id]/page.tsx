import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPostEditor, type AdminEditorAsset, type AdminEditorPost } from "./admin-post-editor";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminBlogPost, getAdminCategories } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Post",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPostEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminSession();

  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [post, categories, query] = await Promise.all([getAdminBlogPost(id), getAdminCategories(), searchParams]);

  if (!post) {
    notFound();
  }

  return (
    <AdminPostEditor
      initialPost={toEditorPost(post)}
      initialCategories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
      }))}
      messages={{
        saved: query.saved === "1",
        published: query.published,
        archived: query.archived === "1",
        uploaded: query.uploaded ? decodeURIComponent(query.uploaded) : undefined,
      }}
    />
  );
}

function toEditorPost(post: NonNullable<Awaited<ReturnType<typeof getAdminBlogPost>>>): AdminEditorPost {
  const assets = post.assets.map(toEditorAsset);

  return {
    id: post.id,
    title: post.title,
    description: post.description,
    excerpt: post.excerpt,
    author: post.author,
    status: post.status,
    publishedNumber: post.publishedNumber,
    legacySlug: post.legacySlug,
    extension: post.extension === "md" ? "md" : "mdx",
    bodyMarkdown: post.bodyMarkdown,
    categorySlug: post.category.slug,
    tags: post.tags.map((entry) => ({
      name: entry.tag.name,
      slug: shouldShowTagSlug(entry.tag.name, entry.tag.slug) ? entry.tag.slug : undefined,
    })),
    originalUrl: post.originalUrl ?? "",
    coverImageUrl: post.coverImageUrl ?? assets.find((asset) => asset.role === "cover")?.publicUrl ?? "",
    embeddedPdfUrl:
      post.embeddedPdfUrl ?? assets.find((asset) => asset.role === "embedded_pdf")?.publicUrl ?? "",
    allowPdfDownload: post.allowPdfDownload,
    assets,
  };
}

function toEditorAsset(assetLink: NonNullable<Awaited<ReturnType<typeof getAdminBlogPost>>>["assets"][number]): AdminEditorAsset {
  const publicUrl = assetLink.asset.publicUrl ?? `/${assetLink.asset.objectPath}`;

  return {
    id: String(assetLink.id),
    role: assetLink.role as AdminEditorAsset["role"],
    publicUrl,
    mimeType: assetLink.asset.mimeType ?? undefined,
    altText: assetLink.asset.altText ?? undefined,
    caption: assetLink.asset.caption ?? undefined,
  };
}

function shouldShowTagSlug(name: string, slug: string): boolean {
  return slugify(name) !== slug;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
