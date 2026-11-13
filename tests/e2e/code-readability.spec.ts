import { expect, test, type Locator } from "@playwright/test";

async function expectReadableCode(code: Locator) {
  await expect(code).toBeVisible();
  await expect(code).toHaveCSS("font-family", /^D2Coding,/);
  await expect(code).toHaveCSS("font-size", "16px");
  await expect(code).toHaveCSS("font-variant-ligatures", "none");
  await expect(code).toHaveCSS("letter-spacing", /^(normal|0px)$/);
  const fontLoaded = await code.evaluate(async (element) => {
    const style = getComputedStyle(element);
    const fonts = await document.fonts.load(`${style.fontWeight} ${style.fontSize} D2Coding`, "Java 한글");
    return fonts.some((font) => font.status === "loaded");
  });
  expect(fontLoaded).toBe(true);
}

test("code stays readable in published posts, editor modes and preview", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts/1");
  const publishedCode = page.locator(".post-detail__body pre:not(.mermaid) code").first();
  await expectReadableCode(publishedCode);
  // Keyboard users reach the scrollable block by its name.
  await expect(page.getByRole("region", { name: "코드 블록", exact: true }).first()).toBeVisible();
  await expectReadableCode(page.locator(".post-detail__body :not(pre) > code").first());
  const source = await publishedCode.textContent();
  await expect(publishedCode.locator("..")).toHaveCSS("white-space", "pre");
  await expect(publishedCode.locator("..")).toHaveCSS("overflow-x", "auto");
  await expect(publishedCode.locator("..")).toHaveCSS("background-color", "rgb(244, 245, 246)");
  await expect(publishedCode).toHaveCSS("color", "rgb(19, 20, 22)");

  await page.setViewportSize({ width: 375, height: 812 });
  const codeBounds = await publishedCode.locator("..").boundingBox();
  expect(codeBounds).not.toBeNull();
  expect(codeBounds!.x + codeBounds!.width).toBeLessThanOrEqual(375);
  await publishedCode.locator("..").screenshot({ path: testInfo.outputPath("published-code-light.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(publishedCode.locator("..")).toHaveCSS("background-color", "rgb(22, 27, 34)");
  await expect(publishedCode).toHaveCSS("color", "rgb(201, 209, 217)");

  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
  await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);
  const editorHref = await page.locator('a[href^="/admin/posts/"]').filter({ hasText: "[Git] Commit Message Convention" }).first().getAttribute("href");
  expect(editorHref).not.toBeNull();
  await page.goto(editorHref!);
  const editorCode = page.locator(".toastui-editor-ww-container pre code").first();
  await expectReadableCode(editorCode);
  await expectReadableCode(page.locator(".toastui-editor-ww-container :not(pre) > code").first());
  await expect(editorCode.locator("..")).toHaveCSS("padding-top", "48px");
  await editorCode.locator("..").screenshot({ path: testInfo.outputPath("editor-code.png") });
  await page.getByText("마크다운", { exact: true }).click();
  const markdownCode = page.locator(".toastui-editor-md-container .toastui-editor-md-code-block").first();
  await expectReadableCode(markdownCode);

  await page.goto(`${editorHref}/preview`);
  const previewCode = page.locator(".post-detail__body pre:not(.mermaid) code").first();
  await expectReadableCode(previewCode);
  expect(await previewCode.textContent()).toBe(source);
});

test("syntax highlighting survives editing, saving and preview", async ({ page, context }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
  await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);
  const editorHref = await page.locator('a[href^="/admin/posts/"]').filter({ hasText: "[Local] 에디터 로컬 초안" }).first().getAttribute("href");
  expect(editorHref).not.toBeNull();
  await page.goto(editorHref!);
  await page.getByText("마크다운", { exact: true }).click();
  const java = '// 한글 주석도 같은 글꼴로 표시합니다.\npublic class Greeting {\n    public static void main(String[] args) {\n        String message = "안녕하세요, Java!";\n        System.out.println(message);\n    }\n}';
  const sql = "SELECT title FROM posts WHERE published = true;";
  const unknown = '<script>alert("일반 코드")</script>';
  const markdown = `# 구문 강조 확인\n\n\`\`\`java\n${java}\n\`\`\`\n\n\`\`\`sql\n${sql}\n\`\`\`\n\n\`\`\`unknown-language\n${unknown}\n\`\`\``;
  await page.locator(".toastui-editor-md-container .ProseMirror").fill(markdown);
  await page.getByText("위지윅", { exact: true }).click();
  const editorBlocks = page.locator(".toastui-editor-ww-container pre code");
  await expectReadableCode(editorBlocks.nth(0));
  await expect(editorBlocks.nth(0)).toHaveText(java);
  await expect(editorBlocks.nth(0).locator(".token.keyword").first()).toHaveCSS("color", "rgb(11, 80, 208)");
  await expect(editorBlocks.nth(0).locator(".token.string")).toHaveCSS("color", "rgb(31, 122, 71)");
  await expect(editorBlocks.nth(1).locator(".token.keyword").first()).toBeVisible();
  await expect(editorBlocks.nth(2).locator(".token")).toHaveCount(0);
  await expect(editorBlocks.nth(2)).toHaveText(unknown);
  await editorBlocks.nth(0).locator("..").screenshot({ path: testInfo.outputPath("editor-java-highlight.png") });

  // Preview saves through the real draft API; fixtures use an isolated E2E database.
  const previewPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  const preview = await previewPromise;
  await preview.waitForLoadState();
  const previewBlocks = preview.locator(".post-detail__body pre code");
  await expectReadableCode(previewBlocks.nth(0));
  expect(await previewBlocks.nth(0).textContent()).toBe(java);
  expect(await previewBlocks.nth(1).textContent()).toBe(sql);
  await expect(previewBlocks.nth(0).locator(".token.keyword").first()).toHaveCSS("color", "rgb(11, 80, 208)");
  await expect(previewBlocks.nth(2).locator(".token, script")).toHaveCount(0);
  expect(await previewBlocks.nth(2).textContent()).toBe(unknown);
  await previewBlocks.nth(0).locator("..").screenshot({ path: testInfo.outputPath("preview-java-highlight.png") });
  await preview.emulateMedia({ colorScheme: "dark" });
  await expect(previewBlocks.nth(0).locator(".token.keyword").first()).toHaveCSS("color", "rgb(121, 192, 255)");
  await expect(previewBlocks.nth(0).locator(".token.string")).toHaveCSS("color", "rgb(63, 185, 80)");
  await preview.setViewportSize({ width: 375, height: 812 });
  const bounds = await previewBlocks.nth(0).locator("..").boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  await preview.close();
  await page.reload();
  await expect(page.locator(".toastui-editor-ww-container pre code").first()).toHaveText(java);
});
