"""Composite transparent renders over the page color: python blender/ivory.py in.png out.png"""
import sys

from PIL import Image

src = Image.open(sys.argv[1]).convert("RGBA")
page = Image.new("RGBA", src.size, (0xFA, 0xF8, 0xF3, 255))
page.alpha_composite(src)
page.convert("RGB").save(sys.argv[2])
