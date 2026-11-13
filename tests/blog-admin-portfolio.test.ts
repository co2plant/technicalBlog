import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    blogPost: {
      findFirst: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    blogCategory: {
      upsert: vi.fn(),
    },
    blogPostTag: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    blogTag: {
      upsert: vi.fn(),
    },
    blogPostRevision: {
      create: vi.fn(),
    },
    blogPostAsset: {
      deleteMany: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (operation: (transaction: typeof tx) => unknown) => operation(tx)),
    },
    revalidatePath: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

import { AdminRequestError } from "../src/lib/admin-api-response";
import {
  publishPost,
  saveDraftPost,
  savePostContentPreservingStatus,
  type AdminPostInput,
} from "../src/lib/blog-admin";

const portfolioInput: AdminPostInput = {
  title: "포트폴리오",
  description: "",
  excerpt: "",
  bodyMarkdown: "본문",
  extension: "md",
  author: "co2plant",
  categorySlug: "portfolio",
  tags: [],
  originalUrl: null,
  coverImageUrl: null,
  embeddedPdfUrl: null,
  allowPdfDownload: true,
};

// findFirst answers the post being saved first, then the search for another published portfolio post.
function givenPost(post: { status: string; publishedNumber: number | null }, otherPortfolio: { publishedNumber: number } | null) {
  mocks.tx.blogPost.findFirst.mockResolvedValueOnce({ id: 42, ...post }).mockResolvedValueOnce(otherPortfolio);
}

describe("single published portfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks keeps queued once-values, which would leak into the next case.
    mocks.tx.blogPost.findFirst.mockReset();
    mocks.tx.blogCategory.upsert.mockResolvedValue({ id: 5, slug: "portfolio" });
    mocks.tx.blogPost.update.mockResolvedValue({});
    mocks.tx.blogPost.aggregate.mockResolvedValue({ _max: { publishedNumber: 12 } });
    mocks.tx.blogPostTag.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.blogPostRevision.create.mockResolvedValue({});
    mocks.tx.blogPostAsset.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("refuses to publish a second portfolio post and points to the existing one", async () => {
    givenPost({ status: "draft", publishedNumber: null }, { publishedNumber: 11 });

    const publishing = publishPost(42, portfolioInput);

    await expect(publishing).rejects.toBeInstanceOf(AdminRequestError);
    await expect(publishing).rejects.toThrow("/posts/11");
    expect(mocks.tx.blogPost.findFirst).toHaveBeenLastCalledWith({
      where: { id: { not: 42 }, categoryId: 5, status: "published", deletedAt: null },
      select: { publishedNumber: true },
    });
    expect(mocks.tx.blogPost.update).not.toHaveBeenCalled();
  });

  it("republishes the existing portfolio post in place", async () => {
    givenPost({ status: "published", publishedNumber: 11 }, null);

    await expect(publishPost(42, portfolioInput)).resolves.toBe(11);
    expect(mocks.tx.blogPost.update).toHaveBeenCalledOnce();
  });

  it("refuses to move a published post into the portfolio while another portfolio is published", async () => {
    givenPost({ status: "published", publishedNumber: 7 }, { publishedNumber: 11 });

    await expect(savePostContentPreservingStatus(42, portfolioInput, { createRevision: false })).rejects.toThrow(
      "/posts/11",
    );
    expect(mocks.tx.blogPost.update).not.toHaveBeenCalled();
  });

  it.each([
    ["an autosaved draft", () => savePostContentPreservingStatus(42, portfolioInput, { createRevision: false }), "draft"],
    ["a manual draft save", () => saveDraftPost(42, portfolioInput), "published"],
  ])("lets %s use the portfolio category", async (_case, save, status) => {
    givenPost({ status, publishedNumber: null }, { publishedNumber: 11 });

    await save();

    expect(mocks.tx.blogPost.update).toHaveBeenCalledOnce();
    expect(mocks.tx.blogPost.findFirst).toHaveBeenCalledOnce();
  });
});
