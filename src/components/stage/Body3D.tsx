'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useGLTF, Html, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useTranslations } from 'next-intl';
import * as THREE from 'three';

import { useUiStore } from '@/lib/stores/uiStore';
import type { Occupant, BodyRegion, M4Level } from '@/lib/data/types';
import {
  BASE_ANCHORS,
  getAnchorsWithMirrors,
  REGION_CAMERA_POSES,
  DEFAULT_CAMERA_FRONT,
  DEFAULT_CAMERA_BACK,
  type BodyRegionAnchor,
  type RegionCameraPose,
} from '@/lib/three/regions';
import {
  STAGE_COLORS,
  HEAT_SLOTS,
  createBodyMaterial,
  createBodyEmptyMaterial,
  createHeatBodyMaterial,
} from '@/lib/three/materials';

export interface Body3DProps {
  occupant?: Occupant | null;
  viewMode?: 'front' | 'back' | 'free';
  onReset?: () => void;
  customAnchors?: BodyRegionAnchor[];
  onSelectAnchor?: (anchor: BodyRegionAnchor) => void;
  isCalibrating?: boolean;
  className?: string;
  /** Called every frame with each region's position on the canvas, in pixels. */
  onProject?: (points: RegionPoints) => void;
  /** The mirrored limb that faces the side panel. */
  projectSide?: 'l' | 'r';
}

export type RegionPoints = Partial<Record<BodyRegion, [number, number]>>;

const SCAN_TOP = 1;
const SCAN_BOTTOM = -1.1;
const SCAN_SECONDS = 1.6;
const LEVEL_GAIN: Record<M4Level, number> = { likely: 1, check: 0.72, unlikely: 0 };

// Preload body model
if (typeof window !== 'undefined') {
  useGLTF.preload('/models/body.glb');
}

/**
 * Procedural humanoid fallback when GLB is loading or unavailable
 */
function FallbackMannequin({ isEmpty }: { isEmpty: boolean }) {
  const mat = useMemo(
    () => (isEmpty ? createBodyEmptyMaterial() : createBodyMaterial()),
    [isEmpty]
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, 0.72, 0]} material={mat}>
        <sphereGeometry args={[0.11, 24, 24]} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.55, 0]} material={mat}>
        <cylinderGeometry args={[0.045, 0.05, 0.1, 16]} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.28, 0]} material={mat}>
        <cylinderGeometry args={[0.16, 0.13, 0.45, 20]} />
      </mesh>
      {/* Pelvis */}
      <mesh position={[0, -0.02, 0]} material={mat}>
        <cylinderGeometry args={[0.13, 0.14, 0.16, 20]} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.26, 0.22, 0]} rotation={[0, 0, 0.18]} material={mat}>
        <capsuleGeometry args={[0.045, 0.48, 12, 16]} />
      </mesh>
      <mesh position={[0.26, 0.22, 0]} rotation={[0, 0, -0.18]} material={mat}>
        <capsuleGeometry args={[0.045, 0.48, 12, 16]} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.11, -0.44, 0]} material={mat}>
        <capsuleGeometry args={[0.06, 0.68, 12, 16]} />
      </mesh>
      <mesh position={[0.11, -0.44, 0]} material={mat}>
        <capsuleGeometry args={[0.06, 0.68, 12, 16]} />
      </mesh>
    </group>
  );
}

/**
 * 3D Human Body Model (SPEC_3D lines 9-19)
 */
function BodyModel({
  isEmpty,
  occupant,
  anchors,
}: {
  isEmpty: boolean;
  occupant?: Occupant | null;
  anchors: BodyRegionAnchor[];
}) {
  const gltf = useGLTF('/models/body.glb');
  const heat = useMemo(() => createHeatBodyMaterial(), []);
  const hoveredRegion = useUiStore((s) => s.hoveredRegion);
  const selectedRegion = useUiStore((s) => s.selectedRegion);
  const occupantId = occupant?.id;
  const hasPatient = Boolean(occupant);
  const scanStart = useRef(0);

  // Every patient gets a fresh scan: the estimates appear as the line passes them.
  useEffect(() => {
    scanStart.current = performance.now();
  }, [occupantId]);

  useFrame(() => {
    const { uniforms } = heat;
    const now = performance.now();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const swept = reduced ? 1 : Math.min((now - scanStart.current) / (SCAN_SECONDS * 1000), 1);
    uniforms.uScan.value = SCAN_TOP + (SCAN_BOTTOM - SCAN_TOP) * swept;
    uniforms.uTime.value = reduced ? 0 : now * 0.001;
    anchors.slice(0, HEAT_SLOTS).forEach((anchor, i) => {
      const level = occupant?.m4?.[anchor.id]?.level ?? 'unlikely';
      const focused = hoveredRegion === anchor.id || selectedRegion === anchor.id;
      uniforms.uHeat.value[i].set(...anchor.position, anchor.radius);
      uniforms.uHeatColor.value[i].set(level === 'likely' ? STAGE_COLORS.regLikely : STAGE_COLORS.regCheck);
      uniforms.uHeatGain.value[i] = focused ? Math.max(LEVEL_GAIN[level], 0.9) : LEVEL_GAIN[level];
    });
  });

  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Normalize height to exactly 1.8 units
    const scale = 1.8 / (size.y || 1);
    scene.scale.setScalar(scale);

    // Center at (0, 0, 0)
    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    const overrideMaterial = isEmpty
      ? createBodyEmptyMaterial()
      : hasPatient
      ? heat.material
      : createBodyMaterial();

    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.material = overrideMaterial;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return scene;
  }, [gltf, isEmpty, hasPatient, heat]);

  return <primitive object={clonedScene} />;
}

/**
 * Clinical 3D Scanner Pedestal beneath the patient twin
 */
function ScannerPedestal() {
  return (
    <group position={[0, -0.905, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Subtle translucent base disc */}
      <mesh>
        <circleGeometry args={[0.56, 64]} />
        <meshBasicMaterial
          color="#0B6BAF"
          transparent
          opacity={0.09}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Outer calibration ring */}
      <mesh>
        <ringGeometry args={[0.55, 0.565, 64]} />
        <meshBasicMaterial
          color="#3898EC"
          transparent
          opacity={0.45}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Mid dashed-style reference ring */}
      <mesh>
        <ringGeometry args={[0.37, 0.38, 48]} />
        <meshBasicMaterial
          color="#3898EC"
          transparent
          opacity={0.28}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner core ring */}
      <mesh>
        <ringGeometry args={[0.18, 0.188, 32]} />
        <meshBasicMaterial
          color="#3898EC"
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Cross-axis alignment lines */}
      <mesh>
        <planeGeometry args={[1.22, 0.006]} />
        <meshBasicMaterial
          color="#3898EC"
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[1.22, 0.006]} />
        <meshBasicMaterial
          color="#3898EC"
          transparent
          opacity={0.22}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Single Glowing Anchor Sphere with Pulse & Billboarded Target Rings
 */
function AnchorSphere({
  anchor,
  level,
  probability,
  regionLabel,
  levelLabel,
  isHovered,
  isSelected,
  onHover,
  onSelect,
  isCalibrating,
}: {
  anchor: BodyRegionAnchor;
  level: M4Level;
  probability: number;
  regionLabel: string;
  levelLabel: string;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
  isCalibrating?: boolean;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const selectRingRef = useRef<THREE.Mesh>(null);

  const colorHex = useMemo(() => {
    if (isCalibrating) return '#00E575';
    if (level === 'likely') return STAGE_COLORS.regLikely;
    if (level === 'check') return STAGE_COLORS.regCheck;
    return STAGE_COLORS.regUnlikely;
  }, [level, isCalibrating]);

  const color = useMemo(() => new THREE.Color(colorHex), [colorHex]);

  useFrame((state) => {
    const t = performance.now() * 0.001;

    if (sphereRef.current) {
      const mat = sphereRef.current.material as THREE.MeshBasicMaterial;
      if (isCalibrating) {
        mat.opacity = 0.5;
      } else if (isHovered || isSelected) {
        mat.opacity = 0.34;
      } else if (level === 'likely') {
        // Pulse period 1.0s, opacity 0.16 <-> 0.34
        mat.opacity = 0.25 + 0.09 * Math.sin(t * Math.PI * 2);
      } else if (level === 'check') {
        // Pulse period 1.6s, opacity 0.10 <-> 0.22
        mat.opacity = 0.16 + 0.06 * Math.sin((t * Math.PI * 2) / 1.6);
      } else {
        mat.opacity = 0.15;
      }
    }

    if (ringRef.current) {
      ringRef.current.quaternion.copy(state.camera.quaternion);
      if (level === 'likely') {
        // Expanding ring: scale 1 -> 1.85, opacity 0.65 -> 0, period 1.4s
        const progress = (t % 1.4) / 1.4;
        const ringScale = 1 + progress * 0.85;
        ringRef.current.scale.setScalar(ringScale);
        const ringOpacity = 0.65 * (1 - progress);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = ringOpacity;
      }
    }

    if (selectRingRef.current) {
      selectRingRef.current.quaternion.copy(state.camera.quaternion);
    }
  });

  const isVisible = isCalibrating || level !== 'unlikely' || isHovered || isSelected;
  const currentRadius = isHovered || isSelected ? anchor.radius * 1.15 : anchor.radius;

  // Render subtle node when unlikely and hovered
  const displayRadius = level === 'unlikely' && !isCalibrating ? 0.032 : currentRadius;

  if (!isVisible) return null;

  const showHtmlLabel = isHovered || isSelected;

  return (
    <group position={anchor.position}>
      {/* Primary Glowing Volumetric Sphere */}
      <mesh
        ref={sphereRef}
        renderOrder={10}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[displayRadius, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isCalibrating ? 0.5 : 0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Crisp anatomical core node */}
      {(level !== 'unlikely' || isHovered || isSelected) && !isCalibrating && (
        <mesh renderOrder={11}>
          <sphereGeometry args={[isHovered || isSelected ? 0.022 : 0.016, 16, 16]} />
          <meshBasicMaterial color={color} depthWrite={false} depthTest={false} transparent opacity={0.95} />
        </mesh>
      )}

      {/* Billboarded Expanding Ring for 'likely' severe injuries */}
      {level === 'likely' && !isCalibrating && (
        <mesh ref={ringRef} renderOrder={10}>
          <ringGeometry args={[anchor.radius * 0.88, anchor.radius * 1.04, 36]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6}
            depthWrite={false}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Billboarded Persistent Selection / Hover Reticle Ring */}
      {(isSelected || isHovered) && (
        <mesh ref={selectRingRef} renderOrder={12}>
          <ringGeometry args={[anchor.radius * 1.12, anchor.radius * 1.24, 36]} />
          <meshBasicMaterial
            color={new THREE.Color('#FFFFFF')}
            transparent
            opacity={isSelected ? 0.92 : 0.55}
            depthWrite={false}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Drei HTML Label (SPEC_3D line 16: transform off, 12px text) */}
      {showHtmlLabel && (
        <Html
          center
          transform={false}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          position={[0, anchor.radius + 0.06, 0]}
        >
          <div
            className="px-3 py-1.5 rounded-lg text-[12px] font-sans font-semibold whitespace-nowrap shadow-2xl border flex items-center gap-2 backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(7, 17, 28, 0.94)',
              borderColor: colorHex,
              color: '#FFFFFF',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: colorHex }}
            />
            <span>{regionLabel}</span>
            <span className="font-mono text-[11px] font-bold opacity-95">
              {Math.round(probability * 100)}%
            </span>
            <span className="text-[10px] font-mono uppercase opacity-85 px-1.5 py-0.5 rounded bg-white/15">
              {levelLabel}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Camera Controller: Smooth 600ms Transitions, Idle Auto-Rotate & Controls Limits
 */
function CameraController({
  selectedRegion,
  viewMode,
}: {
  selectedRegion: BodyRegion | null;
  viewMode?: 'front' | 'back' | 'free';
  onReset?: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  const transitionRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startLookAt: THREE.Vector3;
    targetLookAt: THREE.Vector3;
  }>({
    active: false,
    startTime: 0,
    duration: 600,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startLookAt: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3(),
  });

  const lastUserInteractionTime = useRef<number>(performance.now());
  const [isAutoRotating, setIsAutoRotating] = useState(false);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const triggerCameraTransition = React.useCallback(
    (targetPose: RegionCameraPose, duration = 600) => {
      if (!controlsRef.current) return;
      const currentLookAt = controlsRef.current.target.clone();
      const currentPos = camera.position.clone();

      transitionRef.current = {
        active: true,
        startTime: performance.now(),
        duration: prefersReducedMotion ? 0 : duration,
        startPos: currentPos,
        targetPos: new THREE.Vector3(...targetPose.position),
        startLookAt: currentLookAt,
        targetLookAt: new THREE.Vector3(...targetPose.target),
      };
    },
    [camera, prefersReducedMotion]
  );

  // Handle selected region focus (SPEC_3D: 600ms tween)
  useEffect(() => {
    if (selectedRegion && REGION_CAMERA_POSES[selectedRegion]) {
      triggerCameraTransition(REGION_CAMERA_POSES[selectedRegion], 600);
    } else {
      triggerCameraTransition(DEFAULT_CAMERA_FRONT, 600);
    }
  }, [selectedRegion, triggerCameraTransition]);

  // Handle View Mode switch (Front / Back / Free)
  useEffect(() => {
    if (viewMode === 'front') {
      triggerCameraTransition(DEFAULT_CAMERA_FRONT, 600);
    } else if (viewMode === 'back') {
      triggerCameraTransition(DEFAULT_CAMERA_BACK, 600);
    }
  }, [viewMode, triggerCameraTransition]);

  useFrame(() => {
    const now = performance.now();
    const trans = transitionRef.current;

    if (trans.active) {
      const elapsed = now - trans.startTime;
      const progress = trans.duration === 0 ? 1 : Math.min(elapsed / trans.duration, 1);

      // Ease-in-out cubic curve (Rule 68: --ease-in-out)
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(trans.startPos, trans.targetPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(trans.startLookAt, trans.targetLookAt, ease);
        controlsRef.current.update();
      }

      if (progress >= 1) {
        trans.active = false;
      }
    } else if (!prefersReducedMotion) {
      // Idle auto-rotate 0.6 deg/s after 6s of inactivity (SPEC_3D line 17)
      const idleTime = now - lastUserInteractionTime.current;
      if (idleTime > 6000 && !isAutoRotating && viewMode === 'free') {
        setIsAutoRotating(true);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={1.6}
      maxDistance={4.0}
      minPolarAngle={(Math.PI * 60) / 180}
      maxPolarAngle={(Math.PI * 100) / 180}
      dampingFactor={0.08}
      enableDamping={true}
      autoRotate={isAutoRotating && !prefersReducedMotion}
      autoRotateSpeed={0.6}
      onStart={() => {
        lastUserInteractionTime.current = performance.now();
        if (isAutoRotating) setIsAutoRotating(false);
      }}
      onChange={() => {
        lastUserInteractionTime.current = performance.now();
      }}
    />
  );
}

/** Reports where each region lands on screen, so the page can draw lines to it. */
function Projector({
  anchors,
  side,
  onProject,
}: {
  anchors: BodyRegionAnchor[];
  side: 'l' | 'r';
  onProject: (points: RegionPoints) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const point = useMemo(() => new THREE.Vector3(), []);
  const points = useRef<RegionPoints>({});

  useFrame(() => {
    anchors.forEach((anchor) => {
      if (anchor.side && anchor.side !== side) return;
      point.set(...anchor.position).project(camera);
      points.current[anchor.id] = [((point.x + 1) / 2) * size.width, ((1 - point.y) / 2) * size.height];
    });
    onProject(points.current);
  });

  return null;
}

/**
 * Main Body3D WebGL Canvas Component
 */
export function Body3D({
  occupant,
  viewMode = 'front',
  onReset,
  customAnchors,
  onSelectAnchor,
  isCalibrating = false,
  className = '',
  onProject,
  projectSide = 'r',
}: Body3DProps) {
  const tRegions = useTranslations('regions');
  const { hoveredRegion, selectedRegion, setHoveredRegion, setSelectedRegion } =
    useUiStore();

  const [enableBloom, setEnableBloom] = useState(false);   // bloom needs an opaque canvas
  const [dpr, setDpr] = useState<number>(1.25);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Pause render loops when the tab is hidden (GEMINI.md Rule 11)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const isEmpty = !occupant && !isCalibrating;

  const anchors = useMemo(() => {
    return getAnchorsWithMirrors(customAnchors || BASE_ANCHORS);
  }, [customAnchors]);

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      <Canvas
        frameloop={isTabVisible ? 'always' : 'never'}
        dpr={dpr}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{ fov: 35, position: [0, 0, 3.3] }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setEnableBloom(false);
            setDpr(1.0);
          }}
          onIncline={() => {
            setEnableBloom(false);
            setDpr(1.5);
          }}
        />

        {/* Clinical Stage Lighting (SPEC_3D line 7) */}
        <hemisphereLight
          args={[new THREE.Color('#DCEBFA'), new THREE.Color('#0A1524'), 1.35]}
        />
        <directionalLight
          position={[-3, 4, 3.5]}
          intensity={1.65}
          castShadow={enableBloom}
        />
        <directionalLight
          position={[2.5, 2.5, -4]}
          intensity={0.85}
          color="#64B5F6"
        />

        {/* 3D Clinical Scanner Pedestal */}
        <ScannerPedestal />

        {/* 3D Body Mesh with Model Loader & Fallback */}
        <Suspense fallback={<FallbackMannequin isEmpty={isEmpty} />}>
          <BodyModel isEmpty={isEmpty} occupant={occupant} anchors={anchors} />
          <ContactShadows position={[0, -0.9, 0]} opacity={0.55} scale={2.4} blur={2.0} far={1.2} frames={1} />
        </Suspense>

        {onProject && <Projector anchors={anchors} side={projectSide} onProject={onProject} />}

        {/* Glowing Anchors */}
        {!isEmpty &&
          anchors.map((anchor, index) => {
            const m4Entry = occupant?.m4?.[anchor.id];
            const level: M4Level = m4Entry?.level ?? 'unlikely';
            const probability = m4Entry?.probability ?? 0;
            const isHovered = hoveredRegion === anchor.id;
            const isSelected = selectedRegion === anchor.id;

            return (
              <AnchorSphere
                key={`${anchor.id}-${anchor.side || 'c'}-${index}`}
                anchor={anchor}
                level={level}
                probability={probability}
                regionLabel={tRegions(anchor.id)}
                levelLabel={tRegions(level)}
                isHovered={isHovered}
                isSelected={isSelected}
                onHover={(hovered) => setHoveredRegion(hovered ? anchor.id : null)}
                onSelect={() => {
                  if (isCalibrating) {
                    onSelectAnchor?.(anchor);
                  } else {
                    setSelectedRegion(selectedRegion === anchor.id ? null : anchor.id);
                  }
                }}
                isCalibrating={isCalibrating}
              />
            );
          })}

        {/* Camera Controller */}
        <CameraController
          selectedRegion={selectedRegion}
          viewMode={viewMode}
          onReset={onReset}
        />

        {/* Bloom Postprocessing (SPEC_3D line 7) */}
        {enableBloom && (
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.85}
              intensity={0.7}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
export default Body3D;
