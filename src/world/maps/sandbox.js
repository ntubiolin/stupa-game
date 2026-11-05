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
      { x: gateCfg.x, z: gateCfg.z, r: 12 },
    ],
    getHeight,
  });

  return {
    group,
    getHeight,
    update(_dt) {},
  };
}

export default createMap;
