import { SimSource } from './sim/scenario';
import type { Ambulance, Incident, SourceEvent } from './types';

interface ServerState {
  source: SimSource;
  incidents: Record<string, Incident>;
  ambulances: Ambulance[];
  online: boolean;
  updatedAt: string;
}

const globalForServer = globalThis as unknown as {
  __SOLVEX_BACKEND__?: ServerState;
};

export function getServerEngine(): ServerState {
  if (!globalForServer.__SOLVEX_BACKEND__) {
    const source = new SimSource();
    const state: ServerState = {
      source,
      incidents: {},
      ambulances: [],
      online: true,
      updatedAt: new Date().toISOString(),
    };

    source.subscribe((ev: SourceEvent) => {
      state.updatedAt = new Date().toISOString();
      if (ev.type === 'incident_upsert') {
        state.incidents[ev.incident.id] = ev.incident;
      } else if (ev.type === 'ambulances') {
        state.ambulances = ev.ambulances;
      } else if (ev.type === 'network') {
        state.online = ev.online;
      } else if (ev.type === 'sms') {
        const inc = state.incidents[ev.incidentId];
        if (inc && !inc.sms.some((s) => s.id === ev.message.id)) {
          inc.sms = [ev.message, ...inc.sms];
        }
      } else if (ev.type === 'vitals') {
        const inc = state.incidents[ev.incidentId];
        const occ = inc?.occupants.find((o) => o.id === ev.occupantId);
        if (occ) {
          occ.vitals = ev.vitals;
        }
      }
    });

    source.start();
    globalForServer.__SOLVEX_BACKEND__ = state;
  }

  return globalForServer.__SOLVEX_BACKEND__;
}
