import { describe, it, expect } from 'vitest';
import { BASE_ANCHORS, getAnchorsWithMirrors, REGION_CAMERA_POSES } from '../regions';
import type { BodyRegion } from '../../data/types';

describe('three.js body regions and anchors', () => {
  it('defines base anchors for all 7 regions', () => {
    const ids = BASE_ANCHORS.map((a) => a.id);
    const expectedRegions: BodyRegion[] = [
      'head',
      'face',
      'spine_neck',
      'thorax',
      'abdomen',
      'arms',
      'legs',
    ];
    for (const region of expectedRegions) {
      expect(ids).toContain(region);
    }
  });

  it('mirrors arms and legs symmetrically across x', () => {
    const fullAnchors = getAnchorsWithMirrors(BASE_ANCHORS);
    // Base has 7 anchors, 2 have side 'r' (arms, legs), so mirrored total should be 7 + 2 = 9
    expect(fullAnchors.length).toBe(9);

    const rightArm = fullAnchors.find((a) => a.id === 'arms' && a.side === 'r');
    const leftArm = fullAnchors.find((a) => a.id === 'arms' && a.side === 'l');
    expect(rightArm).toBeDefined();
    expect(leftArm).toBeDefined();
    expect(leftArm!.position[0]).toBeCloseTo(-rightArm!.position[0]);
    expect(leftArm!.position[1]).toBeCloseTo(rightArm!.position[1]);
    expect(leftArm!.position[2]).toBeCloseTo(rightArm!.position[2]);

    const rightLeg = fullAnchors.find((a) => a.id === 'legs' && a.side === 'r');
    const leftLeg = fullAnchors.find((a) => a.id === 'legs' && a.side === 'l');
    expect(rightLeg).toBeDefined();
    expect(leftLeg).toBeDefined();
    expect(leftLeg!.position[0]).toBeCloseTo(-rightLeg!.position[0]);
  });

  it('provides camera poses for all 7 body regions', () => {
    const regions: BodyRegion[] = [
      'head',
      'face',
      'spine_neck',
      'thorax',
      'abdomen',
      'arms',
      'legs',
    ];
    for (const r of regions) {
      expect(REGION_CAMERA_POSES[r]).toBeDefined();
      expect(REGION_CAMERA_POSES[r].target).toHaveLength(3);
      expect(REGION_CAMERA_POSES[r].position).toHaveLength(3);
    }
  });
});
