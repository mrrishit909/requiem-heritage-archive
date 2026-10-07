import { expect, test } from "@playwright/test";
// Visual regression of the product surfaces with the canvas swapped for the poster (WebGL output is not bit-stable across GPUs).
for (const view of ["museum", "structure", "archive", "conservation"]) {
  test(`visual: ${view}`, async ({ page }) => {
    await page.goto(`/?gfx=off&skip=1&view=${view}&year=1996&item=a8`); await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
    await expect(page.getByTestId("hud")).toBeVisible(); await page.waitForTimeout(400); await expect(page).toHaveScreenshot(`${view}.png`);
  });
}
