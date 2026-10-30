/**
 * Coordinate mapping from blackbox axes to Three.js scene coordinates.
 *
 * Blackbox axes:
 *   +x = forward
 *   +y = left
 *   +z = up
 *
 * Three.js scene axes:
 *   +x = right
 *   +y = up
 *   -z = forward (Three.js camera looks down -z)
 *
 * Mapping (proper SO(3) rotation with det = +1):
 *   scene.x = -bb.y
 *   scene.y =  bb.z
 *   scene.z = -bb.x
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Transforms a vector from blackbox sensor space to Three.js scene space.
 */
export function blackboxToScene(bb: Vector3D): Vector3D {
  return {
    x: -bb.y,
    y: bb.z,
    z: -bb.x,
  };
}

/**
 * Transforms a tuple [x, y, z] from blackbox sensor space to Three.js scene space.
 */
export function blackboxTupleToScene(bb: [number, number, number]): [number, number, number] {
  return [-bb[1], bb[2], -bb[0]];
}

/**
 * Computes the impact direction vector in Three.js scene space from angle θ in degrees.
 *
 * Angle convention:
 *   0°   = Front impact  -> ( 0, 0, -1) [Three.js forward]
 *   90°  = Right impact  -> ( 1, 0,  0) [Three.js right]
 *   180° = Rear impact   -> ( 0, 0,  1) [Three.js rear]
 *   270° = Left impact   -> (-1, 0,  0) [Three.js left]
 *
 * Formula: (sin θ, 0, -cos θ)
 */
export function impactDirectionToScene(thetaDeg: number): [number, number, number] {
  const rad = (thetaDeg * Math.PI) / 180;
  // Clean up floating point precision around exact cardinal directions
  const x = Math.abs(Math.sin(rad)) < 1e-10 ? 0 : Math.sin(rad);
  const z = Math.abs(Math.cos(rad)) < 1e-10 ? 0 : -Math.cos(rad);
  return [x, 0, z];
}
