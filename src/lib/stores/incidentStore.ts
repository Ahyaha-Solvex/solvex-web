import { create } from 'zustand';
import type { Ambulance, Incident, SourceEvent } from '../data/types';

interface IncidentStoreState {
  incidents: Record<string, Incident>;
  activeIncidentId: string | null;
  ambulances: Ambulance[];
  online: boolean;
  eventLog: SourceEvent[];

  // Reducer
  applyEvent: (event: SourceEvent) => void;

  // Selectors & Actions
  selectIncident: (id: string | null) => void;
  getActiveIncident: () => Incident | null;
  clearEvents: () => void;
}

export const useIncidentStore = create<IncidentStoreState>((set, get) => ({
  incidents: {},
  activeIncidentId: null,
  ambulances: [],
  online: true,
  eventLog: [],

  applyEvent: (event: SourceEvent) => {
    set((state) => {
      const nextLog = [event, ...state.eventLog].slice(0, 100); // keep last 100 events

      switch (event.type) {
        case 'incident_upsert': {
          const inc = event.incident;
          const isNew = !(inc.id in state.incidents);
          return {
            eventLog: nextLog,
            incidents: {
              ...state.incidents,
              [inc.id]: inc,
            },
            activeIncidentId: isNew ? inc.id : (state.activeIncidentId ?? inc.id),
          };
        }

        case 'ambulances': {
          return {
            eventLog: nextLog,
            ambulances: event.ambulances,
          };
        }

        case 'sms': {
          const inc = state.incidents[event.incidentId];
          if (!inc) return { eventLog: nextLog };
          const updatedInc = {
            ...inc,
            sms: [event.message, ...inc.sms.filter((m) => m.id !== event.message.id)],
          };
          return {
            eventLog: nextLog,
            incidents: {
              ...state.incidents,
              [inc.id]: updatedInc,
            },
          };
        }

        case 'vitals': {
          const inc = state.incidents[event.incidentId];
          if (!inc) return { eventLog: nextLog };
          const updatedOccupants = inc.occupants.map((occ) =>
            occ.id === event.occupantId ? { ...occ, vitals: event.vitals } : occ
          );
          return {
            eventLog: nextLog,
            incidents: {
              ...state.incidents,
              [inc.id]: {
                ...inc,
                occupants: updatedOccupants,
              },
            },
          };
        }

        case 'network': {
          return {
            eventLog: nextLog,
            online: event.online,
          };
        }

        default:
          return { eventLog: nextLog };
      }
    });
  },

  selectIncident: (id: string | null) => set({ activeIncidentId: id }),

  getActiveIncident: () => {
    const { incidents, activeIncidentId } = get();
    if (!activeIncidentId) return null;
    return incidents[activeIncidentId] ?? null;
  },

  clearEvents: () => set({ eventLog: [] }),
}));
