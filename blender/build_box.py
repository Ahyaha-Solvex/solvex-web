"""SolveX blackbox: enclosure, materials and studio. Re-running rebuilds everything.

1 Blender unit = 1 mm. Box plan is X x Y (long side on X), bottom at Z = 0.
Rounded outlines are generated analytically so every loft ring has the same
vertex count, which keeps bevels as real geometry instead of a Bevel modifier.
"""
import math
import sys

import bpy
from mathutils import Vector

ROOT = r"E:\Project\SOLVEX\blender"
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.modules.pop("kit", None)
from kit import SEG, Kit, arc, circle, lathe, rounded_rect  # noqa: E402

CONFIG = {
    "out_blend": r"E:\Project\SOLVEX\blender\solvex_blackbox.blend",
    # Body
    "hx": 70.0,
    "hy": 45.0,
    "corner_r": 5.5,
    "z_part": 24.0,      # parting line between base and lid
    "z_flange": 34.4,   # lid flange plane
    "z_top": 35.0,       # raised panel plane
    "seam": 0.10,        # half gap at the parting line
    # Lid panel outline, notched around the four screws
    "screw": (63.4, 38.4),
    "panel_hx": 67.3,
    "panel_hy": 42.3,
    "notch_r": 4.9,
    "notch_f": 1.3,
    "chamfer": 0.6,
    # Screws
    "bore_r": 3.5,
    "bore_depth": 2.2,
    "head_r": 3.05,
    "shaft_r": 1.5,
    "shaft_hole_r": 1.75,
    "shaft_len": 14.0,
    # Base cavity
    "cavity_floor": 3.2,
    "ledge_drop": 2.2,
    "base_hole_r": 1.9,
    "base_hole_depth": 9.0,
    # Connector on the -X wall
    "conn_y": 0.0,
    "conn_z": 12.5,
    # LEDs, (x, y) on the panel
    "leds": {
        "green": ((-53.4, 30.5), (0.03, 0.40, 0.10), 1.4),
        "amber": ((-45.7, 30.5), (0.80, 0.27, 0.015), 0.45),
        "white": ((-37.7, 30.5), (0.66, 0.62, 0.52), 0.22),
    },
}
C = CONFIG


# ---------------------------------------------------------------- outlines
def notched_rect(hx, hy, R, f, seg=SEG):
    """Rectangle whose corners are scooped by a circle around each screw."""
    sx, sy = C["screw"]
    # Fillet touching the right edge and the scoop.
    rx, ry = hx - f, sy - math.sqrt((R + f) ** 2 - (hx - f - sx) ** 2)
    a1 = math.atan2(sy - ry, sx - rx)
    # Fillet touching the top edge and the scoop.
    tx, ty = sx - math.sqrt((R + f) ** 2 - (hy - f - sy) ** 2), hy - f
    a2 = math.atan2(sy - ty, sx - tx)
    s0 = a1 - math.pi
    s1 = a2 + math.pi
    while s1 > s0:
        s1 -= 2 * math.pi
    q = arc(rx, ry, f, 0.0, a1, seg, end=False)
    q += arc(sx, sy, R, s0, s1, seg * 2, end=False)
    q += arc(tx, ty, f, a2, math.pi / 2, seg)
    return (
        q
        + [(-x, y) for x, y in reversed(q)]
        + [(-x, -y) for x, y in q]
        + [(x, -y) for x, y in reversed(q)]
    )


def screw_centers():
    sx, sy = C["screw"]
    return [(sx, sy), (-sx, sy), (-sx, -sy), (sx, -sy)]


# ---------------------------------------------------------------- materials
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes["Principled BSDF"]


def grain(nt, bsdf, fine_scale, fine_strength, rough, rough_var, color):
    """Bead-blast micro texture plus a slow roughness drift so no surface is CG-perfect."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = fine_scale
    fine.inputs["Detail"].default_value = 4.0
    fine.inputs["Roughness"].default_value = 0.6
    nt.links.new(tc.outputs["Object"], fine.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = fine_strength
    bump.inputs["Distance"].default_value = 0.05
    nt.links.new(fine.outputs["Fac"], bump.inputs["Height"])
    speckle = nt.nodes.new("ShaderNodeValToRGB")
    speckle.color_ramp.elements[0].position = 0.36
    speckle.color_ramp.elements[0].color = (color * 0.45, color * 0.45, color * 0.47, 1)
    speckle.color_ramp.elements[1].position = 0.64
    speckle.color_ramp.elements[1].color = (color * 1.9, color * 1.9, color * 1.95, 1)
    nt.links.new(fine.outputs["Fac"], speckle.inputs["Fac"])
    nt.links.new(speckle.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    slow = nt.nodes.new("ShaderNodeTexNoise")
    slow.inputs["Scale"].default_value = 0.035
    slow.inputs["Detail"].default_value = 3.0
    nt.links.new(tc.outputs["Object"], slow.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = rough - rough_var
    ramp.inputs["To Max"].default_value = rough + rough_var
    ramp.inputs["From Min"].default_value = 0.3
    ramp.inputs["From Max"].default_value = 0.7
    nt.links.new(slow.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])


def build_materials():
    out = {}

    m, nt, b = new_mat("MAT_Blackbox")
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Specular IOR Level"].default_value = 0.42
    grain(nt, b, fine_scale=2.4, fine_strength=0.55, rough=0.5, rough_var=0.035, color=0.0075)
    out["anodized"] = m

    m, nt, b = new_mat("MAT_BlackboxSatin")
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Specular IOR Level"].default_value = 0.45
    grain(nt, b, fine_scale=3.5, fine_strength=0.16, rough=0.4, rough_var=0.03, color=0.0065)
    out["satin"] = m

    m, nt, b = new_mat("MAT_BlackboxInner")
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Specular IOR Level"].default_value = 0.35
    grain(nt, b, fine_scale=2.4, fine_strength=0.3, rough=0.55, rough_var=0.04, color=0.004)
    out["inner"] = m

    m, nt, b = new_mat("MAT_MachinedEdge")
    b.inputs["Base Color"].default_value = (0.58, 0.58, 0.57, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    b.inputs["Emission Strength"].default_value = 0.04
    out["edge"] = m

    m, nt, b = new_mat("MAT_ScrewOxide")
    b.inputs["Base Color"].default_value = (0.42, 0.42, 0.43, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.34
    out["screw"] = m

    m, nt, b = new_mat("MAT_ConnectorPlastic")
    b.inputs["Base Color"].default_value = (0.010, 0.010, 0.010, 1)
    b.inputs["Roughness"].default_value = 0.36
    out["plastic"] = m

    m, nt, b = new_mat("MAT_Rubber")
    b.inputs["Base Color"].default_value = (0.006, 0.006, 0.006, 1)
    b.inputs["Roughness"].default_value = 0.62
    out["rubber"] = m

    m, nt, b = new_mat("MAT_Gold")
    b.inputs["Base Color"].default_value = (0.95, 0.68, 0.30, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.25
    out["gold"] = m

    m, nt, b = new_mat("MAT_Bezel")
    b.inputs["Base Color"].default_value = (0.008, 0.008, 0.008, 1)
    b.inputs["Roughness"].default_value = 0.2
    out["bezel"] = m

    for key, (_, col, glow) in C["leds"].items():
        m, nt, b = new_mat("MAT_LED_" + key)
        b.inputs["Base Color"].default_value = (*col, 1)
        b.inputs["Roughness"].default_value = 0.16
        b.inputs["Coat Weight"].default_value = 1.0
        b.inputs["Coat Roughness"].default_value = 0.05
        b.inputs["Emission Color"].default_value = (*col, 1)
        b.inputs["Emission Strength"].default_value = glow
        out["led_" + key] = m

    return out


# ---------------------------------------------------------------- parts
def build_lid(M):
    hx, hy, r = C["hx"], C["hy"], C["corner_r"]
    zp, zf, zt = C["z_part"], C["z_flange"], C["z_top"]
    sm = C["seam"]
    k = Kit()
    MAIN, EDGE = 0, 1

    def outer(d):
        return rounded_rect(hx + d, hy + d, r + d)

    def panel(d):
        return notched_rect(C["panel_hx"] + d, C["panel_hy"] + d, C["notch_r"] - d, C["notch_f"] + d)

    side = k.loft(
        [
            (outer(-0.35), zp + sm),
            (outer(-0.05), zp + sm + 0.24),
            (outer(0.0), zp + sm + 0.34),
            (outer(0.0), zf - 1.0),
            (outer(-0.05), zf - 0.86),
            (outer(-0.86), zf - 0.05),
            (outer(-1.0), zf),
        ]
    )
    foot = k.ring(panel(0.0), zf)
    crest = k.ring(panel(-C["chamfer"]), zt)
    k.bridge(foot, crest, EDGE)
    k.cap([crest], MAIN)

    bore_tops, tube_tops = [], []
    for sx, sy in screw_centers():
        rings = k.loft(
            [
                (circle(sx, sy, C["bore_r"]), zf),
                (circle(sx, sy, C["bore_r"] - 0.2), zf - 0.2),
                (circle(sx, sy, C["bore_r"] - 0.2), zf - C["bore_depth"]),
                (circle(sx, sy, C["shaft_hole_r"]), zf - C["bore_depth"]),
                (circle(sx, sy, C["shaft_hole_r"]), zp + sm),
            ]
        )
        bore_tops.append(rings[0])
        tube_tops.append(rings[-1])
    k.cap([side[-1], foot] + bore_tops, MAIN)
    k.cap([side[0]] + tube_tops, MAIN)
    return k.finish("BB_Lid", [M["anodized"], M["edge"]])


def build_base(M):
    hx, hy, r = C["hx"], C["hy"], C["corner_r"]
    zp = C["z_part"]
    sm = C["seam"]
    k = Kit()
    MAIN, INNER = 0, 1

    def outer(d):
        return rounded_rect(hx + d, hy + d, r + d)

    # Slight casting draft towards the bottom and a soft bottom edge.
    draft = -0.25
    rad = 2.0
    profile = []
    for i in range(7):
        a = math.radians(90 * i / 6)
        profile.append((outer(draft - rad + rad * math.sin(a)), rad - rad * math.cos(a)))
    profile += [
        (outer(0.0), zp - sm - 0.34),
        (outer(-0.05), zp - sm - 0.24),
        (outer(-0.35), zp - sm),
    ]
    side = k.loft(profile)

    rim_hx, rim_hy = 66.2, 41.2
    ledge = zp - C["ledge_drop"]
    floor = C["cavity_floor"]

    def cav(hx_, hy_, R):
        return notched_rect(hx_, hy_, R, 1.6)

    inner = k.loft(
        [
            (cav(rim_hx, rim_hy, 6.0), zp - sm),
            (cav(rim_hx - 0.3, rim_hy - 0.3, 6.3), zp - sm - 0.3),
            (cav(rim_hx - 0.3, rim_hy - 0.3, 6.3), ledge),
            (cav(65.0, 40.0, 7.2), ledge),
            (cav(65.0, 40.0, 7.2), ledge - 0.0001 - 0.3),
        ],
        MAIN,
    )
    # Cavity wall running into the floor with a machined fillet.
    fillet = 1.2
    rings = [inner[-1]]
    prof = [(cav(65.0, 40.0, 7.2), floor + fillet)]
    for i in range(1, 6):
        a = math.radians(90 * i / 5)
        d = fillet * (1 - math.cos(a))
        prof.append((cav(65.0 - d, 40.0 - d, 7.2 + d), floor + fillet - fillet * math.sin(a)))
    for p, z in prof:
        ring = k.ring(p, z)
        k.bridge(rings[-1], ring, INNER)
        rings.append(ring)
    k.cap([rings[-1]], INNER)

    tops = []
    for sx, sy in screw_centers():
        hole = k.loft(
            [
                (circle(sx, sy, C["base_hole_r"] + 0.3), zp - sm),
                (circle(sx, sy, C["base_hole_r"]), zp - sm - 0.3),
                (circle(sx, sy, C["base_hole_r"]), zp - sm - C["base_hole_depth"]),
            ]
        )
        tops.append(hole[0])
        k.cap([hole[-1]], INNER)
    k.cap([side[-1], inner[0]] + tops, MAIN)
    k.cap([side[0]], MAIN)
    ob = k.finish("BB_Base", [M["satin"], M["inner"]])

    # Cable pass-through in the -X wall, seen from inside when the box is open.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=6.2, depth=14.0, location=(-68.0, C["conn_y"], C["conn_z"]), rotation=(0, math.pi / 2, 0)
    )
    cutter = bpy.context.active_object
    cutter.name = "BB_CableCut"
    cutter.hide_render = True
    cutter.hide_viewport = True
    mod = ob.modifiers.new("CableHole", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    ob.modifiers.move(ob.modifiers.find("CableHole"), 0)
    return ob


def build_screw(M):
    head_h = C["bore_depth"] - 0.35
    top = head_h
    r = C["head_r"]
    k = Kit()
    rings = k.loft(
        [
            (circle(0, 0, C["shaft_r"], 32), -C["shaft_len"]),
            (circle(0, 0, C["shaft_r"], 32), 0.0),
            (circle(0, 0, r, 32), 0.0),
            (circle(0, 0, r, 32), top - 0.35),
            (circle(0, 0, r - 0.05, 32), top - 0.28),
            (circle(0, 0, r - 0.28, 32), top - 0.04),
            (circle(0, 0, r - 0.36, 32), top),
        ]
    )
    k.cap([rings[0]])
    hexa = circle(0, 0, 1.7, 6)
    rim = k.ring(hexa, top)
    bottom = k.ring(hexa, top - 1.2)
    k.bridge(rim, bottom)
    k.cap([bottom])
    k.cap([rings[-1], rim])
    return k.finish("BB_ScrewMesh", [M["screw"]])


def build_connector(M):
    PLASTIC, RUBBER, GOLD = 0, 1, 2
    mats = [M["plastic"], M["rubber"], M["gold"]]
    nut = lathe(
        "BB_ConnectorNut",
        [(11.0, 0.0), (11.0, 3.0), (10.2, 3.5), (9.0, 3.5)],
        [M["plastic"]],
        seg=6,
    )
    nut.modifiers.new("Bevel", "BEVEL").width = 0.3
    nut.modifiers.move(1, 0)
    nut.modifiers[0].limit_method = "ANGLE"
    nut.modifiers[0].segments = 3

    barrel = lathe(
        "BB_Connector",
        [
            (8.6, 3.0),
            (8.6, 4.2),
            (9.5, 4.3, RUBBER),
            (9.7, 4.7, RUBBER),
            (9.7, 5.6, RUBBER),
            (9.5, 6.0),
            (8.5, 6.1),
            (8.5, 7.2),
            (8.9, 7.3),
            (8.9, 8.4),
            (8.5, 8.5),
            (8.5, 13.4),
            (8.3, 13.8),
            (7.7, 14.0),
            (6.0, 14.0),
            (5.8, 13.8),
            (5.8, 10.8),
        ],
        mats,
    )
    # Five contacts in the socket.
    pins = []
    for i in range(5):
        a = 2 * math.pi * i / 5 + math.pi / 2
        pin = lathe(
            "BB_ConnectorPin_%d" % i,
            [(0.55, 10.8), (0.55, 13.0), (0.35, 13.3)],
            [M["gold"]],
            seg=16,
        )
        pin.location = (2.9 * math.cos(a), 2.9 * math.sin(a), 0)
        pins.append(pin)
    return nut, barrel, pins


def build_led(key, M):
    (x, y), _, _ = C["leds"][key]
    z = C["z_top"]
    bezel = lathe(
        "BB_LEDBezel_" + key,
        [(2.5, -0.05), (2.5, 0.04), (2.42, 0.13), (2.2, 0.16), (2.1, 0.1)],
        [M["bezel"]],
        seg=48,
    )
    bezel.location = (x, y, z)
    dome = [(2.1, 0.06)]
    for i in range(1, 8):
        a = math.radians(90 * i / 8)
        dome.append((2.1 * math.cos(a), 0.06 + 0.95 * math.sin(a)))
    dome.append((0.02, 1.01))
    lens = lathe("BB_LED_" + key, dome, [M["led_" + key]], seg=48)
    lens.location = (x, y, z)
    return bezel, lens


def parent(child, par):
    child.parent = par


def build_box(M):
    root = bpy.data.objects.new("BB_Root", None)
    bpy.context.scene.collection.objects.link(root)
    root.location = (0, 0, C["z_top"] / 2)

    base = build_base(M)
    lid = build_lid(M)
    # Children keep their box coordinates; only the root offset is applied.
    for ob in (base, lid):
        ob.parent = root
        ob.location = (0, 0, -C["z_top"] / 2)

    screw_mesh = build_screw(M)
    bpy.context.scene.collection.objects.unlink(screw_mesh)
    screw_data = screw_mesh.data
    for i, (sx, sy) in enumerate(screw_centers(), 1):
        ob = bpy.data.objects.new("BB_Screw_%d" % i, screw_data)
        bpy.context.scene.collection.objects.link(ob)
        ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
        ob.parent = lid
        ob.location = (sx, sy, C["z_flange"] - C["bore_depth"])
        ob.rotation_euler.z = math.radians((i * 37) % 60)  # screws never line up on a real unit
    bpy.data.objects.remove(screw_mesh)

    nut, barrel, pins = build_connector(M)
    conn = bpy.data.objects.new("BB_ConnectorRoot", None)
    bpy.context.scene.collection.objects.link(conn)
    conn.parent = base
    conn.location = (-C["hx"], C["conn_y"], C["conn_z"])
    conn.rotation_euler = (0, -math.pi / 2, 0)
    for ob in [nut, barrel] + pins:
        ob.parent = conn

    for key in C["leds"]:
        for ob in build_led(key, M):
            ob.parent = lid
    return root


# ---------------------------------------------------------------- studio
def softbox(name, loc, size, strength, target=(0, 0, 0), reflected=True):
    me = bpy.data.meshes.new(name)
    s = size / 2 if not isinstance(size, tuple) else None
    sx, sy = (size[0] / 2, size[1] / 2) if isinstance(size, tuple) else (s, s)
    me.from_pydata([(-sx, -sy, 0), (sx, -sy, 0), (sx, sy, 0), (-sx, sy, 0)], [], [(0, 1, 2, 3)])
    m = bpy.data.materials.new("MAT_" + name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], out.inputs[0])
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    direction = Vector(target) - Vector(loc)
    ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    ob.visible_camera = False
    ob.visible_shadow = False
    ob.visible_glossy = reflected
    return ob


def build_world(scene):
    w = bpy.data.worlds.new("World_Studio")
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.42, 0.42, 0.42, 1)
    ramp.color_ramp.elements[1].position = 0.6
    ramp.color_ramp.elements[1].color = (0.015, 0.015, 0.015, 1)
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(bg.outputs[0], out.inputs[0])
    scene.world = w


def build_studio(scene):
    build_world(scene)
    softbox("L_Key", (-220, 900, 640), 900, 1.0)
    softbox("L_Fill", (620, -520, 420), 500, 0.5)
    softbox("L_StripL", (-900, -80, 420), (240, 900), 2.2)
    softbox("L_StripR", (500, 900, 420), (900, 240), 1.6)
    # Only shapes the ground shadow: it is linked to the ground alone, so the parts ignore it.
    lamp = bpy.data.lights.new("L_Shadow", "AREA")
    lamp.size = 700.0
    lamp.energy = 2.5e7
    shadow = bpy.data.objects.new("L_Shadow", lamp)
    scene.collection.objects.link(shadow)
    shadow.location = (-30, 170, 760)
    shadow.rotation_euler = (Vector((0, 0, 0)) - Vector(shadow.location)).to_track_quat("-Z", "Y").to_euler()

    me = bpy.data.meshes.new("BB_Ground")
    s = 6000
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    ground = bpy.data.objects.new("BB_Ground", me)
    scene.collection.objects.link(ground)
    ground.is_shadow_catcher = True
    receivers = bpy.data.collections.new("LL_GroundOnly")
    receivers.objects.link(ground)
    shadow.light_linking.receiver_collection = receivers

    cam_data = bpy.data.cameras.new("CAM")
    cam_data.lens = 85.0
    cam_data.sensor_width = 36.0
    cam_data.clip_start = 1.0
    cam_data.clip_end = 8000.0
    cam = bpy.data.objects.new("CAM", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam


def setup_render(scene):
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.length_unit = "MILLIMETERS"
    scene.unit_settings.scale_length = 0.001
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 96
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.fps = 30


def clear_all():
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.worlds):
        for item in list(coll):
            coll.remove(item)
    stale = bpy.data.collections.get("LL_GroundOnly")
    if stale:
        bpy.data.collections.remove(stale)


def main():
    scene = bpy.context.scene
    clear_all()
    setup_render(scene)
    M = build_materials()
    root = build_box(M)
    build_studio(scene)
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=C["out_blend"])
    return {
        "objects": len(bpy.data.objects),
        "tris": sum(len(o.data.polygons) for o in bpy.data.objects if o.type == "MESH"),
        "root": root.name,
        "saved": bpy.data.filepath,
    }


result = main()
