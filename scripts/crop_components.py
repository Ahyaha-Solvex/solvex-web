import os
import numpy as np
from PIL import Image
from pathlib import Path
import subprocess

def main():
    root = Path(__file__).resolve().parent.parent
    k5_path = root / "assets" / "landing page" / "frames" / "1" / "k5.png"
    im = Image.open(k5_path).convert('RGB')
    arr = np.array(im)
    w, h = im.size

    out_dir = root / "public" / "components"
    out_dir.mkdir(parents=True, exist_ok=True)

    # In K5, we have 7 components.
    # Let's define the bounding box for each:
    # 0: lora (10, 220)
    # 1: esp32 (300, 535)
    # 2: gyroscope (610, 830)
    # 3: gsm (915, 1145)
    # 4: antenna (1145, 1260) -> Note: in k5, region 3 has antenna peg + sim800l, region 4 has antenna wire.
    #    Let's combine region 3 & 4 or extract GSM as SIM800L and Antenna as wire + antenna!
    # 5: accelerometer (1340, 1545)
    # 6: gps (1605, 1915)

    comp_boxes = {
        'lora': (10, 220),
        'esp32': (300, 535),
        'gyroscope': (610, 830),
        'gsm': (970, 1145),
        'antenna': (915, 985, 1145, 1260), # includes the antenna peg and cable
        'accelerometer': (1340, 1545),
        'gps': (1605, 1915)
    }

    # Better yet, let's extract each component by its mask
    mask = arr.mean(axis=2) < 250

    crops = {
        'lora': (5, 300, 225, 780),
        'esp32': (300, 300, 535, 780),
        'gyroscope': (610, 380, 830, 700),
        'gsm': (975, 430, 1145, 650),
        'antenna': (915, 380, 1260, 700),
        'accelerometer': (1340, 380, 1545, 700),
        'gps': (1605, 320, 1915, 760)
    }

    for comp_id, box in crops.items():
        crop = im.crop(box)
        # Create square 720x720 canvas with pure white background
        cw, ch = crop.size
        side = max(cw, ch) + 80
        square = Image.new('RGB', (side, side), (255, 255, 255))
        ox = (side - cw) // 2
        oy = (side - ch) // 2
        square.paste(crop, (ox, oy))
        final_img = square.resize((720, 720), Image.Resampling.LANCZOS)
        
        # Save poster webp
        webp_path = out_dir / f"{comp_id}.webp"
        final_img.save(webp_path, "WEBP", quality=85)
        print(f"Saved {webp_path}")

        # Create 4s subtle turntable ping-pong mp4 video loop
        # Simple subtle 3D-feel zoom/rotate sway or static video
        mp4_path = out_dir / f"{comp_id}.mp4"
        cmd = (
            f'ffmpeg -y -loop 1 -t 4 -i "{webp_path}" '
            f'-vf "scale=720:720,format=yuv420p" '
            f'-c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart "{mp4_path}"'
        )
        subprocess.run(cmd, shell=True, capture_output=True)
        print(f"Saved {mp4_path}")

if __name__ == "__main__":
    main()
