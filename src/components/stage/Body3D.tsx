'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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
  createBodyMaterial,
  createBodyEmptyMaterial,
} from '@/lib/three/materials';

export interface Body3DProps {
  occupant?: Occupant | null;
  viewMode?: 'front' | 'back' | 'free';
  onReset?: () => void;
  customAnchors?: BodyRegionAnchor[];
  onSelectAnchor?: (anchor: BodyRegionAnchor) => void;
  isCalibrating?: boolean;
  className?: string;
}

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
function BodyModel({ isEmpty }: { isEmpty: boolean }) {
  const gltf = useGLTF('/models/body.glb');

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
  }, [gltf, isEmpty]);

  return <primitive object={clonedScene} />;
}

/**
 * Single Glowing Anchor Sphere with Pulse & Expanding Rings
 */
function AnchorSphere({
  anchor,
  level,
  isHovered,
  isSelected,
  onHover,
  onSelect,
  isCalibrating,
}: {
  anchor: BodyRegionAnchor;
  level: M4Level;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
  isCalibrating?: boolean;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const colorHex = useMemo(() => {
    if (isCalibrating) return '#00E575';
    if (level === 'likely') return STAGE_COLORS.regLikely;
    if (level === 'check') return STAGE_COLORS.regCheck;
    return STAGE_COLORS.regUnlikely;
  }, [level, isCalibrating]);

  const color = useMemo(() => new THREE.Color(colorHex), [colorHex]);

  useFrame(() => {
    const t = performance.now() * 0.001;

    if (sphereRef.current) {
      if (level === 'likely') {
        // Pulse period 1.0s, opacity 0.35 <-> 0.75
        const opacity = 0.55 + 0.2 * Math.sin(t * Math.PI * 2);
        (sphereRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      } else if (level === 'check') {
        // Pulse period 1.6s, opacity 0.25 <-> 0.55
        const opacity = 0.40 + 0.15 * Math.sin((t * Math.PI * 2) / 1.6);
        (sphereRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }

    if (ringRef.current && level === 'likely') {
      // Expanding ring: scale 1 -> 2, opacity 0.6 -> 0, period 1.4s
      const progress = (t % 1.4) / 1.4;
      const ringScale = 1 + progress;
      ringRef.current.scale.setScalar(ringScale);
      const ringOpacity = 0.6 * (1 - progress);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = ringOpacity;
    }
  });

  const isVisible = isCalibrating || level !== 'unlikely' || isHovered || isSelected;
  const currentRadius = isHovered ? anchor.radius * 1.15 : anchor.radius;

  // Render 4px dot when unlikely and hovered
  const displayRadius = level === 'unlikely' && !isCalibrating ? 0.025 : currentRadius;

  if (!isVisible) return null;

  const showHtmlLabel = isHovered || isSelected;

  return (
    <group position={anchor.position}>
      {/* Primary Glowing Additive Sphere */}
      <mesh
        ref={sphereRef}
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
        <sphereGeometry args={[displayRadius, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={level === 'unlikely' ? 0.8 : 0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Expanding Ring for 'likely' severe injuries */}
      {level === 'likely' && !isCalibrating && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[anchor.radius * 0.95, anchor.radius * 1.15, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Persistent Selection Ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[anchor.radius * 1.25, anchor.radius * 1.4, 32]} />
          <meshBasicMaterial
            color={new THREE.Color('#FFFFFF')}
            transparent
            opacity={0.85}
            depthWrite={false}
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
          position={[0, anchor.radius + 0.05, 0]}
        >
          <div
            className="px-2.5 py-1 rounded-md text-[12px] font-sans font-medium whitespace-nowrap shadow-xl border flex items-center gap-1.5 backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.92)',
              borderColor: colorHex,
              color: '#FFFFFF',
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: colorHex }}
            />
            <span className="capitalize">{anchor.id.replace('_', ' ')}</span>
            <span className="text-[10px] font-mono uppercase opacity-85 px-1 py-0.5 rounded bg-white/10">
              {level}
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
}: Body3DProps) {
  const { hoveredRegion, selectedRegion, setHoveredRegion, setSelectedRegion } =
    useUiStore();

  const [enableBloom, setEnableBloom] = useState(true);
  const [dpr, setDpr] = useState<number>(1.5);
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
        camera={{ fov: 35, position: [0, 0.1, 2.8] }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setEnableBloom(false);
            setDpr(1.0);
          }}
          onIncline={() => {
            setEnableBloom(true);
            setDpr(1.5);
          }}
        />

        {/* Stage Lighting (SPEC_3D line 7) */}
        <hemisphereLight
          args={[new THREE.Color('#C7D6CE'), new THREE.Color('#0B1310'), 0.6]}
        />
        <directionalLight
          position={[-3, 4, 3]}
          intensity={1.1}
          castShadow={enableBloom}
        />
        <directionalLight
          position={[0, 2, -4]}
          intensity={0.5}
          color="#A8BDB4"
        />

        {/* 3D Body Mesh with Model Loader & Fallback */}
        <Suspense fallback={<FallbackMannequin isEmpty={isEmpty} />}>
          <BodyModel isEmpty={isEmpty} />
        </Suspense>

        {/* Glowing Anchors */}
        {!isEmpty &&
          anchors.map((anchor, index) => {
            const level: M4Level = occupant?.m4?.[anchor.id]?.level ?? 'unlikely';
            const isHovered = hoveredRegion === anchor.id;
            const isSelected = selectedRegion === anchor.id;

            return (
              <AnchorSphere
                key={`${anchor.id}-${anchor.side || 'c'}-${index}`}
                anchor={anchor}
                level={level}
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
