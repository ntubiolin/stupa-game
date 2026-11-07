// ============================================================================
// Chapter 1 World Map — Pharping · Yangleshö (`src/world/maps/pharping.js`)
//
// Landmarks (relative to origin (2000, 0)):
//   - Entrance & Waypoint: (0, 80)   -> world (2000, 80)
//   - Pharping Village:    (-30, 55) -> world (1970, 55)
//   - Three Dry Springs:   (-55, 10), (40, 30), (10, -20)
//   - Escort Canyon Route: (-70, -40) -> (15, -45)
//   - Yangleshö Cave:      (20, -45) -> world (2020, -45) with 7 butter lamp niches
//   - Asura Cave Arena:    (-10, -80) -> world (1990, -80), r = 16m
//   - Rain Transformation: Triggered by `ch1.rain` flag (falling rain, green terrain,
//                          tree foliage canopies, full springs/well, rain soundscape)
//
// Strictly 0 PointLights.
// ============================================================================
import * as THREE from 'three';
import {
  createHeightfieldTerrain,
  scatterRocks,
  addRimMountains,
  seededRandom,
  buildGateArch,
  pushCollider,
} from '../mapBase.js';

const TWO_PI = Math.PI * 2;

let _pharpingGlowTex = null;
function getPharpingGlowTexture() {
  if (_pharpingGlowTex) return _pharpingGlowTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    const grad = c.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.32, 'rgba(255, 232, 175, 0.68)');
    grad.addColorStop(0.68, 'rgba(255, 185, 95, 0.22)');
    grad.addColorStop(1.0, 'rgba(255, 160, 60, 0.0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  _pharpingGlowTex = tex;
  return tex;
}

export function createMap(ctx) {
  const mapDef = ctx.world?.getMap?.('pharping') || {
    id: 'pharping',
    origin: { x: 2000, z: 0 },
    walkRadius: 105,
    gates: [
      {
        id: 'south',
        x: 2000,
        z: 84,
        radius: 3.5,
        to: 'stupa',
        toGate: 'north',
        labelKey: 'prompt.returnStupa',
      },
    ],
  };
  const origin = mapDef.origin || { x: 2000, z: 0 };

  const group = ctx.zoneGroups?.pharping || new THREE.Group();
  group.name = 'PharpingMap';
  if (!ctx.zoneGroups?.pharping) {
    ctx.scene.add(group);
  }

  // ---------------------------------------------------------------- 1. Heightfield Terrain
  // Gently terraced valley sloping upward toward the northern cliffs (Yangleshö & Asura caves)
  // Flat plateaus at village (-30, 55), 3 springs, Yangleshö cave (20, -45), and Asura boss arena (-10, -80)
  const getHeight = (wx, wz) => {
    const lx = wx - origin.x;
    const lz = wz - origin.z;
    const r = Math.hypot(lx, lz);

    // Flatten key landmarks for clean footing
    const dGate = Math.hypot(lx - 0, lz - 80);
    if (dGate < 14) return 0;

    const dVillage = Math.hypot(lx - -30, lz - 55);
    if (dVillage < 15) return 0.2;

    const dS1 = Math.hypot(lx - -55, lz - 10);
    if (dS1 < 7) return 0.4;

    const dS2 = Math.hypot(lx - 40, lz - 30);
    if (dS2 < 7) return 0.35;

    const dS3 = Math.hypot(lx - 10, lz - -20);
    if (dS3 < 7) return 0.6;

    const dCave = Math.hypot(lx - 20, lz - -45);
    if (dCave < 11) return 1.2;

    const dArena = Math.hypot(lx - -10, lz - -80);
    if (dArena < 18) return 2.4;

    // Gentle north-rising slope + terraced valley undulations
    const northRise = Math.max(0, (40 - lz) * 0.02);
    const undulation = Math.sin(lx * 0.055) * Math.cos(lz * 0.055) * 0.55;
    let h = Math.max(0, northRise + undulation * 0.5);

    if (r > 96) {
      const rim = (r - 96) / 28;
      h += rim * rim * 11.0;
    }
    return h;
  };

  // Dry vs Lush Green vertex palettes for `ch1.rain` transformation
  const dryOchre = new THREE.Color(0x9a5d34);
  const dryCrack = new THREE.Color(0x7c4322);
  const dryPath = new THREE.Color(0xb58354);
  const drySlate = new THREE.Color(0x5c4a3e);

  const wetGreen = new THREE.Color(0x4f7d44);
  const wetMeadow = new THREE.Color(0x639150);
  const wetPath = new THREE.Color(0x7d7258);
  const wetSlate = new THREE.Color(0x4c584e);
  const tmpCol = new THREE.Color();
  const tmpDry = new THREE.Color();
  const tmpWet = new THREE.Color();

  function computeDryWetColor(wx, wz, y, lx, lz, rainMix) {
    const noise = Math.sin(lx * 0.14) * Math.cos(lz * 0.14) * 0.5 + 0.5;
    // Dry color
    if (y > 2.2) {
      tmpDry.lerpColors(dryOchre, drySlate, Math.min(1, (y - 2.2) / 4.0));
    } else if (Math.abs(lx + 15) < 6 && lz > -45 && lz < 78) {
      tmpDry.lerpColors(dryPath, dryOchre, 0.35);
    } else {
      tmpDry.lerpColors(dryCrack, dryOchre, noise);
    }

    // Wet color
    if (y > 2.2) {
      tmpWet.lerpColors(wetGreen, wetSlate, Math.min(1, (y - 2.2) / 4.0));
    } else if (Math.abs(lx + 15) < 6 && lz > -45 && lz < 78) {
      tmpWet.lerpColors(wetPath, wetGreen, 0.45);
    } else {
      tmpWet.lerpColors(wetGreen, wetMeadow, noise);
    }

    return tmpCol.lerpColors(tmpDry, tmpWet, rainMix);
  }

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 240,
    segments: 96,
    heightFn: getHeight,
    colorFn: (wx, wz, y, lx, lz) => computeDryWetColor(wx, wz, y, lx, lz, 0),
  });
  group.add(terrainMesh);

  function updateTerrainColors(rainMix) {
    const posAttr = terrainMesh.geometry.attributes.position;
    const colAttr = terrainMesh.geometry.attributes.color;
    if (!posAttr || !colAttr) return;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const y = posAttr.getY(i);
      const c = computeDryWetColor(lx + origin.x, lz + origin.z, y, lx, lz, rainMix);
      colAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colAttr.needsUpdate = true;
  }

  // Distant Himalayan foothill rim
  addRimMountains(ctx, group, {
    origin,
    innerR: 122,
    outerR: 185,
    count: 24,
    heightRange: [38, 76],
  });

  // ---------------------------------------------------------------- 2. South Entrance Gate & Prayer Flags (0, 84)
  const gateCfg = (mapDef.gates && mapDef.gates[0]) || { x: origin.x, z: origin.z + 84 };
  buildGateArch(ctx, group, {
    mapId: 'pharping',
    x: gateCfg.x,
    z: gateCfg.z,
    y: getHeight(gateCfg.x, gateCfg.z),
  });

  // ---------------------------------------------------------------- 3. Pharping Village (-30, 55) + Dry Stone Well
  const villageGroup = new THREE.Group();
  villageGroup.name = 'PharpingVillage';
  group.add(villageGroup);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x9c8468, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.85 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x3e2718, roughness: 0.88 });

  const houseSpecs = [
    { lx: -40, lz: 62, w: 4.4, d: 3.6, h: 2.7, rot: 0.25 },
    { lx: -33, lz: 64, w: 4.0, d: 3.4, h: 2.5, rot: -0.15 },
    { lx: -22, lz: 61, w: 4.6, d: 3.8, h: 2.8, rot: -0.4 },
    { lx: -42, lz: 51, w: 4.2, d: 3.5, h: 2.6, rot: 0.5 },
    { lx: -19, lz: 50, w: 4.0, d: 3.4, h: 2.5, rot: -0.6 },
    { lx: -36, lz: 44, w: 4.5, d: 3.6, h: 2.7, rot: 0.18 },
    { lx: -25, lz: 44, w: 3.8, d: 3.2, h: 2.4, rot: -0.22 },
  ];

  for (const hs of houseSpecs) {
    const hx = origin.x + hs.lx;
    const hz = origin.z + hs.lz;
    const hy = getHeight(hx, hz);
    const hGrp = new THREE.Group();
    hGrp.position.set(hx, hy, hz);
    hGrp.rotation.y = hs.rot;

    const body = new THREE.Mesh(new THREE.BoxGeometry(hs.w, hs.h, hs.d), wallMat);
    body.position.y = hs.h * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    hGrp.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(hs.w + 0.5, 0.32, hs.d + 0.5), roofMat);
    roof.position.y = hs.h + 0.16;
    roof.castShadow = true;
    hGrp.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.55, 0.12), timberMat);
    door.position.set(0, 0.78, hs.d * 0.5 + 0.04);
    hGrp.add(door);

    villageGroup.add(hGrp);
    pushCollider(ctx, 'pharping', {
      type: 'circle',
      x: hx,
      z: hz,
      r: Math.max(hs.w, hs.d) * 0.52,
    });
  }

  // Village stone well at (-30, 53)
  const wellX = origin.x - 30;
  const wellZ = origin.z + 53;
  const wellY = getHeight(wellX, wellZ);
  const wellGroup = new THREE.Group();
  wellGroup.position.set(wellX, wellY, wellZ);
  const wellRim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.48, 0.85, 12, 1, true),
    wallMat,
  );
  wellRim.position.y = 0.42;
  wellGroup.add(wellRim);

  const wellWaterMat = new THREE.MeshStandardMaterial({
    color: 0x2ec4b6,
    roughness: 0.18,
    metalness: 0.35,
    emissive: 0x0f766e,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.88,
  });
  const wellWaterMesh = new THREE.Mesh(new THREE.CircleGeometry(1.25, 16), wellWaterMat);
  wellWaterMesh.rotation.x = -Math.PI / 2;
  wellWaterMesh.position.y = 0.08;
  wellWaterMesh.visible = false;
  wellGroup.add(wellWaterMesh);
  villageGroup.add(wellGroup);
  pushCollider(ctx, 'pharping', { type: 'circle', x: wellX, z: wellZ, r: 1.4 });

  // ---------------------------------------------------------------- 4. Three Dry Springs (三處泉眼)
  const springSpecs = [
    { id: 'spring1', lx: -55, lz: 10, tag: 'spring1' },
    { id: 'spring2', lx: 40, lz: 30, tag: 'spring2' },
    { id: 'spring3', lx: 10, lz: -20, tag: 'spring3' },
  ];
  const springs = [];
  const springStoneMat = new THREE.MeshStandardMaterial({ color: 0x7a6c5d, roughness: 0.88 });
  const springWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.86,
  });

  for (const sp of springSpecs) {
    const sx = origin.x + sp.lx;
    const sz = origin.z + sp.lz;
    const sy = getHeight(sx, sz);
    const sGrp = new THREE.Group();
    sGrp.position.set(sx, sy, sz);

    // Stone-lined basin ring of 10 boulders
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TWO_PI;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), springStoneMat);
      stone.position.set(Math.cos(a) * 2.1, 0.24, Math.sin(a) * 2.1);
      stone.scale.set(1.1, 0.65, 1.1);
      sGrp.add(stone);
    }

    // Dry mud bed
    const mudBed = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 18),
      new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.95 }),
    );
    mudBed.rotation.x = -Math.PI / 2;
    mudBed.position.y = 0.03;
    sGrp.add(mudBed);

    // Water surface disc (hidden when dry, trickle when inspected, full when ch1.rain)
    const waterDisc = new THREE.Mesh(new THREE.CircleGeometry(1.95, 20), springWaterMat);
    waterDisc.rotation.x = -Math.PI / 2;
    waterDisc.position.y = 0.12;
    waterDisc.scale.setScalar(0.01);
    waterDisc.visible = false;
    sGrp.add(waterDisc);

    group.add(sGrp);

    const springState = {
      id: sp.id,
      tag: sp.tag,
      x: sx,
      y: sy,
      z: sz,
      posVec: new THREE.Vector3(sx, sy, sz),
      inspected: false,
      waterDisc,
    };
    springs.push(springState);

    ctx.interactables.push({
      id: `pharping-${sp.id}`,
      kind: 'springBasin',
      zone: 'pharping',
      action: 'interact',
      labelKey: 'prompt.springBasin',
      radius: 3.4,
      getPosition: () => springState.posVec,
      isAvailable: () =>
        (ctx.state.zone || 'stupa') === 'pharping' &&
        !ctx.state.uiOpen &&
        !springState.inspected &&
        !ctx.quests?.hasFlag?.('ch1.rain'),
      onInteract: () => {
        if (springState.inspected) return;
        // Check if any active droughtSprite is still guarding within 14m
        const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
        const guard = activeEnemies.find(
          (e) =>
            e.hp > 0 &&
            e.kind === 'droughtSprite' &&
            (e.tag === sp.tag || Math.hypot(e.group.position.x - sx, e.group.position.z - sz) < 14),
        );
        if (guard) {
          const msg =
            ctx.i18n?.t?.('toast.spring.guarded') ||
            '泉眼仍被旱魅盤踞，請先度化周圍的旱魅！';
          ctx.hud?.toast?.(msg);
          return;
        }

        springState.inspected = true;
        springState.waterDisc.visible = true;
        springState.waterDisc.scale.setScalar(0.52);
        ctx.bus.emit('sfx', { name: 'bowl' });
        const msg =
          ctx.i18n?.t?.('toast.spring.seep') ||
          '甘泉微湧——旱魅退散後，泉眼滲出清涼細流！';
        ctx.hud?.toast?.(msg);
        ctx.bus.emit('quest:interact', { target: sp.id, uniqueId: sp.id, count: 1 });
      },
    });
  }

  // ---------------------------------------------------------------- 5. Procedural Dead/Lush Trees (Sprout Foliage on `ch1.rain`)
  const treeCanopies = [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d3624, roughness: 0.92 });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x3b7a3e,
    roughness: 0.78,
    emissive: 0x143316,
    emissiveIntensity: 0.2,
  });

  const treeCoords = [
    { lx: -48, lz: 28 },
    { lx: -62, lz: -5 },
    { lx: -24, lz: 15 },
    { lx: 18, lz: 52 },
    { lx: 52, lz: 42 },
    { lx: 56, lz: 14 },
    { lx: 34, lz: -8 },
    { lx: -16, lz: -18 },
    { lx: -54, lz: -52 },
    { lx: 48, lz: -38 },
    { lx: -32, lz: -64 },
    { lx: 28, lz: -72 },
  ];

  for (const tc of treeCoords) {
    const tx = origin.x + tc.lx;
    const tz = origin.z + tc.lz;
    const ty = getHeight(tx, tz);
    const tGrp = new THREE.Group();
    tGrp.position.set(tx, ty, tz);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.8, 7), trunkMat);
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    tGrp.add(trunk);

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.4, 6), trunkMat);
    b1.position.set(0.35, 2.35, 0);
    b1.rotation.z = -0.65;
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.3, 6), trunkMat);
    b2.position.set(-0.32, 2.2, 0.15);
    b2.rotation.z = 0.58;
    tGrp.add(b1, b2);

    // Lush green foliage canopy (hidden during drought, blooms when ch1.rain is true)
    const canopy = new THREE.Group();
    canopy.position.y = 2.85;
    canopy.visible = false;
    const cMain = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35, 1), canopyMat);
    cMain.scale.set(1.15, 0.85, 1.15);
    const cLeft = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), canopyMat);
    cLeft.position.set(-0.75, -0.25, 0.2);
    const cRight = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), canopyMat);
    cRight.position.set(0.75, -0.2, -0.15);
    canopy.add(cMain, cLeft, cRight);
    tGrp.add(canopy);
    treeCanopies.push(canopy);

    group.add(tGrp);
    pushCollider(ctx, 'pharping', { type: 'circle', x: tx, z: tz, r: 0.55 });
  }

  // ---------------------------------------------------------------- 6. Yangleshö Cave (揚列雪洞) at (20, -45) & 7 Butter Lamp Niches
  const caveX = origin.x + 20;
  const caveZ = origin.z - 45;
  const caveY = getHeight(caveX, caveZ);
  const caveGroup = new THREE.Group();
  caveGroup.name = 'YangleshoCave';
  caveGroup.position.set(caveX, caveY, caveZ);
  group.add(caveGroup);

  const glowTex = getPharpingGlowTexture();
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x4b3f36,
    roughness: 0.92,
    metalness: 0.06,
  });
  const innerVaultMat = new THREE.MeshStandardMaterial({
    color: 0x1e1814,
    roughness: 0.96,
    metalness: 0.04,
    emissive: 0x140d07,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  const caveFloorMat = new THREE.MeshStandardMaterial({
    color: 0x261f1a,
    roughness: 0.9,
    metalness: 0.08,
  });

  // 6a. Dark stone cavern floor & sacred mandala altar ring
  const caveFloor = new THREE.Mesh(new THREE.CircleGeometry(7.6, 28), caveFloorMat);
  caveFloor.rotation.x = -Math.PI / 2;
  caveFloor.position.set(0, 0.02, -1.6);
  caveFloor.receiveShadow = true;
  caveGroup.add(caveFloor);

  const altarRingGeo = new THREE.RingGeometry(1.42, 1.68, 28);
  altarRingGeo.rotateX(-Math.PI / 2);
  const altarRing = new THREE.Mesh(
    altarRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  altarRing.position.set(0, 0.035, -1.2);
  caveGroup.add(altarRing);

  // 6b. Seamless inner dark rock vault dome (open to the south entrance so zero sky leaks overhead or behind)
  const innerDomeGeo = new THREE.SphereGeometry(
    7.4,
    24,
    16,
    Math.PI * 0.92,
    Math.PI * 1.16,
    0,
    Math.PI * 0.62,
  );
  const innerDome = new THREE.Mesh(innerDomeGeo, innerVaultMat);
  innerDome.position.set(0, 0.2, -1.5);
  innerDome.scale.set(1.12, 0.96, 1.15);
  caveGroup.add(innerDome);

  // Overhead solid rock ceiling liner covering the entire cave interior
  const ceilingCap = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 8.2, 1.8, 18), innerVaultMat);
  ceilingCap.position.set(0, 6.8, -1.8);
  ceilingCap.scale.set(1.12, 1.0, 1.12);
  caveGroup.add(ceilingCap);

  // 6c. Continuous 9-segment horseshoe cliff walls around north, west, and east perimeter (r = 8.4)
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const ang = -0.06 * Math.PI + t * 1.12 * Math.PI; // East-Southeast -> North -> West-Southwest
    const r = 8.3;
    const wx = Math.cos(ang) * r;
    const wz = -1.4 - Math.sin(ang) * r;
    const wallCrag = new THREE.Mesh(new THREE.DodecahedronGeometry(3.4, 1), cliffMat);
    wallCrag.position.set(wx, 3.4 + (i % 2) * 0.45, wz);
    wallCrag.scale.set(1.28, 1.48, 1.22);
    wallCrag.rotation.set(i * 0.35, ang, i * 0.2);
    wallCrag.castShadow = true;
    wallCrag.receiveShadow = true;
    caveGroup.add(wallCrag);
  }

  // Southern entrance archway pillars & sculpted cliff brow lintel
  const leftArchPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), cliffMat);
  leftArchPillar.position.set(-6.4, 3.2, 2.1);
  leftArchPillar.scale.set(1.05, 1.45, 1.15);
  const rightArchPillar = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), cliffMat);
  rightArchPillar.position.set(6.4, 3.2, 2.1);
  rightArchPillar.scale.set(1.05, 1.45, 1.15);
  const entranceBrow = new THREE.Mesh(new THREE.DodecahedronGeometry(5.6, 1), cliffMat);
  entranceBrow.position.set(0, 6.9, 1.8);
  entranceBrow.scale.set(1.55, 0.45, 0.72);
  caveGroup.add(leftArchPillar, rightArchPillar, entranceBrow);

  // Multi-layered vaulted cave roof & upper Himalayan cliff peak
  const roofMain = new THREE.Mesh(new THREE.DodecahedronGeometry(7.2, 1), cliffMat);
  roofMain.position.set(0, 7.8, -2.4);
  roofMain.scale.set(1.48, 0.48, 1.38);
  const roofRear = new THREE.Mesh(new THREE.DodecahedronGeometry(6.8, 1), cliffMat);
  roofRear.position.set(0, 8.6, -6.2);
  roofRear.scale.set(1.42, 0.68, 1.15);
  const upperPeak = new THREE.Mesh(new THREE.DodecahedronGeometry(6.2, 1), cliffMat);
  upperPeak.position.set(-0.6, 11.8, -5.2);
  upperPeak.scale.set(1.35, 0.95, 1.1);
  caveGroup.add(roofMain, roofRear, upperPeak);

  // 6d. Hanging limestone stalactites along ceiling & cave brow
  const stalactiteGeo = new THREE.ConeGeometry(0.32, 1.55, 6);
  for (let i = 0; i < 14; i++) {
    const isBrow = i < 5;
    const ang = isBrow
      ? -0.28 * Math.PI + (i / 4) * 0.56 * Math.PI
      : (i / 9) * Math.PI * 1.65;
    const sr = isBrow ? 5.6 : 2.2 + (i % 3) * 1.65;
    const sx = isBrow ? Math.sin(ang) * sr : Math.cos(ang) * sr;
    const sz = isBrow ? 1.6 - Math.cos(ang) * 0.6 : -1.8 - Math.abs(Math.sin(ang)) * sr;
    const stal = new THREE.Mesh(stalactiteGeo, cliffMat);
    stal.position.set(sx, isBrow ? 5.55 : 5.85, sz);
    stal.rotation.x = Math.PI;
    stal.scale.set(0.75 + (i % 3) * 0.25, 0.8 + (i % 4) * 0.28, 0.75 + (i % 3) * 0.25);
    caveGroup.add(stal);
  }

  // Meditation seat stone inside Yangleshö Cave
  const seatMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.35, 0.38, 10),
    new THREE.MeshStandardMaterial({ color: 0x8c7b65, roughness: 0.8 }),
  );
  seatMesh.position.set(0, 0.19, -1.2);
  caveGroup.add(seatMesh);

  // 6e. Cave Interior Lighting — Altar Glow, Slanted Entrance Shaft & Dynamic Sanctuary Radiance (0 PointLights)
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);

  const altarGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffb84d,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const altarGlowPool = new THREE.Mesh(poolGeo, altarGlowMat);
  altarGlowPool.position.set(0, 0.04, -1.2);
  altarGlowPool.scale.set(4.8, 1, 4.8);
  caveGroup.add(altarGlowPool);

  const sanctuaryGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffaa33,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sanctuaryGlowPool = new THREE.Mesh(poolGeo, sanctuaryGlowMat);
  sanctuaryGlowPool.position.set(0, 0.035, -2.2);
  sanctuaryGlowPool.scale.set(11.5, 1, 11.5);
  caveGroup.add(sanctuaryGlowPool);

  // Overhead warm bounce light on the cave vault ceiling
  const vaultBounceMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xff9d2e,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const vaultBounceDisc = new THREE.Mesh(poolGeo, vaultBounceMat);
  vaultBounceDisc.position.set(0, 5.75, -2.0);
  vaultBounceDisc.scale.set(10.0, 1, 10.0);
  caveGroup.add(vaultBounceDisc);

  // Slanted crepuscular light shaft entering from the southern cave mouth
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a0,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const entranceShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 2.75, 6.8, 16, 1, true),
    shaftMat,
  );
  entranceShaft.position.set(0, 3.1, 1.35);
  entranceShaft.rotation.x = -0.34;
  caveGroup.add(entranceShaft);

  // Floating golden cave dust motes inside Yangleshö Cave
  const caveDustCount = 46;
  const caveDustGeo = new THREE.BufferGeometry();
  const caveDustPos = new Float32Array(caveDustCount * 3);
  for (let i = 0; i < caveDustCount; i++) {
    const a = (i / caveDustCount) * TWO_PI * 2.7;
    const r = 0.8 + ((i * 17) % 10) * 0.48;
    caveDustPos[i * 3 + 0] = Math.cos(a) * r;
    caveDustPos[i * 3 + 1] = 0.45 + ((i * 13) % 11) * 0.42;
    caveDustPos[i * 3 + 2] = -1.6 + Math.sin(a) * r * 0.85;
  }
  caveDustGeo.setAttribute('position', new THREE.BufferAttribute(caveDustPos, 3));
  const caveDustMat = new THREE.PointsMaterial({
    color: 0xffd584,
    size: 0.14,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const caveDustPoints = new THREE.Points(caveDustGeo, caveDustMat);
  caveDustPoints.name = 'YangleshoCaveDust';
  caveGroup.add(caveDustPoints);

  // 7 Butter Lamp Niches arranged in a sacred semicircle around Yangleshö Cave
  const lampNiches = [];
  const lampBrassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a238,
    roughness: 0.32,
    metalness: 0.76,
    emissive: 0x5c3808,
    emissiveIntensity: 0.35,
  });
  const lampFlameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.65, 0.55),
    toneMapped: false,
  });
  const lampHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff9e2c,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const triggeredLampWaves = new Set();

  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * 0.18 + (i / 6) * Math.PI * 0.64; // semicircle facing south/west
    const r = 4.6;
    const lx = caveX + Math.cos(angle - Math.PI) * r;
    const lz = caveZ + Math.sin(angle - Math.PI) * r;
    const ly = getHeight(lx, lz);

    const nGrp = new THREE.Group();
    nGrp.position.set(lx, ly, lz);

    // Carved stone shrine niche backing behind each butter lamp
    const nicheBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 1.32, 0.28),
      cliffMat,
    );
    const outAngle = angle - Math.PI;
    nicheBack.position.set(Math.cos(outAngle) * 0.38, 0.66, Math.sin(outAngle) * 0.38);
    nicheBack.rotation.y = -outAngle + Math.PI / 2;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 0.68, 8),
      springStoneMat,
    );
    pedestal.position.y = 0.34;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.13, 0.17, 10), lampBrassMat);
    bowl.position.y = 0.76;

    const flameGrp = new THREE.Group();
    flameGrp.position.y = 0.94;
    flameGrp.visible = false;
    const flameCone = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.28, 8), lampFlameMat);
    const haloSphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), lampHaloMat);
    flameGrp.add(flameCone, haloSphere);

    // Radial floor light pool under each butter lamp (brightens when lit)
    const lampPoolMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xffaa33,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const lampPool = new THREE.Mesh(poolGeo, lampPoolMat);
    lampPool.position.y = 0.03;
    lampPool.scale.set(3.2, 1, 3.2);

    nGrp.add(nicheBack, pedestal, bowl, flameGrp, lampPool);
    group.add(nGrp);

    const lampObj = {
      index: i,
      id: `yangleshoLamp_${i + 1}`,
      x: lx,
      y: ly,
      z: lz,
      posVec: new THREE.Vector3(lx, ly, lz),
      lit: false,
      flameGrp,
      lampPool,
      lampPoolMat,
    };
    lampNiches.push(lampObj);

    ctx.interactables.push({
      id: `pharping-lamp-${i + 1}`,
      kind: 'yangleshoLamp',
      zone: 'pharping',
      action: 'interact',
      labelKey: 'prompt.lightCaveLamp',
      radius: 2.8,
      getPosition: () => lampObj.posVec,
      isAvailable: () =>
        (ctx.state.zone || 'stupa') === 'pharping' &&
        !ctx.state.uiOpen &&
        !lampObj.lit,
      onInteract: () => {
        lampObj.lit = true;
        lampObj.flameGrp.visible = true;
        lampObj.lampPoolMat.opacity = 0.62;
        ctx.bus.emit('sfx', { name: 'lamp' });
        ctx.bus.emit('quest:interact', { target: 'yangleshoLamp', count: 1 });

        const litCount = lampNiches.filter((l) => l.lit).length;
        const msg =
          ctx.i18n?.t?.('toast.lamp.lit', { cur: litCount, max: 7 }) ||
          `已點亮揚列雪酥油燈（${litCount}/7）`;
        ctx.hud?.toast?.(msg);

        // Spawn obstacle wave at 2, 4, and 6 lamps lit
        if ((litCount === 2 || litCount === 4 || litCount === 6) && !triggeredLampWaves.has(litCount)) {
          triggeredLampWaves.add(litCount);
          const waveMsg =
            ctx.i18n?.t?.('toast.lamp.wave') ||
            '洞外熱風驟起——旱魅與沙塵精正撲向酥油燈！';
          ctx.hud?.toast?.(waveMsg);
          const kinds = litCount === 6 ? ['droughtSprite', 'dustDevil', 'droughtSprite'] : ['droughtSprite', 'dustDevil'];
          kinds.forEach((k, idx) => {
            const sx = caveX - 10 + idx * 3.5;
            const sz = caveZ + 9 + idx * 1.5;
            const eid = ctx.enemies?.spawn?.(k, {
              position: { x: sx, y: getHeight(sx, sz), z: sz },
              level: 6,
            });
            if (eid) {
              const list = ctx.enemies?.getActiveEnemies?.() || [];
              const inst = list.find((e) => e.id === eid);
              if (inst) {
                inst.isLampAttacker = true;
                inst.targetLampIndex = lampObj.index;
                inst.state = 'chase';
              }
            }
          });
        }

        // All 7 lamps lit -> manifest Guru Vision
        if (litCount >= 7 && !ctx.quests?.hasFlag?.('ch1.lamps.lit')) {
          ctx.quests?.setFlag?.('ch1.lamps.lit', true);
          const allMsg =
            ctx.i18n?.t?.('toast.lamps.allLit') ||
            '七盞酥油燈齊明，蓮師金色淨相於揚列雪洞中顯現！';
          ctx.hud?.toast?.(allMsg);
        }
      },
    });
  }

  // ---------------------------------------------------------------- 7. Asura Cave & Boss Arena (-10, -80)
  const arenaX = origin.x - 10;
  const arenaZ = origin.z - 80;
  const arenaY = getHeight(arenaX, arenaZ);
  const asuraGroup = new THREE.Group();
  asuraGroup.name = 'AsuraCaveArena';
  asuraGroup.position.set(arenaX, arenaY, arenaZ);
  group.add(asuraGroup);

  const charredMat = new THREE.MeshStandardMaterial({
    color: 0x2b201b,
    roughness: 0.9,
    emissive: 0x3b1206,
    emissiveIntensity: 0.25,
  });
  const asuraVeinMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 0.65, 0.15),
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const arenaRingGeo = new THREE.RingGeometry(15.2, 16.0, 48);
  arenaRingGeo.rotateX(-Math.PI / 2);
  const arenaRing = new THREE.Mesh(
    arenaRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  arenaRing.position.y = 0.04;
  asuraGroup.add(arenaRing);

  // Deep Asura Volcanic Cavern Grotto on the north rim of the arena
  const asuraInnerDome = new THREE.Mesh(
    new THREE.SphereGeometry(9.2, 18, 12, Math.PI * 0.95, Math.PI * 1.1, 0, Math.PI * 0.58),
    innerVaultMat,
  );
  asuraInnerDome.position.set(0, 0.2, -16.2);
  asuraInnerDome.scale.set(1.25, 0.95, 0.95);
  asuraGroup.add(asuraInnerDome);

  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.16 + (i / 6) * Math.PI * 0.68;
    const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(3.8, 1), charredMat);
    crag.position.set(
      Math.cos(a + Math.PI) * 17.2,
      3.2 + Math.sin(a) * 2.6,
      Math.sin(a + Math.PI) * 17.2,
    );
    crag.scale.set(1.35, 1.55, 1.15);
    asuraGroup.add(crag);
  }
  const asuraRoofVault = new THREE.Mesh(new THREE.DodecahedronGeometry(7.8, 1), charredMat);
  asuraRoofVault.position.set(0, 8.2, -16.8);
  asuraRoofVault.scale.set(1.65, 0.52, 1.15);
  const asuraUpperPeak = new THREE.Mesh(new THREE.DodecahedronGeometry(6.8, 1), charredMat);
  asuraUpperPeak.position.set(0, 12.2, -19.5);
  asuraUpperPeak.scale.set(1.45, 0.95, 1.05);
  asuraGroup.add(asuraRoofVault, asuraUpperPeak);

  // Glowing crimson-amber fissure veins & floor glow pool at Asura Cave mouth
  for (let i = -2; i <= 2; i++) {
    const vein = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), asuraVeinMat);
    vein.position.set(i * 3.1, 1.8 + (Math.abs(i) % 2) * 1.1, -15.6 - Math.abs(i) * 0.4);
    vein.scale.set(0.6, 2.8, 0.6);
    vein.rotation.z = i * 0.22;
    asuraGroup.add(vein);
  }
  const asuraMouthPool = new THREE.Mesh(
    poolGeo,
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xea580c,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  asuraMouthPool.position.set(0, 0.05, -13.5);
  asuraMouthPool.scale.set(11.0, 1, 8.5);
  asuraGroup.add(asuraMouthPool);

  // ---------------------------------------------------------------- 8. Scatter Valley Rocks
  const rng = seededRandom(3201);
  scatterRocks(ctx, group, {
    mapId: 'pharping',
    origin,
    count: 26,
    rng,
    area: { minR: 16, maxR: 88 },
    minRadius: 1.0,
    maxRadius: 2.3,
    minSpacing: 9,
    avoid: [
      { x: origin.x, z: origin.z + 80, r: 15 }, // Entrance & Waypoint
      { x: origin.x - 30, z: origin.z + 55, r: 18 }, // Pharping Village
      { x: origin.x - 55, z: origin.z + 10, r: 9 }, // Spring 1
      { x: origin.x + 40, z: origin.z + 30, r: 9 }, // Spring 2
      { x: origin.x + 10, z: origin.z - 20, r: 9 }, // Spring 3
      { x: origin.x + 20, z: origin.z - 45, r: 12 }, // Yangleshö Cave
      { x: origin.x - 10, z: origin.z - 80, r: 19 }, // Asura Cave Arena
      { x: origin.x - 70, z: origin.z - 40, r: 8 }, // Messenger start
    ],
    getHeight,
    color: 0x735b46,
  });

  // ---------------------------------------------------------------- 9. Western Canyon Escort Route (`messenger` C1-3)
  const escortWaypoints = [
    { x: origin.x - 48, z: origin.z - 41, ambush: true, ambushId: 1 },
    { x: origin.x - 24, z: origin.z - 43, ambush: true, ambushId: 2 },
    { x: origin.x - 2, z: origin.z - 44, ambush: true, ambushId: 3 },
    { x: origin.x + 15, z: origin.z - 45, ambush: false, final: true },
  ];
  const escortState = {
    active: false,
    arrived: false,
    wpIndex: 0,
    hp: 120,
    maxHp: 120,
    restingTimer: 0,
    triggeredAmbushes: new Set(),
    damageCooldown: 0,
  };

  ctx.bus.on('escort:start', () => {
    if (escortState.arrived || ctx.quests?.hasFlag?.('ch1.escort.arrived')) return;
    escortState.active = true;
    escortState.hp = escortState.maxHp;
    escortState.restingTimer = 0;
    const msg =
      ctx.i18n?.t?.('toast.escort.start') ||
      '護送那爛陀信使前往揚列雪洞——小心峽谷中的旱魅伏擊！';
    ctx.hud?.toast?.(msg);
  });

  function updateEscort(dt) {
    if (!escortState.active || escortState.arrived) return;
    const msgNpc = ctx.npcs?.getById?.('messenger');
    if (!msgNpc) return;

    escortState.damageCooldown = Math.max(0, escortState.damageCooldown - dt);

    // If resting after reaching 0 HP, count down 5s recovery
    if (escortState.restingTimer > 0) {
      escortState.restingTimer -= dt;
      msgNpc.idle = 'rest';
      if (escortState.restingTimer <= 0) {
        escortState.hp = escortState.maxHp;
        msgNpc.idle = 'walk';
        const recMsg =
          ctx.i18n?.t?.('toast.escort.recovered') || '信使調息完畢，繼續前行！';
        ctx.hud?.toast?.(recMsg);
      }
      return;
    }

    // Check nearby enemy attacks on messenger
    const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
    if (escortState.damageCooldown <= 0) {
      for (const e of activeEnemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.group.position.x - msgNpc.x, e.group.position.z - msgNpc.z);
        if (d <= 2.4) {
          escortState.damageCooldown = 1.0;
          escortState.hp = Math.max(0, escortState.hp - 25);
          if (escortState.hp <= 0) {
            escortState.restingTimer = 5.0;
            msgNpc.idle = 'rest';
            const restMsg =
              ctx.i18n?.t?.('toast.escort.resting') ||
              '信使體力不支，原地調息 5 秒後將繼續前行！';
            ctx.hud?.toast?.(restMsg);
            return;
          }
          break;
        }
      }
    }

    // Advance toward current waypoint
    const wp = escortWaypoints[escortState.wpIndex];
    if (!wp) return;

    const dx = wp.x - msgNpc.x;
    const dz = wp.z - msgNpc.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.6) {
      const speed = 3.1;
      const step = Math.min(dist, speed * dt);
      msgNpc.x += (dx / dist) * step;
      msgNpc.z += (dz / dist) * step;
      msgNpc.heading = Math.atan2(dx, dz);
      msgNpc.idle = 'walk';
    } else {
      // Reached waypoint
      if (wp.ambush && !escortState.triggeredAmbushes.has(wp.ambushId)) {
        escortState.triggeredAmbushes.add(wp.ambushId);
        const ambMsg =
          ctx.i18n?.t?.('toast.escort.ambush') || '峽谷伏兵出現！保護那爛陀信使！';
        ctx.hud?.toast?.(ambMsg);
        const kinds = wp.ambushId === 3 ? ['droughtSprite', 'dustDevil', 'droughtSprite'] : ['droughtSprite', 'dustDevil'];
        kinds.forEach((k, idx) => {
          const sx = wp.x + (idx - 0.5) * 4.0;
          const sz = wp.z + (idx % 2 === 0 ? -4.5 : 4.5);
          ctx.enemies?.spawn?.(k, {
            position: { x: sx, y: getHeight(sx, sz), z: sz },
            level: 7,
          });
        });
      }

      if (wp.final) {
        escortState.active = false;
        escortState.arrived = true;
        msgNpc.idle = 'stand';
        ctx.quests?.setFlag?.('ch1.escort.arrived', true);
        const arrMsg =
          ctx.i18n?.t?.('toast.escort.arrived') ||
          '那爛陀信使已安全抵達揚列雪洞口！';
        ctx.hud?.toast?.(arrMsg);
        ctx.bus.emit('escort:arrived', { npcId: 'messenger' });
      } else {
        escortState.wpIndex++;
      }
    }
  }

  // ---------------------------------------------------------------- 10. Rain Transformation (`ch1.rain`) & Rain Particle System
  const rainCount = 420;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3 + 0] = origin.x + (Math.random() - 0.5) * 160;
    rainPositions[i * 3 + 1] = Math.random() * 24;
    rainPositions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 160;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0xbae6fd,
    size: 0.22,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  rainPoints.name = 'PharpingRainParticles';
  rainPoints.visible = false;
  group.add(rainPoints);

  let rainActive = false;
  let rainMix = 0;
  let rainChimeTimer = 0;

  function applyRainTransformation(immediate = false) {
    if (!rainActive) {
      rainActive = true;
      rainPoints.visible = true;
      wellWaterMesh.visible = true;
      for (const sp of springs) {
        sp.inspected = true;
        sp.waterDisc.visible = true;
        sp.waterDisc.scale.setScalar(1.0);
      }
      for (const c of treeCanopies) {
        c.visible = true;
      }
    }
    if (immediate && rainMix < 1) {
      rainMix = 1;
      updateTerrainColors(1);
    }
  }

  ctx.bus.on('pharping:rain', () => {
    applyRainTransformation(false);
  });

  // Sync lit lamps & rain state if revisited after completion
  function syncPersistedState() {
    if (ctx.quests?.hasFlag?.('ch1.lamps.lit') || ctx.quests?.hasFlag?.('ch1.lamps.done')) {
      for (const l of lampNiches) {
        l.lit = true;
        l.flameGrp.visible = true;
        if (l.lampPoolMat) l.lampPoolMat.opacity = 0.62;
      }
    }
    if (ctx.quests?.hasFlag?.('ch1.drought.done')) {
      for (const sp of springs) {
        sp.inspected = true;
        sp.waterDisc.visible = true;
        sp.waterDisc.scale.setScalar(rainActive ? 1.0 : 0.52);
      }
    }
    if (ctx.quests?.hasFlag?.('ch1.rain') || ctx.quests?.hasFlag?.('ch1.done')) {
      applyRainTransformation(!rainActive);
    }
  }

  // ---------------------------------------------------------------- 11. Per-Frame Update
  let animTime = 0;
  function update(dt) {
    animTime += dt;
    syncPersistedState();

    // Animate lit cave butter lamps, floor light pools & check lamp attackers
    const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
    let litLampCount = 0;
    for (const l of lampNiches) {
      if (l.lit) {
        litLampCount++;
        const flicker = Math.sin(animTime * 9.0 + l.index * 1.4);
        const s = 0.92 + flicker * 0.14;
        l.flameGrp.scale.set(s, s, s);
        if (l.lampPoolMat) {
          l.lampPoolMat.opacity = 0.56 + flicker * 0.08;
        }
      } else if (l.lampPoolMat) {
        l.lampPoolMat.opacity = 0.08;
      }
    }

    // Scale central cave sanctuary & ceiling bounce glow with lit butter lamps
    const lampProgress = litLampCount / 7;
    sanctuaryGlowMat.opacity =
      0.16 + lampProgress * 0.42 + Math.sin(animTime * 3.2) * 0.03;
    vaultBounceMat.opacity =
      0.12 + lampProgress * 0.28 + Math.cos(animTime * 2.8) * 0.025;
    altarGlowMat.opacity =
      0.44 + lampProgress * 0.24 + Math.sin(animTime * 4.0) * 0.04;
    shaftMat.opacity = 0.09 + Math.sin(animTime * 1.9) * 0.025;

    // Gentle upward drift for Yangleshö Cave dust motes
    const dustArr = caveDustGeo.attributes.position.array;
    for (let i = 0; i < caveDustCount; i++) {
      const idx = i * 3;
      dustArr[idx + 1] += dt * (0.14 + (i % 3) * 0.04);
      dustArr[idx + 0] += Math.sin(animTime * 1.1 + i) * dt * 0.05;
      if (dustArr[idx + 1] > 5.2) {
        dustArr[idx + 1] = 0.45;
      }
    }
    caveDustGeo.attributes.position.needsUpdate = true;

    // Check if any lamp-attacker enemy reached a lit lamp to blow it out
    if (!ctx.quests?.hasFlag?.('ch1.lamps.lit')) {
      for (const e of activeEnemies) {
        if (!e.isLampAttacker || e.hp <= 0) continue;
        for (const l of lampNiches) {
          if (!l.lit) continue;
          const d = Math.hypot(e.group.position.x - l.x, e.group.position.z - l.z);
          if (d <= 1.85) {
            l.lit = false;
            l.flameGrp.visible = false;
            if (l.lampPoolMat) l.lampPoolMat.opacity = 0.08;
            e.isLampAttacker = false;
            ctx.bus.emit('quest:interact', { target: 'yangleshoLamp', count: -1 });
            const extMsg =
              ctx.i18n?.t?.('toast.lamp.extinguished') ||
              '一盞酥油燈被熱風吹滅了！請擊退敵人並重新點燃（F）！';
            ctx.hud?.toast?.(extMsg);
            break;
          }
        }
      }
    }

    // Update escort quest (C1-3)
    updateEscort(dt);

    // Update Rain Transformation visuals & ambient raindrop particles
    if (rainActive) {
      if (rainMix < 1) {
        rainMix = Math.min(1, rainMix + dt * 0.45);
        updateTerrainColors(rainMix);
        for (const c of treeCanopies) {
          c.scale.setScalar(Math.max(0.05, rainMix));
        }
      }

      const pPos = ctx.state?.player?.position || origin;
      const arr = rainGeo.attributes.position.array;
      for (let i = 0; i < rainCount; i++) {
        const idx = i * 3;
        arr[idx + 1] -= dt * 16.5;
        if (arr[idx + 1] < 0.2) {
          arr[idx + 0] = pPos.x + (Math.random() - 0.5) * 70;
          arr[idx + 1] = 18 + Math.random() * 8;
          arr[idx + 2] = pPos.z + (Math.random() - 0.5) * 70;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;

      // Subtle water shimmer
      wellWaterMat.emissiveIntensity = 0.42 + Math.sin(animTime * 3.2) * 0.12;
      springWaterMat.emissiveIntensity = 0.46 + Math.cos(animTime * 3.6) * 0.14;

      // Occasional gentle rain/bird chime via procedural sfx
      rainChimeTimer -= dt;
      if (rainChimeTimer <= 0) {
        rainChimeTimer = 6.5 + Math.random() * 4.0;
        ctx.bus.emit('sfx', { name: 'chime' });
      }
    }
  }

  return {
    group,
    getHeight,
    update,
    springs,
    lampNiches,
    escortState,
    isRaining: () => rainActive,
  };
}

export default createMap;
