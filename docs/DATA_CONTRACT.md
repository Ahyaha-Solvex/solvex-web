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
