# Checkpoint Report: CP3 — Hospital (`/hospital`)

## Status: COMPLETE (Ready for Review Gate)

### Deliverables Completed

All required CP3 deliverables per `docs/PLAN.md`, `docs/SPEC_HOSPITAL.md`, and `docs/SPEC_3D.md` have been fully delivered, tested, and visually verified across `fr`, `en`, and `ar` (RTL):

#### 1. Three.js Foundations & Coordinate Systems
- [x] **`src/lib/three/axes.ts`**: Strict coordinate mapping from blackbox sensor space (+x forward, +y left, +z up) to Three.js scene space (+x right, +y up, -z forward):
  - `scene.x = -bb.y`, `scene.y = bb.z`, `scene.z = -bb.x` (proper SO(3) rotation with determinant = +1).
  - Impact direction vector mapping from angle $\theta$ (0° front, 90° right, 180° rear, 270° left) to scene vector $(\sin \theta, 0, -\cos \theta)$.
  - 100% test coverage in `src/lib/three/__tests__/axes.test.ts`.
- [x] **`src/lib/three/regions.ts`**: Anchor specifications (`{ id: BodyRegion, side?: 'l'|'r', position: [x,y,z], radius }`) for all 7 body regions (head, face, spine & neck, thorax, abdomen, arms, legs). Symmetrical mirroring for arms and legs across x-axis. Default camera focus poses for 600ms transitions. Verified in `src/lib/three/__tests__/regions.test.ts`.
- [x] **`src/lib/three/materials.ts`**: Aligned stage palette tokens (`--stage-bg: #0B1310`, `--stage-grid: #17231E`, `--reg-check: #E68A00`, `--reg-likely: #D9383A`). Custom `MeshStandardMaterial` for body (`#CFD8D2`, roughness 0.55, metalness 0.05) with subtle fresnel rim in `--brand-subtle` via shader onBeforeCompile, and ghost wireframe silhouette for empty state.

#### 2. 3D Body Stage Component (`Body3D`)
- [x] **`src/components/stage/Body3D.tsx`**: WebGL Canvas with:
  - Single `<Canvas>` per page, loaded dynamically via `next/dynamic` with `ssr: false` per Rule 11.
  - Adaptive resolution with `dpr={[1, 1.75]}` and Drei `PerformanceMonitor`.
  - Pause render loops when tab is hidden (`frameloop={isTabVisible ? 'always' : 'never'}` per Rule 11).
  - Additive glowing anchor spheres with sine-wave pulses:
    - `likely`: period 1.0s, opacity 0.35↔0.75 + expanding ring (scale 1→2, opacity 0.6→0, 1.4s).
    - `check`: period 1.6s, opacity 0.25↔0.55.
    - `unlikely`: hidden unless hovered/selected (4px dot).
  - Hover scale $\times 1.15$ and Drei `Html` 12px badge anchored with `transform` off.
  - OrbitControls constrained to polar 60°–100°, no pan, zoom 1.6–4.0, damping 0.08.
  - Idle auto-rotate 0.6 deg/s after 6s of inactivity (disabled under `prefers-reduced-motion`).
  - Smooth camera tweening (600ms ease-in-out curve) when selecting regions or toggling Front/Back views.
  - Postprocessing: Bloom with `luminanceThreshold: 0.85`, `intensity: 0.7`, `mipmapBlur`.

#### 3. Anchor Calibration Tool at `/lab/body`
- [x] **`src/app/[locale]/(app)/lab/body/page.tsx` & `src/components/stage/BodyCalibrationView.tsx`**:
  - Live 3D body stage inside `StageFrame` in calibration mode with draggable anchor gizmos and visual spheres.
  - Controls panel with Sliders and InputNumbers for X, Y, Z coordinates and hitbox radius.
  - Real-time symmetrical mirroring: adjusting the right arm or leg immediately mirrors the left side in 3D.
  - Region quick switcher pills for all 7 regions.
  - "Copy JSON" button with copy feedback, clipboard export, and console printout.
  - "Reset to Baseline" button.

#### 4. Hospital View (`/hospital`)
- [x] **`src/app/[locale]/(app)/hospital/page.tsx` & `src/components/hospital/HospitalDashboard.tsx`**:
  - **Top bar (56px)**: Brand title ("SolveX"), role switcher (`Segmented`: Responder | Hospital), language selector (`LangSwitcher`), and honesty label (`SimBadge`).
  - **Patient Tab Strip**: Ant `Tabs` type `card`, one tab per occupant with triage color dot (green/yellow/red/black), label ("Patient A"), blood type pill, and pulse animation on new incident arrival.
  - **Offline Banner**: Ant `Alert` banner when `!online` ("Connection lost — showing last known data").
  - **New Patient Notification**: Ant `notification.info` ("New incoming patient") when an incident arrives while view is open.
  - **Full-page Empty State**: Displays when no active patients exist, with scenario panel trigger button.
  - **3-Column Layout (≥1280)**:
    - **Left rail (320px)**:
      1. Arrival card: `Eta` countdown in `mm:ss`, ambulance unit tag, origin road label, vertical lifecycle `Steps` (detected → dispatched → on_scene → transporting → at_hospital).
      2. Patient profile: `Descriptions` (Age, Sex, Blood type, Chronic diseases, Allergies, Medications, warning tag "Blood thinners", "Pregnant", Emergency contact phone in mono `dir="ltr"`).
      3. Severity card: Large `SeverityTag` + ranking score percentage + `escalatedBy` line + medical disclaimer caption ("Estimate to prioritise, not a diagnosis.").
    - **Center stage (sticky full height minus chrome)**:
      - `StageFrame` containing `Body3D`.
      - Unmasked overlay controls: Front / Back / Free view switcher, M4 estimate tooltip badge, `RegionLegend`, bottom-center caption, and "Reset view" button.
    - **Right rail (392px)**:
      1. Injury map card: 7 `RegionRow`s ordered by level (`likely` > `check` > `unlikely`) then probability descending.
         - Two-way sync: hover row -> glows body region + label; click row -> selects region and tweens camera; keyboard focusable with Enter key to select. Hovering or clicking the 3D body highlights/selects the row.
      2. Live vitals: `VitalsCard` with HR, SpO₂, BP, 60-point sparklines, threshold alert hints ("display hint").
      3. Prepare card: `PrepChecklist` with interactive checkboxes and reasons from `incident.prep`.
      4. Beds & specialties card: Receiving hospital free beds `Statistic`, specialties tags, and hospital ETA.

---

### Verification Suite

- **TypeScript**: `pnpm typecheck` (`tsc --noEmit`) → **0 errors**.
- **ESLint**: `pnpm lint` (`next lint`) → **0 warnings, 0 errors**.
- **Vitest Unit Tests**: `pnpm test` (`vitest run`) → **41 / 41 passed** across 8 test suites.
- **i18n Key Parity**: `pnpm i18n:check` → **214 / 214 matching keys** across `fr`, `en`, and `ar`.
- **Production Build**: `pnpm build` (`next build`) → **Succeeded**, 24 SSG static pages generated.
- **Visual Browser Verification (Playwright)**: Verified on Chromium at 1440×900:
  - English overview (`/en/hospital`)
  - Arabic RTL layout (`/ar/hospital`) with correct logical layout alignment
  - 3D region selection & 600ms camera focus tween
  - 3D body calibration tool (`/en/lab/body`) with slider adjustments and JSON clipboard export

---

### Screenshots

- Hospital Overview (English LTR): [`docs/screenshots/cp3-hospital-overview.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp3-hospital-overview.png)
- Hospital Arabic RTL (`/ar/hospital`): [`docs/screenshots/cp3-hospital-arabic-rtl.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp3-hospital-arabic-rtl.png)
- 3D Body Region Focus & Selection: [`docs/screenshots/cp3-hospital-region-focus.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp3-hospital-region-focus.png)
- 3D Body Calibration Tool (`/lab/body`): [`docs/screenshots/cp3-lab-body-calibration.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp3-lab-body-calibration.png)
- 3D Body Calibration JSON Export: [`docs/screenshots/cp3-lab-body-copied.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp3-lab-body-copied.png)

---

### Deviations
None. All components adhere strictly to `SPEC_HOSPITAL.md`, `SPEC_3D.md`, and `DESIGN.md`.

### Known Issues
None.

---

### Review Gate
Per **Hard Rule 3** in `GEMINI.md`:
Work on **CP3** is complete. Execution is stopped at this gate awaiting explicit human approval:
`approved CP3`
