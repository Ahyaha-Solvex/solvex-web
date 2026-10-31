"""Straighten board photos into flat textures. python blender/prep_textures.py"""
from pathlib import Path

from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).parent
SHEET = Image.open(ROOT.parent / "assets/landing page/sensors/components.png").convert("RGB")


def rectify(name, corners, size):
    """corners: TL, TR, BR, BL in components.png pixels."""
    w, h = size
    flat = [c for p in corners for c in p]
    # PIL's QUAD maps the output rectangle from NW, SW, SE, NE source corners.
    tl, tr, br, bl = corners
    quad = (*tl, *bl, *br, *tr)
    out = SHEET.transform(size, Image.Transform.QUAD, quad, Image.Resampling.BICUBIC)
    out = out.filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    out.save(ROOT / "textures" / f"{name}.jpg", quality=92)
    return flat


# Sheet crops were taken at origin (3760, 520) for GSM and (0, 0) for LoRa.
gx, gy = 3760, 520
rectify("gsm", [(gx + 333, gy + 225), (gx + 990, gy + 236), (gx + 977, gy + 683), (gx + 326, gy + 668)], (1600, 1100))
rectify("lora", [(58, 48), (897, 48), (897, 1822), (58, 1822)], (1000, 2112))
