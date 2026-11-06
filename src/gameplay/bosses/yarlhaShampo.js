/**
 * Chapter 3 Boss: Yarlha Shampo White Yak (`雅拉香波白犛牛`) (`src/gameplay/bosses/yarlhaShampo.js`)
 *
 * Implements:
 *  - ~7m tall majestic White Yak procedural model with layered low-poly/shell white fur,
 *    translucent ice-crystal horns, and white frost mist puffing from its nostrils (0 PointLights)
 *  - Phase 1 (100%–60% HP): `lineCharge` (width 4m), `radialAoe` hoof stomp, `beam` forward cone blizzard breath (slow)
 *  - Phase 2 (60%–25% HP):  Guru Rinpoche's Pure Vision manifests at the arena edge and casts a golden
 *                           Vajra Hook & Lasso (`金剛鉤索`) binding the White Yak at `(4000, -75)` while it
 *                           sweeps blizzard breath; 4 Hail Cores (`冰雹核心`, 260 HP each = 5% of Boss maxHp)
 *                           rise around the perimeter. Destroying all 4 Hail Cores tightens the golden lasso,
 *                           dropping Boss HP to 25% and transitioning to Phase 3!
 *  - Phase 3 (25%–0% HP):   Frenzied struggle with `targetedAoe` hailstorm + frequent `lineCharge` & `radialAoe`
 *  - Subjugation & Oath:    White Yak kneels and transforms into a white-robed youth with white braided hair (`白衣童子`),
 *                           swearing oath in `'boss.yarlhaShampo.oath'`, unlocking protector `'whiteYak'` and
 *                           dropping Terma `'yakFrost'` (`雅拉香波之霜`).
 */
import * as THREE from 'three';
import '../../i18n/ch3.js';

const TWO_PI = Math.PI * 2;

export function buildYarlhaShampoModel(THREE_REF = THREE) {
  const outerGroup = new THREE.Group();
  outerGroup.name = 'YarlhaShampoRoot';

  // 1. Majestic ~7m White Yak Group
  const yakGroup = new THREE.Group();
  yakGroup.name = 'WhiteYakForm';
  yakGroup.scale.setScalar(2.85);
  outerGroup.add(yakGroup);

  const whiteFurMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.72,
    metalness: 0.08,
    emissive: new THREE.Color(0x1e3a8a),
    emissiveIntensity: 0.28,
  });

  const furShellMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.82,
    metalness: 0.05,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 0.22,
  });

  const iceHornMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.16,
    metalness: 0.48,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.92,
  });

  const eyeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.9, 2.0, 2.8),
    toneMapped: false,
  });

  const mistMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Layered low-poly white fur torso + towering shoulder hump
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.05, 2.05), whiteFurMat);
  torso.position.set(0, 1.22, 0);
  torso.castShadow = true;
  yakGroup.add(torso);

  const shoulderHump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), whiteFurMat);
  shoulderHump.scale.set(1.08, 0.95, 1.15);
  shoulderHump.position.set(0, 1.88, -0.42);
  shoulderHump.castShadow = true;
  yakGroup.add(shoulderHump);

  // Layered shell fur plates draping along flanks and belly
  for (let layer = 0; layer < 3; layer++) {
    const shell = new THREE.Mesh(
      new THREE.ConeGeometry(0.95 + layer * 0.08, 0.75, 10),
      layer % 2 === 0 ? whiteFurMat : furShellMat,
    );
    shell.scale.set(0.88, 1.0, 1.48);
    shell.position.set(0, 0.72 + layer * 0.24, 0.02);
    yakGroup.add(shell);
  }

  // Head & Ice-Crystal Horns
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.46, -1.08);
  yakGroup.add(headGroup);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 0.78), whiteFurMat);
  skull.position.set(0, 0, -0.25);
  headGroup.add(skull);

  const browFur = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), furShellMat);
  browFur.scale.set(1.2, 0.65, 0.9);
  browFur.position.set(0, 0.28, -0.25);
  headGroup.add(browFur);

  // Sweeping translucent ice-crystal horns
  const hornGeo = new THREE.ConeGeometry(0.12, 0.95, 6);
  const hornL = new THREE.Mesh(hornGeo, iceHornMat);
  hornL.position.set(-0.48, 0.34, -0.22);
  hornL.rotation.z = 0.78;
  hornL.rotation.x = -0.22;
  const hornR = new THREE.Mesh(hornGeo, iceHornMat);
  hornR.position.set(0.48, 0.34, -0.22);
  hornR.rotation.z = -0.78;
  hornR.rotation.x = -0.22;
  headGroup.add(hornL, hornR);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.34, 0.06, -0.45);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.34, 0.06, -0.45);
  headGroup.add(eyeL, eyeR);

  // White frost mist puffing from nostrils
  const nostrilMistGroup = new THREE.Group();
  nostrilMistGroup.position.set(0, -0.14, -0.68);
  headGroup.add(nostrilMistGroup);

  const mistPuffs = [];
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 7), mistMat);
    puff.position.set(side * 0.16, 0, -0.08 * i);
    nostrilMistGroup.add(puff);
    mistPuffs.push({ mesh: puff, side, phaseOffset: i * 1.5 });
  }

  // Bushy white tail
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 7), furShellMat);
  tail.position.set(0, 1.15, 1.15);
  tail.rotation.x = 0.48;
  yakGroup.add(tail);

  // 4 Hoofed Legs
  const legGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.85, 7);
  const legFL = new THREE.Mesh(legGeo, furShellMat);
  legFL.position.set(-0.38, 0.42, -0.68);
  const legFR = new THREE.Mesh(legGeo, furShellMat);
  legFR.position.set(0.38, 0.42, -0.68);
  const legBL = new THREE.Mesh(legGeo, furShellMat);
  legBL.position.set(-0.38, 0.42, 0.68);
  const legBR = new THREE.Mesh(legGeo, furShellMat);
  legBR.position.set(0.38, 0.42, 0.68);
  yakGroup.add(legFL, legFR, legBL, legBR);

  // 2. White-Robed Youth with White Braided Hair (`白衣童子`) — Revealed on Subjugation / Oath
  const youthGroup = new THREE.Group();
  youthGroup.name = 'WhiteRobedYouthForm';
  youthGroup.visible = false;
  youthGroup.scale.setScalar(1.35);
  outerGroup.add(youthGroup);

  const silkRobeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.1,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.35,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.3,
    metalness: 0.8,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 0.5,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xfde6d8,
    roughness: 0.65,
  });

  // Kneeling white Tibetan chuba robe
  const robeBody = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.28, 10), silkRobeMat);
  robeBody.position.y = 0.64;
  youthGroup.add(robeBody);

  const goldSash = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 6, 16), goldTrimMat);
  goldSash.rotation.x = Math.PI / 2;
  goldSash.position.y = 0.72;
  youthGroup.add(goldSash);

  const youthHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skinMat);
  youthHead.position.y = 1.46;
  youthGroup.add(youthHead);

  // White braided hair (`白辮`) hanging down both temples + turquoise crown band
  const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.03, 6, 16), goldTrimMat);
  crownBand.rotation.x = Math.PI / 2;
  crownBand.position.y = 1.56;
  youthGroup.add(crownBand);

  const braidGeo = new THREE.CylinderGeometry(0.045, 0.03, 0.68, 6);
  const braidL = new THREE.Mesh(braidGeo, whiteFurMat);
  braidL.position.set(-0.22, 1.22, -0.04);
  braidL.rotation.z = 0.12;
  const braidR = new THREE.Mesh(braidGeo, whiteFurMat);
  braidR.position.set(0.22, 1.22, -0.04);
  braidR.rotation.z = -0.12;
  youthGroup.add(braidL, braidR);

  // Palms joined in reverence (Anjali mudra)
  const handsJoined = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), skinMat);
  handsJoined.position.set(0, 1.05, -0.34);
  youthGroup.add(handsJoined);

  let animTime = 0;

  function anim(dt, bossState = {}) {
    animTime += dt;

    // Animate nostril frost mist puffs
    for (const p of mistPuffs) {
      const cycle = (animTime * 2.2 + p.phaseOffset) % 1.0;
      p.mesh.position.z = -0.1 - cycle * 0.55;
      p.mesh.position.x = p.side * (0.16 + cycle * 0.22);
      p.mesh.position.y = -cycle * 0.12;
      p.mesh.scale.setScalar(0.65 + cycle * 1.15);
    }

    const mode = bossState.animState || 'idle';
    if (mode === 'kneel' || bossState.subdued) {
      // Transform into the kneeling White-Robed Youth (`白衣童子`) with kneeled yak silhouette behind
      youthGroup.visible = true;
      youthGroup.position.set(0, 0, -1.2);
      youthGroup.rotation.y = Math.sin(animTime * 1.5) * 0.05;

      yakGroup.scale.setScalar(1.85);
      yakGroup.position.y = -0.55;
      yakGroup.rotation.x = 0.28;
      headGroup.rotation.x = 0.42;
      return;
    }

    youthGroup.visible = false;
    yakGroup.scale.setScalar(2.85);
    yakGroup.position.y = 0;
    yakGroup.rotation.x = 0;

    if (bossState.enraged) {
      whiteFurMat.emissive.setHex(0x0284c7);
      whiteFurMat.emissiveIntensity = 0.55 + Math.sin(animTime * 9.0) * 0.2;
    } else {
      whiteFurMat.emissive.setHex(0x1e3a8a);
      whiteFurMat.emissiveIntensity = 0.28;
    }

    if (mode === 'windup') {
      headGroup.rotation.x = 0.45;
      legFL.rotation.x = -0.45 * Math.sin(animTime * 16);
    } else if (mode === 'roar' || mode === 'enrage') {
      headGroup.rotation.x = -0.42 + Math.sin(animTime * 14) * 0.18;
    } else if (mode === 'attack') {
      headGroup.rotation.x = 0.35;
    } else if (mode === 'walk') {
      const s = Math.sin(animTime * 6.5);
      legFL.rotation.x = s * 0.42;
      legFR.rotation.x = -s * 0.42;
      legBL.rotation.x = -s * 0.42;
      legBR.rotation.x = s * 0.42;
      headGroup.rotation.x = Math.sin(animTime * 3.2) * 0.08;
    } else {
      headGroup.rotation.x = Math.sin(animTime * 2.4) * 0.06;
      legFL.rotation.x = 0;
      legFR.rotation.x = 0;
      legBL.rotation.x = 0;
      legBR.rotation.x = 0;
    }
    tail.rotation.z = Math.sin(animTime * 4.0) * 0.18;
  }

  return { group: outerGroup, yakGroup, youthGroup, anim };
}

// Per-instance runtime for Phase 2 Golden Vajra Hook & Lasso + 4 Hail Cores
function ensureRuntime(boss) {
  if (!boss._shampoRuntime) {
    boss._shampoRuntime = {
      boundByLasso: false,
      lassoGroup: null,
      lassoBeam: null,
      lassoRing: null,
      hailCoreIds: [],
      hailCoresTotal: 4,
      hailCoresRemaining: 0,
      phase2Completed: false,
    };
  }
  return boss._shampoRuntime;
}

function clearPhase2VisualsAndCores(boss, ctx) {
  const rt = ensureRuntime(boss);
  rt.boundByLasso = false;
  if (rt.lassoGroup) {
    if (rt.lassoGroup.parent) rt.lassoGroup.parent.remove(rt.lassoGroup);
    rt.lassoGroup = null;
    rt.lassoBeam = null;
    rt.lassoRing = null;
  }

  // Remove any remaining Hail Core enemy instances
  if (rt.hailCoreIds.length > 0 && ctx.enemies?.getActiveEnemies) {
    const active = ctx.enemies.getActiveEnemies();
    for (let i = active.length - 1; i >= 0; i--) {
      const e = active[i];
      if (e && (rt.hailCoreIds.includes(e.id) || e.kind === 'hailCore')) {
        e.hp = 0;
        e.state = 'liberated';
        e.liberateTimer = 99;
      }
    }
  }
  rt.hailCoreIds = [];
  rt.hailCoresRemaining = 0;
}

function startPhase2LassoAndHailCores(boss, ctx) {
  const rt = ensureRuntime(boss);
  clearPhase2VisualsAndCores(boss, ctx);

  const arena = boss.arena || { x: 4000, z: -75, r: 22 };
  const centerY = ctx.world ? ctx.world.getHeight(arena.x, arena.z) : 1.8;

  // Bind Yarlha Shampo at the center of the arena (4000, -75)
  boss.setPosition(arena.x, arena.z);
  rt.boundByLasso = true;
  rt.phase2Completed = false;

  // Build Golden Vajra Hook & Lasso (`金剛鉤索`) visual from Guru Rinpoche at south rim (4000, -53) to Boss center (4000, -75)
  const lassoGroup = new THREE.Group();
  lassoGroup.name = 'GoldenVajraHookLasso';
  ctx.scene.add(lassoGroup);
  rt.lassoGroup = lassoGroup;

  const goldLassoMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.5, 2.0, 0.45),
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  // Golden silhouette of Guru Rinpoche at the south edge of the arena (4000, -53.5)
  const guruEdgePos = new THREE.Vector3(arena.x, centerY + 1.5, arena.z + arena.r - 0.5);
  const bossBindPos = new THREE.Vector3(arena.x, centerY + 2.2, arena.z);

  const guruSilhouette = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 2.1, 8),
    goldLassoMat,
  );
  guruSilhouette.position.set(guruEdgePos.x, centerY + 1.05, guruEdgePos.z);
  const guruHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1.15, 24),
    goldLassoMat,
  );
  guruHalo.position.set(guruEdgePos.x, centerY + 1.5, guruEdgePos.z);
  lassoGroup.add(guruSilhouette, guruHalo);

  // Golden lasso cord connecting Guru Vision to Yarlha Shampo
  const cordLen = guruEdgePos.distanceTo(bossBindPos);
  const cordGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.0, 10, 1, true);
  cordGeo.rotateX(Math.PI / 2);
  const cordMesh = new THREE.Mesh(cordGeo, goldLassoMat);
  const midPt = new THREE.Vector3().addVectors(guruEdgePos, bossBindPos).multiplyScalar(0.5);
  cordMesh.position.copy(midPt);
  cordMesh.lookAt(bossBindPos);
  cordMesh.scale.set(1, 1, cordLen);
  lassoGroup.add(cordMesh);
  rt.lassoBeam = cordMesh;

  // Golden Vajra binding rings around the White Yak at arena center
  const bindRing = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.11, 8, 32), goldLassoMat);
  bindRing.rotation.x = Math.PI / 2;
  bindRing.position.set(arena.x, centerY + 2.0, arena.z);
  lassoGroup.add(bindRing);
  rt.lassoRing = bindRing;

  // Spawn 4 Hail Cores (`冰雹核心`) around the arena perimeter (each with HP = 5% of Boss maxHp = 260)
  const coreHp = Math.max(1, Math.round((boss.maxHp || 5200) * 0.05)); // 260 HP
  const perimeterR = 14.5;
  const coreIds = [];

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * TWO_PI + Math.PI / 4;
    const cx = arena.x + Math.cos(angle) * perimeterR;
    const cz = arena.z + Math.sin(angle) * perimeterR;
    const cy = ctx.world ? ctx.world.getHeight(cx, cz) : centerY;

    const eid = ctx.enemies?.spawn?.('hailCore', {
      position: { x: cx, y: cy, z: cz },
      level: boss.level || 23,
      maxHp: coreHp,
      noSplit: true,
      stationary: true,
      tags: ['hailCore'],
    });
    if (eid) {
      coreIds.push(eid);
      const active = ctx.enemies?.getActiveEnemies?.() || [];
      const inst = active.find((e) => e.id === eid);
      if (inst) {
        inst.hp = coreHp;
        inst.maxHp = coreHp;
        inst.stationary = true;
        inst.bossAddOf = boss.id;
      }
    }
  }

  rt.hailCoreIds = coreIds;
  rt.hailCoresRemaining = coreIds.length;

  const msg =
    ctx.i18n?.t?.('toast.boss.hookCast') ||
    '蓮花生大士淨相於壇城邊緣顯現，拋出「金剛鉤索」縛住白犛牛！快擊碎四周 4 顆冰雹核心！';
  ctx.hud?.toast?.(msg);
}

function completePhase2LassoTighten(boss, ctx) {
  const rt = ensureRuntime(boss);
  if (rt.phase2Completed) return;
  rt.phase2Completed = true;
  rt.boundByLasso = false;

  clearPhase2VisualsAndCores(boss, ctx);

  const msg =
    ctx.i18n?.t?.('toast.boss.allHailCoresBroken') ||
    '四顆冰雹核心盡數崩裂！金剛鉤索猛然收緊，重創雅拉香波白犛牛！';
  ctx.hud?.toast?.(msg);
  ctx.bus?.emit?.('sfx', { name: 'dispel' });
  ctx.cameraRig?.addShake?.(0.5);

  // Tighten lasso -> drop Yarlha Shampo HP to 25% and transition to Phase 3!
  const targetHp = Math.round(boss.maxHp * 0.25);
  if (boss.hp > targetHp) {
    const bossInstance = ctx.bosses?.getBoss?.('yarlhaShampo');
    if (bossInstance?.setHp) {
      bossInstance.setHp(0.25);
    } else {
      boss.hp = targetHp;
    }
  }
}

export const YARLHA_SHAMPO_DEF = {
  id: 'yarlhaShampo',
  nameKey: 'boss.yarlhaShampo.name',
  titleKey: 'boss.yarlhaShampo.title',
  level: 23,
  hp: 7200,
  def: 32,
  ccResist: 0.75,
  radius: 1.95,
  height: 7.0,
  arena: { map: 'yarlung', x: 4000, z: -75, r: 22 },
  buildModel: buildYarlhaShampoModel,
  phases: [
    {
      hpBelow: 1.0,
      attacks: ['yakLineCharge', 'hoofStomp', 'blizzardBreath'],
      speed: 1.75,
    },
    {
      hpBelow: 0.6,
      attacks: ['blizzardBreath', 'hoofStomp'],
      onEnter: 'roar',
      speed: 0, // Immobilized at center by Guru Rinpoche's Golden Hook & Lasso
    },
    {
      hpBelow: 0.25,
      attacks: ['hailstormBarrage', 'yakLineCharge', 'blizzardBreath', 'hoofStomp'],
      onEnter: 'enrage',
      speed: 2.15,
    },
  ],
  attacks: {
    yakLineCharge(boss, patterns) {
      const rt = ensureRuntime(boss);
      if (rt.boundByLasso) {
        return YARLHA_SHAMPO_DEF.attacks.blizzardBreath(boss, patterns);
      }
      const fast = boss.enraged || boss.phase >= 3;
      patterns.lineCharge(boss, {
        width: 4.0,
        length: 16.5,
        windup: fast ? 0.68 : 0.88,
        chargeDuration: fast ? 0.38 : 0.46,
        damage: fast ? 32 : 28,
        knockback: 8.0,
      });
      return fast ? 2.1 : 2.9;
    },
    hoofStomp(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.radialAoe(boss, {
        radius: 5.5,
        windup: fast ? 0.72 : 0.95,
        damage: fast ? 29 : 25,
        knockback: 7.0,
      });
      return fast ? 2.2 : 2.8;
    },
    blizzardBreath(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.beam(boss, {
        width: 2.2,
        length: 16.0,
        windup: fast ? 0.7 : 0.85,
        sweepDuration: fast ? 1.15 : 1.4,
        sweepAngle: 1.55,
        damage: 24,
      });
      return fast ? 2.4 : 3.0;
    },
    hailstormBarrage(boss, patterns) {
      patterns.targetedAoe(boss, {
        count: 4,
        interval: 0.38,
        radius: 3.2,
        windup: 0.82,
        damage: 26,
      });
      return 2.3;
    },
  },
  onStart(boss, ctx) {
    clearPhase2VisualsAndCores(boss, ctx);
    ensureRuntime(boss).phase2Completed = false;
  },
  onPhaseEnter(phaseNum, boss, ctx) {
    if (phaseNum === 2) {
      startPhase2LassoAndHailCores(boss, ctx);
    } else if (phaseNum === 3) {
      clearPhase2VisualsAndCores(boss, ctx);
    }
  },
  onUpdate(dt, boss, ctx) {
    const rt = ensureRuntime(boss);
    const arena = boss.arena || { x: 4000, z: -75, r: 22 };

    // While bound in Phase 2, keep Boss anchored at center (4000, -75) and monitor the 4 Hail Cores
    if (rt.boundByLasso && boss.phase === 2) {
      boss.setPosition(arena.x, arena.z);
      if (rt.lassoRing) {
        rt.lassoRing.rotation.z += dt * 1.8;
      }

      const active = ctx.enemies?.getActiveEnemies?.() || [];
      let aliveCores = 0;
      for (const cid of rt.hailCoreIds) {
        const inst = active.find((e) => e.id === cid);
        if (inst && inst.hp > 0 && inst.state !== 'liberated') {
          aliveCores++;
        }
      }

      if (aliveCores < rt.hailCoresRemaining) {
        rt.hailCoresRemaining = aliveCores;
        if (aliveCores > 0) {
          const msg =
            ctx.i18n?.t?.('toast.boss.hailCoreBroken', { n: aliveCores }) ||
            `擊碎了一顆冰雹核心！（剩餘：${aliveCores}/4）`;
          ctx.hud?.toast?.(msg);
        }
      }

      if (aliveCores === 0 && rt.hailCoreIds.length > 0) {
        completePhase2LassoTighten(boss, ctx);
      }
    }
  },
  onMantraCast(ev, boss, ctx) {
    const rt = ensureRuntime(boss);
    if (!rt.boundByLasso || rt.hailCoreIds.length === 0) return 0;

    // If Mantra was cast with forceAll or inside the arena, ensure nearby Hail Cores take Mantra damage
    if (ev?.forceAll) {
      return YARLHA_SHAMPO_DEF.destroyAllHailCores(boss, ctx);
    }
    return rt.hailCoresRemaining;
  },
  destroyAllHailCores(boss, ctx) {
    const rt = ensureRuntime(boss);
    if (rt.hailCoreIds.length === 0 && boss.phase === 2) {
      startPhase2LassoAndHailCores(boss, ctx);
    }
    const active = ctx.enemies?.getActiveEnemies?.() || [];
    let destroyed = 0;
    for (const cid of rt.hailCoreIds) {
      const inst = active.find((e) => e.id === cid);
      if (inst && inst.hp > 0) {
        ctx.enemies?.damage?.(inst.id, inst.hp + 999, { execute: true, source: 'mantra' });
        destroyed++;
      }
    }
    completePhase2LassoTighten(boss, ctx);
    return destroyed;
  },
  onSubdue(boss, ctx) {
    clearPhase2VisualsAndCores(boss, ctx);
  },
  onReset(boss, ctx) {
    clearPhase2VisualsAndCores(boss, ctx);
  },
  getExtraState(boss) {
    const rt = ensureRuntime(boss);
    return {
      boundByLasso: Boolean(rt.boundByLasso),
      hailCoresRemaining: rt.hailCoresRemaining,
      hailCoreIds: [...rt.hailCoreIds],
    };
  },
  oath: {
    dialogue: 'boss.yarlhaShampo.oath',
    protector: 'whiteYak',
    flag: 'boss.yarlhaShampo',
    flags: ['boss.yarlhaShampo', 'protector.whiteYak'],
  },
  loot: {
    firstKill: { rarity: 'terma', id: 'yakFrost' },
    normal: { count: [3, 5], minRarity: 'rare' },
  },
};

export function registerYarlhaShampoDialogue(ctx) {
  if (ctx.dialogue?.register) {
    ctx.dialogue.register({
      'boss.yarlhaShampo.oath': {
        speakerKey: 'boss.yarlhaShampo.name',
        start: 'n1',
        nodes: {
          n1: {
            textKey: 'dlg.boss.yarlhaShampo.oath.1',
            next: 'n2',
          },
          n2: {
            textKey: 'dlg.boss.yarlhaShampo.oath.2',
            next: 'n3',
          },
          n3: {
            textKey: 'dlg.boss.yarlhaShampo.oath.3',
            next: 'n4',
          },
          n4: {
            textKey: 'dlg.boss.yarlhaShampo.oath.4',
            choices: [
              {
                labelKey: 'dlg.boss.yarlhaShampo.oath.accept',
                action: { flag: 'boss.yarlhaShampo' },
                close: true,
              },
            ],
          },
        },
      },
    });
  }

  // Attach `destroyHailCores` helper onto ctx.bosses and window.__stupa.bosses once createBosses finishes
  const attachDestroyHelper = () => {
    const destroyFn = () => {
      const b = ctx.bosses?.getBoss?.('yarlhaShampo');
      if (!b) return 0;
      return YARLHA_SHAMPO_DEF.destroyAllHailCores(b.getInternalState(), ctx);
    };
    if (ctx.bosses) {
      ctx.bosses.destroyHailCores = destroyFn;
    }
    if (typeof window !== 'undefined' && window.__stupa?.bosses) {
      window.__stupa.bosses.destroyHailCores = destroyFn;
    }
  };
  queueMicrotask(attachDestroyHelper);
  setTimeout(attachDestroyHelper, 0);
}

export default YARLHA_SHAMPO_DEF;
