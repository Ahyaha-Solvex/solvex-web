"""The seven modules, grouped under C_<id>_root empties in the Components collection.

GSM, LoRa and the antenna are built here: the flattened board photo is the top surface
and the raised parts are real geometry placed from pixel coordinates on that photo.
Accelerometer, GPS, ESP32 and gyroscope come from supplied models.
Every root has its origin at the module centre, top face up, longest side 55 mm on X.
Re-running replaces only the Components collection.
"""
import math
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = r"E:\Project\SOLVEX\blender"
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.modules.pop("kit", None)
from kit import Kit, circle, lathe, rounded_rect  # noqa: E402

SENSORS = r"E:\Project\SOLVEX\assets\3d\sensors"
CONFIG = {
    "size": 55.0,
    "antenna_mount_scale": 1.55,
    "imports": {
        "accelerometer": SENSORS + r"\Accelerometer.glb",
        "gps": SENSORS + r"\Gps.glb",
        "esp32": SENSORS + r"\esp32.glb",
        "gyroscope": ROOT + r"\converted\gyroscope.glb",
    },
}
C = CONFIG
BOARD_BLUE = (0.0, 0.035, 0.34)

scene = bpy.context.scene
coll = bpy.data.collections.get("Components")
if coll is None:
    coll = bpy.data.collections.new("Components")
    scene.collection.children.link(coll)


# ---------------------------------------------------------------- materials
def principled(name, color, metallic=0.0, rough=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    return m


def photo_mat(name, path, metallic, rough, bump, coat):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path, check_existing=True)
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    gray = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(tex.outputs["Color"], gray.inputs[0])
    bu = nt.nodes.new("ShaderNodeBump")
    bu.inputs["Strength"].default_value = bump
    bu.inputs["Distance"].default_value = 0.06
    nt.links.new(gray.outputs[0], bu.inputs["Height"])
    nt.links.new(bu.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Coat Roughness"].default_value = 0.25
    return m


def shared():
    return {
        "edge": principled("C_FR4Edge", (0.015, 0.03, 0.10), rough=0.45),
        "bottom": principled("C_Solder", (0.01, 0.025, 0.11), rough=0.38),
        "gold": principled("C_Gold", (0.95, 0.68, 0.30), metallic=1.0, rough=0.26),
        "black": principled("C_Epoxy", (0.012, 0.012, 0.012), rough=0.42),
        "tan": principled("C_Ceramic", (0.42, 0.30, 0.20), rough=0.4),
        "silver": principled("C_Tin", (0.8, 0.8, 0.8), metallic=1.0, rough=0.3),
        "ivory": principled("C_Ivory", (0.75, 0.70, 0.58), rough=0.45),
        "yellow": principled("C_Tantalum", (0.72, 0.42, 0.06), rough=0.4),
        "rubber": principled("C_AntennaRubber", (0.012, 0.012, 0.013), rough=0.55),
        "gunmetal": principled("C_AntennaMetal", (0.05, 0.05, 0.055), metallic=1.0, rough=0.34),
    }


ORDER = ("photo", "metal", "edge", "bottom", "gold", "black", "tan", "silver", "ivory", "yellow")
IDX = {k: i for i, k in enumerate(ORDER)}


# ---------------------------------------------------------------- boards
class Board(Kit):
    def __init__(self, tex_w, tex_h, mm_w, mm_h):
        super().__init__()
        self.tw, self.th, self.mw, self.mh = tex_w, tex_h, mm_w, mm_h

    def x(self, px):
        return (px / self.tw - 0.5) * self.mw

    def y(self, py):
        return (0.5 - py / self.th) * self.mh

    def mm(self, px):
        return px * self.mw / self.tw

    def outline(self, corner, holes, thickness=1.6):
        """holes: (px, py, r_px). Top surface carries the photo."""
        hx, hy = self.mw / 2, self.mh / 2
        out = rounded_rect(hx, hy, corner, 8)
        low = self.ring(out, -thickness)
        high = self.ring(out, 0.0)
        self.bridge(low, high, IDX["edge"])
        tops, bottoms = [], []
        for px, py, r in holes:
            pts = circle(self.x(px), self.y(py), self.mm(r), 24)
            top = self.ring(pts, 0.0)
            bot = self.ring(pts, -thickness)
            self.bridge(top, bot, IDX["gold"])
            tops.append(top)
            bottoms.append(bot)
        self.cap([high] + tops, IDX["photo"])
        self.cap([low] + bottoms, IDX["bottom"])

    def box(self, x0, y0, x1, y1, h, side, top="photo", z0=0.0, r=0.14, bevel=0.1):
        """Raised part over a pixel rectangle. Its top keeps the photo at the same place."""
        cx, cy = self.x((x0 + x1) / 2), self.y((y0 + y1) / 2)
        hx, hy = self.mm(x1 - x0) / 2, self.mm(y1 - y0) / 2
        r = min(r, hx * 0.9, hy * 0.9)
        b = min(bevel, r * 0.8, h * 0.4)

        def rr(d):
            pts = rounded_rect(hx - d, hy - d, r - d, 3)
            return [(px + cx, py + cy) for px, py in pts]

        rings = [self.ring(rr(0), z0), self.ring(rr(0), z0 + h - b), self.ring(rr(b), z0 + h)]
        self.bridge(rings[0], rings[1], IDX[side])
        self.bridge(rings[1], rings[2], IDX[side])
        self.cap([rings[-1]], IDX[top])
        self.cap([rings[0]], IDX[side])

    def prism(self, pts_px, h, side, top="photo", z0=0.0):
        pts = [(self.x(px), self.y(py)) for px, py in pts_px]
        low, high = self.ring(pts, z0), self.ring(pts, z0 + h)
        self.bridge(low, high, IDX[side])
        self.cap([high], IDX[top])
        self.cap([low], IDX[side])

    def round_part(self, px, py, profile, mat):
        """profile: (r_mm, z). Lathe at a pixel position."""
        cx, cy = self.x(px), self.y(py)
        rings = [self.ring(circle(cx, cy, r, 24), z) for r, z in profile]
        for a, b in zip(rings, rings[1:]):
            self.bridge(a, b, IDX[mat])
        self.cap([rings[0]], IDX[mat])
        self.cap([rings[-1]], IDX[mat])

    def to_object(self, name, mats):
        ob = self.finish(name, [mats[k] for k in ORDER])
        me = ob.data
        uv = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                uv.data[li].uv = (co.x / self.mw + 0.5, co.y / self.mh + 0.5)
        return ob


def board_mats(key, S):
    path = ROOT + "\\textures\\" + key + ".jpg"
    return {
        **S,
        "photo": photo_mat("C_Photo_" + key, path, 0.0, 0.42, 0.22, 0.35),
        "metal": photo_mat("C_PhotoMetal_" + key, path, 0.85, 0.36, 0.08, 0.0),
    }


def build_gsm(S):
    b = Board(1600, 1100, 40.0, 27.5)
    pads = [(1540, y, 22) for y in (320, 425, 530, 635, 740, 840, 940)]
    b.outline(0.6, [(132, 112, 94), (1490, 100, 94), (135, 990, 94)] + pads)
    # SIM800L module: castellated carrier, then the labelled can.
    b.box(388, 382, 1124, 1044, 0.9, "gold", r=0.2)
    b.box(402, 396, 1112, 1030, 1.7, "silver", z0=0.9, r=0.3, bevel=0.14)
    # Tantalum capacitor and its tin terminals.
    b.box(226, 338, 354, 364, 0.35, "silver", top="silver")
    b.box(226, 660, 354, 690, 0.35, "silver", top="silver")
    b.box(200, 362, 372, 662, 1.9, "yellow", r=0.3, bevel=0.22)
    # Schottky diode.
    b.box(1052, 92, 1082, 168, 0.3, "silver", top="silver")
    b.box(1256, 92, 1286, 168, 0.3, "silver", top="silver")
    b.box(1075, 62, 1262, 196, 1.6, "black", r=0.2, bevel=0.14)
    # U.FL socket.
    b.box(496, 76, 604, 180, 0.45, "ivory")
    b.round_part(548, 126, [(0.75, 0.45), (0.75, 1.15), (0.58, 1.2), (0.5, 1.2)], "gold")
    # 0603 parts: resistors are dark, LEDs pale, capacitors tan.
    for r in ((678, 86, 722, 166), (845, 86, 890, 166)):
        b.box(*r, 0.5, "black")
    for r in ((762, 86, 802, 166), (928, 86, 968, 166)):
        b.box(*r, 0.55, "ivory")
    for r in ((52, 358, 92, 430), (132, 358, 172, 430), (52, 555, 92, 628), (135, 555, 175, 628)):
        b.box(*r, 0.6, "tan")
    for r in (
        (70, 745, 165, 778), (1155, 322, 1255, 358), (1305, 322, 1400, 358), (1155, 435, 1255, 470),
        (1305, 435, 1400, 470), (1160, 688, 1260, 722), (1312, 688, 1410, 722),
    ):
        b.box(*r, 0.5, "black")
    # Transistors and the large ceramic.
    b.box(1150, 538, 1272, 602, 0.95, "black", r=0.1)
    b.box(1295, 538, 1417, 602, 0.95, "black", r=0.1)
    b.box(1205, 842, 1355, 906, 1.0, "tan", r=0.1)
    return b.to_object("C_gsm", board_mats("gsm", S))


def build_lora(S):
    b = Board(1000, 2112, 30.0, 65.0)
    holes = [(125, 100, 52), (875, 100, 52), (125, 2012, 52), (875, 2012, 52)]
    for i in range(20):
        y = 272 + i * 82.4
        holes += [(828, y, 21), (910, y, 21)]
    for i in range(14):
        holes.append((44, 702 + i * 80.5, 19))
    b.outline(3.0, holes)
    # SX1262 shield can with its notched corner.
    b.prism([(250, 250), (494, 250), (494, 410), (673, 410), (673, 903), (250, 903)], 2.6, "silver", top="metal")
    # L76K GNSS module on a thin carrier.
    b.box(262, 1320, 564, 1624, 0.6, "edge", r=0.2)
    b.box(272, 1328, 554, 1614, 1.5, "silver", top="metal", z0=0.6, r=0.25, bevel=0.1)
    # Regulator with its three legs, and the crystal.
    for x in (446, 516, 585):
        b.box(x, 1030, x + 38, 1106, 0.3, "silver", top="silver")
    b.box(425, 1104, 647, 1214, 1.6, "black", r=0.1)
    b.box(476, 1220, 590, 1288, 1.0, "silver", top="metal", r=0.4, bevel=0.25)
    # Antenna sockets.
    for x in (322, 676):
        b.round_part(x, 87, [(0.9, 0.0), (0.9, 0.5), (0.75, 0.5), (0.75, 1.15), (0.5, 1.15)], "gold")
    # SET button and the slide switch.
    b.box(227, 1975, 438, 2096, 1.8, "black", r=0.2)
    for x in (515, 580, 648):
        b.box(x, 1895, x + 32, 1950, 0.3, "silver", top="silver")
    b.box(486, 1948, 776, 2090, 2.2, "black", r=0.2)
    b.box(612, 2008, 740, 2040, 0.5, "silver", top="silver", z0=2.2, r=0.1)
    # Status LEDs.
    for y in (302, 397, 485, 560):
        b.box(25, y, 105, y + 40, 0.5, "ivory")
    # 0603 parts.
    for x0, x1 in ((216, 301), (317, 401), (419, 507), (523, 607), (623, 707)):
        b.box(x0, 963, x1, 1001, 0.55, "tan")
    for r in (
        (665, 1035, 710, 1115), (665, 1130, 710, 1210), (665, 1270, 710, 1340), (665, 1385, 710, 1460),
        (665, 1490, 710, 1565), (665, 1585, 710, 1640), (295, 1030, 335, 1105), (365, 1030, 410, 1115),
        (220, 1140, 265, 1178), (320, 1140, 395, 1178), (225, 1210, 295, 1250), (325, 1215, 400, 1255),
        (225, 1270, 295, 1305), (325, 1270, 400, 1305),
    ):
        b.box(*r, 0.5, "tan")
    for x in (222, 292, 362, 432):
        b.box(x, 1690, x + 40, 1760, 0.5, "black")
        b.box(x, 1800, x + 40, 1870, 0.5, "black")
    b.box(612, 1730, 702, 1785, 0.9, "black", r=0.1)
    b.box(517, 1690, 575, 1716, 0.7, "black", r=0.1)
    b.box(517, 1800, 575, 1826, 0.7, "black", r=0.1)
    return b.to_object("C_lora", board_mats("lora", S))


def build_antenna(S):
    """Rubber stub with a gold right-angle SMA, lying along X."""
    rubber = lathe(
        "C_antenna_rubber",
        [
            (0.02, 0.0), (1.2, 0.12), (2.2, 0.8), (2.9, 2.0), (3.4, 5.0), (4.3, 18.0), (4.75, 27.0),
            (4.85, 29.0), (4.4, 30.2), (3.25, 31.0), (3.2, 34.6), (3.4, 34.8), (3.4, 35.8), (3.2, 36.0),
            (3.1, 37.6), (3.0, 38.5),
        ],
        [S["rubber"]],
    )
    collar = lathe(
        "C_antenna_collar",
        [(2.6, 38.2), (3.7, 38.3), (3.8, 38.6), (3.8, 39.6), (3.7, 39.8), (3.0, 39.9)],
        [S["gunmetal"]],
    )
    body = lathe(
        "C_antenna_elbow",
        [(4.9, 39.7), (5.0, 39.9), (5.0, 47.3), (4.9, 47.5)],
        [S["gunmetal"]],
        seg=4,
    )
    body.rotation_euler.z = math.pi / 4
    sma = lathe(
        "C_antenna_sma",
        [(3.5, 3.5), (3.5, 5.2), (3.9, 5.3), (3.9, 6.4), (3.4, 6.5)],
        [S["gunmetal"]],
    )
    nut = lathe(
        "C_antenna_nut",
        [(4.5, 6.4), (5.1, 6.7), (5.1, 10.6), (4.5, 10.9), (3.2, 10.9), (3.1, 8.5)],
        [S["gunmetal"]],
        seg=6,
    )
    pin = lathe("C_antenna_pin", [(1.05, 8.3), (1.05, 9.8), (0.8, 10.2)], [S["gold"]], seg=16)
    for ob in (sma, nut, pin):
        ob.location = (0, 0, 43.6)
        ob.rotation_euler = (0, math.pi / 2, 0)
    group = bpy.data.objects.new("C_antenna", None)
    scene.collection.objects.link(group)
    for ob in (rubber, collar, body, sma, nut, pin):
        ob.parent = group
    group.rotation_euler = (0, math.pi / 2, 0)
    return group


# ---------------------------------------------------------------- normalize
def meshes_under(ob):
    found = [ob] if ob.type == "MESH" else []
    for child in ob.children_recursive:
        if child.type == "MESH":
            found.append(child)
    return found


def bounds(obs):
    bpy.context.view_layer.update()
    lo, hi = Vector((1e9, 1e9, 1e9)), Vector((-1e9, -1e9, -1e9))
    for ob in obs:
        mw = ob.matrix_world
        for corner in ob.bound_box:
            w = mw @ Vector(corner)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def make_root(key, tops):
    """Parent tops to a root so the module is flat, long side on X, centred, 55 mm long."""
    root = bpy.data.objects.new("C_%s_root" % key, None)
    scene.collection.objects.link(root)
    for top in tops:
        top.parent = root
    obs = [m for t in tops for m in meshes_under(t)]
    lo, hi = bounds(obs)
    d = hi - lo
    if d.x < d.y and d.x < d.z:       # thin axis is X
        root.matrix_world = Matrix.Rotation(math.pi / 2, 4, "Y")
    elif d.y < d.x and d.y < d.z:     # thin axis is Y
        root.matrix_world = Matrix.Rotation(math.pi / 2, 4, "X")
    lo, hi = bounds(obs)
    d = hi - lo
    if d.y > d.x:
        root.matrix_world = Matrix.Rotation(-math.pi / 2, 4, "Z") @ root.matrix_world
    lo, hi = bounds(obs)
    d = hi - lo
    root.matrix_world = Matrix.Scale(C["size"] / max(d.x, d.y), 4) @ root.matrix_world
    lo, hi = bounds(obs)
    root.matrix_world = Matrix.Translation(-(lo + hi) / 2) @ root.matrix_world
    return root


def polish_gyroscope(root):
    """The STEP gives the board top a light color (its print was a CAD decal): make it solder mask."""
    ob = next(o for o in root.children_recursive if o.type == "MESH")
    me = ob.data
    names = [m.name for m in me.materials]
    mask, gold = names.index("mat_4"), names.index("mat_3")
    light = {names.index("mat_2"), names.index("mat_5")}
    rot = ob.matrix_world.to_3x3()
    areas = {}
    for poly in me.polygons:
        if poly.material_index in light and (rot @ poly.normal).normalized().z > 0.9:
            key = (poly.material_index, round((ob.matrix_world @ poly.center).z, 2))
            areas[key] = areas.get(key, 0.0) + poly.area
    index, plane = max(areas, key=areas.get)
    for poly in me.polygons:
        if poly.material_index == index and abs((ob.matrix_world @ poly.center).z - plane) < 0.03:
            poly.material_index = mask
    for slot, color, metallic, rough in ((mask, BOARD_BLUE, 0.0, 0.36), (gold, (0.95, 0.68, 0.30), 1.0, 0.27)):
        node = me.materials[slot].node_tree.nodes["Principled BSDF"]
        node.inputs["Base Color"].default_value = (*color, 1)
        node.inputs["Metallic"].default_value = metallic
        node.inputs["Roughness"].default_value = rough


def polish_accelerometer(root, S):
    """Tall white blocks become ceramic parts; flat white stays as silkscreen. Blue matches the set."""
    for ob in root.children_recursive:
        if ob.type != "MESH":
            continue
        me = ob.data
        for mat in me.materials:
            if mat and mat.name.startswith("Blue"):
                node = mat.node_tree.nodes["Principled BSDF"]
                node.inputs["Base Color"].default_value = (*BOARD_BLUE, 1)
        slots = [i for i, m in enumerate(me.materials) if m and m.name.startswith("White")]
        if not slots:
            continue
        me.materials.append(S["tan"])
        tan = len(me.materials) - 1
        bm = bmesh.new()
        bm.from_mesh(me)
        seen = set()
        for face in bm.faces:
            if face in seen or face.material_index not in slots:
                continue
            island, stack = [], [face]
            seen.add(face)
            while stack:
                f = stack.pop()
                island.append(f)
                for e in f.edges:
                    for g in e.link_faces:
                        if g not in seen and g.material_index in slots:
                            seen.add(g)
                            stack.append(g)
            zs = [(ob.matrix_world @ v.co).z for f in island for v in f.verts]
            if max(zs) - min(zs) > 0.8:
                for f in island:
                    f.material_index = tan
        bm.to_mesh(me)
        bm.free()


def mount_antenna(root):
    """Screw the antenna onto the box connector; it stays with the body from here on."""
    base = bpy.data.objects["BB_Base"]
    box = bpy.data.objects["BB_ConnectorRoot"].matrix_world.translation
    size = C["antenna_mount_scale"]
    # Connector thread along box +X, rubber lying along the short wall towards +Y.
    turn = Matrix(((0, 1, 0, 0), (-1, 0, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1)))
    local = turn @ Matrix.Scale(size, 4) @ root.matrix_world
    root.matrix_world = local
    nut = bpy.data.objects["C_antenna_nut"]
    lo, hi = bounds([nut])
    mouth = Vector((hi.x, (lo.y + hi.y) / 2, (lo.z + hi.z) / 2))
    # Barrel end sits 14 mm off the wall; the nut covers its last 6 mm.
    wanted = Vector((box.x - 14.0 + 6.0, box.y, box.z))
    root.matrix_world = Matrix.Translation(wanted - mouth) @ local
    world = root.matrix_world.copy()
    root.parent = base
    root.matrix_parent_inverse = base.matrix_world.inverted()
    root.matrix_world = world


def to_collection(ob):
    for item in [ob] + list(ob.children_recursive):
        for c in list(item.users_collection):
            c.objects.unlink(item)
        coll.objects.link(item)


def import_model(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before and o.parent is None]


def clear():
    for ob in list(coll.objects):
        bpy.data.objects.remove(ob)
    for me in [m for m in bpy.data.meshes if m.users == 0]:
        bpy.data.meshes.remove(me)
    for m in [m for m in bpy.data.materials if m.users == 0]:
        bpy.data.materials.remove(m)


def main():
    clear()
    S = shared()
    roots = {}
    for key, builder in (("gsm", build_gsm), ("lora", build_lora), ("antenna", build_antenna)):
        roots[key] = make_root(key, [builder(S)])
    for key, path in C["imports"].items():
        roots[key] = make_root(key, import_model(path))
    mount_antenna(roots["antenna"])
    polish_gyroscope(roots["gyroscope"])
    polish_accelerometer(roots["accelerometer"], S)
    report = {}
    for key, root in roots.items():
        to_collection(root)
        lo, hi = bounds(meshes_under(root))
        report[key] = [round(v, 1) for v in hi - lo]
    bpy.ops.wm.save_mainfile()
    return report


result = main()
