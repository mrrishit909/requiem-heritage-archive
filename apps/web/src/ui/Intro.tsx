"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { live, set, state, useStore } from "../store";
import { irisSet } from "./transition";

// Steps (blueprint section 3): 0 dust on charcoal, 1 fragments coalesce into the building, 2 time accelerates (weathering, cracks, loss), 3 pause on the nearly lost structure and the line,
// 4 the fragments reverse into a clean digital reconstruction, 5 the camera passes through the gate's arch and the arch-shaped window opens on the museum.
export default function Intro() {
  const s = useStore(), tl = useRef<gsap.core.Timeline | null>(null), [year, setYear] = useState(1802), [cap, setCap] = useState(""), [line, setLine] = useState(false);
  const finish = () => { tl.current?.kill(); Object.assign(live, { asm: 1, solid: 1, fragK: 0, recon: 0, year: 2026 }); irisSet("300vmax"); document.documentElement.style.setProperty("--ui", "1"); set({ introDone: true, introStep: 99, space: "museum", view: "museum", year: 2026, layer: "material" }); setLine(false); };
  useEffect(() => {
    if (state.reduced) return; gsap.ticker.lagSmoothing(0);
    Object.assign(live, { asm: 0, solid: 0, fragK: 0, recon: 0, year: 1802 }); live.cam.set(26, 11, 40); live.look.set(0, 3, 0); document.documentElement.style.setProperty("--ui", "0"); irisSet("300vmax");
    const o = { w: 300 }; const t = gsap.timeline({ defaults: { ease: "power1.inOut" }, onComplete: finish }); tl.current = t; const step = (n: number, c = "") => () => { set({ introStep: n }); setCap(c); };
    t.call(step(0, "Dust. A charcoal dark."), [], 0).to(live, { fragK: 1, duration: 1.4 }, 1.6)
      .call(step(1, "Fragments find each other."), [], 2.4).to(live, { asm: 1, duration: 4.6, ease: "power2.inOut" }, 2.4).to(live, { solid: 1, duration: 2 }, 5.4).to(live, { fragK: 0, duration: 1 }, 7.2)
      .to(live.cam, { x: 18, y: 8, z: 32, duration: 5, ease: "sine.inOut" }, 2.4)
      .call(step(2, "Time speeds up."), [], 7.8).to(live, { year: 2026, duration: 5, ease: "power2.in", onUpdate: () => setYear(Math.round(live.year)) }, 7.8).to(live.cam, { x: 12, y: 7, z: 27, duration: 5 }, 7.4)
      .call(() => { set({ introStep: 3 }); setCap(""); setLine(true); }, [], 13.2)
      .call(() => { set({ introStep: 4 }); setLine(false); setCap("Rewind. The pieces go home."); }, [], 16)
      .to(live, { asm: 0, fragK: 1, solid: 0, duration: 1.5, ease: "power2.in" }, 16)
      .set(live, { recon: 1, year: 1802 }, 17.6).to(live, { asm: 1, solid: 1, duration: 2.2, ease: "power2.out" }, 17.7).to(live, { fragK: 0, duration: 1.2 }, 19.3)
      .to(live.cam, { x: 0, y: 3, z: 30, duration: 2.4 }, 16.8).to(live.look, { x: 0, y: 2.4, z: -6, duration: 2.4 }, 16.8)
      .call(step(5, ""), [], 19.6).to(live.cam, { x: 0, y: 1.7, z: 4, duration: 2.2, ease: "power2.in" }, 19.6)
      .to(o, { w: 7, duration: 1.2, ease: "power2.in", onUpdate: () => irisSet(`${o.w}vmax`) }, 20.5)
      .call(() => { set({ space: "museum", introDone: true, introStep: 99, view: "museum", year: 2026, layer: "material" }); Object.assign(live, { year: 2026, solid: 1, recon: 0 }); }, [], 21.8)
      .to(o, { w: 300, duration: 1.4, ease: "power2.out", onUpdate: () => irisSet(`${o.w}vmax`) }, 22.0).to({ u: 0 }, { u: 1, duration: 1, onUpdate() { document.documentElement.style.setProperty("--ui", String((this.targets()[0] as { u: number }).u)); } }, 22.6);
    return () => { t.kill(); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = () => { const t = tl.current; if (t && t.time() < 19.5) t.seek(19.6); else finish(); };
  if (s.introDone) return null;
  if (s.reduced) { const fr = [["1802", "Pieces of columns, masonry and beams make a whole building."], ["1893 to 1994", "Earthquake, fire, abandonment and shelling take its roofs, its door, its vault."], ["Today", "Buildings disappear. Memory doesn't have to."], ["The museum", "A clean digital reconstruction, and the archive behind it."]];
    return (<div className="intro intro-static" role="dialog" aria-label="Opening story" data-testid="intro"><ol>{fr.map(([a, b], i) => <li key={i}><b>{a}</b> {b}</li>)}</ol><button className="btn primary" onClick={finish} data-testid="skip-intro">Enter the museum</button></div>); }
  return (<div className="intro" data-testid="intro" data-step={s.introStep}>
    {s.introStep >= 2 && s.introStep <= 3 && <div className="yearbig" aria-hidden>{year}</div>}
    {line && <h1 className="statement" data-testid="statement"><span>Buildings disappear.</span> <span>Memory doesn&rsquo;t have to.</span></h1>}
    <p className="caption" role="status">{cap}</p><button className="btn skip" onClick={skip} data-testid="skip-intro" autoFocus>Skip intro</button></div>);
}
