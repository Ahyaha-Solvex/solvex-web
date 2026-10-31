'use client';

import React, { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, Mesh, Vector3 } from 'three';
import type { Group, Material } from 'three';

const MODEL_SIZE = 1.8;
const CAMERA_DISTANCE = 7.7;
const CAMERA_FOV = 22;
const ELEVATION = (40 * Math.PI) / 180;      // matches the rendered carousel camera
const TILT = (34 * Math.PI) / 180;
const DIAGONAL = (-25 * Math.PI) / 180;

interface ModelProps {
  url: string;
  onReady: () => void;
}

function Model({ url, onReady }: ModelProps) {
  const { scene } = useGLTF(url);
  const pivot = useRef<Group>(null);
  const announce = useRef(onReady);
  announce.current = onReady;
  const mounted = useRef(false);

  const placement = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const scale = MODEL_SIZE / Math.max(size.x, size.y, size.z);
    return { scale, position: center.multiplyScalar(-scale) };
  }, [scene]);

  useEffect(() => {
    mounted.current = true;
    announce.current();
    return () => {
      mounted.current = false;
      // Deferred, because React may remount at once and the model must not reload then.
      setTimeout(() => {
        if (mounted.current) return;
        scene.traverse((node) => {
          if (node instanceof Mesh) {
            node.geometry.dispose();
            const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((m) => m.dispose());
          }
        });
        useGLTF.clear(url);
      }, 0);
    };
  }, [scene, url]);

  return (
    <group ref={pivot} rotation={[TILT, DIAGONAL, 0]}>
      <primitive object={scene} scale={placement.scale} position={placement.position} />
    </group>
  );
}

class ViewerBoundary extends Component<{ onError: () => void; children: ReactNode }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface ComponentViewerProps {
  id: string;
  label: string;
  onReady: () => void;
  onError: () => void;
  onHold: (held: boolean) => void;
}

export function ComponentViewer({ id, label, onReady, onError, onHold }: ComponentViewerProps) {
  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing" role="img" aria-label={label}>
      <ViewerBoundary onError={onError}>
        <Canvas
          dpr={[1, 1.75]}
          gl={{ alpha: true, antialias: true }}
          camera={{
            fov: CAMERA_FOV,
            position: [0, Math.sin(ELEVATION) * CAMERA_DISTANCE, Math.cos(ELEVATION) * CAMERA_DISTANCE],
          }}
        >
          <ambientLight intensity={0.25} />
          <directionalLight position={[2, 5, 3]} intensity={0.8} />
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={1} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={8} />
            <Lightformer intensity={0.5} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
            <Lightformer intensity={0.5} position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
          </Environment>
          <Suspense fallback={null}>
            <Model url={`/models/components/${id}.glb`} onReady={onReady} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping
            onStart={() => onHold(true)}
            onEnd={() => onHold(false)}
          />
        </Canvas>
      </ViewerBoundary>
    </div>
  );
}
