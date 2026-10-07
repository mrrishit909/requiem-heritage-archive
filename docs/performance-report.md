# Performance report

Hardware: Apple M3 Pro, Chrome stable, **software WebGL (SwiftShader)**, 1280 x 800. No physical GPU was exercised: **no 60 fps claim is made.** Command: `node scripts/measure.mjs`, structure view.

| Measure | Value | Budget |
|---|---|---|
| Transfer (22 requests, local, uncompressed) | 336 KB | n/a |
| JS gzipped | 567 KB | 750 KB |
| site.glb / archive.json | 89 KB / 14 KB | 900 KB / 80 KB |
| Draw calls / triangles / geometries / textures | 55 / 1,502 / 55 / 1 | 200 / 150,000 |
| LCP | 3.8 s (software rasteriser) | none set |
| CLS | 0 | 0.1 |
| Long tasks during load | 3.0 s | none set |
| Median / p95 frame | 33.4 / 50.1 ms (software) | none set |
| Scrub to readout | 27 ms | 3 s |

Draw calls and triangles are renderer-reported and device independent. The 55 draw calls are one per part plus the museum, the debris, the dust and the markers; the building is tiny in triangles (1,384) so cost is draw-call bound, and merging the parts that share a material state would cut it at the price of per-part erosion. The erosion is a fragment-shader discard, so overdraw rather than geometry is the thing to watch on a phone. Up to 420 fragments are updated on the CPU each frame during the intro and while parts crumble.

Degradation: the frame loop stops on a hidden tab; `?gfx=off` and context loss show the poster; reduced motion removes the iris and ambient motion; dpr is capped at 1.5. There is no automatic quality ladder.
