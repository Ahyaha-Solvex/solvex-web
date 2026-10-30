export type M2Level = 'none' | 'possible' | 'likely' | 'crash';
export type M3Level = 'low' | 'medium' | 'high' | 'extreme';
export type M4Level = 'unlikely' | 'check' | 'likely';
export type BodyRegion = 'head' | 'face' | 'spine_neck' | 'thorax' | 'abdomen' | 'arms' | 'legs';
export type ConfidenceStatus = 'suspected' | 'likely' | 'witness_confirmed' | 'confirmed';
export type Channel = 'data' | 'sms';
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
  triageColor?: 'green' | 'yellow' | 'red' | 'black';
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
    | 'user_ok';
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
}

export interface NearbyVehicle {
  id: string;
  lat: number;
  lng: number;
  headingDeg: number;
  kind: 'car' | 'truck' | 'bus' | 'moto';
}

export interface Ambulance {
  id: string;
  unit: string;
  status: 'available' | 'assigned' | 'en_route' | 'on_scene' | 'transporting';
  lat: number;
  lng: number;
  etaSeconds?: number;
}

export interface HospitalOption {
  id: string;
  name: string;
  etaSeconds: number;
  freeBeds: number;
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
}

export type SourceEvent =
  | { type: 'incident_upsert'; incident: Incident }
  | { type: 'ambulances'; ambulances: Ambulance[] }
  | { type: 'sms'; incidentId: string; message: SmsMessage }
  | { type: 'vitals'; incidentId: string; occupantId: string; vitals: Vitals }
  | { type: 'network'; online: boolean };
