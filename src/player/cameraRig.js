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
    if (combatLockTimer > 0 || state.boss?.active || state.player?.combatTarget || state.combatTarget) return true;
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

  function clampWildCamera(pos, look, mapDef) {
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

  bus.on('zone:change', () => {
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
    if (isStupa) {
      clampStupaCamera(desiredPos, desiredLook);
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
  });

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
      clampWildCamera(desiredPos, desiredLook, mapDef);
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
      if (introBlend >= 0.99) clampWildCamera(currentPos, currentLook, mapDef);
      else {
        const curTerrainY = ctx.world ? ctx.world.getHeight(currentPos.x, currentPos.z) : 0;
        if (currentPos.y < curTerrainY + 0.55) currentPos.y = curTerrainY + 0.55;
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
  return api;
}
