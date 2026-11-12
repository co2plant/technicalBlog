import { expect, test } from "@playwright/test";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

test("header stays aligned when navigating between short posts list and portfolio PDF", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/posts");
  // Custom scrollbars occupy layout space, including on systems using overlay scrollbars.
  await page.addStyleTag({ content: "::-webkit-scrollbar { width: 16px; }" });
  const header = page.getByTestId("site-header");
  const navigation = header.getByRole("navigation", { name: "주요 내비게이션" });
  const initial = await navigation.boundingBox();
  await navigation.getByRole("link", { name: "포트폴리오", exact: true }).click();
  await expect(page.getByRole("button", { name: "다음 페이지", exact: true })).toBeEnabled();
  const portfolio = await navigation.boundingBox();
  expect(Math.abs(portfolio!.x - initial!.x)).toBeLessThan(1);
  expect(portfolio!.y).toBe(initial!.y);
  await navigation.getByRole("link", { name: "게시글", exact: true }).click();
  await expect(page.getByTestId("posts-page-heading")).toBeVisible();
  const restored = await navigation.boundingBox();
  expect(Math.abs(restored!.x - initial!.x)).toBeLessThan(1);
});
