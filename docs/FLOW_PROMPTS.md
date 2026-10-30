# Flow prompts v2 — black device on white, top-down

Menu names in Flow and Gemini may differ slightly from what is written here; follow the intent.

## What the sequence is
A black blackbox on a pure white background, seen from above. Scroll rotates it, tilts it to a diagonal, opens it, then aligns the seven modules in a horizontal row. The row becomes a focus carousel on the website.

```
K1 closed, top-down, long side horizontal
 └─ clip C1 (rotate in place) ─▶ K2 closed, top-down, long side vertical
     └─ clip C2 (turn + tilt) ─▶ K3 closed, diagonal, tilted view
         └─ clip C3 (push in + open) ─▶ K4 opened: lid bottom-right, body top-left, 7 modules between
             └─ clip C4 (tilt back + align) ─▶ K5 the 7 modules in a horizontal row (you make this one by hand)
```
Four short clips instead of one long one: each clip has an exact first and last frame, which is what stops the AI from morphing the device.

## Order of work (do it in this order)
1. **Component hero images** (7 images). Needed first, because K4 and K5 must show the same parts.
2. **K1**, then K2, K3, K4 using K1 as the device-identity reference.
3. **K5** composite by hand from the component images.
4. **Clips C1–C4** (Flow, first frame + last frame).
5. **Component turntable clips** (7 short videos), can run in parallel with step 4.
6. Extract frames (ffmpeg section).

## Rules for every generation
- **Pure white background (FFFFFF)**, no gradient, no vignette, no floor line. The website blends white into the page color.
- **Black device, not gray.** Matte black with thin edge highlights so the form reads on white.
- **No text, logos or labels anywhere.** The website adds all text.
- 16:9, highest quality available. Several variations per image; pick the one closest to K1's device.
- Keep the visual center of the subject at about **40% from the top** of the frame; the lower third stays empty (text goes there on the website).

## Shared style block (start of every image prompt)
```
Photorealistic studio product render on a pure seamless white background (hex FFFFFF), no gradient, no vignette, no floor line. Soft large overhead softbox lighting with gentle fill; only a soft, subtle contact shadow directly under objects. Premium industrial design, razor sharp, high detail. No text, no logos, no labels, no watermark, no people, no hands, no extra objects.
```

## Device description (reuse in K1–K4)
```
A compact rugged automotive blackbox unit, rectangular enclosure about 140 by 90 by 35 mm, matte black anodized aluminium with fine chamfered edges that catch a thin highlight so the black form reads against white, four small hex screws at the corners, one sealed round connector on one short side, and three tiny round LEDs in a row at the top-left corner of the lid, side by side: one green, one amber, one soft white, each with a faint glow. No other markings.
```

## Step 1 — component hero images (one per component)
Input: your real photo of the part. Do this once per part: accelerometer, gyroscope, GPS (with its antenna), ESP32, GSM + SIM module, LoRa module, antenna.
```
Using the reference photo of the real part: render the same part as a premium studio product shot, isolated on a pure white background (hex FFFFFF), three-quarter view from above, soft contact shadow only. Keep the real part's shape, proportions and component layout exactly. Restyle it: dark matte PCB, small gold pads, no readable text, no printed labels, no logos. No other objects.
```
Keep these images: they feed K4, K5 and the turntable clips. If your photos are bright blue or red boards, the restyle line makes them dark so they match the black device. Check that shapes still match your parts.

## K1 — closed, top-down (start frame)
```
[Shared style block]
[Device description]
Camera: directly overhead, bird's-eye view, 90 degrees top-down, almost no perspective. The device is closed and lies with its long side horizontal. Its visual center is about 40% from the top of the frame and centered horizontally. Its long side is about 28% of the frame width. The lower third of the frame is empty white.
```

## K2 — closed, top-down, rotated
Reference: K1.
```
Using the reference image: exactly the same device, lighting and white background, same overhead camera, same position and scale. The device is rotated 90 degrees in the plane so its long side is now vertical. The LEDs are now at the top-right corner. Nothing else changes.
```
(After a 90-degree clockwise rotation the top-left corner moves to the top-right. If your clip rotates the other way, adjust this sentence to match.)

## K3 — closed, diagonal, tilted view
Reference: K1.
```
Using the reference image: exactly the same device, lighting and white background. The device is turned to a diagonal orientation about 35 degrees off vertical, and the camera has tilted about 30 degrees away from directly overhead, so the top face and two side faces are visible, with slight perspective. Centered about 40% from the top of the frame, long side about 30% of the frame width. The device is still closed. Nothing else changes.
```

## K4 — opened, diagonal, modules between
Reference 1: K3. Reference 2: the seven component hero images as one sheet (grid, no captions).
```
Using the first reference image for the device and the second for the parts: same white background and lighting, the camera has pushed in closer. The device has opened. The lid is lifted toward the viewer and sits large in the bottom-right corner of the frame, partly cropped by the frame edge and slightly out of focus (shallow depth of field). The empty base body sits in the top-left corner, also partly cropped, open side up. Between them, along the same diagonal, seven separate electronic modules float in sharp focus with even gaps and no overlap: a high-g accelerometer board, a gyroscope board, a GPS module with its ceramic patch antenna, an ESP32 board, a GSM cellular module with SIM tray, a LoRa radio module, and a short antenna with a thin coaxial cable. Copy the modules exactly from the second reference image. No text, no logos, no labels.
```

## K5 — the row (make it by hand, do not generate)
Build it in Figma, Photoshop or any editor, 1920×1080, pure white background:
- Remove the background from the 7 component hero images (they are already on white; a simple "multiply" layer mode also works).
- Place them at **y center = 410 px**, **x center = 960 + k × 278.4 px** for k = −3 … 3, each fitted inside a 211×211 box (the antenna: longest side 211 px).
- Left to right: Accelerometer, Gyroscope, GPS, **ESP32 (center)**, GSM + SIM, LoRaWAN, Antenna.
- Add a very faint soft shadow under each part. No lid, no body, no text, nothing else.
- Export PNG. The website uses this exact image as the final frames and lays its carousel on the same coordinates.

## Clips (Flow: frames-to-video; supply the first and last frame)
Duration 5 to 8 seconds each. Keep the white background identical throughout.

**C1 — K1 → K2**
```
Camera locked directly overhead. The device rotates smoothly in place by 90 degrees until its long side is vertical. Smooth, constant motion with gentle ease in and ease out. The LEDs stay lit. Nothing else changes. Pure white background throughout.
```

**C2 — K2 → K3**
```
The device continues to turn to a diagonal orientation while the camera smoothly tilts away from directly overhead to a high angled view, revealing the top face and two side faces. Slow, smooth, elegant. The device stays closed and keeps its exact shape. Pure white background and lighting unchanged.
```

**C3 — K3 → K4**
```
The camera pushes in slowly while the device opens. The lid rises toward the viewer and drifts to the bottom-right corner, becoming large and softly out of focus, partly leaving the frame. The empty base drifts to the top-left corner. Seven separate electronic modules emerge from the base and float into the space between them along the diagonal, settling in sharp focus with even gaps. Smooth, mechanical, precise. Pure white background unchanged.
```

**C4 — K4 → K5**
```
The camera tilts back to directly overhead and the arrangement straightens: the lid slides out of the frame at the bottom-right, the base slides out at the top-left, and the seven modules glide into a straight horizontal row across the upper part of the frame, evenly spaced, upright and sharp. Slow, smooth, elegant. Pure white background unchanged.
```

**Negative prompt** (or append as "Avoid: ...")
```
text, letters, numbers, logos, watermark, the device changing shape, melting, morphing parts, flicker, extra parts appearing, smoke, sparks, people, hands, background color change, dark shadows, lighting change
```

## Component turntable clips (7 short videos)
Input: the component hero image as the first frame. One clip per component.
```
The camera is locked. The component stays centered and slowly rotates about its vertical axis by about 90 degrees at a smooth constant speed. Pure white background, soft studio lighting unchanged, soft shadow stays under it. Nothing else changes. No text. 4 seconds.
```
The website plays each clip forward then backward as a seamless loop, so a 90° sway is enough and no full rotation is needed.

## Quality check before extracting
1. The first frame of each clip equals its supplied first frame; the last equals its last frame.
2. The device keeps the same shape, color and LED layout through all four clips. If the black turns gray or the LEDs disappear, regenerate.
3. The background stays pure white (no gray patches, no gradient).
4. Each clip's last frame matches the next clip's first frame in pose. If not, regenerate the next clip with the **actual last frame of the previous clip** as its first frame.
5. Scrub test: drag through each video. Any jump or pop = regenerate.

Fixes:
- **A clip morphs in the middle:** split it with an intermediate keyframe (two shorter clips).
- **C3 or C4 unusable after several tries:** tell me. Fallback options: more intermediate keyframes, or a real 3D exploded model in the browser for that part.
- **Parts differ between K4 and K5:** regenerate K4 with the same component sheet and the line "copy the modules exactly".

## Extract the frames
Put the clips next to each other as `c1.mp4 … c4.mp4`, and the K5 composite as `k5.png`.
```bash
# 1. join the four clips
printf "file 'c1.mp4'\nfile 'c2.mp4'\nfile 'c3.mp4'\nfile 'c4.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -crf 14 -pix_fmt yuv420p joined.mp4

# 2. desktop frames: 10 fps, 1600 px wide. The curves filter pushes near-white to pure white,
#    so the multiply blend on the website leaves no visible box. Check that the black stays black.
mkdir -p public/sequence/blackbox/desktop
ffmpeg -i joined.mp4 -vf "fps=10,scale=1600:-2,curves=all='0/0 0.92/1 1/1'" -q:v 78 public/sequence/blackbox/desktop/f_%04d.webp

# 3. mobile frames: 5 fps, 800 px wide
mkdir -p public/sequence/blackbox/mobile
ffmpeg -i joined.mp4 -vf "fps=5,scale=800:-2,curves=all='0/0 0.92/1 1/1'" -q:v 76 public/sequence/blackbox/mobile/f_%04d.webp

# 4. append the exact K5 composite as 8 extra frames at the end (desktop and mobile)
N=$(ls public/sequence/blackbox/desktop | wc -l)
ffmpeg -i k5.png -vf "scale=1600:-2" -q:v 80 k5_desktop.webp
for i in $(seq 1 8); do cp k5_desktop.webp "public/sequence/blackbox/desktop/f_$(printf %04d $((N+i))).webp"; done
M=$(ls public/sequence/blackbox/mobile | wc -l)
ffmpeg -i k5.png -vf "scale=800:-2" -q:v 78 k5_mobile.webp
for i in $(seq 1 8); do cp k5_mobile.webp "public/sequence/blackbox/mobile/f_$(printf %04d $((M+i))).webp"; done

# 5. write the frame counts and clip boundaries for the site
node scripts/count-frames.mjs
```
Budget: about 24 to 30 s of video gives roughly 250 to 300 desktop frames; white backgrounds compress well, so aim for under 15 MB total. If heavier, lower `-q:v` to 70 or the width to 1440. If scrubbing looks steppy, raise the desktop fps to 14.

## Component clips and posters (ping-pong loop, no seam)
```bash
mkdir -p public/components
for id in accelerometer gyroscope gps esp32 gsm lora antenna; do
  ffmpeg -i "turntable_${id}.mp4" -an \
    -filter_complex "[0:v]scale=720:-2,curves=all='0/0 0.92/1 1/1',split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]" \
    -map "[v]" -c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart "public/components/${id}.mp4"
  ffmpeg -i "turntable_${id}.mp4" -frames:v 1 -vf "scale=720:-2,curves=all='0/0 0.92/1 1/1'" -q:v 80 "public/components/${id}.webp"
done
```
Each file plays forward then in reverse, so the loop point is invisible.

## Plan B for the turntables
If the AI turntables look unstable, the same carousel can use real 3D models of the modules rotating in the browser. Tell me and I'll spec it.

## Next step
Send me the component hero images, K1, and K4 when you have them. I'll check the proportions, the layout numbers for K5, and the position of the text zone before you wire anything.
