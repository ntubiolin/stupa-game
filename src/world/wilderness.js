import { MIGOI_ARENA_RADIUS } from '../data/combatSettings.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createGroundDetailTexture,
  buildHimalayanPeakGeometry,
  populateTibetanGateGeometries,
} from './mapBase.js';

/**
 * Deterministic height function for the highland wilderness.
 * Keeps gate, spawn, chorten, and mani stones cleanly flat at y = 0,
 * while creating natural rolling alpine terrain that rises into foothills.
 */
export function computeWildernessHeight(x, z, wildConfig) {
  const origin = wildConfig.origin || { x: 1000, z: 0 };
  const dx = x - origin.x;
  const dz = z - origin.z;
  const r = Math.hypot(dx, dz);

  const t = wildConfig.terrain || {};
  const w1 = Math.sin(dx * (t.wave1FreqX || 0.052) + 1.2) * Math.cos(dz * (t.wave1FreqZ || 0.048) - 0.7) * (t.wave1Amp || 2.2);
  const w2 = Math.sin(dx * (t.wave2FreqX || 0.11) - dz * (t.wave2FreqZ || 0.08) + 2.3) * (t.wave2Amp || 1.1);
  const w3 = Math.cos(dx * (t.wave3FreqX || 0.025) + dz * (t.wave3FreqZ || 0.035)) * (t.wave3Amp || 1.5);
  let h = w1 + w2 + w3;

  // Flatten factor around key structures
  let flatWeight = 1.0;

  // 1. South gate & safe zone around (1000, 60)
  const gateX = wildConfig.wildGate.x;
  const gateZ = wildConfig.wildGate.z;
  const dGate = Math.hypot(x - gateX, z - (gateZ - 3));
  if (dGate < 14) {
    flatWeight = Math.min(flatWeight, Math.max(0, (dGate - 4) / 10));
  }

  // 2. Chorten at center (1000, 0)
  const dChorten = r;
  if (dChorten < 8) {
    flatWeight = Math.min(flatWeight, Math.max(0, (dChorten - 2.5) / 5.5));
  }

  // 3. Mani stones
  const maniList = wildConfig.maniStones || [];
  for (let i = 0; i < maniList.length; i++) {
    const ms = maniList[i];
    const dMani = Math.hypot(x - ms.x, z - ms.z);
    if (dMani < 9) {
      flatWeight = Math.min(flatWeight, Math.max(0, (dMani - 3) / 6));
    }
  }

  // 4. Northern Boss Arena around (1000, -48)
  const dBossArena = Math.hypot(x - origin.x, z - (origin.z - 48));
  if (dBossArena < MIGOI_ARENA_RADIUS + 4) {
    flatWeight = Math.min(flatWeight, Math.max(0, (dBossArena - (MIGOI_ARENA_RADIUS + 0.5)) / 3.5));
  }

  // Outer rim rises into surrounding foothills
  const rimR = t.rimRadius || 58;
  if (r > rimR) {
    const rim = (r - rimR) / 28;
    h += rim * rim * (t.rimAmp || 14);
  }

  const smoothFlat = flatWeight * flatWeight * (3 - 2 * flatWeight);
  h *= smoothFlat;

  return h;
}

/**
 * Deterministic pseudo-random number generator with fixed seed.
 */
function createSeededRng(seed = 12345) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let _wildSunbeamTex = null;
function getWildSunbeamTexture() {
  if (_wildSunbeamTex) return _wildSunbeamTex;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (!g) return null;

  g.clearRect(0, 0, 128, 256);
  // Soft vertical + horizontal gaussian-like sunbeam shaft gradient
  for (let y = 0; y < 256; y++) {
    const v = y / 255;
    // Fade smoothly at top sky origin and bottom ground contact
    const vAlpha = Math.sin(v * Math.PI) * (1.0 - v * 0.35);
    const rowGrad = g.createLinearGradient(0, y, 128, y);
    rowGrad.addColorStop(0.0, 'rgba(255, 224, 150, 0.0)');
    rowGrad.addColorStop(0.25, `rgba(255, 214, 130, ${(vAlpha * 0.45).toFixed(4)})`);
    rowGrad.addColorStop(0.5, `rgba(255, 240, 190, ${(vAlpha * 0.92).toFixed(4)})`);
    rowGrad.addColorStop(0.75, `rgba(255, 214, 130, ${(vAlpha * 0.45).toFixed(4)})`);
    rowGrad.addColorStop(1.0, 'rgba(255, 224, 150, 0.0)');
    g.fillStyle = rowGrad;
    g.fillRect(0, y, 128, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  _wildSunbeamTex = tex;
  return tex;
}

/**
 * Attach a hemisphere-friendly SEASON x Firewatch shader grade to a StandardMaterial
 * so terrain and crag boulders retain warm amber highlights and lavender-indigo shadow lift at dusk.
 * Preserves `#include <color_fragment>` so downstream cinematicArt hooks chain cleanly.
 */
function applySteppeSunsetGrade(material, {
  shadowFloor = [0.17, 0.14, 0.16],
  warmTint = [1.06, 1.02, 0.95],
  cacheTag = 'wild-sunset-grade',
} = {}) {
  if (!material) return;
  const prevCompile = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey() : '';
  const [sr, sg, sb] = shadowFloor;
  const [wr, wg, wb] = warmTint;
  material.onBeforeCompile = function (shader, renderer) {
    if (typeof prevCompile === 'function') {
      prevCompile.call(this, shader, renderer);
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `
      #include <color_fragment>
      diffuseColor.rgb = max(diffuseColor.rgb, vec3(${sr.toFixed(3)}, ${sg.toFixed(3)}, ${sb.toFixed(3)}));
      diffuseColor.rgb *= vec3(${wr.toFixed(3)}, ${wg.toFixed(3)}, ${wb.toFixed(3)});
      `,
    );
  };
  material.customProgramCacheKey = () => `${prevKey}|${cacheTag}`;
  material.needsUpdate = true;
}

export function createWilderness(ctx) {
  const { scene, state, config, colliders, bus } = ctx;
  const W = config.WILD;
  const origin = W.origin;
  const mapId = W.mapId || 'wild';

  const group = new THREE.Group();
  group.name = 'Wilderness';
  (ctx.zoneGroups?.[mapId] || ctx.wildGroup || scene).add(group);

  const getHeight = (x, z) => computeWildernessHeight(x, z, W);

  // ---------------------------------------------------------------- 1. Materials
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xf2eadc, roughness: 0.88, emissive: 0x261d14, emissiveIntensity: 0.12 });
  const maroonMat = new THREE.MeshStandardMaterial({ color: 0x85221c, roughness: 0.70, emissive: 0x240907, emissiveIntensity: 0.12 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x452819, roughness: 0.80 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x524942, roughness: 0.76 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf7c648, roughness: 0.26, metalness: 0.84, emissive: 0x4a3008, emissiveIntensity: 0.20 });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x6b6468, roughness: 0.84, metalness: 0.05, emissive: 0x1d1822, emissiveIntensity: 0.12 });
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x8a7e76,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.05,
    emissive: 0x241d29,
    emissiveIntensity: 0.16,
  });
  applySteppeSunsetGrade(rockMat, {
    shadowFloor: [0.20, 0.17, 0.21],
    warmTint: [1.05, 1.01, 0.97],
    cacheTag: 'wild-rock-sunset',
  });

  // Helper for the gentle S-curve of the pilgrimage path from South Gate (z=60) to Boss Arena (z=-48)
  const getPathCenterX = (lz) => Math.sin(lz * 0.085) * 1.15 * Math.min(1, Math.abs(lz) / 8);

  // ---------------------------------------------------------------- 2. Subdivided Highland Steppe Terrain
  const tCfg = W.terrain || { size: 180, segments: 96 };
  const terrainGeo = new THREE.PlaneGeometry(tCfg.size, tCfg.size, tCfg.segments, tCfg.segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;
  const colorAttr = new Float32Array(vertexCount * 3);

  // SEASON x Firewatch palette colors for Kathmandu-Helambu Highland Steppe
  const grassCol = new THREE.Color(0xb89648);  // warm golden-ochre alpine meadow
  const scrubCol = new THREE.Color(0x9e8244);  // sunlit amber steppe tussock
  const screeCol = new THREE.Color(0xa86b4c);  // Firewatch terracotta scree & warm earth
  const slateCol = new THREE.Color(0x756d78);  // lavender-slate mountain shadow stone
  const snowCol = new THREE.Color(0xf0e9f2);   // alpenglow-kissed perimeter frost/snow
  const trailCol = new THREE.Color(0xc4ae88);  // warm sunlit sandstone pilgrimage trail
  const arenaCol = new THREE.Color(0x96a8ba);  // frost-rimmed glacial stone arena

  for (let i = 0; i < vertexCount; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wx = lx + origin.x;
    const wz = lz + origin.z;
    const y = getHeight(wx, wz);
    posAttr.setY(i, y);

    const r = Math.hypot(lx, lz);
    const c = new THREE.Color();
    const noise = Math.sin(wx * 0.12) * Math.cos(wz * 0.14) * 0.5 + 0.5;
    const micro = Math.sin(wx * 0.37 - wz * 0.31) * 0.5 + 0.5;
    const strata = Math.sin(y * 2.8 + wx * 0.07 - wz * 0.06) * 0.5 + 0.5;

    if (y > 7.5) {
      c.lerpColors(slateCol, snowCol, Math.min(1, (y - 7.5) / 7.5));
      if (strata > 0.55) {
        c.lerp(screeCol, 0.18 * (strata - 0.55));
      }
    } else if (y > 2.8) {
      const slopeT = Math.min(1, (y - 2.8) / 4.7);
      c.lerpColors(scrubCol, screeCol, Math.min(1, slopeT * 1.35));
      c.lerp(slateCol, slopeT * 0.62 + (1 - strata) * 0.16);
    } else {
      c.lerpColors(grassCol, scrubCol, noise * 0.72 + micro * 0.28);
      if (micro > 0.64) {
        // Painterly terracotta scree & warm amber patches across the steppe
        c.lerp(screeCol, (micro - 0.64) * 0.55);
      }
      if (noise < 0.28) {
        // Subtle lavender-slate shadow dips in hollows
        c.lerp(slateCol, (0.28 - noise) * 0.42);
      }
      if (r < 10.5) {
        // Warm sunlit Kora plaza tone around central Chorten
        c.lerp(trailCol, 0.56 * (1 - r / 10.5));
      }
      // Sunlit amber pilgrimage path corridor from South Gate to Northern Boss Arena
      if (lz >= -32 && lz <= 60) {
        const dPath = Math.abs(lx - getPathCenterX(lz));
        if (dPath < 3.4) {
          c.lerp(trailCol, (1 - dPath / 3.4) * 0.52);
        }
      }
      // Frost-rimmed glacial stone tone inside & around the Northern Migoi Boss Arena
      const dArena = Math.hypot(lx, lz + 48);
      if (dArena < MIGOI_ARENA_RADIUS + 4) {
        const arenaT = 1 - dArena / (MIGOI_ARENA_RADIUS + 4);
        c.lerp(arenaCol, 0.48 * arenaT);
        if (Math.abs(dArena - (MIGOI_ARENA_RADIUS - 0.5)) < 2.2) {
          c.lerp(snowCol, 0.38);
        }
      }
    }

    colorAttr[i * 3 + 0] = c.r;
    colorAttr[i * 3 + 1] = c.g;
    colorAttr[i * 3 + 2] = c.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  terrainGeo.computeVertexNormals();

  const detailTex = createGroundDetailTexture(4109);
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    emissive: 0x2c2014,
    emissiveIntensity: 0.18,
    ...(detailTex ? { map: detailTex, bumpMap: detailTex, bumpScale: 0.06 } : {}),
  });
  applySteppeSunsetGrade(terrainMat, {
    shadowFloor: [0.19, 0.15, 0.16],
    warmTint: [1.08, 1.03, 0.94],
    cacheTag: 'wild-terrain-sunset',
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(origin.x, 0, origin.z);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // ---------------------------------------------------------------- 3. 4-Layer Firewatch Mountain Silhouettes, Alpenglow & Valley Mist Ring
  const mCfg = W.mountains || { count: 24, innerRadius: 125, outerRadius: 180, minHeight: 38, maxHeight: 75 };
  const mountainGeos = [];
  const mPeaks = mCfg.count;

  // Helper to re-grade a peak geometry with Firewatch sienna foothills or Himalayan coral-gold Alpenglow + violet-indigo shadows
  const tintMountainLayer = (geo, peakH, layerType, angleAroundOrigin) => {
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const col = geo.attributes.color;
    if (!pos || !col) return geo;

    // Sunset light comes from west-southwest
    const sunDirX = -0.68;
    const sunDirZ = 0.52;

    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v);
      const vz = pos.getZ(v);
      const nx = norm ? norm.getX(v) : 0;
      const ny = norm ? norm.getY(v) : 0.5;
      const nz = norm ? norm.getZ(v) : 0;
      const u = THREE.MathUtils.clamp((vy + peakH * 0.5) / peakH, 0, 1);
      const sunDot = THREE.MathUtils.clamp(nx * sunDirX + nz * sunDirZ + ny * 0.35, -1, 1) * 0.5 + 0.5;

      let r = col.getX(v);
      let g = col.getY(v);
      let b = col.getZ(v);

      if (layerType === 'foothill') {
        // Layer 1: Warm Firewatch burnt-sienna / amber foothills with deep plum-indigo base
        const baseR = 0.31;
        const baseG = 0.23;
        const baseB = 0.32;
        const crestR = THREE.MathUtils.lerp(0.68, 0.84, sunDot);
        const crestG = THREE.MathUtils.lerp(0.41, 0.56, sunDot);
        const crestB = THREE.MathUtils.lerp(0.32, 0.38, sunDot);
        const ridgeT = Math.pow(u, 0.85);
        r = THREE.MathUtils.lerp(baseR, crestR, ridgeT);
        g = THREE.MathUtils.lerp(baseG, crestG, ridgeT);
        b = THREE.MathUtils.lerp(baseB, crestB, ridgeT);
      } else {
        // Layers 2 & 3: Himalayan peaks with coral-gold Alpenglow snow faces & deep violet-indigo shadowed flanks
        const isFar = layerType === 'far';
        const snowStart = isFar ? 0.36 : 0.44;
        if (u >= snowStart) {
          const snowT = THREE.MathUtils.clamp((u - snowStart) / (1 - snowStart), 0, 1);
          const alpenMix = THREE.MathUtils.clamp(sunDot * 0.75 + snowT * 0.35, 0, 1);
          // Shadowed violet-blue snow -> sunlit coral-gold Alpenglow
          r = THREE.MathUtils.lerp(0.58, 1.00, alpenMix);
          g = THREE.MathUtils.lerp(0.54, 0.82, alpenMix);
          b = THREE.MathUtils.lerp(0.74, 0.66, alpenMix);
        } else {
          // Deep violet-indigo flanks with warm sienna scree transition
          const flankT = u / snowStart;
          const shadowR = isFar ? 0.25 : 0.23;
          const shadowG = isFar ? 0.20 : 0.19;
          const shadowB = isFar ? 0.38 : 0.34;
          const screeR = THREE.MathUtils.lerp(0.46, 0.72, sunDot);
          const screeG = THREE.MathUtils.lerp(0.36, 0.50, sunDot);
          const screeB = THREE.MathUtils.lerp(0.48, 0.46, sunDot);
          r = THREE.MathUtils.lerp(shadowR, screeR, Math.pow(flankT, 1.15));
          g = THREE.MathUtils.lerp(shadowG, screeG, Math.pow(flankT, 1.15));
          b = THREE.MathUtils.lerp(shadowB, screeB, Math.pow(flankT, 1.15));
        }
        // Subtle atmospheric perspective haze on far layer
        if (isFar) {
          const hazeMix = 0.22 + 0.12 * Math.sin(angleAroundOrigin);
          r = THREE.MathUtils.lerp(r, 0.78, hazeMix);
          g = THREE.MathUtils.lerp(g, 0.62, hazeMix);
          b = THREE.MathUtils.lerp(b, 0.68, hazeMix);
        }
      }

      col.setXYZ(v, r, g, b);
    }
    col.needsUpdate = true;
    return geo;
  };

  // Layer 1: Foreground/Midground connected Firewatch warm sienna/amber foothills ring (r = 92..118m)
  const foothillCount = 28;
  for (let i = 0; i < foothillCount; i++) {
    const a = (i / foothillCount) * Math.PI * 2;
    const dist = 92 + ((i * 29) % 14) * 1.85;
    const fx = origin.x + Math.cos(a) * dist;
    const fz = origin.z + Math.sin(a) * dist;
    const fH = 16 + ((i * 41) % 15) * 1.05;
    const fR = 17 + ((i * 19) % 9) * 1.15;
    const foothill = buildHimalayanPeakGeometry(fR, fH, i + 301, 0.88, 8, 4);
    foothill.rotateY((i * 1.3) % (Math.PI * 2));
    tintMountainLayer(foothill, fH, 'foothill', a);
    foothill.translate(fx, fH * 0.5 - 2.5, fz);
    mountainGeos.push(foothill);
  }

  // Layer 2 & 3: Main Himalayan peaks & flanking spurs (r = 125..180m) + Far Alpenglow giants (r = 188..232m)
  for (let i = 0; i < mPeaks; i++) {
    const a = (i / mPeaks) * Math.PI * 2;
    const dist = mCfg.innerRadius + ((i * 37) % 19) * 2.2;
    const px = origin.x + Math.cos(a) * dist;
    const pz = origin.z + Math.sin(a) * dist;
    const peakH = mCfg.minHeight + ((i * 53) % 29) * 1.35;
    const peakR = 24 + ((i * 17) % 11) * 1.4;

    // Primary faceted Himalayan peak with Alpenglow
    const cone = buildHimalayanPeakGeometry(peakR, peakH, i, 0.44, 10, 5);
    cone.rotateY((i * 1.7) % (Math.PI * 2));
    tintMountainLayer(cone, peakH, 'main', a);
    cone.translate(px, peakH * 0.5 - 2, pz);
    mountainGeos.push(cone);

    // Secondary flanking spur / foothill ridge
    const spurAngle = a + (((i % 2 === 0) ? 1 : -1) * (0.075 + ((i * 13) % 7) * 0.008));
    const spurDist = Math.max(mCfg.innerRadius - 6, dist - 7 + ((i * 11) % 9));
    const spurH = peakH * (0.54 + ((i * 19) % 11) * 0.015);
    const spurR = peakR * 0.66;
    const spur = buildHimalayanPeakGeometry(spurR, spurH, i + 101, 0.52, 8, 4);
    spur.rotateY(((i + 5) * 2.1) % (Math.PI * 2));
    tintMountainLayer(spur, spurH, 'main', spurAngle);
    spur.translate(
      origin.x + Math.cos(spurAngle) * spurDist,
      spurH * 0.5 - 2.5,
      origin.z + Math.sin(spurAngle) * spurDist
    );
    mountainGeos.push(spur);

    // Outer Layer 3: Towering distant Himalayan Alpenglow horizon silhouette every second sector
    if (i % 2 === 0) {
      const farAngle = a + 0.11;
      const farDist = 192 + ((i * 23) % 17) * 2.3;
      const farH = 64 + ((i * 31) % 21) * 1.95;
      const farR = 32 + ((i * 13) % 9) * 1.8;
      const farPeak = buildHimalayanPeakGeometry(farR, farH, i + 501, 0.36, 9, 4);
      farPeak.rotateY((i * 2.4) % (Math.PI * 2));
      tintMountainLayer(farPeak, farH, 'far', farAngle);
      farPeak.translate(
        origin.x + Math.cos(farAngle) * farDist,
        farH * 0.5 - 4.0,
        origin.z + Math.sin(farAngle) * farDist
      );
      mountainGeos.push(farPeak);
    }
  }

  if (mountainGeos.length) {
    const mMeshGeo = mergeGeometries(mountainGeos, false);
    const mMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.90,
      metalness: 0.03,
      emissive: 0x261a2b,
      emissiveIntensity: 0.22,
    });
    const mMesh = new THREE.Mesh(mMeshGeo, mMat);
    mMesh.name = 'WildernessMountainSilhouettes';
    group.add(mMesh);
  }

  // Layer 4: Soft Valley Mist Ring hovering around the outer foothill base (r = 85..135m) & Northern Chasm / Migoi Boss Arena (z = -48)
  const mistGroup = new THREE.Group();
  mistGroup.name = 'WildernessValleyMist';
  const foothillMistGeo = new THREE.RingGeometry(85, 135, 64);
  foothillMistGeo.rotateX(-Math.PI / 2);
  const foothillMistMat = new THREE.MeshBasicMaterial({
    color: 0xd9b3a6,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const foothillMistMesh = new THREE.Mesh(foothillMistGeo, foothillMistMat);
  foothillMistMesh.position.set(origin.x, 2.35, origin.z);
  mistGroup.add(foothillMistMesh);

  const upperMistVeilGeo = new THREE.CylinderGeometry(118, 96, 6.5, 48, 1, true);
  const upperMistVeilMat = new THREE.MeshBasicMaterial({
    color: 0xc8a4b8,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const upperMistVeilMesh = new THREE.Mesh(upperMistVeilGeo, upperMistVeilMat);
  upperMistVeilMesh.position.set(origin.x, 5.2, origin.z);
  mistGroup.add(upperMistVeilMesh);

  // Northern Cliff / Migoi Boss Arena chasm mist ring at (origin.x, origin.z - 48)
  const chasmMistGeo = new THREE.RingGeometry(MIGOI_ARENA_RADIUS + 0.8, MIGOI_ARENA_RADIUS + 18.0, 48);
  chasmMistGeo.rotateX(-Math.PI / 2);
  const chasmMistMat = new THREE.MeshBasicMaterial({
    color: 0xc9d6e8,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const chasmMistMesh = new THREE.Mesh(chasmMistGeo, chasmMistMat);
  chasmMistMesh.position.set(origin.x, getHeight(origin.x, origin.z - 48) + 0.42, origin.z - 48);
  mistGroup.add(chasmMistMesh);
  group.add(mistGroup);

  // ---------------------------------------------------------------- 4. Return Mountain Gate (返回佛塔山門)
  const gateX = W.wildGate.x;
  const gateZ = W.wildGate.z;
  const gateY = getHeight(gateX, gateZ);

  const wildGateGroup = new THREE.Group();
  wildGateGroup.name = 'ReturnMountainGate';
  wildGateGroup.position.set(gateX, gateY, gateZ);

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
    // Colliders for the two wild gate pillars
    colliders.push({
      type: 'circle',
      x: gateX + s * gPillarX,
      z: gateZ,
      r: 0.55,
      zone: mapId,
    });
  }

  if (gPlaster.length) {
    const m = new THREE.Mesh(mergeGeometries(gPlaster, false), plasterMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gMaroon.length) {
    const m = new THREE.Mesh(mergeGeometries(gMaroon, false), maroonMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gWood.length) {
    const m = new THREE.Mesh(mergeGeometries(gWood, false), woodMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gTile.length) {
    const m = new THREE.Mesh(mergeGeometries(gTile, false), tileMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gGold.length) {
    const m = new THREE.Mesh(mergeGeometries(gGold, false), goldMat);
    m.castShadow = true;
    wildGateGroup.add(m);
  }

  group.add(wildGateGroup);

  // ---------------------------------------------------------------- 5. Small Tibetan Chorten (小佛塔)
  const chortenX = W.chorten?.x ?? 1000;
  const chortenZ = W.chorten?.z ?? 0;
  const chortenY = getHeight(chortenX, chortenZ);

  const chortenGroup = new THREE.Group();
  chortenGroup.name = 'TibetanChorten';
  chortenGroup.position.set(chortenX, chortenY, chortenZ);

  const chPlaster = [];
  const chMaroon = [];
  const chGold = [];

  // Three square stepped plinths
  const plinth1 = new THREE.BoxGeometry(3.6, 0.45, 3.6);
  plinth1.translate(0, 0.225, 0);
  chPlaster.push(plinth1);

  const plinth2 = new THREE.BoxGeometry(3.0, 0.38, 3.0);
  plinth2.translate(0, 0.64, 0);
  chPlaster.push(plinth2);

  const plinth3 = new THREE.BoxGeometry(2.4, 0.32, 2.4);
  plinth3.translate(0, 0.99, 0);
  chPlaster.push(plinth3);

  // Maroon trim band between plinth and dome
  const domeBase = new THREE.CylinderGeometry(1.22, 1.34, 0.22, 16);
  domeBase.translate(0, 1.26, 0);
  chMaroon.push(domeBase);

  // Rounded whitewashed dome (Bumba)
  const dome = new THREE.SphereGeometry(1.15, 18, 14);
  dome.scale(1.08, 0.92, 1.08);
  dome.translate(0, 2.15, 0);
  chPlaster.push(dome);

  // Harmika cube
  const harmika = new THREE.BoxGeometry(0.85, 0.65, 0.85);
  harmika.translate(0, 3.12, 0);
  chPlaster.push(harmika);

  const harmikaTrim = new THREE.BoxGeometry(0.92, 0.12, 0.92);
  harmikaTrim.translate(0, 3.48, 0);
  chGold.push(harmikaTrim);

  // 13-tier conical spire
  const spire = new THREE.ConeGeometry(0.55, 1.85, 14);
  spire.translate(0, 4.45, 0);
  chGold.push(spire);

  // Golden umbrella (chhatra) & pinnacle drop
  const umbrella = new THREE.CylinderGeometry(0.68, 0.45, 0.14, 14);
  umbrella.translate(0, 5.42, 0);
  chGold.push(umbrella);

  const finial = new THREE.SphereGeometry(0.16, 10, 8);
  finial.scale(0.8, 1.5, 0.8);
  finial.translate(0, 5.75, 0);
  chGold.push(finial);

  if (chPlaster.length) {
    const m = new THREE.Mesh(mergeGeometries(chPlaster, false), plasterMat);
    m.castShadow = true;
    m.receiveShadow = true;
    chortenGroup.add(m);
  }
  if (chMaroon.length) {
    const m = new THREE.Mesh(mergeGeometries(chMaroon, false), maroonMat);
    m.castShadow = true;
    m.receiveShadow = true;
    chortenGroup.add(m);
  }
  if (chGold.length) {
    const m = new THREE.Mesh(mergeGeometries(chGold, false), goldMat);
    m.castShadow = true;
    chortenGroup.add(m);
  }

  colliders.push({
    type: 'circle',
    x: chortenX,
    z: chortenZ,
    r: W.chorten?.colliderRadius || 1.8,
    zone: mapId,
  });

  group.add(chortenGroup);

  // ---------------------------------------------------------------- 6. Mani Stone Mounds (3 stations)
  const maniPoles = [];
  const maniStonesData = [];
  const maniList = W.maniStones || [];

  const maniSlateGeos = [];
  const maniWoodGeos = [];
  const maniGoldGeos = [];

  for (let mIdx = 0; mIdx < maniList.length; mIdx++) {
    const ms = maniList[mIdx];
    const my = getHeight(ms.x, ms.z);
    const mPos = new THREE.Vector3(ms.x, my, ms.z);
    maniStonesData.push({
      x: ms.x,
      z: ms.z,
      radius: ms.radius || 4,
      position: mPos,
    });

    // Collider for the solid stone cairn center
    colliders.push({
      type: 'circle',
      x: ms.x,
      z: ms.z,
      r: 1.6,
      zone: mapId,
    });

    // Procedural stack of 12 carved slate slabs forming a cairn
    for (let s = 0; s < 14; s++) {
      const u = s / 13;
      const slabW = 1.6 - u * 0.9 + ((s * 7) % 5) * 0.08;
      const slabD = 1.3 - u * 0.7 + ((s * 11) % 4) * 0.06;
      const slabH = 0.12 + ((s * 3) % 4) * 0.03;
      const slabY = my + s * 0.11;

      const slab = new THREE.BoxGeometry(slabW, slabH, slabD);
      const angle = ((s * 2.3) % (Math.PI * 2));
      slab.rotateY(angle);
      slab.translate(
        ms.x + Math.sin(s * 1.7) * 0.15,
        slabY + slabH * 0.5,
        ms.z + Math.cos(s * 1.7) * 0.15
      );
      maniSlateGeos.push(slab);
    }

    // Leaning carved mantra tablets around the cairn
    for (let t = 0; t < 5; t++) {
      const ta = (t / 5) * Math.PI * 2 + 0.3;
      const tablet = new THREE.BoxGeometry(0.55, 0.42, 0.08);
      tablet.rotateX(0.24);
      tablet.rotateY(ta);
      tablet.translate(
        ms.x + Math.cos(ta) * 0.95,
        my + 0.22,
        ms.z + Math.sin(ta) * 0.95
      );
      maniSlateGeos.push(tablet);
    }

    // Central tall wooden prayer flag pole (Darchor)
    const poleH = 7.0;
    const mast = new THREE.CylinderGeometry(0.06, 0.12, poleH, 8);
    mast.translate(ms.x, my + poleH * 0.5, ms.z);
    maniWoodGeos.push(mast);

    const poleTop = new THREE.ConeGeometry(0.14, 0.48, 8);
    poleTop.translate(ms.x, my + poleH + 0.24, ms.z);
    maniGoldGeos.push(poleTop);

    maniPoles.push(new THREE.Vector3(ms.x, my + poleH, ms.z));
  }

  // Tilted Mani stone cairn beside the Ancient Pilgrim's Map spot at (origin.x + 8, origin.z - 12)
  {
    const tx = origin.x + 9.15;
    const tz = origin.z - 12.65;
    const ty = getHeight(tx, tz);
    for (let s = 0; s < 10; s++) {
      const u = s / 9;
      const slabW = 1.15 - u * 0.62;
      const slabD = 0.95 - u * 0.5;
      const slabH = 0.11;
      const slab = new THREE.BoxGeometry(slabW, slabH, slabD);
      slab.rotateZ(-0.18); // Tilted cairn
      slab.rotateY(s * 1.1);
      slab.translate(
        tx - s * 0.03,
        ty + s * 0.095 + slabH * 0.5,
        tz + s * 0.015
      );
      maniSlateGeos.push(slab);
    }
    const tiltedPole = new THREE.CylinderGeometry(0.04, 0.08, 3.2, 7);
    tiltedPole.rotateZ(-0.26);
    tiltedPole.translate(tx - 0.35, ty + 1.45, tz);
    maniWoodGeos.push(tiltedPole);
  }

  // 6b. Subtle golden/turquoise glowing aura ring on each Mani stone mound (no PointLight)
  const maniAuras = [];
  const auraRingGeo = new THREE.RingGeometry(1.5, 3.6, 32);
  auraRingGeo.rotateX(-Math.PI / 2);

  for (let mIdx = 0; mIdx < maniList.length; mIdx++) {
    const ms = maniList[mIdx];
    const my = getHeight(ms.x, ms.z);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x4eedc2, // turquoise-gold glow
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const auraMesh = new THREE.Mesh(auraRingGeo, auraMat);
    auraMesh.position.set(ms.x, my + 0.04, ms.z);
    group.add(auraMesh);

    maniAuras.push({
      mesh: auraMesh,
      mat: auraMat,
      x: ms.x,
      z: ms.z,
    });
  }

  let maniTimer = 0;

  // ---------------------------------------------------------------- 7. Procedural Highland Boulders (18–25 stratified crag clusters)
  const bCfg = W.boulders || { count: 22, minRadius: 1.1, maxRadius: 2.3 };
  const boulderGeos = [];
  const rng = createSeededRng(7789);
  const placedBoulders = [];

  // Helper to shade a rock geometry with SEASON x Firewatch warm ochre strata, lavender-slate shadows & alpenglow frost crest
  const applyCragVertexColors = (geo, tint = 1.0, frostBoost = 0.0) => {
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const cols = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v);
      const vz = pos.getZ(v);
      const nx = norm.getX(v);
      const ny = norm.getY(v);
      const nz = norm.getZ(v);
      const strata = Math.sin(vy * 8.5 + vx * 2.1 - vz * 1.7) * 0.055;
      const sunExpose = THREE.MathUtils.clamp((-nx * 0.65 + nz * 0.45 + ny * 0.35) * 0.5 + 0.5, 0, 1);
      // Blend lavender-slate shadow side with warm golden-sienna sunlit face
      let r = (THREE.MathUtils.lerp(0.62, 0.88, sunExpose) + strata) * tint;
      let g = (THREE.MathUtils.lerp(0.56, 0.78, sunExpose) + strata) * tint;
      let b = (THREE.MathUtils.lerp(0.66, 0.70, sunExpose) + strata) * tint;
      if (vy < -0.20) {
        const bt = Math.min(1, (-0.20 - vy) / 0.65);
        r = THREE.MathUtils.lerp(r, 0.52 * tint, bt);
        g = THREE.MathUtils.lerp(g, 0.45 * tint, bt);
        b = THREE.MathUtils.lerp(b, 0.42 * tint, bt);
      }
      if (ny > 0.42 - frostBoost * 0.25) {
        const ct = Math.min(1, (ny - (0.42 - frostBoost * 0.25)) / 0.48);
        r = THREE.MathUtils.lerp(r, 0.98 + frostBoost * 0.02, ct * (0.78 + frostBoost * 0.2));
        g = THREE.MathUtils.lerp(g, 0.93 + frostBoost * 0.04, ct * (0.78 + frostBoost * 0.2));
        b = THREE.MathUtils.lerp(b, 0.92 + frostBoost * 0.06, ct * (0.78 + frostBoost * 0.2));
      }
      cols[v * 3 + 0] = r;
      cols[v * 3 + 1] = g;
      cols[v * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  };

  let attempts = 0;
  while (placedBoulders.length < bCfg.count && attempts < 200) {
    attempts++;
    const a = rng() * Math.PI * 2;
    const rad = 14 + rng() * 46; // between 14m and 60m from origin
    const bx = origin.x + Math.cos(a) * rad;
    const bz = origin.z + Math.sin(a) * rad;

    // Reject if too close to gate or central north-south corridor from gate
    if (Math.hypot(bx - gateX, bz - gateZ) < 14) continue;
    if (Math.abs(bx - gateX) < 5.5 && bz > 12) continue;
    // Reject if too close to chorten
    if (Math.hypot(bx - chortenX, bz - chortenZ) < 8) continue;
    // Reject if inside northern Boss arena around (1000, -48)
    if (Math.hypot(bx - origin.x, bz - (origin.z - 48)) < MIGOI_ARENA_RADIUS + bCfg.maxRadius + 1) continue;
    // Reject if too close to tilted Mani stone cairn / Ancient Pilgrim's Map at (origin.x + 8, origin.z - 12)
    if (Math.hypot(bx - (origin.x + 8.5), bz - (origin.z - 12)) < 5.5) continue;

    // Reject if too close to mani stones
    let nearMani = false;
    for (let m = 0; m < maniList.length; m++) {
      if (Math.hypot(bx - maniList[m].x, bz - maniList[m].z) < 7) {
        nearMani = true;
        break;
      }
    }
    if (nearMani) continue;

    // Reject if too close to another placed boulder
    let nearOther = false;
    for (let o = 0; o < placedBoulders.length; o++) {
      if (Math.hypot(bx - placedBoulders[o].x, bz - placedBoulders[o].z) < 6) {
        nearOther = true;
        break;
      }
    }
    if (nearOther) continue;

    const bRadius = bCfg.minRadius + rng() * (bCfg.maxRadius - bCfg.minRadius);
    const by = getHeight(bx, bz);

    placedBoulders.push({ x: bx, z: bz, r: bRadius });

    // Push circle collider
    colliders.push({
      type: 'circle',
      x: bx,
      z: bz,
      r: bRadius * 0.9,
      zone: mapId,
    });

    // Preserve exact rng calls from legacy loop while using spatial faceted displacement
    const baseProbeGeo = new THREE.DodecahedronGeometry(bRadius, 0);
    const probeCount = baseProbeGeo.attributes.position.count;
    let jAvgX = 0;
    let jAvgY = 0;
    let jAvgZ = 0;
    for (let v = 0; v < probeCount; v++) {
      jAvgX += 1.0 + (rng() - 0.5) * 0.35;
      jAvgY += 0.85 + (rng() - 0.5) * 0.3;
      jAvgZ += 1.0 + (rng() - 0.5) * 0.35;
    }
    jAvgX /= probeCount;
    jAvgY /= probeCount;
    jAvgZ /= probeCount;
    const rotX = rng() * Math.PI;
    const rotY = rng() * Math.PI;

    // Stratified multi-faceted Himalayan crag boulder + 2 flanking base stones
    const rockGeo = new THREE.DodecahedronGeometry(bRadius, 1);
    const rPos = rockGeo.attributes.position;
    for (let v = 0; v < rPos.count; v++) {
      const vx = rPos.getX(v);
      const vy = rPos.getY(v);
      const vz = rPos.getZ(v);
      const strata = 1.0 + Math.sin((vy / bRadius) * 7.5 + vx * 1.2) * 0.08;
      const crag = 1.0 + Math.cos(vx * 2.8 - vz * 2.6) * 0.07;
      rPos.setXYZ(v, vx * jAvgX * strata * crag, vy * jAvgY * crag, vz * jAvgZ * strata);
    }
    rockGeo.rotateX((rotX - Math.PI * 0.5) * 0.24);
    rockGeo.rotateY(rotY);
    const rockTint = 0.88 + ((placedBoulders.length * 17) % 11) * 0.022;
    applyCragVertexColors(rockGeo, rockTint, bz < -15 ? 0.18 : 0.0);
    rockGeo.translate(bx, by + bRadius * 0.52, bz);
    boulderGeos.push(rockGeo);

    for (const [ox, oz, sr] of [[0.58, 0.34, 0.42], [-0.52, -0.30, 0.33]]) {
      const subGeo = new THREE.DodecahedronGeometry(bRadius * sr, 0);
      subGeo.scale(1.12, 0.72, 0.96);
      subGeo.rotateY(rotY + ox);
      applyCragVertexColors(subGeo, rockTint * 0.94, bz < -15 ? 0.15 : 0.0);
      const sx = bx + ( ox * Math.cos(rotY) - oz * Math.sin(rotY) ) * bRadius;
      const sz = bz + ( ox * Math.sin(rotY) + oz * Math.cos(rotY) ) * bRadius;
      subGeo.translate(sx, getHeight(sx, sz) + bRadius * sr * 0.36, sz);
      boulderGeos.push(subGeo);
    }
  }

  // ---------------------------------------------------------------- 7b. Grand Migoi Snow King Boss Arena at (1000, -48)
  const arenaX = origin.x;
  const arenaZ = origin.z - 48;
  const arenaY = getHeight(arenaX, arenaZ);

  // Carved stone mandala rings & 8 radial spokes flush with the ground (y + 0.025)
  const arenaOuterStone = new THREE.RingGeometry(MIGOI_ARENA_RADIUS - 0.85, MIGOI_ARENA_RADIUS + 0.28, 48);
  arenaOuterStone.rotateX(-Math.PI / 2);
  arenaOuterStone.translate(arenaX, arenaY + 0.025, arenaZ);
  maniSlateGeos.push(arenaOuterStone);

  const arenaInnerStone = new THREE.RingGeometry(6.15, 6.75, 36);
  arenaInnerStone.rotateX(-Math.PI / 2);
  arenaInnerStone.translate(arenaX, arenaY + 0.025, arenaZ);
  maniSlateGeos.push(arenaInnerStone);

  for (let sp = 0; sp < 8; sp++) {
    const sa = (sp / 8) * Math.PI * 2;
    const spokeLen = MIGOI_ARENA_RADIUS - 7.6;
    const spokeMidR = 6.75 + spokeLen * 0.5;
    const spokeGeo = new THREE.BoxGeometry(0.42, 0.03, spokeLen);
    spokeGeo.rotateY(-sa + Math.PI / 2);
    spokeGeo.translate(
      arenaX + Math.cos(sa) * spokeMidR,
      arenaY + 0.02,
      arenaZ + Math.sin(sa) * spokeMidR
    );
    maniSlateGeos.push(spokeGeo);
  }

  // Glowing ancient Tibetan frost-rune mandala ring flush with ground (y + 0.035)
  const bossRuneGeos = [];
  const runeOuterRing = new THREE.RingGeometry(MIGOI_ARENA_RADIUS - 1.32, MIGOI_ARENA_RADIUS - 0.92, 48);
  runeOuterRing.rotateX(-Math.PI / 2);
  runeOuterRing.translate(arenaX, arenaY + 0.035, arenaZ);
  bossRuneGeos.push(runeOuterRing);

  const runeInnerRing = new THREE.RingGeometry(5.78, 6.08, 36);
  runeInnerRing.rotateX(-Math.PI / 2);
  runeInnerRing.translate(arenaX, arenaY + 0.035, arenaZ);
  bossRuneGeos.push(runeInnerRing);

  for (let rIdx = 0; rIdx < 12; rIdx++) {
    const ra = (rIdx / 12) * Math.PI * 2;
    const rr = MIGOI_ARENA_RADIUS - 1.85;
    const sigil = new THREE.PlaneGeometry(0.75, 0.55);
    sigil.rotateX(-Math.PI / 2);
    sigil.rotateZ(-ra);
    sigil.translate(arenaX + Math.cos(ra) * rr, arenaY + 0.036, arenaZ + Math.sin(ra) * rr);
    bossRuneGeos.push(sigil);
  }

  // 12 Weathered Glacial Monolith Boundary Stones outside the walkable arena clamp (r = MIGOI_ARENA_RADIUS + 1.8, 0 colliders)
  const monolithPoles = [];
  const monolithCount = 12;
  const monolithRingR = MIGOI_ARENA_RADIUS + 1.8;

  for (let mIdx = 0; mIdx < monolithCount; mIdx++) {
    // Shift angles by half a step so the southern approach at angle = PI/2 forms an open ritual gateway
    const ma = ((mIdx + 0.5) / monolithCount) * Math.PI * 2;
    const mx = arenaX + Math.cos(ma) * monolithRingR;
    const mz = arenaZ + Math.sin(ma) * monolithRingR;
    const my = getHeight(mx, mz);
    const monoH = 2.75 + ((mIdx * 7) % 5) * 0.28;
    const monoR = 0.68 + ((mIdx * 3) % 4) * 0.08;

    const monoGeo = new THREE.ConeGeometry(monoR, monoH, 6, 3).toNonIndexed();
    const mPos = monoGeo.attributes.position;
    for (let v = 0; v < mPos.count; v++) {
      const vx = mPos.getX(v);
      const vy = mPos.getY(v);
      const vz = mPos.getZ(v);
      const u = (vy + monoH * 0.5) / monoH;
      const taper = u > 0.75 ? 1.25 : (1.08 + (1 - u) * 0.22);
      const jag = 1.0 + Math.sin(vy * 3.8 + mIdx * 1.7) * 0.12;
      mPos.setXYZ(v, vx * taper * jag, vy, vz * 0.78 * taper * jag);
    }
    // Tilt monolith slightly outward from arena center
    monoGeo.rotateZ(-Math.cos(ma) * 0.11);
    monoGeo.rotateX(Math.sin(ma) * 0.11);
    monoGeo.rotateY(-ma + Math.PI * 0.5);
    applyCragVertexColors(monoGeo, 0.92, 0.45);
    monoGeo.translate(mx, my + monoH * 0.46, mz);
    boulderGeos.push(monoGeo);

    // Glowing icy-turquoise rune band carved on the inward-facing monolith face
    const runePlaque = new THREE.PlaneGeometry(0.26, monoH * 0.44);
    runePlaque.rotateY(-ma - Math.PI * 0.5);
    const inwardDist = monoR * 0.66;
    runePlaque.translate(
      mx - Math.cos(ma) * inwardDist,
      my + monoH * 0.48,
      mz - Math.sin(ma) * inwardDist
    );
    bossRuneGeos.push(runePlaque);

    // Tattered Lungta timber pole rising beside every second monolith
    if (mIdx % 2 === 0) {
      const pH = monoH + 1.35;
      const mPole = new THREE.CylinderGeometry(0.04, 0.07, pH, 6);
      mPole.translate(mx + Math.cos(ma) * 0.25, my + pH * 0.5, mz + Math.sin(ma) * 0.25);
      maniWoodGeos.push(mPole);
      monolithPoles.push(new THREE.Vector3(mx + Math.cos(ma) * 0.25, my + pH - 0.15, mz + Math.sin(ma) * 0.25));
    }
  }

  if (maniSlateGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(maniSlateGeos, false), slateMat);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  if (maniWoodGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(maniWoodGeos, false), woodMat);
    m.castShadow = true;
    group.add(m);
  }
  if (maniGoldGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(maniGoldGeos, false), goldMat);
    m.castShadow = true;
    group.add(m);
  }

  const bossRuneMat = new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const bossRuneMesh = new THREE.Mesh(mergeGeometries(bossRuneGeos, false), bossRuneMat);
  group.add(bossRuneMesh);

  if (boulderGeos.length) {
    const bMeshGeo = mergeGeometries(boulderGeos, false);
    const bMesh = new THREE.Mesh(bMeshGeo, rockMat);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    group.add(bMesh);
  }

  // ---------------------------------------------------------------- 7c. Pilgrimage Stone Flagstone Path (InstancedMesh, 1 draw call, 0 colliders)
  {
    const pathStones = [];
    const pathRng = createSeededRng(3319);

    // 1. Main South-to-North pilgrimage trail: South Gate (z=58.2) -> Chorten (z=5.2) and Chorten (z=-5.2) -> Boss Arena (z=-27.2)
    for (let lz = 58.2; lz >= -27.2; lz -= 1.55) {
      if (Math.abs(lz) < 4.8) continue; // Replaced by circular Kora ring around Chorten
      const cx = origin.x + getPathCenterX(lz) + (pathRng() - 0.5) * 0.28;
      const cz = origin.z + lz + (pathRng() - 0.5) * 0.22;
      pathStones.push({
        x: cx,
        z: cz,
        sx: 1.05 + pathRng() * 0.45,
        sy: 0.9 + pathRng() * 0.25,
        sz: 0.85 + pathRng() * 0.35,
        ry: pathRng() * Math.PI * 2,
        frost: lz < -12 ? Math.min(1, (-12 - lz) / 18) : 0,
      });

      // Occasional smaller roadside curb stone
      if (pathRng() > 0.42) {
        const side = pathRng() > 0.5 ? 1 : -1;
        const curbX = cx + side * (1.25 + pathRng() * 0.35);
        const curbZ = cz + (pathRng() - 0.5) * 0.4;
        pathStones.push({
          x: curbX,
          z: curbZ,
          sx: 0.52 + pathRng() * 0.24,
          sy: 1.35 + pathRng() * 0.4,
          sz: 0.44 + pathRng() * 0.22,
          ry: pathRng() * Math.PI * 2,
          frost: lz < -12 ? Math.min(1, (-12 - lz) / 18) : 0,
        });
      }
    }

    // 2. Clockwise Kora circumambulation flagstone ring around the central Tibetan Chorten (r = 4.2m)
    const koraCount = 18;
    for (let k = 0; k < koraCount; k++) {
      const ka = (k / koraCount) * Math.PI * 2;
      const kr = 4.15 + (pathRng() - 0.5) * 0.2;
      pathStones.push({
        x: chortenX + Math.cos(ka) * kr,
        z: chortenZ + Math.sin(ka) * kr,
        sx: 1.0 + pathRng() * 0.3,
        sy: 1.0,
        sz: 0.82 + pathRng() * 0.25,
        ry: -ka + (pathRng() - 0.5) * 0.25,
        frost: 0,
      });
    }

    // 3. Stepping stone spurs toward the 3 Mani Stone mounds
    for (let m = 0; m < maniList.length; m++) {
      const ms = maniList[m];
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const u = s / steps;
        const sx = THREE.MathUtils.lerp(origin.x + getPathCenterX(ms.z - origin.z), ms.x, u);
        const sz = THREE.MathUtils.lerp(ms.z * 0.45, ms.z, u);
        if (Math.hypot(sx - ms.x, sz - ms.z) < 2.6) continue;
        pathStones.push({
          x: sx + (pathRng() - 0.5) * 0.3,
          z: sz + (pathRng() - 0.5) * 0.3,
          sx: 0.78 + pathRng() * 0.28,
          sy: 0.95,
          sz: 0.68 + pathRng() * 0.24,
          ry: pathRng() * Math.PI * 2,
          frost: sz < -12 ? 0.35 : 0,
        });
      }
    }

    const slabGeo = new THREE.CylinderGeometry(0.68, 0.76, 0.09, 7);
    const sPos = slabGeo.attributes.position;
    for (let v = 0; v < sPos.count; v++) {
      const vx = sPos.getX(v);
      const vy = sPos.getY(v);
      const vz = sPos.getZ(v);
      const jag = 1.0 + Math.sin(vx * 4.5 + vz * 3.8) * 0.08;
      sPos.setXYZ(v, vx * jag, vy, vz * jag);
    }
    slabGeo.computeVertexNormals();

    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x8b8377,
      roughness: 0.90,
      metalness: 0.04,
    });
    const flagstoneInstanced = new THREE.InstancedMesh(slabGeo, slabMat, pathStones.length);
    flagstoneInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const stoneCol = new THREE.Color();
    for (let i = 0; i < pathStones.length; i++) {
      const st = pathStones[i];
      const sy = getHeight(st.x, st.z);
      dummy.position.set(st.x, sy + 0.022, st.z);
      dummy.rotation.set(0, st.ry, 0);
      dummy.scale.set(st.sx, st.sy, st.sz);
      dummy.updateMatrix();
      flagstoneInstanced.setMatrixAt(i, dummy.matrix);

      const shade = 0.88 + pathRng() * 0.22;
      stoneCol.setRGB(
        THREE.MathUtils.lerp(shade * 1.02, 0.86, st.frost * 0.6),
        THREE.MathUtils.lerp(shade * 0.99, 0.92, st.frost * 0.6),
        THREE.MathUtils.lerp(shade * 0.94, 1.02, st.frost * 0.6)
      );
      flagstoneInstanced.setColorAt(i, stoneCol);
    }
    flagstoneInstanced.instanceMatrix.needsUpdate = true;
    if (flagstoneInstanced.instanceColor) flagstoneInstanced.instanceColor.needsUpdate = true;
    group.add(flagstoneInstanced);
  }

  // ---------------------------------------------------------------- 7d. Highland Alpine Foliage (InstancedMesh, 320 Golden Tussocks + Rhododendron Scrub, 0 colliders)
  const tussockWindUniform = { value: 0 };
  {
    const folRng = createSeededRng(5513);

    const isClearForFoliage = (wx, wz) => {
      const lx = wx - origin.x;
      const lz = wz - origin.z;
      if (Math.hypot(wx - gateX, wz - gateZ) < 8.5) return false;
      if (Math.hypot(wx - chortenX, wz - chortenZ) < 6.2) return false;
      if (lz >= -30 && lz <= 60 && Math.abs(lx - getPathCenterX(lz)) < 2.2) return false;
      if (Math.hypot(wx - arenaX, wz - arenaZ) < MIGOI_ARENA_RADIUS - 0.4) return false;
      if (Math.hypot(wx - (origin.x + 8.8), wz - (origin.z - 12.4)) < 3.4) return false;
      for (let m = 0; m < maniList.length; m++) {
        if (Math.hypot(wx - maniList[m].x, wz - maniList[m].z) < 4.2) return false;
      }
      for (let b = 0; b < placedBoulders.length; b++) {
        if (Math.hypot(wx - placedBoulders[b].x, wz - placedBoulders[b].z) < placedBoulders[b].r + 0.8) return false;
      }
      return true;
    };

    // 1. Swaying Golden-Amber Alpine Tussock Grass & Wildflower Tufts (320 instances, 1 draw call)
    const bladeGeos = [];
    const bladeCount = 7;
    for (let b = 0; b < bladeCount; b++) {
      const ba = (b / bladeCount) * Math.PI * 2 + (b % 2) * 0.25;
      const bH = 0.50 + (b % 3) * 0.11;
      const blade = new THREE.ConeGeometry(0.115, bH, 4, 2);
      blade.translate(0, bH * 0.5, 0);
      blade.rotateX(0.30 + (b % 2) * 0.15);
      blade.rotateY(ba);
      blade.translate(Math.cos(ba) * 0.11, 0, Math.sin(ba) * 0.11);
      bladeGeos.push(blade);
    }
    const cushion = new THREE.SphereGeometry(0.21, 6, 5);
    cushion.scale(1.28, 0.56, 1.28);
    cushion.translate(0, 0.09, 0);
    bladeGeos.push(cushion);

    const tussockGeo = mergeGeometries(bladeGeos, false);
    tussockGeo.computeVertexNormals();
    const tPos = tussockGeo.attributes.position;
    const tCols = new Float32Array(tPos.count * 3);
    for (let v = 0; v < tPos.count; v++) {
      const u = THREE.MathUtils.clamp(tPos.getY(v) / 0.58, 0, 1);
      // Root-to-tip gradient: warm sienna-olive earth base -> luminous golden-amber & sunlit ochre tips
      tCols[v * 3 + 0] = THREE.MathUtils.lerp(0.46, 0.96, u);
      tCols[v * 3 + 1] = THREE.MathUtils.lerp(0.39, 0.82, u);
      tCols[v * 3 + 2] = THREE.MathUtils.lerp(0.22, 0.44, u);
    }
    tussockGeo.setAttribute('color', new THREE.BufferAttribute(tCols, 3));

    const tussocks = [];
    let tAttempts = 0;
    // First seed 96 golden tussock clumps bordering the S-curve pilgrimage path & around the 3 Mani stone cairns
    while (tussocks.length < 96 && tAttempts < 600) {
      tAttempts++;
      let wx;
      let wz;
      if (tussocks.length < 64) {
        const lz = -28 + folRng() * 84;
        const side = folRng() > 0.5 ? 1 : -1;
        const lx = getPathCenterX(lz) + side * (2.5 + folRng() * 3.8);
        wx = origin.x + lx;
        wz = origin.z + lz;
      } else {
        const ms = maniList[tussocks.length % Math.max(1, maniList.length)] || { x: origin.x, z: origin.z };
        const ma = folRng() * Math.PI * 2;
        const mr = 4.6 + folRng() * 4.5;
        wx = ms.x + Math.cos(ma) * mr;
        wz = ms.z + Math.sin(ma) * mr;
      }
      if (!isClearForFoliage(wx, wz)) continue;
      tussocks.push({
        x: wx,
        y: getHeight(wx, wz),
        z: wz,
        s: 0.78 + folRng() * 0.82,
        ry: folRng() * Math.PI * 2,
      });
    }
    // Fill remaining up to 320 clumps across the Highland Steppe
    while (tussocks.length < 320 && tAttempts < 2200) {
      tAttempts++;
      const a = folRng() * Math.PI * 2;
      const rad = 5.5 + folRng() * 65;
      const wx = origin.x + Math.cos(a) * rad;
      const wz = origin.z + Math.sin(a) * rad;
      if (!isClearForFoliage(wx, wz)) continue;
      tussocks.push({
        x: wx,
        y: getHeight(wx, wz),
        z: wz,
        s: 0.72 + folRng() * 0.84,
        ry: folRng() * Math.PI * 2,
      });
    }

    const tussockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02,
      emissive: 0x38280e,
      emissiveIntensity: 0.22,
    });
    tussockMat.onBeforeCompile = function (shader) {
      shader.uniforms.uWindTime = tussockWindUniform;
      shader.vertexShader =
        `uniform float uWindTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          /* glsl */ `
          #include <begin_vertex>
          float tipWeight = clamp(position.y / 0.56, 0.0, 1.0);
          float worldPhase = (instanceMatrix[3][0] * 0.19) + (instanceMatrix[3][2] * 0.15);
          float gust = sin(uWindTime * 2.1 + worldPhase) * 0.085 + cos(uWindTime * 1.3 - worldPhase * 0.7) * 0.04;
          transformed.x += gust * tipWeight * tipWeight;
          transformed.z += gust * 0.55 * tipWeight * tipWeight;
          `,
        );
    };
    tussockMat.customProgramCacheKey = () => 'wild-tussock-sway-v1';

    const tussockInstanced = new THREE.InstancedMesh(tussockGeo, tussockMat, tussocks.length);
    tussockInstanced.name = 'WildernessTussockGrass';
    tussockInstanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const tCol = new THREE.Color();
    for (let i = 0; i < tussocks.length; i++) {
      const p = tussocks[i];
      dummy.position.set(p.x, p.y - 0.02, p.z);
      dummy.rotation.set(0, p.ry, 0);
      dummy.scale.set(p.s, p.s * (0.85 + folRng() * 0.38), p.s);
      dummy.updateMatrix();
      tussockInstanced.setMatrixAt(i, dummy.matrix);

      const frostMix = p.z < -20 || p.y > 4.8 ? 0.24 : 0.0;
      const warm = 0.90 + folRng() * 0.28;
      tCol.setRGB(
        THREE.MathUtils.lerp(warm * 1.05, 0.94, frostMix),
        THREE.MathUtils.lerp(warm * (0.94 + folRng() * 0.12), 0.95, frostMix),
        THREE.MathUtils.lerp(warm * 0.76, 1.00, frostMix)
      );
      tussockInstanced.setColorAt(i, tCol);
    }
    tussockInstanced.instanceMatrix.needsUpdate = true;
    if (tussockInstanced.instanceColor) tussockInstanced.instanceColor.needsUpdate = true;
    group.add(tussockInstanced);

    // 2. Highland Rhododendron Scrub, Himalayan Blue Poppy & Edelweiss Flower Clusters (~110 instances, 1 draw call)
    const flowerParts = [];
    for (let l = 0; l < 4; l++) {
      const la = (l / 4) * Math.PI * 2;
      const leaf = new THREE.ConeGeometry(0.16, 0.22, 5, 1);
      leaf.rotateX(1.05);
      leaf.rotateY(la);
      leaf.translate(Math.cos(la) * 0.12, 0.06, Math.sin(la) * 0.12);
      const lCount = leaf.attributes.position.count;
      const lCols = new Float32Array(lCount * 3);
      for (let v = 0; v < lCount; v++) {
        lCols[v * 3 + 0] = 0.36;
        lCols[v * 3 + 1] = 0.50;
        lCols[v * 3 + 2] = 0.30;
      }
      leaf.setAttribute('color', new THREE.BufferAttribute(lCols, 3));
      flowerParts.push(leaf);

      const bloom = new THREE.SphereGeometry(0.095, 6, 5);
      bloom.scale(1.28, 0.76, 1.28);
      bloom.translate(Math.cos(la + 0.45) * 0.10, 0.18 + (l % 2) * 0.06, Math.sin(la + 0.45) * 0.10);
      const bCount = bloom.attributes.position.count;
      const bCols = new Float32Array(bCount * 3);
      for (let v = 0; v < bCount; v++) {
        bCols[v * 3 + 0] = 0.99;
        bCols[v * 3 + 1] = 0.98;
        bCols[v * 3 + 2] = 0.98;
      }
      bloom.setAttribute('color', new THREE.BufferAttribute(bCols, 3));
      flowerParts.push(bloom);
    }

    const flowerGeo = mergeGeometries(flowerParts, false);
    flowerGeo.computeVertexNormals();

    const flowers = [];
    let fAttempts = 0;
    while (flowers.length < 110 && fAttempts < 800) {
      fAttempts++;
      const a = folRng() * Math.PI * 2;
      const rad = 5.8 + folRng() * 58;
      const wx = origin.x + Math.cos(a) * rad;
      const wz = origin.z + Math.sin(a) * rad;
      if (!isClearForFoliage(wx, wz)) continue;
      flowers.push({
        x: wx,
        y: getHeight(wx, wz),
        z: wz,
        s: 0.85 + folRng() * 0.72,
        ry: folRng() * Math.PI * 2,
        paletteIdx: Math.floor(folRng() * 4),
      });
    }

    const flowerPalette = [
      new THREE.Color(0xfaf4ff), // silvery-white alpine edelweiss
      new THREE.Color(0xf06292), // highland rhododendron crimson-rose
      new THREE.Color(0x64b5f6), // Himalayan blue poppy
      new THREE.Color(0xffd54f), // golden alpine cinquefoil
    ];

    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.80,
      metalness: 0.02,
      emissive: 0x2e1c24,
      emissiveIntensity: 0.18,
    });
    const flowerInstanced = new THREE.InstancedMesh(flowerGeo, flowerMat, flowers.length);
    flowerInstanced.name = 'WildernessRhododendronScrub';
    flowerInstanced.receiveShadow = true;

    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(0, f.ry, 0);
      dummy.scale.setScalar(f.s);
      dummy.updateMatrix();
      flowerInstanced.setMatrixAt(i, dummy.matrix);
      flowerInstanced.setColorAt(i, flowerPalette[f.paletteIdx]);
    }
    flowerInstanced.instanceMatrix.needsUpdate = true;
    if (flowerInstanced.instanceColor) flowerInstanced.instanceColor.needsUpdate = true;
    group.add(flowerInstanced);
  }

  // ---------------------------------------------------------------- 8. Prayer Flag Strings Connecting Landmarks
  const flagLines = [
    // Chorten to Mani Stones
    { start: new THREE.Vector3(chortenX, chortenY + 5.3, chortenZ), end: maniPoles[0], sag: 1.6 },
    { start: new THREE.Vector3(chortenX, chortenY + 5.3, chortenZ), end: maniPoles[1], sag: 1.8 },
    { start: new THREE.Vector3(chortenX, chortenY + 5.3, chortenZ), end: maniPoles[2], sag: 1.7 },
    // Mani Stone to Gate posts
    { start: maniPoles[0], end: new THREE.Vector3(gateX - gPillarX, gateY + gPillarH + 0.3, gateZ), sag: 2.1 },
    { start: maniPoles[1], end: new THREE.Vector3(gateX + gPillarX, gateY + gPillarH + 0.3, gateZ), sag: 2.2 },
    // Tattered Lungta prayer flag cords linking the northern Migoi Boss Arena glacial monoliths
    ...monolithPoles.slice(1).map((endPt, idx) => ({
      start: monolithPoles[idx],
      end: endPt,
      sag: 1.15,
    })),
  ];

  const flagColors = [
    new THREE.Color(0x1a5fb4), // blue
    new THREE.Color(0xf6f5f4), // white
    new THREE.Color(0xc01c28), // red
    new THREE.Color(0x2ec27e), // green
    new THREE.Color(0xf6d32d), // yellow
  ];

  const flagGeos = [];
  const ropePositions = [];
  const ropeIndices = [];
  let ropeVCount = 0;

  for (let lIdx = 0; lIdx < flagLines.length; lIdx++) {
    const line = flagLines[lIdx];
    const segs = 36;
    let prevPt = null;

    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const pt = new THREE.Vector3().lerpVectors(line.start, line.end, u);
      pt.y -= 4 * u * (1 - u) * line.sag;

      ropePositions.push(pt.x, pt.y, pt.z);
      if (s > 0) {
        ropeIndices.push(ropeVCount - 1, ropeVCount);
      }
      ropeVCount++;

      // Attach miniature fluttering flag quad every few points
      if (s > 1 && s < segs - 1 && s % 2 === 0) {
        const flagGeo = new THREE.PlaneGeometry(0.32, 0.24);
        flagGeo.rotateX(0.18);
        flagGeo.translate(pt.x, pt.y - 0.12, pt.z);
        const col = flagColors[(lIdx * 3 + s) % 5];
        const cAttr = new Float32Array(flagGeo.attributes.position.count * 3);
        for (let k = 0; k < flagGeo.attributes.position.count; k++) {
          cAttr[k * 3 + 0] = col.r;
          cAttr[k * 3 + 1] = col.g;
          cAttr[k * 3 + 2] = col.b;
        }
        flagGeo.setAttribute('color', new THREE.BufferAttribute(cAttr, 3));
        flagGeos.push(flagGeo);
      }
      prevPt = pt;
    }
  }

  // Thin rope line
  const ropeGeo = new THREE.BufferGeometry();
  ropeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ropePositions, 3));
  ropeGeo.setIndex(ropeIndices);
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x4a3d31 });
  const ropeLine = new THREE.LineSegments(ropeGeo, ropeMat);
  group.add(ropeLine);

  if (flagGeos.length) {
    const flagsGeo = mergeGeometries(flagGeos, false);
    const flagsMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
    const flagsMesh = new THREE.Mesh(flagsGeo, flagsMat);
    group.add(flagsMesh);
  }

  // ---------------------------------------------------------------- 8b. Diagonal Firewatch Sunset Sunbeams (8 God Rays, 0 PointLights)
  const sunbeamsGroup = new THREE.Group();
  sunbeamsGroup.name = 'WildernessSunsetSunbeams';
  const sunbeamTex = getWildSunbeamTexture();
  const sunbeamGeo = new THREE.PlaneGeometry(1, 1);
  const sunbeams = [];
  const sunbeamSpecs = [
    // 1. Central Tibetan Chorten golden-hour shaft
    { lx: -2.2, lz: 0.5, y: 11.5, w: 9.5, h: 26.0, rotY: 0.28, rotZ: -0.44, opacity: 0.18, color: 0xffcf78 },
    // 2. Southwest Mani Stone Cairn shaft
    { lx: (maniList[0]?.x ?? (origin.x - 18)) - origin.x - 1.5, lz: (maniList[0]?.z ?? 18) - origin.z, y: 10.5, w: 7.6, h: 23.0, rotY: 0.35, rotZ: -0.42, opacity: 0.15, color: 0xffc66e },
    // 3. Southeast Mani Stone Cairn shaft
    { lx: (maniList[1]?.x ?? (origin.x + 18)) - origin.x - 1.5, lz: (maniList[1]?.z ?? 18) - origin.z, y: 10.5, w: 7.6, h: 23.0, rotY: -0.22, rotZ: -0.42, opacity: 0.15, color: 0xffc66e },
    // 4. Northern Mani Stone Cairn shaft
    { lx: (maniList[2]?.x ?? (origin.x - 15)) - origin.x - 1.5, lz: (maniList[2]?.z ?? -16) - origin.z, y: 10.8, w: 8.0, h: 24.0, rotY: 0.18, rotZ: -0.45, opacity: 0.16, color: 0xffd68a },
    // 5. South Return Gate pilgrimage entry shaft
    { lx: -1.8, lz: 52.0, y: 10.2, w: 8.4, h: 22.5, rotY: 0.15, rotZ: -0.40, opacity: 0.15, color: 0xffc266 },
    // 6. Mid-South S-Curve Pilgrimage Trail shaft
    { lx: 1.4, lz: 28.0, y: 10.6, w: 8.2, h: 23.5, rotY: -0.25, rotZ: -0.43, opacity: 0.14, color: 0xffce75 },
    // 7. Ancient Pilgrim's Map Tilted Cairn shaft
    { lx: 7.2, lz: -12.5, y: 10.4, w: 7.4, h: 22.0, rotY: 0.32, rotZ: -0.44, opacity: 0.15, color: 0xffd482 },
    // 8. Northern Boss Arena Gateway threshold shaft
    { lx: -2.0, lz: -33.5, y: 11.2, w: 9.0, h: 25.0, rotY: 0.12, rotZ: -0.46, opacity: 0.14, color: 0xffe2a8 },
  ];

  for (let i = 0; i < sunbeamSpecs.length; i++) {
    const sb = sunbeamSpecs[i];
    const sbMat = new THREE.MeshBasicMaterial({
      ...(sunbeamTex ? { map: sunbeamTex } : {}),
      color: sb.color,
      transparent: true,
      opacity: sb.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const sbMesh = new THREE.Mesh(sunbeamGeo, sbMat);
    sbMesh.position.set(origin.x + sb.lx, sb.y, origin.z + sb.lz);
    sbMesh.rotation.set(0.12, sb.rotY, sb.rotZ);
    sbMesh.scale.set(sb.w, sb.h, 1);
    sunbeamsGroup.add(sbMesh);
    sunbeams.push({ mesh: sbMesh, mat: sbMat, baseOpacity: sb.opacity, phase: i * 1.17 });
  }
  group.add(sunbeamsGroup);

  // ---------------------------------------------------------------- 8c. Floating SEASON Golden Wind & Memory Motes (THREE.Points)
  const moteCount = 140;
  const moteRng = createSeededRng(9127);
  const moteGeo = new THREE.BufferGeometry();
  const motePos = new Float32Array(moteCount * 3);
  const moteColors = new Float32Array(moteCount * 3);
  const moteBaseY = new Float32Array(moteCount);
  const moteGold = new THREE.Color(0xffd875);
  const moteAmber = new THREE.Color(0xffa94d);
  const moteTurquoise = new THREE.Color(0x64f5d2);
  const tmpMoteCol = new THREE.Color();

  for (let i = 0; i < moteCount; i++) {
    const a = moteRng() * Math.PI * 2;
    const rad = 3.0 + moteRng() * 62.0;
    const mx = origin.x + Math.cos(a) * rad;
    const mz = origin.z + Math.sin(a) * rad;
    const my = getHeight(mx, mz) + 0.45 + moteRng() * 4.2;
    motePos[i * 3 + 0] = mx;
    motePos[i * 3 + 1] = my;
    motePos[i * 3 + 2] = mz;
    moteBaseY[i] = my;

    const pick = moteRng();
    if (pick > 0.82) {
      tmpMoteCol.copy(moteTurquoise);
    } else {
      tmpMoteCol.lerpColors(moteGold, moteAmber, pick);
    }
    moteColors[i * 3 + 0] = tmpMoteCol.r;
    moteColors[i * 3 + 1] = tmpMoteCol.g;
    moteColors[i * 3 + 2] = tmpMoteCol.b;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  moteGeo.setAttribute('color', new THREE.BufferAttribute(moteColors, 3));

  const moteMat = new THREE.PointsMaterial({
    size: 0.24,
    vertexColors: true,
    transparent: true,
    opacity: 0.74,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const motePoints = new THREE.Points(moteGeo, moteMat);
  motePoints.name = 'WildernessMemoryMotes';
  group.add(motePoints);

  // ---------------------------------------------------------------- API & exports
  const spawnPoint = new THREE.Vector3(W.wildGate.spawnPos.x, getHeight(W.wildGate.spawnPos.x, W.wildGate.spawnPos.z), W.wildGate.spawnPos.z);
  const gatePosition = new THREE.Vector3(W.wildGate.x, getHeight(W.wildGate.x, W.wildGate.z), W.wildGate.z);

  function sampleRingPoint(ringId, options = {}) {
    const zCfg = (W.zones || []).find((z) => z.id === ringId) || (W.zones && W.zones[0]) || { minR: 10, maxR: 25 };
    const minR = zCfg.minR;
    const maxR = zCfg.maxR;
    const minDistFromGate = options.minDistFromGate ?? 12;
    const minDistFromPlayer = options.minDistFromPlayer ?? 0;
    const gate = W.wildGate;
    const playerPos = state.player?.position;

    // Up to 30 randomized samples
    for (let attempt = 0; attempt < 30; attempt++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random() * (maxR * maxR - minR * minR) + minR * minR);
      const x = origin.x + Math.cos(theta) * r;
      const z = origin.z + Math.sin(theta) * r;

      // Gate distance
      if (Math.hypot(x - gate.x, z - gate.z) < minDistFromGate) continue;

      // Player distance
      if (minDistFromPlayer > 0 && playerPos) {
        if (Math.hypot(x - playerPos.x, z - playerPos.z) < minDistFromPlayer) continue;
      }

      // Check colliders
      let insideCollider = false;
      if (Array.isArray(colliders)) {
        for (let i = 0; i < colliders.length; i++) {
          const c = colliders[i];
          if (!c || (c.zone || 'stupa') !== mapId) continue;
          if (c.type === 'circle') {
            if (Math.hypot(x - c.x, z - c.z) < (c.r || 1) + 1.0) {
              insideCollider = true;
              break;
            }
          }
        }
      }
      if (insideCollider) continue;

      return { x, y: getHeight(x, z), z };
    }

    // Fallback: point directly opposite to player, mid-radius
    let fallbackTheta = Math.PI * 0.5;
    if (playerPos) {
      const pAngle = Math.atan2(playerPos.z - origin.z, playerPos.x - origin.x);
      fallbackTheta = pAngle + Math.PI;
    }
    const midR = (minR + maxR) * 0.5;
    let fx = origin.x + Math.cos(fallbackTheta) * midR;
    let fz = origin.z + Math.sin(fallbackTheta) * midR;
    if (Math.hypot(fx - gate.x, fz - gate.z) < minDistFromGate) {
      fallbackTheta += 0.8;
      fx = origin.x + Math.cos(fallbackTheta) * midR;
      fz = origin.z + Math.sin(fallbackTheta) * midR;
    }
    return { x: fx, y: getHeight(fx, fz), z: fz };
  }

  let steppeClock = 0;
  const api = {
    group,
    getHeight,
    spawnPoint,
    gatePosition,
    sampleRingPoint,
    maniStones: maniStonesData,
    zones: W.zones,
    update(dt) {
      if (state.zone && state.zone !== mapId) {
        maniTimer = 0;
        return;
      }

      const safeDt = Number.isFinite(dt) ? dt : 0.016;
      steppeClock += safeDt;
      const elapsed = typeof state.elapsed === 'number' ? state.elapsed : steppeClock;

      // Update swaying golden tussock grass shader uniform
      tussockWindUniform.value = elapsed;

      // Animate boss rune opacity & chasm/foothill mist breathing
      bossRuneMat.opacity = 0.30 + 0.12 * Math.sin(elapsed * 2.1);
      foothillMistMat.opacity = 0.20 + 0.04 * Math.sin(elapsed * 0.85);
      chasmMistMat.opacity = 0.21 + 0.05 * Math.cos(elapsed * 1.15);

      // Gently shimmer the 8 Firewatch sunset sunbeam shafts
      for (let i = 0; i < sunbeams.length; i++) {
        const sb = sunbeams[i];
        sb.mat.opacity = sb.baseOpacity + 0.035 * Math.sin(elapsed * 1.35 + sb.phase);
      }

      // Drift floating SEASON golden wind & memory motes across the steppe
      const mArr = moteGeo.attributes.position.array;
      for (let i = 0; i < moteCount; i++) {
        const idx = i * 3;
        mArr[idx + 0] += Math.cos(elapsed * 0.65 + i * 0.7) * safeDt * 0.24;
        mArr[idx + 1] = moteBaseY[i] + Math.sin(elapsed * 1.4 + i * 1.1) * 0.38;
        mArr[idx + 2] += Math.sin(elapsed * 0.55 + i * 0.9) * safeDt * 0.18;
      }
      moteGeo.attributes.position.needsUpdate = true;

      let nearAnyMani = false;
      const pPos = state.player?.position;
      const maniRadius = config.VITALS?.restore?.maniRadius ?? 4;

      if (pPos) {
        for (let i = 0; i < maniAuras.length; i++) {
          const a = maniAuras[i];
          const dist = Math.hypot(pPos.x - a.x, pPos.z - a.z);
          const isNear = dist <= maniRadius;
          if (isNear) nearAnyMani = true;

          // Pulse brighter & faster when player is within 4m
          const pulseSpeed = isNear ? 4.2 : 1.8;
          const baseAlpha = isNear ? 0.52 : 0.22;
          const pulseAmp = isNear ? 0.28 : 0.10;
          a.mat.opacity = baseAlpha + pulseAmp * Math.sin(elapsed * pulseSpeed + i * 1.5);
          const s = 1.0 + (isNear ? 0.05 : 0.02) * Math.sin(elapsed * pulseSpeed);
          a.mesh.scale.set(s, s, s);
        }
      }

      if (nearAnyMani) {
        maniTimer += dt;
        const interval = config.VITALS?.restore?.maniInterval ?? 1.0;
        if (maniTimer >= interval) {
          maniTimer -= interval;
          bus.emit('vitals:restore', {
            mp: config.VITALS?.restore?.maniMp ?? 1,
            source: 'mani',
          });
        }
      } else {
        maniTimer = 0;
      }
    },
  };

  ctx.wilderness = api;
  return api;
}

export const createMap = createWilderness;
export default createWilderness;
