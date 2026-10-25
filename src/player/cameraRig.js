/**
 * Camera rig — cinematic orbit in 'intro' mode, smooth third-person follow
 * with mouse/touch orbit, zoom (4–14m), stupa collision avoidance, and
 * side-angle framing during prostrations in 'play' mode.
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
  let distance = 6.8;        // meters (clamped 4..14)
  let targetDistance = 6.8;

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

  bus.on('game:start', () => {
    // Align yaw smoothly behind player when entering play mode
    yaw = state.player.heading || 0;
    pitch = 0.08;
    targetDistance = 6.8;
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

    // 1. Read manual look & zoom input
    const lookSensitivity = 0.0048;
    if (input) {
      if (input.look.dx !== 0 || input.look.dy !== 0) {
        yaw -= input.look.dx * lookSensitivity;
        pitch += input.look.dy * lookSensitivity;
        pitch = Math.max(-0.08, Math.min(1.18, pitch));
      }
      if (input.zoom !== 0) {
        targetDistance = Math.max(4, Math.min(14, targetDistance + input.zoom * 0.01));
      }
    }

    distance += (targetDistance - distance) * Math.min(1, dt * 10);

    // 2. Gentle auto-follow behind moving player when user hasn't dragged camera recently
    const timeSinceLook = input ? (performance.now() - input.lastLookTime) * 0.001 : 999;
    if (state.player.isMoving && timeSinceLook > 2.2) {
      yaw = lerpAngle(yaw, state.player.heading, dt * 1.35);
    }

    // 3. Optional side-angle framing during prostration so full-body bow + stupa are visible
    let activeYaw = yaw;
    let activePitch = pitch;
    let activeDist = distance;
    let lookHeight = 1.45;

    if (state.player.action === 'prostrate') {
      const sideYaw = state.player.heading + 1.08;
      activeYaw = lerpAngle(yaw, sideYaw, 0.65);
      activePitch = Math.max(0.14, Math.min(0.42, pitch * 0.7 + 0.08));
      activeDist = Math.max(4.4, distance * 0.82);
      lookHeight = 0.95;
    }

    const pPos = state.player.position;
    desiredLook.set(pPos.x, pPos.y + lookHeight, pPos.z);

    // Bias look target toward the stupa dome & Buddha eyes when facing inward for grander framing
    const toStupaDist = Math.hypot(pPos.x, pPos.z);
    if (toStupaDist > 1 && state.player.action !== 'prostrate') {
      desiredLook.x += (-pPos.x / toStupaDist) * 1.25;
      desiredLook.z += (-pPos.z / toStupaDist) * 1.25;
      desiredLook.y += 1.65;
    }

    const cosP = Math.cos(activePitch);
    const sinP = Math.sin(activePitch);
    desiredPos.set(
      pPos.x + Math.sin(activeYaw) * cosP * activeDist,
      pPos.y + 1.35 + sinP * activeDist,
      pPos.z + Math.cos(activeYaw) * cosP * activeDist
    );

    // 4. Keep camera outside stupa collider (r > ~20.5) and above plaza ground
    const minCamR = Math.max(20.5, config.WORLD.stupaColliderRadius + 0.6);
    const maxCamR = config.WORLD.buildingsInnerRadius - 0.6;
    const camR = Math.hypot(desiredPos.x, desiredPos.z);
    if (camR < minCamR && camR > 1e-4) {
      const scale = minCamR / camR;
      desiredPos.x *= scale;
      desiredPos.z *= scale;
      desiredPos.y = Math.max(desiredPos.y, 2.2);
    } else if (camR > maxCamR) {
      const scale = maxCamR / camR;
      desiredPos.x *= scale;
      desiredPos.z *= scale;
    }
    desiredPos.y = Math.max(0.65, desiredPos.y);

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

    // Re-enforce ground & stupa clearance on interpolated position
    const curR = Math.hypot(currentPos.x, currentPos.z);
    if (curR < minCamR && curR > 1e-4 && introBlend >= 0.99) {
      currentPos.x *= minCamR / curR;
      currentPos.z *= minCamR / curR;
    }
    if (currentPos.y < 0.55) currentPos.y = 0.55;

    camera.position.copy(currentPos);
    camera.lookAt(currentLook);
  }

  return {
    update,
    getYaw() { return yaw; },
  };
}
