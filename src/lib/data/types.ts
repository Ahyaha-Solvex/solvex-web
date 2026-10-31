export type M2Level = 'none' | 'possible' | 'likely' | 'crash';
export type M3Level = 'low' | 'medium' | 'high' | 'extreme';
export type M4Level = 'unlikely' | 'check' | 'likely';
export type BodyRegion = 'head' | 'face' | 'spine_neck' | 'thorax' | 'abdomen' | 'arms' | 'legs';
export type ConfidenceStatus = 'suspected' | 'likely' | 'witness_confirmed' | 'confirmed';
export type Channel = 'data' | 'sms' | 'phone';
export type LifecycleStatus = 'detected' | 'dispatched' | 'on_scene' | 'transporting' | 'at_hospital' | 'closed';

export interface Position {
  lat: number;
  lng: number;
  roadLabel: string; // e.g. "RN5, km 112, towards Bouira"
}

export interface CrashFacts {
  deltaVKmh: number;
  impactDirectionDeg: number; // 0 front, 90 right, 180 rear, 270 left
  rollover: boolean;
  multipleImpacts: boolean;
  speedBeforeKmh: number;
  beltUsed: boolean | null; // null = unknown
  airbagDeployed: boolean | null;
}

export interface VitalsHistoryPoint {
  t: string;
  hr?: number;
  spo2?: number;
}

export interface Vitals {
  hr?: number;
  spo2?: number;
  bpSys?: number;
  bpDia?: number;
  source: 'watch' | 'paramedic_cuff' | 'manual';
  updatedAt: string;
  history?: VitalsHistoryPoint[];
}

export interface Profile {
  ageYears: number;
  sex: 'm' | 'f';
  bloodType: string;
  chronicDiseases: string[];
  allergies: string[];
  medications: string[];
  onBloodThinners: boolean;
  pregnant: boolean;
  emergencyContact?: {
    label: string;
    phone: string;
  };
}

export type TriageColor = 'green' | 'yellow' | 'red' | 'black';

export interface Occupant {
  id: string;
  label: string; // e.g. "Patient A"
  profile: Profile;
  m3: {
    level: M3Level;
    probability: number;
    escalatedBy?: string[];
  }; // probability = ranking score, 0..1
  m4: Record<BodyRegion, { level: M4Level; probability: number }>;
  triageColor?: TriageColor;
  hospitalId?: string; // several victims can go to different hospitals
  vitals?: Vitals;
}

export interface TimelineEvent {
  t: string;
  kind:
    | 'detected'
    | 'alert_sent'
    | 'sms_received'
    | 'witness_confirm'
    | 'dispatcher_confirm'
    | 'ambulance_assigned'
    | 'on_scene'
    | 'transporting'
    | 'at_hospital'
    | 'helper_called'
    | 'closed'
    | 'user_ok'
    | 'phone_call'
    | 'volunteer_called'
    | 'yellow_line'
    | 'zone_entered'
    | 'zone_overdue'
    | 'driver_warned'
    | 'helper_confirmed'
    | 'contact_called'
    | 'triage_set';
  label: string;
}

export interface ParsedSms {
  lat: number;
  lng: number;
  time: string;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  occupants: number;
  bloodType?: string;
  id: string;
}

export interface SmsMessage {
  id: string;
  dir: 'in' | 'out';
  t: string;
  raw: string;
  parsed?: ParsedSms;
  error?: string;
  delivery?: 'sent' | 'delivered' | 'failed';
}

export interface NearbyPerson {
  id: string;
  kind: 'helper_medic' | 'helper_first_aider' | 'volunteer' | 'staff';
  lat: number;
  lng: number;
  distanceM: number;
  accepted?: boolean;
  name?: string;
  called?: boolean;
  confirmed?: boolean; // dispatcher confirmed the helper: first-aid cards sent
}

export interface NearbyVehicle {
  id: string;
  lat: number;
  lng: number;
  headingDeg: number;
  kind: 'car' | 'truck' | 'bus' | 'moto';
}

export type HospitalCapacityStatus = 'optimal' | 'busy' | 'saturated' | 'divert';

export interface Ambulance {
  id: string;
  unit: string;
  status: 'available' | 'assigned' | 'en_route' | 'on_scene' | 'transporting';
  lat: number;
  lng: number;
  etaSeconds?: number;
  speedKmh?: number;
  headingDeg?: number;
  routeProgressPct?: number;
  destinationHospitalId?: string;
}

export interface HospitalOption {
  id: string;
  name: string;
  etaSeconds: number;
  freeBeds: number;
  totalBeds?: number;
  icuBedsFree?: number;
  occupancyPct?: number;
  capacityStatus?: HospitalCapacityStatus;
  orAvailable?: boolean;
  lat?: number;
  lng?: number;
  specialties: string[];
  score: number;
  reasons: string[];
  recommended?: boolean;
}

export interface Dispatch {
  ambulanceId?: string;
  hospitalId?: string;
  etaToSceneS?: number;
  etaToHospitalS?: number;
  polyline?: [number, number][];
  hospitalPolyline?: [number, number][];
  routeProgressPct?: number;
}

export interface PrepItem {
  id: string;
  label: string;
  reason: string;
}

export interface TelemetryWindow {
  sampleRateHz: 100;
  impactAtMs: number;
  accel: [number, number, number][];
  gyro: [number, number, number][];
  speedKmh1Hz: number[];
}

/** A driver who left coverage: nothing comes from the car once the signal goes. */
export interface DeadZoneWatch {
  phase: 'driving' | 'in_zone' | 'overdue';
  driver: string;
  road: string;
  backBy: string;
  lastSeenAt?: string;
  warned: boolean;
  toldNoHelp: boolean;
  acknowledged: boolean;
}

/** What the dispatcher learns from a phone call. */
export interface PhoneReport {
  roadLabel: string;
  victims: number;
  conscious: boolean;
  breathing: boolean;
  bleeding: boolean;
  trapped: boolean;
}

export interface Incident {
  id: string;
  createdAt: string;
  position: Position;
  channel: Channel; // 'sms' => no telemetry
  m2: { p: number; level: M2Level };
  confidence: { score: number; status: ConfidenceStatus };
  crash?: CrashFacts; // absent when only partial SMS data exists
  occupants: Occupant[];
  lifecycle: LifecycleStatus;
  dispatch: Dispatch;
  hospitalOptions: HospitalOption[];
  prep: PrepItem[];
  nearbyPeople: NearbyPerson[];
  nearbyVehicles: NearbyVehicle[];
  timeline: TimelineEvent[];
  sms: SmsMessage[];
  telemetry?: TelemetryWindow;
  phoneReport?: PhoneReport;
  deadZone?: DeadZoneWatch;
  yellowLineDrivers?: number; // drivers on the route told to clear the yellow line
  witnessCount?: number;
  scenarioKind?: 'standard' | 'isolated' | 'multi_witness';
}

export type SourceEvent =
  | { type: 'incident_upsert'; incident: Incident }
  | { type: 'ambulances'; ambulances: Ambulance[] }
  | { type: 'sms'; incidentId: string; message: SmsMessage }
  | { type: 'vitals'; incidentId: string; occupantId: string; vitals: Vitals }
  | { type: 'network'; online: boolean };
