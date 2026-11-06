/** Isolated narrative bootstrap. Never constructs adventure gameplay or serializers. */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { createBus } from '../core/events.js';
import { createDebug } from '../core/debug.js';
import { createSave } from '../systems/save.js';
import { i18n } from '../i18n.js';
import '../i18n/storyRuntime.js';
import '../i18n/storyDirector.js';
import { createSky } from '../world/sky.js';
import { createStupa } from '../world/stupa.js';
import { createPrayerFlags } from '../world/prayerFlags.js';
import { createEnvironment } from '../world/environment.js';
import { PHARPING_MAP } from '../data/maps/pharping.js';
import { createStoryDirector } from './storyDirector.js';
import { createNarrativeCamera } from './narrativeCamera.js';
import { createCinematicArt } from './cinematicArt.js';
import './narrativeCamera.css';
import '../i18n/storyArt.js';
import { createPhone } from '../ui/story/phone.js';
import { createDocumentary } from '../ui/story/documentary.js';
import { createMemorySystem } from './memorySystem.js';
import './runtime.css';

const t = (key, args) => i18n.t(`mirror.${key}`, args);
const root = document.getElementById('ui');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.setAttribute('aria-label', t('controls'));
renderer.domElement.tabIndex = 0;
document.getElementById('app').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 600);
const stupaGroup = new THREE.Group(); scene.add(stupaGroup);
const state = { mode: 'story', zone: 'stupa', zoneType: 'hub', uiOpen: false, elapsed: 0,
  time: { t: .45, speed: 0, sunDir: new THREE.Vector3(0, 1, 0), nightFactor: 0 },
  wind: { dir: new THREE.Vector2(1, .3).normalize(), strength: .4 },
  player: { position: new THREE.Vector3(12, 0, 30), heading: 0, velocity: new THREE.Vector3(), isMoving: false, action: 'idle' } };
const ctx = { THREE, scene, camera, renderer, config: CONFIG, state, bus: createBus(), i18n, stupaGroup,
  zoneGroups: { stupa: stupaGroup }, colliders: [], interactables: [] };
createDebug(ctx); createSave(ctx, { writableSections: ['story'] }); // Deliberately no i18n.bindSave: narrative writes only story.
const mapInstances = {};
ctx.world = {
  getMap: (id = state.zone) => id === 'pharping' ? PHARPING_MAP : { id: 'stupa', origin: { x: 0, z: 0 }, walkRadius: CONFIG.WORLD.walkRadius, innerRadius: CONFIG.WORLD.stupaColliderRadius },
  getHeight: (x, z, id = state.zone) => mapInstances[id]?.getHeight(x, z) || 0,
  isCombatZone: () => false, isHub: () => true,
};
const sky = createSky(ctx);
const stupa = createStupa(ctx);
const flags = createPrayerFlags(ctx, stupa.flagAnchors);
const environment = createEnvironment(ctx);
const story = createStoryDirector(ctx); ctx.story = story;
const storyCamera = createNarrativeCamera(ctx); ctx.storyCamera = storyCamera;
const art = createCinematicArt(ctx); ctx.storyArt = art;
const phone = createPhone(ctx); ctx.phone = phone;
const documentary = createDocumentary(ctx); ctx.documentary = documentary;
const memory = createMemorySystem(ctx); ctx.memory = memory;

const hud = document.createElement('section'); hud.className = 'story-hud';
hud.innerHTML = `<header class="story-header"><a href="?" class="story-wordmark">${t('title')}<small>THE PERSON IN THE MIRROR</small></a><nav><button data-action="phone">${t('phone')}</button><button data-action="settings" aria-label="${t('settings')}">☷</button></nav></header><div class="story-waypoint" aria-hidden="true"><span>◇</span><small></small></div><section class="story-objective"><p class="story-category"></p><h2></h2><p class="story-hint"></p><div class="story-objective-actions"><button data-action="interact" class="story-action"></button><button data-action="guide" class="story-guide">${t('guide')}</button></div></section><footer class="story-footer"><span class="story-controls"></span><span class="story-save">${t('saved')}</span></footer>`;
root.append(hud);
const modal = document.createElement('section'); modal.className = 'story-modal'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); root.append(modal);
let modalCallback = null, modalKeys = null, previousFocus = null;
let arrivalCount = 0, visionCount = 0, losangLine = 0;
let currentTarget = null, currentLabel = '', currentAction = null;
let loading = false, beatToken = 0, currentBeat = 'prologue';
let ambient = null, soundOn = true;

function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true; modalCallback = null; modalKeys = null;
  state.uiOpen = isAnyModalOpen();
  renderer.domElement.focus({ preventScroll: true });
}
function isAnyModalOpen() { return !modal.hidden || phone.isOpen() || documentary.isOpen() || memory.isOpen() || loading; }
function clearModals() { closeModal(); phone.close(); documentary.close(); memory.close(); state.uiOpen = loading; }
function showCard(titleKey, bodyKey, actionKey, callback, category = 'fiction', extra = '') {
  if (phone.isOpen() || documentary.isOpen() || memory.isOpen()) return;
  previousFocus = document.activeElement;
  modal.hidden = false; state.uiOpen = true; modalCallback = callback;
  modalKeys = { titleKey, bodyKey, actionKey, category, extra };
  renderCard();
}
function renderCard() {
  const { titleKey, bodyKey, actionKey, category, extra } = modalKeys;
  modal.innerHTML = `<div class="story-card"><p class="story-category">${t(category)}</p><h2 id="story-card-title">${t(titleKey)}</h2>${extra}<p class="story-prose">${t(bodyKey)}</p><div class="story-card-actions"><button class="story-primary" data-card="continue">${t(actionKey)}</button><button data-card="close">${t('close')}</button></div></div>`;
  modal.setAttribute('aria-labelledby', 'story-card-title');
  modal.querySelector('[data-card="continue"]').onclick = () => { const cb = modalCallback; closeModal(); cb?.(); };
  modal.querySelector('[data-card="close"]').onclick = closeModal;
  modal.querySelector('button').focus();
}
function showLoading(error = false) {
  modal.hidden = false; state.uiOpen = true; modalKeys = null;
  modal.innerHTML = `<div class="story-card"><p>${t(error ? 'loadError' : 'loading')}</p>${error ? `<button>${t('retry')}</button>` : ''}</div>`;
  if (error) modal.querySelector('button').onclick = () => enterBeat({ beat: story.getState().beat });
}
function beginSound() {
  if (!soundOn) return;
  try {
    if (!ambient) {
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const gain = audio.createGain(); gain.gain.value = .014; gain.connect(audio.destination);
      const low = audio.createOscillator(); low.type = 'sine'; low.frequency.value = 108; low.connect(gain); low.start();
      const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
      const data = buffer.getChannelData(0); let prev = 0;
      for (let i = 0; i < data.length; i++) { prev = (prev + (Math.random() * 2 - 1) * .018) / 1.025; data[i] = prev; }
      const noise = audio.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const wind = audio.createGain(); wind.gain.value = .15; noise.connect(wind); wind.connect(audio.destination); noise.start();
      ambient = { audio, gain, wind };
    }
    ambient.audio.resume();
  } catch { /* Silence is a supported fallback. */ }
}
function bowl() {
  if (!ambient || !soundOn) return;
  const { audio } = ambient; const gain = audio.createGain(); const osc = audio.createOscillator();
  osc.frequency.value = state.zone === 'pharping' ? 432 : 288;
  gain.gain.setValueAtTime(.035, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + 2.8);
  osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + 3);
}
renderer.domElement.addEventListener('pointerdown', beginSound);
root.addEventListener('click', beginSound);

// Adult-proportioned distant silhouette, no close-up facial performance or lights.
const losang = new THREE.Group();
const robe = new THREE.Mesh(new THREE.ConeGeometry(.28, 1.25, 10), new THREE.MeshStandardMaterial({ color: 0x604441, roughness: .97 })); robe.position.y = .7;
const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0x9b816a, roughness: 1 })); head.position.y = 1.49;
losang.add(robe, head); losang.position.set(-27, 0, 10); stupaGroup.add(losang);
const mark = new THREE.Mesh(new THREE.TorusGeometry(.65, .025, 6, 40), new THREE.MeshBasicMaterial({ color: 0xd3ba84, transparent: true, opacity: .7 })); mark.rotation.x = -Math.PI / 2; scene.add(mark);

async function setWorld(zone, token) {
  if (zone === 'pharping' && !mapInstances.pharping) {
    loading = true; showLoading();
    try {
      const { createMap } = await import('../world/maps/pharping.js');
      if (token !== beatToken) return false;
      const group = new THREE.Group(); scene.add(group); ctx.zoneGroups.pharping = group;
      mapInstances.pharping = createMap(ctx);
    } catch (e) {
      console.error('[story] map load failed', e); loading = true; showLoading(true); return false;
    }
  }
  if (token !== beatToken) return false;
  loading = false; closeModal();
  for (const [id, group] of Object.entries(ctx.zoneGroups)) group.visible = id === zone;
  state.zone = zone; state.zoneType = 'hub';
  losang.visible = zone === 'stupa' && ['losang', 'map', 'return', 'complete'].includes(currentBeat);
  return true;
}
const arrivalStops = [{ x: 12, z: 29 }, { x: -9, z: 29 }, { x: -26, z: 16 }];
const visionStops = [{ x: 2040, z: 36 }, { x: 2045, z: 30 }, { x: 2040, z: 25 }];
function setTarget(point, label, action) {
  currentTarget = point; currentLabel = label; currentAction = action;
  mark.visible = Boolean(point);
  if (point) mark.position.set(point.x, ctx.world.getHeight(point.x, point.z) + .06, point.z);
  refreshHud();
}
function refreshHud() {
  const key = currentBeat === 'photography' ? 'photo' : currentBeat;
  hud.querySelector('h2').textContent = currentBeat === 'prologue' ? i18n.t('story.beat.prologue.title') : t(`${key}.title`);
  hud.querySelector('.story-category').textContent = currentBeat === 'restoration' ? t('history') : t('fiction');
  const act = hud.querySelector('[data-action="interact"]'); act.textContent = currentLabel ? t(currentLabel) : t('phone'); act.hidden = !currentAction;
  hud.querySelector('[data-action="guide"]').hidden = !currentTarget;
  hud.querySelector('[data-action="phone"]').textContent = t('phone');
  hud.querySelector('[data-action="settings"]').setAttribute('aria-label', t('settings'));
  hud.querySelector('.story-wordmark').firstChild.textContent = t('title');
  hud.querySelector('.story-controls').textContent = t(matchMedia('(pointer:coarse)').matches ? 'controlsTouch' : 'controls');
  hud.querySelector('[data-action="guide"]').textContent = t('guide');
  hud.querySelector('.story-save').textContent = t('saved');
}
function showArrivalStop() {
  const n = arrivalCount;
  showCard(`observe.${n}.title`, `observe.${n}.body`, 'next', () => {
    arrivalCount++;
    if (arrivalCount >= arrivalStops.length) story.signal('arrival:explored');
    else setTarget(arrivalStops[arrivalCount], `observe.${arrivalCount}.title`, showArrivalStop);
  }, n === 1 ? 'history' : 'fiction');
}
function showLosang() {
  const n = losangLine;
  showCard('losang.title', `losang.${n}`, n === 5 ? 'losang.accept' : 'next', () => {
    if (n === 5) { losangLine = 0; story.signal('losang:complete'); }
    else { losangLine++; showLosang(); }
  }, n === 2 || n === 3 ? 'legend' : 'fiction');
}
function mapDrawing() {
  const names = ['boudha', 'pharping', 'mangyul', 'yarlung', 'samye', 'chimphu'];
  return `<div class="story-map" role="img" aria-label="${t('map.note')}"><svg viewBox="0 0 600 190" aria-hidden="true"><path d="M0 140 L70 70 120 130 210 30 260 100 330 20 430 115 480 55 600 150" fill="none" stroke="#9b9783" stroke-width="2"/><path d="M38 142 Q100 175 140 132 T242 105 T345 86 T452 64 T558 42" fill="none" stroke="#9f4539" stroke-width="2" stroke-dasharray="5 6"/>${names.map((name, n) => `<circle cx="${38 + n * 104}" cy="${142 - n * 20}" r="5" fill="#9f4539"/><text x="${38 + n * 104}" y="${169 - n * 20}" text-anchor="middle" fill="#433f35" font-size="13">${t(`map.${name}`)}</text>`).join('')}</svg><small>${t('map.note')}</small></div>`;
}
function showMap() {
  showCard('map.title', 'map.body', 'map.hotel', () => {
    showCard('map.title', 'map.night', 'vision.enter', () => story.signal('map:opened'));
  }, 'fiction', mapDrawing());
}
function showVisionStop() {
  const n = visionCount;
  showCard(`vision.${n}.title`, `vision.${n}.body`, n === 2 ? 'vision.return' : 'next', () => {
    visionCount++;
    if (visionCount >= 3) {
      ctx.bus.emit('pharping:rain'); bowl();
      // Closing this card must leave an actionable route back to the present.
      const returnCard = () => showCard('vision.2.title', 'vision.2.body', 'vision.return', () => story.signal('vision:restored'));
      setTarget(null, 'vision.return', returnCard);
      returnCard();
    } else setTarget(visionStops[visionCount], `vision.${visionCount}.title`, showVisionStop);
  });
}
async function enterBeat({ beat }) {
  const token = ++beatToken; currentBeat = beat; currentAction = null; currentTarget = null; clearModals();
  hud.hidden = false;
  if (!await setWorld(beat === 'vision' ? 'pharping' : 'stupa', token)) return;
  if (beat !== 'vision') art.setLighting(beat === 'return' || beat === 'complete' ? 'dusk' : 'day');
  switch (beat) {
    case 'prologue': setTarget(null, 'phone', () => phone.open('messages')); storyCamera.setPose({ x: 0, y: 1.68, z: 31, yaw: 0, pitch: .34, fov: 55 }); phone.open('messages'); break;
    case 'arrival':
      arrivalCount = 0; storyCamera.setPose({ x: 12, y: 1.68, z: 32, yaw: .35, pitch: .2, fov: 55 });
      setTarget(arrivalStops[0], 'observe.0.title', showArrivalStop);
      showCard('arrival.title', 'arrival.body', 'arrival.action', () => {}); break;
    case 'photography':
      setTarget({ x: 0, z: 31 }, 'photo.action', () => memory.open()); break;
    case 'restoration': setTarget(null, 'restoration.action', () => story.playClip('restoration')); story.playClip('restoration'); break;
    case 'losang':
      losangLine = 0; setTarget({ x: -26.5, z: 12 }, 'losang.action', showLosang); break;
    case 'map': setTarget(null, 'map.hotel', showMap); showMap(); break;
    case 'vision': {
      visionCount = 0; art.setLighting('dawn');
      const x = 2035, z = 43; storyCamera.setPose({ x, y: ctx.world.getHeight(x, z) + 1.68, z, yaw: -.35, pitch: .05, fov: 55 });
      setTarget(visionStops[0], 'vision.0.title', showVisionStop);
      showCard('vision.title', 'vision.body', 'vision.enter', () => {}); break;
    }
    case 'return':
      storyCamera.setPose({ x: 0, y: 1.68, z: 31, yaw: 0, pitch: .34, fov: 55 });
      setTarget(null, 'return.action', () => phone.open('diary'));
      showCard('return.title', 'return.body', 'return.action', () => phone.open('diary')); break;
    case 'complete':
      setTarget(null, 'phone', () => phone.open('evidence'));
      showCard('complete.title', 'complete.body', 'complete.action', () => {}); break;
  }
  refreshHud(); bowl();
}
function interact() { if (!isAnyModalOpen() && currentAction && (!currentTarget || distanceToTarget() <= 4)) currentAction(); }
function distanceToTarget() { return currentTarget ? Math.hypot(state.player.position.x - currentTarget.x, state.player.position.z - currentTarget.z) : 0; }
function guide() {
  if (isAnyModalOpen() || !currentTarget) return;
  const { x, z } = currentTarget;
  storyCamera.setPose({ x, y: ctx.world.getHeight(x, z) + 1.68, z, yaw: state.zone === 'stupa' ? Math.atan2(x, z) : 0, pitch: .18 });
  renderer.domElement.focus({ preventScroll: true });
}
function showSettings() {
  if (isAnyModalOpen()) return;
  previousFocus = document.activeElement; modal.hidden = false; state.uiOpen = true; modalKeys = null;
  const selected = art.getState();
  modal.innerHTML = `<div class="story-card story-settings"><p class="story-category">${t('title')}</p><h2>${t('settings')}</h2><label>${t('preset')}<select data-setting="preset"><option value="cinematic">${t('cinematic')}</option><option value="legacy">${t('legacy')}</option></select></label><label>${t('lighting')}<select data-setting="lighting">${['dawn', 'day', 'dusk'].map(v => `<option value="${v}">${t(v)}</option>`).join('')}</select></label><label>${t('quality')}<select data-setting="quality"><option value="high">${t('high')}</option><option value="low">${t('low')}</option></select></label><label>${t('language')}<select data-setting="language"><option value="zh">繁體中文</option><option value="en">English</option></select></label><label>${t('sound')}<input type="checkbox" data-setting="sound" ${soundOn ? 'checked' : ''}/></label><details><summary>${t('sources.title')}</summary><p>${t('sources.body')}</p><a href="https://docs.google.com/document/d/1fUhMiSfSkdkKEUU63s2gojF5Br6rqfdXyeVjsIb3zJw/edit" target="_blank" rel="noopener">${t('sources.link')}</a></details><div class="story-card-actions"><button data-settings="close" class="story-primary">${t('resume')}</button>${story.getState().evidence.includes('restoration-record') ? `<button data-settings="replay">${t('restoration.action')}</button>` : ''}<button data-settings="restart">${t('complete.replay')}</button><a href="?">${t('menu')}</a></div></div>`;
  for (const key of ['preset', 'lighting', 'quality']) {
    const sel = modal.querySelector(`[data-setting="${key}"]`); sel.value = selected[key]; sel.onchange = () => art[`set${key[0].toUpperCase() + key.slice(1)}`](sel.value);
  }
  modal.querySelector('[data-setting="language"]').value = i18n.lang;
  modal.querySelector('[data-setting="language"]').onchange = e => { i18n.setLang(e.target.value); closeModal(); showSettings(); };
  modal.querySelector('[data-setting="sound"]').onchange = e => { soundOn = e.target.checked; if (soundOn) beginSound(); else ambient?.audio.suspend(); };
  modal.querySelector('[data-settings="close"]').onclick = closeModal;
  const replay = modal.querySelector('[data-settings="replay"]');
  if (replay) replay.onclick = () => { closeModal(); story.playClip('restoration'); };
  modal.querySelector('[data-settings="restart"]').onclick = () => { if (confirm(t('restart.confirm'))) { closeModal(); story.reset(); ctx.save.flush(); location.reload(); } };
  modal.querySelector('select').focus();
}
hud.querySelector('[data-action="phone"]').onclick = () => { if (!isAnyModalOpen()) phone.open(); };
hud.querySelector('[data-action="settings"]').onclick = showSettings;
hud.querySelector('[data-action="interact"]').onclick = interact;
hud.querySelector('[data-action="guide"]').onclick = guide;
root.addEventListener('click', e => { if (e.target.closest('a[href="?"]')) ctx.save.flush(); });
window.addEventListener('keydown', e => {
  if (!modal.hidden) {
    if (e.key === 'Escape') { e.preventDefault(); if (!loading) closeModal(); }
    if (e.key === 'Tab') {
      const nodes = [...modal.querySelectorAll('button, a[href], select, input, summary')].filter(el => !el.hidden && !el.disabled);
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target.tagName)) return;
  if (e.code === 'KeyE' || e.code === 'Enter') interact();
  if (e.code === 'Escape' && !isAnyModalOpen()) showSettings();
});
i18n.onChange(() => { refreshHud(); if (modalKeys) renderCard(); });
ctx.bus.on('story:beat-start', enterBeat);
const samples = [];
ctx.debug?.register('storyRuntime', { ctx, resetMetrics: () => { samples.length = 0; }, getMetrics: () => ({ averageFps: samples.length / (samples.reduce((a, b) => a + b, 0) || 1), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pointLights: (() => { let n = 0; scene.traverse(o => { if (o.isPointLight && o.visible) n++; }); return n; })(), zone: state.zone, beat: currentBeat, modal: isAnyModalOpen(), ...art.getState() }), guide, getTarget: () => currentTarget, getArrivalCount: () => arrivalCount, getVisionCount: () => visionCount });
ctx.debug?.register('storyArt', art); ctx.debug?.register('storyCamera', storyCamera);
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let last = performance.now();
function frame(now) {
  const raw = (now - last) / 1000; last = now; const dt = Math.min(raw, .05); state.elapsed += dt;
  if (raw > 0 && raw < .5) { samples.push(raw); if (samples.length > 240) samples.shift(); }
  state.uiOpen = isAnyModalOpen();
  storyCamera.update(dt); sky.update(dt); stupa.update(dt); flags.update(dt); environment.update(dt);
  mapInstances[state.zone]?.update(dt); art.update(dt);
  story.update(dt); phone.update(dt); documentary.update(dt); memory.update(dt); ctx.save.update(dt);
  const waypoint = hud.querySelector('.story-waypoint');
  if (currentTarget && !state.uiOpen) {
    camera.updateMatrixWorld();
    const p = new THREE.Vector3(currentTarget.x, ctx.world.getHeight(currentTarget.x, currentTarget.z) + 1.5, currentTarget.z).project(camera);
    waypoint.hidden = p.z > 1 || Math.abs(p.x) > .9 || Math.abs(p.y) > .8;
    waypoint.style.left = `${(p.x + 1) * 50}%`; waypoint.style.top = `${(1 - p.y) * 50}%`;
    waypoint.querySelector('small').textContent = t('distance', { m: Math.round(distanceToTarget()) });
  } else waypoint.hidden = true;
  hud.querySelector('.story-hint').textContent = currentTarget ? `${t('approach')} · ${t('distance', { m: Math.round(distanceToTarget()) })}` : '';
  hud.querySelector('[data-action="interact"]').disabled = state.uiOpen || (currentTarget && distanceToTarget() > 4);
  hud.classList.toggle('story-hud-obscured', state.uiOpen);
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
art.setPreset('cinematic'); art.setLighting('day');
story.start(); requestAnimationFrame(frame);
