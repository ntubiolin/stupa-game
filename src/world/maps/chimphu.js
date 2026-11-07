/**
 * Chapter 5 Hub Scene — Chimphu Hermitage (`chimphu`, `src/world/maps/chimphu.js`) — Issue #36
 *
 * High-mountain meditation sanctuary on Mount Nari northeast of Samye Monastery:
 *   - Northern cliffside & retreat caves (`巖洞`) at z = -35..-55
 *   - Terma Realm Stone Gate (`伏藏秘境石門`) at (6000, -40) with glowing Tibetan syllables
 *   - Small Tibetan retreat huts (`閉關房`) at (-18, -5) and (20, -8) + meditation cushions
 *   - Stone steps (`石階`) leading from the south terrace to the northern cave
 *   - Five-color prayer flags (`經幡`) and pine/juniper trees (`松柏`)
 *   - Amrita Refill Spring (`青朴甘露泉`) at (5988, 12) restoring HP/MP & Amrita pills
 *   - South-facing Scenic Overlook (`景觀台`) at (6000, 40) with a distant vista of
 *     Samye Monastery and the Yarlung Tsangpo River far below
 *
 * Strictly zero PointLights (uses emissive MeshStandardMaterial & AdditiveBlending).
 */
import * as THREE from 'three';
import { CHIMPHU_MAP } from '../../data/maps/chimphu.js';
import {
  createHeightfieldTerrain,
  addRimMountains,
  buildGateArch,
  pushCollider,
} from '../mapBase.js';
import { i18n } from '../../i18n.js';

function createPrayerFlagString(startVec, endVec, { count = 12, sag = 0.55 } = {}) {
  const grp = new THREE.Group();
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x3b2f24 });
  const flagColors = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308]; // Blue, White, Red, Green, Yellow
  const flagGeo = new THREE.PlaneGeometry(0.42, 0.52);

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = THREE.MathUtils.lerp(startVec.x, endVec.x, t);
    const z = THREE.MathUtils.lerp(startVec.z, endVec.z, t);
    const baseY = THREE.MathUtils.lerp(startVec.y, endVec.y, t);
    const y = baseY - Math.sin(t * Math.PI) * sag;

    const flagMat = new THREE.MeshStandardMaterial({
      color: flagColors[i % flagColors.length],
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(x, y - 0.24, z);
    flag.rotation.y = Math.atan2(endVec.x - startVec.x, endVec.z - startVec.z) + Math.PI / 2;
    grp.add(flag);
  }

  // Thin cord segment
  const dist = startVec.distanceTo(endVec);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, dist, 5), ropeMat);
  cord.position.copy(startVec).lerp(endVec, 0.5);
  cord.position.y -= sag * 0.35;
  cord.lookAt(endVec);
  cord.rotateX(Math.PI / 2);
  grp.add(cord);

  return grp;
}

let _chimphuGlowTex = null;
function getChimphuGlowTexture() {
  if (_chimphuGlowTex) return _chimphuGlowTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    const grad = c.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.32, 'rgba(255, 236, 190, 0.72)');
    grad.addColorStop(0.68, 'rgba(180, 235, 225, 0.24)');
    grad.addColorStop(1.0, 'rgba(45, 212, 191, 0.0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  _chimphuGlowTex = tex;
  return tex;
}

function makeSyllablePlaqueTexture(text, subText = '') {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle dark stone backing with golden border
  const grad = g.createRadialGradient(256, 128, 20, 256, 128, 240);
  grad.addColorStop(0, 'rgba(20, 42, 48, 0.92)');
  grad.addColorStop(1, 'rgba(10, 16, 22, 0.0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);

  g.strokeStyle = 'rgba(251, 191, 36, 0.85)';
  g.lineWidth = 4;
  g.strokeRect(24, 24, 464, 208);

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#2dd4bf';
  g.shadowBlur = 22;
  g.fillStyle = '#fde68a';
  g.font = 'bold 74px "Noto Serif Tibetan", "Kailasa", serif';
  g.fillText(text, 256, subText ? 105 : 128);

  if (subText) {
    g.shadowBlur = 14;
    g.fillStyle = '#5eead4';
    g.font = 'bold 42px "Noto Serif Tibetan", "PingFang TC", serif';
    g.fillText(subText, 256, 182);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildChimphuMap(ctx) {
  const { scene, state, bus } = ctx;
  const ox = CHIMPHU_MAP.origin.x; // 6000
  const oz = CHIMPHU_MAP.origin.z; // 0

  function getTerrainHeight(wx, wz) {
    const lx = wx - ox;
    const lz = wz - oz;
    // Gentle upward slope toward the northern cliff caves (z < 0 is higher)
    let h = 0;
    if (lz < 20) {
      h += Math.min(3.6, Math.max(0, (20 - lz) * 0.055));
    }
    // Slight dip toward southern overlook edge
    if (lz > 34) {
      h -= Math.min(0.6, (lz - 34) * 0.04);
    }
    // Subtle natural undulation away from main central stone path
    const pathFactor = Math.min(1, Math.abs(lx) / 8);
    h += pathFactor * (Math.sin(lx * 0.09) * 0.22 + Math.cos(lz * 0.08) * 0.18);
    return h;
  }

  const group = ctx.zoneGroups?.chimphu || new THREE.Group();
  group.name = 'ChimphuMap';
  if (!ctx.zoneGroups?.chimphu && scene) {
    scene.add(group);
  }
  const colliders = [];
  const interactables = [];
  const disposables = [];

  const mossCol = new THREE.Color(0x4b5d49);
  const cliffCol = new THREE.Color(0x525954);
  const pathCol = new THREE.Color(0x747b74);
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin: CHIMPHU_MAP.origin,
    size: 180,
    segments: 84,
    heightFn: getTerrainHeight,
    colorFn(wx, wz, y, lx, lz) {
      if (Math.abs(lx) < 3.4 && lz > -38 && lz < 44) {
        return pathCol;
      }
      if (lz < -28) {
        return cliffCol;
      }
      const n = Math.sin(lx * 0.1) * Math.cos(lz * 0.1) * 0.5 + 0.5;
      return tmpCol.lerpColors(mossCol, cliffCol, n * 0.35);
    },
  });
  group.add(terrainMesh);

  addRimMountains(ctx, group, {
    origin: CHIMPHU_MAP.origin,
    innerR: 92,
    outerR: 150,
    count: 20,
    heightRange: [34, 68],
  });

  // South exit gate arch at (6000, 48) back to Samye
  buildGateArch(ctx, group, {
    mapId: 'chimphu',
    x: ox,
    z: oz + 48,
    y: getTerrainHeight(ox, oz + 48),
  });

  // Connect colliders & interactables into ctx
  function registerCollider(c) {
    const col = { ...c, zone: 'chimphu' };
    colliders.push(col);
    pushCollider(ctx, 'chimphu', c);
  }

  function registerInteractable(it) {
    interactables.push(it);
    if (Array.isArray(ctx.interactables)) ctx.interactables.push(it);
  }

  // Materials (Zero PointLights)
  const cliffRockMat = new THREE.MeshStandardMaterial({
    color: 0x4a524d,
    roughness: 0.92,
    metalness: 0.06,
  });
  const mossRockMat = new THREE.MeshStandardMaterial({
    color: 0x3f5642,
    roughness: 0.9,
    metalness: 0.05,
  });
  const stepStoneMat = new THREE.MeshStandardMaterial({
    color: 0x7c857e,
    roughness: 0.85,
    metalness: 0.08,
  });
  const whiteWallMat = new THREE.MeshStandardMaterial({
    color: 0xe7e2d5,
    roughness: 0.86,
  });
  const maroonTrimMat = new THREE.MeshStandardMaterial({
    color: 0x7c2321,
    roughness: 0.8,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c3e26,
    roughness: 0.85,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    metalness: 0.75,
    emissive: 0xd97706,
    emissiveIntensity: 0.75,
  });
  const termaCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0x14b8a6,
    emissiveIntensity: 1.5,
    toneMapped: false,
  });
  const pineTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3525,
    roughness: 0.9,
  });
  const pineLeafMat = new THREE.MeshStandardMaterial({
    color: 0x284632,
    roughness: 0.85,
  });
  disposables.push(
    cliffRockMat,
    mossRockMat,
    stepStoneMat,
    whiteWallMat,
    maroonTrimMat,
    woodMat,
    goldTrimMat,
    termaCrystalMat,
    pineTrunkMat,
    pineLeafMat,
  );

  // ---------------------------------------------------------------- 1. Stone Steps (`石階`) & Central Terrace
  const stepGeo = new THREE.BoxGeometry(5.6, 0.28, 1.5);
  disposables.push(stepGeo);
  for (let i = 0; i < 36; i++) {
    const lz = 26 - i * 1.7;
    const wy = getTerrainHeight(ox, oz + lz);
    const step = new THREE.Mesh(stepGeo, stepStoneMat);
    step.position.set(ox, wy + 0.06, oz + lz);
    step.receiveShadow = true;
    group.add(step);
  }

  // Upper stone meditation terrace in front of the caves (`z = -16 .. -30`)
  const terraceGeo = new THREE.CylinderGeometry(11.5, 12.5, 0.4, 24);
  disposables.push(terraceGeo);
  const terrace = new THREE.Mesh(terraceGeo, stepStoneMat);
  terrace.position.set(ox, getTerrainHeight(ox, oz - 20) + 0.05, oz - 20);
  terrace.receiveShadow = true;
  group.add(terrace);

  // Yeshe Tsogyal's low stone table with yellow parchment Terma scrolls (`黃紙伏藏卷`)
  const tableGroup = new THREE.Group();
  const tableY = getTerrainHeight(ox + 1.8, oz - 15.2);
  tableGroup.position.set(ox + 1.8, tableY, oz - 15.2);
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.9), woodMat);
  tableTop.position.y = 0.58;
  const tableBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.52, 0.7), stepStoneMat);
  tableBase.position.y = 0.26;
  const scrollMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.45,
    emissive: 0xb45309,
    emissiveIntensity: 0.45,
  });
  disposables.push(scrollMat);
  for (let s = 0; s < 3; s++) {
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.52, 10), scrollMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = (s - 1) * 0.22;
    scroll.position.set(-0.35 + s * 0.35, 0.7, (s % 2) * 0.12 - 0.06);
    tableGroup.add(scroll);
  }
  tableGroup.add(tableBase, tableTop);
  group.add(tableGroup);

  // ---------------------------------------------------------------- 2. Northern Cliffside & Retreat Caves (`巖洞`)
  const glowTex = getChimphuGlowTexture();
  const innerVaultMat = new THREE.MeshStandardMaterial({
    color: 0x162126,
    roughness: 0.94,
    metalness: 0.06,
    emissive: 0x0a1418,
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
  });
  disposables.push(innerVaultMat);

  const cliffPlacements = [
    { lx: -34, lz: -38, rx: 12, ry: 18, rz: 10 },
    { lx: -20, lz: -44, rx: 11, ry: 22, rz: 11 },
    { lx: -9, lz: -45, rx: 9, ry: 20, rz: 10 },
    { lx: 0, lz: -48, rx: 14, ry: 25, rz: 10 },
    { lx: 10, lz: -45, rx: 9, ry: 20, rz: 10 },
    { lx: 22, lz: -43, rx: 12, ry: 21, rz: 11 },
    { lx: 35, lz: -37, rx: 12, ry: 17, rz: 10 },
  ];
  const cliffGeo = new THREE.DodecahedronGeometry(1, 1);
  disposables.push(cliffGeo);
  for (const c of cliffPlacements) {
    const wx = ox + c.lx;
    const wz = oz + c.lz;
    const wy = getTerrainHeight(wx, wz);
    const mesh = new THREE.Mesh(cliffGeo, cliffRockMat);
    mesh.position.set(wx, wy + c.ry * 0.42, wz);
    mesh.scale.set(c.rx, c.ry, c.rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (Math.abs(c.lx) > 7) {
      registerCollider({ type: 'circle', x: wx, z: wz, r: c.rx * 0.65 });
    }
  }

  // Grand Overhanging Northern Cavern Vault (`青朴大巖窟穹頂`) covering Guru Cave (lz = -24),
  // flanking meditation alcoves (lz = -36), and the Terma Stone Gate (lz = -40)
  const cavernVaultGroup = new THREE.Group();
  cavernVaultGroup.name = 'ChimphuNorthernCavernVault';
  const vaultBaseY = getTerrainHeight(ox, oz - 34);
  cavernVaultGroup.position.set(ox, vaultBaseY, oz - 34);
  group.add(cavernVaultGroup);

  const vaultInnerDome = new THREE.Mesh(
    new THREE.SphereGeometry(22.5, 24, 14, Math.PI * 0.94, Math.PI * 1.12, 0, Math.PI * 0.56),
    innerVaultMat,
  );
  vaultInnerDome.position.set(0, 0.5, 2.0);
  vaultInnerDome.scale.set(1.22, 0.52, 0.85);
  cavernVaultGroup.add(vaultInnerDome);

  // Overlapping rock ceiling slabs forming the cliff overhang from lz = -19 to lz = -48
  const roofSlabs = [
    { x: 0, y: 10.6, z: 3.5, sx: 18.5, sy: 2.6, sz: 9.8 },
    { x: -13.5, y: 10.2, z: 2.0, sx: 11.5, sy: 2.5, sz: 8.8 },
    { x: 13.5, y: 10.2, z: 2.0, sx: 11.5, sy: 2.5, sz: 8.8 },
    { x: 0, y: 12.8, z: -3.5, sx: 21.0, sy: 3.4, sz: 9.5 },
    { x: 0, y: 16.5, z: -8.5, sx: 18.0, sy: 4.8, sz: 8.5 },
  ];
  for (let i = 0; i < roofSlabs.length; i++) {
    const rs = roofSlabs[i];
    const slab = new THREE.Mesh(cliffGeo, cliffRockMat);
    slab.position.set(rs.x, rs.y, rs.z);
    slab.scale.set(rs.sx, rs.sy, rs.sz);
    slab.rotation.y = i * 0.28;
    slab.castShadow = true;
    slab.receiveShadow = true;
    cavernVaultGroup.add(slab);
  }

  // Hanging limestone & glowing turquoise crystal stalactites under the northern cavern vault
  const stalGeo = new THREE.ConeGeometry(0.35, 1.85, 6);
  disposables.push(stalGeo);
  for (let i = 0; i < 18; i++) {
    const sx = -18 + (i / 17) * 36 + ((i % 3) - 1) * 0.9;
    const sz = -4.5 + (i % 4) * 3.2;
    const isCrystal = i % 3 === 1;
    const stal = new THREE.Mesh(stalGeo, isCrystal ? termaCrystalMat : mossRockMat);
    stal.position.set(sx, 8.2 - Math.abs(sx) * 0.04, sz);
    stal.rotation.x = Math.PI;
    stal.scale.set(0.8 + (i % 3) * 0.25, 0.85 + (i % 4) * 0.3, 0.8 + (i % 3) * 0.25);
    cavernVaultGroup.add(stal);
  }

  // Secondary 3D meditation cave grottoes flanking the central gate (`(±15, -36)`)
  const poolGeo = new THREE.PlaneGeometry(1, 1);
  poolGeo.rotateX(-Math.PI / 2);
  const lampFlameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.65, 0.55),
    toneMapped: false,
  });
  const lampHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffa834,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const alcoveLampFlames = [];
  disposables.push(poolGeo, lampFlameMat, lampHaloMat);

  for (const side of [-1, 1]) {
    const caveX = ox + side * 15;
    const caveZ = oz - 36;
    const caveY = getTerrainHeight(caveX, caveZ);
    const alcoveGrp = new THREE.Group();
    alcoveGrp.position.set(caveX, caveY, caveZ);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.82, 10, 18, Math.PI), mossRockMat);
    arch.position.set(0, 0.2, 0);
    const grottoShell = new THREE.Mesh(
      new THREE.SphereGeometry(2.75, 14, 10, Math.PI * 0.95, Math.PI * 1.1, 0, Math.PI * 0.58),
      innerVaultMat,
    );
    grottoShell.position.set(0, 0.1, -0.2);
    const grottoRoof = new THREE.Mesh(cliffGeo, mossRockMat);
    grottoRoof.position.set(0, 3.6, -1.2);
    grottoRoof.scale.set(3.8, 1.4, 2.8);

    // Stone meditation seat & lit butter lamp inside each alcove
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.98, 0.32, 12), stepStoneMat);
    seat.position.set(0, 0.16, -0.9);
    const lampBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.16, 10), goldTrimMat);
    lampBowl.position.set(side * -0.95, 0.42, -0.45);
    const flameGrp = new THREE.Group();
    flameGrp.position.set(side * -0.95, 0.62, -0.45);
    const fCone = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.25, 8), lampFlameMat);
    const fHalo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), lampHaloMat);
    flameGrp.add(fCone, fHalo);
    alcoveLampFlames.push(flameGrp);

    const alcovePool = new THREE.Mesh(
      poolGeo,
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0xffb347,
        transparent: true,
        opacity: 0.54,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    alcovePool.position.set(0, 0.04, -0.5);
    alcovePool.scale.set(4.8, 1, 4.8);

    alcoveGrp.add(arch, grottoShell, grottoRoof, seat, lampBowl, flameGrp, alcovePool);
    group.add(alcoveGrp);
  }

  // Sacred Cavern Lighting Pools & Crepuscular Light Shafts under the Northern Cliff Vault (0 PointLights)
  const guruSanctumPoolMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0xffbe55,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const guruSanctumPool = new THREE.Mesh(poolGeo, guruSanctumPoolMat);
  guruSanctumPool.position.set(ox, getTerrainHeight(ox, oz - 24) + 0.04, oz - 24);
  guruSanctumPool.scale.set(7.5, 1, 7.5);
  group.add(guruSanctumPool);

  const gateThresholdPoolMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    color: 0x2dd4bf,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const gateThresholdPool = new THREE.Mesh(poolGeo, gateThresholdPoolMat);
  gateThresholdPool.position.set(ox, getTerrainHeight(ox, oz - 38.5) + 0.05, oz - 38.5);
  gateThresholdPool.scale.set(9.5, 1, 8.0);
  group.add(gateThresholdPool);

  const cavernShaftMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a0,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  for (const side of [-1, 1]) {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.6, 8.2, 14, 1, true),
      cavernShaftMat,
    );
    shaft.position.set(ox + side * 6.5, vaultBaseY + 4.2, oz - 25.5);
    shaft.rotation.x = -0.28;
    shaft.rotation.z = side * 0.14;
    group.add(shaft);
  }
  disposables.push(guruSanctumPoolMat, gateThresholdPoolMat, cavernShaftMat);

  // Floating golden-turquoise prana dust motes beneath the Northern Cavern Vault
  const chimphuDustCount = 44;
  const chimphuDustGeo = new THREE.BufferGeometry();
  const chimphuDustPos = new Float32Array(chimphuDustCount * 3);
  for (let i = 0; i < chimphuDustCount; i++) {
    chimphuDustPos[i * 3 + 0] = ox + (((i * 29) % 36) - 18);
    chimphuDustPos[i * 3 + 1] = vaultBaseY + 0.6 + ((i * 13) % 12) * 0.52;
    chimphuDustPos[i * 3 + 2] = oz - 22 - ((i * 17) % 18);
  }
  chimphuDustGeo.setAttribute('position', new THREE.BufferAttribute(chimphuDustPos, 3));
  const chimphuDustMat = new THREE.PointsMaterial({
    color: 0x99f6e4,
    size: 0.15,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const chimphuDustPoints = new THREE.Points(chimphuDustGeo, chimphuDustMat);
  chimphuDustPoints.name = 'ChimphuCavernDust';
  group.add(chimphuDustPoints);
  disposables.push(chimphuDustGeo, chimphuDustMat);

  // ---------------------------------------------------------------- 3. Terma Realm Stone Gate (`伏藏秘境石門`) at (6000, -40)
  const gateX = ox;
  const gateZ = oz - 40;
  const gateY = getTerrainHeight(gateX, gateZ);
  const termaGateGroup = new THREE.Group();
  termaGateGroup.name = 'TermaRealmStoneGate';
  termaGateGroup.position.set(gateX, gateY, gateZ);

  // Massive carved stone pillars & lintel
  const pillarGeo = new THREE.BoxGeometry(1.45, 5.6, 1.45);
  const leftPillar = new THREE.Mesh(pillarGeo, cliffRockMat);
  leftPillar.position.set(-2.9, 2.8, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, cliffRockMat);
  rightPillar.position.set(2.9, 2.8, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.25, 1.75), cliffRockMat);
  lintel.position.set(0, 5.7, 0);
  const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.65, 2.0), maroonTrimMat);
  upperBeam.position.set(0, 6.55, 0);
  const goldCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), goldTrimMat);
  goldCrest.position.set(0, 7.35, 0.2);

  // Glowing inner portal disc (emissive + additive rings, zero PointLights)
  const portalDiscMat = new THREE.MeshBasicMaterial({
    color: 0x0f2937,
    side: THREE.DoubleSide,
  });
  const portalDisc = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.0), portalDiscMat);
  portalDisc.position.set(0, 2.6, -0.2);

  const portalGlowMat = new THREE.MeshBasicMaterial({
    color: 0x2dd4bf,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const portalRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.1, 32), portalGlowMat);
  portalRing.position.set(0, 2.7, 0.05);

  const plaqueTex = makeSyllablePlaqueTexture('ཨོཾ་ཨཱཿ་ཧཱུྃ', 'གཏེར་མ · 伏藏秘境');
  const plaqueMat = new THREE.MeshBasicMaterial({
    map: plaqueTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), plaqueMat);
  plaqueMesh.position.set(0, 2.9, 0.12);

  // Embedded Terma crystals on the stone pillars
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const crys = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), termaCrystalMat);
      crys.scale.set(0.8, 1.7, 0.8);
      crys.position.set(side * 2.9, 1.4 + k * 1.4, 0.78);
      termaGateGroup.add(crys);
    }
  }

  termaGateGroup.add(
    leftPillar,
    rightPillar,
    lintel,
    upperBeam,
    goldCrest,
    portalDisc,
    portalRing,
    plaqueMesh,
  );
  group.add(termaGateGroup);
  disposables.push(pillarGeo, portalDiscMat, portalGlowMat, plaqueTex, plaqueMat);

  // Pillar colliders so player walks up to the gate threshold cleanly
  registerCollider({ type: 'circle', x: gateX - 2.9, z: gateZ, r: 0.9 });
  registerCollider({ type: 'circle', x: gateX + 2.9, z: gateZ, r: 0.9 });

  const gatePosVec = new THREE.Vector3(gateX, gateY, gateZ + 1.2);
  registerInteractable({
    id: 'chimphu-terma-gate',
    kind: 'termaGate',
    zone: 'chimphu',
    action: 'interact',
    labelKey: 'prompt.termaGate',
    radius: 4.5,
    getPosition: () => gatePosVec,
    isAvailable: () => state.zone === 'chimphu' && !state.uiOpen,
    onInteract() {
      bus.emit('sfx', { name: 'bell' });
      if (ctx.dungeon?.openTierSelect) {
        ctx.dungeon.openTierSelect();
      } else {
        bus.emit('dungeon:openTierSelect');
      }
    },
  });

  // ---------------------------------------------------------------- 4. Small Tibetan Retreat Huts (`閉關房`) & Meditation Cushions
  function buildRetreatHut(lx, lz, rotY, cushionOffset) {
    const wx = ox + lx;
    const wz = oz + lz;
    const wy = getTerrainHeight(wx, wz);
    const hut = new THREE.Group();
    hut.position.set(wx, wy, wz);
    hut.rotation.y = rotY;

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.7, 3.6), whiteWallMat);
    body.position.y = 1.35;
    body.castShadow = true;
    body.receiveShadow = true;

    const frieze = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.42, 3.72), maroonTrimMat);
    frieze.position.y = 2.48;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 4.0), woodMat);
    roof.position.y = 2.8;

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.75, 0.15), woodMat);
    door.position.set(0, 0.88, 1.82);

    hut.add(body, frieze, roof, door);
    group.add(hut);
    registerCollider({ type: 'circle', x: wx, z: wz, r: 2.35 });

    // Meditation cushion (`禪墊`) outside for retreatant NPC
    if (cushionOffset) {
      const cx = ox + cushionOffset.lx;
      const cz = oz + cushionOffset.lz;
      const cy = getTerrainHeight(cx, cz);
      const cushion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.72, 0.18, 16),
        maroonTrimMat,
      );
      cushion.position.set(cx, cy + 0.09, cz);
      const trim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.52, 0.2, 16),
        goldTrimMat,
      );
      trim.position.set(cx, cy + 0.1, cz);
      group.add(cushion, trim);
    }
  }

  buildRetreatHut(-18, -5, 0.35, { lx: -15, lz: -4 });
  buildRetreatHut(20, -8, -0.4, { lx: 16, lz: -6 });

  // ---------------------------------------------------------------- 5. Amrita Refill Spring (`青朴甘露泉`) at (5988, 12)
  const springX = ox - 12; // 5988
  const springZ = oz + 12; // 12
  const springY = getTerrainHeight(springX, springZ);
  const springGroup = new THREE.Group();
  springGroup.name = 'ChimphuAmritaSpring';
  springGroup.position.set(springX, springY, springZ);

  const basinOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.4, 0.65, 20),
    mossRockMat,
  );
  basinOuter.position.y = 0.32;
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.3,
    emissive: 0x0284c7,
    emissiveIntensity: 1.1,
  });
  const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.58, 20), waterMat);
  waterDisc.position.y = 0.36;

  // Golden Amrita Bowl in center of spring
  const amritaBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.35, 0.45, 16),
    goldTrimMat,
  );
  amritaBowl.position.y = 0.72;

  const springHaloMat = new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const springHalo = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.75, 28), springHaloMat);
  springHalo.rotation.x = -Math.PI / 2;
  springHalo.position.y = 0.68;

  springGroup.add(basinOuter, waterDisc, amritaBowl, springHalo);
  group.add(springGroup);
  disposables.push(waterMat, springHaloMat);
  registerCollider({ type: 'circle', x: springX, z: springZ, r: 1.8 });

  const springPosVec = new THREE.Vector3(springX, springY, springZ);
  registerInteractable({
    id: 'chimphu-amrita-spring',
    kind: 'amritaSpring',
    zone: 'chimphu',
    action: 'interact',
    labelKey: 'prompt.amritaSpring',
    radius: 3.4,
    getPosition: () => springPosVec,
    isAvailable: () => state.zone === 'chimphu' && !state.uiOpen,
    onInteract() {
      ctx.potions?.refillAll?.();
      ctx.potions?.refill?.();
      bus.emit('vitals:restore', { hp: 9999, mp: 9999, source: 'amritaSpring' });
      bus.emit('sfx', { name: 'potion' });
      bus.emit('toast', { key: 'toast.amritaSpringRefilled', kind: 'merit' });
    },
  });

  // ---------------------------------------------------------------- 6. South-Facing Scenic Overlook (`景觀台`) at (6000, 40) & Samye Vista
  const overlookX = ox;
  const overlookZ = oz + 40;
  const overlookY = getTerrainHeight(overlookX, overlookZ);
  const overlookGroup = new THREE.Group();
  overlookGroup.name = 'ChimphuScenicOverlook';
  overlookGroup.position.set(overlookX, overlookY, overlookZ);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 0.5, 20), stepStoneMat);
  deck.position.y = 0.2;
  overlookGroup.add(deck);

  // Stone balustrade posts along the southern rim
  for (let i = -3; i <= 3; i++) {
    const ang = i * 0.26;
    const px = Math.sin(ang) * 5.0;
    const pz = Math.cos(ang) * 4.6;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.05, 0.36), whiteWallMat);
    post.position.set(px, 0.72, pz);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), goldTrimMat);
    cap.position.set(px, 1.28, pz);
    overlookGroup.add(post, cap);
  }
  group.add(overlookGroup);

  // Distant Vista of the Yarlung Tsangpo River & Samye Monastery far below in the valley
  const vistaGroup = new THREE.Group();
  vistaGroup.name = 'SamyeValleyVista';
  vistaGroup.position.set(ox, -16, oz + 108);

  const riverRibbonMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.25,
    metalness: 0.4,
    emissive: 0x0369a1,
    emissiveIntensity: 0.5,
  });
  const riverRibbon = new THREE.Mesh(new THREE.PlaneGeometry(220, 18), riverRibbonMat);
  riverRibbon.rotation.x = -Math.PI / 2;
  riverRibbon.position.set(0, -2, 16);

  // Miniature Samye Mandala silhouette (circular wall + 3-tier golden Utse + 4 stupas)
  const vistaWall = new THREE.Mesh(
    new THREE.RingGeometry(11, 12.2, 32),
    whiteWallMat,
  );
  vistaWall.rotation.x = -Math.PI / 2;
  vistaWall.position.y = 0.2;
  const vistaUtse1 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.4, 6.5), whiteWallMat);
  vistaUtse1.position.y = 1.2;
  const vistaUtse2 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.8, 4.8), maroonTrimMat);
  vistaUtse2.position.y = 3.3;
  const vistaUtse3 = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 4), goldTrimMat);
  vistaUtse3.rotation.y = Math.PI / 4;
  vistaUtse3.position.y = 5.2;

  vistaGroup.add(riverRibbon, vistaWall, vistaUtse1, vistaUtse2, vistaUtse3);
  group.add(vistaGroup);
  disposables.push(riverRibbonMat);

  const overlookPosVec = new THREE.Vector3(overlookX, overlookY, overlookZ);
  registerInteractable({
    id: 'chimphu-overlook',
    kind: 'overlook',
    zone: 'chimphu',
    action: 'interact',
    labelKey: 'prompt.chimphuOverlook',
    radius: 3.8,
    getPosition: () => overlookPosVec,
    isAvailable: () => state.zone === 'chimphu' && !state.uiOpen,
    onInteract() {
      bus.emit('sfx', { name: 'bowl' });
      bus.emit('toast', { text: i18n.t('toast.chimphuOverlook'), kind: 'info' });
    },
  });

  // ---------------------------------------------------------------- 7. Pine/Juniper Trees (`松柏`) & Five-Color Prayer Flags (`經幡`)
  const pinePositions = [
    [-28, 18, 1.15],
    [-24, 4, 1.0],
    [-27, -16, 1.25],
    [-14, -26, 0.95],
    [15, -25, 1.05],
    [26, -18, 1.2],
    [29, 2, 1.1],
    [25, 18, 0.95],
    [-19, 28, 1.05],
    [19, 27, 1.1],
    [-34, -4, 1.3],
    [34, -6, 1.25],
  ];
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 7);
  const tier1Geo = new THREE.ConeGeometry(1.85, 2.6, 8);
  const tier2Geo = new THREE.ConeGeometry(1.45, 2.3, 8);
  const tier3Geo = new THREE.ConeGeometry(1.0, 1.9, 8);
  disposables.push(trunkGeo, tier1Geo, tier2Geo, tier3Geo);

  for (const [lx, lz, sc] of pinePositions) {
    const wx = ox + lx;
    const wz = oz + lz;
    const wy = getTerrainHeight(wx, wz);
    const tree = new THREE.Group();
    tree.position.set(wx, wy, wz);
    tree.scale.setScalar(sc);

    const trunk = new THREE.Mesh(trunkGeo, pineTrunkMat);
    trunk.position.y = 1.1;
    const c1 = new THREE.Mesh(tier1Geo, pineLeafMat);
    c1.position.y = 2.6;
    const c2 = new THREE.Mesh(tier2Geo, pineLeafMat);
    c2.position.y = 3.9;
    const c3 = new THREE.Mesh(tier3Geo, pineLeafMat);
    c3.position.y = 5.0;
    tree.add(trunk, c1, c2, c3);
    group.add(tree);
    registerCollider({ type: 'circle', x: wx, z: wz, r: 0.55 * sc });
  }

  // Prayer flag strings (`經幡`) draped across the hermitage valley
  const flagSpans = [
    [new THREE.Vector3(ox - 14, getTerrainHeight(ox - 14, oz - 26) + 4.2, oz - 26), new THREE.Vector3(ox - 3, getTerrainHeight(ox - 3, oz - 38) + 5.8, oz - 38)],
    [new THREE.Vector3(ox + 15, getTerrainHeight(ox + 15, oz - 25) + 4.2, oz - 25), new THREE.Vector3(ox + 3, getTerrainHeight(ox + 3, oz - 38) + 5.8, oz - 38)],
    [new THREE.Vector3(ox - 18, getTerrainHeight(ox - 18, oz - 5) + 3.0, oz - 5), new THREE.Vector3(ox - 12, getTerrainHeight(ox - 12, oz + 12) + 2.4, oz + 12)],
    [new THREE.Vector3(ox - 5, overlookY + 1.4, overlookZ), new THREE.Vector3(ox + 5, overlookY + 1.4, overlookZ)],
  ];
  for (const [a, b] of flagSpans) {
    const pf = createPrayerFlagString(a, b, { count: 14, sag: 0.65 });
    group.add(pf);
  }

  function update(dt, elapsed = state.elapsed || 0) {
    const pulse = 0.72 + Math.sin(elapsed * 2.6) * 0.24;
    portalRing.scale.setScalar(0.96 + Math.sin(elapsed * 2.0) * 0.05);
    portalGlowMat.opacity = 0.35 + pulse * 0.25;
    springHalo.rotation.z = elapsed * 0.45;
    springHaloMat.opacity = 0.4 + Math.sin(elapsed * 3.1) * 0.18;

    // Animate alcove butter lamps & northern cavern light pools
    for (let i = 0; i < alcoveLampFlames.length; i++) {
      const s = 0.92 + Math.sin(elapsed * 8.5 + i * 1.9) * 0.14;
      alcoveLampFlames[i].scale.set(s, s, s);
    }
    guruSanctumPoolMat.opacity = 0.44 + Math.sin(elapsed * 3.0) * 0.06;
    gateThresholdPoolMat.opacity = 0.48 + Math.cos(elapsed * 2.6) * 0.07;
    cavernShaftMat.opacity = 0.09 + Math.sin(elapsed * 1.8) * 0.025;

    // Gentle upward drift for Chimphu northern cavern dust motes
    const dustArr = chimphuDustGeo.attributes.position.array;
    for (let i = 0; i < chimphuDustCount; i++) {
      const idx = i * 3;
      dustArr[idx + 1] += dt * (0.14 + (i % 3) * 0.04);
      if (dustArr[idx + 1] > vaultBaseY + 7.2) {
        dustArr[idx + 1] = vaultBaseY + 0.6;
      }
    }
    chimphuDustGeo.attributes.position.needsUpdate = true;
  }

  return {
    group,
    colliders,
    interactables,
    disposables,
    getHeight: getTerrainHeight,
    update,
  };
}

export const createMap = buildChimphuMap;
export default buildChimphuMap;
