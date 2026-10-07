"""Fresh-scene re-import of exports/site.glb checked against parts.json and manifest.json. Exit 1 on failure."""
import bpy, os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json"))); MAN = json.load(open(os.path.join(HERE, "exports", "manifest.json")))
bpy.ops.wm.read_factory_settings(use_empty=True); path = os.path.join(HERE, "exports", "site.glb"); bpy.ops.import_scene.gltf(filepath=path)
objs = {o.name.split(".")[0]: o for o in bpy.data.objects}
names = [p["name"] for p in P["parts"]]; missing = [n for n in names + ["Site", "Collection_Current", "Collection_Historical", "Collection_Structural", "Collection_Missing"] if n not in objs]
wrong_parent = [p["name"] for p in P["parts"] if p["name"] in objs and (objs[p["name"]].parent is None or objs[p["name"]].parent.name.split(".")[0] != "Collection_" + p["collection"])]
orphans = [o.name for o in bpy.data.objects if o.parent is None and o.name.split(".")[0] != "Site"]
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == "MESH"); size = os.path.getsize(path)
# time rules in the contract
bad = []
for p in P["parts"]:
    if p["collection"] == "Missing" and p["lost"] is None: bad.append(f"{p['name']}: a Missing part needs a lost year")
    if p["lost"] is not None and p["lost"] <= p["built"]: bad.append(f"{p['name']}: lost before built")
    if p["lost"] is None and p["damage2026"] >= 1.0: bad.append(f"{p['name']}: fully damaged but never lost")
    if p["lost"] is not None and p["damage2026"] != 1.0: bad.append(f"{p['name']}: lost parts must have damage2026 = 1")
    if not (P["years"][0] <= p["built"] <= P["years"][1]): bad.append(f"{p['name']}: built outside the timeline")
# the manifest must agree with the re-imported geometry (x,y,z in glTF terms = blender x, z, -y after import conversion is undone by the importer, so compare sizes)
size_bad = []
for n, m in MAN.items():
    if n in objs and objs[n].type == "MESH":
        d = objs[n].dimensions; sz = sorted([m["max"][i] - m["min"][i] for i in range(3)]); got = sorted([d.x, d.y, d.z])
        if any(abs(a - b) > 0.02 + 0.02 * b for a, b in zip(sz, got)): size_bad.append(f"{n}: manifest {sz} vs imported {[round(g, 3) for g in got]}")
rep = {"tris": tris, "bytes": size, "parts": len(names), "missing": missing, "wrongParent": wrong_parent, "orphans": orphans, "contractProblems": bad, "manifestMismatch": size_bad}
json.dump(rep, open(os.path.join(HERE, "exports", "validation.json"), "w"), indent=1); print(json.dumps(rep, indent=1))
fail = []
if missing: fail.append(f"missing {missing}")
if wrong_parent: fail.append(f"wrong collection {wrong_parent}")
if orphans: fail.append(f"unparented {orphans}")
if bad: fail.append("; ".join(bad[:4]))
if size_bad: fail.append("; ".join(size_bad[:3]))
if tris > P["budget"]["tris"]: fail.append(f"{tris} tris over budget")
if size > P["budget"]["bytes"]: fail.append(f"{size} bytes over budget")
if fail: print("VALIDATION FAILED:", fail); sys.exit(1)
print("VALIDATION OK")
