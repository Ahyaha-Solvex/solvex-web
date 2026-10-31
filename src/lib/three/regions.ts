import type { BodyRegion } from '../data/types';

export interface BodyRegionAnchor {
  id: BodyRegion;
  side?: 'l' | 'r';
  position: [number, number, number];
  radius: number;
}

export interface RegionCameraPose {
  target: [number, number, number];
  position: [number, number, number];
}

/**
 * Base anchor definitions.
 * Arms and legs specify the right side ('r', +x), and are automatically mirrored across x to create 'l' (-x).
 * Units are relative to a body centered at [0, 0, 0] normalized to 1.8 units tall:
 * - Top of head ~ +0.9
 * - Feet ~ -0.9
 */
export const BASE_ANCHORS: BodyRegionAnchor[] = [
  {
    id: 'head',
    position: [0, 0.72, 0],
    radius: 0.11,
  },
  {
    id: 'face',
    position: [0, 0.68, 0.085],
    radius: 0.08,
  },
  {
    id: 'spine_neck',
    position: [0, 0.54, -0.04],
    radius: 0.09,
  },
  {
    id: 'thorax',
    position: [0, 0.36, 0.03],
    radius: 0.13,
  },
  {
    id: 'abdomen',
    position: [0, 0.12, 0.03],
    radius: 0.12,
  },
  {
    id: 'arms',
    side: 'r',
    position: [0.30, 0.22, 0],
    radius: 0.11,
  },
  {
    id: 'legs',
    side: 'r',
    position: [0.15, -0.42, 0],
    radius: 0.13,
  },
];

/**
 * Expands anchors to include mirrored left/right anchors for symmetrical regions (arms, legs).
 */
export function getAnchorsWithMirrors(anchors: BodyRegionAnchor[] = BASE_ANCHORS): BodyRegionAnchor[] {
  const result: BodyRegionAnchor[] = [];

  for (const anchor of anchors) {
    if (anchor.side === 'r') {
      // Right anchor
      result.push(anchor);
      // Mirrored Left anchor (-x)
      result.push({
        ...anchor,
        side: 'l',
        position: [-anchor.position[0], anchor.position[1], anchor.position[2]],
      });
    } else {
      result.push(anchor);
    }
  }

  return result;
}

/**
 * Default camera poses for region focus (600ms tween).
 * target: where the camera looks at.
 * position: where the camera is positioned.
 */
export const REGION_CAMERA_POSES: Record<BodyRegion, RegionCameraPose> = {
  head: {
    target: [0, 0.72, 0],
    position: [0, 0.75, 1.2],
  },
  face: {
    target: [0, 0.68, 0.085],
    position: [0, 0.68, 1.0],
  },
  spine_neck: {
    target: [0, 0.54, -0.04],
    position: [0, 0.60, -1.3], // View from behind
  },
  thorax: {
    target: [0, 0.36, 0.03],
    position: [0, 0.36, 1.3],
  },
  abdomen: {
    target: [0, 0.12, 0.03],
    position: [0, 0.12, 1.3],
  },
  arms: {
    target: [0, 0.22, 0],
    position: [0, 0.22, 1.6],
  },
  legs: {
    target: [0, -0.42, 0],
    position: [0, -0.42, 1.7],
  },
};

/**
 * Default camera front & back poses
 */
export const DEFAULT_CAMERA_FRONT: RegionCameraPose = {
  target: [0, 0, 0],
  position: [0, 0, 3.3],
};

export const DEFAULT_CAMERA_BACK: RegionCameraPose = {
  target: [0, 0, 0],
  position: [0, 0, -3.3],
};
