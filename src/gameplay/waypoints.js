import * as THREE from 'three';
import '../i18n/codex.js';
import { i18n } from '../i18n.js';
import { MAPS } from '../data/maps.js';

const RECALL_CHANNEL_DURATION = 3.0; // seconds
const WAYPOINT_UNLOCK_RADIUS = 3.5;
const WAYPOINT_INTERACT_RADIUS = 2.5;
const RETURN_PORTAL_POS = { x: 13.0, z: -26.0 };

// Traditional 5-element Tibetan prayer flag colors (Blue, White, Red, Green, Yellow)
const FLAG_COLORS = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];

// All known route/chapter map IDs (including future chapters so rewards.waypoint works for all)
export const ALL_WAYPOINT_IDS = [
  'stupa',
  'wild',
  'pharping',
  'mangyul',
  'yarlung',
  'samye',
  'chimphu',
  'terma',
  'chimpu',
  'zangdokPalri',
  'sandbox',
];

function normalizeWaypointId(id) {
  if (id === 'chimpu') return 'chimphu';
  return id;
}

export function resolveWaypointCoords(mapDef) {
  if (!mapDef || !mapDef.waypoint) return null;
  const origin = mapDef.origin || { x: 0, z: 0 };
  const wp = mapDef.waypoint;
  const walkR = mapDef.walkRadius || 70;

  // Determine world coordinates: if wp.x is already near origin.x, use it directly;
  // otherwise treat wp.x as a local offset from origin.x.
  const distFromOrigin = Math.hypot(wp.x - origin.x, wp.z - origin.z);
  const worldX = distFromOrigin <= walkR + 15 ? wp.x : origin.x + wp.x;
  const worldZ = distFromOrigin <= walkR + 15 ? wp.z : origin.z + wp.z;
  const localX = wp.localX ?? (worldX - origin.x);
  const localZ = wp.localZ ?? (worldZ - origin.z);

  return {
    x: worldX,
    z: worldZ,
    localX,
    localZ,
  };
}

function buildWaypointMesh(unlocked = false) {
  const root = new THREE.Group();
  root.name = 'PrayerFlagWaypoint';

  // 1. Ground stone ring (carved slate & inner lotus ring, zero PointLight)
  const baseRingGeo = new THREE.RingGeometry(1.35, 1.95, 24);
  baseRingGeo.rotateX(-Math.PI / 2);
  const baseRingMat = new THREE.MeshStandardMaterial({
    color: 0x8b8376,
    roughness: 0.85,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
  baseRing.position.y = 0.02;
  baseRing.receiveShadow = true;
  root.add(baseRing);

  // 8-stone boundary segments around the ring
  const stoneBlockGeo = new THREE.BoxGeometry(0.42, 0.14, 0.26);
  const stoneBlockMat = new THREE.MeshStandardMaterial({
    color: 0x9b9283,
    roughness: 0.82,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const block = new THREE.Mesh(stoneBlockGeo, stoneBlockMat);
    block.position.set(Math.cos(a) * 1.75, 0.07, Math.sin(a) * 1.75);
    block.rotation.y = -a + Math.PI / 2;
    block.castShadow = true;
    block.receiveShadow = true;
    root.add(block);
  }

  // Additive glowing ground rune ring (no PointLight!)
  const glowRingGeo = new THREE.RingGeometry(1.15, 1.52, 32);
  glowRingGeo.rotateX(-Math.PI / 2);
  const glowRingMat = new THREE.MeshBasicMaterial({
    color: unlocked ? new THREE.Color(1.8, 1.45, 0.55) : new THREE.Color(0.55, 0.75, 0.95),
    transparent: true,
    opacity: unlocked ? 0.65 : 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
  glowRing.position.y = 0.035;
  root.add(glowRing);

  // 2. Central carved stone pillar
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x766e63,
    roughness: 0.78,
    metalness: 0.12,
  });
  const plinth1 = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.32, 8), plinthMat);
  plinth1.position.y = 0.16;
  plinth1.castShadow = true;
  plinth1.receiveShadow = true;
  root.add(plinth1);

  const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.28, 8), plinthMat);
  plinth2.position.y = 0.46;
  plinth2.castShadow = true;
  plinth2.receiveShadow = true;
  root.add(plinth2);

  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x676056,
    roughness: 0.72,
    metalness: 0.15,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.3, 8), shaftMat);
  shaft.position.y = 1.75;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  root.add(shaft);

  // Carved glowing Tibetan rune bands on pillar shaft
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0xfad06c,
    emissive: unlocked ? 0xf59e0b : 0x38bdf8,
    emissiveIntensity: unlocked ? 1.35 : 0.3,
    roughness: 0.3,
    metalness: 0.4,
    toneMapped: false,
  });
  const runeBands = [];
  for (const ry of [1.05, 1.65, 2.25]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.36, 0.09, 8), runeMat);
    band.position.y = ry;
    root.add(band);
    runeBands.push(band);
  }

  // Golden Finial (lotus cap + jewel spire)
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    emissive: 0xb45309,
    emissiveIntensity: unlocked ? 0.85 : 0.25,
    roughness: 0.28,
    metalness: 0.65,
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.22, 8), capMat);
  cap.position.y = 2.98;
  cap.castShadow = true;
  root.add(cap);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), runeMat);
  finial.scale.set(1, 1.45, 1);
  finial.position.y = 3.32;
  root.add(finial);

  // 3. Ring of 5-color prayer flag poles & radiating banners
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x5c4028,
    roughness: 0.85,
  });
  const flags = [];
  const numPoles = 5;
  const poleRadius = 1.62;

  for (let i = 0; i < numPoles; i++) {
    const angle = (i / numPoles) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * poleRadius;
    const pz = Math.sin(angle) * poleRadius;

    // Outer wooden pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.55, 6), poleMat);
    pole.position.set(px, 1.27, pz);
    pole.castShadow = true;
    root.add(pole);

    // Small brass pole tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), capMat);
    tip.position.set(px, 2.6, pz);
    root.add(tip);

    // 5 colorful prayer flags strung from central pillar top (y=2.88) to outer pole top (y=2.45)
    for (let f = 0; f < 5; f++) {
      const t = (f + 0.5) / 5;
      const fx = px * t;
      const fz = pz * t;
      const sag = Math.sin(t * Math.PI) * 0.14;
      const fy = 2.88 * (1 - t) + 2.45 * t - sag;

      const colorHex = FLAG_COLORS[(i + f) % FLAG_COLORS.length];
      const flagMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: unlocked ? 0.35 : 0.08,
        roughness: 0.65,
        side: THREE.DoubleSide,
      });

      const flagGeo = new THREE.PlaneGeometry(0.24, 0.19, 2, 1);
      const flagMesh = new THREE.Mesh(flagGeo, flagMat);
      flagMesh.position.set(fx, fy - 0.09, fz);
      flagMesh.rotation.y = -angle;
      root.add(flagMesh);

      flags.push({
        mesh: flagMesh,
        mat: flagMat,
        baseRotY: -angle,
        baseY: fy - 0.09,
        phase: i * 1.3 + f * 0.7,
      });
    }
  }

  root.userData = {
    unlocked,
    glowRing,
    glowRingMat,
    runeMat,
    capMat,
    finial,
    flags,
  };

  return root;
}

function setWaypointMeshUnlocked(root, unlocked) {
  if (!root || !root.userData) return;
  root.userData.unlocked = unlocked;
  const { glowRingMat, runeMat, capMat, flags } = root.userData;
  if (glowRingMat) {
    glowRingMat.color.setRGB(
      unlocked ? 1.8 : 0.55,
      unlocked ? 1.45 : 0.75,
      unlocked ? 0.55 : 0.95,
    );
    glowRingMat.opacity = unlocked ? 0.68 : 0.22;
  }
  if (runeMat) {
    runeMat.emissive.setHex(unlocked ? 0xf59e0b : 0x38bdf8);
    runeMat.emissiveIntensity = unlocked ? 1.35 : 0.3;
  }
  if (capMat) {
    capMat.emissiveIntensity = unlocked ? 0.85 : 0.25;
  }
  if (Array.isArray(flags)) {
    for (const f of flags) {
      if (f.mat) f.mat.emissiveIntensity = unlocked ? 0.35 : 0.08;
    }
  }
}

function buildRecallMandalaMesh() {
  const group = new THREE.Group();
  group.name = 'RecallMandalaCircle';
  group.visible = false;

  const goldColor = new THREE.Color(2.2, 1.75, 0.55);
  const cyanColor = new THREE.Color(0.6, 1.6, 2.2);

  const outerRingGeo = new THREE.RingGeometry(1.55, 1.72, 48);
  outerRingGeo.rotateX(-Math.PI / 2);
  const outerMat = new THREE.MeshBasicMaterial({
    color: goldColor,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerMat);
  outerRing.position.y = 0.05;
  group.add(outerRing);

  const innerRingGeo = new THREE.RingGeometry(0.92, 1.06, 36);
  innerRingGeo.rotateX(-Math.PI / 2);
  const innerMat = new THREE.MeshBasicMaterial({
    color: cyanColor,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerMat);
  innerRing.position.y = 0.055;
  group.add(innerRing);

  // 8-spoke dharma wheel bars inside mandala
  const spokeGeo = new THREE.PlaneGeometry(3.1, 0.07);
  spokeGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(spokeGeo, outerMat);
    spoke.rotation.y = (i / 4) * Math.PI;
    spoke.position.y = 0.052;
    group.add(spoke);
  }

  group.userData = { outerRing, innerRing, outerMat, innerMat };
  return group;
}

function buildReturnPortalMesh() {
  const group = new THREE.Group();
  group.name = 'ReturnPortalMesh';
  group.visible = false;

  // Ground pad ring
  const padGeo = new THREE.RingGeometry(0.85, 1.25, 32);
  padGeo.rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.55, 1.55, 2.2),
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.04;
  group.add(pad);

  // Standing golden-blue torus portal frame
  const frameGeo = new THREE.TorusGeometry(1.05, 0.08, 12, 36);
  const frameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.0, 1.65, 0.6),
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = 1.25;
  group.add(frame);

  // Swirling inner blue-gold vortex disc
  const vortexGeo = new THREE.CircleGeometry(0.96, 32);
  const vortexMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.45, 1.35, 2.1),
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const vortex = new THREE.Mesh(vortexGeo, vortexMat);
  vortex.position.y = 1.25;
  group.add(vortex);

  // Inner rotating star ring
  const innerTorusGeo = new THREE.TorusGeometry(0.68, 0.04, 8, 24);
  const innerTorus = new THREE.Mesh(innerTorusGeo, padMat);
  innerTorus.position.y = 1.25;
  group.add(innerTorus);

  group.userData = { pad, frame, vortex, innerTorus, padMat, frameMat, vortexMat };
  return group;
}

export function createWaypoints(ctx) {
  const { state, bus, scene, save } = ctx;

  const unlockedSet = new Set(['stupa']);
  const waypointMeshes = new Map(); // mapId -> THREE.Group
  let returnPortalOrigin = null;    // { mapId, x, z, heading } | null
  let returnPortalMesh = null;

  // Recall channeling state
  let recalling = false;
  let recallTimer = 0;
  const recallStartPos = { x: 0, z: 0 };

  // Save integration
  if (save) {
    save.register(
      'waypoints',
      () => ({
        unlocked: Array.from(unlockedSet),
        returnPortal: returnPortalOrigin ? { ...returnPortalOrigin } : null,
      }),
      (data) => {
        unlockedSet.clear();
        unlockedSet.add('stupa');
        const listData = Array.isArray(data)
          ? data
          : Array.isArray(data?.unlocked)
            ? data.unlocked
            : [];
        for (const id of listData) {
          if (typeof id === 'string' && id) unlockedSet.add(id);
        }
        returnPortalOrigin = data?.returnPortal || null;
        syncAllMeshes();
        syncReturnPortalMesh();
      },
    );
  }

  // Create 3D meshes & interactables for all maps that define a waypoint
  function ensureWaypointForMap(mapId) {
    const mapDef = MAPS[mapId];
    if (!mapDef || !mapDef.waypoint) return null;
    if (waypointMeshes.has(mapId)) return waypointMeshes.get(mapId);

    const coords = resolveWaypointCoords(mapDef);
    if (!coords) return null;

    const y = ctx.world?.getHeight?.(coords.x, coords.z, mapId) ?? 0;
    const isUnl = unlockedSet.has(mapId);
    const mesh = buildWaypointMesh(isUnl);
    mesh.position.set(coords.x, y, coords.z);

    const zoneGrp = ctx.zoneGroups?.[mapId];
    if (zoneGrp) {
      zoneGrp.add(mesh);
    } else {
      scene.add(mesh);
    }

    // Small pillar collider so player doesn't walk inside the stone shaft
    if (Array.isArray(ctx.colliders)) {
      ctx.colliders.push({
        type: 'circle',
        x: coords.x,
        z: coords.z,
        r: 0.72,
        zone: mapId,
      });
    }

    const posVec = new THREE.Vector3(coords.x, y, coords.z);
    if (Array.isArray(ctx.interactables)) {
      ctx.interactables.push({
        id: `waypoint-${mapId}`,
        kind: 'waypoint',
        zone: mapId,
        action: 'interact',
        labelKey: 'prompt.waypoint',
        radius: WAYPOINT_INTERACT_RADIUS,
        getPosition: () => {
          const curY = ctx.world?.getHeight?.(coords.x, coords.z, mapId) ?? 0;
          posVec.set(coords.x, curY, coords.z);
          return posVec;
        },
        isAvailable: () => (state.zone || 'stupa') === mapId && !state.uiOpen,
        onInteract: () => {
          if (!unlockedSet.has(mapId)) {
            unlock(mapId);
          }
          ctx.audio?.chime?.();
          bus.emit('waypoint:interact', { mapId });
          bus.emit('worldmap:open', { tab: 'world', waypointMode: true, fromWaypoint: mapId });
        },
      });
    }

    waypointMeshes.set(mapId, mesh);
    return mesh;
  }

  for (const mapId of Object.keys(MAPS)) {
    if (MAPS[mapId]?.waypoint) {
      ensureWaypointForMap(mapId);
    }
  }

  bus.on('map:loaded', ({ mapId }) => {
    const mesh = ensureWaypointForMap(mapId);
    if (mesh) {
      const mapDef = MAPS[mapId];
      const coords = resolveWaypointCoords(mapDef);
      if (coords) {
        const y = ctx.world?.getHeight?.(coords.x, coords.z, mapId) ?? 0;
        mesh.position.set(coords.x, y, coords.z);
      }
      const zg = ctx.zoneGroups?.[mapId];
      if (zg && mesh.parent !== zg) {
        zg.add(mesh);
      }
    }
  });

  function syncAllMeshes() {
    for (const [mapId, mesh] of waypointMeshes.entries()) {
      setWaypointMeshUnlocked(mesh, unlockedSet.has(mapId));
    }
  }

  // ---------------------------------------------------------------- Return Portal (歸途之門) in Stupa Hub
  returnPortalMesh = buildReturnPortalMesh();
  returnPortalMesh.position.set(RETURN_PORTAL_POS.x, 0, RETURN_PORTAL_POS.z);
  const stupaGrp = ctx.zoneGroups?.stupa || ctx.stupaGroup || scene;
  stupaGrp.add(returnPortalMesh);
  syncReturnPortalMesh();

  const returnPortalVec = new THREE.Vector3(RETURN_PORTAL_POS.x, 0, RETURN_PORTAL_POS.z);
  if (Array.isArray(ctx.interactables)) {
    ctx.interactables.push({
      id: 'return-portal-stupa',
      kind: 'returnPortal',
      zone: 'stupa',
      action: 'interact',
      labelKey: 'prompt.returnPortal',
      getLabel: () => {
        const destDef = returnPortalOrigin ? MAPS[returnPortalOrigin.mapId] : null;
        const mapName = destDef?.nameKey ? i18n.t(destDef.nameKey) : (returnPortalOrigin?.mapId || '');
        return i18n.t('prompt.returnPortal', { map: mapName });
      },
      radius: 2.5,
      getPosition: () => returnPortalVec,
      isAvailable: () =>
        Boolean(returnPortalOrigin) && (state.zone || 'stupa') === 'stupa' && !state.uiOpen,
      onInteract: () => useReturnPortal(),
    });
  }

  function syncReturnPortalMesh() {
    if (returnPortalMesh) {
      returnPortalMesh.visible = Boolean(returnPortalOrigin);
    }
  }

  function useReturnPortal() {
    if (!returnPortalOrigin) return false;
    const origin = { ...returnPortalOrigin };
    returnPortalOrigin = null;
    syncReturnPortalMesh();
    save?.markDirty?.();

    const finishReturn = () => {
      const y = ctx.world?.getHeight?.(origin.x, origin.z, origin.mapId) ?? 0;
      state.player.position.set(origin.x, y, origin.z);
      if (typeof origin.heading === 'number') {
        state.player.heading = origin.heading;
      }
      bus.emit('toast', { text: i18n.t('toast.recallReturn') });
      bus.emit('sfx', { name: 'bowl' });
      bus.emit('waypoint:returnUsed', origin);
    };

    if (ctx.zones?.teleport) {
      ctx.zones.teleport(origin.mapId, { silent: true }).then(() => {
        finishReturn();
      });
    } else {
      state.zone = origin.mapId;
      finishReturn();
    }
    return true;
  }

  // ---------------------------------------------------------------- Recall Mandala & HUD Progress Bar
  const mandalaMesh = buildRecallMandalaMesh();
  scene.add(mandalaMesh);

  let recallHudEl = null;
  let recallFillEl = null;
  let recallLabelEl = null;

  function ensureRecallHud() {
    if (recallHudEl || typeof document === 'undefined') return;
    recallHudEl = document.createElement('div');
    recallHudEl.id = 'recall-channel-bar';
    recallHudEl.className = 'recall-bar is-hidden';
    recallHudEl.innerHTML = `
      <div class="recall-bar__label"></div>
      <div class="recall-bar__track">
        <div class="recall-bar__fill"></div>
      </div>
    `;
    const ui = document.getElementById('ui') || document.body;
    ui.appendChild(recallHudEl);
    recallLabelEl = recallHudEl.querySelector('.recall-bar__label');
    recallFillEl = recallHudEl.querySelector('.recall-bar__fill');
  }
  ensureRecallHud();

  function updateRecallHud() {
    if (!recallHudEl) return;
    if (!recalling) {
      recallHudEl.classList.add('is-hidden');
      return;
    }
    recallHudEl.classList.remove('is-hidden');
    const remain = Math.max(0, RECALL_CHANNEL_DURATION - recallTimer);
    const pct = Math.min(100, Math.max(0, (recallTimer / RECALL_CHANNEL_DURATION) * 100));
    if (recallLabelEl) {
      recallLabelEl.textContent = i18n.t('hud.recalling', { sec: remain.toFixed(1) });
    }
    if (recallFillEl) {
      recallFillEl.style.width = `${pct.toFixed(1)}%`;
    }
  }

  function startRecall() {
    const curZone = state.zone || 'stupa';
    const isHubZone = curZone === 'stupa' || ctx.world?.isHub?.(curZone);
    if (isHubZone) {
      bus.emit('toast', { text: i18n.t('toast.recallInHub') });
      return false;
    }
    if (state.bossActive) {
      bus.emit('toast', { text: i18n.t('toast.recallInBoss') });
      return false;
    }
    if (recalling) return true;

    recalling = true;
    recallTimer = 0;
    recallStartPos.x = state.player.position.x;
    recallStartPos.z = state.player.position.z;

    mandalaMesh.visible = true;
    mandalaMesh.position.set(
      state.player.position.x,
      state.player.position.y || 0,
      state.player.position.z,
    );
    updateRecallHud();
    ctx.audio?.chime?.();
    bus.emit('recall:start', { mapId: curZone, x: recallStartPos.x, z: recallStartPos.z });
    return true;
  }

  function cancelRecall(reason = 'interrupted') {
    if (!recalling) return false;
    recalling = false;
    recallTimer = 0;
    mandalaMesh.visible = false;
    updateRecallHud();
    bus.emit('toast', { text: i18n.t('toast.recallInterrupted') });
    bus.emit('recall:cancel', { reason });
    return true;
  }

  function completeRecall() {
    if (!recalling) return false;
    const originMapId = state.zone || 'wild';
    const originX = state.player.position.x;
    const originZ = state.player.position.z;
    const originHeading = state.player.heading || 0;

    recalling = false;
    recallTimer = 0;
    mandalaMesh.visible = false;
    updateRecallHud();

    // Record origin & spawn Return Portal in Stupa
    returnPortalOrigin = {
      mapId: originMapId,
      x: originX,
      z: originZ,
      heading: originHeading,
    };
    syncReturnPortalMesh();
    save?.markDirty?.();

    const finishTeleportToStupa = () => {
      const stupaWp = resolveWaypointCoords(MAPS.stupa) || { x: 10, z: -26 };
      state.player.position.set(stupaWp.x, 0, stupaWp.z + 2.0);
      state.player.heading = 0;
      bus.emit('toast', { text: i18n.t('toast.recallComplete') });
      bus.emit('sfx', { name: 'bowl' });
      bus.emit('recall:complete', { origin: { ...returnPortalOrigin } });
    };

    if (ctx.zones?.teleport) {
      ctx.zones.teleport('stupa', { spawn: 'waypoint', silent: true }).then(() => {
        finishTeleportToStupa();
      });
    } else {
      state.zone = 'stupa';
      finishTeleportToStupa();
    }
    return true;
  }

  // Cancel recall on any damage event
  const onDamageCancel = () => {
    if (recalling) cancelRecall('damage');
  };
  bus.on('combat:playerHit', onDamageCancel);
  bus.on('vitals:damage', onDamageCancel);
  bus.on('player:hurt', onDamageCancel);
  bus.on('player:damaged', onDamageCancel);

  // ---------------------------------------------------------------- Waypoint Unlock & Teleport API
  function getMapDisplayName(mapId) {
    const mapDef = MAPS[mapId];
    if (mapDef?.nameKey) return i18n.t(mapDef.nameKey);
    const nodeKey = `worldNode.${mapId}.name`;
    const translated = i18n.t(nodeKey);
    return translated !== nodeKey ? translated : mapId;
  }

  function unlock(rawMapId, opts = {}) {
    if (!rawMapId || typeof rawMapId !== 'string') return false;
    const mapId = normalizeWaypointId(rawMapId);
    if (unlockedSet.has(mapId)) return false;

    unlockedSet.add(mapId);
    if (mapId === 'chimphu') unlockedSet.add('chimpu');
    save?.markDirty?.();

    const mesh = waypointMeshes.get(mapId);
    if (mesh) setWaypointMeshUnlocked(mesh, true);

    if (!opts.silent) {
      const name = getMapDisplayName(mapId);
      bus.emit('toast', { text: i18n.t('toast.waypointUnlock', { name }) });
      ctx.audio?.chime?.();
      bus.emit('sfx', { name: 'bell' });
    }

    bus.emit('waypoint:unlock', { mapId });
    bus.emit('waypoint:changed', { unlocked: Array.from(unlockedSet) });
    return true;
  }

  function unlockAll(opts = { silent: false }) {
    for (const id of ALL_WAYPOINT_IDS) {
      unlockedSet.add(id);
    }
    for (const id of Object.keys(MAPS)) {
      if (MAPS[id]?.waypoint) unlockedSet.add(id);
    }
    syncAllMeshes();
    save?.markDirty?.();
    bus.emit('waypoint:changed', { unlocked: Array.from(unlockedSet) });
    return list();
  }

  function isUnlocked(rawMapId) {
    const mapId = normalizeWaypointId(rawMapId);
    return unlockedSet.has(mapId) || unlockedSet.has(rawMapId);
  }

  function isPlayerNearWaypoint(radius = WAYPOINT_UNLOCK_RADIUS) {
    const curZone = state.zone || 'stupa';
    const mapDef = MAPS[curZone];
    if (!mapDef || !mapDef.waypoint) return false;
    const coords = resolveWaypointCoords(mapDef);
    if (!coords) return false;

    const px = state.player.position.x;
    const pz = state.player.position.z;
    const distWorld = Math.hypot(px - coords.x, pz - coords.z);
    const distLocal = Math.hypot(px - coords.localX, pz - coords.localZ);
    return Math.min(distWorld, distLocal) <= radius;
  }

  function teleportTo(rawMapId) {
    const mapId = normalizeWaypointId(rawMapId);
    if (!isUnlocked(mapId)) return Promise.resolve(false);
    const targetMap = MAPS[mapId];
    if (!targetMap) return Promise.resolve(false);

    if (ctx.zones?.teleport) {
      return ctx.zones.teleport(mapId, { spawn: 'waypoint' }).then((ok) => {
        if (ok) {
          const coords = resolveWaypointCoords(targetMap);
          if (coords) {
            const y = ctx.world?.getHeight?.(coords.x, coords.z, mapId) ?? 0;
            state.player.position.set(coords.x, y, coords.z + 2.0);
          }
          const name = getMapDisplayName(mapId);
          bus.emit('toast', { text: i18n.t('toast.waypointTeleport', { name }) });
          bus.emit('waypoint:teleported', { to: mapId });
        }
        return ok;
      });
    }
    return Promise.resolve(false);
  }

  function list() {
    const ids = new Set([...ALL_WAYPOINT_IDS, ...Object.keys(MAPS)]);
    const result = [];
    for (const id of ids) {
      const mapDef = MAPS[id];
      const coords = mapDef ? resolveWaypointCoords(mapDef) : null;
      result.push({
        id,
        mapId: id,
        name: getMapDisplayName(id),
        unlocked: unlockedSet.has(id),
        hasMap: Boolean(mapDef),
        x: coords?.x ?? 0,
        z: coords?.z ?? 0,
        localX: coords?.localX ?? 0,
        localZ: coords?.localZ ?? 0,
      });
    }
    return result;
  }

  function getUnlockedIds() {
    return Array.from(unlockedSet);
  }

  function reset() {
    unlockedSet.clear();
    unlockedSet.add('stupa');
    returnPortalOrigin = null;
    if (recalling) {
      recalling = false;
      recallTimer = 0;
      mandalaMesh.visible = false;
      updateRecallHud();
    }
    syncAllMeshes();
    syncReturnPortalMesh();
    save?.markDirty?.();
    bus.emit('waypoint:changed', { unlocked: Array.from(unlockedSet) });
  }

  bus.on('waypoint:unlock', (payload = {}) => {
    const id = payload.mapId || payload.id;
    if (id && !unlockedSet.has(id)) {
      unlock(id);
    }
  });

  bus.on('merit:reset', () => {
    reset();
  });

  // ---------------------------------------------------------------- Frame Update
  let elapsed = 0;

  function update(dt) {
    elapsed += dt;

    // 1. Trigger recall on B key
    if (!state.uiOpen && ctx.input?.pressed?.('recall')) {
      if (recalling) {
        cancelRecall('toggle');
      } else {
        startRecall();
      }
    }

    // 2. Auto-unlock waypoint when approaching within 3.5m
    const curZone = state.zone || 'stupa';
    const curMapDef = MAPS[curZone];
    if (curMapDef?.waypoint && !unlockedSet.has(curZone)) {
      if (isPlayerNearWaypoint(WAYPOINT_UNLOCK_RADIUS)) {
        unlock(curZone);
      }
    }

    // 3. Animate current map's waypoint prayer flags & runes
    const curMesh = waypointMeshes.get(curZone);
    if (curMesh && curMesh.userData) {
      const isUnl = curMesh.userData.unlocked;
      const speed = isUnl ? 5.2 : 2.1;
      const amp = isUnl ? 0.18 : 0.06;
      if (curMesh.userData.finial) {
        curMesh.userData.finial.rotation.y = elapsed * (isUnl ? 1.6 : 0.5);
      }
      if (curMesh.userData.glowRing) {
        curMesh.userData.glowRing.rotation.z = elapsed * 0.4;
      }
      if (Array.isArray(curMesh.userData.flags)) {
        for (const f of curMesh.userData.flags) {
          f.mesh.rotation.y = f.baseRotY + Math.sin(elapsed * speed + f.phase) * amp;
          f.mesh.rotation.z = Math.cos(elapsed * (speed * 0.8) + f.phase) * (amp * 0.5);
        }
      }
    }

    // 4. Animate Return Portal in Stupa
    if (returnPortalMesh.visible && returnPortalMesh.userData) {
      returnPortalMesh.userData.vortex.rotation.z = elapsed * 1.8;
      returnPortalMesh.userData.innerTorus.rotation.z = -elapsed * 1.2;
      returnPortalMesh.userData.pad.rotation.z = elapsed * 0.6;
      const pulse = 0.42 + 0.14 * Math.sin(elapsed * 3.2);
      returnPortalMesh.userData.vortexMat.opacity = pulse;
    }

    // 5. Update Recall Channeling (3.0s)
    if (recalling) {
      const movedDist = Math.hypot(
        state.player.position.x - recallStartPos.x,
        state.player.position.z - recallStartPos.z,
      );
      const inputMove = Math.hypot(ctx.input?.move?.x || 0, ctx.input?.move?.y || 0);
      if (movedDist > 0.15 || inputMove > 0.12) {
        cancelRecall('move');
        return;
      }

      recallTimer += dt;
      mandalaMesh.position.set(
        state.player.position.x,
        state.player.position.y || 0,
        state.player.position.z,
      );
      mandalaMesh.rotation.y = elapsed * 2.2;
      if (mandalaMesh.userData?.innerRing) {
        mandalaMesh.userData.innerRing.rotation.z = -elapsed * 3.4;
      }
      updateRecallHud();

      if (recallTimer >= RECALL_CHANNEL_DURATION) {
        completeRecall();
      }
    }
  }

  const api = {
    update,
    unlock,
    unlockAll,
    isUnlocked,
    getUnlockedIds,
    list,
    teleportTo,
    isPlayerNearWaypoint,
    startRecall,
    cancelRecall,
    completeRecall,
    useReturnPortal,
    isRecalling: () => recalling,
    getRecallProgress: () => (recalling ? recallTimer / RECALL_CHANNEL_DURATION : 0),
    getReturnPortal: () =>
      returnPortalOrigin
        ? {
            ...returnPortalOrigin,
            portalX: RETURN_PORTAL_POS.x,
            portalZ: RETURN_PORTAL_POS.z,
          }
        : null,
    getWaypointCoords: (mapId = state.zone || 'stupa') => resolveWaypointCoords(MAPS[mapId]),
    reset,
  };

  ctx.waypoints = api;
  ctx.debug?.register?.('waypoints', {
    unlock: (mapId) => unlock(mapId),
    unlockAll: () => unlockAll(),
    isUnlocked: (mapId) => isUnlocked(mapId),
    list: () => list(),
    getUnlockedIds: () => getUnlockedIds(),
    startRecall: () => startRecall(),
    cancelRecall: () => cancelRecall('debug'),
    completeRecall: () => completeRecall(),
    isChanneling: () => recalling,
    isRecalling: () => recalling,
    teleport: (mapId) => teleportTo(mapId),
    teleportTo: (mapId) => teleportTo(mapId),
    useReturnPortal: () => useReturnPortal(),
    getReturnPortal: () => api.getReturnPortal(),
    reset: () => reset(),
  });

  return api;
}
