/**
 * Shrines (神龕) — procedural Tibetan mani stone mound + prayer flag pole with
 * glowing finial top. Spawns 2 random shrines per combat map from `mapDef.shrineSpots`.
 *
 * 5 Shrine Types:
 *  - diligence (精進): Cooldown Reduction +25% for 20s (can exceed 40% cap)
 *  - vajra     (金剛): Invulnerable to damage for 8s
 *  - wisdom    (智慧): EXP ×1.5 for 60s
 *  - amrita    (甘露): Skills/Mantra cost 0 MP for 10s
 *  - fortune   (福德): Turquoise & Item Find ×2 for 60s
 *
 * Strictly zero PointLights (uses additive/emissive meshes only).
 */
import * as THREE from 'three';
import '../i18n/elites.js';

export const SHRINE_DEFS = {
  diligence: {
    kind: 'diligence',
    nameKey: 'shrine.diligence',
    effectKey: 'shrine.diligence.effect',
    duration: 20,
    stats: { cdrAdd: 0.25 },
    color: 0xf59e0b,
  },
  vajra: {
    kind: 'vajra',
    nameKey: 'shrine.vajra',
    effectKey: 'shrine.vajra.effect',
    duration: 8,
    stats: { invuln: true },
    color: 0xfde047,
  },
  wisdom: {
    kind: 'wisdom',
    nameKey: 'shrine.wisdom',
    effectKey: 'shrine.wisdom.effect',
    duration: 60,
    stats: { expMult: 1.5 },
    color: 0x38bdf8,
  },
  amrita: {
    kind: 'amrita',
    nameKey: 'shrine.amrita',
    effectKey: 'shrine.amrita.effect',
    duration: 10,
    stats: { freeMp: true },
    color: 0x34d399,
  },
  fortune: {
    kind: 'fortune',
    nameKey: 'shrine.fortune',
    effectKey: 'shrine.fortune.effect',
    duration: 60,
    stats: { findMult: 2.0 },
    color: 0xa855f7,
  },
};

export const SHRINE_KINDS = Object.keys(SHRINE_DEFS);

export function createShrines(ctx) {
  const { scene, state, bus, interactables } = ctx;

  const shrineGroup = new THREE.Group();
  shrineGroup.name = 'Shrines';
  scene.add(shrineGroup);

  // ---------------------------------------------------------------- Screen Flash Overlay
  let flashEl =
    typeof document !== 'undefined' ? document.getElementById('shrine-flash') : null;
  if (!flashEl && typeof document !== 'undefined') {
    flashEl = document.createElement('div');
    flashEl.id = 'shrine-flash';
    flashEl.className = 'shrine-flash';
    Object.assign(flashEl.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '48',
      background:
        'radial-gradient(circle at 50% 50%, rgba(255, 248, 200, 0.72) 0%, rgba(245, 190, 66, 0.35) 55%, rgba(245, 190, 66, 0) 100%)',
      opacity: '0',
      transition: 'opacity 0.42s ease-out',
    });
    const uiRoot = document.getElementById('ui') || document.body;
    uiRoot.appendChild(flashEl);
  }

  let flashTimer = null;
  function triggerFlash() {
    if (!flashEl) return;
    flashEl.style.transition = 'none';
    flashEl.style.opacity = '0.9';
    void flashEl.offsetWidth;
    flashEl.style.transition = 'opacity 0.55s ease-out';
    flashEl.style.opacity = '0';
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      if (flashEl) flashEl.style.opacity = '0';
      flashTimer = null;
    }, 600);
  }

  // ---------------------------------------------------------------- Shared 3D Geometries & Materials
  const stoneGeos = [
    new THREE.CylinderGeometry(0.88, 1.05, 0.28, 9),
    new THREE.CylinderGeometry(0.68, 0.84, 0.25, 8),
    new THREE.CylinderGeometry(0.48, 0.64, 0.24, 8),
    new THREE.CylinderGeometry(0.32, 0.45, 0.22, 7),
  ];
  const poleGeo = new THREE.CylinderGeometry(0.038, 0.052, 2.65, 8);
  poleGeo.translate(0, 1.325, 0);

  const flagGeo = new THREE.PlaneGeometry(0.55, 0.22);
  flagGeo.translate(0.28, 0, 0);

  const finialConeGeo = new THREE.ConeGeometry(0.14, 0.32, 8);
  const finialOrbGeo = new THREE.SphereGeometry(0.15, 12, 10);
  const finialHaloGeo = new THREE.SphereGeometry(0.32, 12, 10);
  const groundRingGeo = new THREE.RingGeometry(1.15, 1.35, 32);
  groundRingGeo.rotateX(-Math.PI / 2);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3cd,
    roughness: 0.85,
    metalness: 0.05,
  });
  const carvedStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe7e5e0,
    roughness: 0.78,
    metalness: 0.08,
    emissive: 0x3b2f1e,
    emissiveIntensity: 0.25,
  });
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    roughness: 0.82,
  });

  const flagColors = [0x3b82f6, 0xffffff, 0xef4444, 0x10b981, 0xf59e0b];
  const flagMats = flagColors.map(
    (col) =>
      new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.75,
        side: THREE.DoubleSide,
      })
  );

  function buildShrineVisual(def) {
    const group = new THREE.Group();

    // Stacked mani stones
    let curY = 0.14;
    for (let i = 0; i < stoneGeos.length; i++) {
      const m = new THREE.Mesh(
        stoneGeos[i],
        i % 2 === 0 ? stoneMat : carvedStoneMat
      );
      m.position.y = curY;
      m.rotation.y = i * 0.85;
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
      curY += 0.22;
    }

    // Central wooden prayer pole
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.castShadow = true;
    group.add(pole);

    // 5 Tibetan prayer flags along the upper pole
    const flags = [];
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(flagGeo, flagMats[i]);
      f.position.set(0, 2.25 - i * 0.24, 0);
      f.rotation.y = (i * Math.PI * 2) / 5;
      group.add(f);
      flags.push(f);
    }

    // Glowing finial top (additive, zero PointLight)
    const coreMat = new THREE.MeshBasicMaterial({
      color: def.color,
      toneMapped: false,
    });
    const finialCone = new THREE.Mesh(finialConeGeo, coreMat);
    finialCone.position.y = 2.75;
    group.add(finialCone);

    const finialOrb = new THREE.Mesh(finialOrbGeo, coreMat);
    finialOrb.position.y = 2.58;
    group.add(finialOrb);

    const glowMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const glowHalo = new THREE.Mesh(finialHaloGeo, glowMat);
    glowHalo.position.y = 2.66;
    group.add(glowHalo);

    const ringMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const groundRing = new THREE.Mesh(groundRingGeo, ringMat);
    groundRing.position.y = 0.04;
    group.add(groundRing);

    return {
      group,
      flags,
      coreMat,
      glowMat,
      ringMat,
      glowHalo,
      groundRing,
    };
  }

  // ---------------------------------------------------------------- Active Shrines
  const activeShrines = [];
  let shrineIdCounter = 1;

  function clearShrines() {
    for (let i = activeShrines.length - 1; i >= 0; i--) {
      const s = activeShrines[i];
      shrineGroup.remove(s.visual.group);
      s.visual.coreMat.dispose();
      s.visual.glowMat.dispose();
      s.visual.ringMat.dispose();
      if (s.interactable) {
        const idx = interactables.indexOf(s.interactable);
        if (idx !== -1) interactables.splice(idx, 1);
      }
    }
    activeShrines.length = 0;
  }

  function activateShrine(shrine) {
    if (!shrine || shrine.used) return false;
    shrine.used = true;

    // Dim top glow and ground ring
    shrine.visual.coreMat.color.setHex(0x57534e);
    shrine.visual.glowMat.opacity = 0.06;
    shrine.visual.ringMat.opacity = 0.05;
    shrine.visual.groundRing.visible = false;

    // Remove from interactables
    if (shrine.interactable) {
      const idx = interactables.indexOf(shrine.interactable);
      if (idx !== -1) interactables.splice(idx, 1);
    }

    const def = shrine.def;
    ctx.vitals?.addBuff(`shrine_${def.kind}`, { ...def.stats }, def.duration);

    triggerFlash();
    bus.emit('sfx', { name: 'bowl' });
    bus.emit('sfx', { name: 'levelup' });
    bus.emit('toast', {
      key: 'toast.shrineActivate',
      params: {
        name: { key: def.nameKey },
        effect: { key: def.effectKey },
      },
      kind: 'merit',
    });
    bus.emit('shrine:activate', { kind: def.kind, duration: def.duration });
    return true;
  }

  function spawnShrineAt(kind, x, z, zone = state.zone || 'wild') {
    const resolvedKind = SHRINE_DEFS[kind]
      ? kind
      : SHRINE_KINDS[Math.floor(Math.random() * SHRINE_KINDS.length)];
    const def = SHRINE_DEFS[resolvedKind];
    const y = ctx.world ? ctx.world.getHeight(x, z, zone) : 0;

    const id = `shrine_${shrineIdCounter++}`;
    const visual = buildShrineVisual(def);
    visual.group.position.set(x, y, z);
    shrineGroup.add(visual.group);

    const posVec = new THREE.Vector3(x, y, z);
    const shrine = {
      id,
      kind: resolvedKind,
      def,
      zone,
      x,
      y,
      z,
      position: posVec,
      used: false,
      visual,
      phase: Math.random() * Math.PI * 2,
      interactable: null,
    };

    const interactable = {
      id,
      kind: 'shrine',
      zone,
      priority: 2,
      radius: 2.5,
      action: 'interact',
      labelKey: 'prompt.shrine',
      promptKey: 'prompt.shrine',
      labelParams: { name: { key: def.nameKey } },
      promptParams: { name: { key: def.nameKey } },
      getPosition: () => posVec,
      isAvailable: () =>
        !shrine.used &&
        state.mode === 'play' &&
        !state.uiOpen &&
        (state.zone || 'stupa') === shrine.zone,
      enabled: () =>
        !shrine.used &&
        state.mode === 'play' &&
        !state.uiOpen &&
        (state.zone || 'stupa') === shrine.zone,
      onInteract: () => activateShrine(shrine),
    };

    shrine.interactable = interactable;
    interactables.push(interactable);
    activeShrines.push(shrine);
    return shrine;
  }

  function spawnMapShrines(mapId = state.zone) {
    clearShrines();
    if (!ctx.world?.isCombatZone(mapId)) return;

    const mapDef = ctx.world.getMap(mapId);
    const spots = mapDef?.shrineSpots;
    if (!Array.isArray(spots) || spots.length === 0) return;

    const origin = mapDef?.origin || { x: 0, z: 0 };
    const pool = [...spots];
    const count = Math.min(2, pool.length);

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const spot = pool.splice(idx, 1)[0];
      // Support spots defined relative to mapDef.origin or in world coordinates
      const isRelative = Math.hypot(spot.x, spot.z) < 200 && Math.hypot(origin.x, origin.z) >= 200;
      const wx = isRelative ? origin.x + spot.x : spot.x + (origin.x === 0 ? 0 : 0);
      const wz = isRelative ? origin.z + spot.z : spot.z + (origin.z === 0 ? 0 : 0);
      const randKind = SHRINE_KINDS[Math.floor(Math.random() * SHRINE_KINDS.length)];
      spawnShrineAt(randKind, wx, wz, mapDef.id);
    }
  }

  // Spawn if starting in a combat zone
  if (ctx.world?.isCombatZone()) {
    spawnMapShrines(state.zone);
  }

  bus.on('zone:change', ({ to }) => {
    spawnMapShrines(to || state.zone);
  });
  bus.on('zone:changed', ({ to }) => {
    spawnMapShrines(to || state.zone);
  });
  bus.on('merit:reset', () => {
    clearShrines();
  });

  // ---------------------------------------------------------------- Update Loop
  function update(dt) {
    const currentZone = state.zone || 'stupa';
    const windStr = state.wind?.strength ?? 0.5;

    for (let i = 0; i < activeShrines.length; i++) {
      const s = activeShrines[i];
      const vis = s.zone === currentZone;
      s.visual.group.visible = vis;
      if (!vis) continue;

      // Keep height synced in case map terrain finished loading asynchronously
      const groundY = ctx.world ? ctx.world.getHeight(s.x, s.z, s.zone) : s.y;
      if (Math.abs(groundY - s.y) > 0.01) {
        s.y = groundY;
        s.position.y = groundY;
        s.visual.group.position.y = groundY;
      }

      // Gentle flag flutter
      for (let f = 0; f < s.visual.flags.length; f++) {
        const flag = s.visual.flags[f];
        flag.rotation.z =
          Math.sin(state.elapsed * (4.0 + f * 0.5) + s.phase + f) *
          0.12 *
          windStr;
      }

      // Finial pulse when unused
      if (!s.used) {
        const pulse = 0.85 + 0.25 * Math.sin(state.elapsed * 3.2 + s.phase);
        s.visual.glowHalo.scale.setScalar(pulse);
        s.visual.glowMat.opacity = 0.45 + 0.2 * Math.sin(state.elapsed * 3.2 + s.phase);
        s.visual.groundRing.rotation.z += dt * 0.6;
      }
    }
  }

  // ---------------------------------------------------------------- Debug & Public API
  function spawn(kind) {
    const p = state.player;
    const h = p?.heading || 0;
    const px = (p?.position?.x ?? 0) - Math.sin(h) * 2.0;
    const pz = (p?.position?.z ?? 0) - Math.cos(h) * 2.0;
    const s = spawnShrineAt(kind, px, pz, state.zone || 'stupa');
    return {
      id: s.id,
      kind: s.kind,
      x: Number(s.x.toFixed(2)),
      z: Number(s.z.toFixed(2)),
      used: s.used,
    };
  }

  function activateNearest() {
    const ppos = state.player?.position || { x: 0, z: 0 };
    const currentZone = state.zone || 'stupa';
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < activeShrines.length; i++) {
      const s = activeShrines[i];
      if (s.used || s.zone !== currentZone) continue;
      const d = Math.hypot(s.x - ppos.x, s.z - ppos.z);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    if (!best) return false;
    return activateShrine(best);
  }

  function list() {
    return activeShrines.map((s) => ({
      id: s.id,
      kind: s.kind,
      zone: s.zone,
      x: Number(s.x.toFixed(2)),
      z: Number(s.z.toFixed(2)),
      used: s.used,
    }));
  }

  const api = {
    update,
    spawn,
    activateNearest,
    list,
    clear: clearShrines,
  };

  ctx.shrines = api;
  ctx.debug?.register('shrines', {
    spawn: (kind) => api.spawn(kind),
    activateNearest: () => api.activateNearest(),
    list: () => api.list(),
    clear: () => api.clear(),
  });

  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.shrines = api;
  }

  return api;
}
