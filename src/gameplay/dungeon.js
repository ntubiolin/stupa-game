/**
 * Chapter 5 Procedural Endgame Dungeon — The Terma Realm (`伏藏秘境`, `src/gameplay/dungeon.js`) — Issue #36
 *
 * Implements:
 *   - 6×6 grid (each cell 16m × 16m, centered at (7000, 0))
 *   - Deterministic seeded PRNG (`mulberry32(seed)`) generating 8–12 connected rooms per floor
 *   - 6 room templates (`'hall'`, `'colonnade'`, `'pool'`, `'corridor'`, `'mandala'`, `'vein'`)
 *   - `THREE.InstancedMesh` geometry (< 300 draw calls, strictly 0 PointLights)
 *   - 3–4 Terma Crystal nodes (`伏藏晶石`) per floor (supporting `tertonFind` 20% extra drop)
 *   - 3-Floor progression:
 *       Floors 1 & 2: Gate of Descent (`下降之門`) unlocks at >= 70% floor enemies liberated
 *       Floor 3: Boss Room with `termaGuardian` (`守藏者`) & Terma Chest (`伏藏匣`) + 10-min speed bonus
 *   - Tier Scaling (Tier 1 .. highestClearedTier + 1):
 *       Monster level = 30 + tier
 *       Monster HP extra multiplier = 1 + 0.1 * tier
 *       Elite packs = 1 + floor(tier / 2), affixes up to 3
 *       Terma rarity weight = +0.3 * tier
 *   - Minimap layout visualization (`__stupa.dungeon.showLayout(true)`)
 *   - Terma Tier Selection UI modal (`openTierSelect()`)
 */
import * as THREE from 'three';
import '../i18n/ch5.js';
import '../i18n/coop.js';
import '../i18n/termaCaves.js';
import { i18n } from '../i18n.js';
import { getDifficulty } from '../data/combatSettings.js';

export const GRID_W = 6;
export const GRID_H = 6;
export const CELL_SIZE = 16;
export const DOOR_WIDTH = 5.8;
export const TERMA_ORIGIN = { x: 7000, z: 0 };

export const ROOM_TEMPLATES = [
  'hall',
  'colonnade',
  'pool',
  'corridor',
  'mandala',
  'vein',
];

const DUNGEON_MONSTER_POOL = [
  'preta',
  'tsen',
  'migoi',
  'droughtSprite',
  'nagini',
  'rockSpirit',
  'snowWolf',
  'windPhantom',
  'frostYak',
  'riverMiasma',
  'stoneSoldier',
  'du',
  'gyalpo',
];

const ELITE_AFFIX_POOL = [
  'frozen',
  'shielding',
  'swift',
  'vortex',
  'armored',
  'teleporter',
];

export function mulberry32(seed) {
  let a = (Number(seed) || 1) >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gridToWorld(gx, gz) {
  return {
    x: TERMA_ORIGIN.x + (gx - (GRID_W - 1) * 0.5) * CELL_SIZE,
    z: TERMA_ORIGIN.z + (gz - (GRID_H - 1) * 0.5) * CELL_SIZE,
  };
}

function edgeKey(x1, z1, x2, z2) {
  if (x1 < x2 || (x1 === x2 && z1 <= z2)) {
    return `${x1},${z1}-${x2},${z2}`;
  }
  return `${x2},${z2}-${x1},${z1}`;
}

/**
 * Deterministically generates an 8–12 room connected layout on the 6×6 grid.
 */
export function generateFloorLayout(floorSeed, floorNum = 1) {
  const rng = mulberry32(floorSeed);
  const targetCount = 8 + Math.floor(rng() * 5); // 8..12 rooms

  // Pick start cell deterministically from floorSeed
  const startCandidates = [
    [1, 1], [4, 1], [1, 4], [4, 4],
    [2, 0], [3, 0], [0, 2], [5, 2],
    [2, 5], [3, 5], [0, 3], [5, 3],
    [2, 2], [3, 2], [2, 3], [3, 3],
  ];
  const [startX, startZ] = startCandidates[Math.floor(rng() * startCandidates.length)];

  const roomMap = new Map(); // "gx,gz" -> room object
  const connections = new Set(); // edgeKey strings

  function addRoom(gx, gz) {
    const key = `${gx},${gz}`;
    if (roomMap.has(key)) return roomMap.get(key);
    const { x: wx, z: wz } = gridToWorld(gx, gz);
    const room = {
      key,
      gx,
      gz,
      wx,
      wz,
      role: 'normal',
      template: 'hall',
      doors: { N: false, S: false, E: false, W: false },
      distFromStart: 0,
    };
    roomMap.set(key, room);
    return room;
  }

  function connectRooms(a, b) {
    connections.add(edgeKey(a.gx, a.gz, b.gx, b.gz));
    if (b.gx === a.gx + 1) {
      a.doors.E = true;
      b.doors.W = true;
    } else if (b.gx === a.gx - 1) {
      a.doors.W = true;
      b.doors.E = true;
    } else if (b.gz === a.gz + 1) {
      a.doors.S = true;
      b.doors.N = true;
    } else if (b.gz === a.gz - 1) {
      a.doors.N = true;
      b.doors.S = true;
    }
  }

  const startRoom = addRoom(startX, startZ);
  startRoom.role = 'start';
  const visitedList = [startRoom];
  let current = startRoom;

  const DIRS = [
    { dx: 0, dz: -1, dir: 'N' },
    { dx: 1, dz: 0, dir: 'E' },
    { dx: 0, dz: 1, dir: 'S' },
    { dx: -1, dz: 0, dir: 'W' },
  ];

  let safety = 0;
  while (roomMap.size < targetCount && safety < 200) {
    safety++;
    // 70% continue from current, 30% branch from a random existing room
    if (rng() < 0.30) {
      current = visitedList[Math.floor(rng() * visitedList.length)];
    }

    // Shuffle directions using seeded rng
    const dirs = [...DIRS];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = dirs[i];
      dirs[i] = dirs[j];
      dirs[j] = tmp;
    }

    let progressed = false;
    for (const d of dirs) {
      const nx = current.gx + d.dx;
      const nz = current.gz + d.dz;
      if (nx < 0 || nx >= GRID_W || nz < 0 || nz >= GRID_H) continue;
      const nKey = `${nx},${nz}`;
      if (!roomMap.has(nKey)) {
        const nextRoom = addRoom(nx, nz);
        connectRooms(current, nextRoom);
        visitedList.push(nextRoom);
        current = nextRoom;
        progressed = true;
        break;
      } else if (rng() < 0.18) {
        // Occasional loop connection between adjacent rooms
        connectRooms(current, roomMap.get(nKey));
      }
    }

    if (!progressed) {
      current = visitedList[Math.floor(rng() * visitedList.length)];
    }
  }

  // BFS from startRoom to compute shortest-path distance and find farthest room
  const distMap = new Map([[startRoom.key, 0]]);
  const queue = [startRoom];
  let farthestRoom = startRoom;

  while (queue.length > 0) {
    const cur = queue.shift();
    const curDist = distMap.get(cur.key) || 0;
    cur.distFromStart = curDist;
    if (curDist > farthestRoom.distFromStart) {
      farthestRoom = cur;
    }
    for (const d of DIRS) {
      if (!cur.doors[d.dir]) continue;
      const nKey = `${cur.gx + d.dx},${cur.gz + d.dz}`;
      const neighbor = roomMap.get(nKey);
      if (neighbor && !distMap.has(nKey)) {
        distMap.set(nKey, curDist + 1);
        queue.push(neighbor);
      }
    }
  }

  farthestRoom.role = floorNum === 3 ? 'boss' : 'exit';
  farthestRoom.template = floorNum === 3 ? 'mandala' : 'hall';
  startRoom.template = 'hall';

  // Assign templates to intermediate rooms
  const midRooms = [];
  let tIdx = Math.floor(rng() * ROOM_TEMPLATES.length);
  for (const room of visitedList) {
    if (room === startRoom || room === farthestRoom) continue;
    room.template = ROOM_TEMPLATES[(tIdx + Math.floor(rng() * 2)) % ROOM_TEMPLATES.length];
    tIdx += 1;
    midRooms.push(room);
  }

  // Designate 1 intermediate room as a Terma Cave Vault Room (`伏藏密室`) on each floor
  let vaultRoom = null;
  if (midRooms.length > 0) {
    vaultRoom = midRooms[Math.floor(rng() * midRooms.length)];
    vaultRoom.role = 'vault';
    vaultRoom.template = 'vein';
  }

  // Pick 3–4 rooms for Terma Crystal Nodes (`伏藏晶石`)
  const crystalCandidates = visitedList.filter((r) => r !== startRoom);
  const crystalCount = Math.min(crystalCandidates.length, 3 + (rng() < 0.5 ? 1 : 0));
  const crystals = [];
  const cornerOffsets = [
    { ox: -4.8, oz: -4.8 },
    { ox: 4.8, oz: -4.8 },
    { ox: -4.8, oz: 4.8 },
    { ox: 4.8, oz: 4.8 },
  ];
  for (let i = 0; i < crystalCount; i++) {
    const r = crystalCandidates[(i * 2 + Math.floor(rng() * 2)) % crystalCandidates.length];
    const corner = cornerOffsets[(i + Math.floor(rng() * 4)) % cornerOffsets.length];
    crystals.push({
      id: `crystal_f${floorNum}_${i}`,
      index: i,
      gx: r.gx,
      gz: r.gz,
      x: Number((r.wx + corner.ox).toFixed(2)),
      z: Number((r.wz + corner.oz).toFixed(2)),
      broken: false,
    });
  }

  return {
    floor: floorNum,
    seed: floorSeed,
    rooms: visitedList,
    roomMap,
    connections: Array.from(connections),
    startRoom,
    exitRoom: farthestRoom,
    vaultRoom,
    crystals,
  };
}

function mergeBufferGeometries(geometries) {
  const nonIndexed = geometries.map((g) => (g.index ? g.toNonIndexed() : g.clone()));
  let totalVerts = 0;
  for (const g of nonIndexed) {
    totalVerts += g.attributes.position.count;
  }
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  let vOffset = 0;
  for (const g of nonIndexed) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const uv = g.attributes.uv;
    positions.set(pos.array, vOffset * 3);
    if (norm) normals.set(norm.array, vOffset * 3);
    if (uv) uvs.set(uv.array, vOffset * 2);
    vOffset += pos.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return merged;
}

function createTibetanPillarShaftGeometry() {
  // Spans local y in [-3.8, +3.8] (total height 7.6m)
  const baseSlab = new THREE.BoxGeometry(1.52, 0.38, 1.52);
  baseSlab.translate(0, -3.61, 0);

  const lowerShaft = new THREE.CylinderGeometry(0.50, 0.60, 6.1, 8);
  lowerShaft.translate(0, -0.15, 0);

  const upperNeck = new THREE.CylinderGeometry(0.46, 0.50, 0.65, 8);
  upperNeck.translate(0, 3.05, 0);

  return mergeBufferGeometries([baseSlab, lowerShaft, upperNeck]);
}

function createTibetanPillarCapitalGeometry() {
  // Stepped lotus plinth molding, shaft rings, and crossed Tibetan corbel brackets (斗拱弓木)
  const lotusPlinth = new THREE.CylinderGeometry(0.68, 0.82, 0.30, 8);
  lotusPlinth.translate(0, -3.26, 0);

  const midBand = new THREE.CylinderGeometry(0.57, 0.57, 0.22, 8);
  midBand.translate(0, 0.35, 0);

  const neckBand = new THREE.CylinderGeometry(0.54, 0.54, 0.18, 8);
  neckBand.translate(0, 2.25, 0);

  const abacus = new THREE.CylinderGeometry(0.76, 0.52, 0.34, 8);
  abacus.translate(0, 2.85, 0);

  const corbelLowX = new THREE.BoxGeometry(1.76, 0.28, 0.68);
  corbelLowX.translate(0, 3.22, 0);
  const corbelLowZ = new THREE.BoxGeometry(0.68, 0.28, 1.76);
  corbelLowZ.translate(0, 3.22, 0);

  const corbelHighX = new THREE.BoxGeometry(2.36, 0.34, 0.78);
  corbelHighX.translate(0, 3.56, 0);
  const corbelHighZ = new THREE.BoxGeometry(0.78, 0.34, 2.36);
  corbelHighZ.translate(0, 3.56, 0);

  return mergeBufferGeometries([
    lotusPlinth,
    midBand,
    neckBand,
    abacus,
    corbelLowX,
    corbelLowZ,
    corbelHighX,
    corbelHighZ,
  ]);
}

function createDoorwayArchFrameGeometry() {
  // Frames a 5.8m wide, 4.35m tall doorway in local space (origin at floor center of doorway)
  const halfGap = DOOR_WIDTH * 0.5;
  const leftPlinth = new THREE.BoxGeometry(0.68, 0.48, 1.42);
  leftPlinth.translate(-halfGap - 0.16, 0.24, 0);
  const rightPlinth = new THREE.BoxGeometry(0.68, 0.48, 1.42);
  rightPlinth.translate(halfGap + 0.16, 0.24, 0);

  const leftJamb = new THREE.BoxGeometry(0.46, 3.95, 1.28);
  leftJamb.translate(-halfGap - 0.12, 2.35, 0);
  const rightJamb = new THREE.BoxGeometry(0.46, 3.95, 1.28);
  rightJamb.translate(halfGap + 0.12, 2.35, 0);

  const lintelBeam = new THREE.BoxGeometry(DOOR_WIDTH + 1.35, 0.42, 1.46);
  lintelBeam.translate(0, 4.42, 0);

  const upperCornice = new THREE.BoxGeometry(DOOR_WIDTH + 1.85, 0.28, 1.62);
  upperCornice.translate(0, 4.82, 0);

  const khorloCrest = new THREE.CylinderGeometry(0.68, 0.68, 1.56, 12);
  khorloCrest.rotateX(Math.PI * 0.5);
  khorloCrest.translate(0, 4.72, 0);

  const finial = new THREE.ConeGeometry(0.32, 0.55, 8);
  finial.translate(0, 5.58, 0);

  return mergeBufferGeometries([
    leftPlinth,
    rightPlinth,
    leftJamb,
    rightJamb,
    lintelBeam,
    upperCornice,
    khorloCrest,
    finial,
  ]);
}

function createRitualVajraColumnGeometry() {
  // 3.4m tall ceremonial Tibetan Vajra pillar (origin at floor y = 0)
  const basePlinth = new THREE.CylinderGeometry(0.54, 0.68, 0.42, 8);
  basePlinth.translate(0, 0.21, 0);

  const lotusSeat = new THREE.CylinderGeometry(0.58, 0.42, 0.26, 8);
  lotusSeat.translate(0, 0.55, 0);

  const shaft = new THREE.CylinderGeometry(0.24, 0.30, 1.35, 8);
  shaft.translate(0, 1.35, 0);

  const hub = new THREE.OctahedronGeometry(0.42, 1);
  hub.translate(0, 2.22, 0);

  const upperLotus = new THREE.CylinderGeometry(0.46, 0.28, 0.24, 8);
  upperLotus.translate(0, 2.62, 0);

  const centerProng = new THREE.ConeGeometry(0.18, 0.82, 6);
  centerProng.translate(0, 3.12, 0);

  const outerRing = new THREE.BoxGeometry(0.82, 0.52, 0.14);
  outerRing.translate(0, 3.02, 0);
  const outerRingCross = new THREE.BoxGeometry(0.14, 0.52, 0.82);
  outerRingCross.translate(0, 3.02, 0);

  return mergeBufferGeometries([
    basePlinth,
    lotusSeat,
    shaft,
    hub,
    upperLotus,
    centerProng,
    outerRing,
    outerRingCross,
  ]);
}

function makeWallSyllableTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#121926';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#fbbf24';
  g.lineWidth = 6;
  g.strokeRect(14, 14, 228, 228);
  g.strokeStyle = 'rgba(45, 212, 191, 0.55)';
  g.lineWidth = 2;
  g.strokeRect(24, 24, 208, 208);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#2dd4bf';
  g.shadowBlur = 18;
  g.fillStyle = '#fde68a';
  g.font = 'bold 76px "Noto Serif Tibetan", "Kailasa", serif';
  g.fillText('ཨོཾ་ཨཱཿ་ཧཱུྃ', 128, 108);
  g.fillStyle = '#5eead4';
  g.font = 'bold 46px "Noto Serif Tibetan", serif';
  g.fillText('གཏེར་མ', 128, 182);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeCavernStoneTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#3b374d';
  g.fillRect(0, 0, 256, 256);

  // Stratified Himalayan cavern stone bands & mineral flecks
  for (let i = 0; i < 42; i++) {
    const y = (i * 19) % 256;
    const h = 4 + (i % 5) * 3;
    g.fillStyle = i % 2 === 0 ? 'rgba(24, 21, 36, 0.36)' : 'rgba(92, 82, 110, 0.24)';
    g.fillRect(0, y, 256, h);
  }
  for (let i = 0; i < 90; i++) {
    const x = (i * 53) % 256;
    const y = (i * 89) % 256;
    const w = 12 + (i % 4) * 8;
    const h = 8 + (i % 3) * 6;
    g.fillStyle = i % 3 === 0 ? 'rgba(180, 140, 88, 0.14)' : 'rgba(18, 16, 28, 0.28)';
    g.fillRect(x, y, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeFloorTileTextures() {
  if (typeof document === 'undefined') return { map: null, bumpMap: null };
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 512;
  colorCanvas.height = 512;
  const cg = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bg = bumpCanvas.getContext('2d');
  if (!cg || !bg) return { map: null, bumpMap: null };

  cg.fillStyle = '#524c66';
  cg.fillRect(0, 0, 512, 512);
  bg.fillStyle = '#909090';
  bg.fillRect(0, 0, 512, 512);

  // 4x4 carved Tibetan flagstone grid with beveled mortar & corner fretwork
  const grid = 4;
  const step = 512 / grid;
  for (let gz = 0; gz < grid; gz++) {
    for (let gx = 0; gx < grid; gx++) {
      const x0 = gx * step;
      const y0 = gz * step;
      const shade = ((gx * 7 + gz * 13) % 5) * 6 - 10;
      cg.fillStyle = `rgb(${84 + shade}, ${78 + shade}, ${104 + shade})`;
      cg.fillRect(x0 + 4, y0 + 4, step - 8, step - 8);

      bg.fillStyle = '#b8b8b8';
      bg.fillRect(x0 + 5, y0 + 5, step - 10, step - 10);

      // Recessed mortar groove
      cg.strokeStyle = 'rgba(18, 15, 28, 0.72)';
      cg.lineWidth = 5;
      cg.strokeRect(x0 + 2.5, y0 + 2.5, step - 5, step - 5);

      bg.strokeStyle = '#303030';
      bg.lineWidth = 6;
      bg.strokeRect(x0 + 2.5, y0 + 2.5, step - 5, step - 5);

      // Subtle inner carved border & lotus/dorje corner inlay
      cg.strokeStyle = 'rgba(214, 180, 112, 0.28)';
      cg.lineWidth = 2;
      cg.strokeRect(x0 + 14, y0 + 14, step - 28, step - 28);

      bg.strokeStyle = '#e0e0e0';
      bg.lineWidth = 2;
      bg.strokeRect(x0 + 14, y0 + 14, step - 28, step - 28);

      // Center diamond/lotus relief per flagstone
      const cx = x0 + step * 0.5;
      const cy = y0 + step * 0.5;
      cg.save();
      cg.translate(cx, cy);
      cg.rotate(Math.PI * 0.25);
      cg.strokeStyle = 'rgba(196, 164, 104, 0.32)';
      cg.lineWidth = 2;
      cg.strokeRect(-16, -16, 32, 32);
      cg.restore();

      bg.save();
      bg.translate(cx, cy);
      bg.rotate(Math.PI * 0.25);
      bg.strokeStyle = '#ececec';
      bg.lineWidth = 3;
      bg.strokeRect(-16, -16, 32, 32);
      bg.restore();
    }
  }

  // Outer perimeter Tibetan fretwork border band
  cg.strokeStyle = 'rgba(234, 196, 116, 0.42)';
  cg.lineWidth = 6;
  cg.strokeRect(10, 10, 492, 492);

  // Central grand lotus-dorje medallion at tile quad center
  cg.save();
  cg.translate(256, 256);
  cg.strokeStyle = 'rgba(245, 208, 125, 0.48)';
  cg.lineWidth = 4;
  cg.beginPath();
  cg.arc(0, 0, 54, 0, Math.PI * 2);
  cg.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cg.beginPath();
    cg.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
    cg.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
    cg.stroke();
  }
  cg.restore();

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

function makeWallMasonryTextures() {
  if (typeof document === 'undefined') return { map: null, bumpMap: null };
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 512;
  colorCanvas.height = 512;
  const cg = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bg = bumpCanvas.getContext('2d');
  if (!cg || !bg) return { map: null, bumpMap: null };

  cg.fillStyle = '#58526e';
  cg.fillRect(0, 0, 512, 512);
  bg.fillStyle = '#888888';
  bg.fillRect(0, 0, 512, 512);

  // Coursed Tibetan ashlar stone masonry (8 horizontal courses)
  const courses = 8;
  const rowH = 512 / courses;
  for (let r = 0; r < courses; r++) {
    const y0 = r * rowH;
    const cols = r % 2 === 0 ? 4 : 5;
    const colW = 512 / cols;
    const offset = r % 2 === 0 ? 0 : colW * 0.5;
    for (let c = -1; c <= cols; c++) {
      const x0 = c * colW + offset;
      const v = ((r * 11 + c * 7) & 7) * 4 - 12;
      cg.fillStyle = `rgb(${90 + v}, ${84 + v}, ${112 + v})`;
      cg.fillRect(x0 + 3, y0 + 3, colW - 6, rowH - 6);

      bg.fillStyle = `rgb(${155 + v}, ${155 + v}, ${155 + v})`;
      bg.fillRect(x0 + 4, y0 + 4, colW - 8, rowH - 8);

      cg.strokeStyle = 'rgba(20, 16, 30, 0.65)';
      cg.lineWidth = 4;
      cg.strokeRect(x0 + 2, y0 + 2, colW - 4, rowH - 4);

      bg.strokeStyle = '#2a2a2a';
      bg.lineWidth = 5;
      bg.strokeRect(x0 + 2, y0 + 2, colW - 4, rowH - 4);
    }
  }

  // Traditional Tibetan Monastery Pemba Frieze Band (邊瑪腰線 + 圓鏡) near upper wall
  const bandY = 68;
  const bandH = 68;
  cg.fillStyle = 'rgba(136, 36, 48, 0.82)';
  cg.fillRect(0, bandY, 512, bandH);
  cg.fillStyle = 'rgba(234, 179, 8, 0.78)';
  cg.fillRect(0, bandY - 6, 512, 6);
  cg.fillRect(0, bandY + bandH, 512, 6);

  bg.fillStyle = '#d8d8d8';
  bg.fillRect(0, bandY - 6, 512, 8);
  bg.fillRect(0, bandY + bandH - 2, 512, 8);

  // Golden Melong Mirror bosses along the frieze band
  for (let m = 0; m < 8; m++) {
    const mx = (m + 0.5) * (512 / 8);
    const my = bandY + bandH * 0.5;
    cg.fillStyle = 'rgba(253, 224, 71, 0.85)';
    cg.beginPath();
    cg.arc(mx, my, 15, 0, Math.PI * 2);
    cg.fill();
    cg.strokeStyle = 'rgba(120, 53, 15, 0.9)';
    cg.lineWidth = 3;
    cg.stroke();

    bg.fillStyle = '#ffffff';
    bg.beginPath();
    bg.arc(mx, my, 15, 0, Math.PI * 2);
    bg.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 1);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 1);
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

function makeMandalaDecalTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  if (!g) return null;

  const cx = 256;
  const cy = 256;
  g.clearRect(0, 0, 512, 512);

  // Radial sacred background glow
  const bgGrad = g.createRadialGradient(cx, cy, 12, cx, cy, 248);
  bgGrad.addColorStop(0.0, 'rgba(251, 191, 36, 0.95)');
  bgGrad.addColorStop(0.35, 'rgba(180, 83, 9, 0.85)');
  bgGrad.addColorStop(0.68, 'rgba(15, 118, 110, 0.82)');
  bgGrad.addColorStop(0.92, 'rgba(127, 29, 29, 0.88)');
  bgGrad.addColorStop(1.0, 'rgba(18, 16, 28, 0.0)');
  g.fillStyle = bgGrad;
  g.beginPath();
  g.arc(cx, cy, 248, 0, Math.PI * 2);
  g.fill();

  // Concentric Tibetan Mandala circles
  const radii = [238, 216, 178, 138, 96, 54];
  const colors = ['#fbbf24', '#2dd4bf', '#fde047', '#f87171', '#5eead4', '#fef08a'];
  for (let i = 0; i < radii.length; i++) {
    g.strokeStyle = colors[i];
    g.lineWidth = i % 2 === 0 ? 5 : 3;
    g.beginPath();
    g.arc(cx, cy, radii[i], 0, Math.PI * 2);
    g.stroke();
  }

  // 16 outer lotus petals
  g.save();
  g.translate(cx, cy);
  for (let p = 0; p < 16; p++) {
    const a = (p / 16) * Math.PI * 2;
    g.save();
    g.rotate(a);
    g.fillStyle = p % 2 === 0 ? 'rgba(251, 191, 36, 0.65)' : 'rgba(45, 212, 191, 0.65)';
    g.beginPath();
    g.moveTo(0, -140);
    g.quadraticCurveTo(22, -162, 0, -176);
    g.quadraticCurveTo(-22, -162, 0, -140);
    g.fill();
    g.restore();
  }

  // Four-gated Tibetan Mandala Palace Square
  g.strokeStyle = '#fef08a';
  g.lineWidth = 5;
  g.strokeRect(-102, -102, 204, 204);
  g.strokeStyle = '#2dd4bf';
  g.lineWidth = 3;
  g.strokeRect(-92, -92, 184, 184);

  // 8-spoked Golden Dharmachakra & Crossed Double Vajra
  g.strokeStyle = '#fef9c3';
  g.lineWidth = 5;
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * 92, Math.sin(a) * 92);
    g.stroke();
  }
  g.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeRadialGlowTexture(innerStop, midStop, outerStop = 'rgba(0,0,0,0)') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0.0, innerStop);
  grad.addColorStop(0.45, midStop);
  grad.addColorStop(1.0, outerStop);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createDungeon(ctx) {
  if (ctx.dungeon) return ctx.dungeon;
  const { scene, state, bus } = ctx;

  // Persistent state in ctx.save ('dungeon')
  let highestClearedTier = 0;
  function loadSaved() {
    if (!ctx.save) return;
    const saved = ctx.save.get('dungeon', null);
    if (saved && typeof saved === 'object') {
      highestClearedTier = Math.max(0, Math.floor(Number(saved.highestClearedTier) || 0));
    }
  }
  function saveDungeon() {
    if (!ctx.save) return;
    ctx.save.set('dungeon', {
      highestClearedTier,
    });
  }
  // Runtime state
  let active = false;
  let currentTier = 1;
  let baseSeed = 123;
  let currentFloor = 1;
  let floorLayout = null;
  let showLayoutFlag = false;
  let runStartElapsed = 0;
  let runMonsters = ['stoneSoldier', 'du', 'snowWolf'];

  let totalEnemies = 0;
  let liberatedCount = 0;
  let gateUnlocked = false;
  let bossSubduedOnFloor = false;
  let chestOpened = false;
  let pendingTimeBonus = false;
  const floorEnemyIds = new Set();
  const liberatedEnemyIds = new Set();
  const vaultGuardIds = new Set();
  let vaultUnsealed = false;
  let vaultExtracted = false;

  loadSaved();
  if (ctx.save?.register) {
    ctx.save.register(
      'dungeon',
      () => ({ highestClearedTier }),
      (data) => {
        highestClearedTier = Math.max(0, Math.floor(Number(data?.highestClearedTier) || 0));
        syncState();
      },
    );
  }

  // 3D Scene Group for procedural floor geometry (Zero PointLights, InstancedMeshes)
  const dungeonGroup = new THREE.Group();
  dungeonGroup.name = 'TermaProceduralDungeon';
  scene.add(dungeonGroup);

  const floorColliders = [];
  const floorInteractables = [];
  const crystalMeshes = new Map(); // crystal.id -> THREE.Group
  let gateMeshGroup = null;
  let gatePortalMat = null;
  let gateRingMat = null;
  let chestMeshGroup = null;
  let chestLidMesh = null;
  let chestBeamMesh = null;
  let returnGateGroup = null;
  let dustPointsMesh = null;
  let vaultMeshGroup = null;
  let vaultLidMesh = null;
  let vaultCoreMesh = null;
  let vaultRingMat = null;
  let vaultBeamMesh = null;
  let bossMandalaOuterRing = null;
  let bossMandalaInnerRing = null;
  let bossAltarLotusCrown = null;

  // Shared Geometries & Materials for InstancedMeshes (Zero PointLights; textures built lazily on dungeon entry)
  let stoneTex = null;
  let floorTileTex = null;
  let floorBumpTex = null;
  let wallStoneTex = null;
  let wallBumpTex = null;
  let mandalaDecalTex = null;
  let warmGlowTex = null;
  let coolGlowTex = null;
  let syllableTex = null;

  const floorTileGeo = new THREE.BoxGeometry(15.4, 0.45, 15.4);
  const floorTileMat = new THREE.MeshStandardMaterial({
    color: 0x2d2842,
    roughness: 0.78,
    metalness: 0.18,
    bumpScale: 0.05,
  });

  const wallSegGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const wallSegMat = new THREE.MeshStandardMaterial({
    color: 0x3b3454,
    roughness: 0.80,
    metalness: 0.16,
    bumpScale: 0.06,
  });

  const pillarGeo = createTibetanPillarShaftGeometry();
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x4c4368,
    roughness: 0.66,
    metalness: 0.28,
    bumpScale: 0.04,
  });

  const pillarCapitalGeo = createTibetanPillarCapitalGeometry();
  const pillarCapitalMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.32,
    metalness: 0.76,
    emissive: 0x78350f,
    emissiveIntensity: 0.42,
  });

  const doorArchFrameGeo = createDoorwayArchFrameGeometry();
  const doorArchFrameMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.38,
    metalness: 0.68,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
  });

  const vajraColumnGeo = createRitualVajraColumnGeometry();
  const vajraColumnMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.28,
    metalness: 0.80,
    emissive: 0xb45309,
    emissiveIntensity: 0.55,
  });

  const mandalaMedallionGeo = new THREE.CylinderGeometry(3.25, 3.38, 0.08, 32);
  const mandalaMedallionMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.30,
    metalness: 0.62,
    emissive: 0xd97706,
    emissiveIntensity: 0.52,
    transparent: true,
    opacity: 0.96,
  });

  // Craggy subterranean rock formations & vaulted cavern ceiling
  const rockCragGeo = new THREE.DodecahedronGeometry(1.25, 1);
  const rockCragMat = new THREE.MeshStandardMaterial({
    color: 0x2e2942,
    roughness: 0.90,
    metalness: 0.10,
  });

  const ceilingVaultGeo = new THREE.BoxGeometry(16.8, 1.4, 16.8);
  const ceilingArchGeo = new THREE.CylinderGeometry(6.4, 8.6, 1.9, 8);
  const ceilingVaultMat = new THREE.MeshStandardMaterial({
    color: 0x211d30,
    roughness: 0.92,
    metalness: 0.08,
  });
  const ceilingArchMat = new THREE.MeshStandardMaterial({
    color: 0x2c2640,
    roughness: 0.78,
    metalness: 0.22,
  });

  const stalactiteGeo = new THREE.ConeGeometry(0.46, 2.35, 6);
  stalactiteGeo.rotateX(Math.PI); // Point downward from ceiling
  const stalactiteMat = new THREE.MeshStandardMaterial({
    color: 0x352f4b,
    roughness: 0.86,
    metalness: 0.14,
  });

  // Sacred Butter-Lamp Braziers & Radial Light Pools (0 PointLights)
  const brazierStandGeo = new THREE.CylinderGeometry(0.36, 0.48, 0.92, 8);
  const brazierStandMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.34,
    metalness: 0.72,
    emissive: 0x92400e,
    emissiveIntensity: 0.65,
  });

  const brazierFlameGeo = new THREE.ConeGeometry(0.18, 0.48, 8);
  const brazierFlameMat = new THREE.MeshBasicMaterial({
    color: 0xffdf7a,
    toneMapped: false,
  });

  const lightPoolGeo = new THREE.PlaneGeometry(1.0, 1.0);
  lightPoolGeo.rotateX(-Math.PI / 2);
  const warmPoolMat = new THREE.MeshBasicMaterial({
    color: 0xffb74d,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coolPoolMat = new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lightShaftGeo = new THREE.ConeGeometry(3.4, 7.6, 16, 1, true);
  const lightShaftMat = new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const plaqueGeo = new THREE.PlaneGeometry(2.1, 2.1);
  const plaqueMat = new THREE.MeshBasicMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  function ensureDungeonTextures() {
    if (stoneTex) return;
    stoneTex = makeCavernStoneTexture();
    const floorTexPair = makeFloorTileTextures();
    floorTileTex = floorTexPair.map;
    floorBumpTex = floorTexPair.bumpMap;
    const wallTexPair = makeWallMasonryTextures();
    wallStoneTex = wallTexPair.map;
    wallBumpTex = wallTexPair.bumpMap;
    mandalaDecalTex = makeMandalaDecalTexture();

    warmGlowTex = makeRadialGlowTexture(
      'rgba(255, 198, 92, 0.85)',
      'rgba(217, 119, 6, 0.34)',
      'rgba(120, 53, 15, 0.0)',
    );
    coolGlowTex = makeRadialGlowTexture(
      'rgba(94, 234, 212, 0.82)',
      'rgba(13, 148, 136, 0.32)',
      'rgba(15, 118, 110, 0.0)',
    );
    syllableTex = makeWallSyllableTexture();

    floorTileMat.map = floorTileTex || stoneTex || null;
    floorTileMat.bumpMap = floorBumpTex || null;
    floorTileMat.bumpScale = 0.05;
    floorTileMat.needsUpdate = true;

    wallSegMat.map = wallStoneTex || stoneTex || null;
    wallSegMat.bumpMap = wallBumpTex || null;
    wallSegMat.bumpScale = 0.06;
    wallSegMat.needsUpdate = true;

    pillarMat.map = wallStoneTex || stoneTex || null;
    pillarMat.bumpMap = wallBumpTex || null;
    pillarMat.bumpScale = 0.04;
    pillarMat.needsUpdate = true;

    for (const mat of [rockCragMat, ceilingVaultMat, ceilingArchMat]) {
      mat.map = stoneTex || null;
      mat.needsUpdate = true;
    }

    mandalaMedallionMat.map = mandalaDecalTex || null;
    mandalaMedallionMat.emissiveMap = mandalaDecalTex || null;
    mandalaMedallionMat.needsUpdate = true;

    warmPoolMat.map = warmGlowTex || null;
    warmPoolMat.needsUpdate = true;
    coolPoolMat.map = coolGlowTex || null;
    coolPoolMat.needsUpdate = true;
    plaqueMat.map = syllableTex || null;
    plaqueMat.needsUpdate = true;
  }

  const veinGeo = new THREE.OctahedronGeometry(0.45, 0);
  const veinMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0x14b8a6,
    emissiveIntensity: 1.45,
    toneMapped: false,
  });

  const decorRingGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.24, 16);
  const decorRingMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.32,
    metalness: 0.7,
    emissive: 0xb45309,
    emissiveIntensity: 0.65,
  });

  const crystalShardGeo = new THREE.OctahedronGeometry(0.42, 0);
  const crystalShardMat = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    roughness: 0.15,
    metalness: 0.45,
    emissive: 0x0d9488,
    emissiveIntensity: 1.75,
    toneMapped: false,
  });
  const crystalBaseMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    metalness: 0.75,
    emissive: 0xd97706,
    emissiveIntensity: 0.8,
  });

  /**
   * Styles all floor materials for the 3-Floor Visual Biome Progression:
   *   - Floor 1: Subterranean Turquoise Mineral Cavern (`伏藏岩窟`)
   *   - Floor 2: Glacial Rime & Crystal Sanctum (`寒晶冰窟`)
   *   - Floor 3: Golden Mandala Imperial Vault (`金剛壇城密殿`)
   */
  function applyFloorBiomeTheme(floorNum = 1) {
    if (floorNum === 2) {
      // Floor 2 — Glacial Rime & Crystal Sanctum (`寒晶冰窟`)
      floorTileMat.color.setHex(0x243b55);
      floorTileMat.roughness = 0.58;
      floorTileMat.metalness = 0.26;

      wallSegMat.color.setHex(0x2b4663);
      wallSegMat.roughness = 0.66;
      wallSegMat.metalness = 0.24;

      pillarMat.color.setHex(0x365577);
      pillarMat.roughness = 0.44;
      pillarMat.metalness = 0.34;

      pillarCapitalMat.color.setHex(0x7dd3fc);
      pillarCapitalMat.roughness = 0.22;
      pillarCapitalMat.metalness = 0.72;
      pillarCapitalMat.emissive.setHex(0x0284c7);
      pillarCapitalMat.emissiveIntensity = 0.48;

      doorArchFrameMat.color.setHex(0x38bdf8);
      doorArchFrameMat.emissive.setHex(0x0369a1);
      doorArchFrameMat.emissiveIntensity = 0.42;

      vajraColumnMat.color.setHex(0xbae6fd);
      vajraColumnMat.emissive.setHex(0x0284c7);
      vajraColumnMat.emissiveIntensity = 0.62;

      rockCragMat.color.setHex(0x1b2e44);
      rockCragMat.roughness = 0.74;

      ceilingVaultMat.color.setHex(0x152538);
      ceilingArchMat.color.setHex(0x223b57);

      stalactiteMat.color.setHex(0x38bdf8);
      stalactiteMat.roughness = 0.18;
      stalactiteMat.metalness = 0.38;
      stalactiteMat.emissive.setHex(0x0369a1);
      stalactiteMat.emissiveIntensity = 0.45;

      veinMat.color.setHex(0x38bdf8);
      veinMat.roughness = 0.16;
      veinMat.emissive.setHex(0x0ea5e9);
      veinMat.emissiveIntensity = 1.65;

      warmPoolMat.color.setHex(0xfde68a);
      coolPoolMat.color.setHex(0x38bdf8);
      lightShaftMat.color.setHex(0x7dd3fc);
      decorRingMat.color.setHex(0x7dd3fc);
      decorRingMat.emissive.setHex(0x0284c7);

      return {
        abyssColor: 0x07111e,
        shellColor: 0x0c1b2e,
        warmMote: [0.88, 0.95, 1.0],
        coolMote: [0.22, 0.74, 0.97],
      };
    }

    if (floorNum >= 3) {
      // Floor 3 — Golden Mandala Imperial Vault (`金剛壇城密殿`)
      floorTileMat.color.setHex(0x3b1d2e);
      floorTileMat.roughness = 0.64;
      floorTileMat.metalness = 0.30;

      wallSegMat.color.setHex(0x4a2034);
      wallSegMat.roughness = 0.70;
      wallSegMat.metalness = 0.26;

      pillarMat.color.setHex(0x6b2138);
      pillarMat.roughness = 0.46;
      pillarMat.metalness = 0.38;

      pillarCapitalMat.color.setHex(0xfbbf24);
      pillarCapitalMat.roughness = 0.24;
      pillarCapitalMat.metalness = 0.85;
      pillarCapitalMat.emissive.setHex(0xd97706);
      pillarCapitalMat.emissiveIntensity = 0.72;

      doorArchFrameMat.color.setHex(0xfbbf24);
      doorArchFrameMat.emissive.setHex(0xb45309);
      doorArchFrameMat.emissiveIntensity = 0.65;

      vajraColumnMat.color.setHex(0xfde047);
      vajraColumnMat.emissive.setHex(0xd97706);
      vajraColumnMat.emissiveIntensity = 0.78;

      rockCragMat.color.setHex(0x2a1220);
      rockCragMat.roughness = 0.84;

      ceilingVaultMat.color.setHex(0x1f0d18);
      ceilingArchMat.color.setHex(0x854d0e);

      stalactiteMat.color.setHex(0xb45309);
      stalactiteMat.roughness = 0.36;
      stalactiteMat.metalness = 0.62;
      stalactiteMat.emissive.setHex(0x78350f);
      stalactiteMat.emissiveIntensity = 0.32;

      veinMat.color.setHex(0xfbbf24);
      veinMat.roughness = 0.18;
      veinMat.emissive.setHex(0xf59e0b);
      veinMat.emissiveIntensity = 1.70;

      warmPoolMat.color.setHex(0xfbbf24);
      coolPoolMat.color.setHex(0xf59e0b);
      lightShaftMat.color.setHex(0xfde68a);
      decorRingMat.color.setHex(0xfde047);
      decorRingMat.emissive.setHex(0xd97706);

      return {
        abyssColor: 0x14080e,
        shellColor: 0x1f0b16,
        warmMote: [1.0, 0.88, 0.32],
        coolMote: [0.98, 0.56, 0.24],
      };
    }

    // Floor 1 — Subterranean Turquoise Mineral Cavern (`伏藏岩窟`)
    floorTileMat.color.setHex(0x2d2842);
    floorTileMat.roughness = 0.80;
    floorTileMat.metalness = 0.16;

    wallSegMat.color.setHex(0x3d3656);
    wallSegMat.roughness = 0.82;
    wallSegMat.metalness = 0.16;

    pillarMat.color.setHex(0x4e456b);
    pillarMat.roughness = 0.68;
    pillarMat.metalness = 0.24;

    pillarCapitalMat.color.setHex(0xd97706);
    pillarCapitalMat.roughness = 0.34;
    pillarCapitalMat.metalness = 0.74;
    pillarCapitalMat.emissive.setHex(0x78350f);
    pillarCapitalMat.emissiveIntensity = 0.42;

    doorArchFrameMat.color.setHex(0xb45309);
    doorArchFrameMat.emissive.setHex(0x78350f);
    doorArchFrameMat.emissiveIntensity = 0.36;

    vajraColumnMat.color.setHex(0xfbbf24);
    vajraColumnMat.emissive.setHex(0xb45309);
    vajraColumnMat.emissiveIntensity = 0.55;

    rockCragMat.color.setHex(0x262138);
    rockCragMat.roughness = 0.90;

    ceilingVaultMat.color.setHex(0x1d192b);
    ceilingArchMat.color.setHex(0x2e2844);

    stalactiteMat.color.setHex(0x352f4b);
    stalactiteMat.roughness = 0.84;
    stalactiteMat.metalness = 0.16;
    stalactiteMat.emissive.setHex(0x0f766e);
    stalactiteMat.emissiveIntensity = 0.14;

    veinMat.color.setHex(0x2dd4bf);
    veinMat.roughness = 0.20;
    veinMat.emissive.setHex(0x14b8a6);
    veinMat.emissiveIntensity = 1.50;

    warmPoolMat.color.setHex(0xffb74d);
    coolPoolMat.color.setHex(0x5eead4);
    lightShaftMat.color.setHex(0x5eead4);
    decorRingMat.color.setHex(0xfbbf24);
    decorRingMat.emissive.setHex(0xb45309);

    return {
      abyssColor: 0x0b0914,
      shellColor: 0x120f20,
      warmMote: [1.0, 0.82, 0.38],
      coolMote: [0.37, 0.92, 0.83],
    };
  }

  function syncState() {
    const monsterLevel = 30 + currentTier;
    const tierHpMult = Number((1 + 0.1 * currentTier).toFixed(2));
    const partySize = Math.max(1, ctx.coop?.getPartySize?.() || 1);
    const coopHpMult = Number((1 + 0.45 * (partySize - 1)).toFixed(2));
    const partyFindBonus = (partySize - 1) * 25;
    state.dungeon = {
      active,
      tier: currentTier,
      floor: currentFloor,
      seed: baseSeed,
      floorSeed: floorLayout?.seed ?? baseSeed,
      monsterLevel,
      tierHpMult,
      partySize,
      coopHpMult,
      partyFindBonus,
      highestClearedTier,
      maxSelectableTier: highestClearedTier + 1,
      showLayout: showLayoutFlag,
      totalEnemies,
      liberatedCount,
      liberationRatio: totalEnemies > 0 ? Number((liberatedCount / totalEnemies).toFixed(2)) : 1,
      gateUnlocked,
      bossSubdued: bossSubduedOnFloor,
      chestOpened,
      vaultGuardsRemaining: vaultGuardIds.size,
      vaultUnsealed,
      vaultExtracted,
      vaultRoomWorld: floorLayout?.vaultRoom
        ? { x: floorLayout.vaultRoom.wx, z: floorLayout.vaultRoom.wz }
        : null,
      roomCount: floorLayout?.rooms?.length || 0,
      rooms:
        floorLayout?.rooms?.map((r) => ({
          gx: r.gx,
          gz: r.gz,
          wx: r.wx,
          wz: r.wz,
          role: r.role,
          template: r.template,
          doors: { ...r.doors },
        })) || [],
      connections: floorLayout?.connections || [],
      startRoomWorld: floorLayout?.startRoom
        ? { x: floorLayout.startRoom.wx, z: floorLayout.startRoom.wz }
        : null,
      exitRoomWorld: floorLayout?.exitRoom
        ? { x: floorLayout.exitRoom.wx, z: floorLayout.exitRoom.wz }
        : null,
      bossRoomWorld:
        currentFloor === 3 && floorLayout?.exitRoom
          ? { x: floorLayout.exitRoom.wx, z: floorLayout.exitRoom.wz, r: 13.5 }
          : null,
      crystals:
        floorLayout?.crystals?.map((c) => ({
          id: c.id,
          index: c.index,
          x: c.x,
          z: c.z,
          broken: c.broken,
        })) || [],
    };
  }

  function clearFloorEntities() {
    while (dungeonGroup.children.length > 0) {
      const child = dungeonGroup.children[0];
      dungeonGroup.remove(child);
    }
    crystalMeshes.clear();
    gateMeshGroup = null;
    chestMeshGroup = null;
    chestLidMesh = null;
    chestBeamMesh = null;
    returnGateGroup = null;
    dustPointsMesh = null;
    vaultMeshGroup = null;
    vaultLidMesh = null;
    vaultCoreMesh = null;
    vaultRingMat = null;
    vaultBeamMesh = null;
    bossMandalaOuterRing = null;
    bossMandalaInnerRing = null;
    bossAltarLotusCrown = null;
    floorEnemyIds.clear();
    liberatedEnemyIds.clear();

    // Remove registered colliders from ctx.colliders
    if (Array.isArray(ctx.colliders) && floorColliders.length > 0) {
      for (let i = ctx.colliders.length - 1; i >= 0; i--) {
        if (floorColliders.includes(ctx.colliders[i])) {
          ctx.colliders.splice(i, 1);
        }
      }
    }
    floorColliders.length = 0;

    // Remove registered interactables from ctx.interactables
    if (Array.isArray(ctx.interactables) && floorInteractables.length > 0) {
      for (let i = ctx.interactables.length - 1; i >= 0; i--) {
        if (floorInteractables.includes(ctx.interactables[i])) {
          ctx.interactables.splice(i, 1);
        }
      }
    }
    floorInteractables.length = 0;
  }

  function addDungeonCollider(col) {
    const c = { ...col, zone: 'terma' };
    if (c.type === 'box') {
      const hx = c.hx ?? (c.w ? c.w * 0.5 : 0.5);
      const hz = c.hz ?? (c.d ? c.d * 0.5 : 0.5);
      c.hx = hx;
      c.hz = hz;
      c.w = hx * 2;
      c.d = hz * 2;
      c.minX = c.x - hx;
      c.maxX = c.x + hx;
      c.minZ = c.z - hz;
      c.maxZ = c.z + hz;
    }
    floorColliders.push(c);
    if (Array.isArray(ctx.colliders)) {
      ctx.colliders.push(c);
    }
  }

  function addDungeonInteractable(it) {
    floorInteractables.push(it);
    if (Array.isArray(ctx.interactables)) {
      ctx.interactables.push(it);
    }
  }

  /**
   * Builds the current floor's 3D scene using THREE.InstancedMesh (< 300 draw calls, 0 PointLights).
   */
  function buildFloorScene(layout) {
    ensureDungeonTextures();
    clearFloorEntities();
    const biome = applyFloorBiomeTheme(layout.floor || currentFloor);

    // 0. Outer Subterranean Cavern Shell & Abyssal Floor (100% sky-proof enclosure)
    const abyssGeo = new THREE.PlaneGeometry(210, 210);
    abyssGeo.rotateX(-Math.PI / 2);
    const abyssMat = new THREE.MeshStandardMaterial({
      color: biome.abyssColor,
      roughness: 0.96,
      metalness: 0.04,
    });
    const abyssFloor = new THREE.Mesh(abyssGeo, abyssMat);
    abyssFloor.name = 'TermaAbyssFloor';
    abyssFloor.position.set(TERMA_ORIGIN.x, -0.55, TERMA_ORIGIN.z);
    abyssFloor.receiveShadow = true;
    dungeonGroup.add(abyssFloor);

    const cavernShellGeo = new THREE.SphereGeometry(122, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const cavernShellMat = new THREE.MeshStandardMaterial({
      color: biome.shellColor,
      map: stoneTex || null,
      roughness: 0.95,
      metalness: 0.06,
      side: THREE.BackSide,
    });
    const cavernShell = new THREE.Mesh(cavernShellGeo, cavernShellMat);
    cavernShell.name = 'TermaCavernOuterShell';
    cavernShell.position.set(TERMA_ORIGIN.x, -6, TERMA_ORIGIN.z);
    dungeonGroup.add(cavernShell);

    const floorMatrices = [];
    const wallMatrices = [];
    const pillarMatrices = [];
    const doorArchMatrices = [];
    const vajraColumnMatrices = [];
    const mandalaMedallionMatrices = [];
    const plaqueMatrices = [];
    const veinMatrices = [];
    const decorMatrices = [];
    const ceilingVaultMatrices = [];
    const ceilingArchMatrices = [];
    const rockCragMatrices = [];
    const stalactiteMatrices = [];
    const brazierMatrices = [];
    const flameMatrices = [];
    const warmPoolMatrices = [];
    const coolPoolMatrices = [];
    const lightShaftMatrices = [];

    const dummy = new THREE.Object3D();
    const halfCell = CELL_SIZE * 0.5; // 8m
    const wallThick = 1.05;
    const wallHeight = 7.6;
    const wallCenterY = wallHeight * 0.5; // 3.8m
    const doorGap = DOOR_WIDTH; // Wide 5.8m doorway opening so player & enemies walk freely
    const doorHeight = 4.35;
    const lintelHeight = wallHeight - doorHeight; // 3.25m stone arch lintel over every doorway
    const lintelCenterY = doorHeight + lintelHeight * 0.5;
    const sideSegLen = (CELL_SIZE - doorGap) * 0.5; // 5.1m on each side of doorway

    let roomIndex = 0;
    for (const room of layout.rooms) {
      const { wx, wz, doors, template, role } = room;
      roomIndex += 1;

      // 1. Floor slab for the room
      dummy.position.set(wx, -0.22, wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      floorMatrices.push(dummy.matrix.clone());

      // Vaulted cavern ceiling slab & coffered rock arch completely covering the room overhead
      dummy.position.set(wx, 8.15, wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ceilingVaultMatrices.push(dummy.matrix.clone());

      dummy.position.set(wx, 7.15, wz);
      dummy.rotation.set(0, (roomIndex % 4) * (Math.PI * 0.25), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ceilingArchMatrices.push(dummy.matrix.clone());

      // Hanging limestone & crystal stalactites around the upper ceiling perimeter
      const stalCount = template === 'vein' ? 12 : 8;
      for (let st = 0; st < stalCount; st++) {
        const sAng = (st / stalCount) * Math.PI * 2 + roomIndex * 0.37;
        const sRad = 4.6 + (st % 3) * 1.15;
        const sScale = 0.78 + ((st + roomIndex) % 3) * 0.26;
        dummy.position.set(
          wx + Math.cos(sAng) * sRad,
          7.1 - sScale * 0.55,
          wz + Math.sin(sAng) * sRad,
        );
        dummy.rotation.set(0, sAng, 0);
        dummy.scale.set(sScale, sScale, sScale);
        dummy.updateMatrix();
        stalactiteMatrices.push(dummy.matrix.clone());
      }

      // Bridge slabs, tunnel ceiling slabs & carved Tibetan doorway arch frames on East and South doorways
      if (doors.E) {
        dummy.position.set(wx + halfCell, -0.19, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.20, 1, 0.42);
        dummy.updateMatrix();
        floorMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx + halfCell, 7.85, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.28, 1.1, 0.52);
        dummy.updateMatrix();
        ceilingVaultMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx + halfCell, 0, wz);
        dummy.rotation.set(0, Math.PI * 0.5, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        doorArchMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx + halfCell - 0.62, 5.75, wz);
        dummy.rotation.set(0, -Math.PI * 0.5, 0);
        dummy.scale.set(0.68, 0.68, 1);
        dummy.updateMatrix();
        plaqueMatrices.push(dummy.matrix.clone());
      }
      if (doors.S) {
        dummy.position.set(wx, -0.19, wz + halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.42, 1, 0.20);
        dummy.updateMatrix();
        floorMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx, 7.85, wz + halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.52, 1.1, 0.28);
        dummy.updateMatrix();
        ceilingVaultMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx, 0, wz + halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        doorArchMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx, 5.75, wz + halfCell - 0.62);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.scale.set(0.68, 0.68, 1);
        dummy.updateMatrix();
        plaqueMatrices.push(dummy.matrix.clone());
      }

      // 2. Four Corner Pillars + Sacred Butter-Lamp Braziers & Warm Floor Light Pools per room
      for (const [cx, cz] of [
        [-halfCell + 0.7, -halfCell + 0.7],
        [halfCell - 0.7, -halfCell + 0.7],
        [-halfCell + 0.7, halfCell - 0.7],
        [halfCell - 0.7, halfCell - 0.7],
      ]) {
        dummy.position.set(wx + cx, 3.8, wz + cz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pillarMatrices.push(dummy.matrix.clone());

        // Corner rock bolster at upper wall-ceiling junction
        dummy.position.set(wx + cx * 0.94, 6.2, wz + cz * 0.94);
        dummy.rotation.set(0.3, cx * cz, 0.2);
        dummy.scale.set(1.45, 1.35, 1.45);
        dummy.updateMatrix();
        rockCragMatrices.push(dummy.matrix.clone());

        // Sacred Butter-Lamp Brazier inset from each corner pillar
        const bx = wx + cx * 0.76;
        const bz = wz + cz * 0.76;
        dummy.position.set(bx, 0.46, bz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        brazierMatrices.push(dummy.matrix.clone());

        dummy.position.set(bx, 1.14, bz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        flameMatrices.push(dummy.matrix.clone());

        // Warm golden butter-lamp light pool on the stone floor
        dummy.position.set(bx, 0.03, bz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(5.6, 5.6, 1);
        dummy.updateMatrix();
        warmPoolMatrices.push(dummy.matrix.clone());
      }

      // 3. Outer Cavern Walls, Doorway Stone Lintels, Craggy Rock Faces & Colliders
      // North wall (z = wz - halfCell)
      if (!doors.N) {
        dummy.position.set(wx, wallCenterY, wz - halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(CELL_SIZE, wallHeight, wallThick);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx, z: wz - halfCell, hx: halfCell, hz: 0.65 });

        for (const s of [-1, 1]) {
          dummy.position.set(wx + s * 4.2, 3.2, wz - halfCell + 0.55);
          dummy.rotation.set(0.2, s * 0.6, 0.1);
          dummy.scale.set(1.5, 2.5, 0.95);
          dummy.updateMatrix();
          rockCragMatrices.push(dummy.matrix.clone());
        }

        // Glowing Tibetan syllable plaque on closed North wall
        dummy.position.set(wx, 2.55, wz - halfCell + 0.58);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plaqueMatrices.push(dummy.matrix.clone());
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx + s * offset, wallCenterY, wz - halfCell);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(sideSegLen, wallHeight, wallThick);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx + s * offset,
            z: wz - halfCell,
            hx: sideSegLen * 0.5,
            hz: 0.58,
          });
        }
        // Solid stone arch lintel over North doorway
        dummy.position.set(wx, lintelCenterY, wz - halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(doorGap + 0.4, lintelHeight, wallThick * 1.15);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
      }

      // South wall (z = wz + halfCell)
      if (!doors.S) {
        dummy.position.set(wx, wallCenterY, wz + halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(CELL_SIZE, wallHeight, wallThick);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx, z: wz + halfCell, hx: halfCell, hz: 0.65 });

        for (const s of [-1, 1]) {
          dummy.position.set(wx + s * 4.2, 3.2, wz + halfCell - 0.55);
          dummy.rotation.set(-0.2, s * 0.5, 0.1);
          dummy.scale.set(1.5, 2.5, 0.95);
          dummy.updateMatrix();
          rockCragMatrices.push(dummy.matrix.clone());
        }

        dummy.position.set(wx, 2.55, wz + halfCell - 0.58);
        dummy.rotation.set(0, Math.PI, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plaqueMatrices.push(dummy.matrix.clone());
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx + s * offset, wallCenterY, wz + halfCell);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(sideSegLen, wallHeight, wallThick);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx + s * offset,
            z: wz + halfCell,
            hx: sideSegLen * 0.5,
            hz: 0.58,
          });
        }
        // Solid stone arch lintel over South doorway
        dummy.position.set(wx, lintelCenterY, wz + halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(doorGap + 0.4, lintelHeight, wallThick * 1.15);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
      }

      // West wall (x = wx - halfCell)
      if (!doors.W) {
        dummy.position.set(wx - halfCell, wallCenterY, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(wallThick, wallHeight, CELL_SIZE);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx - halfCell, z: wz, hx: 0.65, hz: halfCell });

        for (const s of [-1, 1]) {
          dummy.position.set(wx - halfCell + 0.55, 3.2, wz + s * 4.2);
          dummy.rotation.set(0.1, s * 0.7, 0.2);
          dummy.scale.set(0.95, 2.5, 1.5);
          dummy.updateMatrix();
          rockCragMatrices.push(dummy.matrix.clone());
        }

        dummy.position.set(wx - halfCell + 0.58, 2.55, wz);
        dummy.rotation.set(0, Math.PI * 0.5, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plaqueMatrices.push(dummy.matrix.clone());
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx - halfCell, wallCenterY, wz + s * offset);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(wallThick, wallHeight, sideSegLen);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx - halfCell,
            z: wz + s * offset,
            hx: 0.58,
            hz: sideSegLen * 0.5,
          });
        }
        // Solid stone arch lintel over West doorway
        dummy.position.set(wx - halfCell, lintelCenterY, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(wallThick * 1.15, lintelHeight, doorGap + 0.4);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
      }

      // East wall (x = wx + halfCell)
      if (!doors.E) {
        dummy.position.set(wx + halfCell, wallCenterY, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(wallThick, wallHeight, CELL_SIZE);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx + halfCell, z: wz, hx: 0.65, hz: halfCell });

        for (const s of [-1, 1]) {
          dummy.position.set(wx + halfCell - 0.55, 3.2, wz + s * 4.2);
          dummy.rotation.set(-0.1, s * 0.7, -0.2);
          dummy.scale.set(0.95, 2.5, 1.5);
          dummy.updateMatrix();
          rockCragMatrices.push(dummy.matrix.clone());
        }

        dummy.position.set(wx + halfCell - 0.58, 2.55, wz);
        dummy.rotation.set(0, -Math.PI * 0.5, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plaqueMatrices.push(dummy.matrix.clone());
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx + halfCell, wallCenterY, wz + s * offset);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(wallThick, wallHeight, sideSegLen);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx + halfCell,
            z: wz + s * offset,
            hx: 0.58,
            hz: sideSegLen * 0.5,
          });
        }
        // Solid stone arch lintel over East doorway
        dummy.position.set(wx + halfCell, lintelCenterY, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(wallThick * 1.15, lintelHeight, doorGap + 0.4);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
      }

      // Ceremonial ring of 8 ritual Vajra columns around start, exit, vault, and boss rooms
      if (role === 'boss' || role === 'start' || role === 'exit' || role === 'vault') {
        const vRad = role === 'boss' ? 6.25 : 5.45;
        const vScale = role === 'boss' ? 1.18 : 0.92;
        for (let vc = 0; vc < 8; vc++) {
          // Offset by 22.5 deg (PI/8) so columns never block N/S/E/W doorways!
          const vAng = (vc / 8) * Math.PI * 2 + Math.PI * 0.125;
          dummy.position.set(wx + Math.cos(vAng) * vRad, 0, wz + Math.sin(vAng) * vRad);
          dummy.rotation.set(0, -vAng, 0);
          dummy.scale.set(vScale, vScale, vScale);
          dummy.updateMatrix();
          vajraColumnMatrices.push(dummy.matrix.clone());
        }
      }

      // 4. Room Template Interior Features (only for non-boss rooms so Boss Arena is open)
      if (role !== 'boss') {
        if (template === 'colonnade') {
          for (const [px, pz] of [
            [-3.6, -3.6],
            [3.6, -3.6],
            [-3.6, 3.6],
            [3.6, 3.6],
          ]) {
            dummy.position.set(wx + px, 3.8, wz + pz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(0.85, 1, 0.85);
            dummy.updateMatrix();
            pillarMatrices.push(dummy.matrix.clone());
          }
        } else if (template === 'mandala' || template === 'pool' || template === 'hall' || role === 'vault') {
          dummy.position.set(wx, 0.08, wz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(template === 'pool' ? 1.2 : 1.0, 1, template === 'pool' ? 1.2 : 1.0);
          dummy.updateMatrix();
          decorMatrices.push(dummy.matrix.clone());

          dummy.position.set(wx, 0.045, wz);
          dummy.rotation.set(0, roomIndex * 0.39, 0);
          dummy.scale.set(template === 'mandala' ? 1.25 : 0.95, 1, template === 'mandala' ? 1.25 : 0.95);
          dummy.updateMatrix();
          mandalaMedallionMatrices.push(dummy.matrix.clone());

          // Center radial light pool & subtle overhead cavern light shaft
          dummy.position.set(wx, 0.04, wz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(6.8, 6.8, 1);
          dummy.updateMatrix();
          if (template === 'pool') {
            coolPoolMatrices.push(dummy.matrix.clone());
          } else {
            warmPoolMatrices.push(dummy.matrix.clone());
          }

          if (
            role === 'start' ||
            role === 'exit' ||
            role === 'vault' ||
            template === 'mandala' ||
            template === 'pool'
          ) {
            dummy.position.set(wx, 3.8, wz);
            dummy.rotation.set(0, 0, 0.06);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            lightShaftMatrices.push(dummy.matrix.clone());
          }
        } else if (template === 'corridor') {
          for (const s of [-1, 1]) {
            dummy.position.set(wx + s * 4.8, 3.8, wz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(0.8, 1, 0.8);
            dummy.updateMatrix();
            pillarMatrices.push(dummy.matrix.clone());
          }
        }

        // Mineral Crystal Veins along walls & upper vault ribs (extra dense in 'vein' template rooms)
        const veinCount = template === 'vein' ? 6 : 3;
        for (let v = 0; v < veinCount; v++) {
          const ang = (v / veinCount) * Math.PI * 2 + 0.4;
          const rad = template === 'vein' ? 5.6 : 6.3;
          const vx = wx + Math.cos(ang) * rad;
          const vz = wz + Math.sin(ang) * rad;
          dummy.position.set(vx, 0.85 + (v % 2) * 0.45, vz);
          dummy.rotation.set(0.2 * v, ang, 0.15);
          dummy.scale.set(0.95, 1.95, 0.95);
          dummy.updateMatrix();
          veinMatrices.push(dummy.matrix.clone());

          // Upper ceiling mineral crystal cluster
          dummy.position.set(
            wx + Math.cos(ang + 0.35) * 4.8,
            6.35,
            wz + Math.sin(ang + 0.35) * 4.8,
          );
          dummy.rotation.set(Math.PI + 0.25, ang, 0.2);
          dummy.scale.set(0.85, 1.65, 0.85);
          dummy.updateMatrix();
          veinMatrices.push(dummy.matrix.clone());

          if (v % 2 === 0 || template === 'vein') {
            dummy.position.set(vx, 0.035, vz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(4.6, 4.6, 1);
            dummy.updateMatrix();
            coolPoolMatrices.push(dummy.matrix.clone());
          }
        }
      } else {
        // Boss Room grand mandala centerpiece & dramatic cavern light shaft
        dummy.position.set(wx, 0.06, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1.85, 1, 1.85);
        dummy.updateMatrix();
        decorMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx, 0.05, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1.65, 1, 1.65);
        dummy.updateMatrix();
        mandalaMedallionMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx, 0.04, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(10.5, 10.5, 1);
        dummy.updateMatrix();
        warmPoolMatrices.push(dummy.matrix.clone());

        dummy.position.set(wx, 3.8, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1.45, 1, 1.45);
        dummy.updateMatrix();
        lightShaftMatrices.push(dummy.matrix.clone());
      }
    }

    // Add turquoise floor light pools under Terma Crystal nodes
    for (const c of layout.crystals) {
      dummy.position.set(c.x, 0.04, c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(5.4, 5.4, 1);
      dummy.updateMatrix();
      coolPoolMatrices.push(dummy.matrix.clone());
    }

    function addInstanced(geo, mat, matrices, name, { castShadow = false, receiveShadow = false } = {}) {
      if (matrices.length === 0) return null;
      const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
      inst.name = name;
      inst.castShadow = castShadow;
      inst.receiveShadow = receiveShadow;
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      dungeonGroup.add(inst);
      return inst;
    }

    addInstanced(floorTileGeo, floorTileMat, floorMatrices, 'TermaFloorsInst', { receiveShadow: true });
    addInstanced(wallSegGeo, wallSegMat, wallMatrices, 'TermaWallsInst', { castShadow: true, receiveShadow: true });
    addInstanced(pillarGeo, pillarMat, pillarMatrices, 'TermaPillarsInst', { castShadow: true, receiveShadow: true });
    addInstanced(pillarCapitalGeo, pillarCapitalMat, pillarMatrices, 'TermaPillarCapitalsInst', {
      castShadow: true,
      receiveShadow: true,
    });
    addInstanced(doorArchFrameGeo, doorArchFrameMat, doorArchMatrices, 'TermaDoorJambsInst', {
      castShadow: true,
      receiveShadow: true,
    });
    addInstanced(vajraColumnGeo, vajraColumnMat, vajraColumnMatrices, 'TermaVajraColumnsInst', {
      castShadow: true,
      receiveShadow: true,
    });
    addInstanced(mandalaMedallionGeo, mandalaMedallionMat, mandalaMedallionMatrices, 'TermaMandalaMedallionInst', {
      receiveShadow: true,
    });
    addInstanced(ceilingVaultGeo, ceilingVaultMat, ceilingVaultMatrices, 'TermaCeilingVaultInst', { receiveShadow: true });
    addInstanced(ceilingArchGeo, ceilingArchMat, ceilingArchMatrices, 'TermaCeilingArchInst', { receiveShadow: true });
    addInstanced(rockCragGeo, rockCragMat, rockCragMatrices, 'TermaRockCragsInst', { castShadow: true, receiveShadow: true });
    addInstanced(stalactiteGeo, stalactiteMat, stalactiteMatrices, 'TermaStalactitesInst');
    addInstanced(brazierStandGeo, brazierStandMat, brazierMatrices, 'TermaBraziersInst');
    addInstanced(brazierFlameGeo, brazierFlameMat, flameMatrices, 'TermaBrazierFlamesInst');
    addInstanced(lightPoolGeo, warmPoolMat, warmPoolMatrices, 'TermaWarmPoolsInst');
    addInstanced(lightPoolGeo, coolPoolMat, coolPoolMatrices, 'TermaCoolPoolsInst');
    addInstanced(lightShaftGeo, lightShaftMat, lightShaftMatrices, 'TermaLightShaftsInst');
    addInstanced(plaqueGeo, plaqueMat, plaqueMatrices, 'TermaPlaquesInst');
    addInstanced(veinGeo, veinMat, veinMatrices, 'TermaVeinsInst');
    addInstanced(decorRingGeo, decorRingMat, decorMatrices, 'TermaDecorInst');

    // Drifting Subterranean Prana & Crystal Dust Motes across the rooms
    if (layout.rooms.length > 0) {
      const motePerRoom = 22;
      const moteTotal = layout.rooms.length * motePerRoom;
      const moteGeo = new THREE.BufferGeometry();
      const motePos = new Float32Array(moteTotal * 3);
      const moteCol = new Float32Array(moteTotal * 3);
      const mRng = mulberry32(layout.seed + 777);
      let idx = 0;
      for (const r of layout.rooms) {
        for (let m = 0; m < motePerRoom; m++) {
          motePos[idx * 3 + 0] = r.wx + (mRng() - 0.5) * 13.0;
          motePos[idx * 3 + 1] = 0.6 + mRng() * 5.6;
          motePos[idx * 3 + 2] = r.wz + (mRng() - 0.5) * 13.0;
          const isWarm = m % 2 === 0;
          const mc = isWarm ? biome.warmMote : biome.coolMote;
          moteCol[idx * 3 + 0] = mc[0];
          moteCol[idx * 3 + 1] = mc[1];
          moteCol[idx * 3 + 2] = mc[2];
          idx += 1;
        }
      }
      moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
      moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
      const moteMat = new THREE.PointsMaterial({
        size: 0.16,
        vertexColors: true,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      dustPointsMesh = new THREE.Points(moteGeo, moteMat);
      dustPointsMesh.name = 'TermaCavernDustMotes';
      dungeonGroup.add(dustPointsMesh);
    }

    // 5. Terma Crystal Nodes (`伏藏晶石`, 3–4 per floor)
    for (const c of layout.crystals) {
      const cGroup = new THREE.Group();
      cGroup.name = `TermaCrystal_${c.id}`;
      cGroup.position.set(c.x, 0, c.z);

      const basePedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.8, 0.28, 8),
        crystalBaseMat,
      );
      basePedestal.position.y = 0.14;
      cGroup.add(basePedestal);

      const shardsGroup = new THREE.Group();
      shardsGroup.name = 'Shards';
      for (let s = 0; s < 3; s++) {
        const shard = new THREE.Mesh(crystalShardGeo, crystalShardMat);
        const h = s === 0 ? 1.8 : 1.25;
        shard.scale.set(0.75, h, 0.75);
        shard.position.set((s - 1) * 0.24, 0.55 + (s === 0 ? 0.15 : 0), (s % 2) * 0.14);
        shard.rotation.z = (s - 1) * 0.22;
        shardsGroup.add(shard);
      }
      cGroup.add(shardsGroup);
      cGroup.userData = { shardsGroup, crystal: c };
      dungeonGroup.add(cGroup);
      crystalMeshes.set(c.id, cGroup);

      const posVec = new THREE.Vector3(c.x, 0, c.z);
      addDungeonInteractable({
        id: `terma-crystal-${c.id}`,
        kind: 'termaCrystal',
        zone: 'terma',
        action: 'interact',
        labelKey: 'prompt.termaCrystal',
        radius: 2.8,
        getPosition: () => posVec,
        isAvailable: () => state.zone === 'terma' && !state.uiOpen && !c.broken,
        onInteract: () => breakCrystal(c.index),
      });
    }

    // 6. Exit Room: Gate of Descent (Floors 1 & 2) OR Boss Altar & Multi-Ring Golden Mandala (Floor 3)
    const exit = layout.exitRoom;
    if (layout.floor < 3) {
      gateMeshGroup = new THREE.Group();
      gateMeshGroup.name = 'GateOfDescent';
      gateMeshGroup.position.set(exit.wx, 0, exit.wz);

      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.26, 10, 28, Math.PI),
        pillarCapitalMat,
      );
      arch.position.y = 0.1;

      const dais = new THREE.Mesh(
        new THREE.CylinderGeometry(2.45, 2.75, 0.22, 16),
        pillarMat,
      );
      dais.position.y = 0.11;

      gatePortalMat = new THREE.MeshBasicMaterial({
        color: 0x334155,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24), gatePortalMat);
      portalDisc.position.set(0, 1.2, 0);

      gateRingMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const floorRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.3, 32), gateRingMat);
      floorRing.rotation.x = -Math.PI / 2;
      floorRing.position.y = 0.24;

      gateMeshGroup.add(dais, arch, portalDisc, floorRing);
      dungeonGroup.add(gateMeshGroup);

      const gatePosVec = new THREE.Vector3(exit.wx, 0, exit.wz);
      addDungeonInteractable({
        id: `terma-gate-descent-f${layout.floor}`,
        kind: 'gateOfDescent',
        zone: 'terma',
        action: 'interact',
        labelKey: 'prompt.gateOfDescent',
        getLabel() {
          const pct =
            totalEnemies > 0 ? Math.min(100, Math.floor((liberatedCount / totalEnemies) * 100)) : 100;
          if (gateUnlocked) {
            return i18n.t('prompt.gateOfDescent', { nextFloor: layout.floor + 1 });
          }
          return i18n.t('prompt.gateOfDescentLocked', { pct });
        },
        radius: 3.2,
        getPosition: () => gatePosVec,
        isAvailable: () => state.zone === 'terma' && !state.uiOpen,
        onInteract() {
          if (!gateUnlocked) {
            const pct =
              totalEnemies > 0
                ? Math.min(100, Math.floor((liberatedCount / totalEnemies) * 100))
                : 100;
            bus.emit('toast', {
              text: i18n.t('toast.gateOfDescentLocked', { pct }),
              kind: 'warning',
            });
            return false;
          }
          nextFloor();
          return true;
        },
      });
    } else {
      // Floor 3 Boss Room Multi-Ring Rotating Golden Mandala Centerpiece & Imperial Altar
      const bossCenterGroup = new THREE.Group();
      bossCenterGroup.name = 'TermaBossMandalaCenterpiece';
      bossCenterGroup.position.set(exit.wx, 0, exit.wz);

      bossMandalaOuterRing = new THREE.Group();
      bossMandalaOuterRing.position.y = 0.10;
      const outerWheel = new THREE.Mesh(
        new THREE.TorusGeometry(5.35, 0.14, 10, 48),
        pillarCapitalMat,
      );
      outerWheel.rotation.x = Math.PI * 0.5;
      bossMandalaOuterRing.add(outerWheel);
      for (let sp = 0; sp < 8; sp++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.10, 10.6),
          pillarCapitalMat,
        );
        spoke.rotation.y = (sp / 8) * Math.PI;
        bossMandalaOuterRing.add(spoke);
      }

      bossMandalaInnerRing = new THREE.Group();
      bossMandalaInnerRing.position.y = 0.14;
      const innerWheel = new THREE.Mesh(
        new THREE.TorusGeometry(3.45, 0.12, 10, 36),
        crystalBaseMat,
      );
      innerWheel.rotation.x = Math.PI * 0.5;
      bossMandalaInnerRing.add(innerWheel);

      const altarThrone = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.48, 0.52, 8),
        pillarCapitalMat,
      );
      altarThrone.position.y = 0.26;

      bossAltarLotusCrown = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.46, 0),
        veinMat,
      );
      bossAltarLotusCrown.position.y = 1.28;

      bossCenterGroup.add(
        bossMandalaOuterRing,
        bossMandalaInnerRing,
        altarThrone,
        bossAltarLotusCrown,
      );
      dungeonGroup.add(bossCenterGroup);

      // Floor 3 Boss Altar / Trigger in Boss Room
      const altarPosVec = new THREE.Vector3(exit.wx, 0, exit.wz);
      addDungeonInteractable({
        id: 'terma-boss-altar',
        kind: 'termaAltar',
        zone: 'terma',
        action: 'interact',
        labelKey: 'prompt.termaAltar',
        radius: 4.0,
        getPosition: () => altarPosVec,
        isAvailable: () =>
          state.zone === 'terma' &&
          !state.uiOpen &&
          !bossSubduedOnFloor &&
          !ctx.bosses?.getActiveBoss?.(),
        onInteract() {
          ctx.bosses?.start?.('termaGuardian', { tier: currentTier, seed: baseSeed });
        },
      });
    }

    // 7. Terma Cave Vault Room Reliquary (`古巖伏藏龕`)
    if (layout.vaultRoom) {
      const vr = layout.vaultRoom;
      vaultMeshGroup = new THREE.Group();
      vaultMeshGroup.name = 'AncientTermaVaultReliquary';
      vaultMeshGroup.position.set(vr.wx, 0, vr.wz);

      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.15, 0.45, 10),
        pillarMat,
      );
      ped.position.y = 0.225;

      const casketBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.56, 0.85),
        crystalBaseMat,
      );
      casketBody.position.y = 0.72;

      vaultLidMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.22, 0.2, 0.92),
        pillarMat,
      );
      vaultLidMesh.position.set(0, 1.08, 0);

      vaultCoreMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.3, 0),
        crystalShardMat,
      );
      vaultCoreMesh.position.set(0, 1.5, 0);
      vaultCoreMesh.visible = false;

      vaultRingMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const vRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.0, 32), vaultRingMat);
      vRing.rotation.x = -Math.PI * 0.5;
      vRing.position.y = 0.05;

      const vBeamGeo = new THREE.CylinderGeometry(0.35, 0.65, 5.5, 16, 1, true);
      vBeamGeo.translate(0, 2.75, 0);
      vaultBeamMesh = new THREE.Mesh(
        vBeamGeo,
        new THREE.MeshBasicMaterial({
          color: 0x2dd4bf,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      vaultBeamMesh.visible = false;

      vaultMeshGroup.add(ped, casketBody, vaultLidMesh, vaultCoreMesh, vRing, vaultBeamMesh);
      dungeonGroup.add(vaultMeshGroup);

      const vaultPosVec = new THREE.Vector3(vr.wx, 0, vr.wz);
      addDungeonInteractable({
        id: `terma-vault-reliquary-f${layout.floor}`,
        kind: 'termaVaultReliquary',
        zone: 'terma',
        action: 'interact',
        labelKey: 'prompt.dungeonVault.extract',
        getLabel() {
          if (!vaultUnsealed && vaultGuardIds.size > 0) {
            return i18n.t('prompt.dungeonVault.sealed', { remaining: vaultGuardIds.size });
          }
          return i18n.t('prompt.dungeonVault.extract');
        },
        radius: 3.4,
        getPosition: () => vaultPosVec,
        isAvailable: () => state.zone === 'terma' && !state.uiOpen && !vaultExtracted,
        onInteract() {
          if (!vaultUnsealed && vaultGuardIds.size > 0) {
            bus.emit('toast', {
              text: i18n.t('toast.termaCave.stillGuarded', { remaining: vaultGuardIds.size }),
              kind: 'warning',
            });
            return false;
          }
          extractVaultReliquary();
          return true;
        },
      });
    }
  }

  function setVaultUnsealedVisual(unsealed) {
    vaultUnsealed = Boolean(unsealed);
    if (vaultRingMat) {
      vaultRingMat.color.setHex(vaultUnsealed ? 0xfbbf24 : 0xef4444);
    }
    if (vaultCoreMesh) {
      vaultCoreMesh.visible = vaultUnsealed && !vaultExtracted;
    }
    if (vaultBeamMesh) {
      vaultBeamMesh.visible = vaultUnsealed && !vaultExtracted;
    }
    syncState();
  }

  function extractVaultReliquary() {
    if (vaultExtracted || !floorLayout?.vaultRoom) return null;
    vaultExtracted = true;
    if (vaultLidMesh) {
      vaultLidMesh.rotation.x = -1.0;
      vaultLidMesh.position.set(0, 1.2, -0.3);
    }
    if (vaultCoreMesh) vaultCoreMesh.visible = false;
    if (vaultBeamMesh) vaultBeamMesh.visible = false;
    if (vaultRingMat) vaultRingMat.color.setHex(0x38bdf8);

    const vr = floorLayout.vaultRoom;
    const ilvl = 30 + currentTier;
    const rarity = Math.random() < 0.35 ? 'terma' : 'rare';
    const item = ctx.loot?.drop?.({
      ilvl,
      tier: currentTier,
      rarity,
      inDungeon: true,
      pos: { x: vr.wx, y: 0, z: vr.wz + 1.4 },
    });
    const essence = 1 + Math.floor(currentTier / 4);
    const turq = 28 + currentTier * 10;
    ctx.inventory?.addMaterial?.('termaEssence', essence);
    ctx.loot?.addTurquoise?.(turq);

    bus.emit('sfx', { name: 'levelup' });
    bus.emit('toast', {
      text: i18n.t('toast.dungeonVault.extracted', { essence, turquoise: turq }),
      kind: 'merit',
    });
    bus.emit('dungeon:vaultExtracted', {
      tier: currentTier,
      floor: currentFloor,
      item,
      essence,
      turquoise: turq,
    });
    syncState();
    return { item, essence, turquoise: turq };
  }

  function setGateUnlockedVisual(unlocked) {
    gateUnlocked = Boolean(unlocked);
    if (gatePortalMat && gateRingMat) {
      if (gateUnlocked) {
        gatePortalMat.color.setHex(0x2dd4bf);
        gatePortalMat.opacity = 0.78;
        gateRingMat.color.setHex(0xfbbf24);
        gateRingMat.opacity = 0.92;
      } else {
        gatePortalMat.color.setHex(0x334155);
        gatePortalMat.opacity = 0.45;
        gateRingMat.color.setHex(0x64748b);
        gateRingMat.opacity = 0.65;
      }
    }
    syncState();
  }

  /**
   * Spawns tier-scaled monsters (`level = 30 + tier`, `hpMult = 1 + 0.1 * tier`) and elite packs.
   */
  function spawnFloorEnemies(layout) {
    ctx.enemies?.clear?.();
    floorEnemyIds.clear();
    liberatedEnemyIds.clear();
    totalEnemies = 0;
    liberatedCount = 0;
    gateUnlocked = false;
    vaultGuardIds.clear();
    vaultUnsealed = false;
    vaultExtracted = false;

    const monsterLevel = 30 + currentTier;
    const tierHpMult = Number((1 + 0.1 * currentTier).toFixed(2));
    const partySize = Math.max(1, ctx.coop?.getPartySize?.() || 1);
    const coopHpMult = Number((1 + 0.45 * (partySize - 1)).toFixed(2));
    const rng = mulberry32(layout.seed + 505);

    const combatRooms = layout.rooms.filter(
      (r) => r.role !== 'start' && r.role !== 'boss',
    );

    if (combatRooms.length === 0 || !ctx.enemies?.spawn) {
      setGateUnlockedVisual(true);
      return;
    }

    function applyTierScalingToEnemyId(id) {
      if (!id) return null;
      const list = ctx.enemies?.getActiveEnemies?.() || [];
      const enemy = list.find((e) => e.id === id);
      if (enemy) {
        enemy.level = monsterLevel;
        enemy.tierHpMult = tierHpMult;
        enemy.coopHpMult = coopHpMult;
        enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * tierHpMult * coopHpMult));
        enemy.hp = enemy.maxHp;
        enemy.dungeonFloor = layout.floor;
        enemy.noRespawn = true;
      }
      return enemy;
    }

    // 1. Spawn normal packs across rooms
    for (let i = 0; i < combatRooms.length; i++) {
      const room = combatRooms[i];
      const count = room.role === 'exit' ? 2 : 1 + (i % 2);
      for (let m = 0; m < count; m++) {
        const kind = runMonsters[(i + m) % runMonsters.length];
        const ang = (m / count) * Math.PI * 2 + rng() * 0.8;
        const dist = 2.2 + rng() * 2.0;
        const sx = room.wx + Math.cos(ang) * dist;
        const sz = room.wz + Math.sin(ang) * dist;
        const id = ctx.enemies.spawn(kind, {
          x: sx,
          z: sz,
          level: monsterLevel,
          rank: 'normal',
          noRespawn: true,
          dungeonFloor: layout.floor,
          tags: room.role === 'vault' ? ['termaVaultGuard'] : undefined,
        });
        if (applyTierScalingToEnemyId(id)) {
          floorEnemyIds.add(id);
          if (room.role === 'vault') {
            vaultGuardIds.add(id);
          }
        }
      }
    }

    // 2. Spawn Elite Packs: `1 + Math.floor(tier / 2)` per floor, with up to 3 affixes
    const elitePackCount = 1 + Math.floor(currentTier / 2);
    const affixCount = Math.min(3, 1 + Math.floor(currentTier / 3));

    for (let eIdx = 0; eIdx < elitePackCount; eIdx++) {
      const targetRoom =
        eIdx === 0 && layout.vaultRoom
          ? layout.vaultRoom
          : combatRooms[(eIdx * 2 + 1) % combatRooms.length];
      const kind = runMonsters[(eIdx + 1) % runMonsters.length];
      const rank = eIdx % 2 === 0 ? 'rare' : 'champion';

      // Roll distinct affixes using seeded rng
      const pool = [...ELITE_AFFIX_POOL];
      for (let k = pool.length - 1; k > 0; k--) {
        const j = Math.floor(rng() * (k + 1));
        const tmp = pool[k];
        pool[k] = pool[j];
        pool[j] = tmp;
      }
      const affixes = pool.slice(0, affixCount);

      const ex = targetRoom.wx + (rng() - 0.5) * 3.2;
      const ez = targetRoom.wz + (rng() - 0.5) * 3.2;
      const id = ctx.enemies.spawn(kind, {
        x: ex,
        z: ez,
        level: monsterLevel,
        rank,
        affixes,
        noRespawn: true,
        dungeonFloor: layout.floor,
        tags: targetRoom.role === 'vault' ? ['termaVaultGuard'] : undefined,
      });
      if (applyTierScalingToEnemyId(id)) {
        floorEnemyIds.add(id);
        if (targetRoom.role === 'vault') {
          vaultGuardIds.add(id);
        }
      }
    }

    totalEnemies = floorEnemyIds.size;

    setVaultUnsealedVisual(vaultGuardIds.size === 0);

    if (totalEnemies === 0) {
      setGateUnlockedVisual(true);
    } else {
      setGateUnlockedVisual(false);
    }
    syncState();
  }

  /**
   * Breaks a Terma Crystal node (`伏藏晶石`), dropping Turquoise + 1 item (+ 20% extra rare/terma if `tertonFind`).
   */
  function breakCrystal(indexOrId = 0, opts = {}) {
    if (!floorLayout || !Array.isArray(floorLayout.crystals)) return null;
    const crystal =
      typeof indexOrId === 'string'
        ? floorLayout.crystals.find((c) => c.id === indexOrId)
        : floorLayout.crystals[Number(indexOrId) || 0] ||
          floorLayout.crystals.find((c) => !c.broken);

    if (!crystal || crystal.broken) return null;
    crystal.broken = true;

    if (!opts.fromCoop && ctx.coop?.getState?.()?.active) {
      ctx.coop.broadcastEvent('crystal:broken', { id: crystal.id });
    }

    const meshGrp = crystalMeshes.get(crystal.id);
    if (meshGrp && meshGrp.userData?.shardsGroup) {
      meshGrp.userData.shardsGroup.visible = false;
    }

    const ilvl = 30 + currentTier;
    const partySize = Math.max(1, ctx.coop?.getPartySize?.() || 1);
    const partyFindChance = 0.25 * (partySize - 1);
    const turq = Math.round((12 + currentTier * 4) * (1 + partyFindChance));
    ctx.loot?.addTurquoise?.(turq);

    const droppedItems = [];
    const baseItem = ctx.loot?.drop?.({
      ilvl,
      tier: currentTier,
      inDungeon: true,
    });
    if (baseItem) droppedItems.push(baseItem);

    // Co-op Party Find Bonus (+25% per extra party member)
    if (partyFindChance > 0 && Math.random() < partyFindChance) {
      const coopBonusItem = ctx.loot?.drop?.({
        ilvl,
        tier: currentTier,
        inDungeon: true,
      });
      if (coopBonusItem) droppedItems.push(coopBonusItem);
    }

    // Check `tertonFind` (伏藏師之戒): 20% chance to drop an extra rare/terma item
    let tertonProc = false;
    const hasTertonFind = Boolean(ctx.powers?.has?.('tertonFind'));
    if (hasTertonFind) {
      const roll = opts.forceTertonProc ? 0.0 : Math.random();
      if (roll < 0.20) {
        tertonProc = true;
        const extraRarity = Math.random() < 0.25 ? 'terma' : 'rare';
        const extraItem = ctx.loot?.drop?.({
          ilvl,
          tier: currentTier,
          rarity: extraRarity,
          inDungeon: true,
        });
        if (extraItem) droppedItems.push(extraItem);
        bus.emit('power:tertonFind', { tier: currentTier, item: extraItem });
        bus.emit('toast', { text: i18n.t('toast.tertonFindProc'), kind: 'merit' });
      }
    }

    bus.emit('sfx', { name: 'bell' });
    bus.emit('toast', {
      text: i18n.t('toast.termaCrystalBroken', { turquoise: turq }),
      kind: 'merit',
    });
    bus.emit('dungeon:crystalBroken', {
      id: crystal.id,
      index: crystal.index,
      tier: currentTier,
      tertonProc,
      items: droppedItems,
    });

    syncState();
    return {
      crystalId: crystal.id,
      turquoise: turq,
      tertonProc,
      items: droppedItems,
    };
  }

  function breakAllCrystals(opts = {}) {
    if (!floorLayout?.crystals) return [];
    const results = [];
    for (let i = 0; i < floorLayout.crystals.length; i++) {
      if (!floorLayout.crystals[i].broken) {
        const res = breakCrystal(i, opts);
        if (res) results.push(res);
      }
    }
    return results;
  }

  /**
   * Builds and loads a specific floor (1, 2, or 3) of the current run.
   */
  function loadFloor(floorNum, opts = {}) {
    currentFloor = Math.max(1, Math.min(3, Math.floor(Number(floorNum) || 1)));
    const floorSeedOffset = currentFloor === 1 ? 0 : currentFloor === 2 ? 1009 : 2017;
    const fSeed = (Number(baseSeed) || 123) + floorSeedOffset;

    if (!opts.fromCoop && currentFloor > 1 && ctx.coop?.getState?.()?.active) {
      ctx.coop.broadcastEvent('terma:floor', { floor: currentFloor });
    }

    bossSubduedOnFloor = false;
    chestOpened = false;

    // Reset active boss if any before generating floor
    ctx.bosses?.reset?.();

    floorLayout = generateFloorLayout(fSeed, currentFloor);
    syncState();
    buildFloorScene(floorLayout);

    // Move player to Start Room center
    const startX = floorLayout.startRoom.wx;
    const startZ = floorLayout.startRoom.wz;
    if (state.player?.position) {
      state.player.position.set(startX, 0, startZ);
      state.player.velocity?.set(0, 0, 0);
    }

    // Spawn floor enemies
    spawnFloorEnemies(floorLayout);

    // On Floor 3, position Terma Guardian in the Boss Room (`exitRoom`)
    if (currentFloor === 3) {
      const bossInst = ctx.bosses?.get?.('termaGuardian');
      const bState = bossInst?.getInternalState?.();
      if (bState) {
        bState.subdued = false;
        bState.arena.x = floorLayout.exitRoom.wx;
        bState.arena.z = floorLayout.exitRoom.wz;
        bState.arena.r = 13.5;
        bState.setPosition(floorLayout.exitRoom.wx, floorLayout.exitRoom.wz);
      }
    }

    updateHud();
    bus.emit('dungeon:floorLoaded', {
      tier: currentTier,
      floor: currentFloor,
      seed: baseSeed,
      floorSeed: fSeed,
      roomCount: floorLayout.rooms.length,
    });
    bus.emit('toast', {
      text: i18n.t('toast.termaFloorEntered', {
        tier: currentTier,
        floor: currentFloor,
        seed: baseSeed,
      }),
      kind: 'info',
    });

    return getState();
  }

  /**
   * Enters the Terma Realm at the specified `tier` and optional `seed`.
   */
  function enter(tier = 1, seed = undefined, opts = {}) {
    closeTierSelect();
    const maxAllowed = Math.max(1, highestClearedTier + 1);
    const reqTier = Math.max(1, Math.floor(Number(tier) || 1));
    currentTier = reqTier;
    baseSeed =
      seed !== undefined && seed !== null && seed !== ''
        ? Math.floor(Number(seed)) || 123
        : Math.floor(Math.random() * 899999) + 100000;

    // Pick 3 monster kinds for this run using baseSeed
    const rng = mulberry32(baseSeed + 303);
    const pool = [...DUNGEON_MONSTER_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    runMonsters = pool.slice(0, 3);

    active = true;
    runStartElapsed = state.elapsed || 0;

    if (!opts.fromCoop && ctx.coop?.getState?.()?.active) {
      ctx.coop.broadcastEvent('terma:entered', {
        tier: currentTier,
        seed: baseSeed,
        floor: 1,
      });
    }

    // Switch zone to 'terma' synchronously and load Floor 1 immediately so callers
    // inspecting state/enemies right after `enter(tier, seed)` see everything ready!
    state.zone = 'terma';
    state.zoneType = 'dungeon';
    if (ctx.zones?.teleport) {
      ctx.zones.teleport('terma', {
        skipFade: true,
        silent: true,
        spawn: {
          x: TERMA_ORIGIN.x,
          z: TERMA_ORIGIN.z,
          heading: 0,
        },
      });
    }

    const result = loadFloor(1, opts);
    // Re-ensure player position at Start Room after teleport promise
    if (floorLayout?.startRoom && state.player?.position) {
      state.player.position.set(floorLayout.startRoom.wx, 0, floorLayout.startRoom.wz);
    }

    bus.emit('dungeon:entered', {
      tier: currentTier,
      seed: baseSeed,
      maxAllowed,
      monsters: runMonsters,
    });
    return result;
  }

  /**
   * Advances to the next floor (Floor 1 -> 2, Floor 2 -> 3).
   */
  function nextFloor() {
    if (!active) {
      enter(currentTier, baseSeed);
    }
    if (currentFloor >= 3) {
      return getState();
    }
    return loadFloor(currentFloor + 1);
  }

  let lastBossSubduedTier = 1;
  let lastBossTimeBonus = true;

  /**
   * Called when `termaGuardian` is subdued on Floor 3:
   * Spawns the interactive Terma Chest (`伏藏匣`) & Return Gate to `chimphu`,
   * updates `highestClearedTier`, and emits `terma:cleared`.
   */
  function onBossSubdued(bossState) {
    bossSubduedOnFloor = true;
    const tier = Math.max(currentTier, bossState?.tier || 1);
    const elapsedSec = Math.max(0, Math.round((state.elapsed || 0) - runStartElapsed));
    const timeBonus = elapsedSec <= 600;
    lastBossSubduedTier = tier;
    lastBossTimeBonus = timeBonus;

    if (tier > highestClearedTier) {
      highestClearedTier = tier;
      saveDungeon();
    }

    const center = floorLayout?.exitRoom
      ? { x: floorLayout.exitRoom.wx, z: floorLayout.exitRoom.wz }
      : { x: bossState?.pos?.x || TERMA_ORIGIN.x, z: bossState?.pos?.z || TERMA_ORIGIN.z };

    // Spawn 3D Terma Chest (`伏藏匣`) & Return Gate (`回返之門`)
    spawnTermaChestAndReturnGate(center.x, center.z);

    bus.emit('terma:cleared', {
      tier,
      highestClearedTier,
      elapsedSec,
      timeBonus,
    });
    bus.emit('toast', {
      text: i18n.t('toast.termaCleared', { nextTier: highestClearedTier + 1 }),
      kind: 'merit',
    });

    syncState();
    updateHud();
  }

  function spawnTermaChestAndReturnGate(cx, cz) {
    if (!chestMeshGroup) {
      chestMeshGroup = new THREE.Group();
      chestMeshGroup.name = 'TermaTreasureChest';
      chestMeshGroup.position.set(cx, 0, cz + 2.4);

      const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.72, 0.95), pillarMat);
      box.position.y = 0.36;
      chestLidMesh = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.24, 1.02), crystalBaseMat);
      chestLidMesh.position.set(0, 0.82, 0);
      const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), crystalShardMat);
      coreGem.position.set(0, 1.25, 0);

      const beamGeo = new THREE.CylinderGeometry(0.4, 0.75, 6.0, 16, 1, true);
      beamGeo.translate(0, 3.0, 0);
      chestBeamMesh = new THREE.Mesh(
        beamGeo,
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );

      chestMeshGroup.add(box, chestLidMesh, coreGem, chestBeamMesh);
      dungeonGroup.add(chestMeshGroup);

      const chestPos = new THREE.Vector3(cx, 0, cz + 2.4);
      addDungeonInteractable({
        id: 'terma-boss-chest',
        kind: 'termaBossChest',
        zone: 'terma',
        action: 'interact',
        labelKey: 'prompt.termaBossChest',
        radius: 3.5,
        getPosition: () => chestPos,
        isAvailable: () => state.zone === 'terma' && !state.uiOpen && !chestOpened,
        onInteract() {
          openTermaChest(lastBossSubduedTier, lastBossTimeBonus);
          return true;
        },
      });
    }

    if (!returnGateGroup) {
      returnGateGroup = new THREE.Group();
      returnGateGroup.name = 'TermaReturnGate';
      returnGateGroup.position.set(cx, 0, cz - 4.2);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.16, 10, 28),
        crystalShardMat,
      );
      ring.position.y = 1.8;
      returnGateGroup.add(ring);
      dungeonGroup.add(returnGateGroup);

      const retPos = new THREE.Vector3(cx, 0, cz - 4.2);
      addDungeonInteractable({
        id: 'terma-return-gate',
        kind: 'termaReturnGate',
        zone: 'terma',
        action: 'interact',
        labelKey: 'prompt.termaReturnGate',
        radius: 3.2,
        getPosition: () => retPos,
        isAvailable: () => state.zone === 'terma' && !state.uiOpen,
        onInteract: () => exitToChimphu(),
      });
    }
  }

  function openTermaChest(tier = lastBossSubduedTier || currentTier, timeBonus = lastBossTimeBonus) {
    if (chestOpened) return null;
    chestOpened = true;

    if (chestLidMesh) {
      chestLidMesh.rotation.x = -1.05;
      chestLidMesh.position.set(0, 0.96, -0.35);
    }
    if (chestBeamMesh) {
      chestBeamMesh.visible = false;
    }

    const dropPos = chestMeshGroup
      ? { x: chestMeshGroup.position.x, y: 0, z: chestMeshGroup.position.z + 1.2 }
      : undefined;

    const ilvl = 30 + tier;
    const rng = mulberry32(baseSeed + tier * 97 + 999);
    const partySize = Math.max(1, ctx.coop?.getPartySize?.() || 1);
    const partyFindChance = 0.25 * (partySize - 1);
    const extraPartyDrops = partySize > 1 ? Math.floor(partyFindChance + rng()) : 0;
    const dropCount = 4 + Math.floor(rng() * 3) + extraPartyDrops; // 4..6 items (+ party find bonus)

    const items = [];
    for (let i = 0; i < dropCount; i++) {
      const forcedRarity = i === 0 ? (rng() < 0.45 ? 'terma' : 'rare') : undefined;
      const it = ctx.loot?.drop?.({
        ilvl,
        tier,
        rarity: forcedRarity,
        rank: 'boss',
        inDungeon: true,
        pos: dropPos,
      });
      if (it) items.push(it);
    }

    // Grant Terma Essence (`伏藏精華`) & Turquoise (+ party find bonus)
    const essenceCount = 1 + Math.floor(tier / 3);
    ctx.inventory?.addMaterial?.('termaEssence', essenceCount);
    ctx.loot?.addTurquoise?.(Math.round((60 + tier * 25) * (1 + partyFindChance)));
    bus.emit('sfx', { name: 'levelup' });
    bus.emit('toast', {
      text: i18n.t('toast.termaEssenceGained', { count: essenceCount }),
      kind: 'merit',
    });

    // 10-minute Speed Bonus: 2 extra items (at least 1 rare/terma) + bonus Turquoise
    if (timeBonus) {
      const s1 = ctx.loot?.drop?.({
        ilvl,
        tier,
        rarity: 'rare',
        rank: 'boss',
        inDungeon: true,
        pos: dropPos,
      });
      const s2 = ctx.loot?.drop?.({
        ilvl,
        tier,
        rank: 'boss',
        inDungeon: true,
        pos: dropPos,
      });
      if (s1) items.push(s1);
      if (s2) items.push(s2);
      ctx.loot?.addTurquoise?.(40 + tier * 15);
      bus.emit('toast', {
        text: i18n.t('toast.termaSpeedBonus'),
        kind: 'merit',
      });
    }
    bus.emit('dungeon:chestOpened', { tier, essenceCount, items });
    syncState();
    return { tier, essenceCount, items };
  }

  function exitToChimphu() {
    if (bossSubduedOnFloor && !chestOpened) {
      openTermaChest(lastBossSubduedTier, lastBossTimeBonus);
    }
    active = false;
    clearFloorEntities();
    ctx.enemies?.clear?.();
    ctx.bosses?.reset?.();
    syncState();
    updateHud();

    if (ctx.zones?.teleport) {
      ctx.zones.teleport('chimphu', { spawn: 'from-terma' });
    } else {
      state.zone = 'chimphu';
      state.player?.position?.set(6000, 0, -28);
    }
    return true;
  }

  /**
   * Called by `src/systems/vitals.js` when player faints inside `terma`.
   * Teleports player to `chimphu`, resets dungeon run, and preserves all inventory items.
   */
  function onPlayerFaint() {
    active = false;
    clearFloorEntities();
    ctx.enemies?.clear?.();
    ctx.bosses?.reset?.();
    syncState();
    updateHud();

    if (ctx.zones?.teleport) {
      ctx.zones.teleport('chimphu', { spawn: 'from-terma', skipFade: true });
    } else {
      state.zone = 'chimphu';
      state.player?.position?.set(6000, 0, -28);
    }
    bus.emit('toast', { text: i18n.t('toast.termaFainted'), kind: 'warning' });
    return true;
  }

  // ---------------------------------------------------------------- Event Listeners
  bus.on('enemy:liberated', (payload) => {
    if (state.zone !== 'terma' || !active) return;

    if (payload?.id && vaultGuardIds.has(payload.id)) {
      vaultGuardIds.delete(payload.id);
      if (vaultGuardIds.size === 0 && !vaultUnsealed) {
        setVaultUnsealedVisual(true);
        bus.emit('sfx', { name: 'bell' });
        bus.emit('toast', {
          text: i18n.t('toast.dungeonVault.unsealed'),
          kind: 'merit',
        });
      }
    }

    if (payload?.isSplitMinion) {
      return;
    }

    if (payload?.id != null) {
      if (liberatedEnemyIds.has(payload.id)) {
        return;
      }
      if (floorEnemyIds.size > 0) {
        if (!floorEnemyIds.has(payload.id)) {
          return;
        }
        liberatedEnemyIds.add(payload.id);
        liberatedCount = Math.min(totalEnemies, liberatedEnemyIds.size);
      } else {
        liberatedEnemyIds.add(payload.id);
        liberatedCount = Math.min(totalEnemies, liberatedCount + 1);
      }
    } else {
      liberatedCount = Math.min(totalEnemies, liberatedCount + 1);
    }

    const ratio = totalEnemies > 0 ? liberatedCount / totalEnemies : 1;
    if (!gateUnlocked && ratio >= 0.70) {
      setGateUnlockedVisual(true);
      if (currentFloor < 3) {
        bus.emit('sfx', { name: 'bowl' });
        bus.emit('toast', {
          text: i18n.t('toast.gateOfDescentUnlocked'),
          kind: 'merit',
        });
      }
    } else {
      syncState();
    }
    updateHud();
  });

  // Allow Mantra or Skills cast near a Terma Crystal node to shatter it
  function checkSkillBreakCrystals(origin, radius = 4.5) {
    if (state.zone !== 'terma' || !floorLayout?.crystals || !origin) return;
    for (const c of floorLayout.crystals) {
      if (c.broken) continue;
      const dist = Math.hypot((origin.x ?? 0) - c.x, (origin.z ?? 0) - c.z);
      if (dist <= radius) {
        breakCrystal(c.index);
      }
    }
  }

  bus.on('mantra:cast', ({ origin, radius }) => {
    checkSkillBreakCrystals(origin || state.player?.position, (radius || 6) + 1.0);
  });

  bus.on('skill:cast', ({ origin }) => {
    checkSkillBreakCrystals(origin || state.player?.position, 4.2);
  });

  bus.on('dungeon:openTierSelect', () => {
    openTierSelect();
  });

  // ---------------------------------------------------------------- HUD & Tier Selector Modal UI
  let hudEl = null;
  let modalEl = null;
  let tierSelectOpen = false;
  let selectedModalTier = 1;

  function ensureDungeonHud() {
    if (hudEl || typeof document === 'undefined') return;
    hudEl = document.createElement('div');
    hudEl.id = 'terma-dungeon-hud';
    hudEl.style.cssText = [
      'position:fixed',
      'top:74px',
      'right:18px',
      'z-index:25',
      'min-width:230px',
      'padding:10px 14px',
      'border-radius:10px',
      'background:rgba(15, 13, 28, 0.86)',
      'border:1px solid rgba(45, 212, 191, 0.45)',
      'box-shadow:0 6px 20px rgba(0,0,0,0.45)',
      'color:#f8fafc',
      'font-family:"Noto Serif TC", system-ui, sans-serif',
      'font-size:13px',
      'line-height:1.5',
      'pointer-events:none',
      'display:none',
    ].join(';');
    (document.getElementById('ui') || document.body).appendChild(hudEl);
  }

  function updateHud() {
    ensureDungeonHud();
    if (!hudEl) return;
    if (state.zone !== 'terma' || !active) {
      hudEl.style.display = 'none';
      return;
    }
    hudEl.style.display = 'block';
    const pct =
      totalEnemies > 0 ? Math.min(100, Math.floor((liberatedCount / totalEnemies) * 100)) : 100;
    const header = i18n.t('dungeon.hud.header', { tier: currentTier, floor: currentFloor });
    const progress =
      currentFloor < 3
        ? i18n.t('dungeon.hud.progress', {
            liberated: liberatedCount,
            total: totalEnemies,
            pct,
          })
        : i18n.t('dungeon.hud.bossFloor');
    const statusBadge =
      currentFloor < 3 && gateUnlocked
        ? `<div style="color:#5eead4;font-weight:700;margin-top:2px;">✦ ${i18n.t('dungeon.hud.gateUnlocked')}</div>`
        : '';

    hudEl.innerHTML = `
      <div style="color:#fde68a;font-weight:700;font-size:14px;">${header}</div>
      <div style="color:#cbd5e1;">${progress}</div>
      <div style="color:#94a3b8;font-size:11px;">Seed: ${baseSeed} · Lv.${30 + currentTier} (×${(1 + 0.1 * currentTier).toFixed(1)} HP)</div>
      ${statusBadge}
    `;
  }

  function ensureTierModal() {
    if (modalEl || typeof document === 'undefined') return;
    modalEl = document.createElement('div');
    modalEl.id = 'terma-tier-modal';
    modalEl.className = 'is-hidden';
    modalEl.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:120',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:rgba(8, 10, 18, 0.78)',
      'backdrop-filter:blur(6px)',
      'font-family:"Noto Serif TC", system-ui, sans-serif',
      'color:#f8fafc',
    ].join(';');
    document.body.appendChild(modalEl);
  }

  function renderTierModal() {
    ensureTierModal();
    if (!modalEl) return;
    const maxTier = Math.max(1, highestClearedTier + 1);
    if (selectedModalTier > maxTier) selectedModalTier = maxTier;

    const lv = 30 + selectedModalTier;
    const partySize = Math.max(1, ctx.coop?.getPartySize?.() || 1);
    const coopHpMult = 1 + 0.45 * (partySize - 1);
    const partyFindBonus = (partySize - 1) * 25;
    const hpMult = ((1 + 0.1 * selectedModalTier) * coopHpMult).toFixed(2);
    const elites = 1 + Math.floor(selectedModalTier / 2);
    const affixes = Math.min(3, 1 + Math.floor(selectedModalTier / 3));
    const bossAffixes = Math.min(3, Math.floor(selectedModalTier / 3));
    const termaBonus = (0.3 * selectedModalTier + partyFindBonus).toFixed(1);

    const tierButtons = [];
    const displayMax = Math.max(5, maxTier);
    for (let t = 1; t <= displayMax; t++) {
      const unlocked = t <= maxTier;
      const isSel = t === selectedModalTier;
      tierButtons.push(`
        <button
          type="button"
          data-tier-btn="${t}"
          ${unlocked ? '' : 'disabled'}
          style="
            padding:8px 14px;
            border-radius:8px;
            border:1px solid ${isSel ? '#2dd4bf' : unlocked ? 'rgba(251,191,36,0.45)' : 'rgba(100,116,139,0.3)'};
            background:${isSel ? 'rgba(20, 184, 166, 0.28)' : unlocked ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.45)'};
            color:${unlocked ? '#f8fafc' : '#64748b'};
            font-weight:${isSel ? '700' : '500'};
            cursor:${unlocked ? 'pointer' : 'not-allowed'};
          "
        >Tier ${t} ${unlocked ? '' : '🔒'}</button>
      `);
    }

    modalEl.innerHTML = `
      <div style="
        width:min(540px, 92vw);
        padding:24px 28px;
        border-radius:14px;
        background:linear-gradient(165deg, rgba(17, 24, 39, 0.96), rgba(15, 18, 34, 0.98));
        border:1px solid rgba(251, 191, 36, 0.55);
        box-shadow:0 20px 50px rgba(0,0,0,0.7);
      ">
        <div style="color:#5eead4;font-size:13px;letter-spacing:0.08em;">ཨོཾ་ཨཱཿ་ཧཱུྃ · གཏེར་མ</div>
        <h2 style="margin:4px 0 8px;color:#fde68a;font-size:22px;">${i18n.t('dungeon.ui.title')}</h2>
        <p style="margin:0 0 12px;color:#cbd5e1;font-size:13px;">${i18n.t('dungeon.ui.subtitle', { maxTier })}</p>
        <div style="margin-bottom:12px;color:#fbbf24;font-size:13px;">
          ${i18n.t('dungeon.ui.highestCleared', { tier: highestClearedTier })}
        </div>

        <!-- Co-op Party Status Banner -->
        <div id="terma-coop-banner" style="
          padding:10px 12px;
          border-radius:10px;
          background:rgba(20, 184, 166, 0.14);
          border:1px solid rgba(45, 212, 191, 0.45);
          margin-bottom:14px;
          font-size:12.5px;
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <strong style="color:#5eead4;">
              ${i18n.t('dungeon.coop.bannerTitle', { size: partySize })}
            </strong>
            <div style="display:flex;gap:6px;">
              <button
                type="button"
                id="terma-summon-ai-btn"
                style="
                  padding:4px 9px;
                  border-radius:6px;
                  border:1px solid rgba(251,191,36,0.55);
                  background:rgba(217,119,6,0.28);
                  color:#fef08a;
                  font-size:11.5px;
                  font-weight:600;
                  cursor:pointer;
                "
              >${i18n.t('dungeon.coop.summonAiBtn')}</button>
              <button
                type="button"
                id="terma-open-coop-btn"
                style="
                  padding:4px 9px;
                  border-radius:6px;
                  border:1px solid rgba(45,212,191,0.55);
                  background:rgba(15,118,110,0.35);
                  color:#f0fdfa;
                  font-size:11.5px;
                  font-weight:600;
                  cursor:pointer;
                "
              >${i18n.t('dungeon.coop.openLobbyBtn')}</button>
            </div>
          </div>
          <div style="color:#e2e8f0;margin-top:4px;font-size:11.5px;">
            ${
              partySize > 1
                ? i18n.t('dungeon.coop.stats', {
                    hpMult: coopHpMult.toFixed(2),
                    findBonus: partyFindBonus,
                  })
                : i18n.t('dungeon.coop.soloHint')
            }
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
          ${tierButtons.join('')}
        </div>
        <div style="
          padding:12px 14px;
          border-radius:10px;
          background:rgba(15, 23, 42, 0.75);
          border:1px solid rgba(45, 212, 191, 0.3);
          margin-bottom:16px;
          font-size:13px;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:6px 12px;
        ">
          <div>• ${i18n.t('dungeon.ui.monsterLevel', { level: lv })}</div>
          <div>• ${i18n.t('dungeon.ui.hpScale', { mult: hpMult })}</div>
          <div>• ${i18n.t('dungeon.ui.eliteCount', { elites, affixes })}</div>
          <div>• ${i18n.t('dungeon.ui.termaRate', { bonus: termaBonus })}</div>
          <div>• ${i18n.t('dungeon.ui.bossAffixes', { count: bossAffixes })}</div>
        </div>
        <div style="margin-bottom:18px;">
          <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:4px;">
            ${i18n.t('dungeon.ui.seedLabel')}
          </label>
          <input
            id="terma-seed-input"
            type="text"
            placeholder="${i18n.t('dungeon.ui.seedPlaceholder')}"
            style="
              width:100%;
              padding:8px 10px;
              border-radius:6px;
              border:1px solid rgba(148,163,184,0.4);
              background:rgba(15,23,42,0.9);
              color:#f8fafc;
              font-size:13px;
            "
          />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button
            type="button"
            id="terma-cancel-btn"
            style="
              padding:9px 16px;
              border-radius:8px;
              border:1px solid rgba(148,163,184,0.4);
              background:rgba(30,41,59,0.8);
              color:#e2e8f0;
              cursor:pointer;
            "
          >${i18n.t('dungeon.ui.closeBtn')}</button>
          <button
            type="button"
            id="terma-enter-btn"
            style="
              padding:9px 20px;
              border-radius:8px;
              border:1px solid #fbbf24;
              background:linear-gradient(135deg, #0d9488, #0f766e);
              color:#fef08a;
              font-weight:700;
              cursor:pointer;
            "
          >${i18n.t('dungeon.ui.enterBtn')} (Tier ${selectedModalTier})</button>
        </div>
      </div>
    `;

    modalEl.querySelector('#terma-summon-ai-btn')?.addEventListener('click', () => {
      ctx.coop?.addAiCompanion?.();
      renderTierModal();
    });

    modalEl.querySelector('#terma-open-coop-btn')?.addEventListener('click', () => {
      closeTierSelect();
      ctx.coopLobbyUi?.open?.();
    });

    modalEl.querySelectorAll('[data-tier-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = Number(btn.getAttribute('data-tier-btn'));
        if (t >= 1 && t <= maxTier) {
          selectedModalTier = t;
          renderTierModal();
        }
      });
    });

    modalEl.querySelector('#terma-cancel-btn')?.addEventListener('click', () => {
      closeTierSelect();
    });

    modalEl.querySelector('#terma-enter-btn')?.addEventListener('click', () => {
      const rawSeed = modalEl.querySelector('#terma-seed-input')?.value?.trim();
      const parsedSeed = rawSeed ? Number(rawSeed) : undefined;
      enter(selectedModalTier, parsedSeed);
    });
  }

  function openTierSelect(defaultTier) {
    ensureTierModal();
    if (!modalEl) return false;
    const maxTier = Math.max(1, highestClearedTier + 1);
    selectedModalTier =
      defaultTier != null
        ? Math.max(1, Math.min(maxTier, Number(defaultTier) || 1))
        : maxTier;
    tierSelectOpen = true;
    state.uiOpen = true;
    modalEl.classList.remove('is-hidden');
    modalEl.style.display = 'flex';
    renderTierModal();
    bus.emit('dungeon:tierSelectOpened', { maxTier, highestClearedTier });
    return true;
  }

  function closeTierSelect() {
    if (!tierSelectOpen || !modalEl) return false;
    tierSelectOpen = false;
    modalEl.classList.add('is-hidden');
    modalEl.style.display = 'none';
    state.uiOpen = false;
    return true;
  }

  /**
   * Toggles full dungeon layout visualization on the minimap (`__stupa.dungeon.showLayout(true)`).
   */
  function showLayout(bool = true) {
    showLayoutFlag = Boolean(bool);
    syncState();
    ctx.minimap?.render?.();
    return showLayoutFlag;
  }

  function unlockGate() {
    setGateUnlockedVisual(true);
    return true;
  }

  function getState() {
    syncState();
    return { ...state.dungeon };
  }

  /**
   * Clamps a world position `(pos.x, pos.z)` so it remains strictly inside the
   * walkable interior of the current floor's rooms and open doorway corridors.
   * Prevents knockbacks, dashes, or corner squeezes from ever pushing entities outside walls.
   */
  function clampPosition(pos, radius = 0.35) {
    if (!active || !floorLayout?.rooms?.length || !pos) return pos;
    const innerHalf = Math.max(1.0, CELL_SIZE / 2 - 0.55 - radius);
    const doorHalf = Math.max(0.5, DOOR_WIDTH / 2 - radius);
    const activeBoss = state.boss?.active;
    const lockBossRoom =
      Boolean(getDifficulty(ctx).bossArenaLock) &&
      currentFloor === 3 &&
      activeBoss &&
      activeBoss.id === 'termaGuardian' &&
      !activeBoss.dead &&
      floorLayout.exitRoom;

    if (lockBossRoom) {
      const er = floorLayout.exitRoom;
      if (
        Math.abs(pos.x - er.wx) <= CELL_SIZE * 0.85 &&
        Math.abs(pos.z - er.wz) <= CELL_SIZE * 0.85
      ) {
        pos.x = Math.max(er.wx - innerHalf, Math.min(er.wx + innerHalf, pos.x));
        pos.z = Math.max(er.wz - innerHalf, Math.min(er.wz + innerHalf, pos.z));
        return pos;
      }
    }

    let bestX = pos.x;
    let bestZ = pos.z;
    let minDistSq = Infinity;

    function testBox(minX, maxX, minZ, maxZ) {
      const cx = Math.max(minX, Math.min(maxX, pos.x));
      const cz = Math.max(minZ, Math.min(maxZ, pos.z));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < minDistSq) {
        minDistSq = d2;
        bestX = cx;
        bestZ = cz;
      }
    }

    for (let i = 0; i < floorLayout.rooms.length; i++) {
      const r = floorLayout.rooms[i];
      testBox(r.wx - innerHalf, r.wx + innerHalf, r.wz - innerHalf, r.wz + innerHalf);
      if (minDistSq === 0) return pos;

      if (r.doors?.N) {
        testBox(r.wx - doorHalf, r.wx + doorHalf, r.wz - 8.6, r.wz - innerHalf + 0.2);
      }
      if (r.doors?.S) {
        testBox(r.wx - doorHalf, r.wx + doorHalf, r.wz + innerHalf - 0.2, r.wz + 8.6);
      }
      if (r.doors?.W) {
        testBox(r.wx - 8.6, r.wx - innerHalf + 0.2, r.wz - doorHalf, r.wz + doorHalf);
      }
      if (r.doors?.E) {
        testBox(r.wx + innerHalf - 0.2, r.wx + 8.6, r.wz - doorHalf, r.wz + doorHalf);
      }
      if (minDistSq === 0) return pos;
    }

    if (minDistSq > 0 && minDistSq < Infinity) {
      pos.x = bestX;
      pos.z = bestZ;
    }
    return pos;
  }

  function update(dt) {
    if (tierSelectOpen && ctx.input?.pressed?.('closeUi')) {
      closeTierSelect();
    }
    const inTerma = state.zone === 'terma';
    if (dungeonGroup.visible !== inTerma) {
      dungeonGroup.visible = inTerma;
    }
    if (!inTerma) {
      if (hudEl && hudEl.style.display !== 'none') {
        hudEl.style.display = 'none';
      }
      return;
    }
    if (!active) {
      enter(1);
    }

    // Animate crystals, butter-lamp light pools & portals
    const elapsed = state.elapsed || 0;
    warmPoolMat.opacity = 0.72 + Math.sin(elapsed * 5.2) * 0.08 + Math.cos(elapsed * 8.7) * 0.04;
    coolPoolMat.opacity = 0.66 + Math.sin(elapsed * 2.4) * 0.10;
    lightShaftMat.opacity = 0.11 + Math.sin(elapsed * 1.6) * 0.03;
    if (dustPointsMesh) {
      dustPointsMesh.position.y = Math.sin(elapsed * 0.9) * 0.22;
    }

    for (const cGrp of crystalMeshes.values()) {
      const shards = cGrp.userData?.shardsGroup;
      if (shards && shards.visible) {
        shards.position.y = Math.sin(elapsed * 2.8 + cGrp.position.x) * 0.06;
        shards.rotation.y = elapsed * 0.6;
      }
    }
    if (gateMeshGroup && gateRingMat) {
      gateRingMat.opacity = gateUnlocked
        ? 0.72 + Math.sin(elapsed * 3.5) * 0.2
        : 0.45 + Math.sin(elapsed * 1.8) * 0.1;
    }
    if (vaultCoreMesh && vaultCoreMesh.visible) {
      vaultCoreMesh.rotation.y = elapsed * 1.8;
      vaultCoreMesh.position.y = 1.5 + Math.sin(elapsed * 3.0) * 0.1;
    }
    if (bossMandalaOuterRing) {
      bossMandalaOuterRing.rotation.y = elapsed * 0.25;
    }
    if (bossMandalaInnerRing) {
      bossMandalaInnerRing.rotation.y = -elapsed * 0.42;
    }
    if (bossAltarLotusCrown) {
      bossAltarLotusCrown.rotation.y = elapsed * 1.1;
      bossAltarLotusCrown.position.y = 1.28 + Math.sin(elapsed * 2.4) * 0.12;
      bossAltarLotusCrown.visible = !bossSubduedOnFloor;
    }
    if (!vaultUnsealed && vaultGuardIds.size > 0 && ctx.enemies?.getActiveEnemies) {
      const aliveIds = new Set(ctx.enemies.getActiveEnemies().map((e) => e.id));
      for (const gid of [...vaultGuardIds]) {
        if (!aliveIds.has(gid)) vaultGuardIds.delete(gid);
      }
      if (vaultGuardIds.size === 0) {
        setVaultUnsealedVisual(true);
        bus.emit('sfx', { name: 'bell' });
        bus.emit('toast', {
          text: i18n.t('toast.dungeonVault.unsealed'),
          kind: 'merit',
        });
      }
    }
  }

  syncState();

  const api = {
    enter,
    nextFloor,
    loadFloor,
    exitToChimphu,
    showLayout,
    isShowLayout: () => showLayoutFlag,
    openTierSelect,
    closeTierSelect,
    isTierSelectOpen: () => tierSelectOpen,
    breakCrystal,
    breakAllCrystals,
    extractVaultReliquary,
    openChest: openTermaChest,
    unlockGate,
    onBossSubdued,
    onPlayerFaint,
    update,
    isActive: () => active,
    getTier: () => currentTier,
    getFloor: () => currentFloor,
    getSeed: () => baseSeed,
    getHighestClearedTier: () => highestClearedTier,
    setHighestClearedTier(tier) {
      highestClearedTier = Math.max(0, Math.floor(Number(tier) || 0));
      saveDungeon();
      syncState();
      return highestClearedTier;
    },
    getLayout: () => floorLayout,
    clampPosition,
    getState,
  };

  ctx.dungeon = api;
  ctx.debug?.register?.('dungeon', api);
  if (typeof window !== 'undefined') {
    window.__stupa = window.__stupa || {};
    window.__stupa.dungeon = api;
  }

  return api;
}

export default createDungeon;
