# Checkpoint Report: CP4 — Responder (`/responder`)

## Status: COMPLETE (Ready for Review Gate)

### Deliverables Completed

All required CP4 deliverables per `docs/PLAN.md`, `docs/SPEC_RESPONDER.md`, and `docs/SPEC_3D.md` have been fully delivered, tested, and visually verified across `fr`, `en`, and `ar` (RTL):

#### 1. Protection Civile Dispatcher Console (`/responder`)
- [x] **`src/app/[locale]/(app)/responder/page.tsx` & `src/components/responder/ResponderDashboard.tsx`**:
  - **Top Bar (56px)**: Brand title ("أَحْيَاهَا"), Protection Civile tag, role switcher (`Segmented`: Responder | Hospital), language switcher (`LangSwitcher`), and honesty label (`SimBadge`).
  - **Offline Banner**: Ant `Alert` banner when `!online` ("Network off — SMS mode: Blackbox telemetry unreachable. Degrading to 160-char raw emergency feeds.").
  - **3-Column Layout (≥1280)**:
    - **Left rail (320px) — Incident Queue**:
      - `Segmented` filter: `All` | `Needs action` | `Dispatched`.
      - Ant `List` of `IncidentRow` sorted by confidence score descending, then newest first.
      - Confidence dot coloring (40–70 grey, 70–90 yellow, 90+ red), road label, time, small `SeverityTag`, `StatusTag`, and channel icon (data vs SMS).
      - Selected state per DESIGN (1.5px brand border, `--brand-subtle` background, inline-start 3px brand bar).
      - Nearby helpers summary card below the queue with emergency medics highlighted with `--sev-extreme` red dot.
    - **Center Stage — 3D Scene & PiP Map**:
      - `StageFrame` (560px height) featuring dark stage mask and unmasked interactive overlay sibling.
      - Two view modes with smooth swap: **3D Scene** (default) or **Full Map**.
      - In 3D Scene mode:
        - top-start: `Segmented` switcher (Scene | Map).
        - top-end: `ReplayControls` with play/pause, 16s scrubber slider with impact marker at T=0 (5.0s), 0.25× / 0.5× / 1.0× speed selector, and T=0 quick jump.
        - bottom-start: `TelemetryReadout` (Speed km/h, ΔV km/h, Direction ° + rotating compass glyph, Peak g, Rollover yes/no, Multi-impact yes/no).
        - bottom-center: `TelemetryTrace` strip (resultant g waveform over time, 80px high, clickable playhead cursor synced to replay clock).
        - bottom-end: `MiniMap` picture-in-picture (240×160px with swap button).
      - In Full Map mode: Map fills the entire stage; 3D Scene becomes the PiP preview.
      - Degraded SMS-only fallback: static car, overlay banner "SMS only — no telemetry. Position and severity from the message." with raw 160-char SMS mono readout.
    - **Right rail (392px) — Incident Details & Dispatcher Actions**:
      - **Header**: Road label (`EnvironmentOutlined`), timestamp, `StatusTag`, and 4-step `ConfidenceLadder` (Suspected → Likely → Witness-confirmed → Confirmed).
      - **2×2 Dispatcher Actions Grid**:
        1. **Confirm crash** (primary button; sets confirmed status; disabled once confirmed).
        2. **Assign ambulance** (opens Ambulance Fleet Dispatch drawer).
        3. **Call for help** (popover with 500–5000m radius slider and broadcast alert button).
        4. **Close mission** (danger button with `Popconfirm` confirmation).
      - **Triage & Severity (M3)**: Large `SeverityTag` + ranking score percentage + medical estimate disclaimer ("Estimate to prioritise, not a diagnosis.") + per-occupant triage list with colored status dots.
      - **Ambulance Dispatch & Hospital Suggestion**: Recommended `HospitalOptionCard` with free beds, specialties tags, ETA, and "Why" reasons + alternatives list with "Direct to hospital" buttons.
      - **Timeline**: `TimelineList` sorted newest on top.
      - **SMS Feed**: `SmsFeed` with raw mono line (`dir="ltr"`), direction icons, and network status badge.
      - **Nearby First Responders**: `NearbyPeopleList` with distance, kind icons, and acceptance status.
    - **Mobile Drawers (<1280)**: Responsive buttons open Queue Drawer and Detail Drawer on smaller screens.

#### 2. Tesla-Style 3D Crash Scene (`CrashScene`)
- [x] **`src/components/stage/CrashScene.tsx`**:
  - Single WebGL `<Canvas>` loaded dynamically with `ssr: false`, `dpr={[1, 1.75]}`, tab visibility pause (`frameloop={isTabVisible ? 'always' : 'never'}`).
  - **Procedural Two-Lane Road**: Asphalt surface (`#1B2621`), dashed white center lines (`#E8EEEA`), shoulders (`#141C18`), metallic guardrail on impact side, low-poly instanced trees, faint grid beyond the road, and fog (`#0B1310`, near 18, far 70).
  - **Ego Car (`/models/car.glb`)**: Tinted body `#DCE3DE`, spinning wheels, physics-driven trajectory driven by `useReplayStore`:
    - Pre-impact ($t < 5000\text{ms}$): travels along lane towards origin at initial speed.
    - At impact ($t = 5000\text{ms}$): deceleration slide, camera shake with 250ms decay, 3D red impact arrow (`--stage-impact`, length $\propto \Delta V$, pointing toward impact side, fading over 3s).
    - Rollover: $360^\circ$ rotation around longitudinal axis over 1.2s if `crash.rollover === true`.
  - **Surrounding Vehicles**: Ghost-style instanced low-poly vehicles from `nearbyVehicles` (55% opacity).
  - **Nearby People Markers**: Ground beacon rings + vertical thin luminous beams; medics red (`--stage-impact`), others `--stage-ink`. Interactive hover tooltip with distance and role.
  - **Ambulance (`/models/ambulance.glb`)**: Positioned along incoming route with luminous response route in `--stage-route` (`#F2B705`) and flashing roof beacon.
  - **Chase Camera**: 7m behind, 3.2m above car, looking 6m ahead (`lerp 0.1` smooth follow). Orbit controls allow $\pm 35^\circ$ azimuth inspection when paused.
  - **Drive-Mode Speed HUD**: 56px mono tabular number bottom-center during pre-impact playback; hides post-impact.

#### 3. Picture-in-Picture MiniMap (`MiniMap`)
- [x] **`src/components/stage/MiniMap.tsx`**:
  - MapLibre GL map with local web worker (`public/maplibre-gl-worker.mjs`).
  - Crash pin with confidence color (40–70 grey, 70–90 yellow, 90+ red with animated pulse ring).
  - 500m safety perimeter circle (GeoJSON polygon with dashed boundary).
  - Assigned ambulance marker + animated route polyline in `--brand` (`#006233`).
  - Nearby helper markers (emergency medics in red, others in brand green).
  - PiP mode (240×160px with hover expand button) and Full mode (fills stage with navigation controls).

#### 4. Telemetry Replay Clock & Controls
- [x] **`src/lib/stores/replayStore.ts`**: Zustand store for 16-second recording window (0–16000ms) with impact point at 5000ms, playback tick loop, speed multiplier (0.25×, 0.5×, 1.0×), and time scrubbing.
- [x] **`src/components/stage/ReplayControls.tsx`**: Scrubber bar with impact tick marker, play/pause toggle, and timestamp readout.
- [x] **`src/components/stage/TelemetryReadout.tsx`**: Monospace readouts for speed, $\Delta V$, impact angle with rotating compass glyph, peak deceleration, rollover, and multi-impact.
- [x] **`src/components/stage/TelemetryTrace.tsx`**: 80px SVG strip rendering resultant $g$-force waveform over time, with impact indicator and interactive playhead cursor.

---

### Verification Suite

- **TypeScript**: `pnpm typecheck` (`tsc --noEmit`) → **0 errors**.
- **ESLint**: `pnpm lint` (`next lint`) → **0 warnings, 0 errors**.
- **Vitest Unit Tests**: `pnpm test` (`vitest run`) → **51 / 51 passed** across 10 test suites (including new `responder.test.ts` and `replayStore.test.ts`).
- **i18n Key Parity**: `pnpm i18n:check` → **247 / 247 matching keys** across `fr`, `en`, and `ar`.
- **Production Build**: `pnpm build` (`next build`) → **Succeeded**, 24 SSG static pages generated.
- **Visual Browser Verification (Playwright)**: Verified on Chromium at 1440×900 with 0 console errors:
  - English overview (`/en/responder`)
  - Map/Scene view swap (`/en/responder`)
  - Ambulance fleet dispatch drawer (`/en/responder`)
  - Arabic RTL layout (`/ar/responder`)

---

### Screenshots

- Responder Overview (English LTR): [`docs/screenshots/cp4_responder_desktop.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp4_responder_desktop.png)
- Scene & Map View Swap: [`docs/screenshots/cp4_responder_map_swapped.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp4_responder_map_swapped.png)
- Ambulance Fleet Dispatch Drawer: [`docs/screenshots/cp4_responder_ambulance_drawer.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp4_responder_ambulance_drawer.png)
- Responder Arabic RTL (`/ar/responder`): [`docs/screenshots/cp4_responder_arabic_rtl.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp4_responder_arabic_rtl.png)

---

### Deviations
None. All components adhere strictly to `SPEC_RESPONDER.md`, `SPEC_3D.md`, and `DESIGN.md`.

### Known Issues
None.

---

### Review Gate
Per **Hard Rule 3** in `GEMINI.md`:
Work on **CP4** is complete. Execution is stopped at this gate awaiting explicit human approval:
`approved CP4`
