import os
import subprocess
import json
import shutil
from pathlib import Path

def run_cmd(cmd):
    print("Running:", cmd)
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print("STDERR:", res.stderr)
        raise RuntimeError(f"Command failed with code {res.returncode}")
    return res.stdout

def main():
    root = Path(__file__).resolve().parent.parent
    assets_dir = root / "assets" / "landing page" / "frames" / "1"
    tmp_dir = root / "tmp_build_seq"
    tmp_dir.mkdir(exist_ok=True)
    
    clips = ["c1.mp4", "c2.mp4", "c3.mp4", "c4.mp4"]
    norm_clips = []
    
    # 1. Normalize clips to 24fps 1920x1080 without audio
    for i, c in enumerate(clips):
        in_path = assets_dir / c
        out_path = tmp_dir / f"norm_{i}.mp4"
        norm_clips.append(out_path)
        cmd = f'ffmpeg -y -i "{in_path}" -an -r 24 -s 1920x1080 -c:v libx264 -crf 14 -pix_fmt yuv420p "{out_path}"'
        run_cmd(cmd)

    # 2. Concat list
    list_path = tmp_dir / "list.txt"
    with open(list_path, "w") as f:
        for p in norm_clips:
            f.write(f"file '{p.as_posix()}'\n")

    joined_path = tmp_dir / "joined.mp4"
    run_cmd(f'ffmpeg -y -f concat -safe 0 -i "{list_path}" -c:v copy "{joined_path}"')

    # Get duration of each clip to compute frame boundaries
    clip_durations = []
    for p in norm_clips:
        out = run_cmd(f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{p}"')
        clip_durations.append(float(out.strip()))
    
    print("Clip durations (s):", clip_durations)

    # 3. Desktop frames: 10 fps, 1600 px wide
    desktop_dir = root / "public" / "sequence" / "blackbox" / "desktop"
    if desktop_dir.exists():
        shutil.rmtree(desktop_dir)
    desktop_dir.mkdir(parents=True, exist_ok=True)

    cmd_desktop = (
        f'ffmpeg -y -i "{joined_path}" '
        f'-vf "fps=10,scale=1600:-2,curves=all=0/0 0.92/1 1/1" '
        f'-c:v libwebp -q:v 78 -f image2 "{desktop_dir}/f_%04d.webp"'
    )
    run_cmd(cmd_desktop)

    # 4. Mobile frames: 5 fps, 800 px wide
    mobile_dir = root / "public" / "sequence" / "blackbox" / "mobile"
    if mobile_dir.exists():
        shutil.rmtree(mobile_dir)
    mobile_dir.mkdir(parents=True, exist_ok=True)

    cmd_mobile = (
        f'ffmpeg -y -i "{joined_path}" '
        f'-vf "fps=5,scale=800:-2,curves=all=0/0 0.92/1 1/1" '
        f'-c:v libwebp -q:v 76 -f image2 "{mobile_dir}/f_%04d.webp"'
    )
    run_cmd(cmd_mobile)

    # 5. Append exact K5 composite (8 extra frames)
    k5_path = assets_dir / "k5.png"
    
    # Desktop K5
    k5_desktop = tmp_dir / "k5_desktop.webp"
    run_cmd(f'ffmpeg -y -i "{k5_path}" -vf "scale=1600:-2" -c:v libwebp -q:v 80 -f image2 "{k5_desktop}"')
    
    desktop_files = sorted(list(desktop_dir.glob("f_*.webp")))
    n_desktop = len(desktop_files)
    for i in range(1, 9):
        dest = desktop_dir / f"f_{n_desktop + i:04d}.webp"
        shutil.copy(k5_desktop, dest)

    # Mobile K5
    k5_mobile = tmp_dir / "k5_mobile.webp"
    run_cmd(f'ffmpeg -y -i "{k5_path}" -vf "scale=800:-2" -c:v libwebp -q:v 78 -f image2 "{k5_mobile}"')
    
    mobile_files = sorted(list(mobile_dir.glob("f_*.webp")))
    n_mobile = len(mobile_files)
    for i in range(1, 9):
        dest = mobile_dir / f"f_{n_mobile + i:04d}.webp"
        shutil.copy(k5_mobile, dest)

    total_desktop = len(list(desktop_dir.glob("f_*.webp")))
    total_mobile = len(list(mobile_dir.glob("f_*.webp")))

    # Calculate clip boundaries for desktop (10 fps)
    cum_t = 0.0
    clips_meta = []
    clip_names = ["c1", "c2", "c3", "c4"]
    for name, dur in zip(clip_names, clip_durations):
        start_f = int(cum_t * 10) + 1
        cum_t += dur
        end_f = int(cum_t * 10)
        clips_meta.append({
            "id": name,
            "duration": round(dur, 2),
            "startFrame": start_f,
            "endFrame": min(end_f, n_desktop)
        })

    clips_meta.append({
        "id": "k5_hold",
        "duration": 0.8,
        "startFrame": n_desktop + 1,
        "endFrame": total_desktop
    })

    meta = {
        "desktop": {
            "count": total_desktop,
            "fps": 10,
            "width": 1600,
            "clips": clips_meta
        },
        "mobile": {
            "count": total_mobile,
            "fps": 5,
            "width": 800
        }
    }

    out_json = root / "src" / "lib" / "sequence.json"
    with open(out_json, "w") as f:
        json.dump(meta, f, indent=2)

    print("Successfully generated sequence:")
    print("Desktop frames:", total_desktop)
    print("Mobile frames:", total_mobile)
    print("Sequence JSON written to:", out_json)

if __name__ == "__main__":
    main()
