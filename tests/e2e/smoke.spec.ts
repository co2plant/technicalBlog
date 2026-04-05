import { expect, test } from "@playwright/test";

test("app shell and not-found shell render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("site-header")).toBeVisible();

  await page.goto("/does-not-exist");
  await expect(page.getByTestId("not-found-page")).toBeVisible();
});
