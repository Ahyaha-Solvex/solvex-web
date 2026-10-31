import type { IncidentSource } from '../source';
import type {
  Ambulance,
  Incident,
  PhoneReport,
  SourceEvent,
  TriageColor,
} from '../types';
import { simSource } from '../sim/scenario';

interface BackendSnapshot {
  ok: boolean;
  incidents: Record<string, Incident>;
  ambulances: Ambulance[];
  online: boolean;
  updatedAt: string;
}

/**
 * LiveSource implements IncidentSource against the SolveX backend server
 * (/api/backend or NEXT_PUBLIC_BACKEND_URL + /ws/monitor WebSocket),
 * while keeping local SimSource synchronized for zero-latency UI updates.
 */
export class LiveSource implements IncidentSource {
  private listeners: Set<(e: SourceEvent) => void> = new Set();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;
  private online = true;
  private unsubLocal: (() => void) | null = null;
  private baseUrl: string;

  constructor(baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public start(): void {
    simSource.start();
    if (!this.unsubLocal) {
      this.unsubLocal = simSource.subscribe((e) => this.emit(e));
    }

    if (typeof window === 'undefined') return;

    // Connect to FastAPI /ws/monitor WebSocket if NEXT_PUBLIC_BACKEND_URL is provided
    if (this.baseUrl) {
      try {
        const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws/monitor';
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (msg) => {
          try {
            const payload = JSON.parse(String(msg.data)) as SourceEvent | BackendSnapshot;
            if ('type' in payload) {
              this.emit(payload);
            } else if ('incidents' in payload) {
              this.applySnapshot(payload);
            }
          } catch {
            // ignore malformed packet
          }
        };
      } catch {
        // Fallback to HTTP sync
      }
    }

    // Sync initial state from /api/backend/state
    void this.fetchState();
  }

  public stop(): void {
    simSource.stop();
    if (this.unsubLocal) {
      this.unsubLocal();
      this.unsubLocal = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public subscribe(fn: (e: SourceEvent) => void): () => void {
    this.listeners.add(fn);
    const unsub = simSource.subscribe(fn);
    return () => {
      this.listeners.delete(fn);
      unsub();
    };
  }

  private emit(event: SourceEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private applySnapshot(snap: BackendSnapshot): void {
    this.online = snap.online;
    this.emit({ type: 'network', online: snap.online });
    this.emit({ type: 'ambulances', ambulances: snap.ambulances });
    Object.values(snap.incidents).forEach((incident) => {
      this.emit({ type: 'incident_upsert', incident });
    });
  }

  private async fetchState(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch(`${this.baseUrl}/api/backend/state`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const snap = (await res.json()) as BackendSnapshot;
        if (snap.ok) {
          this.online = snap.online;
        }
      }
    } catch {
      // Offline or local-only mode
    }
  }

  private postAction(body: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    void fetch(`${this.baseUrl}/api/backend/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      // Handled optimistically by local engine
    });
  }

  public confirm(incidentId: string): void {
    simSource.confirm(incidentId);
    this.postAction({ action: 'confirm', incidentId });
  }

  public assignAmbulance(incidentId: string, ambulanceId: string): void {
    simSource.assignAmbulance(incidentId, ambulanceId);
    this.postAction({ action: 'assignAmbulance', incidentId, ambulanceId });
  }

  public dispatchToHospital(
    incidentId: string,
    hospitalId: string,
    ambulanceId?: string
  ): void {
    simSource.dispatchToHospital(incidentId, hospitalId, ambulanceId);
    this.postAction({
      action: 'dispatchToHospital',
      incidentId,
      hospitalId,
      ambulanceId,
    });
  }

  public callForHelp(incidentId: string, radiusM: number): void {
    simSource.callForHelp(incidentId, radiusM);
    this.postAction({ action: 'callForHelp', incidentId, radiusM });
  }

  public callVolunteer(incidentId: string, personId: string): void {
    simSource.callVolunteer(incidentId, personId);
    this.postAction({ action: 'callVolunteer', incidentId, personId });
  }

  public confirmHelper(incidentId: string, personId: string): void {
    simSource.confirmHelper(incidentId, personId);
    this.postAction({ action: 'confirmHelper', incidentId, personId });
  }

  public callContact(incidentId: string, who: 'driver' | 'contact'): void {
    simSource.callContact(incidentId, who);
    this.postAction({ action: 'callContact', incidentId, who });
  }

  public setTriage(
    incidentId: string,
    occupantId: string,
    color: TriageColor
  ): void {
    simSource.setTriage(incidentId, occupantId, color);
    this.postAction({ action: 'setTriage', incidentId, occupantId, color });
  }

  public assignHospital(
    incidentId: string,
    occupantId: string,
    hospitalId: string
  ): void {
    simSource.assignHospital(incidentId, occupantId, hospitalId);
    this.postAction({
      action: 'assignHospital',
      incidentId,
      occupantId,
      hospitalId,
    });
  }

  public reportPhoneCall(report: PhoneReport): string {
    const id = simSource.reportPhoneCall(report);
    this.postAction({ action: 'reportPhoneCall', report });
    return id;
  }

  public warnDriver(
    incidentId: string,
    message: 'dont_go' | 'no_help'
  ): void {
    simSource.warnDriver(incidentId, message);
    this.postAction({ action: 'warnDriver', incidentId, message });
  }

  public acknowledge(incidentId: string): void {
    simSource.acknowledge(incidentId);
    this.postAction({ action: 'acknowledge', incidentId });
  }

  public close(incidentId: string): void {
    simSource.close(incidentId);
    this.postAction({ action: 'close', incidentId });
  }

  public isOnline(): boolean {
    return simSource.isOnline() && this.online;
  }

  public toggleNetwork(online: boolean): void {
    this.online = online;
    simSource.toggleNetwork(online);
    this.postAction({ action: 'toggleNetwork', online });
  }

  public toggleWitnesses(enabled: boolean): void {
    simSource.toggleWitnesses(enabled);
    this.postAction({ action: 'toggleWitnesses', enabled });
  }

  public setSpeed(multiplier: number): void {
    simSource.setSpeed(multiplier);
    this.postAction({ action: 'setSpeed', multiplier });
  }

  public restart(): void {
    simSource.restart();
    this.postAction({ action: 'restart' });
  }

  public triggerUserOk(): void {
    simSource.triggerUserOk();
    this.postAction({ action: 'triggerUserOk' });
  }

  public triggerSos(): void {
    simSource.triggerSos();
    this.postAction({ action: 'triggerSos' });
  }

  public startDeadZone(): void {
    simSource.startDeadZone();
    this.postAction({ action: 'startDeadZone' });
  }

  public triggerIsolatedCrash(): void {
    simSource.triggerIsolatedCrash();
    this.postAction({ action: 'triggerIsolatedCrash' });
  }

  public triggerMultiWitnessCrash(): void {
    simSource.triggerMultiWitnessCrash();
    this.postAction({ action: 'triggerMultiWitnessCrash' });
  }
}

export const liveSource = new LiveSource();
