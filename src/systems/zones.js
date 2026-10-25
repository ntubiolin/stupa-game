import * as THREE from 'three';
import { deg, polar } from '../config.js';

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
    if (from === to && !options.southSpawn) return;
    state.zone = to;

    if (ctx.stupaGroup) ctx.stupaGroup.visible = (to === 'stupa');
    if (ctx.wildGroup) ctx.wildGroup.visible = (to === 'wild');

    if (to === 'wild') {
      const sp = (options.viaTeleport && W.wildGate.teleportPos) ? W.wildGate.teleportPos : W.wildGate.spawnPos;
      const y = ctx.wilderness ? ctx.wilderness.getHeight(sp.x, sp.z) : 0;
      state.player.position.set(sp.x, y, sp.z);
      state.player.heading = W.wildGate.spawnHeading; // 0 (faces north into wilderness)
    } else {
      if (options.southSpawn) {
        const startAng = deg(config.PLAYER?.startAngleDeg ?? 90);
        const startRad = config.PLAYER?.startRadius ?? 30;
        const pt = polar(startAng, startRad);
        state.player.position.set(pt.x, 0, pt.z);
        state.player.heading = 0; // facing north towards stupa
      } else {
        const rp = W.stupaGate.returnPos;
        state.player.position.set(rp.x, 0, rp.z);
        state.player.heading = W.stupaGate.returnHeading; // Math.PI (faces stupa)
      }
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

  function teleport(to, options = {}) {
    if ((state.zone || 'stupa') === to) {
      if (to === 'wild') {
        const sp = W.wildGate.teleportPos || W.wildGate.spawnPos;
        const y = ctx.wilderness ? ctx.wilderness.getHeight(sp.x, sp.z) : 0;
        state.player.position.set(sp.x, y, sp.z);
        state.player.heading = W.wildGate.spawnHeading;
        state.player.velocity.set(0, 0, 0);
        state.player.isMoving = false;
        bus.emit('zone:change', { from: to, to });
      } else if (to === 'stupa' && options.southSpawn) {
        const startAng = deg(config.PLAYER?.startAngleDeg ?? 90);
        const startRad = config.PLAYER?.startRadius ?? 30;
        const pt = polar(startAng, startRad);
        state.player.position.set(pt.x, 0, pt.z);
        state.player.heading = 0;
        state.player.velocity.set(0, 0, 0);
        state.player.isMoving = false;
        bus.emit('zone:change', { from: to, to });
      }
      return;
    }
    if (fadeEl && !options.skipFade) {
      fadeEl.classList.add('is-active');
      void fadeEl.offsetWidth; // force layout
      requestAnimationFrame(() => {
        fadeEl.classList.remove('is-active');
      });
    }
    applyZoneSwitch(to, { viaTeleport: true, ...options });
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

  // ---------------------------------------------------------------- First-Time Wilderness Tutorial
  const TUTORIAL_KEY = 'stupa_wild_tutorial_v1';
  let tutorialQueue = [];

  function clearTutorialTimers() {
    tutorialQueue = [];
  }

  bus.on('zone:change', ({ to }) => {
    if (to === 'wild') {
      try {
        const seen = localStorage.getItem(TUTORIAL_KEY);
        if (!seen) {
          localStorage.setItem(TUTORIAL_KEY, '1');
          tutorialQueue = [
            { delay: 0.4, key: 'tutorial.wild1' },
            { delay: 2.8, key: 'tutorial.wild2' },
            { delay: 5.2, key: 'tutorial.wild3' },
          ];
        }
      } catch { /* ignore */ }
    } else {
      clearTutorialTimers();
    }
  });

  bus.on('merit:reset', () => {
    clearTutorialTimers();
    try {
      localStorage.removeItem(TUTORIAL_KEY);
    } catch { /* ignore */ }
  });

  const api = {
    update(dt) {
      if (state.zone === 'wild' && tutorialQueue.length > 0) {
        for (let i = tutorialQueue.length - 1; i >= 0; i--) {
          tutorialQueue[i].delay -= dt;
          if (tutorialQueue[i].delay <= 0) {
            const item = tutorialQueue.splice(i, 1)[0];
            bus.emit('toast', { key: item.key });
          }
        }
      }
    },
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
