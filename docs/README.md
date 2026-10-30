# SolveX 3.0 · Crash response: AI models and blackbox

A citizen app and an in-car **blackbox** detect road crashes, estimate how badly people are hurt, and send that to the Protection Civile, the police or Gendarmerie, and the hospital. This README covers the **four AI models** and the **blackbox sensors** they need. The concept, the Algerian context, the build list and the suggestions are in [SolveX Crash Response Plan.md](SolveX%20Crash%20Response%20Plan.md).

| | Model | Status | Output | Test score |
|---|---|---|---|---|
| **M1** | Road risk | trained (flaw to fix) | low · medium · high · very high | AUC 0.800 |
| **M2** | Crash detection | blackbox trained, phone side not started | none · possible · likely · crash | AP 0.990 |
| **M3** | Injury severity | trained | low · medium · high · extreme | AUC 0.889 |
| **M4** | Injury map | trained | unlikely · check · likely, per body region | mean AUC 0.827 |

**Trained is not the same as working in the app.** Still missing:
- M1's missing-data fix and the OpenStreetMap → model input pipeline
- phone-side crash detection and the confidence ladder that combines all signals
- a backend AI API serving the four models
- one end-to-end test: blackbox recording → M2 → `crash_summary()` → M3 + M4

---

## Repository layout

```
m1/  road risk      train_m1.ipynb (local) · notebook5d7445e14e.ipynb (Kaggle run) · risk_model_nohist.{txt,json}
m2/  crash detect   m2_blackbox.py (shared signal code) · build_m2_notebook.py · train_m2_kaggle.ipynb
                    train_m2_kaggle_finished.ipynb (Kaggle run with outputs) · models/ (from the Kaggle zip)
m3/  severity       build_m3_dataset.py · train_m3.ipynb · models/m3_lgbm.joblib + m3_config.json
m4/  injury map     build_m4_dataset.py · train_m4.ipynb · models/m4_lgbm.joblib + m4_config.json
```

Every model folder saves the model plus a JSON config: the inputs it expects, the thresholds for its levels, and its test scores. The backend should read thresholds from the config, never hard-code them.

---

## Blackbox sensors

What the blackbox must carry so M1–M4 get every input. "Phone" says whether a smartphone already has it. A phone has most of these sensors, but it isn't fixed to the car, it can fly around the cabin or break, and most phone accelerometers saturate far below crash forces. That is why ΔV and impact direction must come from the blackbox.

| Sensor | What it gives the models | Feeds | Spec | Phone |
|---|---|---|---|---|
| **Must have** | | | | |
| High-g accelerometer (3-axis) | The impact pulse → **ΔV** (66% of M3's decisions), **impact direction**, **multiple impacts**. Main crash trigger. | M2 M3 M4 | ±50 g or more, ≥ 1 kHz during impact, bolted with known orientation | partly: most clip at 8–16 g (iPhone 14+ has high-g); a loose phone can't tell front from side |
| Gyroscope (3-axis) | Roll rate → **rollover**; spin helps confirm a crash | M2 M3 M4 | ±2000 °/s, ≥ 100 Hz | yes, but measures the phone's spin, not the car's |
| Low-g accelerometer | Gravity vector (mount calibration, upside down), hard braking, "hasn't moved since" | M2 M3 | ±8 g, 100 Hz (same IMU chip) | yes |
| GPS | Location → road data and weather for M1; speed before impact and the sudden stop for M2 | M1 M2 | ≥ 1 Hz, own antenna | yes |
| Clock | Hour, weekday, month for M1; timestamps | M1 | RTC synced from GPS | yes |
| Bluetooth | Pairs with the phones in the car → each occupant's profile (age, sex). Without it M3 loses age, its 2nd input | M3 M4 | BLE | yes |
| **Upgrades** | | | | |
| Seatbelt buckle | `belt_used`: +0.014 AUC for M3, 4.4 points fewer non-serious people flagged | M3 M4 | CAN bus or buckle switch | no |
| Airbag deployment | Strongest single crash sign (eCall uses it) | M2 M4 | CAN bus | no |
| Barometer | Cabin pressure spike when airbags fire | M2 | any MEMS sensor | partly |
| Microphone | Crash sound; voice SOS if the phone is gone | M2 | one MEMS mic | yes |
| Seat occupancy | **Not needed:** tested, adds nothing to M4. Don't ask "are you driving?" | – | skip | no |
| **Not sensors, but needed** | | | | |
| Cellular modem + SIM | Sends data, SMS or a call when the phone is broken | – | 2G/4G, SMS | yes |
| Backup battery | Survives the car's power being cut | – | ~1 h of SMS/calls | yes |

**Where each model gets its inputs**

| Model | From sensors | From profile or internet | Phone alone? |
|---|---|---|---|
| M1 | GPS, clock | road attributes (OpenStreetMap), weather (Open-Meteo) | yes, no blackbox needed |
| M2 | accelerometer, gyroscope, GPS speed | – | partly: more false alarms |
| M3 | ΔV, direction, multiple impacts, rollover | age, sex, vehicle type | no |
| M4 | same as M3 | same as M3 | no |

**Blackbox signal → M3 inputs** (`m2/m2_blackbox.py`, `crash_summary()`):
- ΔV = acceleration integrated over the crash pulse, in km/h
- impact direction = where the force comes from, clockwise from the front: 0° front, 90° right, 180° rear, 270° left (driver's door in Algeria). Same convention as NASS/CISS, so M3 and M4 use it directly.
- rollover = rolled past 90° or ended upside down
- multiple impacts = a second x-y peak over 1.5 g at least 0.5 s from the first

---

## M1 · Road risk

Scores how risky it is to drive a given road **right now**, and warns the driver before they get there.

- **Model:** LightGBM, 182 trees. `m1/risk_model_nohist.txt` + `.json`.
- **Data:** French national accident database (BAAC) 2018–2024, 1.78 M rows. Each accident is paired with ~4 "nothing happened" moments sampled like traffic, so it estimates risk per passing car. Trained 2018–2022, tested 2023–2024.

**Inputs (20)**

| Group | Inputs | Source in Algeria |
|---|---|---|
| Road (9) | road type, shape (straight/curve/S-bend), speed limit, intersection type, in/out of town, one-way/two-way/divided, lanes, slope, tunnel/bridge | OpenStreetMap from GPS |
| Time (5) | hour, weekday, month, weekend, dark | clock + sun position |
| Weather (6) | rain this hour, rain over 3 h, raining, fog, snow, storm | Open-Meteo |

Most used: speed limit 37%, road type 12%, lanes 10%, hour 7.5%. The road codes are the French BAAC codes, so OpenStreetMap tags must be translated to them.

**Output:** a score read as "× riskier than an average situation", then levels:

| Level | Rule | App action |
|---|---|---|
| very high | ≥ 3× | voice warning before entering the road |
| high | 1.5–3× | visible warning |
| medium | 0.7–1.5× | map only |
| low | < 0.7× | nothing |

**Performance (2023–24, years never seen)**

| Version | AUC | Riskiest 10% hold | Riskiest 20% hold |
|---|---|---|---|
| road + time | 0.799 | 31% of accidents | 51% |
| **road + time + weather (saved)** | **0.800** | **32%** | **52%** |
| + accident history (not available in Algeria) | 0.824 | 38% | 56% |

Examples (dry): rural curve 80 km/h Saturday 2h dark 6.5× very high · city street Friday 17h 4.3× very high · same street Tuesday 4h 2.8× high · motorway 130 Wednesday 10h 0.6× low.

**Known problems**
- **Fix before the demo:** blank OpenStreetMap fields make a road look much safer (town street 3.3× → 0.33× with no speed limit). Fill gaps with defaults by road type before calling the model, or retrain with gaps. The training table is only on Kaggle.
- Weather barely helps; heavy rain even scores lower than dry on one example. Don't demo rain.
- French roads and drivers; traffic approximated by a typical daily curve.

---

## M2 · Crash detection (blackbox)

Decides from a 16 s blackbox recording whether the car crashed.

- **Data:** VZCrash (2026, Hugging Face, gated, CC BY-NC). 189,303 real recordings from devices fixed in 73,010 commercial vehicles, labeled by 3 experts with dashcam video. 31,079 crashes; near-misses and normal driving (potholes, kerbs…) count as no crash. Split by vehicle: train 137,954 · validation 27,175 · test 24,174.
- **Input:** 16 s window after the device's g-force trigger: accelerometer (g) and gyroscope (deg/s) at 100 Hz, GPS speed at 1 Hz. Axes x forward, y left, z up. Clipped to ±50 g / ±2000 deg/s.
- **Models:** two physics rules, LightGBM on 43 features, a CNN-RNN (0.29 M parameters) on the raw signals, and their average (deployed).

**Performance (test set)**

| Model | AP | ROC AUC | Recall @ 95% precision | @ 99% |
|---|---|---|---|---|
| Rule: ΔV ≥ 8 km/h in 150 ms (airbag-module style) | 0.843 | 0.956 | 52.0% | 0% |
| Rule: peak g-force (paper baseline) | 0.896 | 0.979 | 35.6% | 0% |
| LightGBM | 0.983 | 0.996 | 90.4% | 71.1% |
| CNN-RNN | 0.990 | 0.998 | 95.6% | 76.0% |
| **Ensemble (deployed)** | **0.990** | **0.998** | **95.7%** | **80.7%** |

Our peak-g rule matches the paper's 0.896 exactly; the paper's best model scored 0.976. AP by vehicle: cars 0.992, vans 0.992, trucks 0.986.

**Output levels** (cuts from validation, numbers on test)

| Level | Rule | Crashes caught | Non-crashes flagged | Platform action |
|---|---|---|---|---|
| crash | p ≥ 0.96 | 72.3% | 0.10% | red alert, warn cars behind |
| likely | p ≥ 0.57 | 95.0% | 0.93% | 30 s "Are you OK?" countdown, pre-alert dispatcher |
| possible | p ≥ 0.09 | 99.2% | 3.9% | quietly ask driver and witnesses |
| none | below | – | – | log only |

**Real roads:** only ~1 triggered event in 5,000 is a crash. At 75% recall the rule gives 2,596 false alarms per 100k test events, the ensemble 125: about 20× fewer. The paper measured the same rule at 106 per 100k on real roads, so by the same ratio ours would be roughly 5 per 100k (a rough estimate, not a measurement).

**Size:** LightGBM 2.7 MB, CNN-RNN 1.2 MB (ONNX, runs on CPU). Training took ~10 min of compute on a Kaggle T4.

**Known problems**
- `crash_summary()` flags 46% of detected crashes as multiple impacts: the 1.5 g second-peak threshold probably counts rebounds. Tune it; it is M3's 3rd input.
- Median ΔV of detected crashes is 8.3 km/h (minor fleet contacts), so M3 would rate most of them low. Expected.
- Commercial vehicles; recalibrate on our own blackbox data. Phone-side detection not started.

**How to retrain:** see [Running the notebooks](#running-the-notebooks).

---

## M3 · Injury severity

The chance the occupant is seriously injured (MAIS 3+), turned into dispatch levels.

- **Model:** LightGBM, 176 trees, monotone in ΔV. `m3/models/`.
- **Data:** NASS-CDS 2010–15 + CISS 2017–23: 29,945 occupants (15,826 crashes) with ΔV, direction, age and sex. 8.7% seriously injured. Split by crash.
- **Inputs (10):** ΔV 65.8% · age 13.4% · impact direction (sin + cos) 9.6% · multiple impacts 6.6% · rollover 2.8% · vehicle type (SUV/van/pickup) 1.1% · sex 0.6%. No BMI: its missing values leaked the answer, so it was removed.

**Performance (test)**

| Model | AUC | AUC (US-weighted) | Over-triage @ 90% catch | @ 95% |
|---|---|---|---|---|
| ΔV only | 0.837 | 0.808 | 51.2% | 74.3% |
| logistic regression (OnStar-style) | 0.884 | 0.901 | 32.5% | 42.6% |
| **our model (saved)** | **0.889** | **0.898** | **31.2%** | **40.1%** |
| + seatbelt (people with known belt use) | 0.897 | 0.896 | 29.1% | 39.4% |

Seriously injured predicted high or extreme: **94.8%** · predicted low (the dangerous miss): **1.6%** · not-serious predicted high or extreme: 39.6%.

**Levels:** extreme ≥ 50% · high ≥ 3.6% (catches 90%) · medium ≥ 2.2% (catches 95%) · low below. Pregnancy, heart disease or blood thinners raise the level by one, as a rule outside the model (not implemented yet).

Examples: parking bump ΔV 8, man 30 → 0.3% low · driver's door ΔV 35, man 68 → 40.5% high · RN5 guardrail ΔV 55, two impacts → 43.5% high.

**Limits:** investigated crashes over-represent serious ones (8.7% vs 2.2% in the US population), so read the probability as a ranking. ΔV here comes from reconstruction; ours comes from the accelerometer, which nobody has compared yet.

---

## M4 · Injury map

Which body regions are injured, for the hospital's digital twin.

- **Model:** 7 LightGBM models, one per region. `m4/models/`.
- **Data:** CISS 2017–23, 18,297 occupants. Same inputs as M3.
- **Output:** chance of an AIS 2+ injury per region (head, face, thorax, abdomen, spine incl. neck, arms, legs), shown as **likely** (≥ half of those marked are really injured), **check** (catches most injuries in the region), **unlikely**.

| Region | AUC | Can reach "likely"? |
|---|---|---|
| abdomen | 0.879 | yes |
| thorax | 0.867 | yes |
| legs | 0.856 | yes |
| face | 0.824 | no |
| spine | 0.816 | no |
| arms | 0.775 | rarely |
| head | 0.774 | no |

Mean AUC 0.827 (rules from papers 0.761, logistic regression 0.821). Top-2 hit among injured people 65% (random 46%). "Check" catches 75–87% of injuries. Seat position adds nothing.

**Present it as "where to look first", not a diagnosis.** Head injuries matter most and are the hardest to predict.

---

## Running the notebooks

**M1, M3, M4 (local CPU):** use the `solvex-m3` Jupyter kernel (`m3/requirements.txt`). M3 and M4 rebuild their training tables with their `build_*_dataset.py` scripts. M1's training table is on Kaggle; `m1/data/` is empty locally.

**M2 (Kaggle GPU):**
1. Accept the VZCrash terms on Hugging Face and create a read token.
2. Import `m2/train_m2_kaggle.ipynb` into Kaggle. Add-ons → Secrets → `HF_TOKEN`. Settings → GPU T4 (not P100), Internet on.
3. Run up to **Preflight checks**, then Save Version → Save & Run All (~15–30 min).
4. Download `m2_models.zip` into `m2/models/`. The last cell prints all scores as JSON.

If you edit `m2/m2_blackbox.py`, run `python m2/build_m2_notebook.py` to put the change into the notebook. The backend imports the same `m2_blackbox.py`.

---

## Sources

- VZCrash: [dataset](https://huggingface.co/datasets/vzc-research-chapter/VZCrash) · [paper](https://arxiv.org/abs/2606.06074)
- NHTSA [CISS](https://www.nhtsa.gov/crash-data-systems/crash-investigation-sampling-system) · [NASS](https://www.nhtsa.gov/crash-data-systems/national-automotive-sampling-system)
- French BAAC road accident data (ONISR, data.gouv.fr)
- [Serious injury prediction with trainable B-splines (2026)](https://pubmed.ncbi.nlm.nih.gov/42102299/) · Kononen, Flannagan & Wang 2011 (OnStar) · Weaver et al. 2015 · Stitzel et al. 2016
- Event recorder rule: [49 CFR 563](https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-563)
