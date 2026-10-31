'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTranslations } from 'next-intl';

import type { Incident, NearbyPerson, NearbyVehicle } from '@/lib/data/types';
import { useReplayStore } from '@/lib/stores/replayStore';
import { STAGE_COLORS } from '@/lib/three/materials';

// Preload models in browser environment
if (typeof window !== 'undefined') {
  useGLTF.preload('/models/crash/sedan-sports.glb');
  useGLTF.preload('/models/ambulance.glb');
  useGLTF.preload('/models/crash/cone.glb');
}

export interface CrashSceneProps {
  incident?: Incident | null;
  className?: string;
  /** False while the map covers the scene: the canvas stays alive but stops drawing. */
  active?: boolean;
}

const ROAD_WIDTH = 7.4; // 2 x 3.7m lanes
const ROAD_LENGTH = 320;
const BARRIER_Z = 2.6;    // the car's nose meets the barrier here at T=0

/** The road photo tiled along the road; its lanes run along the image height. */
function RoadSurface() {
  const texture = useTexture('/models/crash/road.jpg');
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const uv = plane.attributes.uv as THREE.BufferAttribute;
    const tiles = ROAD_LENGTH / ROAD_WIDTH;
    // Only the asphalt strip of the photo (u 0.04..0.72, centre line at 0.38) is used, so its lanes sit at ±LANE_X.
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.04 + uv.getX(i) * 0.68, uv.getY(i) * tiles);
    return plane;
  }, []);

  useEffect(() => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={texture} roughness={0.92} />
    </mesh>
  );
}

/** A concrete jersey barrier across the ego lane, with a reflective band and cones. */
function Barrier() {
  const { scene: cone } = useGLTF('/models/crash/cone.glb');
  const cones = useMemo(() => [0, 1, 2].map(() => cone.clone(true)), [cone]);
  const profile = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.3, 0);
    shape.lineTo(0.3, 0);
    shape.lineTo(0.3, 0.08);
    shape.lineTo(0.16, 0.26);
    shape.lineTo(0.09, 0.82);
    shape.lineTo(-0.09, 0.82);
    shape.lineTo(-0.16, 0.26);
    shape.lineTo(-0.3, 0.08);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 3.6, bevelEnabled: false });
    geometry.translate(0, 0, -1.8);
    return geometry;
  }, []);

  return (
    <group position={[LANE_X, 0, BARRIER_Z + 0.3]}>
      <mesh geometry={profile} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#B9B6AE" roughness={0.85} />
      </mesh>
      {[-1.2, 0, 1.2].map((x) => (
        <mesh key={x} position={[x, 0.62, -0.115]} rotation={[0.12, 0, 0]}>
          <planeGeometry args={[0.9, 0.12]} />
          <meshStandardMaterial color="#D21034" emissive="#D21034" emissiveIntensity={0.25} />
        </mesh>
      ))}
      {cones.map((c, i) => (
        <primitive key={i} object={c} position={[-1.4 + i * 1.4, 0, -1.4 - (i % 2) * 0.5]} scale={0.6} />
      ))}
    </group>
  );
}

/**
 * Procedural Two-Lane Road with Shoulders, Dashed Lines, and Guardrail
 * SPEC_3D: asphalt #1B2621, lane lines #E8EEEA (40% dashed), shoulders,
 * guardrail strip on impact side, low-poly trees as instanced cones, faint grid.
 */
function ProceduralWorld({ impactSide = 'right' }: { impactSide?: 'left' | 'right' }) {
  // Road dimensions
  const roadWidth = ROAD_WIDTH;
  const shoulderWidth = 1.8;
  const roadLength = ROAD_LENGTH;

  // Generate dashed center line instances
  const dashCount = Math.floor(roadLength / 7.5); // 3m dash + 4.5m gap = 7.5m cycle
  const dashes = useMemo(() => {
    const list: number[] = [];
    for (let i = -dashCount / 2; i < dashCount / 2; i++) {
      list.push(i * 7.5);
    }
    return list;
  }, [dashCount]);

  // Trees positioned along both sides of road
  const treeCount = 28;
  const trees = useMemo(() => {
    const list: { x: number; z: number; scale: number }[] = [];
    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const xDist = (side * (6.5 + (i * 1.3) % 4));
      const zPos = -140 + i * 10.5;
      list.push({ x: xDist, z: zPos, scale: 0.8 + ((i * 3) % 5) * 0.1 });
    }
    return list;
  }, [treeCount]);

  const guardrailX = impactSide === 'right' ? 4.2 : -4.2;

  return (
    <group position={[0, 0, 0]}>
      <RoadSurface />

      {/* Shoulders */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * (roadWidth / 2 + shoulderWidth / 2), -0.005, 0]}
          receiveShadow
        >
          <planeGeometry args={[shoulderWidth, roadLength]} />
          <meshStandardMaterial color="#2A2F2B" roughness={0.95} />
        </mesh>
      ))}

      {/* 5. Guardrail on impact side */}
      <group position={[guardrailX, 0, 0]}>
        {/* Horizontal Rail */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.1, 0.28, roadLength]} />
          <meshStandardMaterial color="#8FA097" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Posts every 4m */}
        {dashes.map((z, idx) => (
          <mesh key={idx} position={[0, 0.25, z]}>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color="#5C675F" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* 6. Surrounding low-poly trees */}
      {trees.map((t, idx) => (
        <group key={idx} position={[t.x, 0, t.z]} scale={t.scale}>
          {/* Trunk */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 1.0, 6]} />
            <meshStandardMaterial color="#141C18" roughness={0.9} />
          </mesh>
          {/* Foliage Cone */}
          <mesh position={[0, 1.6, 0]}>
            <coneGeometry args={[0.8, 1.8, 6]} />
            <meshStandardMaterial color="#1F332A" roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <coneGeometry args={[0.6, 1.4, 6]} />
            <meshStandardMaterial color="#2A3D34" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* 7. Faint Grid beyond the road for depth */}
      <gridHelper
        args={[300, 75, '#1F332A', '#14201A']}
        position={[0, -0.02, 0]}
      />
    </group>
  );
}

/**
 * Ego Car 3D Component
 * Synchronized with the 16s blackbox replay clock.
 */
const CAR_MODEL = '/models/crash/sedan-sports.glb';
const CAR_SCALE = 1.6;
const LANE_X = 1.85;
const ROOF_HEIGHT = 1.29;     // the body sits this high once upside down
const NOSE_START = 0.35;      // body z where the crumple zone begins
const FLIP_SECONDS = 1.2;
const SLIDE_SECONDS = 1.5;
const REBOUND_METERS = 2.2;
const GRAVITY = 9;
const DEBRIS = [
  { file: 'debris-door', vx: 2.6, vy: 3.4, vz: -1.2, spin: 7 },
  { file: 'debris-bumper', vx: -3.4, vy: 2.5, vz: -0.6, spin: 9 },
  { file: 'debris-tire', vx: 3.2, vy: 4.1, vz: -2.2, spin: 11 },
  { file: 'debris-plate-a', vx: -2.2, vy: 3.1, vz: -1.6, spin: 8 },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Where the car is at a replay time. The camera and the car read the same path. */
function carPose(timeMs: number, impactMs: number, speedMs: number, impactDeg: number, rollover: boolean) {
  if (timeMs < impactMs) {
    return { x: LANE_X, y: 0, z: (-(impactMs - timeMs) / 1000) * speedMs, yaw: 0, roll: 0, seconds: -1 };
  }
  const seconds = (timeMs - impactMs) / 1000;
  const slide = clamp01(seconds / SLIDE_SECONDS);
  const side = Math.sin((impactDeg * Math.PI) / 180);
  const linear = rollover ? clamp01(seconds / FLIP_SECONDS) : 0;
  const flip = linear * linear * (3 - 2 * linear);
  return {
    x: LANE_X + slide * side * 0.5,
    y: Math.sin(flip * Math.PI) * 1.9 + flip * ROOF_HEIGHT,
    z: -(1 - (1 - slide) * (1 - slide)) * REBOUND_METERS,
    yaw: slide * (side > 0 ? 0.35 : -0.35),
    roll: flip * Math.PI,
    seconds,
  };
}

function incidentPose(incident: Incident | null | undefined, timeMs: number, impactMs: number) {
  const crash = incident?.crash;
  return carPose(
    timeMs,
    impactMs,
    ((crash?.speedBeforeKmh ?? 80) * 1000) / 3600,
    crash?.impactDirectionDeg ?? 90,
    crash?.rollover ?? false
  );
}

/**
 * The same crash as the landing page: nose crushed, front wheels torn off,
 * rolled onto the roof when the telemetry reports a rollover.
 */
function EgoCar({
  incident,
  isDegraded,
}: {
  incident?: Incident | null;
  isDegraded: boolean;
}) {
  const { scene: carGltfScene } = useGLTF(CAR_MODEL);
  const carRef = useRef<THREE.Group>(null);
  const rollRef = useRef<THREE.Group>(null);
  const dented = useRef(-1);

  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);

  // The crush moves vertices, so this car owns its geometry.
  const { clonedScene, wheels, front, body, rest } = useMemo(() => {
    const clonedScene = carGltfScene.clone(true);
    const wheels: THREE.Object3D[] = [];
    const front: THREE.Object3D[] = [];
    clonedScene.traverse((node) => {
      if (node.name.startsWith('wheel-')) wheels.push(node);
      if (node.name.startsWith('wheel-front')) front.push(node);
    });
    let body: THREE.Mesh | null = null;
    clonedScene.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (!body && !wheels.some((w) => w === mesh || w.getObjectById(mesh.id))) {
        mesh.geometry = mesh.geometry.clone();
        body = mesh;
      }
    });
    const mesh = body as THREE.Mesh | null;
    const rest = mesh ? Float32Array.from(mesh.geometry.attributes.position.array) : null;
    return { clonedScene, wheels, front, body: mesh, rest };
  }, [carGltfScene]);

  useFrame(() => {
    if (!carRef.current || !rollRef.current) return;

    if (isDegraded) {
      // Degraded / SMS mode: static car at scene origin
      carRef.current.position.set(0, 0, 0);
      carRef.current.rotation.set(0, 0, 0);
      rollRef.current.rotation.z = 0;
      return;
    }

    const pose = incidentPose(incident, currentTimeMs, impactAtMs);
    carRef.current.position.set(pose.x, pose.y, pose.z);
    carRef.current.rotation.y = pose.yaw;
    rollRef.current.rotation.z = pose.roll;

    const spin = (pose.z / 0.3) % (Math.PI * 2);
    wheels.forEach((wheel) => {
      wheel.rotation.x = spin;
    });
    front.forEach((wheel) => {
      wheel.visible = pose.seconds < 0;
    });

    // Crush the nose once, with uneven dents. Rewinding the replay repairs it.
    const crush = pose.seconds < 0 ? 0 : clamp01(pose.seconds / 0.2);
    if (body && rest && crush !== dented.current) {
      dented.current = crush;
      const position = body.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = rest[i * 3];
        const y = rest[i * 3 + 1];
        const z = rest[i * 3 + 2];
        const nose = clamp01((z - NOSE_START) / 1.2);
        const dent = Math.sin(x * 9) * Math.cos(y * 7);
        position.setXYZ(
          i,
          x * (1 + nose * crush * 0.18) + dent * 0.05 * crush * nose,
          y - nose * crush * (0.28 + dent * 0.08),
          z - nose * nose * crush * 0.75
        );
      }
      position.needsUpdate = true;
      body.geometry.computeVertexNormals();
    }
  });

  return (
    <group ref={carRef} position={[LANE_X, 0, 0]}>
      <group ref={rollRef} scale={CAR_SCALE}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
}

/** Parts torn off at impact: ballistic hops, each landing keeps part of the speed. */
function DebrisPiece({ file, vx, vy, vz, spin }: (typeof DEBRIS)[number]) {
  const { scene } = useGLTF(`/models/crash/${file}.glb`);
  const piece = useRef<THREE.Group>(null);
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).castShadow = true;
    });
    return copy;
  }, [scene]);
  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);

  useFrame(() => {
    const group = piece.current;
    if (!group) return;
    const t = Math.min((currentTimeMs - impactAtMs) / 1000, 2.4);
    group.visible = t > 0;
    let time = t;
    let speed = vy;
    let height = 0.8;
    let slide = 0;
    for (let hop = 0; hop < 3; hop++) {
      const flight = (speed + Math.sqrt(speed * speed + 2 * GRAVITY * height)) / GRAVITY;
      if (time < flight) break;
      time -= flight;
      slide += flight;
      speed *= 0.42;
      height = 0;
      if (hop === 2) {
        speed = 0;
        time = 0;
      }
    }
    const damped = 1 - Math.exp(-(slide + (speed ? time : 0)) * 0.9);
    group.position.set(
      LANE_X + (vx / 0.9) * damped,
      0.12 + height + speed * time - 0.5 * GRAVITY * time * time,
      BARRIER_Z - 0.4 + (vz / 0.9) * damped
    );
    group.rotation.set(spin * damped, spin * damped * 0.6, 0);
  });

  return (
    <group ref={piece} visible={false}>
      <primitive object={clone} />
    </group>
  );
}

/**
 * Surrounding Vehicles (Ghost style per SPEC_3D)
 * Instanced low-poly boxes/trucks from `nearbyVehicles` (grey, 55% opacity ghost style)
 */
function SurroundingVehicles({ vehicles = [] }: { vehicles?: NearbyVehicle[] }) {
  if (!vehicles || vehicles.length === 0) return null;

  return (
    <group>
      {vehicles.slice(0, 2).map((v, idx) => {
        // Position relative to crash site (projected onto scene road lanes)
        // Stopped in the other lane, past the barrier, so nothing sits in the ego car's path
        const laneX = -LANE_X;
        const zPos = 14 + idx * 16;
        const headingRad = (v.headingDeg * Math.PI) / 180;

        return (
          <group key={v.id || idx} position={[laneX, 0.5, zPos]} rotation={[0, headingRad, 0]}>
            {/* Low-poly ghost chassis */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.8, 1.2, 4.2]} />
              <meshStandardMaterial
                color="#8FA097"
                transparent
                opacity={0.55}
                roughness={0.6}
              />
            </mesh>
            {/* Ghost cabin */}
            <mesh position={[0, 0.65, -0.4]}>
              <boxGeometry args={[1.5, 0.9, 2.2]} />
              <meshStandardMaterial
                color="#A6B5AD"
                transparent
                opacity={0.45}
                roughness={0.5}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Nearby People Ground Markers
 * SPEC_3D: ground markers (ring + vertical thin beam); helpers_medic red --stage-impact,
 * others --stage-ink. Labels on hover only.
 */
function NearbyPeopleMarkers({ people = [] }: { people?: NearbyPerson[] }) {
  const [hoveredPerson, setHoveredPerson] = useState<string | null>(null);

  if (!people || people.length === 0) return null;

  return (
    <group>
      {people.map((p, idx) => {
        const isMedic = p.kind === 'helper_medic';
        const color = isMedic ? STAGE_COLORS.impact : STAGE_COLORS.ink;

        // Position on shoulders or side areas
        const side = idx % 2 === 0 ? 1 : -1;
        const xPos = side * (4.8 + (idx * 1.1) % 3);
        const zPos = -15 + idx * 8;

        const isHovered = hoveredPerson === p.id;

        return (
          <group
            key={p.id || idx}
            position={[xPos, 0, zPos]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredPerson(p.id);
            }}
            onPointerOut={() => setHoveredPerson(null)}
          >
            {/* Ground Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
              <ringGeometry args={[0.3, 0.42, 24]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} />
            </mesh>

            {/* Vertical thin beam */}
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} />
            </mesh>

            {/* Pulsing beacon bead on top */}
            <mesh position={[0, 2.4, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color={color} />
            </mesh>

            {/* Hover Tooltip Label */}
            {isHovered && (
              <Html position={[0, 2.7, 0]} center distanceFactor={14}>
                <div
                  className="px-2 py-1 rounded bg-[#0B1310]/90 text-xs font-mono border border-white/20 whitespace-nowrap shadow-lg pointer-events-none"
                  style={{ color }}
                >
                  <span className="font-semibold">{p.kind.replace('_', ' ')}</span> · {p.distanceM}m
                  {p.accepted && <span className="ms-1.5 text-emerald-400 font-bold">(Accepted)</span>}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Ambulance & Response Route
 * SPEC_3D: follows dispatch.polyline; route in --stage-route (#F2B705) with chevrons.
 */
function AmbulanceRoute({ incident }: { incident?: Incident | null }) {
  const { scene: ambulanceGltfScene } = useGLTF('/models/ambulance.glb');
  const dispatch = incident?.dispatch;

  const clonedAmbulance = useMemo(() => {
    return ambulanceGltfScene.clone(true);
  }, [ambulanceGltfScene]);

  // If no ambulance assigned or dispatched, don't render
  if (!dispatch?.ambulanceId) return null;

  // Ambulance incoming on opposite lane (x = -1.85), approaching crash site
  return (
    <group>
      {/* Response Route Line along incoming lane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.85, 0.015, -45]}>
        <planeGeometry args={[0.25, 90]} />
        <meshBasicMaterial color={STAGE_COLORS.route} opacity={0.8} transparent />
      </mesh>

      {/* Ambulance model stationed or en route */}
      <group position={[-1.85, 0, -28]} rotation={[0, 0, 0]}>
        <primitive object={clonedAmbulance} />
        {/* Luminous flashing roof beacon */}
        <mesh position={[0, 1.8, 0.2]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color={STAGE_COLORS.impact} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Chase Camera with Smooth Follow, Shake at Impact, and Orbit when Paused
 * SPEC_3D: 7 m behind, 3.2 m above the car, fov 50, looks 6 m ahead; lerp 0.1.
 * Orbit ±35° azimuth while paused. Camera shake at impact.
 */
function ChaseCameraController({ incident, isDegraded }: { incident?: Incident | null; isDegraded: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);
  const isPlaying = useReplayStore((s) => s.isPlaying);

  // Smooth lerp camera tracking
  useFrame(() => {
    const t = currentTimeMs;
    const tImpact = impactAtMs;
    const pose = incidentPose(incident, t, tImpact);
    const carX = isDegraded ? 0 : pose.x;
    const carZ = isDegraded ? 0 : pose.z;

    // Chase pose: the car drives towards +Z, so the camera sits 10m behind it, 4m above
    const targetCamPos = new THREE.Vector3(carX, 4, carZ - 10);
    const targetLookAt = new THREE.Vector3(carX, 0.8, carZ + 3);

    // Camera Shake at impact (amplitude from g, 250ms decay per SPEC_3D)
    if (!isDegraded && t >= tImpact && t < tImpact + 250) {
      const shakeProgress = (t - tImpact) / 250;
      const decay = 1 - shakeProgress;
      const shakeAmp = decay * 0.18;
      targetCamPos.x += (Math.random() - 0.5) * shakeAmp;
      targetCamPos.y += (Math.random() - 0.5) * shakeAmp;
      targetCamPos.z += (Math.random() - 0.5) * shakeAmp;
    }

    // One owner per frame: the follow while playing, OrbitControls (which updates itself) while paused.
    if (isPlaying) {
      camera.position.lerp(targetCamPos, 0.1);
      camera.lookAt(targetLookAt);
      controlsRef.current?.target.copy(targetLookAt);
    } else {
      controlsRef.current?.target.set(carX, 1.0, carZ);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!isPlaying}
      enablePan={false}
      minDistance={5}
      maxDistance={15}
      minPolarAngle={(Math.PI * 60) / 180}
      maxPolarAngle={(Math.PI * 85) / 180}
      minAzimuthAngle={(145 * Math.PI) / 180}
      maxAzimuthAngle={(215 * Math.PI) / 180}
      dampingFactor={0.08}
      enableDamping={true}
    />
  );
}

/**
 * Drive-mode Speed HUD
 * SPEC_3D: speed in large number bottom-center when playing pre-impact (stage-ink, mono, 56px), disappears after impact.
 */
function SpeedHud({ speedKmh }: { speedKmh: number }) {
  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);
  const isPlaying = useReplayStore((s) => s.isPlaying);
  if (!isPlaying || currentTimeMs >= impactAtMs) return null;

  return (
    <div
      className="absolute bottom-6 end-6 flex flex-col items-end pointer-events-none select-none z-10 animate-fade-in"
      aria-hidden="true"
    >
      <div className="flex items-baseline gap-1">
        <span
          className="font-mono text-5xl font-bold tracking-tight text-[#E8EEEA] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(speedKmh)}
        </span>
        <span className="font-mono text-xs text-[#8FA097] uppercase">km/h</span>
      </div>
    </div>
  );
}

/**
 * Main CrashScene Component
 */
export function CrashScene({ incident, className = '', active = true }: CrashSceneProps) {
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Tab visibility check (Rule 11)
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const t = useTranslations('responder');
  const isDegraded = incident?.channel === 'sms' || !incident?.telemetry;
  const speedKmh = incident?.crash?.speedBeforeKmh ?? 80;

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      {/* 3D WebGL Canvas */}
      <Canvas
        dpr={[1, 1.5]}
        frameloop={isTabVisible && active ? 'always' : 'never'}
        camera={{ position: [1.85, 4, -10], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* Stage Lighting (SPEC_3D) */}
        <color attach="background" args={[STAGE_COLORS.bg]} />
        <fog attach="fog" args={[STAGE_COLORS.bg, 18, 70]} />

        {/* Hemisphere light: sky #C7D6CE, ground #0B1310, intensity 0.6 */}
        <hemisphereLight
          color="#C7D6CE"
          groundColor="#0B1310"
          intensity={0.6}
        />

        {/* Directional key light from top-left (1.1) */}
        <directionalLight
          position={[-6, 12, 8]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* Cool rim light from behind (0.5) */}
        <directionalLight position={[0, 4, -12]} intensity={0.5} color="#8FA097" />

        <Suspense fallback={null}>
          {/* Procedural Road, Guardrail, and Trees */}
          <ProceduralWorld impactSide={incident?.crash?.impactDirectionDeg && incident.crash.impactDirectionDeg > 180 ? 'left' : 'right'} />

          {/* Ego Car */}
          <EgoCar incident={incident} isDegraded={isDegraded} />
          {!isDegraded && DEBRIS.map((piece) => <DebrisPiece key={piece.file} {...piece} />)}

          {!isDegraded && <Barrier />}

          {/* Surrounding ghost vehicles */}
          <SurroundingVehicles vehicles={incident?.nearbyVehicles} />

          {/* Nearby People Ground Beacons */}
          <NearbyPeopleMarkers people={incident?.nearbyPeople} />

          {/* Ambulance & Response Route */}
          <AmbulanceRoute incident={incident} />

          {/* Chase Camera Controller */}
          <ChaseCameraController incident={incident} isDegraded={isDegraded} />

        </Suspense>
      </Canvas>

      {/* Drive-mode Speed HUD Overlay */}
      <SpeedHud speedKmh={speedKmh} />

      {/* Degraded SMS Mode Banner Overlay (SPEC_RESPONDER line 19) */}
      {incident?.channel === 'sms' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-lg w-11/12 bg-[#0B1310]/90 backdrop-blur border border-amber-500/40 rounded-lg p-3 text-center shadow-2xl z-20">
          <div className="text-amber-400 font-medium text-xs flex items-center justify-center gap-1.5 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {t('smsOnly')}
          </div>
          {incident?.sms?.[0]?.raw && (
            <code className="text-[11px] font-mono text-zinc-300 block truncate dir-ltr select-all">
              {incident.sms[0].raw}
            </code>
          )}
        </div>
      )}
    </div>
  );
}

export default CrashScene;
