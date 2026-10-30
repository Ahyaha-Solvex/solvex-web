# SPEC — 3D

Coordinate mapping from blackbox axes (x forward, y left, z up) to the scene (three.js: right +x, up +y, forward −z):
`scene.x = −bb.y`, `scene.y = bb.z`, `scene.z = −bb.x` (a proper rotation). Impact direction θ (0 front, 90 right, 180 rear, 270 left) as a scene vector from the car center: `(sin θ, 0, −cos θ)`. Put this in `lib/three/axes.ts` with unit tests.

## Stage look (both scenes)
Background `--stage-bg`, fog `--stage-bg` near 18 far 70 (scene) / none (body). Grid floor lines `--stage-grid`. Lighting: hemisphere light (sky `#C7D6CE`, ground `#0B1310`, 0.6), one key directional from top-left (1.1) with soft shadow, one cool rim from behind (0.5). Postprocessing: Bloom with `luminanceThreshold: 0.85`, `intensity: 0.7`, `mipmapBlur`, so only emissive glows bloom. Disable bloom and shadows when `PerformanceMonitor` reports decline.

## Body3D (hospital)
- Model `/models/body.glb`, centered, height normalized to 1.8 units, material override: `MeshStandardMaterial` color `#CFD8D2`, roughness 0.55, metalness 0.05, plus a subtle fresnel rim in `--brand-subtle`.
- Anchors in `lib/three/regions.ts`: `{ id: BodyRegion, side?: 'l'|'r', position: [x,y,z], radius }`. `arms` and `legs` have an anchor per side mapped to the same region id. Positions are placeholders until calibrated in `/lab/body` (Leva panel with draggable sliders per anchor and a "Copy JSON" button that prints the array; the human pastes it back into the file). Mirror anchors across x for L/R so only one side is calibrated.
- Glow for each anchor: an additive sphere (radius from anchors, `transparent`, `depthWrite: false`) with an emissive color by level:
  - unlikely: hidden, only a 4px dot visible on hover.
  - check: `--reg-check`, pulse period 1.6s, opacity 0.25↔0.55.
  - likely: `--reg-likely`, pulse period 1.0s, opacity 0.35↔0.75, plus an expanding ring (scale 1→2, opacity .6→0, 1.4s).
- Hover: scale ×1.15 and a drei `Html` label (region name + level) anchored with `transform` off, 12px text. Selected: persistent ring + label, camera tweens to a per-region focus pose over 600ms `--ease-in-out`.
- Camera: perspective fov 35, default pose front, orbit controls limited: polar 60°–100°, no pan, zoom 1.6–4.0, damping 0.08. Idle auto-rotate 0.6 deg/s after 6s of inactivity, off with reduced motion. "Front/Back" toggles tween to azimuth 0/180.
- Two-way sync with `uiStore.hoveredRegion/selectedRegion`.

## CrashScene (responder)
- Chase camera: 7 m behind, 3.2 m above the car, fov 50, looks 6 m ahead of the car; smooth follow (lerp 0.1). User can orbit within ±35° while the replay is paused.
- World: procedural two-lane road (asphalt `#1B2621`, lane lines `#E8EEEA` 40% dashed), shoulders, a guardrail strip on the impact side, low-poly trees as instanced cones (reduced density), faint grid beyond the road.
- Ego car `/models/car.glb`, body `#DCE3DE`. Other vehicles: instanced low-poly boxes/trucks from `nearbyVehicles` (grey, 55% opacity ghost style like Tesla's surroundings view), moving along their heading at 60 km/h in the sim.
- People: ground markers for `nearbyPeople` (ring + vertical thin beam); helpers_medic red `--stage-impact`, others `--stage-ink`. Labels on hover only.
- Ambulance: `/models/ambulance.glb`, follows `dispatch.polyline` projected to the local scene (meters from the crash site using equirectangular approximation); route drawn as a line in `--stage-route` with chevrons moving toward the crash.
- Replay: the replay store holds `t` in ms over the 16 s window. Pre-impact: car follows the road at `speedKmh1Hz` (interpolated). At `impactAtMs`: car pose driven by integrating the accel/gyro in the scene frame (simple, not physical): apply a camera shake (amplitude from g, 250ms decay) and a red impact arrow (`--stage-impact`, length ∝ ΔV, pointing toward the impact side, fading over 3s). Rollover: rotate the car about its longitudinal axis 360° over 1.2s if `rollover`. After the impact the car decelerates to rest over the remaining window.
- HUD inside the 3D area is HTML overlay only (see SPEC_RESPONDER).
- Drive-mode feel: speed in a large number bottom-center when playing pre-impact (stage-ink, mono, 56px), disappears after impact.

## Calibration and debug
`/lab/body` (anchors) and `?debug=1` on landing (sequence and carousel alignment) are required deliverables, not optional.
