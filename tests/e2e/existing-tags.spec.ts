import { expect, test } from "@playwright/test";

test("reuses multiple past tags, keeps new tags, and persists removal", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/admin/login");
  await page.getByLabel("비밀번호").fill(process.env.ADMIN_ACCESS_SECRET ?? "");
  await Promise.all([page.waitForURL("**/admin"), page.getByRole("button", { name: "로그인" }).click()]);
  const href = await page.locator('a[href^="/admin/posts/"]').filter({ hasText: "[Local] 에디터 로컬 초안" }).first().getAttribute("href");
  await page.goto(href!);
  const picker = page.locator("details").filter({ has: page.locator("summary", { hasText: "기존 태그 선택" }) });
  const trigger = picker.locator("summary");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(picker).toHaveAttribute("open", "");
  const collaboration = picker.locator('input[type="checkbox"][value="collaboration"]');
  const convention = picker.locator('input[type="checkbox"][value="convention"]');
  await collaboration.check();
  await convention.check();
  await page.getByRole("searchbox", { name: "기존 태그 검색" }).fill("COLLAB");
  await expect(collaboration).toBeChecked();
  await expect(convention).toHaveCount(0);
  await expect(page.getByRole("button", { name: "convention 태그 제거", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "기존 태그 검색" }).fill("__no_such_tag__");
  await expect(picker.getByRole("status")).toHaveText("검색 결과가 없습니다.");
  await page.getByRole("button", { name: "태그 검색 지우기" }).click();
  await expect(page.getByRole("searchbox", { name: "기존 태그 검색" })).toBeFocused();
  await expect(convention).toBeChecked();

  const koreanSlug = `e2e-reused-korean-${Date.now()}`;
  await page.getByRole("textbox", { name: "태그 이름", exact: true }).fill("재사용 태그");
  await page.getByRole("textbox", { name: "태그 slug", exact: true }).fill(koreanSlug);
  await page.getByRole("button", { name: "태그 추가", exact: true }).click();
  await saveAndReload();
  await trigger.click();
  await expect(collaboration).toBeChecked();
  await expect(convention).toBeChecked();
  const korean = picker.locator(`input[type="checkbox"][value="${koreanSlug}"]`);
  await expect(korean).toBeChecked();
  await convention.uncheck();
  await korean.uncheck();
  await saveAndReload();
  await trigger.click();
  await expect(convention).not.toBeChecked();
  await expect(korean).not.toBeChecked();
  await expect(collaboration).toBeChecked();
  await korean.check();
  await saveAndReload();
  await trigger.click();
  await expect(korean).toBeChecked();
  await page.getByRole("searchbox", { name: "기존 태그 검색" }).fill(koreanSlug);
  await picker.screenshot({ path: testInfo.outputPath("existing-tags-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "설정 열기" }).click();
  await trigger.click();
  await expect(korean).toBeChecked();
  expect(await picker.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await picker.screenshot({ path: testInfo.outputPath("existing-tags-mobile.png") });
  await korean.focus();
  await page.keyboard.press("Space");
  await expect(korean).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(picker).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("dialog")).toBeVisible();

  async function saveAndReload() {
    const saved = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("/draft") && response.ok());
    await page.getByRole("button", { name: "임시저장", exact: true }).click();
    await saved;
    await page.reload();
    await expect(page.getByTestId("admin-toast-editor-host").locator(".toastui-editor-defaultUI")).toBeVisible();
  }
});
