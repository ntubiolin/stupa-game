import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCinematicArt } from '../src/story/cinematicArt.js';

function setup() {
  const scene = new THREE.Scene();
  const state = { zone: 'stupa', time: { t: 0.3, speed: 1 } };
  scene.fog = new THREE.FogExp2(0xc4b7a3, 0.0022);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  scene.add(sun, new THREE.HemisphereLight(), new THREE.PointLight());
  const stupaGroup = new THREE.Group();
  const pharping = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.8 });
  const compile = shader => { shader.uniforms.original = { value: 17 }; };
  material.onBeforeCompile = compile;
  stupaGroup.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  scene.add(stupaGroup, pharping);

  const renderer = {
    domElement: { ownerDocument: { defaultView: { devicePixelRatio: 2 } } },
    pixelRatio: 2,
    shadowMap: { enabled: true },
    getPixelRatio() { return this.pixelRatio; },
    setPixelRatio(value) { this.pixelRatio = value; },
    toneMappingExposure: 0.88,
  };
  let override = null;
  const sky = {
    setTimeOverride({ t, speed }) {
      state.time.t = t;
      state.time.speed = speed;
      override = { targetT: t, speed };
      this.update();
      return override;
    },
    clearTimeOverride() { override = null; },
    getTimeOverride: () => override,
    update() {
      renderer.toneMappingExposure = 0.88;
      scene.environmentIntensity = 0.55;
      scene.fog.density = 0.0022;
      scene.fog.color.setHex(0xc4b7a3);
      sun.color.setHex(0xffefdc);
      sun.intensity = 0.2;
      sun.visible = true;
    },
  };
  const ctx = { THREE, scene, stupaGroup, zoneGroups: { pharping }, renderer, state, sky };
  const art = createCinematicArt(ctx);
  return { ctx, art, scene, state, sun, renderer, sky, material, compile, pharping };
}

test('cinematic uses existing lights and Legacy restores original material hooks and sky grade', () => {
  const { art, scene, sky, sun, material, compile, renderer } = setup();
  const shader = { fragmentShader: '#include <color_fragment>', uniforms: {} };
  material.onBeforeCompile(shader, renderer);
  assert.ok(material.roughness > 0.3);
  assert.ok(material.metalness < 0.8);
  assert.equal(shader.uniforms.original.value, 17);
  assert.match(shader.fragmentShader, /storyLuminance/);
  assert.equal(scene.children.filter(child => child.isPointLight).length, 1);
  assert.notEqual(scene.fog.density, 0.0022);

  sky.update();
  art.update();
  art.update();
  art.setPreset('legacy');
  assert.equal(material.roughness, 0.3);
  assert.equal(material.metalness, 0.8);
  assert.equal(material.onBeforeCompile, compile);
  assert.equal(scene.fog.density, 0.0022);
  assert.equal(scene.fog.color.getHex(), 0xc4b7a3);
  assert.equal(sun.intensity, 0.2);
  assert.equal(renderer.toneMappingExposure, 0.88);
  art.setPreset('cinematic');
  assert.ok(material.roughness > 0.3);
});

test('lighting presets fix time across A/B and low quality reduces DPR and shadows', () => {
  const { art, scene, state, renderer, sky } = setup();
  const hours = new Set();
  const fogs = new Set();
  for (const light of ['dawn', 'day', 'dusk']) {
    art.setLighting(light);
    hours.add(state.time.t);
    fogs.add(scene.fog.color.getHex());
    const time = state.time.t;
    art.setPreset('legacy');
    assert.equal(state.time.t, time);
    art.setPreset('cinematic');
    assert.equal(state.time.t, time);
  }
  assert.equal(hours.size, 3);
  assert.equal(fogs.size, 3);

  art.setQuality('low');
  assert.equal(renderer.getPixelRatio(), 1);
  assert.equal(renderer.shadowMap.enabled, false);
  art.setPreset('legacy');
  assert.deepEqual(art.getState(), { preset: 'legacy', lighting: 'dusk', quality: 'low' });
  art.setQuality('high');
  assert.equal(renderer.getPixelRatio(), 2);
  assert.equal(renderer.shadowMap.enabled, true);
  art.setQuality('low');
  art.dispose();
  assert.equal(renderer.getPixelRatio(), 2);
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(sky.getTimeOverride(), null);
  assert.deepEqual(state.time, { t: 0.3, speed: 1 });
});

test('a lazily populated Pharping group receives and releases the same material grade', () => {
  const { art, pharping, sky, state } = setup();
  const terrain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 });
  pharping.add(new THREE.Mesh(new THREE.BoxGeometry(), terrain));
  state.zone = 'pharping';
  sky.update();
  art.update();
  assert.equal(terrain.roughness, 1);
  art.dispose();
  assert.equal(terrain.roughness, 0.94);
});
