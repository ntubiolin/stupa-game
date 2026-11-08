const EYE_HEIGHT = 1.68;
const WALK_SPEED = 4;
const FAST_WALK_SPEED = 6;
const MAX_MOVE_STEP = 0.15;
const MAX_PITCH = Math.PI / 2 - 0.05;
const LOOK_SENSITIVITY = 0.004;
const JOYSTICK_RADIUS = 42;
const MOVE_KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
const LOOK_KEYS = {
  KeyJ: [1, 0], KeyL: [-1, 0],
  KeyI: [0, 1], KeyK: [0, -1],
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
function wrapAngle(angle) {
  if (angle >= -Math.PI && angle <= Math.PI) return angle;
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function createNarrativeCamera(ctx) {
  const { camera, config, renderer, state } = ctx;
  const canvas = renderer.domElement;
  const document = canvas.ownerDocument;
  const window = document.defaultView;
  const position = state.player.position;
  const radius = config.PLAYER.radius;
  const originalTouchAction = canvas.style.touchAction;
  const keys = new Set();
  const candidate = { x: 0, z: 0 };

  let yaw = state.player.heading || 0;
  let pitch = 0;
  let lookX = 0;
  let lookY = 0;
  let joystick = null;
  let lookPointer = null;
  let enabled = true;
  let disposed = false;
  let glide = null;
  let bobPhase = 0;

  const indicator = document.createElement('div');
  indicator.className = 'story-joystick';
  indicator.hidden = true;
  indicator.setAttribute('aria-hidden', 'true');
  canvas.parentElement.appendChild(indicator);
  canvas.style.touchAction = 'none';

  function isReducedMotion(options) {
    if (options?.reducedMotion !== undefined) return Boolean(options.reducedMotion);
    if (ctx.reducedMotion !== undefined) return Boolean(ctx.reducedMotion);
    return Boolean(window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  }

  function syncView(bobOffset = 0) {
    camera.position.set(position.x, position.y + EYE_HEIGHT + bobOffset, position.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    state.player.heading = yaw;
  }

  function inputBlocked() {
    return !enabled || state.uiOpen || document.hidden;
  }

  function clearInput() {
    keys.clear();
    lookX = 0;
    lookY = 0;
    const pointers = [joystick, lookPointer];
    joystick = null;
    lookPointer = null;
    indicator.hidden = true;
    for (const pointer of pointers) {
      if (pointer && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
    }
  }

  function onKeyDown(event) {
    const { code, target } = event;
    if (inputBlocked() || event.altKey || event.ctrlKey || event.metaKey) return;
    const shift = code === 'ShiftLeft' || code === 'ShiftRight';
    if (!shift && !Object.hasOwn(MOVE_KEYS, code) && !Object.hasOwn(LOOK_KEYS, code)) return;
    if (target?.closest?.('input, select, textarea, [contenteditable]')) return;
    if (code.startsWith('Arrow') && target?.closest?.('button, a')) return;
    keys.add(code);
    if (!shift) {
      glide = null;
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    if (inputBlocked() || event.button !== 0) return;
    const { pointerId: id, clientX: x, clientY: y } = event;
    const bounds = canvas.getBoundingClientRect();
    const isMove = event.pointerType === 'touch' && x < bounds.left + bounds.width / 2;
    if (isMove ? joystick : lookPointer) return;
    glide = null;
    if (isMove) {
      joystick = { id, x, y, dx: 0, dy: 0 };
      indicator.style.left = `${x}px`;
      indicator.style.top = `${y}px`;
      indicator.style.setProperty('--stick-x', '0px');
      indicator.style.setProperty('--stick-y', '0px');
      indicator.hidden = false;
    } else {
      lookPointer = { id, x, y };
    }
    canvas.setPointerCapture(id);
  }

  function onPointerMove(event) {
    if (inputBlocked()) return;
    const { pointerId: id, clientX: x, clientY: y } = event;
    if (joystick?.id === id) {
      const dx = x - joystick.x;
      const dy = y - joystick.y;
      const distance = Math.hypot(dx, dy);
      const scale = Math.min(1, JOYSTICK_RADIUS / (distance || 1));
      joystick.dx = distance > 4 ? dx * scale : 0;
      joystick.dy = distance > 4 ? dy * scale : 0;
      indicator.style.setProperty('--stick-x', `${joystick.dx}px`);
      indicator.style.setProperty('--stick-y', `${joystick.dy}px`);
    } else if (lookPointer?.id === id) {
      lookX += x - lookPointer.x;
      lookY += y - lookPointer.y;
      lookPointer.x = x;
      lookPointer.y = y;
    }
  }

  function onPointerEnd({ pointerId }) {
    if (joystick?.id === pointerId) {
      joystick = null;
      indicator.hidden = true;
    }
    if (lookPointer?.id === pointerId) lookPointer = null;
  }

  const listeners = [
    [window, 'keydown', onKeyDown],
    [window, 'keyup', onKeyUp],
    [window, 'blur', clearInput],
    [document, 'visibilitychange', clearInput],
    [canvas, 'pointerdown', onPointerDown],
    [canvas, 'pointermove', onPointerMove],
    [canvas, 'pointerup', onPointerEnd],
    [canvas, 'pointercancel', onPointerEnd],
    [canvas, 'lostpointercapture', onPointerEnd],
  ];
  for (const [target, name, handler] of listeners) target.addEventListener(name, handler);

  function limitToZone(x, z, zone) {
    const plaza = zone === 'stupa';
    const map = ctx.world.getMap(zone);
    const origin = plaza ? { x: 0, z: 0 } : map.origin;
    const min = plaza ? config.WORLD.stupaColliderRadius + radius : 0;
    const max = (plaza ? config.WORLD.walkRadius : map.walkRadius) - radius;
    const dx = x - origin.x;
    const dz = z - origin.z;
    const distance = Math.hypot(dx, dz);
    const scale = clamp(distance, min, max) / (distance || 1);
    candidate.x = origin.x + dx * scale;
    candidate.z = origin.z + (distance ? dz * scale : min);
  }

  function tryStep(dx, dz, zone) {
    limitToZone(position.x + dx, position.z + dz, zone);
    const { x, z } = candidate;
    for (const collider of ctx.colliders) {
      if (!collider || (collider.zone || 'stupa') !== zone) continue;
      if (collider.type === 'circle') {
        if (Math.hypot(x - collider.x, z - collider.z) < collider.r + radius - 1e-6) return false;
      } else if (collider.type === 'box') {
        const nearestX = clamp(x, collider.minX, collider.maxX);
        const nearestZ = clamp(z, collider.minZ, collider.maxZ);
        if (Math.hypot(x - nearestX, z - nearestZ) < radius) return false;
      }
    }
    position.x = x;
    position.z = z;
    return true;
  }

  syncView();
  return {
    update(dt) {
      if (disposed) return;
      state.player.isMoving = false;
      if (inputBlocked()) {
        if (keys.size || joystick || lookPointer || lookX || lookY) clearInput();
        glide = null;
        bobPhase = 0;
        syncView(0);
        return;
      }

      const seconds = clamp(dt, 0, 0.1);
      let strafe = 0;
      let forward = 0;
      let turn = 0;
      let tilt = 0;
      for (const code of keys) {
        const move = MOVE_KEYS[code];
        const look = LOOK_KEYS[code];
        if (move) {
          strafe += move[0];
          forward += move[1];
        } else if (look) {
          turn += look[0];
          tilt += look[1];
        }
      }
      if (strafe || forward || turn || tilt || lookX || lookY || joystick) {
        glide = null;
      }

      if (glide) {
        const glideDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        if (glideDt > 0) {
          glide.elapsed += glideDt;
          const t = clamp(glide.elapsed / glide.duration, 0, 1);
          const ease = t * t * (3 - 2 * t);
          position.x = glide.startX + (glide.targetX - glide.startX) * ease;
          position.y = (glide.startY + (glide.targetY - glide.startY) * ease) - EYE_HEIGHT;
          position.z = glide.startZ + (glide.targetZ - glide.startZ) * ease;
          yaw = wrapAngle(glide.startYaw + glide.deltaYaw * ease);
          pitch = clamp(glide.startPitch + (glide.targetPitch - glide.startPitch) * ease, -MAX_PITCH, MAX_PITCH);
          if (glide.targetFov !== glide.startFov) {
            camera.fov = clamp(glide.startFov + (glide.targetFov - glide.startFov) * ease, 25, 95);
            camera.updateProjectionMatrix();
          }
          const distMoved = Math.hypot(glide.targetX - glide.startX, glide.targetZ - glide.startZ);
          state.player.isMoving = t < 1 && distMoved > 1e-4;
          if (t >= 1) {
            const onComplete = glide.onComplete;
            glide = null;
            state.player.isMoving = false;
            syncView(0);
            onComplete?.();
          } else {
            const bob = (!isReducedMotion() && state.player.isMoving) ? Math.sin(glide.elapsed * 9) * 0.018 : 0;
            syncView(bob);
          }
        } else {
          syncView(0);
        }
        return;
      }

      yaw = wrapAngle(yaw - lookX * LOOK_SENSITIVITY + turn * seconds * 1.35);
      pitch = clamp(pitch - lookY * LOOK_SENSITIVITY + tilt * seconds, -MAX_PITCH, MAX_PITCH);
      lookX = 0;
      lookY = 0;

      if (joystick) {
        strafe = joystick.dx / JOYSTICK_RADIUS;
        forward = -joystick.dy / JOYSTICK_RADIUS;
      }
      strafe = clamp(strafe, -1, 1);
      forward = clamp(forward, -1, 1);
      const fastWalk = !joystick && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
      if (seconds > 0 && (strafe || forward)) {
        const speed = fastWalk ? FAST_WALK_SPEED : WALK_SPEED;
        const distance = speed * seconds / Math.max(1, Math.hypot(strafe, forward));
        const dx = (Math.cos(yaw) * strafe - Math.sin(yaw) * forward) * distance;
        const dz = (-Math.sin(yaw) * strafe - Math.cos(yaw) * forward) * distance;
        const { x, z } = position;
        const zone = state.zone || 'stupa';
        // Check intermediate positions so a slow frame cannot skip an obstacle.
        const steps = Math.ceil(Math.hypot(dx, dz) / MAX_MOVE_STEP);
        const stepX = dx / steps;
        const stepZ = dz / steps;
        for (let i = 0; i < steps; i++) {
          if (!tryStep(stepX, stepZ, zone)) {
            if (stepX) tryStep(stepX, 0, zone);
            if (stepZ) tryStep(0, stepZ, zone);
          }
        }
        state.player.isMoving = Math.hypot(position.x - x, position.z - z) > 1e-5;
        if (state.player.isMoving) position.y = ctx.world.getHeight(position.x, position.z, zone);
      }
      if (state.player.isMoving && !isReducedMotion()) {
        bobPhase += seconds * (fastWalk ? 11 : 8);
        syncView(Math.sin(bobPhase) * 0.02);
      } else {
        bobPhase = 0;
        syncView(0);
      }
    },
    getPose() {
      return { x: position.x, y: position.y + EYE_HEIGHT, z: position.z, yaw, pitch, fov: camera.fov };
    },
    setPose(pose) {
      if (disposed) return;
      glide = null;
      bobPhase = 0;
      lookX = 0;
      lookY = 0;
      if (Number.isFinite(pose.x)) position.x = pose.x;
      if (Number.isFinite(pose.y)) position.y = pose.y - EYE_HEIGHT;
      if (Number.isFinite(pose.z)) position.z = pose.z;
      if (Number.isFinite(pose.yaw)) yaw = wrapAngle(pose.yaw);
      if (Number.isFinite(pose.pitch)) pitch = clamp(pose.pitch, -MAX_PITCH, MAX_PITCH);
      if (Number.isFinite(pose.fov)) {
        camera.fov = clamp(pose.fov, 25, 95);
        camera.updateProjectionMatrix();
      }
      syncView(0);
    },
    glideTo(pose = {}, options = {}) {
      if (disposed) return false;
      const duration = options.duration ?? 0.85;
      if (isReducedMotion(options) || !(duration > 0)) {
        glide = null;
        this.setPose(pose);
        options.onComplete?.();
        return false;
      }
      lookX = 0;
      lookY = 0;
      const startX = position.x;
      const startY = position.y + EYE_HEIGHT;
      const startZ = position.z;
      const startYaw = yaw;
      const startPitch = pitch;
      const startFov = camera.fov;
      const targetX = Number.isFinite(pose.x) ? pose.x : startX;
      const targetY = Number.isFinite(pose.y) ? pose.y : startY;
      const targetZ = Number.isFinite(pose.z) ? pose.z : startZ;
      const targetYaw = Number.isFinite(pose.yaw) ? wrapAngle(pose.yaw) : startYaw;
      const targetPitch = Number.isFinite(pose.pitch) ? clamp(pose.pitch, -MAX_PITCH, MAX_PITCH) : startPitch;
      const targetFov = Number.isFinite(pose.fov) ? clamp(pose.fov, 25, 95) : startFov;
      glide = {
        elapsed: 0,
        duration,
        startX,
        startY,
        startZ,
        startYaw,
        startPitch,
        startFov,
        targetX,
        targetY,
        targetZ,
        targetYaw,
        deltaYaw: wrapAngle(targetYaw - startYaw),
        targetPitch,
        targetFov,
        onComplete: options.onComplete || null,
      };
      return true;
    },
    isGliding() {
      return Boolean(glide);
    },
    setEnabled(value) {
      enabled = Boolean(value);
      if (!enabled) {
        glide = null;
        clearInput();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      glide = null;
      clearInput();
      for (const [target, name, handler] of listeners) target.removeEventListener(name, handler);
      indicator.remove();
      canvas.style.touchAction = originalTouchAction;
    },
  };
}
