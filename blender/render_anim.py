"""Final Cycles frames with transparent background and real shadows.

blender -b blender/solvex_blackbox.blend -P blender/render_anim.py -- out_dir first last step [samples] [percent]
Frames already on disk are skipped, so a stopped render can resume.
"""
import sys
import time
from pathlib import Path

import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
out_dir = Path(argv[0])
first, last, step = int(argv[1]), int(argv[2]), int(argv[3])
samples = int(argv[4]) if len(argv) > 4 else 24
percent = int(argv[5]) if len(argv) > 5 else 100

scene = bpy.context.scene
render = scene.render
render.resolution_x, render.resolution_y = 1600, 900
render.resolution_percentage = percent
render.film_transparent = True
render.use_persistent_data = True
render.image_settings.file_format = "PNG"
render.image_settings.color_mode = "RGBA"

cycles = scene.cycles
cycles.device = "CPU"
cycles.samples = samples
cycles.use_adaptive_sampling = True
cycles.adaptive_threshold = 0.03
cycles.use_denoising = True
cycles.denoiser = "OPENIMAGEDENOISE"
cycles.seed = 7
cycles.use_animated_seed = False
cycles.max_bounces = 5
cycles.diffuse_bounces = 2
cycles.glossy_bounces = 3
cycles.transmission_bounces = 0
cycles.volume_bounces = 0
cycles.caustics_reflective = False
cycles.caustics_refractive = False

out_dir.mkdir(parents=True, exist_ok=True)
for frame in range(first, last + 1, step):
    path = out_dir / f"f_{frame:04d}.png"
    if path.exists():
        continue
    scene.frame_set(frame)
    render.filepath = str(path)
    start = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"@@ {frame}: {time.time() - start:.1f}s", flush=True)
