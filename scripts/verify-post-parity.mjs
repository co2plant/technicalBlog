import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  collectPostFiles,
  loadLocalEnvFiles,
  nonEmptyEnv,
  readPostFile,
  renderMarkdown,
  withPgSslCompatibility,
} from "./blog-post-file-utils.mjs";

loadLocalEnvFiles();

const connectionString = nonEmptyEnv("POSTGRES_PRISMA_URL");

if (!connectionString) {
  throw new Error("POSTGRES_PRISMA_URL is required to verify blog post parity.");
}

const adapter = new PrismaPg({ connectionString: withPgSslCompatibility(connectionString) });
const prisma = new PrismaClient({ adapter });
const filePosts = collectPostFiles().map(readPostFile);
const failures = [];
let verifiedEmbeddedPdfReferences = 0;

try {
  for (const filePost of filePosts) {
    const databasePost = await prisma.blogPost.findUnique({
      where: {
        legacySlug: filePost.legacySlug,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        assets: {
          include: {
            asset: true,
          },
        },
      },
    });

    if (!databasePost) {
      failures.push(`${filePost.legacySlug}: missing database row`);
      continue;
    }

    if (databasePost.bodyMarkdown !== filePost.body) {
      failures.push(`${filePost.legacySlug}: markdown body mismatch`);
    }

    if (renderMarkdown(databasePost.bodyMarkdown) !== filePost.html) {
      failures.push(`${filePost.legacySlug}: rendered HTML mismatch`);
    }

    if (databasePost.status !== (filePost.draft ? "draft" : "published")) {
      failures.push(`${filePost.legacySlug}: status mismatch`);
    }

    if (databasePost.coverImageUrl !== (filePost.coverImage ?? null)) {
      failures.push(`${filePost.legacySlug}: coverImage URL mismatch`);
    }

    if (databasePost.embeddedPdfUrl !== (filePost.embeddedPdf ?? null)) {
      failures.push(`${filePost.legacySlug}: embeddedPdf URL mismatch`);
    }

    if (databasePost.embeddedPdfUrl) {
      verifiedEmbeddedPdfReferences += await verifyPdfReference(filePost.legacySlug, databasePost.embeddedPdfUrl, failures);
    }

    const fileTagNames = [...filePost.tags].sort();
    const databaseTagNames = databasePost.tags.map((entry) => entry.tag.name).sort();

    if (JSON.stringify(fileTagNames) !== JSON.stringify(databaseTagNames)) {
      failures.push(`${filePost.legacySlug}: tag names mismatch`);
    }

    const fileDownloadableAssetCount = filePost.assets.filter((asset) =>
      asset.roles.some((role) => role === "attachment" || role === "embedded_pdf"),
    ).length;
    const databaseDownloadableAssetCount = databasePost.assets.filter((entry) =>
      entry.role === "attachment" || entry.role === "embedded_pdf",
    ).length;

    if (fileDownloadableAssetCount !== databaseDownloadableAssetCount) {
      failures.push(`${filePost.legacySlug}: attachment count mismatch`);
    }
  }
} finally {
  await prisma.$disconnect();
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      verifiedPosts: filePosts.length,
      verifiedEmbeddedPdfReferences,
      status: "ok",
    },
    null,
    2,
  ),
);

async function verifyPdfReference(slug, reference, failureList) {
  if (!reference.toLowerCase().includes(".pdf")) {
    failureList.push(`${slug}: embeddedPdf is not a PDF reference`);
    return 0;
  }

  if (reference.startsWith("/")) {
    const pathname = new URL(reference, "https://local.invalid").pathname;
    const filePath = resolve("public", decodeURIComponent(pathname.replace(/^\/+/, "")));

    if (!filePath.startsWith(resolve("public"))) {
      failureList.push(`${slug}: embeddedPdf escapes public directory`);
      return 0;
    }

    if (!existsSync(filePath)) {
      failureList.push(`${slug}: embeddedPdf local file missing`);
      return 0;
    }

    if (statSync(filePath).size === 0) {
      failureList.push(`${slug}: embeddedPdf local file is empty`);
      return 0;
    }

    const header = readFileSync(filePath).subarray(0, 4).toString("utf8");

    if (header !== "%PDF") {
      failureList.push(`${slug}: embeddedPdf local file does not start with %PDF`);
      return 0;
    }

    return 1;
  }

  if (!/^https?:\/\//i.test(reference)) {
    failureList.push(`${slug}: embeddedPdf must be a local or HTTP(S) URL`);
    return 0;
  }

  if (process.env.VERIFY_REMOTE_ASSETS !== "1") {
    return 0;
  }

  const response = await fetch(reference, { method: "HEAD" });

  if (!response.ok) {
    failureList.push(`${slug}: embeddedPdf HEAD request failed with ${response.status}`);
    return 0;
  }

  const contentType = response.headers.get("content-type");

  if (contentType && !contentType.toLowerCase().includes("application/pdf")) {
    failureList.push(`${slug}: embeddedPdf content-type is ${contentType}`);
    return 0;
  }

  return 1;
}
