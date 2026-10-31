"""Turn transparent PNG frames and stills into the website's WebP assets and sequence.json.

python blender/export_web.py <frames_dir> [carousel_dir]
Frames are renumbered f_0001... The rendered ground shadows are lightened here.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
ORDER = ("accelerometer", "gyroscope", "gps", "esp32", "gsm", "lora")
SHADOW = 0.6     # ground shadows are pure black with alpha, so they can be scaled after rendering
# Scene frame where each story line takes over, see blender/build_anim.py.
STORY = (("built", 1), ("silent", 80), ("knows", 186), ("parts", 270))


def soften(img):
    a = np.array(img.convert("RGBA"))
    shadow = (a[..., :3].max(axis=2) < 6) & (a[..., 3] < 255)
    a[..., 3][shadow] = (a[..., 3][shadow] * SHADOW).astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def clear(folder):
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("f_*.webp"):
        old.unlink()


def export_frames(src):
    frames = sorted(src.glob("f_*.png"))
    scene_numbers = [int(f.stem[2:]) for f in frames]
    desktop = PUBLIC / "sequence/blackbox/desktop"
    mobile = PUBLIC / "sequence/blackbox/mobile"
    clear(desktop)
    clear(mobile)
    for i, f in enumerate(frames, 1):
        img = soften(Image.open(f))
        width = img.width
        img.save(desktop / f"f_{i:04d}.webp", quality=80, alpha_quality=75, method=4)
        small = img.resize((720, round(720 * img.height / img.width)), Image.Resampling.LANCZOS)
        small.save(mobile / f"f_{i:04d}.webp", quality=74, alpha_quality=70, method=4)
    story = [
        {"key": key, "frame": next(i for i, n in enumerate(scene_numbers) if n >= start)}
        for key, start in STORY
    ]
    return {"count": len(frames), "width": width, "aspect": 16 / 9, "story": story}


def export_stills(src):
    out = PUBLIC / "components"
    out.mkdir(parents=True, exist_ok=True)
    items = {}
    for key in ORDER:
        img = soften(Image.open(src / f"{key}.png"))
        bright = np.array(img)
        solid = bright[..., 3] > 200
        ys, xs = np.where(solid)
        pad = round(img.width * 0.015)
        box = (
            max(xs.min() - pad, 0), max(ys.min() - pad, 0),
            min(xs.max() + pad, img.width), min(ys.max() + pad, img.height),
        )
        crop = img.crop(box)
        crop.save(out / f"{key}.webp", quality=84, alpha_quality=80, method=5)
        items[key] = {
            "cx": round((box[0] + box[2]) / 2 / img.width, 4),
            "cy": round((box[1] + box[3]) / 2 / img.height, 4),
            "w": round((box[2] - box[0]) / img.width, 4),
            "h": round((box[3] - box[1]) / img.height, 4),
        }
    return items


def main():
    data = export_frames(Path(sys.argv[1]))
    # Without a stills folder the carousel images and their layout stay as they are.
    if len(sys.argv) > 2:
        data["carousel"] = export_stills(Path(sys.argv[2]))
    else:
        data["carousel"] = json.loads((ROOT / "src/lib/sequence.json").read_text(encoding="utf-8"))["carousel"]
    (ROOT / "src/lib/sequence.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    sizes = sum(f.stat().st_size for f in (PUBLIC / "sequence/blackbox/desktop").glob("*.webp"))
    print(f"{data['count']} frames, desktop {sizes / 1e6:.1f} MB")


main()
