import os
import numpy as np
from PIL import Image

def generate_c4(c3_last_frame_path, k5_path, output_dir, num_frames=75):
    os.makedirs(output_dir, exist_ok=True)
    im_c3 = Image.open(c3_last_frame_path).convert('RGB')
    im_k5 = Image.open(k5_path).convert('RGB')
    w, h = 1920, 1080
    im_c3 = im_c3.resize((w, h), Image.Resampling.LANCZOS)
    im_k5 = im_k5.resize((w, h), Image.Resampling.LANCZOS)

    arr_c3 = np.array(im_c3, dtype=np.float32)
    arr_k5 = np.array(im_k5, dtype=np.float32)

    # Shell mask: base (top-left) and lid (bottom-right)
    # Background is near white (e.g. > 245)
    y_coords, x_coords = np.mgrid[0:h, 0:w]
    
    # Base is top-left: x + y < 800 and not white
    is_base = (x_coords * 0.8 + y_coords < 750) & (arr_c3[:, :, :3].mean(axis=2) < 245)
    # Lid is bottom-right: x + y > 2100 and not white
    is_lid = (x_coords * 0.8 + y_coords > 2000) & (arr_c3[:, :, :3].mean(axis=2) < 245)

    base_layer = np.full((h, w, 4), 0, dtype=np.float32)
    base_layer[is_base, :3] = arr_c3[is_base, :3]
    base_layer[is_base, 3] = 255.0

    lid_layer = np.full((h, w, 4), 0, dtype=np.float32)
    lid_layer[is_lid, :3] = arr_c3[is_lid, :3]
    lid_layer[is_lid, 3] = 255.0

    # Modules layer: everything else in c3 that is not white
    is_modules = (~is_base) & (~is_lid)

    for i in range(num_frames):
        t = i / (num_frames - 1)
        # Smoothstep easing
        ease = t * t * (3 - 2 * t)
        
        # Canvas starts pure white
        canvas = np.full((h, w, 3), 255.0, dtype=np.float32)

        # 1. Base slides top-left and fades
        base_dx = int(-600 * ease)
        base_dy = int(-400 * ease)
        base_alpha = max(0.0, 1.0 - ease * 1.5)

        # 2. Lid slides bottom-right and fades
        lid_dx = int(600 * ease)
        lid_dy = int(400 * ease)
        lid_alpha = max(0.0, 1.0 - ease * 1.5)

        # Render c3 with movement
        shifted_c3 = np.full((h, w, 3), 255.0, dtype=np.float32)
        
        # Paste modules
        shifted_c3[is_modules] = arr_c3[is_modules]

        # Shift base
        if base_alpha > 0:
            pil_base = Image.fromarray(base_layer.astype(np.uint8), mode='RGBA')
            base_canvas = Image.new('RGBA', (w, h), (255, 255, 255, 0))
            base_canvas.paste(pil_base, (base_dx, base_dy), pil_base)
            arr_shifted_base = np.array(base_canvas, dtype=np.float32)
            alpha_b = (arr_shifted_base[:, :, 3:] / 255.0) * base_alpha
            shifted_c3 = shifted_c3 * (1.0 - alpha_b) + arr_shifted_base[:, :, :3] * alpha_b

        # Shift lid
        if lid_alpha > 0:
            pil_lid = Image.fromarray(lid_layer.astype(np.uint8), mode='RGBA')
            lid_canvas = Image.new('RGBA', (w, h), (255, 255, 255, 0))
            lid_canvas.paste(pil_lid, (lid_dx, lid_dy), pil_lid)
            arr_shifted_lid = np.array(lid_canvas, dtype=np.float32)
            alpha_l = (arr_shifted_lid[:, :, 3:] / 255.0) * lid_alpha
            shifted_c3 = shifted_c3 * (1.0 - alpha_l) + arr_shifted_lid[:, :, :3] * alpha_l

        # Crossfade between shifted_c3 and arr_k5
        # Modules align and blend seamlessly into k5
        blend_k5 = min(1.0, ease * 1.25)
        frame = shifted_c3 * (1.0 - blend_k5) + arr_k5 * blend_k5

        out_img = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8), mode='RGB')
        out_img.save(os.path.join(output_dir, f'c4_{i:04d}.jpg'), quality=95)

if __name__ == '__main__':
    generate_c4('tmp_inspect/c3_tail_07.jpg', 'assets/landing page/frames/1/k5.png', 'tmp_inspect/c4_frames', 75)
    print('Generated 75 frames for c4')
