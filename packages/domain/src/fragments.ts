// Fragment targets for the intro: points sampled inside each part's bounding box, with a scatter start.
import type { Bbox } from "@requiem/schemas";
import { mulberry32 } from "./rng.ts";
export type Fragment = { part: string; target: [number, number, number]; scatter: [number, number, number]; size: number; spin: [number, number, number] };
export function fragmentsFor(man: Record<string, Bbox>, perM3: number, max: number, seed = 7): Fragment[] {
  const r = mulberry32(seed), out: Fragment[] = [];
  for (const [part, b] of Object.entries(man)) {
    const vol = (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]), n = Math.max(1, Math.min(14, Math.round(vol * perM3)));
    for (let i = 0; i < n; i++) { const t = [0, 1, 2].map((a) => b.min[a] + r() * (b.max[a] - b.min[a])) as [number, number, number], a = r() * Math.PI * 2, d = 14 + r() * 26; out.push({ part, target: t, scatter: [t[0] + Math.cos(a) * d, t[1] + 6 + r() * 22, t[2] + Math.sin(a) * d], size: 0.12 + r() * 0.3, spin: [r() * 6, r() * 6, r() * 6] }); }
  }
  if (out.length > max) { const keep = new Set<number>(); while (keep.size < max) keep.add(Math.floor(r() * out.length)); return out.filter((_, i) => keep.has(i)); }
  return out;
}
