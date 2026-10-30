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
