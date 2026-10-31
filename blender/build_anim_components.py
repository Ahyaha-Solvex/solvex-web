"""Component choreography. Run after build_anim.py.

Each C_<id>_root gets a parent C_<id>_anim, so root keeps the 55 mm normalization.
Path: packed in the base, out into the stack between body and lid, then into the carousel
pose: centre module large, sides smaller, all tilted alike. The website carousel starts
from that exact pose. The antenna is not here: it stays mounted on the body.
"""
import math
import sys

import bpy
from mathutils import Quaternion, Vector

ROOT = r"E:\Project\SOLVEX\blender"
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.modules.pop("stack_pose", None)
from stack_pose import AXIS, CENTER, stack_rotation  # noqa: E402

CONFIG = {
    "order": ("accelerometer", "gyroscope", "gps", "esp32", "gsm", "lora"),
    "center": 3,
    "appear_frame": 268,     # lid still shut, so the swap to visible is hidden inside the base
    "launch_frame": 270,
    "stagger": 3,
    "arrive_frames": 48,
    "hold_end": 347,
    "settle_end": 390,
    "settle_stagger": 2,
    "inside_scale": 0.42,
    "inside_z": 8.0,         # above the cavity floor, in base coordinates
    "stack_pitch": 52.0,
    "stack_scale": 0.82,
    # Carousel pose, keep in step with the 392 camera key in build_anim.py
    "cam_target": (0.0, 0.0, 40.0),
    "cam_tilt": 50.0,
    "row_up": 26.0,          # row sits above frame centre, the text goes below it
    "tilt": 34.0,            # shallow enough that the spin never goes edge-on or shows the underside
    "diagonal": -25.0,       # long side runs diagonally
    "slots": {0: (0.0, 2.1), 1: (122.0, 0.7), 2: (176.0, 0.5), 3: (235.0, 0.42)},
}
C = CONFIG

scene = bpy.context.scene
coll = bpy.data.collections["Components"]
base_ob = bpy.data.objects["BB_Base"]

for key in C["order"]:
    root = bpy.data.objects["C_%s_root" % key]
    old = bpy.data.objects.get("C_%s_anim" % key)
    keep = root.matrix_world.copy() if old is None else None
    root.parent = None
    if old is not None:
        bpy.data.objects.remove(old)
    if keep is not None:
        root.matrix_world = keep

t = math.radians(C["cam_tilt"])
target = Vector(C["cam_target"])
up = Vector((0, math.cos(t), math.sin(t)))
carousel_q = Quaternion((1, 0, 0), math.radians(C["tilt"])) @ Quaternion((0, 0, 1), math.radians(C["diagonal"]))
stack_q = stack_rotation().to_quaternion()


def grid_local(i):
    """Packed flat in the cavity, 3 + 3."""
    return Vector((((i % 3) - 1) * 38, (0.5 - i // 3) * 32, C["inside_z"]))


def set_key(ob, frame, loc, q, scale):
    ob.location = loc
    ob.rotation_quaternion = q
    ob.scale = (scale, scale, scale)
    ob.keyframe_insert("location", frame=frame)
    ob.keyframe_insert("rotation_quaternion", frame=frame)
    ob.keyframe_insert("scale", frame=frame)


def inside_pos(i, frame):
    scene.frame_set(frame)
    return base_ob.matrix_world @ grid_local(i)


launch_order = sorted(range(len(C["order"])), key=lambda i: (abs(i - C["center"]), i))
for n, i in enumerate(launch_order):
    key = C["order"][i]
    d = i - C["center"]
    launch = C["launch_frame"] + n * C["stagger"]
    arrive = launch + C["arrive_frames"]
    stack_pos = CENTER + AXIS * ((i - (len(C["order"]) - 1) / 2) * C["stack_pitch"])
    x, scale = C["slots"][abs(d)]
    final_pos = target + Vector((math.copysign(x, d) if d else 0.0, 0, 0)) + up * C["row_up"]
    settle_from = C["hold_end"] + abs(d) * C["settle_stagger"]
    settle_at = C["settle_end"] - abs(d) * C["settle_stagger"]

    anim = bpy.data.objects.new("C_%s_anim" % key, None)
    coll.objects.link(anim)
    anim.rotation_mode = "QUATERNION"
    bpy.data.objects["C_%s_root" % key].parent = anim

    set_key(anim, 1, inside_pos(i, 1), stack_q, 0.0001)
    set_key(anim, C["appear_frame"] - 1, inside_pos(i, C["appear_frame"] - 1), stack_q, 0.0001)
    set_key(anim, C["appear_frame"], inside_pos(i, C["appear_frame"]), stack_q, C["inside_scale"])
    set_key(anim, launch, inside_pos(i, launch), stack_q, C["inside_scale"])
    set_key(anim, arrive, stack_pos, stack_q, C["stack_scale"])
    set_key(anim, settle_from, stack_pos, stack_q, C["stack_scale"])
    final_q = carousel_q.copy()
    final_q.make_compatible(stack_q)
    set_key(anim, settle_at, final_pos, final_q, scale)
    set_key(anim, C["settle_end"] + 10, final_pos, final_q, scale)

scene.frame_set(1)
bpy.ops.wm.save_mainfile()
result = {"components": len(C["order"])}
