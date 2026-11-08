/**
 * Active Skills & Ultimate Runtime (#27):
 *  - phurba (普巴橛): 3-sided Vajra Phurba piercing 12m x 1m line, root 2s, Enh A 3-dagger fan, Enh B ground plant + 1s AoE explosion & stun
 *  - vajraBell (金剛鈴): 90° cone (7m) or Enh A 360° circle (5m), stun + knockback 3m + dispel magic projectiles, Enh B +25% vuln for 4s
 *  - lotusShield / lotusWard (蓮花結界): 30%..50% maxHp shield for 6s, orbiting glowing lotus petals, 4m burst (ATK * 0.8) on break/expire, Enh A projectile reflect, Enh B heal 20% of absorbed
 *  - protector (護法召喚): summons active Dharma Protector for 12..20s, Enh A 2 avatar clones (60% scale/dmg), Enh B -15% player damage taken
 *  - vajraGuru / guruMantra (蓮師心咒): 2.5s invulnerable channel, 12 Tibetan syllables ring expanding to 16m (Enh A 22m), ATK * 5.0..7.0, executes normal enemies <25% HP, Enh B 10s 0-MP buff
 *
 * Strictly 0 PointLights (uses additive MeshBasicMaterial / emissive / rings / canvas sprites).
 */
import * as THREE from 'three';

const GURU_SYLLABLES = ['ཨོཾ', 'ཨཱཿ', 'ཧཱུྃ', 'བ', 'ཛྲ', 'གུ', 'རུ', 'པ', 'དྨ', 'སི', 'དྡྷི', 'ཧཱུྃ'];

export function createActiveSkills(ctx) {
  const { scene, state, bus } = ctx;

  const group = new THREE.Group();
  group.name = 'ActiveSkillsVFX';
  scene.add(group);

  const flyingDaggers = [];
  const plantedDaggers = [];
  const expandingRings = [];
  const guruChannels = [];

  // Orbiting lotus shield petals
  let lotusPetalGroup = null;
  let lotusShieldActive = false;

  function ensureLotusPetals() {
    if (lotusPetalGroup) return lotusPetalGroup;
    lotusPetalGroup = new THREE.Group();
    lotusPetalGroup.name = 'LotusShieldPetals';
    lotusPetalGroup.visible = false;

    const petalGeo = new THREE.ConeGeometry(0.18, 0.48, 5);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xf9a8d4,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const count = 8;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(petalGeo, petalMat);
      const a = (i / count) * Math.PI * 2;
      m.position.set(Math.cos(a) * 1.15, 0.85, Math.sin(a) * 1.15);
      m.rotation.x = 0.35;
      m.rotation.z = -a;
      lotusPetalGroup.add(m);
    }

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.22, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.rotation.x = -Math.PI * 0.5;
    halo.position.y = 0.1;
    lotusPetalGroup.add(halo);

    group.add(lotusPetalGroup);
    return lotusPetalGroup;
  }

  function makeSyllableSprite(char) {
    if (typeof document === 'undefined') {
      return new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.6),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
      );
    }
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    if (c) {
      c.clearRect(0, 0, 128, 128);
      c.font = 'bold 64px serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = '#f59e0b';
      c.shadowBlur = 16;
      c.fillStyle = '#fffbeb';
      c.fillText(char, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.1, 1.1, 1.1);
    return sprite;
  }

  function spawnExpandingRing(origin, maxRadius, color = 0xfbbf24, duration = 0.55) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 1.0, 36),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(origin.x, (origin.y || 0) + 0.14, origin.z);
    group.add(mesh);
    expandingRings.push({
      mesh,
      maxRadius,
      elapsed: 0,
      duration,
    });
  }

  function buildPhurbaMesh() {
    const dagger = new THREE.Group();
    // 3-sided pyramid blade
    const bladeGeo = new THREE.ConeGeometry(0.16, 0.95, 3);
    bladeGeo.rotateX(Math.PI * 0.5);
    const bladeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    dagger.add(blade);

    // Golden vajra hilt
    const hiltGeo = new THREE.OctahedronGeometry(0.14, 0);
    const hiltMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.z = 0.45;
    dagger.add(hilt);
    return dagger;
  }

  function computeSkillDamage(mult) {
    const baseAtk = Math.max(1, Number(state.player?.atk) || 10);
    const skillBonus = 1 + (Number(state.player?.skillDamage) || 0) / 100;
    const totalMult = mult * skillBonus;
    if (ctx.vitals?.rollDamage) {
      return ctx.vitals.rollDamage(baseAtk, { mult: totalMult });
    }
    return { amount: Math.max(1, Math.round(baseAtk * totalMult)), crit: false };
  }

  function cloneEnemyPos(enemyOrPos, fallbackY = 0) {
    const p = enemyOrPos?.pos || enemyOrPos?.position || enemyOrPos;
    if (p && typeof p.clone === 'function') return p.clone();
    return new THREE.Vector3(
      Number(p?.x) || 0,
      Number(p?.y ?? fallbackY) || 0,
      Number(p?.z) || 0
    );
  }

  function hasPhurbaSplitPower() {
    if (ctx.powers?.has?.('phurbaSplit')) return true;
    if (ctx.inventory?.hasSpecialEffect?.('phurbaSplit')) return true;
    if (ctx.inventory?.getEquippedPowers?.()?.has?.('phurbaSplit')) return true;
    const eq =
      ctx.inventory?.getEquipment?.() ||
      ctx.inventory?.getEquipped?.() ||
      state.equipment ||
      null;
    if (eq && typeof eq === 'object') {
      for (const item of Object.values(eq)) {
        if (
          item &&
          (item.id === 'phurbaSplit' ||
            item.legendaryId === 'phurbaSplit' ||
            item.powerId === 'phurbaSplit' ||
            item.specialEffect === 'phurbaSplit')
        ) {
          return true;
        }
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- 1. Phurba (普巴橛)
  function castPhurba(payload = {}) {
    const {
      rank = 1,
      enh = null,
      origin = cloneEnemyPos(state.player?.position),
      dir = state.player.heading || 0,
      damageMult = 1.4,
    } = payload;

    const hasSplitPower = hasPhurbaSplitPower();
    const rootDur = 2.0 + (hasSplitPower ? 1.0 : 0);

    // Determine dagger angles:
    // Enh A ('三橛') fires 3 daggers in a ±18° fan (each 70% damage).
    // Terma power 'phurbaSplit' also splits into 3 daggers if not already Enh A, or adds 2 split daggers!
    const deg18 = (18 * Math.PI) / 180;
    let angles = [dir];
    let perDaggerFactor = 1.0;

    if (enh === 'a') {
      angles = [dir - deg18, dir, dir + deg18];
      perDaggerFactor = 0.7;
    } else if (hasSplitPower) {
      angles = [dir - deg18 * 0.85, dir, dir + deg18 * 0.85];
      perDaggerFactor = 1.0;
    }

    const hitEnemyIds = new Set();
    let firstHitEnemy = null;
    let centerEndY = origin.y || 0;

    for (let i = 0; i < angles.length; i++) {
      const a = angles[i];
      const lineLen = 12.0;
      const halfWidth = 0.65;

      // Spawn visual flying 3-sided Phurba dagger
      const mesh = buildPhurbaMesh();
      mesh.position.set(origin.x, (origin.y || 0) + 1.0, origin.z);
      mesh.rotation.y = a;
      group.add(mesh);

      const endX = origin.x - Math.sin(a) * lineLen;
      const endZ = origin.z - Math.cos(a) * lineLen;
      const endY = ctx.world ? ctx.world.getHeight(endX, endZ) : origin.y || 0;
      if (i === Math.floor(angles.length / 2)) {
        centerEndY = endY;
      }

      flyingDaggers.push({
        mesh,
        start: mesh.position.clone(),
        end: new THREE.Vector3(endX, endY + 0.9, endZ),
        elapsed: 0,
        duration: 0.28,
      });

      // Query enemies along the 12m x 1m line
      const hits = ctx.enemies?.queryLine?.(origin, a, lineLen, halfWidth) || [];
      for (const e of hits) {
        if (!firstHitEnemy) firstHitEnemy = e;
        // Allow each enemy to be hit once per cast (or multiple times if fan overlaps)
        if (hitEnemyIds.has(e.id) && enh !== 'a') continue;
        hitEnemyIds.add(e.id);

        const rolled = computeSkillDamage(damageMult * perDaggerFactor);
        ctx.enemies?.damageEnemy?.(e, rolled.amount, {
          type: 'physical',
          crit: rolled.crit,
          origin,
          source: 'phurba',
        });

        if (enh === 'b') {
          ctx.enemies?.applyStatus?.(e, { type: 'stun', duration: 1.2 });
        } else {
          ctx.enemies?.applyStatus?.(e, { type: 'root', duration: rootDur });
        }
      }
    }

    // Enh B ('釘地'): dagger plants in ground and explodes after 1.0s for 4m AoE (ATK * 0.6)
    if (enh === 'b') {
      const plantPos = firstHitEnemy
        ? cloneEnemyPos(firstHitEnemy, centerEndY)
        : new THREE.Vector3(
            origin.x - Math.sin(dir) * 6.0,
            centerEndY,
            origin.z - Math.cos(dir) * 6.0
          );
      const plantedMesh = buildPhurbaMesh();
      plantedMesh.position.set(plantPos.x, (plantPos.y || 0) + 0.45, plantPos.z);
      plantedMesh.rotation.x = -Math.PI * 0.5;
      group.add(plantedMesh);

      plantedDaggers.push({
        mesh: plantedMesh,
        pos: plantPos,
        timer: 1.0,
        radius: 4.0,
        damageMult: 0.6,
      });
    }

    // If phurbaSplit Terma power is active and we hit an enemy, also fire 2 secondary split bolts at nearby enemies
    if (hasSplitPower && firstHitEnemy) {
      const firstHitPos = cloneEnemyPos(firstHitEnemy, centerEndY);
      const nearby = ctx.enemies?.queryCircle?.(firstHitPos, 6.0) || [];
      let splitCount = 0;
      for (const other of nearby) {
        if (other.id === firstHitEnemy.id) continue;
        const otherPos = cloneEnemyPos(other, firstHitPos.y);
        const boltMesh = buildPhurbaMesh();
        boltMesh.position.set(firstHitPos.x, (firstHitPos.y || 0) + 0.9, firstHitPos.z);
        boltMesh.rotation.y = Math.atan2(
          -(otherPos.x - firstHitPos.x),
          -(otherPos.z - firstHitPos.z)
        );
        group.add(boltMesh);
        flyingDaggers.push({
          mesh: boltMesh,
          start: boltMesh.position.clone(),
          end: new THREE.Vector3(otherPos.x, (otherPos.y || 0) + 0.9, otherPos.z),
          elapsed: 0,
          duration: 0.22,
        });

        const rolled = computeSkillDamage(damageMult * 0.65);
        ctx.enemies?.damageEnemy?.(other, rolled.amount, {
          type: 'physical',
          crit: rolled.crit,
          origin: firstHitPos,
          source: 'phurbaSplit',
        });
        ctx.enemies?.applyStatus?.(other, { type: 'root', duration: rootDur });
        splitCount += 1;
        if (splitCount >= 2) break;
      }
    }

    bus?.emit('sfx', { name: 'phurba' });
    bus?.emit('phurba:cast', {
      rank,
      enh,
      hitCount: hitEnemyIds.size,
      hasSplitPower,
    });
  }

  // ---------------------------------------------------------------- 2. Vajra Bell (金剛鈴)
  function castVajraBell(payload = {}) {
    const {
      rank = 1,
      enh = null,
      origin = cloneEnemyPos(state.player?.position),
      dir = state.player.heading || 0,
      damageMult = 1.0,
      stunDuration = 1.0,
    } = payload;

    // Enh A ('周遍'): full 360° circle (5m radius) around player
    // Default: forward 90° cone (halfAngle = 45° = PI/4), 7m radius
    const isCircle = enh === 'a';
    const radius = isCircle ? 5.0 : 7.0;
    const halfAngle = isCircle ? Math.PI : Math.PI * 0.25;

    spawnExpandingRing(origin, radius, 0xfde68a, 0.48);

    // Dispel enemy magic projectiles inside the cone/circle
    const dispelledCount =
      ctx.projectiles?.dispelInArea?.(origin, radius, {
        dir,
        halfAngle: isCircle ? Math.PI : halfAngle,
      }) || 0;

    // Query enemies inside cone or circle
    const targets = isCircle
      ? ctx.enemies?.queryCircle?.(origin, radius) || []
      : ctx.enemies?.queryCone?.(origin, dir, radius, halfAngle) || [];

    for (const e of targets) {
      const rolled = computeSkillDamage(damageMult);
      ctx.enemies?.damageEnemy?.(e, rolled.amount, {
        type: 'magic',
        crit: rolled.crit,
        knockback: 3.0,
        origin,
        source: 'vajraBell',
      });
      ctx.enemies?.applyStatus?.(e, { type: 'stun', duration: stunDuration });

      // Enh B ('覺醒'): stunned enemies take +25% damage (vuln: 0.25) for 4.0s
      if (enh === 'b') {
        ctx.enemies?.applyStatus?.(e, { type: 'vuln', duration: 4.0, mult: 0.25 });
      }
    }

    bus?.emit('sfx', { name: 'vajraBell' });
    bus?.emit('vajraBell:resolved', {
      rank,
      enh,
      hitCount: targets.length,
      dispelledCount,
      totalAffected: targets.length + dispelledCount,
    });
  }

  // ---------------------------------------------------------------- 3. Lotus Shield (蓮花結界)
  function triggerLotusBurst(reason = 'expired', absorbed = 0, enh = null) {
    if (!lotusShieldActive) return;
    lotusShieldActive = false;
    if (lotusPetalGroup) lotusPetalGroup.visible = false;

    const origin = cloneEnemyPos(state.player?.position);
    const radius = 4.0;
    spawnExpandingRing(origin, radius, 0xf472b6, 0.55);

    const targets = ctx.enemies?.queryCircle?.(origin, radius) || [];
    for (const e of targets) {
      const rolled = computeSkillDamage(0.8);
      ctx.enemies?.damageEnemy?.(e, rolled.amount, {
        type: 'magic',
        crit: rolled.crit,
        origin,
        source: 'lotusShield',
      });
    }

    // Enh B ('甘露'): heal player for 20% of damage absorbed when shield ends/breaks
    if (enh === 'b' && absorbed > 0) {
      const healAmount = Math.max(1, Math.round(absorbed * 0.2));
      bus?.emit('vitals:restore', { hp: healAmount, source: 'lotusShield' });
    }

    // Terma Power support: if yakFrost also triggers on shield break or mantra
    bus?.emit('lotusShield:burst', {
      reason,
      absorbed,
      enh,
      hitCount: targets.length,
      origin,
    });
  }

  function castLotusShield(payload = {}) {
    const {
      rank = 1,
      enh = null,
      shieldPct = 0.3,
      duration = 6.0,
    } = payload;

    const maxHp = Math.max(1, Number(state.player?.maxHp) || 100);
    const shieldAmount = Math.max(1, Math.round(maxHp * shieldPct));

    lotusShieldActive = true;
    const petals = ensureLotusPetals();
    petals.visible = true;
    petals.position.copy(state.player.position);

    if (ctx.vitals?.addShield) {
      ctx.vitals.addShield(shieldAmount, duration, { enh, source: 'lotusShield' });
    } else {
      state.player.shield = shieldAmount;
      state.player.shieldMax = shieldAmount;
      state.player.shieldRemaining = duration;
      state.player.shieldAbsorbed = 0;
      state.player.shieldEnh = enh;
    }

    spawnExpandingRing(state.player.position, 2.2, 0xf9a8d4, 0.45);
    bus?.emit('sfx', { name: 'lotus' });
  }

  bus?.on('shield:ended', ({ reason, absorbed, enh, source } = {}) => {
    if (source === 'lotusShield' || lotusShieldActive) {
      triggerLotusBurst(reason, absorbed, enh);
    }
  });

  // ---------------------------------------------------------------- 4. Dharma Protector Summon (護法召喚)
  function castProtector(payload = {}) {
    const {
      enh = null,
      damageMult = 1.0,
      duration = 12.0,
      protectorId,
    } = payload;

    const activeId =
      protectorId ||
      ctx.protectors?.getActive?.() ||
      state.skills?.activeProtector ||
      'tenma';

    // Terma Power: tenmaOath also boosts summon duration if active
    const durMult = ctx.powers?.has?.('tenmaOath') ? 1.5 : 1.0;

    ctx.protectors?.summon?.(activeId, {
      duration: duration * durMult,
      damageMult,
      enh,
    });
  }

  // ---------------------------------------------------------------- 5. Vajra Guru Mantra (蓮師心咒)
  function applyGuruWave(origin, radius, damageMult) {
    const targets = ctx.enemies?.queryCircle?.(origin, radius) || [];
    let liberatedCount = 0;
    for (const e of targets) {
      const rolled = computeSkillDamage(damageMult);
      ctx.enemies?.damageEnemy?.(e, rolled.amount, {
        type: 'magic',
        crit: rolled.crit,
        origin,
        source: 'vajraGuru',
      });

      // Normal enemies in range with HP < 25% are instantly liberated
      if (e.hp > 0 && (e.rank === 'normal' || !e.rank) && e.hp / Math.max(1, e.maxHp) < 0.25) {
        ctx.enemies?.damageEnemy?.(e, e.hp + 9999, {
          type: 'magic',
          execute: true,
          origin,
          source: 'vajraGuru:execute',
        });
        liberatedCount += 1;
      }
    }
    return { hitCount: targets.length, liberatedCount };
  }

  function castVajraGuru(payload = {}) {
    const {
      rank = 1,
      enh = null,
      origin = cloneEnemyPos(state.player?.position),
      damageMult = 5.0,
      radius = 16.0,
      channelDuration = 2.5,
    } = payload;

    const effectiveRadius = enh === 'a' ? 22.0 : radius;

    // Player is invulnerable during the 2.5s channel
    state.player.invulnUntil = Math.max(
      state.player.invulnUntil || 0,
      (state.elapsed || 0) + channelDuration
    );
    if (ctx.vitals?.addBuff) {
      ctx.vitals.addBuff('vajraGuruChannel', { invuln: true }, channelDuration);
    }

    // Enh B ('加持'): for 10.0s after casting, all skills cost 0 MP
    if (enh === 'b') {
      if (ctx.vitals?.addBuff) {
        ctx.vitals.addBuff('guruBlessing', { freeMp: true }, 10.0);
      } else {
        state.player.shrineFreeMp = true;
      }
    }

    // Build 12 Tibetan syllables ring expanding outward to effectiveRadius
    const ringGroup = new THREE.Group();
    ringGroup.position.set(origin.x, (origin.y || 0) + 0.9, origin.z);

    const sprites = [];
    for (let i = 0; i < GURU_SYLLABLES.length; i++) {
      const sp = makeSyllableSprite(GURU_SYLLABLES[i]);
      const ang = (i / GURU_SYLLABLES.length) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * 1.5, 0, Math.sin(ang) * 1.5);
      ringGroup.add(sp);
      sprites.push({ sprite: sp, baseAngle: ang });
    }

    const innerHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    innerHalo.rotation.x = -Math.PI * 0.5;
    innerHalo.position.y = -0.75;
    ringGroup.add(innerHalo);

    group.add(ringGroup);

    // Immediate initial wave so synchronous tests & instant hits register right away
    const initialResult = applyGuruWave(origin, effectiveRadius, damageMult);

    guruChannels.push({
      ringGroup,
      sprites,
      innerHalo,
      origin: cloneEnemyPos(origin),
      maxRadius: effectiveRadius,
      damageMult,
      elapsed: 0,
      duration: channelDuration,
      climaxTriggered: true,
    });

    spawnExpandingRing(origin, effectiveRadius, 0xfbbf24, 1.1);
    bus?.emit('sfx', { name: 'vajraGuru' });
    bus?.emit('vajraGuru:cast', {
      rank,
      enh,
      radius: effectiveRadius,
      hitCount: initialResult.hitCount,
      liberatedCount: initialResult.liberatedCount,
    });
  }

  // ---------------------------------------------------------------- Bus Listeners from skills.js
  bus?.on('skill:effect:phurba', castPhurba);
  bus?.on('skill:effect:vajraBell', castVajraBell);
  bus?.on('skill:effect:lotusShield', castLotusShield);
  bus?.on('skill:effect:protector', castProtector);
  bus?.on('skill:effect:vajraGuru', castVajraGuru);

  // ---------------------------------------------------------------- Per-Frame Update
  function update(dt) {
    // 1. Update flying Phurba daggers
    for (let i = flyingDaggers.length - 1; i >= 0; i--) {
      const d = flyingDaggers[i];
      d.elapsed += dt;
      const u = Math.min(1, d.elapsed / d.duration);
      d.mesh.position.lerpVectors(d.start, d.end, u);
      d.mesh.rotation.z += dt * 18;
      if (u >= 1) {
        group.remove(d.mesh);
        flyingDaggers.splice(i, 1);
      }
    }

    // 2. Update planted Phurba daggers (Enh B '釘地': 1.0s delay -> 4m AoE ATK * 0.6)
    for (let i = plantedDaggers.length - 1; i >= 0; i--) {
      const pd = plantedDaggers[i];
      pd.timer -= dt;
      pd.mesh.rotation.y += dt * 8;
      if (pd.timer <= 0) {
        spawnExpandingRing(pd.pos, pd.radius, 0x38bdf8, 0.45);
        const hits = ctx.enemies?.queryCircle?.(pd.pos, pd.radius) || [];
        for (const e of hits) {
          const rolled = computeSkillDamage(pd.damageMult);
          ctx.enemies?.damageEnemy?.(e, rolled.amount, {
            type: 'magic',
            crit: rolled.crit,
            origin: pd.pos,
            source: 'phurba:explode',
          });
        }
        group.remove(pd.mesh);
        plantedDaggers.splice(i, 1);
      }
    }

    // 3. Orbiting Lotus Shield petals
    if (lotusShieldActive && lotusPetalGroup) {
      if ((state.player?.shield || 0) <= 0) {
        triggerLotusBurst('broken', state.player?.shieldAbsorbed || 0, state.player?.shieldEnh);
      } else {
        lotusPetalGroup.position.copy(state.player.position);
        lotusPetalGroup.rotation.y += dt * 2.6;
      }
    }

    // 4. Expanding rings
    for (let i = expandingRings.length - 1; i >= 0; i--) {
      const r = expandingRings[i];
      r.elapsed += dt;
      const u = Math.min(1, r.elapsed / r.duration);
      const sc = 0.2 + (r.maxRadius - 0.2) * u;
      r.mesh.scale.setScalar(sc);
      r.mesh.material.opacity = 0.88 * (1 - u);
      if (u >= 1) {
        group.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        expandingRings.splice(i, 1);
      }
    }

    // 5. Vajra Guru 12-syllable golden ring channels
    for (let i = guruChannels.length - 1; i >= 0; i--) {
      const gc = guruChannels[i];
      gc.elapsed += dt;
      const u = Math.min(1, gc.elapsed / gc.duration);
      const curRad = 1.5 + (gc.maxRadius - 1.5) * Math.pow(u, 0.75);

      gc.ringGroup.position.x = state.player.position.x;
      gc.ringGroup.position.z = state.player.position.z;

      for (const s of gc.sprites) {
        const ang = s.baseAngle + gc.elapsed * 1.8;
        s.sprite.position.set(Math.cos(ang) * curRad, Math.sin(gc.elapsed * 4 + s.baseAngle) * 0.2, Math.sin(ang) * curRad);
        s.sprite.material.opacity = u < 0.8 ? 0.95 : 0.95 * (1 - (u - 0.8) / 0.2);
      }
      gc.innerHalo.scale.setScalar(curRad);
      gc.innerHalo.material.opacity = 0.75 * (1 - u * 0.8);

      // Keep player invulnerable while channeling
      state.player.invulnUntil = Math.max(state.player.invulnUntil || 0, (state.elapsed || 0) + 0.15);

      if (u >= 1) {
        group.remove(gc.ringGroup);
        guruChannels.splice(i, 1);
      }
    }
  }

  const api = {
    update,
    castPhurba,
    castVajraBell,
    castLotusShield,
    castProtector,
    castVajraGuru,
    triggerLotusBurst,
  };

  ctx.activeSkills = api;
  ctx.skillEffects = api;
  return api;
}
