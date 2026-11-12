import { expect, test } from "@playwright/test";

test("editor derives summary and description from the latest body and saves them", async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
  await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);
  const href = await page.locator('a[href^="/admin/posts/"]').filter({ hasText: "[Local] 에디터 로컬 초안" }).first().getAttribute("href");
  expect(href).not.toBeNull();
  await page.goto(href!);
  await expect(page.getByLabel("글 설명")).toHaveCount(0);
  await expect(page.getByPlaceholder("목록 카드에 보일 요약")).toHaveCount(0);

  await page.getByText("마크다운", { exact: true }).click();
  const markdown = '# 중복 제목\n\n![커버](/icon.png)\n\n```sql\nSELECT 1;\n```\n\n**본문 앞부분**으로 요약을 만듭니다. [링크](https://example.com)와 `인라인 코드`도 읽을 수 있습니다.';
  const summary = "본문 앞부분으로 요약을 만듭니다. 링크와 인라인 코드도 읽을 수 있습니다.";
  await page.locator(".toastui-editor-md-container .ProseMirror").fill(markdown);
  await expect(page.getByTestId("admin-post-summary")).toHaveText(summary);
  await page.screenshot({ path: testInfo.outputPath("automatic-summary-desktop.png") });
  const saveRequest = page.waitForRequest(request => request.method() === "POST" && request.url().endsWith("/draft"));
  const previewPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  const request = await saveRequest;
  expect(request.postDataJSON()).toMatchObject({ description: summary, excerpt: summary });
  const preview = await previewPromise;
  await expect(preview.locator("article header p").last()).toHaveText(summary);
  await preview.close();

  await page.reload();
  await expect(page.getByTestId("admin-post-summary")).toHaveText(summary);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "설정 열기" }).click();
  await expect(page.getByTestId("admin-post-summary")).toBeVisible();
  await page.getByRole("dialog").screenshot({ path: testInfo.outputPath("automatic-summary-mobile.png") });
});

test("existing posts use opening prose consistently in lists, metadata and feeds", async ({ page, request }) => {
  await page.goto("/posts");
  const card = page.getByRole("list", { name: "게시글 목록" }).getByRole("link", { name: "[Git] Commit Message Convention" });
  const summary = await card.locator("p").textContent();
  expect(summary).toMatch(/^깃을 이용해 작업을 하다 보면/);
  expect(summary!.length).toBeLessThanOrEqual(160);
  await card.click();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", summary!);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", summary!);
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(jsonLd!).description).toBe(summary);
  const rss = await request.get("/rss.xml");
  expect(await rss.text()).toContain(summary);
});
