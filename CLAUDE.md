# REQUIEM

Digital museum demo for a fictional endangered building (blueprint 04, Advanced Engineering Build Book Vol. VII). Static site; the Blender asset is scripted. The building, its history, its archive and its conservation figures are fictional.

- Build the asset: `npm run model` (Blender 4.5 at ~/Applications), then `node scripts/copy-assets.ts`. Contract: `model/parts.json` (39 parts, 4 collections, build/lost years, 2026 damage, events). The build also writes `model/exports/manifest.json` (measured bounding boxes) which anchors, fragments and the validator use.
- Rules: `packages/domain` (time/erosion, risk and plan, archive anchors, walk/fly steps, fragments). Tests: `npm test`, `npm run e2e` after `npm run build`.
- Space: glTF axes in metres, north is -z; the museum sits 300 m east of the site; `live` (store.ts) holds per-frame values; `window.__rLive` is exposed for tests.
- Multi-agent is the development process only (.claude/agents); the product contains no agents.
