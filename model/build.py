"""REQUIEM flagship: Orisk Caravan House (a fictional caravanserai). Deterministic. Run: Blender -b -P model/build.py
Units: metres. Blender Z is up, Y north; glTF turns that into Y-up with north at -Z. Every part named in parts.json becomes one named node under its collection empty
(Collection_Current / _Historical / _Structural / _Missing). Also writes exports/manifest.json (each part's measured bounding box in glTF axes), renders/poster.png, source.blend."""
import bpy, bmesh, math, os, json
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json")))
os.makedirs(os.path.join(HERE, "exports"), exist_ok=True); os.makedirs(os.path.join(HERE, "renders"), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
META = {p["name"]: p for p in P["parts"]}

def mat(name, color, rough=0.9):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; return m
M = {"stone": mat("StoneMat", (0.40, 0.38, 0.33)), "plaster": mat("PlasterMat", (0.8, 0.74, 0.6)), "timber": mat("TimberMat", (0.3, 0.16, 0.09), 0.7), "tile": mat("TileMat", (0.58, 0.36, 0.26), 0.5), "ground": mat("GroundMat", (0.55, 0.52, 0.45))}
COL = {c: bpy.data.objects.new("Collection_" + c, None) for c in ("Current", "Historical", "Structural", "Missing")}
root = bpy.data.objects.new("Site", None); scene.collection.objects.link(root)
for o in COL.values(): scene.collection.objects.link(o); o.parent = root

def add(name, bm, loc=(0, 0, 0), rot=(0, 0, 0)):
    m = META[name]; bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); o.location = loc; o.rotation_euler = rot; o.data.materials.append(M[m["material"]]); o.parent = COL[m["collection"]]; return o
def box(x0, x1, y0, y1, z0, z1):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = ((x1 - x0) * (v.co.x + 0.5) + x0, (y1 - y0) * (v.co.y + 0.5) + y0, (z1 - z0) * (v.co.z + 0.5) + z0)
    return bm
def cyl(r, z0, z1, n=14, cx=0, cy=0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=r, radius2=r * 0.92, depth=z1 - z0)
    for v in bm.verts: v.co += Vector((cx, cy, (z0 + z1) / 2))
    return bm
def poly_x(pts_yz, x0, x1):
    """Extrude a (y,z) polygon along x."""
    bm = bmesh.new(); a = [bm.verts.new((x0, y, z)) for y, z in pts_yz]; b = [bm.verts.new((x1, y, z)) for y, z in pts_yz]; n = len(a)
    bm.faces.new(a[::-1]); bm.faces.new(b)
    for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    return bm
def poly_y(pts_xz, y0, y1):
    bm = bmesh.new(); a = [bm.verts.new((x, y0, z)) for x, z in pts_xz]; b = [bm.verts.new((x, y1, z)) for x, z in pts_xz]; n = len(a)
    bm.faces.new(a); bm.faces.new(b[::-1])
    for i in range(n): bm.faces.new((a[(i + 1) % n], a[i], b[i], b[(i + 1) % n]))
    return bm
def arc(cx, cz, r, a0, a1, n=12): return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cz + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
def pyramid(cx, cy, hw, z0, z1):
    bm = bmesh.new(); b = [bm.verts.new((cx + sx * hw, cy + sy * hw, z0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]; t = bm.verts.new((cx, cy, z1)); bm.faces.new(b[::-1])
    for i in range(4): bm.faces.new((b[i], b[(i + 1) % 4], t))
    return bm

W = 14.2; H = 5.0
add("Foundation", box(-W - 0.2, W + 0.2, -11.4, 11.4, -1.2, -0.3)); add("Courtyard_Floor", box(-13, 13, -10, 10, -0.3, 0.0))
add("Wall_N", box(-W, W, 10, 11.2, 0, H)); add("Wall_E", box(13, W, -10, 10, 0, H)); add("Wall_W", box(-W, -13, -10, 10, 0, H)); add("Wall_S_W", box(-W, -4, -11.2, -10, 0, H)); add("Wall_S_E", box(4, W, -11.2, -10, 0, H))
# gatehouse: piers, a spandrel polygon with an arched opening, the arch ring, door
add("Gate_PierL", box(-4, -1.6, -12, -9, 0, 3.2)); add("Gate_PierR", box(1.6, 4, -12, -9, 0, 3.2))
sp = [(-4, 3.2), (-1.6, 3.2)] + arc(0, 3.2, 1.6, math.pi, 0, 14)[1:] + [(4, 3.2), (4, 8), (-4, 8)]
add("Gate_Spandrel", poly_y(sp, -12, -9))
outer = arc(0, 3.2, 1.95, math.pi, 0, 14); inner = arc(0, 3.2, 1.6, 0, math.pi, 14); add("Gate_Arch", poly_y(outer + inner, -12.15, -8.85))
add("Gate_Door", box(-1.55, 1.55, -10.7, -10.4, 0, 3.2)); add("Gate_Parapet", box(-4.2, 4.2, -12.15, -8.85, 8, 8.9)); add("Gate_Ornament", box(-1.4, 1.4, -12.12, -12.0, 5.3, 7.4)); add("Tiles_Gate", box(-3.8, 3.8, -12.1, -12.0, 4.6, 5.0))
# towers
add("Tower_NE", box(11, 14.4, 8.2, 11.6, 0, 9)); add("Tower_NE_Top", pyramid(12.7, 9.9, 2.1, 9, 12.6)); add("Tower_SW", box(-14.4, -11, -11.6, -8.2, 0, 8)); add("Tower_SW_Top", pyramid(-12.7, -9.9, 2.1, 8, 11))
# hall (north range): back wall, side walls, colonnade, beams, vault in two pieces
add("Hall_Wall_Back", box(-10, 10, 9, 9.9, 0, 6.2)); add("Hall_Wall_L", box(-10, -9.2, 4, 9, 0, 6.2)); add("Hall_Wall_R", box(9.2, 10, 4, 9, 0, 6.2)); add("Plaster_Hall", box(-9.2, 9.2, 8.9, 9.0, 0.6, 5.2))
for i in range(8): add(f"Col_{i + 1}", cyl(0.38, 0, 4.8, 14, -8.4 + i * 2.4, 4.2))
add("Colonnade_Beam", box(-9.3, 9.3, 3.8, 4.6, 4.8, 5.5))
vault_prof = [(4, 6.2)] + arc(6.5, 6.2, 2.5, math.pi, 0, 14)[1:-1] + [(9, 6.2), (9, 5.9)] + arc(6.5, 6.2, 2.2, 0, math.pi, 14)[1:-1] + [(4, 5.9)]
pv = [(y, z) for y, z in vault_prof]                      # (y, z) profile along the hall's width, extruded along x
add("Hall_Vault", poly_x([(4.0 + (y - 4) , z) for y, z in vault_prof], -9.2, 3.3)); add("Hall_Vault_Remnant", poly_x([(4.0 + (y - 4), z) for y, z in vault_prof], 3.3, 9.2))
add("Hall_Beams", box(-9.2, 9.2, 4.2, 8.8, 5.4, 5.7))
add("Well", cyl(0.9, 0, 0.9, 12, 0, -3))
for nm, cx, cy in (("Rubble_Tower_SW", -9.6, -7), ("Rubble_Tower_NE", 9.4, 6.4), ("Rubble_Vault", -3, 6.5)):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.5)
    for v in bm.verts: v.co = Vector((v.co.x * 1.6, v.co.y * 1.2, abs(v.co.z) * 0.6)) + Vector((cx, cy, 0))
    add(nm, bm)
miss = [p["name"] for p in P["parts"] if p["name"] not in bpy.data.objects]
if miss: raise SystemExit(f"build.py does not model: {miss}")

# manifest: measured bounding boxes in glTF axes (x, z, -y)
man = {}
for p in P["parts"]:
    o = bpy.data.objects[p["name"]]; vs = [o.matrix_world @ Vector(c) for c in o.bound_box]; lo = [min(v[i] for v in vs) for i in range(3)]; hi = [max(v[i] for v in vs) for i in range(3)]
    g = lambda v: (v[0], v[2], -v[1]); a, b = g(lo), g(hi); man[p["name"]] = {"min": [round(min(a[i], b[i]), 3) for i in range(3)], "max": [round(max(a[i], b[i]), 3) for i in range(3)]}
json.dump(man, open(os.path.join(HERE, "exports", "manifest.json"), "w"), indent=0)

bpy.ops.object.camera_add(location=(24, -34, 15)); cam = bpy.context.active_object; scene.camera = cam; cam.data.lens = 38; cam.rotation_euler = (Vector((0, 0, 3.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
for name, loc, e, col in (("Key", (-18, -28, 22), 9000, (1.0, 0.92, 0.78)), ("Rim", (26, 14, 14), 5000, (0.7, 0.75, 0.9))):
    bpy.ops.object.light_add(type="POINT", location=loc); l = bpy.context.active_object; l.name = name; l.data.energy = e; l.data.color = col
world = bpy.data.worlds.new("Charcoal"); scene.world = world; world.use_nodes = True; world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.02, 0.02, 1)
for o in bpy.data.objects:
    if o.name in ("Hall_Vault", "Tower_NE_Top", "Tower_SW_Top", "Col_5", "Col_6", "Gate_Door", "Hall_Beams"): o.hide_render = True   # the poster shows the building as it stands today
scene.render.engine = "BLENDER_EEVEE_NEXT"; scene.render.resolution_x, scene.render.resolution_y = 1280, 720; scene.render.filepath = os.path.join(HERE, "renders", "poster.png")
bpy.ops.object.select_all(action="DESELECT")
def pick(o):
    o.select_set(True)
    for c in o.children: pick(c)
pick(root)
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "exports", "site.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "source.blend"))
try: bpy.ops.render.render(write_still=True)
except Exception as e: print("poster failed", e)
print("BUILD OK")
