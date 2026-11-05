// ============================================================================
// Mangyul Pass (芒域山口) Procedural Enemy Models — Chapter 2
// Auto-discovered by src/gameplay/enemies.js via import.meta.glob('./enemyModels/*.js')
// Zero PointLights — emissive / MeshStandardMaterial / MeshBasicMaterial only.
// ============================================================================

export function buildSnowSpriteModel(THREE, kCfg) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);
  const materials = [];

  const iceMat = new THREE.MeshStandardMaterial({
    color: kCfg.color || 0x90e0ff,
    emissive: 0x1e6090,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.25,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: kCfg.accentColor || 0xe0f8ff,
    emissive: 0x55c8ff,
    emissiveIntensity: 0.65,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
    flatShading: true,
  });
  const eyeMat = new THREE.MeshBasicMaterial({
    color: kCfg.eyeColor || 0x38d8ff,
  });
  materials.push(iceMat, crystalMat, eyeMat);

  // Translucent crystalline humanoid torso
  const torso = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), iceMat);
  torso.scale.set(0.85, 1.45, 0.7);
  torso.position.y = 1.05;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // Lower skirt shard
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 6), iceMat);
  skirt.rotation.x = Math.PI;
  skirt.position.y = 0.52;
  bodyRoot.add(skirt);

  // Head crystal
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), crystalMat);
  head.position.y = 1.66;
  bodyRoot.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.038, 6, 6);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.08, 1.68, 0.2);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.08, 1.68, 0.2);
  bodyRoot.add(leftEye, rightEye);

  // 6-pointed snowflake halo / wings behind torso
  const snowflakeHalo = new THREE.Group();
  snowflakeHalo.position.set(0, 1.2, -0.22);
  const rayGeo = new THREE.ConeGeometry(0.07, 0.68, 4);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const rayGroup = new THREE.Group();
    rayGroup.rotation.z = angle;
    const ray = new THREE.Mesh(rayGeo, crystalMat);
    ray.position.y = 0.36;
    rayGroup.add(ray);
    snowflakeHalo.add(rayGroup);
  }
  bodyRoot.add(snowflakeHalo);

  // Floating ice shard hands
  const armGeo = new THREE.ConeGeometry(0.09, 0.42, 4);
  const leftArm = new THREE.Mesh(armGeo, crystalMat);
  leftArm.position.set(-0.48, 1.1, 0.14);
  leftArm.rotation.x = Math.PI * 0.5;
  const rightArm = new THREE.Mesh(armGeo, crystalMat);
  rightArm.position.set(0.48, 1.1, 0.14);
  rightArm.rotation.x = Math.PI * 0.5;
  bodyRoot.add(leftArm, rightArm);

  return {
    root,
    bodyRoot,
    materials,
    animate(e, dt, isMoving) {
      e.animPhase += dt * (isMoving ? 5.5 : 3.2);
      const bob = Math.sin(e.animPhase) * 0.12;
      bodyRoot.position.y = 0.12 + bob;
      snowflakeHalo.rotation.z += dt * (e.state === 'windup' ? 5.5 : 1.6);
      const armOffset = Math.sin(e.animPhase * 1.4) * 0.08;
      leftArm.position.y = 1.1 + armOffset;
      rightArm.position.y = 1.1 - armOffset;
      if (e.state === 'windup') {
        leftArm.position.z = 0.34;
        rightArm.position.z = 0.34;
      } else {
        leftArm.position.z = 0.14;
        rightArm.position.z = 0.14;
      }
    },
  };
}

export function buildHailGhostModel(THREE, kCfg) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);
  const materials = [];

  const cloudMat = new THREE.MeshStandardMaterial({
    color: kCfg.color || 0x5c768d,
    emissive: 0x162636,
    emissiveIntensity: 0.35,
    roughness: 0.75,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
    flatShading: true,
  });
  const icicleMat = new THREE.MeshStandardMaterial({
    color: kCfg.accentColor || 0xa8d8f0,
    emissive: 0x3898d0,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.3,
    flatShading: true,
  });
  const eyeMat = new THREE.MeshBasicMaterial({
    color: kCfg.eyeColor || 0x70e4ff,
  });
  materials.push(cloudMat, icicleMat, eyeMat);

  // Grey-blue storm cloud body (clustered puffs)
  const cloudGroup = new THREE.Group();
  cloudGroup.position.y = 1.25;
  bodyRoot.add(cloudGroup);

  const mainCloud = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 1), cloudMat);
  mainCloud.scale.set(1.15, 0.85, 1.0);
  mainCloud.castShadow = true;
  cloudGroup.add(mainCloud);

  const puffOffsets = [
    [-0.38, -0.05, 0.12, 0.34],
    [0.38, -0.04, 0.1, 0.34],
    [0, 0.26, -0.08, 0.36],
    [-0.22, 0.18, 0.22, 0.28],
    [0.24, 0.16, -0.2, 0.3],
  ];
  for (const [px, py, pz, r] of puffOffsets) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), cloudMat);
    puff.position.set(px, py, pz);
    cloudGroup.add(puff);
  }

  // Glowing storm eyes
  const eyeGeo = new THREE.SphereGeometry(0.055, 6, 6);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.16, 0.04, 0.48);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.16, 0.04, 0.48);
  cloudGroup.add(leftEye, rightEye);

  // Hanging icicles underneath the cloud body
  const icicleRing = new THREE.Group();
  icicleRing.position.y = 0.72;
  bodyRoot.add(icicleRing);

  const icicleGeo = new THREE.ConeGeometry(0.085, 0.52, 5);
  const icicleCount = 7;
  for (let i = 0; i < icicleCount; i++) {
    const angle = (i / icicleCount) * Math.PI * 2;
    const rad = i === 0 ? 0 : 0.36;
    const icicle = new THREE.Mesh(icicleGeo, icicleMat);
    icicle.rotation.x = Math.PI; // Point downward
    icicle.position.set(
      Math.cos(angle) * rad,
      i === 0 ? -0.08 : (i % 2) * 0.07,
      Math.sin(angle) * rad
    );
    icicleRing.add(icicle);
  }

  return {
    root,
    bodyRoot,
    materials,
    animate(e, dt, isMoving) {
      e.animPhase += dt * (isMoving ? 4.2 : 2.5);
      bodyRoot.position.y = Math.sin(e.animPhase) * 0.1;
      cloudGroup.rotation.z = Math.sin(e.animPhase * 0.7) * 0.07;
      icicleRing.rotation.y += dt * (e.state === 'windup' ? 4.8 : 1.4);
      if (e.state === 'windup') {
        icicleRing.position.y = 0.85 + Math.sin(e.animPhase * 4) * 0.06;
      } else {
        icicleRing.position.y = 0.72;
      }
    },
  };
}

export function buildAvalancheBruteModel(THREE, kCfg) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);
  const materials = [];

  const snowMat = new THREE.MeshStandardMaterial({
    color: kCfg.color || 0xdce8f2,
    emissive: 0x1a2836,
    emissiveIntensity: 0.2,
    roughness: 0.82,
    metalness: 0.05,
    flatShading: true,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    color: kCfg.accentColor || 0x6a7885,
    roughness: 0.9,
    metalness: 0.12,
    flatShading: true,
  });
  const eyeMat = new THREE.MeshBasicMaterial({
    color: kCfg.eyeColor || 0x4cc9ff,
  });
  materials.push(snowMat, rockMat, eyeMat);

  // Massive snow boulder torso
  const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.88, 1), snowMat);
  torso.scale.set(1.12, 1.05, 0.95);
  torso.position.y = 1.35;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // Jagged rock shoulder pads embedded in the snow
  const rockGeo = new THREE.DodecahedronGeometry(0.38, 0);
  const leftShoulderRock = new THREE.Mesh(rockGeo, rockMat);
  leftShoulderRock.position.set(-0.78, 1.82, 0.05);
  leftShoulderRock.rotation.set(0.4, 0.2, -0.3);
  const rightShoulderRock = new THREE.Mesh(rockGeo, rockMat);
  rightShoulderRock.position.set(0.78, 1.82, -0.05);
  rightShoulderRock.rotation.set(-0.3, 0.5, 0.4);
  const backRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.44, 0), rockMat);
  backRock.position.set(0, 1.65, -0.62);
  bodyRoot.add(leftShoulderRock, rightShoulderRock, backRock);

  // Head boulder
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), snowMat);
  head.position.set(0, 2.25, 0.22);
  bodyRoot.add(head);

  const browRock = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.26), rockMat);
  browRock.position.set(0, 2.38, 0.48);
  bodyRoot.add(browRock);

  // Glowing ice eyes
  const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, 2.26, 0.56);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.15, 2.26, 0.56);
  bodyRoot.add(leftEye, rightEye);

  // Heavy snow-and-rock arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-1.02, 1.55, 0.1);
  const leftFist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), snowMat);
  leftFist.position.y = -0.45;
  const leftKnuckle = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), rockMat);
  leftKnuckle.position.set(-0.1, -0.68, 0.18);
  leftArm.add(leftFist, leftKnuckle);

  const rightArm = new THREE.Group();
  rightArm.position.set(1.02, 1.55, 0.1);
  const rightFist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), snowMat);
  rightFist.position.y = -0.45;
  const rightKnuckle = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), rockMat);
  rightKnuckle.position.set(0.1, -0.68, 0.18);
  rightArm.add(rightFist, rightKnuckle);
  bodyRoot.add(leftArm, rightArm);

  // Stumpy snow boulder legs
  const legGeo = new THREE.DodecahedronGeometry(0.36, 0);
  const leftLeg = new THREE.Mesh(legGeo, rockMat);
  leftLeg.position.set(-0.42, 0.38, 0);
  const rightLeg = new THREE.Mesh(legGeo, rockMat);
  rightLeg.position.set(0.42, 0.38, 0);
  bodyRoot.add(leftLeg, rightLeg);

  return {
    root,
    bodyRoot,
    materials,
    animate(e, dt, isMoving) {
      e.animPhase += dt * (isMoving ? 5.2 : 2.0);
      const isRolling =
        e.activeAttack?.name === 'avalancheRoll' &&
        (e.state === 'windup' || e.dashTimer > 0);
      if (isRolling) {
        // Curl into a rolling snowball
        bodyRoot.position.y = 1.0;
        bodyRoot.rotation.x += dt * (e.dashTimer > 0 ? 16.0 : 5.5);
        leftArm.rotation.x = -0.9;
        rightArm.rotation.x = -0.9;
      } else {
        bodyRoot.rotation.x *= Math.max(0, 1 - dt * 10);
        const swing = isMoving ? Math.sin(e.animPhase) * 0.45 : 0;
        leftLeg.position.z = swing * 0.35;
        rightLeg.position.z = -swing * 0.35;
        if (e.state === 'windup' && e.activeAttack?.name === 'stomp') {
          // Raise both arms to stomp
          leftArm.rotation.x = -1.8;
          rightArm.rotation.x = -1.8;
          bodyRoot.position.y = 0.18;
        } else {
          leftArm.rotation.x = -swing * 0.6;
          rightArm.rotation.x = swing * 0.6;
          bodyRoot.position.y = isMoving ? Math.abs(Math.sin(e.animPhase)) * 0.08 : 0;
        }
      }
    },
  };
}

export default {
  snowSprite: buildSnowSpriteModel,
  hailGhost: buildHailGhostModel,
  avalancheBrute: buildAvalancheBruteModel,
};
