/**
 * Chapter 1 Boss: Drought Obstacle Lord (`旱障魔主・阿蘇拉洞之主`) (`src/gameplay/bosses/droughtLord.js`)
 *
 * Implements:
 *  - 5m tall procedural charred black rock & magma colossus with a floating ring of
 *    cracked earth chunks behind its back and a burning hollow head (0 PointLights)
 *  - Phase 1 (100%–60% HP): weatherZone sandstorm (20% slow in arena) + 5-fireball projectileVolley (dispellable) + magma slam
 *  - Phase 2 (60%–25% HP):  Summons 3 moving flame whirlwinds (continuous contact damage) + thermal laser beam sweep
 *  - Phase 3 (<25% HP):     Splits into 3 illusions (幻影) + real body; only the real body takes HP damage;
 *                           Six-Syllable Mantra (`R` / `mantra:cast` / `mantra:hit` / `dispelIllusions`) dispels the illusions!
 *  - Subjugation & Oath:    Pinned by Vajrakilaya (普巴金剛), sets `ch1.rain = true`, drops Terma `"揚列雪之橛"` (`phurbaSplit`)
 */
import * as THREE from 'three';
import '../../i18n/ch1.js';

const TWO_PI = Math.PI * 2;

export function buildDroughtLordModel(THREE_REF = THREE, opts = {}) {
  const isIllusion = Boolean(opts.isIllusion);
  const outerGroup = new THREE.Group();
  outerGroup.name = isIllusion ? 'DroughtLordIllusion' : 'DroughtLordRoot';

  // Scaled so total height is ~5.0m
  const bodyGroup = new THREE.Group();
  bodyGroup.scale.setScalar(2.15);
  outerGroup.add(bodyGroup);

  const rockMat = new THREE.MeshStandardMaterial({
    color: isIllusion ? 0x3b2314 : 0x1c1614,
    roughness: 0.86,
    metalness: 0.12,
    emissive: new THREE.Color(isIllusion ? 0x6b2c0e : 0x4a1606),
    emissiveIntensity: isIllusion ? 0.55 : 0.42,
    transparent: isIllusion,
    opacity: isIllusion ? 0.62 : 1.0,
  });

  const magmaMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(isIllusion ? 1.8 : 2.4, isIllusion ? 0.65 : 0.78, 0.18),
    transparent: isIllusion,
    opacity: isIllusion ? 0.65 : 0.95,
    toneMapped: false,
  });

  const chunkMat = new THREE.MeshStandardMaterial({
    color: 0x3a2618,
    roughness: 0.9,
    metalness: 0.06,
    emissive: new THREE.Color(0x5c1f08),
    emissiveIntensity: 0.35,
    transparent: isIllusion,
    opacity: isIllusion ? 0.55 : 1.0,
  });

  // Massive charred crag torso
  const torsoGeo = new THREE.DodecahedronGeometry(0.68, 1);
  torsoGeo.scale(1.1, 1.28, 0.88);
  torsoGeo.translate(0, 1.32, 0);
  const torso = new THREE.Mesh(torsoGeo, rockMat);
  torso.castShadow = !isIllusion;
  bodyGroup.add(torso);

  // Glowing magma fissures across chest & shoulders
  const fissure1 = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 6, 12), magmaMat);
  fissure1.position.set(0, 1.38, -0.1);
  fissure1.rotation.set(1.25, 0.3, 0.2);
  bodyGroup.add(fissure1);

  const fissure2 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 6, 12), magmaMat);
  fissure2.position.set(0, 1.12, 0.05);
  fissure2.rotation.set(1.75, -0.35, -0.15);
  bodyGroup.add(fissure2);

  // Broad jagged shoulders
  const shoulderGeo = new THREE.DodecahedronGeometry(0.36, 0);
  const shoulderL = new THREE.Mesh(shoulderGeo, rockMat);
  shoulderL.position.set(-0.76, 1.78, 0);
  const shoulderR = new THREE.Mesh(shoulderGeo, rockMat);
  shoulderR.position.set(0.76, 1.78, 0);
  bodyGroup.add(shoulderL, shoulderR);

  // Burning hollow head (crown of jagged obsidian pillars + blazing hollow core)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.08, -0.06);
  bodyGroup.add(headGroup);

  const skullRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.09, 7, 10), rockMat);
  skullRing.rotation.y = 0.25;
  headGroup.add(skullRing);

  const hollowCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), magmaMat);
  hollowCore.scale.set(0.85, 1.35, 0.85);
  headGroup.add(hollowCore);

  // 4 jagged horn shards around the hollow head
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TWO_PI + 0.4;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.36, 5), rockMat);
    horn.position.set(Math.cos(a) * 0.2, 0.22, Math.sin(a) * 0.18);
    horn.rotation.z = -Math.cos(a) * 0.28;
    headGroup.add(horn);
  }

  // Floating ring of cracked earth chunks behind its back
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0, 1.58, 0.56);
  bodyGroup.add(haloGroup);

  const chunkCount = 8;
  for (let i = 0; i < chunkCount; i++) {
    const a = (i / chunkCount) * TWO_PI;
    const r = 0.92;
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (i % 2) * 0.05, 0), chunkMat);
    chunk.position.set(Math.cos(a) * r, Math.sin(a) * r, (i % 2) * 0.06);
    chunk.rotation.set(a, i * 0.7, a * 0.5);
    haloGroup.add(chunk);
  }

  // Heavy obsidian arms & legs
  const armGeo = new THREE.CylinderGeometry(0.2, 0.15, 1.15, 7);
  const armL = new THREE.Mesh(armGeo, rockMat);
  armL.position.set(-0.78, 1.28, 0);
  const armR = new THREE.Mesh(armGeo, rockMat);
  armR.position.set(0.78, 1.28, 0);
  bodyGroup.add(armL, armR);

  const legGeo = new THREE.CylinderGeometry(0.24, 0.19, 0.92, 7);
  const legL = new THREE.Mesh(legGeo, rockMat);
  legL.position.set(-0.36, 0.46, 0);
  const legR = new THREE.Mesh(legGeo, rockMat);
  legR.position.set(0.36, 0.46, 0);
  bodyGroup.add(legL, legR);

  // Giant golden-blue Vajrakilaya Phurba visual that pins the boss upon subjugation
  const phurbaPinGroup = new THREE.Group();
  phurbaPinGroup.visible = false;
  phurbaPinGroup.position.set(0, 1.1, -0.35);
  phurbaPinGroup.rotation.x = 0.22;
  bodyGroup.add(phurbaPinGroup);

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.22,
    metalness: 0.82,
    emissive: new THREE.Color(0x0284c7),
    emissiveIntensity: 0.9,
  });
  const hiltMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.28,
    metalness: 0.85,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 0.75,
  });
  const bladeGeo = new THREE.ConeGeometry(0.16, 1.45, 3);
  bladeGeo.rotateX(Math.PI);
  const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
  bladeMesh.position.y = 0.2;
  const knotMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), hiltMat);
  knotMesh.position.y = 0.98;
  phurbaPinGroup.add(bladeMesh, knotMesh);

  let animTime = 0;

  function anim(dt, bossState = {}) {
    animTime += dt;

    haloGroup.rotation.z += dt * (bossState.enraged ? 1.85 : 0.75);
    hollowCore.rotation.y += dt * 2.6;
    hollowCore.scale.y = 1.25 + Math.sin(animTime * 8.0) * 0.22;

    if (bossState.enraged) {
      rockMat.emissive.setHex(0x7c1d05);
      rockMat.emissiveIntensity = 0.7 + Math.sin(animTime * 9) * 0.22;
    } else if (bossState.subdued) {
      rockMat.emissive.setHex(0x1e293b);
      rockMat.emissiveIntensity = 0.25;
      magmaMat.color.setRGB(0.45, 1.2, 1.8);
    }

    const mode = bossState.animState || 'idle';
    if (mode === 'kneel' || bossState.subdued) {
      bodyGroup.position.y = -0.62;
      bodyGroup.rotation.x = 0.42;
      armL.rotation.x = -0.7;
      armR.rotation.x = -0.7;
      legL.rotation.x = 1.18;
      legR.rotation.x = 1.18;
      phurbaPinGroup.visible = true;
      return;
    }

    phurbaPinGroup.visible = false;
    bodyGroup.position.y = 0;
    bodyGroup.rotation.x = 0;

    if (mode === 'windup') {
      armL.rotation.x = -2.35;
      armR.rotation.x = -2.35;
    } else if (mode === 'roar' || mode === 'enrage') {
      const p = Math.sin(animTime * 15);
      armL.rotation.x = -1.5 + p * 0.45;
      armR.rotation.x = -1.5 - p * 0.45;
    } else if (mode === 'attack') {
      armL.rotation.x = -0.95;
      armR.rotation.x = -0.95;
    } else if (mode === 'walk') {
      const s = Math.sin(animTime * 5.8);
      legL.rotation.x = s * 0.44;
      legR.rotation.x = -s * 0.44;
      armL.rotation.x = -s * 0.34;
      armR.rotation.x = s * 0.34;
    } else {
      const b = Math.sin(animTime * 2.2);
      armL.rotation.x = b * 0.08;
      armR.rotation.x = -b * 0.08;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
    }
  }

  return { group: outerGroup, anim };
}

// Per-instance runtime state for Phase 2 Flame Whirlwinds & Phase 3 Illusions
function ensureRuntime(boss) {
  if (!boss._droughtRuntime) {
    boss._droughtRuntime = {
      whirlwinds: [],
      illusions: [],
      whirlwindHitCooldown: 0,
      illusionHintShown: false,
    };
  }
  return boss._droughtRuntime;
}

function clearWhirlwinds(boss, ctx) {
  const rt = ensureRuntime(boss);
  for (const w of rt.whirlwinds) {
    if (w.group.parent) w.group.parent.remove(w.group);
  }
  rt.whirlwinds.length = 0;
}

function clearIllusions(boss, ctx) {
  const rt = ensureRuntime(boss);
  for (const ill of rt.illusions) {
    if (ill.group.parent) ill.group.parent.remove(ill.group);
  }
  rt.illusions.length = 0;
}

function spawnFlameWhirlwinds(boss, ctx) {
  const rt = ensureRuntime(boss);
  clearWhirlwinds(boss, ctx);

  const arena = boss.arena || { x: 1990, z: -80, r: 16 };
  const coneGeo = new THREE.ConeGeometry(1.1, 3.2, 10, 1, true);
  coneGeo.rotateX(Math.PI);
  const ringGeo = new THREE.TorusGeometry(0.95, 0.1, 6, 14);
  ringGeo.rotateX(Math.PI / 2);

  for (let i = 0; i < 3; i++) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 0.65, 0.15),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const cone = new THREE.Mesh(coneGeo, mat);
    cone.position.y = 1.6;
    const baseRing = new THREE.Mesh(ringGeo, mat);
    baseRing.position.y = 0.15;
    grp.add(cone, baseRing);

    const angle = (i / 3) * TWO_PI;
    const orbitR = 5.5 + (i % 2) * 2.8;
    const wx = arena.x + Math.cos(angle) * orbitR;
    const wz = arena.z + Math.sin(angle) * orbitR;
    const wy = ctx.world ? ctx.world.getHeight(wx, wz) : 0;
    grp.position.set(wx, wy, wz);
    ctx.scene.add(grp);

    rt.whirlwinds.push({
      group: grp,
      cone,
      baseRing,
      angle,
      orbitR,
      speed: 0.85 + i * 0.18,
      x: wx,
      z: wz,
      radius: 1.35,
    });
  }
}

function spawnIllusions(boss, ctx) {
  const rt = ensureRuntime(boss);
  clearIllusions(boss, ctx);

  const arena = boss.arena || { x: 1990, z: -80, r: 16 };
  for (let i = 0; i < 3; i++) {
    const built = buildDroughtLordModel(THREE, { isIllusion: true });
    const angle = (i / 3) * TWO_PI + 0.5;
    const dist = 6.5;
    const ix = arena.x + Math.cos(angle) * dist;
    const iz = arena.z + Math.sin(angle) * dist;
    const iy = ctx.world ? ctx.world.getHeight(ix, iz) : 0;
    built.group.position.set(ix, iy, iz);
    built.group.rotation.y = angle + Math.PI;
    ctx.scene.add(built.group);

    rt.illusions.push({
      id: `droughtLord_illusion_${i + 1}`,
      group: built.group,
      anim: built.anim,
      angle,
      dist,
      x: ix,
      y: iy,
      z: iz,
      active: true,
    });
  }

  if (!rt.illusionHintShown) {
    rt.illusionHintShown = true;
    const msg = ctx.i18n?.t?.('toast.boss.illusionSpawn') || '旱障魔主化出三道幻影——唯有六字大明咒（R）能照破妄相！';
    ctx.hud?.toast?.(msg);
  }
}

export const DROUGHT_LORD_DEF = {
  id: 'droughtLord',
  nameKey: 'boss.droughtLord.name',
  titleKey: 'boss.droughtLord.title',
  level: 10,
  hp: 2200,
  def: 16,
  ccResist: 0.75,
  radius: 1.55,
  height: 5.0,
  arena: { map: 'pharping', x: 1990, z: -80, r: 16 },
  buildModel: buildDroughtLordModel,
  phases: [
    {
      hpBelow: 1.0,
      attacks: ['sandstorm', 'fireballVolley', 'magmaSlam'],
      speed: 1.45,
    },
    {
      hpBelow: 0.6,
      attacks: ['thermalBeam', 'fireballVolley', 'magmaSlam'],
      onEnter: 'roar',
      speed: 1.6,
    },
    {
      hpBelow: 0.25,
      attacks: ['thermalBeam', 'fireballVolley', 'magmaSlam', 'sandstorm'],
      onEnter: 'enrage',
      speed: 1.8,
    },
  ],
  attacks: {
    sandstorm(boss, patterns) {
      // Phase 1+ persistent sandstorm in arena (20% slow + 3 golden Mani safe circles)
      patterns.weatherZone(boss, {
        slowMult: 0.8,
        safeRadius: 2.8,
        safeCount: 3,
      });
      return 2.0;
    },
    fireballVolley(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.projectileVolley(boss, {
        count: 5,
        spreadAngle: 0.78,
        windup: fast ? 0.65 : 0.8,
        speed: fast ? 12.2 : 10.8,
        range: 17.0,
        damage: 18,
      });
      return fast ? 2.4 : 3.0;
    },
    magmaSlam(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.radialAoe(boss, {
        radius: 4.5,
        windup: fast ? 0.75 : 1.0,
        damage: fast ? 25 : 21,
        knockback: 6.5,
      });
      return fast ? 2.3 : 3.0;
    },
    thermalBeam(boss, patterns) {
      const fast = boss.enraged || boss.phase >= 3;
      patterns.beam(boss, {
        width: 1.25,
        length: 14.5,
        windup: fast ? 0.72 : 0.88,
        sweepDuration: fast ? 1.05 : 1.3,
        sweepAngle: 1.4,
        damage: 22,
      });
      return fast ? 2.6 : 3.3;
    },
  },
  onStart(boss, ctx) {
    const rt = ensureRuntime(boss);
    clearWhirlwinds(boss, ctx);
    clearIllusions(boss, ctx);
    rt.illusionHintShown = false;
    // Activate Phase 1 sandstorm weather zone right away
    boss.patternRunner?.patterns?.weatherZone?.(boss, {
      slowMult: 0.8,
      safeRadius: 2.8,
      safeCount: 3,
    });
  },
  onPhaseEnter(phaseNum, boss, ctx) {
    if (phaseNum === 2) {
      spawnFlameWhirlwinds(boss, ctx);
    } else if (phaseNum === 3) {
      if (ensureRuntime(boss).whirlwinds.length === 0) {
        spawnFlameWhirlwinds(boss, ctx);
      }
      spawnIllusions(boss, ctx);
    }
  },
  onUpdate(dt, boss, ctx) {
    const rt = ensureRuntime(boss);
    const arena = boss.arena || { x: 1990, z: -80, r: 16 };
    const pPos = ctx.state?.player?.position;
    rt.whirlwindHitCooldown = Math.max(0, rt.whirlwindHitCooldown - dt);

    // 1. Update Phase 2 moving flame whirlwinds
    for (const w of rt.whirlwinds) {
      w.angle += dt * w.speed;
      w.x = arena.x + Math.cos(w.angle) * w.orbitR;
      w.z = arena.z + Math.sin(w.angle) * w.orbitR;
      const wy = ctx.world ? ctx.world.getHeight(w.x, w.z) : 0;
      w.group.position.set(w.x, wy, w.z);
      w.cone.rotation.y += dt * 7.5;
      w.baseRing.rotation.z -= dt * 6.0;

      if (pPos && rt.whirlwindHitCooldown <= 0) {
        const d = Math.hypot(pPos.x - w.x, pPos.z - w.z);
        if (d <= w.radius + 0.4) {
          rt.whirlwindHitCooldown = 0.65;
          if (ctx.player?.damage) {
            ctx.player.damage(10, { x: w.x, z: w.z });
          } else {
            ctx.bus?.emit?.('player:damaged', { amount: 10, source: 'droughtLord.whirlwind' });
          }
        }
      }
    }

    // 2. Update Phase 3 illusions (orbiting & facing player; only real body takes HP damage)
    for (const ill of rt.illusions) {
      if (!ill.active) continue;
      ill.angle += dt * 0.55;
      ill.x = arena.x + Math.cos(ill.angle) * ill.dist;
      ill.z = arena.z + Math.sin(ill.angle) * ill.dist;
      ill.y = ctx.world ? ctx.world.getHeight(ill.x, ill.z) : 0;
      ill.group.position.set(ill.x, ill.y, ill.z);
      if (pPos) {
        ill.group.rotation.y = Math.atan2(pPos.x - ill.x, pPos.z - ill.z);
      }
      ill.anim(dt, { animState: 'walk', enraged: true, subdued: false });
    }
  },
  onMantraCast(ev, boss, ctx) {
    const rt = ensureRuntime(boss);
    const activeIllusions = rt.illusions.filter((ill) => ill.active);
    if (activeIllusions.length === 0) return 0;

    const ox = ev?.origin?.x ?? ctx.state?.player?.position?.x ?? boss.pos.x;
    const oz = ev?.origin?.z ?? ctx.state?.player?.position?.z ?? boss.pos.z;
    // Allow Mantra cast inside the arena (or forceAll) to dispel illusions within reach
    const checkRadius = ev?.forceAll ? 999 : Math.max(ev?.radius ?? 8.5, 16.0);

    let dispelled = 0;
    for (const ill of activeIllusions) {
      const d = Math.hypot(ill.x - ox, ill.z - oz);
      if (d <= checkRadius) {
        ill.active = false;
        ill.group.visible = false;
        if (ill.group.parent) ill.group.parent.remove(ill.group);
        dispelled++;
      }
    }

    if (dispelled > 0) {
      const msg = ctx.i18n?.t?.('toast.boss.illusionDispelled') || '六字光明照破幻影！';
      ctx.hud?.toast?.(msg);
      ctx.bus?.emit?.('boss:illusion:dispelled', {
        id: boss.id,
        dispelled,
        remaining: rt.illusions.filter((i) => i.active).length,
      });
    }
    return dispelled;
  },
  onSubdue(boss, ctx) {
    clearWhirlwinds(boss, ctx);
    clearIllusions(boss, ctx);
    // Immediately set ch1.rain so the valley receives rain upon subjugation
    ctx.quests?.setFlag?.('ch1.rain', true);
    ctx.bus?.emit?.('pharping:rain', { active: true });
  },
  onReset(boss, ctx) {
    clearWhirlwinds(boss, ctx);
    clearIllusions(boss, ctx);
  },
  getExtraState(boss) {
    const rt = ensureRuntime(boss);
    return {
      whirlwindCount: rt.whirlwinds.length,
      illusionCount: rt.illusions.filter((i) => i.active).length,
    };
  },
  oath: {
    dialogue: 'boss.droughtLord.oath',
    protector: null,
    flag: 'boss.droughtLord',
    flags: ['ch1.rain', 'boss.droughtLord'],
  },
  loot: {
    firstKill: { rarity: 'terma', id: 'phurbaSplit' },
    normal: { count: [3, 5], minRarity: 'rare' },
  },
};

export function registerDroughtLordDialogue(ctx) {
  if (!ctx.dialogue?.register) return;
  ctx.dialogue.register({
    'boss.droughtLord.oath': {
      speakerKey: 'boss.droughtLord.name',
      start: 'n1',
      nodes: {
        n1: {
          textKey: 'dlg.boss.droughtLord.oath.1',
          next: 'n2',
        },
        n2: {
          textKey: 'dlg.boss.droughtLord.oath.2',
          next: 'n3',
        },
        n3: {
          textKey: 'dlg.boss.droughtLord.oath.3',
          next: 'n4',
        },
        n4: {
          textKey: 'dlg.boss.droughtLord.oath.4',
          choices: [
            {
              labelKey: 'dlg.boss.droughtLord.oath.accept',
              action: { flag: 'ch1.rain' },
              close: true,
            },
          ],
        },
      },
    },
  });
}

export default DROUGHT_LORD_DEF;
