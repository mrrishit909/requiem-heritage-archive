import { useSyncExternalStore } from "react";
import { Vector3 } from "three";
export type View = "museum" | "structure" | "archive" | "conservation";
export const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: "museum", label: "Museum", blurb: "The collection, as rooms" }, { id: "structure", label: "Structure", blurb: "Walk it, scrub its history" },
  { id: "archive", label: "Archive", blurb: "Drawings, photographs, voices" }, { id: "conservation", label: "Conservation", blurb: "Risk and what to do" },
];
export type Layer = "material" | "structure" | "damage" | "recon";
export type NavMode = "orbit" | "walk" | "fly";
export type State = { view: View; prevView: View; space: "museum" | "site"; year: number; playing: boolean; layer: Layer; nav: NavMode; selItem: string | null; selSite: string; budget: number; summary: string; applied: string[]; introDone: boolean; introStep: number; reduced: boolean; pauseMotion: boolean; gfx: "webgl" | "poster" };
export const state: State = { view: "museum", prevView: "museum", space: "museum", year: 2026, playing: false, layer: "material", nav: "orbit", selItem: null, selSite: "orisk-caravan-house", budget: 150000, summary: "", applied: [], introDone: false, introStep: 0, reduced: false, pauseMotion: false, gfx: "webgl" };
/** Per-frame values the intro and the camera read; not reactive. */
export const live = { year: 2026, asm: 1, solid: 1, fragK: 0, recon: 0, cam: new Vector3(0, 9, 36), look: new Vector3(0, 3, 0), arch: 0, introActive: true, keys: { forward: 0, right: 0, up: 0, turn: 0, look: 0 }, nav: { x: 0, y: 1.7, z: 22, yaw: 0, pitch: 0 }, orbit: { yaw: 0.5, pitch: 0.35, dist: 46 }, flyTo: null as null | { pos: Vector3; look: Vector3 }, hover: "" };
let snap = { ...state }; const subs = new Set<() => void>();
export function set(p: Partial<State>) { Object.assign(state, p); snap = { ...state }; subs.forEach((f) => f()); }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap, () => snap);
