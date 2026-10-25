import * as THREE from 'three';

/**
 * Zones system — manages active map zone ('stupa' | 'wild'), gate interactables,
 * seamless fade-to-black scene transitions, and synchronous teleport API.
 */
export function createZones(ctx) {
  const { state, config, bus } = ctx;
  const W = config.WILD;

  let isTransitioning = false;

  // ---------------------------------------------------------------- DOM Fade Overlay
  let fadeEl = typeof document !== 'undefined' ? document.getElementById('zone-fade') : null;
  if (!fadeEl && typeof document !== 'undefined') {
    fadeEl = document.createElement('div');
    fadeEl.id = 'zone-fade';
    const ui = document.getElementById('ui') || document.body;
    ui.appendChild(fadeEl);
  }

  // ---------------------------------------------------------------- Switch Logic
  function applyZoneSwitch(to, options = {}) {
    const from = state.zone || 'stupa';
    if (from === to) return;
    state.zone = to;

    if (ctx.stupaGroup) ctx.stupaGroup.visible = (to === 'stupa');
    if (ctx.wildGroup) ctx.wildGroup.visible = (to === 'wild');

    if (to === 'wild') {
      const sp = (options.viaTeleport && W.wildGate.teleportPos) ? W.wildGate.teleportPos : W.wildGate.spawnPos;
      const y = ctx.wilderness ? ctx.wilderness.getHeight(sp.x, sp.z) : 0;
      state.player.position.set(sp.x, y, sp.z);
      state.player.heading = W.wildGate.spawnHeading; // 0 (faces north into wilderness)
    } else {
      const rp = W.stupaGate.returnPos;
      state.player.position.set(rp.x, 0, rp.z);
      state.player.heading = W.stupaGate.returnHeading; // Math.PI (faces stupa)
    }

    state.player.velocity.set(0, 0, 0);
    state.player.isMoving = false;

    bus.emit('zone:change', { from, to });
    bus.emit('toast', { key: to === 'wild' ? 'toast.enterWild' : 'toast.returnStupa' });
    bus.emit('sfx', { name: 'bowl' });
  }

  function startTransition(to) {
    if (isTransitioning || (state.zone || 'stupa') === to) return;
    isTransitioning = true;

    if (fadeEl) {
      fadeEl.classList.add('is-active');
    }

    setTimeout(() => {
      applyZoneSwitch(to, { viaTeleport: false });
      if (fadeEl) {
        fadeEl.classList.remove('is-active');
      }
      setTimeout(() => {
        isTransitioning = false;
      }, 400);
    }, 400);
  }

  function teleport(to) {
    if ((state.zone || 'stupa') === to) {
      if (to === 'wild') {
        const sp = W.wildGate.teleportPos || W.wildGate.spawnPos;
        const y = ctx.wilderness ? ctx.wilderness.getHeight(sp.x, sp.z) : 0;
        state.player.position.set(sp.x, y, sp.z);
        state.player.heading = W.wildGate.spawnHeading;
        state.player.velocity.set(0, 0, 0);
        state.player.isMoving = false;
        bus.emit('zone:change', { from: to, to });
      }
      return;
    }
    if (fadeEl) {
      fadeEl.classList.add('is-active');
      void fadeEl.offsetWidth; // force layout
      requestAnimationFrame(() => {
        fadeEl.classList.remove('is-active');
      });
    }
    applyZoneSwitch(to, { viaTeleport: true });
  }

  // ---------------------------------------------------------------- Gate Interactables
  const stupaGateVec = new THREE.Vector3(W.stupaGate.x, 0, W.stupaGate.z);
  const wildGateVec = new THREE.Vector3(
    W.wildGate.x,
    ctx.wilderness ? ctx.wilderness.getHeight(W.wildGate.x, W.wildGate.z) : 0,
    W.wildGate.z
  );

  ctx.interactables.push({
    id: 'gate-to-wild',
    kind: 'gate',
    zone: 'stupa',
    action: 'interact',
    labelKey: 'prompt.enterWild',
    radius: W.stupaGate.radius,
    getPosition: () => stupaGateVec,
    isAvailable: () => (state.zone || 'stupa') === 'stupa' && !isTransitioning,
    onInteract: () => startTransition('wild'),
  });

  ctx.interactables.push({
    id: 'gate-to-stupa',
    kind: 'gate',
    zone: 'wild',
    action: 'interact',
    labelKey: 'prompt.returnStupa',
    radius: W.wildGate.radius,
    getPosition: () => {
      if (ctx.wilderness) {
        wildGateVec.y = ctx.wilderness.getHeight(W.wildGate.x, W.wildGate.z);
      }
      return wildGateVec;
    },
    isAvailable: () => state.zone === 'wild' && !isTransitioning,
    onInteract: () => startTransition('stupa'),
  });

  const api = {
    update(dt) {},
    teleport,
    startTransition,
    isTransitioning() { return isTransitioning; },
  };

  ctx.zones = api;
  ctx.debug?.register('zones', {
    teleport: (to) => api.teleport(to),
  });
  return api;
}
