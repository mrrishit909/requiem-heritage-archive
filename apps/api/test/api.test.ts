import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "../src/server.ts";
const api = build(); let base = "";
beforeAll(async () => { base = `http://127.0.0.1:${await api.listen(0)}`; }); afterAll(() => api.close());
const j = async (path: string, init?: RequestInit) => { const r = await fetch(base + path, init); return { status: r.status, body: (await r.json()) as any }; };
const F = "/v1/sites/orisk-caravan-house";
describe("sites", () => {
  it("lists sites, one site, versions, and OpenAPI", async () => { expect((await j("/v1/sites")).body).toHaveLength(4); expect((await j(F)).body.flagship).toBe(true); expect((await j("/v1/sites/zzz")).status).toBe(404); expect((await j(F + "/versions")).body.length).toBeGreaterThan(4); expect((await j("/v1/sites/tessel-bridge/versions")).body).toEqual([]); expect((await j("/openapi.json")).body.openapi).toBe("3.1.0"); });
});
describe("archive", () => {
  it("filters by year and type, pages with a cursor, never ships the illustrations in the list", async () => {
    expect((await j(F + "/archive?year=1801")).body.total).toBe(0); const a = (await j(F + "/archive?limit=5")).body; expect(a.items).toHaveLength(5); expect(a.total).toBe(14); expect(a.nextCursor).toBe(5); expect(a.items[0].svg).toBeUndefined();
    const b = (await j(F + `/archive?limit=50&cursor=${a.nextCursor}`)).body; expect(b.items.length).toBe(9); expect(b.nextCursor).toBeNull(); expect((await j(F + "/archive?type=oral-history")).body.total).toBe(2);
    for (const q of ["limit=0", "limit=99", "cursor=-1", "year=abc"]) expect((await j(F + "/archive?" + q)).status).toBe(400);
  });
});
describe("timeline", () => {
  it("returns events with a series and per-year statistics", async () => { const t = (await j(F + "/timeline")).body; expect(t.events).toHaveLength(8); expect(t.series.at(-1).lost).toBe(7); expect((await j(F + "/timeline?year=1900")).body.events).toContain("Earthquake"); for (const y of ["1700", "2100", "x", "1900.5"]) expect((await j(F + "/timeline?year=" + y)).status).toBe(400); });
});
describe("summaries", () => {
  const post = (b: unknown, key: string | null, id = "orisk-caravan-house") => j(`/v1/sites/${id}/summaries`, { method: "POST", headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) }, body: JSON.stringify(b) });
  it("need a key; replay is safe; inputs are validated", async () => {
    expect((await post({}, null)).status).toBe(400); const a = await post({ year: 2026, budget: 100000 }, "k"), b = await post({ year: 1990, budget: 5 }, "k"); expect(a.status).toBe(201); expect(b.status).toBe(200); expect(b.body.ref).toBe(a.body.ref); expect(a.body.text).toContain("Preservation summary");
    expect((await post({ year: 1700 }, "x1")).status).toBe(422); expect((await post({ budget: -5 }, "x2")).status).toBe(422); expect((await post({}, "x3", "tessel-bridge")).status).toBe(422); expect((await post({}, "x4", "nope")).status).toBe(404);
    expect((await j(F + "/summaries", { method: "POST", headers: { "idempotency-key": "z" }, body: "{" })).status).toBe(400);
  });
});
