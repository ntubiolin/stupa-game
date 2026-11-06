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

import { createLamps } from './gameplay/lamps.js';
import { createMonkeys } from './gameplay/monkeys.js';
import { createItems } from './gameplay/items.js';
import { createGroundLoot } from './gameplay/groundLoot.js';
import { createMantra } from './gameplay/mantra.js';
import { createEnemies } from './gameplay/enemies.js';
import { createBosses } from './gameplay/bosses/index.js';
import { createProjectiles } from './gameplay/projectiles.js';
import { createNpcs } from './gameplay/npcs.js';
import { createPotions } from './gameplay/potions.js';
import { createShrines } from './gameplay/shrines.js';
import { createWaypoints } from './gameplay/waypoints.js';
import { createAllies } from './gameplay/allies.js';
import { createActiveSkills } from './gameplay/skills/activeSkills.js';
import { createTargeting } from './gameplay/targeting.js';
import { createPlayer } from './player/player.js';
import { createCameraRig } from './player/cameraRig.js';

import { createZones } from './systems/zones.js';
import { createSave } from './systems/save.js';
import { createLoot } from './systems/loot.js';
import { createInventory } from './systems/inventory.js';
import { createVitals } from './systems/vitals.js';
import { createSkills } from './systems/skills.js';
import { createPowers } from './systems/powers.js';
import { createQuests } from './systems/quests.js';
import { createCodex } from './systems/codex.js';
import { createInteraction } from './systems/interaction.js';
import { createMerit } from './systems/merit.js';
import { createAudio } from './systems/audio.js';
import { createHud } from './ui/hud.js';
import { createSkillbar } from './ui/skillbar.js';
import { createInventoryUi } from './ui/inventory.js';
import { createDialogue } from './ui/dialogue.js';
import { createQuestUi } from './ui/quests.js';
import { createWorldMap } from './ui/worldmap.js';
import { createMinimap } from './ui/minimap.js';
import { createCredits } from './ui/credits.js';
import { createDungeon } from './gameplay/dungeon.js';
import { createCommunity } from './systems/community.js';
import { createLampOfferingUi } from './ui/lampOffering.js';
import { createPersonalStupa } from './gameplay/personalStupa.js';
import { createStupaBuilderUi } from './ui/stupaBuilder.js';
import { createCoop } from './systems/coop.js';
import { createRemotePilgrims } from './gameplay/remotePilgrims.js';
import { createCoopLobbyUi } from './ui/coopLobby.js';

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
  zone: 'stupa',                 // active map id ('stupa' | 'wild' | ...)
  zoneType: 'hub',               // 'hub' | 'combat' | 'dungeon'
  uiOpen: false,                 // true when a fullscreen UI modal is open
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

const zoneGroups = {
  stupa: stupaGroup,
  wild: wildGroup,
};

const ctx = {
  THREE,
  scene,
  camera,
  renderer,
  stupaGroup,
  wildGroup,
  zoneGroups,
  world: null,
  bus: createBus(),
  state,
  config: CONFIG,
  i18n,
  /** Static obstacles. World modules push into this. Shapes: {type:'circle',x,z,r} | {type:'box',minX,maxX,minZ,maxZ} */
  colliders: [],
  /** Things the player can interact with. See ARCHITECTURE.md "Interactable". */
  interactables: [],
  input: null,
  save: null,
};
ctx.input = createInput(ctx);
createDebug(ctx);
ctx.save = createSave(ctx);
i18n.bindSave?.(ctx.save);

// ---------------------------------------------------------------- modules (order = update order)
const zones = createZones(ctx);
const sky = createSky(ctx);
const stupa = createStupa(ctx);
const flags = createPrayerFlags(ctx, stupa.flagAnchors);
const environment = createEnvironment(ctx);

const player = createPlayer(ctx);
const mantra = createMantra(ctx);
ctx.mantra = mantra;
const enemies = createEnemies(ctx);
ctx.enemies = enemies;
const projectiles = createProjectiles(ctx);
ctx.projectiles = projectiles;
const targeting = createTargeting(ctx);
const loot = createLoot(ctx);
const inventory = createInventory(ctx);
const groundLoot = createGroundLoot(ctx);
const items = createItems(ctx);
const merit = createMerit(ctx);
const community = createCommunity(ctx);
const lamps = createLamps(ctx);
const monkeys = createMonkeys(ctx);
const vitals = createVitals(ctx);
const personalStupa = createPersonalStupa(ctx);
const protectors = createAllies(ctx);
const powers = createPowers(ctx);
const activeSkills = createActiveSkills(ctx);
const skills = createSkills(ctx);
const potions = createPotions(ctx);
const shrines = createShrines(ctx);
const codex = createCodex(ctx);
const waypoints = createWaypoints(ctx);
const quests = createQuests(ctx);
const npcs = createNpcs(ctx);
const coop = createCoop(ctx);
const remotePilgrims = createRemotePilgrims(ctx);
const cameraRig = createCameraRig(ctx);

const interaction = createInteraction(ctx);
const audio = createAudio(ctx);
const hud = createHud(ctx);
const lampOfferingUi = createLampOfferingUi(ctx);
const stupaBuilderUi = createStupaBuilderUi(ctx);
const coopLobbyUi = createCoopLobbyUi(ctx);
const skillbar = createSkillbar(ctx);
const inventoryUi = createInventoryUi(ctx);
const dialogue = createDialogue(ctx);
const questUi = createQuestUi(ctx);
const worldmap = createWorldMap(ctx);
const minimap = createMinimap(ctx);
const bosses = createBosses(ctx);
const dungeon = createDungeon(ctx);
const credits = createCredits(ctx);

const modules = [
  ctx.input,
  ctx.save,
  sky, stupa, flags, environment,
  zones,
  player, mantra, enemies, bosses, dungeon, projectiles, targeting, loot, inventory, groundLoot, items,
  community, lamps, personalStupa, monkeys,
  vitals, skills, potions, shrines,
  codex, waypoints, quests, npcs,
  coop, remotePilgrims,
  cameraRig,
  merit, interaction, audio, hud, lampOfferingUi, stupaBuilderUi, coopLobbyUi, skillbar, inventoryUi, dialogue, questUi, minimap, credits,
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

let lastFrameTime = performance.now();
function frame() {
  const now = performance.now();
  const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
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
if (import.meta.env.DEV) window.__game = { ctx, modules: { sky, stupa, flags, environment, zones, player, mantra, enemies, bosses, projectiles, loot, inventory, groundLoot, items, lamps, monkeys, vitals, skills, potions, shrines, codex, waypoints, quests, npcs, cameraRig, merit, interaction, audio, hud, skillbar, inventoryUi, dialogue, questUi, worldmap, minimap } };
