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
