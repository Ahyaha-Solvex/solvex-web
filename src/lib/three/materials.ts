import * as THREE from 'three';

/**
 * Stage color constants aligned with CSS tokens in tokens.css
 */
export const STAGE_COLORS = {
  bg: '#0B1310',
  grid: '#17231E',
  ink: '#CFD8D2',
  route: '#00E575',
  impact: '#FF4D5E',
  brand: '#006233',
  brandSubtle: '#1F332A',

  // Region colors from tokens.css
  regUnlikely: '#5A6660',
  regCheck: '#E68A00',
  regLikely: '#D9383A',
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
