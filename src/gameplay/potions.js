/**
 * Amrita Pills (甘露丸) — healing potion charges, instant + HoT restoration,
 * hub auto-refill, and 6% golden pill drops from liberated monsters.
 *
 * Strictly zero PointLights (uses emissive/additive meshes only).
 */
import * as THREE from 'three';
import '../i18n/elites.js';

const DEFAULT_MAX = 4;
const COOLDOWN_SEC = 1.0;
const DROP_CHANCE = 0.06;
const MAGNET_DIST = 4.0;
const PICKUP_DIST = 2.0;
const DESPAWN_SEC = 60;

export function createPotions(ctx) {
  const { scene, state, bus } = ctx;

  // ---------------------------------------------------------------- Persistence & State
  function loadSaved() {
    const fallback = { charges: DEFAULT_MAX, max: DEFAULT_MAX };
    if (ctx.save) {
      const saved = ctx.save.get('potions', fallback);
      if (saved && typeof saved === 'object') {
        const max =
          typeof saved.max === 'number' && saved.max > 0
            ? Math.floor(saved.max)
            : DEFAULT_MAX;
        const charges =
          typeof saved.charges === 'number'
            ? Math.max(0, Math.min(max, Math.floor(saved.charges)))
            : max;
        return { charges, max };
      }
    }
    return fallback;
  }

  function savePotions() {
    const pot = state.player.potions;
    if (ctx.save && pot) {
      ctx.save.set('potions', { charges: pot.charges, max: pot.max });
    }
  }

  state.player.potions = loadSaved();

  let cdTimer = 0;
  // Active heal-over-time ticks: each entry { timer, ticksLeft, tickAmount }
  const activeHots = [];

  function emitChange() {
    const { charges, max } = state.player.potions;
    bus.emit('potion:change', { charges, max, cooldown: cdTimer });
  }

  // ---------------------------------------------------------------- 3D Ground Pill Drops (Zero PointLight)
  const dropGroup = new THREE.Group();
  dropGroup.name = 'AmritaPillDrops';
  scene.add(dropGroup);

  const pillSphereGeo = new THREE.SphereGeometry(0.11, 12, 10);
  const pillCoreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.75,
    emissive: 0xd97706,
    emissiveIntensity: 1.8,
    toneMapped: false,
  });

  const pillAuraGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const pillAuraMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const pillHaloGeo = new THREE.RingGeometry(0.18, 0.26, 24);
  pillHaloGeo.rotateX(-Math.PI / 2);
  const pillHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  const groundPills = [];

  function buildPillVisual() {
    const group = new THREE.Group();
    const core = new THREE.Mesh(pillSphereGeo, pillCoreMat);
    core.position.y = 0.22;
    const aura = new THREE.Mesh(pillAuraGeo, pillAuraMat);
    aura.position.y = 0.22;
    const halo = new THREE.Mesh(pillHaloGeo, pillHaloMat);
    halo.position.y = 0.03;
    group.add(core, aura, halo);
    return { group, core, aura, halo };
  }

  function spawnDrop(pos) {
    const ppos = state.player?.position || { x: 0, y: 0, z: 0 };
    const x = pos?.x ?? ppos.x;
    const z = pos?.z ?? ppos.z;
    const y = ctx.world ? ctx.world.getHeight(x, z) : (pos?.y ?? 0);

    const visual = buildPillVisual();
    visual.group.position.set(x, y, z);
    dropGroup.add(visual.group);

    const entry = {
      mesh: visual.group,
      core: visual.core,
      aura: visual.aura,
      x,
      y,
      z,
      age: 0,
      phase: Math.random() * Math.PI * 2,
      zone: state.zone || 'wild',
    };
    groundPills.push(entry);
    return entry;
  }

  function clearDrops() {
    for (let i = groundPills.length - 1; i >= 0; i--) {
      dropGroup.remove(groundPills[i].mesh);
    }
    groundPills.length = 0;
  }

  // ---------------------------------------------------------------- Operations
  function setCharges(n) {
    const pot = state.player.potions;
    const clamped = Math.max(0, Math.min(pot.max, Math.floor(Number(n) || 0)));
    pot.charges = clamped;
    savePotions();
    emitChange();
    return pot.charges;
  }

  function refill() {
    const pot = state.player.potions;
    pot.charges = pot.max;
    cdTimer = 0;
    savePotions();
    emitChange();
    return pot.charges;
  }

  function use(fromInput = false) {
    if (fromInput && state.mode !== 'play') return false;
    if (state.uiOpen) return false;
    if (state.player?.action === 'faint' || ctx.vitals?.isFainting?.()) return false;
    if (cdTimer > 0) return false;

    const p = state.player;
    const pot = p.potions;
    const maxHp = p.maxHp || 100;
    const hp = p.hp ?? maxHp;

    if (hp >= maxHp) {
      bus.emit('toast', { key: 'toast.potionFull', kind: 'info' });
      return false;
    }

    if (pot.charges <= 0) {
      bus.emit('toast', { key: 'toast.potionEmpty', kind: 'warning' });
      return false;
    }

    pot.charges = Math.max(0, pot.charges - 1);
    cdTimer = COOLDOWN_SEC;
    savePotions();

    const immediateHeal = Math.max(1, Math.round(maxHp * 0.35));
    bus.emit('vitals:restore', { hp: immediateHeal, source: 'potion' });

    const tickHeal = Math.max(1, Math.round(maxHp * 0.05));
    activeHots.push({
      timer: 1.0,
      ticksLeft: 3,
      tickAmount: tickHeal,
    });

    bus.emit('sfx', { name: 'potion' });
    bus.emit('potion:use', { charges: pot.charges, max: pot.max });
    emitChange();
    return true;
  }

  // ---------------------------------------------------------------- Event Listeners
  function onZoneCheck(payload) {
    const to = payload?.to ?? state.zone;
    if (to === 'stupa' || state.zoneType === 'hub' || ctx.world?.isHub?.(to)) {
      refill();
      clearDrops();
    } else {
      clearDrops();
    }
  }

  bus.on('zone:change', onZoneCheck);
  bus.on('zone:changed', onZoneCheck);

  bus.on('enemy:liberated', (payload) => {
    const inCombat =
      state.zoneType === 'combat' ||
      state.zoneType === 'dungeon' ||
      (state.zone && state.zone !== 'stupa');
    if (!inCombat) return;

    if (Math.random() < DROP_CHANCE) {
      const origin = payload?.position || state.player?.position;
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.45;
      spawnDrop({
        x: (origin?.x ?? 0) + Math.cos(angle) * dist,
        z: (origin?.z ?? 0) + Math.sin(angle) * dist,
      });
    }
  });

  bus.on('merit:reset', () => {
    state.player.potions = { charges: DEFAULT_MAX, max: DEFAULT_MAX };
    cdTimer = 0;
    activeHots.length = 0;
    clearDrops();
    savePotions();
    emitChange();
  });

  // ---------------------------------------------------------------- Update Loop
  function update(dt) {
    if (cdTimer > 0) {
      cdTimer = Math.max(0, cdTimer - dt);
    }

    if (state.mode === 'play' && !state.uiOpen && ctx.input?.pressed('potion')) {
      use(true);
    }

    // Tick HoT restoration (3 ticks over 3s)
    if (activeHots.length > 0) {
      if (state.player?.action === 'faint' || ctx.vitals?.isFainting?.()) {
        activeHots.length = 0;
      } else {
        for (let i = activeHots.length - 1; i >= 0; i--) {
          const hot = activeHots[i];
          hot.timer -= dt;
          while (hot.timer <= 0 && hot.ticksLeft > 0) {
            hot.ticksLeft -= 1;
            hot.timer += 1.0;
            bus.emit('vitals:restore', { hp: hot.tickAmount, source: 'potionHot' });
          }
          if (hot.ticksLeft <= 0) {
            activeHots.splice(i, 1);
          }
        }
      }
    }

    // Update ground Amrita pills
    const ppos = state.player?.position;
    const currentZone = state.zone || 'stupa';
    for (let i = groundPills.length - 1; i >= 0; i--) {
      const pill = groundPills[i];
      pill.age += dt;
      if (pill.age >= DESPAWN_SEC || pill.zone !== currentZone) {
        dropGroup.remove(pill.mesh);
        groundPills.splice(i, 1);
        continue;
      }

      const bob = Math.sin(state.elapsed * 3.0 + pill.phase) * 0.05;
      pill.core.position.y = 0.22 + bob;
      pill.aura.position.y = 0.22 + bob;
      const pulse = 1.0 + Math.sin(state.elapsed * 5.0 + pill.phase) * 0.14;
      pill.aura.scale.setScalar(pulse);

      if (ppos) {
        const dx = ppos.x - pill.x;
        const dz = ppos.z - pill.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= PICKUP_DIST) {
          const pot = state.player.potions;
          if (pot.charges < pot.max) {
            pot.charges = Math.min(pot.max, pot.charges + 1);
            savePotions();
            emitChange();
          }
          bus.emit('sfx', { name: 'pickup' });
          bus.emit('toast', { key: 'toast.potionPickup', kind: 'merit' });
          dropGroup.remove(pill.mesh);
          groundPills.splice(i, 1);
          continue;
        } else if (dist <= MAGNET_DIST) {
          const pull = Math.min(1, dt * 8.5);
          pill.x += dx * pull;
          pill.z += dz * pull;
          pill.y = ctx.world ? ctx.world.getHeight(pill.x, pill.z) : pill.y;
          pill.mesh.position.set(pill.x, pill.y, pill.z);
        }
      }
    }
  }

  const api = {
    update,
    use: () => use(false),
    refill,
    set: setCharges,
    get() {
      const pot = state.player.potions;
      return {
        charges: pot.charges,
        max: pot.max,
        cooldown: Number(cdTimer.toFixed(2)),
      };
    },
    getCooldownFraction() {
      return Math.max(0, Math.min(1, cdTimer / COOLDOWN_SEC));
    },
    spawnDrop,
    clearDrops,
  };

  ctx.potions = api;
  ctx.debug?.register('potions', {
    set: (n) => api.set(n),
    use: () => api.use(),
    refill: () => api.refill(),
    get: () => api.get(),
    spawnDrop: (pos) => api.spawnDrop(pos),
  });

  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.potions = api;
  }

  return api;
}
