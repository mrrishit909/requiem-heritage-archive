# Blender asset contract

Source of truth: `model/parts.json` and `model/build.py` (deterministic). The model is an original fictional caravan house.

**site.glb** (89 KB, 1,384 triangles): root `Site`; four collection empties `Collection_Current`, `_Historical`, `_Structural`, `_Missing`; 39 named parts beneath them, each one mesh whose geometry is in world coordinates (node origin at 0) so bounding boxes and fragments need no transform. Metres; Blender Z-up becomes glTF Y-up with north at -Z.

| Collection | Meaning | Examples |
|---|---|---|
| Current | Fabric that survives today, and the rubble that appeared when parts fell | walls, towers' lower bodies, columns 1-4 and 7-8, the vault remnant, three rubble heaps |
| Historical | Original finishes | painted hall plaster, gate relief, tile frieze, gate parapet |
| Structural | Load-bearing skeleton | foundation, gate arch ring, colonnade beam, hall roof beams |
| Missing | Components lost entirely, with their lost year | tower tops, columns 5 and 6, the vault, the gate door |

**manifest.json**: each part's measured bounding box in glTF axes; used for archive anchors, intro fragments and as a cross-check (the validator compares it with the re-imported dimensions).

**Time rules enforced by `validate.py`:** a Missing part has a lost year; a part that is lost has damage 1; nothing is lost before it is built; nothing is built outside 1790-2026; a part that is never lost has damage below 1.

**Validation:** all 39 parts and 5 empties present, each under its collection, nothing unparented, manifest matches geometry, under 60,000 triangles and 900 KB. Last run: VALIDATION OK.

**Known limits.** Blocky primitives with no UVs or textures: the stone, the cracks and the weathering are shaders. The arch is a single extruded ring. The towers and vault are simple. A real record would be photogrammetry; the adapter for it is described, not built.
