import type { Prisma } from "@prisma/client";
import type { Post, PostAttachment } from "@/lib/content";
import { renderPostMarkdown } from "./post-rendering";

const BLOG_DATABASE_URL_ENV = process.env.NODE_ENV === "test" ? "DATABASE_URL_TEST" : "POSTGRES_PRISMA_URL";

const BLOG_POST_INCLUDE = {
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

export type DatabaseBlogPost = Prisma.BlogPostGetPayload<{
  include: typeof BLOG_POST_INCLUDE;
}>;

export type PostLookupResult = {
  post: Post;
  redirectTo?: string;
};

type PrismaClientInstance = Awaited<typeof import("./prisma")>["prisma"];

let blogPostTableExists: boolean | undefined;

export function hasBlogDatabaseConfig(): boolean {
  const value = process.env[BLOG_DATABASE_URL_ENV]?.trim();
  return Boolean(value && value !== "\"\"" && value !== "''");
}

export async function getAllBlogPostsFromDatabase(): Promise<Post[]> {
  if (!hasBlogDatabaseConfig()) {
    return [];
  }

  try {
    const { prisma } = await import("./prisma");

    if (!(await hasBlogPostTable(prisma))) {
      return [];
    }

    const databasePosts = await prisma.blogPost.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ publishedAt: "desc" }, { modifiedAt: "desc" }],
      include: BLOG_POST_INCLUDE,
    });

    return databasePosts.map(mapBlogPostFromDatabase);
  } catch (error) {
    if (isRecoverableBlogDatabaseError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getPublishedBlogPostsFromDatabase(): Promise<Post[]> {
  if (!hasBlogDatabaseConfig()) {
    return [];
  }

  try {
    const { prisma } = await import("./prisma");

    if (!(await hasBlogPostTable(prisma))) {
      return [];
    }

    const databasePosts = await prisma.blogPost.findMany({
      where: {
        status: "published",
        publishedNumber: {
          not: null,
        },
        deletedAt: null,
      },
      orderBy: [{ publishedAt: "desc" }, { publishedNumber: "desc" }],
      include: BLOG_POST_INCLUDE,
    });

    return databasePosts.map(mapBlogPostFromDatabase);
  } catch (error) {
    if (isRecoverableBlogDatabaseError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getBlogPostByPostKeyFromDatabase(postKey: string): Promise<PostLookupResult | null> {
  if (!hasBlogDatabaseConfig()) {
    return null;
  }

  try {
    const { prisma } = await import("./prisma");

    if (!(await hasBlogPostTable(prisma))) {
      return null;
    }

    const publishedNumber = parsePublishedNumber(postKey);

    if (publishedNumber !== null) {
      const post = await prisma.blogPost.findFirst({
        where: {
          publishedNumber,
          status: "published",
          deletedAt: null,
        },
        include: BLOG_POST_INCLUDE,
      });

      return post ? { post: mapBlogPostFromDatabase(post) } : null;
    }

    const legacyPost = await prisma.blogPost.findFirst({
      where: {
        legacySlug: postKey,
        status: "published",
        deletedAt: null,
      },
      include: BLOG_POST_INCLUDE,
    });

    if (!legacyPost) {
      return null;
    }

    const post = mapBlogPostFromDatabase(legacyPost);

    return {
      post,
      redirectTo: legacyPost.publishedNumber ? `/posts/${legacyPost.publishedNumber}` : undefined,
    };
  } catch (error) {
    if (isRecoverableBlogDatabaseError(error)) {
      return null;
    }

    throw error;
  }
}

export function mapBlogPostFromDatabase(databasePost: DatabaseBlogPost): Post {
  const publishedAt =
    optionalDateOnlyToString(databasePost.publishedAt, "blog_posts.published_at") ??
    dateOnlyToString(databasePost.createdAt, "blog_posts.created_at");
  const updatedAt = optionalDateOnlyToString(databasePost.updatedAt, "blog_posts.updated_at");
  const slug = databasePost.publishedNumber ? String(databasePost.publishedNumber) : `draft-${databasePost.id}`;
  const attachments = mapAttachments(databasePost);

  return {
    title: databasePost.title,
    slug,
    category: databasePost.category.slug,
    description: databasePost.description,
    excerpt: databasePost.excerpt,
    publishedAt,
    updatedAt,
    author: databasePost.author,
    tags: databasePost.tags.map((entry) => entry.tag.name),
    originalUrl: databasePost.originalUrl ?? undefined,
    coverImage: databasePost.coverImageUrl ?? findAssetUrl(databasePost, "cover"),
    embeddedPdf: databasePost.embeddedPdfUrl ?? findAssetUrl(databasePost, "embedded_pdf"),
    allowPdfDownload: databasePost.allowPdfDownload,
    draft: databasePost.status !== "published",
    extension: databasePost.extension === "mdx" ? "mdx" : "md",
    body: databasePost.bodyMarkdown,
    html: renderPostMarkdown(databasePost.bodyMarkdown),
    attachments,
  };
}

function mapAttachments(databasePost: DatabaseBlogPost): PostAttachment[] {
  const attachmentRoles = new Set(["attachment", "embedded_pdf"]);

  return databasePost.assets
    .filter((entry) => attachmentRoles.has(entry.role))
    .map((entry) => {
      const url = assetUrl(entry.asset);
      const name = url.split("/").at(-1) || entry.asset.objectPath.split("/").at(-1) || "attachment";

      return {
        name,
        kind: attachmentKind(entry.asset.mimeType, url),
        url,
      };
    })
    .filter((attachment): attachment is PostAttachment => attachment.kind !== null);
}

function findAssetUrl(databasePost: DatabaseBlogPost, role: string): string | undefined {
  const asset = databasePost.assets.find((entry) => entry.role === role)?.asset;
  return asset ? assetUrl(asset) : undefined;
}

function assetUrl(asset: DatabaseBlogPost["assets"][number]["asset"]): string {
  return asset.publicUrl ?? `/${asset.objectPath.replace(/^\/+/, "")}`;
}

function attachmentKind(mimeType: string | null, url: string): PostAttachment["kind"] | null {
  if (mimeType === "application/pdf" || /\.pdf(?:$|[?#])/i.test(url)) {
    return "pdf";
  }

  if (/\.ppt(?:$|[?#])/i.test(url)) {
    return "ppt";
  }

  if (/\.pptx(?:$|[?#])/i.test(url)) {
    return "pptx";
  }

  return null;
}

function parsePublishedNumber(postKey: string): number | null {
  if (!/^[1-9]\d*$/.test(postKey)) {
    return null;
  }

  return Number(postKey);
}

function optionalDateOnlyToString(value: Date | string | null, pathLabel: string): string | undefined {
  if (value === null) {
    return undefined;
  }

  return dateOnlyToString(value, pathLabel);
}

function dateOnlyToString(value: Date | string, pathLabel: string): string {
  const dateString = typeof value === "string" ? value : value.toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`${pathLabel} must use YYYY-MM-DD.`);
  }

  return dateString;
}

async function hasBlogPostTable(prisma: PrismaClientInstance): Promise<boolean> {
  if (blogPostTableExists !== undefined) {
    return blogPostTableExists;
  }

  const result = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
    select to_regclass('public.blog_posts')::text as table_name
  `;

  blogPostTableExists = Boolean(result[0]?.table_name);
  return blogPostTableExists;
}

function isRecoverableBlogDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    "code" in error &&
      (error.code === "P2021" || error.code === "P2022") ||
    /blog_(posts|categories|tags|post_tags|post_assets|post_revisions)/i.test(error.message) &&
      /(does not exist|not exist|missing|unknown)/i.test(error.message)
  );
}
