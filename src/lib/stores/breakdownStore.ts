import { create } from 'zustand';
import type {
  BreakdownRequest,
  TowTruckProvider,
} from '../data/breakdownTypes';
import {
  SEED_TOW_PROVIDER,
  SEED_BREAKDOWN_REQUESTS,
  createSimulatedRequest,
} from '../data/sim/seedBreakdown';

interface BreakdownState {
  provider: TowTruckProvider;
  requests: Record<string, BreakdownRequest>;
  selectedRequestId: string | null;
  activeMissionId: string | null;
  earningsDzd: number;
  isTrackingTowTruck: boolean;

  // Actions
  selectRequest: (id: string | null) => void;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  cancelMission: (id: string) => void;
  completeMission: (id: string) => void;
  toggleOnline: (online?: boolean) => void;
  simulateNewRequest: () => void;
  setTrackingTowTruck: (enabled: boolean) => void;
  tickRouteProgress: () => void;
}

function interpolatePolyline(
  points: [number, number][],
  progress: number
): { lat: number; lng: number; heading: number } {
  if (!points || points.length === 0) {
    return { lat: 36.37, lng: 3.895, heading: 0 };
  }
  if (points.length === 1 || progress <= 0) {
    return { lat: points[0][0], lng: points[0][1], heading: 0 };
  }
  if (progress >= 1) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2] || last;
    const dLat = last[0] - prev[0];
    const dLng = last[1] - prev[1];
    const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    return { lat: last[0], lng: last[1], heading: (heading + 360) % 360 };
  }

  // Calculate cumulative segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dLat = points[i + 1][0] - points[i][0];
    const dLng = points[i + 1][1] - points[i][1];
    const dist = Math.hypot(dLat, dLng);
    segmentLengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) {
    return { lat: points[0][0], lng: points[0][1], heading: 0 };
  }

  const targetDist = progress * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const p0 = points[i];
      const p1 = points[i + 1];
      const lat = p0[0] + (p1[0] - p0[0]) * segProgress;
      const lng = p0[1] + (p1[1] - p0[1]) * segProgress;
      const dLat = p1[0] - p0[0];
      const dLng = p1[1] - p0[1];
      const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
      return {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        heading: Math.round((heading + 360) % 360),
      };
    }
    accumulated += segLen;
  }

  const last = points[points.length - 1];
  return { lat: last[0], lng: last[1], heading: 0 };
}

const initialRequestsRecord = SEED_BREAKDOWN_REQUESTS.reduce(
  (acc, req) => {
    acc[req.id] = req;
    return acc;
  },
  {} as Record<string, BreakdownRequest>
);

export const useBreakdownStore = create<BreakdownState>((set, get) => ({
  provider: SEED_TOW_PROVIDER,
  requests: initialRequestsRecord,
  selectedRequestId: 'req-001',
  activeMissionId: null,
  earningsDzd: 18500,
  isTrackingTowTruck: false,

  selectRequest: (id) => {
    set({ selectedRequestId: id });
  },

  acceptRequest: (id) => {
    const current = get().requests[id];
    if (!current) return;

    set((state) => ({
      activeMissionId: id,
      selectedRequestId: id,
      isTrackingTowTruck: true,
      provider: {
        ...state.provider,
        status: 'busy',
      },
      requests: {
        ...state.requests,
        [id]: {
          ...current,
          status: 'en_route',
          acceptedAt: new Date().toISOString(),
          currentProgress: 0.05,
        },
      },
    }));
  },

  declineRequest: (id) => {
    set((state) => {
      const req = state.requests[id];
      if (!req) return state;

      const nextRequests = {
        ...state.requests,
        [id]: {
          ...req,
          status: 'declined' as const,
        },
      };

      const isSelected = state.selectedRequestId === id;
      const isActive = state.activeMissionId === id;

      return {
        requests: nextRequests,
        selectedRequestId: isSelected ? null : state.selectedRequestId,
        activeMissionId: isActive ? null : state.activeMissionId,
        provider: isActive
          ? { ...state.provider, status: 'available' }
          : state.provider,
      };
    });
  },

  cancelMission: (id) => {
    set((state) => {
      const req = state.requests[id];
      if (!req) return state;

      return {
        requests: {
          ...state.requests,
          [id]: {
            ...req,
            status: 'pending',
            currentProgress: 0,
          },
        },
        activeMissionId: state.activeMissionId === id ? null : state.activeMissionId,
        provider: { ...state.provider, status: 'available' },
      };
    });
  },

  completeMission: (id) => {
    set((state) => {
      const req = state.requests[id];
      if (!req) return state;

      return {
        earningsDzd: state.earningsDzd + req.priceDzd,
        activeMissionId: null,
        provider: {
          ...state.provider,
          status: 'available',
          totalMissions: state.provider.totalMissions + 1,
        },
        requests: {
          ...state.requests,
          [id]: {
            ...req,
            status: 'completed',
            completedAt: new Date().toISOString(),
            currentProgress: 1,
          },
        },
      };
    });
  },

  toggleOnline: (online) => {
    set((state) => ({
      provider: {
        ...state.provider,
        isOnline: online !== undefined ? online : !state.provider.isOnline,
      },
    }));
  },

  simulateNewRequest: () => {
    const { provider, requests } = get();
    const newReq = createSimulatedRequest(provider.position);
    set({
      requests: {
        ...requests,
        [newReq.id]: newReq,
      },
      selectedRequestId: newReq.id,
    });
  },

  setTrackingTowTruck: (enabled) => {
    set({ isTrackingTowTruck: enabled });
  },

  tickRouteProgress: () => {
    const { activeMissionId, requests } = get();
    if (!activeMissionId) return;
    const req = requests[activeMissionId];
    if (!req || req.status !== 'en_route') return;

    const currentProg = req.currentProgress ?? 0;
    const nextProg = Math.min(1, currentProg + 0.04);
    const interp = interpolatePolyline(req.routeCoordinates, nextProg);

    const isFinished = nextProg >= 1;

    set((state) => ({
      provider: {
        ...state.provider,
        position: {
          lat: interp.lat,
          lng: interp.lng,
          heading: interp.heading,
        },
      },
      requests: {
        ...state.requests,
        [activeMissionId]: {
          ...req,
          currentProgress: nextProg,
          status: isFinished ? 'on_scene' : 'en_route',
          etaMinutes: Math.max(0, Math.round(req.etaMinutes * (1 - nextProg))),
        },
      },
    }));
  },
}));
