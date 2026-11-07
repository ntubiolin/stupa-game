/**
 * Chapter 5 Procedural Dungeon Scene Wrapper — The Terma Realm (`terma`, `src/world/maps/terma.js`) — Issue #36
 *
 * Wraps the `terma` map zone at (7000, 0) and delegates procedural room/floor generation,
 * InstancedMesh geometry (< 300 draw calls, 0 PointLights), crystals, and Gate of Descent
 * to `ctx.dungeon` (`src/gameplay/dungeon.js`).
 */
import * as THREE from 'three';
import { TERMA_MAP } from '../../data/maps/terma.js';
import { createDungeon } from '../../gameplay/dungeon.js';

export function buildTermaMap(ctx) {
  const { scene } = ctx;
  if (!ctx.dungeon) {
    createDungeon(ctx);
  }

  const group = ctx.zoneGroups?.terma || new THREE.Group();
  group.name = 'TermaMap';
  if (!ctx.zoneGroups?.terma && scene) {
    scene.add(group);
  }

  function getTerrainHeight() {
    return 0;
  }

  // Subtle ambient cave dome overhead & base floor plane (2 meshes, 0 PointLights)
  const floorGeo = new THREE.PlaneGeometry(240, 240);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0b0a14,
    roughness: 0.96,
    metalness: 0.05,
  });
  const baseFloor = new THREE.Mesh(floorGeo, floorMat);
  baseFloor.position.set(TERMA_MAP.origin.x, -0.3, TERMA_MAP.origin.z);
  baseFloor.receiveShadow = true;
  group.add(baseFloor);

  const domeGeo = new THREE.SphereGeometry(126, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const domeMat = new THREE.MeshBasicMaterial({
    color: 0x08070f,
    side: THREE.BackSide,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.set(TERMA_MAP.origin.x, -4, TERMA_MAP.origin.z);
  group.add(dome);

  // If player enters 'terma' directly via zone teleport without an active dungeon floor,
  // auto-generate Tier 1 Floor 1 so the dungeon is never empty.
  if (!ctx.dungeon.isActive()) {
    ctx.dungeon.enter(1);
  }

  function update(dt) {
    ctx.dungeon?.update?.(dt);
  }

  return {
    group,
    getHeight: getTerrainHeight,
    update,
  };
}

export const createMap = buildTermaMap;
export default buildTermaMap;
