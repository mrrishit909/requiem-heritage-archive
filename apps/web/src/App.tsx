"use client";
import { useEffect, useState } from "react";
import { loadData, base, type Data } from "./data";
import { live, set, state, useStore, VIEWS, type Layer } from "./store";
import Intro from "./ui/Intro";
import Panels from "./ui/Panels";
import Scene from "./scene/Scene";
const webglOk = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
export default function App() {
  const s = useStore(); const [data, setData] = useState<Data | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search), rm = matchMedia("(prefers-reduced-motion: reduce)").matches || q.get("motion") === "reduced", view = VIEWS.find((v) => v.id === q.get("view"))?.id, skip = q.get("skip") === "1" || !!view;
    const layer = (["material", "structure", "damage", "recon"] as Layer[]).find((l) => l === q.get("layer")), year = Number(q.get("year"));
    set({ reduced: rm, pauseMotion: rm, gfx: q.get("gfx") === "off" || !webglOk() ? "poster" : "webgl", ...(view ? { view, space: view === "museum" ? "museum" : "site" } : {}), ...(layer ? { layer } : {}), ...(Number.isFinite(year) && year >= 1790 && year <= 2026 && q.get("year") ? { year } : {}), ...(q.get("item") ? { selItem: q.get("item") } : {}), ...(q.get("nav") === "walk" || q.get("nav") === "fly" ? { nav: q.get("nav") as "walk" | "fly" } : {}), ...(skip ? { introDone: true, introStep: 99 } : {}) });
    if (skip) { document.documentElement.style.setProperty("--ui", "1"); document.documentElement.style.setProperty("--aw", "300vmax"); live.year = state.year; }
    loadData().then(setData).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => { const f = () => { const v = VIEWS.find((x) => x.id === location.hash.slice(1)); if (v && v.id !== state.view && state.introDone) set({ prevView: state.view, view: v.id, space: v.id === "museum" ? "museum" : "site" }); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  // year playback
  useEffect(() => { if (!data) return; let raf = 0, last = performance.now(); const tick = (n: number) => { const dt = (n - last) / 1000; last = n; if (state.playing && !document.hidden) { const y = Math.min(2026, state.year + dt * 14); set({ year: y, playing: y < 2026 }); } raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [data]);
  // walk / fly keys
  useEffect(() => {
    const map: Record<string, [keyof typeof live.keys, number]> = { w: ["forward", 1], s: ["forward", -1], d: ["right", 1], a: ["right", -1], e: ["up", 1], q: ["up", -1], ArrowLeft: ["turn", 1], ArrowRight: ["turn", -1], ArrowUp: ["look", 1], ArrowDown: ["look", -1] };
    const h = (down: boolean) => (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (/INPUT|SELECT|TEXTAREA/.test(t.tagName) || state.nav === "orbit" || state.space !== "site" || (t.closest("nav") && e.key.startsWith("Arrow"))) return; const m = map[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (!m) return; live.keys[m[0]] = down ? m[1] : 0; if (down) e.preventDefault(); };
    const dn = h(true), up = h(false); addEventListener("keydown", dn); addEventListener("keyup", up); return () => { removeEventListener("keydown", dn); removeEventListener("keyup", up); };
  }, []);
  if (err) return <div className="boot" role="alert">Could not load data: {err}</div>;
  if (!data) return <div className="boot" role="status">Gathering the fragments…</div>;
  return (
    <div className="app" data-view={s.view} data-space={s.space} data-intro={s.introDone ? "done" : "running"} data-gfx={s.gfx} data-layer={s.layer}>
      {s.gfx === "webgl" ? <Scene data={data} /> : <div className="poster" style={{ backgroundImage: `url(${base}/posters/site.png)` }} role="img" aria-label="Still of Orisk Caravan House, a fictional walled caravan house with a gate arch, two towers and a colonnaded hall" data-testid="poster" />}
      <div className="vignette" aria-hidden /><Panels data={data} /><div className="iris" aria-hidden />{!s.introDone && <Intro />}
    </div>
  );
}
