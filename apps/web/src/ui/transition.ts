import gsap from "gsap";
import { live, set, state } from "../store";
const root = () => document.documentElement;
export const irisSet = (w: string) => root().style.setProperty("--aw", w);
/** Match-cut through an arch: the arch-shaped window closes onto the centre, the space changes behind it, and the window opens on the other side. */
export function irisTo(space: "museum" | "site", onSwitch?: () => void) {
  const done = () => { set({ space }); onSwitch?.(); };
  if (state.reduced) { done(); return; }
  const o = { w: 300 }, upd = () => irisSet(`${o.w}vmax`);
  gsap.timeline().to(o, { w: 7, duration: 0.8, ease: "power2.in", onUpdate: upd }).call(done).to(o, { w: 300, duration: 1.3, ease: "power2.out", onUpdate: upd }, ">0.15");
}
export function enterSite() {
  live.nav = { x: 0, y: 1.7, z: 22, yaw: 0, pitch: 0 };
  irisTo("site", () => { set({ view: "structure", prevView: state.view }); history.replaceState(null, "", "#structure"); });
}
export function leaveSite() { irisTo("museum", () => { set({ view: "museum", prevView: state.view, selItem: null }); history.replaceState(null, "", "#museum"); }); }
