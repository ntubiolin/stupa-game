import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SKY_SHADER_UNIFORMS } from './sky.js';

/**
 * Inject SEASON: A letter to the future × Firewatch painterly shader hooks into a Three.js material:
 *  1. Half-Lambert wrapped diffuse + Warm/Cool Watercolor Shadow Ramp (prevents muddy/black dusk slopes)
 *  2. Grazing Sun Rim Light (golden-amber Fresnel backlight on edges facing the sun)
 *  3. Firewatch Multi-Stop Color-Ramp Distance Fog (Near Amber -> Mid Coral-Rose -> Far Violet-Indigo) + Valley Height Mist
 */
export function applySeasonFirewatchShader(material, opts = {}) {
  if (!material || typeof material !== 'object') return material;
  const rimStrength = opts.rimStrength ?? 0.38;
  const fogRampStrength = opts.fogRampStrength ?? 0.82;
  const receiveValleyMist = opts.receiveValleyMist === false ? 0.0 : 1.0;

  material.customProgramCacheKey = () =>
    `season-firewatch-v1-${rimStrength}-${fogRampStrength}-${receiveValleyMist}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = SKY_SHADER_UNIFORMS.uSunDir;
    shader.uniforms.uSunColor = SKY_SHADER_UNIFORMS.uSunColor;
    shader.uniforms.uTwilightFactor = SKY_SHADER_UNIFORMS.uTwilightFactor;
    shader.uniforms.uNightFactor = SKY_SHADER_UNIFORMS.uNightFactor;
    shader.uniforms.uFogNearColor = SKY_SHADER_UNIFORMS.uFogNearColor;
    shader.uniforms.uFogMidColor = SKY_SHADER_UNIFORMS.uFogMidColor;
    shader.uniforms.uFogFarColor = SKY_SHADER_UNIFORMS.uFogFarColor;
    shader.uniforms.uSfRimStrength = { value: rimStrength };
    shader.uniforms.uSfFogRampStrength = { value: fogRampStrength };
    shader.uniforms.uSfValleyMist = { value: receiveValleyMist };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        varying vec3 vSfWorldPos;
        varying vec3 vSfWorldNormal;
        `
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        #include <project_vertex>
        vec4 sfLocalPos = vec4( transformed, 1.0 );
        vec3 sfObjNormal = vec3( 0.0, 1.0, 0.0 );
        #ifndef FLAT_SHADED
          sfObjNormal = objectNormal;
        #endif
        #ifdef USE_INSTANCING
          sfLocalPos = instanceMatrix * sfLocalPos;
          sfObjNormal = mat3( instanceMatrix ) * sfObjNormal;
        #endif
        vSfWorldPos = ( modelMatrix * sfLocalPos ).xyz;
        vSfWorldNormal = normalize( mat3( modelMatrix ) * sfObjNormal + vec3( 0.0, 1e-5, 0.0 ) );
        `
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uTwilightFactor;
        uniform float uNightFactor;
        uniform vec3 uFogNearColor;
        uniform vec3 uFogMidColor;
        uniform vec3 uFogFarColor;
        uniform float uSfRimStrength;
        uniform float uSfFogRampStrength;
        uniform float uSfValleyMist;
        varying vec3 vSfWorldPos;
        varying vec3 vSfWorldNormal;
        `
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        #include <opaque_fragment>
        vec3 sfN = normalize( vSfWorldNormal );
        vec3 sfL = normalize( uSunDir + vec3( 0.0, 1e-4, 0.0 ) );
        float sfHalfLambert = dot( sfN, sfL ) * 0.5 + 0.5;
        float sfLightBand = smoothstep( 0.26, 0.72, sfHalfLambert );
        float sfDayVis = clamp( 1.0 - uNightFactor * 0.82, 0.0, 1.0 );
        vec3 sfCoolShadowTint = mix( vec3( 0.44, 0.40, 0.58 ), vec3( 0.56, 0.38, 0.50 ), uTwilightFactor );
        vec3 sfWarmSunTint = mix( vec3( 1.05, 0.99, 0.89 ), uSunColor * 1.12, 0.45 );
        vec3 sfShadowFill = diffuseColor.rgb * sfCoolShadowTint * ( 0.30 + 0.18 * uTwilightFactor ) * ( 1.0 - sfLightBand ) * sfDayVis;
        gl_FragColor.rgb = max( gl_FragColor.rgb, sfShadowFill );
        gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * sfWarmSunTint, sfLightBand * 0.24 * sfDayVis );
        vec3 sfV = normalize( cameraPosition - vSfWorldPos + vec3( 0.0, 1e-4, 0.0 ) );
        float sfFresnel = pow( clamp( 1.0 - max( 0.0, dot( sfN, sfV ) ), 0.0, 1.0 ), 2.8 );
        float sfSunGrazing = smoothstep( -0.25, 0.65, dot( sfN, sfL ) ) * sfDayVis;
        gl_FragColor.rgb += uSunColor * sfFresnel * sfSunGrazing * uSfRimStrength * ( 0.45 + 0.65 * uTwilightFactor );
        `
      )
      .replace(
        '#include <fog_fragment>',
        /* glsl */ `
        #include <fog_fragment>
        float sfDist = length( vSfWorldPos - cameraPosition );
        float sfMidT = smoothstep( 42.0, 128.0, sfDist );
        float sfFarT = smoothstep( 118.0, 230.0, sfDist );
        vec3 sfRampFog = mix( uFogNearColor, uFogMidColor, sfMidT );
        sfRampFog = mix( sfRampFog, uFogFarColor, sfFarT );
        float sfDistFog = smoothstep( 30.0, 215.0, sfDist ) * uSfFogRampStrength;
        float sfValleyFog = smoothstep( 14.0, -3.0, vSfWorldPos.y ) * smoothstep( 16.0, 92.0, sfDist ) * 0.32 * uSfValleyMist;
        float sfFogMix = clamp( sfDistFog + sfValleyFog, 0.0, 0.88 );
        gl_FragColor.rgb = mix( gl_FragColor.rgb, sfRampFog, sfFogMix );
        `
      );
  };

  material.needsUpdate = true;
  return material;
}

/**
 * Deterministic pseudo-random number generator with fixed seed.
 */
export function seededRandom(seed = 12345) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Push a collider tagged with `zone: mapId`.
 */
export function pushCollider(ctx, mapId, shape) {
  if (!ctx?.colliders || !shape) return;
  ctx.colliders.push({
    ...shape,
    zone: mapId,
  });
}

/**
 * Generate a seamless 256×256 SEASON-style painterly gouache ground detail & bump CanvasTexture
 * in browser environments (`typeof document !== 'undefined'`).
 * Uses warm-cream / cool-slate painterly brush strokes (`rgb(208..255)`) so it multiplies cleanly
 * with `vertexColors: true` while providing crisp hand-painted texture and `bumpMap` micro-relief.
 */
export function createGroundDetailTexture(seed = 4109) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const size = 256;
  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g || typeof g.fillRect !== 'function') return null;

  const rng = seededRandom(seed);
  g.fillStyle = 'rgb(236, 232, 224)';
  g.fillRect(0, 0, size, size);

  // 1. Broad overlapping SEASON-style gouache wash patches (wrapped seamlessly across tile edges)
  for (let i = 0; i < 240; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const w = 10 + Math.floor(rng() * 24);
    const h = 4 + Math.floor(rng() * 10);
    const v = 222 + Math.floor(rng() * 26);
    const warmShift = Math.floor((rng() - 0.45) * 14);
    const r = THREE.MathUtils.clamp(v + warmShift, 210, 255);
    const gr = THREE.MathUtils.clamp(v + Math.floor(warmShift * 0.35), 210, 255);
    const b = THREE.MathUtils.clamp(v - warmShift, 208, 255);
    g.fillStyle = `rgb(${r}, ${gr}, ${b})`;
    for (const dx of [0, -size, size]) {
      for (const dy of [0, -size, size]) {
        if (x + dx + w > 0 && x + dx < size && y + dy + h > 0 && y + dy < size) {
          g.fillRect(x + dx, y + dy, w, h);
        }
      }
    }
  }

  // 2. Painterly turf & wind-swept soil/stone brushwork striations
  for (let i = 0; i < 680; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const w = 3 + Math.floor(rng() * 11);
    const h = 1 + (rng() > 0.68 ? 2 : 1);
    const v = 212 + Math.floor(rng() * 38);
    const warm = Math.floor((rng() - 0.48) * 10);
    g.fillStyle = `rgb(${Math.min(255, v + warm)}, ${v}, ${Math.max(208, v - warm)})`;
    g.fillRect(x, y, w, h);
    if (x + w > size) g.fillRect(x - size, y, w, h);
    if (y + h > size) g.fillRect(x, y - size, w, h);
  }

  // 3. Organic pebbles, soil grain & sunlit quartz/wildflower micro-specks
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const s = rng() > 0.78 ? 2 : 1;
    const isHighlight = rng() > 0.48;
    const v = isHighlight
      ? 244 + Math.floor(rng() * 12)
      : 210 + Math.floor(rng() * 20);
    const warm = isHighlight ? 3 : -2;
    g.fillStyle = `rgb(${Math.min(255, v + warm)}, ${Math.max(208, v)}, ${Math.max(206, v - warm)})`;
    g.fillRect(x, y, s, s);
    if (x + s > size) g.fillRect(x - size, y, s, s);
    if (y + s > size) g.fillRect(x, y - size, s, s);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Create a subdivided heightfield terrain mesh with vertex colors and procedural micro-detail bump map.
 * Returns `{ mesh, getHeight }`.
 */
export function createHeightfieldTerrain(ctx, {
  origin = { x: 0, z: 0 },
  size = 180,
  segments = 96,
  heightFn = () => 0,
  colorFn = null,
} = {}) {
  const terrainGeo = new THREE.PlaneGeometry(size, size, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;
  const colorAttr = new Float32Array(vertexCount * 3);

  const defaultCol = new THREE.Color(0x82845c);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < vertexCount; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wx = lx + origin.x;
    const wz = lz + origin.z;
    const y = heightFn(wx, wz);
    posAttr.setY(i, y);

    let c = defaultCol;
    if (typeof colorFn === 'function') {
      const res = colorFn(wx, wz, y, lx, lz);
      if (res instanceof THREE.Color) {
        c = res;
      } else if (typeof res === 'number') {
        c = tmpCol.setHex(res);
      } else if (res && typeof res.r === 'number') {
        c = res;
      }
    }

    colorAttr[i * 3 + 0] = c.r;
    colorAttr[i * 3 + 1] = c.g;
    colorAttr[i * 3 + 2] = c.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  terrainGeo.computeVertexNormals();

  const detailTex = createGroundDetailTexture();
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    ...(detailTex ? { map: detailTex, bumpMap: detailTex, bumpScale: 0.07 } : {}),
  });
  applySeasonFirewatchShader(terrainMat, {
    rimStrength: 0.28,
    fogRampStrength: 0.80,
    receiveValleyMist: true,
  });

  const mesh = new THREE.Mesh(terrainGeo, terrainMat);
  mesh.position.set(origin.x, 0, origin.z);
  mesh.receiveShadow = true;

  return { mesh, getHeight: heightFn };
}

/**
 * Build a stratified Himalayan crag boulder cluster prototype geometry
 * (main faceted crag + 2 basal companion stones) with vertex color shading.
 */
function buildStratifiedRockClusterGeometry() {
  const parts = [];

  // 1. Main multi-faceted stratified crag boulder
  const mainGeo = new THREE.DodecahedronGeometry(1, 1);
  const mPos = mainGeo.attributes.position;
  for (let v = 0; v < mPos.count; v++) {
    const vx = mPos.getX(v);
    const vy = mPos.getY(v);
    const vz = mPos.getZ(v);
    // Deterministic spatial displacement keeps shared vertices watertight
    const strata = Math.sin(vy * 7.5 + vx * 1.4) * 0.075;
    const crag = Math.cos(vx * 3.8 - vz * 3.4) * Math.sin(vy * 4.2 + vz * 2.7) * 0.09;
    const flattenBase = vy < -0.35 ? 0.72 : 1.0;
    const sx = (1.04 + strata + crag) * (vy > 0.25 ? 0.92 : 1.04);
    const sy = (0.88 + crag * 0.6) * flattenBase;
    const sz = (1.02 - strata * 0.7 + crag) * (vy > 0.25 ? 0.92 : 1.04);
    mPos.setXYZ(v, vx * sx, vy * sy, vz * sz);
  }
  mainGeo.computeVertexNormals();
  parts.push(mainGeo);

  // 2. Flanking basal companion stone A
  const subA = new THREE.DodecahedronGeometry(0.46, 0);
  const aPos = subA.attributes.position;
  for (let v = 0; v < aPos.count; v++) {
    const vx = aPos.getX(v);
    const vy = aPos.getY(v);
    const vz = aPos.getZ(v);
    const step = 1.0 + Math.sin(vy * 6.0 + vx * 2.5) * 0.08;
    aPos.setXYZ(v, vx * 1.15 * step + 0.62, vy * 0.74 - 0.34, vz * 0.96 * step + 0.36);
  }
  subA.computeVertexNormals();
  parts.push(subA);

  // 3. Flanking basal companion stone B
  const subB = new THREE.DodecahedronGeometry(0.36, 0);
  const bPos = subB.attributes.position;
  for (let v = 0; v < bPos.count; v++) {
    const vx = bPos.getX(v);
    const vy = bPos.getY(v);
    const vz = bPos.getZ(v);
    const step = 1.0 + Math.cos(vy * 5.5 - vz * 2.8) * 0.08;
    bPos.setXYZ(v, vx * 0.95 * step - 0.54, vy * 0.68 - 0.38, vz * 1.12 * step - 0.32);
  }
  subB.computeVertexNormals();
  parts.push(subB);

  const clusterGeo = mergeGeometries(parts, false);
  clusterGeo.computeVertexNormals();

  const cPos = clusterGeo.attributes.position;
  const cNorm = clusterGeo.attributes.normal;
  const cCols = new Float32Array(cPos.count * 3);

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const ny = cNorm.getY(v);
    const band = Math.sin(vy * 9.0 + vx * 2.2 - vz * 1.8) * 0.045;

    let r = 0.76 + band;
    let g = 0.75 + band;
    let b = 0.72 + band;

    if (vy < -0.22) {
      // Darker earthy/mossy base grounded in soil
      const t = Math.min(1, (-0.22 - vy) / 0.55);
      r = THREE.MathUtils.lerp(r, 0.46, t);
      g = THREE.MathUtils.lerp(g, 0.45, t);
      b = THREE.MathUtils.lerp(b, 0.39, t);
    }
    if (ny > 0.45) {
      // Pale alpine lichen / frost crest on upward-facing ledges
      const crest = Math.min(1, (ny - 0.45) / 0.48);
      r = THREE.MathUtils.lerp(r, 0.96, crest * 0.75);
      g = THREE.MathUtils.lerp(g, 0.97, crest * 0.75);
      b = THREE.MathUtils.lerp(b, 0.94, crest * 0.75);
    }

    cCols[v * 3 + 0] = r;
    cCols[v * 3 + 1] = g;
    cCols[v * 3 + 2] = b;
  }

  clusterGeo.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
  return clusterGeo;
}

/**
 * Scatter stratified Himalayan crag boulders using InstancedMesh and register circle colliders.
 */
export function scatterRocks(ctx, group, {
  mapId = 'wild',
  origin = { x: 0, z: 0 },
  count = 20,
  rng = seededRandom(7789),
  area = { minR: 12, maxR: 58 },
  minRadius = 1.0,
  maxRadius = 2.2,
  minSpacing = 6,
  avoid = [],
  getHeight = () => 0,
  color = 0x6e6962,
} = {}) {
  const placed = [];
  let attempts = 0;
  const maxAttempts = count * 12;

  while (placed.length < count && attempts < maxAttempts) {
    attempts++;
    const a = rng() * Math.PI * 2;
    const minR = area.minR ?? 10;
    const maxR = area.maxR ?? 58;
    const rad = minR + rng() * (maxR - minR);
    const bx = origin.x + Math.cos(a) * rad;
    const bz = origin.z + Math.sin(a) * rad;

    let skip = false;
    for (let i = 0; i < avoid.length; i++) {
      const av = avoid[i];
      if (!av) continue;
      if (typeof av === 'function') {
        if (av(bx, bz)) { skip = true; break; }
      } else if (Math.hypot(bx - av.x, bz - av.z) < (av.r || 8)) {
        skip = true;
        break;
      }
    }
    if (skip) continue;

    for (let o = 0; o < placed.length; o++) {
      if (Math.hypot(bx - placed[o].x, bz - placed[o].z) < minSpacing) {
        skip = true;
        break;
      }
    }
    if (skip) continue;

    const r = minRadius + rng() * (maxRadius - minRadius);
    const by = getHeight(bx, bz);
    const rx = rng() * Math.PI;
    const ry = rng() * Math.PI;
    const sx = 1.0 + (rng() - 0.5) * 0.3;
    const sy = 0.82 + (rng() - 0.5) * 0.25;
    const sz = 1.0 + (rng() - 0.5) * 0.3;

    placed.push({ x: bx, y: by, z: bz, r, rx, ry, sx, sy, sz });

    pushCollider(ctx, mapId, {
      type: 'circle',
      x: bx,
      z: bz,
      r: r * 0.9,
    });
  }

  if (placed.length === 0) return { instanced: null, placed };

  const baseGeo = buildStratifiedRockClusterGeometry();
  const rockMat = new THREE.MeshStandardMaterial({
    color,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.05,
  });
  applySeasonFirewatchShader(rockMat, {
    rimStrength: 0.46,
    fogRampStrength: 0.82,
    receiveValleyMist: true,
  });

  const instanced = new THREE.InstancedMesh(baseGeo, rockMat, placed.length);
  instanced.castShadow = true;
  instanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const instCol = new THREE.Color();
  const colRng = seededRandom(8421);

  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    dummy.position.set(p.x, p.y + p.r * 0.48, p.z);
    // Keep crag base grounded and frost/lichen crest facing skyward with natural tilt
    dummy.rotation.set((p.rx - Math.PI * 0.5) * 0.22, p.ry * 2.0, (p.rx - 1.5) * 0.16);
    dummy.scale.set(p.r * p.sx, p.r * p.sy, p.r * p.sz);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    const shade = 0.88 + colRng() * 0.24;
    const warm = (colRng() - 0.5) * 0.08;
    instCol.setRGB(
      THREE.MathUtils.clamp(shade + warm, 0.75, 1.15),
      THREE.MathUtils.clamp(shade, 0.75, 1.15),
      THREE.MathUtils.clamp(shade - warm, 0.75, 1.15)
    );
    instanced.setColorAt(i, instCol);
  }
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  if (group) group.add(instanced);

  return { instanced, placed };
}

export const scatterProps = scatterRocks;

/**
 * Create a single faceted Himalayan peak geometry with ridge/gully displacement
 * and SEASON × Firewatch Alpenglow + cool violet-indigo gully vertex coloring.
 */
export function buildHimalayanPeakGeometry(peakR, peakH, seedIdx = 0, snowLine = 0.44, radialSegs = 10, heightSegs = 5, layerTone = 'outer') {
  const cone = new THREE.ConeGeometry(peakR, peakH, radialSegs, heightSegs);
  const cPos = cone.attributes.position;
  const phase1 = seedIdx * 1.73;
  const phase2 = seedIdx * 2.91;

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const u = (vy + peakH * 0.5) / peakH; // 0 at base, 1 at summit

    if (u >= 0.98) {
      // Windswept asymmetric horn summit
      cPos.setXYZ(
        v,
        vx + Math.cos(phase1) * peakR * 0.08,
        vy,
        vz + Math.sin(phase2) * peakR * 0.08
      );
    } else if (u > 0.02) {
      // Integer angular frequencies keep UV seam vertices 100% watertight
      const theta = Math.atan2(vz, vx);
      const ridge5 = Math.cos(5 * theta + phase1);
      const gully3 = Math.sin(3 * theta - phase2);
      const terrace = Math.sin(u * Math.PI * 4 + seedIdx) * 0.06;
      const radialScale = 1.0 + (ridge5 * 0.16 + gully3 * 0.10 + terrace) * Math.sin(u * Math.PI * 0.92);
      const yLift = ridge5 * peakH * 0.035 * u * (1 - u);
      cPos.setXYZ(v, vx * radialScale, vy + yLift, vz * radialScale);
    }
  }

  cone.computeVertexNormals();
  const cNorm = cone.attributes.normal;
  const cCols = new Float32Array(cPos.count * 3);

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const ny = cNorm.getY(v);
    const u = THREE.MathUtils.clamp((vy + peakH * 0.5) / peakH, 0, 1);
    const theta = Math.atan2(vz, vx);
    const ridgeFactor = Math.cos(5 * theta + phase1);

    // Snow line dips into gullies and rises on sheer rock faces
    const localSnowLine = snowLine - ridgeFactor * 0.055 - Math.max(0, ny - 0.35) * 0.08;

    let r;
    let g;
    let b;
    if (layerTone === 'foothill') {
      // Foreground Firewatch dark pine-slate & warm sienna silhouette ridge
      const crestT = THREE.MathUtils.clamp(u * 0.85 + ridgeFactor * 0.12, 0, 1);
      r = THREE.MathUtils.lerp(0.18, 0.38, crestT);
      g = THREE.MathUtils.lerp(0.19, 0.31, crestT);
      b = THREE.MathUtils.lerp(0.26, 0.36, crestT);
    } else if (layerTone === 'midridge') {
      // Midground Firewatch terracotta-ochre & plum-rose layered ridge
      const crestT = THREE.MathUtils.clamp(u * 0.9 + ridgeFactor * 0.15, 0, 1);
      r = THREE.MathUtils.lerp(0.28, 0.64, crestT);
      g = THREE.MathUtils.lerp(0.22, 0.42, crestT);
      b = THREE.MathUtils.lerp(0.34, 0.48, crestT);
    } else if (u >= localSnowLine) {
      // Outer Himalayan snow peaks with coral-gold Alpenglow on sunlit ridges & cool violet-blue shadow gullies
      const snowT = THREE.MathUtils.clamp((u - localSnowLine) / Math.max(0.12, 1 - localSnowLine), 0, 1);
      const sunExpose = THREE.MathUtils.clamp(0.5 + ridgeFactor * 0.38 + ny * 0.25, 0, 1);
      const mixT = sunExpose * 0.72 + snowT * 0.28;
      r = THREE.MathUtils.lerp(0.72, 1.00, mixT);
      g = THREE.MathUtils.lerp(0.74, 0.93, mixT);
      b = THREE.MathUtils.lerp(0.92, 0.88, mixT);
    } else if (u >= localSnowLine - 0.14) {
      // Warm coral-terracotta & frost-streaked alpine scree transition zone
      const screeT = (u - (localSnowLine - 0.14)) / 0.14;
      r = THREE.MathUtils.lerp(0.36, 0.76, screeT);
      g = THREE.MathUtils.lerp(0.31, 0.68, screeT);
      b = THREE.MathUtils.lerp(0.44, 0.78, screeT);
    } else {
      // Deep Firewatch violet-slate & sienna lower cliffs
      const cliffShade = THREE.MathUtils.clamp(0.20 + u * 0.28 + ridgeFactor * 0.05, 0.16, 0.42);
      r = cliffShade * 1.02;
      g = cliffShade * 0.88;
      b = cliffShade * 1.18;
    }

    cCols[v * 3 + 0] = r;
    cCols[v * 3 + 1] = g;
    cCols[v * 3 + 2] = b;
  }

  cone.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
  return cone;
}

/**
 * Create a soft, rounded Japanese Yamato-e / Sansui mountain ridge geometry
 * (`京都東山三十六峰・高野山八葉蓮華・青緑山水`) with rolling domed crests, folded cedar
 * valleys, and layered jade-celadon to distant indigo-violet vertex shading.
 */
export function buildJapaneseRidgeGeometry(
  peakR,
  peakH,
  seedIdx = 0,
  radialSegs = 14,
  heightSegs = 6
) {
  const geo = new THREE.ConeGeometry(peakR, peakH, radialSegs, heightSegs);
  const cPos = geo.attributes.position;
  const phase1 = seedIdx * 1.37;
  const phase2 = seedIdx * 2.41;

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const u = THREE.MathUtils.clamp((vy + peakH * 0.5) / peakH, 0, 1);

    if (u >= 0.98) {
      // Soft rounded Higashiyama / Kōyasan dome crest instead of a sharp cone tip
      cPos.setXYZ(
        v,
        vx + Math.cos(phase1) * peakR * 0.05,
        vy - peakH * 0.14,
        vz + Math.sin(phase2) * peakR * 0.05
      );
    } else {
      const theta = Math.atan2(vz, vx);
      const fold3 = Math.cos(3 * theta + phase1);
      const fold2 = Math.sin(2 * theta - phase2);
      // Broaden upper shoulders into a gentle dome silhouette (`東山連峰`)
      const domeBulge = 1.0 + Math.sin(u * Math.PI) * 0.42 + u * 0.22;
      const radialScale =
        domeBulge * (1.0 + (fold3 * 0.12 + fold2 * 0.09) * Math.sin(u * Math.PI * 0.85));
      // Stretch tangentially so neighbouring hills interlock into continuous mountain ridges
      const ridgeStretchX = 1.28;
      const ridgeStretchZ = 0.86;
      const ySoft = vy - Math.pow(u, 2.2) * peakH * 0.12 + fold3 * peakH * 0.025 * u * (1 - u);
      cPos.setXYZ(
        v,
        vx * radialScale * ridgeStretchX,
        ySoft,
        vz * radialScale * ridgeStretchZ
      );
    }
  }

  geo.computeVertexNormals();
  const cNorm = geo.attributes.normal;
  const cCols = new Float32Array(cPos.count * 3);

  for (let v = 0; v < cPos.count; v++) {
    const vx = cPos.getX(v);
    const vy = cPos.getY(v);
    const vz = cPos.getZ(v);
    const ny = cNorm.getY(v);
    const u = THREE.MathUtils.clamp((vy + peakH * 0.5) / (peakH * 0.88), 0, 1);
    const theta = Math.atan2(vz, vx);
    const fold = Math.cos(3 * theta + phase1) * 0.5 + 0.5;
    const warmAccent = Math.sin(2 * theta - phase2 + seedIdx) * 0.5 + 0.5;

    // Yamato-e Sansui (`青緑山水`) 3-band gradation:
    //   Base: deep cedar pine (`千歳緑`, rgb(0.14, 0.25, 0.20))
    //   Mid-slope: lush bamboo jade with subtle sakura/maple brocade (`山藍・錦木`, rgb(0.22, 0.36, 0.30))
    //   Summit ridge: misty Ukiyo-e celadon-indigo (`遠山霞藍`, rgb(0.38, 0.49, 0.56))
    let r = THREE.MathUtils.lerp(0.14, 0.36, u);
    let g = THREE.MathUtils.lerp(0.25, 0.48, u);
    let b = THREE.MathUtils.lerp(0.20, 0.54, u);

    // Subtle sunlit ridge warmth (`金碧山水`) on upward/sun-facing folds
    const sunRim = THREE.MathUtils.clamp(fold * 0.45 + Math.max(0, ny) * 0.35, 0, 1);
    r += sunRim * (0.06 + warmAccent * 0.05);
    g += sunRim * 0.05;
    b += sunRim * 0.03;

    cCols[v * 3 + 0] = THREE.MathUtils.clamp(r, 0.10, 0.85);
    cCols[v * 3 + 1] = THREE.MathUtils.clamp(g, 0.16, 0.88);
    cCols[v * 3 + 2] = THREE.MathUtils.clamp(b, 0.16, 0.90);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
  return geo;
}

/**
 * Build a soft Valley Mist Ring + Diagonal Volumetric Sunbeam Planes (God Rays)
 * around the mountain rim perimeter (0 PointLights, 2 lightweight additive meshes).
 */
function buildAtmosphereMistAndSunbeams(origin, innerR) {
  const atmoGroup = new THREE.Group();
  atmoGroup.name = 'SeasonFirewatchAtmosphere';

  // 1. Valley Mist Ring around the base of the foothills
  const mistR = Math.max(68, innerR * 0.86);
  const mistH = 18;
  const mistGeo = new THREE.CylinderGeometry(mistR * 1.05, mistR * 0.90, mistH, 40, 4, true);
  const mPos = mistGeo.attributes.position;
  const mCols = new Float32Array(mPos.count * 3);
  for (let i = 0; i < mPos.count; i++) {
    const vy = mPos.getY(i);
    const vx = mPos.getX(i);
    const vz = mPos.getZ(i);
    const theta = Math.atan2(vz, vx);
    const vNorm = THREE.MathUtils.clamp((vy + mistH * 0.5) / mistH, 0, 1);
    // Smooth vertical bell curve (0 at bottom & top edges -> 0 hard seam)
    const bell = Math.sin(vNorm * Math.PI);
    const wave = 0.75 + 0.25 * Math.sin(theta * 5.0 + vNorm * 2.2);
    const intensity = bell * bell * wave * 0.22;
    mCols[i * 3 + 0] = intensity * 1.05;
    mCols[i * 3 + 1] = intensity * 0.76;
    mCols[i * 3 + 2] = intensity * 0.58;
  }
  mistGeo.setAttribute('color', new THREE.BufferAttribute(mCols, 3));
  const mistMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mistMesh = new THREE.Mesh(mistGeo, mistMat);
  mistMesh.position.set(origin.x, mistH * 0.36 - 1.5, origin.z);
  mistMesh.frustumCulled = false;
  atmoGroup.add(mistMesh);

  // 2. Diagonal Volumetric Sunbeam Planes (God Rays) slanting across the valley rim
  const beamGeos = [];
  const beamCount = 6;
  const beamDist = Math.max(55, innerR * 0.62);
  for (let b = 0; b < beamCount; b++) {
    const angle = -0.65 + (b / (beamCount - 1)) * 1.45;
    const beamW = 18 + (b % 3) * 5;
    const beamL = 68 + (b % 2) * 14;
    const plane = new THREE.PlaneGeometry(beamW, beamL, 2, 6);
    const pPos = plane.attributes.position;
    const pCols = new Float32Array(pPos.count * 3);
    for (let v = 0; v < pPos.count; v++) {
      const px = pPos.getX(v);
      const py = pPos.getY(v);
      const uX = 1.0 - Math.min(1, Math.abs(px) / (beamW * 0.5));
      const uY = THREE.MathUtils.clamp((py + beamL * 0.5) / beamL, 0, 1);
      // Fade to 0 at all 4 edges; brightest in upper-middle sun shaft
      const shaft = Math.sin(uY * Math.PI) * Math.pow(uY, 0.45) * (uX * uX);
      const val = shaft * 0.16;
      pCols[v * 3 + 0] = val * 1.12;
      pCols[v * 3 + 1] = val * 0.84;
      pCols[v * 3 + 2] = val * 0.48;
    }
    plane.setAttribute('color', new THREE.BufferAttribute(pCols, 3));
    plane.rotateZ(-0.36);
    plane.rotateY(angle + Math.PI * 0.25);
    plane.translate(
      origin.x + Math.cos(angle) * beamDist,
      beamL * 0.36,
      origin.z + Math.sin(angle) * beamDist
    );
    beamGeos.push(plane);
  }
  const beamsMesh = new THREE.Mesh(
    mergeGeometries(beamGeos, false),
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  beamsMesh.frustumCulled = false;
  atmoGroup.add(beamsMesh);

  return atmoGroup;
}

/**
 * Add a distant multi-layered ring of mountain peaks around `origin`.
 * Supports `style: 'himalayan'` (default 3-layer Firewatch & Himalayan Alpenglow peaks)
 * and `style: 'japanese'` (soft rounded Yamato-e / Higashiyama & Kōyasan mountain ridges with floating mist bands).
 */
export function addRimMountains(ctxOrGroup, groupOrOpts, maybeOpts = {}) {
  let group = groupOrOpts;
  let opts = maybeOpts;
  if (ctxOrGroup && typeof ctxOrGroup.add === 'function') {
    group = ctxOrGroup;
    opts = groupOrOpts || {};
  }
  const {
    origin = { x: 0, z: 0 },
    innerR = 125,
    outerR = 180,
    count = 24,
    heightRange = [38, 75],
    snowLine = 0.44,
    style = 'himalayan',
  } = opts || {};
  const mountainGeos = [];
  const minH = heightRange[0] ?? 38;
  const maxH = heightRange[1] ?? 75;
  const isJapanese = style === 'japanese';

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const dist = innerR + ((i * 37) % 19) * ((outerR - innerR) / 25);
    const px = origin.x + Math.cos(a) * dist;
    const pz = origin.z + Math.sin(a) * dist;
    const peakH = minH + ((i * 53) % 29) * ((maxH - minH) / 28);
    const peakR = (isJapanese ? 30 : 26) + ((i * 17) % 11) * 1.45;

    if (isJapanese) {
      // Primary soft rounded Japanese mountain ridge oriented tangentially to the basin rim
      const ridge = buildJapaneseRidgeGeometry(peakR, peakH * 0.78, i, 14, 6);
      ridge.rotateY(-a + Math.PI * 0.5 + ((i % 3) - 1) * 0.18);
      ridge.translate(px, peakH * 0.36 - 3.0, pz);
      mountainGeos.push(ridge);

      // Foreground overlapping foothill (`東山前山 / 高野山内八葉`)
      const spurAngle = a + (((i % 2 === 0) ? 1 : -1) * 0.085);
      const spurDist = Math.max(innerR - 10, dist - 12 + ((i * 11) % 7));
      const spurH = peakH * 0.48;
      const spurR = peakR * 0.78;
      const spur = buildJapaneseRidgeGeometry(spurR, spurH, i + 101, 12, 5);
      spur.rotateY(-spurAngle + Math.PI * 0.5);
      spur.translate(
        origin.x + Math.cos(spurAngle) * spurDist,
        spurH * 0.38 - 3.2,
        origin.z + Math.sin(spurAngle) * spurDist
      );
      mountainGeos.push(spur);
    } else {
      // Layer 3 (Outer): Primary towering Himalayan snow peak with coral-gold Alpenglow
      const cone = buildHimalayanPeakGeometry(peakR, peakH, i, snowLine, 10, 5, 'outer');
      cone.rotateY((i * 1.7) % (Math.PI * 2));
      cone.translate(px, peakH * 0.5 - 2, pz);
      mountainGeos.push(cone);

      // Layer 2 (Midground): Firewatch terracotta/plum flanking ridge spur
      const spurAngle = a + (((i % 2 === 0) ? 1 : -1) * (0.075 + ((i * 13) % 7) * 0.008));
      const spurDist = Math.max(innerR - 4, dist - 9 + ((i * 11) % 9));
      const spurH = peakH * (0.58 + ((i * 19) % 11) * 0.015);
      const spurR = peakR * 0.72;
      const spur = buildHimalayanPeakGeometry(spurR, spurH, i + 101, Math.min(0.82, snowLine + 0.08), 8, 4, 'midridge');
      spur.rotateY(((i + 5) * 2.1) % (Math.PI * 2));
      spur.translate(
        origin.x + Math.cos(spurAngle) * spurDist,
        spurH * 0.5 - 2.5,
        origin.z + Math.sin(spurAngle) * spurDist
      );
      mountainGeos.push(spur);

      // Layer 1 (Foreground): Continuous overlapping dark pine-slate Firewatch foothill silhouette ring
      const footAngle = a + (Math.PI / count);
      const footDist = Math.max(76, innerR - 12 + ((i * 7) % 7));
      const footH = Math.max(16, minH * (0.38 + ((i * 23) % 9) * 0.02));
      const footR = peakR * 0.78;
      const foothill = buildHimalayanPeakGeometry(footR, footH, i + 211, 0.95, 7, 3, 'foothill');
      foothill.rotateY(((i + 9) * 1.3) % (Math.PI * 2));
      foothill.translate(
        origin.x + Math.cos(footAngle) * footDist,
        footH * 0.5 - 3.0,
        origin.z + Math.sin(footAngle) * footDist
      );
      mountainGeos.push(foothill);
    }
  }

  if (mountainGeos.length && group) {
    const mMeshGeo = mergeGeometries(mountainGeos, false);
    const mMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: isJapanese ? 0.94 : 0.88,
      metalness: 0.02,
      ...(isJapanese
        ? {
            emissive: new THREE.Color(0x16262e),
            emissiveIntensity: 0.18,
          }
        : {}),
    });
    if (!isJapanese) {
      applySeasonFirewatchShader(mMat, {
        rimStrength: 0.52,
        fogRampStrength: 0.86,
        receiveValleyMist: true,
      });
    }
    const mMesh = new THREE.Mesh(mMeshGeo, mMat);
    mMesh.name = isJapanese ? 'japaneseRimMountains' : 'himalayanRimMountains';
    if (!isJapanese) {
      mMesh.add(buildAtmosphereMistAndSunbeams(origin, innerR));
    }
    group.add(mMesh);

    // For Japanese maps, add floating Yamato-e horizontal mist & golden cloud ribbons (`大和繪霞・金雲`)
    if (isJapanese) {
      const kasumiGeos = [];
      const kinunGeos = [];
      const cloudCount = 16;
      for (let c = 0; c < cloudCount; c++) {
        const ca = (c / cloudCount) * Math.PI * 2 + (c % 2) * 0.14;
        const cDist = innerR - 14 + (c % 3) * 8;
        const cx = origin.x + Math.cos(ca) * cDist;
        const cz = origin.z + Math.sin(ca) * cDist;
        const cy = 9.5 + (c % 4) * 3.8;
        const ribbonW = 28 + (c % 3) * 8;
        const ribbonH = 2.4 + (c % 2) * 0.9;

        const mistBand = new THREE.SphereGeometry(1, 10, 6);
        mistBand.scale(ribbonW * 0.5, ribbonH * 0.5, 4.2);
        mistBand.rotateY(-ca + Math.PI * 0.5);
        mistBand.translate(cx, cy, cz);
        if (c % 3 === 0) {
          kinunGeos.push(mistBand);
        } else {
          kasumiGeos.push(mistBand);
        }
      }

      if (kasumiGeos.length) {
        const kasumiMat = new THREE.MeshBasicMaterial({
          color: 0xfff5ee,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
        });
        const kasumiMesh = new THREE.Mesh(mergeGeometries(kasumiGeos, false), kasumiMat);
        kasumiMesh.name = 'yamatoKasumiMist';
        group.add(kasumiMesh);
      }
      if (kinunGeos.length) {
        const kinunMat = new THREE.MeshBasicMaterial({
          color: 0xfde68a,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const kinunMesh = new THREE.Mesh(mergeGeometries(kinunGeos, false), kinunMat);
        kinunMesh.name = 'yamatoKinunGoldClouds';
        group.add(kinunMesh);
      }
    }

    return mMesh;
  }
  return null;
}

/**
 * Append ornate traditional Tibetan gate arch geometries into the 5 material buckets:
 * `{ gPlaster, gMaroon, gWood, gTile, gGold }`.
 */
export function populateTibetanGateGeometries({
  gPlaster,
  gMaroon,
  gWood,
  gTile,
  gGold,
  gPillarX = 2.2,
  gPillarH = 3.4,
}) {
  // 1. Stepped stone threshold paving slab & border curbs on the ground
  const thresholdSlab = new THREE.BoxGeometry(5.6, 0.08, 1.38);
  thresholdSlab.translate(0, 0.04, 0);
  gPlaster.push(thresholdSlab);

  const thresholdStep = new THREE.BoxGeometry(3.5, 0.05, 1.66);
  thresholdStep.translate(0, 0.025, 0);
  gTile.push(thresholdStep);

  for (const s of [-1, 1]) {
    const px = s * gPillarX;

    // Stepped stone foundation plinth
    const lowerFoot = new THREE.BoxGeometry(1.04, 0.14, 1.04);
    lowerFoot.translate(px, 0.07, 0);
    gTile.push(lowerFoot);

    const base = new THREE.BoxGeometry(0.88, 0.45, 0.88);
    base.translate(px, 0.225, 0);
    gPlaster.push(base);

    const band = new THREE.BoxGeometry(0.82, 0.12, 0.82);
    band.translate(px, 0.51, 0);
    gMaroon.push(band);

    // Tapered whitewashed Tibetan pillar shaft
    const shaft = new THREE.BoxGeometry(0.68, gPillarH - 0.7, 0.68);
    shaft.translate(px, 0.57 + (gPillarH - 0.7) * 0.5, 0);
    gPlaster.push(shaft);

    // Timber niche & flanking mini prayer wheel (轉經筒) on inner pillar face
    const nicheFrame = new THREE.BoxGeometry(0.14, 0.56, 0.74);
    nicheFrame.translate(px - s * 0.31, 1.65, 0);
    gWood.push(nicheFrame);

    const pWheel = new THREE.CylinderGeometry(0.10, 0.10, 0.38, 10);
    pWheel.translate(px - s * 0.35, 1.65, 0);
    gGold.push(pWheel);

    const neck = new THREE.BoxGeometry(0.78, 0.14, 0.78);
    neck.translate(px, gPillarH - 0.07, 0);
    gMaroon.push(neck);

    const cap = new THREE.BoxGeometry(0.86, 0.12, 0.86);
    cap.translate(px, gPillarH + 0.06, 0);
    gGold.push(cap);

    // Carved Tibetan corbel brackets (雀替 / 弓木) supporting the lintel
    const corbelLower = new THREE.BoxGeometry(1.26, 0.14, 0.78);
    corbelLower.translate(px - s * 0.12, gPillarH - 0.18, 0);
    gWood.push(corbelLower);

    const corbelUpper = new THREE.BoxGeometry(1.62, 0.16, 0.84);
    corbelUpper.translate(px - s * 0.18, gPillarH + 0.14, 0);
    gWood.push(corbelUpper);
  }

  // Main timber lintel beam
  const gLintel = new THREE.BoxGeometry(5.6, 0.36, 0.76);
  gLintel.translate(0, gPillarH + 0.30, 0);
  gWood.push(gLintel);

  // Projecting Tibetan rafter tails (椽木) above the lintel
  for (let rIdx = -4; rIdx <= 4; rIdx++) {
    const rafter = new THREE.BoxGeometry(0.11, 0.09, 1.06);
    rafter.translate(rIdx * 0.58, gPillarH + 0.48, 0);
    gWood.push(rafter);
  }

  // Maroon Penma frieze band (邊瑪牆)
  const gBrackets = new THREE.BoxGeometry(5.8, 0.28, 0.92);
  gBrackets.translate(0, gPillarH + 0.62, 0);
  gMaroon.push(gBrackets);

  // Whitewashed cornice trim above Penma frieze
  const cornice = new THREE.BoxGeometry(6.0, 0.08, 1.02);
  cornice.translate(0, gPillarH + 0.78, 0);
  gPlaster.push(cornice);

  // Burnished golden mirror bosses (圓鏡銅飾) along the Penma frieze
  for (const bx of [-2.0, -1.15, 0, 1.15, 2.0]) {
    const boss = new THREE.CylinderGeometry(0.09, 0.09, 0.96, 10);
    boss.rotateX(Math.PI / 2);
    boss.translate(bx, gPillarH + 0.62, 0);
    gGold.push(boss);
  }

  // Inscription plaques on both faces (-Z and +Z)
  for (const faceZ of [-1, 1]) {
    const gPlaque = new THREE.BoxGeometry(2.4, 0.55, 0.10);
    gPlaque.translate(0, gPillarH + 0.30, faceZ * 0.41);
    gMaroon.push(gPlaque);

    const gPlaqueRim = new THREE.BoxGeometry(2.48, 0.62, 0.07);
    gPlaqueRim.translate(0, gPillarH + 0.30, faceZ * 0.39);
    gGold.push(gPlaqueRim);
  }

  // Multi-tier Tibetan roof slabs with upturned eaves & golden Makara tips
  const gRoof1 = new THREE.BoxGeometry(6.4, 0.20, 1.45);
  gRoof1.translate(0, gPillarH + 0.86, 0);
  gTile.push(gRoof1);

  const gRoof2 = new THREE.BoxGeometry(5.0, 0.28, 1.15);
  gRoof2.translate(0, gPillarH + 1.10, 0);
  gTile.push(gRoof2);

  for (const s of [-1, 1]) {
    // Upturned eaves on lower roof tier
    const eave1 = new THREE.BoxGeometry(0.52, 0.16, 1.50);
    eave1.rotateZ(s * 0.24);
    eave1.translate(s * 3.22, gPillarH + 0.93, 0);
    gTile.push(eave1);

    const makara1 = new THREE.BoxGeometry(0.18, 0.18, 0.22);
    makara1.translate(s * 3.42, gPillarH + 1.04, 0);
    gGold.push(makara1);

    // Upturned eaves on upper roof tier
    const eave2 = new THREE.BoxGeometry(0.44, 0.18, 1.20);
    eave2.rotateZ(s * 0.26);
    eave2.translate(s * 2.52, gPillarH + 1.18, 0);
    gTile.push(eave2);

    const makara2 = new THREE.BoxGeometry(0.16, 0.18, 0.20);
    makara2.translate(s * 2.68, gPillarH + 1.29, 0);
    gGold.push(makara2);

    // Flanking kneeling golden deer (法輪雙鹿)
    const dBody = new THREE.BoxGeometry(0.38, 0.24, 0.16);
    dBody.translate(s * 0.68, gPillarH + 1.36, 0);
    gGold.push(dBody);

    const dHead = new THREE.BoxGeometry(0.14, 0.22, 0.14);
    dHead.translate(s * 0.52, gPillarH + 1.54, 0);
    gGold.push(dHead);
  }

  // Central Dharma Wheel (法輪) & lotus pedestal
  const wheelPedestal = new THREE.BoxGeometry(0.54, 0.12, 0.24);
  wheelPedestal.translate(0, gPillarH + 1.28, 0);
  gGold.push(wheelPedestal);

  const gWheel = new THREE.CylinderGeometry(0.36, 0.36, 0.10, 16);
  gWheel.rotateX(Math.PI / 2);
  gWheel.translate(0, gPillarH + 1.58, 0);
  gGold.push(gWheel);

  const gWheelHub = new THREE.SphereGeometry(0.12, 10, 8);
  gWheelHub.translate(0, gPillarH + 1.58, 0);
  gGold.push(gWheelHub);
}

/**
 * Build a traditional Tibetan return gate mesh & pillar colliders at `(x, z)`.
 */
export function buildGateArch(ctx, group, {
  mapId = 'wild',
  x = 0,
  z = 0,
  y = 0,
} = {}) {
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xede6d8, roughness: 0.90 });
  const maroonMat = new THREE.MeshStandardMaterial({ color: 0x7c1e19, roughness: 0.72 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.80 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x48413b, roughness: 0.76 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5bf42, roughness: 0.28, metalness: 0.84 });

  const gateGroup = new THREE.Group();
  gateGroup.name = 'ReturnMountainGate';
  gateGroup.position.set(x, y, z);

  const gPlaster = [];
  const gMaroon = [];
  const gWood = [];
  const gTile = [];
  const gGold = [];

  const gPillarX = 2.2;
  const gPillarH = 3.4;

  populateTibetanGateGeometries({
    gPlaster,
    gMaroon,
    gWood,
    gTile,
    gGold,
    gPillarX,
    gPillarH,
  });

  for (const s of [-1, 1]) {
    pushCollider(ctx, mapId, {
      type: 'circle',
      x: x + s * gPillarX,
      z,
      r: 0.55,
    });
  }

  for (const [geos, mat, recv] of [
    [gPlaster, plasterMat, true],
    [gMaroon, maroonMat, true],
    [gWood, woodMat, true],
    [gTile, tileMat, true],
    [gGold, goldMat, false],
  ]) {
    if (geos.length) {
      const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
      m.castShadow = true;
      m.receiveShadow = recv;
      gateGroup.add(m);
    }
  }

  if (group) group.add(gateGroup);
  return gateGroup;
}
