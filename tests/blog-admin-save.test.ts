import { Prisma } from "@prisma/client";
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

import {
  publishPost,
  saveDraftPost,
  savePostContentPreservingStatus,
  type AdminPostInput,
} from "../src/lib/blog-admin";

const input: AdminPostInput = {
  title: "상태 보존 저장",
  description: "설명",
  excerpt: "요약",
  bodyMarkdown: "본문",
  extension: "md",
  author: "co2plant",
  categorySlug: "backend",
  tags: [],
  originalUrl: null,
  coverImageUrl: null,
  embeddedPdfUrl: null,
  allowPdfDownload: true,
};

describe("savePostContentPreservingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.blogPost.findFirst.mockResolvedValue({
      id: 42,
      status: "published",
      publishedNumber: 7,
    });
    mocks.tx.blogCategory.upsert.mockResolvedValue({
      id: 3,
      slug: "backend",
    });
    mocks.tx.blogPost.update.mockResolvedValue({});
    mocks.tx.blogPost.aggregate.mockResolvedValue({
      _max: {
        publishedNumber: 7,
      },
    });
    mocks.tx.blogPostTag.deleteMany.mockResolvedValue({ count: 0 });
    mocks.tx.blogPostRevision.create.mockResolvedValue({});
    mocks.tx.blogPostAsset.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("omits status and revisions for an autosave", async () => {
    await savePostContentPreservingStatus(42, input, {
      createRevision: false,
    });

    expect(mocks.tx.blogPost.update).toHaveBeenCalledOnce();
    const update = mocks.tx.blogPost.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };

    expect(update.data).not.toHaveProperty("status");
    expect(update.data).toMatchObject({
      originalUrl: null,
      coverImageUrl: null,
      embeddedPdfUrl: null,
    });
    expect(mocks.tx.blogPostAsset.deleteMany).toHaveBeenCalledWith({
      where: {
        postId: 42,
        role: {
          in: ["cover", "embedded_pdf"],
        },
      },
    });
    expect(mocks.tx.blogPostRevision.create).not.toHaveBeenCalled();
  });

  it.each(["autosave", "manual", "publish"] as const)("derives both summary fields from the body for %s", async (mode) => {
    const bodyInput = { ...input, bodyMarkdown: "# 제목\n\n**실제 본문**입니다." };
    if (mode === "publish") {
      await publishPost(42, bodyInput);
    } else {
      await savePostContentPreservingStatus(42, bodyInput, { createRevision: mode === "manual" });
    }
    expect(mocks.tx.blogPost.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ description: "실제 본문입니다.", excerpt: "실제 본문입니다." }),
    }));
    if (mode !== "autosave") {
      expect(mocks.tx.blogPostRevision.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ snapshot: expect.objectContaining({
          description: "실제 본문입니다.", excerpt: "실제 본문입니다.",
        }) }),
      }));
    }
    expect(bodyInput.description).toBe("설명");
  });

  it("creates exactly one revision for a manual save without changing status", async () => {
    await savePostContentPreservingStatus(42, input, {
      createRevision: true,
    });

    expect(mocks.tx.blogPost.update).toHaveBeenCalledOnce();
    const update = mocks.tx.blogPost.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };

    expect(update.data).not.toHaveProperty("status");
    expect(mocks.tx.blogPostRevision.create).toHaveBeenCalledOnce();
    expect(mocks.tx.blogPostRevision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        postId: 42,
        reason: "manual",
        title: input.title,
      }),
    });
  });

  it("keeps the legacy draft action contract", async () => {
    await saveDraftPost(42, input);

    const update = mocks.tx.blogPost.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };

    expect(update.data.status).toBe("draft");
    expect(mocks.tx.blogPostRevision.create).toHaveBeenCalledOnce();
  });

  it("derives the post date in Asia/Seoul", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T16:30:00.000Z"));

    try {
      await savePostContentPreservingStatus(42, input, {
        createRevision: false,
      });
    } finally {
      vi.useRealTimers();
    }

    const update = mocks.tx.blogPost.update.mock.calls[0]?.[0] as {
      data: { updatedAt: Date };
    };

    expect(update.data.updatedAt.toISOString()).toBe("2026-07-12T00:00:00.000Z");
  });

  it("retries the complete publish transaction after a serialization conflict", async () => {
    mocks.tx.blogPost.findFirst.mockResolvedValue({
      id: 42,
      status: "draft",
      publishedNumber: null,
      publishedAt: null,
    });
    mocks.prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("serialization conflict", {
        code: "P2034",
        clientVersion: Prisma.prismaVersion.client,
      }),
    );

    await expect(publishPost(42, input)).resolves.toBe(8);
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(mocks.tx.blogPost.update).toHaveBeenCalledOnce();
    expect(mocks.tx.blogPostRevision.create).toHaveBeenCalledOnce();
  });
});
