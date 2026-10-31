"""Viewport (Material Preview) review of the modules: a spinning row plus close-ups. No Cycles.

python blender/mcp_run.py blender/viewport_components.py
"""
import math

import bpy
from mathutils import Matrix

OUT = r"E:\Project\SOLVEX\blender\out\components" + "\\"
ORDER = ("accelerometer", "gyroscope", "gps", "esp32", "gsm", "lora")
TILT = math.radians(38)     # tilt of each module towards the camera
FRAMES = 40

scene = bpy.context.scene
render = scene.render
render.resolution_percentage = 100
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"
render.film_transparent = True
scene.eevee.taa_samples = 12

window = bpy.context.window_manager.windows[0]
area = next(a for a in window.screen.areas if a.type == "VIEW_3D")
region = next(r for r in area.regions if r.type == "WINDOW")
space = area.spaces.active
space.shading.type = "MATERIAL"
space.shading.use_scene_lights = True
space.shading.use_scene_world = True
space.overlay.show_overlays = False
space.region_3d.view_perspective = "CAMERA"

roots = [bpy.data.objects["C_%s_root" % k] for k in ORDER]
base = [r.matrix_world.copy() for r in roots]
hidden = [o for o in scene.objects if o.name.startswith("BB_") and o.type != "EMPTY" and not o.hide_viewport]
for o in hidden:
    o.hide_viewport = True

old_cam = scene.camera
data = bpy.data.cameras.new("CAM_Review")
data.lens = 85.0
data.clip_start = 1.0
data.clip_end = 9000.0
cam = bpy.data.objects.new("CAM_Review", data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.rotation_euler = (0, 0, 0)


def pose(index, x, y, z, spin):
    roots[index].matrix_world = (
        Matrix.Translation((x, y, z)) @ Matrix.Rotation(-TILT, 4, "X") @ Matrix.Rotation(spin, 4, "Z")
        @ base[index]
    )


with bpy.context.temp_override(window=window, area=area, region=region, space_data=space):
    # Spinning row.
    render.resolution_x, render.resolution_y = 1400, 330
    cam.location = (0, 0, 1320)
    for f in range(FRAMES):
        a = 2 * math.pi * f / FRAMES
        for i in range(len(ORDER)):
            pose(i, (i - 3) * 72.5, 0, 200, a)
        bpy.context.view_layer.update()
        render.filepath = OUT + "row_%04d.png" % f
        bpy.ops.render.opengl(write_still=True, view_context=True)
    # One sharp close-up per module.
    render.resolution_x, render.resolution_y = 720, 540
    for i, key in enumerate(ORDER):
        for j in range(len(ORDER)):
            pose(j, 0 if j == i else 5000, 0, 200, math.radians(-25))
        cam.location = (0, 0, 430)
        bpy.context.view_layer.update()
        render.filepath = OUT + "close_%s.png" % key
        bpy.ops.render.opengl(write_still=True, view_context=True)

for r, m in zip(roots, base):
    r.matrix_world = m
for o in hidden:
    o.hide_viewport = False
scene.camera = old_cam
bpy.data.objects.remove(cam)
bpy.data.cameras.remove(data)
result = {"done": True}
