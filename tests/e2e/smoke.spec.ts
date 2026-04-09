import { expect, test } from "@playwright/test";

test("app shell and not-found shell render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("site-header")).toBeVisible();

  await page.goto("/posts");
  await expect(page.getByRole("heading", { name: "게시글 목록" })).toBeVisible();
  await expect(page.locator('a[href="/posts/git-commit-message-convention"]').first()).toBeVisible();
  await expect(page.locator('a[href="/posts/portfolio-pdf-sample"]').first()).toBeVisible();

  await page.goto("/posts/git-commit-message-convention");
  await expect(page.getByRole("heading", { name: "[Git] Commit Message Convention" })).toBeVisible();

  await page.goto("/posts/portfolio-pdf-sample");
  await expect(page.getByRole("heading", { name: "[Portfolio] 프로젝트 포트폴리오 PDF 샘플" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PDF 미리보기" })).toBeVisible();
  await expect(page.getByRole("link", { name: "다운로드" })).toBeVisible();

  await page.goto("/does-not-exist");
  await expect(page.getByTestId("not-found-page")).toBeVisible();
});
