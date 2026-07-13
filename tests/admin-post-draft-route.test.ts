import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdminAuthenticated: vi.fn(),
  savePostContentPreservingStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminAuthenticated: mocks.isAdminAuthenticated,
}));

vi.mock("@/lib/blog-admin", () => ({
  savePostContentPreservingStatus: mocks.savePostContentPreservingStatus,
}));

import { POST } from "../src/app/admin/api/posts/[id]/draft/route";

describe("admin post draft route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdminAuthenticated.mockResolvedValue(true);
    mocks.savePostContentPreservingStatus.mockResolvedValue(undefined);
  });

  it("rejects unauthenticated writes", async () => {
    mocks.isAdminAuthenticated.mockResolvedValue(false);

    const response = await POST(
      createRequest("manual"),
      {
        params: Promise.resolve({ id: "42" }),
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.savePostContentPreservingStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["manual", true],
    ["autosave", false],
  ] as const)("preserves publication status for %s saves", async (saveMode, createRevision) => {
    const response = await POST(
      createRequest(saveMode),
      {
        params: Promise.resolve({ id: "42" }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.savePostContentPreservingStatus).toHaveBeenCalledOnce();
    expect(mocks.savePostContentPreservingStatus).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        title: "상태 보존 저장",
        bodyMarkdown: "본문",
        originalUrl: null,
        coverImageUrl: null,
        embeddedPdfUrl: null,
      }),
      { createRevision },
    );
  });

  it("keeps omitted saveMode backward-compatible with manual saves", async () => {
    const response = await POST(
      createRequest(),
      {
        params: Promise.resolve({ id: "42" }),
      },
    );

    expect(response.status).toBe(200);
    expect(mocks.savePostContentPreservingStatus).toHaveBeenCalledWith(42, expect.any(Object), {
      createRevision: true,
    });
  });

  it("rejects an unknown save mode before writing", async () => {
    const response = await POST(
      createRequest("invalid"),
      {
        params: Promise.resolve({ id: "42" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "saveMode must be manual or autosave.",
    });
    expect(mocks.savePostContentPreservingStatus).not.toHaveBeenCalled();
  });

  it("rejects an incomplete full-save payload before writing", async () => {
    const response = await POST(
      createRequest("manual", { bodyMarkdown: undefined }),
      {
        params: Promise.resolve({ id: "42" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "bodyMarkdown must be a string.",
    });
    expect(mocks.savePostContentPreservingStatus).not.toHaveBeenCalled();
  });

  it("deduplicates tags with the same generated server slug", async () => {
    const response = await POST(
      createRequest("manual", {
        tags: [{ name: "Spring Boot" }, { name: "spring-boot" }],
      }),
      {
        params: Promise.resolve({ id: "42" }),
      },
    );

    expect(response.status).toBe(200);
    const input = mocks.savePostContentPreservingStatus.mock.calls[0]?.[1] as {
      tags: Array<{ name: string }>;
    };
    expect(input.tags).toEqual([{ name: "spring-boot" }]);
  });
});

function createRequest(saveMode?: string, overrides: Record<string, unknown> = {}): Parameters<typeof POST>[0] {
  return new Request("http://localhost/admin/api/posts/42/draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "상태 보존 저장",
      description: "설명",
      excerpt: "요약",
      bodyMarkdown: "본문",
      extension: "mdx",
      author: "co2plant",
      categorySlug: "backend",
      tags: [],
      originalUrl: "",
      coverImageUrl: "",
      embeddedPdfUrl: "",
      allowPdfDownload: true,
      ...(saveMode === undefined ? {} : { saveMode }),
      ...overrides,
    }),
  }) as Parameters<typeof POST>[0];
}
