'use client';

import React, { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { BufferAttribute, Mesh, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Group, Object3D } from 'three';

const BASE = '/models/crash';
const ROAD_LENGTH = 120;
const ROAD_WIDTH = 9;
const LANE_Z = 2.3;
const CAR_SCALE = 1.3;
const CAR_LENGTH = 2.5 * CAR_SCALE;
const WALL_X = 0.8;
const START_X = -17;
const FLIP_SHARE = 0.16;      // scroll share of the roll onto the roof
const ROOF_HEIGHT = 1.05;     // the body sits this high once upside down
const NOSE_START = 0.35;      // body z where the crumple zone begins
const GRAVITY = 9;
const REST_Y = 0.12;
const CAMERA: [number, number, number] = [-5.2, 5.4, 15];
const LOOK_AT: [number, number, number] = [-5.2, -0.1, 1];

const DEBRIS = [
  { file: 'debris-door', vx: -3.4, vy: 3.4, vz: 0.7, spin: 7 },
  { file: 'debris-bumper', vx: -4.6, vy: 2.5, vz: -1.5, spin: 9 },
  { file: 'debris-tire', vx: -2.6, vy: 4.1, vz: 1, spin: 11 },
  { file: 'debris-plate-a', vx: -5.2, vy: 3.1, vz: 0.8, spin: 8 },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function casting(root: Object3D) {
  root.traverse((node) => {
    if (node instanceof Mesh) node.castShadow = true;
  });
}

function Road() {
  const texture = useTexture(`${BASE}/road.jpg`);
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(ROAD_LENGTH, ROAD_WIDTH);
    const uv = plane.attributes.uv as BufferAttribute;
    const tiles = ROAD_LENGTH / ROAD_WIDTH;
    // The photo's lanes run along its height, so its axes are swapped onto the long plane.
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i) * tiles);
    return plane;
  }, []);

  useEffect(() => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} receiveShadow>
      <meshStandardMaterial map={texture} roughness={0.92} />
    </mesh>
  );
}

function Prop({ file, position, scale = 1 }: { file: string; position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF(`${BASE}/${file}.glb`);
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    casting(copy);
    return copy;
  }, [scene]);
  return <primitive object={clone} position={position} scale={scale} />;
}

interface ProgressProps {
  progress: RefObject<number>;
  impact: number;
  settle: number;
}

function Car({ progress, impact, settle }: ProgressProps) {
  const { scene } = useGLTF(`${BASE}/sedan-sports.glb`);
  const car = useRef<Group>(null);
  const roll = useRef<Group>(null);
  const { wheels, front, body, rest } = useMemo(() => {
    const wheels: Object3D[] = [];
    const front: Object3D[] = [];
    let body: Mesh | null = null;
    scene.traverse((node) => {
      if (node.name.startsWith('wheel-')) wheels.push(node);
      if (node.name.startsWith('wheel-front')) front.push(node);
    });
    scene.traverse((node) => {
      if (body || !(node instanceof Mesh)) return;
      if (!wheels.some((w) => w === node || w.getObjectById(node.id))) body = node;
    });
    casting(scene);
    const mesh = body as Mesh | null;
    const rest = mesh ? Float32Array.from(mesh.geometry.attributes.position.array) : null;
    return { wheels, front, body: mesh, rest };
  }, [scene]);
  const dented = useRef(-1);

  useFrame(() => {
    const group = car.current;
    if (!group || !roll.current) return;
    const p = progress.current;
    const drive = clamp(p / impact);
    const after = clamp((p - impact) / settle);
    const flip = clamp((p - impact) / FLIP_SHARE);
    const eased = flip * flip * (3 - 2 * flip);
    const stop = WALL_X - 0.55 - CAR_LENGTH / 2;

    group.position.x = START_X + (stop - START_X) * drive * drive - eased * 4.2;
    group.position.y = Math.sin(eased * Math.PI) * 1.9 + eased * ROOF_HEIGHT;
    group.position.z = LANE_Z + eased * 0.5;
    group.rotation.y = Math.PI / 2 - after * 0.3;
    roll.current.rotation.z = eased * Math.PI;

    wheels.forEach((wheel) => {
      wheel.rotation.x = drive * 60 + eased * 20;
    });
    front.forEach((wheel) => {
      wheel.visible = p < impact;   // torn off: they fly away with the debris
    });

    // Crush the nose once, in proportion to the impact, with uneven dents.
    const crush = clamp(after * 3);
    if (body && rest && crush !== dented.current) {
      dented.current = crush;
      const position = body.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = rest[i * 3];
        const y = rest[i * 3 + 1];
        const z = rest[i * 3 + 2];
        const nose = clamp((z - NOSE_START) / 1.2);
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
    <group ref={car} scale={CAR_SCALE}>
      <group ref={roll}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function Piece({ file, vx, vy, vz, spin, progress, impact }: (typeof DEBRIS)[number] & Omit<ProgressProps, 'settle'>) {
  const { scene } = useGLTF(`${BASE}/${file}.glb`);
  const piece = useRef<Group>(null);
  const clone = useMemo(() => {
    const copy = scene.clone(true);
    casting(copy);
    return copy;
  }, [scene]);

  useFrame(() => {
    const group = piece.current;
    if (!group) return;
    const t = clamp((progress.current - impact) / 0.16) * 2.4;
    group.visible = t > 0;
    // Ballistic hops: each landing keeps part of the speed, then the part rests on the road.
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
    const moving = slide + (speed ? time : 0);
    const damped = 1 - Math.exp(-moving * 0.9);
    group.position.set(
      WALL_X - 0.8 + (vx / 0.9) * damped,
      REST_Y + height + speed * time - 0.5 * GRAVITY * time * time,
      LANE_Z + (vz / 0.9) * damped
    );
    group.rotation.set(spin * damped, spin * damped * 0.6, 0);
  });

  return (
    <group ref={piece} scale={0.8}>
      <primitive object={clone} />
    </group>
  );
}

export function CrashScene({ progress, impact, settle }: ProgressProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 30, position: CAMERA, near: 0.5, far: 80 }}
      onCreated={({ camera }) => camera.lookAt(...LOOK_AT)}
    >
      <fog attach="fog" args={['#FAF8F3', 20, 42]} />
      <hemisphereLight args={['#ffffff', '#b8b2a6', 1.5]} />
      <directionalLight
        castShadow
        position={[-6, 12, 7]}
        intensity={2.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <Road />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 12]} receiveShadow>
        <planeGeometry args={[ROAD_LENGTH, 60]} />
        <meshStandardMaterial color="#5f5b4c" roughness={1} />
      </mesh>
      <mesh position={[WALL_X + 0.5, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 2.6, ROAD_WIDTH]} />
        <meshStandardMaterial color="#8d887e" roughness={0.9} />
      </mesh>
      <Prop file="cone" position={[-1.4, 0, 4.1]} scale={0.75} />
      <Prop file="cone" position={[-2.8, 0, 3.9]} scale={0.75} />
      <Prop file="cone" position={[-1.2, 0, 0.2]} scale={0.75} />
      <Car progress={progress} impact={impact} settle={settle} />
      {DEBRIS.map((d) => (
        <Piece key={d.file} {...d} progress={progress} impact={impact} />
      ))}
    </Canvas>
  );
}
