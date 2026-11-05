import * as THREE from 'three';
import {
  createHeightfieldTerrain,
  scatterRocks,
  addRimMountains,
  seededRandom,
  buildGateArch,
} from '../mapBase.js';

/**
 * Sandbox debug map (origin x = 9000, z = 0).
 * Flat practice arena with scattered rocks and a return gate to the Stupa.
 */
export function createMap(ctx) {
  const mapDef = ctx.world?.getMap('sandbox') || {
    id: 'sandbox',
    origin: { x: 9000, z: 0 },
    walkRadius: 60,
    gates: [{ id: 'south', x: 9000, z: 50, radius: 3.5, to: 'stupa', toGate: 'north', labelKey: 'prompt.returnStupa' }],
  };
  const origin = mapDef.origin || { x: 9000, z: 0 };

  const group = ctx.zoneGroups?.sandbox || new THREE.Group();
  group.name = 'SandboxMap';
  if (!ctx.zoneGroups?.sandbox) {
    ctx.scene.add(group);
  }

  // Flat terrain with subtle gentle rim outside walkable radius
  const getHeight = (x, z) => {
    const dx = x - origin.x;
    const dz = z - origin.z;
    const r = Math.hypot(dx, dz);
    if (r <= 52) return 0;
    const rim = (r - 52) / 28;
    return rim * rim * 8.0;
  };

  const grassCol = new THREE.Color(0x7c8662);
  const plazaCol = new THREE.Color(0x9e9278);
  const slateCol = new THREE.Color(0x64605a);
  const tmpCol = new THREE.Color();

  const { mesh: terrainMesh } = createHeightfieldTerrain(ctx, {
    origin,
    size: 160,
    segments: 64,
    heightFn: getHeight,
    colorFn: (wx, wz, y, lx, lz) => {
      const r = Math.hypot(lx, lz);
      if (y > 1.5) {
        return tmpCol.lerpColors(grassCol, slateCol, Math.min(1, (y - 1.5) / 5));
      }
      if (r < 14) {
        return tmpCol.lerpColors(plazaCol, grassCol, r / 14);
      }
      return grassCol;
    },
  });
  group.add(terrainMesh);

  // Distant mountain rim
  addRimMountains(ctx, group, {
    origin,
    innerR: 115,
    outerR: 165,
    count: 18,
    heightRange: [32, 62],
  });

  // Return gate at south side (9000, 50)
  const gateCfg = (mapDef.gates && mapDef.gates[0]) || { x: origin.x, z: origin.z + 50 };
  buildGateArch(ctx, group, {
    mapId: 'sandbox',
    x: gateCfg.x,
    z: gateCfg.z,
    y: getHeight(gateCfg.x, gateCfg.z),
  });

  // Scatter rocks using InstancedMesh + colliders
  const rng = seededRandom(2026);
  scatterRocks(ctx, group, {
    mapId: 'sandbox',
    origin,
    count: 10,
    rng,
    area: { minR: 12, maxR: 44 },
    minRadius: 1.1,
    maxRadius: 2.1,
    minSpacing: 8,
    avoid: [
      { x: origin.x, z: origin.z, r: 10 },
      { x: origin.x, z: origin.z + 12, r: 6 },
      { x: origin.x + 12, z: origin.z + 6, r: 6 },
      { x: origin.x - 12, z: origin.z + 6, r: 6 },
      { x: gateCfg.x, z: gateCfg.z, r: 12 },
    ],
    getHeight,
  });

  // ---------------------------------------------------------------- Quest Trial Props (#28)
  // 1. East Trial Stone Circle (`reach` step target at 9012, 6)
  const reachX = origin.x + 12;
  const reachZ = origin.z + 6;
  const reachGroup = new THREE.Group();
  reachGroup.position.set(reachX, getHeight(reachX, reachZ), reachZ);
  const stoneRingGeo = new THREE.RingGeometry(2.8, 3.3, 32);
  stoneRingGeo.rotateX(-Math.PI / 2);
  const stoneRingMat = new THREE.MeshBasicMaterial({
    color: 0xeec36c,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const stoneRing = new THREE.Mesh(stoneRingGeo, stoneRingMat);
  stoneRing.position.y = 0.03;
  reachGroup.add(stoneRing);

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a8275, roughness: 0.85 });
  const pillarGeo = new THREE.BoxGeometry(0.35, 1.1, 0.35);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(Math.cos(a) * 3.1, 0.55, Math.sin(a) * 3.1);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    reachGroup.add(pillar);
  }
  group.add(reachGroup);

  // 2. Central Trial Mani Stone Cairn (`interact` step target `sandbox_mani` at 9000, 0)
  const maniX = origin.x;
  const maniZ = origin.z;
  const maniY = getHeight(maniX, maniZ);
  const maniGroup = new THREE.Group();
  maniGroup.position.set(maniX, maniY, maniZ);

  const maniStoneMat = new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.78 });
  const maniGoldMat = new THREE.MeshStandardMaterial({
    color: 0xe8b84b,
    emissive: 0xc87a18,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.3,
  });

  const tiers = [
    { r: 0.95, h: 0.34, y: 0.17 },
    { r: 0.72, h: 0.30, y: 0.48 },
    { r: 0.50, h: 0.28, y: 0.76 },
    { r: 0.30, h: 0.24, y: 1.00 },
  ];
  for (const t of tiers) {
    const g = new THREE.CylinderGeometry(t.r * 0.88, t.r, t.h, 8);
    const m = new THREE.Mesh(g, maniStoneMat);
    m.position.y = t.y;
    m.castShadow = true;
    m.receiveShadow = true;
    maniGroup.add(m);
  }

  const spireGeo = new THREE.ConeGeometry(0.16, 0.45, 8);
  const spire = new THREE.Mesh(spireGeo, maniGoldMat);
  spire.position.y = 1.34;
  maniGroup.add(spire);
  group.add(maniGroup);

  ctx.colliders.push({
    type: 'circle',
    x: maniX,
    z: maniZ,
    r: 1.05,
    zone: 'sandbox',
  });

  const maniPosVec = new THREE.Vector3(maniX, maniY, maniZ);
  ctx.interactables.push({
    id: 'quest-interact-sandbox_mani',
    kind: 'questInteract',
    zone: 'sandbox',
    action: 'interact',
    labelKey: 'prompt.inspectQuest',
    radius: 2.8,
    getPosition: () => maniPosVec,
    isAvailable: () => (ctx.state.zone || 'stupa') === 'sandbox' && !ctx.state.uiOpen,
    onInteract: () => {
      ctx.bus.emit('sfx', { name: 'bowl' });
      ctx.bus.emit('quest:interact', { target: 'sandbox_mani', count: 1 });
    },
  });

  return {
    group,
    getHeight,
    update(_dt) {},
  };
}

export default createMap;
