import { PHOTO_GUIDE_PATHS, PHOTO_TARGET, PHOTO_TOLERANCE } from '../data/story/photography.js';
import '../i18n/storyPhotography.js';
import '../ui/story/photography.css';

const RAD_TO_DEG = 180 / Math.PI;
const LIMIT_EPSILON = Number.EPSILON * 8;
const SVG_NS = 'http://www.w3.org/2000/svg';
const POSE_FIELDS = ['x', 'y', 'z', 'yaw', 'pitch', 'fov'];
const MOVE_KEYS = {
  KeyA: [-0.35, 0],
  KeyD: [0.35, 0],
  KeyW: [0, -0.35],
  KeyS: [0, 0.35],
};
const LOOK_KEYS = {
  ArrowLeft: [0.045, 0],
  ArrowRight: [-0.045, 0],
  ArrowUp: [0, 0.045],
  ArrowDown: [0, -0.045],
};

export function evaluatePose(pose, target = PHOTO_TARGET, tolerance = PHOTO_TOLERANCE) {
  if (!POSE_FIELDS.every(key => Number.isFinite(pose?.[key]) && Number.isFinite(target?.[key]))) {
    return { matched: false, errors: { position: Infinity, yaw: Infinity, pitch: Infinity, fov: Infinity } };
  }
  const yawDifference = pose.yaw - target.yaw;
  const errors = {
    position: Math.hypot(pose.x - target.x, pose.y - target.y, pose.z - target.z),
    yaw: Math.abs(Math.atan2(Math.sin(yawDifference), Math.cos(yawDifference))),
    pitch: Math.abs(pose.pitch - target.pitch),
    fov: Math.abs(pose.fov - target.fov),
  };
  const matched = pose.fov > 0 && pose.fov < 180 && target.fov > 0 && target.fov < 180 &&
    Object.entries(errors).every(([key, error]) =>
      Number.isFinite(tolerance?.[key]) && tolerance[key] >= 0 && error <= tolerance[key] + LIMIT_EPSILON
    );
  return { matched, errors };
}

function guidePath(points) {
  // Project the schematic through the fixed south-side target camera.
  const { x, y, z, fov, pitch } = PHOTO_TARGET;
  const sin = Math.sin(pitch);
  const cos = Math.cos(pitch);
  const lens = 500 / Math.tan(fov / RAD_TO_DEG / 2);
  return points.map(([px, py, pz], i) => {
    const dy = py - y;
    const dz = pz - z;
    const depth = sin * dy - cos * dz;
    const sx = (px - x) * lens / depth;
    const sy = -(cos * dy + sin * dz) * lens / depth;
    return `${i === 0 ? 'M' : 'L'}${sx.toFixed(2)} ${sy.toFixed(2)}`;
  }).join(' ');
}

function element(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createMemorySystem(ctx) {
  const { i18n, state, story, storyCamera } = ctx;
  const t = (key, params) => i18n.t(`story.photography.${key}`, params);
  let drag = null;
  let aspect = 0;
  let disposed = false;

  const dialog = element('dialog', 'story-photography');
  dialog.setAttribute('aria-labelledby', 'story-photography-title');
  const viewfinder = element('div', 'story-photography-viewfinder');
  const reference = document.createElementNS(SVG_NS, 'svg');
  reference.setAttribute('aria-hidden', 'true');
  for (const points of PHOTO_GUIDE_PATHS) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', guidePath(points));
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    reference.append(path);
  }
  viewfinder.append(reference);

  const header = element('header', 'story-photography-header');
  const title = element('h2');
  title.id = 'story-photography-title';
  const label = element('p');
  header.append(title, label);
  const panel = element('section', 'story-photography-panel');
  const status = element('p', 'story-photography-status');
  status.setAttribute('role', 'status');
  const errors = element('p', 'story-photography-errors');
  const keyboardHelp = element('p', 'story-photography-keyboard');
  const touchHelp = element('p', 'story-photography-touch');
  const actions = element('div', 'story-photography-actions');
  const assistButton = element('button');
  assistButton.dataset.action = 'assist';
  const captureButton = element('button', 'story-photography-capture');
  captureButton.dataset.action = 'capture';
  const closeButton = element('button');
  const zoomInButton = element('button', 'story-photography-zoom');
  const zoomOutButton = element('button', 'story-photography-zoom');
  zoomInButton.textContent = '+';
  zoomOutButton.textContent = '−';
  actions.append(assistButton, zoomInButton, zoomOutButton, captureButton, closeButton);
  panel.append(status, errors, keyboardHelp, touchHelp, actions);
  dialog.append(viewfinder, header, panel);
  document.body.append(dialog);

  function refreshLabels() {
    title.textContent = t('title');
    label.textContent = t('reference');
    keyboardHelp.textContent = t('keyboard');
    touchHelp.textContent = t('touch');
    assistButton.textContent = t('assist');
    captureButton.textContent = t('capture');
    closeButton.textContent = t('close');
    zoomInButton.setAttribute('aria-label', t('zoomIn'));
    zoomOutButton.setAttribute('aria-label', t('zoomOut'));
  }

  function refreshGuide() {
    const ratio = viewfinder.clientWidth / viewfinder.clientHeight;
    if (!Number.isFinite(ratio) || ratio <= 0 || ratio === aspect) return;
    aspect = ratio;
    reference.setAttribute('viewBox', `${-500 * ratio} -500 ${1000 * ratio} 1000`);
  }

  function refreshMatch() {
    const { matched, errors: diff } = evaluatePose(storyCamera.getPose());
    const message = t(matched ? 'aligned' : 'unaligned');
    if (status.textContent !== message) status.textContent = message;
    const numbers = t('errors', {
      position: diff.position.toFixed(1),
      yaw: (diff.yaw * RAD_TO_DEG).toFixed(0),
      pitch: (diff.pitch * RAD_TO_DEG).toFixed(0),
      fov: diff.fov.toFixed(0),
    });
    if (errors.textContent !== numbers) errors.textContent = numbers;
    if (dialog.dataset.matched !== String(matched)) dialog.dataset.matched = String(matched);
    return matched;
  }

  function open() {
    if (disposed || dialog.open || state.uiOpen || story.getState().beat !== 'photography') return false;
    refreshLabels();
    state.uiOpen = true;
    dialog.showModal();
    refreshGuide();
    refreshMatch();
    return true;
  }

  function close() {
    if (!dialog.open) return false;
    if (drag && viewfinder.hasPointerCapture(drag.id)) viewfinder.releasePointerCapture(drag.id);
    drag = null;
    state.uiOpen = false;
    dialog.close();
    return true;
  }

  function applyPose(pose) {
    if (!dialog.open) return;
    storyCamera.setPose(pose);
    refreshMatch();
  }

  function look(dYaw, dPitch) {
    const { yaw, pitch } = storyCamera.getPose();
    applyPose({ yaw: yaw + dYaw, pitch: pitch + dPitch });
  }

  function move(dx, dz) {
    const { x, z } = storyCamera.getPose();
    // Keep photo-mode adjustments in the open plaza around the marked viewpoint.
    applyPose({ x: clamp(x + dx, -6, 6), z: clamp(z + dz, 25, 37) });
  }

  function zoom(amount) {
    const { fov } = storyCamera.getPose();
    applyPose({ fov: fov + amount });
  }

  function capture() {
    if (!dialog.open || !refreshMatch()) return;
    close();
    story.signal('photo:matched');
  }

  assistButton.addEventListener('click', () => applyPose({ ...PHOTO_TARGET }));
  captureButton.addEventListener('click', capture);
  closeButton.addEventListener('click', close);
  zoomInButton.addEventListener('click', () => zoom(-4));
  zoomOutButton.addEventListener('click', () => zoom(4));
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const { code } = event;
    if (Object.hasOwn(MOVE_KEYS, code)) move(...MOVE_KEYS[code]);
    else if (Object.hasOwn(LOOK_KEYS, code)) look(...LOOK_KEYS[code]);
    else if (code === 'KeyC') capture();
    else return;
    event.preventDefault();
    event.stopPropagation();
  });
  viewfinder.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    viewfinder.setPointerCapture(drag.id);
  });
  viewfinder.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    look(-dx * 0.004, -dy * 0.004);
  });
  viewfinder.addEventListener('lostpointercapture', event => {
    if (drag?.id === event.pointerId) drag = null;
  });
  const offLang = i18n.onChange(() => {
    if (!dialog.open) return;
    refreshLabels();
    refreshMatch();
  });

  function update() {
    if (!dialog.open) return;
    refreshGuide();
    refreshMatch();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    close();
    offLang();
    dialog.remove();
  }

  const api = { open, close, isOpen: () => dialog.open, update, dispose };
  ctx.memory = api;
  return api;
}
