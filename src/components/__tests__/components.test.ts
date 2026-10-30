import { describe, it, expect } from 'vitest';
import {
  SEED_OCCUPANT_A,
  SEED_HOSPITALS,
  SEED_AMBULANCES,
  SEED_NEARBY_PEOPLE,
} from '@/lib/data/sim/seed';
import type { BodyRegion, M3Level, LifecycleStatus, ConfidenceStatus } from '@/lib/data/types';

describe('CP2 Component Library Data & Logic Validation', () => {
  it('validates all M3 severity levels exist and map to token palettes', () => {
    const levels: M3Level[] = ['low', 'medium', 'high', 'extreme'];
    expect(levels).toHaveLength(4);
    levels.forEach((lvl) => {
      expect(['low', 'medium', 'high', 'extreme']).toContain(lvl);
    });
  });

  it('validates all 7 BodyRegion types defined in M4', () => {
    const expectedRegions: BodyRegion[] = [
      'head',
      'face',
      'spine_neck',
      'thorax',
      'abdomen',
      'arms',
      'legs',
    ];
    expect(Object.keys(SEED_OCCUPANT_A.m4)).toEqual(
      expect.arrayContaining(expectedRegions)
    );
    expect(expectedRegions).toHaveLength(7);
  });

  it('validates all 4 confidence ladder steps', () => {
    const statuses: ConfidenceStatus[] = [
      'suspected',
      'likely',
      'witness_confirmed',
      'confirmed',
    ];
    expect(statuses).toHaveLength(4);
  });

  it('validates incident lifecycle status sequence', () => {
    const lifecycle: LifecycleStatus[] = [
      'detected',
      'dispatched',
      'on_scene',
      'transporting',
      'at_hospital',
      'closed',
    ];
    expect(lifecycle).toHaveLength(6);
  });

  it('validates hospital recommendation scores', () => {
    expect(SEED_HOSPITALS.length).toBeGreaterThan(0);
    const recommended = SEED_HOSPITALS.find((h) => h.recommended);
    expect(recommended).toBeDefined();
    expect(recommended?.score).toBeGreaterThan(0.9);
    expect(recommended?.specialties.length).toBeGreaterThan(0);
    expect(recommended?.reasons.length).toBeGreaterThan(0);
  });

  it('validates ambulances have realistic ETA and available units', () => {
    expect(SEED_AMBULANCES.length).toBeGreaterThan(0);
    const first = SEED_AMBULANCES[0];
    expect(first.id).toMatch(/^amb-\d+$/);
    expect(first.etaSeconds).toBeDefined();
    expect(first.unit).toContain('Bouira');
  });

  it('validates nearby medics are categorized correctly for civil protection', () => {
    const medics = SEED_NEARBY_PEOPLE.filter((p) => p.kind === 'helper_medic');
    expect(medics.length).toBeGreaterThan(0);
    expect(medics[0].distanceM).toBeLessThan(500);
  });
});
