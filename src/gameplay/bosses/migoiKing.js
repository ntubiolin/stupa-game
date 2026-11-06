/**
 * Prologue Boss: Migoi King (雪人王・岡仁之怒) (`src/gameplay/bosses/migoiKing.js`)
 *
 * Implements:
 *  - Procedural 3D model at 1.8x Migoi scale with crystalline ice crown
 *    (ConeGeometry / OctahedronGeometry cluster) and tattered 5-color prayer flag sash (0 PointLights)
 *  - 3 Phases:
 *      Phase 1 (100%-60% HP): radialAoe ground slam + 3-boulder projectileVolley
 *      Phase 2 (60%-25% HP):  Roars on enter, summons 4 mini-migoi (0.6x scale & HP), adds ringWave frost shockwave
 *      Phase 3 (<25% HP):     Enrages on enter, activates weatherZone blizzard (30% slow + 3 golden Mani safe circles), faster slams
 *  - Oath dialogue ('boss.migoiKing.oath') registered in ctx.dialogue
 */
import '../..//i18n/bosses.js';

const PRAYER_SASH_COLORS = [
  0x1a5fb4, // Blue
  0xf6f5f4, // White
  0xc01c28, // Red
  0x2ec27e, // Green
  0xf6d32d, // Yellow
];

export function buildMigoiKingModel(THREE) {
  const outerGroup = new THREE.Group();
  outerGroup.name = 'MigoiKingRoot';

  // Inner model group scaled 1.8x of standard Migoi
  const bodyGroup = new THREE.Group();
  bodyGroup.scale.setScalar(1.8);
  outerGroup.add(bodyGroup);

  const furMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.84,
    metalness: 0.05,
    emissive: new THREE.Color(0x0f172a),
    emissiveIntensity: 0.25,
  });

  const faceMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    emissive: new THREE.Color(0x000000),
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.6, 1.9, 2.8),
    toneMapped: false,
  });

  const crownMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    roughness: 0.18,
    metalness: 0.35,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.92,
  });

  // Torso & Hunch
  const torsoGeo = new THREE.BoxGeometry(1.08, 1.18, 0.88);
  torsoGeo.translate(0, 1.35, 0);
  const torso = new THREE.Mesh(torsoGeo, furMat);
  torso.castShadow = true;
  bodyGroup.add(torso);

  const hunchGeo = new THREE.BoxGeometry(1.28, 0.48, 0.98);
  hunchGeo.translate(0, 1.88, -0.06);
  const hunch = new THREE.Mesh(hunchGeo, furMat);
  hunch.castShadow = true;
  bodyGroup.add(hunch);

  // Head & Face
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.22, -0.22);
  bodyGroup.add(headGroup);

  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeo, furMat);
  head.castShadow = true;
  headGroup.add(head);

  const faceGeo = new THREE.BoxGeometry(0.38, 0.36, 0.08);
  faceGeo.translate(0, -0.02, -0.26);
  const face = new THREE.Mesh(faceGeo, faceMat);
  headGroup.add(face);

  const eyeGeo = new THREE.SphereGeometry(0.048, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.11, 0.02, -0.3);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.11, 0.02, -0.3);
  headGroup.add(eyeL, eyeR);

  // Crystalline Ice Crown (ConeGeometry + OctahedronGeometry cluster on head, 0 PointLights)
  const crownGroup = new THREE.Group();
  crownGroup.position.set(0, 0.28, 0);
  headGroup.add(crownGroup);

  const centerCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), crownMat);
  centerCrystal.scale.set(0.75, 1.85, 0.75);
  centerCrystal.position.set(0, 0.18, -0.04);
  crownGroup.add(centerCrystal);

  const spikeSpecs = [
    { x: -0.16, z: -0.04, rotZ: 0.32, rotX: 0.1, h: 0.34, r: 0.08 },
    { x: 0.16, z: -0.04, rotZ: -0.32, rotX: 0.1, h: 0.34, r: 0.08 },
    { x: -0.24, z: 0.06, rotZ: 0.52, rotX: -0.08, h: 0.26, r: 0.065 },
    { x: 0.24, z: 0.06, rotZ: -0.52, rotX: -0.08, h: 0.26, r: 0.065 },
    { x: 0, z: 0.12, rotZ: 0, rotX: -0.28, h: 0.28, r: 0.075 },
  ];
  for (const sp of spikeSpecs) {
    const cMesh = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 5), crownMat);
    cMesh.position.set(sp.x, sp.h * 0.4, sp.z);
    cMesh.rotation.set(sp.rotX, 0, sp.rotZ);
    crownGroup.add(cMesh);
  }

  // Tattered 5-Color Prayer Flag Sash across shoulders & chest
  const sashGroup = new THREE.Group();
  bodyGroup.add(sashGroup);

  for (let i = 0; i < 5; i++) {
    const flagMat = new THREE.MeshStandardMaterial({
      color: PRAYER_SASH_COLORS[i],
      roughness: 0.78,
      side: THREE.DoubleSide,
    });
    const t = i / 4;
    const patchGeo = new THREE.BoxGeometry(0.28, 0.32, 0.96);
    const patch = new THREE.Mesh(patchGeo, flagMat);
    patch.position.set(-0.48 + t * 0.96, 1.78 - t * 0.42, -0.02);
    patch.rotation.z = -0.38;
    sashGroup.add(patch);
  }

  // Arms & Legs
  const armGeo = new THREE.CylinderGeometry(0.18, 0.13, 1.15, 8);
  const armL = new THREE.Mesh(armGeo, furMat);
  armL.position.set(-0.68, 1.45, 0);
  const armR = new THREE.Mesh(armGeo, furMat);
  armR.position.set(0.68, 1.45, 0);
  bodyGroup.add(armL, armR);

  const legGeo = new THREE.CylinderGeometry(0.22, 0.17, 0.95, 8);
  const legL = new THREE.Mesh(legGeo, furMat);
  legL.position.set(-0.35, 0.48, 0);
  const legR = new THREE.Mesh(legGeo, furMat);
  legR.position.set(0.35, 0.48, 0);
  bodyGroup.add(legL, legR);

  let animTime = 0;

  function anim(dt, bossState) {
    animTime += dt;

    // Enrage visual tint on fur & eyes
    if (bossState.enraged) {
      furMat.emissive.setHex(0x450a0a);
      furMat.emissiveIntensity = 0.55 + Math.sin(animTime * 8) * 0.2;
      eyeMat.color.setRGB(2.6, 0.4, 0.3);
    } else if (bossState.subdued) {
      furMat.emissive.setHex(0x422006);
      furMat.emissiveIntensity = 0.35;
      eyeMat.color.setRGB(2.2, 1.8, 0.5);
    } else {
      furMat.emissive.setHex(0x0f172a);
      furMat.emissiveIntensity = 0.25;
      eyeMat.color.setRGB(0.6, 1.9, 2.8);
    }

    const mode = bossState.animState || 'idle';
    if (mode === 'kneel') {
      // Subdued kneeling / bowing posture
      bodyGroup.position.y = -0.58;
      bodyGroup.rotation.x = 0.38;
      armL.rotation.x = -0.65;
      armR.rotation.x = -0.65;
      legL.rotation.x = 1.15;
      legR.rotation.x = 1.15;
      return;
    }

    bodyGroup.position.y = 0;
    bodyGroup.rotation.x = 0;

    if (mode === 'windup') {
      // Raise both massive arms overhead before slamming
      armL.rotation.x = -2.45;
      armR.rotation.x = -2.45;
      torso.position.y = 0.06;
    } else if (mode === 'roar' || mode === 'enrage') {
      // Chest-pounding roar
      const pulse = Math.sin(animTime * 16);
      armL.rotation.x = -1.6 + pulse * 0.45;
      armR.rotation.x = -1.6 - pulse * 0.45;
      headGroup.rotation.x = -0.35;
    } else if (mode === 'attack') {
      armL.rotation.x = -0.9;
      armR.rotation.x = -0.9;
      headGroup.rotation.x = 0;
    } else if (mode === 'walk') {
      const stride = Math.sin(animTime * 6.5);
      legL.rotation.x = stride * 0.48;
      legR.rotation.x = -stride * 0.48;
      armL.rotation.x = -stride * 0.38;
      armR.rotation.x = stride * 0.38;
      headGroup.rotation.x = 0;
    } else {
      // Idle heavy breathing
      const breath = Math.sin(animTime * 2.4);
      armL.rotation.x = breath * 0.08;
      armR.rotation.x = -breath * 0.08;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      headGroup.rotation.x = breath * 0.04;
    }
  }

  return { group: outerGroup, anim };
}

export const MIGOI_KING_DEF = {
  id: 'migoiKing',
  nameKey: 'boss.migoiKing.name',
  titleKey: 'boss.migoiKing.title',
  level: 6,
  hp: 1660,
  def: 12,
  ccResist: 0.75,
  radius: 1.35,
  height: 3.8,
  arena: { map: 'wild', x: 1000, z: -48, r: 14 },
  buildModel: buildMigoiKingModel,
  phases: [
    {
      hpBelow: 1.0,
      attacks: ['slam', 'boulder'],
      speed: 1.4,
    },
    {
      hpBelow: 0.6,
      attacks: ['slam', 'boulderVolley', 'summonAdds', 'ringWave'],
      onEnter: 'roar',
      speed: 1.5,
    },
    {
      hpBelow: 0.25,
      attacks: ['slam', 'boulderVolley', 'ringWave', 'weatherZone'],
      onEnter: 'enrage',
      speed: 1.75,
    },
  ],
  attacks: {
    slam(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.radialAoe(boss, {
        radius: 4.3,
        windup: fast ? 0.72 : 1.05,
        damage: fast ? 24 : 20,
        knockback: 6.5,
      });
      return fast ? 2.2 : 3.1;
    },
    boulder(boss, patterns) {
      patterns.projectileVolley(boss, {
        count: 3,
        spreadAngle: 0.48,
        windup: 0.78,
        speed: 11.5,
        range: 16.0,
        damage: 16,
      });
      return 3.0;
    },
    boulderVolley(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.projectileVolley(boss, {
        count: 3,
        spreadAngle: 0.56,
        windup: fast ? 0.62 : 0.75,
        speed: fast ? 13.0 : 11.8,
        range: 16.5,
        damage: 18,
      });
      return fast ? 2.3 : 2.9;
    },
    summonAdds(boss, patterns) {
      patterns.summonAdds(boss, {
        count: 4,
        kind: 'migoi',
        scale: 0.6,
        hpRatio: 0.45,
        radiusOffset: 4.2,
        windup: 0.85,
      });
      return 3.4;
    },
    ringWave(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.ringWave(boss, {
        innerR: 1.8,
        outerR: 12.8,
        windup: fast ? 0.72 : 0.9,
        expandDuration: fast ? 1.1 : 1.35,
        damage: 19,
        slowSec: 2.2,
      });
      return fast ? 2.5 : 3.2;
    },
    weatherZone(boss, patterns) {
      patterns.weatherZone(boss, {
        slowMult: 0.7, // 30% slow across arena except inside 3 golden Mani safe circles
        safeRadius: 2.8,
        safeCount: 3,
      });
      return 2.0;
    },
  },
  oath: {
    dialogue: 'boss.migoiKing.oath',
    protector: null,
    flag: 'boss.migoiKing',
  },
  loot: {
    firstKill: { rarity: 'terma' },
    normal: { count: [3, 5], minRarity: 'rare' },
  },
};

export function registerMigoiKingDialogue(ctx) {
  if (!ctx.dialogue?.register) return;
  ctx.dialogue.register({
    'boss.migoiKing.oath': {
      speakerKey: 'boss.migoiKing.name',
      start: 'n1',
      nodes: {
        n1: {
          textKey: 'dlg.boss.migoiKing.oath.1',
          next: 'n2',
        },
        n2: {
          textKey: 'dlg.boss.migoiKing.oath.2',
          next: 'n3',
        },
        n3: {
          textKey: 'dlg.boss.migoiKing.oath.3',
          next: 'n4',
        },
        n4: {
          textKey: 'dlg.boss.migoiKing.oath.4',
          choices: [
            {
              labelKey: 'dlg.boss.migoiKing.oath.accept',
              action: { flag: 'boss.migoiKing' },
              close: true,
            },
          ],
        },
      },
    },
  });
}
