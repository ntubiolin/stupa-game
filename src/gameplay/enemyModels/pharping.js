// ============================================================================
// Chapter 1 — Pharping · Yangleshö Procedural Enemy Models (Zero PointLights)
// ============================================================================

export function buildDroughtSpriteModel(THREE) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xb83814,
    roughness: 0.68,
    metalness: 0.1,
    emissive: 0x5a1804,
    emissiveIntensity: 0.5,
  });

  const crackMat = new THREE.MeshBasicMaterial({
    color: 0xff9228,
    transparent: true,
    opacity: 0.92,
  });

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff6218,
    transparent: true,
    opacity: 0.78,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0xffe884,
  });

  // Floating tapered flame torso
  const torsoGeo = new THREE.ConeGeometry(0.36, 1.05, 8);
  torsoGeo.rotateX(Math.PI);
  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.position.y = 0.78;
  torso.castShadow = true;
  bodyRoot.add(torso);

  // Upper chest / shoulders
  const chestGeo = new THREE.DodecahedronGeometry(0.32, 0);
  const chest = new THREE.Mesh(chestGeo, bodyMat);
  chest.position.y = 1.08;
  chest.scale.set(1.15, 0.85, 0.88);
  chest.castShadow = true;
  bodyRoot.add(chest);

  // Glowing magma crack bands across torso
  const crackRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 10), crackMat);
  crackRing1.position.y = 0.96;
  crackRing1.rotation.set(1.2, 0.3, 0.2);
  bodyRoot.add(crackRing1);

  const crackRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 6, 10), crackMat);
  crackRing2.position.y = 0.74;
  crackRing2.rotation.set(1.8, -0.4, 0.15);
  bodyRoot.add(crackRing2);

  // Head + crown of fire
  const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 1), bodyMat);
  head.position.y = 1.42;
  head.castShadow = true;
  bodyRoot.add(head);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 6), flameMat);
  crown.position.y = 1.66;
  bodyRoot.add(crown);

  // Glowing eyes
  const eyeGeo = new THREE.SphereGeometry(0.036, 6, 6);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.07, 1.44, -0.17);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.07, 1.44, -0.17);
  bodyRoot.add(leftEye, rightEye);

  // Floating ember arms
  const armGeo = new THREE.CylinderGeometry(0.06, 0.03, 0.56, 6);
  armGeo.translate(0, -0.24, 0);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.38, 1.16, 0);
  leftArm.rotation.z = 0.32;
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.38, 1.16, 0);
  rightArm.rotation.z = -0.32;
  bodyRoot.add(leftArm, rightArm);

  // Mouth / chest casting orb for heatBolt windup
  const mouthOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0,
    }),
  );
  mouthOrb.position.set(0, 1.32, -0.24);
  bodyRoot.add(mouthOrb);

  return {
    root,
    bodyRoot,
    head,
    leftArm,
    rightArm,
    mouthOrb,
    materials: [bodyMat],
    baseColor: new THREE.Color(0xb83814),
    baseEmissive: new THREE.Color(0x5a1804),
    animate(e, dt, t) {
      const m = e.model;
      m.bodyRoot.position.y = 0.12 + Math.sin(t * 3.8) * 0.09;
      crown.scale.y = 0.9 + Math.sin(t * 9.5) * 0.22;
      crown.rotation.y = t * 2.4;
      if (e.state === 'windup') {
        const p = Math.min(1, e.stateTimer / Math.max(0.1, e.currentAttack?.windup || 0.7));
        m.leftArm.rotation.x = -1.35 * p;
        m.rightArm.rotation.x = -1.35 * p;
        m.mouthOrb.material.opacity = p * 0.95;
        m.mouthOrb.scale.setScalar(0.6 + p * 1.1);
      } else {
        m.leftArm.rotation.x = Math.sin(t * 3.2) * 0.25 - 0.2;
        m.rightArm.rotation.x = -Math.sin(t * 3.2) * 0.25 - 0.2;
        m.mouthOrb.material.opacity = Math.max(0, m.mouthOrb.material.opacity - dt * 5);
      }
    },
  };
}

export function buildDustDevilModel(THREE) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xc89e62,
    roughness: 0.88,
    metalness: 0.04,
    emissive: 0x3b2810,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.88,
  });

  const innerSwirlMat = new THREE.MeshStandardMaterial({
    color: 0xa67c46,
    roughness: 0.85,
    metalness: 0.05,
    emissive: 0x2e1e0c,
    emissiveIntensity: 0.2,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0xffd25a,
  });

  // Layered inverted cones + rings forming a miniature sand cyclone
  const lowerConeGeo = new THREE.ConeGeometry(0.26, 0.72, 8, 1, true);
  lowerConeGeo.rotateX(Math.PI);
  const lowerCone = new THREE.Mesh(lowerConeGeo, sandMat);
  lowerCone.position.y = 0.42;
  bodyRoot.add(lowerCone);

  const upperConeGeo = new THREE.ConeGeometry(0.46, 0.85, 9, 1, true);
  upperConeGeo.rotateX(Math.PI);
  const upperCone = new THREE.Mesh(upperConeGeo, sandMat);
  upperCone.position.y = 0.92;
  bodyRoot.add(upperCone);

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 6, 12), innerSwirlMat);
  ring1.position.y = 0.68;
  ring1.rotation.x = Math.PI / 2 + 0.18;
  bodyRoot.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 12), innerSwirlMat);
  ring2.position.y = 1.05;
  ring2.rotation.x = Math.PI / 2 - 0.16;
  bodyRoot.add(ring2);

  // Core with glowing eyes inside the cyclone
  const coreGroup = new THREE.Group();
  coreGroup.position.y = 0.95;
  bodyRoot.add(coreGroup);

  const eyeGeo = new THREE.SphereGeometry(0.045, 7, 7);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.09, 0.04, -0.22);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.09, 0.04, -0.22);
  coreGroup.add(leftEye, rightEye);

  return {
    root,
    bodyRoot,
    materials: [sandMat, innerSwirlMat],
    baseColor: new THREE.Color(0xc89e62),
    baseEmissive: new THREE.Color(0x3b2810),
    animate(e, dt, t) {
      const spinMult = e.state === 'attack' || e.state === 'windup' ? 3.2 : 1.0;
      lowerCone.rotation.y -= dt * 7.5 * spinMult;
      upperCone.rotation.y += dt * 5.8 * spinMult;
      ring1.rotation.z += dt * 9.0 * spinMult;
      ring2.rotation.z -= dt * 8.2 * spinMult;
      bodyRoot.position.y = 0.05 + Math.sin(t * 5.2) * 0.05;
      bodyRoot.rotation.z = Math.sin(t * 4.0) * 0.08;
    },
  };
}

export function buildThirstyPretaModel(THREE) {
  const root = new THREE.Group();
  const bodyRoot = new THREE.Group();
  root.add(bodyRoot);

  // Earthy yellow-ochre skin material
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x9c7b38,
    roughness: 0.86,
    metalness: 0.05,
    emissive: 0x2a1d08,
    emissiveIntensity: 0.25,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
  });

  // Distended parched belly
  const bellyGeo = new THREE.SphereGeometry(0.39, 12, 10);
  bellyGeo.scale(1.18, 1.38, 1.18);
  bellyGeo.translate(0, 0.58, 0);
  const belly = new THREE.Mesh(bellyGeo, skinMat);
  belly.castShadow = true;
  bodyRoot.add(belly);

  // Even narrower, elongated needle-thin throat
  const neckGeo = new THREE.CylinderGeometry(0.032, 0.052, 0.42, 8);
  neckGeo.translate(0, 1.12, 0);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.castShadow = true;
  bodyRoot.add(neck);

  // Gaunt head
  const headGeo = new THREE.SphereGeometry(0.18, 10, 8);
  headGeo.scale(0.88, 1.12, 0.88);
  headGeo.translate(0, 1.38, 0);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.castShadow = true;
  bodyRoot.add(head);

  const mouthGeo = new THREE.TorusGeometry(0.04, 0.015, 6, 8);
  mouthGeo.translate(0, 1.32, -0.15);
  const mouth = new THREE.Mesh(mouthGeo, skinMat);
  bodyRoot.add(mouth);

  const eyeGeo = new THREE.SphereGeometry(0.038, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.065, 1.41, -0.145);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.065, 1.41, -0.145);
  bodyRoot.add(leftEye, rightEye);

  const limbGeo = new THREE.CylinderGeometry(0.042, 0.028, 0.58, 6);
  const leftArm = new THREE.Mesh(limbGeo, skinMat);
  leftArm.position.set(-0.39, 0.88, -0.1);
  leftArm.rotation.z = 0.28;
  leftArm.rotation.x = -0.35;
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(limbGeo, skinMat);
  rightArm.position.set(0.39, 0.88, -0.1);
  rightArm.rotation.z = -0.28;
  rightArm.rotation.x = -0.35;
  rightArm.castShadow = true;

  const leftLeg = new THREE.Mesh(limbGeo, skinMat);
  leftLeg.position.set(-0.18, 0.25, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(limbGeo, skinMat);
  rightLeg.position.set(0.18, 0.25, 0);
  rightLeg.castShadow = true;

  bodyRoot.add(leftArm, rightArm, leftLeg, rightLeg);

  const mouthOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0,
    }),
  );
  mouthOrb.position.set(0, 1.32, -0.24);
  bodyRoot.add(mouthOrb);

  return {
    root,
    bodyRoot,
    belly,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    mouthOrb,
    materials: [skinMat],
    baseColor: new THREE.Color(0x9c7b38),
    baseEmissive: new THREE.Color(0x2a1d08),
  };
}

export default {
  droughtSprite: buildDroughtSpriteModel,
  dustDevil: buildDustDevilModel,
  thirstyPreta: buildThirstyPretaModel,
};
