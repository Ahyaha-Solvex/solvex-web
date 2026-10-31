"""Box choreography, 30 fps, frames 1-400. Run after build_box.py and build_components.py.

Opens on a 45 degree perspective view, the box turns to a diagonal, the screws leave one
at a time, the box turns on its side while the camera moves overhead, then lid and body
separate along the pose axis and leave the frame.
Camera rig: rotation X is the tilt away from overhead, camera local Z is the distance.
"""
import math
import sys

import bpy
from mathutils import Quaternion, Vector

ROOT = r"E:\Project\SOLVEX\blender"
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
sys.modules.pop("stack_pose", None)
from stack_pose import CENTER, stack_rotation  # noqa: E402

CONFIG = {
    "frame_end": 400,
    # Screw names in removal order, clockwise from the top-left corner
    "screw_order": (2, 1, 4, 3),
    "screw_start": 80,
    "screw_stagger": 24,
    "screw_rise": 18.0,
    "screw_rise_frames": 14,
    "screw_exit_frames": 16,
    "screw_exit": 420.0,
    "screw_turns": 2,
    "diagonal_start": 10,
    "diagonal_end": 70,
    "diagonal_yaw": 45.0,    # connector and antenna swing to the bottom-left
    "turn_start": 186,
    "turn_end": 258,
    "open_start": 270,
    "open_end": 327,
    "exit_start": 347,
    "exit_end": 390,
    "spread": 215.0,         # lid and body distance from the centre along the pose axis
    "exit_dist": 900.0,
    "ground_drop_start": 296,  # just before the body first reaches the ground
    "ground_drop": -520.0,   # below the body for the whole open and hold, see the ground keys
    # frame: (rig location, tilt from overhead in degrees, camera distance, lens)
    "camera": {
        1: ((0, 0, 17), 45, 345, 40),
        70: ((0, 0, 17), 45, 400, 40),
        186: ((0, 0, 17), 45, 400, 40),
        258: ((0, 0, 130), 0, 1150, 85),
        347: ((0, 0, 130), 0, 1150, 85),
        392: ((0, 0, 40), 50, 900, 85),
        400: ((0, 0, 40), 50, 900, 85),
    },
}
C = CONFIG

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = C["frame_end"]
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"

objs = bpy.data.objects
root, lid, base, cam = objs["BB_Root"], objs["BB_Lid"], objs["BB_Base"], objs["CAM"]
screws = {i: objs["BB_Screw_%d" % i] for i in (1, 2, 3, 4)}

for ob in (root, lid, base, cam, cam.data, *screws.values()):
    ob.animation_data_clear()
stale = objs.get("CAM_Rig")
if stale:
    objs.remove(stale)

rig = objs.new("CAM_Rig", None)
scene.collection.objects.link(rig)
cam.parent = rig
cam.location = (0, 0, 0)
cam.rotation_euler = (0, 0, 0)

for frame, (loc, tilt, dist, lens) in C["camera"].items():
    rig.location = loc
    rig.keyframe_insert("location", frame=frame)
    rig.rotation_euler = (math.radians(tilt), 0, 0)
    rig.keyframe_insert("rotation_euler", index=0, frame=frame)
    cam.location = (0, 0, dist)
    cam.keyframe_insert("location", index=2, frame=frame)
    cam.data.lens = lens
    cam.data.keyframe_insert("lens", frame=frame)

# Screws: unscrew straight up, then slide away from the box.
for n, i in enumerate(C["screw_order"]):
    screw = screws[i]
    rest = screw.location.copy()
    spin = screw.rotation_euler.z
    start = C["screw_start"] + n * C["screw_stagger"]
    risen = rest + Vector((0, 0, C["screw_rise"]))
    side = Vector((rest.x, rest.y, 0)).normalized()
    gone = risen + side * C["screw_exit"]
    unscrewed = spin + 2 * math.pi * C["screw_turns"]
    for frame, loc, angle in (
        (start, rest, spin),
        (start + C["screw_rise_frames"], risen, unscrewed),
        (start + C["screw_rise_frames"] + C["screw_exit_frames"], gone, unscrewed),
    ):
        screw.location = loc
        screw.keyframe_insert("location", frame=frame)
        screw.rotation_euler.z = angle
        screw.keyframe_insert("rotation_euler", index=2, frame=frame)

# Turn onto the side.
root.rotation_mode = "QUATERNION"
root.rotation_euler = (0, 0, 0)
flat = Quaternion()
diagonal = Quaternion((0, 0, 1), math.radians(C["diagonal_yaw"]))
turned = stack_rotation(flip=True).to_quaternion()
turned.make_compatible(diagonal)
home = Vector((0, 0, 17.5))
for frame, q, loc in (
    (1, flat, home),
    (C["diagonal_start"], flat, home),
    (C["diagonal_end"], diagonal, home),
    (C["turn_start"], diagonal, home),
    (C["turn_end"], turned, CENTER),
):
    root.rotation_quaternion = q
    root.keyframe_insert("rotation_quaternion", frame=frame)
    root.location = loc
    root.keyframe_insert("location", frame=frame)

# Open along the lid normal, hold for the stack, then leave.
closed = Vector((0, 0, -17.5))
for frame, off in (
    (C["open_start"], 0.0),
    (C["open_end"], C["spread"]),
    (C["exit_start"], C["spread"]),
    (C["exit_end"], C["exit_dist"]),
):
    lid.location = closed + Vector((0, 0, off))
    lid.keyframe_insert("location", frame=frame)
    base.location = closed - Vector((0, 0, off))
    base.keyframe_insert("location", frame=frame)

# The ground is a shadow catcher, and it hides whatever goes below it: the body leaves
# downwards along the pose axis, so the ground drops out of the way while the box is open.
ground = objs["BB_Ground"]
ground.animation_data_clear()
for frame, z in (
    (C["ground_drop_start"], 0.0),
    (C["ground_drop_start"] + 8, C["ground_drop"]),
    (C["exit_end"], C["ground_drop"]),
    (C["exit_end"] + 4, 0.0),
):
    ground.location.z = z
    ground.keyframe_insert("location", index=2, frame=frame)

scene.frame_set(1)
bpy.ops.wm.save_mainfile()
result = {"frames": scene.frame_end, "saved": bpy.data.filepath}
