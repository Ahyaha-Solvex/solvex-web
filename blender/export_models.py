"""Export each carousel module to public/models/components/<id>.glb for the live centre piece.

python blender/mcp_run.py blender/export_models.py
"""
from pathlib import Path

import bpy

ORDER = ("accelerometer", "gyroscope", "gps", "esp32", "gsm", "lora")
OUT = Path(r"E:\Project\SOLVEX\public\models\components")
OUT.mkdir(parents=True, exist_ok=True)

report = {}
for key in ORDER:
    root = bpy.data.objects["C_%s_root" % key]
    anim = root.parent
    root.parent = None
    bpy.ops.object.select_all(action="DESELECT")
    for ob in [root] + list(root.children_recursive):
        ob.hide_viewport = False
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root
    path = OUT / f"{key}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_image_format="WEBP",
        export_image_quality=80,
    )
    root.parent = anim
    report[key] = round(path.stat().st_size / 1e6, 2)
bpy.ops.object.select_all(action="DESELECT")
result = report
