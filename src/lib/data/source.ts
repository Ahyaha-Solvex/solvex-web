import type { SourceEvent } from './types';

export interface IncidentSource {
  start(): void;
  stop(): void;
  subscribe(fn: (e: SourceEvent) => void): () => void;

  // Dispatcher actions
  confirm(incidentId: string): void;
  assignAmbulance(incidentId: string, ambulanceId: string): void;
  callForHelp(incidentId: string, radiusM: number): void;
  close(incidentId: string): void;

  // Simulator controls
  isOnline(): boolean;
  toggleNetwork(online: boolean): void;
  toggleWitnesses(enabled: boolean): void;
  setSpeed(multiplier: number): void;
  restart(): void;
  triggerUserOk(): void;
  triggerSos(): void;
}
