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
