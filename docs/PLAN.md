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
