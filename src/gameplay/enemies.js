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
  (ctx.wildGroup || scene).add(enemyGroup);

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
  let enemyIdCounter = 1;
  let isFrozen = false;

  function createEnemyInstance(kind, spawnPos) {
    const kCfg = cfg.kinds[kind] || cfg.kinds.preta;
    const id = `${kind}_${enemyIdCounter++}`;

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

      (ctx.wildGroup || scene).add(telegraphGroup);
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

      (ctx.wildGroup || scene).add(telegraphGroup);
    }

    enemyGroup.add(group);

    const enemy = {
      id,
      kind,
      kindConfig: kCfg,
      hp: kCfg.hp,
      maxHp: kCfg.hp,
      speed: kCfg.speed,
      exp: kCfg.exp,
      ring: kCfg.ring,
      radius: kCfg.radius,
      height: kCfg.height,
      pos: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
      heading: 0,
      lockedHeading: 0,
      lastAttackId: null,
      state: 'wander',
      stateTimer: 0,
      activeAttack: null,
      attackCooldowns: {},
      wanderTarget: { x: spawnPos.x, z: spawnPos.z },
      wanderTimer: 1.0 + Math.random() * 3.0,
      homePos: { x: spawnPos.x, z: spawnPos.z },
      flashTimer: 0,
      liberateTimer: 0,
      group,
      materials,
      animNodes,
      telegraphGroup,
      telegraphFill,
      chargeLineMesh,
      aimLineMesh,
      chargeData: null,
      animTime: Math.random() * 10,
    };

    activeEnemies.push(enemy);
    return enemy;
  }

  // ---------------------------------------------------------------- 4. Clamping & Collisions
  function clampEnemyPosition(enemy) {
    const origin = wildCfg.origin || { x: 1000, z: 0 };
    const maxR = (wildCfg.walkRadius || 70) - enemy.radius;

    // 1. Walk boundary from wild origin
    let dx = enemy.pos.x - origin.x;
    let dz = enemy.pos.z - origin.z;
    let r = Math.hypot(dx, dz);
    if (r > maxR) {
      const s = maxR / (r || 1);
      enemy.pos.x = origin.x + dx * s;
      enemy.pos.z = origin.z + dz * s;
    }

    // 2. Gate safe zone (10m radius around 1000, 62)
    const gateX = wildCfg.wildGate.x;
    const gateZ = wildCfg.wildGate.z;
    const safeR = cfg.gateSafeRadius ?? 10;
    const gdx = enemy.pos.x - gateX;
    const gdz = enemy.pos.z - gateZ;
    const gd = Math.hypot(gdx, gdz);
    if (gd < safeR) {
      const push = safeR / (gd || 1);
      enemy.pos.x = gateX + gdx * push;
      enemy.pos.z = gateZ + gdz * push;
    }

    // 3. Obstacle colliders
    if (Array.isArray(ctx.colliders)) {
      for (let i = 0; i < ctx.colliders.length; i++) {
        const c = ctx.colliders[i];
        if (!c || (c.zone || 'stupa') !== 'wild') continue;
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
    enemy.pos.y = ctx.wilderness?.getHeight ? ctx.wilderness.getHeight(enemy.pos.x, enemy.pos.z) : 0;
  }

  // ---------------------------------------------------------------- 5. Initial Spawning
  function disposeEnemy(e) {
    if (e.telegraphGroup) {
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

  function initRoster() {
    // Clear any existing
    for (const e of activeEnemies) {
      disposeEnemy(e);
    }
    activeEnemies.length = 0;
    pendingRespawns.length = 0;

    if (!ctx.wilderness?.sampleRingPoint) return;

    // 5 preta in 'near': cluster of 3 and cluster of 2
    const nearPoint1 = ctx.wilderness.sampleRingPoint('near', { minDistFromGate: 12 });
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const offsetPos = {
        x: nearPoint1.x + Math.cos(angle) * 1.8,
        y: nearPoint1.y,
        z: nearPoint1.z + Math.sin(angle) * 1.8,
      };
      const e = createEnemyInstance('preta', offsetPos);
      clampEnemyPosition(e);
    }

    const nearPoint2 = ctx.wilderness.sampleRingPoint('near', { minDistFromGate: 12 });
    for (let i = 0; i < 2; i++) {
      const angle = (i / 2) * Math.PI * 2;
      const offsetPos = {
        x: nearPoint2.x + Math.cos(angle) * 1.8,
        y: nearPoint2.y,
        z: nearPoint2.z + Math.sin(angle) * 1.8,
      };
      const e = createEnemyInstance('preta', offsetPos);
      clampEnemyPosition(e);
    }

    // 4 tsen in 'mid'
    for (let i = 0; i < 4; i++) {
      const pt = ctx.wilderness.sampleRingPoint('mid', { minDistFromGate: 12 });
      const e = createEnemyInstance('tsen', pt);
      clampEnemyPosition(e);
    }

    // 3 migoi in 'deep'
    for (let i = 0; i < 3; i++) {
      const pt = ctx.wilderness.sampleRingPoint('deep', { minDistFromGate: 12 });
      const e = createEnemyInstance('migoi', pt);
      clampEnemyPosition(e);
    }
  }

  // ---------------------------------------------------------------- 6. Damage & Liberation Bus Listeners
  bus.on('mantra:cast', ({ origin, radius, power }) => {
    if (state.zone !== 'wild' || !origin) return;

    const dmgPower = typeof power === 'number' && power > 0 ? power : (state.player?.atk || 10);
    const origin2D = { x: origin.x, z: origin.z };

    for (let i = 0; i < activeEnemies.length; i++) {
      const enemy = activeEnemies[i];
      if (enemy.state === 'liberated') continue;

      const dx = enemy.pos.x - origin2D.x;
      const dz = enemy.pos.z - origin2D.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= radius) {
        // Hit!
        enemy.hp = Math.max(0, enemy.hp - dmgPower);
        bus.emit('sfx', { name: 'hit' });

        bus.emit('enemy:hit', {
          id: enemy.id,
          kind: enemy.kind,
          damage: dmgPower,
          type: 'magic',
          position: { x: enemy.pos.x, y: enemy.pos.y + enemy.height, z: enemy.pos.z },
        });

        // Cancel active telegraph/windup
        if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
        if (enemy.animNodes?.mouthOrb) enemy.animNodes.mouthOrb.visible = false;

        if (enemy.hp > 0) {
          // Hurt state
          enemy.state = 'hurt';
          enemy.stateTimer = cfg.hurtDuration ?? 0.25;
          enemy.flashTimer = 0.2;

          // Knockback 1.5m away from mantra origin
          const kb = cfg.hurtKnockback ?? 1.5;
          if (dist > 1e-4) {
            enemy.pos.x += (dx / dist) * kb;
            enemy.pos.z += (dz / dist) * kb;
          }
          clampEnemyPosition(enemy);

          // Flash red/white
          for (const mat of enemy.materials) {
            mat.emissive?.setHex(0xffffff);
            if (mat.emissiveIntensity != null) mat.emissiveIntensity = 1.0;
          }
        } else {
          // Liberated!
          enemy.state = 'liberated';
          enemy.liberateTimer = 0;
          bus.emit('sfx', { name: 'liberate' });

          ctx.vitals?.addExp?.(enemy.exp);

          bus.emit('enemy:liberated', {
            id: enemy.id,
            kind: enemy.kind,
            exp: enemy.exp,
            position: { ...enemy.pos },
          });

          const nameKey = enemy.kindConfig.nameKey || `enemy.${enemy.kind}`;
          const localizedName = i18n?.t ? i18n.t(nameKey) : enemy.kind;
          bus.emit('toast', {
            key: 'toast.enemyLiberated',
            params: { name: localizedName, exp: enemy.exp },
          });

          // Queue respawn timer
          const respawnTime = (cfg.respawnMin ?? 20) + Math.random() * ((cfg.respawnMax ?? 40) - (cfg.respawnMin ?? 20));
          pendingRespawns.push({
            kind: enemy.kind,
            ring: enemy.ring,
            timer: respawnTime,
          });

          // If no non-liberated enemies remain on the field and total queued < maxCount,
          // schedule respawns to restore the full 12-enemy roster over 20–38s.
          const remainingAlive = activeEnemies.filter((e) => e.state !== 'liberated').length;
          if (remainingAlive === 0 && pendingRespawns.length < (cfg.maxCount ?? 12)) {
            const targetRoster = [
              ...Array(5).fill({ kind: 'preta', ring: 'near' }),
              ...Array(4).fill({ kind: 'tsen', ring: 'mid' }),
              ...Array(3).fill({ kind: 'migoi', ring: 'deep' }),
            ];
            for (const slot of targetRoster) {
              if (pendingRespawns.length >= (cfg.maxCount ?? 12)) break;
              const t = (cfg.respawnMin ?? 20) + Math.random() * (((cfg.respawnMax ?? 40) - 2) - (cfg.respawnMin ?? 20));
              pendingRespawns.push({ kind: slot.kind, ring: slot.ring, timer: t });
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
        }
      }
    }
  });

  // ---------------------------------------------------------------- 7. Per-Frame AI Update
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
        damage: atk.damage,
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
        damage: atk.damage,
        aoeRadius: atk.aoeRadius,
        eruptDelay: atk.eruptDelay,
        slow: atk.slow,
        magic: true,
      });
    }
  }

  function update(dt) {
    const isWild = (state.zone === 'wild');
    enemyGroup.visible = isWild;

    if (!isWild) {
      // Hide any active telegraphs when leaving wild zone
      for (const e of activeEnemies) {
        if (e.telegraphGroup) e.telegraphGroup.visible = false;
        if (e.animNodes?.mouthOrb) e.animNodes.mouthOrb.visible = false;
      }
      return;
    }

    const playerPos = state.player?.position;
    const gateX = wildCfg.wildGate.x;
    const gateZ = wildCfg.wildGate.z;
    const safeRadius = cfg.gateSafeRadius ?? 10;
    const isPlayerInSafeZone = playerPos
      ? Math.hypot(playerPos.x - gateX, playerPos.z - gateZ) <= safeRadius
      : true;

    // 1. Process Respawn Timers
    for (let i = pendingRespawns.length - 1; i >= 0; i--) {
      const r = pendingRespawns[i];
      r.timer -= dt;
      if (r.timer <= 0) {
        pendingRespawns.splice(i, 1);
        if (activeEnemies.length < (cfg.maxCount ?? 12) && ctx.wilderness?.sampleRingPoint) {
          const pt = ctx.wilderness.sampleRingPoint(r.ring, {
            minDistFromGate: 12,
            minDistFromPlayer: cfg.respawnMinPlayerDist ?? 20,
          });
          const newEnemy = createEnemyInstance(r.kind, pt);
          clampEnemyPosition(newEnemy);
        }
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
          for (const mat of enemy.materials) {
            mat.emissive?.setHex(0x000000);
            if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0;
          }
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

      if (isFrozen) {
        enemy.group.position.set(enemy.pos.x, enemy.pos.y, enemy.pos.z);
        enemy.group.rotation.y = enemy.heading;
        continue;
      }

      // Distance to player
      const dxPlayer = playerPos ? playerPos.x - enemy.pos.x : 999;
      const dzPlayer = playerPos ? playerPos.z - enemy.pos.z : 999;
      const distToPlayer = Math.hypot(dxPlayer, dzPlayer);

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
          const cd = enemy.chargeData;
          cd.progress += dt / (enemy.activeAttack.dashDuration ?? 0.4);
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
                amount: enemy.activeAttack.damage,
                type: 'physical',
                sourcePos: { ...enemy.pos },
              });
            }
          }

          if (u >= 1) {
            enemy.attackCooldowns[enemy.activeAttack.id] = enemy.activeAttack.cooldown;
            enemy.state = 'recover';
            enemy.stateTimer = enemy.activeAttack.recover ?? 0.35;
            enemy.chargeData = null;
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
          // Windup complete: hide telegraph and clear emissive
          if (enemy.telegraphGroup) enemy.telegraphGroup.visible = false;
          if (enemy.animNodes.mouthOrb) enemy.animNodes.mouthOrb.visible = false;
          for (const mat of enemy.materials) {
            mat.emissive?.setHex(0x000000);
            if (mat.emissiveIntensity != null) mat.emissiveIntensity = 0;
          }

          if (atk.id === 'ghostfire') {
            const mouthPos = {
              x: enemy.pos.x - Math.sin(enemy.heading) * 0.35,
              y: enemy.pos.y + 1.25,
              z: enemy.pos.z - Math.cos(enemy.heading) * 0.35,
            };
            ctx.projectiles?.spawn('ghostfire', {
              origin: mouthPos,
              damage: atk.damage,
              speed: atk.speed,
              turnRate: atk.turnRate,
              lifetime: atk.lifetime,
              hitRadius: atk.hitRadius,
              magic: true,
            });
            bus.emit('sfx', { name: 'fireball' });
            enemy.attackCooldowns[atk.id] = atk.cooldown;
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
              damage: atk.damage,
              speed: atk.speed,
              lifetime: atk.lifetime,
              hitRadius: atk.hitRadius,
              magic: false,
            });
            bus.emit('sfx', { name: 'arrow' });
            enemy.attackCooldowns[atk.id] = atk.cooldown;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.35;
          } else if (atk.id === 'spearCharge') {
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
          } else if (atk.id === 'boulder') {
            enemy.attackCooldowns[atk.id] = atk.cooldown;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.45;
          } else if (atk.id === 'frostRoar') {
            enemy.attackCooldowns[atk.id] = atk.cooldown;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.5;
          } else if (atk.id === 'groundSlam') {
            if (playerPos) {
              const slamDist = Math.hypot(playerPos.x - enemy.pos.x, playerPos.z - enemy.pos.z);
              if (slamDist <= (atk.aoeRadius ?? 3.5)) {
                bus.emit('vitals:damage', {
                  amount: atk.damage,
                  type: 'physical',
                  sourcePos: { ...enemy.pos },
                });
              }
            }
            enemy.attackCooldowns[atk.id] = atk.cooldown;
            enemy.state = 'recover';
            enemy.stateTimer = atk.recover ?? 0.5;
          } else {
            // Melee claw
            if (playerPos) {
              const clawDist = Math.hypot(playerPos.x - enemy.pos.x, playerPos.z - enemy.pos.z);
              if (clawDist <= (atk.hitReach ?? 1.8)) {
                bus.emit('vitals:damage', {
                  amount: atk.damage,
                  type: 'physical',
                  sourcePos: { ...enemy.pos },
                });
              }
            }
            enemy.attackCooldowns[atk.id] = atk.cooldown;
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
          } else {
            // Move toward player until stopDistance
            const stopDist = enemy.kindConfig.stopDistance ?? 1.2;
            if (distToPlayer > stopDist) {
              const moveDist = Math.min(enemy.speed * dt, distToPlayer - stopDist);
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
        } else {
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
            const wMove = Math.min(enemy.speed * 0.5 * dt, wdist);
            enemy.pos.x += (wdx / wdist) * wMove;
            enemy.pos.z += (wdz / wdist) * wMove;
            clampEnemyPosition(enemy);
          }
        }
      }

      // --- Contact Damage Check
      // Applies when player touches body (except during charge attack where charge damage takes priority)
      if (playerPos && enemy.state !== 'liberated' && enemy.state !== 'hurt' && enemy.state !== 'attack') {
        const contactReach = enemy.radius + (config.PLAYER.radius || 0.35) + 0.15;
        if (distToPlayer <= contactReach) {
          bus.emit('vitals:damage', {
            amount: cfg.contactDamage ?? 3,
            type: 'physical',
            sourcePos: { ...enemy.pos },
          });
        }
      }

      // --- Procedural Animations
      enemy.animTime += dt;
      const isMoving = enemy.state === 'chase' || enemy.state === 'wander' || enemy.state === 'attack';
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
  initRoster();

  const api = {
    group: enemyGroup,
    update,
    spawn(kind = 'preta', distance = 8) {
      const playerPos = state.player?.position || { x: 1000, y: 0, z: 57 };
      const heading = state.player?.heading || 0;

      // Spawn at `distance` meters in front of player
      const fwdX = -Math.sin(heading);
      const fwdZ = -Math.cos(heading);
      const rawX = playerPos.x + fwdX * distance;
      const rawZ = playerPos.z + fwdZ * distance;

      const sp = {
        x: rawX,
        y: ctx.wilderness?.getHeight ? ctx.wilderness.getHeight(rawX, rawZ) : 0,
        z: rawZ,
      };

      const enemy = createEnemyInstance(kind, sp);
      clampEnemyPosition(enemy);
      return enemy.id;
    },
    clear() {
      for (const e of activeEnemies) {
        disposeEnemy(e);
      }
      activeEnemies.length = 0;
      pendingRespawns.length = 0;
    },
    list() {
      const playerPos = state.player?.position;
      return activeEnemies
        .filter((e) => e.state !== 'liberated')
        .map((e) => {
          const d = playerPos ? Math.hypot(playerPos.x - e.pos.x, playerPos.z - e.pos.z) : 0;
          return {
            id: e.id,
            kind: e.kind,
            hp: e.hp,
            maxHp: e.maxHp,
            state: e.state,
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
