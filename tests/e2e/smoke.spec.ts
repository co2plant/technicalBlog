import { expect, test } from "@playwright/test";

const smokeRoutes = {
  home: "/",
  posts: "/posts",
  gitPost: "/posts/git-commit-message-convention",
  portfolioPost: "/posts/my-portfolio-pdf",
  portfolio: "/portfolio",
  tools: "/tools",
  passwordGenerator: "/tools/password-generator",
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
    await expect(page.locator('a[href="/posts/my-portfolio-pdf"]')).toHaveCount(0);
  });

  await test.step("standard post detail renders content", async () => {
    await page.goto(smokeRoutes.gitPost);
    await expect(page.getByTestId("post-detail-heading")).toHaveText("[Git] Commit Message Convention");
  });

  await test.step("portfolio post renders PDF viewer with direct download disabled", async () => {
    await page.goto(smokeRoutes.portfolioPost);
    await expect(page.getByTestId("post-detail-heading")).toHaveText("[Portfolio] 조영재의 포트폴리오");
    await expect(page.getByTestId("pdf-viewer-section")).toBeVisible();
    await expect(page.getByText("새 탭에서 열기")).toBeVisible();
    await expect(page.getByTestId("pdf-download-link")).toHaveCount(0);
  });

  await test.step("portfolio index renders portfolio entry point", async () => {
    await page.goto(smokeRoutes.portfolio);
    await expect(page.getByTestId("portfolio-page-heading")).toBeVisible();
    await expect(page.locator('a[href="/posts/my-portfolio-pdf"]').first()).toBeVisible();
  });

  await test.step("tools index renders golden ratio tool entry point", async () => {
    await page.goto(smokeRoutes.tools);
    await expect(page.getByTestId("tools-page-heading")).toBeVisible();
    await expect(page.locator('a[href="/tools/password-generator"]').first()).toBeVisible();
    await expect(page.locator('a[href="/tools/tech-stack"]').first()).toBeVisible();
    await expect(page.locator('a[href="/tools/golden-ratio"]').first()).toBeVisible();
  });

  await test.step("password generator renders and creates a password", async () => {
    await page.goto(smokeRoutes.passwordGenerator);
    await expect(page.getByTestId("password-generator-page-heading")).toBeVisible();
    await expect(page.getByTestId("password-generator")).toBeVisible();
    await page.getByTestId("password-length-input").fill("16");
    await page.getByTestId("password-symbols-input").fill("@");
    await page.getByTestId("password-generate-button").click();

    const password = await page.getByTestId("password-output").innerText();
    expect(password).toHaveLength(16);
    expect(password).toContain("@");
    await expect(page.getByTestId("password-copy-alert")).toBeVisible();
    await expect(page.getByTestId("password-strength")).toContainText("bits");

    await page.getByTestId("password-symbols-input").fill("한");
    await page.getByTestId("password-symbols-reset-button").click();
    await expect(page.getByTestId("password-symbols-input")).toHaveValue("!@._#$");

    await page.getByTestId("password-symbols-input").fill("한");
    await expect(page.getByTestId("password-generate-button")).toBeDisabled();
    await expect(page.getByTestId("password-validation-message")).toContainText("ASCII 기호");
  });

  await test.step("tech stack generator renders", async () => {
    await page.goto(smokeRoutes.techStack);
    await expect(page.getByTestId("tech-stack-page-heading")).toBeVisible();
    await expect(page.getByTestId("tech-stack-generator")).toBeVisible();
    await expect(page.getByTestId("tech-catalog-idle")).toBeVisible();
    await expect(page.getByTestId("tech-catalog-add-spring")).toHaveCount(0);
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
