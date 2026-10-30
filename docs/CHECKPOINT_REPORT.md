# Checkpoint Report: CP2 — Component Library at `/`

## Status: COMPLETE (Ready for Review Gate)

### Deliverables Completed

All **23 required components** have been delivered and integrated at `/` (`src/app/[locale]/(app)/page.tsx`) with **all states** (default, hover, focus-visible, active, selected, disabled, loading with skeleton, empty, error with retry) in `fr`, `en`, and `ar` (RTL):

#### 1. Badges & Status Tags
- [x] **`SimBadge`** (`src/components/app/SimBadge.tsx`): Rule 9 honesty label ("Simulated blackbox stream") with persistent magenta pill styling.
- [x] **`SeverityTag`** (`src/components/app/SeverityTag.tsx`): All M3 levels (Low, Medium, High, Extreme) in small, middle, and large sizes; ranking score percentage; `escalatedBy` tags ("Blood thinners", "Unresponsive"); medical disclaimer caption ("Estimate to prioritise, not a diagnosis"); disabled state.
- [x] **`StatusTag`** (`src/components/app/StatusTag.tsx`): Full lifecycle progression (detected → dispatched → on_scene → transporting → at_hospital → closed) strictly in brand green per DESIGN line 115; channel icons for DATA and SMS fallback.
- [x] **`ConfidenceLadder`** (`src/components/app/ConfidenceLadder.tsx`): 4-segment mathematical ladder (Suspected 40-70, Likely 70-90, Witness-confirmed, Confirmed 90+ with pulsating ring and badge).

#### 2. Medical & Triage
- [x] **`RegionRow`** (`src/components/app/RegionRow.tsx`): 7 body regions (Head, Face, Spine & Neck, Thorax, Abdomen, Upper Limbs, Lower Limbs) with likelihood dots and tags (Unlikely, Check, Likely); active/selected state with 3px inline brand bar; hover glow; focus-visible ring; Enter keyboard accessibility.
- [x] **`RegionLegend`** (`src/components/app/RegionLegend.tsx`): Color-coded legend (Unlikely grey, Check amber with eye icon, Likely red with target icon) in horizontal and vertical formats.
- [x] **`ProfileCard`** (`src/components/app/ProfileCard.tsx`): Patient demographics, blood type, chronic diseases, allergies, medications, emergency contact in mono with `dir="ltr"`; high-alert tags for "Blood thinners" and "Pregnant"; loading state with skeleton; empty state.
- [x] **`PrepChecklist`** (`src/components/app/PrepChecklist.tsx`): Interactive hospital preparation checklist with priority badges (Immediate, Urgent, Routine), why-reason captions, local toggle state, and completed counter.

#### 3. Telemetry & Live Vitals
- [x] **`VitalsCard`** (`src/components/app/VitalsCard.tsx`): Heart Rate (bpm), Oxygen (SpO₂ %), and Blood Pressure (mmHg) with 60-point responsive SVG sparklines; threshold alert styles (`--sev-high` orange/red) with `▲ display hint` badge for HR >120 / <50, SpO₂ <92, and systolic <90; loading state with skeleton; empty state; error state with retry button.
- [x] **`Eta`** (`src/components/app/Eta.tsx`): Countdown in `mm:ss` format; bold tabular mono digits; ambulance unit tag; origin road; urgent state (<3 min) with red digits and pulse.

#### 4. Dispatch & Incident Queue
- [x] **`IncidentRow`** (`src/components/app/IncidentRow.tsx`): Pin color dot from confidence status, road label, formatted time, severity tag, status tag, channel icon (Wifi / Message); selected state with 3px brand bar; new arrival flash animation.
- [x] **`IncidentPanel`** (`src/components/app/IncidentPanel.tsx`): Composite card for responder view with road header, confidence ladder, 2×2 dispatcher actions grid (Confirm crash, Assign ambulance, Call for help, Close with Popconfirm), triage summary, occupant list, and blackbox crash facts (speed, delta V, impact direction, rollover).
- [x] **`AmbulanceTable`** (`src/components/app/AmbulanceTable.tsx`): Table of Protection Civile ambulance units with unit ID, base station, ETA in minutes, crew details, status tags, and Assign/Assigned action buttons.
- [x] **`HospitalOptionCard`** (`src/components/app/HospitalOptionCard.tsx`): AI-recommended hospital option card with star badge, distance, free beds, specialties tags, "Why" criteria chips, and select action button; alternative hospital cards.
- [x] **`NearbyPeopleList`** (`src/components/app/NearbyPeopleList.tsx`): List of nearby first responders and volunteers with distance in meters, phone numbers, kind tags; medics and first-aiders highlighted in Algerian flag red (`--sev-extreme`) per the civil protection plan.

#### 5. Feed & History
- [x] **`TimelineList`** (`src/components/app/TimelineList.tsx`): Chronological incident events formatted with category icons (detected, alert sent, witness confirm, dispatcher confirm, ambulance assigned, helper called); newest on top; formatted mono timestamp; loading state; empty state.
- [x] **`SmsFeed`** (`src/components/app/SmsFeed.tsx`): Inbound and outbound SMS feed cards; raw payload in mono with `dir="ltr"`; parsed chips for confidence, severity, occupants count, blood type; delivery status badges; network status badge (Online / Offline mode).

#### 6. 3D Stage Primitives
- [x] **`StageFrame`** (`src/components/stage/StageFrame.tsx`): Signature dark stage panel (`--stage-bg: #0B1310`), 48px depth grid, double gradient fade mask (96px, 48px on mobile); unmasked overlay sibling container so interactive controls are never clipped.
- [x] **`StageControls`** (`src/components/stage/StageControls.tsx`): Unmasked overlay controls with Front / Back / Free segmented view switcher, M4 estimate tooltip badge, reset view button, and medical disclaimer caption.
- [x] **`TelemetryTrace`** (`src/components/stage/TelemetryTrace.tsx`): 80px high resultant g curve; impact marker line at t=5s in `--stage-impact` (`#FF4D5E`); current playhead indicator; play/pause button; speed multiplier buttons (0.25×, 0.5×, 1×); "Go to impact" jump button; synced scrubber slider.

#### 7. Utility & Layout Components
- [x] **`EmptyState`** (`src/components/app/EmptyState.tsx`): Minimalist empty states (one line, one icon, no illustrations per DESIGN.md line 127) for incidents, patients, vitals, and telemetry.
- [x] **`LangSwitcher`** (`src/components/ui/LangSwitcher.tsx`): Rounded pill language switcher with active brand fill and RTL flip support.
- [x] **`ScenarioPanel`** (`src/components/app/ScenarioPanel.tsx`): Integrated floating simulation drawer shortcut.

---

### Verification Suite

- **TypeScript**: `pnpm typecheck` (`tsc --noEmit`) → **0 errors**.
- **ESLint**: `pnpm lint` (`next lint`) → **0 warnings, 0 errors**.
- **Vitest Unit Tests**: `pnpm test` (`vitest run`) → **32 / 32 passed** (5 test suites).
- **i18n Key Parity**: `pnpm i18n:check` → **118 / 118 matching keys** across `fr`, `en`, and `ar`.
- **Production Build**: `pnpm build` (`next build`) → **Succeeded**, 24 SSG static pages generated.
- **Visual Browser Verification (Playwright)**: Verified all tabs and components in English (LTR) and Arabic (RTL).

---

### Screenshots

- Badges & Status Tags: [`docs/screenshots/cp2-lab-badges.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-badges.png)
- Medical & Triage (RegionRow, ProfileCard, PrepChecklist): [`docs/screenshots/cp2-lab-medical.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-medical.png)
- Telemetry & Live Vitals (Normal vs Alert Sparklines): [`docs/screenshots/cp2-lab-vitals.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-vitals.png)
- Vitals States & Eta Countdown: [`docs/screenshots/cp2-lab-vitals-states.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-vitals-states.png)
- Dispatch & Incident Queue: [`docs/screenshots/cp2-lab-dispatch.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-dispatch.png)
- Ambulances & Hospital Options: [`docs/screenshots/cp2-lab-ambulances.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-ambulances.png)
- SMS Feed & Timeline: [`docs/screenshots/cp2-lab-feed.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-feed.png)
- 3D Stage Frame & Telemetry Trace: [`docs/screenshots/cp2-lab-stage.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-stage.png)
- Arabic RTL Layout (`/ar`): [`docs/screenshots/cp2-lab-arabic-rtl.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp2-lab-arabic-rtl.png)

---

### Deviations
None.

### Known Issues
None.

---

### Review Gate
Per **Hard Rule 3** in `GEMINI.md`:
Work on **CP2** is complete. Execution is stopped at this gate awaiting explicit human approval:
`approved CP2`
