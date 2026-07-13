// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPostEditor } from "../src/app/admin/posts/[id]/admin-post-editor";

type AddImageBlobHook = (blob: Blob | File, callback: (url: string, text?: string) => void) => void | Promise<void>;

const editorMock = vi.hoisted(() => ({
  addImageBlobHook: undefined as AddImageBlobHook | undefined,
}));

vi.mock("@toast-ui/editor", () => ({
  default: class MockEditor {
    constructor(options: { hooks?: { addImageBlobHook?: AddImageBlobHook } }) {
      editorMock.addImageBlobHook = options.hooks?.addImageBlobHook;
    }
    destroy() {}
    exec() {}
    getMarkdown() {
      return "";
    }
    insertText() {}
    on() {}
  },
}));

vi.mock("@toast-ui/editor/dist/i18n/ko-kr", () => ({
  default: {},
}));

describe("AdminPostEditor autosave wiring", () => {
  let container: HTMLDivElement;
  let root: Root | null;
  const fetchMock = vi.fn();
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };

  beforeEach(async () => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    editorMock.addImageBlobHook = undefined;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "saved",
          savedAt: "2026-07-12T00:00:00.000Z",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    container = document.createElement("div");
    document.body.appendChild(container);
    const nextRoot = createRoot(container);
    root = nextRoot;

    await act(async () => {
      nextRoot.render(
        <AdminPostEditor
          initialPost={{
            id: 1,
            title: "기존 제목",
            description: "",
            excerpt: "",
            author: "co2plant",
            status: "draft",
            publishedNumber: null,
            legacySlug: null,
            extension: "md",
            bodyMarkdown: "",
            categorySlug: "backend",
            tags: [],
            originalUrl: "",
            coverImageUrl: "",
            embeddedPdfUrl: "",
            allowPdfDownload: true,
            assets: [],
          }}
          initialCategories={[
            {
              id: 1,
              name: "Backend",
              slug: "backend",
              sortOrder: 10,
            },
          ]}
          messages={{}}
        />,
      );

      await Promise.resolve();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });

    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  it("posts the latest dirty payload after 30 seconds", async () => {
    const titleInput = container.querySelector<HTMLInputElement>('input[placeholder="제목을 입력하세요"]');

    expect(titleInput).not.toBeNull();

    await act(async () => {
      setNativeInputValue(titleInput!, "자동저장 제목");
      titleInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_999);
    });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("/admin/api/posts/1/draft");
    expect(JSON.parse(String(options.body))).toMatchObject({
      title: "자동저장 제목",
      saveMode: "autosave",
    });
  });

  it("keeps an automatically generated category slug in sync while typing", async () => {
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="카테고리 추가"]');

    if (!toggle) {
      throw new Error("Category form toggle was not rendered.");
    }

    await act(async () => {
      toggle.click();
    });

    const nameInput = container.querySelector<HTMLInputElement>('input[placeholder="카테고리 이름"]');
    const slugInput = container.querySelector<HTMLInputElement>('input[placeholder="category-slug"]');

    if (!nameInput || !slugInput) {
      throw new Error("Category inputs were not rendered.");
    }

    for (const value of ["B", "Ba", "Bac", "Back", "Backe", "Backen", "Backend"]) {
      await act(async () => {
        setNativeInputValue(nameInput, value);
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    expect(slugInput.value).toBe("backend");
  });

  it("guards same-origin navigation outside the editor while changes are unsaved", async () => {
    await editTitle(container, "사이트 헤더 이동 방지");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const link = document.createElement("a");
    link.href = "/posts";
    link.textContent = "게시글";
    document.body.appendChild(link);
    const click = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });

    link.dispatchEvent(click);

    expect(confirm).toHaveBeenCalledOnce();
    expect(click.defaultPrevented).toBe(true);
    link.remove();
  });

  it("deduplicates generated and explicit tag slugs with the server rule", async () => {
    const tagInput = container.querySelector<HTMLInputElement>('input[aria-label="태그 이름"]');
    const addButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (candidate) => candidate.textContent?.trim() === "태그 추가",
    );

    if (!tagInput || !addButton) {
      throw new Error("Tag controls were not rendered.");
    }

    for (const value of ["Spring Boot", "spring-boot"]) {
      await act(async () => {
        setNativeInputValue(tagInput, value);
        tagInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        addButton.click();
      });
    }

    expect(container.querySelectorAll('button[title="클릭하면 삭제됩니다"]')).toHaveLength(1);
  });

  it("keeps actions disabled until every overlapping operation finishes", async () => {
    const upload = deferredResponse();
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/assets")) {
        return upload.promise;
      }

      return Promise.resolve(savedResponse());
    });

    await startInlineUpload(container);
    await editTitle(container, "업로드 중 자동저장");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(draftRequestCount()).toBe(1);
    expect(saveButton(container).disabled).toBe(true);

    await act(async () => {
      upload.resolve(assetResponse());
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(saveButton(container).disabled).toBe(false);
  });

  it("tracks uploads started from the Toast UI image hook", async () => {
    const upload = deferredResponse();
    fetchMock.mockReset();
    fetchMock.mockReturnValue(upload.promise);
    const hook = editorMock.addImageBlobHook;

    if (!hook) {
      throw new Error("Toast UI image hook was not registered.");
    }

    let hookPromise: void | Promise<void>;
    const callback = vi.fn();

    await act(async () => {
      hookPromise = hook(new File([new Uint8Array([137, 80, 78, 71])], "hook.png", { type: "image/png" }), callback);
      await Promise.resolve();
    });

    expect(saveButton(container).disabled).toBe(true);

    await act(async () => {
      upload.resolve(assetResponse());
      await hookPromise;
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(saveButton(container).disabled).toBe(false);
  });

  it("bypasses the unload warning after a successful delete", async () => {
    await editTitle(container, "삭제할 글");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deleteButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (candidate) => candidate.textContent?.trim() === "삭제",
    );

    if (!deleteButton) {
      throw new Error("Delete button was not rendered.");
    }

    await act(async () => {
      deleteButton.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);

    expect(beforeUnload.defaultPrevented).toBe(false);
  });

  it("does not queue another save when an upload finishes after unmount", async () => {
    const upload = deferredResponse();
    const save = deferredResponse();
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/assets")) {
        return upload.promise;
      }

      if (url.endsWith("/draft")) {
        return save.promise;
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    await startInlineUpload(container);
    await editTitle(container, "화면 이탈 직전 자동저장");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(draftRequestCount()).toBe(1);

    await act(async () => {
      root?.unmount();
      root = null;
    });

    await act(async () => {
      upload.resolve(assetResponse());
      await Promise.resolve();
      save.resolve(savedResponse());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(draftRequestCount()).toBe(1);
  });

  function draftRequestCount(): number {
    return fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/draft")).length;
  }
});

function setNativeInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

  setter?.call(input, value);
}

async function editTitle(container: HTMLDivElement, value: string): Promise<void> {
  const titleInput = container.querySelector<HTMLInputElement>('input[placeholder="제목을 입력하세요"]');

  if (!titleInput) {
    throw new Error("Title input was not rendered.");
  }

  await act(async () => {
    setNativeInputValue(titleInput, value);
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function startInlineUpload(container: HTMLDivElement): Promise<void> {
  const input = container.querySelector<HTMLInputElement>('input[accept="image/png,image/jpeg,image/webp,image/gif"]');

  if (!input) {
    throw new Error("Inline image input was not rendered.");
  }

  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File([new Uint8Array([137, 80, 78, 71])], "inline.png", { type: "image/png" })],
  });

  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
}

function saveButton(container: HTMLDivElement): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent?.trim() === "임시저장",
  );

  if (!button) {
    throw new Error("Save button was not rendered.");
  }

  return button;
}

function savedResponse(): Response {
  return new Response(
    JSON.stringify({
      status: "saved",
      savedAt: "2026-07-12T00:00:00.000Z",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function assetResponse(): Response {
  return new Response(
    JSON.stringify({
      publicUrl: "https://cdn.example.test/inline.png",
      role: "inline",
      mimeType: "image/png",
      altText: "inline",
      caption: "inline.png",
      uploadedAt: "2026-07-12T00:00:00.000Z",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function deferredResponse(): {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
} {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
