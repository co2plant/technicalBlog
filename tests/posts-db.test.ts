import { afterEach, describe, expect, it } from "vitest";
import {
  type DatabaseBlogPost,
  hasBlogDatabaseConfig,
  mapBlogPostFromDatabase,
} from "../src/lib/posts-db";

describe("database blog post mapper", () => {
  const originalTestDatabaseUrl = process.env.DATABASE_URL_TEST;

  afterEach(() => {
    if (originalTestDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL_TEST;
    } else {
      process.env.DATABASE_URL_TEST = originalTestDatabaseUrl;
    }
  });

  it("uses DATABASE_URL_TEST instead of production database config in tests", () => {
    delete process.env.DATABASE_URL_TEST;
    expect(hasBlogDatabaseConfig()).toBe(false);

    process.env.DATABASE_URL_TEST = "postgresql://technicalblog:technicalblog@127.0.0.1:54329/technicalblog_test";
    expect(hasBlogDatabaseConfig()).toBe(true);
  });

  it("maps a published database post to the existing Post shape", () => {
    const now = new Date("2026-07-07T00:00:00.000Z");
    const databasePost = {
      id: 10,
      publishedNumber: 3,
      legacySlug: "legacy-post-slug",
      title: "DB 기반 글",
      description: "DB에서 읽은 설명",
      excerpt: "DB에서 읽은 요약",
      bodyMarkdown: "# 제목\n\n본문입니다.",
      extension: "mdx",
      status: "published",
      author: "co2plant",
      categoryId: 1,
      publishedAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
      originalUrl: null,
      coverImageUrl: null,
      embeddedPdfUrl: null,
      allowPdfDownload: false,
      createdAt: now,
      modifiedAt: now,
      deletedAt: null,
      category: {
        id: 1,
        slug: "backend",
        name: "Backend",
        sortOrder: 10,
        createdAt: now,
      },
      tags: [
        {
          postId: 10,
          tagId: 1,
          tag: {
            id: 1,
            slug: "spring",
            name: "spring",
            createdAt: now,
          },
        },
      ],
      assets: [
        {
          id: 1,
          postId: 10,
          assetId: "b861b0fa-e3e8-4480-b7eb-acd053e8840b",
          role: "cover",
          sortOrder: 0,
          asset: {
            id: "b861b0fa-e3e8-4480-b7eb-acd053e8840b",
            bucket: "local-public",
            objectPath: "posts/legacy-post-slug/cover.png",
            publicUrl: "/posts/legacy-post-slug/cover.png",
            altText: null,
            caption: null,
            mimeType: "image/png",
            byteSize: null,
            width: null,
            height: null,
            usageScope: "blog",
            createdAt: now,
            modifiedAt: now,
          },
        },
        {
          id: 2,
          postId: 10,
          assetId: "ef42d4b8-3b0d-4586-aed0-153f0120ce84",
          role: "embedded_pdf",
          sortOrder: 1,
          asset: {
            id: "ef42d4b8-3b0d-4586-aed0-153f0120ce84",
            bucket: "local-public",
            objectPath: "posts/legacy-post-slug/document.pdf",
            publicUrl: "/posts/legacy-post-slug/document.pdf",
            altText: null,
            caption: null,
            mimeType: "application/pdf",
            byteSize: null,
            width: null,
            height: null,
            usageScope: "blog",
            createdAt: now,
            modifiedAt: now,
          },
        },
      ],
    } satisfies DatabaseBlogPost;

    const post = mapBlogPostFromDatabase(databasePost);

    expect(post.slug).toBe("3");
    expect(post.category).toBe("backend");
    expect(post.description).toBe("DB에서 읽은 설명");
    expect(post.excerpt).toBe("DB에서 읽은 요약");
    expect(post.publishedAt).toBe("2026-07-01");
    expect(post.updatedAt).toBe("2026-07-02");
    expect(post.coverImage).toBe("/posts/legacy-post-slug/cover.png");
    expect(post.embeddedPdf).toBe("/posts/legacy-post-slug/document.pdf");
    expect(post.attachments).toEqual([
      {
        name: "document.pdf",
        kind: "pdf",
        url: "/posts/legacy-post-slug/document.pdf",
      },
    ]);
    expect(post.html).toContain("<h1>제목</h1>");
    expect(post.draft).toBe(false);
  });

  it.each([
    ["both empty", "", "", "본문 첫 문단입니다.", "본문 첫 문단입니다."],
    ["only a description", "직접 쓴 설명", "", "직접 쓴 설명", "직접 쓴 설명"],
    ["only an excerpt", "  ", "직접 쓴 요약", "직접 쓴 요약", "직접 쓴 요약"],
  ])("fills a missing summary field when %s", (_case, description, excerpt, expectedDescription, expectedExcerpt) => {
    const now = new Date("2026-07-07T00:00:00.000Z");
    const post = mapBlogPostFromDatabase({
      id: 11,
      publishedNumber: 4,
      legacySlug: null,
      title: "요약을 비운 글",
      description,
      excerpt,
      bodyMarkdown: "# 제목\n\n**본문** 첫 문단입니다.",
      extension: "md",
      status: "published",
      author: "co2plant",
      categoryId: 1,
      publishedAt: now,
      updatedAt: null,
      originalUrl: null,
      coverImageUrl: null,
      embeddedPdfUrl: null,
      allowPdfDownload: false,
      createdAt: now,
      modifiedAt: now,
      deletedAt: null,
      category: { id: 1, slug: "backend", name: "Backend", sortOrder: 10, createdAt: now },
      tags: [],
      assets: [],
    } satisfies DatabaseBlogPost);

    expect(post.description).toBe(expectedDescription);
    expect(post.excerpt).toBe(expectedExcerpt);
  });
});
