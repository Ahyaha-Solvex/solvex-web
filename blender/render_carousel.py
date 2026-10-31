"""One transparent still per module in the carousel centre pose, framed like the last sequence frame.

blender -b blender/solvex_blackbox.blend -P blender/render_carousel.py -- out_dir [samples] [percent]
"""
import sys
from pathlib import Path

import bpy

ORDER = ("accelerometer", "gyroscope", "gps", "esp32", "gsm", "lora")
CENTER = "esp32"     # already sits in the centre pose on the last frame

argv = sys.argv[sys.argv.index("--") + 1:]
out_dir = Path(argv[0])
samples = int(argv[1]) if len(argv) > 1 else 24
percent = int(argv[2]) if len(argv) > 2 else 100

scene = bpy.context.scene
render = scene.render
render.resolution_x, render.resolution_y = 1600, 900
render.resolution_percentage = percent
render.film_transparent = True
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"
cycles = scene.cycles
cycles.device = "CPU"
cycles.samples = samples
cycles.use_denoising = True
cycles.denoiser = "OPENIMAGEDENOISE"
cycles.max_bounces = 5
cycles.diffuse_bounces = 2
cycles.glossy_bounces = 3

out_dir.mkdir(parents=True, exist_ok=True)
objs = bpy.data.objects
for key in ORDER:
    path = out_dir / f"{key}.png"
    if path.exists():
        continue
    scene.frame_set(scene.frame_end)
    pivot = objs[f"C_{CENTER}_anim"]
    loc, rot, size = pivot.location.copy(), pivot.rotation_quaternion.copy(), pivot.scale.copy()
    for other in ORDER:
        objs[f"C_{other}_anim"].scale = (0.0001, 0.0001, 0.0001)
    target = objs[f"C_{key}_anim"]
    target.location, target.rotation_quaternion, target.scale = loc, rot, size
    render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print(f"@@ {key}", flush=True)
