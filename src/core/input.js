/**
 * Input — keyboard / mouse-drag / wheel / touch (virtual joystick + drag-look).
 *
 * Frame model: DOM events accumulate into "pending" buffers. `update()` runs FIRST
 * each frame and publishes those buffers as the current frame's values, so every
 * other module sees the same snapshot during the frame; the snapshot is replaced at
 * the next `update()`.
 *
 * API:
 *   move  {x, y}   −1..1 (y = forward)
 *   run   bool
 *   look  {dx, dy} pixels accumulated since last frame (touch already scaled)
 *   zoom  number   wheel delta accumulated since last frame (+ = zoom out)
 *   pressed(action) → true only during the frame after it was pressed
 *   trigger(action) → programmatic press (on-screen buttons)
 *   isTouch, lastLookTime (state.elapsed-free: performance.now() ms)
 */
const ACTION_KEYS = {
  KeyE: 'interact',
  Enter: 'interact',
  KeyF: 'feed',
  KeyQ: 'prostrate',
  Digit1: 'prostrate',
  Numpad1: 'prostrate',
  KeyR: 'chant',
  Space: 'chant',
  KeyH: 'toggleHud',
  KeyP: 'pause',
};

const MOVE_KEYS = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

const JOY_RADIUS = 56;     // px
const TOUCH_LOOK_SCALE = 1.35;

function isTypingTarget(el) {
  if (!el || el === document.body) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return !['range', 'checkbox', 'radio', 'button', 'submit'].includes(type);
  }
  return false;
}

export function createInput(ctx) {
  const canvas = ctx.renderer?.domElement || document.querySelector('canvas');
  const held = new Set();
  let pendingActions = new Set();
  let frameActions = new Set();
  const pendingLook = { dx: 0, dy: 0 };
  let pendingZoom = 0;

  const isTouch = typeof window !== 'undefined' &&
    (('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));

  const api = {
    move: { x: 0, y: 0 },
    run: false,
    look: { dx: 0, dy: 0 },
    zoom: 0,
    isTouch,
    /** performance.now() of the last manual camera input (used by cameraRig auto-follow). */
    lastLookTime: -1e9,
    pressed(action) { return frameActions.has(action); },
    trigger(action) { pendingActions.add(action); },
    isHeld(code) { return held.has(code); },
    update() {
      frameActions = pendingActions;
      pendingActions = new Set();
      api.look.dx = pendingLook.dx;
      api.look.dy = pendingLook.dy;
      pendingLook.dx = 0;
      pendingLook.dy = 0;
      api.zoom = pendingZoom;
      pendingZoom = 0;

      // Keyboard vector
      let x = 0, y = 0;
      for (const code of held) {
        const m = MOVE_KEYS[code];
        if (m) { x += m[0]; y += m[1]; }
      }
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      const kl = Math.hypot(x, y);
      if (kl > 1) { x /= kl; y /= kl; }
      let run = held.has('ShiftLeft') || held.has('ShiftRight');

      // Joystick overrides when active
      if (joy.id !== null) {
        const len = Math.hypot(joy.dx, joy.dy);
        const n = Math.min(1, len / JOY_RADIUS);
        if (len > 4) {
          x = (joy.dx / len) * n;
          y = (-joy.dy / len) * n;
        } else { x = 0; y = 0; }
        run = n > 0.92;
      }
      api.move.x = x;
      api.move.y = y;
      api.run = run;
    },
  };

  // ------------------------------------------------------------ keyboard
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    held.add(e.code);
    if (MOVE_KEYS[e.code] && e.target?.tagName === 'INPUT') {
      // range sliders would otherwise steal arrow keys
      e.preventDefault();
      e.target.blur();
    }
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (!e.repeat) {
      const a = ACTION_KEYS[e.code];
      if (a) {
        if (e.code === 'Enter' && e.target && e.target.tagName === 'BUTTON') return;
        pendingActions.add(a);
      }
    }
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); });
  window.addEventListener('blur', () => { held.clear(); releaseJoy(); dragId = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) held.clear(); });

  // ------------------------------------------------------------ joystick DOM
  const joyEl = document.createElement('div');
  joyEl.id = 'joystick';
  joyEl.className = 'joystick';
  joyEl.setAttribute('aria-hidden', 'true');
  joyEl.innerHTML = '<div class="joystick__ring"></div><div class="joystick__knob"></div>';
  (document.getElementById('ui') || document.body).appendChild(joyEl);
  const knobEl = joyEl.querySelector('.joystick__knob');

  const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  function releaseJoy() {
    joy.id = null; joy.dx = 0; joy.dy = 0;
    joyEl.classList.remove('is-active');
    knobEl.style.transform = 'translate(-50%, -50%)';
  }

  // ------------------------------------------------------------ pointer (mouse + touch)
  let dragId = null;
  let lastX = 0, lastY = 0;
  let lookTouchId = null;

  if (canvas) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        if (ctx.state.mode !== 'play') return;
        if (e.clientX < window.innerWidth * 0.5 && joy.id === null) {
          joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = 0; joy.dy = 0;
          joyEl.style.left = `${e.clientX}px`;
          joyEl.style.top = `${e.clientY}px`;
          joyEl.classList.add('is-active');
        } else if (lookTouchId === null) {
          lookTouchId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
        }
        try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        e.preventDefault();
        return;
      }
      if (e.button === 0 || e.button === 2) {
        dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
        try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        canvas.classList.add('is-dragging');
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === joy.id) {
        let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
        const len = Math.hypot(dx, dy);
        if (len > JOY_RADIUS) {
          // drag the base along so the stick never "sticks" at the rim
          const over = len - JOY_RADIUS;
          joy.ox += (dx / len) * over; joy.oy += (dy / len) * over;
          dx = e.clientX - joy.ox; dy = e.clientY - joy.oy;
          joyEl.style.left = `${joy.ox}px`;
          joyEl.style.top = `${joy.oy}px`;
        }
        joy.dx = dx; joy.dy = dy;
        knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        return;
      }
      if (e.pointerId === lookTouchId) {
        pendingLook.dx += (e.clientX - lastX) * TOUCH_LOOK_SCALE;
        pendingLook.dy += (e.clientY - lastY) * TOUCH_LOOK_SCALE;
        lastX = e.clientX; lastY = e.clientY;
        api.lastLookTime = performance.now();
        return;
      }
      if (e.pointerId === dragId) {
        pendingLook.dx += e.clientX - lastX;
        pendingLook.dy += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        api.lastLookTime = performance.now();
      }
    });

    const end = (e) => {
      if (e.pointerId === joy.id) releaseJoy();
      if (e.pointerId === lookTouchId) lookTouchId = null;
      if (e.pointerId === dragId) { dragId = null; canvas.classList.remove('is-dragging'); }
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', (e) => {
      if (e.pointerId === dragId) { dragId = null; canvas.classList.remove('is-dragging'); }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= 400;
      pendingZoom += Math.max(-300, Math.min(300, d));
      api.lastLookTime = performance.now();
    }, { passive: false });
  }

  return api;
}
