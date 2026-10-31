"""Placeholder carousel stills from the viewport, same framing as the last sequence frame.

python blender/mcp_run.py blender/viewport_carousel.py
Used only until render_carousel.py has finished.
"""
import bpy

ORDER = ("accelerometer", "gyroscope", "gps", "esp32", "gsm", "lora")
CENTER = "esp32"
OUT = r"E:\Project\SOLVEX\blender\out\carousel_viewport" + "\\"

scene = bpy.context.scene
render = scene.render
render.resolution_x, render.resolution_y = 960, 536
render.resolution_percentage = 100
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"
render.film_transparent = True

window = bpy.context.window_manager.windows[0]
area = next(a for a in window.screen.areas if a.type == "VIEW_3D")
region = next(r for r in area.regions if r.type == "WINDOW")
space = area.spaces.active
space.shading.type = "MATERIAL"
space.shading.use_scene_lights = True
space.shading.use_scene_world = True
space.overlay.show_overlays = False
space.region_3d.view_perspective = "CAMERA"
objs = bpy.data.objects
objs["BB_Ground"].hide_viewport = True
objs["BB_CableCut"].hide_viewport = True

with bpy.context.temp_override(window=window, area=area, region=region, space_data=space):
    for key in ORDER:
        scene.frame_set(scene.frame_end)
        pivot = objs[f"C_{CENTER}_anim"]
        loc, rot, size = pivot.location.copy(), pivot.rotation_quaternion.copy(), pivot.scale.copy()
        for other in ORDER:
            objs[f"C_{other}_anim"].scale = (0.0001, 0.0001, 0.0001)
        target = objs[f"C_{key}_anim"]
        target.location, target.rotation_quaternion, target.scale = loc, rot, size
        bpy.context.view_layer.update()
        render.filepath = OUT + key + ".png"
        bpy.ops.render.opengl(write_still=True, view_context=True)

objs["BB_Ground"].hide_viewport = False
scene.frame_set(1)
result = {"done": True}
