/**
 * Dharma Protectors & Summoned Allies System (#27)
 *
 * Manages the 3 Dharma Protectors:
 *  1. tenma (丹瑪女神): Ranged — floats gracefully (pale cyan-white silhouette + celestial scarf),
 *     fires hailstone light orbs every 1.2s (ATK * 0.5 + brief chill).
 *  2. whiteYak (白犛牛): Tank — procedural white yak with golden horns, charges enemies
 *     (ATK * 0.8 + knockback) and taunts nearby enemies every 5.0s.
 *  3. pehar (白哈爾): AoE — procedural 3-headed/crowned Dharmapala silhouette, drops a golden
 *     Dharma wheel every 3.0s in a 4.0m AoE (ATK * 1.0).
 *
 * Strictly 0 PointLights (uses additive MeshBasicMaterial / emissive / rings).
 */
import * as THREE from 'three';
import { PROTECTORS, PROTECTORS_BY_ID } from '../data/protectors.js';
import { i18n } from '../i18n.js';

export function createAllies(ctx) {
  const { scene, state, bus } = ctx;

  const group = new THREE.Group();
  group.name = 'DharmaProtectors';
  scene.add(group);

  const unlockedSet = new Set();
  let activeProtectorId = 'tenma';
  const activeSummons = [];
  const projectiles = [];
  const vfxList = [];

  state.skills = state.skills || {};
  state.skills.activeProtector = activeProtectorId;

  function loadFromSave() {
    const saved = ctx.save?.get?.('protectors', null);
    if (saved && typeof saved === 'object') {
      if (Array.isArray(saved.unlocked)) {
        for (const id of saved.unlocked) {
          if (PROTECTORS_BY_ID[id]) unlockedSet.add(id);
        }
      }
      if (typeof saved.active === 'string' && PROTECTORS_BY_ID[saved.active]) {
        activeProtectorId = saved.active;
      }
    }
    // Check unlock flags on ctx.flags / state.flags
    for (const p of PROTECTORS) {
      if (ctx.flags?.get?.(p.unlockFlag) || state.flags?.[p.unlockFlag]) {
        unlockedSet.add(p.id);
      }
    }
    if (!unlockedSet.has(activeProtectorId) && unlockedSet.size > 0) {
      activeProtectorId = Array.from(unlockedSet)[0];
    }
    state.skills.activeProtector = activeProtectorId;
  }

  function persist() {
    state.skills = state.skills || {};
    state.skills.activeProtector = activeProtectorId;
    if (!ctx.save?.set) return;
    ctx.save.set('protectors', {
      unlocked: Array.from(unlockedSet),
      active: activeProtectorId,
    });
  }

  // ---------------------------------------------------------------- 3D Procedural Models (0 PointLights)
  function buildTenmaMesh(scale = 1.0) {
    const root = new THREE.Group();
    root.scale.setScalar(scale);

    // Robe silhouette (pale cyan-white cone)
    const robeMat = new THREE.MeshStandardMaterial({
      color: 0xdff9ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.35, 12), robeMat);
    robe.position.y = 0.75;
    root.add(robe);

    // Head + golden crown
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf0fdfa,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), headMat);
    head.position.y = 1.56;
    root.add(head);

    const crownMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 16), crownMat);
    crown.rotation.x = Math.PI * 0.5;
    crown.position.y = 1.72;
    root.add(crown);

    // Celestial floating scarf (torus arc)
    const scarfMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 24, Math.PI * 1.35), scarfMat);
    scarf.position.y = 1.25;
    scarf.rotation.x = 0.35;
    root.add(scarf);

    // Base halo ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.62, 24),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.06;
    root.add(ring);

    root.userData = { scarf, ring, materials: [robeMat, headMat, crownMat, scarfMat, ring.material] };
    return root;
  }

  function buildWhiteYakMesh(scale = 1.0) {
    const root = new THREE.Group();
    root.scale.setScalar(scale);

    const furMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.28,
      roughness: 0.6,
    });
    const hornMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
      metalness: 0.75,
      roughness: 0.25,
    });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 1.35), furMat);
    body.position.y = 0.68;
    root.add(body);

    // Shoulder hump
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), furMat);
    hump.position.set(0, 1.02, -0.25);
    root.add(hump);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.62), furMat);
    head.position.set(0, 0.86, -0.82);
    root.add(head);

    // Golden curved horns
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.56, 8), hornMat);
      horn.position.set(side * 0.38, 1.12, -0.82);
      horn.rotation.z = -side * 0.65;
      horn.rotation.x = -0.25;
      root.add(horn);
    }

    // 4 sturdy legs
    const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.52, 8);
    const legOffsets = [
      [-0.32, 0.26, -0.45],
      [0.32, 0.26, -0.45],
      [-0.32, 0.26, 0.45],
      [0.32, 0.26, 0.45],
    ];
    for (const [lx, ly, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, furMat);
      leg.position.set(lx, ly, lz);
      root.add(leg);
    }

    // Golden ground ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.85, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.05;
    root.add(ring);

    root.userData = { ring, materials: [furMat, hornMat, ring.material] };
    return root;
  }

  function buildPeharMesh(scale = 1.0) {
    const root = new THREE.Group();
    root.scale.setScalar(scale);

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.4,
    });
    const goldMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Armored torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 1.35, 10), armorMat);
    torso.position.y = 0.75;
    root.add(torso);

    // 3 crowned heads (center, left, right)
    const headAngles = [0, -0.55, 0.55];
    for (let i = 0; i < headAngles.length; i++) {
      const a = headAngles[i];
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), armorMat);
      h.position.set(Math.sin(a) * 0.24, 1.58, -Math.cos(a) * 0.08);
      root.add(h);

      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 6), goldMat);
      crown.position.set(h.position.x, 1.82, h.position.z);
      root.add(crown);
    }

    // Floating Dharma Wheel behind back
    const backWheel = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 8, 20), goldMat);
    backWheel.position.set(0, 1.32, 0.28);
    root.add(backWheel);

    // Base mandala ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.72, 24),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.05;
    root.add(ring);

    root.userData = { backWheel, ring, materials: [armorMat, goldMat, ring.material] };
    return root;
  }

  function buildProtectorMesh(id, scale = 1.0) {
    if (id === 'whiteYak') return buildWhiteYakMesh(scale);
    if (id === 'pehar') return buildPeharMesh(scale);
    return buildTenmaMesh(scale);
  }

  // ---------------------------------------------------------------- Helper: Find nearest enemy
  function findNearestEnemy(pos, maxRange = 14) {
    const enemies = ctx.enemies?.getActiveEnemies?.() || [];
    let best = null;
    let bestDistSq = maxRange * maxRange;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || e.hp <= 0 || e.state === 'liberated') continue;
      const dx = e.pos.x - pos.x;
      const dz = e.pos.z - pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = e;
      }
    }
    return best;
  }

  function spawnRingVfx(pos, radius, color = 0xfbbf24, duration = 0.55) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.2, radius, 28),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(pos.x, (pos.y || 0) + 0.12, pos.z);
    group.add(mesh);
    vfxList.push({ mesh, elapsed: 0, duration, maxScale: 1.0, startScale: 0.15 });
  }

  // ---------------------------------------------------------------- Summon Logic
  function clearSummons() {
    while (activeSummons.length > 0) {
      const s = activeSummons.pop();
      if (s.mesh) group.remove(s.mesh);
    }
    state.player.protectorDmgReduction = 0;
  }

  function summon(id = activeProtectorId, opts = {}) {
    const protDef = PROTECTORS_BY_ID[id] || PROTECTORS_BY_ID[activeProtectorId] || PROTECTORS[0];
    const p = state.player;
    const basePos = p.position.clone();

    if (!opts.keepExisting) {
      clearSummons();
    }

    const baseDuration = Number(opts.duration) || protDef.baseDuration || 12.0;
    const damageMult = Number(opts.damageMult) || 1.0;
    const enh = opts.enh || null;

    // Enhancement B: Oath (-15% player damage taken while protector active)
    if (enh === 'b') {
      p.protectorDmgReduction = 0.15;
    }

    // Enhancement A: Retinue (summons 2 smaller avatar clones alongside/instead at 60% scale & damage)
    const unitsToSpawn =
      enh === 'a'
        ? [
            { scale: 1.0, dmgScale: 1.0, angleOffset: 0 },
            { scale: 0.6, dmgScale: 0.6, angleOffset: -2.1 },
            { scale: 0.6, dmgScale: 0.6, angleOffset: 2.1 },
          ]
        : [{ scale: 1.0, dmgScale: 1.0, angleOffset: 0 }];

    for (let i = 0; i < unitsToSpawn.length; i++) {
      const u = unitsToSpawn[i];
      const mesh = buildProtectorMesh(protDef.id, u.scale);
      const ang = (p.heading || 0) + u.angleOffset + Math.PI * 0.25;
      const sx = basePos.x + Math.sin(ang) * 2.0;
      const sz = basePos.z + Math.cos(ang) * 2.0;
      const sy = ctx.world ? ctx.world.getHeight(sx, sz) : basePos.y;
      mesh.position.set(sx, sy, sz);
      group.add(mesh);

      spawnRingVfx(mesh.position, 1.8 * u.scale, protDef.color, 0.5);

      activeSummons.push({
        id: protDef.id,
        def: protDef,
        mesh,
        pos: mesh.position,
        heading: p.heading || 0,
        scale: u.scale,
        damageMult: damageMult * u.dmgScale,
        enh,
        remaining: baseDuration,
        maxDuration: baseDuration,
        attackTimer: 0.35 + i * 0.2,
        tauntTimer: 0.5,
        followAngle: u.angleOffset + i * 1.4,
      });
    }

    bus?.emit('sfx', { name: 'summon' });
    bus?.emit('protector:summoned', {
      id: protDef.id,
      count: activeSummons.length,
      duration: baseDuration,
      enh,
    });

    return activeSummons.length;
  }

  // ---------------------------------------------------------------- Unlock & Selection API
  function unlock(id) {
    const def = PROTECTORS_BY_ID[id];
    if (!def) return false;
    const wasUnlocked = unlockedSet.has(def.id);
    unlockedSet.add(def.id);
    if (state.flags) state.flags[def.unlockFlag] = true;
    ctx.flags?.set?.(def.unlockFlag, true);
    if (unlockedSet.size === 1) {
      activeProtectorId = def.id;
    }
    // Also unlock the protector skill slot when any protector is unlocked
    if (ctx.skills?.unlock) {
      ctx.skills.unlock('protector');
    }
    persist();
    if (!wasUnlocked) {
      bus?.emit('protector:unlock', { id: def.id });
    }
    return true;
  }

  function unlockAll() {
    for (const p of PROTECTORS) {
      unlockedSet.add(p.id);
      if (state.flags) state.flags[p.unlockFlag] = true;
      ctx.flags?.set?.(p.unlockFlag, true);
    }
    if (ctx.skills?.unlock) {
      ctx.skills.unlock('protector');
    }
    persist();
    bus?.emit('protector:unlock', { id: 'all' });
    return true;
  }

  function setActive(id) {
    if (!PROTECTORS_BY_ID[id]) return false;
    activeProtectorId = id;
    state.skills = state.skills || {};
    state.skills.activeProtector = id;
    persist();
    bus?.emit('protector:active', { id });
    return true;
  }

  function getActive() {
    return activeProtectorId;
  }

  function hasAny() {
    for (const p of PROTECTORS) {
      if (unlockedSet.has(p.id) || ctx.flags?.get?.(p.unlockFlag) || state.flags?.[p.unlockFlag]) {
        unlockedSet.add(p.id);
        return true;
      }
    }
    return unlockedSet.size > 0;
  }

  function isUnlocked(id) {
    const def = PROTECTORS_BY_ID[id];
    if (!def) return false;
    if (unlockedSet.has(def.id)) return true;
    if (ctx.flags?.get?.(def.unlockFlag) || state.flags?.[def.unlockFlag]) {
      unlockedSet.add(def.id);
      return true;
    }
    return false;
  }

  function list() {
    return PROTECTORS.map((p) => ({
      ...p,
      name: i18n.t(p.nameKey),
      roleName: i18n.t(p.roleKey),
      desc: i18n.t(p.descKey),
      unlocked: isUnlocked(p.id),
      active: p.id === activeProtectorId,
    }));
  }

  function getActiveSummons() {
    return activeSummons.map((s) => ({
      id: s.id,
      pos: s.pos.clone(),
      remaining: s.remaining,
      scale: s.scale,
      enh: s.enh,
    }));
  }

  // ---------------------------------------------------------------- Per-Frame Update
  function update(dt) {
    const playerPos = state.player?.position;
    if (!playerPos) return;

    const playerAtk = Math.max(1, Number(state.player?.atk) || 10);
    const skillBonus = 1 + (Number(state.player?.skillDamage) || 0) / 100;

    // 1. Update summoned protectors
    for (let i = activeSummons.length - 1; i >= 0; i--) {
      const s = activeSummons[i];
      s.remaining -= dt;

      if (s.remaining <= 0) {
        // Golden dissolve burst
        spawnRingVfx(s.pos, 1.6 * s.scale, 0xfbbf24, 0.45);
        group.remove(s.mesh);
        activeSummons.splice(i, 1);
        if (activeSummons.length === 0) {
          state.player.protectorDmgReduction = 0;
          bus?.emit('protector:expired', { id: s.id });
        }
        continue;
      }

      // Fade out in final 0.5s
      if (s.remaining < 0.5 && s.mesh.userData?.materials) {
        const alpha = Math.max(0, s.remaining / 0.5);
        for (const m of s.mesh.userData.materials) {
          m.transparent = true;
          m.opacity = alpha * 0.85;
        }
      }

      const target = findNearestEnemy(s.pos, 14);
      s.followAngle += dt * 0.8;

      if (s.id === 'tenma') {
        // Hover near player & fire hailstone orbs every 1.2s
        const tx = playerPos.x + Math.cos(s.followAngle) * 2.4;
        const tz = playerPos.z + Math.sin(s.followAngle) * 2.4;
        s.pos.x += (tx - s.pos.x) * Math.min(1, dt * 5);
        s.pos.z += (tz - s.pos.z) * Math.min(1, dt * 5);
        const groundY = ctx.world ? ctx.world.getHeight(s.pos.x, s.pos.z) : playerPos.y;
        s.pos.y = groundY + 0.25 + Math.sin(state.elapsed * 3.2 + i) * 0.12;

        if (s.mesh.userData?.scarf) {
          s.mesh.userData.scarf.rotation.z = Math.sin(state.elapsed * 2.5) * 0.2;
        }

        s.attackTimer -= dt;
        if (target && s.attackTimer <= 0) {
          s.attackTimer = s.def.attackInterval || 1.2;
          const orbMesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.22 * s.scale, 1),
            new THREE.MeshBasicMaterial({
              color: 0x7dd3fc,
              transparent: true,
              opacity: 0.92,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          orbMesh.position.set(s.pos.x, s.pos.y + 1.1, s.pos.z);
          group.add(orbMesh);
          const dmg = Math.max(1, Math.round(playerAtk * 0.5 * s.damageMult * skillBonus));
          projectiles.push({
            mesh: orbMesh,
            targetId: target.id,
            targetPos: new THREE.Vector3(target.pos.x, target.pos.y || 0, target.pos.z),
            speed: 15,
            damage: dmg,
            chill: 1.5,
            elapsed: 0,
          });
        }
      } else if (s.id === 'whiteYak') {
        // Tank: charge toward enemy, attack every 1.5s (ATK * 0.8 + knockback), taunt every 5.0s
        if (target) {
          const dx = target.pos.x - s.pos.x;
          const dz = target.pos.z - s.pos.z;
          const dist = Math.hypot(dx, dz) || 0.001;
          s.mesh.rotation.y = Math.atan2(-dx, -dz);
          if (dist > 1.3) {
            const step = Math.min(dist - 1.1, 7.5 * dt);
            s.pos.x += (dx / dist) * step;
            s.pos.z += (dz / dist) * step;
          }
        } else {
          const tx = playerPos.x + Math.cos(s.followAngle) * 2.2;
          const tz = playerPos.z + Math.sin(s.followAngle) * 2.2;
          s.pos.x += (tx - s.pos.x) * Math.min(1, dt * 4);
          s.pos.z += (tz - s.pos.z) * Math.min(1, dt * 4);
        }
        s.pos.y = ctx.world ? ctx.world.getHeight(s.pos.x, s.pos.z) : playerPos.y;

        // Taunt pulse every 5.0s
        s.tauntTimer -= dt;
        if (s.tauntTimer <= 0) {
          s.tauntTimer = s.def.tauntInterval || 5.0;
          spawnRingVfx(s.pos, 5.0, 0xfde68a, 0.5);
          const nearby = ctx.enemies?.queryCircle?.(s.pos, 5.5) || [];
          for (const e of nearby) {
            ctx.enemies?.applyStatus?.(e, { type: 'taunt', duration: 3.5, targetPos: s.pos });
          }
        }

        // Charge slam attack
        s.attackTimer -= dt;
        if (target && s.attackTimer <= 0) {
          const dist = Math.hypot(target.pos.x - s.pos.x, target.pos.z - s.pos.z);
          if (dist <= 2.6) {
            s.attackTimer = s.def.attackInterval || 1.5;
            const dmg = Math.max(1, Math.round(playerAtk * 0.8 * s.damageMult * skillBonus));
            spawnRingVfx(target.pos, 2.2, 0xf8fafc, 0.35);
            ctx.enemies?.damageEnemy?.(target, dmg, {
              type: 'physical',
              knockback: 2.2,
              origin: s.pos,
              source: 'protector:whiteYak',
            });
          }
        }
      } else if (s.id === 'pehar') {
        // AoE Dharmapala: hover near player, drop golden Dharma wheel every 3.0s in 4.0m AoE (ATK * 1.0)
        const tx = playerPos.x + Math.cos(s.followAngle) * 2.5;
        const tz = playerPos.z + Math.sin(s.followAngle) * 2.5;
        s.pos.x += (tx - s.pos.x) * Math.min(1, dt * 4.5);
        s.pos.z += (tz - s.pos.z) * Math.min(1, dt * 4.5);
        s.pos.y = (ctx.world ? ctx.world.getHeight(s.pos.x, s.pos.z) : playerPos.y) + 0.15;

        if (s.mesh.userData?.backWheel) {
          s.mesh.userData.backWheel.rotation.z += dt * 2.8;
        }

        s.attackTimer -= dt;
        if (s.attackTimer <= 0) {
          const centerPos = target
            ? new THREE.Vector3(target.pos.x, target.pos.y || 0, target.pos.z)
            : s.pos.clone();
          s.attackTimer = s.def.attackInterval || 3.0;
          spawnRingVfx(centerPos, 4.0, 0xfbbf24, 0.65);
          const dmg = Math.max(1, Math.round(playerAtk * 1.0 * s.damageMult * skillBonus));
          const hits = ctx.enemies?.queryCircle?.(centerPos, 4.0) || [];
          for (const e of hits) {
            ctx.enemies?.damageEnemy?.(e, dmg, {
              type: 'magic',
              origin: centerPos,
              source: 'protector:pehar',
            });
          }
        }
      }
    }

    // 2. Update Tenma hailstone projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.elapsed += dt;
      if (p.elapsed > 2.5) {
        group.remove(p.mesh);
        projectiles.splice(i, 1);
        continue;
      }

      const activeList = ctx.enemies?.getActiveEnemies?.() || [];
      const liveTarget = activeList.find((e) => e.id === p.targetId && e.hp > 0);
      if (liveTarget) {
        p.targetPos.copy(liveTarget.pos);
      }

      const dx = p.targetPos.x - p.mesh.position.x;
      const dy = (p.targetPos.y + 0.8) - p.mesh.position.y;
      const dz = p.targetPos.z - p.mesh.position.z;
      const dist = Math.hypot(dx, dy, dz) || 0.001;
      const step = p.speed * dt;

      if (dist <= step + 0.45) {
        if (liveTarget) {
          ctx.enemies?.damageEnemy?.(liveTarget, p.damage, {
            type: 'magic',
            origin: p.mesh.position,
            source: 'protector:tenma',
          });
          ctx.enemies?.applyStatus?.(liveTarget, {
            type: 'slow',
            duration: p.chill || 1.5,
            mult: 0.55,
          });
        }
        spawnRingVfx(p.targetPos, 1.1, 0x7dd3fc, 0.28);
        group.remove(p.mesh);
        projectiles.splice(i, 1);
      } else {
        p.mesh.position.x += (dx / dist) * step;
        p.mesh.position.y += (dy / dist) * step;
        p.mesh.position.z += (dz / dist) * step;
        p.mesh.rotation.x += dt * 6;
        p.mesh.rotation.y += dt * 8;
      }
    }

    // 3. Update ground ring VFX
    for (let i = vfxList.length - 1; i >= 0; i--) {
      const v = vfxList[i];
      v.elapsed += dt;
      const u = Math.min(1, v.elapsed / v.duration);
      const sc = v.startScale + (v.maxScale - v.startScale) * u;
      v.mesh.scale.setScalar(sc);
      v.mesh.material.opacity = 0.85 * (1 - u);
      if (u >= 1) {
        group.remove(v.mesh);
        v.mesh.geometry.dispose();
        v.mesh.material.dispose();
        vfxList.splice(i, 1);
      }
    }
  }

  bus?.on('zone:change', () => {
    clearSummons();
  });

  bus?.on('merit:reset', () => {
    clearSummons();
    unlockedSet.clear();
    activeProtectorId = 'tenma';
    persist();
  });

  loadFromSave();

  const api = {
    update,
    unlock,
    unlockAll,
    summon,
    setActive,
    equip: setActive,
    getActive,
    hasAny,
    isUnlocked,
    list,
    getActiveSummons,
    clearSummons,
    getState() {
      return {
        active: activeProtectorId,
        unlocked: [...unlockedSet],
        activeSummons: getActiveSummons(),
        speedMult: state.player?.speedMult || 1,
      };
    },
  };

  ctx.protectors = api;
  ctx.allies = api;

  ctx.debug?.register('protectors', {
    unlock: (id) => api.unlock(id),
    unlockAll: () => api.unlockAll(),
    summon: (id, opts) => api.summon(id, opts),
    setActive: (id) => api.setActive(id),
    getActive: () => api.getActive(),
    hasAny: () => api.hasAny(),
    list: () => api.list(),
    activeSummons: () => api.getActiveSummons(),
  });

  return api;
}

export const createProtectors = createAllies;
