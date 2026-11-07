/**
 * Camera rig — cinematic orbit in 'intro' mode, smooth fly-in to Pilgrim
 * close-up in 'customizing' studio mode, front portrait camera toggle ('V'),
 * and third-person follow with mouse/touch orbit, zoom (1.4–14m), stupa
 * collision avoidance, and side-angle framing during prostrations in 'play' mode.
 */
const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * Math.min(1, t);
}

const DUNGEON_CORNER_OFFSETS = [
  [-7.3, -7.3],
  [7.3, -7.3],
  [-7.3, 7.3],
  [7.3, 7.3],
];
const DUNGEON_COLONNADE_OFFSETS = [
  [-3.6, -3.6],
  [3.6, -3.6],
  [-3.6, 3.6],
  [3.6, 3.6],
];
const DUNGEON_CORRIDOR_OFFSETS = [
  [-4.8, 0],
  [4.8, 0],
];

function intersectSegmentAABB2D(lx, lz, dx, dz, minX, maxX, minZ, maxZ) {
  let t0 = 0;
  let t1 = 1;
  if (Math.abs(dx) < 1e-7) {
    if (lx < minX || lx > maxX) return 1;
  } else {
    const invDx = 1 / dx;
    let tx0 = (minX - lx) * invDx;
    let tx1 = (maxX - lx) * invDx;
    if (tx0 > tx1) { const tmp = tx0; tx0 = tx1; tx1 = tmp; }
    if (tx0 > t0) t0 = tx0;
    if (tx1 < t1) t1 = tx1;
    if (t0 > t1) return 1;
  }
  if (Math.abs(dz) < 1e-7) {
    if (lz < minZ || lz > maxZ) return 1;
  } else {
    const invDz = 1 / dz;
    let tz0 = (minZ - lz) * invDz;
    let tz1 = (maxZ - lz) * invDz;
    if (tz0 > tz1) { const tmp = tz0; tz0 = tz1; tz1 = tmp; }
    if (tz0 > t0) t0 = tz0;
    if (tz1 < t1) t1 = tz1;
    if (t0 > t1) return 1;
  }
  return t0 >= 0 && t0 < 1 ? t0 : 1;
}

function intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, cx, cz, rPillar, useFeather) {
  if (horizLen < 1e-4) return 1;
  const ox = lx - cx;
  const oz = lz - cz;
  const sClosest = -(ox * ux + oz * uz);
  if (sClosest <= 0) return 1;

  const dLookSq = ox * ox + oz * oz;
  const dLook = Math.sqrt(dLookSq);
  const rInner = rPillar + 0.22;
  const rOuter = useFeather ? rPillar + 0.56 : rInner;

  if (dLook <= rInner) {
    return Math.max(0.03, Math.min(1, 0.24 / horizLen));
  }

  const dMinSq = Math.max(0, dLookSq - sClosest * sClosest);
  const dMin = Math.sqrt(dMinSq);
  if (dMin >= rOuter) return 1;

  const effOuter = Math.min(rOuter, Math.max(rPillar + 0.04, dLook - 0.05));
  const chordSq = Math.max(0, effOuter * effOuter - Math.min(effOuter * effOuter, dMinSq));
  const sFront = Math.max(0.20, sClosest - Math.sqrt(chordSq));
  if (sFront >= horizLen) return 1;

  const tHit = sFront / horizLen;
  if (!useFeather || dMin <= rInner) {
    return Math.max(0.03, Math.min(1, tHit));
  }

  const w = (rOuter - dMin) / (rOuter - rInner);
  const smoothW = w * w * (3 - 2 * w);
  return Math.max(0.03, Math.min(1, 1 - smoothW * (1 - tHit)));
}

export function createCameraRig(ctx) {
  const { THREE, camera, state, config, bus } = ctx;

  // Third-person spherical coordinates around player target
  // yaw = 0 places camera at +Z looking toward -Z (matching player.heading = 0)
  let yaw = 0;
  let pitch = 0.24;          // radians above horizon
  let distance = 6.8;        // meters
  let targetDistance = 6.8;
  let savedFollowDistance = 6.8;
  const normalizeAutoFollowMode = (mode) => ['smart', 'off', 'on'].includes(mode) ? mode : 'smart';
  let autoFollowMode = normalizeAutoFollowMode(
    ctx.save?.get?.('settings', {})?.cameraAutoFollow || state.cameraAutoFollow || 'smart'
  );
  state.cameraAutoFollow = autoFollowMode;
  let combatLockTimer = 0;
  let keyboardTogglePending = false;

  // Front portrait camera state (toggled with V key in play mode)
  let frontCamActive = false;
  state.frontCam = false;

  // Studio customization zoom override
  let studioDist = 1.55;
  let studioTargetDist = 1.55;

  // Smooth transition from intro orbit -> play mode
  let introBlend = 0;        // 0 = intro, 1 = play
  let wasIntro = true;
  let dungeonRayScale = 1;
  let lastDesiredHorizDist = 6.8;

  const currentPos = new THREE.Vector3(0, 18, 55);
  const currentLook = new THREE.Vector3(0, 12, 0);
  const desiredPos = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const smoothedStupaLookOffset = new THREE.Vector3();
  const stupaLookOffset = new THREE.Vector3();
  const introPos = new THREE.Vector3();
  const introLook = new THREE.Vector3(0, 12, 0);

  // Initialize yaw behind the player's starting heading
  yaw = state.player.heading || 0;

  function setAutoFollowMode(mode, silent = false) {
    autoFollowMode = normalizeAutoFollowMode(mode);
    state.cameraAutoFollow = autoFollowMode;
    if (ctx.save?.set) {
      const curSettings = ctx.save.get?.('settings', {}) || {};
      ctx.save.set('settings', { ...curSettings, cameraAutoFollow: autoFollowMode });
    }
    bus.emit('camera:autoFollowChanged', { mode: autoFollowMode });
    if (!silent) {
      const messages = ctx.i18n?.lang === 'en'
        ? { off: 'Camera: Fixed Angle (Auto-Follow Off)', smart: 'Camera: Smart Anti-Spin', on: 'Camera: Classic Auto-Follow' }
        : { off: '視角模式：固定視角（關閉自動運鏡）', smart: '視角模式：智慧防暈運鏡', on: '視角模式：經典自動跟隨' };
      bus.emit('toast', { text: messages[autoFollowMode], kind: 'info' });
    }
    return autoFollowMode;
  }

  function toggleAutoFollow(silent = false) {
    return setAutoFollowMode(autoFollowMode === 'off' ? 'smart' : 'off', silent);
  }

  bus.on('camera:setAutoFollow', (payload) => setAutoFollowMode(payload?.mode, Boolean(payload?.silent)));
  bus.on('settings:changed', (payload) => {
    const mode = payload?.cameraAutoFollow ?? ctx.save?.get?.('settings', {})?.cameraAutoFollow;
    if (mode === undefined || normalizeAutoFollowMode(mode) === autoFollowMode) return;
    autoFollowMode = normalizeAutoFollowMode(mode);
    state.cameraAutoFollow = autoFollowMode;
    // Settings already owns persistence; avoid writing back during its notification.
    bus.emit('camera:autoFollowChanged', { mode: autoFollowMode });
  });

  for (const event of ['player:attack', 'player:chant', 'mantra:cast', 'skill:cast', 'vitals:damage']) {
    bus.on(event, () => {
      combatLockTimer = 4.0;
      if (state.elapsed !== undefined) state.lastCombatTime = state.elapsed;
    });
  }

  function isInCombatOrTargeted() {
    if (combatLockTimer > 0 || state.boss?.active || state.bossActive || state.player?.combatTarget || state.combatTarget) return true;
    const bossBar = typeof document !== 'undefined' ? document.getElementById('boss-bar') : null;
    if (bossBar && !bossBar.classList.contains('is-hidden')) return true;
    const pPos = state.player.position;
    const enemies = ctx.enemies?.getActiveEnemies?.() || ctx.enemies?.list?.() || state.enemies || [];
    return enemies.some((enemy) => {
      if (!enemy || enemy.state === 'liberated' || enemy.state === 'calmed' || (enemy.hp !== undefined && !(enemy.hp > 0))) return false;
      if (['notice', 'chase', 'windup', 'attack', 'recover'].includes(enemy.state)) return true;
      const pos = enemy.pos || enemy.position || enemy;
      return Math.hypot(pos.x - pPos.x, pos.z - pPos.z) <= 18;
    });
  }

  function isNearDenseCluster() {
    const pPos = state.player.position;
    if (state.zone === 'stupa' && Math.hypot(pPos.x, pPos.z) <= 25.5 + 1e-6) return true;
    let nearbyCount = 0;
    for (const items of [ctx.interactables || [], ctx.colliders || []]) {
      for (const item of items) {
        if (!item || (item.zone && item.zone !== state.zone)) continue;
        const pos = item.position || item;
        const dist = Math.hypot(pos.x - pPos.x, pos.z - pPos.z);
        if (items === ctx.interactables && dist <= 3.8) return true;
        if (dist <= 2.8 && ++nearbyCount >= 2) return true;
      }
    }
    return false;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
      if (e.repeat || state.mode !== 'play' || state.uiOpen || state.customizing
        || activeElement?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/i.test(activeElement?.tagName || '')) return;
      if (e.code === 'KeyL' || (e.code === 'KeyC' && e.altKey)) {
        e.preventDefault();
        toggleAutoFollow(false);
        keyboardTogglePending = true;
      }
    });
  }

  // Intersect the viewing ray with the plaza circles. Scaling about the world
  // origin changes camera forward, which also changes camera-relative movement.
  function clampStupaCamera(pos, look) {
    const preferredMinR = frontCamActive
      ? config.WORLD.stupaColliderRadius + 0.15
      : Math.max(20.5, config.WORLD.stupaColliderRadius + 0.6);
    // The player can enter the camera's comfort margin. Relax that margin
    // instead of choosing the far intersection on the opposite side of the dome.
    const minR = Math.min(preferredMinR, Math.max(0, Math.hypot(look.x, look.z) - 0.05));
    const maxR = config.WORLD.buildingsInnerRadius - 0.6;
    const radius = Math.hypot(pos.x, pos.z);
    const rayLength = Math.hypot(pos.x - look.x, pos.z - look.z);
    if (rayLength > 1e-4 && (radius < minR || radius > maxR)) {
      const dx = (pos.x - look.x) / rayLength;
      const dz = (pos.z - look.z) / rayLength;
      const dot = look.x * dx + look.z * dz;
      const boundary = radius < minR ? minR : maxR;
      const discriminant = dot * dot + boundary * boundary - look.x * look.x - look.z * look.z;
      if (discriminant >= 0) {
        const root = Math.sqrt(discriminant);
        const near = -dot - root;
        const far = -dot + root;
        const length = radius < minR && near >= 0 ? near : far;
        if (length >= 0) {
          pos.x = look.x + dx * length;
          pos.z = look.z + dz * length;
          if (radius < minR && !frontCamActive) pos.y = Math.max(pos.y, 2.2);
        }
      }
    }
    pos.y = Math.max(0.55, pos.y);
  }

  function computeDungeonRayHit(look, pos, useFeather) {
    const lx = look.x;
    const lz = look.z;
    const dx = pos.x - lx;
    const dz = pos.z - lz;
    const horizLen = Math.hypot(dx, dz);
    if (horizLen < 1e-4) return { t: 1, underDoorLintel: false };

    let tMax = 1;
    let underDoorLintel = false;
    const ux = dx / horizLen;
    const uz = dz / horizLen;

    // 1. Active Terma box & circle colliders from ctx.colliders
    const colliders = ctx.colliders;
    if (Array.isArray(colliders)) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (!c || c.zone !== 'terma') continue;
        if (
          c.type === 'box' &&
          Number.isFinite(c.minX) &&
          Number.isFinite(c.maxX) &&
          Number.isFinite(c.minZ) &&
          Number.isFinite(c.maxZ)
        ) {
          const nearX = Math.max(c.minX, Math.min(c.maxX, lx));
          const nearZ = Math.max(c.minZ, Math.min(c.maxZ, lz));
          const lookClearance = Math.hypot(lx - nearX, lz - nearZ);
          if (lookClearance > 0.06) {
            const pad = Math.max(0.02, Math.min(0.32, lookClearance - 0.05));
            const tHit = intersectSegmentAABB2D(
              lx,
              lz,
              dx,
              dz,
              c.minX - pad,
              c.maxX + pad,
              c.minZ - pad,
              c.maxZ + pad
            );
            if (tHit < tMax) tMax = tHit;
          }
        } else if (c.type === 'circle' && Number.isFinite(c.x) && Number.isFinite(c.z) && (c.r || 0) >= 0.4) {
          const tCyl = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, c.x, c.z, c.r, useFeather);
          if (tCyl < tMax) tMax = tCyl;
        }
      }
    }

    // 2. Terma dungeon rooms: inner wall planes, doorway jambs & lintels, closed-wall rock crags, and pillars
    let rooms = ctx.dungeon?.getLayout?.()?.rooms || state.dungeon?.rooms;
    if (!Array.isArray(rooms) || rooms.length === 0) {
      const bWorld = state.dungeon?.bossRoomWorld || state.dungeon?.exitRoomWorld || state.dungeon?.startRoomWorld;
      const fallbackWx = bWorld?.x ?? (Math.abs(lx) > 500 ? 6960 + Math.round((lx - 6960) / 16) * 16 : Math.round(lx / 16) * 16);
      const fallbackWz = bWorld?.z ?? (-40 + Math.round((lz + 40) / 16) * 16);
      rooms = [{
        wx: fallbackWx,
        wz: fallbackWz,
        role: state.dungeon?.floor === 3 || bWorld === state.dungeon?.bossRoomWorld ? 'boss' : 'normal',
        template: 'mandala',
        doors: { N: false, S: false, E: false, W: false },
      }];
    }

    let currentRoom = null;
    let bestRoomDist = Infinity;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (!r || !Number.isFinite(r.wx) || !Number.isFinite(r.wz)) continue;
      const d = Math.max(Math.abs(lx - r.wx), Math.abs(lz - r.wz));
      if (d < bestRoomDist) {
        bestRoomDist = d;
        currentRoom = r;
      }
    }

    const baseWallHalf = 7.08;
    const doorSafeHalf = 2.42;
    const activeBoss =
      state.boss?.active ||
      (state.bossActive ? (ctx.bosses?.getActiveBoss?.() || true) : ctx.bosses?.getActiveBoss?.());
    const bossLocked = Boolean(activeBoss && !activeBoss.dead);

    if (currentRoom && bestRoomDist <= 8.8) {
      const { wx, wz } = currentRoom;
      const doors = currentRoom.doors || {};
      const inBossInterior =
        currentRoom.role === 'boss' && Math.abs(lx - wx) <= 7.35 && Math.abs(lz - wz) <= 7.35;
      const sealDoors = bossLocked || inBossInterior;

      // North wall (z = wz - 8.0)
      if (dz < -1e-5) {
        const nLim = Math.min(7.32, Math.max(baseWallHalf, (wz - lz) + 0.22));
        const zWall = wz - nLim;
        if (lz > zWall && lz + dz * tMax < zWall) {
          const tCross = (zWall - lz) / dz;
          const xAtWall = lx + dx * tCross;
          const tOuter = Math.min(1, (wz - 8.0 - lz) / dz);
          const xAtOuter = lx + dx * tOuter;
          const canPassDoor = Boolean(doors.N) && !sealDoors && Math.abs(xAtWall - wx) <= doorSafeHalf && Math.abs(xAtOuter - wx) <= doorSafeHalf;
          if (!canPassDoor) {
            if (tCross >= 0 && tCross < tMax) tMax = tCross;
          } else {
            underDoorLintel = true;
          }
        }
      }
      // South wall (z = wz + 8.0)
      if (dz > 1e-5) {
        const sLim = Math.min(7.32, Math.max(baseWallHalf, (lz - wz) + 0.22));
        const zWall = wz + sLim;
        if (lz < zWall && lz + dz * tMax > zWall) {
          const tCross = (zWall - lz) / dz;
          const xAtWall = lx + dx * tCross;
          const tOuter = Math.min(1, (wz + 8.0 - lz) / dz);
          const xAtOuter = lx + dx * tOuter;
          const canPassDoor = Boolean(doors.S) && !sealDoors && Math.abs(xAtWall - wx) <= doorSafeHalf && Math.abs(xAtOuter - wx) <= doorSafeHalf;
          if (!canPassDoor) {
            if (tCross >= 0 && tCross < tMax) tMax = tCross;
          } else {
            underDoorLintel = true;
          }
        }
      }
      // West wall (x = wx - 8.0)
      if (dx < -1e-5) {
        const wLim = Math.min(7.32, Math.max(baseWallHalf, (wx - lx) + 0.22));
        const xWall = wx - wLim;
        if (lx > xWall && lx + dx * tMax < xWall) {
          const tCross = (xWall - lx) / dx;
          const zAtWall = lz + dz * tCross;
          const tOuter = Math.min(1, (wx - 8.0 - lx) / dx);
          const zAtOuter = lz + dz * tOuter;
          const canPassDoor = Boolean(doors.W) && !sealDoors && Math.abs(zAtWall - wz) <= doorSafeHalf && Math.abs(zAtOuter - wz) <= doorSafeHalf;
          if (!canPassDoor) {
            if (tCross >= 0 && tCross < tMax) tMax = tCross;
          } else {
            underDoorLintel = true;
          }
        }
      }
      // East wall (x = wx + 8.0)
      if (dx > 1e-5) {
        const eLim = Math.min(7.32, Math.max(baseWallHalf, (lx - wx) + 0.22));
        const xWall = wx + eLim;
        if (lx < xWall && lx + dx * tMax > xWall) {
          const tCross = (xWall - lx) / dx;
          const zAtWall = lz + dz * tCross;
          const tOuter = Math.min(1, (wx + 8.0 - lx) / dx);
          const zAtOuter = lz + dz * tOuter;
          const canPassDoor = Boolean(doors.E) && !sealDoors && Math.abs(zAtWall - wz) <= doorSafeHalf && Math.abs(zAtOuter - wz) <= doorSafeHalf;
          if (!canPassDoor) {
            if (tCross >= 0 && tCross < tMax) tMax = tCross;
          } else {
            underDoorLintel = true;
          }
        }
      }
    }

    // 3. Check corner pillars, closed-wall rock crags, and interior pillars across nearby rooms
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (!r || !Number.isFinite(r.wx) || !Number.isFinite(r.wz)) continue;
      if (Math.abs(lx - r.wx) > 20 || Math.abs(lz - r.wz) > 20) continue;
      const { wx, wz } = r;
      const doors = r.doors || {};

      // 4 Corner pillars per room at (wx ± 7.3, wz ± 7.3), visual radius 0.66m
      for (let k = 0; k < DUNGEON_CORNER_OFFSETS.length; k++) {
        const [ox, oz] = DUNGEON_CORNER_OFFSETS[k];
        const tCyl = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, wx + ox, wz + oz, 0.66, useFeather);
        if (tCyl < tMax) tMax = tCyl;
      }

      // Closed-wall craggy rock formations protruding inward to ±6.26m at offset ±4.2m
      if (!doors.N) {
        for (const s of [-1, 1]) {
          const tCrag = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, wx + s * 4.2, wz - 7.55, 1.24, useFeather);
          if (tCrag < tMax) tMax = tCrag;
        }
      }
      if (!doors.S) {
        for (const s of [-1, 1]) {
          const tCrag = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, wx + s * 4.2, wz + 7.55, 1.24, useFeather);
          if (tCrag < tMax) tMax = tCrag;
        }
      }
      if (!doors.W) {
        for (const s of [-1, 1]) {
          const tCrag = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, wx - 7.55, wz + s * 4.2, 1.24, useFeather);
          if (tCrag < tMax) tMax = tCrag;
        }
      }
      if (!doors.E) {
        for (const s of [-1, 1]) {
          const tCrag = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, wx + 7.55, wz + s * 4.2, 1.24, useFeather);
          if (tCrag < tMax) tMax = tCrag;
        }
      }

      // Interior pillars in non-boss colonnade and corridor rooms
      if (r.role !== 'boss') {
        if (r.template === 'colonnade') {
          for (let k = 0; k < DUNGEON_COLONNADE_OFFSETS.length; k++) {
            const [ox, oz] = DUNGEON_COLONNADE_OFFSETS[k];
            const tCyl = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, wx + ox, wz + oz, 0.56, useFeather);
            if (tCyl < tMax) tMax = tCyl;
          }
        } else if (r.template === 'corridor') {
          for (let k = 0; k < DUNGEON_CORRIDOR_OFFSETS.length; k++) {
            const [ox, oz] = DUNGEON_CORRIDOR_OFFSETS[k];
            const tCyl = intersectSegmentPillar2D(lx, lz, ux, uz, horizLen, wx + ox, wz + oz, 0.53, useFeather);
            if (tCyl < tMax) tMax = tCyl;
          }
        }
      }

      // Check if look or clamped camera sits near an open doorway arch lintel (doorHeight = 4.35m)
      const endX = lx + dx * tMax;
      const endZ = lz + dz * tMax;
      if (
        (doors.N && Math.abs(endZ - (wz - 8.0)) < 1.35 && Math.abs(endX - wx) < 3.1) ||
        (doors.S && Math.abs(endZ - (wz + 8.0)) < 1.35 && Math.abs(endX - wx) < 3.1) ||
        (doors.W && Math.abs(endX - (wx - 8.0)) < 1.35 && Math.abs(endZ - wz) < 3.1) ||
        (doors.E && Math.abs(endX - (wx + 8.0)) < 1.35 && Math.abs(endZ - wz) < 3.1)
      ) {
        underDoorLintel = true;
      }
    }

    return {
      t: Math.max(0.03, Math.min(1, tMax)),
      underDoorLintel,
    };
  }

  function clampDungeonCamera(pos, look, dt = 0.016, isPostLerp = false) {
    const dx = pos.x - look.x;
    const dy = pos.y - look.y;
    const dz = pos.z - look.z;
    const curHorizDist = Math.hypot(dx, dz);

    if (!isPostLerp) {
      const { t: tMax, underDoorLintel } = computeDungeonRayHit(look, pos, true);
      if (tMax <= dungeonRayScale) {
        dungeonRayScale = tMax;
      } else {
        const recoverRate = 1 - Math.exp(-Math.max(0.001, dt) * 9.0);
        dungeonRayScale = Math.min(tMax, dungeonRayScale + (tMax - dungeonRayScale) * recoverRate);
      }
      const t = dungeonRayScale;
      if (!frontCamActive && t < 0.48) {
        const squeeze = Math.max(0, Math.min(1, (0.48 - t) / 0.40));
        const liftY = squeeze * squeeze * (3 - 2 * squeeze) * 0.36;
        look.y += liftY;
      }
      pos.x = look.x + dx * t;
      pos.z = look.z + dz * t;
      pos.y = look.y + dy * t;
      lastDesiredHorizDist = Math.hypot(pos.x - look.x, pos.z - look.z);

      const terrainY = ctx.world ? ctx.world.getHeight(pos.x, pos.z) : 0;
      const minFloorY = terrainY + 0.58;
      const maxCeilY = terrainY + (underDoorLintel ? 3.88 : 4.45);
      pos.y = Math.max(minFloorY, Math.min(maxCeilY, pos.y));
      return;
    }

    const { t: rawHard, underDoorLintel } = computeDungeonRayHit(look, pos, false);
    let tHard = rawHard;
    if (dungeonRayScale < 0.999 && curHorizDist > lastDesiredHorizDist + 1e-4 && curHorizDist > 1e-4) {
      tHard = Math.min(tHard, lastDesiredHorizDist / curHorizDist);
    }
    if (tHard < 1) {
      pos.x = look.x + dx * tHard;
      pos.y = look.y + dy * tHard;
      pos.z = look.z + dz * tHard;
    }
    const terrainY = ctx.world ? ctx.world.getHeight(pos.x, pos.z) : 0;
    const minFloorY = terrainY + 0.58;
    const maxCeilY = terrainY + (underDoorLintel ? 3.88 : 4.45);
    pos.y = Math.max(minFloorY, Math.min(maxCeilY, pos.y));
  }

  function hasActiveDungeonGeometry() {
    if (state.zone !== 'terma') return false;
    if (ctx.dungeon?.getLayout?.()?.rooms?.length) return true;
    return Array.isArray(ctx.colliders) && ctx.colliders.some((c) => c && c.zone === 'terma');
  }

  function clampWildCamera(pos, look, mapDef, dt = 0.016, isPostLerp = false) {
    if (hasActiveDungeonGeometry()) {
      clampDungeonCamera(pos, look, dt, isPostLerp);
      return;
    }
    const wOrigin = mapDef?.origin || config.WILD?.origin || { x: 1000, z: 0 };
    const maxR = ((mapDef?.walkRadius ?? config.WILD?.walkRadius) || 70) + 15;
    const cdx = pos.x - wOrigin.x;
    const cdz = pos.z - wOrigin.z;
    const radius = Math.hypot(cdx, cdz);
    const rayLength = Math.hypot(pos.x - look.x, pos.z - look.z);
    if (rayLength > 1e-4 && radius > maxR) {
      const ldx = look.x - wOrigin.x;
      const ldz = look.z - wOrigin.z;
      const dx = (pos.x - look.x) / rayLength;
      const dz = (pos.z - look.z) / rayLength;
      const dot = ldx * dx + ldz * dz;
      const discriminant = dot * dot + maxR * maxR - ldx * ldx - ldz * ldz;
      if (discriminant >= 0) {
        const length = Math.max(0.5, -dot + Math.sqrt(discriminant));
        pos.x = look.x + dx * length;
        pos.z = look.z + dz * length;
      }
    }
    const terrainY = ctx.world ? ctx.world.getHeight(pos.x, pos.z) : 0;
    pos.y = Math.max(terrainY + 0.55, pos.y);
    if (state.caveCeilingY != null && (state.caveFactor || 0) > 0.1) {
      const maxCaveY = Math.max(terrainY + 2.2, state.caveCeilingY);
      pos.y = Math.min(pos.y, maxCaveY);
    }
  }

  function setFrontCam(active, silent = false) {
    const next = Boolean(active);
    if (frontCamActive === next) return frontCamActive;
    frontCamActive = next;
    state.frontCam = frontCamActive;
    if (frontCamActive) {
      savedFollowDistance = targetDistance;
      yaw = wrapAngle((state.player.heading || 0) + Math.PI);
      pitch = 0.04;
      targetDistance = 2.25;
      if (!silent) {
        bus.emit('toast', { key: 'toast.frontCamOn', kind: 'info' });
      }
    } else {
      yaw = state.player.heading || 0;
      pitch = 0.14;
      targetDistance = Math.max(4.5, savedFollowDistance || 6.8);
      if (!silent) {
        bus.emit('toast', { key: 'toast.frontCamOff', kind: 'info' });
      }
    }
    bus.emit('camera:frontChanged', { active: frontCamActive });
    return frontCamActive;
  }

  bus.on('camera:setFront', (payload) => {
    setFrontCam(Boolean(payload?.active), Boolean(payload?.silent));
  });

  bus.on('appearance:zoomMode', (payload) => {
    const mode = payload?.mode || state.customizeZoomMode || 'face';
    studioTargetDist = mode === 'body' ? 2.65 : 1.52;
  });

  bus.on('game:start', () => {
    yaw = state.player.heading || 0;
    pitch = 0.08;
    targetDistance = 6.8;
    if (frontCamActive) {
      setFrontCam(false, true);
    }
  });

  function snapCameraToPlayer() {
    yaw = frontCamActive
      ? wrapAngle((state.player.heading || 0) + Math.PI)
      : (state.player.heading || 0);
    const pPos = state.player.position;
    const isStupa = (state.zone === 'stupa');
    const lookHeight = 1.45;
    smoothedStupaLookOffset.set(0, 0, 0);
    desiredLook.set(pPos.x, pPos.y + lookHeight, pPos.z);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    desiredPos.set(
      pPos.x + Math.sin(yaw) * cosP * distance,
      pPos.y + 1.35 + sinP * distance,
      pPos.z + Math.cos(yaw) * cosP * distance
    );
    dungeonRayScale = 1;
    if (isStupa) {
      clampStupaCamera(desiredPos, desiredLook);
    } else if (hasActiveDungeonGeometry()) {
      clampDungeonCamera(desiredPos, desiredLook, 1, false);
    } else {
      const terrainY = ctx.world ? ctx.world.getHeight(desiredPos.x, desiredPos.z) : 0;
      desiredPos.y = Math.max(terrainY + 0.65, desiredPos.y);
    }
    currentPos.copy(desiredPos);
    currentLook.copy(desiredLook);
    introBlend = 1;
    wasIntro = false;
    camera.position.copy(currentPos);
    camera.lookAt(currentLook);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  }

  bus.on('zone:change', snapCameraToPlayer);
  bus.on('dungeon:floorLoaded', snapCameraToPlayer);

  function computeIntroCamera(elapsed) {
    // Slow clockwise panoramic orbit inside the plaza ring framing the Buddha eyes & spire
    const angle = elapsed * 0.14 + 0.9;
    const radius = 33.5 + Math.sin(elapsed * 0.23) * 1.5;
    const height = 10.2 + Math.sin(elapsed * 0.19) * 1.2;
    introPos.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    introLook.set(0, 14.5 + Math.sin(elapsed * 0.15) * 0.5, 0);
  }

  // Initialize camera immediately for frame 0
  computeIntroCamera(0);
  currentPos.copy(introPos);
  currentLook.copy(introLook);
  camera.position.copy(currentPos);
  camera.lookAt(currentLook);

  function update(dt) {
    const input = ctx.input;
    combatLockTimer = Math.max(0, combatLockTimer - dt);
    const toggledByKeyboard = keyboardTogglePending;
    keyboardTogglePending = false;

    // 0. Studio Customization Camera (active in either 'intro' or 'play')
    if (state.customizing) {
      const pPos = state.player.position;
      const heading = state.player.heading || 0;
      const isBody = state.customizeZoomMode === 'body';

      if (input && input.zoom !== 0) {
        studioTargetDist = Math.max(1.15, Math.min(3.5, studioTargetDist + input.zoom * 0.004));
      }
      studioDist += (studioTargetDist - studioDist) * Math.min(1, dt * 10);

      // Place camera in front of the player's base heading (+PI)
      const camYaw = heading + Math.PI;
      const forwardX = Math.sin(camYaw);
      const forwardZ = Math.cos(camYaw);
      // Camera right vector (when looking from desiredPos toward pPos)
      const rightX = -Math.cos(heading);
      const rightZ = Math.sin(heading);

      // Shift look target slightly right on desktop so character stands on the left side of the drawer
      const isWide = typeof window !== 'undefined' && window.innerWidth > 780;
      const sideShift = isWide ? (studioDist * 0.17) : 0;
      const lookY = isBody ? (pPos.y + 0.96) : (pPos.y + 1.38);
      const camY = isBody ? (pPos.y + 1.08) : (pPos.y + 1.41);

      desiredLook.set(
        pPos.x + rightX * sideShift,
        lookY,
        pPos.z + rightZ * sideShift
      );
      desiredPos.set(
        pPos.x + forwardX * studioDist + rightX * sideShift,
        camY,
        pPos.z + forwardZ * studioDist + rightZ * sideShift
      );

      const s = 1 - Math.exp(-dt * 7.5);
      currentPos.lerp(desiredPos, s);
      currentLook.lerp(desiredLook, s);
      camera.position.copy(currentPos);
      camera.lookAt(currentLook);
      camera.updateMatrixWorld();
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      return;
    }

    if (state.mode === 'intro') {
      wasIntro = true;
      introBlend = 0;
      computeIntroCamera(state.elapsed);
      const s = 1 - Math.exp(-dt * 4);
      currentPos.lerp(introPos, s);
      currentLook.lerp(introLook, s);
      camera.position.copy(currentPos);
      camera.lookAt(currentLook);
      return;
    }

    if (wasIntro) {
      wasIntro = false;
      yaw = state.player.heading || 0;
    }

    if (introBlend < 1) {
      introBlend = Math.min(1, introBlend + dt * 1.8);
    }

    // Toggle auto-follow or front portrait view via mapped input.
    if (input?.pressed?.('toggleCameraLock') && !state.uiOpen && !toggledByKeyboard) {
      toggleAutoFollow(false);
    }
    if (input?.pressed?.('toggleFrontCam') && !state.uiOpen) {
      setFrontCam(!frontCamActive);
    }

    // 1. Read manual look & zoom input
    const lookSensitivity = 0.0048;
    const minZoomDist = frontCamActive ? 1.35 : 1.75;
    if (input) {
      if (input.look.dx !== 0 || input.look.dy !== 0) {
        yaw -= input.look.dx * lookSensitivity;
        pitch += input.look.dy * lookSensitivity;
        pitch = Math.max(-0.12, Math.min(1.18, pitch));
      }
      if (input.zoom !== 0) {
        targetDistance = Math.max(minZoomDist, Math.min(14, targetDistance + input.zoom * 0.01));
      }
    }

    distance += (targetDistance - distance) * Math.min(1, dt * 10);

    // 2. Horizontal yaw stability:
    // - In 'off' and default 'smart' modes (when not in frontCam portrait mode), NEVER auto-rotate
    //   horizontal yaw during play movement. The camera angle stays strictly where the player
    //   placed it with mouse/touch so movement never spins the camera or overrides mouse look.
    // - In 'on' mode, gently follow behind the player ONLY when moving straight forward outside
    //   combat and dense object clusters after 4.0s without manual camera input.
    const timeSinceLook = (performance.now() - (input?.lastLookTime ?? -1e9)) * 0.001;
    const moveX = Math.abs(input?.move?.x || 0);
    const moveY = input?.move?.y ?? 1;
    const headingDelta = Math.abs(wrapAngle((state.player.heading || 0) - yaw));
    const isForwardOnly = moveY > 0.5 && moveX < 0.15 && headingDelta <= Math.PI * 0.58;
    const combatLocked = isInCombatOrTargeted();
    const canAutoFollow = frontCamActive
      ? ((autoFollowMode !== 'smart' || !combatLocked) && timeSinceLook > 1.4)
      : (autoFollowMode === 'on' && !combatLocked && !isNearDenseCluster() && isForwardOnly && timeSinceLook > 4.0);
    if (state.player.isMoving && canAutoFollow) {
      const targetYaw = frontCamActive
        ? wrapAngle((state.player.heading || 0) + Math.PI)
        : (state.player.heading || 0);
      yaw = lerpAngle(yaw, targetYaw, dt * (frontCamActive ? 3.2 : 0.85));
    }

    // 3. Optional side-angle framing during prostration so full-body bow + stupa are visible
    let activeYaw = yaw;
    let activePitch = pitch;
    let activeDist = distance;
    // Lower lookHeight smoothly when zoomed in close or in frontCam mode so we frame the face/chest!
    const closeFactor = Math.max(0, Math.min(1, (3.8 - distance) / 1.8));
    let lookHeight = frontCamActive
      ? (distance < 1.85 ? 1.38 : 1.24)
      : (1.45 - 0.12 * closeFactor);

    if (state.player.action === 'prostrate' && !frontCamActive) {
      const sideYaw = state.player.heading + 1.08;
      activeYaw = lerpAngle(yaw, sideYaw, 0.65);
      activePitch = Math.max(0.14, Math.min(0.42, pitch * 0.7 + 0.08));
      activeDist = Math.max(4.4, distance * 0.82);
      lookHeight = 0.95;
    } else if (state.player.action === 'prostrate' && frontCamActive) {
      lookHeight = 0.82;
    }

    const isStupa = (state.zone === 'stupa');
    const mapDef = !isStupa ? ctx.world?.getMap(state.zone) : null;
    const pPos = state.player.position;
    desiredLook.set(pPos.x, pPos.y + lookHeight, pPos.z);

    stupaLookOffset.set(0, 0, 0);
    if (isStupa && !frontCamActive) {
      // Bias look target toward the stupa dome & Buddha eyes when zoomed out, fade out when zoomed in close
      const stupaBiasWeight = 1 - closeFactor;
      const toStupaDist = Math.hypot(pPos.x, pPos.z);
      if (toStupaDist > 1 && state.player.action !== 'prostrate' && stupaBiasWeight > 0.01) {
        // Keep the shifted viewing ray outside the physical collider even when
        // the player hugs the inner kora boundary.
        const horizontalBias = Math.min(0.32 * stupaBiasWeight,
          Math.max(0, toStupaDist - config.WORLD.stupaColliderRadius - 0.1));
        stupaLookOffset.set(
          (-pPos.x / toStupaDist) * horizontalBias,
          0.65 * stupaBiasWeight,
          (-pPos.z / toStupaDist) * horizontalBias
        );
      }
    }
    smoothedStupaLookOffset.lerp(stupaLookOffset, 1 - Math.exp(-dt * 4.5));
    desiredLook.add(smoothedStupaLookOffset);

    const cosP = Math.cos(activePitch);
    const sinP = Math.sin(activePitch);
    desiredPos.set(
      pPos.x + smoothedStupaLookOffset.x + Math.sin(activeYaw) * cosP * activeDist,
      pPos.y + (frontCamActive ? 1.28 : 1.35) + sinP * activeDist,
      pPos.z + smoothedStupaLookOffset.z + Math.cos(activeYaw) * cosP * activeDist
    );

    if (isStupa) {
      // 4. Keep camera outside stupa collider (r > ~20.1) and above plaza ground
      clampStupaCamera(desiredPos, desiredLook);
    } else {
      clampWildCamera(desiredPos, desiredLook, mapDef, dt, false);
    }

    // 5. Smooth damping (and blend from intro orbit right after game:start)
    const followFactor = 1 - Math.exp(-dt * (state.player.action === 'prostrate' ? 4.5 : 9.0));
    if (introBlend < 1) {
      computeIntroCamera(state.elapsed);
      const ease = introBlend * introBlend * (3 - 2 * introBlend);
      currentPos.lerpVectors(introPos, desiredPos, ease);
      currentLook.lerpVectors(introLook, desiredLook, ease);
    } else {
      currentPos.lerp(desiredPos, followFactor);
      currentLook.lerp(desiredLook, followFactor);
    }

    // Re-enforce ground & stupa/terrain clearance on interpolated position
    if (isStupa) {
      if (introBlend >= 0.99) clampStupaCamera(currentPos, currentLook);
      if (currentPos.y < 0.55) currentPos.y = 0.55;
    } else {
      if (introBlend >= 0.99) clampWildCamera(currentPos, currentLook, mapDef, dt, true);
      else {
        const curTerrainY = ctx.world ? ctx.world.getHeight(currentPos.x, currentPos.z) : 0;
        if (currentPos.y < curTerrainY + 0.55) currentPos.y = curTerrainY + 0.55;
        if (state.caveCeilingY != null && (state.caveFactor || 0) > 0.1) {
          const maxCaveY = Math.max(curTerrainY + 2.2, state.caveCeilingY);
          if (currentPos.y > maxCaveY) currentPos.y = maxCaveY;
        }
      }
    }

    camera.position.copy(currentPos);
    camera.lookAt(currentLook);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  }

  const api = {
    update,
    getYaw() { return yaw; },
    setYaw(nextYaw) { if (Number.isFinite(nextYaw)) yaw = wrapAngle(nextYaw); },
    isFrontCam() { return frontCamActive; },
    setFrontCam,
    toggleFrontCam() { return setFrontCam(!frontCamActive); },
    getAutoFollowMode() { return autoFollowMode; },
    setAutoFollowMode,
    toggleAutoFollow,
    isCombatLocked() { return Boolean(isInCombatOrTargeted()); },
  };
  ctx.cameraRig = api;
  ctx.debug?.register?.('cameraRig', api);
  return api;
}
