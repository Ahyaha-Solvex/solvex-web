# SolveX Web Bundle

One file that contains every project file for the website. Each file starts with a marker line `<!-- FILE: path -->`.

**First task for Gemini:** split this bundle at every `<!-- FILE: ... -->` marker into real files at those paths (create folders as needed). Keep this bundle as `docs/BUNDLE_ORIGINAL.md`. Then read `GEMINI.md`, then start **CP0** from `docs/PLAN.md` and stop at its review gate. Do not start CP1 until the human writes `approved CP0`.

<!-- FILE: scripts/split-bundle.mjs -->
```js
// usage: node scripts/split-bundle.mjs SOLVEX_WEB_BUNDLE.md
import fs from 'node:fs';
import path from 'node:path';
const src = fs.readFileSync(process.argv[2], 'utf8');
const parts = src.split(/<!-- FILE: (.+?) -->\r?\n/);
for (let i = 1; i < parts.length; i += 2) {
  const file = parts[i].trim();
  let body = parts[i + 1];
  // strip an enclosing ```lang fence if the whole body is one fenced block
  const m = body.trim().match(/^```[a-z]*\n([\s\S]*?)\n```$/);
  if (m) body = m[1] + '\n';
  fs.mkdirSync(path.dirname(file) || '.', { recursive: true });
  fs.writeFileSync(file, body);
  console.log('wrote', file);
}
```

<!-- FILE: GEMINI.md -->
# GEMINI.md — project rules (read every session)

## Mission
Build the web side of **PRODUCT_NAME** for the SolveX 3.0 hackathon, Problématique 1 (road-crash emergency response, Algeria). Three views:
1. **Landing** (`/landing`, later `/`): Apple-style scroll-driven showcase of the in-car blackbox.
2. **Hospital** (`/hospital`): 3D human body with predicted injury regions, patient profile, severity, vitals, ETA.
3. **Responder** (`/responder`): Tesla-style 3D crash scene, map, incident queue, ambulances, SMS feed, hospital suggestion. Used by Protection Civile dispatchers and paramedics.

Until CP7, **`/` is the component lab**: every reusable component is shown there with all its states, grouped by category.

The blackbox is **simulated**. The website only visualizes data received through the `IncidentSource` adapter (see `docs/DATA_CONTRACT.md`). The AI models (M1–M4) live in the backend; the website never recomputes their outputs.

## Hard rules
1. **The spec is law. Do not improvise.** If a spec is silent, do not invent: append the question to `docs/QUESTIONS.md`, take the most conservative reading, and continue with the next unblocked task.
2. **No scope creep.** Anything not in `docs/PLAN.md` goes to `docs/PARKING_LOT.md` with one line. Do not build it.
3. **Checkpoints with review gates.** Work on one checkpoint at a time. At its end: run `pnpm typecheck && pnpm lint && pnpm build`, write `docs/CHECKPOINT_REPORT.md` (done, deviations, known issues, screenshot paths), then **STOP** and wait for the human to write `approved CPn`.
4. **Tokens only.** No hex values, font sizes, radii, shadows or durations outside `src/styles/tokens.css` and `src/lib/antdTheme.ts`. Spacing uses the 4 px scale.
5. **Library boundaries.** Ant Design is used only inside the `(app)` route group. The `(marketing)` group (landing) must not import `antd`. Enforce with an ESLint `no-restricted-imports` rule. Do not restyle Ant components with Tailwind classes; change theme tokens instead.
6. **i18n is mandatory from the first component.** No literal UI strings in components. Three locales: `fr` (default), `en`, `ar` (RTL). All three message files must have identical keys (`pnpm i18n:check` fails otherwise).
7. **RTL.** Use logical CSS properties (`margin-inline-start`, `ps-*`, `ms-*`, `text-start`). No `left`/`right` in layout CSS. 3D and canvas code is exempt.
8. **Data only through the adapter.** Components read from Zustand stores fed by an `IncidentSource`. Components never import from `lib/data/sim` directly.
9. **Honesty labels.** A small persistent tag "Simulated blackbox stream" appears in the scenario panel and in every screenshot-worthy page footer while `source === 'sim'`.
10. **Medical wording.** Never write "diagnosis". Use "estimate", "ranking score", "where to look first". The M3 probability is a ranking, not a clinical probability.
11. **3D performance.** One WebGL `<Canvas>` per page. Load 3D with `next/dynamic` and `ssr: false`. `dpr={[1, 1.75]}`. Compress models with meshopt. Pause render loops when the tab is hidden.
12. **Accessibility.** Visible `:focus-visible` ring on everything interactive, `aria-label` on icon buttons, `prefers-reduced-motion` honored (see DESIGN motion rules), color is never the only signal (always pair with text or icon).
13. **TypeScript strict.** No `any`. Zod-validate anything parsed from SMS or the network.
14. **Dependencies.** Only the packages listed in `docs/ARCHITECTURE.md`. Need another one? Log it in `docs/QUESTIONS.md` first.
15. **Git.** One commit per task, message `cpN: <what>`.
16. **No real personal data** anywhere in the repo. All patients, phone numbers and names are fictional seed data.
17. **Package manager:** `pnpm`.

## Roles (announce the role at the start of each task)
- **Architect:** folders, providers, routing, adapters, lint rules. Done = builds, boundaries enforced.
- **UI Builder:** Ant Design dashboards, Tailwind landing, lab components. Done = all states from `DESIGN.md` exist in the lab, in 3 locales, LTR and RTL.
- **3D Builder:** body, crash scene, calibration tools. Done = meets `SPEC_3D.md` frame-rate rule (steady 50+ fps on a mid laptop with dpr cap), no console warnings.
- **Sim/Data:** types, simulator, SMS parser, tests. Done = Vitest passes, `/lab/data` shows the event stream.
- **QA:** before each gate: keyboard-only pass, RTL pass, reduced-motion pass, empty/loading/error states, `pnpm build` clean. Writes the checkpoint report honestly, including what is not done.

## Where things are
- Plan and gates: `docs/PLAN.md`
- Stack, folders, data flow: `docs/ARCHITECTURE.md`
- Visual system, states, motion: `docs/DESIGN.md`
- Types, sample data, SMS format, demo script: `docs/DATA_CONTRACT.md`
- Page specs: `docs/SPEC_LANDING.md`, `docs/SPEC_HOSPITAL.md`, `docs/SPEC_RESPONDER.md`, `docs/SPEC_3D.md`
- Recipes with code: `skills/*.md` (read the matching skill before doing that kind of task)

<!-- FILE: docs/PLAN.md -->
# PLAN — checkpoints and review gates

Work strictly in order. The landing sequence (CP5) can be pulled forward once frames exist in `public/sequence/blackbox/`; until then it uses placeholder frames (`skills/asset-pipeline.md`).

## CP0 — Foundation
Deliver:
- Next.js (App Router) + TypeScript strict + Tailwind + pnpm. ESLint, Prettier, Vitest.
- Route groups `(app)` and `(marketing)` under `[locale]`. `(app)/page.tsx` = lab shell at `/`. `(marketing)/landing/page.tsx` = empty landing placeholder.
- Providers per `ARCHITECTURE.md`: next-intl (fr/en/ar), `AntdRegistry` + `ConfigProvider` (theme from `DESIGN.md`, direction and locale from the active locale) in `(app)` only.
- Fonts: Geist, Geist Mono, IBM Plex Sans Arabic via `next/font`.
- `src/styles/tokens.css`, `src/lib/antdTheme.ts` exactly as `DESIGN.md`.
- Lab shell at `/`: left sidebar with categories (Foundations, Primitives, Data display, Stage, Map, Landing), top bar with language switcher (fr/en/ar) and a direction indicator. `/lab/tokens` renders palette, type scale, spacing, radii, shadows, motion demos.
- ESLint rule forbidding `antd` imports in `(marketing)`.
Accept when: all three locales switch and RTL flips the layout; Ant `Button`, `Table`, `Tag` render with the theme; `/lab/tokens` matches `DESIGN.md`; Tailwind utilities do not break Ant components (check Button and Table).
**GATE: STOP, write report, wait for `approved CP0`.**

## CP1 — Data layer
Deliver: `lib/data/types.ts` (from `DATA_CONTRACT.md`), `IncidentSource` interface, `SimSource` with the scripted RN5 scenario, `parseSms` with Zod and tests, `computeConfidence` with tests, Zustand stores, the floating **Scenario panel** (Ant `FloatButton` + `Drawer`), and `/lab/data` showing the live event stream, current incident JSON and SMS feed raw.
Accept when: Vitest passes; toggling network off in the panel produces the SMS-only path; restart works; the contract is documented where it deviates.
**GATE.**

## CP2 — Component library at `/`
Deliver every component below in the lab with **all states** (default, hover, focus-visible, active, selected, disabled, loading, empty, error where relevant), in fr/en/ar, LTR/RTL:
`SeverityTag`, `ConfidenceLadder`, `StatusTag`, `RegionRow`, `RegionLegend`, `VitalsCard` (+ sparkline), `Eta` (countdown), `IncidentRow`, `IncidentPanel` sections, `TimelineList`, `SmsFeed`, `AmbulanceTable`, `HospitalOptionCard`, `NearbyPeopleList`, `ProfileCard`, `PrepChecklist`, `StageFrame` (dark panel with fade), `StageControls`, `TelemetryTrace`, `ScenarioPanel`, `LangSwitcher`, `EmptyState`, `SimBadge`.
**GATE.**

## CP3 — Hospital (`/hospital`)
Per `SPEC_HOSPITAL.md` and `SPEC_3D.md` (body). Includes the body calibration tool at `/lab/body`.
**GATE.**

## CP4 — Responder (`/responder`)
Per `SPEC_RESPONDER.md` and `SPEC_3D.md` (crash scene, map). All dispatcher actions mutate sim state: confirm, assign ambulance, call for help, close.
**GATE.**

## CP5 — Landing (`/landing`)
Per `SPEC_LANDING.md`. Frame sequence, handoff, component carousel, debug overlay `?debug=1`, reduced-motion and mobile fallbacks.
**GATE.**

## CP6 — Polish
i18n and RTL audit of every page, full state audit, motion audit against `DESIGN.md`, keyboard pass, contrast pass, loading/empty/error screens, console clean.
**GATE.**

## CP7 — Ship
Swap routes (`landing` → `/`, lab → `/lab`), `?demo=1` auto-run mode (autoplay scenario, hides lab chrome), production build, deploy (Vercel), 3 backup demo recordings path documented, README with run instructions.
**GATE.**

If a checkpoint is not finished, the report must say so; nothing downstream may assume it is.

<!-- FILE: docs/ARCHITECTURE.md -->
# ARCHITECTURE

## Stack (only these)
- next, react, react-dom, typescript (strict), tailwindcss
- antd, @ant-design/icons, @ant-design/nextjs-registry, @ant-design/cssinjs, dayjs
- next-intl
- zustand, @tanstack/react-query, zod
- three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- maplibre-gl, react-map-gl
- gsap (+ ScrollTrigger), lenis, motion
- recharts
- lucide-react (landing and stage overlays only; the app uses @ant-design/icons)
- dev: leva, vitest, eslint, prettier, @gltf-transform/cli

## Routing
```
src/app/[locale]/
  layout.tsx                 html lang/dir, fonts, NextIntlClientProvider
  (app)/
    layout.tsx               AppProviders (AntdRegistry, ConfigProvider, QueryClient, SourceProvider)
    page.tsx                 LAB at "/"  (moves to /lab at CP7)
    lab/tokens/page.tsx
    lab/data/page.tsx
    lab/body/page.tsx        body anchor calibration
    hospital/page.tsx
    responder/page.tsx
  (marketing)/
    layout.tsx               no antd. Lenis + GSAP setup
    landing/page.tsx         becomes "/" at CP7
```
Locale prefix: `as-needed`, default `fr`. The language switcher keeps the current path.

## Folders
```
src/
  components/
    ui/          Tailwind primitives (landing + lab chrome)
    app/         Ant-based project components (SeverityTag, IncidentRow, ...)
    stage/       StageFrame, Body3D, CrashScene, MiniMap
    landing/     Hero, ScrollSequence, ComponentCarousel, Chain, Stats, Resilience, Platform
    hospital/    page-level compositions
    responder/   page-level compositions
  config/brand.ts        export const PRODUCT_NAME = 'SolveX Response' // TODO confirm with team
  lib/
    antdTheme.ts
    data/ types.ts source.ts sms.ts confidence.ts sim/ (scenario.ts, telemetry.ts, seed.ts)
    stores/ incidentStore.ts uiStore.ts replayStore.ts
    three/ axes.ts regions.ts materials.ts
    sequence.json        { desktop: {count}, mobile: {count} }  (written by scripts/count-frames.mjs)
  messages/ fr.json en.json ar.json
  styles/ tokens.css globals.css
public/
  models/ body.glb car.glb ambulance.glb
  components/ {accelerometer,gyroscope,gps,esp32,gsm,lora,antenna}.mp4 + .webp posters
  sequence/blackbox/desktop/f_0001.webp ...   sequence/blackbox/mobile/f_0001.webp ...
scripts/ split-bundle.mjs count-frames.mjs i18n-check.mjs
```

## Data flow
```
SimSource (now)  ─┐
WsSource (later) ─┴─▶ IncidentSource ─▶ incidentStore (Zustand) ─▶ pages/components
                         ▲                         │
          Scenario panel ┘                         └─▶ replayStore (clock for 3D)
```
```ts
export interface IncidentSource {
  start(): void; stop(): void;
  subscribe(fn: (e: SourceEvent) => void): () => void;
  // dispatcher actions (the sim mutates its state; a real source would POST)
  confirm(incidentId: string): void;
  assignAmbulance(incidentId: string, ambulanceId: string): void;
  callForHelp(incidentId: string, radiusM: number): void;
  close(incidentId: string): void;
}
```
`SourceEvent` is a discriminated union defined in `DATA_CONTRACT.md`. The store applies events with pure reducers.

## Providers (app group)
`AppProviders` is a client component: `AntdRegistry` → `StyleProvider layer` → `ConfigProvider` (theme, `direction`, antd `locale`) → `QueryClientProvider` → `SourceProvider`. See `skills/antd-nextjs.md`.

## Performance rules
- One `<Canvas>` per page, dynamic import with `ssr: false`.
- `dpr={[1, 1.75]}`; use drei `PerformanceMonitor` to drop to dpr 1 and disable bloom on low fps.
- Instanced meshes for surrounding vehicles and lane markers.
- Landing uses a 2D canvas for the sequence (no WebGL on the landing).
- Preload strategy for sequences: first frame immediately, then batches of 10 with `decode()`.

## Environment
`NEXT_PUBLIC_SOURCE=sim|ws`, `NEXT_PUBLIC_WS_URL=`, `NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/positron` (verify at CP4; fallback to another free OSM-based style).

<!-- FILE: docs/DESIGN.md -->
# DESIGN — "Saharan Paper" light theme, Algerian palette

Principles: minimal, one hero object per page, restrained color, big calm type on the landing, dense-but-quiet Ant dashboards. Red is **only** for critical. Brand green is the primary.

## Tokens (`src/styles/tokens.css`)
```css
:root {
  /* surfaces */
  --bg: #FAF8F3;
  --surface: #FFFFFF;
  --surface-2: #F3F0E8;
  --border: #E6E1D5;
  --border-strong: #D3CCBB;
  /* ink */
  --ink: #14201A;
  --ink-2: #3B4740;
  --muted: #5C675F;
  /* brand (flag green) */
  --brand: #006233;
  --brand-hover: #007A41;
  --brand-press: #004D28;
  --brand-subtle: #E6F1EA;
  /* severity (M3) */
  --sev-low: #2A7F6F;
  --sev-medium: #D9A400;     /* text on it: --ink */
  --sev-high: #C9560F;
  --sev-extreme: #D21034;    /* flag red */
  --sev-extreme-subtle: #FBE5E9;
  /* body regions (M4) */
  --reg-unlikely: #C9C4B6;
  --reg-check: #E0A100;
  --reg-likely: #D21034;
  /* confidence ladder / pins */
  --conf-suspected: #8A9189;
  --conf-likely: #D9A400;
  --conf-witness: #C9560F;
  --conf-confirmed: #D21034;
  /* dark stage */
  --stage-bg: #0B1310;
  --stage-grid: rgba(255,255,255,0.06);
  --stage-ink: #E8EEEA;
  --stage-muted: #8FA097;
  --stage-route: #F2B705;    /* response route only */
  --stage-impact: #FF4D5E;
  /* radii (px) */
  --r-sm: 6px; --r-md: 10px; --r-lg: 14px; --r-xl: 20px;
  /* shadows */
  --shadow-1: 0 1px 2px rgba(20,32,26,.06);
  --shadow-2: 0 4px 16px rgba(20,32,26,.08);
  /* motion */
  --dur-fast: 150ms; --dur-base: 240ms; --dur-slow: 420ms; --dur-hero: 900ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  /* fonts */
  --font-sans: var(--font-geist-sans), var(--font-plex-arabic), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}
:lang(ar) { --font-sans: var(--font-plex-arabic), var(--font-geist-sans), system-ui, sans-serif; }
```
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.

## Typography
App (Ant): base 14/22. Page title 28/36 weight 600. Card title 16/24 weight 600. Caption 12/18 muted. Telemetry numbers use `--font-mono` with `font-variant-numeric: tabular-nums`.
Landing: hero `clamp(3rem, 9vw, 8rem)`, weight 600, letter-spacing `-0.04em`, line-height 0.95. Section titles `clamp(2.25rem, 6vw, 5rem)`, weight 600, tracking `-0.03em`, line-height 1. Body lead `clamp(1.125rem, 2vw, 1.75rem)`, `--muted`, line-height 1.35. Arabic: no negative letter-spacing, line-height +0.1.

## Ant theme (`src/lib/antdTheme.ts`)
```ts
import { theme, type ThemeConfig } from 'antd';
export const antdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#006233',
    colorInfo: '#006233',
    colorSuccess: '#2A7F6F',
    colorWarning: '#D9A400',
    colorError: '#D21034',
    colorBgLayout: '#FAF8F3',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#E6E1D5',
    colorBorderSecondary: '#EFEBE0',
    colorText: '#14201A',
    colorTextSecondary: '#5C675F',
    borderRadius: 10,
    borderRadiusLG: 14,
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    boxShadow: '0 4px 16px rgba(20,32,26,.08)',
  },
  components: {
    Button: { controlHeight: 38, primaryShadow: 'none', defaultShadow: 'none', fontWeight: 500 },
    Card: { borderRadiusLG: 14, boxShadowTertiary: '0 1px 2px rgba(20,32,26,.06)' },
    Table: { headerBg: '#F3F0E8', headerColor: '#3B4740', borderColor: '#E6E1D5' },
    Tag: { borderRadiusSM: 6 },
    Layout: { headerBg: 'transparent', bodyBg: '#FAF8F3' },
  },
};
```
Never hardcode these values elsewhere. Components read CSS variables when Ant tokens do not cover them.

## Severity and status mapping
| Value | Fill | Text | Icon |
|---|---|---|---|
| M3 low | `--sev-low` | white | CheckCircleFilled |
| M3 medium | `--sev-medium` | `--ink` | InfoCircleFilled |
| M3 high | `--sev-high` | white | WarningFilled |
| M3 extreme | `--sev-extreme` | white | ExclamationCircleFilled |
| M4 unlikely | `--reg-unlikely` | `--ink` | none |
| M4 check | `--reg-check` | `--ink` | EyeOutlined |
| M4 likely | `--reg-likely` | white | AimOutlined |
| Confidence suspected | `--conf-suspected` | white | QuestionCircleFilled |
| Confidence likely | `--conf-likely` | `--ink` | |
| Confidence witness-confirmed | `--conf-witness` | white | TeamOutlined |
| Confidence confirmed | `--conf-confirmed` | white | SafetyCertificateFilled |

Incident lifecycle (detected → dispatched → on scene → transporting → at hospital → closed) uses brand green progress, never red.

## Interaction states (custom components)
| State | Visual |
|---|---|
| default | `--surface`, 1px `--border` |
| hover | border `--border-strong`, background `--surface-2`, transition `--dur-fast` |
| focus-visible | 2px outline `--brand`, 2px offset, radius follows the component |
| active/pressed | background `--brand-subtle`, scale 0.99 |
| selected | border `--brand` 1.5px, background `--brand-subtle`, inline-start 3px brand bar |
| disabled | opacity .45, `cursor: not-allowed`, no hover |
| loading | Ant `Skeleton` with same layout, no spinner on cards |
| empty | `EmptyState` with one line, one icon, no illustration |
| error | `Alert` type error, inline, retry button |

Map pins: 40–70 confidence grey `--conf-suspected` static; 70–90 yellow `--conf-likely` static with ring; 90+ red `--conf-confirmed` with pulse ring (1.4s, scale 1→2.4, opacity .5→0, infinite).

## Motion rules
- Animate only `transform`, `opacity`, `filter`, `clip-path`, `mask`. Never width/height/top/left.
- Durations only from tokens. Easing `--ease-out` for entrances, `--ease-in-out` for movements between positions.
- List entrances: stagger 40ms, cap at 8 items. New incident row: slides from -12px, background flash `--brand-subtle` → transparent over 1.2s.
- Numbers (stats, ETA changes): count-up 800ms `--ease-out`.
- No page transitions. No parallax outside the landing.
- `prefers-reduced-motion: reduce`: all durations 0, pulses become a static ring, 3D auto-rotate off, landing sequence replaced by static first and last frames.

## Dark stage with fade (the signature element)
Used for the 3D body and the crash scene on the dashboards (not on the landing, which stays light). The dark panel dissolves into the ivory page.
```css
.stage {
  position: relative;
  background: var(--stage-bg);
  --fade: 96px;
  -webkit-mask-image:
    linear-gradient(to right, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%),
    linear-gradient(to bottom, transparent 0, #000 var(--fade), #000 calc(100% - var(--fade)), transparent 100%);
  mask-composite: intersect;
}
@media (max-width: 768px) { .stage { --fade: 48px; } }
```
Rules: no border-radius on `.stage` (the fade replaces the edge). **Never place interactive controls inside `.stage`** (the mask clips them): controls live in an unmasked overlay sibling positioned over the stage. A faint grid (`--stage-grid`, 48px) is drawn inside the stage for depth.

## Zellige accent (landing only)
SVG pattern: 8-point star tessellation, tile 120×120, stroke 1px `--ink` at 4% opacity, no fill. Used on the hero background and footer only, masked with a radial gradient so it fades out toward the center. Never in the apps.

## RTL
`dir` set on `<html>` from locale. Ant `ConfigProvider direction`. Mirror: rails swap sides, arrows and chevrons flip, progress runs right-to-left. Do not mirror: 3D scene, map, numbers, phone numbers, code, the SMS raw line (always LTR with `dir="ltr"`).

## Layout grid (apps)
Min width 1280. Rails: left 320, right 392, gap 16, page padding 24, stage fills the rest. Under 1024: rails become Ant `Drawer`s opened from two buttons.

<!-- FILE: docs/DATA_CONTRACT.md -->
# DATA CONTRACT

Conventions from the AI/blackbox team (do not change):
- Blackbox axes: **x forward, y left, z up**. Impact direction in degrees **clockwise from the front** seen from above: 0 front, 90 right, 180 rear, 270 left.
- ΔV in km/h. Accelerometer in g, gyroscope in deg/s, 100 Hz; GPS speed 1 Hz. Window 16 s.
- Levels come from the backend. **The UI never recomputes levels from probabilities.**
- M2 levels: none · possible · likely · crash. M3: low · medium · high · extreme. M4 per region: unlikely · check · likely. M4 regions (7): head, face, spine_neck, thorax, abdomen, arms, legs.

## Types (`lib/data/types.ts`)
```ts
export type M2Level = 'none' | 'possible' | 'likely' | 'crash';
export type M3Level = 'low' | 'medium' | 'high' | 'extreme';
export type M4Level = 'unlikely' | 'check' | 'likely';
export type BodyRegion = 'head' | 'face' | 'spine_neck' | 'thorax' | 'abdomen' | 'arms' | 'legs';
export type ConfidenceStatus = 'suspected' | 'likely' | 'witness_confirmed' | 'confirmed';
export type Channel = 'data' | 'sms';
export type LifecycleStatus = 'detected' | 'dispatched' | 'on_scene' | 'transporting' | 'at_hospital' | 'closed';

export interface Position { lat: number; lng: number; roadLabel: string; } // "RN5, km 112, towards Bouira"

export interface CrashFacts {
  deltaVKmh: number;
  impactDirectionDeg: number;     // 0 front, 90 right, 180 rear, 270 left
  rollover: boolean;
  multipleImpacts: boolean;
  speedBeforeKmh: number;
  beltUsed: boolean | null;       // null = unknown
  airbagDeployed: boolean | null;
}

export interface Vitals { hr?: number; spo2?: number; bpSys?: number; bpDia?: number; source: 'watch' | 'paramedic_cuff' | 'manual'; updatedAt: string; history?: { t: string; hr?: number; spo2?: number }[]; }

export interface Profile {
  ageYears: number; sex: 'm' | 'f'; bloodType: string;
  chronicDiseases: string[]; allergies: string[]; medications: string[];
  onBloodThinners: boolean; pregnant: boolean;
  emergencyContact?: { label: string; phone: string };
}

export interface Occupant {
  id: string; label: string;                       // "Patient A"
  profile: Profile;
  m3: { level: M3Level; probability: number; escalatedBy?: string[] };   // probability = ranking score, 0..1
  m4: Record<BodyRegion, { level: M4Level; probability: number }>;
  triageColor?: 'green' | 'yellow' | 'red' | 'black';
  vitals?: Vitals;
}

export interface TimelineEvent { t: string; kind: 'detected' | 'alert_sent' | 'sms_received' | 'witness_confirm' | 'dispatcher_confirm' | 'ambulance_assigned' | 'on_scene' | 'transporting' | 'at_hospital' | 'helper_called' | 'closed' | 'user_ok'; label: string; }

export interface SmsMessage { id: string; dir: 'in' | 'out'; t: string; raw: string; parsed?: ParsedSms; error?: string; delivery?: 'sent' | 'delivered' | 'failed'; }
export interface ParsedSms { lat: number; lng: number; time: string; confidence: number; severity: 'LOW'|'MEDIUM'|'HIGH'|'EXTREME'; occupants: number; bloodType?: string; id: string; }

export interface NearbyPerson { id: string; kind: 'helper_medic' | 'helper_first_aider' | 'volunteer' | 'staff'; lat: number; lng: number; distanceM: number; accepted?: boolean; }
export interface NearbyVehicle { id: string; lat: number; lng: number; headingDeg: number; kind: 'car' | 'truck' | 'bus' | 'moto'; }

export interface Ambulance { id: string; unit: string; status: 'available' | 'assigned' | 'en_route' | 'on_scene' | 'transporting'; lat: number; lng: number; etaSeconds?: number; }
export interface HospitalOption { id: string; name: string; etaSeconds: number; freeBeds: number; specialties: string[]; score: number; reasons: string[]; recommended?: boolean; }
export interface Dispatch { ambulanceId?: string; hospitalId?: string; etaToSceneS?: number; etaToHospitalS?: number; polyline?: [number, number][]; }
export interface PrepItem { id: string; label: string; reason: string; }

export interface TelemetryWindow { sampleRateHz: 100; impactAtMs: number; accel: [number, number, number][]; gyro: [number, number, number][]; speedKmh1Hz: number[]; }

export interface Incident {
  id: string; createdAt: string; position: Position;
  channel: Channel;                                // 'sms' => no telemetry
  m2: { p: number; level: M2Level };
  confidence: { score: number; status: ConfidenceStatus };
  crash?: CrashFacts;                              // absent when only partial SMS data exists
  occupants: Occupant[];
  lifecycle: LifecycleStatus;
  dispatch: Dispatch;
  hospitalOptions: HospitalOption[];
  prep: PrepItem[];
  nearbyPeople: NearbyPerson[]; nearbyVehicles: NearbyVehicle[];
  timeline: TimelineEvent[]; sms: SmsMessage[];
  telemetry?: TelemetryWindow;
}

export type SourceEvent =
  | { type: 'incident_upsert'; incident: Incident }
  | { type: 'ambulances'; ambulances: Ambulance[] }
  | { type: 'sms'; incidentId: string; message: SmsMessage }
  | { type: 'vitals'; incidentId: string; occupantId: string; vitals: Vitals }
  | { type: 'network'; online: boolean };
```
Zod schemas mirror these types for anything parsed from the network.

## Confidence score (computed client-side only in the simulator; a real backend sends it)
Weights from the team plan: blackbox impact +40, airbag or rollover +30, phone impact +15, sudden stop +15, no movement afterwards +10. SOS button, voice trigger, or witness confirmation → jump to 100. "I'm OK" → 0. Dispatcher "Confirm" → status `confirmed`.
Ladder: <40 log only · 40–70 grey pin · 70–90 yellow pre-alert · 90+ red alert. Status mapping: <70 `suspected`, 70–90 `likely`, ≥90 `likely` until a witness or SOS → `witness_confirmed`, dispatcher confirm → `confirmed`.

## SMS format (one message, 160 chars)
`SOS|36.3741,3.9012|02:13|C85|SEV:HIGH|OCC:2|O+|ID4821`
Fields in order: `SOS`, `lat,lng`, `HH:MM`, `C<0-100>`, `SEV:<LOW|MEDIUM|HIGH|EXTREME>`, `OCC:<int>`, `<blood type>` (optional), `ID<digits>`. Ignore extra trailing fields. Anything that fails Zod validation is shown in the feed with an "Unparsed" tag and never creates an incident. The raw line is always rendered `dir="ltr"` in mono.

## Seed data (fictional, approximate coordinates, label "seed")
- Crash site: RN5 near Bouira, lat 36.3741, lng 3.9012, label "RN5, km 112, towards Bouira".
- Hospitals (names are placeholders): "Hôpital Bouira (seed)" 36.3749, 3.9020; "CHU Blida (seed)" 36.4703, 2.8277; "CHU Tizi Ouzou (seed)" 36.7169, 4.0497.
- 3 Protection Civile ambulances placed 6–14 km away; 5 nearby helpers (1 medic, 1 first-aider, 3 volunteers); 6 nearby vehicles.
- A hand-made 6-point route polyline from the nearest ambulance to the crash site.

## Demo scenario "RN5 guardrail" (default)
Illustrative values taken from the AI team's README example: ΔV 55 km/h, two impacts, M3 high (ranking 0.435). Everything else is simulated.
Crash facts: speedBefore 90, impactDirection 270 (driver's door side is left in Algeria; use 0 for a frontal variant), rollover false, multipleImpacts true, belt true, airbag true.
Occupants: Patient A (41, m, O+, no chronic disease, no blood thinners). M4 (simulated): head check, face unlikely, spine_neck check, thorax likely, abdomen check, arms unlikely, legs check.
Script (times in simulated seconds, speed ×1):
| t | Event |
|---|---|
| 0 | Blackbox impact: score 40 + airbag 30 + sudden stop 15 = 85, status likely, yellow pin. Channel data. |
| 2 | M2 `crash` p 0.98, M3 high, M4 map arrives. Incident appears in queue with flash. |
| 3 | Countdown "Are you OK?" starts (30 s) on the citizen side (shown as a timeline entry only). |
| 33 | No answer: score 100 → red alert, status likely. |
| 40 | If witnesses ON: witness confirm → `witness_confirmed`. |
| — | Dispatcher actions are manual: Confirm → `confirmed`; Assign ambulance → dispatched, ETA 11 min, polyline animation; Call for help → helpers list highlights, one accepts after 8 s. |
| +60 after assign | On scene. +120 transporting; paramedic cuff vitals begin (HR 118, SpO2 94, BP 96/58 drifting). |
| +240 | At hospital. |
Network OFF: the incident arrives only as an SMS message after 6 s of simulated delay, `channel: 'sms'`, no telemetry, no crash facts, severity from the SMS. Outbound SMS appear after dispatch: "Ambulance dispatched. ETA 11 min." and "Are you OK? Reply 1".

<!-- FILE: docs/SPEC_LANDING.md -->
# SPEC — Landing (`/landing`, later `/`)

Apple-style product page. Ivory page, light throughout (the blackbox sequence uses white-background frames blended onto the ivory). No antd. Tailwind + GSAP + Lenis. Lenis drives scroll; GSAP ticker drives Lenis (`skills/scroll-sequence.md`).

## Nav
Sticky, height 56, background `--bg` at 80% with `backdrop-filter: blur(16px)`, 1px bottom border `--border` only after 8px scroll. Left: wordmark `PRODUCT_NAME` (weight 600). Center (≥768): links "How it works" (#how), "Platform" (#platform), "Demo" (→ /responder). Right: language switcher (fr/en/ar) + small button "Open demo". Mobile: wordmark + language + menu button opening a full-screen sheet.

## Section 1 — Hero (ivory, 100vh)
Zellige pattern background with radial fade (center clear). Centered stack, max width 14ch for the H1:
- Eyebrow (caption, uppercase, tracking .12em, `--muted`): "SolveX 3.0 · Crash response"
- H1: "Every minute counts."
- Lead: "A blackbox in the car detects the crash, estimates the injuries and alerts the right services — even without internet."
- Buttons: primary "See how it works" (brand fill, pill, height 48, scrolls to #how), secondary "Open the demo" (text link with arrow, → /responder).
- Below the hero, Section 2 begins on the same ivory background (no dark band). The hero is provisional and will be revised later.
Entrance: H1 words rise 24px + fade, stagger 60ms, `--dur-hero`, `--ease-out`; lead and buttons follow at +200ms.

## Section 2 — Blackbox sequence and component carousel (pinned, light)
The centerpiece. The page stays ivory. The generated frames have a **pure white** background and are drawn with `mix-blend-mode: multiply`, so white becomes the page color while the black device and its soft shadows stay. Everything in this section sits in the **upper 60% of the viewport**; the bottom 30% is reserved for text.

### Phase A — scroll sequence
Pinned for `+=500%` viewport heights (mobile `+=350%`). Frames come from four AI clips (C1–C4) between five keyframes (K1–K5; prompts in `FLOW_PROMPTS.md`), with K5 appended as an exact still.
| Stage | Pose |
|---|---|
| K1 (start) | Black device seen from directly above, long side horizontal, closed. Three tiny LEDs (green, amber, white) side by side at its top-left corner. |
| C1 | Rotates in place until the long side is vertical (K2). |
| C2 | Turns to a diagonal and the view tilts off the overhead angle, so the top face and two sides show (K3). |
| C3 | The camera pushes in while the device opens: the lid lifts toward the viewer and drifts to the bottom-right, large, soft-focus, partly cropped; the body drifts to the top-left, partly cropped; the seven modules float in sharp focus between them along the diagonal (K4). |
| C4 | The view tilts back to overhead and aligns horizontally: lid exits bottom-right, body exits top-left, the seven modules glide into a straight row across the upper part of the frame (K5). |
Progress mapping follows clip durations. `lib/sequence.json` holds `{ clips: [{ id, startFrame, endFrame }], total }`; never hardcode progress numbers.
Bottom text zone during Phase A: title "Built into the car." (section-title size) and lead "Seven modules. One decision." Visible at progress 0, fade out by 0.12.

### Phase B — handoff
The last 8 frames of the sequence are the exact K5 composite. When progress reaches 1, crossfade (240ms) from the canvas to the HTML carousel, whose items sit at the same coordinates (`landing/carousel.layout.ts`, derived from the K5 layout below). Then the non-center items blur and fade over 500ms (the focus state).

### Phase C — component carousel
Order and copy. ESP32 is the initial center item (index 3).
| # | id | Title | Text |
|---|---|---|---|
| 1 | accelerometer | Accelerometer | Measures the force of the impact and the direction it came from. |
| 2 | gyroscope | Gyroscope | Detects spin and rollover. |
| 3 | gps | GPS | Exact position and the speed just before impact. |
| 4 | esp32 | ESP32 | The brain: reads the sensors, detects the crash, pairs with phones over Bluetooth. |
| 5 | gsm | GSM + SIM | Sends the alert by data or SMS, even when the phone is broken. |
| 6 | lora | LoRaWAN | Long-range radio for places with no cellular signal. |
| 7 | antenna | Antenna | Carries the radio signals out of the box. |
Layout (relative to the pinned viewport, desktop):
- Row vertical center 38vh. Item pitch 14.5vw. Base item box 11vw square (max 211px).
- Focus by distance d from the center item: d0 scale 1.5, opacity 1, blur 0 · d1 scale 0.95, opacity .55, blur 2px · d2 scale .8, opacity .28, blur 5px · d3 scale .7, opacity .12, blur 8px.
- Switching: all items tween translate/scale/opacity/filter in 600ms `--ease-in-out`. No wrap-around; the chevron is disabled at the ends.
- Chevrons: 48px circles (`--surface`, 1px `--border`, `--shadow-1`), vertically aligned with the row, at `50% ± min(40vw, 560px)`. Hover: border `--border-strong`. Focus-visible ring. In RTL the chevron on the visual left always moves focus to the item on the visual left. Also ←/→ keys, swipe/drag, and click on a side item.
- Each item is a looping turntable video (`/components/{id}.mp4`, muted, `playsInline`, `loop`, `preload="auto"`, `mix-blend-mode: multiply`, poster `/components/{id}.webp`). Only the focused item plays; the others show their poster. Clips are prepared as ping-pong loops (forward then reverse), so there is no seam.
- Text block: top at 64vh, centered, max width 640px: title (`clamp(2rem, 4vw, 3.25rem)`, 600), text (20px, `--muted`), then "4 / 7" in mono and 7 dots. On switch: crossfade + 8px slide, 240ms.
- Pin: after Phase A the section stays pinned for another `+=60%` viewport heights (the carousel is interactive), then releases and the page continues.
Fallbacks: reduced motion → no pin; K1 and K5 shown as stills, carousel with posters only and instant focus changes. Mobile (≤768): sequence drawn with a cover crop centered on the row, item pitch 56vw, only d0 and d±1 visible, text block at 62vh.
Debug `?debug=1`: overlay with progress, frame index, and the carousel grid, so K5 positions can be checked against the HTML items.

### K5 composite layout (1920×1080 reference)
Seven cut-out component images on pure white. Centers at y = 410px, x = 960 + k·278.4 for k = −3…3, each fitted in a 211×211 box, with a very faint soft shadow under each. Left to right: Accelerometer, Gyroscope, GPS, ESP32, GSM + SIM, LoRaWAN, Antenna. No lid, no body, no text. Fit the antenna's longest side to 211px.

## Section 3 — The chain (#how, ivory)
Title: "Four steps. One chain." Horizontal sticky scroller on desktop (pinned, 4 panels revealed by progress); stacked cards on mobile. Each panel: big step number outline, title, one line.
1. **Accident** — The blackbox detects the impact and locates the car.
2. **Alert** — Services, people nearby and contacts are alerted, by data or by SMS.
3. **Evaluation** — AI estimates how badly people are hurt, and where.
4. **Orientation** — The patient goes to the hospital that can treat them, already prepared.
Between panels a dashed `--stage-route`-style line (use `--brand` on ivory) draws itself with scroll (stroke-dashoffset).

## Section 4 — Numbers (ivory)
Title: "Trained on real crash data." Three large count-up numbers (monospace-free, weight 600, size `clamp(3.5rem, 10vw, 9rem)`):
- **0.990** Crash detection · average precision on 24,174 recordings from vehicles the model never saw.
- **0.889** Severity ranking · AUC on held-out crashes.
- **0.827** Injury regions · mean AUC across 7 body regions.
Footnote (caption): "Test-set scores. Detection data comes from commercial vehicles; we plan to recalibrate on our own blackbox. These are decision-support estimates, not diagnoses."

## Section 5 — Resilience (ivory)
Title: "When the network fails, the chain doesn't." A vertical ladder of four rows that light up in sequence on scroll: Mobile data → **SMS** (works on weak 2G, sent from the blackbox's own SIM) → Nearby relay (roadmap) → Satellite SOS (roadmap). Roadmap rows are outlined, not filled, with a "Roadmap" tag. Only data and SMS are shown as working.

## Section 6 — Platform (#platform, ivory)
Title: "One platform, three views." Three cards (radius `--r-xl`, hover lift 4px):
- Citizen app — "Drive mode, countdown, helpers." Tag "Mobile".
- Responder — "Live map, 3D scene, dispatch." Button → /responder.
- Hospital — "Body map, profile, vitals, ETA." Button → /hospital.

## Footer
Zellige at 4% fading to bottom. Left: wordmark + "Built for SolveX 3.0 · HIS University". Right: language switcher. Below: "Simulated demo data."

## Copy and i18n
All strings are keys under `landing.*`. English above is the source. Provided FR/AR for key strings; translate the rest with the glossary and mark each Arabic string `// REVIEW native` in the JSON via a sibling `_review` list (no inline comments in JSON).
| key | fr | ar |
|---|---|---|
| hero.title | Chaque minute compte. | كل دقيقة مهمة. |
| hero.lead | Un boîtier dans la voiture détecte l'accident, estime les blessures et alerte les bons services, même sans internet. | جهاز في السيارة يكتشف الحادث، ويقدّر الإصابات، وينبّه الجهات المناسبة، حتى من دون إنترنت. |
| chain.title | Quatre étapes. Une seule chaîne. | أربع خطوات. سلسلة واحدة. |
| chain.steps | Accident · Alerte · Évaluation · Orientation | الحادث · التنبيه · التقييم · التوجيه |
Glossary: blackbox = FR "boîte noire" / AR "الصندوق الأسود"; Protection Civile = الحماية المدنية; Gendarmerie = الدرك الوطني; ambulance = إسعاف; hospital = مستشفى; severity = gravité / الخطورة; estimate = estimation / تقدير.

<!-- FILE: docs/SPEC_HOSPITAL.md -->
# SPEC — Hospital (`/hospital`)

Audience: ER team preparing for arrival. Ant Design components, themed. Center stage is the 3D body.

## Page chrome
Top bar (56px): brand left, role switch (Ant `Segmented`: Responder | Hospital), language `Select`, `SimBadge`. Below it a patient tab strip (Ant `Tabs` type card, one tab per occupant: triage color dot + label "Patient A"). If no incident: full-page `EmptyState` "No incoming patients" with the scenario panel hint.

## Layout (≥1280)
Left rail 320 · center stage · right rail 392. Rails scroll independently; stage is sticky full height minus chrome.

## Left rail (cards, gap 16)
1. **Arrival** — `Eta` (Ant `Statistic.Countdown`, mono, size 32) in `mm:ss`; ambulance unit `Tag`; origin `roadLabel`; lifecycle `Steps` small (detected → dispatched → on scene → transporting → at hospital).
2. **Patient** — Ant `Descriptions` (1 column, small): Age, Sex, Blood type, Chronic diseases, Allergies, Medications. `Tag` warning "Blood thinners" if `onBloodThinners`; `Tag` "Pregnant" if `pregnant` (these also show the `escalatedBy` note under severity). Emergency contact row with phone in mono, `dir="ltr"`.
3. **Severity** — large `SeverityTag` (height 40, text 16/600) + caption "Ranking score {probability%}" and, if `escalatedBy`, a line "Raised one level by: {list}". Caption always: "Estimate to prioritise, not a diagnosis."

## Center stage
`StageFrame` containing `Body3D` (see SPEC_3D). Unmasked overlay controls:
- top-start: `Segmented` View: Front | Back | Free.
- bottom-start: `RegionLegend` (unlikely grey, check amber, likely red) with labels.
- bottom-center: caption "Estimate of where to look first — not a diagnosis." (stage-muted, 12px).
- bottom-end: icon button "Reset view".
- top-end: `Tag` "M4 estimate" with tooltip on how the map is produced ("Trained on US crash-investigation data; ranks regions by likelihood of serious injury").
Empty state in stage (no patient): outlined body silhouette, no glows.

## Right rail
1. **Injury map** — 7 `RegionRow`s ordered by level then probability. Row: color dot, region name, `Tag` level, probability (mono, muted). Hover row → body region glows brighter and label shows; click row → select (camera focuses 600ms, row selected state). Hover/click body region does the same to the row (two-way sync via `uiStore.hoveredRegion/selectedRegion`). Keyboard: rows are focusable, Enter selects.
2. **Live vitals** — `VitalsCard`: three `Statistic`s (HR bpm, SpO₂ %, BP mmHg) with 60-point Recharts sparkline each (stroke `--brand`, no axes). Source `Tag` ("Smartwatch" / "Paramedic cuff" / "Manual") and "updated {time ago}". Values outside simple display bands get a `--sev-high` text color: HR <50 or >120, SpO₂ <92, systolic <90. These bands are display hints only; label them "display hint". Empty: "No vitals yet — cuff or watch not connected."
3. **Prepare** — `PrepChecklist` from `incident.prep` (Ant `Checkbox` list; checked state local; each item has a muted `reason` line).
4. **Beds & specialties** — receiving hospital: `Statistic` free beds, `Tag`s for specialties, and ETA.

## States
Loading: `Skeleton` per card. Error: `Alert` with retry. Incident arrives while open: patient tab pulses once and a `notification` (placement top-end) "New incoming patient". Network offline banner (Ant `Alert` banner, warning): "Connection lost — showing last known data".

<!-- FILE: docs/SPEC_RESPONDER.md -->
# SPEC — Responder (`/responder`)

Audience: Protection Civile dispatcher and paramedic. Center stage is the Tesla-style crash scene; the map is a picture-in-picture that can swap.

## Layout (≥1280)
Left rail 320 (queue) · center stage · right rail 392 (incident detail). Top bar identical to the hospital page.

## Left rail — Incident queue
Ant `List` of `IncidentRow`: pin color dot (confidence), `road label` (1 line, ellipsis), time, `SeverityTag` small, `StatusTag`, channel icon (data / SMS). Sort: confidence desc, then newest. Selected state per DESIGN. New incident: slide-in + flash. Above the list: `Segmented` filter All | Needs action | Dispatched. Empty: "No active incidents."
Below the list: **Nearby helpers** summary (counts by kind; medics shown with `--sev-extreme` dot per the team plan: "medics and first-aiders highlighted in red").

## Center — Scene
`StageFrame` with `CrashScene` (SPEC_3D). Overlay (unmasked):
- top-start: `Segmented` Scene | Map (swaps the PiP and the main view).
- top-end: `ReplayControls`: play/pause, scrubber across the 16 s window with a marker at impact, speed 0.25× / 0.5× / 1×, "Go to impact".
- bottom-start: `TelemetryReadout`: Speed (km/h), ΔV (km/h), Impact direction (° and a small compass glyph), Rollover (yes/no), Multiple impacts (yes/no), g peak.
- bottom-end: PiP `MiniMap` 240×160 (MapLibre, radius `--r-lg`, 1px stage border). Click swaps.
- bottom-center: `TelemetryTrace` strip (resultant g over time, 80px high) synced to the replay clock; line `--stage-ink`, impact marker `--stage-impact`.
Degraded state (`channel: 'sms'` or no telemetry): scene shows a static car at the reported position, no replay controls, banner overlay "SMS only — no telemetry. Position and severity from the message." and the raw SMS line.

## Right rail — Incident detail (Ant `Card`s)
1. **Header**: road label, time, `ConfidenceLadder` (4 segments: Suspected · Likely · Witness-confirmed · Confirmed; filled up to current; score number), `StatusTag`.
2. **Actions** (Ant `Button`s, 2×2 grid): **Confirm crash** (primary; sets `confirmed`; disabled once confirmed), **Assign ambulance** (opens `AmbulanceTable` in a `Drawer`), **Call for help** (opens `Popover` radius `Slider` 500–5000 m, then confirms; helpers highlight and one accepts), **Close** (danger text button with `Popconfirm`). All call the `IncidentSource` actions.
3. **Severity**: `SeverityTag` large + "Ranking score" + the same estimate caption as the hospital page; per-occupant list if several (triage color dot each).
4. **Dispatch**: assigned ambulance, `Eta`, route progress; **Hospital suggestion**: recommended `HospitalOptionCard` (name, ETA, free beds, specialty `Tag`s, "Why" reasons) with a `Table` of the alternatives and a "Choose" button each. The UI never scores hospitals; it renders `score` and `reasons` from the data.
5. **Timeline**: Ant `Timeline` from `incident.timeline` (time in mono). Newest on top.
6. **SMS feed**: `SmsFeed`: each item shows direction icon (in/out), time, raw line in mono `dir="ltr"`, parsed chips (confidence, severity, occupants, blood type) or an "Unparsed" tag, and delivery status. Header shows network state `Tag` (Online / Offline — SMS mode).
7. **Nearby people**: `NearbyPeopleList` with distance, kind icon, `accepted` tag; medics red.

## Map (main or PiP)
MapLibre with `NEXT_PUBLIC_MAP_STYLE`. Layers: incident pins (colors per DESIGN), ambulance markers with route polyline in `--brand` (on the light map) animating dashes, helper markers (medic red, others brand), hospital markers, a 500 m ring around the crash. Fit bounds to incident + assigned ambulance. Controls: zoom buttons only; attribution visible.

## States
No incident selected: stage shows the last scene idle with caption "Select an incident"; rails show `EmptyState`. Offline: top banner "Network off — SMS mode" (info) when the scenario network is off. All cards have `Skeleton` loading and `Alert` error states.

<!-- FILE: docs/SPEC_3D.md -->
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

<!-- FILE: skills/scroll-sequence.md -->
# Skill — scroll-driven frame sequence

Use for the landing blackbox section.

```tsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Props = {
  frameCount: number;
  frameUrl: (i: number) => string;   // 0-based
  scrollLength?: string;             // e.g. '+=400%'
  onProgress?: (p: number, frame: number) => void;
};

export function ScrollSequence({ frameCount, frameUrl, scrollLength = '+=400%', onProgress }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const images: (HTMLImageElement | undefined)[] = new Array(frameCount);
    let shown = -1;
    const state = { frame: 0 };

    const nearestLoaded = (i: number) => {
      for (let d = 0; d < frameCount; d++) {
        const a = images[i - d]; if (a?.complete && a.naturalWidth) return a;
        const b = images[i + d]; if (b?.complete && b.naturalWidth) return b;
      }
    };

    const draw = (i: number) => {
      const img = nearestLoaded(i);
      if (!img) return;
      const { width: cw, height: ch } = canvas;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // cover
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      shown = i;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      draw(Math.max(shown, 0));
    };

    const load = (i: number) => new Promise<void>((res) => {
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = () => { images[i] = img; res(); };
      img.onerror = () => res();
    });

    let cancelled = false;
    (async () => {
      await load(0); if (cancelled) return;
      resize();
      for (let i = 1; i < frameCount; i += 10) {
        await Promise.all(Array.from({ length: 10 }, (_, k) => i + k < frameCount ? load(i + k) : Promise.resolve()));
        if (cancelled) return;
      }
    })();

    const ctxGsap = gsap.context(() => {
      gsap.to(state, {
        frame: frameCount - 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: scrollLength,
          pin: true, scrub: 0.5,
          onUpdate: (self) => onProgress?.(self.progress, Math.round(state.frame)),
        },
        onUpdate: () => { const f = Math.round(state.frame); if (f !== shown) draw(f); },
      });
    }, section);

    window.addEventListener('resize', resize);
    return () => { cancelled = true; window.removeEventListener('resize', resize); ctxGsap.revert(); };
  }, [frameCount, frameUrl, scrollLength, onProgress]);

  return (
    <div ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-[var(--bg)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply" />
    </div>
  );
}
```
Lenis + GSAP wiring (in the `(marketing)` layout client component):
```ts
const lenis = new Lenis({ lerp: 0.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```
Frame URL: `/sequence/blackbox/${device}/f_${String(i + 1).padStart(4, '0')}.webp`. Frame counts come from `lib/sequence.json`. Mobile: `matchMedia('(max-width: 768px)')` picks `mobile`.
The frames have a pure white background: draw the canvas with `mix-blend-mode: multiply` (Tailwind `mix-blend-multiply`) over the ivory section so white becomes the page color. The last 8 frames are the exact K5 composite; the carousel crossfades in at progress 1. Frame counts and clip boundaries come from `lib/sequence.json`.

<!-- FILE: skills/antd-nextjs.md -->
# Skill — Ant Design in Next.js App Router with Tailwind

`(app)/layout.tsx` (server) renders `<AppProviders locale={locale}>{children}</AppProviders>`.
```tsx
'use client';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import enUS from 'antd/locale/en_US';
import arEG from 'antd/locale/ar_EG';
import { antdTheme } from '@/lib/antdTheme';

const locales = { fr: frFR, en: enUS, ar: arEG } as const;

export function AppProviders({ locale, children }: { locale: 'fr' | 'en' | 'ar'; children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <StyleProvider layer>
        <ConfigProvider theme={antdTheme} locale={locales[locale]} direction={locale === 'ar' ? 'rtl' : 'ltr'}>
          {children}
        </ConfigProvider>
      </StyleProvider>
    </AntdRegistry>
  );
}
```
Global CSS order so Tailwind utilities do not override Ant: `@layer theme, base, antd, components, utilities;` at the top of `globals.css`. If Ant components look broken after adding Tailwind, verify the layer order first; if still broken, remove `StyleProvider layer` and scope Tailwind's preflight instead. Check Button, Table, Tag at CP0. If `antd` complains about React version, install the matching compatibility package named in its console warning and log it in `docs/QUESTIONS.md`.
Dayjs locales: import `dayjs/locale/fr` and `dayjs/locale/ar` and set the active one in the provider.

<!-- FILE: skills/i18n-rtl.md -->
# Skill — next-intl, three locales, RTL

- `src/i18n/routing.ts`: `defineRouting({ locales: ['fr','en','ar'], defaultLocale: 'fr', localePrefix: 'as-needed' })`.
- `[locale]/layout.tsx`: `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.
- Messages in `src/messages/{fr,en,ar}.json`, namespaced (`common`, `lab`, `landing`, `hospital`, `responder`, `severity`, `regions`, `status`).
- `scripts/i18n-check.mjs`: loads the three JSON files, flattens keys, fails on any missing or extra key; wire to `pnpm i18n:check` and to the checkpoint gate.
- Numbers: use `Intl.NumberFormat(locale)` but force Latin digits for telemetry and phone numbers (`numberingSystem: 'latn'`).
- Region and level labels live under `regions.*` and `severity.*` so the 3D labels reuse them.
- Test each page with `ar` at every checkpoint: rails swap sides, chevrons flip, SMS raw line stays LTR.

<!-- FILE: skills/asset-pipeline.md -->
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

<!-- FILE: docs/QUESTIONS.md -->
# QUESTIONS (agent appends here; human answers inline)

- [ ] PRODUCT_NAME: placeholder "SolveX Response". Confirm the team's name.
- [ ] Default locale `fr` assumed. Confirm.
- [ ] Map style URL (OpenFreeMap positron) reachable? Confirm at CP4.
- [ ] Body model file and license origin (hackathon use only).
- [ ] Blackbox modules (confirmed by the human): accelerometer, gyroscope, GPS, antenna, GSM+SIM, ESP32, LoRaWAN. Is LoRa actually working in the demo? If yes, rewrite the Resilience section row "Nearby relay (roadmap)" to LoRa. Is there a backup battery? It is not in the module list; the landing callouts omit it.
- [ ] Hero section above the sequence: provisional. Decide later.
- [ ] Component carousel starts on ESP32 (center). Confirm order: Accelerometer, Gyroscope, GPS, ESP32, GSM + SIM, LoRaWAN, Antenna.
- [ ] Turntable videos per component (plan A) vs real GLB models in R3F (upgrade). Decide after the first videos.

<!-- FILE: docs/PARKING_LOT.md -->
# PARKING LOT (ideas not in the plan; do not build)

- Police/Gendarmerie filtered view of the responder page
- Hospital-side bed management UI
- Citizen-app web preview
- Real WebSocket source (after the backend exists)
