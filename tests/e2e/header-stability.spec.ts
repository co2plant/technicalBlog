import { expect, test, type Page } from "@playwright/test";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

// The E2E fixture publishes the portfolio PDF post at /posts/11.
const PORTFOLIO_PDF_POST = "/posts/11";

test("header stays aligned when navigating between short posts list and portfolio PDF", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const navigation = page.getByTestId("site-header").getByRole("navigation", { name: "주요 내비게이션" });

  await openWithScrollbar(page, "/posts");
  const initial = await navigation.boundingBox();

  await openWithScrollbar(page, PORTFOLIO_PDF_POST);
  await expect(page.getByRole("button", { name: "다음 페이지", exact: true })).toBeEnabled();
  const portfolio = await navigation.boundingBox();
  expect(Math.abs(portfolio!.x - initial!.x)).toBeLessThan(1);
  expect(portfolio!.y).toBe(initial!.y);

  await openWithScrollbar(page, "/posts");
  await expect(page.getByTestId("posts-page-heading")).toBeVisible();
  const restored = await navigation.boundingBox();
  expect(Math.abs(restored!.x - initial!.x)).toBeLessThan(1);
});

async function openWithScrollbar(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // Custom scrollbars occupy layout space, including on systems using overlay scrollbars.
  await page.addStyleTag({ content: "::-webkit-scrollbar { width: 16px; }" });
}
