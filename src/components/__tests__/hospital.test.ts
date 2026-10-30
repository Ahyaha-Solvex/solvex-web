import { describe, it, expect } from 'vitest';
import type { BodyRegion, M4Level } from '../../lib/data/types';
import { BASE_ANCHORS, getAnchorsWithMirrors } from '../../lib/three/regions';

describe('Hospital Dashboard business logic', () => {
  it('correctly sorts regions by severity (likely > check > unlikely) and probability', () => {
    const mockM4: Record<BodyRegion, { level: M4Level; probability: number }> = {
      head: { level: 'likely', probability: 0.88 },
      face: { level: 'unlikely', probability: 0.05 },
      spine_neck: { level: 'likely', probability: 0.94 },
      thorax: { level: 'check', probability: 0.65 },
      abdomen: { level: 'check', probability: 0.72 },
      arms: { level: 'unlikely', probability: 0.12 },
      legs: { level: 'unlikely', probability: 0.08 },
    };

    const allRegions: BodyRegion[] = [
      'head',
      'face',
      'spine_neck',
      'thorax',
      'abdomen',
      'arms',
      'legs',
    ];

    const levelRank: Record<M4Level, number> = {
      likely: 3,
      check: 2,
      unlikely: 1,
    };

    const sorted = allRegions
      .map((region) => ({
        region,
        level: mockM4[region].level,
        probability: mockM4[region].probability,
      }))
      .sort((a, b) => {
        if (levelRank[b.level] !== levelRank[a.level]) {
          return levelRank[b.level] - levelRank[a.level];
        }
        return b.probability - a.probability;
      });

    // 1st: spine_neck (likely, 0.94)
    expect(sorted[0].region).toBe('spine_neck');
    expect(sorted[0].level).toBe('likely');

    // 2nd: head (likely, 0.88)
    expect(sorted[1].region).toBe('head');
    expect(sorted[1].level).toBe('likely');

    // 3rd: abdomen (check, 0.72)
    expect(sorted[2].region).toBe('abdomen');
    expect(sorted[2].level).toBe('check');

    // 4th: thorax (check, 0.65)
    expect(sorted[3].region).toBe('thorax');
    expect(sorted[3].level).toBe('check');

    // 5th: arms (unlikely, 0.12)
    expect(sorted[4].region).toBe('arms');
    expect(sorted[4].level).toBe('unlikely');
  });

  it('guarantees 7 distinct regions exist in the sorted injury map', () => {
    const anchors = getAnchorsWithMirrors(BASE_ANCHORS);
    const uniqueRegionIds = Array.from(new Set(anchors.map((a) => a.id)));
    expect(uniqueRegionIds.length).toBe(7);
  });
});
