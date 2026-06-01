import { expect, test } from "@playwright/test";

const smokeRoutes = {
  home: "/",
  posts: "/posts",
  gitPost: "/posts/git-commit-message-convention",
  portfolioPost: "/posts/portfolio-pdf-sample",
  portfolio: "/portfolio",
  tools: "/tools",
  techStack: "/tools/tech-stack",
  goldenRatio: "/tools/golden-ratio",
  missing: "/does-not-exist",
} as const;

test("app shell and critical routes render", async ({ page }) => {
  await test.step("home shell renders", async () => {
    await page.goto(smokeRoutes.home);
    await expect(page.getByTestId("app-shell")).toBeVisible();
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.getByTestId("home-page-heading")).toBeVisible();
  });

  await test.step("published posts listing renders expected cards", async () => {
    await page.goto(smokeRoutes.posts);
    await expect(page.getByTestId("posts-page-heading")).toBeVisible();
    await expect(page.locator('a[href="/posts/git-commit-message-convention"]').first()).toBeVisible();
    await expect(page.locator('a[href="/posts/portfolio-pdf-sample"]').first()).toBeVisible();
  });

  await test.step("standard post detail renders content", async () => {
    await page.goto(smokeRoutes.gitPost);
    await expect(page.getByTestId("post-detail-heading")).toHaveText("[Git] Commit Message Convention");
  });

  await test.step("portfolio post renders PDF viewer and download contract", async () => {
    await page.goto(smokeRoutes.portfolioPost);
    await expect(page.getByTestId("post-detail-heading")).toHaveText("[Portfolio] 프로젝트 포트폴리오 PDF 임베딩 샘플");
    await expect(page.getByTestId("pdf-viewer-section")).toBeVisible();
    await expect(page.getByTestId("pdf-download-link")).toHaveAttribute(
      "href",
      "/posts/portfolio-pdf-sample/portfolio.pdf",
    );
  });

  await test.step("portfolio index renders portfolio entry point", async () => {
    await page.goto(smokeRoutes.portfolio);
    await expect(page.getByTestId("portfolio-page-heading")).toBeVisible();
    await expect(page.locator('a[href="/posts/portfolio-pdf-sample"]').first()).toBeVisible();
  });

  await test.step("tools index renders golden ratio tool entry point", async () => {
    await page.goto(smokeRoutes.tools);
    await expect(page.getByTestId("tools-page-heading")).toBeVisible();
    await expect(page.locator('a[href="/tools/tech-stack"]').first()).toBeVisible();
    await expect(page.locator('a[href="/tools/golden-ratio"]').first()).toBeVisible();
  });

  await test.step("tech stack generator renders", async () => {
    await page.goto(smokeRoutes.techStack);
    await expect(page.getByTestId("tech-stack-page-heading")).toBeVisible();
    await expect(page.getByTestId("tech-stack-generator")).toBeVisible();
    await page.getByTestId("tech-search-input").fill("spring");
    await expect(page.getByTestId("tech-catalog-add-spring")).toBeVisible();
    await page.getByTestId("tech-catalog-add-spring").click();
    await expect(page.getByTestId("tech-catalog-add-spring")).toBeDisabled();
  });

  await test.step("golden ratio calculator renders", async () => {
    await page.goto(smokeRoutes.goldenRatio);
    await expect(page.getByTestId("golden-ratio-page-heading")).toBeVisible();
    await expect(page.getByTestId("golden-ratio-calculator")).toBeVisible();
  });

  await test.step("missing routes show not-found shell", async () => {
    await page.goto(smokeRoutes.missing);
    await expect(page.getByTestId("not-found-page")).toBeVisible();
  });
});
