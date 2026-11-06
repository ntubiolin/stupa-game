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
import { i18n } from '../i18n.js';

export const GRID_W = 6;
export const GRID_H = 6;
export const CELL_SIZE = 16;
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
  let tIdx = Math.floor(rng() * ROOM_TEMPLATES.length);
  for (const room of visitedList) {
    if (room === startRoom || room === farthestRoom) continue;
    room.template = ROOM_TEMPLATES[(tIdx + Math.floor(rng() * 2)) % ROOM_TEMPLATES.length];
    tIdx += 1;
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
    crystals,
  };
}

function makeWallSyllableTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#121926';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#fbbf24';
  g.lineWidth = 6;
  g.strokeRect(14, 14, 228, 228);
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
  let returnGateGroup = null;

  // Shared Geometries & Materials for InstancedMeshes (Zero PointLights)
  const floorTileGeo = new THREE.BoxGeometry(15.2, 0.4, 15.2);
  const floorTileMat = new THREE.MeshStandardMaterial({
    color: 0x262438,
    roughness: 0.88,
    metalness: 0.12,
  });

  const wallSegGeo = new THREE.BoxGeometry(1.0, 4.2, 1.0);
  const wallSegMat = new THREE.MeshStandardMaterial({
    color: 0x33304a,
    roughness: 0.86,
    metalness: 0.15,
  });

  const pillarGeo = new THREE.CylinderGeometry(0.48, 0.56, 4.2, 8);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x474366,
    roughness: 0.78,
    metalness: 0.22,
  });

  const syllableTex = makeWallSyllableTexture();
  const plaqueGeo = new THREE.PlaneGeometry(2.1, 2.1);
  const plaqueMat = new THREE.MeshBasicMaterial({
    map: syllableTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

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

  function syncState() {
    const monsterLevel = 30 + currentTier;
    const tierHpMult = Number((1 + 0.1 * currentTier).toFixed(2));
    state.dungeon = {
      active,
      tier: currentTier,
      floor: currentFloor,
      seed: baseSeed,
      floorSeed: floorLayout?.seed ?? baseSeed,
      monsterLevel,
      tierHpMult,
      highestClearedTier,
      maxSelectableTier: highestClearedTier + 1,
      showLayout: showLayoutFlag,
      totalEnemies,
      liberatedCount,
      liberationRatio: totalEnemies > 0 ? Number((liberatedCount / totalEnemies).toFixed(2)) : 1,
      gateUnlocked,
      bossSubdued: bossSubduedOnFloor,
      chestOpened,
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
    returnGateGroup = null;

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
    clearFloorEntities();

    const floorMatrices = [];
    const wallMatrices = [];
    const pillarMatrices = [];
    const plaqueMatrices = [];
    const veinMatrices = [];
    const decorMatrices = [];

    const dummy = new THREE.Object3D();
    const halfCell = CELL_SIZE * 0.5; // 8m
    const wallThick = 0.8;
    const doorGap = 5.8; // Wide 5.8m doorway opening so player & enemies walk freely
    const sideSegLen = (CELL_SIZE - doorGap) * 0.5; // 5.1m on each side of doorway

    for (const room of layout.rooms) {
      const { wx, wz, doors, template, role } = room;

      // 1. Floor slab for the room
      dummy.position.set(wx, -0.2, wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      floorMatrices.push(dummy.matrix.clone());

      // Bridge slabs on East and South doorways
      if (doors.E) {
        dummy.position.set(wx + halfCell, -0.19, wz);
        dummy.scale.set(0.18, 1, 0.38);
        dummy.updateMatrix();
        floorMatrices.push(dummy.matrix.clone());
      }
      if (doors.S) {
        dummy.position.set(wx, -0.19, wz + halfCell);
        dummy.scale.set(0.38, 1, 0.18);
        dummy.updateMatrix();
        floorMatrices.push(dummy.matrix.clone());
      }

      // 2. Four Corner Pillars per room
      for (const [cx, cz] of [
        [-halfCell + 0.6, -halfCell + 0.6],
        [halfCell - 0.6, -halfCell + 0.6],
        [-halfCell + 0.6, halfCell - 0.6],
        [halfCell - 0.6, halfCell - 0.6],
      ]) {
        dummy.position.set(wx + cx, 2.1, wz + cz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pillarMatrices.push(dummy.matrix.clone());
      }

      // 3. Outer Walls & Colliders
      // North wall (z = wz - halfCell)
      if (!doors.N) {
        dummy.position.set(wx, 2.1, wz - halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(CELL_SIZE, 1, wallThick);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx, z: wz - halfCell, hx: halfCell, hz: 0.6 });

        // Glowing Tibetan syllable plaque on closed North wall
        dummy.position.set(wx, 2.35, wz - halfCell + 0.45);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        plaqueMatrices.push(dummy.matrix.clone());
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx + s * offset, 2.1, wz - halfCell);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(sideSegLen, 1, wallThick);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx + s * offset,
            z: wz - halfCell,
            hx: sideSegLen * 0.5,
            hz: 0.55,
          });
        }
      }

      // South wall (z = wz + halfCell)
      if (!doors.S) {
        dummy.position.set(wx, 2.1, wz + halfCell);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(CELL_SIZE, 1, wallThick);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx, z: wz + halfCell, hx: halfCell, hz: 0.6 });
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx + s * offset, 2.1, wz + halfCell);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(sideSegLen, 1, wallThick);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx + s * offset,
            z: wz + halfCell,
            hx: sideSegLen * 0.5,
            hz: 0.55,
          });
        }
      }

      // West wall (x = wx - halfCell)
      if (!doors.W) {
        dummy.position.set(wx - halfCell, 2.1, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(wallThick, 1, CELL_SIZE);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx - halfCell, z: wz, hx: 0.6, hz: halfCell });
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx - halfCell, 2.1, wz + s * offset);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(wallThick, 1, sideSegLen);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx - halfCell,
            z: wz + s * offset,
            hx: 0.55,
            hz: sideSegLen * 0.5,
          });
        }
      }

      // East wall (x = wx + halfCell)
      if (!doors.E) {
        dummy.position.set(wx + halfCell, 2.1, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(wallThick, 1, CELL_SIZE);
        dummy.updateMatrix();
        wallMatrices.push(dummy.matrix.clone());
        addDungeonCollider({ type: 'box', x: wx + halfCell, z: wz, hx: 0.6, hz: halfCell });
      } else {
        const offset = doorGap * 0.5 + sideSegLen * 0.5;
        for (const s of [-1, 1]) {
          dummy.position.set(wx + halfCell, 2.1, wz + s * offset);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(wallThick, 1, sideSegLen);
          dummy.updateMatrix();
          wallMatrices.push(dummy.matrix.clone());
          addDungeonCollider({
            type: 'box',
            x: wx + halfCell,
            z: wz + s * offset,
            hx: 0.55,
            hz: sideSegLen * 0.5,
          });
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
            dummy.position.set(wx + px, 2.1, wz + pz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(0.85, 1, 0.85);
            dummy.updateMatrix();
            pillarMatrices.push(dummy.matrix.clone());
          }
        } else if (template === 'mandala' || template === 'pool' || template === 'hall') {
          dummy.position.set(wx, 0.08, wz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(template === 'pool' ? 1.2 : 1.0, 1, template === 'pool' ? 1.2 : 1.0);
          dummy.updateMatrix();
          decorMatrices.push(dummy.matrix.clone());
        } else if (template === 'corridor') {
          for (const s of [-1, 1]) {
            dummy.position.set(wx + s * 4.8, 2.1, wz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(0.8, 1, 0.8);
            dummy.updateMatrix();
            pillarMatrices.push(dummy.matrix.clone());
          }
        }

        // Mineral Crystal Veins along walls (extra dense in 'vein' template rooms)
        const veinCount = template === 'vein' ? 6 : 2;
        for (let v = 0; v < veinCount; v++) {
          const ang = (v / veinCount) * Math.PI * 2 + 0.4;
          const rad = template === 'vein' ? 5.6 : 6.4;
          dummy.position.set(wx + Math.cos(ang) * rad, 0.65 + (v % 2) * 0.35, wz + Math.sin(ang) * rad);
          dummy.rotation.set(0.2 * v, ang, 0.15);
          dummy.scale.set(0.9, 1.85, 0.9);
          dummy.updateMatrix();
          veinMatrices.push(dummy.matrix.clone());
        }
      } else {
        // Boss Room grand mandala centerpiece
        dummy.position.set(wx, 0.06, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1.8, 1, 1.8);
        dummy.updateMatrix();
        decorMatrices.push(dummy.matrix.clone());
      }
    }

    function addInstanced(geo, mat, matrices, name) {
      if (matrices.length === 0) return null;
      const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
      inst.name = name;
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      dungeonGroup.add(inst);
      return inst;
    }

    addInstanced(floorTileGeo, floorTileMat, floorMatrices, 'TermaFloorsInst');
    addInstanced(wallSegGeo, wallSegMat, wallMatrices, 'TermaWallsInst');
    addInstanced(pillarGeo, pillarMat, pillarMatrices, 'TermaPillarsInst');
    addInstanced(plaqueGeo, plaqueMat, plaqueMatrices, 'TermaPlaquesInst');
    addInstanced(veinGeo, veinMat, veinMatrices, 'TermaVeinsInst');
    addInstanced(decorRingGeo, decorRingMat, decorMatrices, 'TermaDecorInst');

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

    // 6. Exit Room: Gate of Descent (Floors 1 & 2) OR Boss Altar (Floor 3)
    const exit = layout.exitRoom;
    if (layout.floor < 3) {
      gateMeshGroup = new THREE.Group();
      gateMeshGroup.name = 'GateOfDescent';
      gateMeshGroup.position.set(exit.wx, 0, exit.wz);

      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.26, 10, 28, Math.PI),
        pillarMat,
      );
      arch.position.y = 0.1;

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
      floorRing.position.y = 0.05;

      gateMeshGroup.add(arch, portalDisc, floorRing);
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
    totalEnemies = 0;
    liberatedCount = 0;
    gateUnlocked = false;

    const monsterLevel = 30 + currentTier;
    const tierHpMult = Number((1 + 0.1 * currentTier).toFixed(2));
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
        enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * tierHpMult));
        enemy.hp = enemy.maxHp;
        enemy.dungeonFloor = layout.floor;
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
        });
        if (applyTierScalingToEnemyId(id)) {
          totalEnemies += 1;
        }
      }
    }

    // 2. Spawn Elite Packs: `1 + Math.floor(tier / 2)` per floor, with up to 3 affixes
    const elitePackCount = 1 + Math.floor(currentTier / 2);
    const affixCount = Math.min(3, 1 + Math.floor(currentTier / 3));

    for (let eIdx = 0; eIdx < elitePackCount; eIdx++) {
      const targetRoom = combatRooms[(eIdx * 2 + 1) % combatRooms.length];
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
      });
      if (applyTierScalingToEnemyId(id)) {
        totalEnemies += 1;
      }
    }

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

    const meshGrp = crystalMeshes.get(crystal.id);
    if (meshGrp && meshGrp.userData?.shardsGroup) {
      meshGrp.userData.shardsGroup.visible = false;
    }

    const ilvl = 30 + currentTier;
    const turq = 12 + currentTier * 4;
    ctx.loot?.addTurquoise?.(turq);

    const droppedItems = [];
    const baseItem = ctx.loot?.drop?.({
      ilvl,
      tier: currentTier,
      inDungeon: true,
    });
    if (baseItem) droppedItems.push(baseItem);

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
  function loadFloor(floorNum) {
    currentFloor = Math.max(1, Math.min(3, Math.floor(Number(floorNum) || 1)));
    const floorSeedOffset = currentFloor === 1 ? 0 : currentFloor === 2 ? 1009 : 2017;
    const fSeed = (Number(baseSeed) || 123) + floorSeedOffset;

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
  function enter(tier = 1, seed = undefined) {
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

    const result = loadFloor(1);
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

  /**
   * Called when `termaGuardian` is subdued on Floor 3:
   * Spawns the Terma Chest (`伏藏匣`), drops 4–6 tier-scaled items + `termaEssence`
   * + 2 speed-bonus items if cleared within 10 minutes (`600s`), updates `highestClearedTier`,
   * emits `terma:cleared`, and spawns the Return Gate to `chimphu`.
   */
  function onBossSubdued(bossState) {
    bossSubduedOnFloor = true;
    const tier = Math.max(currentTier, bossState?.tier || 1);
    const elapsedSec = Math.max(0, Math.round((state.elapsed || 0) - runStartElapsed));
    const timeBonus = elapsedSec <= 600;

    if (tier > highestClearedTier) {
      highestClearedTier = tier;
      saveDungeon();
    }

    const center = floorLayout?.exitRoom
      ? { x: floorLayout.exitRoom.wx, z: floorLayout.exitRoom.wz }
      : { x: bossState?.pos?.x || TERMA_ORIGIN.x, z: bossState?.pos?.z || TERMA_ORIGIN.z };

    // Spawn 3D Terma Chest (`伏藏匣`) & Return Gate (`回返之門`)
    spawnTermaChestAndReturnGate(center.x, center.z);

    // Open chest & drop rewards immediately so player & E2E tests receive full rewards
    openTermaChest(tier, timeBonus);

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

      const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.95), pillarMat);
      box.position.y = 0.425;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.22, 1.02), crystalBaseMat);
      trim.position.y = 0.78;
      const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), crystalShardMat);
      coreGem.position.set(0, 1.05, 0);
      chestMeshGroup.add(box, trim, coreGem);
      dungeonGroup.add(chestMeshGroup);
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

  function openTermaChest(tier = currentTier, timeBonus = true) {
    if (chestOpened) return;
    chestOpened = true;

    const ilvl = 30 + tier;
    const rng = mulberry32(baseSeed + tier * 97 + 999);
    const dropCount = 4 + Math.floor(rng() * 3); // 4..6 items

    for (let i = 0; i < dropCount; i++) {
      const forcedRarity = i === 0 ? (rng() < 0.35 ? 'terma' : 'rare') : undefined;
      ctx.loot?.drop?.({
        ilvl,
        tier,
        rarity: forcedRarity,
        rank: 'boss',
        inDungeon: true,
      });
    }

    // Grant Terma Essence (`伏藏精華`) & Turquoise
    const essenceCount = 1 + Math.floor(tier / 3);
    ctx.inventory?.addMaterial?.('termaEssence', essenceCount);
    ctx.loot?.addTurquoise?.(60 + tier * 25);
    bus.emit('toast', {
      text: i18n.t('toast.termaEssenceGained', { count: essenceCount }),
      kind: 'merit',
    });

    // 10-minute Speed Bonus: 2 extra items (at least 1 rare/terma) + bonus Turquoise
    if (timeBonus) {
      ctx.loot?.drop?.({
        ilvl,
        tier,
        rarity: 'rare',
        rank: 'boss',
        inDungeon: true,
      });
      ctx.loot?.drop?.({
        ilvl,
        tier,
        rank: 'boss',
        inDungeon: true,
      });
      ctx.loot?.addTurquoise?.(40 + tier * 15);
      bus.emit('toast', {
        text: i18n.t('toast.termaSpeedBonus'),
        kind: 'merit',
      });
    }
    syncState();
  }

  function exitToChimphu() {
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
  bus.on('enemy:liberated', () => {
    if (state.zone !== 'terma' || !active) return;
    liberatedCount += 1;
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
    const hpMult = (1 + 0.1 * selectedModalTier).toFixed(1);
    const elites = 1 + Math.floor(selectedModalTier / 2);
    const affixes = Math.min(3, 1 + Math.floor(selectedModalTier / 3));
    const bossAffixes = Math.min(3, Math.floor(selectedModalTier / 3));
    const termaBonus = (0.3 * selectedModalTier).toFixed(1);

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
        width:min(520px, 92vw);
        padding:24px 28px;
        border-radius:14px;
        background:linear-gradient(165deg, rgba(17, 24, 39, 0.96), rgba(15, 18, 34, 0.98));
        border:1px solid rgba(251, 191, 36, 0.55);
        box-shadow:0 20px 50px rgba(0,0,0,0.7);
      ">
        <div style="color:#5eead4;font-size:13px;letter-spacing:0.08em;">ཨོཾ་ཨཱཿ་ཧཱུྃ · གཏེར་མ</div>
        <h2 style="margin:4px 0 8px;color:#fde68a;font-size:22px;">${i18n.t('dungeon.ui.title')}</h2>
        <p style="margin:0 0 12px;color:#cbd5e1;font-size:13px;">${i18n.t('dungeon.ui.subtitle', { maxTier })}</p>
        <div style="margin-bottom:14px;color:#fbbf24;font-size:13px;">
          ${i18n.t('dungeon.ui.highestCleared', { tier: highestClearedTier })}
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

  function update(dt) {
    if (tierSelectOpen && ctx.input?.pressed?.('closeUi')) {
      closeTierSelect();
    }
    if (state.zone !== 'terma') {
      if (hudEl && hudEl.style.display !== 'none') {
        hudEl.style.display = 'none';
      }
      return;
    }

    // Animate crystals & portals
    const elapsed = state.elapsed || 0;
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
