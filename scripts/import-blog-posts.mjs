import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  collectPostFiles,
  loadLocalEnvFiles,
  nonEmptyEnv,
  readPostFile,
  withPgSslCompatibility,
} from "./blog-post-file-utils.mjs";

loadLocalEnvFiles();

const connectionString = nonEmptyEnv("POSTGRES_PRISMA_URL");

if (!connectionString) {
  throw new Error("POSTGRES_PRISMA_URL is required to import blog posts.");
}

const adapter = new PrismaPg({ connectionString: withPgSslCompatibility(connectionString) });
const prisma = new PrismaClient({ adapter });
const tagSlugMap = await readTagSlugMap();
const sourcePosts = collectPostFiles().map(readPostFile);
const publishedPosts = sourcePosts
  .filter((post) => !post.draft)
  .sort((left, right) => {
    const dateComparison = Date.parse(`${left.publishedAt}T00:00:00.000Z`) - Date.parse(`${right.publishedAt}T00:00:00.000Z`);
    return dateComparison || left.legacySlug.localeCompare(right.legacySlug);
  });
const publishedNumberBySlug = new Map(publishedPosts.map((post, index) => [post.legacySlug, index + 1]));

try {
  const result = await prisma.$transaction(async (tx) => {
    const imported = [];

    for (const post of sourcePosts) {
      const existing = await tx.blogPost.findUnique({
        where: {
          legacySlug: post.legacySlug,
        },
      });
      const category = await tx.blogCategory.upsert({
        where: {
          slug: post.category,
        },
        create: {
          slug: post.category,
          name: categoryName(post.category),
        },
        update: {},
      });
      const publishedNumber = post.draft ? null : existing?.publishedNumber ?? publishedNumberBySlug.get(post.legacySlug);
      const status = post.draft ? "draft" : "published";
      const databasePost = await tx.blogPost.upsert({
        where: {
          legacySlug: post.legacySlug,
        },
        create: {
          legacySlug: post.legacySlug,
          publishedNumber,
          title: post.title,
          description: post.description,
          excerpt: post.excerpt,
          bodyMarkdown: post.body,
          extension: post.extension,
          status,
          author: post.author,
          categoryId: category.id,
          publishedAt: post.draft ? null : dateOrNull(post.publishedAt),
          updatedAt: dateOrNull(post.updatedAt),
          originalUrl: post.originalUrl,
          coverImageUrl: post.coverImage,
          embeddedPdfUrl: post.embeddedPdf,
          allowPdfDownload: post.allowPdfDownload,
          deletedAt: null,
        },
        update: {
          title: post.title,
          description: post.description,
          excerpt: post.excerpt,
          bodyMarkdown: post.body,
          extension: post.extension,
          status,
          author: post.author,
          categoryId: category.id,
          publishedNumber,
          publishedAt: post.draft ? null : dateOrNull(post.publishedAt),
          updatedAt: dateOrNull(post.updatedAt),
          originalUrl: post.originalUrl,
          coverImageUrl: post.coverImage,
          embeddedPdfUrl: post.embeddedPdf,
          allowPdfDownload: post.allowPdfDownload,
          deletedAt: null,
        },
      });

      await tx.blogPostTag.deleteMany({
        where: {
          postId: databasePost.id,
        },
      });

      for (const tagName of post.tags) {
        const tagSlug = resolveTagSlug(tagName, tagSlugMap);
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
            postId: databasePost.id,
            tagId: tag.id,
          },
        });
      }

      await tx.blogPostAsset.deleteMany({
        where: {
          postId: databasePost.id,
        },
      });

      let assetSortOrder = 0;

      for (const asset of post.assets) {
        const mediaAsset = await tx.mediaAsset.upsert({
          where: {
            bucket_objectPath: {
              bucket: "local-public",
              objectPath: asset.objectPath,
            },
          },
          create: {
            bucket: "local-public",
            objectPath: asset.objectPath,
            publicUrl: asset.publicUrl,
            mimeType: asset.mimeType,
            usageScope: "blog",
          },
          update: {
            publicUrl: asset.publicUrl,
            mimeType: asset.mimeType,
            usageScope: "blog",
          },
        });

        for (const role of asset.roles) {
          await tx.blogPostAsset.create({
            data: {
              postId: databasePost.id,
              assetId: mediaAsset.id,
              role,
              sortOrder: assetSortOrder,
            },
          });
          assetSortOrder += 1;
        }
      }

      imported.push({
        legacySlug: post.legacySlug,
        publishedNumber,
        status,
        tags: post.tags.length,
        assets: post.assets.length,
      });
    }

    return imported;
  });

  console.log(
    JSON.stringify(
      {
        posts: result.length,
        published: result.filter((post) => post.status === "published").length,
        drafts: result.filter((post) => post.status === "draft").length,
        firstPublishedNumber: Math.min(...result.map((post) => post.publishedNumber).filter(Boolean)),
        lastPublishedNumber: Math.max(...result.map((post) => post.publishedNumber).filter(Boolean)),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}

async function readTagSlugMap() {
  const url = new URL("./tag-slug-map.json", import.meta.url);

  try {
    return JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(url, "utf8")));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function resolveTagSlug(tagName, tagSlugMap) {
  if (tagSlugMap[tagName]) {
    return validateTagSlug(tagSlugMap[tagName], tagName);
  }

  if (/^[\x00-\x7F]+$/.test(tagName)) {
    return validateTagSlug(
      tagName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      tagName,
    );
  }

  throw new Error(`Tag "${tagName}" needs an explicit ASCII slug in scripts/tag-slug-map.json.`);
}

function validateTagSlug(slug, tagName) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`Invalid slug "${slug}" for tag "${tagName}". Use ^[a-z0-9][a-z0-9-]*$.`);
  }

  return slug;
}

function dateOrNull(dateString) {
  return dateString ? new Date(`${dateString}T00:00:00.000Z`) : null;
}

function categoryName(slug) {
  return slug
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
