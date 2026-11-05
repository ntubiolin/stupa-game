/**
 * Ground loot visuals, rarity beams, DOM nameplates, and pickup handling.
 * - Shared geometries per slot category (no per-drop geometry allocation).
 * - Parabolic bounce on drop.
 * - Additive cylindrical loot beams for blessed (#5b8cff), rare (#ffd84a), and terma (#ff8a1f).
 * - ZERO PointLights used (strictly within the scene light budget).
 * - DOM labels shown within 4m of player or while holding Alt.
 * - Interactable kind: 'loot' (lower priority than NPC and gate); turquoise auto-picks up.
 * - Caps active ground items at 40 (evicting oldest normal item first); clears on zone change.
 */
import * as THREE from 'three';

const MAX_GROUND_ITEMS = 40;
const LABEL_SHOW_DIST = 4.0;
const TURQUOISE_MAGNET_DIST = 4.5;
const TURQUOISE_PICKUP_DIST = 1.25;
const GEAR_INTERACT_RADIUS = 2.2;

const RARITY_COLORS = {
  normal: '#f3f4f6',
  blessed: '#5b8cff',
  rare: '#ffd84a',
  terma: '#ff8a1f',
  turquoise: '#2dd4bf',
};

const RARITY_HEX = {
  normal: 0xe5e7eb,
  blessed: 0x5b8cff,
  rare: 0xffd84a,
  terma: 0xff8a1f,
  turquoise: 0x14b8a6,
};

export function createGroundLoot(ctx) {
  const { scene, camera, state, bus, interactables, i18n } = ctx;

  const rootGroup = new THREE.Group();
  rootGroup.name = 'GroundLoot';
  scene.add(rootGroup);

  // ---------------------------------------------------------------- Shared Geometries & Materials
  const sharedGeos = {
    rod: new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8),
    tip: new THREE.OctahedronGeometry(0.065, 0),
    collar: new THREE.TorusGeometry(0.055, 0.015, 6, 14),
    bellCone: new THREE.ConeGeometry(0.095, 0.16, 10),
    pouch: new THREE.SphereGeometry(0.11, 10, 8),
    malaRing: new THREE.TorusGeometry(0.095, 0.022, 8, 18),
    gem: new THREE.OctahedronGeometry(0.085, 0),
    halo: new THREE.RingGeometry(0.16, 0.23, 20),
    beam: new THREE.CylinderGeometry(0.045, 0.11, 3.2, 12, 1, true),
    beamTerma: new THREE.CylinderGeometry(0.065, 0.16, 4.6, 14, 1, true),
  };
  // Shift beam geometry upward so y=0 is at the base
  sharedGeos.beam.translate(0, 1.6, 0);
  sharedGeos.beamTerma.translate(0, 2.3, 0);

  const sharedMats = {
    bronze: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.32,
      metalness: 0.85,
      emissive: 0x78350f,
      emissiveIntensity: 0.6,
    }),
    silver: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.9,
      emissive: 0x334155,
      emissiveIntensity: 0.5,
    }),
    cloth: new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.65,
      metalness: 0.1,
      emissive: 0x450a0a,
      emissiveIntensity: 0.5,
    }),
    goldCord: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.3,
      metalness: 0.85,
      emissive: 0x92400e,
      emissiveIntensity: 0.8,
    }),
    turquoise: new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      roughness: 0.18,
      metalness: 0.15,
      emissive: 0x0d9488,
      emissiveIntensity: 1.8,
      toneMapped: false,
    }),
    beamBlessed: new THREE.MeshBasicMaterial({
      color: 0x5b8cff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    beamRare: new THREE.MeshBasicMaterial({
      color: 0xffd84a,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    beamTerma: new THREE.MeshBasicMaterial({
      color: 0xff8a1f,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    haloNormal: new THREE.MeshBasicMaterial({
      color: 0xe5e7eb,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    haloBlessed: new THREE.MeshBasicMaterial({
      color: 0x5b8cff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    haloRare: new THREE.MeshBasicMaterial({
      color: 0xffd84a,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    haloTerma: new THREE.MeshBasicMaterial({
      color: 0xff8a1f,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    haloTurquoise: new THREE.MeshBasicMaterial({
      color: 0x14b8a6,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  };

  function buildDropVisual(item) {
    const wrapper = new THREE.Group();
    const modelGroup = new THREE.Group();
    wrapper.add(modelGroup);

    if (item.kind === 'turquoise') {
      const gem = new THREE.Mesh(sharedGeos.gem, sharedMats.turquoise);
      modelGroup.add(gem);
    } else if (item.slot === 'mainhand') {
      const rod = new THREE.Mesh(sharedGeos.rod, sharedMats.bronze);
      rod.rotation.z = Math.PI / 3;
      const tip1 = new THREE.Mesh(sharedGeos.tip, sharedMats.goldCord);
      tip1.position.set(-0.14, 0.08, 0);
      const tip2 = new THREE.Mesh(sharedGeos.tip, sharedMats.goldCord);
      tip2.position.set(0.14, -0.08, 0);
      modelGroup.add(rod, tip1, tip2);
    } else if (item.slot === 'offhand') {
      const bell = new THREE.Mesh(sharedGeos.bellCone, sharedMats.bronze);
      const handle = new THREE.Mesh(sharedGeos.collar, sharedMats.goldCord);
      handle.position.y = 0.1;
      modelGroup.add(bell, handle);
    } else if (item.slot === 'neck' || item.slot === 'ring') {
      const ring = new THREE.Mesh(
        sharedGeos.malaRing,
        item.slot === 'ring' ? sharedMats.silver : sharedMats.goldCord
      );
      ring.rotation.x = Math.PI / 2.5;
      const bead = new THREE.Mesh(sharedGeos.tip, sharedMats.turquoise);
      bead.scale.setScalar(0.6);
      bead.position.set(0, 0.04, 0.08);
      modelGroup.add(ring, bead);
    } else {
      // Armor / attire bundle (head, body, hands, feet)
      const bundle = new THREE.Mesh(sharedGeos.pouch, sharedMats.cloth);
      bundle.scale.set(1.2, 0.85, 1.0);
      const cord = new THREE.Mesh(sharedGeos.collar, sharedMats.goldCord);
      cord.rotation.x = Math.PI / 2;
      cord.scale.setScalar(1.65);
      modelGroup.add(bundle, cord);
    }

    // Ground halo ring
    let haloMat = sharedMats.haloNormal;
    if (item.kind === 'turquoise') haloMat = sharedMats.haloTurquoise;
    else if (item.rarity === 'blessed') haloMat = sharedMats.haloBlessed;
    else if (item.rarity === 'rare') haloMat = sharedMats.haloRare;
    else if (item.rarity === 'terma') haloMat = sharedMats.haloTerma;

    const halo = new THREE.Mesh(sharedGeos.halo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.03;
    wrapper.add(halo);

    // Rarity beam (no PointLight!)
    let beam = null;
    if (item.rarity === 'blessed') {
      beam = new THREE.Mesh(sharedGeos.beam, sharedMats.beamBlessed);
      wrapper.add(beam);
    } else if (item.rarity === 'rare') {
      beam = new THREE.Mesh(sharedGeos.beam, sharedMats.beamRare);
      wrapper.add(beam);
    } else if (item.rarity === 'terma') {
      beam = new THREE.Mesh(sharedGeos.beamTerma, sharedMats.beamTerma);
      wrapper.add(beam);
    }

    return { wrapper, modelGroup, halo, beam };
  }

  // ---------------------------------------------------------------- DOM Nameplate Layer
  const labelContainer = document.createElement('div');
  labelContainer.className = 'ground-loot-labels';
  Object.assign(labelContainer.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '18',
    overflow: 'hidden',
  });
  document.body.appendChild(labelContainer);

  function createLabelElement(item) {
    const el = document.createElement('div');
    el.className = `ground-loot-label rarity-${item.rarity || 'normal'}`;
    const color = RARITY_COLORS[item.rarity] || RARITY_COLORS.normal;
    Object.assign(el.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      transform: 'translate(-50%, -100%)',
      padding: '2px 8px',
      borderRadius: '4px',
      background: 'rgba(12, 10, 18, 0.82)',
      border: `1px solid ${color}`,
      color,
      fontSize: '12px',
      fontWeight: item.rarity === 'terma' || item.rarity === 'rare' ? '700' : '500',
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
      textShadow: '0 1px 2px rgba(0,0,0,0.95)',
      boxShadow:
        item.rarity === 'terma'
          ? '0 0 10px rgba(255, 138, 31, 0.45)'
          : '0 2px 6px rgba(0,0,0,0.6)',
      display: 'none',
      pointerEvents: 'none',
    });
    el.textContent = item.name || ctx.loot?.formatItemName?.(item) || '';
    labelContainer.appendChild(el);
    return el;
  }

  // ---------------------------------------------------------------- Alt Key Tracking
  let altKeyDown = false;
  let forceShowLabels = false;

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
      altKeyDown = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
      altKeyDown = false;
    }
  });
  window.addEventListener('blur', () => {
    altKeyDown = false;
  });

  function isAltHeld() {
    return (
      altKeyDown ||
      forceShowLabels ||
      Boolean(ctx.input?.isDown?.('showLoot'))
    );
  }

  // ---------------------------------------------------------------- Active Ground Items
  const groundItems = [];
  const projVec = new THREE.Vector3();

  function removeGroundItemAt(idx) {
    const entry = groundItems[idx];
    if (!entry) return;
    rootGroup.remove(entry.wrapper);
    if (entry.labelEl && entry.labelEl.parentNode) {
      entry.labelEl.parentNode.removeChild(entry.labelEl);
    }
    if (entry.interactable) {
      const iIdx = interactables.indexOf(entry.interactable);
      if (iIdx !== -1) interactables.splice(iIdx, 1);
    }
    groundItems.splice(idx, 1);
  }

  function clearAll() {
    for (let i = groundItems.length - 1; i >= 0; i--) {
      removeGroundItemAt(i);
    }
  }

  function enforceCap() {
    while (groundItems.length >= MAX_GROUND_ITEMS) {
      // Evict oldest normal item first; fallback to oldest non-terma, then oldest
      let idx = groundItems.findIndex((g) => g.item.rarity === 'normal');
      if (idx === -1) {
        idx = groundItems.findIndex((g) => g.item.rarity !== 'terma');
      }
      if (idx === -1) idx = 0;
      removeGroundItemAt(idx);
    }
  }

  function pickupEntry(entry) {
    const idx = groundItems.indexOf(entry);
    if (idx === -1) return false;

    const { item } = entry;
    if (item.kind === 'turquoise') {
      ctx.loot?.addTurquoise?.(item.amount || 1);
      bus.emit('loot:pickup', { item });
      bus.emit('sfx', { name: 'pickup' });
      bus.emit('toast', {
        key: 'toast.turquoisePickup',
        params: { n: item.amount || 1 },
        kind: 'merit',
      });
      removeGroundItemAt(idx);
      return true;
    }

    const stored = ctx.loot ? ctx.loot.storeItem(item) : true;
    if (!stored) {
      return false;
    }

    bus.emit('loot:pickup', { item });
    bus.emit('sfx', { name: 'pickupGear' });
    bus.emit('toast', {
      key: 'toast.lootPickup',
      params: { name: item.name || ctx.loot?.formatItemName?.(item) || '' },
      kind: 'merit',
    });
    removeGroundItemAt(idx);
    return true;
  }

  function spawnGroundLoot({ item, position, startPos }) {
    if (!item) return null;
    enforceCap();

    const px = position?.x ?? state.player.position.x;
    const pz = position?.z ?? state.player.position.z;
    const groundY = ctx.world ? ctx.world.getHeight(px, pz) : position?.y || 0;

    const endVec = new THREE.Vector3(px, groundY, pz);
    const startVec = startPos
      ? new THREE.Vector3(startPos.x, startPos.y, startPos.z)
      : new THREE.Vector3(px, groundY + 0.9, pz);

    const { wrapper, modelGroup, halo, beam } = buildDropVisual(item);
    wrapper.position.copy(startVec);
    rootGroup.add(wrapper);

    const labelEl = createLabelElement(item);

    const entry = {
      item,
      wrapper,
      modelGroup,
      halo,
      beam,
      labelEl,
      startPos: startVec,
      endPos: endVec,
      position: wrapper.position,
      age: 0,
      flightDur: 0.36,
      bounceDur: 0.18,
      arcHeight: 1.05,
      bounceHeight: 0.24,
      landed: false,
      termaSfxPlayed: false,
      phase: Math.random() * Math.PI * 2,
      zone: state.zone || 'stupa',
      interactable: null,
    };

    if (item.kind !== 'turquoise') {
      const interactable = {
        id: `loot_${item.uid}`,
        kind: 'loot',
        zone: entry.zone,
        priority: -10, // Lower priority than NPCs and gates
        position: entry.endPos,
        getPosition: () => entry.endPos,
        radius: GEAR_INTERACT_RADIUS,
        action: 'interact',
        labelKey: 'prompt.pickupLoot',
        promptKey: 'prompt.pickupLoot',
        get labelParams() {
          return {
            name: item.name || ctx.loot?.formatItemName?.(item) || '',
          };
        },
        get promptParams() {
          return {
            name: item.name || ctx.loot?.formatItemName?.(item) || '',
          };
        },
        isAvailable: () =>
          state.mode === 'play' &&
          !state.uiOpen &&
          entry.zone === (state.zone || 'stupa') &&
          groundItems.includes(entry),
        enabled: () =>
          state.mode === 'play' &&
          !state.uiOpen &&
          entry.zone === (state.zone || 'stupa') &&
          groundItems.includes(entry),
        onInteract: () => {
          pickupEntry(entry);
        },
      };
      entry.interactable = interactable;
      interactables.push(interactable);
    }

    // Play Terma drop sound immediately on spawn and a chime on land
    if (item.rarity === 'terma') {
      bus.emit('sfx', { name: 'terma' });
      entry.termaSfxPlayed = true;
    }

    groundItems.push(entry);
    return entry;
  }

  // ---------------------------------------------------------------- Bus Listeners
  bus.on('loot:drop', (payload) => {
    if (!payload || !payload.item) return;
    spawnGroundLoot(payload);
  });

  bus.on('zone:changed', () => {
    clearAll();
  });

  bus.on('merit:reset', () => {
    clearAll();
  });

  bus.on('lang:changed', () => {
    for (let i = 0; i < groundItems.length; i++) {
      const g = groundItems[i];
      if (g.labelEl) {
        g.labelEl.textContent =
          g.item.name || ctx.loot?.formatItemName?.(g.item) || '';
      }
    }
  });

  // ---------------------------------------------------------------- Per-frame Update
  function projectToScreen(x, y, z) {
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    projVec.set(x, y, z);
    projVec.project(camera);
    if (projVec.z > 1 || projVec.z < -1) return null;
    const sx = (projVec.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
    return { x: sx, y: sy };
  }

  function update(dt) {
    const ppos = state.player.position;
    const currentZone = state.zone || 'stupa';
    const altHeld = isAltHeld();

    for (let i = groundItems.length - 1; i >= 0; i--) {
      const g = groundItems[i];
      g.age += dt;

      const totalFlight = g.flightDur + g.bounceDur;
      if (g.age < g.flightDur) {
        // Primary parabolic arc
        const u = Math.min(1, g.age / g.flightDur);
        g.wrapper.position.lerpVectors(g.startPos, g.endPos, u);
        g.wrapper.position.y += 4 * u * (1 - u) * g.arcHeight;
        g.modelGroup.rotation.x += dt * 7.0;
        g.modelGroup.rotation.y += dt * 5.0;
      } else if (g.age < totalFlight) {
        // Secondary small bounce on landing
        const u2 = Math.min(1, (g.age - g.flightDur) / g.bounceDur);
        g.wrapper.position.copy(g.endPos);
        g.wrapper.position.y += 4 * u2 * (1 - u2) * g.bounceHeight;
        g.modelGroup.rotation.x *= 0.85;
        g.modelGroup.rotation.y += dt * 2.5;
      } else {
        if (!g.landed) {
          g.landed = true;
          g.wrapper.position.copy(g.endPos);
          g.modelGroup.rotation.set(0, g.phase, 0);
        }
        const bob = Math.sin(state.elapsed * 2.4 + g.phase) * 0.045;
        g.modelGroup.position.y = 0.2 + bob;
        g.modelGroup.rotation.y += dt * 1.1;
      }

      // Auto-pickup for turquoise currency
      if (g.item.kind === 'turquoise' && g.zone === currentZone && g.age >= 0.25) {
        const dx = ppos.x - g.wrapper.position.x;
        const dz = ppos.z - g.wrapper.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= TURQUOISE_PICKUP_DIST) {
          pickupEntry(g);
          continue;
        } else if (dist <= TURQUOISE_MAGNET_DIST && g.landed) {
          const pull = Math.min(1, dt * 9.5);
          g.endPos.x += dx * pull;
          g.endPos.z += dz * pull;
          g.endPos.y = ctx.world
            ? ctx.world.getHeight(g.endPos.x, g.endPos.z)
            : g.endPos.y;
          g.wrapper.position.copy(g.endPos);
        }
      }

      // Update DOM nameplate visibility & screen projection
      if (g.labelEl) {
        if (state.mode !== 'play' || g.zone !== currentZone) {
          g.labelEl.style.display = 'none';
        } else {
          const dx = ppos.x - g.endPos.x;
          const dz = ppos.z - g.endPos.z;
          const distSq = dx * dx + dz * dz;
          const show = altHeld || distSq <= LABEL_SHOW_DIST * LABEL_SHOW_DIST;
          if (!show) {
            g.labelEl.style.display = 'none';
          } else {
            const pt = projectToScreen(
              g.wrapper.position.x,
              g.wrapper.position.y + 0.55,
              g.wrapper.position.z
            );
            if (!pt) {
              g.labelEl.style.display = 'none';
            } else {
              if (!g.labelEl.textContent) {
                g.labelEl.textContent =
                  g.item.name || ctx.loot?.formatItemName?.(g.item) || '';
              }
              g.labelEl.style.display = 'block';
              g.labelEl.style.left = `${pt.x.toFixed(1)}px`;
              g.labelEl.style.top = `${pt.y.toFixed(1)}px`;
            }
          }
        }
      }
    }
  }

  const api = {
    update,
    clear: clearAll,
    list: () =>
      groundItems.map((g) => ({
        uid: g.item.uid,
        name: g.item.name,
        rarity: g.item.rarity,
        slot: g.item.slot,
        kind: g.item.kind || 'gear',
        x: +g.endPos.x.toFixed(2),
        z: +g.endPos.z.toFixed(2),
        labelVisible: g.labelEl?.style.display === 'block',
      })),
    pickupNearest: () => {
      const ppos = state.player.position;
      let best = null;
      let bestDistSq = GEAR_INTERACT_RADIUS * GEAR_INTERACT_RADIUS;
      for (let i = 0; i < groundItems.length; i++) {
        const g = groundItems[i];
        const dx = ppos.x - g.endPos.x;
        const dz = ppos.z - g.endPos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq <= bestDistSq) {
          bestDistSq = dSq;
          best = g;
        }
      }
      if (best) return pickupEntry(best);
      return false;
    },
    setAlt: (bool) => {
      forceShowLabels = Boolean(bool);
      return forceShowLabels;
    },
    groundItems,
  };

  ctx.groundLoot = api;

  ctx.debug?.register('groundLoot', {
    list: () => api.list(),
    clear: () => api.clear(),
    pickupNearest: () => api.pickupNearest(),
    setAlt: (b) => api.setAlt(b),
  });

  return api;
}
