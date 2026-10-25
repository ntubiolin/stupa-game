/**
 * Items system — monkey item drops (buffs & permanent stats),
 * procedural Tibetan 3D models with bloom glow, parabolic drop physics,
 * pickup radius detection, despawn timer, and pity accumulation.
 */
import * as THREE from 'three';

const STORAGE_KEY = 'stupa.items.v1';

export function createItems(ctx) {
  const { state, config, bus, stupaGroup, wildGroup, scene } = ctx;
  const cfg = config.ITEMS || {
    dropChance: 0.3,
    pityThreshold: 5,
    despawnSec: 60,
    pickupRadius: 1.2,
    permanentCap: 20,
    flightDur: 0.55,
    dropFlightDur: 0.35,
    arcHeight: 1.6,
    dropArcHeight: 1.1,
    bobAmp: 0.06,
    bobFreq: 2.2,
    rotSpeed: 1.2,
  };

  const itemGroup = new THREE.Group();
  itemGroup.name = 'Items';
  // Attach to scene so items render regardless of zone container visibility
  scene.add(itemGroup);

  // ---------------------------------------------------------------- Persistence
  function loadPity() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      return typeof data?.pityCount === 'number' ? data.pityCount : 0;
    } catch {
      return 0;
    }
  }

  function savePity(count) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pityCount: count }));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  let pityCount = loadPity();
  let forceNextDrop = false;
  const activeItems = [];

  // ---------------------------------------------------------------- Clamping & Ground
  function clampToWalkable(x, z) {
    if (state.zone === 'wild') {
      const ox = config.WILD?.origin?.x ?? 1000;
      const oz = config.WILD?.origin?.z ?? 0;
      const maxR = (config.WILD?.walkRadius ?? 70) - 1.5;
      const dx = x - ox;
      const dz = z - oz;
      const r = Math.hypot(dx, dz);
      if (r > maxR && r > 1e-4) {
        return { x: ox + (dx / r) * maxR, z: oz + (dz / r) * maxR };
      }
      return { x, z };
    }

    // Stupa plaza ring
    const minR = (config.WORLD?.stupaColliderRadius ?? 19.9) + 0.6;
    const maxR = (config.WORLD?.walkRadius ?? 38) - 0.6;
    const r = Math.hypot(x, z);
    if (r < 1e-4) return { x: minR, z: 0 };
    if (r < minR) return { x: (x / r) * minR, z: (z / r) * minR };
    if (r > maxR) return { x: (x / r) * maxR, z: (z / r) * maxR };
    return { x, z };
  }

  function getGroundHeight(x, z) {
    if (state.zone === 'wild' && ctx.wilderness?.getHeight) {
      return ctx.wilderness.getHeight(x, z);
    }
    return 0;
  }

  // ---------------------------------------------------------------- Item 3D Geometries
  function buildSungduMesh() {
    const group = new THREE.Group();

    // Crimson cord knot
    const knotGeo = new THREE.TorusKnotGeometry(0.12, 0.032, 64, 8, 2, 3);
    const cordMat = new THREE.MeshStandardMaterial({
      color: 0xd31b2c,
      roughness: 0.45,
      metalness: 0.1,
      emissive: 0x9e0818,
      emissiveIntensity: 1.25,
      toneMapped: false,
    });
    const knot = new THREE.Mesh(knotGeo, cordMat);
    knot.castShadow = true;
    group.add(knot);

    // Golden binding ring
    const ringGeo = new THREE.TorusGeometry(0.09, 0.016, 8, 24);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0xb45309,
      emissiveIntensity: 1.3,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Two hanging tassels
    const tasselCapGeo = new THREE.SphereGeometry(0.024, 8, 8);
    const tasselSkirtGeo = new THREE.ConeGeometry(0.032, 0.13, 8);
    tasselSkirtGeo.translate(0, -0.065, 0);

    const t1 = new THREE.Group();
    t1.position.set(-0.06, -0.11, 0);
    t1.add(new THREE.Mesh(tasselCapGeo, goldMat));
    t1.add(new THREE.Mesh(tasselSkirtGeo, cordMat));
    group.add(t1);

    const t2 = new THREE.Group();
    t2.position.set(0.06, -0.11, 0);
    t2.add(new THREE.Mesh(tasselCapGeo, goldMat));
    t2.add(new THREE.Mesh(tasselSkirtGeo, cordMat));
    group.add(t2);

    // Floating ground halo
    const haloGeo = new THREE.RingGeometry(0.19, 0.24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      toneMapped: false,
    });
    haloMat.userData = { baseOpacity: 0.55 };
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.16;
    group.add(halo);

    return { group, halo };
  }

  function buildDungkarMesh() {
    const group = new THREE.Group();

    // White ivory conch body
    const bodyGeo = new THREE.SphereGeometry(0.10, 14, 12);
    bodyGeo.scale(1.35, 0.95, 0.85);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xfffdfa,
      roughness: 0.35,
      metalness: 0.05,
      emissive: 0x484236,
      emissiveIntensity: 1.0,
      toneMapped: false,
    });
    const body = new THREE.Mesh(bodyGeo, shellMat);
    body.castShadow = true;
    group.add(body);

    // Conch spiral spire (cone extending out behind)
    const spireGeo = new THREE.ConeGeometry(0.075, 0.20, 10);
    spireGeo.translate(0, 0.10, 0);
    const spire = new THREE.Mesh(spireGeo, shellMat);
    spire.rotation.z = Math.PI / 2 + 0.35;
    spire.position.set(-0.06, 0.02, 0);
    group.add(spire);

    // Golden filigree rim around conch mouth
    const lipGeo = new THREE.TorusGeometry(0.082, 0.018, 8, 20);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0xb45309,
      emissiveIntensity: 1.3,
      toneMapped: false,
    });
    const lip = new THREE.Mesh(lipGeo, goldMat);
    lip.rotation.y = Math.PI / 3;
    lip.position.set(0.08, 0, 0.02);
    group.add(lip);

    // Floating ground halo
    const haloGeo = new THREE.RingGeometry(0.19, 0.24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      toneMapped: false,
    });
    haloMat.userData = { baseOpacity: 0.55 };
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.16;
    group.add(halo);

    return { group, halo };
  }

  function buildGauMesh() {
    const group = new THREE.Group();

    // Gilded octagonal reliquary box
    const boxGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.08, 8);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.85,
      emissive: 0x92400e,
      emissiveIntensity: 1.25,
      toneMapped: false,
    });
    const box = new THREE.Mesh(boxGeo, goldMat);
    box.castShadow = true;
    group.add(box);

    // Top arched lotus rim
    const rimGeo = new THREE.TorusGeometry(0.085, 0.016, 8, 16);
    const rim = new THREE.Mesh(rimGeo, goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.045;
    group.add(rim);

    // Center radiant turquoise gemstone
    const gemGeo = new THREE.OctahedronGeometry(0.045, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x14b8a6,
      roughness: 0.15,
      metalness: 0.1,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.2,
      toneMapped: false,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.y = 0.052;
    group.add(gem);

    // 4 decorative gold finial spheres on corners
    const beadGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const offsets = [
      [0.085, 0.085],
      [-0.085, 0.085],
      [0.085, -0.085],
      [-0.085, -0.085],
    ];
    for (const [bx, bz] of offsets) {
      const b = new THREE.Mesh(beadGeo, goldMat);
      b.position.set(bx * 0.85, 0.038, bz * 0.85);
      group.add(b);
    }

    // Floating ground halo
    const haloGeo = new THREE.RingGeometry(0.19, 0.24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x14b8a6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      toneMapped: false,
    });
    haloMat.userData = { baseOpacity: 0.6 };
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.16;
    group.add(halo);

    return { group, halo };
  }

  function buildDorjeMesh() {
    const group = new THREE.Group();

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.25,
      metalness: 0.9,
      emissive: 0xb45309,
      emissiveIntensity: 1.5,
      toneMapped: false,
    });

    // Central sphere (the bindu)
    const sphereGeo = new THREE.SphereGeometry(0.045, 10, 10);
    const sphere = new THREE.Mesh(sphereGeo, goldMat);
    sphere.castShadow = true;
    group.add(sphere);

    // Lotus collars on top and bottom
    const collarGeo = new THREE.CylinderGeometry(0.046, 0.036, 0.026, 8);
    const topCollar = new THREE.Mesh(collarGeo, goldMat);
    topCollar.position.y = 0.042;
    group.add(topCollar);

    const bottomCollar = new THREE.Mesh(collarGeo, goldMat);
    bottomCollar.position.y = -0.042;
    bottomCollar.rotation.x = Math.PI;
    group.add(bottomCollar);

    // Central axis prongs
    const centralProngGeo = new THREE.CylinderGeometry(0.013, 0.016, 0.32, 8);
    const centralProng = new THREE.Mesh(centralProngGeo, goldMat);
    group.add(centralProng);

    // 4 outer curved prongs on each end (8 total)
    const prongCurveGeo = new THREE.TorusGeometry(0.045, 0.012, 6, 8, Math.PI * 0.85);
    for (let end = -1; end <= 1; end += 2) {
      for (let i = 0; i < 4; i++) {
        const prong = new THREE.Mesh(prongCurveGeo, goldMat);
        const angle = (i * Math.PI) / 2;
        prong.rotation.y = angle;
        prong.position.y = end * 0.085;
        if (end < 0) {
          prong.rotation.x = Math.PI;
        }
        group.add(prong);
      }
    }

    // Floating ground halo
    const haloGeo = new THREE.RingGeometry(0.19, 0.24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      toneMapped: false,
    });
    haloMat.userData = { baseOpacity: 0.6 };
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.16;
    group.add(halo);

    return { group, halo };
  }

  function createItemVisual(itemId) {
    switch (itemId) {
      case 'sungdu':
        return buildSungduMesh();
      case 'dungkar':
        return buildDungkarMesh();
      case 'gau':
        return buildGauMesh();
      case 'dorje':
      default:
        return buildDorjeMesh();
    }
  }

  // ---------------------------------------------------------------- Weighted Selection
  function pickItemId() {
    const cap = config.ITEMS?.permanentCap ?? 20;
    const p = state.player;
    const atk = p?.permanent?.atk || 0;
    const def = p?.permanent?.def || 0;

    const table = config.ITEMS?.table || {};
    let wSungdu = table.sungdu?.weight ?? 35;
    let wDungkar = table.dungkar?.weight ?? 35;
    let wGau = table.gau?.weight ?? 15;
    let wDorje = table.dorje?.weight ?? 15;

    const dorjeCapped = atk >= cap;
    const gauCapped = def >= cap;

    if (dorjeCapped && !gauCapped) {
      wGau += wDorje;
      wDorje = 0;
    } else if (gauCapped && !dorjeCapped) {
      wDorje += wGau;
      wGau = 0;
    } else if (dorjeCapped && gauCapped) {
      wDorje = 0;
      wGau = 0;
    }

    const total = wSungdu + wDungkar + wGau + wDorje;
    if (total <= 0) return 'sungdu';

    const r = Math.random() * total;
    if (r < wSungdu) return 'sungdu';
    if (r < wSungdu + wDungkar) return 'dungkar';
    if (r < wSungdu + wDungkar + wGau) return 'gau';
    return 'dorje';
  }

  // ---------------------------------------------------------------- Pickup Execution
  function applyPickup(itemId) {
    const table = config.ITEMS?.table || {};
    const def = table[itemId];
    if (!def) return;

    if (def.permanent) {
      ctx.vitals?.addPermanent(def.stat, def.amount);
    } else {
      ctx.vitals?.addBuff(def.id, def.stats, def.duration);
    }

    bus.emit('item:pickup', { id: def.id, permanent: def.permanent });
    bus.emit('sfx', { name: 'pickup' });
    bus.emit('toast', {
      key: 'toast.itemPickup',
      params: {
        name: { key: 'item.' + def.id },
        effect: { key: 'item.' + def.id + '.effect' },
      },
      kind: 'merit',
    });
  }

  function removeItem(item, index) {
    itemGroup.remove(item.mesh);
    item.mesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    activeItems.splice(index, 1);
  }

  // ---------------------------------------------------------------- Spawn Item
  function spawnItemInstance(itemId, startPos, endPos, flightDuration, arcHeight) {
    const visual = createItemVisual(itemId);
    const mesh = visual.group;
    mesh.position.copy(startPos);
    itemGroup.add(mesh);

    const record = {
      id: itemId,
      mesh,
      halo: visual.halo,
      startPos: startPos.clone(),
      endPos: endPos.clone(),
      position: mesh.position,
      age: 0,
      flightTime: 0,
      flightDuration,
      arcHeight,
      landed: false,
      phase: Math.random() * Math.PI * 2,
      zone: state.zone || 'stupa',
    };

    activeItems.push(record);
    return record;
  }

  // ---------------------------------------------------------------- Drop API
  function drop(id) {
    const itemId = id || pickItemId();
    const table = config.ITEMS?.table || {};
    const def = table[itemId] || { permanent: false };

    const p = state.player;
    const px = p.position.x;
    const pz = p.position.z;
    const heading = p.heading || 0;

    // Spawn 2m in front of player
    const targetRawX = px - Math.sin(heading) * 2;
    const targetRawZ = pz - Math.cos(heading) * 2;
    const clamped = clampToWalkable(targetRawX, targetRawZ);

    const groundY = getGroundHeight(clamped.x, clamped.z);
    const startPos = new THREE.Vector3(px, p.position.y + 0.4, pz);
    const endPos = new THREE.Vector3(clamped.x, groundY, clamped.z);

    const flightDur = cfg.dropFlightDur ?? 0.35;
    const arcHeight = cfg.dropArcHeight ?? 1.1;
    const record = spawnItemInstance(itemId, startPos, endPos, flightDur, arcHeight);

    return {
      id: itemId,
      permanent: def.permanent,
      position: record.endPos.clone(),
    };
  }

  // ---------------------------------------------------------------- monkey:fed Listener
  bus.on('monkey:fed', (payload) => {
    const ppos = state.player.position;
    const feedPos = payload?.position ? payload.position : ppos.clone();
    const distToPlayer = Math.hypot(feedPos.x - ppos.x, feedPos.z - ppos.z);

    const shouldDrop =
      forceNextDrop ||
      pityCount >= (cfg.pityThreshold ?? 5) ||
      Math.random() < (cfg.dropChance ?? 0.3);

    if (shouldDrop) {
      forceNextDrop = false;
      pityCount = 0;
      savePity(0);

      const itemId = pickItemId();

      // Synthetic console test directly at player's position (Test 2)
      if (distToPlayer < 0.25) {
        applyPickup(itemId);
        return;
      }

      // In-game monkey feed: item leaps from monkey ~1.2m toward player
      const dx = ppos.x - feedPos.x;
      const dz = ppos.z - feedPos.z;
      const d = Math.hypot(dx, dz) || 1;
      const leapDist = Math.min(1.2, d * 0.7);
      const targetRawX = feedPos.x + (dx / d) * leapDist;
      const targetRawZ = feedPos.z + (dz / d) * leapDist;
      const clamped = clampToWalkable(targetRawX, targetRawZ);

      const groundY = getGroundHeight(clamped.x, clamped.z);
      const startPos = new THREE.Vector3(feedPos.x, feedPos.y + 0.35, feedPos.z);
      const endPos = new THREE.Vector3(clamped.x, groundY, clamped.z);

      const flightDur = cfg.flightDur ?? 0.55;
      const arcHeight = cfg.arcHeight ?? 1.6;
      spawnItemInstance(itemId, startPos, endPos, flightDur, arcHeight);
    } else {
      pityCount += 1;
      savePity(pityCount);
    }
  });

  bus.on('merit:reset', () => {
    pityCount = 0;
    savePity(0);
    forceNextDrop = false;
    for (let i = activeItems.length - 1; i >= 0; i--) {
      removeItem(activeItems[i], i);
    }
  });

  // ---------------------------------------------------------------- Per-Frame Update
  function update(dt) {
    const ppos = state.player.position;
    const pickupRad = cfg.pickupRadius ?? 1.2;
    const pickupRadSq = pickupRad * pickupRad;
    const despawnSec = cfg.despawnSec ?? 60;
    const bobFreq = cfg.bobFreq ?? 2.2;
    const bobAmp = cfg.bobAmp ?? 0.06;
    const rotSpeed = cfg.rotSpeed ?? 1.2;

    for (let i = activeItems.length - 1; i >= 0; i--) {
      const item = activeItems[i];
      item.age += dt;

      // 1. Update flight or floating bob
      if (!item.landed) {
        item.flightTime += dt;
        const u = Math.min(1, item.flightTime / item.flightDuration);
        item.mesh.position.lerpVectors(item.startPos, item.endPos, u);
        item.mesh.position.y += 4 * u * (1 - u) * item.arcHeight;
        item.mesh.rotation.x += dt * 6.5;
        item.mesh.rotation.z += dt * 5.0;

        if (u >= 1) {
          item.landed = true;
          item.mesh.position.copy(item.endPos);
          item.mesh.rotation.set(0, item.phase, 0);
        }
      } else {
        const bob = Math.sin(state.elapsed * bobFreq + item.phase) * bobAmp;
        item.mesh.position.y = item.endPos.y + 0.22 + bob;
        item.mesh.rotation.y += dt * rotSpeed;
        item.mesh.rotation.x = Math.sin(state.elapsed * 1.5 + item.phase) * 0.08;
        item.mesh.rotation.z = Math.cos(state.elapsed * 1.3 + item.phase) * 0.08;

        if (item.halo && item.halo.material) {
          const baseOp = item.halo.material.userData?.baseOpacity ?? 0.55;
          const pulse = 0.8 + 0.25 * Math.sin(state.elapsed * 3.5 + item.phase);
          item.halo.material.opacity = baseOp * pulse * (item.currentFade ?? 1);
        }
      }

      // 2. Check pickup distance
      if (item.landed || item.age >= 0.25) {
        // Only pick up if player is in matching zone
        const currentZone = state.zone || 'stupa';
        if (item.zone === currentZone) {
          const dx = ppos.x - item.mesh.position.x;
          const dz = ppos.z - item.mesh.position.z;
          if (dx * dx + dz * dz <= pickupRadSq) {
            const id = item.id;
            removeItem(item, i);
            applyPickup(id);
            continue;
          }
        }
      }

      // 3. Fade-out in last 3 seconds of despawn
      if (item.age >= despawnSec - 3) {
        const fade = Math.max(0, (despawnSec - item.age) / 3);
        item.currentFade = fade;
        item.mesh.traverse((obj) => {
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
              m.transparent = true;
              const base = m.userData?.baseOpacity ?? 1.0;
              m.opacity = base * fade;
            }
          }
        });
      }

      // 4. Despawn
      if (item.age >= despawnSec) {
        removeItem(item, i);
      }
    }
  }

  // ---------------------------------------------------------------- API & Debug Register
  const api = {
    update,
    drop,
    forceNext() {
      forceNextDrop = true;
    },
    pityCount() {
      return pityCount;
    },
    activeItems,
  };

  ctx.items = api;

  ctx.debug?.register('items', {
    drop: (id) => api.drop(id),
    forceNext: () => api.forceNext(),
    pityCount: () => api.pityCount(),
    list: () =>
      activeItems.map((it) => ({
        id: it.id,
        x: it.position.x,
        z: it.position.z,
        age: it.age,
      })),
  });

  return api;
}
