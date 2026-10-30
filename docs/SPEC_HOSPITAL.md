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
