// Conservation risk and the preservation summary. Hazard exposures and costs are invented for the demo.
import type { Intervention, Part } from "@requiem/schemas";
import { partState } from "./time.ts";
import type { SiteEvent } from "@requiem/schemas";
export const EXPOSURE: Record<string, { flood: number; seismic: number; conflict: number; weather: number }> = {
  ground: { flood: 0.9, seismic: 0.3, conflict: 0.2, weather: 0.5 }, wall: { flood: 0.5, seismic: 0.6, conflict: 0.5, weather: 0.5 }, gate: { flood: 0.3, seismic: 0.8, conflict: 0.6, weather: 0.5 },
  tower: { flood: 0.1, seismic: 0.9, conflict: 0.8, weather: 0.6 }, hall: { flood: 0.3, seismic: 0.6, conflict: 0.6, weather: 0.6 }, colonnade: { flood: 0.2, seismic: 0.8, conflict: 0.5, weather: 0.5 },
  vault: { flood: 0.1, seismic: 0.9, conflict: 0.7, weather: 0.9 }, timber: { flood: 0.3, seismic: 0.4, conflict: 0.5, weather: 0.9 }, plaster: { flood: 0.2, seismic: 0.3, conflict: 0.2, weather: 1.0 }, tile: { flood: 0.2, seismic: 0.3, conflict: 0.3, weather: 0.8 },
};
const exposure = (g: string) => { const e = EXPOSURE[g] ?? EXPOSURE.wall; return (e.flood + e.seismic + e.conflict + e.weather) / 4; };
/** Risk 0..100: half current damage, a third exposure, the rest criticality; a part with an applied intervention (the list passed in) carries its reduction. Lost parts are not at risk, they are gone. */
export function riskScore(p: Part, ev: SiteEvent[], year: number, done: Intervention[] = []): number {
  const s = partState(p, ev, year); if (!s.standing) return 0;
  const red = done.filter((i) => i.parts.includes(p.name)).reduce((a, i) => a + i.reduction, 0);
  return Math.round(Math.max(0, 100 * (0.5 * s.damage + 0.3 * exposure(p.group) + 0.2 * p.criticality) * (1 - Math.min(0.8, red))));
}
export const riskTable = (parts: Part[], ev: SiteEvent[], year: number, done: Intervention[]) => parts.map((p) => ({ part: p, risk: riskScore(p, ev, year, done) })).filter((r) => r.risk > 0).sort((a, b) => b.risk - a.risk);
/** Greedy plan: proposed interventions ranked by total risk removed per unit cost, taken while they fit the budget. */
export function plan(parts: Part[], ev: SiteEvent[], year: number, all: Intervention[], budget: number) {
  const done = all.filter((i) => i.status === "done"), base = (list: Intervention[]) => parts.reduce((a, p) => a + riskScore(p, ev, year, list), 0);
  const cand = all.filter((i) => i.status !== "done").map((i) => ({ i, gain: base(done) - base([...done, i]) })).sort((a, b) => b.gain / b.i.cost - a.gain / a.i.cost);
  const chosen: Intervention[] = []; let spent = 0; for (const c of cand) if (c.gain > 0 && spent + c.i.cost <= budget) { chosen.push(c.i); spent += c.i.cost; }
  return { chosen, spent, riskBefore: base(done), riskAfter: base([...done, ...chosen]) };
}
export function summaryText(site: string, year: number, parts: Part[], ev: SiteEvent[], all: Intervention[], budget: number): string {
  const done = all.filter((i) => i.status === "done"), top = riskTable(parts, ev, year, done).slice(0, 5), pl = plan(parts, ev, year, all, budget);
  const ref = "PS-" + [...(site + year + budget + pl.chosen.map((c) => c.id).join())].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0), 0x811c9dc5).toString(16).toUpperCase().padStart(8, "0");
  return [`${ref}  Preservation summary: ${site}`, `Assessed for the year ${year}. Budget $${budget.toLocaleString("en-US")}.`, "", "Highest risk now:", ...top.map((r, i) => `  ${i + 1}. ${r.part.label}: risk ${r.risk}/100, damage ${Math.round(partState(r.part, ev, year).damage * 100)}%`),
    "", pl.chosen.length ? "Recommended interventions within budget:" : "No proposed intervention fits this budget.", ...pl.chosen.map((c) => `  - ${c.label}: $${c.cost.toLocaleString("en-US")}`), "", `Total risk across standing parts: ${pl.riskBefore} now, ${pl.riskAfter} after the plan (spent $${pl.spent.toLocaleString("en-US")}).`,
    `Already done: ${done.map((d) => `${d.label} (${d.year})`).join("; ") || "none"}.`, "", "Demo data: the hazards, costs and risk weights are invented."].join("\n");
}
