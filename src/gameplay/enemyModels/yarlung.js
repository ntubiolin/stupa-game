// ============================================================================
// Chapter 3 — Yarlung Valley · Yarlha Shampo Procedural Enemy Models (`src/gameplay/enemyModels/yarlung.js`)
// Strictly Zero PointLights (uses emissive / MeshBasicMaterial only).
// ============================================================================

export function buildNyenModel(THREE) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x565a52,
    roughness: 0.92,
    metalness: 0.05,
    emissive: new THREE.Color(0x000000),
  });

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x453121,
    roughness: 0.9,
    metalness: 0.04,
    emissive: new THREE.Color(0x000000),
  });

  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c32,
    roughness: 0.88,
    metalness: 0.02,
    emissive: new THREE.Color(0x13260b),
    emissiveIntensity: 0.25,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0xa3e635,
    toneMapped: false,
  });

  // Craggy boulder torso + twisted tree trunk core
  const torsoGeo = new THREE.DodecahedronGeometry(0.54, 1);
  torsoGeo.scale(1.12, 1.18, 0.95);
  const torso = new THREE.Mesh(torsoGeo, rockMat);
  torso.position.y = 0.98;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // Moss cap across back & shoulders
  const mossCapGeo = new THREE.DodecahedronGeometry(0.52, 1);
  mossCapGeo.scale(1.18, 0.55, 1.02);
  const mossCap = new THREE.Mesh(mossCapGeo, mossMat);
  mossCap.position.set(0, 1.38, 0.04);
  bodyRoot.add(mossCap);

  // Twisted wooden trunk spine & crown branches
  const trunkSpine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 1.35, 7),
    barkMat,
  );
  trunkSpine.position.set(0, 0.95, 0.12);
  trunkSpine.rotation.z = 0.12;
  bodyRoot.add(trunkSpine);

  const branchL = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.68, 6),
    barkMat,
  );
  branchL.position.set(-0.36, 1.68, 0.05);
  branchL.rotation.z = 0.48;
  const branchR = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.62, 6),
    barkMat,
  );
  branchR.position.set(0.35, 1.65, -0.04);
  branchR.rotation.z = -0.52;
  bodyRoot.add(branchL, branchR);

  // Head + glowing green-amber eyes (hidden when disguised as a boulder)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.48, -0.22);
  bodyRoot.add(headGroup);

  const headRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), rockMat);
  headRock.scale.set(1.1, 0.92, 0.95);
  headGroup.add(headRock);

  const eyeGeo = new THREE.SphereGeometry(0.045, 7, 7);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.09, 0.02, -0.22);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.09, 0.02, -0.22);
  headGroup.add(leftEye, rightEye);

  // Twisted branch/stone limbs
  const armGeo = new THREE.CylinderGeometry(0.14, 0.09, 0.85, 6);
  armGeo.translate(0, -0.35, 0);
  const leftArm = new THREE.Mesh(armGeo, barkMat);
  leftArm.position.set(-0.56, 1.28, 0);
  leftArm.rotation.z = 0.25;
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(armGeo, barkMat);
  rightArm.position.set(0.56, 1.28, 0);
  rightArm.rotation.z = -0.25;
  rightArm.castShadow = true;

  const legGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.62, 6);
  const leftLeg = new THREE.Mesh(legGeo, rockMat);
  leftLeg.position.set(-0.24, 0.31, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeo, rockMat);
  rightLeg.position.set(0.24, 0.31, 0);
  rightLeg.castShadow = true;

  bodyRoot.add(leftArm, rightArm, leftLeg, rightLeg);

  return {
    root,
    bodyRoot,
    head: headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    materials: [rockMat, barkMat, mossMat],
    setDisguised(isDisguised) {
      leftEye.visible = !isDisguised;
      rightEye.visible = !isDisguised;
      if (isDisguised) {
        bodyRoot.position.y = -0.42;
        bodyRoot.scale.set(1.18, 0.68, 1.18);
        leftArm.rotation.x = 0.65;
        rightArm.rotation.x = 0.65;
      } else {
        bodyRoot.position.y = 0;
        bodyRoot.scale.set(1, 1, 1);
      }
    },
    animate(e, dt, isMoving) {
      if (e.disguised) {
        leftEye.visible = false;
        rightEye.visible = false;
        bodyRoot.position.y = -0.42;
        bodyRoot.scale.set(1.18, 0.68, 1.18);
        leftArm.rotation.x = 0.65;
        rightArm.rotation.x = 0.65;
        return;
      }
      leftEye.visible = true;
      rightEye.visible = true;
      bodyRoot.position.y = 0;
      bodyRoot.scale.set(1, 1, 1);

      const t = e.animTime || 0;
      const pace = isMoving ? 5.5 : 1.8;
      const step = Math.sin(t * pace);
      leftLeg.rotation.x = step * 0.35;
      rightLeg.rotation.x = -step * 0.35;

      if (e.state === 'windup') {
        const atk = e.activeAttack;
        const p = Math.min(1, 1 - Math.max(0, e.stateTimer) / Math.max(0.1, atk?.windup || 0.6));
        if (atk?.id === 'rootGrasp') {
          leftArm.rotation.x = -1.6 * p;
          rightArm.rotation.x = -1.6 * p;
        } else {
          leftArm.rotation.x = -0.5;
          rightArm.rotation.x = -2.1 * p;
        }
      } else {
        leftArm.rotation.x = -step * 0.35;
        rightArm.rotation.x = step * 0.35;
      }
    },
  };
}

export function buildWildYakModel(THREE) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  const furMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b18,
    roughness: 0.92,
    metalness: 0.04,
    emissive: new THREE.Color(0x000000),
  });

  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0x141210,
    roughness: 0.95,
    metalness: 0.02,
    emissive: new THREE.Color(0x000000),
  });

  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3c9,
    roughness: 0.55,
    metalness: 0.15,
    emissive: new THREE.Color(0x000000),
  });

  // Glowing white eyes when berserk; turns calm dark brown when calmed
  const eyeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 2.2, 2.4),
    toneMapped: false,
  });

  // Heavy muscular yak body + shoulder hump
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.82, 1.58), furMat);
  torso.position.set(0, 0.88, 0);
  torso.castShadow = true;
  bodyRoot.add(torso);

  const hump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), furMat);
  hump.scale.set(1.05, 0.85, 1.15);
  hump.position.set(0, 1.32, -0.35);
  hump.castShadow = true;
  bodyRoot.add(hump);

  // Shaggy belly fringe / long hair skirt characteristic of Tibetan yaks
  const skirtGeo = new THREE.ConeGeometry(0.76, 0.62, 8);
  skirtGeo.scale(0.82, 1.0, 1.38);
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.set(0, 0.48, 0);
  bodyRoot.add(skirt);

  // Pivoting head & neck group (lowers to graze grass when state === 'calmed')
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.02, -0.76);
  bodyRoot.add(headPivot);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.62), furMat);
  headMesh.position.set(0, -0.04, -0.26);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  const snoutMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.28), skirtMat);
  snoutMesh.position.set(0, -0.12, -0.58);
  headPivot.add(snoutMesh);

  // Curved upward yak horns
  const hornGeo = new THREE.ConeGeometry(0.068, 0.56, 6);
  const hornL = new THREE.Mesh(hornGeo, hornMat);
  hornL.position.set(-0.34, 0.22, -0.22);
  hornL.rotation.z = 0.72;
  hornL.rotation.x = -0.25;
  const hornR = new THREE.Mesh(hornGeo, hornMat);
  hornR.position.set(0.34, 0.22, -0.22);
  hornR.rotation.z = -0.72;
  hornR.rotation.x = -0.25;
  headPivot.add(hornL, hornR);

  // Glowing white eyes
  const eyeGeo = new THREE.SphereGeometry(0.048, 7, 7);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.26, 0.04, -0.38);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.26, 0.04, -0.38);
  headPivot.add(leftEye, rightEye);

  // Bushy tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.58, 6), skirtMat);
  tail.position.set(0, 0.82, 0.88);
  tail.rotation.x = 0.45;
  bodyRoot.add(tail);

  // 4 sturdy legs
  const legGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.62, 6);
  const legFL = new THREE.Mesh(legGeo, skirtMat);
  legFL.position.set(-0.28, 0.31, -0.52);
  const legFR = new THREE.Mesh(legGeo, skirtMat);
  legFR.position.set(0.28, 0.31, -0.52);
  const legBL = new THREE.Mesh(legGeo, skirtMat);
  legBL.position.set(-0.28, 0.31, 0.52);
  const legBR = new THREE.Mesh(legGeo, skirtMat);
  legBR.position.set(0.28, 0.31, 0.52);
  bodyRoot.add(legFL, legFR, legBL, legBR);

  function setCalmed(calmed) {
    if (calmed) {
      eyeMat.color.setHex(0x1f1916);
      headPivot.rotation.x = 0.62;
      headPivot.position.y = 0.78;
    } else {
      eyeMat.color.setRGB(2.2, 2.2, 2.4);
      headPivot.rotation.x = 0;
      headPivot.position.y = 1.02;
    }
  }

  return {
    root,
    bodyRoot,
    head: headPivot,
    eyeMat,
    materials: [furMat, skirtMat, hornMat],
    setCalmed,
    animate(e, dt, isMoving) {
      const t = e.animTime || 0;
      if (e.state === 'calmed') {
        eyeMat.color.setHex(0x1f1916);
        // Peacefully lower head and chew grass
        headPivot.position.y = 0.76;
        headPivot.rotation.x = 0.64 + Math.sin(t * 3.2) * 0.08;
        headPivot.rotation.y = Math.sin(t * 1.4) * 0.14;
        const slowStep = isMoving ? Math.sin(t * 3.5) * 0.18 : 0;
        legFL.rotation.x = slowStep;
        legFR.rotation.x = -slowStep;
        legBL.rotation.x = -slowStep;
        legBR.rotation.x = slowStep;
        tail.rotation.z = Math.sin(t * 2.2) * 0.15;
        return;
      }

      eyeMat.color.setRGB(2.2, 2.2, 2.4);
      headPivot.position.y = 1.02;
      headPivot.rotation.y = 0;

      if (e.state === 'windup') {
        const p = Math.min(1, 1 - Math.max(0, e.stateTimer) / Math.max(0.1, e.activeAttack?.windup || 0.6));
        headPivot.rotation.x = 0.48 * p;
        legFL.rotation.x = -0.35 * Math.sin(t * 18);
      } else {
        headPivot.rotation.x = e.state === 'attack' ? 0.38 : Math.sin(t * 3.0) * 0.06;
        const pace = e.state === 'attack' ? 20 : isMoving ? 10 : 0;
        const gallop = Math.sin(t * pace);
        legFL.rotation.x = gallop * 0.45;
        legFR.rotation.x = -gallop * 0.45;
        legBL.rotation.x = -gallop * 0.45;
        legBR.rotation.x = gallop * 0.45;
      }
      tail.rotation.z = Math.sin(t * 4.5) * 0.2;
    },
  };
}

export function buildHailCoreModel(THREE) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.18,
    metalness: 0.35,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.92,
  });

  const coreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.4, 2.2, 2.8),
    toneMapped: false,
  });

  const mainShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), iceMat);
  mainShard.scale.set(0.85, 1.65, 0.85);
  mainShard.position.y = 1.15;
  bodyRoot.add(mainShard);

  const innerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), coreMat);
  innerCore.scale.set(0.8, 1.4, 0.8);
  innerCore.position.y = 1.15;
  bodyRoot.add(innerCore);

  const orbitGroup = new THREE.Group();
  orbitGroup.position.y = 1.15;
  bodyRoot.add(orbitGroup);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 5), iceMat);
    shard.position.set(Math.cos(a) * 0.72, (i % 2 === 0 ? 0.12 : -0.12), Math.sin(a) * 0.72);
    shard.rotation.z = (i % 2 === 0 ? -0.25 : 0.25);
    orbitGroup.add(shard);
  }

  return {
    root,
    bodyRoot,
    materials: [iceMat],
    animate(e, dt) {
      const t = e.animTime || 0;
      mainShard.rotation.y += dt * 1.4;
      innerCore.rotation.y -= dt * 2.2;
      orbitGroup.rotation.y -= dt * 2.0;
      bodyRoot.position.y = Math.sin(t * 3.2) * 0.12;
    },
  };
}

export default {
  nyen: buildNyenModel,
  wildYak: buildWildYakModel,
  hailCore: buildHailCoreModel,
};
