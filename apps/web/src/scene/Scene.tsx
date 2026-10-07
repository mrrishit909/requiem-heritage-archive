"use client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { anchorPosition, fragmentsFor, itemsAt, orbitPos, partState, stepFly, stepWalk, mulberry32 } from "@requiem/domain";
import type { Data } from "../data";
import { base } from "../data";
import { live, set, state, useStore } from "../store";
import { erodeMaterial, type ErodeUniforms } from "./erode";

const COLOR: Record<string, string> = { stone: "#A49E91", plaster: "#E9DFC8", timber: "#945D43", tile: "#8A4a34", ground: "#CFC6B4" };
const MX = 300;                                                       // the museum sits 300 m east of the site
const PLINTH: [number, number][] = [[MX - 6, 5], [MX + 6, 5], [MX - 6, -9], [MX + 6, -9]];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function Site({ data }: { data: Data }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/site.glb`), model = useMemo(() => gltf.scene.clone(true), [gltf]), root = useRef<THREE.Group>(null);
  const items = useMemo(() => data.parts.map((p) => { const node = model.getObjectByName(p.name) as THREE.Mesh; const { mat, u } = erodeMaterial(new THREE.MeshStandardMaterial({ color: COLOR[p.material], roughness: 0.95, metalness: 0 })); node.material = mat; return { p, node, u }; }), [model, data]);
  useFrame((st) => {
    const s = state, intro = !s.introDone, year = intro ? live.year : s.layer === "recon" ? 1802 : s.year, visible = s.space === "site" || intro; if (root.current) root.current.visible = visible;
    const mode = s.layer === "material" ? 0 : s.layer === "structure" ? 1 : s.layer === "damage" ? 2 : 3;
    for (const { p, node, u } of items) {
      const stt = partState(p, data.events, year), recon = (s.layer === "recon" && !intro) || (intro && live.recon > 0.5), present = recon ? p.built <= 1802 : true;
      u.uErode.value = recon ? 0 : stt.erosion; u.uBuild.value = !present ? 0 : recon ? 1 : Math.min(stt.built, intro ? live.solid : 1); u.uDamage.value = recon ? 0 : stt.damage; u.uMode.value = intro ? (live.recon > 0.5 ? 3 : 0) : mode; u.uStruct.value = p.structural ? 1 : 0; u.uTime.value = st.clock.elapsedTime; u.uHot.value = live.hover === p.name ? 1 : 0;
      node.visible = u.uBuild.value > 0.001 && u.uErode.value < 0.999; (node.material as THREE.MeshStandardMaterial).opacity = 1;
    }
  });
  return <group ref={root}><primitive object={model} /></group>;
}

function Fragments({ data }: { data: Data }) {
  const frags = useMemo(() => fragmentsFor(data.manifest, 0.55, 420), [data]), ref = useRef<THREE.InstancedMesh>(null), tmp = useMemo(() => new THREE.Object3D(), []), col = useMemo(() => new THREE.Color(), []);
  const by = useMemo(() => new Map(data.parts.map((p) => [p.name, p])), [data]);
  useEffect(() => { const m = ref.current!; frags.forEach((f, i) => m.setColorAt(i, col.set(COLOR[by.get(f.part)!.material]))); if (m.instanceColor) m.instanceColor.needsUpdate = true; }, [frags, by, col]);
  useFrame(() => {
    const m = ref.current!, s = state, intro = !s.introDone, year = intro ? live.year : s.year;
    m.visible = (intro && live.fragK > 0.01) || (!intro && s.space === "site" && s.layer !== "recon");
    if (!m.visible) return;
    frags.forEach((f, i) => {
      const p = by.get(f.part)!, st = partState(p, data.events, year), a = intro ? live.asm : 1, e = intro ? 0 : st.erosion, k = a * a * (3 - 2 * a);
      // while assembling they fly in; afterwards only the fragments of a part that has crumbled stay behind as debris on the ground
      const show = intro ? live.fragK : e > 0 && e < 1.4 ? 1 : st.erosion >= 1 ? 1 : 0;
      const x = f.scatter[0] + (f.target[0] - f.scatter[0]) * k, y0 = f.scatter[1] + (f.target[1] - f.scatter[1]) * k, z = f.scatter[2] + (f.target[2] - f.scatter[2]) * k;
      const y = intro ? y0 : Math.max(0.15, f.target[1] * (1 - e)), sc = f.size * show * (intro ? 1 : 1 + e);
      tmp.position.set(intro ? x : f.target[0] + (f.scatter[0] - f.target[0]) * 0.02 * e, y, intro ? z : f.target[2]); tmp.rotation.set(f.spin[0] * (1 - k), f.spin[1] * (1 - k), f.spin[2] * (1 - k)); tmp.scale.setScalar(Math.max(0.0001, sc)); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, frags.length]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.95} /></instancedMesh>;
}

function Dust() {
  const { camera } = useThree(), pts = useRef<THREE.Points>(null), prev = useMemo(() => new THREE.Vector3(), []), drift = useMemo(() => new THREE.Vector3(), []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(), n = 700, p = new Float32Array(n * 3), r = mulberry32(11); for (let i = 0; i < n * 3; i++) p[i] = r(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g; }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uCam: { value: new THREE.Vector3() }, uDrift: { value: new THREE.Vector3() }, uT: { value: 0 }, uA: { value: 0.5 } },
    vertexShader: `uniform vec3 uCam; uniform vec3 uDrift; uniform float uT; varying float vA; void main(){ vec3 b = position; vec3 off = (b - 0.5) * 60.0 + uDrift * (0.4 + b.x); vec3 p = uCam + (fract((off + vec3(uT*0.4*(b.y-0.5), uT*0.25*b.z, uT*0.3*(b.x-0.5))) / 60.0 + 0.5) - 0.5) * 60.0; vA = 0.25 + 0.75*b.z; vec4 mv = viewMatrix * vec4(p,1.0); gl_PointSize = 60.0 / -mv.z + 1.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(0.81, 0.78, 0.71, (1.0 - r*2.0) * vA * uA * 0.5); }` }), []);
  useFrame((st) => { const u = mat.uniforms; prev.copy(prev.lengthSq() ? prev : camera.position); drift.addScaledVector(camera.position.clone().sub(prev), -0.6); drift.multiplyScalar(0.985); prev.copy(camera.position); u.uCam.value.copy(camera.position); u.uDrift.value.copy(drift); u.uT.value = state.pauseMotion ? 0 : st.clock.elapsedTime; u.uA.value = 0.6; void pts; });
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />;
}

function Markers({ data }: { data: Data }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]), pos = useMemo(() => data.archive.map((i) => new THREE.Vector3(...anchorPosition(i, data.manifest))), [data]);
  useFrame((st) => { const s = state, shown = new Set(itemsAt(data.archive, data.parts, s.year).map((i) => i.id)); data.archive.forEach((it, i) => { const m = refs.current[i]; if (!m) return; const on = shown.has(it.id) && s.space === "site" && s.introDone && (s.view === "archive" || s.selItem === it.id); m.visible = on; const sel = s.selItem === it.id; m.scale.setScalar((sel ? 0.55 : 0.32) * (1 + (s.pauseMotion ? 0 : 0.15 * Math.sin(st.clock.elapsedTime * 3 + i)))); }); });
  return <>{data.archive.map((it, i) => <mesh key={it.id} ref={(m) => { refs.current[i] = m; }} position={pos[i]} visible={false}><torusGeometry args={[1, 0.18, 8, 24]} /><meshBasicMaterial color="#8A2424" depthTest={false} transparent opacity={0.95} /></mesh>)}</>;
}

function Museum({ data }: { data: Data }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/site.glb`), g = useRef<THREE.Group>(null);
  const mini = useMemo(() => { const m = gltf.scene.clone(true); m.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { const p = data.parts.find((x) => x.name === me.name); me.material = new THREE.MeshStandardMaterial({ color: "#E9DFC8", roughness: 0.9, emissive: "#2a251c" }); me.visible = !p || p.built <= 1802; } }); return m; }, [gltf, data]);
  const archShape = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-14, 0); s.lineTo(14, 0); s.lineTo(14, 16); s.lineTo(-14, 16); s.closePath(); const h = new THREE.Path(); h.moveTo(-4, 0); h.lineTo(4, 0); h.lineTo(4, 7); h.absarc(0, 7, 4, 0, Math.PI, false); h.lineTo(-4, 0); s.holes.push(h); return new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false }); }, []);
  useFrame(() => { if (g.current) g.current.visible = state.space === "museum" || !state.introDone; });
  const stone = <meshStandardMaterial color="#2a2825" roughness={0.95} />;
  return (
    <group ref={g} position={[0, 0, 0]}>
      <mesh position={[MX, -0.05, -2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 64]} />{stone}</mesh>
      <mesh position={[MX - 20, 8, -2]}><boxGeometry args={[1, 16, 64]} />{stone}</mesh><mesh position={[MX + 20, 8, -2]}><boxGeometry args={[1, 16, 64]} />{stone}</mesh><mesh position={[MX, 8, 31]}><boxGeometry args={[40, 16, 1]} />{stone}</mesh>
      <mesh geometry={archShape} position={[MX, 0, -32]}>{stone}</mesh><mesh position={[MX, 16.2, -2]}><boxGeometry args={[40, 0.4, 64]} />{stone}</mesh>
      {PLINTH.map(([x, z], i) => (<group key={i} position={[x, 0, z]}><mesh position={[0, 0.5, 0]}><boxGeometry args={[4.2, 1, 4.2]} /><meshStandardMaterial color="#3a3733" roughness={0.9} /></mesh>
        <spotLight position={[0, 9, 3]} intensity={260} angle={0.5} penumbra={0.8} color="#F3E6C7" distance={22} decay={1.4} target-position={[0, 1, 0]} />
        {i === 0 ? <group position={[0, 1, 0]} scale={0.1}><primitive object={mini} /></group> : <Placeholder i={i} />}</group>))}
      <ambientLight intensity={0.6} color="#cfc6b4" /><pointLight position={[MX, 10, 20]} intensity={400} color="#E9DFC8" distance={50} />
    </group>
  );
}
function Placeholder({ i }: { i: number }) {
  const m = <meshStandardMaterial color="#cfc6b4" roughness={0.9} emissive="#2a251c" />;
  return (<group position={[0, 1, 0]}>{i === 1 && Array.from({ length: 7 }, (_, k) => <mesh key={k} position={[-1.5 + k * 0.5, 0.25, 0]}><boxGeometry args={[0.45, 0.5, 0.5]} />{m}</mesh>)}{i === 1 && <mesh position={[0, 0.55, 0]}><boxGeometry args={[3.6, 0.1, 0.6]} />{m}</mesh>}
    {i === 2 && <><mesh position={[0, 0.4, 0]}><boxGeometry args={[1.6, 0.8, 1.2]} />{m}</mesh><mesh position={[1.1, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, 0.2, 14]} />{m}</mesh></>}
    {i === 3 && Array.from({ length: 5 }, (_, k) => <mesh key={k} position={[-1.4 + k * 0.7, 0.45, 0]}><boxGeometry args={[0.08, 0.9, 0.08]} />{m}</mesh>)}{i === 3 && <mesh position={[0, 0.95, 0]}><boxGeometry args={[3, 0.06, 1]} />{m}</mesh>}</group>);
}

function Ground() { const r = useRef<THREE.Mesh>(null); useFrame(() => { if (r.current) r.current.visible = state.space === "site" || !state.introDone; }); return <mesh ref={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}><circleGeometry args={[120, 48]} /><meshStandardMaterial color="#2b2824" roughness={1} /></mesh>; }

function Rig({ data }: { data: Data }) {
  const { camera, size } = useThree(), cam = camera as THREE.PerspectiveCamera, want = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), []), cur = useRef({ p: new THREE.Vector3(0, 9, 36), l: new THREE.Vector3(0, 3, 0) }), v = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const s = state; let snap = false;
    if (!s.introDone) { want.copy(live.cam); look.copy(live.look); snap = true; }
    else if (s.space === "museum") { const i = Math.max(0, data.sites.findIndex((x) => x.id === s.selSite)), [px, pz] = PLINTH[i]; if (s.view === "museum" && s.selSite) { want.set(px + (px < MX ? -1 : 1) * 1.5, 2.6, pz + 8); look.set(px, 1.7, pz); } else { want.set(MX, 4, 24); look.set(MX, 2, -4); } }
    else if (s.view === "archive" && s.selItem) { const it = data.archive.find((x) => x.id === s.selItem)!, a = anchorPosition(it, data.manifest); want.set(a[0] + 2, a[1] + 1.2, a[2] + 10); look.set(a[0], a[1], a[2]); }
    else if (s.nav === "orbit") { const o = live.orbit, p = orbitPos([0, 4, 0], o.yaw, o.pitch, o.dist); want.set(...p); look.set(0, 4, 0); }
    else { const n = (live.nav = s.nav === "walk" ? stepWalk(live.nav, live.keys, dt) : stepFly(live.nav, live.keys, dt)); want.set(n.x, n.y, n.z); look.set(n.x - Math.sin(n.yaw) * Math.cos(n.pitch), n.y + Math.sin(n.pitch), n.z - Math.cos(n.yaw) * Math.cos(n.pitch)); snap = true; }
    const k = snap || s.reduced ? 1 : 1 - Math.exp(-dt * 2.4); cur.current.p.lerp(want, k); cur.current.l.lerp(look, k);
    cam.position.copy(cur.current.p); cam.lookAt(cur.current.l); cam.fov = 50; cam.near = 0.1; cam.far = 900; const shift = size.width > 900 && s.introDone ? size.width * 0.1 : 0; cam.setViewOffset(size.width, size.height, shift, 0, size.width, size.height); cam.updateProjectionMatrix();
    // screen position of the selected archive anchor for the DOM card
    if (s.selItem && s.space === "site") { const it = data.archive.find((x) => x.id === s.selItem)!, a = anchorPosition(it, data.manifest); v.set(...a).project(cam); const r = document.documentElement.style; r.setProperty("--ax", `${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px`); r.setProperty("--ay", `${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px`); }
  });
  return null;
}
function Lights() { return <><ambientLight intensity={0.55} color="#cfc6b4" /><directionalLight position={[30, 40, 20]} intensity={2.2} color="#F3E6C7" /><hemisphereLight args={["#E9DFC8", "#111111", 0.35]} /></>; }
function Lifecycle() {
  const { setFrameloop, gl } = useThree();
  useEffect(() => { const vis = () => setFrameloop(document.hidden ? "never" : "always"), lost = (e: Event) => { e.preventDefault(); set({ gfx: "poster" }); };
    document.addEventListener("visibilitychange", vis); gl.domElement.addEventListener("webglcontextlost", lost); (window as unknown as { __requiemStats: () => unknown }).__requiemStats = () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures });
    return () => { document.removeEventListener("visibilitychange", vis); gl.domElement.removeEventListener("webglcontextlost", lost); }; }, [setFrameloop, gl]);
  return null;
}

export default function Scene({ data }: { data: Data }) {
  useStore();
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; nyaw: number; npitch: number } | null>(null);
  useEffect(() => { (window as unknown as { __rLive: typeof live; __rState: typeof state }).__rLive = live; (window as unknown as { __rState: typeof state }).__rState = state; }, []);
  return (
    <Canvas className="stage" data-testid="stage" dpr={[1, 1.5]} camera={{ fov: 50, position: [0, 9, 36] }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl, scene }) => { gl.setClearColor("#111111"); scene.fog = new THREE.FogExp2("#111111", 0.006); }}
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, yaw: live.orbit.yaw, pitch: live.orbit.pitch, nyaw: live.nav.yaw, npitch: live.nav.pitch }; }}
      onPointerMove={(e) => { const d = drag.current; if (!d || !state.introDone || state.space !== "site") return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (state.nav === "orbit") { live.orbit.yaw = d.yaw - dx * 0.006; live.orbit.pitch = clamp(d.pitch + dy * 0.005, 0.03, 1.4); } else { live.nav.yaw = d.nyaw - dx * 0.004; live.nav.pitch = clamp(d.npitch - dy * 0.004, -1.2, 1.2); } }}
      onPointerUp={() => { drag.current = null; }} onWheel={(e) => { if (state.nav === "orbit" && state.space === "site") live.orbit.dist = clamp(live.orbit.dist + e.deltaY * 0.03, 12, 90); }}>
      <Lights /><Rig data={data} /><Ground /><Site data={data} /><Fragments data={data} /><Markers data={data} /><Museum data={data} /><Dust /><Lifecycle />
    </Canvas>
  );
}
