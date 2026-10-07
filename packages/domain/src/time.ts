// The date scrubber's rules: what is built, how damaged and how eroded each part is in a given year.
import type { Part, SiteEvent } from "@requiem/schemas";
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const BUILD_YEARS = 4;      // a part takes this many years to go up
export const CRUMBLE_YEARS = 1.5;  // and this long to fall after its lost year
export type PartState = { built: number; erosion: number; damage: number; standing: boolean };
const baseline = (p: Part, y: number) => clamp((y - p.built) / (2026 - p.built || 1)) * 0.35;           // slow weathering share, normalised at 2026
const eventShare = (p: Part, ev: SiteEvent[], y: number) => ev.filter((e) => e.year <= y).reduce((a, e) => a + (e.weights[p.group] ?? 0), 0);
/** Damage 0..1 of a part in year `y`: its peak (the 2026 damage from the Blender contract, or 0.9 for a part that is later lost) scaled by how much of the weathering and event damage up to its horizon has happened by `y`. */
export function damageAt(p: Part, ev: SiteEvent[], y: number): number {
  if (y < p.built) return 0; if (p.lost !== null && y >= p.lost) return 1;
  const horizon = p.lost ?? 2026, end = baseline(p, horizon) + eventShare(p, ev, horizon), now = baseline(p, y) + eventShare(p, ev, y), peak = p.lost === null ? p.damage2026 : 0.9;
  return Math.round(peak * clamp(end <= 0 ? 0 : now / end) * 1000) / 1000;
}
export function partState(p: Part, ev: SiteEvent[], y: number): PartState {
  const built = clamp((y - p.built) / BUILD_YEARS), erosion = p.lost === null ? 0 : clamp((y - p.lost) / CRUMBLE_YEARS);
  return { built, erosion, damage: damageAt(p, ev, y), standing: built >= 1 && erosion < 1 };
}
export function siteStats(parts: Part[], ev: SiteEvent[], y: number) {
  const st = parts.map((p) => ({ p, s: partState(p, ev, y) })), live = st.filter((x) => x.s.built > 0 && x.s.erosion < 1), structural = live.filter((x) => x.p.structural);
  return { year: y, standing: live.length, lost: st.filter((x) => x.s.erosion >= 1).length, meanDamage: Math.round((live.reduce((a, x) => a + x.s.damage, 0) / Math.max(1, live.length)) * 100) / 100, structuralDamage: Math.round((structural.reduce((a, x) => a + x.s.damage, 0) / Math.max(1, structural.length)) * 100) / 100, events: ev.filter((e) => e.year <= y).map((e) => e.label) };
}
/** The year when the cumulative view of the site is closest to the user's date: used by the version list. */
export function versionsFrom(parts: Part[], ev: SiteEvent[]) {
  const marks = [{ id: "v1802", label: "As built", y: 1802 }, ...ev.filter((e) => e.year > 1802 && e.year !== 2023).map((e) => ({ id: "v" + e.year, label: `After ${e.label.toLowerCase()}`, y: e.year + 2 })), { id: "v2026", label: "Today", y: 2026 }];
  return marks.map((m, i) => ({ id: m.id, label: m.label, yearStart: m.y, yearEnd: (marks[i + 1]?.y ?? 2026) - (i + 1 < marks.length ? 1 : 0), layerManifest: { present: parts.filter((p) => partState(p, ev, m.y).standing).map((p) => p.name), lost: parts.filter((p) => p.lost !== null && p.lost <= m.y).map((p) => p.name) } }));
}
