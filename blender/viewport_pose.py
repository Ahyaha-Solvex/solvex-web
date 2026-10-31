"""Review stills of the side-on exploded pose. Touches nothing that is saved.

python blender/mcp_run.py blender/viewport_pose.py
"""
import bpy
from mathutils import Matrix, Vector

OUT = r"E:\Project\SOLVEX\blender\out\pose" + "\\"
ORDER = ("lora", "esp32", "gyroscope", "gsm", "antenna", "accelerometer", "gps")
AXIS = Vector((0.66, -0.56, -0.50)).normalized()   # from body to lid: right, towards viewer, down
LONG = Vector((0.75, 0.0, 0.66))                   # long side of everything leans up to the right
BODY_LID = 215.0
STACK = 46.0
SCALE = 0.82

scene = bpy.context.scene
render = scene.render
render.resolution_x, render.resolution_y = 1280, 714
render.resolution_percentage = 100
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"
render.film_transparent = True
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

objs = bpy.data.objects
ground = objs["BB_Ground"]
ground.hide_viewport = True
objs["BB_CableCut"].hide_viewport = True

old_cam = scene.camera
data = bpy.data.cameras.new("CAM_Pose")
data.lens = 85.0
data.clip_start = 1.0
data.clip_end = 9000.0
cam = bpy.data.objects.new("CAM_Pose", data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = (0, -1150, 0)
cam.rotation_euler = (1.5708, 0, 0)

z = AXIS
x = (LONG - z * LONG.dot(z)).normalized()
y = z.cross(x)
R = Matrix((x, y, z)).transposed().to_4x4()

root, lid, base = objs["BB_Root"], objs["BB_Lid"], objs["BB_Base"]
scene.frame_set(1)


def place_box(lid_offset, body_offset):
    root.matrix_world = R
    lid.location = (0, 0, -17.5 + lid_offset)
    base.location = (0, 0, -17.5 + body_offset)


def place_components(visible):
    for i, key in enumerate(ORDER):
        anim = objs["C_%s_anim" % key]
        s = SCALE if visible else 0.0001
        offset = (i - 3) * STACK if visible else 0.0
        anim.location = z * offset
        anim.rotation_quaternion = R.to_quaternion()
        anim.scale = (s, s, s)


with bpy.context.temp_override(window=window, area=area, region=region, space_data=space):
    place_box(0.0, 0.0)
    place_components(False)
    bpy.context.view_layer.update()
    render.filepath = OUT + "closed.png"
    bpy.ops.render.opengl(write_still=True, view_context=True)

    place_box(BODY_LID, -BODY_LID)
    place_components(True)
    bpy.context.view_layer.update()
    render.filepath = OUT + "open.png"
    bpy.ops.render.opengl(write_still=True, view_context=True)

scene.camera = old_cam
bpy.data.objects.remove(cam)
bpy.data.cameras.remove(data)
root.location = (0, 0, 17.5)
root.rotation_euler = (0, 0, 0)
ground.hide_viewport = False
scene.frame_set(1)
result = {"done": True}
