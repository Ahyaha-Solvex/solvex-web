# SolveX web app · handoff

This repo is the website for SolveX / أحياها: the landing page, the Protection Civile dispatch console (`/responder`) and the hospital view (`/hospital`). It runs on simulated data today. Your backend (`solvex-crash-response`) is not connected yet. That is the main thing left.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3000/fr  (also /en, /ar)
pnpm typecheck && pnpm lint && pnpm test
```

Pages: `/[locale]/landing`, `/[locale]/responder`, `/[locale]/hospital`, plus dev labs under `/[locale]/lab/*`.

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind, Ant Design 5, next-intl (fr/en/ar, Arabic is RTL), React Three Fiber for 3D, MapLibre for maps, Zustand for state.

## Where things are

| Area | Path |
| --- | --- |
| Landing | `src/components/landing/*` (blackbox scroll sequence, component carousel, crash story) |
| Responder (dispatch) | `src/components/responder/ResponderApp.tsx` (current), `NewCallModal.tsx`, `ZoneAlert.tsx` |
| Hospital | `src/components/hospital/HospitalApp.tsx` (patient records), `HospitalDashboard.tsx` (3D digital twin), `MedicalTheme.tsx` |
| 3D scenes | `src/components/stage/CrashScene.tsx` (responder crash replay), `Body3D.tsx` (injury twin), `MiniMap.tsx` |
| Data types | `src/lib/data/types.ts` (Incident, Occupant, M3/M4, timeline, etc.) |
| Data source interface | `src/lib/data/source.ts` (`IncidentSource`) |
| Simulator (today's data) | `src/lib/data/sim/scenario.ts`, `seed.ts`, `telemetry.ts` |
| Wiring | `src/components/app/SourceProvider.tsx` picks the source; `src/lib/stores/incidentStore.ts` reduces events |
| Strings | `src/messages/{fr,en,ar}.json`. Every UI string goes here and all three files must have the same keys (`pnpm i18n:check`). |
| Specs | `docs/SPEC_*.md`, `docs/DATA_CONTRACT.md`, `docs/ARCHITECTURE.md` |
| Blender sources | `blender/*.py`, `blender/solvex_blackbox.blend` (renders are exported to `public/sequence/` and are not in git) |

`src/components/responder/ResponderDashboard.tsx` is the previous responder screen. It is no longer routed and can be deleted.

## What is done (UI, on the simulator)

Responder, compared with your `PROJECT.md` and `server/DEMO.md`:
- Incident queue, confidence ladder, severity, status, timeline, SMS feed
- New incident from a phone call, with the four severity questions
- Confirm crash, assign an ambulance (ETA to scene and to hospital), "ligne jaune" alerts
- Call for help in a radius (up to 20 km), call one volunteer directly, **confirm the helper**, which sends the first-aid cards
- Call the driver and call the emergency contact (mocked, like in your demo)
- No-coverage zone: "heading into" pop-up with warn / no help / keep watching, and "not back by"
- Several victims: severity per victim, START triage colour, a different hospital per victim, link to the digital twin
- 3D crash replay from the blackbox telemetry, and the live map

Hospital:
- Incoming patients list, patient record (profile, allergies, vitals, crash mechanism, M4 regions, ER prep checklist, timeline), then the 3D digital twin

## What is left

### 1. Connect the site to your server (main task)

The site only talks to an `IncidentSource` (`src/lib/data/source.ts`). Today that is `SimSource`. Write a second one, for example `src/lib/data/live/LiveSource.ts`, that implements the same interface against your FastAPI server, then select it in `SourceProvider.tsx` (an env var such as `NEXT_PUBLIC_SOURCE=live` is the simplest switch).

- **Reading:** subscribe to your server (your `/ws/monitor` WebSocket is the natural fit) and turn its packets into `SourceEvent`s: `incident_upsert`, `ambulances`, `sms`, `vitals`, `network`. The shapes are in `types.ts` and `docs/DATA_CONTRACT.md`. Map your M3/M4 output to `Occupant.m3` / `Occupant.m4`.
- **Actions:** each dispatcher action in the interface (`confirm`, `assignAmbulance`, `callForHelp`, `callVolunteer`, `confirmHelper`, `callContact`, `setTriage`, `assignHospital`, `reportPhoneCall`, `warnDriver`, `acknowledge`, `close`) needs an endpoint on your server. Most already exist in your `/dev` and dashboard flow. Add the rest.
- The simulator-only methods (`toggleNetwork`, `restart`, `triggerSos`, …) can map to your `/dev` buttons or do nothing.
- `scenario.ts` is the reference for how each action should change an incident.

### 2. Model endpoints in your repo (written, not committed)

`docs/handoff/backend-models-api.patch` is a change to **your** repo: a new `server/models_api.py` and two lines in `server/app.py`. They serve:

- `POST /api/models/m1` road risk
- `POST /api/models/m3` severity
- `POST /api/models/m4` injury regions

Apply it in your repo with `git apply docs/handoff/backend-models-api.patch` (from the root of `solvex-crash-response`), then check it. Things to watch:
- M1 needs `m1/models/risk_model_nohist.{json,txt}`. They were not in the copy we had, so `/m1` returns 503 until they are there.
- M3/M4 need the Hugging Face weights (private repo): `hf auth login` or `HF_TOKEN`.

### 3. Smaller things

- Hospital page: the twin's countdown restarts when it opens; it should share the record's arrival time.
- Responder: the 3D scene takes a while to appear on a cold load, and the stage is empty when there is no incident (it needs a placeholder).
- Police & Gendarmerie view and merging duplicate reports (from your `PROJECT.md` S7/S8) are not built.
- Calls are mocked. There is no phone line.

## Rules we kept

- No hard-coded UI text. Use the three message files with identical keys.
- Arabic must work right-to-left. Use `start`/`end`, not `left`/`right`.
- Blender: preview in the viewport. Full Cycles renders take about 50 s per frame on a laptop CPU, so only run them for a final cut. `blender/export_web.py <frames_dir>` turns renders into the site's WebP frames and leaves the carousel as it is.
