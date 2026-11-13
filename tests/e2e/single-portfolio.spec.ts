import { expect, test } from "@playwright/test";

test.skip(!process.env.ADMIN_ACCESS_SECRET, "ADMIN_ACCESS_SECRET is required for admin publish e2e.");

test("a second portfolio post cannot be published while /posts/11 is the portfolio", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
  await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);
  const href = await page.locator('a[href^="/admin/posts/"]').filter({ hasText: "[Local] 에디터 로컬 초안" }).first().getAttribute("href");
  expect(href).not.toBeNull();

  // Real publish API against the isolated E2E database; the rejected transaction leaves the draft untouched.
  const response = await page.request.post(`/admin/api${href!.replace(/^\/admin/, "")}/publish`, {
    data: {
      title: "두 번째 포트폴리오",
      description: "",
      excerpt: "",
      bodyMarkdown: "새 포트폴리오",
      extension: "md",
      author: "local",
      categorySlug: "portfolio",
      tags: [],
      originalUrl: null,
      coverImageUrl: null,
      embeddedPdfUrl: null,
      allowPdfDownload: true,
    },
  });

  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("기존 포트폴리오 글(/posts/11)을 수정해 주세요");

  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/posts\/11$/);
  await page.goto(href!);
  await expect(page.getByRole("textbox", { name: "글 제목", exact: true })).toHaveValue("[Local] 에디터 로컬 초안");
});
