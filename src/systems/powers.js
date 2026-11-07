/**
 * Terma Legendary Powers System (#27)
 *
 * Exposes `ctx.powers.has(powerId)` (checks currently equipped items in
 * `ctx.inventory.getEquipment()` / `ctx.inventory.getEquipped()` for
 * `item.legendaryId === powerId` or `item.powerId === powerId`, plus debug overrides)
 * and `ctx.powers.listActive()`.
 *
 * Implements all 6 Terma legendary powers:
 *  1. phurbaSplit (蓮師金剛橛): phurba splits into 3 daggers on cast/hit and roots for +1s.
 *  2. yakFrost (雪山白犛之角): casting mantra (R) leaves a 4.0m frost field on the ground for 4.0s
 *     that slows enemies by 40% and deals 20% ATK frost damage per second.
 *  3. tenmaOath (丹瑪護法天衣): when player HP drops below 35%, automatically summons tenma for
 *     10.0s and grants a 25% maxHp shield (45s internal cooldown).
 *  4. bellReset (靜命論師金剛鈴): if vajraBell stuns/hits 3+ enemies (or dispels projectiles + hits >= 3),
 *     resets Six-Syllable Mantra (mantra) cooldown to 0 and restores 15 MP.
 *  5. chimphuStill (青朴靜慮念珠): standing still for 1.5s grants the "止觀 (Samatha)" state:
 *     +25% skill damage and +5 MP/s regen until moving.
 *  6. samyeMandala (桑耶鎮寺法輪): every 3rd mantra (R) cast triggers a golden Samye Mandala ring
 *     expanding to 9.0m dealing ATK * 1.8 damage.
 *
 * Strictly 0 PointLights.
 */
import * as THREE from 'three';
import { LEGENDARIES } from '../data/legendaries.js';

export function createPowers(ctx) {
  const { scene, state, bus } = ctx;

  const group = new THREE.Group();
  group.name = 'TermaPowersVFX';
  if (scene) scene.add(group);

  const manualPowers = new Set();
  const frostFields = [];
  const mandalaRings = [];

  let tenmaOathCd = 0;
  let dakiniMirrorCd = 0;
  let stillTimer = 0;
  let samathaActive = false;
  let mantraCastCount = 0;
  let tsogyalNextHumReady = false;

  function consumeTsogyalHum() {
    if (!has('tsogyalMemory')) {
      tsogyalNextHumReady = false;
      if (state.player) state.player.tsogyalNextHum = false;
      return false;
    }
    if (tsogyalNextHumReady || state.player?.tsogyalNextHum) {
      tsogyalNextHumReady = false;
      if (state.player) state.player.tsogyalNextHum = false;
      bus?.emit('power:tsogyalMemory', { mult: 2.0 });
      return true;
    }
    return false;
  }

  function getEquippedMap() {
    if (ctx.inventory?.getEquipment) return ctx.inventory.getEquipment();
    if (ctx.inventory?.getEquipped) return ctx.inventory.getEquipped();
    return state.equipment || null;
  }

  function has(powerId) {
    if (!powerId) return false;
    if (manualPowers.has(powerId)) return true;
    const eq = getEquippedMap();
    if (eq && typeof eq === 'object') {
      for (const item of Object.values(eq)) {
        if (item && (item.legendaryId === powerId || item.powerId === powerId)) {
          return true;
        }
      }
    }
    return false;
  }

  function listActive() {
    const active = new Set(manualPowers);
    const eq = getEquippedMap();
    if (eq && typeof eq === 'object') {
      for (const item of Object.values(eq)) {
        if (item) {
          const pid = item.powerId || item.legendaryId;
          if (pid) active.add(pid);
        }
      }
    }
    return Array.from(active);
  }

  function set(powerId, enabled = true) {
    if (!powerId) return false;
    if (enabled) manualPowers.add(powerId);
    else manualPowers.delete(powerId);
    return has(powerId);
  }

  // ---------------------------------------------------------------- 2. yakFrost (雪山白犛之角)
  function spawnFrostField(origin) {
    const radius = 4.0;
    const duration = 4.0;

    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.2, radius, 36),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(origin.x, (origin.y || 0) + 0.1, origin.z);
    group.add(mesh);

    // Apply immediate tick of slow (40% slow => speed mult 0.6) & 20% ATK frost damage
    applyFrostTick(origin, radius);

    frostFields.push({
      mesh,
      origin: origin.clone(),
      radius,
      remaining: duration,
      maxDuration: duration,
      tickTimer: 1.0,
    });
  }

  function applyFrostTick(origin, radius) {
    const atk = Math.max(1, Number(state.player?.atk) || 10);
    const dmg = Math.max(1, Math.round(atk * 0.2));
    const enemies = ctx.enemies?.queryCircle?.(origin, radius) || [];
    for (const e of enemies) {
      ctx.enemies?.applyStatus?.(e, { type: 'slow', duration: 1.5, mult: 0.6 });
      ctx.enemies?.damageEnemy?.(e, dmg, {
        type: 'magic',
        origin,
        source: 'terma:yakFrost',
      });
    }
  }

  // ---------------------------------------------------------------- 3. tenmaOath (丹瑪護法天衣)
  function checkTenmaOath() {
    if (!has('tenmaOath') || tenmaOathCd > 0) return false;
    const hp = Number(state.player?.hp ?? 100);
    const maxHp = Math.max(1, Number(state.player?.maxHp) || 100);
    if (hp > 0 && hp / maxHp <= 0.35) {
      tenmaOathCd = 45.0;
      const shieldAmt = Math.max(1, Math.round(maxHp * 0.25));
      if (ctx.vitals?.addShield) {
        ctx.vitals.addShield(shieldAmt, 10.0, { source: 'tenmaOath' });
      } else {
        state.player.shield = (state.player.shield || 0) + shieldAmt;
        state.player.shieldMax = Math.max(state.player.shieldMax || 0, state.player.shield);
        state.player.shieldRemaining = Math.max(state.player.shieldRemaining || 0, 10.0);
      }
      ctx.protectors?.summon?.('tenma', { duration: 10.0, damageMult: 1.0 });
      bus?.emit('toast', { key: 'toast.tenmaOathProc', kind: 'info' });
      bus?.emit('power:tenmaOath', { shield: shieldAmt, duration: 10.0 });
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- 10. dakiniMirror (空行母秘密明鏡)
  function checkDakiniMirror() {
    if (!has('dakiniMirror') || dakiniMirrorCd > 0) return false;
    const hp = Number(state.player?.hp ?? 100);
    const maxHp = Math.max(1, Number(state.player?.maxHp) || 100);
    if (hp > 0 && hp / maxHp <= 0.30) {
      dakiniMirrorCd = 60.0;
      const healAmt = Math.max(1, Math.round(maxHp * 0.40));
      ctx.vitals?.addBuff?.('dakiniMirrorRainbow', { invuln: true }, 2.5);
      bus?.emit('vitals:restore', { hp: healAmt, source: 'dakiniMirror' });

      const origin = state.player?.position || { x: 0, y: 0, z: 0 };
      const ringMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 1.4, 48),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      ringMesh.rotation.x = -Math.PI * 0.5;
      ringMesh.position.set(origin.x, (origin.y || 0) + 0.2, origin.z);
      group.add(ringMesh);
      mandalaRings.push({
        mesh: ringMesh,
        maxRadius: 4.5,
        elapsed: 0,
        duration: 1.1,
      });

      bus?.emit('sfx', { name: 'bell' });
      bus?.emit('toast', { key: 'toast.dakiniMirrorProc', kind: 'merit' });
      bus?.emit('power:dakiniMirror', { heal: healAmt, invulnDuration: 2.5 });
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- 11. thokchaVajra (蓮師天鐵九股杵)
  function triggerThokchaVajra(origin) {
    const radius = 6.5;
    const atk = Math.max(1, Number(state.player?.atk) || 10);
    const skillBonus = 1 + (Number(state.player?.skillDamage) || 0) / 100;
    const dmg = Math.max(1, Math.round(atk * 1.1 * skillBonus));

    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.95, 36),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(origin.x, (origin.y || 0) + 0.18, origin.z);
    group.add(mesh);

    mandalaRings.push({
      mesh,
      maxRadius: radius,
      elapsed: 0,
      duration: 0.5,
    });

    const targets = ctx.enemies?.queryCircle?.(origin, radius) || [];
    for (const e of targets) {
      ctx.enemies?.applyStatus?.(e, { type: 'stun', duration: 1.5 });
      ctx.enemies?.damageEnemy?.(e, dmg, {
        type: 'magic',
        origin,
        source: 'terma:thokchaVajra',
      });
    }

    bus?.emit('power:thokchaVajra', { radius, damage: dmg, hitCount: targets.length });
  }

  // ---------------------------------------------------------------- 4. bellReset (靜命論師金剛鈴)
  bus?.on('vajraBell:resolved', ({ hitCount = 0, dispelledCount = 0, totalAffected = 0 } = {}) => {
    if (!has('bellReset')) return;
    if (hitCount >= 3 || totalAffected >= 3) {
      ctx.skills?.resetCooldown?.('mantra');
      bus?.emit('vitals:restore', { mp: 15, source: 'bellReset' });
      bus?.emit('toast', { key: 'toast.bellResetProc', kind: 'info' });
      bus?.emit('power:bellReset', { hitCount, dispelledCount });
    }
  });

  // ---------------------------------------------------------------- 6. samyeMandala (桑耶鎮寺法輪) & 2. yakFrost on Mantra Cast
  function triggerSamyeMandala(origin) {
    const radius = 9.0;
    const atk = Math.max(1, Number(state.player?.atk) || 10);
    const skillBonus = 1 + (Number(state.player?.skillDamage) || 0) / 100;
    const dmg = Math.max(1, Math.round(atk * 1.8 * skillBonus));

    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 1.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(origin.x, (origin.y || 0) + 0.16, origin.z);
    group.add(mesh);

    mandalaRings.push({
      mesh,
      maxRadius: radius,
      elapsed: 0,
      duration: 0.65,
    });

    const targets = ctx.enemies?.queryCircle?.(origin, radius) || [];
    for (const e of targets) {
      ctx.enemies?.damageEnemy?.(e, dmg, {
        type: 'magic',
        origin,
        source: 'terma:samyeMandala',
      });
    }

    bus?.emit('sfx', { name: 'bowl' });
    bus?.emit('power:samyeMandala', { radius, damage: dmg, hitCount: targets.length });
  }

  bus?.on('skill:cast', (payload) => {
    if (!payload || payload.id !== 'mantra') return;
    const origin = payload.origin || state.player.position.clone();

    // 2. yakFrost: casting mantra leaves a 4.0m frost field for 4.0s
    if (has('yakFrost')) {
      spawnFrostField(origin);
    }

    // 6. samyeMandala: every 3rd mantra cast triggers a 9.0m Samye Mandala ring dealing ATK * 1.8
    if (has('samyeMandala')) {
      mantraCastCount += 1;
      if (mantraCastCount >= 3) {
        mantraCastCount = 0;
        triggerSamyeMandala(origin);
      }
    } else {
      mantraCastCount = 0;
    }

    // 7. tsogyalMemory (措嘉的空行念珠): casting mantra empowers the next humBolt for +100% damage
    if (has('tsogyalMemory')) {
      tsogyalNextHumReady = true;
      if (state.player) state.player.tsogyalNextHum = true;
    }

    // 11. thokchaVajra (蓮師天鐵九股杵): casting mantra calls down a 6.5m Thokcha thunderbolt (110% ATK + 1.5s stun)
    if (has('thokchaVajra')) {
      triggerThokchaVajra(origin);
    }
  });

  // 9. retreatShield (青朴閉關法衣): when Lotus Shield ends, reduce remaining cooldown by 50%
  bus?.on('shield:ended', ({ source } = {}) => {
    if (source === 'lotusShield' && has('retreatShield')) {
      const remaining = ctx.skills?.reduceCooldown?.('lotusShield', 0.5);
      bus?.emit('power:retreatShield', { remaining });
    }
  });

  bus?.on('lotusShield:burst', ({ origin } = {}) => {
    if (has('yakFrost')) {
      spawnFrostField(origin || state.player.position.clone());
    }
  });

  bus?.on('player:hurt', () => {
    checkTenmaOath();
    checkDakiniMirror();
  });

  bus?.on('vitals:changed', () => {
    checkTenmaOath();
    checkDakiniMirror();
  });

  // ---------------------------------------------------------------- Per-Frame Update
  function update(dt) {
    if (tenmaOathCd > 0) {
      tenmaOathCd = Math.max(0, tenmaOathCd - dt);
    }
    if (dakiniMirrorCd > 0) {
      dakiniMirrorCd = Math.max(0, dakiniMirrorCd - dt);
    }

    // 5. chimphuStill (青朴靜慮念珠): standing still for 1.5s grants Samatha (+25% skillDamage, +5 MP/s)
    if (has('chimphuStill') && state.mode === 'play') {
      const vel = state.player?.velocity;
      const speedSq = vel ? vel.x * vel.x + vel.z * vel.z : 0;
      const isMoving = Boolean(state.player?.isMoving) || speedSq > 0.04;

      if (!isMoving) {
        stillTimer += dt;
        if (stillTimer >= 1.5) {
          samathaActive = true;
          ctx.vitals?.addBuff?.(
            'chimphuStill',
            { skillDamageAdd: 25, mpRegenAdd: 5 },
            0.5
          );
        }
      } else {
        stillTimer = 0;
        if (samathaActive) {
          samathaActive = false;
          if (Array.isArray(state.player?.buffs)) {
            const idx = state.player.buffs.findIndex((b) => b.id === 'chimphuStill');
            if (idx !== -1) {
              state.player.buffs.splice(idx, 1);
              ctx.vitals?.recalcDerived?.();
            }
          }
        }
      }
    } else if (samathaActive) {
      samathaActive = false;
      stillTimer = 0;
    }

    // Update frost fields (yakFrost)
    for (let i = frostFields.length - 1; i >= 0; i--) {
      const f = frostFields[i];
      f.remaining -= dt;
      f.tickTimer -= dt;
      if (f.tickTimer <= 0 && f.remaining > 0) {
        f.tickTimer += 1.0;
        applyFrostTick(f.origin, f.radius);
      }
      f.mesh.material.opacity = 0.55 * Math.max(0, f.remaining / f.maxDuration);
      if (f.remaining <= 0) {
        group.remove(f.mesh);
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
        frostFields.splice(i, 1);
      }
    }

    // Update expanding Samye Mandala rings
    for (let i = mandalaRings.length - 1; i >= 0; i--) {
      const m = mandalaRings[i];
      m.elapsed += dt;
      const u = Math.min(1, m.elapsed / m.duration);
      const sc = 0.4 + (m.maxRadius - 0.4) * u;
      m.mesh.scale.setScalar(sc);
      m.mesh.material.opacity = 0.92 * (1 - u);
      if (u >= 1) {
        group.remove(m.mesh);
        m.mesh.geometry.dispose();
        m.mesh.material.dispose();
        mandalaRings.splice(i, 1);
      }
    }
  }

  bus?.on('merit:reset', () => {
    manualPowers.clear();
    tenmaOathCd = 0;
    dakiniMirrorCd = 0;
    stillTimer = 0;
    samathaActive = false;
    mantraCastCount = 0;
    tsogyalNextHumReady = false;
    if (state.player) state.player.tsogyalNextHum = false;
  });

  const api = {
    update,
    has,
    set,
    listActive,
    consumeTsogyalHum,
    isTsogyalHumReady: () => Boolean(has('tsogyalMemory') && (tsogyalNextHumReady || state.player?.tsogyalNextHum)),
    getFrostFields: () => frostFields.length,
    isSamathaActive: () => samathaActive,
    resetTenmaCooldown: () => {
      tenmaOathCd = 0;
    },
    definitions: LEGENDARIES,
  };

  ctx.powers = api;

  ctx.debug?.register('powers', {
    has: (id) => api.has(id),
    set: (id, enabled = true) => api.set(id, enabled),
    listActive: () => api.listActive(),
    resetTenmaCooldown: () => api.resetTenmaCooldown(),
  });

  return api;
}
