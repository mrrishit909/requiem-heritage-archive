import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
// Budgets. Frame times under SwiftShader (CPU rasteriser) are bounds, not GPU results.
const out = new URL("../../apps/web/out/", import.meta.url).pathname;
const size = (dir: string): number => readdirSync(dir).reduce((a, f) => { const p = join(dir, f), s = statSync(p); return a + (s.isDirectory() ? size(p) : f.endsWith(".js") ? gzipSync(readFileSync(p)).length : 0); }, 0);
test("download weight stays inside the budget", () => { expect(statSync(out + "models/site.glb").size).toBeLessThan(900_000); expect(statSync(out + "data/archive.json").size).toBeLessThan(80_000); expect(size(out + "_next/static/chunks")).toBeLessThan(750_000); });
test("scene cost: draw calls and triangles are bounded", async ({ page }) => {
  await page.goto("/?skip=1&view=structure"); await page.waitForFunction(() => typeof (window as unknown as { __requiemStats?: unknown }).__requiemStats === "function", null, { timeout: 30_000 }); await page.waitForTimeout(2500);
  const st = await page.evaluate(() => (window as unknown as { __requiemStats: () => { calls: number; triangles: number } }).__requiemStats()); console.log("renderer", JSON.stringify(st)); expect(st.calls).toBeLessThan(200); expect(st.triangles).toBeLessThan(150_000);
});
test("scrubbing the year updates the readouts while the canvas renders", async ({ page }) => {
  await page.goto("/?skip=1&view=structure"); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(2000);
  const t0 = Date.now(); await page.getByTestId("year").fill("1900"); await expect(page.getByTestId("year-out")).toHaveText("1900"); console.log("scrub-to-readout ms", Date.now() - t0); expect(Date.now() - t0).toBeLessThan(3000);
});
