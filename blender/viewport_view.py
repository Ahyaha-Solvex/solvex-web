"""One review still from a chosen camera at frame 1. Touches nothing that is saved.

python blender/mcp_run.py blender/viewport_view.py
"""
import math

import bpy
from mathutils import Vector

OUT = r"E:\Project\SOLVEX\blender\out\view\angled.png"
LENS = 40.0          # short lens, so the far edges visibly converge
ELEVATION = 45.0
DISTANCE = 345.0
TARGET = Vector((0.0, 0.0, 17.0))

scene = bpy.context.scene
scene.frame_set(1)
render = scene.render
render.resolution_x, render.resolution_y = 1280, 714
render.resolution_percentage = 100
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"
render.film_transparent = True
render.filepath = OUT
scene.eevee.taa_samples = 16

window = bpy.context.window_manager.windows[0]
area = next(a for a in window.screen.areas if a.type == "VIEW_3D")
region = next(r for r in area.regions if r.type == "WINDOW")
space = area.spaces.active
space.shading.type = "MATERIAL"
space.shading.use_scene_lights = True
space.shading.use_scene_world = True
space.overlay.show_overlays = False
space.region_3d.view_perspective = "CAMERA"

ground = bpy.data.objects["BB_Ground"]
ground.hide_viewport = True
bpy.data.objects["BB_CableCut"].hide_viewport = True

old_cam = scene.camera
data = bpy.data.cameras.new("CAM_View")
data.lens = LENS
data.clip_start = 1.0
data.clip_end = 9000.0
cam = bpy.data.objects.new("CAM_View", data)
scene.collection.objects.link(cam)
scene.camera = cam
e = math.radians(ELEVATION)
cam.location = TARGET + Vector((0, -math.cos(e), math.sin(e))) * DISTANCE
cam.rotation_euler = (TARGET - cam.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.view_layer.update()

with bpy.context.temp_override(window=window, area=area, region=region, space_data=space):
    bpy.ops.render.opengl(write_still=True, view_context=True)

scene.camera = old_cam
bpy.data.objects.remove(cam)
bpy.data.cameras.remove(data)
ground.hide_viewport = False
result = {"saved": OUT}
