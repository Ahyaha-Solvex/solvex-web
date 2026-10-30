import type { IncidentSource } from '../source';
import type {
  Ambulance,
  Incident,
  SmsMessage,
  SourceEvent,
  Vitals,
} from '../types';
import {
  SEED_AMBULANCES,
  SEED_HOSPITALS,
  SEED_NEARBY_PEOPLE,
  SEED_NEARBY_VEHICLES,
  SEED_OCCUPANT_A,
  SEED_POSITION,
  SEED_PREP_ITEMS,
  SEED_ROUTE_POLYLINE,
} from './seed';
import { generateRn5Telemetry } from './telemetry';
import { parseSms } from '../sms';

export class SimSource implements IncidentSource {
  private listeners: Set<(e: SourceEvent) => void> = new Set();
  private timer: NodeJS.Timeout | null = null;
  private simSeconds = 0;
  private speed = 1.0;
  private online = true;
  private witnessesEnabled = true;

  // Active state
  private incident: Incident | null = null;
  private ambulances: Ambulance[] = JSON.parse(JSON.stringify(SEED_AMBULANCES));
  private assignedAtSimSeconds: number | null = null;

  constructor() {
    this.initScenario();
  }

  public subscribe(fn: (e: SourceEvent) => void): () => void {
    this.listeners.add(fn);
    // Send current state on connect
    if (this.incident) {
      fn({ type: 'incident_upsert', incident: this.incident });
    }
    fn({ type: 'ambulances', ambulances: this.ambulances });
    fn({ type: 'network', online: this.online });

    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(event: SourceEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[SimSource] Listener error:', err);
      }
    }
  }

  public start(): void {
    if (this.timer) return;
    const intervalMs = 200; // 5 ticks per simulated second at 1x
    this.timer = setInterval(() => {
      this.tick(0.2 * this.speed);
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isOnline(): boolean {
    return this.online;
  }

  public toggleNetwork(online: boolean): void {
    this.online = online;
    this.emit({ type: 'network', online: this.online });

    if (!online && this.incident) {
      // Degrade active incident to SMS channel if online data lost
      this.incident.channel = 'sms';
      this.incident.telemetry = undefined;
      this.incident.crash = undefined;
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }
  }

  public toggleWitnesses(enabled: boolean): void {
    this.witnessesEnabled = enabled;
  }

  public setSpeed(multiplier: number): void {
    this.speed = Math.max(0.1, multiplier);
  }

  public restart(): void {
    this.simSeconds = 0;
    this.assignedAtSimSeconds = null;
    this.ambulances = JSON.parse(JSON.stringify(SEED_AMBULANCES));
    this.initScenario();
  }

  private initScenario(): void {
    const nowIso = new Date().toISOString();
    const smsRaw = 'SOS|36.3741,3.9012|02:13|C85|SEV:HIGH|OCC:2|O+|ID4821';
    const parsed = parseSms(smsRaw);

    const initialSms: SmsMessage = {
      id: 'sms-init',
      dir: 'in',
      t: '02:13',
      raw: smsRaw,
      parsed: parsed.ok ? parsed.data : undefined,
      delivery: 'delivered',
    };

    if (this.online) {
      // Normal online path with full blackbox telemetry
      this.incident = {
        id: 'inc-rn5-4821',
        createdAt: nowIso,
        position: SEED_POSITION,
        channel: 'data',
        m2: { p: 0.85, level: 'crash' },
        confidence: { score: 85, status: 'likely' },
        crash: {
          deltaVKmh: 55.4,
          impactDirectionDeg: 270, // left lateral impact
          rollover: false,
          multipleImpacts: true,
          speedBeforeKmh: 90,
          beltUsed: true,
          airbagDeployed: true,
        },
        occupants: [JSON.parse(JSON.stringify(SEED_OCCUPANT_A))],
        lifecycle: 'detected',
        dispatch: {
          polyline: SEED_ROUTE_POLYLINE,
        },
        hospitalOptions: JSON.parse(JSON.stringify(SEED_HOSPITALS)),
        prep: JSON.parse(JSON.stringify(SEED_PREP_ITEMS)),
        nearbyPeople: JSON.parse(JSON.stringify(SEED_NEARBY_PEOPLE)),
        nearbyVehicles: JSON.parse(JSON.stringify(SEED_NEARBY_VEHICLES)),
        timeline: [
          { t: '00:00', kind: 'detected', label: 'Impact boîte noire détecté (85% confiance, pin jaune)' },
        ],
        sms: [initialSms],
        telemetry: generateRn5Telemetry(),
      };
    } else {
      // Offline SMS-only initial state
      this.incident = {
        id: 'inc-rn5-4821',
        createdAt: nowIso,
        position: SEED_POSITION,
        channel: 'sms',
        m2: { p: 0.85, level: 'crash' },
        confidence: { score: 85, status: 'likely' },
        occupants: [JSON.parse(JSON.stringify(SEED_OCCUPANT_A))],
        lifecycle: 'detected',
        dispatch: {
          polyline: SEED_ROUTE_POLYLINE,
        },
        hospitalOptions: JSON.parse(JSON.stringify(SEED_HOSPITALS)),
        prep: JSON.parse(JSON.stringify(SEED_PREP_ITEMS)),
        nearbyPeople: JSON.parse(JSON.stringify(SEED_NEARBY_PEOPLE)),
        nearbyVehicles: JSON.parse(JSON.stringify(SEED_NEARBY_VEHICLES)),
        timeline: [
          { t: '00:06', kind: 'sms_received', label: 'Alerte SMS reçue via réseau 2G (Mode dégradé)' },
        ],
        sms: [initialSms],
      };
    }

    if (this.incident) {
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }
  }

  private tick(deltaSeconds: number): void {
    const prev = this.simSeconds;
    this.simSeconds += deltaSeconds;

    if (!this.incident) return;

    // t=2: M2 crash p 0.98, M3 high, M4 map arrives
    if (prev < 2 && this.simSeconds >= 2) {
      this.incident.m2.p = 0.98;
      this.incident.timeline.unshift({
        t: '00:02',
        kind: 'detected',
        label: 'Modèles IA M1-M4 résolus: Gravité M3 élevée, cartographie M4 reçue',
      });
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }

    // t=3: Citizen countdown starts
    if (prev < 3 && this.simSeconds >= 3) {
      this.incident.timeline.unshift({
        t: '00:03',
        kind: 'alert_sent',
        label: 'Compte à rebours citoyen "Êtes-vous indemne ?" lancé (30s)',
      });
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }

    // t=33: No citizen answer -> red alert score 100
    if (prev < 33 && this.simSeconds >= 33) {
      this.incident.confidence.score = 100;
      this.incident.confidence.status = 'likely';
      this.incident.timeline.unshift({
        t: '00:33',
        kind: 'detected',
        label: 'Aucune réponse au compte à rebours citoyen → Alerte rouge (100%)',
      });
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }

    // t=40: Witness confirmation if enabled
    if (prev < 40 && this.simSeconds >= 40 && this.witnessesEnabled) {
      this.incident.confidence.status = 'witness_confirmed';
      this.incident.timeline.unshift({
        t: '00:40',
        kind: 'witness_confirm',
        label: 'Témoin sur place confirme le crash par appel d’urgence',
      });
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }

    // Progression relative to ambulance assignment
    if (this.assignedAtSimSeconds !== null) {
      const elapsedSinceAssign = this.simSeconds - this.assignedAtSimSeconds;

      // +60s after assign: On scene
      if (elapsedSinceAssign >= 60 && this.incident.lifecycle === 'dispatched') {
        this.incident.lifecycle = 'on_scene';
        this.incident.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'on_scene',
          label: 'Protection Civile arrivée sur les lieux du sinistre',
        });
        const amb = this.ambulances.find((a) => a.id === this.incident?.dispatch.ambulanceId);
        if (amb) amb.status = 'on_scene';
        this.emit({ type: 'ambulances', ambulances: this.ambulances });
        this.emit({ type: 'incident_upsert', incident: this.incident });
      }

      // +120s after assign: Transporting & live paramedic cuff vitals
      if (elapsedSinceAssign >= 120 && this.incident.lifecycle === 'on_scene') {
        this.incident.lifecycle = 'transporting';
        this.incident.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'transporting',
          label: 'Évacuation en cours vers l’Hôpital Bouira',
        });

        // Paramedic cuff vitals start drifting
        const vitals: Vitals = {
          hr: 118,
          spo2: 94,
          bpSys: 96,
          bpDia: 58,
          source: 'paramedic_cuff',
          updatedAt: new Date().toISOString(),
          history: [
            { t: '12:00', hr: 95, spo2: 98 },
            { t: '12:01', hr: 104, spo2: 96 },
            { t: '12:02', hr: 118, spo2: 94 },
          ],
        };

        if (this.incident.occupants[0]) {
          this.incident.occupants[0].vitals = vitals;
          this.emit({
            type: 'vitals',
            incidentId: this.incident.id,
            occupantId: this.incident.occupants[0].id,
            vitals,
          });
        }

        const amb = this.ambulances.find((a) => a.id === this.incident?.dispatch.ambulanceId);
        if (amb) amb.status = 'transporting';
        this.emit({ type: 'ambulances', ambulances: this.ambulances });
        this.emit({ type: 'incident_upsert', incident: this.incident });
      }

      // +240s after assign: At hospital
      if (elapsedSinceAssign >= 240 && this.incident.lifecycle === 'transporting') {
        this.incident.lifecycle = 'at_hospital';
        this.incident.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'at_hospital',
          label: 'Arrivée au service des urgences de l’Hôpital Bouira',
        });
        this.emit({ type: 'incident_upsert', incident: this.incident });
      }
    }
  }

  // Dispatcher Action: Confirm Crash
  public confirm(incidentId: string): void {
    if (!this.incident || this.incident.id !== incidentId) return;

    this.incident.confidence.status = 'confirmed';
    this.incident.confidence.score = 100;
    this.incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'dispatcher_confirm',
      label: 'Accident validé et confirmé par le régulateur Protection Civile',
    });

    this.emit({ type: 'incident_upsert', incident: this.incident });
  }

  // Dispatcher Action: Assign Ambulance
  public assignAmbulance(incidentId: string, ambulanceId: string): void {
    if (!this.incident || this.incident.id !== incidentId) return;

    this.assignedAtSimSeconds = this.simSeconds;
    this.incident.lifecycle = 'dispatched';
    this.incident.dispatch.ambulanceId = ambulanceId;
    this.incident.dispatch.etaToSceneS = 660; // 11 min

    // Update ambulance status
    this.ambulances = this.ambulances.map((amb) =>
      amb.id === ambulanceId
        ? { ...amb, status: 'assigned' as const }
        : amb
    );

    this.incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'ambulance_assigned',
      label: `Ambulance assignée: ${this.ambulances.find((a) => a.id === ambulanceId)?.unit || ambulanceId} (ETA 11 min)`,
    });

    // Outbound SMS notification
    const outboundSms: SmsMessage = {
      id: `sms-out-${Date.now()}`,
      dir: 'out',
      t: this.formatSimTime(this.simSeconds),
      raw: 'Protection Civile: Ambulance engagée. ETA estimé: 11 min.',
      delivery: 'delivered',
    };
    this.incident.sms.unshift(outboundSms);

    this.emit({ type: 'ambulances', ambulances: this.ambulances });
    this.emit({ type: 'sms', incidentId: this.incident.id, message: outboundSms });
    this.emit({ type: 'incident_upsert', incident: this.incident });
  }

  // Dispatcher Action: Call for Help
  public callForHelp(incidentId: string, radiusM: number): void {
    if (!this.incident || this.incident.id !== incidentId) return;

    this.incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'helper_called',
      label: `Appel à solidarité citoyenne diffusé (rayon ${radiusM} m)`,
    });

    // One helper accepts after 8 seconds (simulated via timeout)
    setTimeout(() => {
      if (this.incident && this.incident.nearbyPeople.length > 0) {
        this.incident.nearbyPeople[0].accepted = true;
        this.incident.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'helper_called',
          label: `Médecin de proximité Dr. Amine B. a accepté l’intervention (${this.incident.nearbyPeople[0].distanceM} m)`,
        });
        this.emit({ type: 'incident_upsert', incident: this.incident });
      }
    }, 1500);

    this.emit({ type: 'incident_upsert', incident: this.incident });
  }

  // Dispatcher Action: Close Incident
  public close(incidentId: string): void {
    if (!this.incident || this.incident.id !== incidentId) return;

    this.incident.lifecycle = 'closed';
    this.incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'closed',
      label: 'Intervention clôturée et archivée',
    });

    this.emit({ type: 'incident_upsert', incident: this.incident });
  }

  // Simulate citizen OK button
  public triggerUserOk(): void {
    if (!this.incident) return;

    this.incident.confidence.score = 0;
    this.incident.confidence.status = 'suspected';
    this.incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'user_ok',
      label: 'Le conducteur a répondu "Je vais bien" → Alerte désamorcée',
    });

    this.emit({ type: 'incident_upsert', incident: this.incident });
  }

  // Simulate SOS physical button press
  public triggerSos(): void {
    if (!this.incident) return;

    this.incident.confidence.score = 100;
    this.incident.confidence.status = 'witness_confirmed';
    this.incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'alert_sent',
      label: 'Bouton SOS d’urgence actionné manuellement dans l’habitacle',
    });

    this.emit({ type: 'incident_upsert', incident: this.incident });
  }

  private formatSimTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

// Global simulator singleton instance
export const simSource = new SimSource();
