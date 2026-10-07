// REQUIEM API: the blueprint's section 12 contract over the generated museum data, plus one idempotent POST for preservation summaries.
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { itemsAt, siteStats, summaryText } from "../../../packages/domain/src/index.ts";
import type { ArchiveItem, Intervention, Part, Site, SiteEvent, SiteVersion } from "../../../packages/schemas/src/index.ts";
const load = <T,>(n: string) => JSON.parse(readFileSync(new URL(`../../../data/generated/${n}.json`, import.meta.url), "utf8")) as T;
export const openapi = { openapi: "3.1.0", info: { title: "REQUIEM API", version: "1.0.0", description: "Synthetic heritage archive." }, paths: {
  "/v1/sites": { get: { summary: "List sites" } }, "/v1/sites/{id}": { get: {} }, "/v1/sites/{id}/versions": { get: {} }, "/v1/sites/{id}/archive": { get: { summary: "Archive items; ?year= filters, ?type= filters, ?limit=&cursor= pages" } },
  "/v1/sites/{id}/timeline": { get: { summary: "Events and per-year site statistics; ?year= for one year" } }, "/v1/sites/{id}/summaries": { post: { summary: "Preservation summary for a year and budget; Idempotency-Key required" } } } };
export function build() {
  const sites = load<Site[]>("sites"), parts = load<Part[]>("parts"), ev = load<SiteEvent[]>("events"), archive = load<ArchiveItem[]>("archive"), ints = load<Intervention[]>("interventions"), versions = load<SiteVersion[]>("versions");
  const byKey = new Map<string, { ref: string; text: string }>();
  const send = (res: ServerResponse, code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,idempotency-key", "access-control-allow-methods": "GET,POST,OPTIONS" }); res.end(JSON.stringify(body)); };
  const err = (res: ServerResponse, code: number, error: string) => send(res, code, { error });
  async function body(req: IncomingMessage) { let s = ""; for await (const c of req) { s += c; if (s.length > 10_000) throw new RangeError("body too large"); } return s ? JSON.parse(s) : {}; }
  const num = (v: string | null, d: number) => (v === null ? d : Number(v));
  const server: Server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url ?? "/", "http://x"), p = u.pathname.replace(/\/+$/, "") || "/", m = req.method ?? "GET"; let g: RegExpMatchArray | null;
      if (m === "OPTIONS") return send(res, 204, {}); if (p === "/openapi.json") return send(res, 200, openapi); if (p === "/healthz") return send(res, 200, { ok: true });
      if (p === "/v1/sites" && m === "GET") return send(res, 200, sites);
      if ((g = p.match(/^\/v1\/sites\/([\w-]+)(?:\/(versions|archive|timeline|summaries))?$/))) {
        const site = sites.find((s) => s.id === g![1]); if (!site) return err(res, 404, "no such site"); const flag = site.flagship;
        if (!g[2] && m === "GET") return send(res, 200, site);
        if (g[2] === "versions" && m === "GET") return send(res, 200, flag ? versions : []);
        if (g[2] === "archive" && m === "GET") {
          const year = num(u.searchParams.get("year"), 2026), limit = num(u.searchParams.get("limit"), 20), cursor = num(u.searchParams.get("cursor"), 0), type = u.searchParams.get("type");
          if (![year, limit, cursor].every(Number.isFinite) || limit < 1 || limit > 50 || cursor < 0) return err(res, 400, "year, limit (1-50) and cursor must be numbers");
          const all = flag ? itemsAt(archive, parts, year).filter((i) => !type || i.type === type) : []; return send(res, 200, { items: all.slice(cursor, cursor + limit).map(({ svg, ...rest }) => rest), total: all.length, nextCursor: cursor + limit < all.length ? cursor + limit : null });
        }
        if (g[2] === "timeline" && m === "GET") { const y = u.searchParams.get("year"); if (y !== null) { const yy = Number(y); if (!Number.isInteger(yy) || yy < 1790 || yy > 2026) return err(res, 400, "year must be a whole year 1790-2026"); return send(res, 200, siteStats(flag ? parts : [], ev, yy)); } return send(res, 200, { events: flag ? ev : [], years: flag ? [1790, 2026] : [], series: flag ? [1790, 1802, 1850, 1893, 1921, 1950, 1978, 1994, 2011, 2026].map((y2) => siteStats(parts, ev, y2)) : [] }); }
        if (g[2] === "summaries" && m === "POST") {
          const key = req.headers["idempotency-key"]; if (typeof key !== "string" || !key) return err(res, 400, "Idempotency-Key header required"); if (!flag) return err(res, 422, "this site has no model or record in the demo");
          const prior = byKey.get(key); if (prior) return send(res, 200, prior); const b = await body(req), year = b.year ?? 2026, budget = b.budget ?? 100000;
          if (!Number.isInteger(year) || year < 1790 || year > 2026 || !Number.isFinite(budget) || budget < 0 || budget > 5_000_000) return err(res, 422, "year must be 1790-2026 and budget 0-5,000,000");
          const text = summaryText(site.name, year, parts, ev, ints, budget), out = { ref: text.slice(0, 11), text }; byKey.set(key, out); return send(res, 201, out);
        }
      }
      return err(res, 404, "not found");
    } catch (e) { return err(res, e instanceof SyntaxError || e instanceof RangeError ? 400 : 500, e instanceof Error ? e.message : "error"); }
  });
  return { server, listen: (port = 8660) => new Promise<number>((r) => server.listen(port, () => r((server.address() as { port: number }).port))), close: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }) };
}
if (import.meta.url === `file://${process.argv[1]}`) build().listen().then((p) => console.log(`REQUIEM API on :${p}`));
