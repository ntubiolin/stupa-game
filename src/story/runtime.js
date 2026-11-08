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
import { getMapDef } from '../data/maps.js';
import { createStoryDirector } from './storyDirector.js';
import { createNarrativeCamera } from './narrativeCamera.js';
import { createCinematicArt } from './cinematicArt.js';
import './narrativeCamera.css';
import '../i18n/storyArt.js';
import { HANDOVER_QR_SVG, unreadPhoneThreads } from '../data/story/phoneThreads.js';
import { createPhone } from '../ui/story/phone.js';
import { createDocumentary } from '../ui/story/documentary.js';
import { createLosangStill } from '../ui/story/losangStill.js';
import { createChapterStill, createStoryMuralScroll } from '../ui/story/chapterStills.js';
import { DOCUMENTARY_CLIPS } from '../data/story/documentary.js';
import { createMemorySystem } from './memorySystem.js';
import { createLosang } from './characters/losang.js';
import { createChapterDirector } from './chapterDirector.js';
import { getChapter } from '../data/story/chapters.js';
import { createChapterJournal } from '../ui/story/chapterJournal.js';
import { createStoryDebugPanel } from '../ui/story/debugPanel.js';
import { createModeSwitch } from '../ui/modeSwitch.js';
import { createStoryAudio } from './storyAudio.js';
import '../i18n/storyChapters.js';
import './runtime.css';

const t = (key, args) => i18n.t(`mirror.${key}`, args);
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.__stupaPatched2D) {
  HTMLCanvasElement.prototype.__stupaPatched2D = true;
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type === '2d') {
      return origGetContext.call(this, type, { willReadFrequently: true, ...attrs });
    }
    return origGetContext.call(this, type, attrs);
  };
}
const root = document.getElementById('ui');
const isSoftwareWebGL = window.devicePixelRatio <= 0.5;
const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareWebGL, powerPreference: 'high-performance' });
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
const ctx = { THREE, scene, camera, renderer, isSoftwareWebGL, config: CONFIG, state, bus: createBus(), i18n, stupaGroup,
  zoneGroups: { stupa: stupaGroup }, colliders: [], interactables: [] };
createDebug(ctx); createSave(ctx, { writableSections: ['story'] }); // Deliberately no i18n.bindSave: narrative writes only story.
const mapInstances = {};
let chapterScene = null, stagedScene = null, activeChapter = null, chapterCheckpoint = null, prepareToken = 0;
let testingChapter = false, previewLoading = false;
const notifiedThreads = new Set();
ctx.world = {
  getMap: (id = state.zone) => getMapDef(id),
  getHeight: (x, z, id = state.zone) => (activeChapter && id === getChapter(activeChapter)?.mapId ? chapterScene?.getHeight(x,z) : mapInstances[id]?.getHeight(x, z)) || 0,
  isCombatZone: () => false, isHub: () => true,
};
const sky = createSky(ctx);
const stupa = createStupa(ctx);
const flags = createPrayerFlags(ctx, stupa.flagAnchors);
const environment = createEnvironment(ctx);
const story = createStoryDirector(ctx); ctx.story = story;
const chapters = createChapterDirector(ctx);
const journal = createChapterJournal(ctx);
const debugPanel = createStoryDebugPanel(ctx);
const storyCamera = createNarrativeCamera(ctx); ctx.storyCamera = storyCamera;
const art = createCinematicArt(ctx); ctx.storyArt = art;
const phone = createPhone(ctx); ctx.phone = phone;
const documentary = createDocumentary(ctx); ctx.documentary = documentary;
const memory = createMemorySystem(ctx); ctx.memory = memory;
const storyAudio = createStoryAudio(ctx);

const hud = document.createElement('section'); hud.className = 'story-hud';
hud.innerHTML = `<header class="story-header"><a href="?mode=home" class="story-wordmark">${t('title')}<small>THE PERSON IN THE MIRROR</small></a><nav><button data-action="phone">${t('phone')}</button><button data-action="settings" aria-label="${t('settings')}">☷</button></nav></header><div class="story-waypoint" aria-hidden="true"><span>◇</span><small></small></div><section class="story-objective"><p class="story-category"></p><h2></h2><p class="story-hint"></p><div class="story-objective-actions"><button data-action="interact" class="story-action"></button><button data-action="guide" class="story-guide">${t('guide')}</button></div></section><footer class="story-footer"><span class="story-controls"></span><span class="story-save">${t('saved')}</span></footer>`;
root.append(hud);
const journalButton = document.createElement('button'); journalButton.dataset.action='journal'; hud.querySelector('nav').prepend(journalButton);
const modeSwitchMount = document.createElement('div');
const modeSwitch = createModeSwitch(ctx, 'story', modeSwitchMount, { onBeforeOpen: closeModal });
const modal = document.createElement('section'); modal.className = 'story-modal'; modal.hidden = true; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); root.append(modal);
let modalCallback = null, modalKeys = null, previousFocus = null;
let modalStill = null, modalMural = null;
let arrivalCount = 0, visionCount = 0, losangLine = 0;
let currentTarget = null, currentLabel = '', currentAction = null;
let loading = false, beatToken = 0, currentBeat = 'prologue';
let soundOn = true;

function closeModal() {
  if (modal.hidden) return;
  modalStill?.dispose(); modalStill = null;
  modalMural?.dispose(); modalMural = null;
  modal.hidden = true; modalCallback = null; modalKeys = null;
  state.uiOpen = isAnyModalOpen();
  renderer.domElement.focus({ preventScroll: true });
}
function isAnyModalOpen() { return !modal.hidden || phone.isOpen() || documentary.isOpen() || memory.isOpen() || journal.isOpen() || modeSwitch.isOpen() || debugPanel.isOpen() || loading; }
function clearModals() { closeModal(); phone.close(); documentary.close(); memory.close(); journal.close(); modeSwitch.close(); debugPanel.close(); state.uiOpen = loading; }
function showCard(titleKey, bodyKey, actionKey, callback, category = 'fiction', extra = '', choices = null) {
  if (phone.isOpen() || documentary.isOpen() || memory.isOpen() || journal.isOpen() || modeSwitch.isOpen() || debugPanel.isOpen()) return;
  previousFocus = document.activeElement;
  modal.hidden = false; state.uiOpen = true; modalCallback = callback;
  modalKeys = { titleKey, bodyKey, actionKey, category, extra, choices };
  storyAudio.pageTurn();
  renderCard();
}
function renderChapterDirectorCard(cardEl, bodyKey) {
  modalMural?.dispose(); modalMural = null;
  if (!activeChapter || activeChapter === 'finale') return;
  const isIntro = bodyKey === `chapter.${activeChapter}.intro`;
  const isComplete = chapterCheckpoint === 'complete' || chapterCheckpoint === 'diary' || bodyKey.endsWith('.complete.body') || bodyKey.endsWith('.diary.body');
  if (!isIntro && !isComplete) return;
  modalMural = createStoryMuralScroll(activeChapter, isComplete ? 'complete' : 'intro', ctx);
  if (modalMural && cardEl) {
    const prose = cardEl.querySelector('.story-prose');
    if (prose) prose.before(modalMural.element);
    else cardEl.prepend(modalMural.element);
  }
}
function renderCard() {
  modalStill?.dispose(); modalStill = null;
  modalMural?.dispose(); modalMural = null;
  const session = modalKeys;
  const { titleKey, bodyKey, actionKey, category, extra, choices } = modalKeys;
  const letterCode = titleKey.startsWith('chapter.finale.letter') ? extra : '';
  const illustration = letterCode ? '' : extra;
  modal.innerHTML = `<div class="story-card"><p class="story-category">${t(category)}</p><h2 id="story-card-title">${t(titleKey)}</h2>${illustration}<p class="story-prose">${t(bodyKey)}</p>${letterCode}<div class="story-card-actions">${choices ? choices.map((id,index)=>`<button class="${index ? '' : 'story-primary'}" data-card-choice="${id}">${t(`chapter.${activeChapter}.${chapterCheckpoint}.${id}`)}</button>`).join('') : `<button class="story-primary" data-card="continue">${t(actionKey)}</button>`}<button data-card="close">${t('close')}</button></div></div>`;
  modal.setAttribute('aria-labelledby', 'story-card-title');
  const card = modal.querySelector('.story-card');
  renderChapterDirectorCard(card, bodyKey);
  if (bodyKey === 'losang.5') {
    modalStill = createLosangStill(t);
    modal.querySelector('.story-prose').before(modalStill.element);
  } else {
    modalStill = createChapterStill(bodyKey, t);
    if (modalStill) modal.querySelector('.story-prose').before(modalStill.element);
  }
  let completed = false;
  const finish = choice => {
    // A removed button must never consume the next card's callback on repeat clicks.
    if (completed || modal.hidden || modalKeys !== session || !card.isConnected) return;
    completed = true;
    const cb = modalCallback; closeModal(); cb?.(choice);
  };
  const nextButton=modal.querySelector('[data-card="continue"]');
  if(nextButton)nextButton.onclick = () => finish();
  for(const button of modal.querySelectorAll('[data-card-choice]'))button.onclick=()=>finish(button.dataset.cardChoice);
  modal.querySelector('[data-card="close"]').onclick = () => {
    if (modalKeys === session && card.isConnected) closeModal();
  };
  const heading=modal.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
  modal.scrollTop=0;modal.querySelector('.story-card').scrollTop=0;
}
function showLoading(error = false) {
  modalStill?.dispose(); modalStill = null;
  modalMural?.dispose(); modalMural = null;
  modal.hidden = false; state.uiOpen = true; modalKeys = null;
  modal.innerHTML = `<div class="story-card"><p>${t(error ? 'loadError' : 'loading')}</p>${error ? `<button>${t('retry')}</button>` : ''}</div>`;
  if (error) modal.querySelector('button').onclick = () => enterBeat({ beat: story.getState().beat });
}
function beginSound() {
  if (!soundOn) return;
  storyAudio.begin();
}
function bowl() {
  if (!soundOn) return;
  storyAudio.bowl(state.zone === 'pharping' ? 1.333 : 1);
}
renderer.domElement.addEventListener('pointerdown', beginSound);
root.addEventListener('click', beginSound);

// Provisional original character study; approved portrait/costume follows #84.
const losangCharacter = createLosang(THREE);
const losang = losangCharacter.group;
losang.position.set(-27, 0, 10); losang.rotation.y = .16; stupaGroup.add(losang);
const losangCollider = { type: 'circle', x: -27, z: 10, r: .35, zone: 'stupa' };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let pageDisposed = false;
window.addEventListener('pagehide', event => {
  // A bfcache page may return with its existing scene, so keep those resources.
  if (!event.persisted) {
    pageDisposed = true;
    modalStill?.dispose(); modalStill = null;
    modalMural?.dispose(); modalMural = null;
    losangCharacter.dispose();
    renderer.dispose();
  }
});
const mark = new THREE.Mesh(new THREE.TorusGeometry(.65, .025, 6, 40), new THREE.MeshBasicMaterial({ color: 0xd3ba84, transparent: true, opacity: .7 })); mark.rotation.x = -Math.PI / 2; scene.add(mark);

async function setWorld(zone, token) {
  if (zone === 'pharping' && !mapInstances.pharping) {
    loading = true; showLoading();
    try {
      const { createPharpingScene } = await import('./world/pharpingScene.js');
      if (token !== beatToken) return false;
      const world = await createPharpingScene(ctx);
      if (token !== beatToken) { world.dispose(); return false; }
      scene.add(world.group); ctx.zoneGroups.pharping = world.group;
      mapInstances.pharping = world;
    } catch (e) {
      console.error('[story] map load failed', e); loading = true; showLoading(true); return false;
    }
  }
  if (token !== beatToken) return false;
  loading = false; closeModal();
  for (const [id, group] of Object.entries(ctx.zoneGroups)) group.visible = id === zone;
  state.zone = zone; state.zoneType = 'hub';
  losang.visible = zone === 'stupa' && ['losang', 'map', 'return', 'complete'].includes(currentBeat);
  const colliderIndex = ctx.colliders.indexOf(losangCollider);
  if (losang.visible && colliderIndex === -1) ctx.colliders.push(losangCollider);
  else if (!losang.visible && colliderIndex !== -1) ctx.colliders.splice(colliderIndex, 1);
  return true;
}
const arrivalStops = [{ x: 12, z: 29 }, { x: -9, z: 29 }, { x: -26, z: 16 }];
const visionStop = n => mapInstances.pharping.getTarget(['spring1', 'spring2', 'channel2'][n]);
function setTarget(point, label, action) {
  currentTarget = point; currentLabel = label; currentAction = action;
  mark.visible = Boolean(point);
  if (point) mark.position.set(point.x, ctx.world.getHeight(point.x, point.z) + .06, point.z);
  refreshHud();
}
function refreshHud() {
  const key = currentBeat === 'photography' ? 'photo' : currentBeat;
  hud.querySelector('h2').textContent = activeChapter ? chapterText('title') : currentBeat === 'prologue' ? i18n.t('story.beat.prologue.title') : t(`${key}.title`);
  hud.querySelector('.story-category').textContent = testingChapter ? t('debug.banner') : currentBeat === 'restoration' ? t('history') : t('fiction');
  const act = hud.querySelector('[data-action="interact"]'); act.textContent = activeChapter ? chapterText('action') : currentLabel ? t(currentLabel) : t('phone'); act.hidden = !currentAction;
  hud.querySelector('[data-action="guide"]').hidden = !currentTarget;
  const phoneButton = hud.querySelector('[data-action="phone"]');
  const unread = unreadPhoneThreads(story.getState());
  phoneButton.textContent = t('phone') + (unread.length ? ` (${unread.length})` : '');
  phoneButton.setAttribute('aria-label', t('phone') + (unread.length ? ' · ' + i18n.t('phone.unread', { count: unread.length }) : ''));
  if (!testingChapter) for (const thread of unread) {
    if (notifiedThreads.has(thread.id)) continue;
    notifiedThreads.add(thread.id);
    ctx.bus.emit('story:phone-open', { tab: 'messages', threadId: thread.id, notification: true });
  }
  phoneButton.disabled = testingChapter;
  hud.querySelector('[data-action="settings"]').setAttribute('aria-label', t('settings'));
  hud.querySelector('.story-wordmark').firstChild.textContent = t('title');
  hud.querySelector('.story-controls').textContent = t(matchMedia('(pointer:coarse)').matches ? 'controlsTouch' : 'controls');
  hud.querySelector('[data-action="guide"]').textContent = t('guide');
  hud.querySelector('.story-save').textContent = ctx.save.getStatus().ok ? t('saved') : t('chapter.saveError');
  journalButton.textContent=t('chapter.menu');
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
    showCard('map.title', 'map.night', 'map.phone', () => phone.open('messages', { threadId: 'hotel', onComplete: () => story.signal('map:opened') }));
  }, 'fiction', mapDrawing());
}
function showVisionStop() {
  const n = visionCount;
  showCard(`vision.${n}.title`, `vision.${n}.body`, n === 2 ? 'vision.return' : 'next', () => {
    visionCount++;
    if (visionCount >= 3) {
      mapInstances.pharping.restore('release', { reducedMotion: reducedMotion.matches });
      mapInstances.pharping.restore('rain', { animate: true, reducedMotion: reducedMotion.matches }); bowl();
      // Closing this card must leave an actionable route back to the present.
      const returnCard = () => showCard('vision.2.title', 'vision.2.body', 'vision.return', () => story.signal('vision:restored'));
      setTarget(null, 'vision.return', returnCard);
      returnCard();
    } else {
      mapInstances.pharping.restore(visionCount === 1 ? 'spring2' : 'channel1', { animate: true, reducedMotion: reducedMotion.matches });
      setTarget(visionStop(visionCount), `vision.${visionCount}.title`, showVisionStop);
    }
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
      losangLine = 0; setTarget({ x: -26.5, z: 13 }, 'losang.action', showLosang); break;
    case 'map': setTarget(null, 'map.hotel', showMap); showMap(); break;
    case 'vision': {
      visionCount = 0; art.releaseRoot(mapInstances.pharping.group); mapInstances.pharping.restore('spring1', { reducedMotion: reducedMotion.matches }); art.setLighting('dawn');
      const x = 2035, z = 43; storyCamera.setPose({ x, y: ctx.world.getHeight(x, z) + 1.68, z, yaw: -.35, pitch: .05, fov: 55 });
      setTarget(visionStop(0), 'vision.0.title', showVisionStop);
      showCard('vision.title', 'vision.body', 'vision.enter', () => {}); break;
    }
    case 'return':
      storyCamera.setPose({ x: 0, y: 1.68, z: 31, yaw: 0, pitch: .34, fov: 55 });
      setTarget(null, 'return.action', () => phone.open('diary'));
      showCard('return.title', 'return.body', 'return.action', () => phone.open('diary')); break;
    case 'complete':
      setTarget(null, 'chapter.continue', () => journal.open());
      showCard('complete.title', 'complete.body', 'complete.action', () => {}); break;
  }
  refreshHud(); storyAudio.enterBeat(beat);
}
function interact() { if (!isAnyModalOpen() && currentAction && (!currentTarget || distanceToTarget() <= 4)) currentAction(); }
function distanceToTarget() { return currentTarget ? Math.hypot(state.player.position.x - currentTarget.x, state.player.position.z - currentTarget.z) : 0; }
function guide() {
  if (isAnyModalOpen() || !currentTarget) return;
  const { x, z } = currentTarget;
  const eyeY = ctx.world.getHeight(x, z) + 1.68;
  const facingLosang = currentBeat === 'losang';
  let yaw = facingLosang ? Math.atan2(x - losang.position.x, z - losang.position.z) : state.zone === 'stupa' ? Math.atan2(x, z) : 0;
  let pitch = facingLosang ? -.14 : .18;
  if (currentTarget.lookAt) {
    const pt = currentTarget.lookAt;
    const dist = Math.hypot(pt.x - x, pt.z - z);
    yaw = Math.atan2(x - pt.x, z - pt.z);
    if (Number.isFinite(pt.y)) pitch = Math.atan2(pt.y - eyeY, dist);
  }
  storyCamera.glideTo(
    { x, y: eyeY, z, yaw, pitch },
    { duration: reducedMotion.matches ? 0 : 0.9, reducedMotion: reducedMotion.matches }
  );
  renderer.domElement.focus({ preventScroll: true });
}
function showSettings() {
  if (isAnyModalOpen()) return;
  previousFocus = document.activeElement; modal.hidden = false; state.uiOpen = true; modalKeys = null;
  const selected = art.getState();
  const canViewVision = Object.hasOwn(DOCUMENTARY_CLIPS, 'vision-cutaway')
    && ['vision', 'return', 'complete'].includes(story.getState().beat);
  modal.innerHTML = `<div class="story-card story-settings"><p class="story-category">${t('title')}</p><h2>${t('settings')}</h2><label>${t('preset')}<select data-setting="preset"><option value="cinematic">${t('cinematic')}</option><option value="legacy">${t('legacy')}</option></select></label><label>${t('lighting')}<select data-setting="lighting">${['dawn', 'day', 'dusk'].map(v => `<option value="${v}">${t(v)}</option>`).join('')}</select></label><label>${t('quality')}<select data-setting="quality"><option value="high">${t('high')}</option><option value="low">${t('low')}</option></select></label><label>${t('language')}<select data-setting="language"><option value="zh">繁體中文</option><option value="en">English</option></select></label><label>${t('sound')}<input type="checkbox" data-setting="sound" ${soundOn ? 'checked' : ''}/></label><details><summary>${t('sources.title')}</summary><p>${t('sources.body')}</p><a href="https://docs.google.com/document/d/1fUhMiSfSkdkKEUU63s2gojF5Br6rqfdXyeVjsIb3zJw/edit" target="_blank" rel="noopener">${t('sources.link')}</a></details><div class="story-card-actions"><button data-settings="close" class="story-primary">${t('resume')}</button><button data-settings="debug">${t('debug.settings')}</button>${canViewVision ? `<button data-settings="vision-video">${i18n.t('story.documentary.vision.title')}</button>` : ''}${!testingChapter && story.getState().evidence.includes('restoration-record') ? `<button data-settings="replay">${t('restoration.action')}</button>` : ''}${testingChapter ? '' : `<button data-settings="restart">${t('complete.replay')}</button>`}<a href="?mode=home">${t('menu')}</a></div></div>`;
  for (const key of ['preset', 'lighting', 'quality']) {
    const sel = modal.querySelector(`[data-setting="${key}"]`); sel.value = selected[key]; sel.onchange = () => art[`set${key[0].toUpperCase() + key.slice(1)}`](sel.value);
  }
  modal.querySelector('[data-setting="language"]').value = i18n.lang;
  modal.querySelector('[data-setting="language"]').onchange = e => { i18n.setLang(e.target.value); closeModal(); showSettings(); };
  modal.querySelector('[data-setting="sound"]').onchange = e => { soundOn = e.target.checked; storyAudio.setEnabled(soundOn); };
  modal.querySelector('[data-settings="close"]').onclick = closeModal;
  const actionsWrap = modal.querySelector('.story-card-actions');
  const debugBtn = modal.querySelector('[data-settings="debug"]');
  if (actionsWrap && modeSwitch?.button) {
    actionsWrap.insertBefore(modeSwitch.button, debugBtn || null);
  }
  modal.querySelector('[data-settings="debug"]').onclick = () => { closeModal(); debugPanel.open(); };
  const visionVideo = modal.querySelector('[data-settings="vision-video"]');
  if (visionVideo) visionVideo.onclick = () => { closeModal(); documentary.play('vision-cutaway'); };
  const replay = modal.querySelector('[data-settings="replay"]');
  if (replay) replay.onclick = () => { closeModal(); story.playClip('restoration'); };
  const restart = modal.querySelector('[data-settings="restart"]');
  if (restart) restart.onclick = () => { if (confirm(t('restart.confirm'))) { closeModal(); story.reset(); ctx.save.flush(); location.reload(); } };
  modal.querySelector('select').focus();
}
hud.querySelector('[data-action="phone"]').onclick = () => { if (!testingChapter && !isAnyModalOpen()) phone.open(); };
hud.querySelector('[data-action="settings"]').onclick = showSettings;
hud.querySelector('[data-action="interact"]').onclick = interact;
hud.querySelector('[data-action="guide"]').onclick = guide;
root.addEventListener('click', e => {
  if (e.target.closest('a[href="?mode=home"]') && ctx.save.flush() === false) {
    e.preventDefault();showCard('chapter.mode.title','chapter.saveError','close',()=>{});
  }
});
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
function faceTarget(point, duration = 0) {
  if (!point) return;
  const pose = storyCamera.getPose();
  const distance = Math.hypot(point.x - pose.x, point.z - pose.z);
  const yaw = distance > 1e-4 ? Math.atan2(pose.x - point.x, pose.z - point.z) : pose.yaw;
  const pitch = Number.isFinite(point.y) && distance > 1e-4 ? Math.atan2(point.y - pose.y, distance) : pose.pitch;
  if (duration > 0 && !reducedMotion.matches) {
    storyCamera.glideTo({ yaw, pitch }, { duration, reducedMotion: reducedMotion.matches });
  } else {
    storyCamera.setPose({ yaw, pitch });
  }
}
function chapterError(retry) {
  loading=false; closeModal();
  const failedSave=!ctx.save.getStatus().ok;
  showCard('chapter.pharping.title',failedSave?'chapter.saveError':'chapter.loadError','chapter.retry',retry);
  setTarget(null,'chapter.continue',()=>journal.open());
}
ctx.prepareChapter=async (id,checkpointId)=>{
  if(!sceneFactories[id]||!getChapter(id)?.checkpoints.some(c=>c.id===checkpointId))return false;
  const token=++prepareToken;loading=true;showLoading();
  let staged;
  try{
    const factory=await sceneFactories[id]();
    staged=await factory({...ctx,scene:new THREE.Scene(),zoneGroups:{}});
    if(token!==prepareToken){staged.dispose();return false;}
    staged.restore(checkpointId,{animate:false,reducedMotion:reducedMotion.matches});
    staged.group.visible=false;stagedScene?.dispose();stagedScene=staged;return true;
  }catch(error){staged?.dispose();console.warn('[chapter] prepare failed',error);return false;}
  finally{if(token===prepareToken)loading=false;}
};
ctx.requestChapter=async (id,replay=false)=>{
  if(isAnyModalOpen())return;
  const ok=await chapters.start(id,{replay});
  if(!ok){stagedScene?.dispose();stagedScene=null;chapterError(()=>ctx.requestChapter(id,replay));}
};
ctx.requestChapterPreview = async (id, checkpointId, options) => {
  if (isAnyModalOpen()) return false;
  previewLoading = true;
  const request = chapters.preview(id, checkpointId, options);
  const token = prepareToken;
  try {
    const ok = await request;
    if (ok || token !== prepareToken) return ok;
    stagedScene?.dispose();
    stagedScene = null;
    closeModal();
    showCard('debug.title', 'debug.loadError', 'debug.settings', () => debugPanel.open());
    return false;
  } finally {
    previewLoading = false;
  }
};
async function resumeChapter(){
  const ok=await chapters.resume();
  if(!ok){stagedScene?.dispose();stagedScene=null;chapterError(resumeChapter);}
}
const sceneFactories = {
  pharping: () => import('./world/pharpingScene.js').then(m => m.createPharpingScene),
  mangyul: () => import('./world/mangyulScene.js').then(m => m.createMangyulScene),
  finale: () => import('./world/finaleScene.js').then(m => m.createFinaleScene),
  samye: () => import('./world/samyeScene.js').then(m => m.createSamyeScene),
  chimphu: () => import('./world/chimphuScene.js').then(m => m.createChimphuScene),
  yarlung: () => import('./world/yarlungScene.js').then(m => m.createYarlungScene),
};
function chapterText(part) {
  if (chapterCheckpoint === 'complete') return t(part === 'title' ? 'chapter.complete' : 'chapter.continue');
  return t(`chapter.${activeChapter}.${chapterCheckpoint}.${part}`);
}
function disposeChapterWorld() {
  if (chapterScene) { art.releaseRoot(chapterScene.group); chapterScene.dispose(); }
  chapterScene=null; delete ctx.zoneGroups.chapter;
}
function chapterInteract(){
  const checkpoint=getChapter(activeChapter)?.checkpoints.find(c=>c.id===chapterCheckpoint);
  if(!checkpoint)return;
  const current=chapterCheckpoint;
  const chapterId=activeChapter;
  const advance = choice => {
    if (activeChapter !== chapterId || chapterCheckpoint !== current) return;
    if (!chapters.signal(checkpoint.signal, { checkpointId: current, choice })) {
      showCard(`chapter.${chapterId}.title`, 'chapter.saveError', 'retry', () => {});
    }
  };
  const transient = chapters.getState().replaying || testingChapter;
  const openThread = (threadId, onComplete = advance) => phone.open('messages', { threadId, onComplete, transient });
  if (chapterId === 'finale' && ['decision', 'response'].includes(current)) {
    phone.open('messages', { handover: true, scanned: current === 'response', onComplete: advance });
    return;
  }
  if (chapterId === 'pharping' && current === 'phone') { openThread('pharping'); return; }
  if (chapterId === 'mangyul' && current === 'phone') { openThread('mangyul-snow'); return; }
  if (chapterId === 'mangyul' && current === 'message') {
    showCard('chapter.mangyul.message.title', 'chapter.mangyul.message.body', 'chapter.mangyul.message.action', () => openThread('mangyul'));
    return;
  }
  if (chapterId === 'yarlung' && current === 'memory') {
    showCard('chapter.yarlung.memory.title', 'chapter.yarlung.memory.body', 'chapter.yarlung.memory.action', () => {
      const unsubscribe = ctx.bus.on('story:clip-end', ({ id, reason }) => {
        if (id !== 'dorm-memory') return;
        unsubscribe();
        if (reason === 'complete' || reason === 'skip') advance();
      });
      if (!documentary.play('dorm-memory')) unsubscribe();
    });
    return;
  }
  if (chapterId === 'yarlung' && current === 'boundary') {
    openThread('yarlung', () => showCard('chapter.yarlung.boundary.title', 'chapter.yarlung.boundary.body', 'chapter.yarlung.boundary.action', advance));
    return;
  }
  if (chapterId === 'samye' && current === 'rebuild') {
    openThread('samye', () => showCard('chapter.samye.rebuild.title', 'chapter.samye.rebuild.body', 'chapter.samye.rebuild.action', advance));
    return;
  }
  if (chapterId === 'chimphu' && current === 'descent') {
    showCard('chapter.chimphu.descent.title', 'chapter.chimphu.descent.body', 'chapter.chimphu.descent.action', () => openThread('chimphu'));
    return;
  }
  if(current==='diary'){journal.open('diary');return;}
  if (current === 'complete') {
    if (chapterId === 'finale') showCard('chapter.finale.complete.title', 'chapter.finale.complete.body', 'chapter.finale.complete.action', () => journal.open());
    else journal.open();
    return;
  }
  if(checkpoint.presentation==='card'||(activeChapter==='pharping'&&['shadow','release','settle','wait','lamp'].includes(current))
    ||(activeChapter==='mangyul'&&current==='clearing')
    ||(activeChapter==='yarlung'&&['pause','release'].includes(current))
    ||(activeChapter==='chimphu'&&['cave','light'].includes(current))||current.startsWith('altar')){
    const prefix = `chapter.${chapterId}.${current}`;
    const category = chapterId === 'finale' && current.startsWith('letter')
      ? 'chapter.finale.letterSource' : 'fiction';
    const extra = chapterId === 'finale' && current === 'letter6'
      ? `<figure class="story-letter-qr">${HANDOVER_QR_SVG}<figcaption>${i18n.t('phone.handover.code')}</figcaption></figure>` : '';
    showCard(`${prefix}.title`, `${prefix}.body`, `${prefix}.action`, advance, category, extra, checkpoint.choices);
  }
  else {
    const target = currentTarget;
    if (target) {
      const lookPoint = target.lookAt || { x: target.x, y: ctx.world.getHeight(target.x, target.z) + 1.2, z: target.z };
      faceTarget(lookPoint, 0.45);
    }
    advance();
  }
}
ctx.bus.on('story:chapter-change',({chapterId,checkpointId,replaying,testing=false})=>{
  const fresh=Boolean(stagedScene);loading=false;clearModals();++beatToken;
  if(fresh){
    if(mapInstances.pharping){art.releaseRoot(mapInstances.pharping.group);mapInstances.pharping.dispose();delete mapInstances.pharping;delete ctx.zoneGroups.pharping;}
    disposeChapterWorld();chapterScene=stagedScene;stagedScene=null;scene.add(chapterScene.group);ctx.zoneGroups.chapter=chapterScene.group;}
  activeChapter=chapterId;chapterCheckpoint=checkpointId;currentBeat='complete';testingChapter=testing;
  const finale=chapterId==='finale';
  const present=!finale&&(checkpointId==='complete'||checkpointId==='diary'&&chapterId!=='chimphu');
  for(const [id,group]of Object.entries(ctx.zoneGroups))group.visible=(present||finale)&&id==='stupa';
  chapterScene.group.visible=!present;state.zone=present?'stupa':getChapter(chapterId).mapId;state.zoneType='hub';
  chapterScene.restore(checkpointId,{animate:!fresh&&!reducedMotion.matches,reducedMotion:reducedMotion.matches});
  const point=chapterScene.getTarget(checkpointId);
  if(present){storyCamera.setPose({x:0,y:1.68,z:31,yaw:0,pitch:.34,fov:55});art.setLighting('dusk');}
  else if(fresh){
    const entryPoint=point||(chapterId==='chimphu'&&checkpointId==='diary'?chapterScene.getTarget('light'):null)||(finale&&['diary','complete'].includes(checkpointId)?chapterScene.getTarget('lamp'):null)||getChapter(chapterId).checkpoints.map(c=>chapterScene.getTarget(c.id)).find(Boolean);
    if(entryPoint){storyCamera.setPose({x:entryPoint.x,y:chapterScene.getHeight(entryPoint.x,entryPoint.z)+1.68,z:entryPoint.z,fov:55});if(entryPoint.lookAt)faceTarget(entryPoint.lookAt);}
    art.setLighting('dawn');
  }
  if (finale) art.setLighting('dawn');
  setTarget(point,'chapter.'+chapterId+'.'+checkpointId+'.action',chapterInteract);
  if (replaying) hud.querySelector('.story-category').textContent=t('chapter.replaying');
  if (finale && ['response', 'complete'].includes(checkpointId)) queueMicrotask(() => {
    if (activeChapter === 'finale' && chapterCheckpoint === checkpointId) chapterInteract();
  });
  const introKey = `chapter.${chapterId}.intro`;
  if (fresh && checkpointId === getChapter(chapterId).entryCheckpoint && t(introKey) !== `mirror.${introKey}`) {
    showCard(`chapter.${chapterId}.title`, introKey, 'chapter.close', () => {});
  }
});
ctx.bus.on('story:chapter-exit', ({ testing }) => {
  ++prepareToken;
  disposeChapterWorld();
  stagedScene?.dispose();
  stagedScene = null;
  activeChapter = null;
  chapterCheckpoint = null;
  loading = false;
  testingChapter = false;
  if (testing && story.getJourney().activeChapterId) {
    clearModals();
    // The director holds its synchronous transition guard while emitting exit.
    queueMicrotask(resumeChapter);
  } else {
    enterBeat({ beat: story.getState().beat });
  }
});
journalButton.onclick=()=>{if(!isAnyModalOpen())journal.open();};
ctx.debug?.register('chapters',chapters);
ctx.debug?.register('chapterScene',{getSnapshot:()=>chapterScene?.getSnapshot(),getCheckpoint:()=>chapterCheckpoint});
ctx.bus.on('story:phone-change', refreshHud);
ctx.bus.on('story:beat-start', event => { if (!chapters.getState().activeChapterId) enterBeat(event); });
const samples = [];
ctx.debug?.register('storyRuntime', { ctx, resetMetrics: () => { samples.length = 0; }, getMetrics: () => ({ averageFps: samples.length / (samples.reduce((a, b) => a + b, 0) || 1), drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pointLights: (() => { let n = 0; scene.traverse(o => { if (o.isPointLight && o.visible) n++; }); return n; })(), zone: state.zone, beat: currentBeat, modal: isAnyModalOpen(), ...art.getState() }), guide, getTarget: () => currentTarget, getArrivalCount: () => arrivalCount, getVisionCount: () => visionCount });
ctx.debug?.register('storyArt', art); ctx.debug?.register('storyCamera', storyCamera);
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let last = performance.now();
function frame(now) {
  if (pageDisposed) return;
  const raw = (now - last) / 1000; last = now; const dt = Math.min(raw, .05); state.elapsed += dt;
  if (raw > 0 && raw < .5) { samples.push(raw); if (samples.length > 240) samples.shift(); }
  state.uiOpen = isAnyModalOpen();
  // The camera bounds its own delta and substeps collisions; don't halve walking at 10 FPS.
  storyCamera.update(raw); sky.update(dt); stupa.update(dt); flags.update(dt); environment.update(dt);
  if (activeChapter) chapterScene?.update(dt); else mapInstances[state.zone]?.update(dt);
  art.update(dt);
  if (losang.visible && !reducedMotion.matches) losangCharacter.update(dt);
  document.body.classList.toggle('story-quality-low', art.getState().quality === 'low');
  hud.querySelector('.story-save').textContent = ctx.save.getStatus().ok ? t('saved') : t('chapter.saveError');
  if (!testingChapter && !previewLoading && !debugPanel.isOpen()) story.update(dt);
  phone.update(dt); documentary.update(dt); memory.update(dt); ctx.save.update(dt);
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
story.start();
if (chapters.getState().activeChapterId) resumeChapter();
requestAnimationFrame(frame);
