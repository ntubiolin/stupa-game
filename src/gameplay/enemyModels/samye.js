/**
 * Chapter 4 (Samye Monastery & Mount Hepo Ri) — Procedural Enemy Models (`src/gameplay/enemyModels/samye.js`) — Issue #35
 *
 * Strictly zero PointLights — uses emissive materials only!
 *   1. `buildWallBreakerModel`: stocky dark shadow carrying a stolen carved temple stone block on its back
 *   2. `buildDuModel`: black smoky humanoid with glowing red eyes and trailing dark-smoke wisps
 *   3. `buildGyalpoModel`: floating white-robed figure with tall domed cane hat (`theb-zhu`) and 3 orbiting curse orbs
 */
import * as THREE from 'three';

function makeMat(materials, params) {
  const m = new THREE.MeshStandardMaterial(params);
  m.userData.idleEmissiveHex = m.emissive ? m.emissive.getHex() : 0x000000;
  m.userData.idleEmissiveIntensity = m.emissiveIntensity ?? 0.0;
  materials.push(m);
  return m;
}

/**
 * 1. `wallBreaker` (夜拆鬼 / Night Wall-Breaker)
 * Stocky dark shadow humanoid hunched forward, carrying a stolen Samye stone block on its back.
 */
export function buildWallBreakerModel() {
  const group = new THREE.Group();
  group.name = 'Enemy_WallBreaker';
  const materials = [];
  const animNodes = {};

  const shadowBodyMat = makeMat(materials, {
    color: 0x181824,
    emissive: 0x312e81,
    emissiveIntensity: 0.35,
    roughness: 0.82,
    metalness: 0.08,
  });

  const eyeMat = makeMat(materials, {
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });

  const stoneBlockMat = makeMat(materials, {
    color: 0x9ca3af,
    emissive: 0x374151,
    emissiveIntensity: 0.15,
    roughness: 0.88,
    metalness: 0.05,
  });

  const ropeMat = makeMat(materials, {
    color: 0x78350f,
    roughness: 0.9,
  });

  // Hunched stocky torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.62, 0);
  torso.rotation.x = 0.38; // hunched under heavy stone
  group.add(torso);
  animNodes.torso = torso;

  const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.62, 9), shadowBodyMat);
  chestMesh.position.y = 0.26;
  chestMesh.castShadow = true;
  torso.add(chestMesh);

  // Stolen carved temple stone block strapped to back (+Z)
  const stoneGroup = new THREE.Group();
  stoneGroup.position.set(0, 0.42, 0.28);
  stoneGroup.rotation.x = -0.18;
  torso.add(stoneGroup);
  animNodes.stoneBlock = stoneGroup;

  const stoneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.46, 0.44), stoneBlockMat);
  stoneMesh.castShadow = true;
  stoneGroup.add(stoneMesh);

  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.48), ropeMat);
  strapL.position.x = -0.18;
  const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.48), ropeMat);
  strapR.position.x = 0.18;
  stoneGroup.add(strapL, strapR);

  // Head peering forward (-Z)
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.21, 0), shadowBodyMat);
  head.position.set(0, 0.62, -0.16);
  torso.add(head);

  const eyeGeo = new THREE.SphereGeometry(0.038, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.08, 0.64, -0.34);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.08, 0.64, -0.34);
  torso.add(eyeL, eyeR);

  // Brawny arms
  const armGeo = new THREE.CylinderGeometry(0.085, 0.07, 0.52, 7);
  armGeo.translate(0, -0.22, 0);
  const armL = new THREE.Mesh(armGeo, shadowBodyMat);
  armL.position.set(-0.34, 0.48, -0.05);
  const armR = new THREE.Mesh(armGeo, shadowBodyMat);
  armR.position.set(0.34, 0.48, -0.05);
  torso.add(armL, armR);
  animNodes.armL = armL;
  animNodes.armR = armR;

  // Short stocky legs
  const legGeo = new THREE.CylinderGeometry(0.095, 0.08, 0.52, 7);
  legGeo.translate(0, -0.26, 0);
  const legL = new THREE.Mesh(legGeo, shadowBodyMat);
  legL.position.set(-0.16, 0.52, 0);
  const legR = new THREE.Mesh(legGeo, shadowBodyMat);
  legR.position.set(0.16, 0.52, 0);
  group.add(legL, legR);
  animNodes.legL = legL;
  animNodes.legR = legR;

  function animate(enemy, dt, isMoving) {
    const t = enemy.animTime || 0;
    const pace = isMoving ? 8.5 : 2.2;
    const w = Math.sin(t * pace);
    legL.rotation.x = w * 0.42;
    legR.rotation.x = -w * 0.42;
    if (enemy.state === 'windup') {
      torso.rotation.x = -0.15;
      armL.rotation.x = -2.1;
      armR.rotation.x = -2.1;
    } else {
      torso.rotation.x = 0.38 + Math.abs(w) * 0.06;
      armL.rotation.x = -w * 0.35 - 0.25;
      armR.rotation.x = w * 0.35 - 0.25;
    }
    stoneGroup.rotation.z = w * 0.06;
  }

  return { group, materials, animNodes, animate };
}

/**
 * 2. `du` (黑煙魔 / Dü Demon)
 * Black smoky humanoid with glowing crimson eyes and swirling shadow-smoke tendrils.
 */
export function buildDuModel() {
  const group = new THREE.Group();
  group.name = 'Enemy_Du';
  const materials = [];
  const animNodes = {};

  const smokeCoreMat = makeMat(materials, {
    color: 0x09090b,
    emissive: 0x18181b,
    emissiveIntensity: 0.3,
    roughness: 0.9,
    metalness: 0.05,
  });

  const smokeWispMat = makeMat(materials, {
    color: 0x18181b,
    emissive: 0x450a0a,
    emissiveIntensity: 0.55,
    roughness: 0.75,
    transparent: true,
    opacity: 0.86,
  });

  const redEyeMat = makeMat(materials, {
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 2.4,
    roughness: 0.15,
  });

  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 0.2, 0);
  group.add(bodyPivot);
  animNodes.bodyPivot = bodyPivot;

  // Tapered smoky lower shroud
  const shroudMesh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.05, 9), smokeWispMat);
  shroudMesh.position.y = 0.52;
  shroudMesh.castShadow = true;
  bodyPivot.add(shroudMesh);

  // Upper shadowy torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.68, 9), smokeCoreMat);
  torso.position.y = 1.08;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Horned shadow head + glowing red eyes
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), smokeCoreMat);
  head.position.set(0, 1.54, 0);
  bodyPivot.add(head);

  const hornGeo = new THREE.ConeGeometry(0.05, 0.24, 5);
  const hornL = new THREE.Mesh(hornGeo, smokeWispMat);
  hornL.position.set(-0.13, 1.72, -0.02);
  hornL.rotation.z = 0.32;
  const hornR = new THREE.Mesh(hornGeo, smokeWispMat);
  hornR.position.set(0.13, 1.72, -0.02);
  hornR.rotation.z = -0.32;
  bodyPivot.add(hornL, hornR);

  const eyeGeo = new THREE.SphereGeometry(0.044, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeo, redEyeMat);
  eyeL.position.set(-0.075, 1.56, -0.185);
  const eyeR = new THREE.Mesh(eyeGeo, redEyeMat);
  eyeR.position.set(0.075, 1.56, -0.185);
  bodyPivot.add(eyeL, eyeR);

  // Clawed arms
  const armGeo = new THREE.ConeGeometry(0.09, 0.65, 6);
  armGeo.rotateX(Math.PI);
  armGeo.translate(0, -0.28, 0);
  const armL = new THREE.Mesh(armGeo, smokeCoreMat);
  armL.position.set(-0.32, 1.32, 0);
  const armR = new THREE.Mesh(armGeo, smokeCoreMat);
  armR.position.set(0.32, 1.32, 0);
  bodyPivot.add(armL, armR);
  animNodes.armL = armL;
  animNodes.armR = armR;

  // Swirling smoke ring wisps
  const wispRing = new THREE.Group();
  wispRing.position.y = 0.65;
  bodyPivot.add(wispRing);
  const wispGeo = new THREE.OctahedronGeometry(0.11, 0);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const w = new THREE.Mesh(wispGeo, smokeWispMat);
    w.position.set(Math.cos(ang) * 0.42, (i % 2) * 0.22, Math.sin(ang) * 0.42);
    wispRing.add(w);
  }

  function animate(enemy, dt, isMoving) {
    const t = enemy.animTime || 0;
    bodyPivot.position.y = 0.18 + Math.sin(t * 3.8) * 0.08;
    wispRing.rotation.y = t * 2.6;
    if (enemy.state === 'windup') {
      armL.rotation.x = -1.6;
      armR.rotation.x = -1.6;
    } else {
      const s = Math.sin(t * (isMoving ? 8.0 : 2.5));
      armL.rotation.x = -0.45 + s * 0.35;
      armR.rotation.x = -0.45 - s * 0.35;
    }
  }

  return { group, materials, animNodes, animate };
}

/**
 * 3. `gyalpo` (白笠王魔 / Gyalpo Spirit)
 * Floating white-robed spirit wearing a tall domed cane hat (`theb-zhu`), with 3 orbiting magic orbs.
 */
export function buildGyalpoModel() {
  const group = new THREE.Group();
  group.name = 'Enemy_Gyalpo';
  const materials = [];
  const animNodes = {};

  const whiteRobeMat = makeMat(materials, {
    color: 0xf8fafc,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.28,
    roughness: 0.55,
    metalness: 0.1,
  });

  const sashGoldMat = makeMat(materials, {
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.45,
  });

  const faceMat = makeMat(materials, {
    color: 0xe2e8f0,
    emissive: 0x64748b,
    emissiveIntensity: 0.2,
    roughness: 0.5,
  });

  const hatMat = makeMat(materials, {
    color: 0xfef3c7,
    emissive: 0xb45309,
    emissiveIntensity: 0.35,
    roughness: 0.45,
  });

  const orbMat = makeMat(materials, {
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 1.85,
    roughness: 0.2,
  });

  const floatRoot = new THREE.Group();
  floatRoot.position.set(0, 0.28, 0);
  group.add(floatRoot);
  animNodes.floatRoot = floatRoot;

  // Flowing white regal robes
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.46, 0.96, 12), whiteRobeMat);
  skirt.position.y = 0.48;
  skirt.castShadow = true;
  floatRoot.add(skirt);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.54, 12), whiteRobeMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  floatRoot.add(torso);

  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 16), sashGoldMat);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.94;
  floatRoot.add(sash);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), faceMat);
  head.position.y = 1.54;
  floatRoot.add(head);

  // Tall domed cane hat (theb-zhu) with golden finial
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.06, 14), hatMat);
  hatBrim.position.y = 1.68;
  const hatDome = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.46, 12), hatMat);
  hatDome.position.y = 1.92;
  const hatFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), sashGoldMat);
  hatFinial.position.y = 2.18;
  floatRoot.add(hatBrim, hatDome, hatFinial);

  // Wide white sleeves
  const sleeveGeo = new THREE.ConeGeometry(0.16, 0.52, 8);
  sleeveGeo.translate(0, -0.22, 0);
  const armL = new THREE.Mesh(sleeveGeo, whiteRobeMat);
  armL.position.set(-0.32, 1.32, 0);
  armL.rotation.z = 0.28;
  const armR = new THREE.Mesh(sleeveGeo, whiteRobeMat);
  armR.position.set(0.32, 1.32, 0);
  armR.rotation.z = -0.28;
  floatRoot.add(armL, armR);
  animNodes.armL = armL;
  animNodes.armR = armR;

  // 3 Orbiting curse orbs
  const orbRing = new THREE.Group();
  orbRing.position.y = 1.28;
  floatRoot.add(orbRing);
  animNodes.orbRing = orbRing;

  const orbGeo = new THREE.SphereGeometry(0.11, 8, 8);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(Math.cos(ang) * 0.58, 0, Math.sin(ang) * 0.58);
    orbRing.add(orb);
  }

  function animate(enemy, dt, isMoving) {
    const t = enemy.animTime || 0;
    floatRoot.position.y = 0.28 + Math.sin(t * 2.8) * 0.11;
    orbRing.rotation.y = t * 3.2;
    orbRing.rotation.z = Math.sin(t * 1.9) * 0.18;
    if (enemy.state === 'windup') {
      armL.rotation.x = -1.25;
      armR.rotation.x = -1.25;
    } else {
      const sway = Math.sin(t * (isMoving ? 5.0 : 2.0));
      armL.rotation.x = sway * 0.22;
      armR.rotation.x = -sway * 0.22;
    }
  }

  return { group, materials, animNodes, animate };
}

export default {
  wallBreaker: buildWallBreakerModel,
  du: buildDuModel,
  gyalpo: buildGyalpoModel,
};
