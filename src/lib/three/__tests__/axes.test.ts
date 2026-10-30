import { describe, it, expect } from 'vitest';
import { blackboxToScene, blackboxTupleToScene, impactDirectionToScene } from '../axes';

describe('three.js axes coordinate transformations', () => {
  it('maps blackbox axes to scene axes with a proper rotation', () => {
    // Forward vector in blackbox (+x = 1, y = 0, z = 0) -> Three.js forward (-z = -1)
    const forward = blackboxToScene({ x: 1, y: 0, z: 0 });
    expect(forward).toEqual({ x: -0, y: 0, z: -1 });

    // Left vector in blackbox (x = 0, +y = 1, z = 0) -> Three.js left (-x = -1)
    const left = blackboxToScene({ x: 0, y: 1, z: 0 });
    expect(left).toEqual({ x: -1, y: 0, z: -0 });

    // Up vector in blackbox (x = 0, y = 0, +z = 1) -> Three.js up (+y = 1)
    const up = blackboxToScene({ x: 0, y: 0, z: 1 });
    expect(up).toEqual({ x: -0, y: 1, z: -0 });
  });

  it('maps blackbox tuples to scene tuples correctly', () => {
    const res = blackboxTupleToScene([2.5, -1.2, 0.8]);
    // [-(-1.2), 0.8, -2.5] = [1.2, 0.8, -2.5]
    expect(res[0]).toBeCloseTo(1.2);
    expect(res[1]).toBeCloseTo(0.8);
    expect(res[2]).toBeCloseTo(-2.5);
  });

  it('computes correct scene impact vectors for cardinal angles', () => {
    // 0 deg = front -> (0, 0, -1)
    const front = impactDirectionToScene(0);
    expect(front[0]).toBeCloseTo(0);
    expect(front[1]).toBe(0);
    expect(front[2]).toBeCloseTo(-1);

    // 90 deg = right -> (1, 0, 0)
    const right = impactDirectionToScene(90);
    expect(right[0]).toBeCloseTo(1);
    expect(right[1]).toBe(0);
    expect(right[2]).toBeCloseTo(0);

    // 180 deg = rear -> (0, 0, 1)
    const rear = impactDirectionToScene(180);
    expect(rear[0]).toBeCloseTo(0);
    expect(rear[1]).toBe(0);
    expect(rear[2]).toBeCloseTo(1);

    // 270 deg = left -> (-1, 0, 0)
    const left = impactDirectionToScene(270);
    expect(left[0]).toBeCloseTo(-1);
    expect(left[1]).toBe(0);
    expect(left[2]).toBeCloseTo(0);
  });

  it('computes diagonal angles accurately (e.g. 45 deg front-right)', () => {
    const frontRight = impactDirectionToScene(45);
    const expected = Math.SQRT1_2; // ~0.7071
    expect(frontRight[0]).toBeCloseTo(expected);
    expect(frontRight[1]).toBe(0);
    expect(frontRight[2]).toBeCloseTo(-expected);
  });
});
