import type { PhoneReport, SourceEvent, TriageColor } from './types';

export interface IncidentSource {
  start(): void;
  stop(): void;
  subscribe(fn: (e: SourceEvent) => void): () => void;

  // Dispatcher actions
  confirm(incidentId: string): void;
  assignAmbulance(incidentId: string, ambulanceId: string): void;
  callForHelp(incidentId: string, radiusM: number): void;
  callVolunteer(incidentId: string, personId: string): void;
  confirmHelper(incidentId: string, personId: string): void; // sends the first-aid guidance cards
  callContact(incidentId: string, who: 'driver' | 'contact'): void;
  setTriage(incidentId: string, occupantId: string, color: TriageColor): void;
  assignHospital(incidentId: string, occupantId: string, hospitalId: string): void;
  dispatchToHospital(incidentId: string, hospitalId: string, ambulanceId?: string): void;
  reportPhoneCall(report: PhoneReport): string; // returns the new incident's id
  warnDriver(incidentId: string, message: 'dont_go' | 'no_help'): void;
  acknowledge(incidentId: string): void;
  close(incidentId: string): void;

  // Simulator controls
  isOnline(): boolean;
  toggleNetwork(online: boolean): void;
  toggleWitnesses(enabled: boolean): void;
  setSpeed(multiplier: number): void;
  restart(): void;
  triggerUserOk(): void;
  triggerSos(): void;
  startDeadZone(): void;
  triggerIsolatedCrash(): void;
  triggerMultiWitnessCrash(): void;
}
