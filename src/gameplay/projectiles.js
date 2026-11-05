/**
 * Projectiles & Ground Hazards System — Ghostfire, Red Arrow, Boulder Toss, and Frost Roar.
 *
 * Implements:
 *  - Fixed object pools for 4 projectile/hazard types (max 20 active total)
 *  - Procedural Three.js geometry & materials allocated once at startup (zero runtime allocations)
 *  - Parabolic trajectories, tracking homing physics, straight-line flight, and ground rune circles
 *  - Collision detection against player, wild rock colliders, terrain and zone boundaries
 *  - Six-Syllable Mantra (mantra:cast) dispelling of magic projectiles (ghostfire, frostRoar)
 *  - Dispel particle burst VFX and Web Audio sound triggers
 *  - Debug inspection API (__stupa.projectiles: spawn, clear, count, showHitboxes)
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

export function createProjectiles(ctx) {
  const { scene, state, config, bus } = ctx;
  const maxActiveLimit = config.PROJECTILES?.maxActive ?? 20;
  const wildCfg = config.WILD || {};
  const wildOrigin = wildCfg.origin || { x: 1000, z: 0 };
  const walkRadius = wildCfg.walkRadius || 70;

  const projGroup = new THREE.Group();
  // Pre-warm GPU geometry buffers when renderer renders
  for (const ch of projGroup.children) ch.frustumCulled = false;
  scene.add(projGroup);

  let hitboxesVisible = false;

  // ---------------------------------------------------------------- 1. Shared Geometries & Materials
  // Ghostfire
  const ghostCoreGeo = new THREE.SphereGeometry(0.24, 12, 10);
  const ghostGlowGeo = new THREE.SphereGeometry(0.38, 8, 8);
  const ghostCoreMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x22c55e,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const ghostGlowMat = new THREE.MeshBasicMaterial({
    color: 0x86efac,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });

  // Red Arrow
  const arrowShaftGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.9, 6);
  arrowShaftGeo.rotateX(-Math.PI / 2);
  const arrowHeadGeo = new THREE.ConeGeometry(0.065, 0.24, 5);
  arrowHeadGeo.rotateX(-Math.PI / 2);
  arrowHeadGeo.translate(0, 0, -0.48);
  const arrowShaftMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.6,
  });
  const arrowHeadMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xef4444,
    emissiveIntensity: 1.4,
    roughness: 0.3,
  });

  // Boulder
  const boulderGeo = new THREE.DodecahedronGeometry(0.55, 0);
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    roughness: 0.88,
  });
  const boulderRingGeo = new THREE.RingGeometry(1.72, 1.8, 36);
  boulderRingGeo.rotateX(-Math.PI / 2);
  const boulderFillGeo = new THREE.CircleGeometry(1.72, 36);
  boulderFillGeo.rotateX(-Math.PI / 2);
  const boulderRingMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const boulderFillMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });

  // Frost Roar Rune Circle & Spikes
  const frostOuterRingGeo = new THREE.RingGeometry(2.12, 2.2, 40);
  frostOuterRingGeo.rotateX(-Math.PI / 2);
  const frostInnerRingGeo = new THREE.RingGeometry(1.3, 1.38, 24);
  frostInnerRingGeo.rotateX(-Math.PI / 2);
  const frostFillGeo = new THREE.CircleGeometry(2.1, 36);
  frostFillGeo.rotateX(-Math.PI / 2);
  const frostOuterMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const frostInnerMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const frostFillMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });

  const spikeConeGeo = new THREE.ConeGeometry(0.18, 1.4, 5);
  spikeConeGeo.translate(0, 0.7, 0);
  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    transparent: true,
    opacity: 0.9,
  });

  // Hitbox Wireframes
  const hitboxSphereGeo = new THREE.SphereGeometry(1.0, 10, 8);
  const hitboxRingGeo = new THREE.RingGeometry(0.96, 1.0, 32);
  hitboxRingGeo.rotateX(-Math.PI / 2);
  const hitboxMat = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });

  // Hum Bolt (ཧཱུྃ) Friendly Projectile Geometries & Materials (init once, zero PointLights)
  function createHumTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    if (c) {
      c.clearRect(0, 0, 128, 128);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = 'bold 68px "Noto Sans Tibetan", "Jomolhari", "Noto Serif TC", serif';
      c.shadowColor = 'rgba(255, 190, 45, 0.95)';
      c.shadowBlur = 18;
      c.fillStyle = '#fff5cc';
      c.fillText('ཧཱུྃ', 64, 66);
      c.shadowBlur = 0;
      c.fillStyle = '#ffffff';
      c.fillText('ཧཱུྃ', 64, 66);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  const humTex = createHumTexture();
  const humCoreGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const humCoreMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.85, 0.55),
    toneMapped: false,
  });
  const humHaloGeo = new THREE.RingGeometry(0.22, 0.35, 24);
  const humHaloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.6, 0.35),
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const humTailGeo = new THREE.ConeGeometry(0.16, 0.85, 10);
  humTailGeo.rotateX(Math.PI / 2);
  humTailGeo.translate(0, 0, 0.42);
  const humTailMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 1.4, 0.25),
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const humSpriteMat = new THREE.SpriteMaterial({
    map: humTex,
    color: new THREE.Color(2.5, 2.0, 0.65),
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity: 0.96,
  });

  // ---------------------------------------------------------------- 2. Dispel VFX Particle Pool
  const DISPEL_PARTICLE_COUNT = 80;
  const dispelGeo = new THREE.BufferGeometry();
  const dispelPositions = new Float32Array(DISPEL_PARTICLE_COUNT * 3);
  const dispelColors = new Float32Array(DISPEL_PARTICLE_COUNT * 3);
  for (let i = 0; i < DISPEL_PARTICLE_COUNT; i++) {
    dispelPositions[i * 3 + 1] = -999;
    const isGold = Math.random() > 0.5;
    dispelColors[i * 3] = isGold ? 1.0 : 0.22;
    dispelColors[i * 3 + 1] = isGold ? 0.82 : 0.74;
    dispelColors[i * 3 + 2] = isGold ? 0.2 : 0.98;
  }
  dispelGeo.setAttribute('position', new THREE.BufferAttribute(dispelPositions, 3));
  dispelGeo.setAttribute('color', new THREE.BufferAttribute(dispelColors, 3));
  const dispelMat = new THREE.PointsMaterial({
    size: 0.22,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const dispelPoints = new THREE.Points(dispelGeo, dispelMat);
  dispelPoints.frustumCulled = false;
  projGroup.add(dispelPoints);

  const dispelData = Array.from({ length: DISPEL_PARTICLE_COUNT }, () => ({
    active: false,
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.6,
  }));

  function burstDispelParticles(x, y, z) {
    let spawned = 0;
    const targetCount = 28;
    for (let i = 0; i < DISPEL_PARTICLE_COUNT; i++) {
      const p = dispelData[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.life = 0;
        p.maxLife = 0.45 + Math.random() * 0.25;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.2) * Math.PI * 0.6;
        const speed = 2.0 + Math.random() * 3.5;
        p.vx = Math.cos(phi) * Math.cos(theta) * speed;
        p.vy = Math.sin(phi) * speed + 1.2;
        p.vz = Math.cos(phi) * Math.sin(theta) * speed;
        spawned++;
        if (spawned >= targetCount) break;
      }
    }
  }

  // ---------------------------------------------------------------- 3. Projectile Instance Pools
  const POOL_CAP = 20;

  // --- Ghostfire Pool
  const ghostfirePool = [];
  for (let i = 0; i < POOL_CAP; i++) {
    const group = new THREE.Group();
    group.visible = false;
    const core = new THREE.Mesh(ghostCoreGeo, ghostCoreMat);
    const glow = new THREE.Mesh(ghostGlowGeo, ghostGlowMat);
    group.add(core);
    group.add(glow);

    const hitbox = new THREE.Mesh(hitboxSphereGeo, hitboxMat);
    hitbox.visible = false;
    group.add(hitbox);

    projGroup.add(group);
    ghostfirePool.push({
      id: `ghostfire_${i}`,
      type: 'ghostfire',
      magic: true,
      active: false,
      group,
      hitbox,
      pos: new THREE.Vector3(),
      heading: 0,
      speed: 4.0,
      turnRate: 1.2,
      lifetime: 4.0,
      age: 0,
      damage: 8,
      hitRadius: 0.45,
    });
  }

  // --- Red Arrow Pool
  const redArrowPool = [];
  for (let i = 0; i < POOL_CAP; i++) {
    const group = new THREE.Group();
    group.visible = false;
    const shaft = new THREE.Mesh(arrowShaftGeo, arrowShaftMat);
    const head = new THREE.Mesh(arrowHeadGeo, arrowHeadMat);
    group.add(shaft);
    group.add(head);

    const hitbox = new THREE.Mesh(hitboxSphereGeo, hitboxMat);
    hitbox.visible = false;
    group.add(hitbox);

    projGroup.add(group);
    redArrowPool.push({
      id: `redArrow_${i}`,
      type: 'redArrow',
      magic: false,
      active: false,
      group,
      hitbox,
      pos: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      speed: 18.0,
      lifetime: 1.5,
      age: 0,
      damage: 10,
      hitRadius: 0.4,
    });
  }

  // --- Boulder Pool
  const boulderPool = [];
  for (let i = 0; i < POOL_CAP; i++) {
    const group = new THREE.Group();
    group.visible = false;
    const rock = new THREE.Mesh(boulderGeo, boulderMat);
    group.add(rock);

    // Landing indicator
    const landingGroup = new THREE.Group();
    const ring = new THREE.Mesh(boulderRingGeo, boulderRingMat);
    const fill = new THREE.Mesh(boulderFillGeo, boulderFillMat);
    landingGroup.add(ring);
    landingGroup.add(fill);
    landingGroup.position.set(0, 0.04, 0);
    projGroup.add(landingGroup);
    landingGroup.visible = false;

    const hitbox = new THREE.Mesh(hitboxRingGeo, hitboxMat);
    hitbox.visible = false;
    landingGroup.add(hitbox);

    projGroup.add(group);
    boulderPool.push({
      id: `boulder_${i}`,
      type: 'boulder',
      magic: false,
      active: false,
      group,
      rock,
      landingGroup,
      landingFill: fill,
      hitbox,
      startPos: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      currentPos: new THREE.Vector3(),
      flightDuration: 1.2,
      arcHeight: 5.5,
      age: 0,
      damage: 16,
      hitRadius: 1.8,
    });
  }

  // --- Frost Roar Pool
  const frostRoarPool = [];
  for (let i = 0; i < POOL_CAP; i++) {
    const group = new THREE.Group();
    group.visible = false;

    const outerRing = new THREE.Mesh(frostOuterRingGeo, frostOuterMat);
    const innerRing = new THREE.Mesh(frostInnerRingGeo, frostInnerMat);
    const fill = new THREE.Mesh(frostFillGeo, frostFillMat);
    group.add(outerRing);
    group.add(innerRing);
    group.add(fill);

    // Spikes group
    const spikesGroup = new THREE.Group();
    spikesGroup.visible = false;
    const spikeCount = 8;
    for (let s = 0; s < spikeCount; s++) {
      const cone = new THREE.Mesh(spikeConeGeo, spikeMat);
      const angle = (s / spikeCount) * Math.PI * 2;
      const r = 0.5 + (s % 3) * 0.55;
      cone.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      cone.rotation.y = angle;
      spikesGroup.add(cone);
    }
    const centerCone = new THREE.Mesh(spikeConeGeo, spikeMat);
    centerCone.scale.set(1.2, 1.3, 1.2);
    spikesGroup.add(centerCone);
    group.add(spikesGroup);

    const hitbox = new THREE.Mesh(hitboxRingGeo, hitboxMat);
    hitbox.visible = false;
    group.add(hitbox);

    projGroup.add(group);
    frostRoarPool.push({
      id: `frostRoar_${i}`,
      type: 'frostRoar',
      magic: true,
      active: false,
      group,
      fill,
      spikesGroup,
      hitbox,
      centerPos: new THREE.Vector3(),
      aoeRadius: 2.2,
      eruptDelay: 1.2,
      eruptDuration: 0.35,
      slow: 2.0,
      age: 0,
      damage: 12,
      erupted: false,
    });
  }

  // --- Hum Bolt Pool (Friendly Skill Projectile)
  const HUM_POOL_CAP = 16;
  const humBoltPool = [];
  for (let i = 0; i < HUM_POOL_CAP; i++) {
    const group = new THREE.Group();
    group.visible = false;

    const core = new THREE.Mesh(humCoreGeo, humCoreMat);
    const halo = new THREE.Mesh(humHaloGeo, humHaloMat);
    const tail = new THREE.Mesh(humTailGeo, humTailMat);
    const sprite = new THREE.Sprite(humSpriteMat);
    sprite.scale.set(0.68, 0.68, 0.68);
    sprite.position.set(0, 0.08, 0);

    group.add(core, halo, tail, sprite);

    const hitbox = new THREE.Mesh(hitboxSphereGeo, hitboxMat);
    hitbox.visible = false;
    group.add(hitbox);

    projGroup.add(group);
    humBoltPool.push({
      id: `humBolt_${i}`,
      type: 'humBolt',
      friendly: true,
      magic: true,
      active: false,
      group,
      halo,
      hitbox,
      pos: new THREE.Vector3(),
      dir: new THREE.Vector3(0, 0, -1),
      heading: 0,
      speed: 22.0,
      maxRange: 14.0,
      distanceTraveled: 0,
      lifetime: 14.0 / 22.0,
      age: 0,
      damageMult: 0.60,
      rank: 1,
      enh: null,
      maxHits: 1,
      mpRestore: 2,
      hitRadius: 0.55,
      hitIds: new Set(),
    });
  }

  // ---------------------------------------------------------------- 4. Helper Counters & Clear
  function enemyCount() {
    let c = 0;
    for (let i = 0; i < POOL_CAP; i++) {
      if (ghostfirePool[i].active) c++;
      if (redArrowPool[i].active) c++;
      if (boulderPool[i].active) c++;
      if (frostRoarPool[i].active) c++;
    }
    return c;
  }

  function count() {
    let c = enemyCount();
    for (let i = 0; i < HUM_POOL_CAP; i++) {
      if (humBoltPool[i].active) c++;
    }
    return c;
  }

  function clearEnemyProjectiles() {
    for (let i = 0; i < POOL_CAP; i++) {
      const gf = ghostfirePool[i];
      gf.active = false;
      gf.group.visible = false;
      gf.hitbox.visible = false;

      const ra = redArrowPool[i];
      ra.active = false;
      ra.group.visible = false;
      ra.hitbox.visible = false;

      const b = boulderPool[i];
      b.active = false;
      b.group.visible = false;
      b.landingGroup.visible = false;
      b.hitbox.visible = false;

      const fr = frostRoarPool[i];
      fr.active = false;
      fr.group.visible = false;
      fr.spikesGroup.visible = false;
      fr.hitbox.visible = false;
    }
  }

  function clear() {
    clearEnemyProjectiles();
    for (let i = 0; i < HUM_POOL_CAP; i++) {
      const hb = humBoltPool[i];
      hb.active = false;
      hb.group.visible = false;
      hb.hitbox.visible = false;
      hb.hitIds.clear();
    }
  }

  bus.on('zone:change', () => {
    clear();
  });

  function showHitboxes(bool) {
    hitboxesVisible = Boolean(bool);
    if (!hitboxesVisible) {
      for (let i = 0; i < POOL_CAP; i++) {
        ghostfirePool[i].hitbox.visible = false;
        redArrowPool[i].hitbox.visible = false;
        boulderPool[i].hitbox.visible = false;
        frostRoarPool[i].hitbox.visible = false;
      }
      for (let i = 0; i < HUM_POOL_CAP; i++) {
        humBoltPool[i].hitbox.visible = false;
      }
    }
    return hitboxesVisible;
  }

  // ---------------------------------------------------------------- 5. Spawning API
  function spawn(type, params = {}) {
    const playerPos = state.player?.position || { x: 1000, y: 0, z: 0 };

    if (type === 'humBolt') {
      const slot = humBoltPool.find((item) => !item.active);
      if (!slot) return null;

      let heading = state.player?.heading || 0;
      if (typeof params.dir === 'number') {
        heading = params.dir;
        slot.dir.set(-Math.sin(heading), 0, -Math.cos(heading));
      } else if (params.dir && typeof params.dir === 'object') {
        slot.dir.set(params.dir.x || 0, 0, params.dir.z || 0);
        if (slot.dir.lengthSq() < 1e-6) {
          slot.dir.set(-Math.sin(heading), 0, -Math.cos(heading));
        } else {
          slot.dir.normalize();
          heading = Math.atan2(-slot.dir.x, -slot.dir.z);
        }
      } else {
        slot.dir.set(-Math.sin(heading), 0, -Math.cos(heading));
      }

      const ox = params.origin?.x ?? (playerPos.x + slot.dir.x * 0.55);
      const oz = params.origin?.z ?? (playerPos.z + slot.dir.z * 0.55);
      const oy = params.origin?.y ?? ((ctx.world ? ctx.world.getHeight(ox, oz) : (playerPos.y || 0)) + 1.1);

      slot.active = true;
      slot.age = 0;
      slot.distanceTraveled = 0;
      slot.heading = heading;
      slot.pos.set(ox, oy, oz);
      slot.speed = params.speed ?? 22.0;
      slot.maxRange = params.range ?? 14.0;
      slot.lifetime = slot.maxRange / Math.max(1, slot.speed);
      slot.damageMult = params.damageMult ?? 0.60;
      slot.rank = params.rank ?? 1;
      slot.enh = params.enh ?? null;
      slot.maxHits = params.maxHits ?? (slot.enh === 'a' ? 3 : 1);
      slot.mpRestore = params.mpRestore ?? (slot.enh === 'b' ? 3 : 2);
      slot.hitRadius = params.hitRadius ?? 0.55;
      slot.hitIds.clear();

      slot.group.position.copy(slot.pos);
      slot.group.rotation.set(0, heading, 0);
      slot.group.visible = true;
      slot.hitbox.scale.setScalar(slot.hitRadius);
      slot.hitbox.visible = hitboxesVisible;
      return slot;
    }

    if (enemyCount() >= maxActiveLimit) {
      return null;
    }

    if (type === 'ghostfire') {
      const slot = ghostfirePool.find((item) => !item.active);
      if (!slot) return null;

      const origin = params.origin || {
        x: playerPos.x + 6,
        y: (ctx.world ? ctx.world.getHeight(playerPos.x + 6, playerPos.z) : 0) + 1.2,
        z: playerPos.z,
      };

      slot.active = true;
      slot.age = 0;
      slot.pos.set(origin.x, origin.y, origin.z);
      slot.damage = params.damage ?? 8;
      slot.speed = params.speed ?? 4.0;
      slot.turnRate = params.turnRate ?? 1.2;
      slot.lifetime = params.lifetime ?? 4.0;
      slot.hitRadius = params.hitRadius ?? 0.45;

      const dx = playerPos.x - slot.pos.x;
      const dz = playerPos.z - slot.pos.z;
      slot.heading = Math.atan2(-dx, -dz);

      slot.group.position.copy(slot.pos);
      slot.group.visible = true;
      slot.hitbox.scale.setScalar(slot.hitRadius);
      slot.hitbox.visible = hitboxesVisible;
      return slot;
    }

    if (type === 'redArrow') {
      const slot = redArrowPool.find((item) => !item.active);
      if (!slot) return null;

      const origin = params.origin || {
        x: playerPos.x + 10,
        y: (ctx.world ? ctx.world.getHeight(playerPos.x + 10, playerPos.z) : 0) + 1.6,
        z: playerPos.z,
      };

      slot.active = true;
      slot.age = 0;
      slot.pos.set(origin.x, origin.y, origin.z);
      slot.damage = params.damage ?? 10;
      slot.speed = params.speed ?? 18.0;
      slot.lifetime = params.lifetime ?? 1.5;
      slot.hitRadius = params.hitRadius ?? 0.4;

      if (params.dir) {
        slot.dir.set(params.dir.x, params.dir.y || 0, params.dir.z).normalize();
      } else {
        slot.dir.set(playerPos.x - slot.pos.x, 0, playerPos.z - slot.pos.z).normalize();
      }

      slot.group.position.copy(slot.pos);
      const angle = Math.atan2(-slot.dir.x, -slot.dir.z);
      slot.group.rotation.set(0, angle, 0);
      slot.group.visible = true;
      slot.hitbox.scale.setScalar(slot.hitRadius);
      slot.hitbox.visible = hitboxesVisible;
      return slot;
    }

    if (type === 'boulder') {
      const slot = boulderPool.find((item) => !item.active);
      if (!slot) return null;

      const target = params.targetPos || { x: playerPos.x, y: playerPos.y, z: playerPos.z };
      const start = params.startPos || {
        x: target.x + 10,
        y: (ctx.world ? ctx.world.getHeight(target.x + 10, target.z) : 0) + 2.2,
        z: target.z,
      };

      slot.active = true;
      slot.age = 0;
      slot.damage = params.damage ?? 16;
      slot.flightDuration = params.flightDuration ?? 1.2;
      slot.arcHeight = params.arcHeight ?? 5.5;
      slot.hitRadius = params.hitRadius ?? 1.8;

      slot.startPos.set(start.x, start.y, start.z);
      slot.targetPos.set(target.x, target.y, target.z);
      slot.currentPos.copy(slot.startPos);

      slot.group.position.copy(slot.startPos);
      slot.group.visible = true;

      const groundY = ctx.world ? ctx.world.getHeight(target.x, target.z) : target.y;
      slot.landingGroup.position.set(target.x, groundY + 0.04, target.z);
      slot.landingFill.scale.set(0.001, 1, 0.001);
      slot.landingGroup.visible = true;

      slot.hitbox.scale.setScalar(slot.hitRadius);
      slot.hitbox.visible = hitboxesVisible;
      return slot;
    }

    if (type === 'frostRoar') {
      const slot = frostRoarPool.find((item) => !item.active);
      if (!slot) return null;

      const target = params.targetPos || { x: playerPos.x, y: playerPos.y, z: playerPos.z };
      const groundY = ctx.world ? ctx.world.getHeight(target.x, target.z) : target.y;

      slot.active = true;
      slot.age = 0;
      slot.erupted = false;
      slot.damage = params.damage ?? 12;
      slot.aoeRadius = params.aoeRadius ?? 2.2;
      slot.eruptDelay = params.eruptDelay ?? 1.2;
      slot.eruptDuration = params.eruptDuration ?? 0.35;
      slot.slow = params.slow ?? 2.0;

      slot.centerPos.set(target.x, groundY, target.z);
      slot.group.position.set(target.x, groundY + 0.04, target.z);
      slot.fill.scale.set(0.001, 1, 0.001);
      slot.spikesGroup.visible = false;
      slot.spikesGroup.scale.set(1, 0.001, 1);
      slot.group.visible = true;

      slot.hitbox.scale.setScalar(slot.aoeRadius);
      slot.hitbox.visible = hitboxesVisible;
      return slot;
    }

    return null;
  }

  // ---------------------------------------------------------------- 6. Mantra Dispel Listener
  bus.on('mantra:cast', ({ origin, radius }) => {
    if (!ctx.world?.isCombatZone() || !origin) return;
    const mantraRad = radius || (config.MANTRA?.radius ?? 6.0);

    // Dispel active magic projectiles / rune circles
    for (let i = 0; i < POOL_CAP; i++) {
      // 1. Ghostfire (magic: true)
      const gf = ghostfirePool[i];
      if (gf.active) {
        const dx = gf.pos.x - origin.x;
        const dz = gf.pos.z - origin.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= mantraRad + gf.hitRadius) {
          gf.active = false;
          gf.group.visible = false;
          gf.hitbox.visible = false;
          burstDispelParticles(gf.pos.x, gf.pos.y, gf.pos.z);
          bus.emit('sfx', { name: 'dispel' });
        }
      }

      // 2. Frost Roar Ground Circle (magic: true, only before eruption completes)
      const fr = frostRoarPool[i];
      if (fr.active && !fr.erupted) {
        const dx = fr.centerPos.x - origin.x;
        const dz = fr.centerPos.z - origin.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= mantraRad + fr.aoeRadius) {
          fr.active = false;
          fr.group.visible = false;
          fr.hitbox.visible = false;
          burstDispelParticles(fr.centerPos.x, fr.centerPos.y + 0.5, fr.centerPos.z);
          bus.emit('sfx', { name: 'dispel' });
        }
      }
    }
  });

  // ---------------------------------------------------------------- 7. Per-Frame Update
  function update(dt) {
    const isCombat = Boolean(ctx.world?.isCombatZone());
    projGroup.visible = true;

    const currentZone = state.zone || 'stupa';
    const mapDef = ctx.world?.getMap(currentZone);
    const mapOrigin = mapDef?.origin || (currentZone === 'stupa' ? { x: 0, z: 0 } : wildOrigin);
    const mapWalkRadius = (mapDef?.walkRadius ?? walkRadius) || 70;
    const playerPos = state.player?.position;
    const playerRadius = config.PLAYER?.radius ?? 0.35;

    // --- Update Hum Bolts (Friendly Skill Projectiles)
    const enemiesList = ctx.enemies?.getActiveEnemies ? ctx.enemies.getActiveEnemies() : [];
    for (let i = 0; i < HUM_POOL_CAP; i++) {
      const hb = humBoltPool[i];
      if (!hb.active) continue;

      const stepDist = hb.speed * dt;
      hb.age += dt;
      hb.distanceTraveled += stepDist;

      hb.pos.x += hb.dir.x * stepDist;
      hb.pos.z += hb.dir.z * stepDist;
      const gY = ctx.world ? ctx.world.getHeight(hb.pos.x, hb.pos.z) : 0;
      hb.pos.y = gY + 1.1;

      hb.halo.rotation.z += dt * 9.0;

      // Check obstacle colliders
      let hitObstacle = false;
      if (Array.isArray(ctx.colliders)) {
        for (let j = 0; j < ctx.colliders.length; j++) {
          const c = ctx.colliders[j];
          if (!c || (c.zone || 'stupa') !== currentZone) continue;
          if (c.type === 'circle') {
            const cdx = hb.pos.x - c.x;
            const cdz = hb.pos.z - c.z;
            const minDist = (c.r || 0) + 0.15;
            if (cdx * cdx + cdz * cdz <= minDist * minDist) {
              hitObstacle = true;
              break;
            }
          }
        }
      }
      if (hitObstacle) {
        burstDispelParticles(hb.pos.x, hb.pos.y, hb.pos.z);
        hb.active = false;
        hb.group.visible = false;
        hb.hitbox.visible = false;
        continue;
      }

      // Check enemy collisions
      if (isCombat && enemiesList.length > 0) {
        for (let eIdx = 0; eIdx < enemiesList.length; eIdx++) {
          const e = enemiesList[eIdx];
          if (!e || e.state === 'liberated' || e.hp <= 0) continue;
          if (hb.hitIds.has(e.id)) continue;

          const edx = e.pos.x - hb.pos.x;
          const edz = e.pos.z - hb.pos.z;
          const eDist = Math.hypot(edx, edz);
          if (eDist <= hb.hitRadius + (e.radius || 0.55)) {
            hb.hitIds.add(e.id);

            const atk = state.player?.atk || 10;
            const skillBonus = 1 + (state.player?.skillDamage || 0) / 100;
            const mult = hb.damageMult * skillBonus;
            const rolled = ctx.vitals?.rollDamage
              ? ctx.vitals.rollDamage(atk, { mult })
              : { amount: Math.max(1, Math.round(atk * mult)), crit: false };

            ctx.enemies?.damage?.(e.id, rolled.amount, 'magic', {
              crit: rolled.crit,
              source: 'humBolt',
              knockback: 0.4,
              from: { x: hb.pos.x - hb.dir.x, z: hb.pos.z - hb.dir.z },
            });

            if (hb.mpRestore > 0) {
              bus.emit('vitals:restore', {
                mp: hb.mpRestore,
                source: 'humBolt',
              });
            }

            burstDispelParticles(hb.pos.x, hb.pos.y, hb.pos.z);

            if (hb.hitIds.size >= hb.maxHits) {
              hb.active = false;
              hb.group.visible = false;
              hb.hitbox.visible = false;
              break;
            }
          }
        }
      }

      if (!hb.active) continue;

      if (hb.distanceTraveled >= hb.maxRange || hb.age >= hb.lifetime) {
        hb.active = false;
        hb.group.visible = false;
        hb.hitbox.visible = false;
        continue;
      }

      hb.group.position.copy(hb.pos);
      if (hitboxesVisible) hb.hitbox.visible = true;
    }

    if (!isCombat) {
      if (enemyCount() > 0) clearEnemyProjectiles();
    } else {

    // --- Update Ghostfires
    for (let i = 0; i < POOL_CAP; i++) {
      const gf = ghostfirePool[i];
      if (!gf.active) continue;

      gf.age += dt;
      if (gf.age >= gf.lifetime) {
        gf.active = false;
        gf.group.visible = false;
        gf.hitbox.visible = false;
        continue;
      }

      // Homing turn towards player on XZ
      if (playerPos) {
        const tAngle = Math.atan2(-(playerPos.x - gf.pos.x), -(playerPos.z - gf.pos.z));
        gf.heading = lerpAngle(gf.heading, tAngle, gf.turnRate * dt);
      }

      const vx = -Math.sin(gf.heading) * gf.speed;
      const vz = -Math.cos(gf.heading) * gf.speed;
      gf.pos.x += vx * dt;
      gf.pos.z += vz * dt;

      // Smooth ground height tracking
      const gY = ctx.world ? ctx.world.getHeight(gf.pos.x, gf.pos.z) : 0;
      const targetY = gY + 0.95;
      gf.pos.y += (targetY - gf.pos.y) * Math.min(1, 8 * dt);

      // Check boundary from map origin
      if (Math.hypot(gf.pos.x - mapOrigin.x, gf.pos.z - mapOrigin.z) > mapWalkRadius) {
        gf.active = false;
        gf.group.visible = false;
        gf.hitbox.visible = false;
        continue;
      }

      // Check rock colliders
      let hitObstacle = false;
      if (Array.isArray(ctx.colliders)) {
        for (let j = 0; j < ctx.colliders.length; j++) {
          const c = ctx.colliders[j];
          if (!c || (c.zone || 'stupa') !== currentZone) continue;
          if (c.type === 'circle') {
            const cdx = gf.pos.x - c.x;
            const cdz = gf.pos.z - c.z;
            const minDist = (c.r || 0) + 0.15;
            if (cdx * cdx + cdz * cdz <= minDist * minDist) {
              hitObstacle = true;
              break;
            }
          }
        }
      }
      if (hitObstacle) {
        gf.active = false;
        gf.group.visible = false;
        gf.hitbox.visible = false;
        continue;
      }

      // Check collision with player
      if (playerPos) {
        const pdx = playerPos.x - gf.pos.x;
        const pdz = playerPos.z - gf.pos.z;
        const pDist = Math.hypot(pdx, pdz);
        if (pDist <= gf.hitRadius + playerRadius && Math.abs(playerPos.y - gf.pos.y) < 1.8) {
          bus.emit('vitals:damage', {
            amount: gf.damage,
            type: 'magic',
            sourcePos: { ...gf.pos },
          });
          gf.active = false;
          gf.group.visible = false;
          gf.hitbox.visible = false;
          continue;
        }
      }

      gf.group.position.copy(gf.pos);
      gf.group.rotation.y = gf.heading;
      if (hitboxesVisible) gf.hitbox.visible = true;
    }

    // --- Update Red Arrows
    for (let i = 0; i < POOL_CAP; i++) {
      const ra = redArrowPool[i];
      if (!ra.active) continue;

      ra.age += dt;
      if (ra.age >= ra.lifetime) {
        ra.active = false;
        ra.group.visible = false;
        ra.hitbox.visible = false;
        continue;
      }

      ra.pos.x += ra.dir.x * ra.speed * dt;
      ra.pos.z += ra.dir.z * ra.speed * dt;

      // Follow terrain contour at chest height so uphill slopes don't swallow horizontal arrows
      const groundY = ctx.world ? ctx.world.getHeight(ra.pos.x, ra.pos.z) : 0;
      ra.pos.y = groundY + 1.15;

      // Check boundary from map origin
      if (Math.hypot(ra.pos.x - mapOrigin.x, ra.pos.z - mapOrigin.z) > mapWalkRadius) {
        ra.active = false;
        ra.group.visible = false;
        ra.hitbox.visible = false;
        continue;
      }

      // Check rock colliders
      let hitObstacle = false;
      if (Array.isArray(ctx.colliders)) {
        for (let j = 0; j < ctx.colliders.length; j++) {
          const c = ctx.colliders[j];
          if (!c || (c.zone || 'stupa') !== currentZone) continue;
          if (c.type === 'circle') {
            const cdx = ra.pos.x - c.x;
            const cdz = ra.pos.z - c.z;
            const minDist = (c.r || 0) + 0.15;
            if (cdx * cdx + cdz * cdz <= minDist * minDist) {
              hitObstacle = true;
              break;
            }
          }
        }
      }
      if (hitObstacle) {
        ra.active = false;
        ra.group.visible = false;
        ra.hitbox.visible = false;
        continue;
      }

      // Check player hit
      if (playerPos) {
        const pdx = playerPos.x - ra.pos.x;
        const pdz = playerPos.z - ra.pos.z;
        const pDist = Math.hypot(pdx, pdz);
        if (pDist <= ra.hitRadius + playerRadius && Math.abs(playerPos.y - ra.pos.y) < 1.8) {
          bus.emit('vitals:damage', {
            amount: ra.damage,
            type: 'physical',
            sourcePos: { ...ra.pos },
          });
          ra.active = false;
          ra.group.visible = false;
          ra.hitbox.visible = false;
          continue;
        }
      }

      ra.group.position.copy(ra.pos);
      if (hitboxesVisible) ra.hitbox.visible = true;
    }

    // --- Update Boulders
    for (let i = 0; i < POOL_CAP; i++) {
      const b = boulderPool[i];
      if (!b.active) continue;

      b.age += dt;
      const u = Math.min(1, b.age / b.flightDuration);

      // Parabolic flight
      b.currentPos.x = b.startPos.x + (b.targetPos.x - b.startPos.x) * u;
      b.currentPos.z = b.startPos.z + (b.targetPos.z - b.startPos.z) * u;
      const baseY = b.startPos.y + (b.targetPos.y - b.startPos.y) * u;
      b.currentPos.y = baseY + 4 * b.arcHeight * u * (1 - u);

      b.rock.rotation.x += dt * 5.0;
      b.rock.rotation.y += dt * 3.5;
      b.group.position.copy(b.currentPos);

      // Landing circle fill
      b.landingFill.scale.set(u, 1, u);

      if (u >= 1) {
        // Impact ground!
        bus.emit('sfx', { name: 'boulder' });

        if (playerPos) {
          const pdx = playerPos.x - b.targetPos.x;
          const pdz = playerPos.z - b.targetPos.z;
          const pDist = Math.hypot(pdx, pdz);
          if (pDist <= b.hitRadius) {
            bus.emit('vitals:damage', {
              amount: b.damage,
              type: 'physical',
              sourcePos: { ...b.targetPos },
            });
          }
        }

        b.active = false;
        b.group.visible = false;
        b.landingGroup.visible = false;
        b.hitbox.visible = false;
        continue;
      }

      if (hitboxesVisible) b.hitbox.visible = true;
    }

    // --- Update Frost Roars
    for (let i = 0; i < POOL_CAP; i++) {
      const fr = frostRoarPool[i];
      if (!fr.active) continue;

      fr.age += dt;

      if (fr.age < fr.eruptDelay) {
        // Filling rune circle phase
        const u = Math.min(1, fr.age / fr.eruptDelay);
        fr.fill.scale.set(u, 1, u);
      } else if (!fr.erupted) {
        // Moment of eruption!
        fr.erupted = true;
        fr.spikesGroup.visible = true;

        if (playerPos) {
          const pdx = playerPos.x - fr.centerPos.x;
          const pdz = playerPos.z - fr.centerPos.z;
          const pDist = Math.hypot(pdx, pdz);
          if (pDist <= fr.aoeRadius) {
            bus.emit('vitals:damage', {
              amount: fr.damage,
              type: 'magic',
              slow: fr.slow,
              sourcePos: { ...fr.centerPos },
            });
          }
        }
      }

      if (fr.erupted) {
        const eruptProg = (fr.age - fr.eruptDelay) / fr.eruptDuration;
        if (eruptProg >= 1) {
          // Finished visual
          fr.active = false;
          fr.group.visible = false;
          fr.spikesGroup.visible = false;
          fr.hitbox.visible = false;
          continue;
        }
        // Spike scale animation
        const sY = eruptProg < 0.3 ? (eruptProg / 0.3) : Math.max(0, 1 - (eruptProg - 0.3) / 0.7);
        fr.spikesGroup.scale.set(1, Math.max(0.001, sY), 1);
      }

      if (hitboxesVisible) fr.hitbox.visible = true;
    }
    }

    // --- Update Dispel Particles
    const posAttr = dispelGeo.attributes.position;
    let anyParticleActive = false;
    for (let k = 0; k < DISPEL_PARTICLE_COUNT; k++) {
      const p = dispelData[k];
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
          p.vy -= 4.0 * dt; // subtle gravity
          posAttr.setXYZ(k, p.x, p.y, p.z);
        }
      }
    }
    if (anyParticleActive) {
      posAttr.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- 8. Export API & Debug Registration
  const api = {
    group: projGroup,
    update,
    spawn,
    fireHumBolt: (params) => spawn('humBolt', params),
    clear,
    count,
    showHitboxes,
  };

  ctx.projectiles = api;
  ctx.debug?.register('projectiles', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.projectiles = api;
  }

  return api;
}
