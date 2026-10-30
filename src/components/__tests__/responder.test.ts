import { describe, it, expect } from 'vitest';
import type { Incident, NearbyPerson } from '../../lib/data/types';

describe('Responder Dashboard Business Logic & Filters', () => {
  const mockIncidents: Incident[] = [
    {
      id: 'inc-1',
      createdAt: '2026-10-30T10:00:00Z',
      position: { lat: 36.37, lng: 3.90, roadLabel: 'RN5, km 112' },
      channel: 'data',
      m2: { p: 0.95, level: 'crash' },
      confidence: { score: 75, status: 'likely' },
      occupants: [],
      lifecycle: 'detected',
      dispatch: {},
      hospitalOptions: [],
      prep: [],
      nearbyPeople: [],
      nearbyVehicles: [],
      timeline: [],
      sms: [],
    },
    {
      id: 'inc-2',
      createdAt: '2026-10-30T10:05:00Z',
      position: { lat: 36.38, lng: 3.92, roadLabel: 'A1, Oued Rhiou' },
      channel: 'data',
      m2: { p: 0.99, level: 'crash' },
      confidence: { score: 94, status: 'confirmed' },
      occupants: [],
      lifecycle: 'dispatched',
      dispatch: { ambulanceId: 'AMB-02' },
      hospitalOptions: [],
      prep: [],
      nearbyPeople: [],
      nearbyVehicles: [],
      timeline: [],
      sms: [],
    },
    {
      id: 'inc-3',
      createdAt: '2026-10-30T10:08:00Z',
      position: { lat: 36.40, lng: 3.95, roadLabel: 'CW12, Lakhdaria' },
      channel: 'sms',
      m2: { p: 0.60, level: 'possible' },
      confidence: { score: 55, status: 'suspected' },
      occupants: [],
      lifecycle: 'detected',
      dispatch: {},
      hospitalOptions: [],
      prep: [],
      nearbyPeople: [],
      nearbyVehicles: [],
      timeline: [],
      sms: [],
    },
  ];

  it('sorts queue by confidence score desc, then by createdAt desc', () => {
    const sorted = [...mockIncidents].sort((a, b) => {
      if (b.confidence.score !== a.confidence.score) {
        return b.confidence.score - a.confidence.score;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    expect(sorted[0].id).toBe('inc-2'); // 94 score
    expect(sorted[1].id).toBe('inc-1'); // 75 score
    expect(sorted[2].id).toBe('inc-3'); // 55 score
  });

  it('filters queue by needs_action (unconfirmed or detected)', () => {
    const needsAction = mockIncidents.filter(
      (inc) => inc.confidence.status !== 'confirmed' || inc.lifecycle === 'detected'
    );

    // inc-1 is likely/detected, inc-3 is suspected/detected
    expect(needsAction.map((i) => i.id)).toEqual(['inc-1', 'inc-3']);
  });

  it('filters queue by dispatched (dispatched lifecycle or assigned ambulance)', () => {
    const dispatched = mockIncidents.filter(
      (inc) => inc.lifecycle === 'dispatched' || !!inc.dispatch.ambulanceId
    );

    expect(dispatched.map((i) => i.id)).toEqual(['inc-2']);
  });

  it('computes nearby helpers summary accurately with medic highlighting', () => {
    const people: NearbyPerson[] = [
      { id: 'p1', kind: 'helper_medic', lat: 36.37, lng: 3.90, distanceM: 250 },
      { id: 'p2', kind: 'helper_medic', lat: 36.37, lng: 3.90, distanceM: 800 },
      { id: 'p3', kind: 'helper_first_aider', lat: 36.37, lng: 3.90, distanceM: 400 },
      { id: 'p4', kind: 'volunteer', lat: 36.37, lng: 3.90, distanceM: 1200 },
      { id: 'p5', kind: 'volunteer', lat: 36.37, lng: 3.90, distanceM: 1500 },
    ];

    let medics = 0;
    let firstAiders = 0;
    let volunteers = 0;

    for (const p of people) {
      if (p.kind === 'helper_medic') medics++;
      else if (p.kind === 'helper_first_aider') firstAiders++;
      else volunteers++;
    }

    expect(medics).toBe(2);
    expect(firstAiders).toBe(1);
    expect(volunteers).toBe(2);
  });

  it('calculates relative replay time against impact point correctly', () => {
    const impactAtMs = 5000;

    const tPre = 2400;
    const relPre = (tPre - impactAtMs) / 1000;
    expect(`${relPre >= 0 ? '+' : ''}${relPre.toFixed(2)}s`).toBe('-2.60s');

    const tImpact = 5000;
    const relImpact = (tImpact - impactAtMs) / 1000;
    expect(`${relImpact >= 0 ? '+' : ''}${relImpact.toFixed(2)}s`).toBe('+0.00s');

    const tPost = 8450;
    const relPost = (tPost - impactAtMs) / 1000;
    expect(`${relPost >= 0 ? '+' : ''}${relPost.toFixed(2)}s`).toBe('+3.45s');
  });
});
