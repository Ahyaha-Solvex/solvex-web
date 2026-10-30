# Checkpoint Report: CP1 — Data Layer

## Status: COMPLETE (Ready for Review Gate)

### Deliverables Completed

#### 1. Button & Switch Polish (Resolution of User Feedback)
- [x] **Root Cause Diagnosis**:
  - Tailwind CSS v3 `@tailwind base;` emits an unlayered preflight CSS rule (`button, [type='button'] { background-color: transparent; }`).
  - Wrapping Ant Design with `<StyleProvider layer>` caused Ant Design CSS to reside in `@layer antd`, which CSS Cascade specification automatically deprioritizes below any unlayered rules.
  - Furthermore, Ant Design's `:where()` selector has specificity `(0, 0, 0)`, allowing Tailwind's `button` selector `(0, 0, 1)` to override Ant Design's button and switch backgrounds to `transparent`.
  - As a result:
    - Primary and danger buttons lost their green/red fills and appeared bleached/white with faint borders.
    - Switch tracks (rendered as `<button role="switch">`) lost their fill, rendering as invisible transparent ghosts on white card backgrounds.
- [x] **Systemic Fix Applied**:
  - Replaced `<StyleProvider layer>` with `<StyleProvider hashPriority="high">` in `src/components/app/AppProviders.tsx`.
  - Defined explicit, high-contrast, tactile CSS rules in `src/styles/globals.css`:
    - **Primary Button**: Solid Algerian flag green (`#006233`), crisp white (`#FFFFFF`) text, border, elevated shadow, `:hover` (`#007A41`), and `:active` scale (`0.985`, `#004D28`).
    - **Primary Danger Button**: Solid Algerian flag red (`#D21034`), crisp white text, elevated shadow, `:hover` (`#B80E2D`), and `:active` scale (`0.985`, `#9E0C26`).
    - **Default Danger Button**: Crisp red outline, `#D21034` text, white background, soft red tint on hover.
    - **Default Action Button**: Crisp `--surface` (`#FFFFFF`) fill, `--border-strong` (`#D3CCBB`) border, `--ink` text, subtle elevation `--shadow-1`.
    - **Switch (High Contrast)**:
      - **Checked (ON)**: Solid flag green (`#006233`), white knob with depth shadow.
      - **Unchecked (OFF)**: Solid taupe-gray (`#B5B0A4`) with dark border (`#9E988A`), guaranteeing immediate readability on white cards.
      - **Switch Typography & Padding**: Added min-width (`76px`) and dedicated inner padding so labels like `"Online"`, `"Offline"`, and `"2G / SMS"` are completely visible without clipping.
  - Added dedicated Buttons and Switches test matrix to `/lab/tokens`.

#### 2. CP1 Data Layer
- [x] **Data Contract Types (`src/lib/data/types.ts`)**:
  - Fully typed domain model matching `DATA_CONTRACT.md` without modification: `M2Level`, `M3Level`, `M4Level`, `BodyRegion`, `ConfidenceStatus`, `Channel`, `LifecycleStatus`, `Position`, `CrashFacts`, `Vitals`, `Profile`, `Occupant`, `TimelineEvent`, `SmsMessage`, `ParsedSms`, `NearbyPerson`, `NearbyVehicle`, `Ambulance`, `HospitalOption`, `Dispatch`, `PrepItem`, `TelemetryWindow`, `Incident`, `SourceEvent`.
- [x] **SMS Parser with Zod (`src/lib/data/sms.ts`)**:
  - `parseSms(raw: string)` parsing format: `SOS|lat,lng|HH:MM|C<0-100>|SEV:<LOW|MEDIUM|HIGH|EXTREME>|OCC:<int>|<blood type optional>|ID<digits>`.
  - Strict validation on coordinates (-90..90, -180..180), 24h time format, confidence score (0..100), and severity enum.
  - Handles omitted optional blood type and ignores extra trailing telemetry fields.
  - `formatSms` serializer for encoding alert strings.
  - 8 unit tests in `src/lib/data/__tests__/sms.test.ts` passing.
- [x] **Confidence Ladder Engine (`src/lib/data/confidence.ts`)**:
  - Computes exact weights from `DATA_CONTRACT.md`:
    - Blackbox impact (+40)
    - Airbag or rollover (+30)
    - Phone impact (+15)
    - Sudden stop (+15)
    - No movement afterwards (+10)
    - SOS button, voice trigger, or witness confirmation (jumps to 100)
    - "I'm OK" citizen response (zeroes to 0)
    - Dispatcher "Confirm" (sets status to `confirmed`)
  - Status mapping: `<70` suspected, `70-90` likely, `≥90` likely until witness/SOS (`witness_confirmed`) or dispatcher confirm (`confirmed`).
  - 7 unit tests in `src/lib/data/__tests__/confidence.test.ts` passing.
- [x] **Seed Data & Telemetry Simulation**:
  - `src/lib/data/sim/seed.ts`: RN5 crash site, 3 hospitals with ETA and bed capacities, 3 Protection Civile ambulances, 5 helpers (medic, first-aider, volunteers), 6 vehicles, 6-point route polyline, Patient A profile and M4 body region ratings.
  - `src/lib/data/sim/telemetry.ts`: 16-second 100 Hz accelerometer, gyroscope, and 1 Hz GPS speed windows following blackbox axes convention (x forward, y left, z up).
- [x] **Simulator Source (`src/lib/data/sim/scenario.ts`)**:
  - `SimSource` implementing `IncidentSource`:
    - t=0: Blackbox impact, score 85, yellow pin
    - t=2: M2 crash (p=0.98), M3 high, M4 body map arrives
    - t=3: "Are you OK?" countdown starts
    - t=33: No answer → score 100, red alert
    - t=40: Witness confirm (when enabled) → `witness_confirmed`
    - Dispatcher manual actions: `confirm()`, `assignAmbulance()`, `callForHelp()`, `close()`.
    - Elapsed progression: +60s on scene, +120s transporting with paramedic cuff vital drift, +240s at hospital.
    - Degraded Network Mode: When network is toggled off, incident channel becomes `sms`, telemetry is omitted, and outbound SMS notifications appear.
  - 6 unit integration tests in `src/lib/data/sim/__tests__/scenario.test.ts` passing.
- [x] **Zustand Stores (`src/lib/stores/`)**:
  - `useIncidentStore`: pure reducers applying `SourceEvent` (`incident_upsert`, `ambulances`, `sms`, `vitals`, `network`).
  - `useUiStore`: manages UI states (drawer open/closed, speed multiplier, hovered/selected regions).
- [x] **Floating Scenario Panel (`src/components/app/ScenarioPanel.tsx`)**:
  - Ant `FloatButton` + `Drawer` available on every app view.
  - Real-time controls: Network online/offline switch, witness confirmation toggle, simulation speed (0.5x, 1x, 2x, 5x), restart scenario (t=0), physical SOS trigger, citizen "I'm OK" simulation, and dispatcher action shortcuts.
  - Displays persistent rule 9 honesty badge: "Simulated blackbox stream".
- [x] **Data Inspection Lab (`/lab/data`)**:
  - Top metrics summary (network status, incident ID, lifecycle, channel, confidence).
  - Live filterable event stream with expandable JSON payloads.
  - Raw SMS feed rendered in mono with `dir="ltr"` and parsed chips.
  - Active incident JSON inspector displaying live state changes (e.g. telemetry present in online mode vs omitted in degraded SMS mode).

---

### Verification Suite
- **TypeScript**: `pnpm typecheck` (`tsc --noEmit`) → **0 errors**.
- **ESLint**: `pnpm lint` (`next lint`) → **0 warnings, 0 errors**.
- **Vitest Unit & Integration Tests**: `pnpm test` (`vitest run`) → **25 / 25 passed**.
- **i18n Key Parity**: `pnpm i18n:check` → **95 / 95 matching keys** across `fr`, `en`, and `ar`.
- **Production Build**: `pnpm build` (`next build`) → Succeeded, 24 SSG static pages generated.
- **Visual & Browser Verification**: Verified via Playwright headless browser:
  - Button states (Primary, Primary Danger, Default, Danger, Dashed, Link, Sizes).
  - Switch states (Checked, Unchecked, Online, Offline, 2G/SMS, Small, Disabled).

---

### Verified Screenshots
- Buttons & Switches Verification Matrix: [`docs/screenshots/cp1-buttons-and-switches.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp1-buttons-and-switches.png)
- Network Switch (Online State - Flag Green `#006233`): [`docs/screenshots/cp1-data-online-switch.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp1-data-online-switch.png)
- Network Switch (Offline State - High-contrast Taupe `#B5B0A4`): [`docs/screenshots/cp1-data-offline-switch.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp1-data-offline-switch.png)
- Scenario Panel Drawer Controls & Switches: [`docs/screenshots/cp1-scenario-drawer-switches.png`](file:///e:/Project/SOLVEX/docs/screenshots/cp1-scenario-drawer-switches.png)

---

### Deviations
None.

### Known Issues
None.

---

### Review Gate
Per Hard Rule 3 in `GEMINI.md`:
Work on **CP1** and the button/switch visual resolution is complete. Execution is stopped at this gate awaiting explicit human approval:
`approved CP1`
