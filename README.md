# REQUIEM: a museum for buildings that are disappearing

The page opens on dust, then fragments of columns, masonry and beams coalesce into a building. Time speeds up: an earthquake, a fire, abandonment, shelling and a flood take its towers, door, columns and vault. Then the line, **BUILDINGS DISAPPEAR. MEMORY DOESN'T HAVE TO.**, and the pieces go home as a clean digital reconstruction. The camera passes through the gate's arch and an arch-shaped window opens on the museum.

In the museum you open the flagship, scrub its history (the scrubber physically builds and erodes the geometry), switch between material, structure, damage and reconstruction layers, walk, fly or orbit it, open archive items that emerge from anchors on the building, and generate a preservation summary.

Built from blueprint 04 of the *Advanced Engineering Build Book, Volume VII* as a **vertical slice**. **The building, the country, the history, the archive items, the people quoted and every conservation figure are fictional.** The drawings and photographs are illustrations generated for the demo, not scans.

- Live: https://mrrishit909.github.io/projects/requiem-heritage-archive/demo/
- Case study: https://mrrishit909.github.io/projects/requiem-heritage-archive/

## Run it
```bash
npm ci
npm run seed                      # sites, archive, interventions, versions
npm run model                     # Blender 4.5: build.py then validate.py (the GLB and manifest are committed, so optional)
npm test                          # 25 domain + API tests
npm run build && node scripts/serve.ts 8661   # static export at http://127.0.0.1:8661
npm run e2e                       # 21 Playwright tests (needs Google Chrome)
node apps/api/src/server.ts       # /v1 API on :8660, OpenAPI at /openapi.json
```
`?skip=1`, `?view=museum|structure|archive|conservation`, `&year=1996`, `&layer=material|structure|damage|recon`, `&item=a5`, `&nav=walk|fly`, `?gfx=off`, `?motion=reduced`.

## The pipeline
`model/parts.json` is the contract. `build.py` makes 39 named parts under four collection empties, writes a manifest of measured bounding boxes, and exports the GLB; `validate.py` re-imports it and checks names, collections, the time rules and that the manifest matches the geometry. The browser owns the time, the erosion shader, the fragments, the iris and the cameras. See [docs/](docs/) and [design/](design/).

## Agent roles
`.claude/agents/` defines the twelve roles from the book, `.claude/skills/` the six project skills. **Honest note:** this repository was produced by one Claude Code session playing those roles in sequence on one working tree, not by parallel subagents in separate worktrees. The multi-agent workflow is the development process; the product contains no agents.

## Not built, and why
PostGIS (JSON files instead), a CDN or IIIF media delivery, photogrammetry and GLB ingestion adapters, real audio (transcripts and a waveform drawing), touch tests beyond the phone layout, tablet and large-desktop checks, and a measurement on a physical GPU.
