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
  const introPos = new THREE.Vector3();
  const introLook = new THREE.Vector3(0, 12, 0);

  // Initialize yaw behind the player's starting heading
  yaw = state.player.heading || 0;

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
    desiredLook.set(pPos.x, pPos.y + lookHeight, pPos.z);
    if (isStupa && !frontCamActive) {
      const toStupaDist = Math.hypot(pPos.x, pPos.z);
      if (toStupaDist > 1) {
        desiredLook.x += (-pPos.x / toStupaDist) * 1.25;
        desiredLook.z += (-pPos.z / toStupaDist) * 1.25;
        desiredLook.y += 1.65;
      }
    }
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    desiredPos.set(
      pPos.x + Math.sin(yaw) * cosP * distance,
      pPos.y + 1.35 + sinP * distance,
      pPos.z + Math.cos(yaw) * cosP * distance
    );
    if (!isStupa) {
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

    // Toggle front portrait view when pressing V
    if (input && input.pressed('toggleFrontCam') && !state.uiOpen) {
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

    // 2. Gentle auto-follow behind (or in front of) moving player when user hasn't dragged camera recently
    const timeSinceLook = input ? (performance.now() - input.lastLookTime) * 0.001 : 999;
    if (state.player.isMoving && timeSinceLook > (frontCamActive ? 1.4 : 2.2)) {
      const targetYaw = frontCamActive
        ? wrapAngle((state.player.heading || 0) + Math.PI)
        : (state.player.heading || 0);
      yaw = lerpAngle(yaw, targetYaw, dt * (frontCamActive ? 3.2 : 1.35));
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

    if (isStupa && !frontCamActive) {
      // Bias look target toward the stupa dome & Buddha eyes when zoomed out, fade out when zoomed in close
      const stupaBiasWeight = 1 - closeFactor;
      const toStupaDist = Math.hypot(pPos.x, pPos.z);
      if (toStupaDist > 1 && state.player.action !== 'prostrate' && stupaBiasWeight > 0.01) {
        desiredLook.x += (-pPos.x / toStupaDist) * 1.25 * stupaBiasWeight;
        desiredLook.z += (-pPos.z / toStupaDist) * 1.25 * stupaBiasWeight;
        desiredLook.y += 1.65 * stupaBiasWeight;
      }
    }

    const cosP = Math.cos(activePitch);
    const sinP = Math.sin(activePitch);
    desiredPos.set(
      pPos.x + Math.sin(activeYaw) * cosP * activeDist,
      pPos.y + (frontCamActive ? 1.28 : 1.35) + sinP * activeDist,
      pPos.z + Math.cos(activeYaw) * cosP * activeDist
    );

    if (isStupa) {
      // 4. Keep camera outside stupa collider (r > ~20.1) and above plaza ground
      const minCamR = frontCamActive
        ? config.WORLD.stupaColliderRadius + 0.15
        : Math.max(20.5, config.WORLD.stupaColliderRadius + 0.6);
      const maxCamR = config.WORLD.buildingsInnerRadius - 0.6;
      const camR = Math.hypot(desiredPos.x, desiredPos.z);
      if (camR < minCamR && camR > 1e-4) {
        const scale = minCamR / camR;
        desiredPos.x *= scale;
        desiredPos.z *= scale;
        if (!frontCamActive) desiredPos.y = Math.max(desiredPos.y, 2.2);
      } else if (camR > maxCamR) {
        const scale = maxCamR / camR;
        desiredPos.x *= scale;
        desiredPos.z *= scale;
      }
      desiredPos.y = Math.max(0.55, desiredPos.y);
    } else {
      const wOrigin = mapDef?.origin || config.WILD?.origin || { x: 1000, z: 0 };
      const cdx = desiredPos.x - wOrigin.x;
      const cdz = desiredPos.z - wOrigin.z;
      const camWildDist = Math.hypot(cdx, cdz);
      const maxCamWildDist = ((mapDef?.walkRadius ?? config.WILD?.walkRadius) || 70) + 10;
      if (camWildDist > maxCamWildDist) {
        const s = maxCamWildDist / (camWildDist || 1);
        desiredPos.x = wOrigin.x + cdx * s;
        desiredPos.z = wOrigin.z + cdz * s;
      }
      const terrainY = ctx.world ? ctx.world.getHeight(desiredPos.x, desiredPos.z) : 0;
      desiredPos.y = Math.max(terrainY + 0.55, desiredPos.y);
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
      const minCamR = frontCamActive
        ? config.WORLD.stupaColliderRadius + 0.15
        : Math.max(20.5, config.WORLD.stupaColliderRadius + 0.6);
      const curR = Math.hypot(currentPos.x, currentPos.z);
      if (curR < minCamR && curR > 1e-4 && introBlend >= 0.99) {
        currentPos.x *= minCamR / curR;
        currentPos.z *= minCamR / curR;
      }
      if (currentPos.y < 0.55) currentPos.y = 0.55;
    } else {
      const wOrigin = mapDef?.origin || config.WILD?.origin || { x: 1000, z: 0 };
      const cdx = currentPos.x - wOrigin.x;
      const cdz = currentPos.z - wOrigin.z;
      const curWildDist = Math.hypot(cdx, cdz);
      const maxCamWildDist = ((mapDef?.walkRadius ?? config.WILD?.walkRadius) || 70) + 10;
      if (curWildDist > maxCamWildDist) {
        const s = maxCamWildDist / (curWildDist || 1);
        currentPos.x = wOrigin.x + cdx * s;
        currentPos.z = wOrigin.z + cdz * s;
      }
      const curTerrainY = ctx.world ? ctx.world.getHeight(currentPos.x, currentPos.z) : 0;
      if (currentPos.y < curTerrainY + 0.55) currentPos.y = curTerrainY + 0.55;
    }

    camera.position.copy(currentPos);
    camera.lookAt(currentLook);
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  }

  return {
    update,
    getYaw() { return yaw; },
    isFrontCam() { return frontCamActive; },
    setFrontCam,
    toggleFrontCam() { return setFrontCam(!frontCamActive); },
  };
}
