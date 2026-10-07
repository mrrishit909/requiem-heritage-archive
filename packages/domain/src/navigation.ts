// Walk and fly navigation, as pure steps so they can be tested without a renderer. Coordinates are glTF axes (y up, north is -z), metres.
export type Nav = { x: number; y: number; z: number; yaw: number; pitch: number };
export type Keys = { forward: number; right: number; up: number; turn: number; look: number };
export const EYE = 1.7, BOUNDS = { x: 17, z: 15 }, WALK = 3.2, FLY = 9;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** One step of walking: forward/right in the facing direction, turning with yaw, eye height fixed and the position kept inside the site's fence. */
export function stepWalk(n: Nav, k: Keys, dt: number): Nav {
  const yaw = n.yaw + k.turn * 1.6 * dt, sx = -Math.sin(yaw), sz = -Math.cos(yaw), v = WALK * dt;
  return { x: clamp(n.x + (sx * k.forward + Math.cos(yaw) * k.right) * v, -BOUNDS.x, BOUNDS.x), y: EYE, z: clamp(n.z + (sz * k.forward - Math.sin(yaw) * k.right) * v, -BOUNDS.z, BOUNDS.z), yaw, pitch: clamp(n.pitch + k.look * dt, -1.2, 1.2) };
}
/** Flying: like walking but along the look direction, with vertical control, a floor at 0.5 m and a ceiling at 40 m. */
export function stepFly(n: Nav, k: Keys, dt: number): Nav {
  const yaw = n.yaw + k.turn * 1.6 * dt, pitch = clamp(n.pitch + k.look * dt, -1.4, 1.4), v = FLY * dt, cp = Math.cos(pitch);
  const fx = -Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = -Math.cos(yaw) * cp;
  return { x: clamp(n.x + (fx * k.forward + Math.cos(yaw) * k.right) * v, -40, 40), y: clamp(n.y + (fy * k.forward + k.up) * v, 0.5, 40), z: clamp(n.z + (fz * k.forward - Math.sin(yaw) * k.right) * v, -40, 40), yaw, pitch };
}
/** Orbit camera position around a target. */
export const orbitPos = (target: [number, number, number], yaw: number, pitch: number, dist: number): [number, number, number] => [target[0] + Math.sin(yaw) * Math.cos(pitch) * dist, target[1] + Math.sin(pitch) * dist, target[2] + Math.cos(yaw) * Math.cos(pitch) * dist];
