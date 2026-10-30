'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import type { Incident, NearbyPerson, NearbyVehicle } from '@/lib/data/types';
import { useReplayStore } from '@/lib/stores/replayStore';
import { impactDirectionToScene } from '@/lib/three/axes';
import { STAGE_COLORS } from '@/lib/three/materials';

// Preload models in browser environment
if (typeof window !== 'undefined') {
  useGLTF.preload('/models/car.glb');
  useGLTF.preload('/models/ambulance.glb');
}

export interface CrashSceneProps {
  incident?: Incident | null;
  className?: string;
}

/**
 * Procedural Two-Lane Road with Shoulders, Dashed Lines, and Guardrail
 * SPEC_3D: asphalt #1B2621, lane lines #E8EEEA (40% dashed), shoulders,
 * guardrail strip on impact side, low-poly trees as instanced cones, faint grid.
 */
function ProceduralWorld({ impactSide = 'right' }: { impactSide?: 'left' | 'right' }) {
  // Road dimensions
  const roadWidth = 7.4; // 2 x 3.7m lanes
  const shoulderWidth = 1.8;
  const totalWidth = roadWidth + shoulderWidth * 2;
  const roadLength = 320;

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
      {/* 1. Asphalt Road Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[roadWidth, roadLength]} />
        <meshStandardMaterial color="#1B2621" roughness={0.88} metalness={0.05} />
      </mesh>

      {/* 2. Road Shoulders */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-roadWidth / 2 - shoulderWidth / 2, -0.005, 0]}
        receiveShadow
      >
        <planeGeometry args={[shoulderWidth, roadLength]} />
        <meshStandardMaterial color="#141C18" roughness={0.95} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[roadWidth / 2 + shoulderWidth / 2, -0.005, 0]}
        receiveShadow
      >
        <planeGeometry args={[shoulderWidth, roadLength]} />
        <meshStandardMaterial color="#141C18" roughness={0.95} />
      </mesh>

      {/* 3. Dashed Center Line (white #E8EEEA) */}
      {dashes.map((z, idx) => (
        <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[0.15, 3.0]} />
          <meshBasicMaterial color="#E8EEEA" />
        </mesh>
      ))}

      {/* 4. Outer Shoulder White Lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-roadWidth / 2 + 0.1, 0.005, 0]}>
        <planeGeometry args={[0.12, roadLength]} />
        <meshBasicMaterial color="#E8EEEA" opacity={0.85} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[roadWidth / 2 - 0.1, 0.005, 0]}>
        <planeGeometry args={[0.12, roadLength]} />
        <meshBasicMaterial color="#E8EEEA" opacity={0.85} transparent />
      </mesh>

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
function EgoCar({
  incident,
  isDegraded,
}: {
  incident?: Incident | null;
  isDegraded: boolean;
}) {
  const { scene: carGltfScene } = useGLTF('/models/car.glb');
  const carRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Object3D[]>([]);

  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);

  const crash = incident?.crash;
  const speedBeforeKmh = crash?.speedBeforeKmh ?? 80;
  const speedBeforeMs = (speedBeforeKmh * 1000) / 3600; // m/s
  const rollover = crash?.rollover ?? false;
  const impactDeg = crash?.impactDirectionDeg ?? 90;

  // Clone GLTF scene once
  const clonedScene = useMemo(() => {
    const clone = carGltfScene.clone(true);
    // Tint body material to #DCE3DE per SPEC_3D
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.name === 'body') {
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#DCE3DE',
            metalness: 0.6,
            roughness: 0.35,
          });
        }
      }
    });
    return clone;
  }, [carGltfScene]);

  // Extract wheel nodes for rotation
  useEffect(() => {
    const wheels: THREE.Object3D[] = [];
    clonedScene.traverse((obj) => {
      if (obj.name.startsWith('wheel')) {
        wheels.push(obj);
      }
    });
    wheelsRef.current = wheels;
  }, [clonedScene]);

  // Calculate car position, rotation and physics simulation at current replay time
  useFrame(() => {
    if (!carRef.current) return;

    if (isDegraded) {
      // Degraded / SMS mode: static car at scene origin
      carRef.current.position.set(0, 0, 0);
      carRef.current.rotation.set(0, 0, 0);
      return;
    }

    const t = currentTimeMs;
    const tImpact = impactAtMs;

    if (t < tImpact) {
      // PRE-IMPACT: travels forward along lane 1 (x = 1.85) towards crash site at z = 0
      const timeToImpactS = (tImpact - t) / 1000;
      const zPos = -timeToImpactS * speedBeforeMs;
      carRef.current.position.set(1.85, 0, zPos);
      carRef.current.rotation.set(0, 0, 0);

      // Spin wheels
      const wheelRotation = (zPos / 0.3) % (Math.PI * 2);
      for (const wheel of wheelsRef.current) {
        wheel.rotation.x = wheelRotation;
      }
    } else {
      // POST-IMPACT: at crash site with slide and optional rollover
      const postImpactS = (t - tImpact) / 1000;

      // Sliding forward decelerating to rest over 1.5s
      const slideDuration = 1.5;
      const slideFactor = Math.min(postImpactS / slideDuration, 1.0);
      // Deceleration curve: ease-out quadratic
      const slideDist = (1 - Math.pow(1 - slideFactor, 2)) * 6.5; // slides ~6.5m
      const zPos = slideDist;

      // Lateral shift and yaw angle from impact direction
      const [ix, , iz] = impactDirectionToScene(impactDeg);
      const sideFactor = Math.sin((impactDeg * Math.PI) / 180);
      const xPos = 1.85 + slideFactor * sideFactor * 1.6;

      // Yaw rotation (car spins out slightly)
      const yawAngle = slideFactor * (sideFactor > 0 ? 0.35 : -0.35);

      // Rollover: rotate 360° over 1.2s around longitudinal z-axis
      let rollAngle = 0;
      if (rollover) {
        const rollDuration = 1.2;
        const rollProgress = Math.min(postImpactS / rollDuration, 1.0);
        rollAngle = rollProgress * Math.PI * 2;
      }

      carRef.current.position.set(xPos, Math.sin(rollAngle) * 0.4, zPos);
      carRef.current.rotation.set(0, yawAngle, rollAngle);
    }
  });

  return (
    <group ref={carRef} position={[1.85, 0, 0]}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * 3D Impact Arrow Mesh
 * SPEC_3D: red impact arrow (--stage-impact, length ∝ ΔV, pointing toward impact side, fading over 3s)
 */
function ImpactArrow({
  incident,
  isDegraded,
}: {
  incident?: Incident | null;
  isDegraded: boolean;
}) {
  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);
  const crash = incident?.crash;

  if (isDegraded || !crash) return null;

  const t = currentTimeMs;
  if (t < impactAtMs || t > impactAtMs + 3000) return null;

  // Fading over 3 seconds
  const fadeProgress = (t - impactAtMs) / 3000;
  const opacity = Math.max(0, 1.0 - fadeProgress);

  // Arrow length proportional to deltaV (typically 25..80 km/h -> 1.5..3.5 units)
  const length = Math.max(1.5, Math.min(4.0, (crash.deltaVKmh / 80) * 3.5));

  // Compute 3D direction vector
  const [sx, sy, sz] = impactDirectionToScene(crash.impactDirectionDeg);
  const arrowDir = new THREE.Vector3(sx, sy, sz).normalize();
  const angleY = Math.atan2(arrowDir.x, arrowDir.z);

  return (
    <group position={[1.85, 0.6, 0]} rotation={[0, angleY, 0]}>
      {/* Arrow shaft */}
      <mesh position={[0, 0, length / 2]}>
        <cylinderGeometry args={[0.07, 0.07, length, 12]} />
        <meshBasicMaterial
          color={STAGE_COLORS.impact}
          transparent
          opacity={opacity * 0.85}
        />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, 0, length]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.22, 0.5, 12]} />
        <meshBasicMaterial
          color={STAGE_COLORS.impact}
          transparent
          opacity={opacity}
        />
      </mesh>
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
      {vehicles.map((v, idx) => {
        // Position relative to crash site (projected onto scene road lanes)
        const laneX = idx % 2 === 0 ? -1.85 : 1.85; // incoming vs ongoing lane
        const zPos = -40 + idx * 35;
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
function ChaseCameraController({ isDegraded }: { isDegraded: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);
  const isPlaying = useReplayStore((s) => s.isPlaying);

  // Smooth lerp camera tracking
  useFrame(() => {
    const t = currentTimeMs;
    const tImpact = impactAtMs;

    // Calculate car position in scene
    let carZ = 0;
    let carX = 1.85;

    if (!isDegraded) {
      if (t < tImpact) {
        const timeToImpactS = (tImpact - t) / 1000;
        carZ = -timeToImpactS * 22.2;
      } else {
        const postImpactS = (t - tImpact) / 1000;
        const slideFactor = Math.min(postImpactS / 1.5, 1.0);
        carZ = (1 - Math.pow(1 - slideFactor, 2)) * 6.5;
        carX = 1.85 + slideFactor * 0.8;
      }
    } else {
      carX = 0;
      carZ = 0;
    }

    // Default chase pose: 7m behind, 3.2m above, looking 6m ahead
    const targetCamPos = new THREE.Vector3(carX, 3.2, carZ + 7.0);
    const targetLookAt = new THREE.Vector3(carX, 1.0, carZ - 6.0);

    // Camera Shake at impact (amplitude from g, 250ms decay per SPEC_3D)
    if (!isDegraded && t >= tImpact && t < tImpact + 250) {
      const shakeProgress = (t - tImpact) / 250;
      const decay = 1 - shakeProgress;
      const shakeAmp = decay * 0.18;
      targetCamPos.x += (Math.random() - 0.5) * shakeAmp;
      targetCamPos.y += (Math.random() - 0.5) * shakeAmp;
      targetCamPos.z += (Math.random() - 0.5) * shakeAmp;
    }

    if (isPlaying) {
      // Smooth follow during playback
      camera.position.lerp(targetCamPos, 0.1);
      camera.lookAt(targetLookAt);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAt, 0.1);
        controlsRef.current.update();
      }
    } else if (controlsRef.current) {
      // While paused, let user orbit within ±35° around the car look-at
      controlsRef.current.target.set(carX, 1.0, carZ);
      controlsRef.current.update();
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
      minAzimuthAngle={(-35 * Math.PI) / 180}
      maxAzimuthAngle={(35 * Math.PI) / 180}
      dampingFactor={0.08}
      enableDamping={true}
    />
  );
}

/**
 * Drive-mode Speed HUD
 * SPEC_3D: speed in large number bottom-center when playing pre-impact (stage-ink, mono, 56px), disappears after impact.
 */
function SpeedHud({ isPlaying, currentTimeMs, impactAtMs, speedKmh }: {
  isPlaying: boolean;
  currentTimeMs: number;
  impactAtMs: number;
  speedKmh: number;
}) {
  if (!isPlaying || currentTimeMs >= impactAtMs) return null;

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none z-10 animate-fade-in"
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
export function CrashScene({ incident, className = '' }: CrashSceneProps) {
  const [enableBloom, setEnableBloom] = useState(true);
  const [dpr, setDpr] = useState<number>(1.5);
  const [isTabVisible, setIsTabVisible] = useState(true);

  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);
  const isPlaying = useReplayStore((s) => s.isPlaying);

  // Tab visibility check (Rule 11)
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const isDegraded = incident?.channel === 'sms' || !incident?.telemetry;
  const speedKmh = incident?.crash?.speedBeforeKmh ?? 80;

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      {/* 3D WebGL Canvas */}
      <Canvas
        dpr={[1, 1.75]}
        frameloop={isTabVisible ? 'always' : 'never'}
        camera={{ position: [1.85, 3.2, 7.0], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setEnableBloom(false);
            setDpr(1.0);
          }}
        />

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

          {/* 3D Impact Arrow */}
          <ImpactArrow incident={incident} isDegraded={isDegraded} />

          {/* Surrounding ghost vehicles */}
          <SurroundingVehicles vehicles={incident?.nearbyVehicles} />

          {/* Nearby People Ground Beacons */}
          <NearbyPeopleMarkers people={incident?.nearbyPeople} />

          {/* Ambulance & Response Route */}
          <AmbulanceRoute incident={incident} />

          {/* Chase Camera Controller */}
          <ChaseCameraController isDegraded={isDegraded} />

          {/* Bloom Postprocessing */}
          {enableBloom && (
            <EffectComposer multisampling={0}>
              <Bloom
                luminanceThreshold={0.85}
                intensity={0.7}
                mipmapBlur
              />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      {/* Drive-mode Speed HUD Overlay */}
      <SpeedHud
        isPlaying={isPlaying}
        currentTimeMs={currentTimeMs}
        impactAtMs={impactAtMs}
        speedKmh={speedKmh}
      />

      {/* Degraded SMS Mode Banner Overlay (SPEC_RESPONDER line 19) */}
      {isDegraded && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-lg w-11/12 bg-[#0B1310]/90 backdrop-blur border border-amber-500/40 rounded-lg p-3 text-center shadow-2xl z-20">
          <div className="text-amber-400 font-medium text-xs flex items-center justify-center gap-1.5 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            SMS only — no telemetry. Position and severity from the message.
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
