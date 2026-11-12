import { expect, test, type Page } from "@playwright/test";

test.describe("post summary", () => {
  test.skip(!process.env.ADMIN_ACCESS_SECRET, "ADMIN_ACCESS_SECRET is required for admin editor e2e.");

  test("uses the written summary first and keeps an empty field empty", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openLocalDraft(page);
    const field = page.getByRole("textbox", { name: "요약 · 검색 설명" });
    const hint = page.getByTestId("admin-post-summary-hint");

    // The fixture has a written description, so it fills the field and no hint is shown.
    await expect(field).toHaveValue("로컬에서 글 작성 화면을 확인하는 초안입니다.");
    await expect(hint).toHaveCount(0);

    await field.fill("");
    await page.getByText("마크다운", { exact: true }).click();
    const markdown = '# 중복 제목\n\n![커버](/icon.png)\n\n```sql\nSELECT 1;\n```\n\n**본문 앞부분**으로 요약을 만듭니다. [링크](https://example.com)와 `인라인 코드`도 읽을 수 있습니다.';
    const automaticSummary = "본문 앞부분으로 요약을 만듭니다. 링크와 인라인 코드도 읽을 수 있습니다.";
    await page.locator(".toastui-editor-md-container .ProseMirror").fill(markdown);
    await expect(hint).toHaveText(`비워 두면 이 내용이 쓰입니다: ${automaticSummary}`);

    expect(await saveDraft(page)).toMatchObject({ description: "", excerpt: "" });
    await page.reload();
    await expect(field).toHaveValue("");
    await expect(hint).toHaveText(`비워 두면 이 내용이 쓰입니다: ${automaticSummary}`);

    await field.fill("직접 쓴 요약입니다.");
    await expect(hint).toHaveCount(0);
    expect(await saveDraft(page)).toMatchObject({ description: "직접 쓴 요약입니다.", excerpt: "직접 쓴 요약입니다." });
    await page.reload();
    await expect(field).toHaveValue("직접 쓴 요약입니다.");
  });
});

test("published posts keep their written summary in lists, metadata and feeds", async ({ page, request }) => {
  const excerpt = "커밋 메시지를 규칙 없이 작성했을 때의 문제를 짚고, type/subject/body/footer 구조와 실전 예시를 정리합니다.";
  const description = "난잡한 커밋 메시지를 줄이고 협업 탐색성을 높이기 위한 Git Commit Message Convention 정리";

  await page.goto("/posts");
  const card = page.getByRole("list", { name: "게시글 목록" }).getByRole("link", { name: "[Git] Commit Message Convention" });
  await expect(card.locator("p")).toHaveText(excerpt);
  await card.click();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description);
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(jsonLd!).description).toBe(description);
  const rss = await request.get("/rss.xml");
  expect(await rss.text()).toContain(description);
});

async function openLocalDraft(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
  await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);
  const href = await page.locator('a[href^="/admin/posts/"]').filter({ hasText: "[Local] 에디터 로컬 초안" }).first().getAttribute("href");
  expect(href).not.toBeNull();
  await page.goto(href!);
  await expect(page.locator(".toastui-editor-defaultUI")).toBeVisible();
}

async function saveDraft(page: Page): Promise<unknown> {
  // Real draft API: the E2E fixtures live in an isolated database.
  const response = page.waitForResponse((candidate) =>
    candidate.request().method() === "POST" && candidate.url().endsWith("/draft") && candidate.ok(),
  );
  await page.getByRole("button", { name: "임시저장", exact: true }).click();
  return (await response).request().postDataJSON();
}
