import * as THREE from "three";
// A MeshStandardMaterial patched with the date-scrubber's rules: build-in and crumble-away by noise threshold, damage as dust and cracks, and four layer looks.
export type ErodeUniforms = { uErode: { value: number }; uBuild: { value: number }; uDamage: { value: number }; uMode: { value: number }; uStruct: { value: number }; uTime: { value: number }; uHot: { value: number } };
const NOISE = /* glsl */ `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y), mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
float crackLines(vec3 p){ float a = abs(vn(p*1.3) - 0.5), b = abs(vn(p*2.9+7.0) - 0.5); return smoothstep(0.02, 0.0, min(a, b)); }`;
export function erodeMaterial(base: THREE.MeshStandardMaterial): { mat: THREE.MeshStandardMaterial; u: ErodeUniforms } {
  const mat = base.clone(), u: ErodeUniforms = { uErode: { value: 0 }, uBuild: { value: 1 }, uDamage: { value: 0 }, uMode: { value: 0 }, uStruct: { value: 0 }, uTime: { value: 0 }, uHot: { value: 0 } };
  mat.side = THREE.DoubleSide; mat.transparent = true;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\nvarying vec3 vWp; uniform float uErode;\n${NOISE}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n{ vec3 w0 = (modelMatrix * vec4(transformed, 1.0)).xyz; float n = h31(floor(w0 * 0.8)); transformed.y -= uErode * uErode * n * 2.5; transformed.xz += (n - 0.5) * uErode * 1.2; }`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWp; uniform float uErode, uBuild, uDamage, uMode, uStruct, uTime, uHot;\n${NOISE}`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n{ float nz = vn(vWp * 1.7) * 0.7 + vn(vWp * 5.3) * 0.3; if (nz < uErode * 1.15 - 0.08) discard; if (nz > uBuild * 1.15) discard; }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
{ float cr = crackLines(vWp) * smoothstep(0.15, 0.7, uDamage) * 0.95;
  float wear = vn(vWp * 3.1) * 0.5 + 0.5;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.81, 0.78, 0.71), uDamage * 0.5 * wear);
  diffuseColor.rgb *= 1.0 - cr * 0.85;
  if (uMode > 0.5 && uMode < 1.5) { diffuseColor.a = uStruct > 0.5 ? 1.0 : 0.1; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.91, 0.87, 0.78), uStruct * 0.45); }
  if (uMode > 1.5 && uMode < 2.5) { vec3 lo = vec3(0.91, 0.87, 0.78), mid = vec3(0.58, 0.36, 0.26), hi = vec3(0.54, 0.14, 0.14); vec3 c = uDamage < 0.5 ? mix(lo, mid, uDamage * 2.0) : mix(mid, hi, (uDamage - 0.5) * 2.0); diffuseColor.rgb = c * (1.0 - cr * 0.6); }
  if (uMode > 2.5) { diffuseColor.rgb = vec3(0.91, 0.87, 0.78) * (0.85 + 0.15 * wear); }
}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uHot * vec3(0.54, 0.14, 0.14) * 0.6 + (uMode > 0.5 && uMode < 1.5 ? uStruct * vec3(0.3, 0.27, 0.2) : vec3(0.0)) + (uMode > 2.5 ? vec3(0.12, 0.11, 0.09) : vec3(0.0));`);
  };
  mat.customProgramCacheKey = () => "erode-v1";
  return { mat, u };
}
