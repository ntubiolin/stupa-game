/**
 * Boudhanath Stupa — bootstrap & game loop.
 * OWNER: architect (main agent). Subagents must NOT edit this file; request changes instead.
 *
 * Every module follows the same contract:
 *   const mod = createX(ctx, ...extra)  ->  { update(dt), ...optional API }
 * and reads/writes shared data through `ctx` (see ARCHITECTURE.md).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import './style.css';
import { CONFIG } from './config.js';
import { createBus } from './core/events.js';
import { createInput } from './core/input.js';
import { createDebug } from './core/debug.js';
import { i18n } from './i18n.js';

import { createSky } from './world/sky.js';
import { createStupa } from './world/stupa.js';
import { createPrayerFlags } from './world/prayerFlags.js';
import { createEnvironment } from './world/environment.js';
import { createWilderness } from './world/wilderness.js';

import { createLamps } from './gameplay/lamps.js';
import { createMonkeys } from './gameplay/monkeys.js';
import { createItems } from './gameplay/items.js';
import { createMantra } from './gameplay/mantra.js';
import { createPlayer } from './player/player.js';
import { createCameraRig } from './player/cameraRig.js';

import { createZones } from './systems/zones.js';
import { createVitals } from './systems/vitals.js';
import { createInteraction } from './systems/interaction.js';
import { createMerit } from './systems/merit.js';
import { createAudio } from './systems/audio.js';
import { createHud } from './ui/hud.js';

// ---------------------------------------------------------------- renderer
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.RENDER.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);

// ---------------------------------------------------------------- shared state
const state = {
  mode: 'intro',                 // 'intro' (title screen, orbit camera) | 'play'
  zone: 'stupa',                 // 'stupa' | 'wild'
  elapsed: 0,
  time: {
    t: CONFIG.TIME.start,        // 0..1, 0 = midnight
    speed: 1,                    // multiplier; 0 when paused
    sunDir: new THREE.Vector3(0, 1, 0), // written by sky
    nightFactor: 0,              // 0 = full day, 1 = full night; written by sky
  },
  wind: { dir: new THREE.Vector2(1, 0.3).normalize(), strength: 0.6 },
  player: {
    position: new THREE.Vector3(),
    heading: 0,                  // yaw in radians (0 = facing -Z)
    velocity: new THREE.Vector3(),
    isMoving: false,
    action: 'idle',              // 'idle' | 'walk' | 'run' | 'prostrate' | 'light' | 'feed'
  },
};

const stupaGroup = new THREE.Group();
stupaGroup.name = 'StupaZone';
scene.add(stupaGroup);

const wildGroup = new THREE.Group();
wildGroup.name = 'WildZone';
wildGroup.visible = false;
scene.add(wildGroup);

const ctx = {
  THREE,
  scene,
  camera,
  renderer,
  stupaGroup,
  wildGroup,
  bus: createBus(),
  state,
  config: CONFIG,
  i18n,
  /** Static obstacles. World modules push into this. Shapes: {type:'circle',x,z,r} | {type:'box',minX,maxX,minZ,maxZ} */
  colliders: [],
  /** Things the player can interact with. See ARCHITECTURE.md "Interactable". */
  interactables: [],
  input: null,
};
ctx.input = createInput(ctx);
createDebug(ctx);

// ---------------------------------------------------------------- modules (order = update order)
const sky = createSky(ctx);
const stupa = createStupa(ctx);
const flags = createPrayerFlags(ctx, stupa.flagAnchors);
const environment = createEnvironment(ctx);
const wilderness = createWilderness(ctx);
const zones = createZones(ctx);

const player = createPlayer(ctx);
const mantra = createMantra(ctx);
ctx.mantra = mantra;
const items = createItems(ctx);
const lamps = createLamps(ctx);
const monkeys = createMonkeys(ctx);
const vitals = createVitals(ctx);
const cameraRig = createCameraRig(ctx);

const merit = createMerit(ctx);
const interaction = createInteraction(ctx);
const audio = createAudio(ctx);
const hud = createHud(ctx);

const modules = [
  ctx.input,
  sky, stupa, flags, environment,
  wilderness, zones,
  player, mantra, items, lamps, monkeys,
  vitals,
  cameraRig,
  merit, interaction, audio, hud,
];

// ---------------------------------------------------------------- post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const { strength, radius, threshold } = CONFIG.RENDER.bloom;
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), strength, radius, threshold);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- lifecycle
ctx.bus.on('game:start', () => { state.mode = 'play'; });

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', onResize);

function updateWind(t) {
  // Slow-varying gusts: layered sines, strength in ~[0.25, 1.1]
  const g = 0.5 + 0.3 * Math.sin(t * 0.37) + 0.2 * Math.sin(t * 1.13 + 1.7) + 0.1 * Math.sin(t * 2.9);
  state.wind.strength = 0.25 + 0.85 * Math.max(0, g);
  const a = 0.3 + 0.25 * Math.sin(t * 0.05);
  state.wind.dir.set(Math.cos(a), Math.sin(a));
}

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  state.elapsed += dt;
  state.time.t = (state.time.t + (dt * state.time.speed) / CONFIG.TIME.dayLengthSec) % 1;
  updateWind(state.elapsed);

  for (const m of modules) m.update(dt);

  renderer.info.reset();
  composer.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug handle (dev only)
if (import.meta.env.DEV) window.__game = { ctx, modules: { sky, stupa, flags, environment, wilderness, zones, player, mantra, items, lamps, monkeys, vitals, cameraRig, merit, interaction, audio, hud } };
