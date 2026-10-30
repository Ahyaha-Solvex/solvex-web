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
