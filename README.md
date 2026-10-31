# SolveX Web Platform · أحياها

The official web platform for **SolveX / أحياها**: road-crash emergency response in Algeria (Problematique 1). It features the scroll-driven landing showcase, Protection Civile dispatcher console (`/responder`), hospital trauma workspace & 3D digital twin (`/hospital`), and the 3D Blackbox crash replay stage (`/lab/stage`).

## Quick Start

```bash
pnpm install
pnpm dev            # http://localhost:3000/en  (also /fr, /ar)
pnpm typecheck && pnpm lint && pnpm build
```

* **Landing Showcase:** `/[locale]/landing`
* **Protection Civile Console:** `/[locale]/responder`
* **Hospital Digital Twin:** `/[locale]/hospital`
* **3D Blackbox Simulation Lab:** `/[locale]/lab/stage`

### Tech Stack
* **Framework:** Next.js 15 (App Router), React 19, TypeScript
* **UI & Styling:** Tailwind CSS, Ant Design 5 (app routes)
* **Localization:** `next-intl` (English, French, Arabic with full RTL support)
* **3D Graphics:** Three.js, React Three Fiber, Drei
* **Maps:** MapLibre GL
* **State:** Zustand

---

## 3D Simulation Videos

Pre-rendered 1080p 30 fps deterministic simulations are available under [`videos/`](./videos):
* **[3d-crash-event.mp4](./videos/3d-crash-event.mp4)**: Highway collision with barrier impact, front-end crumple, debris dynamics, and rollover.
* **[3d-triggered-non-crash-event.mp4](./videos/3d-triggered-non-crash-event.mp4)**: Accelerometer threshold trigger with emergency hard braking and controlled safe stop before barrier.

---

## Where Things Are

| Area | Path |
| --- | --- |
| Landing | `src/components/landing/*` (blackbox scroll sequence, component carousel, crash story) |
| Responder (dispatch) | `src/components/responder/ResponderApp.tsx`, `NewCallModal.tsx`, `ZoneAlert.tsx` |
| Hospital | `src/components/hospital/HospitalApp.tsx` (patient records), `HospitalDashboard.tsx` (3D digital twin), `MedicalTheme.tsx` |
| 3D Simulation Stage | `src/components/stage/CrashScene.tsx`, `CrashStageLab.tsx`, `Body3D.tsx`, `MiniMap.tsx` |
| Data types | `src/lib/data/types.ts` (Incident, Occupant, M3/M4, timeline, etc.) |
| Data source interface | `src/lib/data/source.ts` (`IncidentSource`) |
| Simulator data | `src/lib/data/sim/scenario.ts`, `seed.ts`, `telemetry.ts` |
| Live source adapter | `src/lib/data/live/LiveSource.ts` (real-time WebSocket & REST backend integration) |
| Python backend bridge | `server/app.py`, `server/models_api.py` |
| i18n Translations | `src/messages/{fr,en,ar}.json` (`pnpm i18n:check` to validate key parity) |
| Architecture & Specs | `docs/SPEC_*.md`, `docs/DATA_CONTRACT.md`, `docs/ARCHITECTURE.md` |

---

## Features

### Responder (Protection Civile Console)
- Active incident queue with confidence ladder, severity level, status, timeline, and SMS telemetry feed.
- Emergency phone triage intake modal with severity assessment questions.
- Ambulance dispatch with ETA calculations to crash scene and recommended trauma hospital.
- Solidarity volunteer network: broadcast emergency call up to 20 km, dispatch local first-aiders with first-aid guidance cards.
- Direct contact triggers for vehicle driver and emergency contact.
- Dead-zone awareness: tracking vehicles entering low-connectivity zones.
- Multi-victim management: individual START triage color rating, victim-specific trauma hospital assignment, direct link to hospital digital twin.

### Hospital (Trauma Center)
- Real-time incoming trauma patient queue with estimated arrival countdown.
- Comprehensive patient clinical record: allergies, baseline vitals, crash mechanism physics, ER prep checklist, and real-time medical timeline.
- 3D Anatomical Digital Twin: predicted AIS 2+ injury likelihood visualized across 7 anatomical regions (head, thorax, abdomen, spine, pelvis, arms, legs).

---

## Connecting the Backend

The frontend communicates exclusively through the `IncidentSource` adapter (`src/lib/data/source.ts`).
* **Simulated Mode:** Uses `SimSource` (`src/lib/data/sim/scenario.ts`).
* **Live Mode:** `src/lib/data/live/LiveSource.ts` connects via WebSocket (`/ws/monitor`) and REST to the FastAPI server (`server/app.py`).

---

## Guidelines & Rules
- **No hard-coded strings:** All UI strings reside in `src/messages/{fr,en,ar}.json`.
- **RTL Support:** Full native Arabic RTL layout via CSS logical properties.
- **Strict Data Contracts:** All external payload schemas are validated via Zod.
