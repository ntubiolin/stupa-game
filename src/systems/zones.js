import * as THREE from 'three';
import { MAPS } from '../data/maps.js';

/**
 * Zones system — manages data-driven map registry (`MAPS`), lazy loading (`load()`),
 * gate interactables, fade-to-black transitions, teleport API, and `ctx.world` helpers.
 */
export function createZones(ctx) {
  const { state, config, bus, scene } = ctx;

  let isTransitioning = false;

  // Ensure zoneGroups dictionary exists on ctx
  if (!ctx.zoneGroups) {
    ctx.zoneGroups = {};
  }
  if (ctx.stupaGroup) ctx.zoneGroups.stupa = ctx.stupaGroup;
  if (ctx.wildGroup) ctx.zoneGroups.wild = ctx.wildGroup;

  // Track loaded map instances & loading promises
  const mapInstances = {};
  const loadingPromises = {};

  for (const mapId of Object.keys(MAPS)) {
    const m = MAPS[mapId];
    if (!ctx.zoneGroups[mapId]) {
      const grp = new THREE.Group();
      grp.name = `Zone_${mapId}`;
      grp.visible = (mapId === (state.zone || 'stupa'));
      scene.add(grp);
      ctx.zoneGroups[mapId] = grp;
    }
    if (mapId === 'stupa') {
      mapInstances.stupa = {
        getHeight: () => 0,
        update: () => {},
      };
    }
  }

  // Initialize state.zoneType
  const initMap = MAPS[state.zone || 'stupa'] || MAPS.stupa;
  state.zone = initMap.id;
  state.zoneType = initMap.type || 'hub';

  // ---------------------------------------------------------------- ctx.world API
  function getMap(id = state.zone) {
    return MAPS[id] || MAPS.stupa;
  }

  function isHub(id = state.zone) {
    if (id === state.zone && state.zoneType) {
      return state.zoneType === 'hub';
    }
    const m = getMap(id);
    return m.type === 'hub';
  }

  function isCombatZone(id = state.zone) {
    if (id === state.zone && state.zoneType) {
      return state.zoneType === 'combat' || state.zoneType === 'dungeon';
    }
    const m = getMap(id);
    return m.type === 'combat' || m.type === 'dungeon';
  }

  function getHeight(x, z, mapId = state.zone) {
    const m = getMap(mapId);
    if (!m || m.type === 'hub') return 0;
    const inst = mapInstances[m.id];
    if (inst && typeof inst.getHeight === 'function') {
      return inst.getHeight(x, z);
    }
    if (ctx.wilderness?.getHeight) {
      return ctx.wilderness.getHeight(x, z);
    }
    return 0;
  }

  function isPointInPolygon(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, zi = poly[i].z;
      const xj = poly[j].x, zj = poly[j].z;
      const intersect = ((zi > z) !== (zj > z)) &&
        (x < ((xj - xi) * (z - zi)) / ((zj - zi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function sampleSpawnPoint(areaId, options = {}) {
    const m = getMap(options.mapId || state.zone);
    const origin = m.origin || { x: 0, z: 0 };
    const areas = m.spawnAreas || {};
    const areaCfg = areas[areaId] || areas.near || { minR: 10, maxR: 25 };
    const minPlayerDist = options.minPlayerDist ?? options.minDistFromPlayer ?? 0;
    const minGateDist = options.minDistFromGate ?? 12;
    const playerPos = state.player?.position;
    const safeZones = m.safeZones || [];
    const colliders = ctx.colliders || [];

    // Polygon area support
    if (Array.isArray(areaCfg.polygon) && areaCfg.polygon.length >= 3) {
      const poly = areaCfg.polygon;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const pt of poly) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.z < minZ) minZ = pt.z;
        if (pt.z > maxZ) maxZ = pt.z;
      }
      for (let attempt = 0; attempt < 40; attempt++) {
        const x = minX + Math.random() * (maxX - minX);
        const z = minZ + Math.random() * (maxZ - minZ);
        if (!isPointInPolygon(x, z, poly)) continue;
        if (isInvalidSpawn(x, z, m.id, safeZones, minGateDist, playerPos, minPlayerDist, colliders)) continue;
        return { x, y: getHeight(x, z, m.id), z };
      }
    }

    const minR = areaCfg.minR ?? 10;
    const maxR = areaCfg.maxR ?? 25;

    for (let attempt = 0; attempt < 30; attempt++) {
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random() * (maxR * maxR - minR * minR) + minR * minR);
      const x = origin.x + Math.cos(theta) * r;
      const z = origin.z + Math.sin(theta) * r;

      if (isInvalidSpawn(x, z, m.id, safeZones, minGateDist, playerPos, minPlayerDist, colliders)) continue;

      return { x, y: getHeight(x, z, m.id), z };
    }

    // Fallback opposite player
    let fallbackTheta = Math.PI * 0.5;
    if (playerPos) {
      const pAngle = Math.atan2(playerPos.z - origin.z, playerPos.x - origin.x);
      fallbackTheta = pAngle + Math.PI;
    }
    const midR = (minR + maxR) * 0.5;
    let fx = origin.x + Math.cos(fallbackTheta) * midR;
    let fz = origin.z + Math.sin(fallbackTheta) * midR;
    for (const sz of safeZones) {
      if (Math.hypot(fx - sz.x, fz - sz.z) < (sz.r || minGateDist)) {
        fallbackTheta += 0.8;
        fx = origin.x + Math.cos(fallbackTheta) * midR;
        fz = origin.z + Math.sin(fallbackTheta) * midR;
      }
    }
    return { x: fx, y: getHeight(fx, fz, m.id), z: fz };
  }

  function isInvalidSpawn(x, z, mapId, safeZones, minGateDist, playerPos, minPlayerDist, colliders) {
    for (let i = 0; i < safeZones.length; i++) {
      const sz = safeZones[i];
      const rad = Math.max(sz.r || 10, minGateDist);
      if (Math.hypot(x - sz.x, z - sz.z) < rad) return true;
    }
    if (minPlayerDist > 0 && playerPos) {
      if (Math.hypot(x - playerPos.x, z - playerPos.z) < minPlayerDist) return true;
    }
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c || (c.zone || 'stupa') !== mapId) continue;
      if (c.type === 'circle') {
        if (Math.hypot(x - c.x, z - c.z) < (c.r || 1) + 1.0) return true;
      } else if (c.type === 'box') {
        if (x >= c.minX - 1 && x <= c.maxX + 1 && z >= c.minZ - 1 && z <= c.maxZ + 1) return true;
      }
    }
    return false;
  }

  const worldApi = {
    getMap,
    getHeight,
    isCombatZone,
    isHub,
    sampleSpawnPoint,
  };
  ctx.world = worldApi;

  // ---------------------------------------------------------------- Lazy Map Loader
  async function ensureMapLoaded(mapId) {
    const m = MAPS[mapId];
    if (!m) return null;
    if (mapInstances[mapId]) return mapInstances[mapId];
    if (typeof m.load !== 'function') {
      mapInstances[mapId] = { getHeight: () => 0, update: () => {} };
      return mapInstances[mapId];
    }
    if (loadingPromises[mapId]) {
      return loadingPromises[mapId];
    }

    loadingPromises[mapId] = (async () => {
      const mod = await m.load();
      const factory = mod.createMap || mod.createWilderness || mod.default;
      const inst = typeof factory === 'function' ? factory(ctx) : {};
      mapInstances[mapId] = inst || { getHeight: () => 0, update: () => {} };
      bus.emit('map:loaded', { mapId });
      return mapInstances[mapId];
    })();

    return loadingPromises[mapId];
  }

  // ---------------------------------------------------------------- DOM Fade Overlay
  let fadeEl = typeof document !== 'undefined' ? document.getElementById('zone-fade') : null;
  if (!fadeEl && typeof document !== 'undefined') {
    fadeEl = document.createElement('div');
    fadeEl.id = 'zone-fade';
    const ui = document.getElementById('ui') || document.body;
    ui.appendChild(fadeEl);
  }

  // ---------------------------------------------------------------- Switch Logic
  function resolveSpawn(mapDef, options = {}) {
    const spawns = mapDef.spawns || {};
    let spawnId = options.spawn;
    if (!spawnId) {
      if (options.southSpawn) spawnId = 'south';
      else if (options.viaTeleport && spawns.teleport) spawnId = 'teleport';
      else spawnId = 'default';
    }
    const sp = spawns[spawnId] || spawns.default || mapDef.origin || { x: 0, z: 0, heading: 0 };
    return {
      x: sp.x ?? mapDef.origin?.x ?? 0,
      z: sp.z ?? mapDef.origin?.z ?? 0,
      heading: sp.heading ?? 0,
    };
  }

  function applyZoneSwitchSync(to, options = {}) {
    const targetMap = MAPS[to];
    if (!targetMap) return;

    const from = state.zone || 'stupa';
    const sameZone = (from === to);
    state.zone = to;
    state.zoneType = targetMap.type || 'hub';

    // Toggle visibility of all zoneGroups
    for (const [id, grp] of Object.entries(ctx.zoneGroups)) {
      if (grp) grp.visible = (id === to);
    }

    const sp = resolveSpawn(targetMap, options);
    const y = getHeight(sp.x, sp.z, to);
    state.player.position.set(sp.x, y, sp.z);
    state.player.heading = sp.heading;
    state.player.velocity.set(0, 0, 0);
    state.player.isMoving = false;

    bus.emit('zone:change', { from, to });

    if (!sameZone && !options.silent) {
      if (targetMap.enterToastKey) {
        bus.emit('toast', { key: targetMap.enterToastKey });
      } else if (targetMap.nameKey) {
        bus.emit('toast', {
          key: 'toast.enterZone',
          params: { name: { key: targetMap.nameKey } },
        });
      }
      bus.emit('sfx', { name: 'bowl' });
    }
  }

  function startTransition(to, spawnId) {
    const targetMap = MAPS[to];
    if (!targetMap) return;
    if (targetMap.debugOnly && !ctx.debug?.enabled) return;
    if (isTransitioning || (state.zone || 'stupa') === to) return;
    isTransitioning = true;

    if (fadeEl) {
      fadeEl.classList.add('is-active');
    }

    const loadPromise = ensureMapLoaded(to);
    const delayPromise = new Promise((resolve) => setTimeout(resolve, 400));

    Promise.all([loadPromise, delayPromise]).then(() => {
      applyZoneSwitchSync(to, {
        viaTeleport: false,
        spawn: spawnId || (targetMap.spawns?.['from-stupa'] ? 'from-stupa' : 'north'),
      });
      if (fadeEl) {
        fadeEl.classList.remove('is-active');
      }
      setTimeout(() => {
        isTransitioning = false;
      }, 400);
    });
  }

  function teleport(to, optionsOrSpawn = {}) {
    const targetMap = MAPS[to];
    if (!targetMap) return Promise.resolve(false);
    if (targetMap.debugOnly && !ctx.debug?.enabled) return Promise.resolve(false);

    const options = typeof optionsOrSpawn === 'string'
      ? { spawn: optionsOrSpawn }
      : { ...optionsOrSpawn };

    const alreadyLoaded = Boolean(mapInstances[to]);

    if (!alreadyLoaded) {
      if (fadeEl && !options.skipFade) {
        fadeEl.classList.add('is-active');
      }
      return ensureMapLoaded(to).then(() => {
        applyZoneSwitchSync(to, { viaTeleport: true, ...options });
        if (fadeEl && !options.skipFade) {
          requestAnimationFrame(() => {
            fadeEl.classList.remove('is-active');
          });
        }
        return true;
      });
    }

    if (fadeEl && !options.skipFade && (state.zone || 'stupa') !== to) {
      fadeEl.classList.add('is-active');
      void fadeEl.offsetWidth;
      requestAnimationFrame(() => {
        fadeEl.classList.remove('is-active');
      });
    }

    applyZoneSwitchSync(to, { viaTeleport: true, ...options });
    return Promise.resolve(true);
  }

  // ---------------------------------------------------------------- Gate Interactables from MAPS
  for (const mapDef of Object.values(MAPS)) {
    const gates = mapDef.gates || [];
    for (const g of gates) {
      const gateVec = new THREE.Vector3(g.x, 0, g.z);
      ctx.interactables.push({
        id: `gate-${mapDef.id}-${g.id}`,
        kind: 'gate',
        zone: mapDef.id,
        action: 'interact',
        labelKey: g.labelKey || 'prompt.interact',
        radius: g.radius ?? 3.2,
        getPosition: () => {
          gateVec.y = getHeight(g.x, g.z, mapDef.id);
          return gateVec;
        },
        isAvailable: () => {
          const destMap = MAPS[g.to];
          if (destMap?.debugOnly && !ctx.debug?.enabled) return false;
          return (state.zone || 'stupa') === mapDef.id && !isTransitioning;
        },
        onInteract: () => startTransition(g.to, g.toGate),
      });
    }
  }

  // ---------------------------------------------------------------- First-Time Map Tutorial
  let tutorialQueue = [];

  function clearTutorialTimers() {
    tutorialQueue = [];
  }

  bus.on('zone:change', ({ to }) => {
    const mapDef = MAPS[to];
    if (mapDef?.tutorialKey && Array.isArray(mapDef.tutorials)) {
      try {
        const seen = localStorage.getItem(mapDef.tutorialKey);
        if (!seen) {
          localStorage.setItem(mapDef.tutorialKey, '1');
          tutorialQueue = mapDef.tutorials.map((t) => ({ ...t }));
        }
      } catch { /* ignore */ }
    } else {
      clearTutorialTimers();
    }
  });

  bus.on('merit:reset', () => {
    clearTutorialTimers();
    try {
      for (const m of Object.values(MAPS)) {
        if (m.tutorialKey) localStorage.removeItem(m.tutorialKey);
      }
    } catch { /* ignore */ }
  });

  function list() {
    return Object.values(MAPS)
      .filter((m) => !m.debugOnly || ctx.debug?.enabled)
      .map((m) => ({
        id: m.id,
        type: m.type,
        loaded: Boolean(mapInstances[m.id]),
        level: m.level,
      }));
  }

  const api = {
    update(dt) {
      const currentInst = mapInstances[state.zone];
      if (currentInst && typeof currentInst.update === 'function') {
        currentInst.update(dt);
      }

      if (tutorialQueue.length > 0 && MAPS[state.zone]?.tutorialKey) {
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
    list,
    ensureMapLoaded,
  };

  ctx.zones = api;
  ctx.debug?.register('zones', {
    teleport: (to, spawnId) => api.teleport(to, spawnId),
    list: () => api.list(),
  });
  ctx.debug?.register('world', {
    getHeight: (x, z) => worldApi.getHeight(x, z),
    getMap: (id) => worldApi.getMap(id),
    isCombatZone: () => worldApi.isCombatZone(),
    isHub: () => worldApi.isHub(),
  });
  return api;
}
