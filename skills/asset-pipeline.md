# Skill — assets

## Models
```
npx gltf-transform optimize in.glb public/models/body.glb --compress meshopt --texture-compress webp
```
Target under 3 MB each. Load with drei `useGLTF`. If a model has no useful naming, do not rely on mesh names: use anchors (`SPEC_3D.md`).

## Blackbox frames
Real frames come from the Flow videos (see `FLOW_PROMPTS.md`). Placeholder frames to build the landing before the real ones exist:
```
ffmpeg -f lavfi -i testsrc2=size=1600x900:rate=12:duration=16 -vf "format=yuv420p" -q:v 80 public/sequence/blackbox/desktop/f_%04d.webp
ffmpeg -f lavfi -i testsrc2=size=800x450:rate=6:duration=16 -vf "format=yuv420p" -q:v 80 public/sequence/blackbox/mobile/f_%04d.webp
node scripts/count-frames.mjs   # writes src/lib/sequence.json
```
`scripts/count-frames.mjs` counts `f_*.webp` in each folder and writes `{ "desktop": { "count": N }, "mobile": { "count": M } }`.
