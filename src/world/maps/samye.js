/**
 * Chapter 4 Map Scene — Mount Hepo Ri & Samye Monastery (`src/world/maps/samye.js`) — Issue #35 / #216
 *
 * Implements:
 *   - Yarlung Tsangpo River north bank sandy plains & dunes, ferry crossing with coracle (`牛皮筏`) at `(5000, 90)`
 *   - Construction Camp at `(4970, 55)`, Riverside Stone Quarries at `(4940, 70)` & `(5050, 75)`, Ferry Timber Pile at `(5010, 88)`
 *   - Mount Hepo Ri climbable red hill & summit gauntlet arena at `(5075, -10)` (`r: 15m`) with red-sandstone cliff strata,
 *     winding western stone pilgrimage steps, 8 perimeter mani incense burners, and golden Dharma wheel Vajra mandala
 *   - Pehar Boss Arena north of Samye at `(5000, -65)` (`r: 18m`) with wrathful Dharmapala mandala floor,
 *     10 dark-red Tibetan temple pillars, victory banners (`勝幡`), and flaming ritual braziers
 *   - 5 Construction Stages (`0..4`) of Samye Monastery at `(5000, 0)` (`outer wall r = 43m`):
 *       Stage 0: Foundation outlines + stacked materials
 *       Stage 1: Half-height circular outer wall + ground floor of Utse Great Hall (`烏孜大殿`)
 *       Stage 2: Full circular outer wall + 2 floors of Utse Great Hall + Four Colored Stupas foundations
 *       Stage 3: 3-story Utse Great Hall (Tibetan/Chinese/Indian roofs) + Four Colored Stupas (White SE, Red SW, Black NW, Green NE) + Four Continents temples (`四大部洲殿`)
 *       Stage 4: Sun & Moon chapels (`日月殿`), Eight Sub-continents chapels (`八小洲殿`), 1008 mini-stupas atop the perimeter wall (SINGLE `THREE.InstancedMesh`, `count = 1008`), prayer flags, gleaming golden roof, and 7 Tested Men (`七覺士`)
 *   - Day-Build / Night-Destroy Defense (`__stupa.samye.startNight()`, `__stupa.samye.endNight()`, `__stupa.samye.damageWall()`)
 *   - Mount Hepo Ri 4-Wave Gauntlet (`__stupa.hepori.start()`, `__stupa.hepori.complete()`)
 *   - "Samye!" (`བསམ་ཡས`) Palm-Vision Ending Cutscene (`__stupa.samye.playEnding()`, `__stupa.samye.skipEnding()`)
 *   - Strictly ZERO PointLights (emissive materials & additive meshes only) and low draw calls (< 400).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createHeightfieldTerrain,
  scatterRocks,
  addRimMountains,
  seededRandom,
  pushCollider,
} from '../mapBase.js';
import { SAMYE_MAP } from '../../data/maps/samye.js';
import '../../i18n/ch4.js';

const TWO_PI = Math.PI * 2;
const WALL_RADIUS = 43.0;
const MINI_STUPA_COUNT = 1008;

/**
 * Deterministic heightfield for Samye (`origin = (5000, 0)`):
 *   - Flat mandala courtyard around `(0, 0)` (`r <= 48`) so Samye Monastery and kora path sit cleanly
 *   - Gentle sandy bank sloping down toward the Yarlung Tsangpo River in the south (`lz > 82`)
 *   - Climbable Mount Hepo Ri (`海波日山`) rising in the east centered at `local (75, -10)` with a flat summit plateau (`r <= 15`, `y ~ 8.5m`) and a walkable western ramp
 *   - Flat Pehar Boss Arena at `local (0, -65)` (`r <= 18`)
 */
function samyeHeight(lx, lz) {
  // 1. Central Samye Monastery & Kora Ring (`r <= 50`) -> flat plateau at y = 0
  const distCenter = Math.hypot(lx, lz);
  const centerFlat = distCenter <= 46 ? 0 : Math.min(1, (distCenter - 46) / 12);

  // 2. Pehar Boss Arena at (0, -65), r = 18 -> flat at y = 0.2
  const distPehar = Math.hypot(lx - 0, lz - -65);
  const peharMask = distPehar <= 18 ? 0 : Math.min(1, (distPehar - 18) / 8);

  // 3. Mount Hepo Ri (`海波日山`) centered at local (75, -10)
  const hdx = lx - 75;
  const hdz = lz - -10;
  const distHepo = Math.hypot(hdx, hdz);
  let hepoHeight = 0;
  if (distHepo < 42) {
    if (distHepo <= 14.5) {
      // Flat summit arena plateau
      hepoHeight = 8.4;
    } else {
      const u = Math.max(0, 1 - (distHepo - 14.5) / (42 - 14.5));
      hepoHeight = 8.4 * u * u * (3 - 2 * u);
    }
  }

  // 4. Sandy dunes undulations outside flat zones
  const dune =
    (Math.sin(lx * 0.045) * Math.cos(lz * 0.042) * 0.85 +
      Math.sin((lx + lz) * 0.08) * 0.35) *
    centerFlat *
    peharMask;

  // 5. Southern riverbank slope (`lz > 85`)
  let riverSlope = 0;
  if (lz > 85) {
    riverSlope = -Math.min(1.6, (lz - 85) * 0.09);
  }

  // 6. Northern Chimphu foothills rim (`distCenter > 98` and `lz < -75`)
  let northRim = 0;
  if (lz < -82 && distPehar > 22) {
    const nr = Math.max(0, (-lz - 82) / 38);
    northRim = nr * nr * 9.5;
  }

  return hepoHeight + dune + riverSlope + northRim;
}

/**
 * Helper to merge an array of BufferGeometries and dispose the source parts immediately.
 */
function mergeAndDispose(geos) {
  const nonIndexed = geos.map((g) => {
    if (g.index) {
      const ni = g.toNonIndexed();
      g.dispose();
      return ni;
    }
    return g;
  });
  const merged = mergeGeometries(nonIndexed, false);
  for (const g of nonIndexed) {
    g.dispose();
  }
  return merged;
}

/**
 * Builds a merged geometry for the 1008 mini-stupas so a single `THREE.InstancedMesh`
 * renders all 1008 perimeter stupas in 1 draw call.
 */
function createMiniStupaGeometry() {
  const baseGeo = new THREE.BoxGeometry(0.42, 0.22, 0.42);
  baseGeo.translate(0, 0.11, 0);
  const domeGeo = new THREE.ConeGeometry(0.22, 0.48, 6);
  domeGeo.translate(0, 0.46, 0);
  const spireGeo = new THREE.ConeGeometry(0.08, 0.34, 5);
  spireGeo.translate(0, 0.82, 0);
  return mergeAndDispose([baseGeo, domeGeo, spireGeo]);
}

/**
 * Builds a compound 8-spoke Golden Dharma Wheel (`八輻法輪`) geometry centered at origin.
 */
function createDharmaWheelGeometry(radius = 0.85, tube = 0.09) {
  const parts = [];
  const rim = new THREE.TorusGeometry(radius, tube, 8, 24);
  parts.push(rim);
  const hub = new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, tube * 1.6, 12);
  hub.rotateX(Math.PI / 2);
  parts.push(hub);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const spoke = new THREE.CylinderGeometry(tube * 0.45, tube * 0.55, radius * 1.88, 6);
    spoke.rotateZ(ang);
    parts.push(spoke);
  }
  return mergeAndDispose(parts);
}

/**
 * High-detail procedural CanvasTexture for Samye's cosmic Mount Meru (`須彌山壇城`) courtyard pavement.
 * Inspired by `createPlazaPavingTexture` in `src/world/environment.js`, combining polar concentric
 * stone paver courses, terracotta kora rings, cosmic turquoise ocean courses, 16-petal lotus ring,
 * and Four Cardinal Processional Avenues.
 */
function createSamyeMandalaTexture() {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  if (!c) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.49;

  // Base warm Tibetan stone mortar tone
  c.fillStyle = '#8b7f70';
  c.fillRect(0, 0, size, size);

  // Deterministic organic dirt/patina mottling
  const patRng = seededRandom(5120);
  for (let i = 0; i < 360; i++) {
    const x = patRng() * size;
    const y = patRng() * size;
    const r = 4 + patRng() * 18;
    const v = 128 + Math.floor(patRng() * 38);
    c.fillStyle = `rgba(${v}, ${v - 6}, ${v - 14}, 0.16)`;
    c.beginPath();
    c.arc(x, y, r, 0, TWO_PI);
    c.fill();
  }

  // Concentric courses of individual stone flagstones from r = 82px out to maxR (250px)
  const ringCount = 24;
  const innerStart = 82;
  const ringStep = (maxR - innerStart) / ringCount;

  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const r0 = innerStart + rIdx * ringStep;
    const r1 = r0 + ringStep;
    const rMid = (r0 + r1) * 0.5;

    // Accentuate walking kora rings with terracotta crimson, cosmic turquoise, and golden sandstone
    let baseHue = [176, 166, 150]; // Warm Tibetan flagstone limestone
    if (rIdx === 2 || rIdx === 10 || rIdx === 18 || rIdx === 23) {
      baseHue = [164, 88, 68]; // Terracotta crimson kora band
    } else if (rIdx === 6 || rIdx === 15) {
      baseHue = [132, 162, 154]; // Cosmic turquoise-slate ring
    } else if (rIdx === 14 || rIdx === 21) {
      baseHue = [194, 162, 114]; // Golden-ochre sandstone ring
    }

    const segs = Math.max(16, Math.floor((TWO_PI * rMid) / 9));
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * TWO_PI + (rIdx % 2) * (Math.PI / segs);
      const a1 = ((s + 1) / segs) * TWO_PI + (rIdx % 2) * (Math.PI / segs);

      const jitter = ((s * 19 + rIdx * 37) % 21) - 10;
      const cr = Math.min(255, Math.max(40, baseHue[0] + jitter));
      const cg = Math.min(255, Math.max(40, baseHue[1] + jitter));
      const cb = Math.min(255, Math.max(40, baseHue[2] + jitter));

      c.beginPath();
      c.arc(cx, cy, r1 - 0.8, a0 + 0.005, a1 - 0.005, false);
      c.arc(cx, cy, r0 + 0.8, a1 - 0.005, a0 + 0.005, true);
      c.closePath();
      c.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      c.fill();
    }

    // Dark mortar joint circle between concentric stone courses
    c.beginPath();
    c.arc(cx, cy, r0, 0, TWO_PI);
    c.strokeStyle = 'rgba(58, 49, 41, 0.58)';
    c.lineWidth = 1.4;
    c.stroke();
  }

  // Golden & crimson mandala border rings
  const borderRings = [
    { r: 248, stroke: '#fbbf24', lw: 3.2 },
    { r: 212, stroke: '#0f766e', lw: 2.2 },
    { r: 154, stroke: '#991b1b', lw: 2.6 },
    { r: 112, stroke: '#d97706', lw: 2.4 },
    { r: 82, stroke: '#fbbf24', lw: 3.5 },
  ];
  for (const br of borderRings) {
    c.beginPath();
    c.arc(cx, cy, br.r, 0, TWO_PI);
    c.lineWidth = br.lw;
    c.strokeStyle = br.stroke;
    c.stroke();
  }

  // 16-petal lotus ring around central Mount Meru
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * TWO_PI;
    const a1 = ((i + 0.5) / 16) * TWO_PI;
    const a2 = ((i + 1) / 16) * TWO_PI;
    c.beginPath();
    c.moveTo(cx + Math.cos(a0) * 82, cy + Math.sin(a0) * 82);
    c.quadraticCurveTo(
      cx + Math.cos(a1) * 114,
      cy + Math.sin(a1) * 114,
      cx + Math.cos(a2) * 82,
      cy + Math.sin(a2) * 82
    );
    c.closePath();
    c.fillStyle = i % 2 === 0 ? '#b91c1c' : '#0f766e';
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = '#fbbf24';
    c.stroke();
  }

  // Four Cardinal Processional Avenues (N, S, E, W) with individual flagstones
  const aveAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  for (const ang of aveAngles) {
    c.save();
    c.translate(cx, cy);
    c.rotate(ang);
    c.fillStyle = '#cfc5b4';
    c.fillRect(58, -18, 188, 36);
    c.strokeStyle = '#8b1e24';
    c.lineWidth = 3;
    c.strokeRect(58, -18, 188, 36);
    for (let x = 62; x < 242; x += 12) {
      const shade = 206 + ((x * 7) % 18) - 9;
      c.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 20})`;
      c.fillRect(x, -14, 10, 13);
      c.fillRect(x, 1, 10, 13);
      c.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      c.lineWidth = 1;
      c.strokeRect(x, -14, 10, 28);
    }
    c.restore();
  }

  // Central Mount Meru square palace diagram
  c.fillStyle = '#7f1d1d';
  c.fillRect(cx - 56, cy - 56, 112, 112);
  c.strokeStyle = '#fbbf24';
  c.lineWidth = 4;
  c.strokeRect(cx - 56, cy - 56, 112, 112);
  c.strokeStyle = '#fde68a';
  c.lineWidth = 2;
  c.strokeRect(cx - 46, cy - 46, 92, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural seamless wind-rippled golden sand dune CanvasTexture (`256x256`)
 * for the Yarlung Tsangpo riverbank desert plains & dune crests.
 * Uses warm high-value golden tones so it multiplies cleanly with terrain vertexColors
 * while providing crisp wind-wave ripple relief via `bumpMap`.
 */
function createWindRippledSandTexture() {
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  if (!c) return null;

  const imgData = c.createImageData(size, size);
  const data = imgData.data;
  const rng = seededRandom(8842);

  for (let y = 0; y < size; y++) {
    const v = (y / size) * TWO_PI;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * TWO_PI;
      // Seamless periodic wind-ripple waves + secondary harmonic
      const wave1 = Math.sin(v * 9.0 + Math.sin(u * 2.0) * 1.35 + Math.cos(u * 3.0) * 0.45);
      const wave2 = Math.sin(v * 18.0 - u * 2.0 + Math.sin(u * 4.0) * 0.6) * 0.35;
      const ripple = Math.max(-1, Math.min(1, wave1 * 0.75 + wave2));
      const grain = (rng() - 0.5) * 10;

      // High-value warm sand range (208..255) so vertexColors shine through vividly
      const base = 232 + ripple * 18 + grain;
      const r = Math.min(255, Math.max(200, Math.round(base + 6)));
      const g = Math.min(255, Math.max(190, Math.round(base - 2)));
      const b = Math.min(255, Math.max(172, Math.round(base - 14)));

      const idx = (y * size + x) * 4;
      data[idx + 0] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  c.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural CanvasTexture for painted Buddha Wisdom Eyes (`佛眼 / 智慧眼`) on the Harmika
 * of Samye's Four Colored Stupas.
 */
function createBuddhaEyesHarmikaTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (!c) return null;

  // Rich burnished golden-ochre background with crimson border
  c.fillStyle = '#f59e0b';
  c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#7f1d1d';
  c.lineWidth = 8;
  c.strokeRect(4, 4, 120, 120);
  c.strokeStyle = '#fef3c7';
  c.lineWidth = 2;
  c.strokeRect(10, 10, 108, 108);

  // Pair of lotus-shaped Wisdom Eyes
  for (const ex of [38, 90]) {
    const ey = 62;
    // White sclera
    c.beginPath();
    c.moveTo(ex - 20, ey);
    c.quadraticCurveTo(ex, ey - 15, ex + 20, ey);
    c.quadraticCurveTo(ex, ey + 14, ex - 20, ey);
    c.closePath();
    c.fillStyle = '#f8fafc';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = '#0f172a';
    c.stroke();

    // Dark iris & golden pupil highlight
    c.beginPath();
    c.arc(ex, ey - 1, 7.5, 0, TWO_PI);
    c.fillStyle = '#1e293b';
    c.fill();
    c.beginPath();
    c.arc(ex - 2, ey - 3, 2.2, 0, TWO_PI);
    c.fillStyle = '#fef08a';
    c.fill();

    // Heavy crimson & black upper eyelid / brow arch
    c.beginPath();
    c.moveTo(ex - 22, ey - 3);
    c.quadraticCurveTo(ex, ey - 20, ex + 22, ey - 3);
    c.lineWidth = 3;
    c.strokeStyle = '#7f1d1d';
    c.stroke();
  }

  // Crimson & gold third-eye Urna (`白毫`)
  c.beginPath();
  c.arc(64, 34, 7.5, 0, TWO_PI);
  c.fillStyle = '#dc2626';
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = '#fef08a';
  c.stroke();

  // Curly Nepali/Tibetan unity symbol (`Ek`) below the eyes
  c.beginPath();
  c.moveTo(64, 70);
  c.quadraticCurveTo(72, 82, 63, 94);
  c.quadraticCurveTo(56, 104, 68, 106);
  c.lineWidth = 3.5;
  c.strokeStyle = '#0f172a';
  c.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft vertical wisp CanvasTexture for rising incense smoke & golden-hour sunbeams.
 */
function createAtmosphericBeamTexture(isSmoke = false) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (!c) return null;

  const grad = c.createRadialGradient(32, 64, 2, 32, 64, 58);
  if (isSmoke) {
    grad.addColorStop(0.0, 'rgba(255, 248, 231, 0.75)');
    grad.addColorStop(0.45, 'rgba(226, 232, 240, 0.32)');
    grad.addColorStop(1.0, 'rgba(148, 163, 184, 0.0)');
  } else {
    grad.addColorStop(0.0, 'rgba(255, 232, 158, 0.85)');
    grad.addColorStop(0.45, 'rgba(251, 191, 36, 0.35)');
    grad.addColorStop(1.0, 'rgba(217, 119, 6, 0.0)');
  }
  c.fillStyle = grad;
  c.fillRect(0, 0, 64, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a 5-color Tibetan prayer flag string (`藍白紅綠黃`) between `startVec` and `endVec`.
 */
function createSamyePrayerFlagString(startVec, endVec, { count = 14, sag = 0.65 } = {}) {
  const grp = new THREE.Group();
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x3b2f24 });
  const flagColors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];
  const flagBuckets = [[], [], [], [], []];

  const angleY = Math.atan2(endVec.x - startVec.x, endVec.z - startVec.z) + Math.PI / 2;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = THREE.MathUtils.lerp(startVec.x, endVec.x, t);
    const z = THREE.MathUtils.lerp(startVec.z, endVec.z, t);
    const baseY = THREE.MathUtils.lerp(startVec.y, endVec.y, t);
    const y = baseY - Math.sin(t * Math.PI) * sag;

    const fg = new THREE.PlaneGeometry(0.46, 0.56);
    fg.rotateY(angleY);
    fg.translate(x, y - 0.26, z);
    flagBuckets[i % 5].push(fg);
  }

  for (let cIdx = 0; cIdx < 5; cIdx++) {
    if (flagBuckets[cIdx].length === 0) continue;
    const mat = new THREE.MeshStandardMaterial({
      color: flagColors[cIdx],
      emissive: flagColors[cIdx],
      emissiveIntensity: 0.14,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    grp.add(new THREE.Mesh(mergeAndDispose(flagBuckets[cIdx]), mat));
  }

  const dist = startVec.distanceTo(endVec);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, dist, 5), ropeMat);
  cord.position.copy(startVec).lerp(endVec, 0.5);
  cord.position.y -= sag * 0.35;
  cord.lookAt(endVec);
  cord.rotateX(Math.PI / 2);
  grp.add(cord);

  return grp;
}

/**
 * Procedural CanvasTexture for Mount Hepo Ri's summit Vajra suppression mandala (`鎮伏山神金剛壇城`).
 */
function createHepoVajraMandalaTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  if (!c) return null;

  const cx = 128;
  const cy = 128;
  c.fillStyle = '#7c2d12';
  c.fillRect(0, 0, 256, 256);

  const rings = [
    { r: 122, fill: '#451a03', stroke: '#fbbf24', lw: 4 },
    { r: 106, fill: '#9a3412', stroke: '#f59e0b', lw: 3 },
    { r: 84, fill: '#78350f', stroke: '#fde68a', lw: 2.5 },
    { r: 58, fill: '#451a03', stroke: '#fbbf24', lw: 3 },
  ];
  for (const r of rings) {
    c.beginPath();
    c.arc(cx, cy, r.r, 0, TWO_PI);
    c.fillStyle = r.fill;
    c.fill();
    c.lineWidth = r.lw;
    c.strokeStyle = r.stroke;
    c.stroke();
  }

  // 8-spoked Vajra wheel lines
  c.strokeStyle = '#fbbf24';
  c.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
    c.lineTo(cx + Math.cos(a) * 116, cy + Math.sin(a) * 116);
    c.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural CanvasTexture for the Northern Pehar Boss Arena (`(0, -65)`) wrathful Dharmapala mandala.
 */
function createPeharMandalaTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const c = canvas.getContext('2d');
  if (!c) return null;

  const cx = 256;
  const cy = 256;

  // Obsidian stone base
  c.fillStyle = '#0f172a';
  c.fillRect(0, 0, 512, 512);

  const rings = [
    { r: 246, fill: '#450a0a', stroke: '#f59e0b', lw: 5 },
    { r: 222, fill: '#1e293b', stroke: '#dc2626', lw: 4 },
    { r: 186, fill: '#7f1d1d', stroke: '#fbbf24', lw: 3 },
    { r: 138, fill: '#0f172a', stroke: '#ef4444', lw: 3 },
    { r: 88, fill: '#450a0a', stroke: '#fbbf24', lw: 4 },
  ];
  for (const r of rings) {
    c.beginPath();
    c.arc(cx, cy, r.r, 0, TWO_PI);
    c.fillStyle = r.fill;
    c.fill();
    c.lineWidth = r.lw;
    c.strokeStyle = r.stroke;
    c.stroke();
  }

  // 12 wrathful iron triangular spikes around the outer chakra
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * TWO_PI;
    const aMid = ((i + 0.5) / 12) * TWO_PI;
    const a1 = ((i + 1) / 12) * TWO_PI;
    c.beginPath();
    c.moveTo(cx + Math.cos(a0) * 186, cy + Math.sin(a0) * 186);
    c.lineTo(cx + Math.cos(aMid) * 238, cy + Math.sin(aMid) * 238);
    c.lineTo(cx + Math.cos(a1) * 186, cy + Math.sin(a1) * 186);
    c.closePath();
    c.fillStyle = i % 2 === 0 ? '#991b1b' : '#b45309';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = '#fbbf24';
    c.stroke();
  }

  // Crossed Double-Vajra (Visvavajra) axes in burnished gold
  for (let i = 0; i < 4; i++) {
    c.save();
    c.translate(cx, cy);
    c.rotate((i * Math.PI) / 2);
    c.fillStyle = '#fbbf24';
    c.fillRect(-10, -172, 20, 344);
    c.strokeStyle = '#7f1d1d';
    c.lineWidth = 2;
    c.strokeRect(-10, -172, 20, 344);
    c.restore();
  }

  // Central obsidian & gold seal
  c.beginPath();
  c.arc(cx, cy, 42, 0, TWO_PI);
  c.fillStyle = '#0f172a';
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = '#fbbf24';
  c.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createMap(ctx, mapDef = SAMYE_MAP, { presentationOnly = false } = {}) {
  const { state, bus, i18n } = ctx;
  const origin = mapDef?.origin || { x: 5000, z: 0 };
  const ox = origin.x; // 5000
  const oz = origin.z; // 0

  const group = ctx.zoneGroups?.samye || new THREE.Group();
  group.name = 'SamyeMap';
  if (!ctx.zoneGroups?.samye && ctx.scene) {
    ctx.scene.add(group);
  }

  // Local root positioned at map origin (5000, 0, 0) so all local (lx, lz) children map to (5000 + lx, lz)
  const root = new THREE.Group();
  root.name = 'Samye_LocalRoot';
  root.position.set(ox, 0, oz);
  group.add(root);

  const getHeightWorld = (wx, wz) => samyeHeight(wx - ox, wz - oz);
  const getHeight = (lx, lz) => samyeHeight(lx, lz);
  const addCollider = (wx, wz, r) => pushCollider(ctx, 'samye', { type: 'circle', x: wx, z: wz, r });

  // Terrain mesh with SEASON x Firewatch golden-sienna sand dunes, terracotta-red Hepo Ri strata, Pehar arena, and mandala courtyard vertex palette
  const sandCol = new THREE.Color(0xe3b878);
  const duneCol = new THREE.Color(0xc98a4b);
  const duneHighlightCol = new THREE.Color(0xf4cf92);
  const hepoRedCol = new THREE.Color(0xb84a32);
  const hepoDeepRedCol = new THREE.Color(0xd46a48);
  const hepoShadowCol = new THREE.Color(0x882c1b);
  const courtStoneCol = new THREE.Color(0xdcd3c2);
  const peharSlateCol = new THREE.Color(0x3b2f2f);
  const riverSiltCol = new THREE.Color(0xb59162);
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 280,
    segments: 112,
    heightFn: getHeightWorld,
    colorFn(wx, wz, y, lx, lz) {
      const dCenter = Math.hypot(lx, lz);
      const dHepo = Math.hypot(lx - 75, lz - -10);
      const dPehar = Math.hypot(lx - 0, lz - -65);
      if (dCenter < 43.2) {
        return courtStoneCol;
      }
      if (dPehar < 19.5) {
        const u = Math.min(1, Math.max(0, 1 - dPehar / 19.5));
        return tmpCol.lerpColors(sandCol, peharSlateCol, u * 0.82);
      }
      if (dHepo < 42) {
        const u = Math.min(1, Math.max(0, 1 - dHepo / 42));
        const strata = Math.sin(y * 2.8 + lx * 0.14) * 0.5 + 0.5;
        const band = Math.cos(y * 5.2 - lz * 0.1) * 0.5 + 0.5;
        tmpCol.lerpColors(hepoRedCol, hepoDeepRedCol, strata * 0.72);
        if (band < 0.35) {
          tmpCol.lerp(hepoShadowCol, 0.35);
        }
        return tmpCol.lerpColors(sandCol, tmpCol, u * 0.94);
      }
      if (lz > 82) {
        const bankMix = Math.min(1, (lz - 82) / 14);
        return tmpCol.lerpColors(sandCol, riverSiltCol, bankMix * 0.75);
      }
      const n = Math.sin(lx * 0.08) * Math.cos(lz * 0.08) * 0.5 + 0.5;
      const rippleCrest = Math.max(0, Math.sin((lx + lz) * 0.12));
      tmpCol.lerpColors(duneCol, sandCol, n);
      return tmpCol.lerp(duneHighlightCol, rippleCrest * 0.28);
    },
  });
  const windSandTex = createWindRippledSandTexture();
  if (windSandTex && terrainMesh.material) {
    terrainMesh.material.map = windSandTex;
    terrainMesh.material.bumpMap = windSandTex;
    terrainMesh.material.bumpScale = 0.085;
    terrainMesh.material.roughness = 0.9;
    terrainMesh.material.needsUpdate = true;
  }
  group.add(terrainMesh);

  addRimMountains(ctx, group, {
    origin,
    innerR: 132,
    outerR: 195,
    count: 22,
    heightRange: [40, 78],
  });

  scatterRocks(ctx, group, {
    mapId: 'samye',
    origin,
    count: 16,
    rng: seededRandom(3504),
    area: { minR: 54, maxR: 108 },
    avoid: [
      { x: ox, z: oz + 90, r: 16 },
      { x: ox - 30, z: oz + 55, r: 16 },
      { x: ox + 75, z: oz - 10, r: 24 },
      { x: ox, z: oz - 65, r: 22 },
      { x: ox - 60, z: oz + 70, r: 10 },
      { x: ox + 50, z: oz + 75, r: 10 },
    ],
    getHeight: getHeightWorld,
    color: 0x8c7b6b,
  });

  // ---------------------------------------------------------------- Shared Materials (Zero PointLights!)
  const stoneWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1efe9,
    roughness: 0.78,
    metalness: 0.05,
  });
  const carvedStoneMat = new THREE.MeshStandardMaterial({
    color: 0xd6cfc2,
    roughness: 0.84,
    metalness: 0.06,
  });
  const darkSlateMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.74,
    metalness: 0.16,
  });
  const tibetanRedMat = new THREE.MeshStandardMaterial({
    color: 0x8b1e24,
    roughness: 0.72,
    metalness: 0.08,
  });
  const chineseJadeRoofMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    emissive: 0x115e59,
    emissiveIntensity: 0.2,
    roughness: 0.42,
    metalness: 0.28,
  });
  const indianGoldRoofMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.75,
  });
  const woodTimberMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
  });
  const foundationLineMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const torchFlameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.35, 0.3),
    toneMapped: false,
  });
  const torchHaloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 0.95, 0.2),
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const dummy = new THREE.Object3D();

  // ---------------------------------------------------------------- 1. Yarlung Tsangpo River, Reeds, Driftwood, Sand Dunes & Ferry Crossing (0, 90)
  const riverGroup = new THREE.Group();
  riverGroup.name = 'Samye_YarlungRiver';
  root.add(riverGroup);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1e6091,
    emissive: 0x0c4a6e,
    emissiveIntensity: 0.28,
    roughness: 0.22,
    metalness: 0.55,
  });
  const riverPlane = new THREE.Mesh(new THREE.PlaneGeometry(280, 90), waterMat);
  riverPlane.rotation.x = -Math.PI / 2;
  riverPlane.position.set(0, -0.65, 134);
  riverGroup.add(riverPlane);

  // Wooden Ferry Pier & Hide Coracle (`牛皮筏`) at local (0, 90) -> world (5000, 90)
  const pierGroup = new THREE.Group();
  pierGroup.position.set(0, getHeight(0, 90), 90);
  riverGroup.add(pierGroup);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 7.5), woodTimberMat);
  deck.position.set(0, 0.35, 2.2);
  deck.castShadow = true;
  deck.receiveShadow = true;
  pierGroup.add(deck);

  // Pier mooring posts & pilings
  const postPart1 = new THREE.CylinderGeometry(0.16, 0.18, 1.45, 7);
  postPart1.translate(0, 0.45, 0);
  const postPart2 = new THREE.CylinderGeometry(0.21, 0.21, 0.14, 7);
  postPart2.translate(0, 1.18, 0);
  const pierPostGeo = mergeAndDispose([postPart1, postPart2]);
  const pierPostsInst = new THREE.InstancedMesh(pierPostGeo, woodTimberMat, 8);
  const pierPostCoords = [
    [-1.95, -1.2], [1.95, -1.2],
    [-1.95, 1.2], [1.95, 1.2],
    [-1.95, 3.6], [1.95, 3.6],
    [-1.95, 5.6], [1.95, 5.6],
  ];
  for (let i = 0; i < pierPostCoords.length; i++) {
    const [px, pz] = pierPostCoords[i];
    dummy.position.set(px, 0, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    pierPostsInst.setMatrixAt(i, dummy.matrix);
  }
  pierPostsInst.instanceMatrix.needsUpdate = true;
  pierGroup.add(pierPostsInst);

  // Hide Coracle (`牛皮筏`) moored beside the pier with wooden frame & oars
  const coracleMat = new THREE.MeshStandardMaterial({
    color: 0x3f2314,
    roughness: 0.82,
  });
  const coracleMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 12, 8, 0, TWO_PI, Math.PI * 0.45, Math.PI * 0.55),
    coracleMat
  );
  coracleMesh.scale.set(1.15, 0.65, 1.35);
  coracleMesh.position.set(-3.4, 0.25, 3.8);
  pierGroup.add(coracleMesh);

  const coracleRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.09, 7, 18),
    woodTimberMat
  );
  coracleRim.rotation.x = Math.PI / 2;
  coracleRim.scale.set(1.08, 1.25, 1);
  coracleRim.position.set(-3.4, 0.32, 3.8);
  pierGroup.add(coracleRim);

  // Riverside Reeds (`蘆葦叢`, InstancedMesh, 0 colliders) along southern riverbank (`lz > 82`)
  const reedStalk1 = new THREE.ConeGeometry(0.12, 1.35, 5);
  reedStalk1.translate(0, 0.65, 0);
  const reedStalk2 = new THREE.ConeGeometry(0.1, 1.15, 5);
  reedStalk2.rotateZ(0.18);
  reedStalk2.translate(0.16, 0.55, 0.08);
  const reedStalk3 = new THREE.ConeGeometry(0.1, 1.2, 5);
  reedStalk3.rotateZ(-0.16);
  reedStalk3.translate(-0.15, 0.58, -0.06);
  const reedGeo = mergeAndDispose([reedStalk1, reedStalk2, reedStalk3]);
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x6b7f3e,
    roughness: 0.88,
  });
  const REED_COUNT = 54;
  const reedsInst = new THREE.InstancedMesh(reedGeo, reedMat, REED_COUNT);
  const reedRng = seededRandom(4409);
  for (let i = 0; i < REED_COUNT; i++) {
    let rx = (reedRng() - 0.5) * 210;
    if (Math.abs(rx) < 8) rx += rx < 0 ? -9 : 9; // keep pier approach clear
    const rz = 84.5 + reedRng() * 11.5;
    const ry = getHeight(rx, rz) - 0.08;
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set(0, reedRng() * TWO_PI, 0);
    const s = 0.75 + reedRng() * 0.65;
    dummy.scale.set(s, s * (0.85 + reedRng() * 0.35), s);
    dummy.updateMatrix();
    reedsInst.setMatrixAt(i, dummy.matrix);
  }
  reedsInst.instanceMatrix.needsUpdate = true;
  riverGroup.add(reedsInst);

  // Riverside Driftwood & Mooring Stakes (`InstancedMesh`, 0 colliders)
  const driftGeo = new THREE.CylinderGeometry(0.14, 0.19, 2.2, 6);
  driftGeo.rotateZ(Math.PI * 0.46);
  const DRIFT_COUNT = 20;
  const driftInst = new THREE.InstancedMesh(driftGeo, woodTimberMat, DRIFT_COUNT);
  for (let i = 0; i < DRIFT_COUNT; i++) {
    let dx = (reedRng() - 0.5) * 185;
    if (Math.abs(dx) < 10) dx += 14;
    const dz = 83 + reedRng() * 8.5;
    const dy = getHeight(dx, dz) + 0.08;
    dummy.position.set(dx, dy, dz);
    dummy.rotation.set(0, reedRng() * TWO_PI, (reedRng() - 0.5) * 0.18);
    const s = 0.7 + reedRng() * 0.6;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    driftInst.setMatrixAt(i, dummy.matrix);
  }
  driftInst.instanceMatrix.needsUpdate = true;
  riverGroup.add(driftInst);

  // Wind-rippled Sand Dune Crests (`沙丘脊線`, InstancedMesh, 0 colliders) across outer desert plain
  const duneCrestGeo = new THREE.ConeGeometry(4.2, 0.95, 6);
  duneCrestGeo.scale(1.8, 0.55, 0.68);
  duneCrestGeo.translate(0, 0.22, 0);
  const duneCrestMat = new THREE.MeshStandardMaterial({
    color: 0xdfa868,
    roughness: 0.88,
    metalness: 0.03,
    ...(windSandTex ? { map: windSandTex, bumpMap: windSandTex, bumpScale: 0.07 } : {}),
  });
  const DUNE_CREST_COUNT = 28;
  const duneCrestsInst = new THREE.InstancedMesh(duneCrestGeo, duneCrestMat, DUNE_CREST_COUNT);
  const duneRng = seededRandom(8812);
  let duneIdx = 0;
  for (let attempt = 0; attempt < 180 && duneIdx < DUNE_CREST_COUNT; attempt++) {
    const ang = duneRng() * TWO_PI;
    const rad = 56 + duneRng() * 58;
    const dx = Math.cos(ang) * rad;
    const dz = Math.sin(ang) * rad;
    if (dz > 78 || dz < -80) continue;
    if (Math.hypot(dx - 75, dz - -10) < 40) continue; // avoid Mount Hepo Ri
    if (Math.hypot(dx - 0, dz - -65) < 25) continue;  // avoid Pehar Arena
    if (Math.hypot(dx - -30, dz - 55) < 18) continue; // avoid Camp
    const dy = getHeight(dx, dz) - 0.1;
    dummy.position.set(dx, dy, dz);
    dummy.rotation.set(0, duneRng() * Math.PI, 0);
    const sx = 0.85 + duneRng() * 0.7;
    const sy = 0.7 + duneRng() * 0.5;
    dummy.scale.set(sx, sy, sx);
    dummy.updateMatrix();
    duneCrestsInst.setMatrixAt(duneIdx++, dummy.matrix);
  }
  duneCrestsInst.count = duneIdx;
  duneCrestsInst.instanceMatrix.needsUpdate = true;
  root.add(duneCrestsInst);

  // ---------------------------------------------------------------- 2. Construction Camp at local (-30, 55) -> world (4970, 55)
  const campGroup = new THREE.Group();
  campGroup.name = 'Samye_ConstructionCamp';
  campGroup.position.set(-30, getHeight(-30, 55), 55);
  root.add(campGroup);

  const tentClothMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0x78350f,
    emissiveIntensity: 0.12,
    roughness: 0.75,
  });
  const royalCanopy = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.6, 8), tentClothMat);
  royalCanopy.position.set(1.5, 3.2, -3.2);
  royalCanopy.castShadow = true;
  campGroup.add(royalCanopy);

  const royalTrim = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.65, 0.35, 8), tibetanRedMat);
  royalTrim.position.set(1.5, 1.85, -3.2);
  campGroup.add(royalTrim);

  const royalFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), indianGoldRoofMat);
  royalFinial.position.set(1.5, 4.68, -3.2);
  campGroup.add(royalFinial);

  // Master Artisan Drafting Table & Mandala Scroll at Camp
  const draftTable = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.78, 1.25), woodTimberMat);
  draftTable.position.set(1.5, 0.39, -3.2);
  draftTable.castShadow = true;
  const scrollMap = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.95), tentClothMat);
  scrollMap.rotation.x = -Math.PI / 2;
  scrollMap.position.set(1.5, 0.8, -3.2);
  campGroup.add(draftTable, scrollMap);

  // Stockpile of stone blocks & logs next to Master Artisan
  const stockGroup = new THREE.Group();
  stockGroup.position.set(-4.5, 0, -3.0);
  campGroup.add(stockGroup);
  for (let i = 0; i < 6; i++) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.65), stoneWhiteMat);
    blk.position.set((i % 3) * 0.92 - 0.9, Math.floor(i / 3) * 0.56 + 0.28, 0);
    blk.castShadow = true;
    stockGroup.add(blk);
  }

  // ---------------------------------------------------------------- 3. Interactive Resource Nodes (Stone Quarries & Timber Pile)
  const resourceNodes = [
    {
      id: 'quarry_west',
      kind: 'stone',
      lx: -60,
      lz: 70,
      wx: ox - 60, // 4940
      wz: oz + 70, // 70
      promptKey: 'prompt.samyeQuarry',
    },
    {
      id: 'quarry_east',
      kind: 'stone',
      lx: 50,
      lz: 75,
      wx: ox + 50, // 5050
      wz: oz + 75, // 75
      promptKey: 'prompt.samyeQuarry',
    },
    {
      id: 'timber_ferry',
      kind: 'wood',
      lx: 10,
      lz: 88,
      wx: ox + 10, // 5010
      wz: oz + 88, // 88
      promptKey: 'prompt.samyeTimber',
    },
  ];

  const nodeBeaconMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 1.6, 0.4),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const nodeBeacons = [];

  for (const node of resourceNodes) {
    const g = new THREE.Group();
    const ny = getHeight(node.lx, node.lz);
    g.position.set(node.lx, ny, node.lz);
    root.add(g);

    if (node.kind === 'stone') {
      for (let i = 0; i < 5; i++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.75 + (i % 2) * 0.25, 0),
          stoneWhiteMat
        );
        const a = (i / 5) * TWO_PI;
        rock.position.set(Math.cos(a) * 1.1, 0.45, Math.sin(a) * 1.1);
        rock.castShadow = true;
        g.add(rock);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const log = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 2.8, 8),
          woodTimberMat
        );
        log.rotation.z = Math.PI / 2;
        log.position.set(0, 0.24 + Math.floor(i / 3) * 0.44, (i % 3) * 0.52 - 0.52);
        log.castShadow = true;
        g.add(log);
      }
    }

    const ring = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.15, 24), nodeBeaconMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);
    nodeBeacons.push(ring);

    if (!presentationOnly && Array.isArray(ctx.interactables)) {
      const nodePos = new THREE.Vector3(node.wx, ny, node.wz);
      ctx.interactables.push({
        id: `samye:${node.id}`,
        kind: 'samyeResource',
        zone: 'samye',
        action: 'interact',
        labelKey: node.promptKey,
        radius: 3.6,
        getPosition() {
          return nodePos;
        },
        isAvailable() {
          return state.zone === 'samye' && !state.uiOpen && !endingState.playing;
        },
        onInteract() {
          // Handled in samye.update(dt) on `interact` press
        },
      });
    }
  }

  // ---------------------------------------------------------------- 4. Samye Monastery 5 Construction Stages (0..4) at local (0, 0)
  const monasteryGroup = new THREE.Group();
  monasteryGroup.name = 'Samye_Monastery_Mandala';
  monasteryGroup.position.set(0, 0, 0);
  root.add(monasteryGroup);

  // --- Cosmic Mount Meru (`須彌山壇城`) Mandala Courtyard Pavement (`r = 42.8m`, `y = 0.02`) & 4 Cardinal Processional Avenues
  const mandalaPavementGroup = new THREE.Group();
  mandalaPavementGroup.name = 'Samye_MandalaPavement';
  root.add(mandalaPavementGroup);

  const mandalaTex = createSamyeMandalaTexture();
  const mandalaDiscMat = new THREE.MeshStandardMaterial({
    color: mandalaTex ? 0xffffff : 0xd8d0c0,
    map: mandalaTex,
    ...(mandalaTex ? { bumpMap: mandalaTex, bumpScale: 0.04 } : {}),
    roughness: 0.84,
    metalness: 0.05,
  });
  const mandalaDiscMesh = new THREE.Mesh(new THREE.CircleGeometry(42.8, 72), mandalaDiscMat);
  mandalaDiscMesh.rotation.x = -Math.PI / 2;
  mandalaDiscMesh.position.y = 0.02;
  mandalaDiscMesh.receiveShadow = true;
  mandalaPavementGroup.add(mandalaDiscMesh);

  // Concentric 3D carved lotus/mandala rings & 4 Cardinal Processional Flagstone Avenues (N, S, E, W)
  const mandalaRingGeos = [
    new THREE.RingGeometry(12.8, 13.4, 48),
    new THREE.RingGeometry(17.8, 18.3, 48),
    new THREE.RingGeometry(28.2, 28.8, 56),
    new THREE.RingGeometry(36.2, 36.9, 64),
    new THREE.RingGeometry(41.8, 42.55, 64),
  ];
  for (const rg of mandalaRingGeos) {
    rg.rotateX(-Math.PI / 2);
    rg.translate(0, 0.032, 0);
  }
  const mandalaRingsMesh = new THREE.Mesh(mergeAndDispose(mandalaRingGeos), tibetanRedMat);
  mandalaRingsMesh.receiveShadow = true;
  mandalaPavementGroup.add(mandalaRingsMesh);

  // 4 Cardinal Stone Processional Avenues (`North, South, East, West`) paved with carved flagstones (`InstancedMesh`, 0 colliders)
  const flagstonePart = new THREE.BoxGeometry(2.6, 0.05, 1.5);
  const curbLeft = new THREE.BoxGeometry(0.24, 0.11, 1.5);
  curbLeft.translate(-1.48, 0.03, 0);
  const curbRight = new THREE.BoxGeometry(0.24, 0.11, 1.5);
  curbRight.translate(1.48, 0.03, 0);
  const aveSlabGeo = mergeAndDispose([flagstonePart, curbLeft, curbRight]);
  const AVE_STEPS_PER_DIR = 16;
  const aveSlabsInst = new THREE.InstancedMesh(aveSlabGeo, carvedStoneMat, AVE_STEPS_PER_DIR * 4);
  aveSlabsInst.receiveShadow = true;
  let slabIdx = 0;
  for (let dir = 0; dir < 4; dir++) {
    const ang = (dir * Math.PI) / 2;
    for (let s = 0; s < AVE_STEPS_PER_DIR; s++) {
      const dist = 11.4 + s * 1.92;
      dummy.position.set(Math.cos(ang) * dist, 0.03, Math.sin(ang) * dist);
      dummy.rotation.set(0, -ang + Math.PI / 2, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      aveSlabsInst.setMatrixAt(slabIdx++, dummy.matrix);
    }
  }
  aveSlabsInst.instanceMatrix.needsUpdate = true;
  mandalaPavementGroup.add(aveSlabsInst);

  // --- Stage 0: Foundation outlines & scaffolding poles
  const stage0Group = new THREE.Group();
  stage0Group.name = 'Samye_Stage0_Foundations';
  monasteryGroup.add(stage0Group);

  const outerFoundationRing = new THREE.Mesh(
    new THREE.RingGeometry(WALL_RADIUS - 0.6, WALL_RADIUS + 0.6, 64),
    foundationLineMat
  );
  outerFoundationRing.rotation.x = -Math.PI / 2;
  outerFoundationRing.position.y = 0.04;
  stage0Group.add(outerFoundationRing);

  const utseFoundationLine = new THREE.Mesh(
    new THREE.RingGeometry(11.5, 12.4, 4),
    foundationLineMat
  );
  utseFoundationLine.rotation.x = -Math.PI / 2;
  utseFoundationLine.rotation.z = Math.PI / 4;
  utseFoundationLine.position.y = 0.05;
  stage0Group.add(utseFoundationLine);

  // --- Stage 1 & 2: Circular Outer Perimeter Wall (4 cardinal segments: N, E, S, W with gate openings)
  const wallGroup = new THREE.Group();
  wallGroup.name = 'Samye_PerimeterWall';
  monasteryGroup.add(wallGroup);

  // 4 Wall Segments: 0 = North (-Z), 1 = East (+X), 2 = South (+Z), 3 = West (-X)
  const wallSegments = [
    { index: 0, id: 'N', labelKey: 'samye.hud.wallN', wx: ox, wz: oz - WALL_RADIUS, hp: 100, maxHp: 100, broken: false, mesh: null },
    { index: 1, id: 'E', labelKey: 'samye.hud.wallE', wx: ox + WALL_RADIUS, wz: oz, hp: 100, maxHp: 100, broken: false, mesh: null },
    { index: 2, id: 'S', labelKey: 'samye.hud.wallS', wx: ox, wz: oz + WALL_RADIUS, hp: 100, maxHp: 100, broken: false, mesh: null },
    { index: 3, id: 'W', labelKey: 'samye.hud.wallW', wx: ox - WALL_RADIUS, wz: oz, hp: 100, maxHp: 100, broken: false, mesh: null },
  ];

  // Center angles for N (-PI/2), E (0), S (PI/2), W (PI) in (x = cos a, z = sin a)
  const segStartAngles = [-Math.PI * 0.72, -Math.PI * 0.22, Math.PI * 0.28, Math.PI * 0.78];
  const segSpan = Math.PI * 0.44; // leaves 4 cardinal gate openings!

  for (let s = 0; s < 4; s++) {
    const arcGeo = new THREE.CylinderGeometry(
      WALL_RADIUS + 0.55,
      WALL_RADIUS + 0.65,
      3.4,
      24,
      1,
      true,
      segStartAngles[s],
      segSpan
    );
    arcGeo.translate(0, 1.7, 0);
    const arcMat = stoneWhiteMat.clone();
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.castShadow = true;
    arcMesh.receiveShadow = true;

    // Tibetan red Penma upper frieze band attached to each wall segment so it scales with wall damage/stage
    const penmaArcGeo = new THREE.CylinderGeometry(
      WALL_RADIUS + 0.62,
      WALL_RADIUS + 0.64,
      0.55,
      24,
      1,
      true,
      segStartAngles[s],
      segSpan
    );
    penmaArcGeo.translate(0, 3.05, 0);
    const penmaArcMesh = new THREE.Mesh(penmaArcGeo, tibetanRedMat);
    arcMesh.add(penmaArcMesh);

    wallGroup.add(arcMesh);
    wallSegments[s].mesh = arcMesh;
    wallSegments[s].mat = arcMat;
  }

  // 4 Cardinal Gatehouse Portals (N, E, S, W) framing the perimeter wall openings (0 colliders!)
  const gateAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  const gateWheelGeo = createDharmaWheelGeometry(0.55, 0.06);
  for (const ga of gateAngles) {
    const gatePortal = new THREE.Group();
    const gx = Math.cos(ga) * (WALL_RADIUS + 0.55);
    const gz = Math.sin(ga) * (WALL_RADIUS + 0.55);
    gatePortal.position.set(gx, 0, gz);
    gatePortal.rotation.y = -ga + Math.PI / 2;

    for (const side of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.8, 1.15), stoneWhiteMat);
      jamb.position.set(side * 2.55, 1.9, 0);
      jamb.castShadow = true;
      gatePortal.add(jamb);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.65, 1.35), tibetanRedMat);
    lintel.position.set(0, 3.95, 0);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.25, 1.5), indianGoldRoofMat);
    cornice.position.set(0, 4.4, 0);
    const wheel = new THREE.Mesh(gateWheelGeo, indianGoldRoofMat);
    wheel.position.set(0, 4.95, 0);
    gatePortal.add(lintel, cornice, wheel);
    wallGroup.add(gatePortal);
  }

  // Night Emissive Torches along the 4 Wall Gates (ZERO PointLights!)
  const wallTorchesGroup = new THREE.Group();
  wallTorchesGroup.name = 'Samye_EmissiveWallTorches';
  wallTorchesGroup.visible = false;
  monasteryGroup.add(wallTorchesGroup);

  const torchPostGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6);
  const torchFlameGeo = new THREE.ConeGeometry(0.22, 0.55, 7);
  const torchHaloGeo = new THREE.SphereGeometry(0.48, 8, 8);
  for (const ga of gateAngles) {
    for (const offset of [-0.08, 0.08]) {
      const ang = ga + offset;
      const tx = Math.cos(ang) * (WALL_RADIUS + 0.9);
      const tz = Math.sin(ang) * (WALL_RADIUS + 0.9);
      const post = new THREE.Mesh(torchPostGeo, woodTimberMat);
      post.position.set(tx, 2.2, tz);
      const flame = new THREE.Mesh(torchFlameGeo, torchFlameMat);
      flame.position.set(tx, 3.1, tz);
      const halo = new THREE.Mesh(torchHaloGeo, torchHaloMat);
      halo.position.set(tx, 3.1, tz);
      wallTorchesGroup.add(post, flame, halo);
    }
  }

  // Shared Tibetan architectural facade materials: black trapezoidal fantsang frames & warm golden-amber interior panes (0 PointLights!)
  const fantsangFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.85,
    metalness: 0.06,
  });
  const warmWindowPaneMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xffb347,
    emissiveIntensity: 0.35,
    roughness: 0.38,
    metalness: 0.12,
  });

  // Helper to append a Tibetan trapezoidal window (`fantsang`) + warm amber pane + crimson lintel into geometry buckets
  function pushTibetanWindow(frameBucket, paneBucket, goldBucket, x, y, z, rotY, w = 0.95, h = 1.25) {
    // Stepped trapezoidal black casing (wider at bottom, narrower at top with projecting lintel hood)
    const lowerFrame = new THREE.BoxGeometry(w * 1.12, h * 0.52, 0.12);
    lowerFrame.translate(0, -h * 0.22, 0);
    const upperFrame = new THREE.BoxGeometry(w * 0.96, h * 0.52, 0.12);
    upperFrame.translate(0, h * 0.22, 0);
    const hood = new THREE.BoxGeometry(w * 1.22, 0.14, 0.18);
    hood.translate(0, h * 0.52, 0.02);
    for (const fg of [lowerFrame, upperFrame, hood]) {
      fg.translate(x, y, z);
      fg.rotateY(rotY);
      frameBucket.push(fg);
    }

    const pane = new THREE.BoxGeometry(w * 0.68, h * 0.74, 0.15);
    pane.translate(x, y, z);
    pane.rotateY(rotY);
    paneBucket.push(pane);

    if (goldBucket) {
      const sill = new THREE.BoxGeometry(w * 0.86, 0.08, 0.16);
      sill.translate(x, y + h * 0.42, z);
      sill.rotateY(rotY);
      goldBucket.push(sill);
    }
  }

  // --- Central Utse Great Hall (`烏孜大殿` — 3 stories: Tibetan, Chinese, Indian)
  const utseFloor1Group = new THREE.Group(); // Stage 1+: Tibetan stone base
  const utseFloor2Group = new THREE.Group(); // Stage 2+: Chinese glazed-tile eave second floor
  const utseFloor3Group = new THREE.Group(); // Stage 3+: Indian golden dome/roof third floor
  monasteryGroup.add(utseFloor1Group, utseFloor2Group, utseFloor3Group);

  // Floor 1 (Tibetan style): carved lotus/stone plinth + whitewashed battered stone walls + crimson Penma frieze + golden medallions + 4 cardinal porticoes
  const utseF1Plinth = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.65, 17.4), carvedStoneMat);
  utseF1Plinth.position.y = 0.325;
  utseF1Plinth.receiveShadow = true;
  const utseF1Body = new THREE.Mesh(new THREE.BoxGeometry(16.0, 5.2, 16.0), stoneWhiteMat);
  utseF1Body.position.y = 2.6;
  utseF1Body.castShadow = true;
  utseF1Body.receiveShadow = true;
  const utseF1Band = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.9, 16.3), tibetanRedMat);
  utseF1Band.position.y = 4.75;
  const utseF1GoldTrim = new THREE.Mesh(new THREE.BoxGeometry(16.45, 0.2, 16.45), indianGoldRoofMat);
  utseF1GoldTrim.position.y = 5.25;
  utseFloor1Group.add(utseF1Plinth, utseF1Body, utseF1Band, utseF1GoldTrim);

  // Cardinal Porticoes, Tibetan Black Trapezoidal Windows (`fantsang`), & Golden Melong Medallions on Utse Floor 1
  const porticoGeoParts = [];
  const f1FrameParts = [];
  const f1PaneParts = [];
  const melongParts = [];
  for (let d = 0; d < 4; d++) {
    const rotY = (d * Math.PI) / 2;
    const lintelG = new THREE.BoxGeometry(4.4, 0.48, 1.4);
    lintelG.translate(0, 3.55, 8.45);
    lintelG.rotateY(rotY);
    porticoGeoParts.push(lintelG);
    for (const s of [-1.5, 1.5]) {
      const colG = new THREE.CylinderGeometry(0.22, 0.26, 3.4, 8);
      colG.translate(s, 1.7, 8.55);
      colG.rotateY(rotY);
      porticoGeoParts.push(colG);
    }
    // Sanctum entrance door under each cardinal portico
    pushTibetanWindow(f1FrameParts, f1PaneParts, melongParts, 0, 1.85, 8.02, rotY, 1.65, 2.35);
    // Flanking ground-floor & upper-gallery fantsang windows on all 4 facades
    for (const wx of [-5.8, -3.5, 3.5, 5.8]) {
      pushTibetanWindow(f1FrameParts, f1PaneParts, melongParts, wx, 2.25, 8.02, rotY, 0.95, 1.25);
      pushTibetanWindow(f1FrameParts, f1PaneParts, melongParts, wx, 3.75, 8.02, rotY, 0.82, 0.95);
    }
    // Golden Melong Mirror Bosses along Floor 1 Penma Frieze
    for (let k = -3; k <= 3; k++) {
      const boss = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 10);
      boss.rotateX(Math.PI / 2);
      boss.translate(k * 2.2, 4.75, 8.18);
      boss.rotateY(rotY);
      melongParts.push(boss);
    }
  }
  const utsePorticoesMesh = new THREE.Mesh(mergeAndDispose(porticoGeoParts), tibetanRedMat);
  utsePorticoesMesh.castShadow = true;
  const utseF1FramesMesh = new THREE.Mesh(mergeAndDispose(f1FrameParts), fantsangFrameMat);
  const utseF1PanesMesh = new THREE.Mesh(mergeAndDispose(f1PaneParts), warmWindowPaneMat);
  const utseMelongMesh = new THREE.Mesh(mergeAndDispose(melongParts), indianGoldRoofMat);
  utseFloor1Group.add(utsePorticoesMesh, utseF1FramesMesh, utseF1PanesMesh, utseMelongMesh);

  // Collider for Central Utse Great Hall so player walks around it
  addCollider(ox, oz, 9.5);

  // Floor 2 (Chinese style): crimson colonnade + sweeping jade-green overhanging eaves + upturned corner ridges + lattice windows
  const utseF2Body = new THREE.Mesh(new THREE.BoxGeometry(12.2, 4.0, 12.2), tibetanRedMat);
  utseF2Body.position.y = 7.2;
  utseF2Body.castShadow = true;
  const utseF2Balustrade = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.45, 13.4), indianGoldRoofMat);
  utseF2Balustrade.position.y = 5.45;
  const utseF2Roof = new THREE.Mesh(new THREE.ConeGeometry(10.6, 1.8, 4), chineseJadeRoofMat);
  utseF2Roof.rotation.y = Math.PI / 4;
  utseF2Roof.position.y = 9.6;

  // Upturned Chinese Jade Eave Corners (`飛簷翹角`) + Floor 2 Windows & Golden Mirror Bosses
  const eaveCornerParts = [];
  const f2FrameParts = [];
  const f2PaneParts = [];
  const f2GoldParts = [];
  for (let cIdx = 0; cIdx < 4; cIdx++) {
    const rotY = (cIdx * Math.PI) / 2;
    const horn = new THREE.ConeGeometry(0.45, 1.65, 5);
    horn.rotateZ(-Math.PI * 0.32);
    horn.translate(7.4, 9.15, 0);
    horn.rotateY(rotY + Math.PI / 4);
    eaveCornerParts.push(horn);

    for (const wx of [-3.8, -1.3, 1.3, 3.8]) {
      pushTibetanWindow(f2FrameParts, f2PaneParts, f2GoldParts, wx, 7.15, 6.12, rotY, 0.88, 1.2);
    }
    for (let k = -2; k <= 2; k++) {
      const boss = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10);
      boss.rotateX(Math.PI / 2);
      boss.translate(k * 2.2, 8.45, 6.14);
      boss.rotateY(rotY);
      f2GoldParts.push(boss);
    }
  }
  const utseF2EaveHorns = new THREE.Mesh(mergeAndDispose(eaveCornerParts), chineseJadeRoofMat);
  const utseF2FramesMesh = new THREE.Mesh(mergeAndDispose(f2FrameParts), fantsangFrameMat);
  const utseF2PanesMesh = new THREE.Mesh(mergeAndDispose(f2PaneParts), warmWindowPaneMat);
  const utseF2GoldMesh = new THREE.Mesh(mergeAndDispose(f2GoldParts), indianGoldRoofMat);
  utseFloor2Group.add(
    utseF2Body,
    utseF2Balustrade,
    utseF2Roof,
    utseF2EaveHorns,
    utseF2FramesMesh,
    utseF2PanesMesh,
    utseF2GoldMesh
  );

  // Floor 3 (Indian style): carved lotus plinth + mandala pavilion + gleaming golden roof (Serto) + rooftop Dharma Wheel & Twin Deer
  const utseF3LotusBase = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 6.8, 0.55, 16), carvedStoneMat);
  utseF3LotusBase.position.y = 9.95;
  const utseF3Body = new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.2, 8.4), stoneWhiteMat);
  utseF3Body.position.y = 11.4;
  utseF3Body.castShadow = true;
  const utseF3Penma = new THREE.Mesh(new THREE.BoxGeometry(8.65, 0.55, 8.65), tibetanRedMat);
  utseF3Penma.position.y = 12.75;
  const utseF3GoldRoof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 2.8, 4), indianGoldRoofMat);
  utseF3GoldRoof.rotation.y = Math.PI / 4;
  utseF3GoldRoof.position.y = 14.2;
  const utseFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), indianGoldRoofMat);
  utseFinial.position.y = 16.2;
  const utseRoofWheel = new THREE.Mesh(createDharmaWheelGeometry(0.95, 0.1), indianGoldRoofMat);
  utseRoofWheel.position.set(0, 13.8, 4.6);

  const f3FrameParts = [];
  const f3PaneParts = [];
  const f3GoldParts = [];
  for (let d = 0; d < 4; d++) {
    const rotY = (d * Math.PI) / 2;
    for (const wx of [-2.4, 0, 2.4]) {
      pushTibetanWindow(f3FrameParts, f3PaneParts, f3GoldParts, wx, 11.35, 4.22, rotY, 0.78, 1.05);
    }
    for (const bx of [-2.6, -1.3, 0, 1.3, 2.6]) {
      const boss = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10);
      boss.rotateX(Math.PI / 2);
      boss.translate(bx, 12.75, 4.35);
      boss.rotateY(rotY);
      f3GoldParts.push(boss);
    }
  }
  const utseF3FramesMesh = new THREE.Mesh(mergeAndDispose(f3FrameParts), fantsangFrameMat);
  const utseF3PanesMesh = new THREE.Mesh(mergeAndDispose(f3PaneParts), warmWindowPaneMat);
  const utseF3GoldMesh = new THREE.Mesh(mergeAndDispose(f3GoldParts), indianGoldRoofMat);
  utseFloor3Group.add(
    utseF3LotusBase,
    utseF3Body,
    utseF3Penma,
    utseF3GoldRoof,
    utseFinial,
    utseRoofWheel,
    utseF3FramesMesh,
    utseF3PanesMesh,
    utseF3GoldMesh
  );

  // --- Stage 2 & 3: Four Colored Stupas (`四色塔`: White SE, Red SW, Black NW, Green NE)
  const stupaFoundationsGroup = new THREE.Group();
  const fourStupasGroup = new THREE.Group();
  monasteryGroup.add(stupaFoundationsGroup, fourStupasGroup);

  const coloredStupaDefs = [
    { id: 'white_se', lx: 21, lz: 21, color: 0xf8fafc, emissive: 0x64748b },   // SE White Stupa
    { id: 'red_sw', lx: -21, lz: 21, color: 0xdc2626, emissive: 0x991b1b },    // SW Red Stupa
    { id: 'black_nw', lx: -21, lz: -21, color: 0x1e293b, emissive: 0x0f172a }, // NW Black Stupa
    { id: 'green_ne', lx: 21, lz: -21, color: 0x0d9488, emissive: 0x115e59 },  // NE Green/Turquoise Stupa
  ];

  // Painted Buddha-eye harmika texture + golden spire/parasol/finial geometry for the 4 colored stupas
  const buddhaEyesTex = createBuddhaEyesHarmikaTexture();
  const stupaHarmikaEyesMat = new THREE.MeshStandardMaterial({
    color: buddhaEyesTex ? 0xffffff : 0xfbbf24,
    map: buddhaEyesTex,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    roughness: 0.36,
    metalness: 0.32,
  });
  const stupaHarmikaGeo = new THREE.BoxGeometry(1.52, 0.64, 1.52);
  const stupaLotusPlinthGeo = new THREE.CylinderGeometry(2.35, 2.65, 0.36, 16);
  const stupaCrownParts = [
    new THREE.BoxGeometry(1.66, 0.14, 1.66).translate(0, 4.32, 0), // Golden cornice above harmika
    new THREE.ConeGeometry(0.85, 2.8, 10).translate(0, 5.45, 0),   // 13-tier Dharmachakra spire
    new THREE.CylinderGeometry(1.1, 1.2, 0.14, 14).translate(0, 6.88, 0), // Golden parasol (Chatra)
    new THREE.OctahedronGeometry(0.38, 0).translate(0, 7.35, 0),   // Sun-Moon-Flame finial
  ];
  const stupaGoldCrownGeo = mergeAndDispose(stupaCrownParts);

  for (const cs of coloredStupaDefs) {
    // Stage 2 stone foundation plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 5.4), stoneWhiteMat);
    plinth.position.set(cs.lx, 0.55, cs.lz);
    plinth.castShadow = true;
    stupaFoundationsGroup.add(plinth);

    // Stage 3 full colored stupa with lotus plinth, stepped throne, colored bumpa, painted Buddha-eye harmika, and golden crown
    const sMat = new THREE.MeshStandardMaterial({
      color: cs.color,
      emissive: cs.emissive,
      emissiveIntensity: 0.32,
      roughness: 0.55,
      metalness: 0.12,
    });
    const sg = new THREE.Group();
    sg.position.set(cs.lx, 1.1, cs.lz);

    const lotusBase = new THREE.Mesh(stupaLotusPlinthGeo, carvedStoneMat);
    lotusBase.position.y = 0.18;
    const tier = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 4.2), sMat);
    tier.position.y = 0.85;
    tier.castShadow = true;
    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.65, 3.3), sMat);
    tier2.position.y = 1.92;
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 2.0, 12), sMat);
    dome.position.y = 2.95;
    dome.castShadow = true;
    const neckBand = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.28, 12), tibetanRedMat);
    neckBand.position.y = 3.68;
    const harmika = new THREE.Mesh(stupaHarmikaGeo, stupaHarmikaEyesMat);
    harmika.position.y = 3.98;
    const crown = new THREE.Mesh(stupaGoldCrownGeo, indianGoldRoofMat);

    // Carved golden shrine niche (`佛龕`) on the bumpa facing inward toward Utse
    const inwardAng = Math.atan2(-cs.lx, -cs.lz);
    const nicheFrame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.92, 0.28), indianGoldRoofMat);
    nicheFrame.position.set(Math.sin(inwardAng) * 1.58, 2.92, Math.cos(inwardAng) * 1.58);
    nicheFrame.rotation.y = inwardAng;
    const nichePane = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.64, 0.32), warmWindowPaneMat);
    nichePane.position.copy(nicheFrame.position);
    nichePane.rotation.y = inwardAng;

    sg.add(lotusBase, tier, tier2, dome, neckBand, harmika, crown, nicheFrame, nichePane);
    fourStupasGroup.add(sg);

    addCollider(ox + cs.lx, oz + cs.lz, 2.8);
  }

  // --- Stage 3: Four Continents Temples (`四大部洲殿` at N, E, S, W)
  const fourContinentsGroup = new THREE.Group();
  monasteryGroup.add(fourContinentsGroup);

  const continentCoords = [
    [0, -25],
    [25, 0],
    [0, 25],
    [-25, 0],
  ];
  const continentWheelGeo = createDharmaWheelGeometry(0.58, 0.065);
  // Pre-build shared facade details for each of the Four Continents Temples (fantsang windows, doorway, golden mirror bosses)
  const contFrameParts = [];
  const contPaneParts = [];
  const contGoldParts = [];
  // Front doorway + flanking front windows
  pushTibetanWindow(contFrameParts, contPaneParts, contGoldParts, 0, 1.38, 3.12, 0, 1.25, 1.95);
  for (const wx of [-2.05, 2.05]) {
    pushTibetanWindow(contFrameParts, contPaneParts, contGoldParts, wx, 2.05, 3.12, 0, 0.78, 1.05);
  }
  // Left, Right & Back facade windows + 4-side golden mirror bosses on Penma frieze
  for (let sideIdx = 0; sideIdx < 4; sideIdx++) {
    const rotY = (sideIdx * Math.PI) / 2;
    if (sideIdx > 0) {
      for (const wx of [-1.75, 0, 1.75]) {
        pushTibetanWindow(contFrameParts, contPaneParts, contGoldParts, wx, 2.05, 3.12, rotY, 0.78, 1.05);
      }
    }
    for (const bx of [-2.2, -1.1, 0, 1.1, 2.2]) {
      const boss = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10);
      boss.rotateX(Math.PI / 2);
      boss.translate(bx, 3.85, 3.32);
      boss.rotateY(rotY);
      contGoldParts.push(boss);
    }
  }
  const contFramesGeo = mergeAndDispose(contFrameParts);
  const contPanesGeo = mergeAndDispose(contPaneParts);
  const contGoldGeo = mergeAndDispose(contGoldParts);

  for (const [cx, cz] of continentCoords) {
    const cg = new THREE.Group();
    cg.position.set(cx, 0, cz);
    cg.rotation.y = Math.atan2(-cx, -cz); // face inward toward Utse Great Hall

    const lotusPlinth = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.45, 7.0), carvedStoneMat);
    lotusPlinth.position.y = 0.225;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 6.2), stoneWhiteMat);
    hall.position.y = 1.8;
    hall.castShadow = true;
    hall.receiveShadow = true;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.65, 6.6), tibetanRedMat);
    roof.position.y = 3.85;
    const goldCornice = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 6.8), indianGoldRoofMat);
    goldCornice.position.y = 4.24;
    const porchCanopy = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, 1.35), chineseJadeRoofMat);
    porchCanopy.position.set(0, 2.85, 3.45);
    const dharmaWheel = new THREE.Mesh(continentWheelGeo, indianGoldRoofMat);
    dharmaWheel.position.set(0, 4.82, 0);
    const framesMesh = new THREE.Mesh(contFramesGeo, fantsangFrameMat);
    const panesMesh = new THREE.Mesh(contPanesGeo, warmWindowPaneMat);
    const bossesMesh = new THREE.Mesh(contGoldGeo, indianGoldRoofMat);

    cg.add(lotusPlinth, hall, roof, goldCornice, porchCanopy, dharmaWheel, framesMesh, panesMesh, bossesMesh);
    fourContinentsGroup.add(cg);
    addCollider(ox + cx, oz + cz, 3.4);
  }

  // --- Stage 4: Sun & Moon Chapels (`日月殿`), Eight Sub-continents (`八小洲殿`),
  //              1008 Mini-Stupas (`InstancedMesh`), and Prayer Flags
  const stage4Group = new THREE.Group();
  stage4Group.name = 'Samye_Stage4_Complete';
  monasteryGroup.add(stage4Group);

  // Sun Chapel (North of Utse: `local (0, -14.5)`) & Moon Chapel (South of Utse: `local (0, 14.5)`)
  const sunChapel = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.5, 3.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.45, roughness: 0.4 })
  );
  sunChapel.position.set(0, 1.6, -14.5);
  const sunRoof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.35, 12), indianGoldRoofMat);
  sunRoof.position.set(0, 3.85, -14.5);

  const moonChapel = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.5, 3.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.45, roughness: 0.4 })
  );
  moonChapel.position.set(0, 1.6, 14.5);
  const moonRoof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.35, 12), chineseJadeRoofMat);
  moonRoof.position.set(0, 3.85, 14.5);
  stage4Group.add(sunChapel, sunRoof, moonChapel, moonRoof);

  // Eight Sub-continents Chapels (`八小洲殿`) as InstancedMeshes (white stone body + red Penma roof band + golden finial + warm window panes)
  const subChapelGeo = new THREE.BoxGeometry(3.4, 2.6, 3.4);
  subChapelGeo.translate(0, 1.3, 0);
  const subChapelInst = new THREE.InstancedMesh(subChapelGeo, stoneWhiteMat, 8);

  const subRoofBandGeo = new THREE.BoxGeometry(3.68, 0.45, 3.68);
  subRoofBandGeo.translate(0, 2.75, 0);
  const subRoofBandInst = new THREE.InstancedMesh(subRoofBandGeo, tibetanRedMat, 8);

  const subFinialGeo = new THREE.ConeGeometry(0.55, 0.95, 8);
  subFinialGeo.translate(0, 3.42, 0);
  const subFinialInst = new THREE.InstancedMesh(subFinialGeo, indianGoldRoofMat, 8);

  const subWinGeo = new THREE.BoxGeometry(3.46, 0.72, 0.65);
  subWinGeo.translate(0, 1.48, 0);
  const subWinInst = new THREE.InstancedMesh(subWinGeo, warmWindowPaneMat, 8);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI + Math.PI / 8;
    dummy.position.set(Math.cos(a) * 31.5, 0, Math.sin(a) * 31.5);
    dummy.rotation.set(0, -a, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    subChapelInst.setMatrixAt(i, dummy.matrix);
    subRoofBandInst.setMatrixAt(i, dummy.matrix);
    subFinialInst.setMatrixAt(i, dummy.matrix);
    subWinInst.setMatrixAt(i, dummy.matrix);
  }
  subChapelInst.instanceMatrix.needsUpdate = true;
  subRoofBandInst.instanceMatrix.needsUpdate = true;
  subFinialInst.instanceMatrix.needsUpdate = true;
  subWinInst.instanceMatrix.needsUpdate = true;
  stage4Group.add(subChapelInst, subRoofBandInst, subFinialInst, subWinInst);

  // 1008 Mini-Stupas along the top of the circular perimeter wall (SINGLE InstancedMesh, count = 1008!)
  const miniStupaGeo = createMiniStupaGeometry();
  const miniStupaMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xd97706,
    emissiveIntensity: 0.42,
    roughness: 0.45,
    metalness: 0.25,
  });
  const miniStupasInst = new THREE.InstancedMesh(miniStupaGeo, miniStupaMat, MINI_STUPA_COUNT);
  miniStupasInst.name = 'SamyeMiniStupas1008';

  function updateMiniStupasTransform(litFraction = 1.0) {
    const limit = Math.max(0, Math.min(MINI_STUPA_COUNT, Math.round(MINI_STUPA_COUNT * litFraction)));
    for (let i = 0; i < MINI_STUPA_COUNT; i++) {
      const ang = (i / MINI_STUPA_COUNT) * TWO_PI;
      const r = WALL_RADIUS + 0.6;
      dummy.position.set(Math.cos(ang) * r, 3.4, Math.sin(ang) * r);
      dummy.rotation.set(0, -ang, 0);
      const s = i < limit ? 1.0 : 0.001;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      miniStupasInst.setMatrixAt(i, dummy.matrix);
    }
    miniStupasInst.instanceMatrix.needsUpdate = true;
  }
  updateMiniStupasTransform(1.0);
  stage4Group.add(miniStupasInst);

  // Radial 5-Color Tibetan Prayer Flag Canopy from Utse roof to perimeter wall
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TWO_PI;
    const startV = new THREE.Vector3(Math.cos(ang) * 6.8, 12.6, Math.sin(ang) * 6.8);
    const endV = new THREE.Vector3(Math.cos(ang) * 42.4, 3.9, Math.sin(ang) * 42.4);
    stage4Group.add(createSamyePrayerFlagString(startV, endV, { count: 18, sag: 1.15 }));
  }

  // ---------------------------------------------------------------- 5. Mount Hepo Ri (`(75, -10)`) Red-Sandstone Cliffs, Pilgrimage Steps & Summit Mandala
  const hepoSlopesGroup = new THREE.Group();
  hepoSlopesGroup.name = 'Samye_HepoRiSlopes';
  root.add(hepoSlopesGroup);

  // 5a. Rugged Terracotta-Red Sandstone Cliff Strata Outcrops ringing Mount Hepo Ri (`InstancedMesh`, 0 colliders)
  const cliffSlab1 = new THREE.DodecahedronGeometry(1.35, 0);
  cliffSlab1.scale(1.45, 0.68, 0.92);
  cliffSlab1.translate(0, 0.45, 0);
  const cliffSlab2 = new THREE.DodecahedronGeometry(0.95, 0);
  cliffSlab2.scale(1.2, 0.55, 0.85);
  cliffSlab2.translate(0.55, 0.85, 0.15);
  const hepoCliffGeo = mergeAndDispose([cliffSlab1, cliffSlab2]);
  const hepoCliffMat = new THREE.MeshStandardMaterial({
    color: 0xb84a32,
    emissive: 0x451a03,
    emissiveIntensity: 0.1,
    roughness: 0.86,
    metalness: 0.04,
  });
  const HEPO_CLIFF_COUNT = 36;
  const hepoCliffsInst = new THREE.InstancedMesh(hepoCliffGeo, hepoCliffMat, HEPO_CLIFF_COUNT);
  hepoCliffsInst.castShadow = true;
  hepoCliffsInst.receiveShadow = true;
  const hepoRng = seededRandom(7510);
  let cliffIdx = 0;
  for (let i = 0; i < 80 && cliffIdx < HEPO_CLIFF_COUNT; i++) {
    const ang = (i / HEPO_CLIFF_COUNT) * TWO_PI + (hepoRng() - 0.5) * 0.18;
    // Leave western staircase approach (`cos(ang) < -0.78`) open!
    if (Math.cos(ang) < -0.78 && Math.abs(Math.sin(ang)) < 0.45) continue;
    const rad = 15.8 + (i % 3) * 7.2 + hepoRng() * 3.2;
    const cx = 75 + Math.cos(ang) * rad;
    const cz = -10 + Math.sin(ang) * rad;
    const cy = getHeight(cx, cz) - 0.25;
    dummy.position.set(cx, cy, cz);
    dummy.rotation.set((hepoRng() - 0.5) * 0.35, -ang + Math.PI / 2, (hepoRng() - 0.5) * 0.28);
    const sx = 1.1 + hepoRng() * 0.85;
    const sy = 0.9 + hepoRng() * 0.75;
    dummy.scale.set(sx, sy, sx * 0.85);
    dummy.updateMatrix();
    hepoCliffsInst.setMatrixAt(cliffIdx++, dummy.matrix);
  }
  hepoCliffsInst.count = cliffIdx;
  hepoCliffsInst.instanceMatrix.needsUpdate = true;
  hepoSlopesGroup.add(hepoCliffsInst);

  // 5b. Wind-blown Desert Scrub & Tamarisk Bushes (`InstancedMesh`, 0 colliders)
  const bushPart1 = new THREE.IcosahedronGeometry(0.52, 0);
  bushPart1.scale(1.25, 0.72, 1.15);
  bushPart1.translate(0, 0.32, 0);
  const bushPart2 = new THREE.IcosahedronGeometry(0.38, 0);
  bushPart2.translate(0.35, 0.26, 0.22);
  const scrubGeo = mergeAndDispose([bushPart1, bushPart2]);
  const scrubMat = new THREE.MeshStandardMaterial({
    color: 0x6b603b,
    roughness: 0.92,
  });
  const SCRUB_COUNT = 44;
  const scrubInst = new THREE.InstancedMesh(scrubGeo, scrubMat, SCRUB_COUNT);
  for (let i = 0; i < SCRUB_COUNT; i++) {
    const ang = hepoRng() * TWO_PI;
    const rad = 17.5 + hepoRng() * 25.0;
    const bx = 75 + Math.cos(ang) * rad;
    const bz = -10 + Math.sin(ang) * rad;
    const by = getHeight(bx, bz) - 0.05;
    dummy.position.set(bx, by, bz);
    dummy.rotation.set(0, hepoRng() * TWO_PI, 0);
    const s = 0.65 + hepoRng() * 0.65;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    scrubInst.setMatrixAt(i, dummy.matrix);
  }
  scrubInst.instanceMatrix.needsUpdate = true;
  hepoSlopesGroup.add(scrubInst);

  // 5c. Winding Western Stone Pilgrimage Staircase & Prayer Flag Poles climbing Mount Hepo Ri (`0` colliders)
  const stepSlab = new THREE.BoxGeometry(1.15, 0.22, 2.8);
  const stepCurbN = new THREE.BoxGeometry(1.2, 0.34, 0.26);
  stepCurbN.translate(0, 0.06, -1.45);
  const stepCurbS = new THREE.BoxGeometry(1.2, 0.34, 0.26);
  stepCurbS.translate(0, 0.06, 1.45);
  const hepoStepGeo = mergeAndDispose([stepSlab, stepCurbN, stepCurbS]);
  const HEPO_STEPS = 24;
  const hepoStepsInst = new THREE.InstancedMesh(hepoStepGeo, carvedStoneMat, HEPO_STEPS);
  hepoStepsInst.receiveShadow = true;

  const poleShaft = new THREE.CylinderGeometry(0.06, 0.08, 3.2, 6);
  poleShaft.translate(0, 1.6, 0);
  const poleBanner = new THREE.BoxGeometry(0.04, 1.8, 0.52);
  poleBanner.translate(0, 2.0, 0.28);
  const flagPoleGeo = mergeAndDispose([poleShaft, poleBanner]);
  const HEPO_POLES = 10;
  const hepoPolesInst = new THREE.InstancedMesh(flagPoleGeo, indianGoldRoofMat, HEPO_POLES);

  for (let i = 0; i < HEPO_STEPS; i++) {
    const t = i / (HEPO_STEPS - 1);
    const sx = 35.5 + t * 25.0; // climbs from lx = 35.5 up to summit rim at lx = 60.5
    const sz = -10 + Math.sin(t * Math.PI * 2) * 1.65;
    const sy = getHeight(sx, sz) + 0.05;
    dummy.position.set(sx, sy, sz);
    dummy.rotation.set(0, -Math.cos(t * Math.PI * 2) * 0.16, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    hepoStepsInst.setMatrixAt(i, dummy.matrix);
  }
  hepoStepsInst.instanceMatrix.needsUpdate = true;
  hepoSlopesGroup.add(hepoStepsInst);

  for (let i = 0; i < HEPO_POLES; i++) {
    const t = i / (HEPO_POLES - 1);
    const px = 36.5 + t * 23.5;
    const side = i % 2 === 0 ? -2.1 : 2.1;
    const pz = -10 + Math.sin(t * Math.PI * 2) * 1.65 + side;
    const py = getHeight(px, pz);
    dummy.position.set(px, py, pz);
    dummy.rotation.set(0, i * 0.4, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    hepoPolesInst.setMatrixAt(i, dummy.matrix);
  }
  hepoPolesInst.instanceMatrix.needsUpdate = true;
  hepoSlopesGroup.add(hepoPolesInst);

  // Extra 5-color prayer flag strings overlooking Samye Monastery from the western ridge of Mount Hepo Ri
  const hepoRidgeFlagSpans = [
    [new THREE.Vector3(60.5, getHeight(60.5, -15.5) + 2.8, -15.5), new THREE.Vector3(60.5, getHeight(60.5, -4.5) + 2.8, -4.5)],
    [new THREE.Vector3(61.0, getHeight(61.0, -14.2) + 2.9, -14.2), new THREE.Vector3(48.5, getHeight(48.5, -13.0) + 2.8, -13.0)],
    [new THREE.Vector3(61.0, getHeight(61.0, -5.8) + 2.9, -5.8), new THREE.Vector3(48.5, getHeight(48.5, -7.0) + 2.8, -7.0)],
    [new THREE.Vector3(48.5, getHeight(48.5, -13.0) + 2.8, -13.0), new THREE.Vector3(37.0, getHeight(37.0, -12.0) + 2.7, -12.0)],
    [new THREE.Vector3(48.5, getHeight(48.5, -7.0) + 2.8, -7.0), new THREE.Vector3(37.0, getHeight(37.0, -8.0) + 2.7, -8.0)],
  ];
  for (const [sv, ev] of hepoRidgeFlagSpans) {
    hepoSlopesGroup.add(createSamyePrayerFlagString(sv, ev, { count: 14, sag: 0.55 }));
  }

  // 5d. Mount Hepo Ri Summit Plateau (`(75, -10)`, `y = 8.4m`) — Vajra Mandala, 8 Mani Incense Burners & Golden Dharma Wheel Altar
  const heporiGroup = new THREE.Group();
  heporiGroup.name = 'Samye_MountHepoRi';
  const hepoY = getHeight(75, -10);
  heporiGroup.position.set(75, hepoY, -10);
  root.add(heporiGroup);

  // Ancient Carved Vajra Suppression Mandala Floor Ring (`r = 13.8m`, local `y = 0.03` -> world `y = 8.43m`)
  const hepoMandalaTex = createHepoVajraMandalaTexture();
  const hepoMandalaMat = new THREE.MeshStandardMaterial({
    color: hepoMandalaTex ? 0xffffff : 0x7c2d12,
    map: hepoMandalaTex,
    roughness: 0.82,
    metalness: 0.12,
  });
  const hepoMandalaFloor = new THREE.Mesh(new THREE.CircleGeometry(13.8, 48), hepoMandalaMat);
  hepoMandalaFloor.rotation.x = -Math.PI / 2;
  hepoMandalaFloor.position.y = 0.03;
  hepoMandalaFloor.receiveShadow = true;
  heporiGroup.add(hepoMandalaFloor);

  const hepoOuterRimRing = new THREE.Mesh(new THREE.RingGeometry(13.5, 14.35, 48), indianGoldRoofMat);
  hepoOuterRimRing.rotation.x = -Math.PI / 2;
  hepoOuterRimRing.position.y = 0.04;
  heporiGroup.add(hepoOuterRimRing);

  // 8 Perimeter Stone Incense Burners / Mani Pillars (`r = 14.2m`, 0 colliders)
  const burnerBase = new THREE.BoxGeometry(0.95, 0.55, 0.95);
  burnerBase.translate(0, 0.275, 0);
  const burnerShaft = new THREE.CylinderGeometry(0.36, 0.42, 1.35, 8);
  burnerShaft.translate(0, 1.22, 0);
  const burnerBowl = new THREE.CylinderGeometry(0.56, 0.34, 0.42, 8);
  burnerBowl.translate(0, 2.08, 0);
  const burnerCap = new THREE.ConeGeometry(0.46, 0.52, 8);
  burnerCap.translate(0, 2.55, 0);
  const hepoBurnerGeo = mergeAndDispose([burnerBase, burnerShaft, burnerBowl, burnerCap]);
  const hepoBurnersInst = new THREE.InstancedMesh(hepoBurnerGeo, carvedStoneMat, 8);
  hepoBurnersInst.castShadow = true;

  const sangEmberGeo = new THREE.ConeGeometry(0.28, 0.65, 7);
  sangEmberGeo.translate(0, 2.38, 0);
  const hepoBurnerFlamesInst = new THREE.InstancedMesh(sangEmberGeo, torchFlameMat, 8);

  // Rising translucent incense smoke plumes (`MeshBasicMaterial`, `AdditiveBlending`, `depthWrite: false`) above the 8 summit burners
  const smokeTex = createAtmosphericBeamTexture(true);
  const smokePlumeMat = new THREE.MeshBasicMaterial({
    map: smokeTex,
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const smokePlane1 = new THREE.PlaneGeometry(1.15, 3.8);
  const smokePlane2 = new THREE.PlaneGeometry(1.15, 3.8);
  smokePlane2.rotateY(Math.PI / 2);
  const smokePlumeGeo = mergeAndDispose([smokePlane1, smokePlane2]);
  const hepoSmokePlumes = [];

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI + Math.PI / 8;
    const bx = Math.cos(a) * 14.2;
    const bz = Math.sin(a) * 14.2;
    dummy.position.set(bx, 0, bz);
    dummy.rotation.set(0, -a, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    hepoBurnersInst.setMatrixAt(i, dummy.matrix);
    hepoBurnerFlamesInst.setMatrixAt(i, dummy.matrix);

    const plume = new THREE.Mesh(smokePlumeGeo, smokePlumeMat);
    plume.position.set(bx, 4.4, bz);
    heporiGroup.add(plume);
    hepoSmokePlumes.push({ mesh: plume, baseX: bx, baseZ: bz, phase: i * 0.85 });
  }
  hepoBurnersInst.instanceMatrix.needsUpdate = true;
  hepoBurnerFlamesInst.instanceMatrix.needsUpdate = true;
  heporiGroup.add(hepoBurnersInst, hepoBurnerFlamesInst);

  // 8 Diagonal Golden-Hour Sunbeam Shafts (Firewatch God Rays) slanting over Utse golden roof, Four Colored Stupas, and sand dunes
  const sunbeamsGroup = new THREE.Group();
  sunbeamsGroup.name = 'Samye_GoldenSunbeams';
  root.add(sunbeamsGroup);
  const sunbeamTex = createAtmosphericBeamTexture(false);
  const sunbeamMat = new THREE.MeshBasicMaterial({
    map: sunbeamTex,
    color: 0xffc65c,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const sunbeamGeo = new THREE.CylinderGeometry(2.2, 6.4, 38, 12, 1, true);
  const sunbeamDefs = [
    { x: 0, y: 19, z: 0, s: 1.25 },
    { x: -18, y: 17, z: 16, s: 0.95 },
    { x: 18, y: 17, z: 16, s: 0.95 },
    { x: -18, y: 17, z: -16, s: 0.9 },
    { x: 18, y: 17, z: -16, s: 0.9 },
    { x: -38, y: 16, z: 48, s: 1.05 },
    { x: 36, y: 16, z: 54, s: 1.05 },
    { x: 72, y: 24, z: -10, s: 1.1 },
  ];
  for (let i = 0; i < sunbeamDefs.length; i++) {
    const sb = sunbeamDefs[i];
    const shaft = new THREE.Mesh(sunbeamGeo, sunbeamMat);
    shaft.position.set(sb.x, sb.y, sb.z);
    shaft.rotation.z = -0.34;
    shaft.rotation.x = 0.16;
    shaft.scale.setScalar(sb.s);
    sunbeamsGroup.add(shaft);
  }

  // Mandala Stone Platform & Golden Eight-Spoke Dharma Wheel Altar Centerpiece on Mount Hepo Ri Summit
  const altarDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 0.45, 24), stoneWhiteMat);
  altarDisc.position.y = 0.22;
  altarDisc.receiveShadow = true;
  heporiGroup.add(altarDisc);

  const altarLotusPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.45, 0.42, 16), tibetanRedMat);
  altarLotusPedestal.position.y = 0.65;
  const hepoDharmaWheel = new THREE.Mesh(createDharmaWheelGeometry(1.15, 0.11), indianGoldRoofMat);
  hepoDharmaWheel.position.y = 1.95;
  heporiGroup.add(altarLotusPedestal, hepoDharmaWheel);

  const altarRing = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.1, 32), nodeBeaconMat);
  altarRing.rotation.x = -Math.PI / 2;
  altarRing.position.y = 0.48;
  heporiGroup.add(altarRing);

  // Wrathful Vajra Dance Aura & Halo around Guru Vision at Hepo Ri
  const vajraDanceAura = new THREE.Group();
  vajraDanceAura.position.set(0, 0.5, 0);
  heporiGroup.add(vajraDanceAura);

  const vajraHalo = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 2.1, 28),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 1.75, 0.4),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })
  );
  vajraHalo.rotation.x = -Math.PI / 2;
  vajraDanceAura.add(vajraHalo);

  // Golden Light Motes (`heporiMotesGroup`) that fly from Hepo Ri to Samye when gauntlet completes
  const MOTES_COUNT = 24;
  const heporiMotesGroup = new THREE.Group();
  heporiMotesGroup.visible = false;
  root.add(heporiMotesGroup);
  const moteGeo = new THREE.SphereGeometry(0.32, 8, 8);
  const moteMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.5, 1.95, 0.5),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    toneMapped: false,
  });
  const moteMeshes = [];
  for (let i = 0; i < MOTES_COUNT; i++) {
    const m = new THREE.Mesh(moteGeo, moteMat);
    heporiMotesGroup.add(m);
    moteMeshes.push(m);
  }
  let motesFlightTimer = 0;

  // ---------------------------------------------------------------- 6. Northern Pehar Boss Arena at local (0, -65) -> world (5000, -65)
  const peharArenaGroup = new THREE.Group();
  peharArenaGroup.name = 'Samye_PeharArena';
  peharArenaGroup.position.set(0, getHeight(0, -65), -65);
  root.add(peharArenaGroup);

  // 6a. Wrathful Dharmapala Mandala Floor Emblem (`CircleGeometry`, `r = 17.2m`, `y = getHeight(0, -65) + 0.03`)
  const peharMandalaTex = createPeharMandalaTexture();
  const peharMandalaMat = new THREE.MeshStandardMaterial({
    color: peharMandalaTex ? 0xffffff : 0x450a0a,
    map: peharMandalaTex,
    emissive: 0x450a0a,
    emissiveIntensity: 0.24,
    roughness: 0.76,
    metalness: 0.18,
  });
  const peharFloorEmblem = new THREE.Mesh(new THREE.CircleGeometry(17.2, 64), peharMandalaMat);
  peharFloorEmblem.rotation.x = -Math.PI / 2;
  peharFloorEmblem.position.y = 0.03;
  peharFloorEmblem.receiveShadow = true;
  peharArenaGroup.add(peharFloorEmblem);

  // Obsidian curb & golden chakra inner ring
  const peharObsidianCurb = new THREE.Mesh(new THREE.RingGeometry(17.0, 17.65, 56), darkSlateMat);
  peharObsidianCurb.rotation.x = -Math.PI / 2;
  peharObsidianCurb.position.y = 0.04;
  peharArenaGroup.add(peharObsidianCurb);

  const peharArenaRing = new THREE.Mesh(
    new THREE.RingGeometry(17.4, 18.0, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  peharArenaRing.rotation.x = -Math.PI / 2;
  peharArenaRing.position.y = 0.05;
  peharArenaGroup.add(peharArenaRing);

  // 6b. Perimeter Colonnade of 10 Dark-Red Tibetan Temple Pillars, Victory Banners (`勝幡`) & Flaming Braziers (`r = 18.6m`, 0 colliders, 0 PointLights)
  const PEHAR_PILLAR_COUNT = 10;
  const pColBase = new THREE.BoxGeometry(1.15, 0.55, 1.15);
  pColBase.translate(0, 0.275, 0);
  const pColShaft = new THREE.CylinderGeometry(0.36, 0.44, 4.4, 10);
  pColShaft.translate(0, 2.75, 0);
  const pColCap = new THREE.BoxGeometry(1.05, 0.42, 1.05);
  pColCap.translate(0, 5.1, 0);
  const peharPillarGeo = mergeAndDispose([pColBase, pColShaft, pColCap]);
  const peharPillarsInst = new THREE.InstancedMesh(peharPillarGeo, tibetanRedMat, PEHAR_PILLAR_COUNT);
  peharPillarsInst.castShadow = true;

  // Cylindrical Tibetan Victory Banners (`勝幡 / Gyaltsen`) + Flaming Brazier Crown atop/beside each pillar
  const gyaltsenTop = new THREE.ConeGeometry(0.48, 0.55, 10);
  gyaltsenTop.translate(0, 6.25, 0);
  const gyaltsenBody = new THREE.CylinderGeometry(0.38, 0.38, 1.35, 10);
  gyaltsenBody.translate(0, 5.45, 0);
  const brazierPed = new THREE.CylinderGeometry(0.45, 0.58, 1.15, 8);
  brazierPed.translate(-1.35, 0.58, 0);
  const brazierBowl = new THREE.CylinderGeometry(0.62, 0.35, 0.45, 8);
  brazierBowl.translate(-1.35, 1.35, 0);
  const peharTrimGeo = mergeAndDispose([gyaltsenTop, gyaltsenBody, brazierPed, brazierBowl]);
  const peharTrimInst = new THREE.InstancedMesh(peharTrimGeo, indianGoldRoofMat, PEHAR_PILLAR_COUNT);

  const brazierFlameCone = new THREE.ConeGeometry(0.38, 0.95, 7);
  brazierFlameCone.translate(-1.35, 1.95, 0);
  const brazierHaloSphere = new THREE.SphereGeometry(0.58, 8, 8);
  brazierHaloSphere.translate(-1.35, 1.95, 0);
  const peharFlamesGeo = mergeAndDispose([brazierFlameCone, brazierHaloSphere]);
  const peharFlamesInst = new THREE.InstancedMesh(peharFlamesGeo, torchFlameMat, PEHAR_PILLAR_COUNT);

  for (let i = 0; i < PEHAR_PILLAR_COUNT; i++) {
    // Arc around the arena perimeter (`r = 18.6m`), leaving a wide entrance gap at South (`angle = PI/2`)
    const u = i / (PEHAR_PILLAR_COUNT - 1);
    const ang = Math.PI * 0.68 + u * Math.PI * 1.64;
    const px = Math.cos(ang) * 18.6;
    const pz = Math.sin(ang) * 18.6;
    dummy.position.set(px, 0, pz);
    dummy.rotation.set(0, -ang + Math.PI / 2, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    peharPillarsInst.setMatrixAt(i, dummy.matrix);
    peharTrimInst.setMatrixAt(i, dummy.matrix);
    peharFlamesInst.setMatrixAt(i, dummy.matrix);
  }
  peharPillarsInst.instanceMatrix.needsUpdate = true;
  peharTrimInst.instanceMatrix.needsUpdate = true;
  peharFlamesInst.instanceMatrix.needsUpdate = true;
  peharArenaGroup.add(peharPillarsInst, peharTrimInst, peharFlamesInst);

  // ---------------------------------------------------------------- 7. Golden Palm-Vision Miniature Samye Monastery
  const palmMiniatureGroup = new THREE.Group();
  palmMiniatureGroup.name = 'Samye_PalmVisionMiniature';
  palmMiniatureGroup.position.set(-28.2, getHeight(-30, 55) + 1.85, 53.5);
  palmMiniatureGroup.scale.setScalar(0.065);
  palmMiniatureGroup.visible = false;
  root.add(palmMiniatureGroup);

  const palmGoldMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.85, 0.45),
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const miniWall = new THREE.Mesh(new THREE.CylinderGeometry(43, 43, 4, 32, 1, true), palmGoldMat);
  miniWall.position.y = 2;
  const miniUtse1 = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 16), palmGoldMat);
  miniUtse1.position.y = 3;
  const miniUtse2 = new THREE.Mesh(new THREE.BoxGeometry(11, 5, 11), palmGoldMat);
  miniUtse2.position.y = 8.5;
  const miniUtse3 = new THREE.Mesh(new THREE.ConeGeometry(8, 5, 4), palmGoldMat);
  miniUtse3.rotation.y = Math.PI / 4;
  miniUtse3.position.y = 13.5;
  palmMiniatureGroup.add(miniWall, miniUtse1, miniUtse2, miniUtse3);
  for (const cs of coloredStupaDefs) {
    const ms = new THREE.Mesh(new THREE.ConeGeometry(2.5, 7, 8), palmGoldMat);
    ms.position.set(cs.lx, 3.5, cs.lz);
    palmMiniatureGroup.add(ms);
  }

  // ---------------------------------------------------------------- 8. Construction Stage Controller (0..4)
  let currentStage = 0;

  function loadInitialStage() {
    if (ctx.quests?.getFlag?.('ch4.done') || ctx.quests?.getFlag?.('ch4.stage.4')) return 4;
    if (ctx.quests?.getFlag?.('ch4.hepori.done') || ctx.quests?.getFlag?.('ch4.stage.3')) return 3;
    if (ctx.quests?.getFlag?.('ch4.stage.2')) return 2;
    if (ctx.quests?.getFlag?.('ch4.stage.1')) return 1;
    const saved = ctx.save?.get?.('samye', null);
    if (saved && Number.isFinite(saved.stage)) {
      return Math.max(0, Math.min(4, Math.floor(saved.stage)));
    }
    return 0;
  }

  function setStage(stage) {
    const s = Math.max(0, Math.min(4, Math.floor(Number(stage) || 0)));
    currentStage = s;

    // Stage 0: Foundation lines
    stage0Group.visible = s === 0;

    // Stage 1+: Circular outer wall (half height at Stage 1, full height at Stage 2+) & Utse Floor 1
    wallGroup.visible = s >= 1;
    for (let i = 0; i < 4; i++) {
      const seg = wallSegments[i];
      if (seg.mesh) {
        const hScale = seg.broken ? 0.25 : s === 1 ? 0.52 : 1.0;
        seg.mesh.scale.set(1, hScale, 1);
      }
    }
    utseFloor1Group.visible = s >= 1;

    // Stage 2+: Utse Floor 2 + Four Colored Stupa Foundations
    utseFloor2Group.visible = s >= 2;
    stupaFoundationsGroup.visible = s >= 2;

    // Stage 3+: Utse Floor 3 + Four Colored Stupas + Four Continents Temples
    utseFloor3Group.visible = s >= 3;
    fourStupasGroup.visible = s >= 3;
    fourContinentsGroup.visible = s >= 3;

    // Stage 4: Sun & Moon Chapels, Eight Sub-continents, 1008 Mini-Stupas, Prayer Flags, & 7 Tested Men
    stage4Group.visible = s >= 4;
    if (s >= 4) {
      updateMiniStupasTransform(1.0);
    }

    if (presentationOnly) return s;

    // Persist flag & save state
    if (ctx.quests?.setFlag) {
      ctx.quests.setFlag(`ch4.stage.${s}`, true);
    }
    if (ctx.save?.set) {
      ctx.save.set('samye', { stage: s, nightsSurvived });
    }
    bus.emit('samye:stageChanged', { stage: s });
    return s;
  }

  // Narrative callers own the detached map and drive visual stages directly.
  // Exit before constructing defense state or registering any adventure hooks.
  if (presentationOnly) {
    setStage(0);
    for (const beacon of nodeBeacons) beacon.visible = false;
    peharArenaGroup.visible = false;
    vajraDanceAura.visible = false;
    return {
      group, getHeight: getHeightWorld, setStage,
      structure: monasteryGroup,
      nightTorches: wallTorchesGroup,
    };
  }

  // ---------------------------------------------------------------- 9. Day-Build / Night-Destroy Defense System & Top HUD
  let phase = 'day'; // 'day' | 'night'
  let nightsSurvived = 0;
  let nightTimer = 0;
  const NIGHT_DURATION_SEC = 120;
  let nightSpawnCooldown = 0;
  let extraRepairMaterials = 0; // Incremented whenever a wall segment reaches 0 HP

  const carrying = { stone: 0, wood: 0 };
  const delivered = { stone: 0, wood: 0 };
  const BASE_REQ_STONE = 6;
  const BASE_REQ_WOOD = 4;
  const MAX_CARRY = 4;

  function getReqStone() {
    return BASE_REQ_STONE + extraRepairMaterials * 2;
  }
  function getReqWood() {
    return BASE_REQ_WOOD + extraRepairMaterials;
  }
  function totalCarrying() {
    return carrying.stone + carrying.wood;
  }

  // Create compact DOM HUD widget at top of screen for Day-Build / Night-Destroy & Hepo Ri Gauntlet
  let hudEl = null;
  let cutsceneEl = null;

  function ensureHudElement() {
    if (typeof document === 'undefined') return null;
    if (!hudEl) {
      hudEl = document.getElementById('samye-defense-hud');
      if (!hudEl) {
        hudEl = document.createElement('div');
        hudEl.id = 'samye-defense-hud';
        hudEl.style.cssText = [
          'position:fixed',
          'top:62px',
          'left:50%',
          'transform:translateX(-50%)',
          'z-index:35',
          'background:rgba(15,23,42,0.86)',
          'border:1px solid rgba(251,191,36,0.55)',
          'border-radius:10px',
          'padding:8px 16px',
          'color:#fef3c7',
          'font-family:"Noto Serif TC",serif',
          'font-size:13px',
          'text-align:center',
          'pointer-events:auto',
          'box-shadow:0 4px 18px rgba(0,0,0,0.45)',
          'display:none',
          'min-width:320px',
        ].join(';');
        document.body.appendChild(hudEl);
      }
    }
    return hudEl;
  }

  function formatCodexLinksHtml(text) {
    if (!text) return '';
    return String(text).replace(/\[\[codex:([a-zA-Z0-9_.-]+)\]\]/g, (_, entryId) => {
      const title = i18n?.t ? i18n.t(`codex.entry.${entryId}.title`) : entryId;
      return `<button type="button" data-codex-link="${entryId}" style="background:none;border:none;color:#fbbf24;text-decoration:underline;cursor:pointer;font:inherit;padding:0 2px;">${title}</button>`;
    });
  }

  function renderDefenseHud() {
    const el = ensureHudElement();
    if (!el) return;

    // Show Hepo Ri Gauntlet banner if active
    if (heporiState.active) {
      el.style.display = 'block';
      const wIdx = Math.max(1, Math.min(4, heporiState.wave));
      const title = i18n?.t ? i18n.t(`hepori.wave${wIdx}.title`) : `Wave ${wIdx}/4`;
      const desc = i18n?.t ? i18n.t(`hepori.wave${wIdx}.desc`) : '';
      el.innerHTML = `
        <div style="font-weight:700;color:#fbbf24;margin-bottom:3px;">${title}</div>
        <div style="font-size:12px;color:#e2e8f0;">${formatCodexLinksHtml(desc)}</div>
      `;
      const links = el.querySelectorAll('[data-codex-link]');
      links.forEach((btn) => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const cid = btn.getAttribute('data-codex-link');
          if (cid) {
            ctx.codex?.unlock?.(cid);
            bus.emit('codex:open', { id: cid });
          }
        };
      });
      return;
    }

    const isDayNightQuest =
      ctx.quests?.getActive?.()?.some?.((q) => q.id === 'ch4.dayNight') ||
      phase === 'night';

    if (!isDayNightQuest || state.zone !== 'samye') {
      el.style.display = 'none';
      return;
    }

    el.style.display = 'block';
    if (phase === 'day') {
      const cycle = Math.min(3, nightsSurvived + 1);
      const dayTitle = (i18n?.t ? i18n.t('samye.hud.dayTitle') : 'Day {cycle}/3').replace('{cycle}', cycle);
      const matLine = (i18n?.t ? i18n.t('samye.hud.materials') : 'Stone {stone}/{reqStone} | Wood {wood}/{reqWood}')
        .replace('{stone}', delivered.stone)
        .replace('{reqStone}', getReqStone())
        .replace('{wood}', delivered.wood)
        .replace('{reqWood}', getReqWood());
      const carryLine = (i18n?.t ? i18n.t('samye.hud.carry') : 'Carry: Stone {cStone} Wood {cWood}')
        .replace('{cStone}', carrying.stone)
        .replace('{cWood}', carrying.wood);
      const extraNote =
        extraRepairMaterials > 0
          ? `<div style="color:#f87171;font-size:11px;margin-top:2px;">${(i18n?.t ? i18n.t('samye.hud.repairExtra') : '+{extra} repair').replace('{extra}', extraRepairMaterials)}</div>`
          : '';
      el.innerHTML = `
        <div style="font-weight:700;color:#fbbf24;">${dayTitle}</div>
        <div style="margin-top:2px;">${matLine}</div>
        <div style="font-size:12px;color:#cbd5e1;">${carryLine}</div>
        ${extraNote}
      `;
    } else {
      const nightNum = Math.min(3, nightsSurvived + 1);
      const secLeft = Math.max(0, Math.ceil(nightTimer));
      const nightTitle = (i18n?.t ? i18n.t('samye.hud.nightTitle') : 'Night {night}/3 — {sec}s')
        .replace('{night}', nightNum)
        .replace('{sec}', secLeft);
      const barsHtml = wallSegments
        .map((seg) => {
          const name = i18n?.t ? i18n.t(seg.labelKey) : seg.id;
          const pct = Math.max(0, Math.min(100, Math.round((seg.hp / seg.maxHp) * 100)));
          const barCol = seg.broken ? '#ef4444' : pct > 50 ? '#22c55e' : '#f59e0b';
          return `
            <div style="display:inline-block;width:68px;margin:0 4px;text-align:center;">
              <div style="font-size:11px;color:${seg.broken ? '#f87171' : '#e2e8f0'};">${name} ${pct}%</div>
              <div style="height:6px;background:#334155;border-radius:3px;overflow:hidden;margin-top:2px;">
                <div style="width:${pct}%;height:100%;background:${barCol};"></div>
              </div>
            </div>
          `;
        })
        .join('');
      el.innerHTML = `
        <div style="font-weight:700;color:#f87171;margin-bottom:4px;">${nightTitle}</div>
        <div>${barsHtml}</div>
      `;
    }
  }

  function applyMorningSky() {
    ctx.sky?.setTimeOverride?.({ t: 0.38, speed: 0, transitionSec: 1.2 });
    wallTorchesGroup.visible = false;
  }

  function applyNightSky() {
    ctx.sky?.setTimeOverride?.({ t: 0.86, speed: 0, transitionSec: 1.8 });
    wallTorchesGroup.visible = true;
  }

  function damageWall(segIndex, amount = 25) {
    const idx = Math.max(0, Math.min(3, Math.floor(Number(segIndex) || 0)));
    const seg = wallSegments[idx];
    if (!seg || seg.broken) return seg;

    seg.hp = Math.max(0, seg.hp - Math.max(0, Number(amount) || 0));
    if (seg.mat) {
      seg.mat.emissive.setHex(0xef4444);
      seg.mat.emissiveIntensity = 0.55;
      setTimeout(() => {
        if (seg.mat) {
          seg.mat.emissive.setHex(0x000000);
          seg.mat.emissiveIntensity = 0;
        }
      }, 180);
    }

    if (seg.hp <= 0 && !seg.broken) {
      seg.broken = true;
      extraRepairMaterials += 1;
      if (seg.mesh) {
        seg.mesh.scale.set(1, 0.25, 1);
      }
      bus.emit('samye:wallBroken', {
        segIndex: idx,
        id: seg.id,
        extraRepairMaterials,
      });
    }
    renderDefenseHud();
    return seg;
  }

  function spawnNightWaveEnemies() {
    if (!ctx.enemies?.spawn) return;
    const nightNum = Math.min(3, nightsSurvived + 1);
    const dirAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

    for (let s = 0; s < 4; s++) {
      const seg = wallSegments[s];
      const ang = dirAngles[s] + (Math.random() - 0.5) * 0.25;
      const spawnR = 64 + Math.random() * 6;
      const sx = ox + Math.cos(ang) * spawnR;
      const sz = oz + Math.sin(ang) * spawnR;

      let kind = 'wallBreaker';
      if (nightNum === 2 && s === 1) kind = 'du';
      if (nightNum >= 3 && s === 1) kind = 'du';
      if (nightNum >= 3 && s === 3) kind = 'gyalpo';

      const wallTarget = {
        segIndex: s,
        x: seg.wx,
        z: seg.wz,
        active: !seg.broken,
        onHit(dmg) {
          damageWall(s, dmg);
        },
      };
      const spawned = ctx.enemies.spawn(kind, {
        x: sx,
        z: sz,
        level: 24 + nightNum,
        noSplit: true,
        wallTarget,
      });
      const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
      const inst =
        typeof spawned === 'string'
          ? activeList.find((en) => en.id === spawned)
          : spawned;
      if (inst && typeof inst === 'object') {
        inst.noSplit = true;
        inst.state = 'chase';
        inst.wallTarget = wallTarget;
      }
    }
  }

  function startNight() {
    phase = 'night';
    nightTimer = NIGHT_DURATION_SEC;
    nightSpawnCooldown = 0.5;
    for (const seg of wallSegments) {
      seg.hp = seg.maxHp;
      seg.broken = false;
      if (seg.mesh) {
        seg.mesh.scale.set(1, currentStage <= 1 ? 0.55 : 1.0, 1);
      }
    }
    if (currentStage < 1) {
      setStage(1);
    }
    applyNightSky();
    renderDefenseHud();
    bus.emit('samye:nightStarted', { night: nightsSurvived + 1 });
    return true;
  }

  function endNight() {
    if (phase !== 'night') {
      // Allow direct debug call to `endNight()` even from day phase so tests can advance immediately
      phase = 'night';
    }
    phase = 'day';
    nightTimer = 0;

    // Clear remaining night wave enemies
    const list = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].wallTarget) {
        ctx.enemies.damage(list[i].id, 999999, 'magic', { execute: true });
      }
    }

    const brokenSegments = wallSegments.filter((s) => s.broken).map((s) => s.id);
    nightsSurvived = Math.min(3, nightsSurvived + 1);
    const nextStage = Math.max(currentStage, Math.min(3, nightsSurvived));
    setStage(nextStage);

    // Reset daily delivered materials for next cycle (extraRepairMaterials carries over if a wall broke)
    delivered.stone = 0;
    delivered.wood = 0;
    carrying.stone = 0;
    carrying.wood = 0;
    for (const seg of wallSegments) {
      seg.hp = seg.maxHp;
      seg.broken = false;
      if (seg.mesh) seg.mesh.scale.set(1, nextStage === 1 ? 0.52 : 1.0, 1);
    }

    applyMorningSky();
    renderDefenseHud();

    bus.emit('toast', {
      key: 'samye.hud.nightSurvived',
      params: { stage: nextStage },
    });
    bus.emit('samye:nightSurvived', {
      night: nightsSurvived,
      stage: nextStage,
      brokenSegments,
      extraRepairMaterials,
    });
    return { night: nightsSurvived, stage: nextStage, brokenSegments };
  }

  function deliverCarriedMaterials() {
    if (carrying.stone <= 0 && carrying.wood <= 0) return false;
    delivered.stone = Math.min(getReqStone(), delivered.stone + carrying.stone);
    delivered.wood = Math.min(getReqWood(), delivered.wood + carrying.wood);
    carrying.stone = 0;
    carrying.wood = 0;
    bus.emit('sfx', { name: 'bell' });
    bus.emit('toast', {
      key: 'toast.materialsDelivered',
      params: {
        stone: delivered.stone,
        reqStone: getReqStone(),
        wood: delivered.wood,
        reqWood: getReqWood(),
      },
    });
    renderDefenseHud();

    if (delivered.stone >= getReqStone() && delivered.wood >= getReqWood() && phase === 'day') {
      extraRepairMaterials = 0;
      startNight();
    }
    return true;
  }

  bus.on('samye:deliverMaterials', () => {
    deliverCarriedMaterials();
  });

  // ---------------------------------------------------------------- 10. Mount Hepo Ri 4-Wave Gauntlet
  const heporiState = {
    active: false,
    cleared: Boolean(ctx.quests?.getFlag?.('ch4.hepori.done')),
    wave: 0,
    pauseTimer: 0,
    spawnedIds: [],
  };

  function spawnHeporiWave(waveNum) {
    heporiState.wave = waveNum;
    heporiState.spawnedIds = [];
    renderDefenseHud();

    if (!ctx.enemies?.spawn) return;
    const cx = ox + 75; // 5075
    const cz = oz - 10; // -10

    const defs =
      waveNum === 1
        ? [
            { kind: 'tsen', rank: 'normal' },
            { kind: 'tsen', rank: 'normal' },
            { kind: 'tsen', rank: 'normal' },
          ]
        : waveNum === 2
          ? [
              { kind: 'du', rank: 'normal' },
              { kind: 'du', rank: 'normal' },
              { kind: 'du', rank: 'normal' },
            ]
          : waveNum === 3
            ? [
                { kind: 'gyalpo', rank: 'normal' },
                { kind: 'gyalpo', rank: 'normal' },
                { kind: 'gyalpo', rank: 'normal' },
              ]
            : [
                { kind: 'tsen', rank: 'normal' },
                { kind: 'du', rank: 'normal' },
                { kind: 'gyalpo', rank: 'rare', affixes: ['swift', 'armored'] },
              ];

    for (let i = 0; i < defs.length; i++) {
      const a = (i / defs.length) * TWO_PI;
      const sx = cx + Math.cos(a) * 8.5;
      const sz = cz + Math.sin(a) * 8.5;
      const spawned = ctx.enemies.spawn(defs[i].kind, {
        x: sx,
        z: sz,
        level: 26 + waveNum,
        rank: defs[i].rank,
        affixes: defs[i].affixes || [],
        noSplit: true,
      });
      const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
      const inst =
        typeof spawned === 'string'
          ? activeList.find((en) => en.id === spawned)
          : spawned;
      const eid = typeof spawned === 'string' ? spawned : inst?.id;
      if (inst && typeof inst === 'object') {
        inst.noSplit = true;
        inst.state = 'chase';
      }
      if (eid) {
        heporiState.spawnedIds.push(eid);
      }
    }
  }

  function startHeporiGauntlet() {
    heporiState.active = true;
    heporiState.cleared = false;
    heporiState.wave = 1;
    heporiState.pauseTimer = 0;
    spawnHeporiWave(1);
    bus.emit('hepori:started', { wave: 1 });
    return heporiState;
  }

  function completeHeporiGauntlet() {
    heporiState.active = false;
    heporiState.cleared = true;
    heporiState.wave = 4;
    heporiState.pauseTimer = 0;

    // Liberate any remaining gauntlet enemies
    const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
    for (let i = activeList.length - 1; i >= 0; i--) {
      if (heporiState.spawnedIds.includes(activeList[i].id)) {
        ctx.enemies.damage(activeList[i].id, 999999, 'magic', { execute: true });
      }
    }
    heporiState.spawnedIds = [];

    // Launch golden light motes flying from Mount Hepo Ri (75, -10) to Samye Monastery (0, 0)
    motesFlightTimer = 3.2;
    heporiMotesGroup.visible = true;

    setStage(Math.max(currentStage, 3));
    renderDefenseHud();
    bus.emit('toast', { key: 'hepori.cleared' });
    bus.emit('hepori:cleared', { stage: currentStage });
    return true;
  }

  bus.on('hepori:requestStart', () => {
    if (!heporiState.active && !heporiState.cleared) {
      startHeporiGauntlet();
    }
  });

  // ---------------------------------------------------------------- 11. "Samye!" (`བསམ་ཡས`) Ending Cutscene
  let endingState = {
    playing: false,
    elapsed: 0,
    duration: 9.5,
    completed: Boolean(ctx.quests?.getFlag?.('ch4.done')),
  };

  function ensureCutsceneOverlay() {
    if (typeof document === 'undefined') return null;
    if (!cutsceneEl) {
      cutsceneEl = document.getElementById('samye-ending-overlay');
      if (!cutsceneEl) {
        cutsceneEl = document.createElement('div');
        cutsceneEl.id = 'samye-ending-overlay';
        cutsceneEl.style.cssText = [
          'position:fixed',
          'inset:0',
          'z-index:80',
          'pointer-events:none',
          'display:none',
          'flex-direction:column',
          'justify-content:space-between',
          'align-items:center',
          'padding:42px 24px',
          'background:radial-gradient(circle, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.68) 100%)',
          'font-family:"Noto Serif TC",serif',
        ].join(';');
        document.body.appendChild(cutsceneEl);
      }
    }
    return cutsceneEl;
  }

  function finishEndingCutscene() {
    if (!endingState.playing && endingState.completed) return;
    endingState.playing = false;
    endingState.completed = true;
    if (state.player) {
      state.player.lockedMovement = false;
    }
    palmMiniatureGroup.visible = false;
    setStage(4);
    updateMiniStupasTransform(1.0);
    ctx.sky?.clearTimeOverride?.();

    // Ensure Seven Tested Men NPC is visible at Stage 4
    ctx.quests?.setFlag?.('ch4.pehar.done', true);

    if (cutsceneEl) {
      cutsceneEl.style.display = 'none';
    }
    bus.emit('sfx', { name: 'bowl' });
    bus.emit('samye:endingPlayed', { stage: 4 });
  }

  function playEnding() {
    endingState.playing = true;
    endingState.elapsed = 0;
    if (state.player) {
      state.player.lockedMovement = true;
      state.player.velocity?.set?.(0, 0, 0);
    }
    palmMiniatureGroup.visible = true;
    const overlay = ensureCutsceneOverlay();
    if (overlay) {
      overlay.style.display = 'flex';
      renderEndingCutsceneOverlay(0);
    }
    bus.emit('sfx', { name: 'bell' });
    return true;
  }

  function skipEnding() {
    finishEndingCutscene();
    return true;
  }

  function renderEndingCutsceneOverlay(t) {
    const overlay = ensureCutsceneOverlay();
    if (!overlay) return;

    const q1 = i18n?.t ? i18n.t('samye.ending.q1') : 'What will the monastery look like when completed?';
    const q2 = i18n?.t ? i18n.t('samye.ending.q2') : 'Guru Rinpoche extends his palm with a golden miniature Samye.';
    const exclaim = i18n?.t ? i18n.t('samye.ending.samyeExclaim') : 'Samye! (བསམ་ཡས — Inconceivable!)';
    const sub = i18n?.t ? i18n.t('samye.ending.sub') : '';
    const skipLabel = i18n?.t ? i18n.t('samye.ending.skip') : 'Skip';

    const showTibetan = t >= 3.2;
    const lineText = t < 2.0 ? q1 : t < 4.5 ? q2 : exclaim;

    overlay.innerHTML = `
      <div style="width:100%;display:flex;justify-content:flex-end;">
        <button id="samye-ending-skip-btn" type="button" style="pointer-events:auto;background:rgba(15,23,42,0.88);border:1px solid #fbbf24;color:#fef3c7;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;">
          ${skipLabel}
        </button>
      </div>
      <div style="text-align:center;transition:opacity 0.4s;">
        ${
          showTibetan
            ? `<div style="font-size:74px;color:#fbbf24;text-shadow:0 0 28px rgba(251,191,36,0.92);font-weight:700;letter-spacing:4px;">བསམ་ཡས</div>
               <div style="font-size:28px;color:#fef3c7;text-shadow:0 2px 12px #000;margin-top:4px;">「桑耶！ — SAMYE!」</div>`
            : ''
        }
      </div>
      <div style="max-width:720px;background:rgba(15,23,42,0.88);border:1px solid rgba(251,191,36,0.55);border-radius:10px;padding:14px 22px;text-align:center;color:#fef3c7;">
        <div style="font-size:16px;line-height:1.5;">${lineText}</div>
        ${t >= 5.2 ? `<div style="font-size:13px;color:#fde68a;margin-top:6px;">${sub}</div>` : ''}
      </div>
    `;
    const btn = overlay.querySelector('#samye-ending-skip-btn');
    if (btn) {
      btn.onclick = () => skipEnding();
    }
  }

  bus.on('samye:requestEnding', () => {
    if (!endingState.playing) {
      playEnding();
    }
  });

  bus.on('quest:start', (payload) => {
    if (payload?.id === 'ch4.dayNight' && state.zone === 'samye') {
      applyMorningSky();
      renderDefenseHud();
    } else if (payload?.id === 'ch4.samye' && state.zone === 'samye') {
      setTimeout(() => {
        if (!endingState.playing && !endingState.completed) {
          playEnding();
        }
      }, 350);
    }
  });

  // Initialize stage from save/flags
  setStage(loadInitialStage());

  // If entering Samye during `ch4.dayNight`, apply morning sky
  if (
    ctx.quests?.isActive?.('ch4.dayNight') ||
    ctx.quests?.getActive?.()?.some?.((q) => q.id === 'ch4.dayNight')
  ) {
    applyMorningSky();
  }

  // ---------------------------------------------------------------- 12. Register Debug APIs (`__stupa.samye` & `__stupa.hepori`)
  const samyeApi = {
    setStage,
    getStage: () => currentStage,
    startNight,
    endNight,
    damageWall,
    playEnding,
    skipEnding,
    getState() {
      return {
        stage: currentStage,
        phase,
        nightsSurvived,
        nightTimer,
        carrying: { ...carrying },
        delivered: { ...delivered },
        reqStone: getReqStone(),
        reqWood: getReqWood(),
        extraRepairMaterials,
        wallSegments: wallSegments.map((s) => ({
          id: s.id,
          hp: s.hp,
          maxHp: s.maxHp,
          broken: s.broken,
        })),
        miniStupaCount: miniStupasInst.count,
        endingPlaying: endingState.playing,
      };
    },
  };

  const heporiApi = {
    start: startHeporiGauntlet,
    complete: completeHeporiGauntlet,
    getState() {
      return { ...heporiState };
    },
  };

  ctx.samye = samyeApi;
  ctx.hepori = heporiApi;
  ctx.debug?.register?.('samye', samyeApi);
  ctx.debug?.register?.('hepori', heporiApi);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.samye = samyeApi;
    window.__stupa.hepori = heporiApi;
  }

  // ---------------------------------------------------------------- 13. Per-Frame Update & Interaction Prompts
  let hudTick = 0;

  return {
    group,
    root,
    getHeight: getHeightWorld,
    samye: samyeApi,
    hepori: heporiApi,
    getInteractPrompt() {
      const pPos = state.player?.position;
      if (!pPos || state.uiOpen || endingState.playing) return null;

      // 1. Quarry / Timber gathering nodes
      for (const node of resourceNodes) {
        const d = Math.hypot(pPos.x - node.wx, pPos.z - node.wz);
        if (d <= 3.6) {
          if (totalCarrying() >= MAX_CARRY) {
            return { key: 'prompt.samyeCarryFull' };
          }
          return { key: node.promptKey };
        }
      }

      // 2. Deliver materials to Master Artisan at camp (4966.5, 52.5)
      if (totalCarrying() > 0 && Math.hypot(pPos.x - 4966.5, pPos.z - 52.5) <= 4.2) {
        return { key: 'prompt.samyeDeliver' };
      }

      // 3. Mount Hepo Ri summit Vajra Dance altar (5075, -10)
      if (
        !heporiState.active &&
        !heporiState.cleared &&
        Math.hypot(pPos.x - (ox + 75), pPos.z - (oz - 10)) <= 6.0
      ) {
        return { key: 'prompt.heporiAltar' };
      }

      return null;
    },

    update(dt) {
      const pPos = state.player?.position;
      const elapsed = state.elapsed || 0;

      // Pulse resource beacons & Hepo Ri Vajra Dance halo & Dharma wheel
      for (let i = 0; i < nodeBeacons.length; i++) {
        nodeBeacons[i].rotation.z = elapsed * 0.8;
      }
      vajraHalo.rotation.z = elapsed * 2.4;
      const haloScale = 1.0 + Math.sin(elapsed * 5.0) * 0.12;
      vajraHalo.scale.setScalar(haloScale);
      hepoDharmaWheel.rotation.y = elapsed * 0.65;
      peharArenaRing.rotation.z = -elapsed * 0.4;

      // Animate Mount Hepo Ri summit incense smoke plumes & golden-hour sunbeams
      for (let i = 0; i < hepoSmokePlumes.length; i++) {
        const sp = hepoSmokePlumes[i];
        const wisp = Math.sin(elapsed * 1.8 + sp.phase);
        sp.mesh.position.x = sp.baseX + wisp * 0.22;
        sp.mesh.position.y = 4.35 + ((elapsed * 0.45 + sp.phase) % 1.2) * 0.45;
        sp.mesh.rotation.y = elapsed * 0.35 + sp.phase;
        sp.mesh.scale.set(1.0 + Math.abs(wisp) * 0.18, 0.95 + Math.sin(elapsed * 1.4 + sp.phase) * 0.15, 1.0);
      }
      sunbeamsGroup.visible = phase !== 'night';
      sunbeamMat.opacity = 0.12 + Math.sin(elapsed * 1.2) * 0.03;

      // Animate Guru Rinpoche Pure Vision Vajra Dance on Mount Hepo Ri
      const visionNpc = ctx.npcs?.get?.('guruVision.samye');
      if (visionNpc && visionNpc.group) {
        visionNpc.group.rotation.y = elapsed * (heporiState.active ? 3.2 : 1.1);
        visionNpc.group.position.y = hepoY + 0.25 + Math.abs(Math.sin(elapsed * 4.2)) * 0.35;
      }

      // Animate golden motes flying from Mount Hepo Ri (75, -10) to Samye (0, 0)
      if (motesFlightTimer > 0) {
        motesFlightTimer = Math.max(0, motesFlightTimer - dt);
        const u = 1 - motesFlightTimer / 3.2;
        for (let i = 0; i < MOTES_COUNT; i++) {
          const offset = (i / MOTES_COUNT) * 0.35;
          const p = Math.max(0, Math.min(1, (u - offset) / 0.65));
          const mx = 75 * (1 - p) + Math.sin(p * Math.PI * 3 + i) * 3.0;
          const mz = -10 * (1 - p) + Math.cos(p * Math.PI * 3 + i) * 3.0;
          const my = hepoY * (1 - p) + 4.0 + Math.sin(p * Math.PI) * 9.0;
          moteMeshes[i].position.set(mx, my, mz);
        }
        if (motesFlightTimer <= 0) {
          heporiMotesGroup.visible = false;
        }
      }

      // Handle ending cutscene progression
      if (endingState.playing) {
        endingState.elapsed += dt;
        const t = endingState.elapsed;
        palmMiniatureGroup.rotation.y = t * 1.1;
        palmMiniatureGroup.position.y = getHeight(-30, 55) + 1.85 + Math.sin(t * 2.5) * 0.12;

        if (t >= 4.2 && currentStage < 4) {
          setStage(4);
        }
        if (t >= 4.2) {
          const litProg = Math.min(1, (t - 4.2) / 3.6);
          updateMiniStupasTransform(litProg);
        }
        renderEndingCutsceneOverlay(t);
        if (t >= endingState.duration) {
          finishEndingCutscene();
        }
        return;
      }

      // Check `[E]` interactions for stone quarries, timber pile, artisan delivery, and Hepo Ri altar
      if (pPos && !state.uiOpen && ctx.input?.pressed?.('interact')) {
        // 1. Deliver materials if near Master Artisan
        if (totalCarrying() > 0 && Math.hypot(pPos.x - 4966.5, pPos.z - 52.5) <= 4.2) {
          deliverCarriedMaterials();
        } else {
          // 2. Gather from quarry / timber nodes
          for (const node of resourceNodes) {
            if (Math.hypot(pPos.x - node.wx, pPos.z - node.wz) <= 3.6) {
              if (totalCarrying() >= MAX_CARRY) {
                bus.emit('toast', { key: 'toast.carryFull', kind: 'warning' });
              } else {
                if (node.kind === 'stone') {
                  carrying.stone += 1;
                  bus.emit('toast', {
                    key: 'toast.stonePicked',
                    params: { carry: totalCarrying() },
                  });
                } else {
                  carrying.wood += 1;
                  bus.emit('toast', {
                    key: 'toast.woodPicked',
                    params: { carry: totalCarrying() },
                  });
                }
                bus.emit('sfx', { name: 'step' });
                renderDefenseHud();
              }
              break;
            }
          }

          // 3. Start Hepo Ri Gauntlet at summit altar
          if (
            !heporiState.active &&
            !heporiState.cleared &&
            Math.hypot(pPos.x - (ox + 75), pPos.z - (oz - 10)) <= 6.0
          ) {
            startHeporiGauntlet();
          }
        }
      }

      // Auto-deliver carried materials when walking right up to the Master Artisan stockpile
      if (pPos && totalCarrying() > 0 && Math.hypot(pPos.x - 4966.5, pPos.z - 52.5) <= 2.4) {
        deliverCarriedMaterials();
      }

      // Auto-start Hepo Ri Gauntlet when player reaches summit during `ch4.hepori`
      if (
        pPos &&
        !heporiState.active &&
        !heporiState.cleared &&
        (ctx.quests?.isActive?.('ch4.hepori') ||
          ctx.quests?.getActive?.()?.some?.((q) => q.id === 'ch4.hepori')) &&
        Math.hypot(pPos.x - (ox + 75), pPos.z - (oz - 10)) <= 12.0
      ) {
        startHeporiGauntlet();
      }

      // Tick Night Defense Phase (120s)
      if (phase === 'night') {
        nightTimer -= dt;
        nightSpawnCooldown -= dt;
        if (nightSpawnCooldown <= 0) {
          nightSpawnCooldown = 18.0;
          spawnNightWaveEnemies();
        }
        if (nightTimer <= 0) {
          endNight();
        }
      }

      // Tick Mount Hepo Ri 4-Wave Gauntlet
      if (heporiState.active) {
        const activeList = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.getActive?.() || [];
        const aliveCount = activeList.filter(
          (e) => heporiState.spawnedIds.includes(e.id) && e.hp > 0 && e.state !== 'liberated'
        ).length;

        if (aliveCount === 0) {
          if (heporiState.wave >= 4) {
            completeHeporiGauntlet();
          } else {
            heporiState.pauseTimer += dt;
            if (heporiState.pauseTimer >= 5.0) {
              heporiState.pauseTimer = 0;
              spawnHeporiWave(heporiState.wave + 1);
            }
          }
        }
      }

      hudTick += dt;
      if (hudTick >= 0.25) {
        hudTick = 0;
        renderDefenseHud();
      }
    },

    dispose() {
      if (hudEl) hudEl.style.display = 'none';
      if (cutsceneEl) cutsceneEl.style.display = 'none';
      if (state.player) state.player.lockedMovement = false;
      ctx.sky?.clearTimeOverride?.();
    },
  };
}

export const buildSamyeScene = createMap;
export default createMap;
