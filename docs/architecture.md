# Architecture

```
model/parts.json (contract) ──> model/build.py ──Blender──> site.glb, manifest.json (measured boxes), source.blend, poster.png
                            └─> model/validate.py (fresh-scene re-import: names, collections, time rules, manifest vs geometry, budgets)
data/simulators/generate.ts ──> sites, parts, events, archive (generated illustrations), interventions, versions
packages/domain: time/erosion, risk and plan, archive anchors, navigation, fragments (pure, tested)
apps/web (Next.js 16 static export): App ─ store ─ Panels (DOM) + Scene (R3F: site, museum, fragments, dust, markers) + Intro (GSAP)
apps/api (node:http): the blueprint's section 12 contract + one idempotent POST for preservation summaries
```

**One function for time.** `partState(part, events, year)` gives each part's build progress, erosion and damage. The scrubber, the intro's time-lapse, the parts table, the statistics, the versions list and the risk table all call it. A test asserts that 2026 damage equals the contract's `damage2026` for every surviving part, so Blender's "Current" and the browser agree.

**Collections as parents.** The GLB has four collection empties (Current, Historical, Structural, Missing) with the 39 named parts beneath them. The validator checks each part sits under its declared collection and applies the time rules (a Missing part has a lost year; a lost part has damage 1).

**The erosion material** is a patched `MeshStandardMaterial`: per-part uniforms (erode, build, damage, mode, structural flag) drive a noise-threshold discard, a vertex fall, dust and cracks, and four layer looks (material, structure, damage, reconstruction), so one material system serves the scrubber, the layers and the intro.

**Two spaces, one canvas.** The museum is built 300 m east of the site; visibility and the camera switch behind the arch-shaped window.

**Not built.** PostgreSQL/PostGIS (the schema in the book is the target; the demo reads JSON), a CDN or IIIF image delivery, photogrammetry or GLB ingestion adapters, real audio for oral histories (transcripts and a waveform drawing only), accounts.
