import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AdminNotFoundError, AdminRequestError, AdminUpstreamError } from "@/lib/admin-api-response";
import { prisma } from "@/lib/prisma";
import { assertSupportedPostSyntax } from "@/lib/content";
import { mapBlogPostFromDatabase } from "@/lib/posts-db";

const ADMIN_POST_INCLUDE = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
  assets: {
    orderBy: { sortOrder: "asc" },
    include: {
      asset: true,
    },
  },
} satisfies Prisma.BlogPostInclude;

export type AdminPostInput = {
  title: string;
  description: string;
  excerpt: string;
  bodyMarkdown: string;
  extension: "md" | "mdx";
  author: string;
  categorySlug: string;
  tags: AdminTagInput[];
  originalUrl?: string | null;
  coverImageUrl?: string | null;
  embeddedPdfUrl?: string | null;
  allowPdfDownload: boolean;
};

export type AdminTagInput = {
  name: string;
  slug?: string;
};

type UploadAssetInput = {
  file: File;
  role: "cover" | "inline" | "attachment" | "embedded_pdf";
  altText?: string;
  caption?: string;
};

export type UploadedPostAsset = {
  publicUrl: string;
  role: UploadAssetInput["role"];
  mimeType: string;
  objectPath: string;
  bucket: string;
};

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const PDF_MIME_TYPE = "application/pdf";
const SITE_TIME_ZONE = "Asia/Seoul";
const PUBLISH_TRANSACTION_ATTEMPTS = 3;

export type AdminBlogPost = Prisma.BlogPostGetPayload<{
  include: typeof ADMIN_POST_INCLUDE;
}>;

export async function getAdminBlogPosts(): Promise<AdminBlogPost[]> {
  return prisma.blogPost.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ modifiedAt: "desc" }],
    include: ADMIN_POST_INCLUDE,
  });
}

export async function getAdminBlogPost(id: number): Promise<AdminBlogPost | null> {
  return prisma.blogPost.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: ADMIN_POST_INCLUDE,
  });
}

export async function getAdminCategories() {
  return prisma.blogCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
}

export async function createBlogCategory(input: {
  name: string;
  slug: string;
  sortOrder?: number;
}) {
  return prisma.blogCategory.create({
    data: {
      name: input.name,
      slug: input.slug,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function createDraftPost(): Promise<number> {
  const category = await getDefaultCategory();
  const post = await prisma.blogPost.create({
    data: {
      title: "새 글",
      description: "",
      excerpt: "",
      bodyMarkdown: "",
      extension: "mdx",
      status: "draft",
      author: "co2plant",
      categoryId: category.id,
      allowPdfDownload: true,
    },
  });

  revalidatePostSurfaces();
  return post.id;
}

export async function saveDraftPost(id: number, input: AdminPostInput): Promise<void> {
  await writePost(id, input, "manual", "draft");
}

/**
 * Persist editor content without changing the post's publication state.
 *
 * JSON autosave and preview pre-save use this path so a published or archived
 * post remains published or archived. Callers decide whether an explicit
 * manual save should also create a revision; background saves do not.
 */
export async function savePostContentPreservingStatus(
  id: number,
  input: AdminPostInput,
  options: { createRevision: boolean },
): Promise<void> {
  await writePost(id, input, "manual", undefined, options.createRevision);
}

export async function publishPost(id: number, input: AdminPostInput): Promise<number> {
  for (let attempt = 1; attempt <= PUBLISH_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`select pg_advisory_xact_lock(hashtext('technical_blog_publish_number'))`;
          const existing = await tx.blogPost.findFirst({
            where: {
              id,
              deletedAt: null,
            },
          });

          if (!existing) {
            throw new AdminNotFoundError("Post not found.");
          }

          const category = await upsertCategory(tx, input.categorySlug);
          const publishedNumber = existing.publishedNumber ?? (await nextPublishedNumber(tx));
          const publishedAt = existing.publishedAt ?? new Date(`${todayDateOnly()}T00:00:00.000Z`);

          assertAdminPostSyntax(input.bodyMarkdown, input.extension, String(id));

          await tx.blogPost.update({
            where: {
              id,
            },
            data: {
              ...postWriteData(input, category.id),
              status: "published",
              publishedNumber,
              publishedAt,
              deletedAt: null,
            },
          });

          await removeClearedAssetLinks(tx, id, input);
          await replaceTags(tx, id, input.tags);
          await createRevision(tx, id, input, "publish");

          revalidatePostSurfaces(publishedNumber);
          return publishedNumber;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (attempt === PUBLISH_TRANSACTION_ATTEMPTS || !isRetryablePublishTransactionError(error)) {
        throw error;
      }
    }
  }

  throw new Error("Publishing failed after retrying the transaction.");
}

export async function archivePost(id: number): Promise<void> {
  const post = await prisma.blogPost.update({
    where: {
      id,
    },
    data: {
      status: "archived",
    },
  });

  revalidatePostSurfaces(post.publishedNumber ?? undefined);
}

export async function softDeletePost(id: number): Promise<void> {
  const post = await prisma.blogPost.update({
    where: {
      id,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePostSurfaces(post.publishedNumber ?? undefined);
}

export async function uploadPostAsset(postId: number, input: UploadAssetInput): Promise<UploadedPostAsset> {
  const post = await prisma.blogPost.findFirst({
    where: {
      id: postId,
      deletedAt: null,
    },
  });

  if (!post) {
    throw new AdminNotFoundError("Post not found.");
  }

  const upload = await validateUpload(input);
  const supabase = requireSupabaseStorageConfig();
  const objectPath = buildStorageObjectPath(postId, input.file.name, upload.extension);
  const publicUrl = buildSupabasePublicUrl(supabase.url, upload.bucket, objectPath);

  await uploadToSupabaseStorage({
    ...supabase,
    bucket: upload.bucket,
    objectPath,
    contentType: upload.mimeType,
    file: input.file,
  });

  await prisma.$transaction(async (tx) => {
    const mediaAsset = await tx.mediaAsset.create({
      data: {
        bucket: upload.bucket,
        objectPath,
        publicUrl,
        altText: input.altText,
        caption: input.caption,
        mimeType: upload.mimeType,
        byteSize: input.file.size,
        usageScope: "blog",
      },
    });

    if (input.role === "cover" || input.role === "embedded_pdf") {
      await tx.blogPostAsset.deleteMany({
        where: {
          postId,
          role: input.role,
        },
      });
    }

    const maxSortOrder = await tx.blogPostAsset.aggregate({
      where: {
        postId,
      },
      _max: {
        sortOrder: true,
      },
    });

    await tx.blogPostAsset.create({
      data: {
        postId,
        assetId: mediaAsset.id,
        role: input.role,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });

    if (input.role === "cover") {
      await tx.blogPost.update({
        where: {
          id: postId,
        },
        data: {
          coverImageUrl: publicUrl,
        },
      });
    }

    if (input.role === "embedded_pdf") {
      await tx.blogPost.update({
        where: {
          id: postId,
        },
        data: {
          embeddedPdfUrl: publicUrl,
        },
      });
    }
  });

  revalidatePostSurfaces(post.publishedNumber ?? undefined);
  return {
    publicUrl,
    role: input.role,
    mimeType: upload.mimeType,
    objectPath,
    bucket: upload.bucket,
  };
}

export function mapAdminPostToPreview(post: AdminBlogPost) {
  return mapBlogPostFromDatabase(post);
}

function writePost(
  id: number,
  input: AdminPostInput,
  reason: "manual" | "publish",
  status?: "draft" | "published",
  shouldCreateRevision = true,
) {
  assertAdminPostSyntax(input.bodyMarkdown, input.extension, String(id));

  return prisma.$transaction(async (tx) => {
    const existing = await tx.blogPost.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new AdminNotFoundError("Post not found.");
    }

    const category = await upsertCategory(tx, input.categorySlug);
    await tx.blogPost.update({
      where: {
        id,
      },
      data: {
        ...postWriteData(input, category.id),
        ...(status ? { status } : {}),
        deletedAt: null,
      },
    });

    await removeClearedAssetLinks(tx, id, input);
    await replaceTags(tx, id, input.tags);

    if (shouldCreateRevision) {
      await createRevision(tx, id, input, reason);
    }

    revalidatePostSurfaces(existing.publishedNumber ?? undefined);
  });
}

function postWriteData(input: AdminPostInput, categoryId: number) {
  return {
    title: input.title,
    description: input.description,
    excerpt: input.excerpt,
    bodyMarkdown: input.bodyMarkdown,
    extension: input.extension,
    author: input.author,
    categoryId,
    updatedAt: new Date(`${todayDateOnly()}T00:00:00.000Z`),
    originalUrl: input.originalUrl,
    coverImageUrl: input.coverImageUrl,
    embeddedPdfUrl: input.embeddedPdfUrl,
    allowPdfDownload: input.allowPdfDownload,
  };
}

async function removeClearedAssetLinks(
  tx: Prisma.TransactionClient,
  postId: number,
  input: AdminPostInput,
): Promise<void> {
  const roles: Array<"cover" | "embedded_pdf"> = [];

  if (input.coverImageUrl === null) {
    roles.push("cover");
  }

  if (input.embeddedPdfUrl === null) {
    roles.push("embedded_pdf");
  }

  if (roles.length === 0) {
    return;
  }

  await tx.blogPostAsset.deleteMany({
    where: {
      postId,
      role: {
        in: roles,
      },
    },
  });
}

async function replaceTags(tx: Prisma.TransactionClient, postId: number, tagInputs: AdminTagInput[]): Promise<void> {
  await tx.blogPostTag.deleteMany({
    where: {
      postId,
    },
  });

  const seenSlugs = new Set<string>();

  for (const tagInput of tagInputs) {
    const tagName = tagInput.name.trim();
    const tagSlug = tagInput.slug ?? toTagSlug(tagName);

    if (seenSlugs.has(tagSlug)) {
      continue;
    }

    seenSlugs.add(tagSlug);

    const tag = await tx.blogTag.upsert({
      where: {
        slug: tagSlug,
      },
      create: {
        slug: tagSlug,
        name: tagName,
      },
      update: {
        name: tagName,
      },
    });

    await tx.blogPostTag.create({
      data: {
        postId,
        tagId: tag.id,
      },
    });
  }
}

function createRevision(
  tx: Prisma.TransactionClient,
  postId: number,
  input: AdminPostInput,
  reason: "manual" | "publish",
) {
  return tx.blogPostRevision.create({
    data: {
      postId,
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      reason,
      snapshot: {
        title: input.title,
        description: input.description,
        excerpt: input.excerpt,
        author: input.author,
        categorySlug: input.categorySlug,
        tags: input.tags.map((tag) => ({
          name: tag.name,
          slug: tag.slug ?? toTagSlug(tag.name),
        })),
        originalUrl: input.originalUrl,
        coverImageUrl: input.coverImageUrl,
        embeddedPdfUrl: input.embeddedPdfUrl,
        allowPdfDownload: input.allowPdfDownload,
        extension: input.extension,
      },
    },
  });
}

async function getDefaultCategory() {
  return prisma.blogCategory.upsert({
    where: {
      slug: "uncategorized",
    },
    create: {
      slug: "uncategorized",
      name: "Uncategorized",
      sortOrder: 999,
    },
    update: {},
  });
}

function upsertCategory(tx: Prisma.TransactionClient, slug: string) {
  return tx.blogCategory.upsert({
    where: {
      slug,
    },
    create: {
      slug,
      name: categoryName(slug),
    },
    update: {},
  });
}

async function nextPublishedNumber(tx: Prisma.TransactionClient): Promise<number> {
  const aggregate = await tx.blogPost.aggregate({
    _max: {
      publishedNumber: true,
    },
  });

  return (aggregate._max.publishedNumber ?? 0) + 1;
}

function revalidatePostSurfaces(publishedNumber?: number): void {
  revalidatePath("/");
  revalidatePath("/posts");
  revalidatePath("/portfolio");
  revalidatePath("/sitemap.xml");

  if (publishedNumber) {
    revalidatePath(`/posts/${publishedNumber}`);
  }
}

function toTagSlug(tagName: string): string {
  const slug = tagName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new AdminRequestError(`Tag "${tagName}" needs an ASCII slug.`);
  }

  return slug;
}

function categoryName(slug: string): string {
  return slug
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function todayDateOnly(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error(`Unable to derive the current date in ${SITE_TIME_ZONE}.`);
  }

  return `${year}-${month}-${day}`;
}

function isRetryablePublishTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002")
  );
}

function assertAdminPostSyntax(bodyMarkdown: string, extension: "md" | "mdx", postId: string): void {
  try {
    assertSupportedPostSyntax(bodyMarkdown, extension, postId);
  } catch (error) {
    throw new AdminRequestError(error instanceof Error ? error.message : "Unsupported post syntax.");
  }
}

async function validateUpload(input: UploadAssetInput): Promise<{
  bucket: string;
  mimeType: string;
  extension: string;
}> {
  if (!input.file || input.file.size === 0) {
    throw new AdminRequestError("Upload file is required.");
  }

  if (input.file.size > MAX_UPLOAD_BYTES) {
    throw new AdminRequestError("Upload file must be 20MB or smaller.");
  }

  const mimeType = input.file.type;

  if (IMAGE_MIME_TYPES.has(mimeType)) {
    if (input.role === "embedded_pdf" || input.role === "attachment") {
      throw new AdminRequestError(`${input.role} uploads must be PDF files.`);
    }

    return {
      bucket: nonEmptyEnv("SUPABASE_BLOG_IMAGES_BUCKET") ?? "blog-images",
      mimeType,
      extension: extensionForMimeType(mimeType),
    };
  }

  if (mimeType === PDF_MIME_TYPE) {
    if (input.role === "cover" || input.role === "inline") {
      throw new AdminRequestError(`${input.role} uploads must be image files.`);
    }

    return {
      bucket: nonEmptyEnv("SUPABASE_BLOG_ASSETS_BUCKET") ?? "blog-assets",
      mimeType,
      extension: ".pdf",
    };
  }

  throw new AdminRequestError(
    "Only png, jpg, jpeg, webp, gif, and pdf uploads are allowed. SVG is intentionally blocked.",
  );
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      throw new Error(`Unsupported mime type: ${mimeType}`);
  }
}

function buildStorageObjectPath(postId: number, fileName: string, extension: string): string {
  const safeName = path
    .basename(fileName, path.extname(fileName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `posts/${postId}/${randomUUID()}${safeName ? `-${safeName}` : ""}${extension}`;
}

function requireSupabaseStorageConfig(): {
  url: string;
  serviceKey: string;
} {
  const url = nonEmptyEnv("SUPABASE_URL");
  const serviceKey = nonEmptyEnv("SUPABASE_SERVICE_ROLE_KEY") ?? nonEmptyEnv("SUPABASE_SECRET_KEY");

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY are required for uploads.");
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceKey,
  };
}

async function uploadToSupabaseStorage({
  url,
  serviceKey,
  bucket,
  objectPath,
  contentType,
  file,
}: {
  url: string;
  serviceKey: string;
  bucket: string;
  objectPath: string;
  contentType: string;
  file: File;
}): Promise<void> {
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "false",
      "cache-control": "3600",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!response.ok) {
    const responseMessage = await response.text();
    console.error("Supabase Storage upload failed.", {
      status: response.status,
      responseMessage,
    });
    throw new AdminUpstreamError(`Storage upload failed with status ${response.status}.`);
  }
}

function buildSupabasePublicUrl(supabaseUrl: string, bucket: string, objectPath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeObjectPath(objectPath)}`;
}

function encodeObjectPath(objectPath: string): string {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function nonEmptyEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();

  if (!value || value === "\"\"" || value === "''") {
    return undefined;
  }

  return value;
}
