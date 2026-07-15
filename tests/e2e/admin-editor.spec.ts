import { expect, test, type Page } from "@playwright/test";

type DraftSavePayload = {
  title?: string;
  bodyMarkdown?: string;
  categorySlug?: string;
  coverImageUrl?: string;
  saveMode?: "manual" | "autosave";
  tags?: Array<{ name: string; slug?: string }>;
};

test.describe("admin post editor", () => {
  test.skip(!process.env.ADMIN_ACCESS_SECRET, "ADMIN_ACCESS_SECRET is required for admin editor e2e.");

  test("renders the writing UI and sends the latest editor payload on draft save", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const bodyToken = `admin-editor-body-${Date.now()}`;
    const tagToken = `admin-editor-tag-${Date.now()}`;
    const categorySlug = `e2e-category-${Date.now()}`;
    const inlineImageUrl = `https://cdn.example.test/${bodyToken}.png`;
    const coverImageUrl = `https://cdn.example.test/${bodyToken}-cover.png`;
    const pdfUrl = `https://cdn.example.test/${bodyToken}.pdf`;
    const draftPayloads: DraftSavePayload[] = [];
    const publishPayload: { current: DraftSavePayload | null } = {
      current: null,
    };
    let assetUploadCount = 0;

    await page.route("**/admin/api/posts/*/draft", async (route) => {
      draftPayloads.push(JSON.parse(route.request().postData() ?? "{}"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "saved",
          savedAt: new Date().toISOString(),
        }),
      });
    });
    await page.route("**/admin/api/posts/*/publish", async (route) => {
      publishPayload.current = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "published",
          publishedNumber: 999,
          url: "/posts/999",
          publishedAt: new Date().toISOString(),
        }),
      });
    });
    await page.route("**/admin/api/categories", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: 9999,
          name: "E2E Category",
          slug: categorySlug,
          sortOrder: 9999,
        }),
      });
    });
    await page.route("**/admin/api/posts/*/assets", async (route) => {
      const responses = [
        {
          publicUrl: inlineImageUrl,
          role: "inline",
          mimeType: "image/png",
          altText: "e2e-inline",
          caption: "e2e-inline.png",
        },
        {
          publicUrl: coverImageUrl,
          role: "cover",
          mimeType: "image/png",
          altText: "e2e-cover",
          caption: "e2e-cover.png",
        },
        {
          publicUrl: pdfUrl,
          role: "attachment",
          mimeType: "application/pdf",
          altText: "e2e-pdf",
          caption: "e2e-pdf.pdf",
        },
      ] as const;
      const response = responses[Math.min(assetUploadCount, responses.length - 1)];
      assetUploadCount += 1;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...response,
          bucket: response.mimeType === "application/pdf" ? "blog-assets" : "blog-images",
          objectPath: `posts/e2e/${assetUploadCount}`,
          uploadedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/admin/login");
    await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
    await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);

    const firstPostHref = await page.locator("a").evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((href): href is string => Boolean(href?.startsWith("/admin/posts/"))),
    );

    if (!firstPostHref) {
      throw new Error("No admin post link was found.");
    }

    await page.goto(firstPostHref);
    await expect(page.locator(".toastui-editor-defaultUI")).toBeVisible();
    await expect(page.getByRole("button", { name: "본문 이미지 삽입" })).toBeVisible();
    await expect(page.getByRole("button", { name: "카테고리 추가" })).toBeVisible();

    await page.getByPlaceholder("제목을 입력하세요").fill(`[E2E] ${bodyToken}`);
    await page.locator(".toastui-editor-ww-container .ProseMirror").click();
    await page.keyboard.type(` ${bodyToken}`);
    const preview = page.waitForEvent("popup");
    await page.getByRole("button", { name: "미리보기" }).click();
    const previewPage = await preview;
    await expect(previewPage).toHaveURL(/\/admin\/posts\/\d+\/preview$/);
    await previewPage.close();
    await page.getByLabel("카테고리 추가").click();
    await page.getByPlaceholder("카테고리 이름").fill("E2E Category");
    await page.getByPlaceholder("category-slug").fill(categorySlug);
    await page.locator("button").filter({ hasText: "카테고리 추가" }).last().click();
    await expect.poll(() => page.locator("select").first().inputValue()).toBe(categorySlug);
    await page.getByPlaceholder("태그 이름").fill(tagToken);
    await page.getByRole("button", { name: "태그 추가" }).click();
    await page.locator(`input[accept="image/png,image/jpeg,image/webp,image/gif"]`).first().setInputFiles({
      name: "e2e-inline.png",
      mimeType: "image/png",
      buffer: Buffer.from([137, 80, 78, 71]),
    });
    await expect.poll(() => assetUploadCount).toBe(1);
    await page.locator(`input[accept="image/png,image/jpeg,image/webp,image/gif"]`).nth(1).setInputFiles({
      name: "e2e-cover.png",
      mimeType: "image/png",
      buffer: Buffer.from([137, 80, 78, 71]),
    });
    await expect.poll(() => assetUploadCount).toBe(2);
    await page.locator(`input[accept="application/pdf"]`).first().setInputFiles({
      name: "e2e-pdf.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7\n"),
    });
    await expect.poll(() => assetUploadCount).toBe(3);
    await page.getByRole("button", { name: "임시저장" }).click();

    await expect.poll(() => draftPayloads.filter((payload) => payload.saveMode === "manual").length).toBe(1);

    expect(draftPayloads.some((payload) => payload.saveMode === "autosave")).toBe(true);
    const payload = requireDraftPayload(draftPayloads.find((candidate) => candidate.saveMode === "manual") ?? null);
    expect(payload.title).toBe(`[E2E] ${bodyToken}`);
    expect(payload.bodyMarkdown).toContain(bodyToken);
    expect(payload.bodyMarkdown).toContain(inlineImageUrl);
    expect(payload.bodyMarkdown).toContain(pdfUrl);
    expect(payload.categorySlug).toBe(categorySlug);
    expect(payload.coverImageUrl).toBe(coverImageUrl);
    expect(payload.saveMode).toBe("manual");
    expect(payload.tags?.some((tag) => tag.name === tagToken)).toBe(true);

    await page.getByRole("button", { name: "발행", exact: true }).click();
    await expect.poll(() => publishPayload.current).not.toBeNull();
    await expect(page.getByText("발행 완료: /posts/999")).toBeVisible();

    const publishedPayload = requireDraftPayload(publishPayload.current);
    expect(publishedPayload.title).toBe(`[E2E] ${bodyToken}`);
    expect(publishedPayload.bodyMarkdown).toContain(inlineImageUrl);
    expect(publishedPayload.categorySlug).toBe(categorySlug);
  });

  test("supports full-width focus mode and a mobile settings drawer", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFirstAdminPost(page);

    const shell = page.getByTestId("admin-editor-shell");
    const writingPane = page.getByTestId("admin-editor-writing-pane");
    const fullWidthButton = page.getByRole("button", { name: "전체 너비" });
    const desktopSettingsButton = page.getByRole("button", { name: "설정 패널" });

    await expect(page.locator(".toastui-editor-defaultUI")).toBeVisible();
    await expect(fullWidthButton).toHaveAttribute("aria-pressed", "true");
    const fullWidth = (await shell.boundingBox())?.width ?? 0;

    await fullWidthButton.click();
    await expect(fullWidthButton).toHaveAttribute("aria-pressed", "false");
    await expect(shell).toHaveAttribute("data-layout", "constrained");
    await expect
      .poll(async () => (await shell.boundingBox())?.width ?? 0)
      .toBeLessThan(fullWidth - 100);

    await page.reload();
    await expect(page.locator(".toastui-editor-defaultUI")).toBeVisible();
    await expect(fullWidthButton).toHaveAttribute("aria-pressed", "false");
    await expect(shell).toHaveAttribute("data-layout", "constrained");

    await fullWidthButton.click();
    await expect(fullWidthButton).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () => (await shell.boundingBox())?.width ?? 0)
      .toBeGreaterThan(fullWidth - 5);
    await expect(desktopSettingsButton).toHaveAttribute("aria-expanded", "true");
    const writingWidthWithSettings = (await writingPane.boundingBox())?.width ?? 0;

    await desktopSettingsButton.click();
    await expect(desktopSettingsButton).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#admin-post-settings")).toBeHidden();
    await expect
      .poll(async () => (await writingPane.boundingBox())?.width ?? 0)
      .toBeGreaterThan(writingWidthWithSettings + 200);

    await desktopSettingsButton.click();
    await expect(desktopSettingsButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#admin-post-settings")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileSettingsButton = page.getByRole("button", { name: "설정 열기" });
    await expect(mobileSettingsButton).toBeVisible();
    await expect(mobileSettingsButton).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#admin-post-settings")).toBeHidden();
    await expect(page.getByTestId("admin-toast-editor-host")).toHaveCSS("height", "664px");
    await expect(page.locator(".toastui-editor-toolbar-icons.more")).toBeVisible();

    const bodyOverflowBeforeOpen = await page.evaluate(() => document.body.style.overflow);
    await mobileSettingsButton.click();
    const settingsDialog = page.getByRole("dialog", { name: "글 설정" });
    await expect(settingsDialog).toBeVisible();
    await expect(page.getByRole("button", { name: "설정 닫기" })).toBeFocused();
    await expect(settingsDialog.getByRole("button", { name: "본문 이미지 삽입" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    const dialogBox = await settingsDialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect(dialogBox?.y ?? -1).toBeGreaterThanOrEqual(0);
    expect((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(391);
    expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(845);

    await page.keyboard.press("Escape");
    await expect(page.locator("#admin-post-settings")).toBeHidden();
    await expect(mobileSettingsButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileSettingsButton).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(bodyOverflowBeforeOpen);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  });

  test("keeps in-flight edits dirty and saves the latest title once after the first request", async ({ page }) => {
    const token = Date.now();
    const titleA = `[E2E] in-flight-save-a-${token}`;
    const titleB = `[E2E] in-flight-save-b-${token}`;
    const bodyB = `in-flight-save-body-b-${token}`;
    const draftPayloads: DraftSavePayload[] = [];
    let activeDraftRequests = 0;
    let maxConcurrentDraftRequests = 0;
    let releaseFirstDraftRequest!: () => void;
    const firstDraftRequestReleased = new Promise<void>((resolve) => {
      releaseFirstDraftRequest = resolve;
    });

    await page.route("**/admin/api/posts/*/draft", async (route) => {
      const requestIndex = draftPayloads.push(JSON.parse(route.request().postData() ?? "{}")) - 1;
      activeDraftRequests += 1;
      maxConcurrentDraftRequests = Math.max(maxConcurrentDraftRequests, activeDraftRequests);

      try {
        if (requestIndex === 0) {
          await firstDraftRequestReleased;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "saved",
            savedAt: new Date().toISOString(),
          }),
        });
      } finally {
        activeDraftRequests -= 1;
      }
    });

    await page.goto("/admin/login");
    await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
    await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);

    const firstPostHref = await page.locator("a").evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((href): href is string => Boolean(href?.startsWith("/admin/posts/"))),
    );

    if (!firstPostHref) {
      throw new Error("No admin post link was found.");
    }

    await page.goto(firstPostHref);
    await expect(page.locator(".toastui-editor-defaultUI")).toBeVisible();

    const titleInput = page.getByPlaceholder("제목을 입력하세요");
    await titleInput.fill(titleA);
    await expect(titleInput).toHaveValue(titleA);
    await page.getByRole("button", { name: "임시저장" }).click();

    await expect.poll(() => draftPayloads.length).toBe(1);
    await expect(page.getByText("저장 중", { exact: true })).toBeVisible();

    try {
      await titleInput.fill(titleB);
      await expect(titleInput).toHaveValue(titleB);
      await page.locator(".toastui-editor-ww-container .ProseMirror").click();
      await page.keyboard.type(` ${bodyB}`);
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      );
      expect(draftPayloads).toHaveLength(1);
      expect(maxConcurrentDraftRequests).toBe(1);
    } finally {
      releaseFirstDraftRequest();
    }

    await expect.poll(() => draftPayloads.length).toBe(2);
    expect(requireDraftPayload(draftPayloads[0] ?? null).title).toBe(titleA);
    expect(requireDraftPayload(draftPayloads[0] ?? null).saveMode).toBe("manual");
    const latestPayload = requireDraftPayload(draftPayloads[1] ?? null);
    expect(latestPayload.title).toBe(titleB);
    expect(latestPayload.bodyMarkdown).toContain(bodyB);
    expect(latestPayload.saveMode).toBe("autosave");
    await expect(page.getByText(/^저장됨 /)).toBeVisible();
    expect(draftPayloads).toHaveLength(2);
    expect(maxConcurrentDraftRequests).toBe(1);
  });

  test("keeps failed saves unsaved, guards navigation, and retries the latest payload", async ({ page }) => {
    const title = `[E2E] failed-save-${Date.now()}`;
    const retryTitle = `${title}-retry`;
    const draftPayloads: DraftSavePayload[] = [];
    let shouldFail = true;

    await page.route("**/admin/api/posts/*/draft", async (route) => {
      draftPayloads.push(JSON.parse(route.request().postData() ?? "{}"));
      await route.fulfill({
        status: shouldFail ? 500 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          shouldFail
            ? { error: "Intentional E2E save failure." }
            : { status: "saved", savedAt: new Date().toISOString() },
        ),
      });
    });

    await page.goto("/admin/login");
    await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
    await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);

    const firstPostHref = await page.locator("a").evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((href): href is string => Boolean(href?.startsWith("/admin/posts/"))),
    );

    if (!firstPostHref) {
      throw new Error("No admin post link was found.");
    }

    await page.goto(firstPostHref);
    await expect(page.locator(".toastui-editor-defaultUI")).toBeVisible();
    await page.getByPlaceholder("제목을 입력하세요").fill(title);
    await page.getByRole("button", { name: "임시저장" }).click();

    await expect(page.getByText("저장 실패", { exact: true })).toBeVisible();
    expect(requireDraftPayload(draftPayloads[0] ?? null).title).toBe(title);

    let navigationWarning = "";
    page.once("dialog", async (dialog) => {
      navigationWarning = dialog.message();
      await dialog.dismiss();
    });
    await page.getByRole("link", { name: "목록", exact: true }).click();
    await expect.poll(() => navigationWarning).toContain("저장되지 않은 변경사항");
    await expect(page).toHaveURL(new RegExp(`${firstPostHref}$`));

    await page.getByPlaceholder("제목을 입력하세요").fill(retryTitle);
    shouldFail = false;
    await page.getByRole("button", { name: "임시저장" }).click();

    await expect.poll(() => draftPayloads.length).toBe(2);
    expect(requireDraftPayload(draftPayloads[1] ?? null).title).toBe(retryTitle);
    expect(requireDraftPayload(draftPayloads[1] ?? null).saveMode).toBe("manual");
    await expect(page.getByText(/^저장됨 /)).toBeVisible();
  });
});

function requireDraftPayload(payload: DraftSavePayload | null): DraftSavePayload {
  if (!payload) {
    throw new Error("Draft save payload was not captured.");
  }

  return payload;
}

async function openFirstAdminPost(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
  await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);

  const firstPostHref = await page.locator("a").evaluateAll((links) =>
    links
      .map((link) => link.getAttribute("href"))
      .find((href): href is string => Boolean(href?.startsWith("/admin/posts/"))),
  );

  if (!firstPostHref) {
    throw new Error("No admin post link was found.");
  }

  await page.goto(firstPostHref);
}
