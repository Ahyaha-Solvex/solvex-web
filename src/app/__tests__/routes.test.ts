import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GET as getBackendState } from '@/app/api/backend/state/route';
import { POST as postBackendAction } from '@/app/api/backend/action/route';
import { routing } from '@/i18n/routing';
import { config as middlewareConfig } from '@/middleware';
import { useBreakdownStore } from '@/lib/stores/breakdownStore';
import type { Ambulance, Incident } from '@/lib/data/types';

interface BackendStateResponse {
  ok: boolean;
  incidents: Record<string, Incident>;
  ambulances: Ambulance[];
  online: boolean;
  updatedAt: number;
  error?: unknown;
}

function makePostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/backend/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('API & App Routes Test Suite', () => {
  beforeEach(async () => {
    // Reset server engine state before each test
    await postBackendAction(makePostRequest({ action: 'restart' }));
  });

  describe('GET /api/backend/state', () => {
    it('returns 200 OK with initial incidents, ambulances, and online state', async () => {
      const res = await getBackendState();
      expect(res.status).toBe(200);

      const data = (await res.json()) as BackendStateResponse;
      expect(data.ok).toBe(true);
      expect(data.online).toBe(true);
      expect(data.ambulances.length).toBeGreaterThanOrEqual(3);

      const defaultInc = data.incidents['inc-rn5-4821'];
      expect(defaultInc).toBeDefined();
      expect(defaultInc.hospitalOptions.length).toBe(4);

      const statuses = defaultInc.hospitalOptions.map((h) => h.capacityStatus);
      expect(statuses).toEqual(
        expect.arrayContaining(['optimal', 'busy', 'saturated', 'divert'])
      );
    });
  });

  describe('POST /api/backend/action', () => {
    it('returns 400 Bad Request for invalid action payloads', async () => {
      const res = await postBackendAction(
        makePostRequest({ action: 'unknown_action', foo: 123 })
      );
      expect(res.status).toBe(400);

      const data = (await res.json()) as BackendStateResponse;
      expect(data.ok).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('triggers Isolated Crash scenario (0 witnesses, empty road)', async () => {
      const res = await postBackendAction(
        makePostRequest({ action: 'triggerIsolatedCrash' })
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as BackendStateResponse;
      const inc = data.incidents['inc-rn5-4821'];
      expect(inc).toBeDefined();
      expect(inc.scenarioKind).toBe('isolated');
      expect(inc.witnessCount).toBe(0);
      expect(inc.nearbyPeople?.length ?? 0).toBe(0);
      expect(inc.confidence.score).toBe(88);
    });

    it('triggers Multi-Witness Confirmed Crash scenario (5 witnesses confirm)', async () => {
      const res = await postBackendAction(
        makePostRequest({ action: 'triggerMultiWitnessCrash' })
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as BackendStateResponse;
      const multiInc = Object.values(data.incidents).find(
        (i) => i.scenarioKind === 'multi_witness'
      );
      expect(multiInc).toBeDefined();
      expect(multiInc?.witnessCount).toBe(5);
      expect(multiInc?.confidence.score).toBe(100);
      expect(multiInc?.confidence.status).toBe('witness_confirmed');
    });

    it('confirms crash and assigns ambulance via POST action route', async () => {
      const confirmRes = await postBackendAction(
        makePostRequest({ action: 'confirm', incidentId: 'inc-rn5-4821' })
      );
      expect(confirmRes.status).toBe(200);
      const confirmedData = (await confirmRes.json()) as BackendStateResponse;
      expect(confirmedData.incidents['inc-rn5-4821'].confidence.status).toBe(
        'confirmed'
      );
      expect(confirmedData.incidents['inc-rn5-4821'].confidence.score).toBe(100);

      const assignRes = await postBackendAction(
        makePostRequest({
          action: 'assignAmbulance',
          incidentId: 'inc-rn5-4821',
          ambulanceId: 'amb-102',
        })
      );
      expect(assignRes.status).toBe(200);
      const assignedData = (await assignRes.json()) as BackendStateResponse;
      const inc = assignedData.incidents['inc-rn5-4821'];
      expect(inc.lifecycle).toBe('dispatched');
      expect(inc.dispatch.ambulanceId).toBe('amb-102');
      expect(inc.dispatch.etaToSceneS).toBe(660);
    });

    it('dispatches unit to a receiving hospital and generates hospital route polyline', async () => {
      const res = await postBackendAction(
        makePostRequest({
          action: 'dispatchToHospital',
          incidentId: 'inc-rn5-4821',
          hospitalId: 'chu-blida',
          ambulanceId: 'amb-102',
        })
      );
      expect(res.status).toBe(200);

      const data = (await res.json()) as BackendStateResponse;
      const inc = data.incidents['inc-rn5-4821'];
      expect(inc.dispatch.hospitalId).toBe('chu-blida');
      expect(inc.dispatch.ambulanceId).toBe('amb-102');
      expect(inc.dispatch.etaToHospitalS).toBe(2400);

      const poly = inc.dispatch.hospitalPolyline;
      expect(poly).toBeDefined();
      expect(poly?.length).toBeGreaterThanOrEqual(4);

      // Verify polyline starts at scene and ends at CHU Blida coordinates
      if (poly && poly.length >= 2) {
        const start = poly[0];
        const end = poly[poly.length - 1];
        expect(start[0]).toBeCloseTo(inc.position.lat, 3);
        expect(start[1]).toBeCloseTo(inc.position.lng, 3);
        expect(end[0]).toBeCloseTo(36.395, 3);
        expect(end[1]).toBeCloseTo(3.865, 3);
      }

      const amb = data.ambulances.find((a) => a.id === 'amb-102');
      expect(amb?.destinationHospitalId).toBe('chu-blida');
    });

    it('updates occupant triage color and toggles network mode', async () => {
      const triageRes = await postBackendAction(
        makePostRequest({
          action: 'setTriage',
          incidentId: 'inc-rn5-4821',
          occupantId: 'occ-1',
          color: 'yellow',
        })
      );
      expect(triageRes.status).toBe(200);
      const triageData = (await triageRes.json()) as BackendStateResponse;
      expect(
        triageData.incidents['inc-rn5-4821'].occupants[0].triageColor
      ).toBe('yellow');

      const netRes = await postBackendAction(
        makePostRequest({ action: 'toggleNetwork', online: false })
      );
      expect(netRes.status).toBe(200);
      const netData = (await netRes.json()) as BackendStateResponse;
      expect(netData.online).toBe(false);
      expect(netData.incidents['inc-rn5-4821'].channel).toBe('sms');
    });

    it('creates a new incident via reportPhoneCall action', async () => {
      const res = await postBackendAction(
        makePostRequest({
          action: 'reportPhoneCall',
          report: {
            roadLabel: 'RN5, Sortie Lakhdaria',
            victims: 2,
            conscious: true,
            breathing: true,
            bleeding: true,
            trapped: false,
          },
        })
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as BackendStateResponse;
      const phoneInc = Object.values(data.incidents).find((i) =>
        Boolean(i.phoneReport)
      );
      expect(phoneInc).toBeDefined();
      expect(phoneInc?.position.roadLabel).toBe('RN5, Sortie Lakhdaria');
      expect(phoneInc?.occupants.length).toBe(2);
    });
  });

  describe('Next.js App Router & i18n Route Configuration', () => {
    it('configures fr, en, ar locales with fr as default', () => {
      expect(routing.locales).toEqual(['fr', 'en', 'ar']);
      expect(routing.defaultLocale).toBe('fr');
    });

    it('excludes /api routes from next-intl middleware matcher', () => {
      expect(middlewareConfig.matcher).toContain(
        '/((?!api|_next|_vercel|.*\\..*).*)'
      );
    });

    it('verifies all required App Router pages exist and enforce library boundaries', () => {
      const appDir = path.resolve(process.cwd(), 'src/app');
      const requiredRoutes = [
        '[locale]/(app)/page.tsx',
        '[locale]/(app)/responder/page.tsx',
        '[locale]/(app)/hospital/page.tsx',
        '[locale]/(app)/breakdown/page.tsx',
        '[locale]/(marketing)/landing/page.tsx',
        '[locale]/(app)/lab/data/page.tsx',
        '[locale]/(app)/lab/body/page.tsx',
        '[locale]/(app)/lab/stage/page.tsx',
        '[locale]/(app)/lab/tokens/page.tsx',
        'api/backend/state/route.ts',
        'api/backend/action/route.ts',
      ];

      for (const relPath of requiredRoutes) {
        const fullPath = path.join(appDir, relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }

      // Verify Rule 5: (marketing) landing route does not import antd
      const landingSource = fs.readFileSync(
        path.join(appDir, '[locale]/(marketing)/landing/page.tsx'),
        'utf-8'
      );
      expect(landingSource).not.toMatch(/from\s+['"]antd['"]/);
    });
  });

  describe('On-Demand Breakdown & Towing Service Store', () => {
    it('initializes with seed requests, available provider, and selected request', () => {
      const state = useBreakdownStore.getState();
      expect(state.provider.unitCode).toBe('DEP-07');
      expect(state.requests['req-001']).toBeDefined();
      expect(state.requests['req-001'].status).toBe('pending');
      expect(state.requests['req-001'].routeCoordinates.length).toBeGreaterThan(1);
    });

    it('accepts a request, marks provider busy, and updates mission to en_route', () => {
      const { acceptRequest } = useBreakdownStore.getState();
      acceptRequest('req-001');

      const updated = useBreakdownStore.getState();
      expect(updated.activeMissionId).toBe('req-001');
      expect(updated.requests['req-001'].status).toBe('en_route');
      expect(updated.provider.status).toBe('busy');
      expect(updated.isTrackingTowTruck).toBe(true);
    });

    it('advances route progress via tickRouteProgress and completes mission', () => {
      const { tickRouteProgress, completeMission } = useBreakdownStore.getState();
      tickRouteProgress();

      const progressing = useBreakdownStore.getState();
      expect(progressing.requests['req-001'].currentProgress).toBeGreaterThan(0.05);

      const initialEarnings = progressing.earningsDzd;
      const fee = progressing.requests['req-001'].priceDzd;
      completeMission('req-001');

      const completed = useBreakdownStore.getState();
      expect(completed.activeMissionId).toBeNull();
      expect(completed.requests['req-001'].status).toBe('completed');
      expect(completed.earningsDzd).toBe(initialEarnings + fee);
      expect(completed.provider.status).toBe('available');
    });

    it('declines a request and removes it from active consideration', () => {
      const { declineRequest } = useBreakdownStore.getState();
      declineRequest('req-002');

      const updated = useBreakdownStore.getState();
      expect(updated.requests['req-002'].status).toBe('declined');
    });
  });
});
