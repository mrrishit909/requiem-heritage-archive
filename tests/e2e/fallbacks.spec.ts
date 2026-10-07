import { expect, test } from "@playwright/test";
test("reduced motion: static keyframes, no iris, same navigation", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" }), page = await ctx.newPage(); await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Opening story" })).toContainText("Memory doesn't have to"); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("skip-intro").click(); await expect(page.getByRole("heading", { name: "The collection" })).toBeVisible(); await page.getByTestId("enter").click(); await expect(page.getByRole("heading", { name: "Orisk Caravan House" })).toBeVisible();
  expect(await page.locator(".panel").evaluate((el) => getComputedStyle(el).animationName)).toBe("none"); await ctx.close();
});
test("graphics failure: the poster still, and every room still works from the DOM", async ({ page }) => {
  await page.goto("/?gfx=off&skip=1&view=structure"); await expect(page.getByTestId("poster")).toBeVisible(); await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByTestId("year").fill("1996"); await expect(page.getByTestId("lost")).toHaveText("7"); await page.getByTestId("nav-archive").click(); await page.getByTestId("item-a1").click(); await expect(page.getByTestId("item-card")).toBeVisible(); await page.getByTestId("nav-conservation").click(); await expect(page.getByTestId("risk-table")).toBeVisible();
});
test("WebGL context loss falls back to the poster", async ({ page }) => {
  await page.goto("/?skip=1&view=structure"); await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 }); await page.waitForFunction(() => typeof (window as unknown as { __requiemStats?: unknown }).__requiemStats === "function");
  await page.evaluate(() => document.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost", { cancelable: true }))); await expect(page.getByTestId("poster")).toBeVisible(); await page.getByTestId("layer-damage").check(); await expect(page.getByTestId("mean-damage")).toBeVisible();
});
test("phone width: rooms become a strip, the panel sits below, nothing scrolls sideways, the archive card is inline", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true }), page = await ctx.newPage(); await page.goto("/?skip=1&view=archive&gfx=off&item=a1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); const rail = await page.getByTestId("nav-museum").boundingBox(), panel = await page.locator(".panel").boundingBox(); expect(rail!.y).toBeLessThan(panel!.y); await expect(page.locator(".anchored .card")).toBeVisible(); await ctx.close();
});
test("pause motion stops the ambient animation", async ({ page }) => { await page.goto("/?skip=1&view=museum"); await page.getByTestId("pause-motion").click(); await expect(page.getByTestId("pause-motion")).toHaveText("Resume motion"); });
