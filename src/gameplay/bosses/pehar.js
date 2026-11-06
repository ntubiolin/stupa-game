/**
 * Chapter 4 Boss — Pehar Gyalpo (`pehar`) (`src/gameplay/bosses/pehar.js`) — Issue #35
 *
 * Level 30 Boss at Samye North Arena `(5000, -65)`, radius `18m`.
 *   - Appearance: Dignified stylized white figure with THREE FACES and SIX ARMS (`三面六臂`),
 *     wearing a domed cane hat (`theb-zhu`), riding a majestic WHITE SNOW LION (`白獅`) with turquoise mane.
 *   - Strictly zero PointLights — emissive materials only!
 *   - Phase 1 (100%–60%): `projectileVolley` arrow rain + Snow Lion pounce (`lineCharge`)
 *   - Phase 2 (60%–25%): Summons 4 `gyalpo` minions (`summonAdds`) + `ringWave` Dharma-wheel rings
 *   - Phase 3 (25%–0%): `beam` rotating light beam + `weatherZone` golden sandstorm
 *   - Subjugation & Oath: Pehar dismounts from the Snow Lion, all three faces bow together,
 *     and Guru Rinpoche appoints him Guardian of Samye's Treasury (`གཙུག་ལག་ཁང་གི་དཀོར་བདག`)
 *     in `'boss.pehar.oath'`, unlocking protector `'pehar'`.
 */
import * as THREE from 'three';
import '../../i18n/ch4.js';

export function buildPeharModel() {
  const root = new THREE.Group();
  root.name = 'Boss_Pehar';

  const lionWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x475569,
    emissiveIntensity: 0.25,
    roughness: 0.65,
    metalness: 0.08,
  });

  const lionManeMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.55,
    roughness: 0.45,
    metalness: 0.15,
  });

  const silkWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x94a3b8,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.15,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.7,
    roughness: 0.25,
    metalness: 0.65,
  });

  const caneHatMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xb45309,
    emissiveIntensity: 0.4,
    roughness: 0.5,
    metalness: 0.2,
  });

  const faceWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0x64748b,
    emissiveIntensity: 0.25,
    roughness: 0.45,
  });

  const faceBlueMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.45,
    roughness: 0.45,
  });

  const faceRedMat = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.45,
    roughness: 0.45,
  });

  const eyeGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.8, 0.4),
    toneMapped: false,
  });

  // ---------------------------------------------------------------- 1. White Snow Lion Mount (白獅)
  const lionGroup = new THREE.Group();
  lionGroup.name = 'Pehar_SnowLion';
  root.add(lionGroup);

  const lionBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.92, 1.85), lionWhiteMat);
  lionBody.position.set(0, 0.92, 0);
  lionBody.castShadow = true;
  lionGroup.add(lionBody);

  // Turquoise snow-lion mane collar & curls
  const maneCollar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.22, 10, 18), lionManeMat);
  maneCollar.position.set(0, 1.25, -0.78);
  lionGroup.add(maneCollar);

  const lionHead = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.72, 0.76), lionWhiteMat);
  lionHead.position.set(0, 1.38, -1.05);
  lionHead.castShadow = true;
  lionGroup.add(lionHead);

  const lionEyeGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const lionEyeL = new THREE.Mesh(lionEyeGeo, eyeGlowMat);
  lionEyeL.position.set(-0.22, 1.48, -1.44);
  const lionEyeR = new THREE.Mesh(lionEyeGeo, eyeGlowMat);
  lionEyeR.position.set(0.22, 1.48, -1.44);
  lionGroup.add(lionEyeL, lionEyeR);

  // Bushy turquoise tail
  const lionTail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 8), lionManeMat);
  lionTail.position.set(0, 1.35, 1.08);
  lionTail.rotation.x = 0.55;
  lionGroup.add(lionTail);

  // 4 Snow Lion legs
  const legGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.85, 8);
  legGeo.translate(0, -0.42, 0);
  const lionLegs = [];
  const legCoords = [
    [-0.42, 0.82, -0.65],
    [0.42, 0.82, -0.65],
    [-0.42, 0.82, 0.65],
    [0.42, 0.82, 0.65],
  ];
  for (const [lx, ly, lz] of legCoords) {
    const leg = new THREE.Mesh(legGeo, lionWhiteMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    lionGroup.add(leg);
    lionLegs.push(leg);
  }

  // Golden lotus saddle
  const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.18, 12), goldMat);
  saddle.position.set(0, 1.44, -0.05);
  lionGroup.add(saddle);

  // ---------------------------------------------------------------- 2. Pehar Rider: Three Faces & Six Arms (三面六臂)
  const riderGroup = new THREE.Group();
  riderGroup.name = 'Pehar_Rider';
  riderGroup.position.set(0, 1.48, -0.05);
  root.add(riderGroup);

  // Regal white brocade robe torso
  const robeLower = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.54, 0.72, 12), silkWhiteMat);
  robeLower.position.y = 0.36;
  robeLower.castShadow = true;
  riderGroup.add(robeLower);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.78, 12), silkWhiteMat);
  torso.position.y = 0.98;
  torso.castShadow = true;
  riderGroup.add(torso);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 18), goldMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.68;
  riderGroup.add(belt);

  // Three Faces Pivot (White center, Blue right, Red left — bows together on subjugation)
  const headsPivot = new THREE.Group();
  headsPivot.name = 'Pehar_ThreeFaces';
  headsPivot.position.set(0, 1.52, 0);
  riderGroup.add(headsPivot);

  const centerFace = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), faceWhiteMat);
  centerFace.position.set(0, 0, -0.04);
  const rightFace = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), faceBlueMat);
  rightFace.position.set(-0.22, -0.02, 0.02);
  const leftFace = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), faceRedMat);
  leftFace.position.set(0.22, -0.02, 0.02);
  headsPivot.add(centerFace, rightFace, leftFace);

  // Glowing eyes on center face
  const pEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeGlowMat);
  pEyeL.position.set(-0.08, 0.04, -0.26);
  const pEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeGlowMat);
  pEyeR.position.set(0.08, 0.04, -0.26);
  headsPivot.add(pEyeL, pEyeR);

  // Domed Cane Hat (藤編圓笠 theb-zhu) with crystal/gold finial
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.64, 0.07, 16), caneHatMat);
  hatBrim.position.y = 0.24;
  const hatDome = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.52, 14), caneHatMat);
  hatDome.position.y = 0.52;
  const hatFinial = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), goldMat);
  hatFinial.position.y = 0.84;
  headsPivot.add(hatBrim, hatDome, hatFinial);

  // Six Arms (三面六臂 — 3 left, 3 right holding bow/arrow/sword/razor/club/vajra)
  const sixArms = [];
  const armGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.68, 8);
  armGeo.translate(0, -0.32, 0);
  const weaponGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6);

  for (let side of [-1, 1]) {
    for (let tier = 0; tier < 3; tier++) {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.40, 1.28 - tier * 0.16, 0);
      const baseZ = side * (0.45 + tier * 0.36);
      armPivot.rotation.z = baseZ;
      armPivot.rotation.x = -0.35 - tier * 0.12;

      const armMesh = new THREE.Mesh(armGeo, silkWhiteMat);
      armPivot.add(armMesh);

      const weapon = new THREE.Mesh(weaponGeo, goldMat);
      weapon.position.set(0, -0.64, -0.12);
      weapon.rotation.x = Math.PI / 2;
      armPivot.add(weapon);

      riderGroup.add(armPivot);
      sixArms.push({ pivot: armPivot, side, tier, baseZ });
    }
  }

  // Radiant golden mandala halo behind Pehar
  const haloRing = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 0.88, 28),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.0, 1.55, 0.45),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })
  );
  haloRing.position.set(0, 1.25, 0.26);
  riderGroup.add(haloRing);

  return {
    group: root,
    root,
    anim(arg1, arg2, arg3, arg4) {
      let mode = arg1;
      let t = arg2 || 0;
      let bossState = arg4;
      if (typeof arg1 === 'number') {
        bossState = arg2;
        mode = bossState?.animState || 'idle';
        t = bossState?.ctx?.state?.elapsed || 0;
      }
      const isKneel = mode === 'kneel' || Boolean(bossState?.subdued);

      if (isKneel) {
        // Pehar dismounts from the White Snow Lion and bows all three faces together!
        riderGroup.position.set(0.85, 0.08, -0.75);
        riderGroup.rotation.x = 0.28;
        headsPivot.rotation.x = 0.52; // All three faces bow together in homage
        lionGroup.position.set(-0.45, 0, 0.2);
        for (let i = 0; i < sixArms.length; i++) {
          const a = sixArms[i];
          a.pivot.rotation.z = a.side * (0.18 + a.tier * 0.12);
          a.pivot.rotation.x = -1.05;
        }
        return;
      }

      // Mounted on the White Snow Lion
      const bob = Math.sin(t * (mode === 'windup' || mode === 'strike' ? 9.0 : 3.4)) * 0.07;
      lionGroup.position.set(0, Math.max(0, bob), 0);
      riderGroup.position.set(0, 1.48 + Math.max(0, bob), -0.05);
      riderGroup.rotation.x = mode === 'strike' ? -0.15 : 0;
      headsPivot.rotation.x = 0;
      headsPivot.rotation.y = Math.sin(t * 1.8) * 0.12;
      haloRing.rotation.z = t * 0.85;

      // Snow Lion leg stride
      const stride = Math.sin(t * (mode === 'strike' ? 14 : 6)) * (mode === 'idle' ? 0.15 : 0.45);
      lionLegs[0].rotation.x = stride;
      lionLegs[1].rotation.x = -stride;
      lionLegs[2].rotation.x = -stride;
      lionLegs[3].rotation.x = stride;

      // Six arms fan animation
      for (let i = 0; i < sixArms.length; i++) {
        const a = sixArms[i];
        const wave = Math.sin(t * 4.2 + a.tier * 1.1) * 0.16;
        a.pivot.rotation.z = a.baseZ + a.side * wave;
        a.pivot.rotation.x = mode === 'windup' ? -1.35 : -0.38 - a.tier * 0.12 + wave * 0.4;
      }
    },
  };
}

export function registerPeharDialogue(ctx) {
  const register = ctx?.dialogue?.register || ctx?.ui?.dialogue?.register;
  if (typeof register !== 'function') return;

  register('boss.pehar.oath', {
    start: 'n1',
    nodes: {
      n1: {
        speaker: 'boss.pehar.name',
        text: 'dlg.boss.pehar.oath.1',
        next: 'n2',
      },
      n2: {
        speaker: 'npc.guruVision.samye.name',
        text: 'dlg.boss.pehar.oath.2',
        next: 'n3',
      },
      n3: {
        speaker: 'boss.pehar.name',
        text: 'dlg.boss.pehar.oath.3',
        end: true,
      },
    },
  });
}

export const PEHAR_BOSS = {
  id: 'pehar',
  nameKey: 'boss.pehar.name',
  titleKey: 'boss.pehar.title',
  level: 30,
  hp: 11000,
  def: 40,
  speed: 3.8,
  radius: 1.45,
  height: 3.2,
  arena: {
    map: 'samye',
    x: 5000,
    z: -65,
    r: 18,
  },
  buildModel: buildPeharModel,
  phases: [
    // Phase 1 (100%–60%): Arrow rain (`projectileVolley`) + Snow Lion pounce (`lineCharge`)
    {
      hpThreshold: 1.0,
      cooldown: 1.9,
      patterns: [
        {
          type: 'projectileVolley',
          count: 5,
          spreadDeg: 58,
          projectileType: 'redArrow',
          speed: 17,
          windup: 0.85,
          recover: 0.65,
          damage: 34,
        },
        {
          type: 'lineCharge',
          length: 14,
          width: 2.5,
          windup: 0.9,
          chargeDur: 0.45,
          recover: 0.7,
          damage: 42,
        },
      ],
    },
    // Phase 2 (60%–25%): Summons 4 `gyalpo` minions (`summonAdds`) + `ringWave` Dharma-wheel rings
    {
      hpThreshold: 0.6,
      cooldown: 1.7,
      patterns: [
        {
          type: 'summonAdds',
          kind: 'gyalpo',
          count: 4,
          spawnRadius: 6.5,
          windup: 0.95,
          recover: 0.7,
        },
        {
          type: 'ringWave',
          innerR: 2.8,
          outerR: 13.5,
          ringWidth: 2.2,
          windup: 0.9,
          expandDur: 1.35,
          recover: 0.65,
          damage: 38,
        },
        {
          type: 'lineCharge',
          length: 15,
          width: 2.6,
          windup: 0.85,
          chargeDur: 0.42,
          recover: 0.65,
          damage: 44,
        },
      ],
    },
    // Phase 3 (25%–0%): `beam` rotating light beam + `weatherZone` golden sandstorm
    {
      hpThreshold: 0.25,
      cooldown: 1.45,
      patterns: [
        {
          type: 'beam',
          length: 15.5,
          width: 1.85,
          windup: 0.95,
          channelDur: 2.8,
          sweepDeg: 155,
          tickInterval: 0.35,
          recover: 0.75,
          damage: 24,
        },
        {
          type: 'weatherZone',
          zoneCount: 3,
          zoneRadius: 3.4,
          windup: 0.9,
          activeDur: 3.2,
          tickInterval: 0.45,
          recover: 0.65,
          damage: 22,
          slow: 1.5,
        },
        {
          type: 'ringWave',
          innerR: 2.5,
          outerR: 14.5,
          ringWidth: 2.3,
          windup: 0.85,
          expandDur: 1.25,
          recover: 0.6,
          damage: 42,
        },
      ],
    },
  ],
  oath: {
    dialogue: 'boss.pehar.oath',
    protector: 'pehar',
    flag: 'boss.pehar',
    flags: ['boss.pehar', 'protector.pehar'],
  },
  rewards: {
    exp: 800,
    turquoise: 180,
    codex: ['pehar'],
  },
};

export default PEHAR_BOSS;
