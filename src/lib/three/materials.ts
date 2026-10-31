import * as THREE from 'three';

/**
 * Stage color constants aligned with CSS tokens in tokens.css
 */
export const STAGE_COLORS = {
  bg: '#0B1310',
  grid: 'rgba(255,255,255,0.06)',
  ink: '#E8EEEA',
  muted: '#8FA097',
  route: '#F2B705',
  impact: '#FF4D5E',
  brand: '#006233',
  brandSubtle: '#1F332A',

  // Region colors from tokens.css
  regUnlikely: '#C9C4B6',
  regCheck: '#E0A100',
  regLikely: '#D21034',
} as const;

/**
 * Material override for the human body mesh (SPEC_3D line 10):
 * MeshStandardMaterial color #CFD8D2, roughness 0.55, metalness 0.05,
 * plus a subtle fresnel rim in --brand-subtle.
 */
export function createBodyMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(STAGE_COLORS.ink),
    roughness: 0.55,
    metalness: 0.05,
  });

  // Inject subtle fresnel rim in --brand-subtle via onBeforeCompile
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: new THREE.Color(STAGE_COLORS.brandSubtle) };

    shader.fragmentShader = `
      uniform vec3 uRimColor;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      // Subtle fresnel rim
      vec3 rimNormal = normalize(vNormal);
      vec3 rimView = normalize(vViewPosition);
      float rim = 1.0 - max(dot(rimNormal, rimView), 0.0);
      rim = smoothstep(0.65, 1.0, rim);
      gl_FragColor.rgb += uRimColor * rim * 0.45;
      `
    );
  };

  return mat;
}

export const HEAT_SLOTS = 9;

export interface HeatUniforms {
  uHeat: { value: THREE.Vector4[] };        // xyz world position, w radius
  uHeatColor: { value: THREE.Color[] };
  uHeatGain: { value: number[] };
  uScan: { value: number };                 // world height of the scan line
  uTime: { value: number };
}

/**
 * Pale body for a light page: injury estimates are painted on the skin as heat
 * with moving contour lines, revealed by a scan line.
 */
export function createHeatBodyMaterial(): { material: THREE.MeshStandardMaterial; uniforms: HeatUniforms } {
  const uniforms: HeatUniforms = {
    uHeat: { value: Array.from({ length: HEAT_SLOTS }, () => new THREE.Vector4()) },
    uHeatColor: { value: Array.from({ length: HEAT_SLOTS }, () => new THREE.Color()) },
    uHeatGain: { value: new Array<number>(HEAT_SLOTS).fill(0) },
    uScan: { value: 1 },
    uTime: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({ color: '#E4E7E2', roughness: 0.62, metalness: 0 });
  material.toneMapped = false;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHeatPos;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvHeatPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        #define HEAT_SLOTS ${HEAT_SLOTS}
        varying vec3 vHeatPos;
        uniform vec4 uHeat[HEAT_SLOTS];
        uniform vec3 uHeatColor[HEAT_SLOTS];
        uniform float uHeatGain[HEAT_SLOTS];
        uniform float uScan;
        uniform float uTime;`
      )
      .replace(
        '#include <opaque_fragment>',
        `vec3 heatColor = vec3(0.0);
        float heat = 0.0;
        float heatDistance = 0.0;
        for (int i = 0; i < HEAT_SLOTS; i++) {
          float d = distance(vHeatPos, uHeat[i].xyz);
          float amount = uHeatGain[i] * (1.0 - smoothstep(uHeat[i].w * 0.3, uHeat[i].w * 1.35, d));
          if (amount > heat) {
            heat = amount;
            heatColor = uHeatColor[i];
            heatDistance = d;
          }
        }
        float contour = 0.5 + 0.5 * sin(heatDistance * 110.0 - uTime * 5.0);
        heat *= (0.72 + 0.28 * contour) * step(uScan, vHeatPos.y);
        outgoingLight = mix(outgoingLight, heatColor, clamp(heat * 1.15, 0.0, 1.0));

        float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
        outgoingLight = mix(outgoingLight, vec3(0.08, 0.2, 0.14), smoothstep(0.55, 1.0, rim) * 0.6);

        float scanBand = exp(-pow((vHeatPos.y - uScan) * 34.0, 2.0));
        outgoingLight = mix(outgoingLight, vec3(0.0, 0.38, 0.2), scanBand * 0.9);
        #include <opaque_fragment>`
      );
  };

  return { material, uniforms };
}

/**
 * Body silhouette material for empty state (no patient):
 * Outlined or wireframe/ghost body silhouette with no glows (SPEC_HOSPITAL line 23)
 */
export function createBodyEmptyMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(STAGE_COLORS.grid),
    wireframe: true,
    transparent: true,
    opacity: 0.22,
  });
}
