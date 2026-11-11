/**
 * Mount Kōya Sacred Sanctuary 3D Scene (`koyasan`, `src/world/maps/koyasan.js`) — Issue #249
 *
 * Implements the Eight-Petaled Lotus Basin (`八葉蓮華峰`) of Mount Kōya with three major precincts:
 *   1. West Precinct — Danjō Garan (`壇上伽藍`, `lx ∈ [-82, -18]`):
 *      - Chūmon (`中門`) at `(-50, 42)` with Four Heavenly Kings (`四天王`)
 *      - Konpon Daitō (`根本大塔`) at `(-62, 6)` — 25m vermilion Tahōtō stupa with white `龜腹` dome collar,
 *        9-ring golden `相輪` spire, and interior Three-Dimensional Two-Realm Mandala (`立體兩界曼荼羅`:
 *        central Womb-Realm Mahāvairocana + 4 Diamond-Realm Buddhas + 16 Bodhisattva pillars)
 *      - Kondō (`金堂`) at `(-34, 8)` — Grand Main Hall with hip-and-gable cypress-bark roof
 *      - Miedō (`御影堂`) at `(-50, -18)` & Sanko-no-Matsu (`三鈷松`) at `(-44, -6)` with gleaming golden 3-pronged Vajra
 *   2. Center Precinct — Kongōbu-ji (`金剛峯寺`, `lx ∈ [-22, 24]`):
 *      - Seimon (`正門`) at `(0, 26)` with five-line imperial earthen walls (`五本線築地塀`)
 *      - Main Hall (`主殿`) at `(0, 2)` with Karahafu entrance porch & rooftop fire-prevention water tubs (`天水桶`)
 *      - Banryūtei (`蟠龍庭`) at `(0, -22)` — Japan's largest karesansui rock garden with raked Shirakawa gravel
 *        waves (`CanvasTexture`) and 140 blue Shikoku stones (`InstancedMesh`) forming coiling Male & Female Dragons
 *   3. East Precinct — Okunoin (`奧之院`, `lx ∈ [26, 82]`):
 *      - Millennium Cedar Avenue (`千年杉木林參道`, 96 giant cedars via `InstancedMesh`)
 *      - Gorintō Memorial Forest (`五輪塔群`, 200 five-ring stone stupas via `InstancedMesh`) & 36 Stone Lanterns
 *      - Tamagawa Stream (`玉川`) & Gobyōbashi (`御廟橋`) at `(48, -16)` with 36 planks and bronze `擬寶珠` finials
 *      - Tōrōdō (`萬燈籠堂`) at `(48, -42)` with 144 glowing hanging lanterns (`InstancedMesh`) & 2 Eternal Flames (`消えずの火`)
 *      - Kōbō Daishi Gobyō (`弘法大師御廟`) at `(48, -66)` with sacred palisade and rotating Siddhaṃ mandala ring
 *
 * Performance & Lighting Contract:
 *   - Strictly ZERO `THREE.PointLight` instances! Uses emissive `MeshStandardMaterial` and `THREE.AdditiveBlending`.
 *   - Extensive `THREE.InstancedMesh` and `mergeGeometries` batching to keep draw calls well under 250.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createHeightfieldTerrain,
  addRimMountains,
  pushCollider,
  seededRandom,
} from '../mapBase.js';
import { KOYASAN_MAP } from '../../data/maps/koyasan.js';
import { i18n } from '../../i18n.js';
import '../../i18n/koyasan.js';
import { addJapanRouteGate } from '../japanArchitecture.js';
import { addJapanTrees } from '../japanVegetation.js';

const TWO_PI = Math.PI * 2;

/**
 * Safely merge an array of BufferGeometries into one and dispose temporary parts.
 */
function mergeAndDispose(geos) {
  if (!geos || geos.length === 0) return new THREE.BufferGeometry();
  const normalized = geos.map((g) => {
    const nonIdx = g.index ? g.toNonIndexed() : g.clone();
    if (g !== nonIdx) g.dispose();
    // Keep only position, normal, uv so mergeGeometries never fails on mismatched attributes
    const keep = new Set(['position', 'normal', 'uv']);
    for (const attrName of Object.keys(nonIdx.attributes)) {
      if (!keep.has(attrName)) {
        nonIdx.deleteAttribute(attrName);
      }
    }
    if (!nonIdx.attributes.normal) {
      nonIdx.computeVertexNormals();
    }
    if (!nonIdx.attributes.uv) {
      const count = nonIdx.attributes.position.count;
      nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    return nonIdx;
  });
  const merged = mergeGeometries(normalized, false);
  for (const g of normalized) g.dispose();
  merged.computeVertexNormals();
  return merged;
}

/**
 * Deterministic heightfield for Mount Kōya (`origin = (8000, 0)`):
 *   - Danjō Garan (`壇上伽藍`) in the West (`lx ∈ [-82, -18]`, `lz ∈ [-32, 48]`) -> flat at `y = 0`
 *   - Kongōbu-ji (`金剛峯寺`) in the Center (`lx ∈ [-22, 24]`, `lz ∈ [-38, 32]`) -> flat at `y = 0.2`
 *   - Okunoin (`奧之院`) in the East (`lx ∈ [26, 82]`, `lz ∈ [-82, 45]`) -> gentle rise from `y = 0.2` at `lz = 40`
 *     to `y = 1.8` at Gobyō `lz = -68`, with a shallow stream channel at `lz = -16` (Tamagawa `玉川`)
 *   - Southern Daimon approach & pilgrim avenue (`lz ∈ [45, 92]`) -> smooth walkable terrace around `y = 0..0.15`
 *   - Surrounding lotus-petal foothills rising smoothly beyond `r > 96`
 */
export function koyasanHeight(lx, lz) {
  // 1. Precinct 1: Danjō Garan (West) -> flat y = 0.0
  if (lx >= -84 && lx <= -18 && lz >= -34 && lz <= 50) {
    return 0.0;
  }

  // 2. Precinct 2: Kongōbu-ji (Center) -> flat y = 0.2
  if (lx >= -22 && lx <= 25 && lz >= -40 && lz <= 34) {
    // Smooth ramp along x ∈ [-22, -18] toward Danjō Garan
    if (lx < -18) {
      const t = (lx - -22) / 4;
      return 0.2 * t;
    }
    return 0.2;
  }

  // 3. Precinct 3: Okunoin (East/Northeast) -> gentle rise from y = 0.2 (lz = 40) to y = 1.8 (lz = -68)
  if (lx >= 25 && lx <= 84 && lz >= -82 && lz <= 46) {
    const u = THREE.MathUtils.clamp((40 - lz) / (40 - -68), 0, 1);
    let h = 0.2 + u * 1.6;
    // Tamagawa Stream bed around lz = -16 (except directly under Gobyōbashi deck)
    const dStream = Math.abs(lz - -16);
    if (dStream < 3.6) {
      const dip = Math.cos((dStream / 3.6) * Math.PI * 0.5);
      h -= dip * 0.42;
    }
    return h;
  }

  // 4. Southern Daimon & Waypoint Sanctuary Plaza (lz ∈ [34, 92], lx ∈ [-68, 60])
  if (lz >= 34 && lz <= 92 && lx >= -68 && lx <= 60) {
    if (lz <= 48 && lx >= -22 && lx <= 25) {
      const t = Math.max(0, 1 - (lz - 34) / 14);
      return 0.2 * t;
    }
    return 0.0;
  }

  // 5. Outer lotus-petal basin rim & subtle moss undulations
  const r = Math.hypot(lx, lz);
  const baseUndulation =
    (Math.sin(lx * 0.05) * Math.cos(lz * 0.05) * 0.45 +
      Math.sin((lx - lz) * 0.08) * 0.22);
  let rimLift = 0;
  if (r > 94) {
    const u = Math.min(1, (r - 94) / 28);
    rimLift = u * u * 7.5;
  }
  return Math.max(0, 0.15 + baseUndulation * 0.5 + rimLift);
}

/**
 * Procedural CanvasTexture (`512×512`) for Banryūtei (`蟠龍庭`) raked white Shirakawa gravel waves (`白川砂雲海波紋`).
 */
function createBanryuteiGravelTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const c = canvas.getContext('2d');
  if (!c) return null;

  // Base pale Shirakawa granite sand
  c.fillStyle = '#e7e5df';
  c.fillRect(0, 0, 512, 512);

  // Horizontal & sinusoidal raked wave grooves (Samon 砂紋)
  for (let y = 6; y < 512; y += 8) {
    const wave = Math.sin(y * 0.07) * 6;
    c.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const dy = y + Math.sin(x * 0.045 + y * 0.03) * 3.5 + wave * 0.2;
      if (x === 0) c.moveTo(x, dy);
      else c.lineTo(x, dy);
    }
    c.strokeStyle = 'rgba(165, 162, 154, 0.58)';
    c.lineWidth = 2.4;
    c.stroke();

    c.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const dy = y + 3.5 + Math.sin(x * 0.045 + y * 0.03) * 3.5 + wave * 0.2;
      if (x === 0) c.moveTo(x, dy);
      else c.lineTo(x, dy);
    }
    c.strokeStyle = 'rgba(252, 251, 248, 0.85)';
    c.lineWidth = 1.8;
    c.stroke();
  }

  // Concentric cloud-eddy ripples around the two dragon coils
  const eddies = [
    { cx: 148, cy: 256, maxR: 92 },
    { cx: 364, cy: 256, maxR: 92 },
    { cx: 256, cy: 168, maxR: 64 },
    { cx: 256, cy: 344, maxR: 64 },
  ];
  for (const ed of eddies) {
    for (let r = 18; r <= ed.maxR; r += 9) {
      c.beginPath();
      c.arc(ed.cx, ed.cy, r, 0, TWO_PI);
      c.strokeStyle = 'rgba(150, 148, 140, 0.45)';
      c.lineWidth = 2.0;
      c.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural CanvasTexture (`256×256`) for the golden Siddhaṃ `अ (A)` / `हूँ (Hūṃ)` mandala disc above Kōbō Daishi Gobyō.
 */
function createSiddhamMandalaTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  if (!c) return null;

  c.clearRect(0, 0, 256, 256);
  const cx = 128;
  const cy = 128;

  const grad = c.createRadialGradient(cx, cy, 10, cx, cy, 120);
  grad.addColorStop(0.0, 'rgba(255, 243, 176, 0.95)');
  grad.addColorStop(0.45, 'rgba(245, 158, 11, 0.55)');
  grad.addColorStop(0.85, 'rgba(217, 119, 6, 0.18)');
  grad.addColorStop(1.0, 'rgba(180, 83, 9, 0.0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, 256, 256);

  // Eight-petaled lotus mandala outline (`八葉蓮華`)
  c.strokeStyle = 'rgba(254, 240, 138, 0.92)';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, cy, 104, 0, TWO_PI);
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, 76, 0, TWO_PI);
  c.stroke();

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    const px = cx + Math.cos(a) * 90;
    const py = cy + Math.sin(a) * 90;
    c.beginPath();
    c.arc(px, py, 14, 0, TWO_PI);
    c.stroke();
  }

  // Central Sanskrit/Siddhaṃ seed syllable "अ" (Mahāvairocana)
  c.fillStyle = '#fffbeb';
  c.font = 'bold 76px serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('अ', cx, cy + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Build a compound Five-Ring Stone Stupa (`五輪塔 Gorintō`) geometry:
 *   1. Earth (`地輪`) — cube base
 *   2. Water (`水輪`) — sphere
 *   3. Fire (`火輪`) — 4-sided pyramid roof
 *   4. Wind (`風輪`) — hemisphere bowl
 *   5. Void (`空輪`) — jewel finial (`寶珠`)
 */
function createGorintoGeometry() {
  const plinth = new THREE.BoxGeometry(0.68, 0.14, 0.68);
  plinth.translate(0, 0.07, 0);

  // 1. Earth cube (地輪)
  const earth = new THREE.BoxGeometry(0.52, 0.44, 0.52);
  earth.translate(0, 0.36, 0);

  // 2. Water sphere (水輪)
  const water = new THREE.SphereGeometry(0.26, 8, 6);
  water.scale(1.0, 0.88, 1.0);
  water.translate(0, 0.78, 0);

  // 3. Fire pyramid roof (火輪)
  const fire = new THREE.ConeGeometry(0.38, 0.28, 4);
  fire.rotateY(Math.PI / 4);
  fire.translate(0, 1.12, 0);

  // 4. Wind hemisphere (風輪)
  const wind = new THREE.CylinderGeometry(0.20, 0.12, 0.16, 8);
  wind.translate(0, 1.34, 0);

  // 5. Void jewel (空輪)
  const voidJewel = new THREE.OctahedronGeometry(0.16, 0);
  voidJewel.scale(0.85, 1.25, 0.85);
  voidJewel.translate(0, 1.54, 0);

  return mergeAndDispose([plinth, earth, water, fire, wind, voidJewel]);
}

/**
 * Build a stone lantern (`石燈籠`) structural geometry (base, shaft, platform, roof, finial)
 * so all 36 Okunoin stone lanterns render in 1 structural InstancedMesh + 1 emissive firebox InstancedMesh.
 */
function createStoneLanternGeometry() {
  const base = new THREE.CylinderGeometry(0.32, 0.40, 0.22, 6);
  base.translate(0, 0.11, 0);
  const shaft = new THREE.CylinderGeometry(0.14, 0.17, 0.92, 6);
  shaft.translate(0, 0.68, 0);
  const platform = new THREE.CylinderGeometry(0.34, 0.24, 0.14, 6);
  platform.translate(0, 1.20, 0);
  // Roof above firebox (firebox sits at y = 1.27..1.62)
  const roof = new THREE.ConeGeometry(0.52, 0.32, 6);
  roof.translate(0, 1.76, 0);
  const finial = new THREE.OctahedronGeometry(0.11, 0);
  finial.translate(0, 1.98, 0);
  return mergeAndDispose([base, shaft, platform, roof, finial]);
}

/**
 * Create the Mount Kōya (`koyasan`) 3D map instance.
 */
export function createMap(ctx, mapDef = KOYASAN_MAP) {
  const { scene, state, bus } = ctx;
  const origin = mapDef?.origin || { x: 8000, z: 0 };
  const ox = origin.x; // 8000
  const oz = origin.z; // 0

  const group = ctx.zoneGroups?.koyasan || new THREE.Group();
  group.name = 'KoyasanMap';
  if (!ctx.zoneGroups?.koyasan && scene) {
    scene.add(group);
  }

  // Local root at (8000, 0, 0) so all local coordinates (lx, lz) map cleanly to (8000 + lx, lz)
  const root = new THREE.Group();
  root.name = 'Koyasan_LocalRoot';
  root.position.set(ox, 0, oz);
  group.add(root);

  const colliders = [];
  const interactables = [];
  const disposables = [];

  const getHeight = (lx, lz) => koyasanHeight(lx, lz);
  const getHeightWorld = (wx, wz) => koyasanHeight(wx - ox, wz - oz);

  function addBoxCollider(minLX, maxLX, minLZ, maxLZ) {
    const col = {
      type: 'box',
      minX: ox + minLX,
      maxX: ox + maxLX,
      minZ: oz + minLZ,
      maxZ: oz + maxLZ,
    };
    colliders.push({ ...col, zone: 'koyasan' });
    pushCollider(ctx, 'koyasan', col);
  }

  function addCircleCollider(lx, lz, r) {
    const col = {
      type: 'circle',
      x: ox + lx,
      z: oz + lz,
      r,
    };
    colliders.push({ ...col, zone: 'koyasan' });
    pushCollider(ctx, 'koyasan', col);
  }

  addJapanRouteGate(root, 16, getHeight(16, 22), 22);
  for (const x of [13.95, 18.05]) addCircleCollider(x, 22, 0.38);

  function registerInteractable(it) {
    interactables.push(it);
    if (Array.isArray(ctx.interactables)) {
      ctx.interactables.push(it);
    }
  }

  // ---------------------------------------------------------------- 1. Terrain & Eight-Petaled Lotus Peaks (`八葉蓮華峰`)
  const garanGravelCol = new THREE.Color(0xc8c5bc);
  const kongobujiCourtCol = new THREE.Color(0xd2cfc6);
  const okunoinMossCol = new THREE.Color(0x3a4d39);
  const flagstonePathCol = new THREE.Color(0x7c847d);
  const mountainBasinCol = new THREE.Color(0x4c6048);
  const streamBedCol = new THREE.Color(0x2d5a68);
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 240,
    segments: 96,
    heightFn: getHeightWorld,
    colorFn(wx, wz, y, lx, lz) {
      // Tamagawa stream channel in Okunoin
      if (lx >= 26 && lx <= 78 && Math.abs(lz - -16) < 2.8) {
        return streamBedCol;
      }
      // Okunoin flagstone pilgrimage path (石畳參道)
      if (lx >= 45.2 && lx <= 50.8 && lz >= -68 && lz <= 44) {
        return flagstonePathCol;
      }
      // East-West connecting pilgrimage road (z ≈ 38..46) & South Daimon road (x ≈ -4..4, z ≈ 26..88)
      if (
        (lz >= 38 && lz <= 45 && lx >= -64 && lx <= 52) ||
        (Math.abs(lx) <= 4.0 && lz >= 24 && lz <= 90) ||
        (lz >= 69 && lz <= 75 && lx >= -58 && lx <= 4)
      ) {
        return flagstonePathCol;
      }
      // Danjō Garan sacred gravel precinct
      if (lx >= -78 && lx <= -20 && lz >= -28 && lz <= 44) {
        return garanGravelCol;
      }
      // Kongōbu-ji gravel precinct
      if (lx >= -20 && lx <= 22 && lz >= -34 && lz <= 28) {
        return kongobujiCourtCol;
      }
      // Okunoin ancient cedar moss floor
      if (lx >= 26 && lx <= 82 && lz >= -78 && lz <= 42) {
        const n = Math.sin(lx * 0.14) * Math.cos(lz * 0.14) * 0.5 + 0.5;
        return tmpCol.lerpColors(okunoinMossCol, mountainBasinCol, n * 0.35);
      }
      const n = Math.sin(lx * 0.08) * Math.cos(lz * 0.08) * 0.5 + 0.5;
      return tmpCol.lerpColors(mountainBasinCol, okunoinMossCol, n * 0.45);
    },
  });
  group.add(terrainMesh);

  // Outer Eight-Petaled Lotus Rim (`外八葉蓮華峰`)
  const rimMountainMesh = addRimMountains(ctx, group, {
    origin,
    innerR: 122,
    outerR: 185,
    count: 16,
    heightRange: [40, 68],
    style: 'japanese',
  });

  // Inner Eight Lotus-Petal Peaks (`内八葉蓮華峰`: 8 distinct forested lotus-petal summits encircling the basin)
  const lotusPetalGeos = [];
  const lotusPeakMat = new THREE.MeshStandardMaterial({
    color: 0x284b3c,
    emissive: 0x112521,
    emissiveIntensity: 0.16,
    roughness: 0.92,
    metalness: 0.02,
  });
  disposables.push(lotusPeakMat);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TWO_PI + Math.PI / 8;
    const dist = 114 + (i % 2) * 6;
    const px = Math.cos(ang) * dist;
    const pz = Math.sin(ang) * dist;
    const peakH = 26 + (i % 3) * 4;
    const peakR = 26 + (i % 2) * 3;
    const petalDome = new THREE.SphereGeometry(peakR, 12, 8, 0, TWO_PI, 0, Math.PI * 0.55);
    petalDome.scale(1.32, peakH / peakR, 0.86);
    petalDome.rotateY(-ang + Math.PI / 2);
    petalDome.translate(px, -2.5, pz);
    lotusPetalGeos.push(petalDome);
  }
  const eightPetalMesh = new THREE.Mesh(mergeAndDispose(lotusPetalGeos), lotusPeakMat);
  eightPetalMesh.receiveShadow = true;
  root.add(eightPetalMesh);

  // ---------------------------------------------------------------- 2. Shared Materials (Strictly ZERO PointLights!)
  const vermilionMat = new THREE.MeshStandardMaterial({
    color: 0xc8281e,
    emissive: 0x3b0a07,
    emissiveIntensity: 0.16,
    roughness: 0.58,
    metalness: 0.08,
  });
  const whitePlasterMat = new THREE.MeshStandardMaterial({
    color: 0xf4f1ea,
    roughness: 0.82,
    metalness: 0.03,
  });
  const cypressRoofMat = new THREE.MeshStandardMaterial({
    color: 0x3b2f28,
    roughness: 0.86,
    metalness: 0.06,
  });
  const darkCedarMat = new THREE.MeshStandardMaterial({
    color: 0x473121,
    roughness: 0.84,
    metalness: 0.05,
  });
  const stonePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x8a8d89,
    roughness: 0.88,
    metalness: 0.06,
  });
  const mossyStoneMat = new THREE.MeshStandardMaterial({
    color: 0x677564,
    roughness: 0.90,
    metalness: 0.04,
  });
  const greenLatticeMat = new THREE.MeshStandardMaterial({
    color: 0x1f6f54,
    roughness: 0.68,
    metalness: 0.10,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.72,
    roughness: 0.26,
    metalness: 0.82,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x5c6b57,
    emissive: 0x1e2923,
    emissiveIntensity: 0.20,
    roughness: 0.45,
    metalness: 0.68,
  });
  const warmShojiMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.55,
    roughness: 0.65,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.45,
    roughness: 0.30,
    toneMapped: false,
  });
  const eternalFlameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.35, 0.32),
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const auraRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.9, 1.45, 0.45),
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const blueSchistMat = new THREE.MeshStandardMaterial({
    color: 0x3b535e,
    roughness: 0.78,
    metalness: 0.14,
  });
  const cloudGraniteMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3cb,
    roughness: 0.85,
    metalness: 0.05,
  });
  const cedarTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3222,
    roughness: 0.92,
  });
  const pineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x2c5834,
    roughness: 0.82,
  });

  disposables.push(
    vermilionMat,
    whitePlasterMat,
    cypressRoofMat,
    darkCedarMat,
    stonePlinthMat,
    mossyStoneMat,
    greenLatticeMat,
    goldMat,
    bronzeMat,
    warmShojiMat,
    lanternGlowMat,
    eternalFlameMat,
    auraRingMat,
    blueSchistMat,
    cloudGraniteMat,
    cedarTrunkMat,
    pineFoliageMat
  );

  const dummy = new THREE.Object3D();

  // ---------------------------------------------------------------- 3. South Daimon Gate (`高野山大門`, local `(0, 88)`) & West Stupa Gate (`(-55, 72)`)
  const gatesGroup = new THREE.Group();
  gatesGroup.name = 'Koyasan_ApproachGates';
  root.add(gatesGroup);

  // 3A. Daimon (`大門`) at local (0, 88) -> Gate to Kyoto Tō-ji
  const daimonGroup = new THREE.Group();
  daimonGroup.name = 'Koyasan_Daimon';
  daimonGroup.position.set(0, getHeight(0, 88), 88);
  gatesGroup.add(daimonGroup);

  const dVermilion = [];
  const dRoof = [];
  const dStone = [];
  const dGold = [];

  // Flanking stone podiums leaving central 5.2m passage open
  for (const s of [-1, 1]) {
    const pBase = new THREE.BoxGeometry(3.8, 0.55, 4.2);
    pBase.translate(s * 4.5, 0.275, 0);
    dStone.push(pBase);

    // 4 vermilion columns per side bay
    for (const dx of [-1.4, 1.4]) {
      for (const dz of [-1.4, 1.4]) {
        const col = new THREE.CylinderGeometry(0.28, 0.32, 6.2, 10);
        col.translate(s * 4.5 + dx, 3.35, dz);
        dVermilion.push(col);
      }
    }

    // Niō guardian lattice cage & muscular vermilion Kongōrikishi (`金剛力士像`) inside
    const nioTorso = new THREE.BoxGeometry(0.95, 1.65, 0.65);
    nioTorso.translate(s * 4.5, 2.2, 0);
    dVermilion.push(nioTorso);
    const nioHead = new THREE.SphereGeometry(0.36, 8, 8);
    nioHead.translate(s * 4.5, 3.3, 0);
    dVermilion.push(nioHead);
    const nioHalo = new THREE.TorusGeometry(0.62, 0.06, 6, 16);
    nioHalo.translate(s * 4.5, 3.2, -0.35);
    dGold.push(nioHalo);

    addBoxCollider(s * 4.5 - 1.8, s * 4.5 + 1.8, 88 - 1.8, 88 + 1.8);
  }

  // Upper lintel & two-tiered Daimon roof spanning across the gate
  const dBeam1 = new THREE.BoxGeometry(13.6, 0.55, 3.6);
  dBeam1.translate(0, 6.2, 0);
  dVermilion.push(dBeam1);

  const dLowerRoof = new THREE.BoxGeometry(15.4, 0.45, 5.2);
  dLowerRoof.translate(0, 6.75, 0);
  dRoof.push(dLowerRoof);

  const dUpperCore = new THREE.BoxGeometry(10.8, 2.1, 3.2);
  dUpperCore.translate(0, 7.9, 0);
  dVermilion.push(dUpperCore);

  const dUpperRoof = new THREE.ConeGeometry(8.8, 2.6, 4);
  dUpperRoof.rotateY(Math.PI / 4);
  dUpperRoof.scale(1.25, 1.0, 0.58);
  dUpperRoof.translate(0, 10.1, 0);
  dRoof.push(dUpperRoof);

  const dRidge = new THREE.BoxGeometry(8.6, 0.32, 0.36);
  dRidge.translate(0, 11.25, 0);
  dGold.push(dRidge);

  daimonGroup.add(
    new THREE.Mesh(mergeAndDispose(dStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(dVermilion), vermilionMat),
    new THREE.Mesh(mergeAndDispose(dRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(dGold), goldMat)
  );

  // 3B. West Return Gate (`local (-55, 72)`) -> Gate back to Boudhanath Stupa
  const westGateGroup = new THREE.Group();
  westGateGroup.name = 'Koyasan_WestReturnGate';
  westGateGroup.position.set(-55, getHeight(-55, 72), 72);
  gatesGroup.add(westGateGroup);

  const wgVerm = [];
  const wgGold = [];
  for (const sz of [-2.2, 2.2]) {
    const post = new THREE.CylinderGeometry(0.26, 0.30, 5.2, 10);
    post.translate(0, 2.6, sz);
    wgVerm.push(post);
    addCircleCollider(-55, 72 + sz, 0.55);
  }
  const kasagi = new THREE.BoxGeometry(0.65, 0.38, 6.4);
  kasagi.translate(0, 5.25, 0);
  wgVerm.push(kasagi);
  const nuki = new THREE.BoxGeometry(0.36, 0.28, 5.4);
  nuki.translate(0, 4.25, 0);
  wgVerm.push(nuki);
  const wgWheel = new THREE.TorusGeometry(0.45, 0.08, 8, 20);
  wgWheel.rotateY(Math.PI / 2);
  wgWheel.translate(0, 5.85, 0);
  wgGold.push(wgWheel);
  westGateGroup.add(
    new THREE.Mesh(mergeAndDispose(wgVerm), vermilionMat),
    new THREE.Mesh(mergeAndDispose(wgGold), goldMat)
  );

  // =========================================================================
  // PRECINCT 1: 壇上伽藍 (DANJŌ GARAN — West Precinct, lx ∈ [-82, -18])
  // =========================================================================
  const garanGroup = new THREE.Group();
  garanGroup.name = 'Koyasan_DanjoGaran';
  root.add(garanGroup);

  // Sacred stone-bordered courtyard paths inside Danjō Garan
  const garanPathGeos = [];
  const pathN2S = new THREE.BoxGeometry(3.8, 0.06, 58);
  pathN2S.translate(-50, 0.03, 12);
  garanPathGeos.push(pathN2S);
  const pathE2W = new THREE.BoxGeometry(36, 0.06, 3.8);
  pathE2W.translate(-48, 0.03, 6);
  garanPathGeos.push(pathE2W);
  const garanPathMesh = new THREE.Mesh(mergeAndDispose(garanPathGeos), stonePlinthMat);
  garanPathMesh.receiveShadow = true;
  garanGroup.add(garanPathMesh);

  // ---------------------------------------------------------------- 4A. 中門 (Chūmon) at local (-50, 42) with Four Heavenly Kings (`四天王`)
  const chumonGroup = new THREE.Group();
  chumonGroup.name = 'DanjoGaran_Chumon';
  chumonGroup.position.set(-50, getHeight(-50, 42), 42);
  garanGroup.add(chumonGroup);

  const cmStone = [];
  const cmVerm = [];
  const cmWhite = [];
  const cmRoof = [];
  const cmGold = [];
  const cmGreen = [];

  // Two side stone plinths leaving central 4.4m portal open for player passage
  for (const s of [-1, 1]) {
    const plinth = new THREE.BoxGeometry(4.2, 0.6, 5.4);
    plinth.translate(s * 4.3, 0.3, 0);
    cmStone.push(plinth);

    // Side bay white plaster & green lattice enclosures housing the Four Heavenly Kings (四天王)
    const wallCore = new THREE.BoxGeometry(3.2, 3.6, 3.6);
    wallCore.translate(s * 4.3, 2.4, 0);
    cmWhite.push(wallCore);

    const latticeF = new THREE.BoxGeometry(2.6, 2.4, 3.82);
    latticeF.translate(s * 4.3, 2.5, 0);
    cmGreen.push(latticeF);

    // 6 vermilion columns per side wing
    for (const px of [-1.7, 0, 1.7]) {
      for (const pz of [-2.0, 2.0]) {
        const col = new THREE.CylinderGeometry(0.24, 0.27, 4.6, 10);
        col.translate(s * 4.3 + px, 2.6, pz);
        cmVerm.push(col);
      }
    }

    // Four Heavenly Kings Statues (`四天王：持國天・多聞天・增長天・廣目天`) — 2 in left wing (front/back), 2 in right wing (front/back)
    for (const fz of [-1.1, 1.1]) {
      const ped = new THREE.CylinderGeometry(0.46, 0.54, 0.36, 8);
      ped.translate(s * 4.3, 0.78, fz);
      cmStone.push(ped);

      const armorBody = new THREE.CylinderGeometry(0.32, 0.40, 1.45, 8);
      armorBody.translate(s * 4.3, 1.68, fz);
      cmVerm.push(armorBody);

      const shoulder = new THREE.BoxGeometry(0.88, 0.28, 0.44);
      shoulder.translate(s * 4.3, 2.22, fz);
      cmGold.push(shoulder);

      const head = new THREE.SphereGeometry(0.24, 8, 8);
      head.translate(s * 4.3, 2.62, fz);
      cmGold.push(head);

      // Guardian halberd / pagoda-spear / sword held upright
      const weapon = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6);
      weapon.translate(s * 4.3 - s * 0.45, 2.1, fz);
      cmGold.push(weapon);
    }

    addBoxCollider(-50 + s * 4.3 - 2.0, -50 + s * 4.3 + 2.0, 42 - 2.4, 42 + 2.4);
  }

  // Chūmon lower eaves, upper story (`五間三戶樓門`), and hip-and-gable cypress-bark roof
  const cmLowerEave = new THREE.BoxGeometry(14.2, 0.42, 6.6);
  cmLowerEave.translate(0, 5.0, 0);
  cmRoof.push(cmLowerEave);

  const cmBalcony = new THREE.BoxGeometry(12.2, 0.45, 4.8);
  cmBalcony.translate(0, 5.45, 0);
  cmVerm.push(cmBalcony);

  const cmUpperStory = new THREE.BoxGeometry(10.6, 2.3, 3.8);
  cmUpperStory.translate(0, 6.75, 0);
  cmVerm.push(cmUpperStory);

  const cmUpperPlaster = new THREE.BoxGeometry(9.8, 1.8, 3.92);
  cmUpperPlaster.translate(0, 6.75, 0);
  cmWhite.push(cmUpperPlaster);

  const cmMainRoof = new THREE.ConeGeometry(9.2, 2.8, 4);
  cmMainRoof.rotateY(Math.PI / 4);
  cmMainRoof.scale(1.25, 1.0, 0.62);
  cmMainRoof.translate(0, 9.1, 0);
  cmRoof.push(cmMainRoof);

  const cmRidge = new THREE.BoxGeometry(9.4, 0.32, 0.36);
  cmRidge.translate(0, 10.35, 0);
  cmGold.push(cmRidge);

  chumonGroup.add(
    new THREE.Mesh(mergeAndDispose(cmStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(cmVerm), vermilionMat),
    new THREE.Mesh(mergeAndDispose(cmWhite), whitePlasterMat),
    new THREE.Mesh(mergeAndDispose(cmGreen), greenLatticeMat),
    new THREE.Mesh(mergeAndDispose(cmRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(cmGold), goldMat)
  );

  // ---------------------------------------------------------------- 4B. 根本大塔 (Konpon Daitō) at local (-62, 6) — Monumental 25m Tahōtō & 3D Two-Realm Mandala
  const daitoGroup = new THREE.Group();
  daitoGroup.name = 'DanjoGaran_KonponDaito';
  daitoGroup.position.set(-62, getHeight(-62, 6), 6);
  garanGroup.add(daitoGroup);

  const dtStone = [];
  const dtVerm = [];
  const dtWhite = [];
  const dtGreen = [];
  const dtRoof = [];
  const dtGold = [];

  // 1. Stone Plinth (`石積基壇`, 14m × 14m, height 1.4m) with 4 cardinal staircases
  const basePlinth = new THREE.BoxGeometry(14.0, 1.4, 14.0);
  basePlinth.translate(0, 0.7, 0);
  dtStone.push(basePlinth);

  const plinthTrim = new THREE.BoxGeometry(14.3, 0.18, 14.3);
  plinthTrim.translate(0, 1.35, 0);
  dtStone.push(plinthTrim);

  for (let dir = 0; dir < 4; dir++) {
    const isNS = dir % 2 === 0;
    const sign = dir < 2 ? 1 : -1;
    for (let st = 0; st < 6; st++) {
      const stepH = 0.22;
      const stepY = (st + 0.5) * stepH;
      const dist = 7.2 + (5 - st) * 0.38;
      const stepGeo = isNS
        ? new THREE.BoxGeometry(3.4, stepH, 0.42)
        : new THREE.BoxGeometry(0.42, stepH, 3.4);
      if (isNS) stepGeo.translate(0, stepY, sign * dist);
      else stepGeo.translate(sign * dist, stepY, 0);
      dtStone.push(stepGeo);
    }
  }

  // 2. Lower Square Story (`下層方堂`, 11.2m × 11.2m, y = 1.4..8.2m)
  // Perimeter vermilion veranda & balustrade (`高欄`)
  const verandaFloor = new THREE.BoxGeometry(12.8, 0.24, 12.8);
  verandaFloor.translate(0, 1.52, 0);
  dtVerm.push(verandaFloor);

  // 16 outer perimeter vermilion pillars along the 4 faces of the 11.2m square
  const pillarCoords = [-5.4, -2.0, 2.0, 5.4];
  for (const px of pillarCoords) {
    for (const pz of pillarCoords) {
      if (Math.abs(px) < 5.0 && Math.abs(pz) < 5.0) continue; // perimeter only
      const pCol = new THREE.CylinderGeometry(0.30, 0.34, 6.8, 12);
      pCol.translate(px, 1.4 + 3.4, pz);
      dtVerm.push(pCol);
    }
  }

  // Corner bay white plaster walls (`白漆喰壁`) & green lattice windows (`連子窓`), leaving 4 cardinal portals (`[-1.7, 1.7]`) open!
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // X-aligned corner wall panel
      const wallX = new THREE.BoxGeometry(3.4, 6.2, 0.36);
      wallX.translate(sx * 3.7, 1.4 + 3.1, sz * 5.35);
      dtWhite.push(wallX);

      const winX = new THREE.BoxGeometry(1.9, 2.8, 0.42);
      winX.translate(sx * 3.7, 1.4 + 3.3, sz * 5.35);
      dtGreen.push(winX);

      // Z-aligned corner wall panel
      const wallZ = new THREE.BoxGeometry(0.36, 6.2, 3.4);
      wallZ.translate(sx * 5.35, 1.4 + 3.1, sz * 3.7);
      dtWhite.push(wallZ);

      const winZ = new THREE.BoxGeometry(0.42, 2.8, 1.9);
      winZ.translate(sx * 5.35, 1.4 + 3.3, sz * 3.7);
      dtGreen.push(winZ);
    }
  }

  // Upper lintel beams above the 4 cardinal portals
  for (const s of [-1, 1]) {
    const lintelNS = new THREE.BoxGeometry(11.4, 1.2, 0.48);
    lintelNS.translate(0, 1.4 + 6.2, s * 5.35);
    dtVerm.push(lintelNS);

    const lintelEW = new THREE.BoxGeometry(0.48, 1.2, 11.4);
    lintelEW.translate(s * 5.35, 1.4 + 6.2, 0);
    dtVerm.push(lintelEW);
  }

  // 3. Lower Four-Sided Sweeping Roof (`下層屋根`, 16.0m × 16.0m around y = 8.0..10.2m)
  const lowerRoofBase = new THREE.BoxGeometry(15.8, 0.48, 15.8);
  lowerRoofBase.translate(0, 8.35, 0);
  dtRoof.push(lowerRoofBase);

  const lowerRoofSlope = new THREE.CylinderGeometry(5.6, 11.4, 1.9, 4);
  lowerRoofSlope.rotateY(Math.PI / 4);
  lowerRoofSlope.translate(0, 9.35, 0);
  dtRoof.push(lowerRoofSlope);

  // Vermilion under-eave rafters & crisp white-painted rafter tips (`二軒繁垂木・木口白塗`)
  const lowerRafterRim = new THREE.BoxGeometry(15.2, 0.26, 15.2);
  lowerRafterRim.translate(0, 8.05, 0);
  dtVerm.push(lowerRafterRim);

  const lowerWhiteTips = new THREE.BoxGeometry(15.5, 0.12, 15.5);
  lowerWhiteTips.translate(0, 8.20, 0);
  dtWhite.push(lowerWhiteTips);

  // Front Octagonal-Base Bronze Lantern (`大塔前銅燈籠`) standing at the south approach (`z = +9.6`)
  const daitoLanternBase = new THREE.CylinderGeometry(0.42, 0.56, 0.45, 8);
  daitoLanternBase.translate(0, 0.225, 9.6);
  dtStone.push(daitoLanternBase);
  const daitoLanternPost = new THREE.CylinderGeometry(0.12, 0.15, 1.55, 8);
  daitoLanternPost.translate(0, 1.22, 9.6);
  dtGold.push(daitoLanternPost);
  const daitoLanternChamber = new THREE.CylinderGeometry(0.32, 0.28, 0.48, 6);
  daitoLanternChamber.translate(0, 2.20, 9.6);
  dtGold.push(daitoLanternChamber);
  const daitoLanternRoof = new THREE.ConeGeometry(0.58, 0.36, 6);
  daitoLanternRoof.translate(0, 2.62, 9.6);
  dtRoof.push(daitoLanternRoof);

  // 4. White Dome-Like Plaster Collar (`龜腹 / Kamebara`, y = 9.8..11.9m) — signature Tahōtō transition!
  const kamebaraBase = new THREE.CylinderGeometry(4.4, 5.2, 1.15, 24);
  kamebaraBase.translate(0, 10.45, 0);
  dtWhite.push(kamebaraBase);

  const kamebaraDome = new THREE.SphereGeometry(4.5, 24, 12, 0, TWO_PI, 0, Math.PI * 0.46);
  kamebaraDome.scale(1.0, 0.48, 1.0);
  kamebaraDome.translate(0, 10.55, 0);
  dtWhite.push(kamebaraDome);

  // 5. Upper Cylindrical Core (`上層圓堂`, radius 3.8m, y = 11.5..14.8m) with vermilion balcony & bracket complex
  const upperBalcony = new THREE.CylinderGeometry(4.55, 4.55, 0.36, 20);
  upperBalcony.translate(0, 11.55, 0);
  dtVerm.push(upperBalcony);

  const upperCore = new THREE.CylinderGeometry(3.75, 3.82, 3.2, 20);
  upperCore.translate(0, 13.15, 0);
  dtVerm.push(upperCore);

  const upperPlasterBand = new THREE.CylinderGeometry(3.84, 3.84, 1.65, 20);
  upperPlasterBand.translate(0, 13.05, 0);
  dtWhite.push(upperPlasterBand);

  // 12 upper cylindrical vermilion engaged columns & bracket ring
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TWO_PI;
    const uCol = new THREE.CylinderGeometry(0.18, 0.18, 3.1, 8);
    uCol.translate(Math.cos(a) * 3.86, 13.15, Math.sin(a) * 3.86);
    dtVerm.push(uCol);
  }
  const upperBracketRing = new THREE.CylinderGeometry(4.35, 3.9, 0.55, 20);
  upperBracketRing.translate(0, 14.65, 0);
  dtVerm.push(upperBracketRing);

  // 6. Upper Pyramidal Roof (`上層宝形屋根`, y = 14.8..17.6m) with white-painted rafter tips (`木口白塗`)
  const upperWhiteTips = new THREE.BoxGeometry(11.4, 0.12, 11.4);
  upperWhiteTips.translate(0, 14.82, 0);
  dtWhite.push(upperWhiteTips);

  const upperRoofEave = new THREE.BoxGeometry(11.8, 0.38, 11.8);
  upperRoofEave.translate(0, 15.0, 0);
  dtRoof.push(upperRoofEave);

  const upperPyramid = new THREE.ConeGeometry(8.4, 2.75, 4);
  upperPyramid.rotateY(Math.PI / 4);
  upperPyramid.translate(0, 16.45, 0);
  dtRoof.push(upperPyramid);

  // 4 golden corner wind bells (`風鐸`) on lower and upper roofs + 4 diagonal Sōrin wind chains (`風鎖`)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const bell1 = new THREE.ConeGeometry(0.18, 0.42, 6);
      bell1.translate(sx * 7.5, 7.85, sz * 7.5);
      dtGold.push(bell1);
      const bell2 = new THREE.ConeGeometry(0.16, 0.38, 6);
      bell2.translate(sx * 5.6, 14.65, sz * 5.6);
      dtGold.push(bell2);

      // Diagonal wind chain from Sōrin top (`y = 23.8`) to upper roof corner (`(±5.6, 15.1, ±5.6)`)
      const chainLen = 11.8;
      const chain = new THREE.CylinderGeometry(0.03, 0.03, chainLen, 6);
      chain.rotateZ(sx * 0.52);
      chain.rotateX(-sz * 0.52);
      chain.translate(sx * 2.8, 19.4, sz * 2.8);
      dtGold.push(chain);
    }
  }

  // 7. Tall Golden-Bronze Finial (`相輪 / Sōrin`, y = 17.5..25.0m)
  // Dew basin (露盤), inverted bowl (覆鉢), lotus petal base (受花)
  const roban = new THREE.BoxGeometry(1.75, 0.38, 1.75);
  roban.translate(0, 17.65, 0);
  dtGold.push(roban);

  const fukubachi = new THREE.SphereGeometry(0.76, 12, 8, 0, TWO_PI, 0, Math.PI * 0.55);
  fukubachi.translate(0, 17.84, 0);
  dtGold.push(fukubachi);

  const ukebana = new THREE.CylinderGeometry(0.68, 0.46, 0.28, 12);
  ukebana.translate(0, 18.42, 0);
  dtGold.push(ukebana);

  // Central spire shaft (擦管) from y = 18.4 to 24.6m
  const sorinShaft = new THREE.CylinderGeometry(0.14, 0.22, 6.2, 10);
  sorinShaft.translate(0, 21.5, 0);
  dtGold.push(sorinShaft);

  // Nine Rings (`九輪`: 9 stacked golden torus rings)
  for (let rIdx = 0; rIdx < 9; rIdx++) {
    const ringY = 18.85 + rIdx * 0.36;
    const ringR = 0.58 - rIdx * 0.022;
    const kurin = new THREE.TorusGeometry(ringR, 0.065, 6, 16);
    kurin.rotateX(Math.PI / 2);
    kurin.translate(0, ringY, 0);
    dtGold.push(kurin);
  }

  // Water-flame filigree (`水煙`: 4 directional golden flame plates at y = 22.5..23.7m)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TWO_PI + Math.PI / 4;
    const suien = new THREE.BoxGeometry(0.95, 1.15, 0.06);
    suien.rotateY(a);
    suien.translate(Math.cos(a) * 0.42, 23.0, Math.sin(a) * 0.42);
    dtGold.push(suien);
  }

  // Dragon Vehicle (`龍車`) & Sacred Jewel (`寶珠` at y = 24.8m)
  const ryusha = new THREE.SphereGeometry(0.28, 10, 8);
  ryusha.translate(0, 24.05, 0);
  dtGold.push(ryusha);

  const hoju = new THREE.SphereGeometry(0.42, 12, 10);
  hoju.scale(0.9, 1.3, 0.9);
  hoju.translate(0, 24.75, 0);
  dtGold.push(hoju);

  // 8. Interior Three-Dimensional Two-Realm Mandala (`立體兩界曼荼羅`) inside Konpon Daitō (`y = 1.4..6.8m`)
  // Central octagonal Sumeru altar (`須彌壇`)
  const sumeruBase = new THREE.CylinderGeometry(2.35, 2.65, 0.72, 8);
  sumeruBase.translate(0, 1.4 + 0.36, 0);
  dtGold.push(sumeruBase);

  const lotusSeat = new THREE.CylinderGeometry(1.45, 1.15, 0.42, 12);
  lotusSeat.translate(0, 1.4 + 0.92, 0);
  dtGold.push(lotusSeat);

  // Central Womb-Realm Mahāvairocana (`胎藏界大日如來`, seated height ~2.8m)
  const dainichiLegs = new THREE.CylinderGeometry(1.1, 1.28, 0.55, 10);
  dainichiLegs.translate(0, 1.4 + 1.38, 0);
  dtGold.push(dainichiLegs);

  const dainichiTorso = new THREE.CylinderGeometry(0.58, 0.82, 1.35, 10);
  dainichiTorso.translate(0, 1.4 + 2.25, 0);
  dtGold.push(dainichiTorso);

  const dainichiHead = new THREE.SphereGeometry(0.44, 12, 10);
  dainichiHead.translate(0, 1.4 + 3.25, 0);
  dtGold.push(dainichiHead);

  const fiveWisdomCrown = new THREE.ConeGeometry(0.46, 0.58, 8);
  fiveWisdomCrown.translate(0, 1.4 + 3.78, 0);
  dtGold.push(fiveWisdomCrown);

  // Double-ringed golden mandorla halo (`大日如來光背`)
  const innerHalo = new THREE.TorusGeometry(1.15, 0.08, 8, 24);
  innerHalo.translate(0, 1.4 + 2.65, -0.45);
  dtGold.push(innerHalo);
  const outerHalo = new THREE.TorusGeometry(1.85, 0.11, 8, 28);
  outerHalo.translate(0, 1.4 + 2.55, -0.55);
  dtGold.push(outerHalo);

  // Four Diamond-Realm Buddhas (`金剛界四佛：阿閦・寶生・阿彌陀・不空成就`) at the 4 inner intercardinal corners
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const bx = sx * 2.25;
      const bz = sz * 2.25;
      const bPed = new THREE.CylinderGeometry(0.68, 0.78, 0.55, 8);
      bPed.translate(bx, 1.4 + 0.28, bz);
      dtGold.push(bPed);

      const bBody = new THREE.CylinderGeometry(0.34, 0.50, 0.95, 8);
      bBody.translate(bx, 1.4 + 1.02, bz);
      dtGold.push(bBody);

      const bHead = new THREE.SphereGeometry(0.26, 10, 8);
      bHead.translate(bx, 1.4 + 1.72, bz);
      dtGold.push(bHead);

      const bCrown = new THREE.ConeGeometry(0.26, 0.34, 6);
      bCrown.translate(bx, 1.4 + 2.04, bz);
      dtGold.push(bCrown);
    }
  }

  // 16 Great Bodhisattva Pillars (`十六大菩薩堂柱`: 4 inner core pillars + 12 ring pillars with golden mandala bands)
  const bodhisattvaPillarCoords = [
    [-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85],
    [-3.8, -3.8], [0, -3.8], [3.8, -3.8],
    [-3.8, 0], [3.8, 0],
    [-3.8, 3.8], [0, 3.8], [3.8, 3.8],
    [-4.6, -1.85], [4.6, -1.85], [-4.6, 1.85], [4.6, 1.85],
  ];
  for (const [px, pz] of bodhisattvaPillarCoords) {
    const pShaft = new THREE.CylinderGeometry(0.22, 0.24, 6.2, 10);
    pShaft.translate(px, 1.4 + 3.1, pz);
    dtVerm.push(pShaft);

    // Golden painted Bodhisattva portrait band (`菩薩聖像金彩帶`)
    const pGoldBand = new THREE.CylinderGeometry(0.25, 0.25, 2.2, 10);
    pGoldBand.translate(px, 1.4 + 2.8, pz);
    dtGold.push(pGoldBand);
  }

  const daitoFallbackGroup = new THREE.Group();
  daitoFallbackGroup.name = 'DanjoGaran_KonponDaito_Fallback';
  daitoFallbackGroup.add(
    new THREE.Mesh(mergeAndDispose(dtStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(dtVerm), vermilionMat),
    new THREE.Mesh(mergeAndDispose(dtWhite), whitePlasterMat),
    new THREE.Mesh(mergeAndDispose(dtGreen), greenLatticeMat),
    new THREE.Mesh(mergeAndDispose(dtRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(dtGold), goldMat)
  );
  daitoGroup.add(daitoFallbackGroup);

  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    const loader = new GLTFLoader();
    loader.load(
      '/models/kukai/konpon_daito.glb',
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        daitoGroup.add(model);
        daitoFallbackGroup.visible = false;
      },
      undefined,
      () => {}
    );
  }
  addBoxCollider(-62 - 6.6, -62 + 6.6, 6 - 6.6, 6 + 6.6);

  // Rotating golden Mandala floor ring around Konpon Daitō
  const daitoMandalaRing = new THREE.Mesh(new THREE.RingGeometry(7.6, 8.3, 48), auraRingMat);
  daitoMandalaRing.rotation.x = -Math.PI / 2;
  daitoMandalaRing.position.set(0, 0.06, 0);
  daitoGroup.add(daitoMandalaRing);

  // ---------------------------------------------------------------- 4C. 金堂 (Kondō — Grand Main Hall) at local (-34, 8)
  const kondoGroup = new THREE.Group();
  kondoGroup.name = 'DanjoGaran_Kondo';
  kondoGroup.position.set(-34, getHeight(-34, 8), 8);
  garanGroup.add(kondoGroup);

  const kdStone = [];
  const kdVerm = [];
  const kdWhite = [];
  const kdGreen = [];
  const kdRoof = [];
  const kdGold = [];

  // Stone podium (15.6m × 13.6m, height 1.2m) + south steps
  const kdPodium = new THREE.BoxGeometry(15.6, 1.2, 13.6);
  kdPodium.translate(0, 0.6, 0);
  kdStone.push(kdPodium);
  for (let st = 0; st < 5; st++) {
    const step = new THREE.BoxGeometry(4.2, 0.24, 0.45);
    step.translate(0, (st + 0.5) * 0.24, 6.8 + (4 - st) * 0.42);
    kdStone.push(step);
  }

  // Main Hall walls & vermilion colonnade (14m × 12m, height 5.6m on podium)
  const kdCore = new THREE.BoxGeometry(12.8, 5.2, 10.6);
  kdCore.translate(0, 1.2 + 2.6, 0);
  kdWhite.push(kdCore);

  for (let ix = -3; ix <= 3; ix++) {
    for (const sz of [-5.5, 5.5]) {
      const col = new THREE.CylinderGeometry(0.24, 0.27, 5.4, 10);
      col.translate(ix * 2.0, 1.2 + 2.7, sz);
      kdVerm.push(col);
    }
  }
  for (let iz = -2; iz <= 2; iz++) {
    for (const sx of [-6.5, 6.5]) {
      const col = new THREE.CylinderGeometry(0.24, 0.27, 5.4, 10);
      col.translate(sx, 1.2 + 2.7, iz * 2.2);
      kdVerm.push(col);
    }
  }

  // Green lattice windows & warm inner Yakushi Nyorai altar glow
  const kdLattice = new THREE.BoxGeometry(10.4, 2.4, 10.85);
  kdLattice.translate(0, 1.2 + 2.9, 0);
  kdGreen.push(kdLattice);

  const kdAltarStatue = new THREE.CylinderGeometry(0.65, 0.95, 2.6, 10);
  kdAltarStatue.translate(0, 1.2 + 2.2, 4.6);
  kdGold.push(kdAltarStatue);

  // Two-tier hip-and-gable cypress-bark roof (`入母屋造檜皮葺`, total height ~10.8m)
  const kdLowerEave = new THREE.BoxGeometry(16.8, 0.45, 14.8);
  kdLowerEave.translate(0, 6.6, 0);
  kdRoof.push(kdLowerEave);

  const kdUpperRoof = new THREE.ConeGeometry(10.8, 3.8, 4);
  kdUpperRoof.rotateY(Math.PI / 4);
  kdUpperRoof.scale(1.18, 1.0, 0.98);
  kdUpperRoof.translate(0, 8.7, 0);
  kdRoof.push(kdUpperRoof);

  const kdMainRidge = new THREE.BoxGeometry(9.2, 0.38, 0.44);
  kdMainRidge.translate(0, 10.55, 0);
  kdGold.push(kdMainRidge);

  kondoGroup.add(
    new THREE.Mesh(mergeAndDispose(kdStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(kdVerm), vermilionMat),
    new THREE.Mesh(mergeAndDispose(kdWhite), whitePlasterMat),
    new THREE.Mesh(mergeAndDispose(kdGreen), greenLatticeMat),
    new THREE.Mesh(mergeAndDispose(kdRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(kdGold), goldMat)
  );
  addBoxCollider(-34 - 7.5, -34 + 7.5, 8 - 6.5, 8 + 6.5);

  // ---------------------------------------------------------------- 4D. 御影堂 (Miedō) at local (-50, -18) & 三鈷松 (Sanko-no-Matsu) at local (-44, -6)
  const miedoGroup = new THREE.Group();
  miedoGroup.name = 'DanjoGaran_Miedo';
  miedoGroup.position.set(-50, getHeight(-50, -18), -18);
  garanGroup.add(miedoGroup);

  const mdStone = [];
  const mdCedar = [];
  const mdRoof = [];
  const mdGold = [];
  const mdLanterns = [];

  // Stone base & wooden veranda (`廻縁`, 9.5m × 9.5m)
  const mdBase = new THREE.BoxGeometry(10.2, 0.75, 10.2);
  mdBase.translate(0, 0.375, 0);
  mdStone.push(mdBase);

  const mdVeranda = new THREE.BoxGeometry(9.8, 0.22, 9.8);
  mdVeranda.translate(0, 0.86, 0);
  mdCedar.push(mdVeranda);

  const mdWalls = new THREE.BoxGeometry(7.8, 3.6, 7.8);
  mdWalls.translate(0, 2.75, 0);
  mdCedar.push(mdWalls);

  // Pyramidal cypress-bark roof (`宝形造檜皮葺`) with sacred bronze/gold jewel finial
  const mdEave = new THREE.BoxGeometry(11.6, 0.36, 11.6);
  mdEave.translate(0, 4.65, 0);
  mdRoof.push(mdEave);

  const mdPyramid = new THREE.ConeGeometry(8.2, 3.4, 4);
  mdPyramid.rotateY(Math.PI / 4);
  mdPyramid.translate(0, 6.5, 0);
  mdRoof.push(mdPyramid);

  const mdJewel = new THREE.SphereGeometry(0.36, 10, 8);
  mdJewel.scale(0.9, 1.3, 0.9);
  mdJewel.translate(0, 8.35, 0);
  mdGold.push(mdJewel);

  // 8 Hanging bronze lanterns (`釣燈籠`) around Miedō eaves
  for (const lxOff of [-3.6, -1.2, 1.2, 3.6]) {
    for (const lzOff of [-4.6, 4.6]) {
      const lampCore = new THREE.CylinderGeometry(0.16, 0.16, 0.32, 6);
      lampCore.translate(lxOff, 4.15, lzOff);
      mdLanterns.push(lampCore);
    }
  }

  miedoGroup.add(
    new THREE.Mesh(mergeAndDispose(mdStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(mdCedar), darkCedarMat),
    new THREE.Mesh(mergeAndDispose(mdRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(mdGold), goldMat),
    new THREE.Mesh(mergeAndDispose(mdLanterns), lanternGlowMat)
  );
  addBoxCollider(-50 - 4.8, -50 + 4.8, -18 - 4.8, -18 + 4.8);

  // Sanko-no-Matsu (`三鈷松` — Three-Pronged Vajra Pine) at local (-44, -6)
  const sankoGroup = new THREE.Group();
  sankoGroup.name = 'DanjoGaran_SankoNoMatsu';
  sankoGroup.position.set(-44, getHeight(-44, -6), -6);
  garanGroup.add(sankoGroup);

  const skStone = [];
  const skTrunk = [];
  const skPine = [];

  // Octagonal stone fence (`玉垣`) around the sacred pine
  const fenceRing = new THREE.CylinderGeometry(2.5, 2.6, 0.42, 8);
  fenceRing.translate(0, 0.21, 0);
  skStone.push(fenceRing);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    const post = new THREE.BoxGeometry(0.22, 0.95, 0.22);
    post.translate(Math.cos(a) * 2.35, 0.55, Math.sin(a) * 2.35);
    skStone.push(post);
  }

  // Gnarled ancient pine trunk & sweeping horizontal boughs
  const mainTrunk = new THREE.CylinderGeometry(0.32, 0.52, 5.2, 8);
  mainTrunk.rotateZ(0.08);
  mainTrunk.translate(0, 2.6, 0);
  skTrunk.push(mainTrunk);

  const bough1 = new THREE.CylinderGeometry(0.16, 0.24, 3.2, 7);
  bough1.rotateZ(-0.95);
  bough1.translate(1.2, 3.8, 0.4);
  skTrunk.push(bough1);

  const bough2 = new THREE.CylinderGeometry(0.15, 0.22, 2.8, 7);
  bough2.rotateZ(0.88);
  bough2.translate(-1.1, 4.4, -0.3);
  skTrunk.push(bough2);

  // Multi-tiered pine foliage pads
  const padDefs = [
    [0, 5.8, 0, 2.4, 1.3],
    [1.8, 4.4, 0.5, 1.85, 1.0],
    [-1.6, 4.9, -0.4, 1.75, 1.0],
    [0.6, 6.8, -0.3, 1.65, 1.0],
  ];
  for (const [px, py, pz, r, h] of padDefs) {
    const pad = new THREE.ConeGeometry(r, h, 9);
    pad.translate(px, py, pz);
    skPine.push(pad);
  }

  sankoGroup.add(
    new THREE.Mesh(mergeAndDispose(skStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(skTrunk), cedarTrunkMat),
    new THREE.Mesh(mergeAndDispose(skPine), pineFoliageMat)
  );

  // Radiant Golden Three-Pronged Vajra (`三鈷杵`) gleaming in the branches of Sanko-no-Matsu!
  const sankoVajraGroup = new THREE.Group();
  sankoVajraGroup.name = 'SankoNoMatsu_GoldenVajra';
  sankoVajraGroup.position.set(1.35, 4.15, 0.45);
  sankoGroup.add(sankoVajraGroup);

  const vjParts = [];
  const vjGrip = new THREE.CylinderGeometry(0.08, 0.08, 1.15, 8);
  vjParts.push(vjGrip);
  const vjHub = new THREE.SphereGeometry(0.15, 8, 8);
  vjParts.push(vjHub);
  for (const endDir of [-1, 1]) {
    // Central prong
    const cProng = new THREE.ConeGeometry(0.06, 0.48, 6);
    if (endDir < 0) cProng.rotateX(Math.PI);
    cProng.translate(0, endDir * 0.72, 0);
    vjParts.push(cProng);
    // Flanking curved prongs (making 3 prongs on each end = 三鈷杵)
    for (const side of [-1, 1]) {
      const fProng = new THREE.TorusGeometry(0.24, 0.04, 6, 12, Math.PI * 0.85);
      fProng.rotateZ(endDir > 0 ? -Math.PI * 0.42 : Math.PI * 0.58);
      fProng.translate(side * 0.12, endDir * 0.62, 0);
      vjParts.push(fProng);
    }
  }
  const sankoVajraMesh = new THREE.Mesh(mergeAndDispose(vjParts), goldMat);
  sankoVajraMesh.rotation.z = Math.PI * 0.25;
  sankoVajraGroup.add(sankoVajraMesh);

  const sankoAuraRing = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.95, 32), auraRingMat);
  sankoAuraRing.rotation.x = -Math.PI / 2;
  sankoAuraRing.position.set(0, 0.08, 0);
  sankoGroup.add(sankoAuraRing);
  addCircleCollider(-44, -6, 2.4);

  // =========================================================================
  // PRECINCT 2: 金剛峯寺 (KONGŌBU-JI — Center Precinct, lx ∈ [-22, 24])
  // =========================================================================
  const kongobujiGroup = new THREE.Group();
  kongobujiGroup.name = 'Koyasan_Kongobuji';
  root.add(kongobujiGroup);

  // ---------------------------------------------------------------- 5A. 正門 (Seimon) at local (0, 26) & Five-Line Imperial Walls (`五本線築地塀`)
  const seimonGroup = new THREE.Group();
  seimonGroup.name = 'Kongobuji_Seimon';
  seimonGroup.position.set(0, getHeight(0, 26), 26);
  kongobujiGroup.add(seimonGroup);

  const smTimber = [];
  const smRoof = [];
  const smWall = [];
  const smGold = [];

  for (const sx of [-2.4, 2.4]) {
    const mainPost = new THREE.BoxGeometry(0.46, 4.6, 0.46);
    mainPost.translate(sx, 2.3, 0);
    smTimber.push(mainPost);
    for (const sz of [-1.2, 1.2]) {
      const subPost = new THREE.CylinderGeometry(0.18, 0.20, 4.2, 8);
      subPost.translate(sx, 2.1, sz);
      smTimber.push(subPost);
    }
    // Flanking white earthen walls (`築地塀`)
    const wingWall = new THREE.BoxGeometry(6.8, 2.6, 0.55);
    wingWall.translate(sx + Math.sign(sx) * 3.6, 1.3, 0);
    smWall.push(wingWall);

    const wingCap = new THREE.BoxGeometry(7.2, 0.35, 0.95);
    wingCap.translate(sx + Math.sign(sx) * 3.6, 2.72, 0);
    smRoof.push(wingCap);

    addBoxCollider(
      sx > 0 ? 2.1 : -9.4,
      sx > 0 ? 9.4 : -2.1,
      26 - 0.8,
      26 + 0.8
    );
  }

  const smLintel = new THREE.BoxGeometry(6.2, 0.42, 0.52);
  smLintel.translate(0, 4.35, 0);
  smTimber.push(smLintel);

  const smMainRoof = new THREE.ConeGeometry(5.2, 2.1, 4);
  smMainRoof.rotateY(Math.PI / 4);
  smMainRoof.scale(1.35, 1.0, 0.72);
  smMainRoof.translate(0, 5.5, 0);
  smRoof.push(smMainRoof);

  const smCrest = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 12);
  smCrest.rotateX(Math.PI / 2);
  smCrest.translate(0, 4.35, 0.30);
  smGold.push(smCrest);

  seimonGroup.add(
    new THREE.Mesh(mergeAndDispose(smTimber), darkCedarMat),
    new THREE.Mesh(mergeAndDispose(smWall), whitePlasterMat),
    new THREE.Mesh(mergeAndDispose(smRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(smGold), goldMat)
  );

  // ---------------------------------------------------------------- 5B. 金剛峯寺主殿 (Main Hall / Omo-ya) at local (0, 2) with Rooftop Water Tubs (`天水桶`)
  const omoyaGroup = new THREE.Group();
  omoyaGroup.name = 'Kongobuji_MainHall';
  omoyaGroup.position.set(0, getHeight(0, 2), 2);
  kongobujiGroup.add(omoyaGroup);

  const omStone = [];
  const omTimber = [];
  const omWhite = [];
  const omShoji = [];
  const omRoof = [];
  const omGold = [];

  // Stone foundation & wooden veranda (`縁側`, 22m × 15m)
  const omBase = new THREE.BoxGeometry(22.4, 0.85, 15.4);
  omBase.translate(0, 0.425, 0);
  omStone.push(omBase);

  const omVeranda = new THREE.BoxGeometry(23.2, 0.24, 16.2);
  omVeranda.translate(0, 0.92, 0);
  omTimber.push(omVeranda);

  // White plaster core & warm glowing shōji screens (`障子`)
  const omCore = new THREE.BoxGeometry(20.6, 4.6, 13.6);
  omCore.translate(0, 3.25, 0);
  omWhite.push(omCore);

  const omScreens = new THREE.BoxGeometry(18.8, 3.2, 13.78);
  omScreens.translate(0, 3.15, 0);
  omShoji.push(omScreens);

  // Perimeter hinoki/cedar columns along the veranda
  for (let ix = -5; ix <= 5; ix++) {
    for (const sz of [-7.4, 7.4]) {
      const col = new THREE.BoxGeometry(0.28, 4.8, 0.28);
      col.translate(ix * 2.1, 3.3, sz);
      omTimber.push(col);
    }
  }

  // Grand Entrance Porch (`大玄關`) with curved Karahafu (`唐破風`) roof on south facade (+Z)
  const porchFloor = new THREE.BoxGeometry(5.6, 0.65, 3.8);
  porchFloor.translate(-3.2, 0.325, 8.8);
  omStone.push(porchFloor);

  for (const px of [-5.4, -1.0]) {
    const pCol = new THREE.BoxGeometry(0.30, 4.2, 0.30);
    pCol.translate(px, 2.5, 10.2);
    omTimber.push(pCol);
  }
  const karahafuArch = new THREE.CylinderGeometry(2.8, 2.8, 4.2, 16, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
  karahafuArch.rotateX(Math.PI / 2);
  karahafuArch.scale(1.1, 0.48, 1.0);
  karahafuArch.translate(-3.2, 4.6, 9.2);
  omRoof.push(karahafuArch);

  const porchCrest = new THREE.CylinderGeometry(0.32, 0.32, 0.14, 12);
  porchCrest.rotateX(Math.PI / 2);
  porchCrest.translate(-3.2, 5.15, 11.25);
  omGold.push(porchCrest);

  // Expansive multi-gabled cypress-bark roof (`檜皮葺大屋根`, 25m × 18m)
  const omLowerEave = new THREE.BoxGeometry(25.2, 0.48, 18.2);
  omLowerEave.translate(0, 5.75, 0);
  omRoof.push(omLowerEave);

  const omRoofSlope = new THREE.ConeGeometry(16.2, 4.2, 4);
  omRoofSlope.rotateY(Math.PI / 4);
  omRoofSlope.scale(1.14, 1.0, 0.82);
  omRoofSlope.translate(0, 8.0, 0);
  omRoof.push(omRoofSlope);

  const omRidgeBeam = new THREE.BoxGeometry(14.5, 0.42, 0.55);
  omRidgeBeam.translate(0, 9.85, 0);
  omRoof.push(omRidgeBeam);

  // Iconic Rooftop Fire-Prevention Water Barrels (`天水桶 / Tensui-oke`) atop the main ridge!
  const tubPlatform = new THREE.BoxGeometry(5.6, 0.24, 1.85);
  tubPlatform.translate(0, 10.12, 0);
  omTimber.push(tubPlatform);

  for (const tx of [-1.6, 1.6]) {
    // Lower two barrels supporting upper barrel
    for (const subX of [-0.46, 0.46]) {
      const barrelBot = new THREE.CylinderGeometry(0.42, 0.36, 0.78, 12);
      barrelBot.translate(tx + subX, 10.62, 0);
      omTimber.push(barrelBot);

      const hoop = new THREE.TorusGeometry(0.40, 0.035, 6, 14);
      hoop.rotateX(Math.PI / 2);
      hoop.translate(tx + subX, 10.65, 0);
      omGold.push(hoop);
    }
    // Stacked top rainwater barrel (`天水桶`)
    const barrelTop = new THREE.CylinderGeometry(0.46, 0.38, 0.84, 12);
    barrelTop.translate(tx, 11.42, 0);
    omTimber.push(barrelTop);

    const hoopTop = new THREE.TorusGeometry(0.43, 0.04, 6, 14);
    hoopTop.rotateX(Math.PI / 2);
    hoopTop.translate(tx, 11.45, 0);
    omGold.push(hoopTop);
  }

  omoyaGroup.add(
    new THREE.Mesh(mergeAndDispose(omStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(omTimber), darkCedarMat),
    new THREE.Mesh(mergeAndDispose(omWhite), whitePlasterMat),
    new THREE.Mesh(mergeAndDispose(omShoji), warmShojiMat),
    new THREE.Mesh(mergeAndDispose(omRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(omGold), goldMat)
  );
  addBoxCollider(-11.2, 11.2, 2 - 7.6, 2 + 7.6);

  // ---------------------------------------------------------------- 5C. 蟠龍庭 (Banryūtei — Coiling Dragon Rock Garden) at local (0, -22)
  const banryuteiGroup = new THREE.Group();
  banryuteiGroup.name = 'Kongobuji_Banryutei';
  banryuteiGroup.position.set(0, getHeight(0, -22), -22);
  kongobujiGroup.add(banryuteiGroup);

  // Raked white Shirakawa gravel bed (`26m × 16m`) with procedural Samon wave texture
  const gravelTex = createBanryuteiGravelTexture();
  if (gravelTex) disposables.push(gravelTex);
  const gravelBedMat = new THREE.MeshStandardMaterial({
    color: 0xf5f3ed,
    map: gravelTex,
    bumpMap: gravelTex,
    bumpScale: 0.08,
    roughness: 0.92,
    metalness: 0.02,
  });
  disposables.push(gravelBedMat);

  const gravelBed = new THREE.Mesh(new THREE.BoxGeometry(26.0, 0.14, 16.0), gravelBedMat);
  gravelBed.position.set(0, 0.07, 0);
  gravelBed.receiveShadow = true;
  banryuteiGroup.add(gravelBed);

  // Low timber-and-plaster viewing border & northern enclosure wall (`築地塀`)
  const brBorderTimber = [];
  const brBorderWall = [];
  // Wooden viewing veranda along the south edge (z = +8.2)
  const viewDeck = new THREE.BoxGeometry(26.8, 0.36, 1.6);
  viewDeck.translate(0, 0.18, 8.6);
  brBorderTimber.push(viewDeck);

  // North & side low garden walls
  const northGardenWall = new THREE.BoxGeometry(26.8, 1.5, 0.42);
  northGardenWall.translate(0, 0.75, -8.2);
  brBorderWall.push(northGardenWall);
  const northWallCap = new THREE.BoxGeometry(27.2, 0.24, 0.72);
  northWallCap.translate(0, 1.58, -8.2);
  brBorderTimber.push(northWallCap);

  for (const sx of [-13.2, 13.2]) {
    const sideWall = new THREE.BoxGeometry(0.42, 1.5, 16.4);
    sideWall.translate(sx, 0.75, 0);
    brBorderWall.push(sideWall);
    const sideCap = new THREE.BoxGeometry(0.72, 0.24, 16.8);
    sideCap.translate(sx, 1.58, 0);
    brBorderTimber.push(sideCap);
  }
  banryuteiGroup.add(
    new THREE.Mesh(mergeAndDispose(brBorderTimber), darkCedarMat),
    new THREE.Mesh(mergeAndDispose(brBorderWall), whitePlasterMat)
  );
  addBoxCollider(-13.2, 13.2, -22 - 8.2, -22 + 8.0);

  // 140 Blue-Chlorite Schist Stones (`四國青石`, InstancedMesh) arranged as Coiling Male & Female Dragons (`雌雄雙龍`)
  const dragonStoneGeo = new THREE.DodecahedronGeometry(0.55, 0);
  dragonStoneGeo.scale(0.85, 1.35, 0.65);
  disposables.push(dragonStoneGeo);

  const DRAGON_STONE_COUNT = 140;
  const dragonStonesInst = new THREE.InstancedMesh(dragonStoneGeo, blueSchistMat, DRAGON_STONE_COUNT);
  dragonStonesInst.castShadow = true;
  dragonStonesInst.receiveShadow = true;

  let dStoneIdx = 0;
  // West Dragon (`雄龍`, 70 stones along a coiling S-curve centered around x = -6.2)
  for (let i = 0; i < 70; i++) {
    const u = i / 69; // 0 (tail in north) -> 1 (head rearing toward south-center)
    const spineZ = -6.2 + u * 12.4;
    const spineX = -6.4 + Math.sin(u * Math.PI * 2.2) * 3.4;
    const rowOffset = ((i % 3) - 1) * 0.52;
    const sx = spineX + rowOffset;
    const sz = spineZ + (i % 2) * 0.25;
    const isHead = i >= 64;
    const hScale = isHead ? 1.85 : 0.75 + Math.sin(u * Math.PI) * 0.85 + (i % 3) * 0.18;

    dummy.position.set(sx, 0.14 + hScale * 0.32, sz);
    dummy.rotation.set(
      0.22 * Math.cos(u * Math.PI * 2),
      Math.atan2(Math.cos(u * Math.PI * 2.2) * 3.4, 4.0) + (i % 3) * 0.25,
      0.18
    );
    dummy.scale.set(0.85 + (i % 2) * 0.25, hScale, 0.75 + (i % 3) * 0.2);
    dummy.updateMatrix();
    dragonStonesInst.setMatrixAt(dStoneIdx++, dummy.matrix);
  }

  // East Dragon (`雌龍`, 70 stones along a mirrored S-curve centered around x = +6.2)
  for (let i = 0; i < 70; i++) {
    const u = i / 69;
    const spineZ = 6.2 - u * 12.4;
    const spineX = 6.4 - Math.sin(u * Math.PI * 2.2) * 3.4;
    const rowOffset = ((i % 3) - 1) * 0.52;
    const sx = spineX + rowOffset;
    const sz = spineZ - (i % 2) * 0.25;
    const isHead = i >= 64;
    const hScale = isHead ? 1.80 : 0.72 + Math.sin(u * Math.PI) * 0.82 + (i % 3) * 0.18;

    dummy.position.set(sx, 0.14 + hScale * 0.32, sz);
    dummy.rotation.set(
      -0.22 * Math.cos(u * Math.PI * 2),
      Math.atan2(-Math.cos(u * Math.PI * 2.2) * 3.4, -4.0) + (i % 3) * 0.25,
      -0.18
    );
    dummy.scale.set(0.85 + (i % 2) * 0.25, hScale, 0.75 + (i % 3) * 0.2);
    dummy.updateMatrix();
    dragonStonesInst.setMatrixAt(dStoneIdx++, dummy.matrix);
  }
  dragonStonesInst.instanceMatrix.needsUpdate = true;
  banryuteiGroup.add(dragonStonesInst);

  // White Kyoto Granite Cloud Banks (`白雲石`) flanking the dragon coils
  const cloudRockGeos = [];
  for (let cIdx = 0; cIdx < 24; cIdx++) {
    const ang = (cIdx / 24) * TWO_PI;
    const rx = Math.cos(ang) * (9.2 + (cIdx % 3) * 1.4);
    const rz = Math.sin(ang) * (5.2 + (cIdx % 2) * 1.1);
    const cr = new THREE.DodecahedronGeometry(0.48 + (cIdx % 3) * 0.14, 0);
    cr.scale(1.3, 0.62, 1.1);
    cr.translate(rx, 0.28, rz);
    cloudRockGeos.push(cr);
  }
  banryuteiGroup.add(new THREE.Mesh(mergeAndDispose(cloudRockGeos), cloudGraniteMat));

  // =========================================================================
  // PRECINCT 3: 奧之院 (OKUNOIN — East/Northeast Precinct, lx ∈ [26, 82])
  // =========================================================================
  const okunoinGroup = new THREE.Group();
  okunoinGroup.name = 'Koyasan_Okunoin';
  root.add(okunoinGroup);

  // ---------------------------------------------------------------- 6A. Flagstone Pilgrimage Path (`石畳參道`, local x = 48, z ∈ [-66, 40])
  const okunoinFlagstoneGeos = [];
  for (let fz = -64; fz <= 40; fz += 2.2) {
    if (Math.abs(fz - -16) < 4.8) continue; // Gobyōbashi spans Tamagawa at z = -16
    const fy = getHeight(48, fz);
    const slab = new THREE.BoxGeometry(3.8, 0.08, 1.95);
    slab.translate(48, fy + 0.04, fz);
    okunoinFlagstoneGeos.push(slab);
  }
  const okunoinPathMesh = new THREE.Mesh(mergeAndDispose(okunoinFlagstoneGeos), stonePlinthMat);
  okunoinPathMesh.receiveShadow = true;
  okunoinGroup.add(okunoinPathMesh);

  // ---------------------------------------------------------------- 6B. Millennium Cedar Avenue (`千年杉木林`, 96 trees via InstancedMesh)
  const CEDAR_COUNT = 96;
  const cedarRng = seededRandom(8160);
  const cedars = [];
  for (let i = 0; i < 320 && cedars.length < CEDAR_COUNT; i++) {
    const cedarIdx = cedars.length;
    let cx;
    let cz;
    if (cedarIdx < 76) {
      // Dense millennium cedar avenue flanking Okunoin path (x = 48)
      const side = cedarIdx % 2 === 0 ? -1 : 1;
      const row = Math.floor(cedarIdx / 2);
      cx = 48 + side * (5.2 + cedarRng() * 14.5);
      cz = 40 - (row / 38) * 112 + (cedarRng() - 0.5) * 2.4;
    } else {
      // Sacred cedars framing Danjō Garan & Kongōbu-ji perimeter
      const ang = cedarRng() * TWO_PI;
      const rad = 76 + cedarRng() * 26;
      cx = Math.cos(ang) * rad;
      cz = Math.sin(ang) * rad;
    }
    // Keep Tamagawa stream, Tōrōdō, and Gobyō clear
    if (Math.abs(cz - -16) < 4.5 && cx > 32 && cx < 66) continue;
    if (Math.hypot(cx - 48, cz - -42) < 10.5) continue;
    if (Math.hypot(cx - 48, cz - -66) < 10.5) continue;
    if (Math.abs(cx - 0) < 7 && cz > 65) continue;

    const cy = getHeight(cx, cz);
    const sc = 0.78 + cedarRng() * 0.55;
    const hScale = 0.85 + cedarRng() * 0.55;
    cedars.push({
      x: cx, y: cy - 0.2, z: cz,
      width: sc, height: sc * hScale,
      yaw: cedarRng() * TWO_PI, lean: (cedarRng() - 0.5) * 0.04,
    });
  }
  addJapanTrees(okunoinGroup, cedars, { name: 'Mount Kōya cedars', species: 'cedar', disposables });

  // ---------------------------------------------------------------- 6C. Gorintō Memorial Forest (`五輪塔群`, 200 five-ring stupas via InstancedMesh)
  const gorintoGeo = createGorintoGeometry();
  disposables.push(gorintoGeo);
  const GORINTO_COUNT = 200;
  const gorintoInst = new THREE.InstancedMesh(gorintoGeo, mossyStoneMat, GORINTO_COUNT);
  gorintoInst.castShadow = true;
  gorintoInst.receiveShadow = true;

  const gorintoRng = seededRandom(8350);
  const gorintoCol = new THREE.Color();
  let gIdx = 0;
  for (let attempt = 0; attempt < 450 && gIdx < GORINTO_COUNT; attempt++) {
    const side = attempt % 2 === 0 ? -1 : 1;
    const distFromPath = 3.2 + gorintoRng() * 14.5;
    const gx = 48 + side * distFromPath;
    const gz = -60 + gorintoRng() * 98; // z ∈ [-60, 38]
    if (Math.abs(gz - -16) < 5.0) continue; // avoid Tamagawa stream
    if (Math.hypot(gx - 48, gz - -42) < 9.8) continue; // avoid Tōrōdō
    if (Math.hypot(gx - 48, gz - -66) < 9.5) continue; // avoid Gobyō

    const gy = getHeight(gx, gz);
    const sc = 0.65 + gorintoRng() * 0.72;
    dummy.position.set(gx, gy, gz);
    // Face approximately toward the central pilgrimage avenue
    dummy.rotation.set(
      (gorintoRng() - 0.5) * 0.06,
      (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (gorintoRng() - 0.5) * 0.35,
      (gorintoRng() - 0.5) * 0.06
    );
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    gorintoInst.setMatrixAt(gIdx, dummy.matrix);

    // Subtle per-instance weathering between granite grey and mossy emerald
    const mossMix = gorintoRng();
    gorintoCol.setRGB(
      THREE.MathUtils.lerp(0.68, 0.44, mossMix),
      THREE.MathUtils.lerp(0.71, 0.58, mossMix),
      THREE.MathUtils.lerp(0.67, 0.42, mossMix)
    );
    gorintoInst.setColorAt(gIdx, gorintoCol);
    gIdx++;
  }
  gorintoInst.count = gIdx;
  gorintoInst.instanceMatrix.needsUpdate = true;
  if (gorintoInst.instanceColor) gorintoInst.instanceColor.needsUpdate = true;
  okunoinGroup.add(gorintoInst);

  // ---------------------------------------------------------------- 6D. 36 Stone Lanterns (`石燈籠`, InstancedMesh) lining the Okunoin Path
  const stoneLanternGeo = createStoneLanternGeometry();
  const fireboxGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 6);
  fireboxGeo.translate(0, 1.44, 0);
  disposables.push(stoneLanternGeo, fireboxGeo);

  const STONE_LANTERN_COUNT = 36;
  const stoneLanternsInst = new THREE.InstancedMesh(stoneLanternGeo, stonePlinthMat, STONE_LANTERN_COUNT);
  const stoneFireboxesInst = new THREE.InstancedMesh(fireboxGeo, lanternGlowMat, STONE_LANTERN_COUNT);
  stoneLanternsInst.castShadow = true;

  let slIdx = 0;
  for (let pair = 0; pair < 18; pair++) {
    const lz = 38 - pair * 5.4;
    const adjustedZ = Math.abs(lz - -16) < 4.5 ? lz - 4.8 : lz;
    for (const side of [-1, 1]) {
      const lx = 48 + side * 2.45;
      const ly = getHeight(lx, adjustedZ);
      dummy.position.set(lx, ly, adjustedZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      stoneLanternsInst.setMatrixAt(slIdx, dummy.matrix);
      stoneFireboxesInst.setMatrixAt(slIdx, dummy.matrix);
      slIdx++;
    }
  }
  stoneLanternsInst.instanceMatrix.needsUpdate = true;
  stoneFireboxesInst.instanceMatrix.needsUpdate = true;
  okunoinGroup.add(stoneLanternsInst, stoneFireboxesInst);

  // ---------------------------------------------------------------- 6E. 玉川 (Tamagawa Stream) & 御廟橋 (Gobyōbashi) at local (48, -16)
  const gobyobashiGroup = new THREE.Group();
  gobyobashiGroup.name = 'Okunoin_GobyobashiAndTamagawa';
  const bridgeBaseY = getHeight(48, -12);
  gobyobashiGroup.position.set(48, bridgeBaseY, -16);
  okunoinGroup.add(gobyobashiGroup);

  // Tamagawa reflective stream ribbon (`玉川`)
  const tamagawaMat = new THREE.MeshStandardMaterial({
    color: 0x1e6078,
    emissive: 0x0c4a6e,
    emissiveIntensity: 0.32,
    roughness: 0.20,
    metalness: 0.58,
  });
  disposables.push(tamagawaMat);
  const streamRibbon = new THREE.Mesh(new THREE.PlaneGeometry(44, 4.8), tamagawaMat);
  streamRibbon.rotation.x = -Math.PI / 2;
  streamRibbon.position.set(0, -0.22, 0);
  gobyobashiGroup.add(streamRibbon);

  // Stream bank colliders on left and right of Gobyōbashi so player crosses over the bridge
  addBoxCollider(28, 45.6, -18.2, -13.8);
  addBoxCollider(50.4, 72, -18.2, -13.8);

  // Gobyōbashi (`御廟橋`) — 36 sacred bridge planks (`三十六枚橋板`) + railings + 8 bronze Giboshi (`擬寶珠`)
  const gbTimber = [];
  const gbBronze = [];
  const gbStone = [];

  // Stone bridge abutments & piers
  for (const sz of [-4.6, 0, 4.6]) {
    for (const sx of [-1.6, 1.6]) {
      const pier = new THREE.CylinderGeometry(0.28, 0.34, 1.2, 8);
      pier.translate(sx, -0.1, sz);
      gbStone.push(pier);
    }
  }

  // 36 carved cypress bridge planks (`三十六枚橋板`) arched gently across z ∈ [-5.0, +5.0]
  for (let p = 0; p < 36; p++) {
    const u = (p + 0.5) / 36; // 0..1
    const pz = -5.0 + u * 10.0;
    const archY = 0.22 + Math.sin(u * Math.PI) * 0.38;
    const plank = new THREE.BoxGeometry(4.2, 0.12, 0.24);
    plank.translate(0, archY, pz);
    gbTimber.push(plank);
  }

  // Bridge railings & 8 posts with bronze Giboshi (`擬寶珠`) onion finials
  for (const sx of [-1.95, 1.95]) {
    const topRail = new THREE.BoxGeometry(0.16, 0.14, 10.4);
    topRail.translate(sx, 1.15, 0);
    gbTimber.push(topRail);
    const midRail = new THREE.BoxGeometry(0.12, 0.10, 10.4);
    midRail.translate(sx, 0.72, 0);
    gbTimber.push(midRail);

    for (const pz of [-4.8, -1.6, 1.6, 4.8]) {
      const u = (pz + 5.0) / 10.0;
      const archY = 0.22 + Math.sin(u * Math.PI) * 0.38;
      const post = new THREE.BoxGeometry(0.20, 0.96, 0.20);
      post.translate(sx, archY + 0.48, pz);
      gbTimber.push(post);

      // Bronze Giboshi (`擬寶珠`) finial
      const giboshiCollar = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 8);
      giboshiCollar.translate(sx, archY + 1.02, pz);
      gbBronze.push(giboshiCollar);

      const giboshiBulb = new THREE.SphereGeometry(0.15, 10, 8);
      giboshiBulb.scale(0.95, 1.35, 0.95);
      giboshiBulb.translate(sx, archY + 1.20, pz);
      gbBronze.push(giboshiBulb);
    }
  }

  gobyobashiGroup.add(
    new THREE.Mesh(mergeAndDispose(gbStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(gbTimber), darkCedarMat),
    new THREE.Mesh(mergeAndDispose(gbBronze), bronzeMat)
  );

  // ---------------------------------------------------------------- 6F. 萬燈籠堂 (Tōrōdō — Hall of Ten Thousand Lanterns) at local (48, -42)
  const torodoGroup = new THREE.Group();
  torodoGroup.name = 'Okunoin_Torodo';
  const torodoY = getHeight(48, -42);
  torodoGroup.position.set(48, torodoY, -42);
  okunoinGroup.add(torodoGroup);

  const trStone = [];
  const trTimber = [];
  const trRoof = [];
  const trGold = [];
  const trBronze = [];

  // Stone foundation terrace (`16.8m × 10.8m`) with front steps
  const trBase = new THREE.BoxGeometry(16.8, 0.9, 10.8);
  trBase.translate(0, 0.45, 0);
  trStone.push(trBase);
  for (let st = 0; st < 4; st++) {
    const step = new THREE.BoxGeometry(4.6, 0.22, 0.44);
    step.translate(0, (st + 0.5) * 0.22, 5.4 + (3 - st) * 0.40);
    trStone.push(step);
  }

  // Timber columns & back/side sanctuary walls (open front colonnade facing +Z so all 144 lanterns shine out!)
  const trBackWall = new THREE.BoxGeometry(15.4, 4.4, 0.36);
  trBackWall.translate(0, 3.1, -4.6);
  trTimber.push(trBackWall);
  for (const sx of [-7.6, 7.6]) {
    const sideWall = new THREE.BoxGeometry(0.36, 4.4, 9.2);
    sideWall.translate(sx, 3.1, 0);
    trTimber.push(sideWall);
  }
  for (let ix = -3; ix <= 3; ix++) {
    for (const sz of [-4.6, 0.2, 4.6]) {
      if (sz === 0.2 && Math.abs(ix) <= 1) continue;
      const col = new THREE.CylinderGeometry(0.22, 0.25, 4.6, 10);
      col.translate(ix * 2.4, 3.2, sz);
      trTimber.push(col);
    }
  }

  // Wide hip-and-gable cypress-bark roof (`入母屋造檜皮葺`, 18.4m × 12.6m)
  const trEave = new THREE.BoxGeometry(18.4, 0.42, 12.6);
  trEave.translate(0, 5.55, 0);
  trRoof.push(trEave);

  const trMainRoof = new THREE.ConeGeometry(11.4, 3.4, 4);
  trMainRoof.rotateY(Math.PI / 4);
  trMainRoof.scale(1.22, 1.0, 0.84);
  trMainRoof.translate(0, 7.35, 0);
  trRoof.push(trMainRoof);

  const trRidge = new THREE.BoxGeometry(10.8, 0.34, 0.42);
  trRidge.translate(0, 8.95, 0);
  trGold.push(trRidge);

  // Two Eternal Flame Shrines (`消えずの火`: 祈親上人之火 at x = -1.6 & 貧女一燈 at x = +1.6)
  const eternalFlameMeshes = [];
  for (const fx of [-1.6, 1.6]) {
    const pedestal = new THREE.CylinderGeometry(0.38, 0.48, 1.15, 6);
    pedestal.translate(fx, 1.48, 1.2);
    trBronze.push(pedestal);

    const cageCap = new THREE.ConeGeometry(0.46, 0.34, 6);
    cageCap.translate(fx, 2.52, 1.2);
    trGold.push(cageCap);

    // Animated Eternal Flame core (`消えずの火`)
    const flameGeo = new THREE.ConeGeometry(0.22, 0.56, 8);
    disposables.push(flameGeo);
    const flameMesh = new THREE.Mesh(flameGeo, eternalFlameMat);
    flameMesh.position.set(fx, 2.22, 1.2);
    torodoGroup.add(flameMesh);
    eternalFlameMeshes.push(flameMesh);
  }

  torodoGroup.add(
    new THREE.Mesh(mergeAndDispose(trStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(trTimber), darkCedarMat),
    new THREE.Mesh(mergeAndDispose(trRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(trBronze), bronzeMat),
    new THREE.Mesh(mergeAndDispose(trGold), goldMat)
  );
  addBoxCollider(48 - 8.2, 48 + 8.2, -42 - 5.2, -42 + 4.8);

  // `THREE.InstancedMesh` of 144 Glowing Golden Hanging Lanterns (`萬燈籠`) inside Tōrōdō
  const hCap = new THREE.ConeGeometry(0.18, 0.10, 6);
  hCap.translate(0, 0.18, 0);
  const hBody = new THREE.CylinderGeometry(0.13, 0.13, 0.28, 6);
  const hLanternGeo = mergeAndDispose([hCap, hBody]);
  disposables.push(hLanternGeo);

  const HANGING_LANTERN_COUNT = 144;
  const hangingLanternsInst = new THREE.InstancedMesh(hLanternGeo, lanternGlowMat, HANGING_LANTERN_COUNT);
  let hlIdx = 0;
  for (let rx = 0; rx < 12; rx++) {
    for (let rz = 0; rz < 6; rz++) {
      for (let tier = 0; tier < 2; tier++) {
        const lx = -6.6 + rx * 1.2;
        const lz = -3.6 + rz * 1.45;
        const ly = 4.65 - tier * 0.55 - ((rx + rz) % 2) * 0.12;
        dummy.position.set(lx, ly, lz);
        dummy.rotation.set(0, (rx * 0.5 + rz * 0.3), 0);
        dummy.scale.setScalar(1.0);
        dummy.updateMatrix();
        hangingLanternsInst.setMatrixAt(hlIdx++, dummy.matrix);
      }
    }
  }
  hangingLanternsInst.instanceMatrix.needsUpdate = true;
  torodoGroup.add(hangingLanternsInst);

  // ---------------------------------------------------------------- 6G. 弘法大師御廟 (Kōbō Daishi Gobyō — Mausoleum of Kūkai) at local (48, -66)
  const gobyoGroup = new THREE.Group();
  gobyoGroup.name = 'Okunoin_KoboDaishiGobyo';
  const gobyoY = getHeight(48, -66);
  gobyoGroup.position.set(48, gobyoY, -66);
  okunoinGroup.add(gobyoGroup);

  const gbMausStone = [];
  const gbMausTimber = [];
  const gbMausRoof = [];
  const gbMausGold = [];

  // Sacred stone terrace (`14m × 14m`) & wooden enclosure fence (`瑞垣`, leaving south worship gate open)
  const mausTerrace = new THREE.BoxGeometry(14.4, 0.85, 14.4);
  mausTerrace.translate(0, 0.425, 0);
  gbMausStone.push(mausTerrace);

  for (let st = 0; st < 4; st++) {
    const step = new THREE.BoxGeometry(3.8, 0.21, 0.42);
    step.translate(0, (st + 0.5) * 0.21, 7.2 + (3 - st) * 0.38);
    gbMausStone.push(step);
  }

  // Sacred wooden palisade (`瑞垣`) around North, East, West, and South flanks
  const northFence = new THREE.BoxGeometry(13.6, 2.2, 0.28);
  northFence.translate(0, 1.95, -6.6);
  gbMausTimber.push(northFence);
  for (const sx of [-6.6, 6.6]) {
    const sideFence = new THREE.BoxGeometry(0.28, 2.2, 13.4);
    sideFence.translate(sx, 1.95, 0);
    gbMausTimber.push(sideFence);
  }
  for (const sx of [-4.4, 4.4]) {
    const frontWing = new THREE.BoxGeometry(4.4, 2.2, 0.28);
    frontWing.translate(sx, 1.95, 6.6);
    gbMausTimber.push(frontWing);
  }
  // Worship Gate (`瑞垣拝殿門`) at z = +6.6
  const gateRoof = new THREE.ConeGeometry(3.4, 1.4, 4);
  gateRoof.rotateY(Math.PI / 4);
  gateRoof.scale(1.2, 1.0, 0.65);
  gateRoof.translate(0, 4.1, 6.6);
  gbMausRoof.push(gateRoof);

  // Serene Cypress-Bark Pyramidal Mausoleum (`宝形造檜皮葺御廟`, 8.2m × 8.2m, height 9.6m)
  const mausSubBase = new THREE.BoxGeometry(8.8, 0.65, 8.8);
  mausSubBase.translate(0, 1.15, 0);
  gbMausStone.push(mausSubBase);

  const mausSanctum = new THREE.BoxGeometry(7.6, 3.8, 7.6);
  mausSanctum.translate(0, 3.35, 0);
  gbMausTimber.push(mausSanctum);

  const mausGoldTrim = new THREE.BoxGeometry(7.72, 0.28, 7.72);
  mausGoldTrim.translate(0, 5.1, 0);
  gbMausGold.push(mausGoldTrim);

  const mausEave = new THREE.BoxGeometry(10.8, 0.38, 10.8);
  mausEave.translate(0, 5.4, 0);
  gbMausRoof.push(mausEave);

  const mausPyramid = new THREE.ConeGeometry(7.8, 3.6, 4);
  mausPyramid.rotateY(Math.PI / 4);
  mausPyramid.translate(0, 7.35, 0);
  gbMausRoof.push(mausPyramid);

  // Sacred golden-bronze Jewel Finial (`寶珠・露盤`) at summit of Gobyō
  const mausRoban = new THREE.BoxGeometry(1.1, 0.28, 1.1);
  mausRoban.translate(0, 9.2, 0);
  gbMausGold.push(mausRoban);

  const mausHoju = new THREE.SphereGeometry(0.42, 12, 10);
  mausHoju.scale(0.9, 1.35, 0.9);
  mausHoju.translate(0, 9.75, 0);
  gbMausGold.push(mausHoju);

  gobyoGroup.add(
    new THREE.Mesh(mergeAndDispose(gbMausStone), stonePlinthMat),
    new THREE.Mesh(mergeAndDispose(gbMausTimber), darkCedarMat),
    new THREE.Mesh(mergeAndDispose(gbMausRoof), cypressRoofMat),
    new THREE.Mesh(mergeAndDispose(gbMausGold), goldMat)
  );
  addBoxCollider(48 - 7.0, 48 + 7.0, -66 - 7.0, -66 + 6.4);

  // Rotating Golden Siddhaṃ `अ (A)` Mandala Ring above Kōbō Daishi Gobyō
  const siddhamMandalaGroup = new THREE.Group();
  siddhamMandalaGroup.name = 'Gobyo_SiddhamMandala';
  siddhamMandalaGroup.position.set(0, 11.2, 0);
  gobyoGroup.add(siddhamMandalaGroup);

  const siddhamTex = createSiddhamMandalaTexture();
  if (siddhamTex) disposables.push(siddhamTex);
  const siddhamDiscMat = new THREE.MeshBasicMaterial({
    map: siddhamTex,
    color: 0xfef08a,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  disposables.push(siddhamDiscMat);

  const siddhamDisc = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), siddhamDiscMat);
  siddhamDisc.rotation.x = -Math.PI / 2;
  siddhamMandalaGroup.add(siddhamDisc);

  const siddhamOuterTorus = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.08, 8, 32), goldMat);
  siddhamOuterTorus.rotation.x = Math.PI / 2;
  siddhamMandalaGroup.add(siddhamOuterTorus);

  // ---------------------------------------------------------------- 6H. Seasonal Mountain Maples (`高野山蛇腹路紅葉`) & Mountain Cherries (`山櫻`)
  const koyasanMapleMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.20,
    roughness: 0.78,
  });
  const koyasanCherryMat = new THREE.MeshStandardMaterial({
    color: 0xf9a8d4,
    emissive: 0x831843,
    emissiveIntensity: 0.16,
    roughness: 0.74,
  });
  disposables.push(koyasanMapleMat, koyasanCherryMat);

  const koyasanMapleSpots = [
    [-74, 18], [-74, -8], [-22, 18], [-22, -8], [-16, 22], [16, 22],
    [-16, -24], [16, -24], [24, 16], [28, 34], [-28, 36], [18, 48],
  ];
  const koyasanCherrySpots = [
    [-64, 24], [-36, 24], [-58, -14], [-32, -12], [-14, 34], [14, 34],
    [-12, -32], [12, -32],
  ];
  const onGround = ([x, z]) => ({ x, y: getHeight(x, z), z, scale: 1.05 });
  const maples = addJapanTrees(root, koyasanMapleSpots.map(onGround), {
    name: 'Mount Kōya maples', species: 'maple', canopyMaterial: koyasanMapleMat, disposables,
  });
  const cherries = addJapanTrees(root, koyasanCherrySpots.map(onGround), {
    name: 'Mount Kōya cherries', species: 'cherry', canopyMaterial: koyasanCherryMat, disposables,
  });

  // Japanese Aesthetic Atmospheric Layer: Slanted Komorebi Sunbeam Shafts (`高野山木漏れ日・密嚴瑞光`)
  const koyasanKomorebiMat = new THREE.MeshBasicMaterial({
    color: 0xffedd5,
    transparent: true,
    opacity: 0.036,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const koyasanBeamGeos = [];
  const koyasanBeamSpots = [
    [-62, 16, 4, 4.4, 8.6, 30],   // Over Konpon Daitō (`根本大塔`)
    [-34, 14, 4, 3.8, 7.2, 26],   // Over Danjō Garan Kondō (`金堂`)
    [0, 14, -10, 4.2, 8.0, 26],   // Over Kongōbu-ji & Banryūtei (`金剛峯寺・蟠龍庭`)
    [48, 14, 10, 3.2, 6.2, 26],   // Through Okunoin Cedar Avenue (`奥之院杉並木`)
    [48, 15, -42, 3.6, 6.8, 28],  // Over Tōrōdō & Gobyō (`燈籠堂・御廟`)
  ];
  for (const [bx, by, bz, rTop, rBot, bHeight] of koyasanBeamSpots) {
    const shaft = new THREE.CylinderGeometry(rTop, rBot, bHeight, 12, 1, true);
    shaft.rotateZ(-0.32);
    shaft.rotateX(0.16);
    shaft.translate(bx, by, bz);
    koyasanBeamGeos.push(shaft);
  }
  const koyasanKomorebiMesh = new THREE.Mesh(mergeAndDispose(koyasanBeamGeos), koyasanKomorebiMat);
  koyasanKomorebiMesh.name = 'KoyasanKomorebiSunbeams';
  root.add(koyasanKomorebiMesh);
  disposables.push(koyasanKomorebiMesh.geometry, koyasanKomorebiMat);

  let appliedKoyasanSeason = null;
  function applyKoyasanSeason(season) {
    if (season === appliedKoyasanSeason) return;
    appliedKoyasanSeason = season;
    cherries.setSeason(season);
    maples.setSeason(season);
    if (season === 'spring') {
      koyasanCherryMat.color.setHex(0xf9a8d4);
      koyasanCherryMat.emissive.setHex(0x831843);
      koyasanCherryMat.emissiveIntensity = 0.20;
      koyasanMapleMat.color.setHex(0x4d9c46);
      koyasanMapleMat.emissive.setHex(0x1b4322);
      koyasanMapleMat.emissiveIntensity = 0.08;
      pineFoliageMat.color.setHex(0x2c5834);
      lotusPeakMat.color.setHex(0x284b3c);
      koyasanKomorebiMat.color.setHex(0xffe4e6);
    } else if (season === 'summer') {
      koyasanCherryMat.color.setHex(0x2e7d32);
      koyasanCherryMat.emissive.setHex(0x0d3b14);
      koyasanCherryMat.emissiveIntensity = 0.06;
      koyasanMapleMat.color.setHex(0x256d29);
      koyasanMapleMat.emissive.setHex(0x0b3210);
      koyasanMapleMat.emissiveIntensity = 0.06;
      pineFoliageMat.color.setHex(0x234f2b);
      lotusPeakMat.color.setHex(0x1e4635);
      koyasanKomorebiMat.color.setHex(0xfef08a);
    } else if (season === 'autumn') {
      koyasanCherryMat.color.setHex(0xd97706);
      koyasanCherryMat.emissive.setHex(0x78350f);
      koyasanCherryMat.emissiveIntensity = 0.16;
      koyasanMapleMat.color.setHex(0xdc2626);
      koyasanMapleMat.emissive.setHex(0x991b1b);
      koyasanMapleMat.emissiveIntensity = 0.28;
      pineFoliageMat.color.setHex(0x2c5834);
      lotusPeakMat.color.setHex(0x3a3d2e);
      koyasanKomorebiMat.color.setHex(0xfdba74);
    } else if (season === 'winter') {
      koyasanCherryMat.color.setHex(0xe2e8f0);
      koyasanCherryMat.emissive.setHex(0x475569);
      koyasanCherryMat.emissiveIntensity = 0.14;
      koyasanMapleMat.color.setHex(0xcbd5e1);
      koyasanMapleMat.emissive.setHex(0x334155);
      koyasanMapleMat.emissiveIntensity = 0.14;
      pineFoliageMat.color.setHex(0x94a3b8);
      lotusPeakMat.color.setHex(0x64748b);
      koyasanKomorebiMat.color.setHex(0xe0f2fe);
      if (rimMountainMesh?.material?.emissive) {
        rimMountainMesh.material.emissive.setHex(0x334155);
      }
    }
  }

  // ---------------------------------------------------------------- 7. Register 6 Sacred Precinct Interactables
  const landmarkDefs = [
    {
      id: 'konponDaito',
      lx: -62,
      lz: 15, // South staircase of Konpon Daitō
      radius: 5.5,
      promptKey: 'prompt.koyasan.konponDaito',
      toastKey: 'toast.koyasan.konponDaito',
      sfx: 'bowl',
    },
    {
      id: 'kondo',
      lx: -34,
      lz: 16.5, // South staircase of Kondō
      radius: 5.0,
      promptKey: 'prompt.koyasan.kondo',
      toastKey: 'toast.koyasan.kondo',
      sfx: 'bell',
    },
    {
      id: 'miedoSanko',
      lx: -45,
      lz: -9.5, // Between Sanko-no-Matsu & Miedō
      radius: 5.0,
      promptKey: 'prompt.koyasan.miedoSanko',
      toastKey: 'toast.koyasan.miedoSanko',
      sfx: 'bowl',
    },
    {
      id: 'kongobuji',
      lx: 0,
      lz: -11.5, // Viewing veranda between Kongōbu-ji Main Hall & Banryūtei Dragon Garden
      radius: 6.0,
      promptKey: 'prompt.koyasan.kongobuji',
      toastKey: 'toast.koyasan.kongobuji',
      sfx: 'bowl',
    },
    {
      id: 'torodo',
      lx: 48,
      lz: -34.5, // Front steps of Okunoin Tōrōdō Eternal Flames
      radius: 5.5,
      promptKey: 'prompt.koyasan.torodo',
      toastKey: 'toast.koyasan.torodo',
      sfx: 'light',
    },
    {
      id: 'gobyo',
      lx: 48,
      lz: -57.5, // Worship Gate in front of Kōbō Daishi Gobyō
      radius: 5.5,
      promptKey: 'prompt.koyasan.gobyo',
      toastKey: 'toast.koyasan.gobyo',
      sfx: 'bowl',
    },
  ];

  const beaconMeshes = [];
  for (const lm of landmarkDefs) {
    const wy = getHeight(lm.lx, lm.lz);
    const posVec = new THREE.Vector3(ox + lm.lx, wy, oz + lm.lz);

    const beacon = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.68, 28), auraRingMat);
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.set(lm.lx, wy + 0.05, lm.lz);
    root.add(beacon);
    beaconMeshes.push(beacon);

    registerInteractable({
      id: `koyasan:${lm.id}`,
      kind: 'landmark',
      zone: 'koyasan',
      action: 'interact',
      labelKey: lm.promptKey,
      radius: lm.radius,
      getPosition: () => posVec,
      isAvailable: () => state.zone === 'koyasan' && !state.uiOpen,
      onInteract() {
        bus?.emit?.('sfx', { name: lm.sfx });
        bus?.emit?.('toast', {
          key: lm.toastKey,
          text: i18n.t(lm.toastKey),
          kind: 'merit',
        });
        bus?.emit?.('vitals:restore', { hp: 30, mp: 30, source: 'koyasan' });
      },
    });
  }

  // ---------------------------------------------------------------- 8. Debug & Inspection API (`ctx.debug.register('koyasan', api)`)
  const koyasanApi = {
    getLandmarks() {
      return landmarkDefs.map((lm) => ({
        id: lm.id,
        x: ox + lm.lx,
        z: oz + lm.lz,
        y: getHeight(lm.lx, lm.lz),
        promptKey: lm.promptKey,
        toastKey: lm.toastKey,
      }));
    },
    getStats() {
      return {
        cedarCount: cedars.length,
        gorintoCount: gorintoInst.count,
        stoneLanternCount: stoneLanternsInst.count,
        hangingLanternCount: hangingLanternsInst.count,
        banryuteiStoneCount: dragonStonesInst.count,
        pointLights: 0,
      };
    },
    teleportPrecinct(precinct = 'garan') {
      const target = KOYASAN_MAP.spawns?.[precinct] || KOYASAN_MAP.spawns.default;
      if (state.player?.position && target) {
        const y = getHeightWorld(target.x, target.z);
        state.player.position.set(target.x, y, target.z);
        state.player.heading = target.heading ?? 0;
      }
      return target;
    },
  };

  ctx.koyasan = koyasanApi;
  ctx.debug?.register?.('koyasan', koyasanApi);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.koyasan = koyasanApi;
  }

  // ---------------------------------------------------------------- 9. Per-Frame Animation Update
  function update(dt) {
    const elapsed = state.elapsed || 0;
    applyKoyasanSeason(state?.time?.season || 'spring');

    // Slowly rotate the golden Siddhaṃ mandala above Kōbō Daishi Gobyō
    siddhamMandalaGroup.rotation.y = elapsed * 0.45;
    siddhamMandalaGroup.position.y = 11.2 + Math.sin(elapsed * 1.8) * 0.14;

    // Gleaming Three-Pronged Vajra in the branches of Sanko-no-Matsu
    sankoVajraGroup.rotation.y = elapsed * 0.9;
    sankoAuraRing.rotation.z = -elapsed * 0.5;
    daitoMandalaRing.rotation.z = elapsed * 0.35;

    // Flicker the Two Eternal Flames (`消えずの火`) inside Tōrōdō
    for (let i = 0; i < eternalFlameMeshes.length; i++) {
      const s = 0.92 + Math.sin(elapsed * 9.5 + i * 2.1) * 0.14;
      eternalFlameMeshes[i].scale.set(s, 0.9 + Math.cos(elapsed * 11.0 + i) * 0.18, s);
    }

    // Pulse landmark interaction rings
    for (let i = 0; i < beaconMeshes.length; i++) {
      const bScale = 0.96 + Math.sin(elapsed * 2.6 + i * 0.9) * 0.06;
      beaconMeshes[i].scale.setScalar(bScale);
    }
  }

  function dispose() {
    for (const d of disposables) {
      d?.dispose?.();
    }
  }

  return {
    group,
    root,
    colliders,
    interactables,
    disposables,
    koyasan: koyasanApi,
    getHeight: getHeightWorld,
    update,
    dispose,
  };
}

export const buildKoyasanMap = createMap;
export default createMap;
