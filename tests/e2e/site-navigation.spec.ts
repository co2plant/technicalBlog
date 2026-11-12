import { expect, test } from "@playwright/test";

test("desktop tool sidebar supports direct routes, current state and keyboard labels", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/posts");
  await page.getByRole("button", { name: "도구 메뉴 펼치기", exact: true }).click();
  await expect(page.getByTestId("tools-sidebar-space")).toHaveCSS("transition-property", "none");
  const tools = page.getByRole("navigation", { name: "도구", exact: true });
  const password = tools.getByRole("link", { name: "비밀번호 생성기", exact: true });
  const stack = tools.getByRole("link", { name: "기술스택 이미지 생성기", exact: true });
  await expect(tools.getByRole("link")).toHaveCount(3);
  const rail = await tools.boundingBox();
  const main = await page.locator("#main-content").boundingBox();
  expect(rail!.width).toBe(48);
  expect(main!.x).toBeGreaterThanOrEqual(rail!.x + rail!.width);

  await password.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const tooltip = tools.getByText("비밀번호 생성기", { exact: true });
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(password).toBeFocused();
  await password.hover();
  await expect(tooltip).toBeVisible();
  await tooltip.hover();
  await expect(tooltip).toBeVisible();

  await stack.click();
  await expect(page).toHaveURL(/\/tools\/tech-stack$/);
  await expect(stack).toHaveAttribute("aria-current", "page");
  await expect(tools.locator('[aria-current="page"]')).toHaveCount(1);
  await tools.getByRole("link", { name: "황금비율 계산기", exact: true }).click();
  await expect(page.getByTestId("golden-ratio-page-heading")).toBeVisible();
  await page.mouse.move(1400, 950);
  await page.screenshot({ path: testInfo.outputPath("tools-sidebar-desktop.png") });

  await page.getByRole("navigation", { name: "주요 내비게이션" }).getByRole("link", { name: "포트폴리오", exact: true }).click();
  await expect(page).toHaveURL(/\/posts\/11$/);
  await expect(page.getByTestId("pdf-viewer-section")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByTestId("portfolio-page-heading")).toHaveCount(0);
});

test("desktop sidebar starts folded, releases its space and remembers the toggle", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts");
  const tools = page.getByTestId("tools-navigation");
  const sidebarSpace = page.getByTestId("tools-sidebar-space");
  const open = page.getByRole("button", { name: "도구 메뉴 펼치기", exact: true });
  const close = page.getByRole("button", { name: "도구 메뉴 접기", exact: true });
  await expect(tools).toBeHidden();
  await expect(open).toHaveAttribute("aria-expanded", "false");
  expect((await open.boundingBox())!.width).toBe(32);
  await expect(sidebarSpace).toHaveCSS("transition-timing-function", "linear");
  await expect(sidebarSpace).toHaveCSS("transition-duration", "0.2s");
  const collapsedMain = await page.locator("#main-content").boundingBox();
  await page.screenshot({ path: testInfo.outputPath("tools-sidebar-collapsed.png") });
  await page.setViewportSize({ width: 1024, height: 900 });
  const toggleBounds = await open.boundingBox();
  const brandBounds = await page.getByTestId("site-header").getByRole("link", { name: "co2plant 기술 블로그" }).boundingBox();
  expect(toggleBounds!.x + toggleBounds!.width).toBeLessThanOrEqual(brandBounds!.x);
  await page.setViewportSize({ width: 1440, height: 1000 });

  await open.focus();
  await page.keyboard.press("Enter");
  await expect(tools).toBeVisible();
  await expect(close).toBeFocused();
  await expect(close).toHaveAttribute("aria-expanded", "true");
  await expect(sidebarSpace).toHaveCSS("width", "48px");
  const expandedMain = await page.locator("#main-content").boundingBox();
  expect(collapsedMain!.x).toBeLessThan(expandedMain!.x);
  await page.reload();
  await expect(tools).toBeVisible();
  await close.click();
  await expect(tools).toBeHidden();
  await expect(open).toBeFocused();
  await expect(sidebarSpace).toHaveCSS("width", "0px");
  await page.goto("/tools/password-generator");
  await expect(tools).toBeHidden();
  await page.reload();
  await expect(tools).toBeHidden();

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(tools).toBeVisible();
  await expect(tools.getByRole("link")).toHaveCount(3);
  await expect(open).toBeHidden();
});

test("sidebar toggle still works when browser preference storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    const read = Storage.prototype.getItem;
    const write = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "tools-sidebar-collapsed") throw new DOMException("Storage blocked", "SecurityError");
      return read.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "tools-sidebar-collapsed") throw new DOMException("Storage blocked", "SecurityError");
      write.call(this, key, value);
    };
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/posts");
  const tools = page.getByTestId("tools-navigation");
  await page.getByRole("button", { name: "도구 메뉴 펼치기", exact: true }).click();
  await expect(tools).toBeVisible();
  await page.getByRole("button", { name: "도구 메뉴 접기", exact: true }).click();
  await expect(tools).toBeHidden();
});

test("narrow screens keep tools labeled and reachable without covering the page", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts");
  const tools = page.getByRole("navigation", { name: "도구", exact: true });
  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(tools.getByRole("link")).toHaveCount(3);
    const bar = await tools.boundingBox();
    const main = await page.locator("#main-content").boundingBox();
    expect(bar!.x).toBeGreaterThanOrEqual(0);
    expect(bar!.x + bar!.width).toBeLessThanOrEqual(width);
    expect(main!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height);
    for (const link of await tools.getByRole("link").all()) {
      await expect(link).toBeVisible();
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    const brand = await page.getByTestId("site-header").getByRole("link", { name: "co2plant 기술 블로그" }).boundingBox();
    const primary = await page.getByRole("navigation", { name: "주요 내비게이션" }).boundingBox();
    expect(brand!.x + brand!.width).toBeLessThanOrEqual(primary!.x);
    expect(primary!.x + primary!.width).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: testInfo.outputPath("tools-navigation-mobile.png"), fullPage: true });
  await tools.getByRole("link", { name: "비밀번호 생성기", exact: true }).click();
  await expect(page.getByTestId("password-generator-page-heading")).toBeVisible();
  await expect(tools.getByRole("link", { name: "비밀번호 생성기", exact: true })).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(tools.getByRole("link", { name: "비밀번호 생성기", exact: true })).toHaveAttribute("aria-current", "page");
  await page.goto("/admin/login");
  await expect(tools).toHaveCount(0);
});
