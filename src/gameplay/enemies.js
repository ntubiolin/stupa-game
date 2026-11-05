/**
 * Enemies Core System — Preta (餓鬼), Tsen (贊), and Migoi (雪人).
 *
 * Implements:
 *  - Shared procedural Three.js geometry & materials for all 3 enemy kinds
 *  - Full AI state machine: wander -> notice -> chase -> windup -> attack -> recover -> chase
 *  - Telegraph ground rings / straight line indicators and body glow
 *  - Melee attacks (claw, spearCharge dash, groundSlam AoE)
 *  - Contact damage (with melee attack priority)
 *  - Mantra cast damage reaction, hurt stun & knockback, and 5-color liberation VFX
 *  - Spawning & respawning (ring-based, cluster spawning for preta)
 *  - Gate safe zone enforcement (10m radius around 1000, 62)
 *  - Debug harness API (spawn, clear, list, freeze)
 *
 * Strict zero-memory-leak: base geometries and particle pools allocated once.
 */
import * as THREE from 'three';
import {
  pickEliteAffixes,
  rollRareMonsterSeed,
  formatEliteTitle,
  formatEliteAffixSubtitle,
} from '../data/eliteAffixes.js';

const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * Math.min(1, t);
}

export function createEnemies(ctx) {
  const { scene, state, config, bus, i18n } = ctx;
  const cfg = config.ENEMIES;
  const wildCfg = config.WILD;

  const enemyGroup = new THREE.Group();
  enemyGroup.name = 'Enemies';
  scene.add(enemyGroup);

  // ---------------------------------------------------------------- 1. Shared Geometries
  // --- Preta Geometries
  const pretaBellyGeo = new THREE.SphereGeometry(0.38, 12, 10);
  pretaBellyGeo.scale(1.15, 1.35, 1.15);
  pretaBellyGeo.translate(0, 0.58, 0);

  const pretaNeckGeo = new THREE.CylinderGeometry(0.05, 0.075, 0.32, 8);
  pretaNeckGeo.translate(0, 1.08, 0);

  const pretaHeadGeo = new THREE.SphereGeometry(0.18, 10, 8);
  pretaHeadGeo.scale(0.9, 1.1, 0.9);
  pretaHeadGeo.translate(0, 1.32, 0);

  const pretaMouthGeo = new THREE.TorusGeometry(0.045, 0.018, 6, 8);
  pretaMouthGeo.translate(0, 1.26, -0.16);

  const pretaEyeGeo = new THREE.SphereGeometry(0.038, 8, 8);
  const pretaLimbGeo = new THREE.CylinderGeometry(0.045, 0.032, 0.58, 6);

  // --- Tsen Geometries (Warrior + Horse + Spear)
  const horseBodyGeo = new THREE.BoxGeometry(0.68, 0.65, 1.35);
  horseBodyGeo.translate(0, 0.95, 0);

  const horseNeckGeo = new THREE.BoxGeometry(0.28, 0.52, 0.42);
  horseNeckGeo.translate(0, 1.32, -0.58);

  const horseHeadGeo = new THREE.BoxGeometry(0.26, 0.32, 0.52);
  horseHeadGeo.translate(0, 1.48, -0.82);

  const horseLegGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.85, 6);
  const horseTailGeo = new THREE.ConeGeometry(0.09, 0.55, 5);
  horseTailGeo.rotateX(0.4);
  horseTailGeo.translate(0, 0.95, 0.82);

  const riderTorsoGeo = new THREE.CylinderGeometry(0.24, 0.19, 0.58, 8);
  riderTorsoGeo.translate(0, 1.58, 0.05);

  const riderHeadGeo = new THREE.SphereGeometry(0.16, 8, 8);
  riderHeadGeo.translate(0, 1.95, 0.05);

  const riderCrestGeo = new THREE.ConeGeometry(0.065, 0.28, 5);
  riderCrestGeo.translate(0, 2.16, 0.03);

  const riderArmGeo = new THREE.CylinderGeometry(0.065, 0.052, 0.42, 6);

  const spearShaftGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.3, 6);
  spearShaftGeo.rotateX(-Math.PI / 2);
  spearShaftGeo.translate(0.38, 1.58, -0.65);

  const spearHeadGeo = new THREE.ConeGeometry(0.065, 0.32, 5);
  spearHeadGeo.rotateX(-Math.PI / 2);
  spearHeadGeo.translate(0.38, 1.58, -1.88);

  // --- Migoi Geometries (Heavy Yeti)
  const migoiTorsoGeo = new THREE.BoxGeometry(1.08, 1.18, 0.88);
  migoiTorsoGeo.translate(0, 1.35, 0);

  const migoiHunchGeo = new THREE.BoxGeometry(1.28, 0.48, 0.98);
  migoiHunchGeo.translate(0, 1.88, -0.06);

  const migoiHeadGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  migoiHeadGeo.translate(0, 2.22, -0.22);

  const migoiFaceGeo = new THREE.BoxGeometry(0.36, 0.36, 0.08);
  migoiFaceGeo.translate(0, 2.2, -0.48);

  const migoiArmGeo = new THREE.CylinderGeometry(0.18, 0.13, 1.15, 8);
  const migoiLegGeo = new THREE.CylinderGeometry(0.22, 0.17, 0.95, 8);
  const migoiEyeGeo = new THREE.SphereGeometry(0.045, 8, 8);

  // --- Telegraph Geometries
  // Migoi slam: outer ring (r=3.5) + inner fill circle (r=3.35)
  const slamRingGeo = new THREE.RingGeometry(3.38, 3.5, 36);
  slamRingGeo.rotateX(-Math.PI / 2);

  const slamFillGeo = new THREE.CircleGeometry(3.35, 36);
  slamFillGeo.rotateX(-Math.PI / 2);

  // Tsen spear charge: 8m line x 1.1m wide
  // Pivot at z = 0, extends along -Z for 8m
  const chargeLineGeo = new THREE.PlaneGeometry(1.1, 8.0);
  chargeLineGeo.translate(0, 4.0, 0);
  chargeLineGeo.rotateX(-Math.PI / 2);

  // Tsen red arrow aim line: 16m line x 0.22m wide
  const aimLineGeo = new THREE.PlaneGeometry(0.22, 16.0);
  aimLineGeo.translate(0, 8.0, 0);
  aimLineGeo.rotateX(-Math.PI / 2);

  // Preta mouth gathering green orb
  const pretaOrbGeo = new THREE.SphereGeometry(0.14, 10, 8);

  // --- Status Effect Geometries & Shared Materials (Root & Stun)
  const rootOuterRingGeo = new THREE.RingGeometry(0.62, 0.82, 32);
  rootOuterRingGeo.rotateX(-Math.PI / 2);
  const rootInnerRingGeo = new THREE.RingGeometry(0.34, 0.44, 24);
  rootInnerRingGeo.rotateX(-Math.PI / 2);

  const sharedRootMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.75, 0.35),
    toneMapped: false,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const stunHubGeo = new THREE.SphereGeometry(0.085, 8, 8);
  const stunProngGeo = new THREE.ConeGeometry(0.065, 0.24, 6);
  const stunHaloGeo = new THREE.RingGeometry(0.24, 0.3, 18);
  stunHaloGeo.rotateX(-Math.PI / 2);

  const sharedStunMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.95, 0.45),
    toneMapped: false,
    side: THREE.DoubleSide,
  });

  // --- Elite Rank Halos & Affix Visual Geometries / Materials (Zero PointLight)
  const championHaloGeo = new THREE.RingGeometry(0.68, 0.88, 32);
  championHaloGeo.rotateX(-Math.PI / 2);
  const championHaloMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  const rareHaloGeo = new THREE.RingGeometry(0.76, 1.02, 36);
  rareHaloGeo.rotateX(-Math.PI / 2);
  const rareHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  const armorPlateGeo = new THREE.BoxGeometry(0.22, 0.34, 0.08);
  const armorPlateMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.4,
    metalness: 0.72,
    emissive: 0x1e293b,
    emissiveIntensity: 0.45,
  });

  const shieldSphereGeo = new THREE.SphereGeometry(1.0, 18, 14);
  const sharedShieldMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  const frozenOrbGeo = new THREE.SphereGeometry(0.24, 12, 10);
  const frozenOrbMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const frozenRingGeo = new THREE.RingGeometry(1.68, 1.8, 32);
  frozenRingGeo.rotateX(-Math.PI / 2);
  const frozenFillGeo = new THREE.CircleGeometry(1.75, 32);
  frozenFillGeo.rotateX(-Math.PI / 2);

  const moltenPatchGeo = new THREE.CircleGeometry(1.3, 28);
  moltenPatchGeo.rotateX(-Math.PI / 2);
  const moltenPatchRingGeo = new THREE.RingGeometry(1.18, 1.3, 28);
  moltenPatchRingGeo.rotateX(-Math.PI / 2);

  const moltenBombRingGeo = new THREE.RingGeometry(2.36, 2.5, 36);
  moltenBombRingGeo.rotateX(-Math.PI / 2);
  const moltenBombFillGeo = new THREE.CircleGeometry(2.45, 36);
  moltenBombFillGeo.rotateX(-Math.PI / 2);

  const puffSphereGeo = new THREE.SphereGeometry(0.45, 10, 8);

  const eliteHazardGroup = new THREE.Group();
  eliteHazardGroup.name = 'EliteHazards';
  enemyGroup.add(eliteHazardGroup);

  // Debug Query Visualization Group (for cone/line/circle inspection)
  const debugQueryGroup = new THREE.Group();
  debugQueryGroup.name = 'EnemyQueryDebug';
  debugQueryGroup.visible = false;
  scene.add(debugQueryGroup);

  // ---------------------------------------------------------------- 2. Particle System (Five-color liberation)
  const PARTICLE_COUNT = 80;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleColors = new Float32Array(PARTICLE_COUNT * 3);

  // Tibetan five sacred colors
  const TIBETAN_COLORS = [
    new THREE.Color(0x3b82f6), // Blue
    new THREE.Color(0xffffff), // White
    new THREE.Color(0xef4444), // Red
    new THREE.Color(0x10b981), // Green
    new THREE.Color(0xf59e0b), // Yellow
  ];

  const particleData = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const col = TIBETAN_COLORS[i % 5];
    particleColors[i * 3 + 0] = col.r;
    particleColors[i * 3 + 1] = col.g;
    particleColors[i * 3 + 2] = col.b;

    particlePositions[i * 3 + 0] = 0;
    particlePositions[i * 3 + 1] = -999;
    particlePositions[i * 3 + 2] = 0;

    particleData.push({
      active: false,
      x: 0,
      y: -999,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 1.2,
      scale: 1,
    });
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const liberationPoints = new THREE.Points(particleGeo, particleMat);
  liberationPoints.name = 'LiberationParticles';
  enemyGroup.add(liberationPoints);

  function spawnLiberationBurst(pos, height) {
    let spawned = 0;
    for (let i = 0; i < PARTICLE_COUNT && spawned < 24; i++) {
      const p = particleData[i];
      if (!p.active) {
        p.active = true;
        const angle = Math.random() * Math.PI * 2;
        const dist = 0.2 + Math.random() * 0.6;
        p.x = pos.x + Math.cos(angle) * dist;
        p.y = pos.y + Math.random() * (height * 0.8) + 0.2;
        p.z = pos.z + Math.sin(angle) * dist;

        const speed = 0.8 + Math.random() * 1.5;
        p.vx = Math.cos(angle) * (speed * 0.4);
        p.vy = 1.2 + Math.random() * 1.8;
        p.vz = Math.sin(angle) * (speed * 0.4);

        p.life = 0;
        p.maxLife = 0.8 + Math.random() * 0.5;
        spawned++;
      }
    }
  }

  // ---------------------------------------------------------------- 3. Enemy Instance Builder
  const activeEnemies = [];
  const pendingRespawns = [];
  const pendingElitePackRespawns = [];
  const activeFrozenOrbs = [];
  const activeMoltenPatches = [];
  const activeMoltenBombs = [];
  const activePuffs = [];
  let enemyIdCounter = 1;
  let packIdCounter = 1;
  let isFrozen = false;

  const RANK_MULTS = {
    normal: { hp: 1.0, dmg: 1.0, exp: 1.0 },
    champion: { hp: 2.5, dmg: 1.3, exp: 3.0 },
    rare: { hp: 4.0, dmg: 1.5, exp: 5.0 },
    boss: { hp: 18.0, dmg: 1.8, exp: 20.0 },
  };

  function spawnSmokePuff(pos, colorHex = 0x1e1b4b, maxScale = 1.8, duration = 0.45) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.75,
      blending: colorHex === 0x1e1b4b ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(puffSphereGeo, mat);
    mesh.position.set(pos.x, (pos.y || 0) + 0.85, pos.z);
    eliteHazardGroup.add(mesh);
    activePuffs.push({ mesh, mat, age: 0, duration, maxScale });
  }

  function spawnFrozenOrbHazard(x, z, dmgScale = 1) {
    const y = ctx.world ? ctx.world.getHeight(x, z) : 0;
    const grp = new THREE.Group();
    grp.position.set(x, y + 0.03, z);

    const orbMesh = new THREE.Mesh(frozenOrbGeo, frozenOrbMat);
    orbMesh.position.y = 0.55;
    grp.add(orbMesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const ringMesh = new THREE.Mesh(frozenRingGeo, ringMat);
    grp.add(ringMesh);

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const fillMesh = new THREE.Mesh(frozenFillGeo, fillMat);
    fillMesh.scale.set(0.01, 1, 0.01);
    grp.add(fillMesh);

    eliteHazardGroup.add(grp);
    activeFrozenOrbs.push({
      group: grp,
      orbMesh,
      ringMat,
      fillMat,
      fillMesh,
      x,
      y,
      z,
      age: 0,
      fuseTime: 1.5,
      radius: 1.8,
      damage: Math.max(1, Math.round(8 * dmgScale)),
      slow: 2.0,
    });
  }

  function spawnMoltenPatchHazard(x, z, dmgScale = 1) {
    const y = ctx.world ? ctx.world.getHeight(x, z) : 0;
    const grp = new THREE.Group();
    grp.position.set(x, y + 0.025, z);

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const fillMesh = new THREE.Mesh(moltenPatchGeo, fillMat);
    grp.add(fillMesh);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const ringMesh = new THREE.Mesh(moltenPatchRingGeo, ringMat);
    grp.add(ringMesh);

    eliteHazardGroup.add(grp);
    activeMoltenPatches.push({
      group: grp,
      fillMat,
      ringMat,
      x,
      y,
      z,
      age: 0,
      duration: 3.5,
      radius: 1.3,
      tickTimer: 0.1,
      tickInterval: 0.5,
      damage: Math.max(1, Math.round(2 * dmgScale)),
    });
  }

  function spawnMoltenDeathBomb(x, z, dmgScale = 1) {
    const y = ctx.world ? ctx.world.getHeight(x, z) : 0;
    const grp = new THREE.Group();
    grp.position.set(x, y + 0.035, z);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const ringMesh = new THREE.Mesh(moltenBombRingGeo, ringMat);
    grp.add(ringMesh);

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const fillMesh = new THREE.Mesh(moltenBombFillGeo, fillMat);
    fillMesh.scale.set(0.01, 1, 0.01);
    grp.add(fillMesh);

    eliteHazardGroup.add(grp);
    activeMoltenBombs.push({
      group: grp,
      ringMat,
      fillMat,
      fillMesh,
      x,
      y,
      z,
      age: 0,
      fuseTime: 1.5,
      radius: 2.5,
      damage: Math.max(1, Math.round(14 * dmgScale)),
    });
  }

  function clearEliteHazards() {
    for (const o of activeFrozenOrbs) {
      eliteHazardGroup.remove(o.group);
      o.ringMat.dispose();
      o.fillMat.dispose();
    }
    activeFrozenOrbs.length = 0;

    for (const p of activeMoltenPatches) {
      eliteHazardGroup.remove(p.group);
      p.fillMat.dispose();
      p.ringMat.dispose();
    }
    activeMoltenPatches.length = 0;

    for (const b of activeMoltenBombs) {
      eliteHazardGroup.remove(b.group);
      b.ringMat.dispose();
      b.fillMat.dispose();
    }
    activeMoltenBombs.length = 0;

    for (const pf of activePuffs) {
      eliteHazardGroup.remove(pf.mesh);
      pf.mat.dispose();
    }
    activePuffs.length = 0;
  }

  function sampleMapLevel() {
    const mapDef = ctx.world?.getMap(state.zone);
    const range = mapDef?.level;
    if (Array.isArray(range) && range.length >= 2) {
      const min = Math.max(1, Math.floor(range[0]));
      const max = Math.max(min, Math.floor(range[1]));
      return min + Math.floor(Math.random() * (max - min + 1));
    }
    return 1;
  }

  function applyIdleMaterialEmissive(enemy) {
    const isSlowed = (enemy.status?.slow?.remaining || 0) > 0;
    for (const mat of enemy.materials) {
      if (isSlowed) {
        mat.emissive?.setRGB(0.14, 0.52, 0.95);
        if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0.6;
      } else {
        mat.emissive?.setHex(0x000000);
        if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0;
      }
    }
  }

  function createEnemyInstance(kind, spawnPos, opts = {}) {
    const kCfg = cfg.kinds[kind] || cfg.kinds.preta;
    const id = `${kind}_${enemyIdCounter++}`;

    const level =
      opts.level != null
        ? Math.max(1, Math.floor(Number(opts.level)))
        : sampleMapLevel();
    const rank = opts.rank || 'normal';
    const rMult = RANK_MULTS[rank] || RANK_MULTS.normal;

    const hpScale = (1 + 0.20 * (level - 1)) * rMult.hp;
    const dmgScale = (1 + 0.12 * (level - 1)) * rMult.dmg;
    const expScale = (1 + 0.18 * (level - 1)) * rMult.exp;

    const scaledHp = Math.max(1, Math.round(kCfg.hp * hpScale));
    const scaledExp = Math.max(1, Math.round(kCfg.exp * expScale));
    const displayNameKey = opts.displayNameKey || kCfg.nameKey || `enemy.${kind}`;
    const def = opts.def ?? kCfg.def ?? 0;
    const ccResist = opts.ccResist ?? kCfg.ccResist ?? 0;
    const tags = Array.isArray(opts.tags)
      ? [...opts.tags]
      : Array.isArray(kCfg.tags)
        ? [...kCfg.tags]
        : [kind];

    const group = new THREE.Group();
    group.name = `Enemy_${id}`;
    group.position.set(spawnPos.x, spawnPos.y, spawnPos.z);

    const materials = [];
    const animNodes = {};

    if (kind === 'preta') {
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0x4d6352,
        roughness: 0.82,
        metalness: 0.04,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(0x000000),
      });
      materials.push(skinMat);

      const eyeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.2, 0.4, 0.3),
        toneMapped: false,
      });

      const belly = new THREE.Mesh(pretaBellyGeo, skinMat);
      belly.castShadow = true;
      group.add(belly);

      const neck = new THREE.Mesh(pretaNeckGeo, skinMat);
      group.add(neck);

      const head = new THREE.Mesh(pretaHeadGeo, skinMat);
      head.castShadow = true;
      group.add(head);

      const mouth = new THREE.Mesh(pretaMouthGeo, skinMat);
      group.add(mouth);

      // Glowing hungry eyes
      const eyeL = new THREE.Mesh(pretaEyeGeo, eyeMat);
      eyeL.position.set(-0.065, 1.34, -0.16);
      group.add(eyeL);

      const eyeR = new THREE.Mesh(pretaEyeGeo, eyeMat);
      eyeR.position.set(0.065, 1.34, -0.16);
      group.add(eyeR);

      // Green mouth gathering orb for ghostfire
      const mouthOrbMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      });
      const mouthOrb = new THREE.Mesh(pretaOrbGeo, mouthOrbMat);
      mouthOrb.position.set(0, 1.26, -0.28);
      mouthOrb.visible = false;
      group.add(mouthOrb);
      animNodes.mouthOrb = mouthOrb;

      // Limbs
      const armL = new THREE.Mesh(pretaLimbGeo, skinMat);
      armL.position.set(-0.32, 0.75, 0);
      armL.rotation.z = 0.22;
      group.add(armL);

      const armR = new THREE.Mesh(pretaLimbGeo, skinMat);
      armR.position.set(0.32, 0.75, 0);
      armR.rotation.z = -0.22;
      group.add(armR);

      const legL = new THREE.Mesh(pretaLimbGeo, skinMat);
      legL.position.set(-0.16, 0.28, 0);
      group.add(legL);

      const legR = new THREE.Mesh(pretaLimbGeo, skinMat);
      legR.position.set(0.16, 0.28, 0);
      group.add(legR);

      animNodes.armL = armL;
      animNodes.armR = armR;
      animNodes.legL = legL;
      animNodes.legR = legR;
      animNodes.belly = belly;
    } else if (kind === 'tsen') {
      const horseMat = new THREE.MeshStandardMaterial({
        color: 0x821919,
        roughness: 0.68,
        metalness: 0.05,
        emissive: new THREE.Color(0x000000),
      });
      const armorMat = new THREE.MeshStandardMaterial({
        color: 0xa82020,
        roughness: 0.42,
        metalness: 0.45,
        emissive: new THREE.Color(0x000000),
      });
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.32,
        metalness: 0.75,
        emissive: new THREE.Color(0x000000),
      });
      const woodMat = new THREE.MeshStandardMaterial({
        color: 0x3d271d,
        roughness: 0.85,
        emissive: new THREE.Color(0x000000),
      });
      materials.push(horseMat, armorMat, goldMat, woodMat);

      // Horse body & head
      const hBody = new THREE.Mesh(horseBodyGeo, horseMat);
      hBody.castShadow = true;
      group.add(hBody);

      const hNeck = new THREE.Mesh(horseNeckGeo, horseMat);
      group.add(hNeck);

      const hHead = new THREE.Mesh(horseHeadGeo, horseMat);
      hHead.castShadow = true;
      group.add(hHead);

      const hTail = new THREE.Mesh(horseTailGeo, horseMat);
      group.add(hTail);

      // 4 horse legs
      const hLegFL = new THREE.Mesh(horseLegGeo, horseMat);
      hLegFL.position.set(-0.25, 0.42, -0.42);
      group.add(hLegFL);

      const hLegFR = new THREE.Mesh(horseLegGeo, horseMat);
      hLegFR.position.set(0.25, 0.42, -0.42);
      group.add(hLegFR);

      const hLegBL = new THREE.Mesh(horseLegGeo, horseMat);
      hLegBL.position.set(-0.25, 0.42, 0.42);
      group.add(hLegBL);

      const hLegBR = new THREE.Mesh(horseLegGeo, horseMat);
      hLegBR.position.set(0.25, 0.42, 0.42);
      group.add(hLegBR);

      // Crimson Warrior Rider
      const rTorso = new THREE.Mesh(riderTorsoGeo, armorMat);
      rTorso.castShadow = true;
      group.add(rTorso);

      const rHead = new THREE.Mesh(riderHeadGeo, armorMat);
      rHead.castShadow = true;
      group.add(rHead);

      const rCrest = new THREE.Mesh(riderCrestGeo, goldMat);
      group.add(rCrest);

      const rArmL = new THREE.Mesh(riderArmGeo, armorMat);
      rArmL.position.set(-0.32, 1.55, 0.05);
      rArmL.rotation.z = 0.25;
      group.add(rArmL);

      const rArmR = new THREE.Mesh(riderArmGeo, armorMat);
      rArmR.position.set(0.32, 1.55, 0.05);
      rArmR.rotation.z = -0.35;
      group.add(rArmR);

      // Long Spear
      const spearShaft = new THREE.Mesh(spearShaftGeo, woodMat);
      group.add(spearShaft);

      const spearHead = new THREE.Mesh(spearHeadGeo, goldMat);
      spearHead.castShadow = true;
      group.add(spearHead);

      animNodes.hLegFL = hLegFL;
      animNodes.hLegFR = hLegFR;
      animNodes.hLegBL = hLegBL;
      animNodes.hLegBR = hLegBR;
      animNodes.spearShaft = spearShaft;
      animNodes.spearHead = spearHead;
    } else {
      // migoi (雪人)
      const furMat = new THREE.MeshStandardMaterial({
        color: 0xe6eaed,
        roughness: 0.88,
        metalness: 0.02,
        emissive: new THREE.Color(0x000000),
      });
      const faceMat = new THREE.MeshStandardMaterial({
        color: 0x25282e,
        roughness: 0.85,
        emissive: new THREE.Color(0x000000),
      });
      const eyeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.8, 1.8, 2.5),
        toneMapped: false,
      });
      materials.push(furMat, faceMat);

      const torso = new THREE.Mesh(migoiTorsoGeo, furMat);
      torso.castShadow = true;
      group.add(torso);

      const hunch = new THREE.Mesh(migoiHunchGeo, furMat);
      hunch.castShadow = true;
      group.add(hunch);

      const head = new THREE.Mesh(migoiHeadGeo, furMat);
      head.castShadow = true;
      group.add(head);

      const face = new THREE.Mesh(migoiFaceGeo, faceMat);
      group.add(face);

      const eyeL = new THREE.Mesh(migoiEyeGeo, eyeMat);
      eyeL.position.set(-0.11, 2.24, -0.52);
      group.add(eyeL);

      const eyeR = new THREE.Mesh(migoiEyeGeo, eyeMat);
      eyeR.position.set(0.11, 2.24, -0.52);
      group.add(eyeR);

      const armL = new THREE.Mesh(migoiArmGeo, furMat);
      armL.position.set(-0.68, 1.45, 0);
      group.add(armL);

      const armR = new THREE.Mesh(migoiArmGeo, furMat);
      armR.position.set(0.68, 1.45, 0);
      group.add(armR);

      const legL = new THREE.Mesh(migoiLegGeo, furMat);
      legL.position.set(-0.35, 0.48, 0);
      group.add(legL);

      const legR = new THREE.Mesh(migoiLegGeo, furMat);
      legR.position.set(0.35, 0.48, 0);
      group.add(legR);

      animNodes.armL = armL;
      animNodes.armR = armR;
      animNodes.legL = legL;
      animNodes.legR = legR;
      animNodes.torso = torso;
    }

    // --- Telegraph Meshes
    let telegraphGroup = null;
    let telegraphFill = null;
    let chargeLineMesh = null;
    let aimLineMesh = null;

    if (kind === 'migoi') {
      telegraphGroup = new THREE.Group();
      telegraphGroup.name = `Telegraph_${id}`;
      telegraphGroup.visible = false;

      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.2, 0.25, 0.25),
        toneMapped: false,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(slamRingGeo, ringMat);
      telegraphGroup.add(ringMesh);

      const fillMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.0, 0.2, 0.2),
        toneMapped: false,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      });
      telegraphFill = new THREE.Mesh(slamFillGeo, fillMat);
      telegraphFill.scale.set(0.001, 1, 0.001);
      telegraphGroup.add(telegraphFill);

      enemyGroup.add(telegraphGroup);
    } else if (kind === 'tsen') {
      telegraphGroup = new THREE.Group();
      telegraphGroup.name = `Telegraph_${id}`;
      telegraphGroup.visible = false;

      const lineMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.2, 0.2, 0.2),
        toneMapped: false,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      chargeLineMesh = new THREE.Mesh(chargeLineGeo, lineMat);
      telegraphGroup.add(chargeLineMesh);
      telegraphFill = chargeLineMesh;

      const aimMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.2, 0.2, 0.2),
        toneMapped: false,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      aimLineMesh = new THREE.Mesh(aimLineGeo, aimMat);
      aimLineMesh.visible = false;
      telegraphGroup.add(aimLineMesh);

      enemyGroup.add(telegraphGroup);
    }

    // --- Status Effect Visual Indicators (Root golden ring & Stun overhead mini-vajra)
    const rootIndicator = new THREE.Group();
    rootIndicator.name = `RootIndicator_${id}`;
    rootIndicator.position.set(0, 0.04, 0);
    const rScale = (kCfg.radius || 0.6) / 0.6;
    rootIndicator.scale.set(rScale, 1, rScale);
    rootIndicator.add(new THREE.Mesh(rootOuterRingGeo, sharedRootMat));
    rootIndicator.add(new THREE.Mesh(rootInnerRingGeo, sharedRootMat));
    rootIndicator.visible = false;
    group.add(rootIndicator);

    const stunIndicator = new THREE.Group();
    stunIndicator.name = `StunIndicator_${id}`;
    stunIndicator.position.set(0, (kCfg.height || 1.6) + 0.45, 0);
    const hubMesh = new THREE.Mesh(stunHubGeo, sharedStunMat);
    const prongL = new THREE.Mesh(stunProngGeo, sharedStunMat);
    prongL.rotation.z = Math.PI / 2;
    prongL.position.x = -0.18;
    const prongR = new THREE.Mesh(stunProngGeo, sharedStunMat);
    prongR.rotation.z = -Math.PI / 2;
    prongR.position.x = 0.18;
    const haloMesh = new THREE.Mesh(stunHaloGeo, sharedRootMat);
    stunIndicator.add(hubMesh, prongL, prongR, haloMesh);
    stunIndicator.visible = false;
    group.add(stunIndicator);

    // --- Elite Rank & Affix Setup
    const affixes = Array.isArray(opts.affixes) ? [...opts.affixes] : [];
    const hasAffix = (affixId) => affixes.includes(affixId);
    const eliteNameSeed =
      opts.eliteNameSeed || (rank === 'rare' ? rollRareMonsterSeed() : null);

    if (rank === 'rare') {
      group.scale.setScalar(1.2);
    }

    let rankHaloMesh = null;
    if (rank === 'champion') {
      rankHaloMesh = new THREE.Mesh(championHaloGeo, championHaloMat);
      rankHaloMesh.position.set(0, 0.03, 0);
      rankHaloMesh.scale.set(rScale * 1.15, 1, rScale * 1.15);
      group.add(rankHaloMesh);
    } else if (rank === 'rare') {
      rankHaloMesh = new THREE.Mesh(rareHaloGeo, rareHaloMat);
      rankHaloMesh.position.set(0, 0.035, 0);
      rankHaloMesh.scale.set(rScale * 1.2, 1, rScale * 1.2);
      group.add(rankHaloMesh);
    }

    let armorRingGroup = null;
    if (hasAffix('armored')) {
      armorRingGroup = new THREE.Group();
      armorRingGroup.position.set(0, (kCfg.height || 1.6) * 0.55, 0);
      const orbitR = (kCfg.radius || 0.6) + 0.26;
      for (let pIdx = 0; pIdx < 3; pIdx++) {
        const ang = (pIdx / 3) * Math.PI * 2;
        const plate = new THREE.Mesh(armorPlateGeo, armorPlateMat);
        plate.position.set(Math.cos(ang) * orbitR, 0, Math.sin(ang) * orbitR);
        plate.rotation.y = -ang + Math.PI / 2;
        armorRingGroup.add(plate);
      }
      group.add(armorRingGroup);
      for (const mat of materials) {
        if (mat.metalness != null) mat.metalness = Math.min(0.9, mat.metalness + 0.35);
      }
    }

    let shieldMesh = null;
    const hasShielding = hasAffix('shielding');
    if (hasShielding) {
      shieldMesh = new THREE.Mesh(shieldSphereGeo, sharedShieldMat);
      const shieldRadius = Math.max(0.95, (kCfg.height || 1.6) * 0.65);
      shieldMesh.scale.setScalar(shieldRadius);
      shieldMesh.position.set(0, (kCfg.height || 1.6) * 0.5, 0);
      shieldMesh.visible = true;
      group.add(shieldMesh);
    }

    enemyGroup.add(group);

    const speedMult = hasAffix('swift') ? 1.5 : 1.0;
    const cooldownMult = hasAffix('swift') ? 0.8 : 1.0;
    const incomingDmgMult = hasAffix('armored') ? 0.7 : 1.0;

    const enemy = {
      id,
      kind,
      kindConfig: kCfg,
      level,
      rank,
      affixes,
      eliteNameSeed,
      packId: opts.packId || null,
      packRank: opts.packRank || null,
      minionOf: opts.minionOf || null,
      noSplit: Boolean(opts.noSplit),
      displayNameKey,
      def,
      ccResist,
      tags,
      dmgScale,
      cooldownMult,
      incomingDmgMult,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: kCfg.speed * speedMult,
      exp: scaledExp,
      ring: kCfg.ring,
      radius: kCfg.radius * (rank === 'rare' ? 1.2 : 1.0),
      height: kCfg.height * (rank === 'rare' ? 1.2 : 1.0),
      pos: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
      position: group.position,
      heading: 0,
      lockedHeading: 0,
      lastAttackId: null,
      state: 'wander',
      stateTimer: 0,
      activeAttack: null,
      attackCooldowns: {},
      status: {
        root: 0,
        stun: 0,
        slow: { mult: 1, remaining: 0, duration: 0 },
      },
      wasSlowed: false,
      wanderTarget: { x: spawnPos.x, z: spawnPos.z },
      wanderTimer: 1.0 + Math.random() * 3.0,
      homePos: { x: spawnPos.x, z: spawnPos.z },
      flashTimer: 0,
      liberateTimer: 0,
      shielded: hasShielding,
      shieldTimer: hasShielding ? 3.0 : 0,
      shieldCooldown: 8.0,
      frozenTimer: 6.0,
      moltenTimer: 0.25,
      teleportTimer: 5.0,
      group,
      materials,
      animNodes,
      rootIndicator,
      stunIndicator,
      rankHaloMesh,
      armorRingGroup,
      shieldMesh,
      telegraphGroup,
      telegraphFill,
      chargeLineMesh,
      aimLineMesh,
      chargeData: null,
      animTime: Math.random() * 10,
    };

    Object.defineProperty(enemy, 'eliteName', {
      enumerable: true,
      get() {
        if (enemy.rank === 'champion' || enemy.rank === 'rare') {
          return formatEliteTitle(enemy);
        }
        return i18n?.t ? i18n.t(enemy.displayNameKey) : enemy.kind;
      },
    });

    Object.defineProperty(enemy, 'eliteSubtitle', {
      enumerable: true,
      get() {
        if (enemy.rank === 'rare' || enemy.rank === 'champion') {
          return formatEliteAffixSubtitle(enemy.affixes);
        }
        return '';
      },
    });

    activeEnemies.push(enemy);
    return enemy;
  }

  // ---------------------------------------------------------------- 4. Clamping & Collisions
  function clampEnemyPosition(enemy) {
    const mapDef = ctx.world?.getMap(state.zone);
    const origin = mapDef?.origin || wildCfg.origin || { x: 1000, z: 0 };
    const maxR = ((mapDef?.walkRadius ?? wildCfg.walkRadius) || 70) - enemy.radius;

    // 1. Walk boundary from map origin
    let dx = enemy.pos.x - origin.x;
    let dz = enemy.pos.z - origin.z;
    let r = Math.hypot(dx, dz);
    if (r > maxR) {
      const s = maxR / (r || 1);
      enemy.pos.x = origin.x + dx * s;
      enemy.pos.z = origin.z + dz * s;
    }

    // 2. Safe zones (from mapDef.safeZones)
    const safeZones = mapDef?.safeZones || [
      { x: wildCfg.wildGate.x, z: wildCfg.wildGate.z, r: cfg.gateSafeRadius ?? 10 },
    ];
    for (let s = 0; s < safeZones.length; s++) {
      const sz = safeZones[s];
      const safeR = sz.r ?? cfg.gateSafeRadius ?? 10;
      const gdx = enemy.pos.x - sz.x;
      const gdz = enemy.pos.z - sz.z;
      const gd = Math.hypot(gdx, gdz);
      if (gd < safeR) {
        const push = safeR / (gd || 1);
        enemy.pos.x = sz.x + gdx * push;
        enemy.pos.z = sz.z + gdz * push;
      }
    }

    // 3. Obstacle colliders
    const currentZone = state.zone || 'stupa';
    if (Array.isArray(ctx.colliders)) {
      for (let i = 0; i < ctx.colliders.length; i++) {
        const c = ctx.colliders[i];
        if (!c || (c.zone || 'stupa') !== currentZone) continue;
        if (c.type === 'circle') {
          const cdx = enemy.pos.x - c.x;
          const cdz = enemy.pos.z - c.z;
          const minDist = (c.r || 0) + enemy.radius;
          const d2 = cdx * cdx + cdz * cdz;
          if (d2 < minDist * minDist) {
            const d = Math.sqrt(d2) || 0.001;
            const push = (minDist - d) / d;
            enemy.pos.x += cdx * push;
            enemy.pos.z += cdz * push;
          }
        }
      }
    }

    // 4. Ground height
    enemy.pos.y = ctx.world ? ctx.world.getHeight(enemy.pos.x, enemy.pos.z) : 0;
  }

  // ---------------------------------------------------------------- 5. Initial Spawning
  function disposeEnemy(e) {
    if (e.telegraphGroup) {
      enemyGroup.remove(e.telegraphGroup);
      (ctx.wildGroup || scene).remove(e.telegraphGroup);
      scene.remove(e.telegraphGroup);
      e.telegraphGroup.traverse((child) => {
        if (child.material) child.material.dispose();
      });
    }
    if (e.animNodes?.mouthOrb) {
      e.animNodes.mouthOrb.visible = false;
    }
    enemyGroup.remove(e.group);
    if (Array.isArray(e.materials)) {
      for (const m of e.materials) m.dispose?.();
    }
  }

  function clearAllEnemies() {
    for (const e of activeEnemies) {
      disposeEnemy(e);
    }
    activeEnemies.length = 0;
    pendingRespawns.length = 0;
    pendingElitePackRespawns.length = 0;
    clearEliteHazards();
  }

  function pickEliteKindForMap(mapDef) {
    const spawnTable = mapDef?.spawnTable || [];
    if (spawnTable.length > 0) {
      const idx = Math.floor(Math.random() * spawnTable.length);
      return spawnTable[idx].kind || 'preta';
    }
    return 'preta';
  }

  let nextPackId = 1;

  function spawnElitePack(kind = 'preta', rank = 'champion', affixIds = null, centerPos = null) {
    const resolvedRank = rank === 'rare' ? 'rare' : 'champion';
    const resolvedKind = cfg.kinds?.[kind] ? kind : 'preta';
    const packId = `elite_pack_${nextPackId++}`;

    let center = centerPos;
    if (!center) {
      if (ctx.world?.sampleSpawnPoint) {
        const area = resolvedRank === 'rare' ? 'deep' : 'mid';
        center = ctx.world.sampleSpawnPoint(area, { minDistFromGate: 14 });
      } else {
        const playerPos = state.player?.position || { x: 1000, y: 0, z: 57 };
        center = { x: playerPos.x, y: playerPos.y || 0, z: playerPos.z - 6 };
      }
    }

    const normalizedAffixes = Array.isArray(affixIds)
      ? affixIds.filter(Boolean)
      : typeof affixIds === 'string' && affixIds
        ? [affixIds]
        : null;

    if (resolvedRank === 'champion') {
      const chosenAffixes =
        normalizedAffixes && normalizedAffixes.length > 0
          ? [normalizedAffixes[0]]
          : pickEliteAffixes(1);
      const count = 3 + Math.floor(Math.random() * 2); // 3-4 champions
      const spawned = [];
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const offsetR = 1.65;
        const ox = center.x + Math.cos(angle) * offsetR;
        const oz = center.z + Math.sin(angle) * offsetR;
        const oy = ctx.world ? ctx.world.getHeight(ox, oz) : (center.y || 0);
        const inst = createEnemyInstance(
          resolvedKind,
          { x: ox, y: oy, z: oz },
          {
            rank: 'champion',
            affixes: chosenAffixes,
            packId,
            packRank: 'champion',
          }
        );
        inst.ring = 'mid';
        clampEnemyPosition(inst);
        inst.group.position.set(inst.pos.x, inst.pos.y, inst.pos.z);
        spawned.push(inst);
      }
      return {
        packId,
        rank: 'champion',
        kind: resolvedKind,
        affixes: [...chosenAffixes],
        leaderId: spawned[0]?.id || null,
        ids: spawned.map((e) => e.id),
        eliteName: spawned[0]?.eliteName || '',
      };
    }

    // Rare leader + 3 normal minions
    const rareAffixCount = 2 + Math.floor(Math.random() * 2); // 2-3 affixes
    const chosenAffixes =
      normalizedAffixes && normalizedAffixes.length > 0
        ? normalizedAffixes.slice(0, 3)
        : pickEliteAffixes(rareAffixCount);
    const seed = rollRareMonsterSeed();
    const ly = ctx.world ? ctx.world.getHeight(center.x, center.z) : (center.y || 0);
    const leader = createEnemyInstance(
      resolvedKind,
      { x: center.x, y: ly, z: center.z },
      {
        rank: 'rare',
        affixes: chosenAffixes,
        eliteNameSeed: seed,
        packId,
        packRank: 'rare',
      }
    );
    leader.ring = 'deep';
    clampEnemyPosition(leader);
    leader.group.position.set(leader.pos.x, leader.pos.y, leader.pos.z);

    const minionIds = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + 0.35;
      const offsetR = 2.1;
      const mx = leader.pos.x + Math.cos(angle) * offsetR;
      const mz = leader.pos.z + Math.sin(angle) * offsetR;
      const my = ctx.world ? ctx.world.getHeight(mx, mz) : leader.pos.y;
      const minion = createEnemyInstance(
        resolvedKind,
        { x: mx, y: my, z: mz },
        {
          rank: 'normal',
          affixes: [],
          minionOf: leader.id,
          packId,
          packRank: 'rare',
          level: leader.level,
        }
      );
      minion.ring = 'deep';
      clampEnemyPosition(minion);
      minion.group.position.set(minion.pos.x, minion.pos.y, minion.pos.z);
      minionIds.push(minion.id);
    }

    return {
      packId,
      rank: 'rare',
      kind: resolvedKind,
      affixes: [...chosenAffixes],
      leaderId: leader.id,
      minionIds,
      ids: [leader.id, ...minionIds],
      eliteName: leader.eliteName,
      eliteSubtitle: leader.eliteSubtitle,
    };
  }

  function initRoster() {
    clearAllEnemies();

    if (!ctx.world?.isCombatZone()) return;
    const mapDef = ctx.world.getMap(state.zone);
    const spawnTable = mapDef?.spawnTable || [];
    if (!spawnTable.length) return;

    for (const entry of spawnTable) {
      const kind = entry.kind || 'preta';
      const area = entry.area || 'near';
      const count = entry.count ?? 0;
      if (count <= 0) continue;

      if (Array.isArray(entry.clusters) && entry.clusters.length > 0) {
        for (const clusterSize of entry.clusters) {
          const center = ctx.world.sampleSpawnPoint(area, { minDistFromGate: 12 });
          for (let i = 0; i < clusterSize; i++) {
            const angle = (i / clusterSize) * Math.PI * 2;
            const offsetPos = {
              x: center.x + Math.cos(angle) * 1.8,
              y: center.y,
              z: center.z + Math.sin(angle) * 1.8,
            };
            const e = createEnemyInstance(kind, offsetPos);
            e.ring = area;
            clampEnemyPosition(e);
          }
        }
      } else {
        for (let i = 0; i < count; i++) {
          const pt = ctx.world.sampleSpawnPoint(area, { minDistFromGate: 12 });
          const e = createEnemyInstance(kind, pt);
          e.ring = area;
          clampEnemyPosition(e);
        }
      }
    }

    const elitePacks = mapDef?.elitePacks;
    if (elitePacks && typeof elitePacks === 'object') {
      const champCount = Math.max(0, Number(elitePacks.champion) || 0);
      const rareCount = Math.max(0, Number(elitePacks.rare) || 0);
      for (let c = 0; c < champCount; c++) {
        const k = pickEliteKindForMap(mapDef);
        const center = ctx.world.sampleSpawnPoint('mid', { minDistFromGate: 15 });
        spawnElitePack(k, 'champion', null, center);
      }
      for (let r = 0; r < rareCount; r++) {
        const k = pickEliteKindForMap(mapDef);
        const center = ctx.world.sampleSpawnPoint('deep', { minDistFromGate: 18 });
        spawnElitePack(k, 'rare', null, center);
      }
    }
  }

  bus.on('zone:change', () => {
    clearAllEnemies();
    if (ctx.world?.isCombatZone()) {
      initRoster();
    }
  });

  // ---------------------------------------------------------------- 6. Damage, Status, Query & Liberation APIs
  function dirToVec(dirRad) {
    if (typeof dirRad === 'object' && dirRad !== null) {
      const len = Math.hypot(dirRad.x || 0, dirRad.z || 0) || 1;
      return { x: (dirRad.x || 0) / len, z: (dirRad.z || 0) / len };
    }
    const a = Number(dirRad) || 0;
    return { x: -Math.sin(a), z: -Math.cos(a) };
  }

  function queryCircle(xOrObj, zOrR, maybeR) {
    let cx = 0;
    let cz = 0;
    let r = 0;
    if (typeof xOrObj === 'object' && xOrObj !== null) {
      cx = xOrObj.x || 0;
      cz = xOrObj.z || 0;
      r = Number(zOrR) || 0;
    } else {
      cx = Number(xOrObj) || 0;
      cz = Number(zOrR) || 0;
      r = Number(maybeR) || 0;
    }

    const out = [];
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.state === 'liberated' || e.hp <= 0) continue;
      const dist = Math.hypot(e.pos.x - cx, e.pos.z - cz);
      if (dist <= r) out.push(e);
    }
    return out;
  }

  function queryCone(origin, dirRad, range, halfAngleRad) {
    if (!origin) return [];
    const ox = origin.x || 0;
    const oz = origin.z || 0;
    const maxR = Number(range) || 0;
    const halfAng = Number(halfAngleRad) || 0;
    const { x: fx, z: fz } = dirToVec(dirRad);

    const out = [];
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.state === 'liberated' || e.hp <= 0) continue;
      const dx = e.pos.x - ox;
      const dz = e.pos.z - oz;
      const dist = Math.hypot(dx, dz);
      if (dist > maxR) continue;
      if (dist <= 1e-5) {
        out.push(e);
        continue;
      }
      const dot = (dx * fx + dz * fz) / dist;
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (angle <= halfAng) out.push(e);
    }
    return out;
  }

  function queryLine(origin, dirRad, length, width) {
    if (!origin) return [];
    const ox = origin.x || 0;
    const oz = origin.z || 0;
    const len = Number(length) || 0;
    const halfW = (Number(width) || 0) * 0.5;
    const { x: fx, z: fz } = dirToVec(dirRad);

    const out = [];
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.state === 'liberated' || e.hp <= 0) continue;
      const dx = e.pos.x - ox;
      const dz = e.pos.z - oz;
      const forward = dx * fx + dz * fz;
      const perp = Math.abs(dx * -fz + dz * fx);
      if (forward >= 0 && forward <= len && perp <= halfW) {
        out.push(e);
      }
    }
    return out;
  }

  function nearest(origin, maxDist = Infinity, opts = {}) {
    if (!origin) return null;
    const ox = origin.x || 0;
    const oz = origin.z || 0;
    const limit = typeof maxDist === 'number' ? maxDist : Infinity;
    const hasCone = opts && opts.dirRad != null && opts.halfAngleRad != null;
    const { x: fx, z: fz } = hasCone ? dirToVec(opts.dirRad) : { x: 0, z: -1 };
    const halfAng = hasCone ? Number(opts.halfAngleRad) : Math.PI;

    let best = null;
    let bestDist = limit;

    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.state === 'liberated' || e.hp <= 0) continue;
      const dx = e.pos.x - ox;
      const dz = e.pos.z - oz;
      const dist = Math.hypot(dx, dz);
      if (dist > bestDist) continue;

      if (hasCone && dist > 1e-5) {
        const dot = (dx * fx + dz * fz) / dist;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle > halfAng) continue;
      }

      bestDist = dist;
      best = e;
    }
    return best;
  }

  function shatterEnemyShield(enemy) {
    if (!enemy || !enemy.shielded) return false;
    enemy.shielded = false;
    enemy.shieldTimer = 0;
    enemy.shieldCooldown = 8.0;
    if (enemy.shieldMesh) {
      enemy.shieldMesh.visible = false;
    }
    spawnSmokePuff(
      { x: enemy.pos.x, y: enemy.pos.y + enemy.height * 0.5, z: enemy.pos.z },
      0xc084fc,
      2.2,
      0.45
    );
    bus.emit('sfx', { name: 'dispel' });
    bus.emit('enemy:shieldShattered', { id: enemy.id, kind: enemy.kind });
    return true;
  }

  function applyStatus(idOrEnemy, kind, duration, extra = {}) {
    const targetId = typeof idOrEnemy === 'object' && idOrEnemy !== null ? idOrEnemy.id : idOrEnemy;
    const enemy = activeEnemies.find((e) => e.id === targetId);
    if (!enemy || enemy.state === 'liberated' || enemy.hp <= 0) return false;

    const resist = Math.max(0, Math.min(1, enemy.ccResist ?? enemy.kindConfig?.ccResist ?? 0));
    const dur = (Number(duration) || 0) * (1 - resist);
    if (dur <= 0) return false;

    const applied = {};
    if (kind === 'root') {
      enemy.status.root = Math.max(enemy.status.root || 0, dur);
      if (enemy.rootIndicator) enemy.rootIndicator.visible = true;
      applied.root = enemy.status.root;
    } else if (kind === 'stun') {
      enemy.status.stun = Math.max(enemy.status.stun || 0, dur);
      if (enemy.stunIndicator) enemy.stunIndicator.visible = true;
      applied.stun = enemy.status.stun;
      if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
      if (enemy.animNodes?.mouthOrb) enemy.animNodes.mouthOrb.visible = false;
      enemy.chargeData = null;
      enemy.activeAttack = null;
      enemy.state = 'hurt';
      enemy.stateTimer = cfg.hurtDuration ?? 0.25;
    } else if (kind === 'slow') {
      const mult = Math.max(0.05, Math.min(1, Number(extra?.mult ?? 0.6)));
      const prevRem = enemy.status.slow?.remaining || 0;
      const nextRem = Math.max(prevRem, dur);
      enemy.status.slow = {
        mult: dur >= prevRem ? mult : (enemy.status.slow?.mult ?? mult),
        remaining: nextRem,
        duration: Math.max(enemy.status.slow?.duration || 0, dur),
      };
      applied.slow = { ...enemy.status.slow };
      if (enemy.flashTimer <= 0 && enemy.state !== 'windup') {
        enemy.wasSlowed = true;
        applyIdleMaterialEmissive(enemy);
      }
    }

    if (Object.keys(applied).length > 0) {
      bus.emit('enemy:status', {
        id: enemy.id,
        kind: enemy.kind,
        status: applied,
      });
    }
    return true;
  }

  function damageEnemy(idOrEnemy, baseAmount, typeOrOpts = {}, maybeOpts = {}) {
    const opts = typeof typeOrOpts === 'string'
      ? { ...(maybeOpts || {}), type: typeOrOpts }
      : (typeOrOpts || {});
    const targetId = typeof idOrEnemy === 'object' && idOrEnemy !== null ? idOrEnemy.id : idOrEnemy;
    const enemy = activeEnemies.find((e) => e.id === targetId);
    if (!enemy || enemy.state === 'liberated' || enemy.hp <= 0) {
      return { dealt: 0, liberated: false };
    }

    const type = opts.type || 'physical';
    const source = opts.source || 'mantra';
    const crit = Boolean(opts.crit);

    // Shielding affix: immune to all normal damage except Mantra, which shatters the barrier
    if (enemy.shielded) {
      if (source === 'mantra') {
        shatterEnemyShield(enemy);
      } else {
        bus.emit('enemy:hit', {
          id: enemy.id,
          kind: enemy.kind,
          damage: 0,
          type,
          crit: false,
          source,
          shielded: true,
          position: { x: enemy.pos.x, y: enemy.pos.y + enemy.height, z: enemy.pos.z },
        });
        return { dealt: 0, liberated: false, shielded: true };
      }
    }

    const def = Math.max(0, enemy.def ?? enemy.kindConfig?.def ?? 0);
    const rawAmt = typeof baseAmount === 'number' ? Math.max(0, baseAmount) : 0;
    const incomingMult = enemy.incomingDmgMult ?? 1.0;
    const dealt =
      rawAmt > 0 ? Math.max(1, Math.round(rawAmt * incomingMult * (50 / (50 + def)))) : 0;

    enemy.hp = Math.max(0, enemy.hp - dealt);
    bus.emit('sfx', { name: 'hit' });

    bus.emit('enemy:hit', {
      id: enemy.id,
      kind: enemy.kind,
      damage: dealt,
      type,
      crit,
      source,
      position: { x: enemy.pos.x, y: enemy.pos.y + enemy.height, z: enemy.pos.z },
    });

    if (enemy.hp > 0) {
      // Apply status effects if present
      const statusIn = opts.status;
      const resist = Math.max(0, Math.min(1, enemy.ccResist ?? enemy.kindConfig?.ccResist ?? 0));
      const applied = {};

      if (statusIn && typeof statusIn === 'object') {
        if (typeof statusIn.root === 'number' && statusIn.root > 0) {
          const dur = statusIn.root * (1 - resist);
          if (dur > 0) {
            enemy.status.root = Math.max(enemy.status.root || 0, dur);
            applied.root = enemy.status.root;
          }
        }
        if (typeof statusIn.stun === 'number' && statusIn.stun > 0) {
          const dur = statusIn.stun * (1 - resist);
          if (dur > 0) {
            enemy.status.stun = Math.max(enemy.status.stun || 0, dur);
            applied.stun = enemy.status.stun;
          }
        }
        if (statusIn.slow) {
          const sObj =
            typeof statusIn.slow === 'number'
              ? { mult: 0.5, duration: statusIn.slow }
              : statusIn.slow;
          const dur = (Number(sObj.duration) || 0) * (1 - resist);
          const mult = Math.max(0.05, Math.min(1, Number(sObj.mult ?? 0.5)));
          if (dur > 0) {
            const prevRem = enemy.status.slow?.remaining || 0;
            const nextRem = Math.max(prevRem, dur);
            enemy.status.slow = {
              mult: dur >= prevRem ? mult : (enemy.status.slow?.mult ?? mult),
              remaining: nextRem,
              duration: Math.max(enemy.status.slow?.duration || 0, dur),
            };
            applied.slow = { ...enemy.status.slow };
          }
        }
      }

      if (Object.keys(applied).length > 0) {
        bus.emit('enemy:status', {
          id: enemy.id,
          kind: enemy.kind,
          status: applied,
        });
      }

      const shouldInterrupt = Boolean(applied.stun > 0 || source === 'mantra');
      if (shouldInterrupt) {
        if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
        if (enemy.animNodes?.mouthOrb) enemy.animNodes.mouthOrb.visible = false;
        enemy.chargeData = null;
        enemy.activeAttack = null;
        enemy.state = 'hurt';
        enemy.stateTimer = cfg.hurtDuration ?? 0.25;
      } else if (enemy.state !== 'windup' && enemy.state !== 'attack') {
        enemy.state = 'hurt';
        enemy.stateTimer = cfg.hurtDuration ?? 0.25;
      }

      enemy.flashTimer = 0.2;
      for (const mat of enemy.materials) {
        mat.emissive?.setHex(0xffffff);
        if (mat.emissiveIntensity != null) mat.emissiveIntensity = 1.0;
      }

      // Knockback (unless rooted or knockback == 0)
      const defaultKb = statusIn?.root || statusIn?.stun ? 0 : (cfg.hurtKnockback ?? 1.5);
      const kb = opts.knockback !== undefined ? Number(opts.knockback) : defaultKb;
      if (kb > 0 && !(enemy.status.root > 0)) {
        const fromPos = opts.from || state.player?.position;
        if (fromPos) {
          const dx = enemy.pos.x - fromPos.x;
          const dz = enemy.pos.z - fromPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1e-4) {
            enemy.pos.x += (dx / dist) * kb;
            enemy.pos.z += (dz / dist) * kb;
            clampEnemyPosition(enemy);
          }
        }
      }

      return { dealt, liberated: false };
    }

    // Liberated!
    if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
    if (enemy.animNodes?.mouthOrb) enemy.animNodes.mouthOrb.visible = false;
    if (enemy.rootIndicator) enemy.rootIndicator.visible = false;
    if (enemy.stunIndicator) enemy.stunIndicator.visible = false;
    if (enemy.rankHaloMesh) enemy.rankHaloMesh.visible = false;
    if (enemy.armorRingGroup) enemy.armorRingGroup.visible = false;
    if (enemy.shieldMesh) enemy.shieldMesh.visible = false;
    enemy.shielded = false;
    enemy.chargeData = null;
    enemy.activeAttack = null;
    enemy.state = 'liberated';
    enemy.liberateTimer = 0;
    bus.emit('sfx', { name: 'liberate' });

    ctx.vitals?.addExp?.(enemy.exp);

    // Elite affix on-death effects:
    // 1. Molten: leaves a 1.5s red warning circle (radius 2.5m) that explodes for 14 * dmgMult magic damage
    if (Array.isArray(enemy.affixes) && enemy.affixes.includes('molten')) {
      spawnMoltenDeathBomb(enemy.pos.x, enemy.pos.z, enemy.dmgScale || 1.0);
    }

    // 2. Vengeful: splits into 2 normal preta at death position (noSplit: true so no recursion)
    if (Array.isArray(enemy.affixes) && enemy.affixes.includes('vengeful') && !enemy.noSplit) {
      const baseAngle = Math.random() * Math.PI * 2;
      for (let sIdx = 0; sIdx < 2; sIdx++) {
        const ang = baseAngle + sIdx * Math.PI;
        const sx = enemy.pos.x + Math.cos(ang) * 0.95;
        const sz = enemy.pos.z + Math.sin(ang) * 0.95;
        const sy = ctx.world ? ctx.world.getHeight(sx, sz) : enemy.pos.y;
        const splitPreta = createEnemyInstance(
          'preta',
          { x: sx, y: sy, z: sz },
          {
            rank: 'normal',
            affixes: [],
            noSplit: true,
            level: enemy.level,
          }
        );
        splitPreta.ring = enemy.ring || 'near';
        splitPreta.state = 'chase';
        clampEnemyPosition(splitPreta);
        splitPreta.group.position.set(splitPreta.pos.x, splitPreta.pos.y, splitPreta.pos.z);
      }
      spawnSmokePuff(enemy.pos, 0x4c1d95, 1.8, 0.45);
    }

    bus.emit('enemy:liberated', {
      id: enemy.id,
      kind: enemy.kind,
      exp: enemy.exp,
      position: { ...enemy.pos },
      level: enemy.level,
      rank: enemy.rank,
      affixes: Array.isArray(enemy.affixes) ? [...enemy.affixes] : [],
      eliteName: enemy.eliteName,
      mapId: state.zone || 'wild',
      tags: enemy.tags || [enemy.kind],
    });

    const nameKey = enemy.displayNameKey || enemy.kindConfig.nameKey || `enemy.${enemy.kind}`;
    const localizedName =
      enemy.rank === 'champion' || enemy.rank === 'rare'
        ? enemy.eliteName
        : i18n?.t
          ? i18n.t(nameKey)
          : enemy.kind;
    bus.emit('toast', {
      key: 'toast.enemyLiberated',
      params: { name: localizedName, exp: enemy.exp },
    });

    // Queue respawn timer
    if (enemy.packId) {
      const packStillAlive = activeEnemies.some(
        (e) => e.id !== enemy.id && e.state !== 'liberated' && e.hp > 0 && e.packId === enemy.packId
      );
      if (!packStillAlive) {
        const packRespawnTime = 90 + Math.random() * 60; // 90-150s
        pendingElitePackRespawns.push({
          rank: enemy.packRank || (enemy.rank === 'rare' ? 'rare' : 'champion'),
          kind: enemy.kind,
          timer: packRespawnTime,
        });
      }
    } else if (!enemy.noSplit) {
      const respawnTime =
        (cfg.respawnMin ?? 20) + Math.random() * ((cfg.respawnMax ?? 40) - (cfg.respawnMin ?? 20));
      pendingRespawns.push({
        kind: enemy.kind,
        ring: enemy.ring,
        timer: respawnTime,
      });
    }

    // If no non-liberated enemies remain on the field and total queued < maxCount,
    // schedule respawns from current map's spawnTable.
    const remainingAlive = activeEnemies.filter((e) => e.state !== 'liberated').length;
    const mapDef = ctx.world?.getMap(state.zone);
    const spawnTable = mapDef?.spawnTable || [];
    const mapTotalCount = spawnTable.reduce((acc, s) => acc + (s.count || 0), 0);
    if (remainingAlive === 0 && mapTotalCount > 0 && pendingRespawns.length < mapTotalCount) {
      for (const entry of spawnTable) {
        for (let c = 0; c < (entry.count || 0); c++) {
          if (pendingRespawns.length >= mapTotalCount) break;
          const t =
            (cfg.respawnMin ?? 20) +
            Math.random() * ((cfg.respawnMax ?? 40) - 2 - (cfg.respawnMin ?? 20));
          pendingRespawns.push({ kind: entry.kind, ring: entry.area || 'near', timer: t });
        }
      }
    }

    // Trigger particle burst
    spawnLiberationBurst(enemy.pos, enemy.height);

    // Turn white emissive and enable transparency for dissolve
    for (const mat of enemy.materials) {
      mat.transparent = true;
      mat.emissive?.setHex(0xffffff);
      if (mat.emissiveIntensity != null) mat.emissiveIntensity = 1.5;
    }

    return { dealt, liberated: true };
  }

  bus.on('mantra:cast', ({ origin, radius, power, handledByMantra }) => {
    if (!ctx.world?.isCombatZone() || !origin) return;
    const hits = queryCircle(origin.x, origin.z, radius);
    if (handledByMantra) {
      // Ensure any shielded enemy in Mantra radius has its barrier shattered even if Mantra already processed damage
      for (let i = 0; i < hits.length; i++) {
        if (hits[i].shielded) {
          shatterEnemyShield(hits[i]);
        }
      }
      return;
    }

    const dmgPower = typeof power === 'number' && power > 0 ? power : (state.player?.atk || 10);
    for (let i = 0; i < hits.length; i++) {
      damageEnemy(hits[i].id, dmgPower, {
        type: 'magic',
        source: 'mantra',
        crit: false,
        knockback: cfg.hurtKnockback ?? 1.5,
        from: { x: origin.x, z: origin.z },
      });
    }
  });

  // ---------------------------------------------------------------- 7. Per-Frame AI Update
  function getScaledAttackDamage(enemy, baseDamage) {
    return Math.max(1, Math.round((baseDamage || 1) * (enemy.dmgScale || 1)));
  }

  function startEnemyAttack(enemy, atk, isForced = false) {
    enemy.state = 'windup';
    enemy.activeAttack = atk;
    enemy.stateTimer = atk.windup || 0.5;
    enemy.lockedHeading = enemy.heading;

    const playerPos = state.player?.position || { x: 1000, y: 0, z: 0 };

    if (atk.id === 'ghostfire') {
      if (enemy.animNodes.mouthOrb) {
        enemy.animNodes.mouthOrb.visible = true;
        enemy.animNodes.mouthOrb.scale.setScalar(0.01);
      }
    } else if (atk.id === 'redArrow') {
      if (enemy.telegraphGroup && enemy.aimLineMesh) {
        enemy.telegraphGroup.position.set(enemy.pos.x, enemy.pos.y + 0.03, enemy.pos.z);
        enemy.telegraphGroup.rotation.y = enemy.lockedHeading;
        if (enemy.chargeLineMesh) enemy.chargeLineMesh.visible = false;
        enemy.aimLineMesh.visible = true;
        enemy.telegraphGroup.visible = true;
      }
    } else if (atk.id === 'spearCharge') {
      if (enemy.telegraphGroup && enemy.chargeLineMesh) {
        enemy.telegraphGroup.position.set(enemy.pos.x, enemy.pos.y + 0.03, enemy.pos.z);
        enemy.telegraphGroup.rotation.y = enemy.heading;
        if (enemy.aimLineMesh) enemy.aimLineMesh.visible = false;
        enemy.chargeLineMesh.visible = true;
        enemy.telegraphGroup.visible = true;
      }
    } else if (atk.id === 'groundSlam') {
      if (enemy.telegraphGroup) {
        enemy.telegraphGroup.position.set(enemy.pos.x, enemy.pos.y + 0.03, enemy.pos.z);
        enemy.telegraphGroup.visible = true;
        if (enemy.telegraphFill) enemy.telegraphFill.scale.set(0.001, 1, 0.001);
      }
    } else if (atk.id === 'boulder') {
      enemy.lastAttackId = 'boulder';
      const startPos = {
        x: enemy.pos.x - Math.sin(enemy.heading) * 0.6,
        y: enemy.pos.y + 2.2,
        z: enemy.pos.z - Math.cos(enemy.heading) * 0.6,
      };
      const targetPos = { x: playerPos.x, y: playerPos.y, z: playerPos.z };
      ctx.projectiles?.spawn('boulder', {
        startPos,
        targetPos,
        damage: getScaledAttackDamage(enemy, atk.damage),
        flightDuration: atk.flightDuration,
        hitRadius: atk.hitRadius,
        arcHeight: atk.arcHeight,
        magic: false,
      });
    } else if (atk.id === 'frostRoar') {
      enemy.lastAttackId = 'frostRoar';
      bus.emit('sfx', { name: 'frost' });
      const targetPos = { x: playerPos.x, y: playerPos.y, z: playerPos.z };
      ctx.projectiles?.spawn('frostRoar', {
        targetPos,
        damage: getScaledAttackDamage(enemy, atk.damage),
        aoeRadius: atk.aoeRadius,
        eruptDelay: atk.eruptDelay,
        slow: atk.slow,
        magic: true,
      });
    }
  }

  function update(dt) {
    const isCombat = Boolean(ctx.world?.isCombatZone());
    enemyGroup.visible = isCombat;

    if (!isCombat) {
      // Hide any active telegraphs when leaving combat zone
      for (const e of activeEnemies) {
        if (e.telegraphGroup) e.telegraphGroup.visible = false;
        if (e.animNodes?.mouthOrb) e.animNodes.mouthOrb.visible = false;
      }
      return;
    }

    const playerPos = state.player?.position;
    const mapDef = ctx.world?.getMap(state.zone);
    const safeZones = mapDef?.safeZones || [
      { x: wildCfg.wildGate.x, z: wildCfg.wildGate.z, r: cfg.gateSafeRadius ?? 10 },
    ];
    let isPlayerInSafeZone = !playerPos;
    if (playerPos) {
      for (let s = 0; s < safeZones.length; s++) {
        const sz = safeZones[s];
        if (Math.hypot(playerPos.x - sz.x, playerPos.z - sz.z) <= (sz.r ?? cfg.gateSafeRadius ?? 10)) {
          isPlayerInSafeZone = true;
          break;
        }
      }
    }

    // 1. Process Respawn Timers
    for (let i = pendingRespawns.length - 1; i >= 0; i--) {
      const r = pendingRespawns[i];
      r.timer -= dt;
      if (r.timer <= 0) {
        pendingRespawns.splice(i, 1);
        if (activeEnemies.length < (cfg.maxCount ?? 12) && ctx.world?.sampleSpawnPoint) {
          const pt = ctx.world.sampleSpawnPoint(r.ring, {
            minDistFromGate: 12,
            minPlayerDist: cfg.respawnMinPlayerDist ?? 20,
          });
          const newEnemy = createEnemyInstance(r.kind, pt);
          newEnemy.ring = r.ring;
          clampEnemyPosition(newEnemy);
        }
      }
    }

    // 1b. Process Elite Pack Respawn Timers (90-150s)
    for (let i = pendingElitePackRespawns.length - 1; i >= 0; i--) {
      const ep = pendingElitePackRespawns[i];
      ep.timer -= dt;
      if (ep.timer <= 0) {
        pendingElitePackRespawns.splice(i, 1);
        const k = ep.kind || pickEliteKindForMap(mapDef);
        const area = ep.rank === 'rare' ? 'deep' : 'mid';
        const center = ctx.world?.sampleSpawnPoint
          ? ctx.world.sampleSpawnPoint(area, {
              minDistFromGate: 15,
              minPlayerDist: cfg.respawnMinPlayerDist ?? 20,
            })
          : null;
        spawnElitePack(k, ep.rank, null, center);
      }
    }

    // 2. Update Active Enemies
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
      const enemy = activeEnemies[i];

      // Tick cooldowns
      for (const atkId in enemy.attackCooldowns) {
        if (enemy.attackCooldowns[atkId] > 0) {
          enemy.attackCooldowns[atkId] = Math.max(0, enemy.attackCooldowns[atkId] - dt);
        }
      }

      // Flash timer tick
      if (enemy.flashTimer > 0) {
        enemy.flashTimer -= dt;
        if (enemy.flashTimer <= 0) {
          applyIdleMaterialEmissive(enemy);
        }
      }

      // --- Liberated State Animation
      if (enemy.state === 'liberated') {
        enemy.liberateTimer += dt;
        const dur = cfg.liberateDuration ?? 1.2;
        const u = Math.min(1, enemy.liberateTimer / dur);

        enemy.pos.y += dt * 1.35;
        const fade = 1 - u;
        for (const mat of enemy.materials) {
          if (mat.transparent) {
            mat.opacity = fade * 0.85;
          }
        }

        enemy.group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);

        if (u >= 1) {
          // Remove from active list
          disposeEnemy(enemy);
          activeEnemies.splice(i, 1);
        }
        continue;
      }

      // Tick status effects (root, stun, slow)
      if (enemy.status) {
        if (enemy.status.root > 0) {
          enemy.status.root = Math.max(0, enemy.status.root - dt);
        }
        if (enemy.status.stun > 0) {
          enemy.status.stun = Math.max(0, enemy.status.stun - dt);
        }
        if (enemy.status.slow && enemy.status.slow.remaining > 0) {
          enemy.status.slow.remaining = Math.max(0, enemy.status.slow.remaining - dt);
        }
      }

      const isRooted = (enemy.status?.root || 0) > 0;
      const isStunned = (enemy.status?.stun || 0) > 0;
      const isSlowed = (enemy.status?.slow?.remaining || 0) > 0;
      const slowMult = isSlowed ? (enemy.status.slow.mult ?? 0.5) : 1.0;
      const effSpeed = isRooted || isStunned ? 0 : enemy.speed * slowMult;

      // Update status visual indicators
      if (enemy.rootIndicator) {
        enemy.rootIndicator.visible = isRooted;
        if (isRooted) {
          enemy.rootIndicator.rotation.y += dt * 1.8;
        }
      }
      if (enemy.stunIndicator) {
        enemy.stunIndicator.visible = isStunned;
        if (isStunned) {
          enemy.stunIndicator.rotation.y += dt * 4.5;
          enemy.stunIndicator.position.y =
            enemy.height + 0.45 + Math.sin(state.elapsed * 6) * 0.05;
        }
      }

      // Orbiting stone plates for `armored` affix
      if (enemy.armorRingGroup) {
        enemy.armorRingGroup.rotation.y += dt * 1.8;
      }

      // `shielding` affix cycle: every 8s, activates a 3s purple spherical barrier
      if (Array.isArray(enemy.affixes) && enemy.affixes.includes('shielding')) {
        if (enemy.shielded) {
          enemy.shieldTimer -= dt;
          if (enemy.shieldMesh) {
            enemy.shieldMesh.visible = true;
            const pulseS = 1.0 + Math.sin(state.elapsed * 7) * 0.04;
            const baseR = Math.max(0.95, (enemy.kindConfig.height || 1.6) * 0.65);
            enemy.shieldMesh.scale.setScalar(baseR * pulseS);
          }
          if (enemy.shieldTimer <= 0) {
            enemy.shielded = false;
            enemy.shieldCooldown = 8.0;
            if (enemy.shieldMesh) enemy.shieldMesh.visible = false;
          }
        } else {
          if (enemy.shieldMesh) enemy.shieldMesh.visible = false;
          enemy.shieldCooldown -= dt;
          if (enemy.shieldCooldown <= 0) {
            enemy.shielded = true;
            enemy.shieldTimer = 3.0;
            enemy.shieldCooldown = 8.0;
            if (enemy.shieldMesh) enemy.shieldMesh.visible = true;
          }
        }
      }

      // Sync slow blue tint when not flashing or in windup
      if (enemy.wasSlowed !== isSlowed && enemy.flashTimer <= 0 && enemy.state !== 'windup') {
        enemy.wasSlowed = isSlowed;
        applyIdleMaterialEmissive(enemy);
      }

      if (isFrozen) {
        enemy.group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
        enemy.group.rotation.y = enemy.heading;
        continue;
      }

      // Distance to player
      const dxPlayer = playerPos ? playerPos.x - enemy.pos.x : 999;
      const dzPlayer = playerPos ? playerPos.z - enemy.pos.z : 999;
      const distToPlayer = Math.hypot(dxPlayer, dzPlayer);

      // If stunned: interrupt any windup/attack and freeze AI actions
      if (isStunned) {
        if (enemy.state === 'windup' || enemy.state === 'attack') {
          if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
          if (enemy.animNodes?.mouthOrb) enemy.animNodes.mouthOrb.visible = false;
          enemy.chargeData = null;
          enemy.activeAttack = null;
          applyIdleMaterialEmissive(enemy);
          enemy.state = 'chase';
        } else if (enemy.state === 'hurt') {
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) {
            enemy.state =
              !isPlayerInSafeZone && distToPlayer <= (cfg.leashRange ?? 25) ? 'chase' : 'wander';
          }
        }
        enemy.group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
        enemy.group.rotation.y = enemy.heading;
        continue;
      }

      // --- Elite Affix Active Behaviors (`frozen`, `teleporter`)
      if (Array.isArray(enemy.affixes) && enemy.affixes.length > 0 && playerPos && !isPlayerInSafeZone) {
        // `frozen`: every 6s when within 14m of player, spawns 3 ice orbs around player (~1.5-2.5m offset)
        if (enemy.affixes.includes('frozen') && distToPlayer <= 14) {
          enemy.frozenTimer -= dt;
          if (enemy.frozenTimer <= 0) {
            enemy.frozenTimer = 6.0;
            const baseAng = Math.random() * Math.PI * 2;
            for (let fIdx = 0; fIdx < 3; fIdx++) {
              const ang = baseAng + (fIdx / 3) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
              const dist = 1.5 + Math.random() * 1.0; // 1.5-2.5m
              const ox = playerPos.x + Math.cos(ang) * dist;
              const oz = playerPos.z + Math.sin(ang) * dist;
              spawnFrozenOrbHazard(ox, oz, enemy.dmgScale || 1.0);
            }
            bus.emit('sfx', { name: 'frost' });
          }
        }

        // `teleporter`: when distance to player > 8m, every 5s teleports to a random spot ~2.2m from player
        if (enemy.affixes.includes('teleporter') && distToPlayer > 8 && !isRooted) {
          enemy.teleportTimer -= dt;
          if (enemy.teleportTimer <= 0) {
            enemy.teleportTimer = 5.0;
            spawnSmokePuff(
              { x: enemy.pos.x, y: enemy.pos.y + 0.5, z: enemy.pos.z },
              0x1e1b4b,
              1.6,
              0.45
            );
            const tAng = Math.random() * Math.PI * 2;
            const tDist = 2.2;
            enemy.pos.x = playerPos.x + Math.cos(tAng) * tDist;
            enemy.pos.z = playerPos.z + Math.sin(tAng) * tDist;
            clampEnemyPosition(enemy);
            spawnSmokePuff(
              { x: enemy.pos.x, y: enemy.pos.y + 0.5, z: enemy.pos.z },
              0x312e81,
              1.5,
              0.4
            );
          }
        }
      }

      const prevX = enemy.pos.x;
      const prevZ = enemy.pos.z;
      const cdMult = enemy.cooldownMult ?? 1.0;

      // --- AI State Machine Transitions
      if (enemy.state === 'hurt') {
        enemy.stateTimer -= dt;
        if (enemy.stateTimer <= 0) {
          enemy.state = (!isPlayerInSafeZone && distToPlayer <= (cfg.leashRange ?? 25)) ? 'chase' : 'wander';
        }
      } else if (enemy.state === 'recover') {
        enemy.stateTimer -= dt;
        if (playerPos) {
          const targetHeading = Math.atan2(-dxPlayer, -dzPlayer);
          enemy.heading = lerpAngle(enemy.heading, targetHeading, dt * 6);
        }
        if (enemy.stateTimer <= 0) {
          enemy.state = (!isPlayerInSafeZone && distToPlayer <= (cfg.leashRange ?? 25)) ? 'chase' : 'wander';
        }
      } else if (enemy.state === 'attack') {
        // Active dash attack (Tsen spear charge)
        if (enemy.chargeData) {
          if (isRooted) {
            enemy.attackCooldowns[enemy.activeAttack.id] = enemy.activeAttack.cooldown * cdMult;
            enemy.state = 'recover';
            enemy.stateTimer = enemy.activeAttack.recover ?? 0.35;
            enemy.chargeData = null;
          } else {
            const cd = enemy.chargeData;
            cd.progress += (dt * slowMult) / (enemy.activeAttack.dashDuration ?? 0.4);
            const u = Math.min(1, cd.progress);

            enemy.pos.x = cd.startPos.x + cd.dir.x * (enemy.activeAttack.dashDist * u);
            enemy.pos.z = cd.startPos.z + cd.dir.z * (enemy.activeAttack.dashDist * u);
            clampEnemyPosition(enemy);

            // Check hit on player along charge segment
            if (!cd.hasHit && playerPos) {
              const curDist = Math.hypot(playerPos.x - enemy.pos.x, playerPos.z - enemy.pos.z);
              if (curDist <= (enemy.activeAttack.hitWidth ?? 1.1) + (config.PLAYER.radius || 0.35)) {
                cd.hasHit = true;
                bus.emit('vitals:damage', {
                  amount: getScaledAttackDamage(enemy, enemy.activeAttack.damage),
                  type: 'physical',
                  sourcePos: { ...enemy.pos },
                });
              }
            }

            if (u >= 1) {
              enemy.attackCooldowns[enemy.activeAttack.id] = enemy.activeAttack.cooldown * cdMult;
              enemy.state = 'recover';
              enemy.stateTimer = enemy.activeAttack.recover ?? 0.35;
              enemy.chargeData = null;
            }
          }
        }
      } else if (enemy.state === 'windup') {
        enemy.stateTimer -= dt;
        const atk = enemy.activeAttack;
        const windupTotal = atk?.windup || 0.5;
        const uFill = Math.min(1, 1 - Math.max(0, enemy.stateTimer) / windupTotal);
        const pulse = Math.sin(state.elapsed * 18) * 0.5 + 0.5;

        if (atk?.id === 'ghostfire') {
          for (const mat of enemy.materials) {
            mat.emissive?.setRGB(0.05, 0.7 * pulse, 0.15);
            if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0.85;
          }
          if (enemy.animNodes.mouthOrb) {
            enemy.animNodes.mouthOrb.scale.setScalar(Math.max(0.01, uFill));
          }
        } else if (atk?.id === 'redArrow') {
          for (const mat of enemy.materials) {
            mat.emissive?.setRGB(0.7 * pulse, 0.05, 0.05);
            if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0.8;
          }
          if (enemy.aimLineMesh) {
            enemy.aimLineMesh.material.opacity = 0.4 + 0.35 * pulse;
          }
        } else if (atk?.id === 'boulder') {
          if (enemy.animNodes.armL) enemy.animNodes.armL.rotation.x = -1.5 * uFill;
          if (enemy.animNodes.armR) enemy.animNodes.armR.rotation.x = -1.5 * uFill;
        } else if (atk?.id === 'frostRoar') {
          if (enemy.animNodes.armL) enemy.animNodes.armL.rotation.x = -0.7 * uFill;
          if (enemy.animNodes.armR) enemy.animNodes.armR.rotation.x = -0.7 * uFill;
        } else {
          for (const mat of enemy.materials) {
            mat.emissive?.setRGB(0.7 * pulse, 0.05, 0.05);
            if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0.8;
          }
          if (enemy.kind === 'migoi' && enemy.telegraphFill) {
            enemy.telegraphFill.scale.set(uFill, 1, uFill);
          } else if (enemy.kind === 'tsen' && enemy.chargeLineMesh) {
            enemy.chargeLineMesh.material.opacity = 0.35 + 0.35 * pulse;
          }
        }

        if (enemy.stateTimer <= 0) {
          // Windup complete: hide telegraph and restore idle/slow emissive
          if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
          if (enemy.animNodes.mouthOrb) enemy.animNodes.mouthOrb.visible = false;
          applyIdleMaterialEmissive(enemy);

          const scaledDmg = getScaledAttackDamage(enemy, atk.damage);

          if (atk.id === 'ghostfire') {
            const mouthPos = {
              x: enemy.pos.x - Math.sin(enemy.heading) * 0.35,
              y: enemy.pos.y + 1.25,
              z: enemy.pos.z - Math.cos(enemy.heading) * 0.35,
            };
            ctx.projectiles?.spawn('ghostfire', {
              origin: mouthPos,
              damage: scaledDmg,
              speed: atk.speed,
              turnRate: atk.turnRate,
              lifetime: atk.lifetime,
              hitRadius: atk.hitRadius,
              magic: true,
            });
            bus.emit('sfx', { name: 'fireball' });
            enemy.attackCooldowns[atk.id] = atk.cooldown * cdMult;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.35;
          } else if (atk.id === 'redArrow') {
            const lockedHeading = enemy.lockedHeading ?? enemy.heading;
            const dirX = -Math.sin(lockedHeading);
            const dirZ = -Math.cos(lockedHeading);
            const startPos = {
              x: enemy.pos.x + dirX * 0.5,
              y: enemy.pos.y + 1.6,
              z: enemy.pos.z + dirZ * 0.5,
            };
            ctx.projectiles?.spawn('redArrow', {
              origin: startPos,
              dir: { x: dirX, y: 0, z: dirZ },
              damage: scaledDmg,
              speed: atk.speed,
              lifetime: atk.lifetime,
              hitRadius: atk.hitRadius,
              magic: false,
            });
            bus.emit('sfx', { name: 'arrow' });
            enemy.attackCooldowns[atk.id] = atk.cooldown * cdMult;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.35;
          } else if (atk.id === 'spearCharge') {
            if (isRooted) {
              enemy.attackCooldowns[atk.id] = atk.cooldown * cdMult;
              enemy.state = 'recover';
              enemy.stateTimer = atk.recover ?? 0.35;
            } else {
              const lockedHeading = enemy.heading;
              const dirX = -Math.sin(lockedHeading);
              const dirZ = -Math.cos(lockedHeading);
              enemy.chargeData = {
                startPos: { ...enemy.pos },
                dir: { x: dirX, z: dirZ },
                progress: 0,
                hasHit: false,
              };
              enemy.state = 'attack';
            }
          } else if (atk.id === 'boulder') {
            enemy.attackCooldowns[atk.id] = atk.cooldown * cdMult;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.45;
          } else if (atk.id === 'frostRoar') {
            enemy.attackCooldowns[atk.id] = atk.cooldown * cdMult;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.5;
          } else if (atk.id === 'groundSlam') {
            if (playerPos) {
              const slamDist = Math.hypot(playerPos.x - enemy.pos.x, playerPos.z - enemy.pos.z);
              if (slamDist <= (atk.aoeRadius ?? 3.5)) {
                bus.emit('vitals:damage', {
                  amount: scaledDmg,
                  type: 'physical',
                  sourcePos: { ...enemy.pos },
                });
              }
            }
            enemy.attackCooldowns[atk.id] = atk.cooldown * cdMult;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.5;
          } else {
            // Melee claw
            if (playerPos) {
              const clawDist = Math.hypot(playerPos.x - enemy.pos.x, playerPos.z - enemy.pos.z);
              if (clawDist <= (atk.hitReach ?? 1.8)) {
                bus.emit('vitals:damage', {
                  amount: scaledDmg,
                  type: 'physical',
                  sourcePos: { ...enemy.pos },
                });
              }
            }
            enemy.attackCooldowns[atk.id] = atk.cooldown * cdMult;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.35;
          }
        }
      } else if (enemy.state === 'chase') {
        // Leash check
        if (isPlayerInSafeZone || distToPlayer > (cfg.leashRange ?? 25)) {
          enemy.state = 'wander';
          enemy.wanderTimer = 0;
        } else {
          // Smoothly face player
          const targetHeading = Math.atan2(-dxPlayer, -dzPlayer);
          enemy.heading = lerpAngle(enemy.heading, targetHeading, dt * 9);

          // Check if any attack is in range and off cooldown
          let chosenAttack = null;
          const attacks = enemy.kindConfig.attacks || [];

          // Melee attack priority when in melee range
          const meleeAtk = attacks.find((a) => a.id === 'claw' || a.id === 'groundSlam');
          if (meleeAtk && distToPlayer <= meleeAtk.range && (enemy.attackCooldowns[meleeAtk.id] || 0) <= 0) {
            chosenAttack = meleeAtk;
          } else {
            const candidates = [];
            const activeProjectiles = ctx.projectiles?.count ? ctx.projectiles.count() : 0;
            const maxProj = config.PROJECTILES?.maxActive ?? 20;

            for (let a = 0; a < attacks.length; a++) {
              const atk = attacks[a];
              if (isRooted && atk.type === 'charge') continue;
              const cd = enemy.attackCooldowns[atk.id] || 0;
              if (cd > 0) continue;
              const minR = atk.minRange ?? 0;
              if (distToPlayer < minR || distToPlayer > atk.range) continue;

              // Check projectile count limit
              if ((atk.type === 'ranged' || atk.type === 'magic') && activeProjectiles >= maxProj) {
                continue;
              }

              // Migoi: cannot use boulder and frostRoar twice in a row during natural AI
              if (enemy.kind === 'migoi' && (atk.id === 'boulder' || atk.id === 'frostRoar')) {
                if (atk.id === enemy.lastAttackId) continue;
              }

              candidates.push(atk);
            }

            if (candidates.length > 0) {
              const totalWeight = candidates.reduce((sum, atk) => sum + (atk.weight || 1.0), 0);
              let r = Math.random() * totalWeight;
              for (const atk of candidates) {
                r -= (atk.weight || 1.0);
                if (r <= 0) {
                  chosenAttack = atk;
                  break;
                }
              }
              if (!chosenAttack) chosenAttack = candidates[0];
            }
          }

          if (chosenAttack) {
            startEnemyAttack(enemy, chosenAttack, false);
          } else if (effSpeed > 0) {
            // Move toward player until stopDistance
            const stopDist = enemy.kindConfig.stopDistance ?? 1.2;
            if (distToPlayer > stopDist) {
              const moveDist = Math.min(effSpeed * dt, distToPlayer - stopDist);
              enemy.pos.x += (dxPlayer / distToPlayer) * moveDist;
              enemy.pos.z += (dzPlayer / distToPlayer) * moveDist;
              clampEnemyPosition(enemy);
            }
          }
        }
      } else if (enemy.state === 'notice') {
        // Brief alert pause (0.25s)
        enemy.stateTimer -= dt;
        if (playerPos) {
          const targetHeading = Math.atan2(-dxPlayer, -dzPlayer);
          enemy.heading = lerpAngle(enemy.heading, targetHeading, dt * 10);
        }
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chase';
        }
      } else {
        // 'wander'
        if (!isPlayerInSafeZone && distToPlayer <= (cfg.sightRange ?? 14)) {
          enemy.state = 'notice';
          enemy.stateTimer = 0.25;
        } else if (effSpeed > 0) {
          enemy.wanderTimer -= dt;
          if (enemy.wanderTimer <= 0) {
            enemy.wanderTimer = 3.0 + Math.random() * 4.0;
            const wAngle = Math.random() * Math.PI * 2;
            const wDist = 1.0 + Math.random() * 5.0;
            enemy.wanderTarget.x = enemy.homePos.x + Math.cos(wAngle) * wDist;
            enemy.wanderTarget.z = enemy.homePos.z + Math.sin(wAngle) * wDist;
          }

          const wdx = enemy.wanderTarget.x - enemy.pos.x;
          const wdz = enemy.wanderTarget.z - enemy.pos.z;
          const wdist = Math.hypot(wdx, wdz);

          if (wdist > 0.4) {
            const wHeading = Math.atan2(-wdx, -wdz);
            enemy.heading = lerpAngle(enemy.heading, wHeading, dt * 4);
            const wMove = Math.min(effSpeed * 0.5 * dt, wdist);
            enemy.pos.x += (wdx / wdist) * wMove;
            enemy.pos.z += (wdz / wdist) * wMove;
            clampEnemyPosition(enemy);
          }
        }
      }

      // --- Contact Damage Check
      // Applies when player touches body (except during charge attack where charge damage takes priority)
      if (playerPos && enemy.state !== 'liberated' && enemy.state !== 'hurt' && enemy.state !== 'attack' && !isStunned) {
        const contactReach = enemy.radius + (config.PLAYER.radius || 0.35) + 0.15;
        if (distToPlayer <= contactReach) {
          bus.emit('vitals:damage', {
            amount: getScaledAttackDamage(enemy, cfg.contactDamage ?? 3),
            type: 'physical',
            sourcePos: { ...enemy.pos },
          });
        }
      }

      // ---Procedural Animations & `molten` Fire Patch Trail
      enemy.animTime += dt * (isSlowed ? slowMult : 1.0);
      const movedDist = Math.hypot(enemy.pos.x - prevX, enemy.pos.z - prevZ);
      const isMoving =
        movedDist > 0.002 ||
        (effSpeed > 0 &&
          (enemy.state === 'chase' || enemy.state === 'wander' || enemy.state === 'attack'));

      if (isMoving && Array.isArray(enemy.affixes) && enemy.affixes.includes('molten')) {
        enemy.moltenTimer -= dt;
        if (enemy.moltenTimer <= 0) {
          enemy.moltenTimer = 0.8;
          spawnMoltenPatchHazard(enemy.pos.x, enemy.pos.z, enemy.dmgScale || 1.0);
        }
      }

      if (enemy.kind === 'preta') {
        const pace = isMoving ? 9.5 : 2.5;
        const swing = Math.sin(enemy.animTime * pace);
        if (enemy.animNodes.legL) enemy.animNodes.legL.rotation.x = swing * 0.35;
        if (enemy.animNodes.legR) enemy.animNodes.legR.rotation.x = -swing * 0.35;
        if (enemy.animNodes.armL) enemy.animNodes.armL.rotation.x = -swing * 0.3;
        if (enemy.animNodes.armR) enemy.animNodes.armR.rotation.x = swing * 0.3;
        if (enemy.animNodes.belly) {
          const breath = Math.sin(enemy.animTime * 3) * 0.04;
          enemy.animNodes.belly.scale.set(1.15 + breath, 1.35 + breath, 1.15 + breath);
        }
      } else if (enemy.kind === 'tsen') {
        const pace = enemy.state === 'attack' ? 24 : (isMoving ? 13 : 0);
        const gallop = Math.sin(enemy.animTime * pace);
        if (enemy.animNodes.hLegFL) enemy.animNodes.hLegFL.rotation.x = gallop * 0.55;
        if (enemy.animNodes.hLegFR) enemy.animNodes.hLegFR.rotation.x = -gallop * 0.55;
        if (enemy.animNodes.hLegBL) enemy.animNodes.hLegBL.rotation.x = -gallop * 0.55;
        if (enemy.animNodes.hLegBR) enemy.animNodes.hLegBR.rotation.x = gallop * 0.55;
        if (enemy.animNodes.spearShaft) {
          enemy.animNodes.spearShaft.rotation.x = -Math.PI / 2 + (enemy.state === 'attack' ? 0.12 : 0);
        }
      } else if (enemy.kind === 'migoi') {
        const pace = isMoving ? 5.5 : 2.0;
        const step = Math.sin(enemy.animTime * pace);
        if (enemy.animNodes.legL) enemy.animNodes.legL.rotation.x = step * 0.4;
        if (enemy.animNodes.legR) enemy.animNodes.legR.rotation.x = -step * 0.4;
        if (enemy.animNodes.armL) enemy.animNodes.armL.rotation.x = -step * 0.45;
        if (enemy.animNodes.armR) enemy.animNodes.armR.rotation.x = step * 0.45;
        if (enemy.animNodes.torso) enemy.animNodes.torso.rotation.z = step * 0.05;
      }

      // Sync 3D Transform
      enemy.group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
      enemy.group.rotation.y = enemy.heading;
    }

    // 2b. Update Elite Hazards (`frozen` orbs, `molten` fire patches, `molten` death bombs, smoke puffs)
    for (let i = activeFrozenOrbs.length - 1; i >= 0; i--) {
      const f = activeFrozenOrbs[i];
      f.timer -= dt;
      const u = Math.min(1, 1 - Math.max(0, f.timer) / f.maxTimer);
      f.orbMesh.rotation.y += dt * 4.5;
      f.orbMesh.rotation.x += dt * 3.0;
      f.orbMesh.scale.setScalar(0.3 + u * 0.85);
      f.fillMesh.scale.set(Math.max(0.05, u * f.radius), 1, Math.max(0.05, u * f.radius));

      if (f.timer <= 0) {
        if (playerPos && !isPlayerInSafeZone) {
          const d = Math.hypot(playerPos.x - f.x, playerPos.z - f.z);
          if (d <= f.radius) {
            const dmg = Math.max(1, Math.round(8 * f.dmgMult));
            bus.emit('vitals:damage', {
              amount: dmg,
              type: 'magic',
              slow: 2.0,
              sourcePos: { x: f.x, y: f.y, z: f.z },
            });
          }
        }
        spawnSmokePuff({ x: f.x, y: f.y + 0.35, z: f.z }, 0x38bdf8, f.radius * 1.1, 0.35);
        enemyGroup.remove(f.group);
        activeFrozenOrbs.splice(i, 1);
      }
    }

    for (let i = activeMoltenPatches.length - 1; i >= 0; i--) {
      const mp = activeMoltenPatches[i];
      mp.timer -= dt;
      mp.tickTimer -= dt;
      const lifeRatio = Math.max(0, mp.timer / mp.maxTimer);
      mp.mat.opacity = 0.5 * Math.min(1, lifeRatio * 2.5);

      if (mp.tickTimer <= 0) {
        mp.tickTimer += 0.5;
        if (playerPos && !isPlayerInSafeZone) {
          const d = Math.hypot(playerPos.x - mp.x, playerPos.z - mp.z);
          if (d <= mp.radius) {
            const dmg = Math.max(1, Math.round(2 * mp.dmgMult));
            bus.emit('vitals:damage', {
              amount: dmg,
              type: 'magic',
              ignoreInvuln: true,
              knockback: 0,
              sourcePos: { x: mp.x, y: mp.y, z: mp.z },
            });
          }
        }
      }

      if (mp.timer <= 0) {
        enemyGroup.remove(mp.mesh);
        mp.mat.dispose();
        activeMoltenPatches.splice(i, 1);
      }
    }

    for (let i = activeMoltenBombs.length - 1; i >= 0; i--) {
      const b = activeMoltenBombs[i];
      b.timer -= dt;
      const u = Math.min(1, 1 - Math.max(0, b.timer) / b.maxTimer);
      b.fillMesh.scale.set(Math.max(0.05, u * b.radius), 1, Math.max(0.05, u * b.radius));
      b.coreMesh.scale.setScalar(0.5 + u * 1.3);

      if (b.timer <= 0) {
        if (playerPos && !isPlayerInSafeZone) {
          const d = Math.hypot(playerPos.x - b.x, playerPos.z - b.z);
          if (d <= b.radius) {
            const dmg = Math.max(1, Math.round(14 * b.dmgMult));
            bus.emit('vitals:damage', {
              amount: dmg,
              type: 'magic',
              sourcePos: { x: b.x, y: b.y, z: b.z },
            });
          }
        }
        bus.emit('sfx', { name: 'fireball' });
        spawnSmokePuff({ x: b.x, y: b.y + 0.5, z: b.z }, 0xf97316, b.radius * 1.15, 0.45);
        enemyGroup.remove(b.group);
        activeMoltenBombs.splice(i, 1);
      }
    }

    for (let i = activePuffs.length - 1; i >= 0; i--) {
      const pf = activePuffs[i];
      pf.timer -= dt;
      const u = Math.min(1, 1 - Math.max(0, pf.timer) / pf.maxTimer);
      const s = pf.startScale + (pf.endScale - pf.startScale) * u;
      pf.mesh.scale.setScalar(s);
      pf.mat.opacity = 0.65 * (1 - u);
      if (pf.timer <= 0) {
        enemyGroup.remove(pf.mesh);
        pf.mat.dispose();
        activePuffs.splice(i, 1);
      }
    }

    // 3. Update Liberation Particles
    const posAttr = particleGeo.attributes.position;
    let anyParticleActive = false;
    for (let k = 0; k < PARTICLE_COUNT; k++) {
      const p = particleData[k];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          posAttr.setY(k, -999);
        } else {
          anyParticleActive = true;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          posAttr.setXYZ(k, p.x, p.y, p.z);
        }
      }
    }
    if (anyParticleActive) {
      posAttr.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- 8. Lifecycle & Debug API
  function clearDebugVisualization() {
    while (debugQueryGroup.children.length > 0) {
      const c = debugQueryGroup.children.pop();
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }
    debugQueryGroup.visible = false;
  }

  function visualizeQuery(spec = null) {
    clearDebugVisualization();
    if (!spec) return false;
    const origin = spec.origin || state.player?.position || { x: 1000, y: 0, z: 38 };
    const dirRad = spec.dirRad ?? (state.player?.heading || 0);
    const y = (ctx.world ? ctx.world.getHeight(origin.x, origin.z) : 0) + 0.08;

    debugQueryGroup.position.set(origin.x, y, origin.z);
    debugQueryGroup.rotation.y = typeof dirRad === 'number' ? dirRad : 0;

    if (spec.type === 'cone' || spec.type === 'both') {
      const range = spec.range ?? 7;
      const halfAngle = spec.halfAngleRad ?? (Math.PI / 4);
      // Three.js CircleGeometry starts at +X (angle 0); in local space with rotation.y = dirRad,
      // forward is -Z, which after rotateX(-PI/2) corresponds to thetaStart = PI/2 - halfAngle
      const coneGeo = new THREE.CircleGeometry(
        range,
        36,
        Math.PI * 0.5 - halfAngle,
        halfAngle * 2
      );
      coneGeo.rotateX(-Math.PI / 2);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      debugQueryGroup.add(new THREE.Mesh(coneGeo, coneMat));
    }

    if (spec.type === 'line' || spec.type === 'both') {
      const len = spec.length ?? 12;
      const width = spec.width ?? 1.2;
      const lineGeo = new THREE.PlaneGeometry(width, len);
      lineGeo.translate(0, len * 0.5, 0);
      lineGeo.rotateX(-Math.PI / 2);
      const lineMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      debugQueryGroup.add(new THREE.Mesh(lineGeo, lineMat));
    }

    debugQueryGroup.visible = true;
    return true;
  }

  initRoster();

  const api = {
    group: enemyGroup,
    update,
    damage: damageEnemy,
    applyStatus,
    queryCircle,
    queryCone,
    queryLine,
    nearest,
    visualizeQuery,
    damageNearest(amount = 10, opts = {}) {
      const playerPos = state.player?.position || { x: 1000, z: 38 };
      const target = nearest(playerPos, Infinity);
      if (!target) return { dealt: 0, liberated: false, id: null };
      const res = damageEnemy(target.id, amount, {
        type: opts.type || 'magic',
        source: opts.source || 'debug',
        crit: Boolean(opts.crit),
        knockback: opts.knockback ?? 0,
        from: playerPos,
        status: opts.status || null,
      });
      return { ...res, id: target.id };
    },
    spawn(kind = 'preta', distOrOpts = 8, maybeOpts = {}) {
      let distance = 8;
      let opts = {};
      if (typeof distOrOpts === 'object' && distOrOpts !== null) {
        opts = distOrOpts;
        distance = typeof opts.distance === 'number' ? opts.distance : 8;
      } else {
        distance = typeof distOrOpts === 'number' ? distOrOpts : 8;
        opts = maybeOpts || {};
      }

      let sp;
      if (opts.position && typeof opts.position.x === 'number') {
        const px = opts.position.x;
        const pz = opts.position.z ?? 0;
        sp = {
          x: px,
          y: opts.position.y ?? (ctx.world ? ctx.world.getHeight(px, pz) : 0),
          z: pz,
        };
      } else {
        const playerPos = state.player?.position || { x: 1000, y: 0, z: 57 };
        const heading = state.player?.heading || 0;

        // Spawn at `distance` meters in front of player
        const fwdX = -Math.sin(heading);
        const fwdZ = -Math.cos(heading);
        const rawX = playerPos.x + fwdX * distance;
        const rawZ = playerPos.z + fwdZ * distance;

        sp = {
          x: rawX,
          y: ctx.world ? ctx.world.getHeight(rawX, rawZ) : 0,
          z: rawZ,
        };
      }

      const enemy = createEnemyInstance(kind, sp, opts);
      clampEnemyPosition(enemy);
      enemy.group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
      return enemy.id;
    },
    spawnElite(kind = 'preta', rank = 'champion', affixIds = null) {
      const playerPos = state.player?.position || { x: 1000, y: 0, z: 57 };
      const heading = state.player?.heading || 0;
      const fwdX = -Math.sin(heading);
      const fwdZ = -Math.cos(heading);
      const cx = playerPos.x + fwdX * 5;
      const cz = playerPos.z + fwdZ * 5;
      const cy = ctx.world ? ctx.world.getHeight(cx, cz) : (playerPos.y || 0);
      const info = spawnElitePack(kind, rank, affixIds, { x: cx, y: cy, z: cz });
      return {
        id: info.leaderId,
        ...info,
      };
    },
    clear: clearAllEnemies,
    list() {
      const playerPos = state.player?.position;
      return activeEnemies
        .filter((e) => e.state !== 'liberated')
        .map((e) => {
          const d = playerPos ? Math.hypot(playerPos.x - e.pos.x, playerPos.z - e.pos.z) : 0;
          return {
            id: e.id,
            kind: e.kind,
            level: e.level,
            rank: e.rank,
            affixes: Array.isArray(e.affixes) ? [...e.affixes] : [],
            eliteName: e.eliteName,
            eliteSubtitle: e.eliteSubtitle,
            shielded: Boolean(e.shielded),
            minionOf: e.minionOf || null,
            displayNameKey: e.displayNameKey,
            hp: e.hp,
            maxHp: e.maxHp,
            exp: e.exp,
            state: e.state,
            status: {
              root: Number((e.status?.root || 0).toFixed(2)),
              stun: Number((e.status?.stun || 0).toFixed(2)),
              slow: e.status?.slow?.remaining > 0 ? {
                mult: e.status.slow.mult,
                remaining: Number(e.status.slow.remaining.toFixed(2)),
              } : null,
            },
            dist: Number(d.toFixed(2)),
          };
        });
    },
    freeze(bool) {
      isFrozen = Boolean(bool);
      return isFrozen;
    },
    forceAttack(enemyIdOrAttackId, maybeAttackId) {
      let enemy = null;
      let attackId = null;

      if (maybeAttackId !== undefined) {
        enemy = activeEnemies.find((e) => e.id === enemyIdOrAttackId);
        attackId = maybeAttackId;
      } else {
        attackId = enemyIdOrAttackId;
        enemy = activeEnemies.find((e) => e.state !== 'liberated' && e.kindConfig.attacks?.some((a) => a.id === attackId))
          || activeEnemies.find((e) => e.state !== 'liberated');
      }

      if (!enemy || enemy.state === 'liberated') return false;
      const atk = enemy.kindConfig.attacks?.find((a) => a.id === attackId);
      if (!atk) return false;

      // Cancel any current state/telegraph
      if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
      if (enemy.animNodes?.mouthOrb) enemy.animNodes.mouthOrb.visible = false;
      enemy.chargeData = null;
      enemy.attackCooldowns[attackId] = 0;

      // Face player immediately
      const playerPos = state.player?.position || { x: 1000, y: 0, z: 0 };
      const dx = playerPos.x - enemy.pos.x;
      const dz = playerPos.z - enemy.pos.z;
      enemy.heading = Math.atan2(-dx, -dz);
      enemy.group.rotation.y = enemy.heading;

      startEnemyAttack(enemy, atk, true);
      return true;
    },
    getActiveEnemies() {
      return activeEnemies;
    },
  };

  ctx.enemies = api;
  ctx.debug?.register('enemies', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.enemies = api;
  }

  return api;
}
