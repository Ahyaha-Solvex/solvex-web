"""Viewport (Material Preview) capture of the animation, no Cycles.

python blender/mcp_run.py blender/viewport_anim.py
Writes every 2nd frame to blender/out/anim as transparent PNGs.
"""
import math

import bpy
from mathutils import Quaternion

SPIN_FRAMES = 0
OUT = r"E:\Project\SOLVEX\blender\out\anim4\f_"

scene = bpy.context.scene
render = scene.render
render.resolution_x = 960
render.resolution_y = 536
render.resolution_percentage = 100
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"
render.film_transparent = True
render.filepath = OUT
scene.frame_step = 2
scene.eevee.taa_samples = 8

window = bpy.context.window_manager.windows[0]
area = next(a for a in window.screen.areas if a.type == "VIEW_3D")
region = next(r for r in area.regions if r.type == "WINDOW")
space = area.spaces.active
space.shading.type = "MATERIAL"
space.shading.use_scene_lights = True
space.shading.use_scene_world = True
space.overlay.show_overlays = False
space.region_3d.view_perspective = "CAMERA"
# The shadow catcher only works in Cycles, so previews show no ground shadow.
ground = bpy.data.objects["BB_Ground"]
ground.hide_viewport = True
bpy.data.objects["BB_CableCut"].hide_viewport = True

with bpy.context.temp_override(window=window, area=area, region=region, space_data=space):
    bpy.ops.render.opengl(animation=True, view_context=True)
    # Carousel loop: only the centre module spins, about the vertical axis, tilt held.
    scene.frame_set(scene.frame_end)
    centre = bpy.data.objects["C_esp32_anim"]
    tilted = centre.rotation_quaternion.copy()
    for i in range(1, SPIN_FRAMES + 1):
        scene.frame_set(scene.frame_end)
        centre.rotation_quaternion = Quaternion((0, 0, 1), 2 * math.pi * i / SPIN_FRAMES) @ tilted
        bpy.context.view_layer.update()
        render.filepath = OUT + "%04d.png" % (scene.frame_end + i * 2)
        bpy.ops.render.opengl(write_still=True, view_context=True)

render.filepath = OUT
ground.hide_viewport = False
scene.frame_step = 1
scene.frame_set(1)
result = {"last": render.frame_path(frame=scene.frame_end)}
