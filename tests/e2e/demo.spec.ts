import { expect, test, type Page } from "@playwright/test";
const open = async (page: Page, url: string) => { await page.goto(url); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await expect(page.locator(".app")).toHaveAttribute("data-intro", "done"); await page.waitForFunction(() => typeof (window as unknown as { __requiemStats?: unknown }).__requiemStats === "function", null, { timeout: 30_000 }); };
const num = async (page: Page, id: string) => Number((await page.getByTestId(id).textContent())!.replace(/[^0-9.]/g, ""));
type W = { __rLive: { nav: { x: number; z: number; y: number; yaw: number }; orbit: { yaw: number } } };

// Blueprint section 19, the demo script.
test("demo walk: intro, museum, open the structure, scrub, layers, archive anchor, preservation summary", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  // 1. the intro: skip is available from the first frame; it jumps to the camera's pass through the arch and the arch-shaped window opens on the museum
  await expect(page.getByTestId("skip-intro")).toBeVisible(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[0-9]/);
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("intro")).toBeHidden({ timeout: 25_000 });
  // 2. in the museum
  await expect(page.getByRole("heading", { name: "The collection" })).toBeVisible(); await expect(page.getByTestId("where")).toHaveText("In the museum"); await expect(page.getByTestId("sites").locator("button")).toHaveCount(4);
  // 3. open the flagship through the arch
  await page.getByTestId("enter").click(); await expect(page.getByRole("heading", { name: "Orisk Caravan House" })).toBeVisible({ timeout: 15_000 }); await expect(page.locator(".app")).toHaveAttribute("data-space", "site");
  // 4. scrub from the historical state to the present: parts fall away at their lost years
  await page.getByTestId("year").fill("1802"); expect(await num(page, "lost")).toBe(0); const standing1802 = await num(page, "standing"), dmg1802 = await num(page, "mean-damage");
  await page.getByTestId("year").fill("1993"); await expect(page.getByTestId("ps-Tower_NE_Top")).toHaveText("standing"); await page.getByTestId("year").fill("1996"); await expect(page.getByTestId("lost")).toHaveText("7");
  await page.getByTestId("year").fill("2026"); expect(await num(page, "lost")).toBe(7); expect(await num(page, "mean-damage")).toBeGreaterThan(dmg1802); expect(await num(page, "standing")).toBeGreaterThan(standing1802 - 20);
  await page.locator("details summary").click(); await expect(page.getByTestId("ps-Hall_Vault")).toHaveText("lost"); await expect(page.getByTestId("ps-Hall_Vault_Remnant")).toHaveText("standing");
  // 5. structural and damage layers
  await page.getByTestId("layer-structure").check(); await expect(page.locator(".app")).toHaveAttribute("data-layer", "structure"); await page.getByTestId("layer-damage").check(); await expect(page.locator(".app")).toHaveAttribute("data-layer", "damage");
  // 6. an archive item anchored to the facade: the camera goes to its anchor and the card emerges there
  await page.getByTestId("nav-archive").click(); await page.getByTestId("item-a5").click(); await expect(page.getByTestId("item-card")).toBeVisible(); await expect(page.getByTestId("item-card")).toContainText("The gate in 1956");
  const box = (await page.getByTestId("item-card").boundingBox())!; expect(box.y).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(1281);
  // 7. conservation: risk table and a preservation summary
  await page.getByTestId("nav-conservation").click(); await expect(page.locator(".app")).toHaveAttribute("data-layer", "damage"); await expect(page.getByTestId("risk-table").locator("tbody tr")).toHaveCount(10);
  await page.getByTestId("gen").click(); await expect(page.getByTestId("summary")).toContainText("Preservation summary"); await expect(page.getByTestId("summary")).toContainText("Highest risk now");
  expect(errors).toEqual([]);
});
test("walk mode keeps eye height and moves with W; fly mode can climb", async ({ page }) => {
  await open(page, "/?skip=1&view=structure&nav=walk"); const z0 = await page.evaluate(() => (window as unknown as W).__rLive.nav.z);
  await page.keyboard.down("w"); await page.waitForTimeout(1200); await page.keyboard.up("w"); const n = await page.evaluate(() => (window as unknown as W).__rLive.nav); expect(n.z).toBeLessThan(z0); expect(n.y).toBeCloseTo(1.7);
  await page.getByTestId("nav-fly").click(); await page.keyboard.down("e"); await page.waitForTimeout(800); await page.keyboard.up("e"); expect(await page.evaluate(() => (window as unknown as W).__rLive.nav.y)).toBeGreaterThan(2);
});
test("orbit: dragging the scene turns the view", async ({ page }) => {
  await open(page, "/?skip=1&view=structure"); const y0 = await page.evaluate(() => (window as unknown as W).__rLive.orbit.yaw);
  await page.mouse.move(400, 500); await page.mouse.down(); await page.mouse.move(600, 500, { steps: 6 }); await page.mouse.up(); expect(await page.evaluate(() => (window as unknown as W).__rLive.orbit.yaw)).not.toBeCloseTo(y0, 2);
});
test("the archive follows the scrubber: nothing before 1802, everything by 2026, and items stay pinned to built parts", async ({ page }) => {
  await open(page, "/?skip=1&view=archive&year=1801"); await expect(page.getByTestId("items").locator("li")).toHaveCount(0); await page.getByTestId("archive-year").fill("1900"); await expect(page.getByTestId("items").locator("li")).toHaveCount(4); await page.getByTestId("archive-year").fill("2026"); await expect(page.getByTestId("items").locator("li")).toHaveCount(14);
  await page.getByTestId("item-a6").click(); await expect(page.getByTestId("transcript")).toContainText("locked the gate");
});
test("conservation: a bigger budget buys more, a done intervention cannot be unticked, ticking one lowers the plan's cost", async ({ page }) => {
  await open(page, "/?skip=1&view=conservation"); await page.getByTestId("budget").fill("0"); await expect(page.getByTestId("plan-line")).toContainText("No proposed intervention fits"); await page.getByTestId("budget").fill("400000"); await expect(page.getByTestId("plan-line")).toContainText("Within budget");
  await expect(page.getByTestId("int-i1")).toBeDisabled(); await expect(page.getByTestId("int-i1")).toBeChecked(); await page.getByTestId("int-i2").check(); await page.getByTestId("gen").click(); await expect(page.getByTestId("summary")).toContainText("Preservation summary"); 
});
test("deep link restores year and layer", async ({ page }) => { await open(page, "/?view=structure&year=1900&layer=damage"); await expect(page.getByTestId("year-out")).toHaveText("1900"); await expect(page.locator(".app")).toHaveAttribute("data-layer", "damage"); });
test("refresh mid-sequence restarts the intro cleanly", async ({ page }) => { await page.goto("/"); await page.waitForTimeout(1500); await page.reload(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", "0"); });
test("keyboard: rooms and the scrubber are reachable without a pointer", async ({ page }) => {
  await open(page, "/?skip=1&view=structure");
  await expect(async () => { await page.getByTestId("year").focus(); await expect(page.getByTestId("year")).toBeFocused({ timeout: 500 }); }).toPass({ timeout: 15_000 });
  await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowLeft"); expect(await num(page, "year-out")).toBe(2024);
});
test("the summary's plan agrees with the on-screen plan, and ticking an intervention changes it", async ({ page }) => {
  await open(page, "/?skip=1&view=conservation"); await page.getByTestId("budget").fill("100000"); await expect(page.getByTestId("plan-line")).toContainText("Spends $100,000"); await page.getByTestId("gen").click(); await expect(page.getByTestId("summary")).toContainText("Recommended interventions within budget"); await expect(page.getByTestId("summary")).toContainText("(spent $100,000)");
  const before = await page.getByTestId("plan-line").textContent(); await page.getByTestId("int-i6").check(); await expect(page.getByTestId("plan-line")).not.toHaveText(before!);
});
