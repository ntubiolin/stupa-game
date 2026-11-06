import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { PHOTO_TARGET, PHOTO_TOLERANCE } from '../src/data/story/photography.js';

const cssHook = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { createMemorySystem, evaluatePose } = await import('../src/story/memorySystem.js');
cssHook.deregister();

test('includes each tolerance boundary and rejects errors just outside it', () => {
  assert.equal(evaluatePose(PHOTO_TARGET).matched, true);
  for (const [field, threshold] of Object.entries({
    x: PHOTO_TOLERANCE.position,
    y: PHOTO_TOLERANCE.position,
    z: PHOTO_TOLERANCE.position,
    yaw: PHOTO_TOLERANCE.yaw,
    pitch: PHOTO_TOLERANCE.pitch,
    fov: PHOTO_TOLERANCE.fov,
  })) {
    for (const direction of [-1, 1]) {
      const offset = threshold * direction;
      const boundary = { ...PHOTO_TARGET, [field]: PHOTO_TARGET[field] + offset };
      assert.equal(evaluatePose(boundary).matched, true, `${field} ${offset}`);
      const outside = { ...boundary, [field]: boundary[field] + 0.0001 * direction };
      assert.equal(evaluatePose(outside).matched, false, `${field} ${outside[field]}`);
    }
  }
  const diagonal = evaluatePose({ ...PHOTO_TARGET, x: 2, z: PHOTO_TARGET.z + 2 });
  assert.equal(diagonal.errors.position, Math.sqrt(8));
  assert.equal(diagonal.matched, false);
});

test('takes the shortest wrapped yaw difference and rejects malformed poses', () => {
  const target = { ...PHOTO_TARGET, yaw: -Math.PI + 0.01 };
  const pose = { ...PHOTO_TARGET, yaw: Math.PI - 0.01 };
  const result = evaluatePose(pose, target, PHOTO_TOLERANCE);
  assert.ok(Math.abs(result.errors.yaw - 0.02) < 1e-12);
  assert.equal(result.matched, true);
  for (const bad of [null, {}, { ...PHOTO_TARGET, x: null }, { ...PHOTO_TARGET, yaw: '0' },
    { ...PHOTO_TARGET, y: NaN }, { ...PHOTO_TARGET, z: Infinity }, { ...PHOTO_TARGET, fov: 0 }]) {
    assert.equal(evaluatePose(bad).matched, false);
  }
});

class Element extends EventTarget {
  constructor(tag) {
    super();
    this.tag = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.open = false;
    this.clientWidth = 900;
    this.clientHeight = 600;
  }

  setAttribute(key, value) { this.attributes[key] = value; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  setPointerCapture(id) { this.pointer = id; }
  hasPointerCapture(id) { return this.pointer === id; }
  releasePointerCapture() { this.pointer = null; }

  append(...children) {
    for (const child of children) child.parent = this;
    this.children.push(...children);
  }

  remove() {
    this.parent.children = this.parent.children.filter(child => child !== this);
  }
}

function harness(t, initialPose, cameraResponds = true) {
  const body = new Element('body');
  globalThis.document = {
    body,
    createElement: tag => new Element(tag),
    createElementNS: (_, tag) => new Element(tag),
  };
  t.after(() => { delete globalThis.document; });
  let beat = 'photography';
  let pose = { ...initialPose };
  const signals = [];
  const state = { uiOpen: false };
  const story = {
    getState: () => ({ beat }),
    signal(name) {
      assert.equal(state.uiOpen, false);
      signals.push(name);
      beat = 'restoration';
    },
  };
  const storyCamera = {
    getPose: () => ({ ...pose }),
    setPose: change => { if (cameraResponds) pose = { ...pose, ...change }; },
  };
  const ctx = { state, story, storyCamera, i18n: { t: key => key, onChange: () => () => {} } };
  const memory = createMemorySystem(ctx);
  assert.equal(ctx.memory, memory);
  const [dialog] = body.children;
  const [viewfinder, , panel] = dialog.children;
  const [assist, zoomIn, , capture] = panel.children.at(-1).children;
  return { body, state, signals, memory, dialog, viewfinder, assist, zoomIn, capture, storyCamera };
}

function dispatch(target, type, props) {
  const event = Object.assign(new Event(type, { cancelable: true }), props);
  target.dispatchEvent(event);
  return event;
}

test('keyboard and pointer controls change the camera, while wrong poses cannot advance', t => {
  const { memory, state, signals, dialog, capture, viewfinder, zoomIn, storyCamera } =
    harness(t, { ...PHOTO_TARGET, yaw: 0.16 });
  assert.equal(memory.open(), true);
  assert.equal(memory.open(), false);
  assert.equal(state.uiOpen, true);
  assert.equal(dialog.dataset.matched, 'false');
  dispatch(capture, 'click');
  assert.deepEqual(signals, []);
  assert.equal(memory.isOpen(), true);

  const [overlay] = viewfinder.children;
  assert.equal(overlay.attributes.viewBox, '-750 -500 1500 1000');
  assert.equal(overlay.children.length, 4);
  viewfinder.clientWidth = 360;
  memory.update();
  assert.equal(overlay.attributes.viewBox, '-300 -500 600 1000');
  dispatch(viewfinder, 'pointerdown', { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
  dispatch(viewfinder, 'pointermove', { pointerId: 1, clientX: 5, clientY: 0 });
  assert.equal(storyCamera.getPose().yaw, 0.14);
  assert.equal(dispatch(dialog, 'keydown', { code: 'ArrowRight' }).defaultPrevented, true);
  dispatch(dialog, 'keydown', { code: 'KeyW' });
  dispatch(zoomIn, 'click');
  assert.equal(storyCamera.getPose().z, 30.65);
  assert.equal(storyCamera.getPose().fov, 51);
  assert.equal(dialog.dataset.matched, 'true');
  assert.deepEqual(signals, []);
  dispatch(dialog, 'keydown', { code: 'KeyC' });
  dispatch(capture, 'click');
  assert.equal(state.uiOpen, false);
  assert.equal(viewfinder.hasPointerCapture(1), false);
  assert.deepEqual(signals, ['photo:matched']);
  assert.equal(memory.open(), false);
});

test('align assist sets the real target pose and still requires an explicit capture', t => {
  const { memory, state, storyCamera, signals, dialog, assist, capture, body } =
    harness(t, { ...PHOTO_TARGET, x: -4, pitch: -0.2, fov: 82 });
  assert.equal(memory.open(), true);
  dispatch(assist, 'click');
  assert.deepEqual(storyCamera.getPose(), PHOTO_TARGET);
  assert.deepEqual(signals, []);
  const cancel = dispatch(dialog, 'cancel');
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(state.uiOpen, false);
  assert.equal(memory.open(), true);
  dispatch(capture, 'click');
  assert.deepEqual(signals, ['photo:matched']);
  memory.dispose();
  assert.deepEqual(body.children, []);
});

test('assist cannot bypass the evaluator if the camera does not reach the target', t => {
  const { memory, state, signals, assist, capture } = harness(t, { ...PHOTO_TARGET, x: 4 }, false);
  state.uiOpen = true;
  assert.equal(memory.open(), false);
  state.uiOpen = false;
  assert.equal(memory.open(), true);
  dispatch(assist, 'click');
  dispatch(capture, 'click');
  assert.deepEqual(signals, []);
  assert.equal(memory.isOpen(), true);
  assert.equal(memory.close(), true);
  assert.equal(memory.close(), false);
});
