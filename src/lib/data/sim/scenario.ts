import type { IncidentSource } from '../source';
import type {
  Ambulance,
  BodyRegion,
  Incident,
  M3Level,
  Occupant,
  PhoneReport,
  SmsMessage,
  SourceEvent,
  TriageColor,
  Vitals,
} from '../types';
import {
  SEED_AMBULANCES,
  SEED_HOSPITALS,
  SEED_NEARBY_PEOPLE,
  SEED_NEARBY_VEHICLES,
  SEED_OCCUPANT_A,
  SEED_OCCUPANT_B,
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
  private assignedAtByIncident = new Map<string, number>();
  private extras = new Map<string, Incident>();   // phone calls and no-coverage watches
  private zoneStartedAt = 0;

  constructor() {
    this.initScenario();
  }

  public subscribe(fn: (e: SourceEvent) => void): () => void {
    this.listeners.add(fn);
    // Send current state on connect
    if (this.incident) {
      fn({ type: 'incident_upsert', incident: this.incident });
    }
    this.extras.forEach((incident) => fn({ type: 'incident_upsert', incident }));
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
    this.assignedAtByIncident.clear();
    this.extras.clear();
    this.ambulances = JSON.parse(JSON.stringify(SEED_AMBULANCES));
    this.initScenario();
  }

  private find(incidentId: string): Incident | null {
    return this.incident?.id === incidentId ? this.incident : this.extras.get(incidentId) ?? null;
  }

  private blankIncident(id: string, roadLabel: string, channel: Incident['channel']): Incident {
    return {
      id,
      createdAt: new Date().toISOString(),
      position: { lat: SEED_POSITION.lat + 0.03, lng: SEED_POSITION.lng - 0.04, roadLabel },
      channel,
      m2: { p: 0, level: 'none' },
      confidence: { score: 0, status: 'suspected' },
      occupants: [],
      lifecycle: 'detected',
      dispatch: {},
      hospitalOptions: JSON.parse(JSON.stringify(SEED_HOSPITALS)),
      prep: [],
      nearbyPeople: JSON.parse(JSON.stringify(SEED_NEARBY_PEOPLE)),
      nearbyVehicles: [],
      timeline: [],
      sms: [],
    };
  }

  // Dispatcher Action: log a crash reported by phone. The severity comes from the triage questions.
  public reportPhoneCall(report: PhoneReport): string {
    const level: M3Level = !report.breathing
      ? 'extreme'
      : !report.conscious || report.bleeding
      ? 'high'
      : report.trapped
      ? 'medium'
      : 'low';
    const regions: BodyRegion[] = ['head', 'face', 'spine_neck', 'thorax', 'abdomen', 'arms', 'legs'];
    const m4 = Object.fromEntries(
      regions.map((r) => [r, { level: 'unlikely', probability: 0 }])
    ) as Occupant['m4'];
    const triage = { extreme: 'red', high: 'red', medium: 'yellow', low: 'green' } as const;

    const incident = this.blankIncident(`call-${Date.now()}`, report.roadLabel, 'phone');
    incident.phoneReport = report;
    incident.confidence = { score: 70, status: 'witness_confirmed' };
    incident.occupants = Array.from({ length: report.victims }, (_, i) => ({
      ...SEED_OCCUPANT_A,
      id: `victim-${i}`,
      label: `Patient ${String.fromCharCode(65 + i)}`,
      profile: {
        ageYears: 0,
        sex: 'm',
        bloodType: '?',
        chronicDiseases: [],
        allergies: [],
        medications: [],
        onBloodThinners: false,
        pregnant: false,
      },
      m3: { level, probability: 0 },
      m4,
      triageColor: triage[level],
      vitals: undefined,
    }));
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'phone_call',
      label: `Appel téléphonique enregistré (${report.victims} victime(s))`,
    });
    this.extras.set(incident.id, incident);
    this.emit({ type: 'incident_upsert', incident });
    return incident.id;
  }

  // Dispatcher Action: call one volunteer directly instead of alerting everyone in a radius
  public callVolunteer(incidentId: string, personId: string): void {
    const incident = this.find(incidentId);
    const person = incident?.nearbyPeople.find((p) => p.id === personId);
    if (!incident || !person) return;

    person.called = true;
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'volunteer_called',
      label: `Appel direct: ${person.name ?? person.id} (${person.distanceM} m)`,
    });
    this.emit({ type: 'incident_upsert', incident });

    setTimeout(() => {
      person.accepted = true;
      incident.timeline.unshift({
        t: this.formatSimTime(this.simSeconds),
        kind: 'volunteer_called',
        label: `${person.name ?? person.id} a accepté et se rend sur place`,
      });
      this.emit({ type: 'incident_upsert', incident });
    }, 1500);
  }

  // Dispatcher Action: confirm a helper who accepted; their phone gets the first-aid cards, scene safety first
  public confirmHelper(incidentId: string, personId: string): void {
    const incident = this.find(incidentId);
    const person = incident?.nearbyPeople.find((p) => p.id === personId);
    if (!incident || !person) return;

    person.confirmed = true;
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'helper_confirmed',
      label: `${person.name ?? person.id} confirmé: fiches premiers secours envoyées (sécurité des lieux d’abord)`,
    });
    this.emit({ type: 'incident_upsert', incident });
  }

  // Dispatcher Action: call the driver, or their emergency contact. A mock: there is no phone line.
  public callContact(incidentId: string, who: 'driver' | 'contact'): void {
    const incident = this.find(incidentId);
    if (!incident) return;

    const contact = incident.occupants[0]?.profile.emergencyContact;
    const reachable = this.online && incident.deadZone?.phase !== 'in_zone';
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'contact_called',
      label:
        who === 'driver'
          ? reachable
            ? 'Appel au conducteur: pas de réponse'
            : 'Appel au conducteur: hors réseau'
          : `Appel au contact d’urgence${contact ? `: ${contact.label}` : ''}`,
    });
    this.emit({ type: 'incident_upsert', incident });
  }

  // Dispatcher Action: START triage colour for one victim
  public setTriage(incidentId: string, occupantId: string, color: TriageColor): void {
    const incident = this.find(incidentId);
    const occupant = incident?.occupants.find((o) => o.id === occupantId);
    if (!incident || !occupant) return;

    occupant.triageColor = color;
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'triage_set',
      label: `Triage ${occupant.label}: ${color}`,
    });
    this.emit({ type: 'incident_upsert', incident });
  }

  // Dispatcher Action: send one victim to a given hospital, so one emergency room is not flooded
  public assignHospital(incidentId: string, occupantId: string, hospitalId: string): void {
    const incident = this.find(incidentId);
    const occupant = incident?.occupants.find((o) => o.id === occupantId);
    if (!incident || !occupant) return;

    occupant.hospitalId = hospitalId;
    this.emit({ type: 'incident_upsert', incident });
  }

  public warnDriver(incidentId: string, message: 'dont_go' | 'no_help'): void {
    const incident = this.find(incidentId);
    const zone = incident?.deadZone;
    if (!incident || !zone) return;

    if (message === 'dont_go') zone.warned = true;
    else zone.toldNoHelp = true;
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'driver_warned',
      label: message === 'dont_go' ? 'Conducteur averti de ne pas y aller' : 'Conducteur prévenu: les secours ne peuvent pas l’atteindre',
    });
    this.emit({ type: 'incident_upsert', incident });
  }

  public acknowledge(incidentId: string): void {
    const incident = this.find(incidentId);
    if (!incident?.deadZone) return;
    incident.deadZone.acknowledged = true;
    this.emit({ type: 'incident_upsert', incident });
  }

  // Simulator control: a driver heads into a zone without coverage
  public startDeadZone(): void {
    const road = 'RN 8B, sud de Bouira';
    const incident = this.blankIncident(`zone-${Date.now()}`, road, 'data');
    const back = new Date(Date.now() + 3600 * 1000);
    incident.deadZone = {
      phase: 'driving',
      driver: 'Karim',
      road,
      backBy: back.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      warned: false,
      toldNoHelp: false,
      acknowledged: false,
    };
    this.zoneStartedAt = this.simSeconds;
    this.extras.set(incident.id, incident);
    this.emit({ type: 'incident_upsert', incident });
  }

  // The 30 s in the zone stand for the hour the driver promised.
  private tickZones(): void {
    this.extras.forEach((incident) => {
      const zone = incident.deadZone;
      if (!zone) return;
      const elapsed = this.simSeconds - this.zoneStartedAt;
      if (zone.phase === 'driving' && elapsed >= 30) {
        zone.phase = 'in_zone';
        zone.acknowledged = true;
        zone.lastSeenAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        incident.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'zone_entered',
          label: `Signal perdu sur ${zone.road}`,
        });
        this.emit({ type: 'incident_upsert', incident });
      } else if (zone.phase === 'in_zone' && elapsed >= 60) {
        zone.phase = 'overdue';
        zone.acknowledged = false;
        incident.confidence = { score: 60, status: 'likely' };
        incident.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'zone_overdue',
          label: `${zone.driver} n'est pas de retour: contact et Gendarmerie prévenus`,
        });
        this.emit({ type: 'incident_upsert', incident });
      }
    });
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
          rollover: true,
          multipleImpacts: true,
          speedBeforeKmh: 90,
          beltUsed: true,
          airbagDeployed: true,
        },
        occupants: JSON.parse(JSON.stringify([SEED_OCCUPANT_A, SEED_OCCUPANT_B])),
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
        occupants: JSON.parse(JSON.stringify([SEED_OCCUPANT_A, SEED_OCCUPANT_B])),
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

  private interpolatePolyline(
    points: [number, number][],
    progress01: number
  ): [number, number] {
    if (points.length === 0) return [SEED_POSITION.lat, SEED_POSITION.lng];
    if (points.length === 1 || progress01 <= 0) return points[0];
    if (progress01 >= 1) return points[points.length - 1];

    const totalSegments = points.length - 1;
    const exactIdx = progress01 * totalSegments;
    const segIdx = Math.min(Math.floor(exactIdx), totalSegments - 1);
    const localT = exactIdx - segIdx;
    const [lat1, lng1] = points[segIdx];
    const [lat2, lng2] = points[segIdx + 1];
    return [lat1 + (lat2 - lat1) * localT, lng1 + (lng2 - lng1) * localT];
  }

  private buildHospitalPolyline(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): [number, number][] {
    return [
      [fromLat, fromLng],
      [fromLat + (toLat - fromLat) * 0.35, fromLng + (toLng - fromLng) * 0.25],
      [fromLat + (toLat - fromLat) * 0.7, fromLng + (toLng - fromLng) * 0.65],
      [toLat, toLng],
    ];
  }

  private tick(deltaSeconds: number): void {
    const prev = this.simSeconds;
    this.simSeconds += deltaSeconds;
    this.tickZones();

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
        label:
          this.incident.scenarioKind === 'isolated'
            ? 'Zone isolée (0 témoin à proximité) + aucune réponse conducteur → Alerte rouge autonome (100%)'
            : 'Aucune réponse au compte à rebours citoyen → Alerte rouge (100%)',
      });
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }

    // t=40: Witness confirmation if enabled (skip for isolated scenario where nobody is around)
    if (
      prev < 40 &&
      this.simSeconds >= 40 &&
      this.witnessesEnabled &&
      this.incident.scenarioKind !== 'isolated'
    ) {
      this.incident.confidence.status = 'witness_confirmed';
      this.incident.witnessCount = Math.max(this.incident.witnessCount ?? 0, 1);
      this.incident.timeline.unshift({
        t: '00:40',
        kind: 'witness_confirm',
        label: 'Témoin sur place confirme le crash par appel d’urgence',
      });
      this.emit({ type: 'incident_upsert', incident: this.incident });
    }

    // Live GPS ambulance tracking across all active incidents with assigned ambulances
    const allIncidents = [
      ...(this.incident ? [this.incident] : []),
      ...Array.from(this.extras.values()),
    ];

    for (const inc of allIncidents) {
      const assignStart =
        inc === this.incident && this.assignedAtSimSeconds !== null
          ? this.assignedAtSimSeconds
          : this.assignedAtByIncident.get(inc.id) ?? null;

      if (assignStart === null || !inc.dispatch.ambulanceId) continue;

      const elapsedSinceAssign = this.simSeconds - assignStart;
      const amb = this.ambulances.find((a) => a.id === inc.dispatch.ambulanceId);
      const routeToScene =
        inc.dispatch.polyline && inc.dispatch.polyline.length > 1
          ? inc.dispatch.polyline
          : SEED_ROUTE_POLYLINE;

      // En route to crash scene (0s .. 60s)
      if (elapsedSinceAssign < 60 && inc.lifecycle === 'dispatched') {
        const progress = Math.min(1, Math.max(0, elapsedSinceAssign / 60));
        const [lat, lng] = this.interpolatePolyline(routeToScene, progress);
        inc.dispatch.routeProgressPct = Math.round(progress * 100);
        if (elapsedSinceAssign >= 1) {
          inc.dispatch.etaToSceneS = Math.max(60, Math.round(660 * (1 - progress)));
        }
        if (amb) {
          amb.lat = lat;
          amb.lng = lng;
          amb.status = elapsedSinceAssign >= 1 ? 'en_route' : 'assigned';
          amb.speedKmh = 94;
          amb.routeProgressPct = Math.round(progress * 100);
        }
        this.emit({ type: 'ambulances', ambulances: this.ambulances });
        this.emit({ type: 'incident_upsert', incident: inc });
      }

      // +20s after assign: Yellow line alert
      if (
        elapsedSinceAssign >= 20 &&
        inc.yellowLineDrivers === undefined &&
        inc.nearbyVehicles.length > 0
      ) {
        inc.yellowLineDrivers = inc.nearbyVehicles.length;
        inc.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'yellow_line',
          label: `Libérez la ligne jaune: ${inc.yellowLineDrivers} conducteurs alertés sur l’itinéraire`,
        });
        this.emit({ type: 'incident_upsert', incident: inc });
      }

      // +60s after assign: On scene
      if (elapsedSinceAssign >= 60 && inc.lifecycle === 'dispatched') {
        inc.lifecycle = 'on_scene';
        inc.dispatch.etaToSceneS = 0;
        inc.dispatch.routeProgressPct = 100;
        inc.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'on_scene',
          label: 'Protection Civile arrivée sur les lieux du sinistre',
        });
        if (amb) {
          amb.status = 'on_scene';
          amb.lat = inc.position.lat;
          amb.lng = inc.position.lng;
          amb.speedKmh = 0;
          amb.routeProgressPct = 100;
        }
        this.emit({ type: 'ambulances', ambulances: this.ambulances });
        this.emit({ type: 'incident_upsert', incident: inc });
      }

      // +120s after assign: Transporting & live paramedic cuff vitals
      if (elapsedSinceAssign >= 120 && inc.lifecycle === 'on_scene') {
        inc.lifecycle = 'transporting';
        const targetHosp =
          inc.hospitalOptions.find((h) => h.id === inc.dispatch.hospitalId) ??
          inc.hospitalOptions[0];
        if (targetHosp && !inc.dispatch.hospitalId) {
          inc.dispatch.hospitalId = targetHosp.id;
          inc.dispatch.etaToHospitalS = targetHosp.etaSeconds;
        }
        if (targetHosp?.lat && targetHosp?.lng && !inc.dispatch.hospitalPolyline) {
          inc.dispatch.hospitalPolyline = this.buildHospitalPolyline(
            inc.position.lat,
            inc.position.lng,
            targetHosp.lat,
            targetHosp.lng
          );
        }

        inc.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'transporting',
          label: `Évacuation médicale en cours vers ${targetHosp?.name ?? 'l’Hôpital Bouira'}`,
        });

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

        if (inc.occupants[0]) {
          inc.occupants[0].vitals = vitals;
          this.emit({
            type: 'vitals',
            incidentId: inc.id,
            occupantId: inc.occupants[0].id,
            vitals,
          });
        }

        if (amb) {
          amb.status = 'transporting';
          amb.speedKmh = 86;
          amb.destinationHospitalId = inc.dispatch.hospitalId;
        }
        this.emit({ type: 'ambulances', ambulances: this.ambulances });
        this.emit({ type: 'incident_upsert', incident: inc });
      }

      // Live tracking while transporting to hospital (120s .. 240s)
      if (
        elapsedSinceAssign > 120 &&
        elapsedSinceAssign < 240 &&
        inc.lifecycle === 'transporting'
      ) {
        const progress = Math.min(1, Math.max(0, (elapsedSinceAssign - 120) / 120));
        const targetHosp =
          inc.hospitalOptions.find((h) => h.id === inc.dispatch.hospitalId) ??
          inc.hospitalOptions[0];
        const hospRoute =
          inc.dispatch.hospitalPolyline ??
          this.buildHospitalPolyline(
            inc.position.lat,
            inc.position.lng,
            targetHosp?.lat ?? 36.3785,
            targetHosp?.lng ?? 3.8925
          );
        const [lat, lng] = this.interpolatePolyline(hospRoute, progress);
        const baseEta = targetHosp?.etaSeconds ?? 660;
        inc.dispatch.etaToHospitalS = Math.max(60, Math.round(baseEta * (1 - progress)));
        inc.dispatch.routeProgressPct = Math.round(progress * 100);
        if (amb) {
          amb.lat = lat;
          amb.lng = lng;
          amb.speedKmh = 86;
          amb.routeProgressPct = Math.round(progress * 100);
        }
        this.emit({ type: 'ambulances', ambulances: this.ambulances });
        this.emit({ type: 'incident_upsert', incident: inc });
      }

      // +240s after assign: At hospital
      if (elapsedSinceAssign >= 240 && inc.lifecycle === 'transporting') {
        const targetHosp =
          inc.hospitalOptions.find((h) => h.id === inc.dispatch.hospitalId) ??
          inc.hospitalOptions[0];
        inc.lifecycle = 'at_hospital';
        inc.dispatch.etaToHospitalS = 0;
        inc.dispatch.routeProgressPct = 100;
        inc.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'at_hospital',
          label: `Arrivée au service des urgences de ${targetHosp?.name ?? 'l’Hôpital Bouira'}`,
        });
        if (amb) {
          amb.lat = targetHosp?.lat ?? inc.position.lat;
          amb.lng = targetHosp?.lng ?? inc.position.lng;
          amb.speedKmh = 0;
          amb.routeProgressPct = 100;
        }
        this.emit({ type: 'ambulances', ambulances: this.ambulances });
        this.emit({ type: 'incident_upsert', incident: inc });
      }
    }
  }

  // Dispatcher Action: Confirm Crash
  public confirm(incidentId: string): void {
    const incident = this.find(incidentId);
    if (!incident) return;

    incident.confidence.status = 'confirmed';
    incident.confidence.score = 100;
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'dispatcher_confirm',
      label: 'Accident validé et confirmé par le régulateur Protection Civile',
    });

    this.emit({ type: 'incident_upsert', incident: incident });
  }

  // Dispatcher Action: Assign Ambulance
  public assignAmbulance(incidentId: string, ambulanceId: string): void {
    const incident = this.find(incidentId);
    if (!incident) return;

    if (incident === this.incident) this.assignedAtSimSeconds = this.simSeconds;
    this.assignedAtByIncident.set(incident.id, this.simSeconds);
    incident.lifecycle = 'dispatched';
    incident.dispatch.ambulanceId = ambulanceId;
    incident.dispatch.etaToSceneS = 660; // 11 min
    incident.dispatch.routeProgressPct = 0;

    if (!incident.dispatch.hospitalId && incident.hospitalOptions[0]) {
      incident.dispatch.hospitalId = incident.hospitalOptions[0].id;
      incident.dispatch.etaToHospitalS = incident.hospitalOptions[0].etaSeconds;
    }

    // Build polyline from selected ambulance to incident position
    const selectedAmb = this.ambulances.find((a) => a.id === ambulanceId);
    if (selectedAmb) {
      incident.dispatch.polyline = this.buildHospitalPolyline(
        selectedAmb.lat,
        selectedAmb.lng,
        incident.position.lat,
        incident.position.lng
      );
    }

    // Update ambulance status
    this.ambulances = this.ambulances.map((amb) =>
      amb.id === ambulanceId
        ? { ...amb, status: 'assigned' as const, speedKmh: 92, routeProgressPct: 0 }
        : amb
    );

    incident.timeline.unshift({
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
    incident.sms.unshift(outboundSms);

    this.emit({ type: 'ambulances', ambulances: this.ambulances });
    this.emit({ type: 'sms', incidentId: incident.id, message: outboundSms });
    this.emit({ type: 'incident_upsert', incident: incident });
  }

  // Dispatcher Action: Dispatch ambulance & patient to a specific hospital facility
  public dispatchToHospital(
    incidentId: string,
    hospitalId: string,
    ambulanceId?: string
  ): void {
    const incident = this.find(incidentId);
    if (!incident) return;

    const hospital = incident.hospitalOptions.find((h) => h.id === hospitalId);
    if (!hospital) return;

    // Auto-assign an available ambulance if none is assigned yet
    const targetAmbId =
      ambulanceId ??
      incident.dispatch.ambulanceId ??
      this.ambulances.find((a) => a.status === 'available')?.id ??
      this.ambulances[0]?.id;

    if (!incident.dispatch.ambulanceId && targetAmbId) {
      this.assignAmbulance(incidentId, targetAmbId);
    }

    incident.dispatch.hospitalId = hospital.id;
    incident.dispatch.etaToHospitalS = hospital.etaSeconds;
    if (hospital.lat && hospital.lng) {
      incident.dispatch.hospitalPolyline = this.buildHospitalPolyline(
        incident.position.lat,
        incident.position.lng,
        hospital.lat,
        hospital.lng
      );
    }

    // Assign occupants to this hospital and update bed stats
    incident.occupants.forEach((occ) => {
      occ.hospitalId = hospital.id;
    });

    if (hospital.freeBeds > 0) {
      hospital.freeBeds = Math.max(0, hospital.freeBeds - 1);
      if (hospital.totalBeds) {
        hospital.occupancyPct = Math.min(
          100,
          Math.round(((hospital.totalBeds - hospital.freeBeds) / hospital.totalBeds) * 100)
        );
      }
      if (hospital.freeBeds === 0) {
        hospital.capacityStatus = 'divert';
      } else if (hospital.freeBeds <= 2) {
        hospital.capacityStatus = 'saturated';
      }
    }

    this.ambulances = this.ambulances.map((amb) =>
      amb.id === incident.dispatch.ambulanceId
        ? { ...amb, destinationHospitalId: hospital.id }
        : amb
    );

    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'transporting',
      label: `Orientation hospitalière validée: ${hospital.name} (ETA ${Math.round(
        hospital.etaSeconds / 60
      )} min · ${hospital.freeBeds} lits disponibles)`,
    });

    this.emit({ type: 'ambulances', ambulances: this.ambulances });
    this.emit({ type: 'incident_upsert', incident });
  }

  // Scenario 1: A crash where NO ONE is at that place (Isolated crash, 0 witnesses, 0 helpers)
  public triggerIsolatedCrash(): void {
    this.simSeconds = 0;
    this.assignedAtSimSeconds = null;
    this.assignedAtByIncident.clear();
    this.ambulances = JSON.parse(JSON.stringify(SEED_AMBULANCES));

    const nowIso = new Date().toISOString();
    const isolatedPos = {
      lat: 36.329,
      lng: 3.841,
      roadLabel: 'RN5, km 148, Col de Benchicao (Zone isolée)',
    };
    const smsRaw = 'SOS|36.3290,3.8410|03:14|C88|SEV:EXTREME|OCC:1|O+|ID9042';
    const parsed = parseSms(smsRaw);

    this.incident = {
      id: 'inc-rn5-4821',
      createdAt: nowIso,
      position: isolatedPos,
      channel: this.online ? 'data' : 'sms',
      m2: { p: 0.94, level: 'crash' },
      confidence: { score: 88, status: 'likely' },
      scenarioKind: 'isolated',
      witnessCount: 0,
      crash: {
        deltaVKmh: 64.2,
        impactDirectionDeg: 0,
        rollover: true,
        multipleImpacts: false,
        speedBeforeKmh: 104,
        beltUsed: true,
        airbagDeployed: true,
      },
      occupants: [
        {
          ...JSON.parse(JSON.stringify(SEED_OCCUPANT_A)),
          m3: {
            level: 'extreme',
            probability: 0.78,
            escalatedBy: ['Rollover', 'High ΔV (64 km/h)', 'Isolated zone'],
          },
          triageColor: 'red',
        },
      ],
      lifecycle: 'detected',
      dispatch: {
        polyline: this.buildHospitalPolyline(
          SEED_AMBULANCES[0].lat,
          SEED_AMBULANCES[0].lng,
          isolatedPos.lat,
          isolatedPos.lng
        ),
      },
      hospitalOptions: JSON.parse(JSON.stringify(SEED_HOSPITALS)),
      prep: JSON.parse(JSON.stringify(SEED_PREP_ITEMS)),
      nearbyPeople: [], // Nobody around at this location
      nearbyVehicles: [], // Empty road at night
      timeline: [
        {
          t: '00:01',
          kind: 'alert_sent',
          label: 'Aucun véhicule ni témoin dans un rayon de 5 km — Compte à rebours citoyen 30s lancé',
        },
        {
          t: '00:00',
          kind: 'detected',
          label: 'Impact boîte noire isolé détecté (ΔV 64.2 km/h, tonneau, 0 témoin sur place)',
        },
      ],
      sms: [
        {
          id: 'sms-iso-1',
          dir: 'in',
          t: '03:14',
          raw: smsRaw,
          parsed: parsed.ok ? parsed.data : undefined,
          delivery: 'delivered',
        },
      ],
      telemetry: generateRn5Telemetry(),
    };

    this.emit({ type: 'ambulances', ambulances: this.ambulances });
    this.emit({ type: 'incident_upsert', incident: this.incident });

    // Escalate rapidly after 2.5s since driver is unconscious and nobody is around
    setTimeout(() => {
      if (this.incident && this.incident.scenarioKind === 'isolated') {
        this.incident.confidence = { score: 100, status: 'likely' };
        this.incident.timeline.unshift({
          t: '00:30',
          kind: 'detected',
          label: 'Aucune réponse conducteur (30s) & 0 témoin sur place → Alerte maximale autonome M3/M4 (100%)',
        });
        this.emit({ type: 'incident_upsert', incident: this.incident });
      }
    }, 2500);
  }

  // Scenario 2: A crash where MANY witnesses confirm "Yes, there is a crash"
  public triggerMultiWitnessCrash(): void {
    this.simSeconds = 0;
    this.assignedAtSimSeconds = null;
    this.assignedAtByIncident.clear();
    this.ambulances = JSON.parse(JSON.stringify(SEED_AMBULANCES));

    const nowIso = new Date().toISOString();
    const highwayPos = {
      lat: 36.3815,
      lng: 3.912,
      roadLabel: 'Autoroute A1, PK 78, Échangeur Bouira',
    };
    const smsRaw = 'SOS|36.3815,3.9120|14:22|C100|SEV:HIGH|OCC:2|O+|ID7710';
    const parsed = parseSms(smsRaw);

    this.incident = {
      id: 'inc-rn5-4821',
      createdAt: nowIso,
      position: highwayPos,
      channel: this.online ? 'data' : 'sms',
      m2: { p: 0.99, level: 'crash' },
      confidence: { score: 100, status: 'witness_confirmed' },
      scenarioKind: 'multi_witness',
      witnessCount: 5,
      crash: {
        deltaVKmh: 58.0,
        impactDirectionDeg: 90,
        rollover: false,
        multipleImpacts: true,
        speedBeforeKmh: 112,
        beltUsed: true,
        airbagDeployed: true,
      },
      occupants: JSON.parse(JSON.stringify([SEED_OCCUPANT_A, SEED_OCCUPANT_B])),
      lifecycle: 'detected',
      dispatch: {
        polyline: this.buildHospitalPolyline(
          SEED_AMBULANCES[0].lat,
          SEED_AMBULANCES[0].lng,
          highwayPos.lat,
          highwayPos.lng
        ),
      },
      hospitalOptions: JSON.parse(JSON.stringify(SEED_HOSPITALS)),
      prep: JSON.parse(JSON.stringify(SEED_PREP_ITEMS)),
      nearbyPeople: JSON.parse(JSON.stringify(SEED_NEARBY_PEOPLE)),
      nearbyVehicles: JSON.parse(JSON.stringify(SEED_NEARBY_VEHICLES)),
      timeline: [
        {
          t: '00:12',
          kind: 'witness_confirm',
          label: '5 témoins à proximité ont répondu "OUI, crash confirmé" → Confiance 100% (Confirmé par témoins)',
        },
        {
          t: '00:09',
          kind: 'witness_confirm',
          label: 'Témoin #3 (Kamel B., 190 m) & Témoin #4 (Samira M., 240 m) confirment la collision',
        },
        {
          t: '00:05',
          kind: 'witness_confirm',
          label: 'Témoin #1 (Dr. Amine B.) & Témoin #2 (Chauffeur A1) ont confirmé : "Oui, accident grave"',
        },
        {
          t: '00:02',
          kind: 'alert_sent',
          label: 'Alerte "Accident à proximité : Confirmer / Infirmer" envoyée à 6 véhicules sur l’A1',
        },
        {
          t: '00:00',
          kind: 'detected',
          label: 'Impact multi-véhicules détecté par boîte noire sur Autoroute A1 (112 km/h)',
        },
      ],
      sms: [
        {
          id: 'sms-wit-1',
          dir: 'in',
          t: '14:22',
          raw: smsRaw,
          parsed: parsed.ok ? parsed.data : undefined,
          delivery: 'delivered',
        },
      ],
      telemetry: generateRn5Telemetry(),
    };

    this.emit({ type: 'ambulances', ambulances: this.ambulances });
    this.emit({ type: 'incident_upsert', incident: this.incident });
  }

  // Dispatcher Action: Call for Help
  public callForHelp(incidentId: string, radiusM: number): void {
    const incident = this.find(incidentId);
    if (!incident) return;

    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'helper_called',
      label: `Appel à solidarité citoyenne diffusé (rayon ${radiusM} m)`,
    });

    // One helper accepts after 8 seconds (simulated via timeout)
    setTimeout(() => {
      if (incident && incident.nearbyPeople.length > 0) {
        incident.nearbyPeople[0].accepted = true;
        incident.timeline.unshift({
          t: this.formatSimTime(this.simSeconds),
          kind: 'helper_called',
          label: `Médecin de proximité Dr. Amine B. a accepté l’intervention (${incident.nearbyPeople[0].distanceM} m)`,
        });
        this.emit({ type: 'incident_upsert', incident: incident });
      }
    }, 1500);

    this.emit({ type: 'incident_upsert', incident: incident });
  }

  // Dispatcher Action: Close Incident
  public close(incidentId: string): void {
    const incident = this.find(incidentId);
    if (!incident) return;

    incident.lifecycle = 'closed';
    incident.timeline.unshift({
      t: this.formatSimTime(this.simSeconds),
      kind: 'closed',
      label: 'Intervention clôturée et archivée',
    });

    this.emit({ type: 'incident_upsert', incident: incident });
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
