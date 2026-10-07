import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { damageAt, partState, siteStats, versionsFrom, riskScore, riskTable, plan, summaryText, anchorPosition, itemsAt, stepWalk, stepFly, orbitPos, EYE, BOUNDS, fragmentsFor, BUILD_YEARS, CRUMBLE_YEARS } from "../src/index.ts";
import type { ArchiveItem, Bbox, Intervention, Part, SiteEvent } from "@requiem/schemas";
const gen = (n: string) => JSON.parse(readFileSync(new URL(`../../../data/generated/${n}.json`, import.meta.url), "utf8"));
const parts: Part[] = gen("parts"), ev: SiteEvent[] = gen("events"), items: ArchiveItem[] = gen("archive"), ints: Intervention[] = gen("interventions");
const man: Record<string, Bbox> = JSON.parse(readFileSync(new URL("../../../model/exports/manifest.json", import.meta.url), "utf8")), P = (n: string) => parts.find((p) => p.name === n)!;

describe("time: build, erosion, damage", () => {
  it("nothing exists before it is built, and takes BUILD_YEARS to go up", () => { const s = partState(P("Wall_N"), ev, 1789); expect(s).toMatchObject({ built: 0, standing: false, damage: 0 }); expect(partState(P("Wall_N"), ev, 1790 + BUILD_YEARS / 2).built).toBeCloseTo(0.5); expect(partState(P("Wall_N"), ev, 1795).standing).toBe(true); });
  it("a lost part stands until its year, crumbles over CRUMBLE_YEARS, then is gone with damage 1", () => {
    const t = P("Tower_NE_Top"); expect(partState(t, ev, 1993).standing).toBe(true); expect(partState(t, ev, 1994 + CRUMBLE_YEARS / 2).erosion).toBeCloseTo(0.5); expect(partState(t, ev, 1996)).toMatchObject({ erosion: 1, standing: false, damage: 1 });
  });
  it("damage in 2026 equals the contract's damage2026 for every surviving part (what Blender and the browser agree on)", () => { for (const p of parts.filter((x) => x.lost === null)) expect(damageAt(p, ev, 2026), p.name).toBeCloseTo(p.damage2026, 2); });
  it("damage never decreases for parts whose events only add, and steps at the earthquake", () => {
    const g = P("Gate_Arch"); let prev = 0; for (let y = 1790; y <= 2026; y++) { const d = damageAt(g, ev, y); expect(d + 1e-9).toBeGreaterThanOrEqual(prev - 0.06); prev = d; }
    expect(damageAt(g, ev, 1893) - damageAt(g, ev, 1892)).toBeGreaterThan(0.1);
  });
  it("plaster is renewed in 1844 (damage drops) and the fire in 1921 damages it again", () => { const p = P("Plaster_Hall"); expect(damageAt(p, ev, 1844)).toBeLessThan(damageAt(p, ev, 1843)); expect(damageAt(p, ev, 1921)).toBeGreaterThan(damageAt(p, ev, 1920)); });
  it("site stats count standing and lost parts and list the events so far", () => { const a = siteStats(parts, ev, 1802), b = siteStats(parts, ev, 2026); expect(a.lost).toBe(0); expect(b.lost).toBe(parts.filter((p) => p.lost !== null).length); expect(b.meanDamage).toBeGreaterThan(a.meanDamage); expect(b.events).toContain("Shelling"); expect(a.events).toEqual(["Construction begins"]); });
  it("versions: distinct, ordered, today's lost list is every part with a lost year, which includes the whole Missing collection", () => { const v = versionsFrom(parts, ev); expect(new Set(v.map((x) => x.id)).size).toBe(v.length); expect(v.map((x) => x.yearStart)).toEqual([...v.map((x) => x.yearStart)].sort((a, b) => a - b)); expect(v.at(-1)!.layerManifest.lost.sort()).toEqual(parts.filter((p) => p.lost !== null).map((p) => p.name).sort()); expect(parts.filter((p) => p.collection === "Missing").every((p) => v.at(-1)!.layerManifest.lost.includes(p.name))).toBe(true); });
});
describe("contract", () => {
  it("collections follow the rules Blender's validator enforces", () => { for (const p of parts) { if (p.collection === "Missing") expect(p.lost).not.toBeNull(); if (p.lost !== null) expect(p.damage2026).toBe(1); expect(p.built).toBeGreaterThanOrEqual(1790); } expect(new Set(parts.map((p) => p.collection))).toEqual(new Set(["Current", "Historical", "Structural", "Missing"])); });
  it("every part has a measured bounding box with positive size", () => { for (const p of parts) { const b = man[p.name]; expect(b, p.name).toBeTruthy(); for (let i = 0; i < 3; i++) expect(b.max[i]).toBeGreaterThan(b.min[i]); } });
});
describe("risk and the preservation plan", () => {
  it("a lost part carries no risk; a done intervention lowers it", () => { expect(riskScore(P("Col_5"), ev, 2026)).toBe(0); const a = riskScore(P("Gate_Arch"), ev, 2026), b = riskScore(P("Gate_Arch"), ev, 2026, ints.filter((i) => i.status === "done")); expect(b).toBeLessThan(a); });
  it("the table is sorted and excludes parts that are gone", () => { const t = riskTable(parts, ev, 2026, ints.filter((i) => i.status === "done")); expect(t.map((r) => r.risk)).toEqual([...t.map((r) => r.risk)].sort((a, b) => b - a)); expect(t.find((r) => r.part.name === "Col_5")).toBeUndefined(); });
  it("the plan respects the budget, never makes risk worse, and an empty budget buys nothing", () => {
    for (const b of [0, 30000, 100000, 400000]) { const pl = plan(parts, ev, 2026, ints, b); expect(pl.spent).toBeLessThanOrEqual(b); expect(pl.riskAfter).toBeLessThanOrEqual(pl.riskBefore); }
    expect(plan(parts, ev, 2026, ints, 0).chosen).toEqual([]); expect(plan(parts, ev, 2026, ints, 1e9).chosen.length).toBeGreaterThanOrEqual(5);
    expect(plan(parts, ev, 2026, ints, 100000).chosen.every((c) => c.status !== "done")).toBe(true);
  });
  it("the summary has a stable reference and names the top risks and the plan", () => {
    const a = summaryText("Orisk", 2026, parts, ev, ints, 100000), b = summaryText("Orisk", 2026, parts, ev, ints, 100000); expect(a).toBe(b); expect(a).toMatch(/^PS-[0-9A-F]{8}/); expect(a).toContain("Highest risk now"); expect(a).toContain("Demo data");
    expect(summaryText("Orisk", 2026, parts, ev, ints, 100000)).not.toBe(summaryText("Orisk", 2026, parts, ev, ints, 50000)); expect(summaryText("Orisk", 2026, parts, ev, ints, 0)).toContain("No proposed intervention fits");
  });
});
describe("archive", () => {
  it("anchors sit inside their part's box, shifted by the offset", () => { for (const i of items) { const p = anchorPosition(i, man), b = man[i.part]; for (let k = 0; k < 3; k++) { expect(p[k]).toBeGreaterThanOrEqual(b.min[k] - 0.5 * (b.max[k] - b.min[k]) - 1e-6); expect(p[k]).toBeLessThanOrEqual(b.max[k] + 0.5 * (b.max[k] - b.min[k]) + 1e-6); } } expect(() => anchorPosition({ ...items[0], part: "Nope" }, man)).toThrow(/no bounding box/); });
  it("items appear with their year and never before their part is built", () => { expect(itemsAt(items, parts, 1801)).toEqual([]); expect(itemsAt(items, parts, 1802).map((i) => i.id).sort()).toEqual(["a1", "a14"]); expect(itemsAt(items, parts, 2026)).toHaveLength(items.length); for (const i of itemsAt(items, parts, 1900)) expect(P(i.part).built).toBeLessThanOrEqual(1900); });
  it("the corpus has all four types and every oral history has a transcript", () => { expect(new Set(items.map((i) => i.type))).toEqual(new Set(["drawing", "photograph", "document", "oral-history"])); for (const i of items.filter((x) => x.type === "oral-history")) expect(i.transcript!.length).toBeGreaterThan(50); for (const i of items.filter((x) => x.type !== "oral-history")) expect(i.svg).toMatch(/^<svg/); });
});
describe("navigation", () => {
  const start = { x: 0, y: EYE, z: 20, yaw: 0, pitch: 0 }, k = { forward: 0, right: 0, up: 0, turn: 0, look: 0 };
  it("walking forward at yaw 0 goes north (-z), keeps eye height, and stays inside the fence", () => { const a = stepWalk(start, { ...k, forward: 1 }, 1); expect(a.z).toBeLessThan(start.z); expect(a.y).toBe(EYE); let n = { ...start, z: 0 }; for (let i = 0; i < 200; i++) n = stepWalk({ ...n, yaw: Math.PI / 2 }, { ...k, forward: 1 }, 0.5); expect(Math.abs(n.x)).toBeLessThanOrEqual(BOUNDS.x); expect(stepWalk({ ...start, z: 100 }, k, 0).z).toBe(BOUNDS.z); });
  it("turning changes yaw, looking is limited", () => { expect(stepWalk(start, { ...k, turn: 1 }, 0.5).yaw).toBeGreaterThan(0); expect(stepWalk(start, { ...k, look: 1 }, 100).pitch).toBe(1.2); });
  it("flying follows the look direction, has a floor and a ceiling", () => { const up = stepFly({ ...start, pitch: 1 }, { ...k, forward: 1 }, 1); expect(up.y).toBeGreaterThan(start.y); expect(stepFly({ ...start, y: 1 }, { ...k, up: -1 }, 10).y).toBe(0.5); expect(stepFly({ ...start, y: 39 }, { ...k, up: 1 }, 10).y).toBe(40); });
  it("orbit is at the requested distance", () => { const p = orbitPos([1, 2, 3], 0.7, 0.3, 10); expect(Math.hypot(p[0] - 1, p[1] - 2, p[2] - 3)).toBeCloseTo(10); });
});
describe("fragments", () => {
  it("are deterministic, at most the cap, and start away from their targets", () => { const a = fragmentsFor(man, 0.5, 400), b = fragmentsFor(man, 0.5, 400); expect(a).toEqual(b); expect(a.length).toBeLessThanOrEqual(400); expect(a.length).toBeGreaterThan(100); for (const f of a) expect(Math.hypot(f.scatter[0] - f.target[0], f.scatter[2] - f.target[2])).toBeGreaterThan(10); expect(new Set(a.map((f) => f.part)).size).toBeGreaterThan(20); });
});
