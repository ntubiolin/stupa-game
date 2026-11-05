/**
 * Reusable Boss Framework (`src/gameplay/bosses/bossBase.js`)
 *
 * Implements:
 *  - createBoss(ctx, def) lifecycle: start, update, reset, subdue, setHp, isActive, damage, applyStatus, getState
 *  - 5-color Tibetan prayer-flag light wall arena barrier (0 PointLights) clamping player & Boss inside arena.r
 *  - Multi-phase state machine with hpBelow thresholds, 1.0s phase-transition invulnerability, and onEnter ('roar' / 'enrage')
 *  - CC resistance (ccResist = 0.75 -> slow/stun/root durations multiplied by 0.25)
 *  - Oath Subjugation Sequence (調伏立誓): kneeling animation, rising golden Vajra chains, camera focus,
 *    screen-edge floating Tibetan mantra syllables (ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ), oath dialogue, quest flag, protector unlock
 *  - First-kill guaranteed Terma drop + rematch drops (3-5 items, >= 1 rare, no guaranteed Terma)
 *  - Persistent Oath Stone (誓言石) at arena center saved via ctx.save ('bosses') for rematches
 */
import * as THREE from 'three';
import { createPatternRunner } from './patterns.js';

const TWO_PI = Math.PI * 2;
const PRAYER_COLORS = [
  0x1a5fb4, // Blue (Sky/Space)
  0xf6f5f4, // White (Air/Wind)
  0xc01c28, // Red (Fire)
  0x2ec27e, // Green (Water)
  0xf6d32d, // Yellow (Earth)
];

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function ensureOathOverlayDom() {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('boss-oath-overlay');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'boss-oath-overlay';
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'pointer-events:none',
    'z-index:35',
    'opacity:0',
    'transition:opacity 0.55s ease',
    'box-shadow:inset 0 0 90px rgba(245, 191, 66, 0.42)',
    'overflow:hidden',
  ].join(';');

  const syllables = ['ཨོཾ', 'མ', 'ཎི', 'པད', 'ྨེ', 'ཧཱུྃ', 'ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ'];
  const positions = [
    { top: '8%', left: '12%' },
    { top: '6%', left: '48%' },
    { top: '9%', left: '82%' },
    { top: '45%', left: '4%' },
    { top: '45%', left: '92%' },
    { top: '86%', left: '16%' },
    { top: '88%', left: '50%' },
    { top: '85%', left: '84%' },
  ];

  positions.forEach((pos, idx) => {
    const span = document.createElement('div');
    span.textContent = syllables[idx % syllables.length];
    span.style.cssText = [
      'position:absolute',
      `top:${pos.top}`,
      `left:${pos.left}`,
      'transform:translate(-50%, -50%)',
      'color:#fde68a',
      'font-size:26px',
      'font-weight:700',
      'letter-spacing:0.15em',
      'text-shadow:0 0 14px rgba(245,191,66,0.95), 0 0 28px rgba(234,179,8,0.75)',
      `animation:bossOathPulse ${2.0 + (idx % 3) * 0.4}s ease-in-out infinite alternate`,
    ].join(';');
    el.appendChild(span);
  });

  if (!document.getElementById('boss-oath-style')) {
    const style = document.createElement('style');
    style.id = 'boss-oath-style';
    style.textContent = `
      @keyframes bossOathPulse {
        0% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.55; }
        100% { transform: translate(-50%, -58%) scale(1.08); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(el);
  return el;
}

export function createBoss(ctx, def) {
  const { scene, state, bus, i18n } = ctx;
  const arena = def.arena || { map: 'wild', x: 1000, z: -48, r: 14 };

  const rootGroup = new THREE.Group();
  rootGroup.name = `Boss_${def.id}`;
  (ctx.zoneGroups?.[arena.map] || ctx.wildGroup || scene).add(rootGroup);

  function getGroundY(x, z) {
    return ctx.world ? ctx.world.getHeight(x, z) : 0;
  }

  // ---------------------------------------------------------------- 1. Build Procedural Boss Model
  const built = def.buildModel(THREE);
  const bossMeshGroup = built.group;
  const startY = getGroundY(arena.x, arena.z);
  bossMeshGroup.position.set(arena.x, startY, arena.z);
  rootGroup.add(bossMeshGroup);

  // Boss red/gold foot halo (0 PointLights)
  const haloGeo = new THREE.RingGeometry(1.15, 1.48, 36);
  haloGeo.rotateX(-Math.PI / 2);
  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 0.45, 0.2),
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.position.y = 0.05;
  bossMeshGroup.add(haloMesh);

  // Invulnerability golden shield sphere during 1.0s phase transition
  const invulnGeo = new THREE.SphereGeometry(2.1, 20, 14);
  const invulnMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.75, 0.4),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const invulnMesh = new THREE.Mesh(invulnGeo, invulnMat);
  invulnMesh.position.y = 1.9;
  invulnMesh.visible = false;
  bossMeshGroup.add(invulnMesh);

  // ---------------------------------------------------------------- 2. 5-Color Prayer-Flag Arena Barrier
  const barrierGroup = new THREE.Group();
  barrierGroup.name = `BossBarrier_${def.id}`;
  barrierGroup.visible = false;
  barrierGroup.position.set(arena.x, startY, arena.z);
  rootGroup.add(barrierGroup);

  const barrierMats = [];
  const segCount = 20;
  const segArc = TWO_PI / segCount;
  const wallHeight = 3.6;

  for (let i = 0; i < segCount; i++) {
    const colorHex = PRAYER_COLORS[i % PRAYER_COLORS.length];
    const segGeo = new THREE.CylinderGeometry(
      arena.r,
      arena.r,
      wallHeight,
      8,
      1,
      true,
      i * segArc,
      segArc * 0.92
    );
    segGeo.translate(0, wallHeight * 0.5, 0);
    const segMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    barrierMats.push(segMat);
    const segMesh = new THREE.Mesh(segGeo, segMat);
    barrierGroup.add(segMesh);
  }

  const baseRingGeo = new THREE.RingGeometry(arena.r - 0.28, arena.r + 0.12, 64);
  baseRingGeo.rotateX(-Math.PI / 2);
  const baseRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.7, 0.35),
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const baseRingMesh = new THREE.Mesh(baseRingGeo, baseRingMat);
  baseRingMesh.position.y = 0.05;
  barrierGroup.add(baseRingMesh);

  // ---------------------------------------------------------------- 3. Golden Vajra Oath Chains (Subjugation VFX)
  const chainsGroup = new THREE.Group();
  chainsGroup.name = `BossOathChains_${def.id}`;
  chainsGroup.visible = false;
  bossMeshGroup.add(chainsGroup);

  const chainMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.4, 1.9, 0.45),
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const chainRings = [];
  for (let i = 0; i < 3; i++) {
    const cGeo = new THREE.TorusGeometry(1.35 - i * 0.18, 0.055, 8, 28);
    cGeo.rotateX(Math.PI / 2);
    const cMesh = new THREE.Mesh(cGeo, chainMat);
    cMesh.position.y = 0.6 + i * 0.75;
    cMesh.rotation.z = (i - 1) * 0.28;
    chainsGroup.add(cMesh);
    chainRings.push(cMesh);
  }

  // ---------------------------------------------------------------- 4. Persistent Oath Stone (誓言石)
  const oathStoneGroup = new THREE.Group();
  oathStoneGroup.name = `OathStone_${def.id}`;
  oathStoneGroup.position.set(arena.x, startY, arena.z);
  oathStoneGroup.visible = false;
  rootGroup.add(oathStoneGroup);

  const steleMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.72,
    metalness: 0.15,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.38,
  });
  const steleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.35, 8), steleMat);
  steleBase.position.y = 0.175;
  oathStoneGroup.add(steleBase);

  const steleBody = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.85, 0.36), steleMat);
  steleBody.position.y = 1.15;
  oathStoneGroup.add(steleBody);

  const steleCap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.55, 4), steleMat);
  steleCap.rotation.y = Math.PI / 4;
  steleCap.position.y = 2.32;
  oathStoneGroup.add(steleCap);

  // 5-color prayer cloth bands draped on the Oath Stone
  for (let i = 0; i < 5; i++) {
    const bandMat = new THREE.MeshBasicMaterial({
      color: PRAYER_COLORS[i],
      side: THREE.DoubleSide,
    });
    const bandMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.11, 0.42), bandMat);
    bandMesh.position.y = 0.75 + i * 0.24;
    oathStoneGroup.add(bandMesh);
  }

  // Glowing golden mantra ring around the Oath Stone base (0 PointLights)
  const oathRingGeo = new THREE.RingGeometry(1.05, 1.38, 32);
  oathRingGeo.rotateX(-Math.PI / 2);
  const oathRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.75, 0.4),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  const oathRingMesh = new THREE.Mesh(oathRingGeo, oathRingMat);
  oathRingMesh.position.y = 0.04;
  oathStoneGroup.add(oathRingMesh);

  // ---------------------------------------------------------------- 5. Boss State & Persistence
  const patternRunner = createPatternRunner(ctx, rootGroup);

  function isSavedSubdued() {
    const saved = ctx.save?.get?.('bosses', { subdued: {} });
    return Boolean(saved?.subdued?.[def.id]);
  }

  function markSavedSubdued() {
    if (!ctx.save) return;
    const saved = ctx.save.get('bosses', { subdued: {} }) || { subdued: {} };
    if (!saved.subdued) saved.subdued = {};
    saved.subdued[def.id] = true;
    ctx.save.set('bosses', saved);
  }

  const bossState = {
    id: def.id,
    kind: def.id,
    rank: 'boss',
    bossDef: def,
    arena,
    level: def.level || 6,
    maxHp: def.hp || 1200,
    hp: def.hp || 1200,
    def: def.def || 12,
    ccResist: def.ccResist ?? 0.75,
    radius: def.radius || 1.35,
    height: def.height || 3.6,
    pos: new THREE.Vector3(arena.x, startY, arena.z),
    facing: 0,
    active: false,
    subdued: isSavedSubdued(),
    isRematch: false,
    phase: 1,
    totalPhases: (def.phases || []).length || 3,
    invulnTimer: 0,
    attackTimer: 1.6,
    attackIndex: 0,
    animState: 'idle',
    animTimer: 0,
    enraged: false,
    slowUntil: 0,
    stunUntil: 0,
    rootUntil: 0,
    oathCeremonyTimer: 0,
    setPosition(nx, nz) {
      const dx = nx - arena.x;
      const dz = nz - arena.z;
      const dist = Math.hypot(dx, dz);
      const maxR = arena.r - bossState.radius - 0.3;
      if (dist > maxR && dist > 0.001) {
        nx = arena.x + (dx / dist) * maxR;
        nz = arena.z + (dz / dist) * maxR;
      }
      bossState.pos.x = nx;
      bossState.pos.z = nz;
      bossState.pos.y = getGroundY(nx, nz);
      bossMeshGroup.position.copy(bossState.pos);
    },
  };

  const oathInteractableId = `oathStone_${def.id}`;
  function removeOathStoneInteractable() {
    ctx.interaction?.unregister?.(oathInteractableId);
    if (Array.isArray(ctx.interactables)) {
      const idx = ctx.interactables.findIndex((it) => it.id === oathInteractableId);
      if (idx !== -1) ctx.interactables.splice(idx, 1);
    }
  }

  function registerOathStoneInteractable() {
    removeOathStoneInteractable();
    const entry = {
      id: oathInteractableId,
      kind: 'oathStone',
      zone: arena.map,
      position: { x: arena.x, y: startY, z: arena.z },
      radius: 3.0,
      labelKey: 'prompt.oathStone',
      interact: () => start({ isRematch: true }),
      onInteract: () => start({ isRematch: true }),
    };
    ctx.interaction?.register?.(entry);
    if (Array.isArray(ctx.interactables)) {
      ctx.interactables.push(entry);
    }
  }

  function syncOathStoneVisibility() {
    const showStone = bossState.subdued && !bossState.active && bossState.oathCeremonyTimer <= 0;
    oathStoneGroup.visible = showStone;
    bossMeshGroup.visible = !showStone;

    removeOathStoneInteractable();
    if (showStone) {
      registerOathStoneInteractable();
    }
  }

  // Initialize visibility from saved state
  if (bossState.subdued) {
    if (def.oath?.flag) {
      ctx.quests?.setFlag?.(def.oath.flag, true);
    }
    syncOathStoneVisibility();
  }

  // ---------------------------------------------------------------- 6. Combat Start / Phase / Reset / Subdue
  function getCurrentPhaseDef() {
    const phases = def.phases || [];
    const idx = Math.max(0, Math.min(phases.length - 1, bossState.phase - 1));
    return phases[idx] || { hpBelow: 1.0, attacks: ['slam'], speed: 1.4 };
  }

  function start(opts = {}) {
    // Ensure player is in the right map; if triggered via debug API from another zone, teleport
    const spawnPos = { x: arena.x, y: startY, z: arena.z + arena.r * 0.65 };
    if (state.zone !== arena.map) {
      state.zone = arena.map;
      if (ctx.zones?.teleport) {
        Promise.resolve(ctx.zones.teleport(arena.map, { skipFade: true })).then(() => {
          if (state.player?.position && bossState.active) {
            state.player.position.set(spawnPos.x, getGroundY(spawnPos.x, spawnPos.z), spawnPos.z);
            state.player.velocity?.set(0, 0, 0);
            state.player.heading = 0;
          }
        });
      }
      if (state.player?.position) {
        state.player.position.set(spawnPos.x, startY, spawnPos.z);
        state.player.velocity?.set(0, 0, 0);
        state.player.heading = 0;
      }
    } else if (state.player?.position) {
      const dist = Math.hypot(state.player.position.x - arena.x, state.player.position.z - arena.z);
      if (dist > arena.r - 1.2) {
        state.player.position.set(arena.x, startY, arena.z + arena.r * 0.68);
        state.player.velocity?.set(0, 0, 0);
      }
    }

    patternRunner.clear();
    bossState.isRematch = Boolean(opts.isRematch || isSavedSubdued());
    bossState.active = true;
    bossState.hp = bossState.maxHp;
    bossState.phase = 1;
    bossState.invulnTimer = 0;
    bossState.attackTimer = 1.35;
    bossState.attackIndex = 0;
    bossState.animState = 'idle';
    bossState.enraged = false;
    bossState.slowUntil = 0;
    bossState.stunUntil = 0;
    bossState.rootUntil = 0;
    bossState.oathCeremonyTimer = 0;
    bossState.setPosition(arena.x, arena.z);
    bossState.facing = 0;
    bossMeshGroup.rotation.y = 0;

    state.bossActive = true;
    state.bossSubdued = false;

    chainsGroup.visible = false;
    invulnMesh.visible = false;
    barrierGroup.visible = true;
    oathStoneGroup.visible = false;
    bossMeshGroup.visible = true;
    removeOathStoneInteractable();

    const name = i18n.t(def.nameKey);
    const title = i18n.t(def.titleKey);
    bus.emit('boss:start', {
      id: def.id,
      name,
      title,
      nameKey: def.nameKey,
      titleKey: def.titleKey,
      hp: bossState.hp,
      maxHp: bossState.maxHp,
      phase: bossState.phase,
      totalPhases: bossState.totalPhases,
    });
    bus.emit('toast', { text: i18n.t('toast.bossStart', { name }) });
    return getState();
  }

  function triggerPhaseTransition(targetPhase) {
    bossState.phase = targetPhase;
    bossState.invulnTimer = 1.0; // 1.0s brief invulnerability on phase transition
    bossState.attackTimer = 1.4;
    bossState.attackIndex = 0;
    invulnMesh.visible = true;
    invulnMat.opacity = 0.55;

    const phaseDef = getCurrentPhaseDef();
    const onEnter = phaseDef.onEnter || 'roar';
    bossState.animState = onEnter;
    bossState.animTimer = 1.0;
    if (onEnter === 'enrage') {
      bossState.enraged = true;
    }

    bus.emit('sfx', 'boulder');
    ctx.cameraRig?.addShake?.(0.45);

    const name = i18n.t(def.nameKey);
    if (onEnter === 'enrage') {
      bus.emit('toast', { text: i18n.t('toast.bossEnrage', { name }) });
    } else {
      bus.emit('toast', { text: i18n.t('toast.bossPhase', { name, phase: targetPhase }) });
    }

    // Immediately activate signature phase-entry mechanics (e.g. summonAdds in P2, weatherZone in P3)
    const attacks = phaseDef.attacks || [];
    if (attacks.includes('weatherZone') && def.attacks?.weatherZone) {
      def.attacks.weatherZone(bossState, patternRunner.patterns, ctx);
    } else if (attacks.includes('summonAdds') && def.attacks?.summonAdds) {
      def.attacks.summonAdds(bossState, patternRunner.patterns, ctx);
    }

    bus.emit('boss:phase', {
      id: def.id,
      phase: bossState.phase,
      totalPhases: bossState.totalPhases,
      onEnter,
    });
    bus.emit('boss:hp', {
      id: def.id,
      hp: bossState.hp,
      maxHp: bossState.maxHp,
      phase: bossState.phase,
      totalPhases: bossState.totalPhases,
    });
  }

  function checkPhaseTransitions() {
    if (!bossState.active || bossState.hp <= 0) return;
    const frac = bossState.hp / bossState.maxHp;
    const phases = def.phases || [];
    for (let i = phases.length - 1; i >= 1; i--) {
      if (frac <= phases[i].hpBelow && bossState.phase < i + 1) {
        triggerPhaseTransition(i + 1);
        break;
      }
    }
  }

  function dropBossLoot(firstKill) {
    if (!ctx.loot) return;
    const dropOrigin = { x: bossState.pos.x, y: bossState.pos.y, z: bossState.pos.z };
    const ilvl = def.level || 6;

    function spawnDrop(item, idx, total) {
      if (!item) return;
      const angle = (idx / Math.max(1, total)) * TWO_PI + Math.random() * 0.35;
      const dist = 1.2 + (idx % 3) * 0.65;
      const tx = dropOrigin.x + Math.cos(angle) * dist;
      const tz = dropOrigin.z + Math.sin(angle) * dist;
      const ty = getGroundY(tx, tz);
      bus.emit('loot:drop', {
        item,
        startPos: dropOrigin,
        position: { x: tx, y: ty, z: tz },
      });
    }

    const items = [];
    if (firstKill) {
      // Guaranteed 1 Terma item on first subjugation
      const termaItem = ctx.loot.generate({
        ilvl,
        rarity: def.loot?.firstKill?.rarity || 'terma',
        rank: 'boss',
      });
      if (termaItem) items.push(termaItem);
    }

    // Normal drops: 3 to 5 items, with at least 1 rare (and never Terma on rematch)
    const countRange = def.loot?.normal?.count || [3, 5];
    const minCount = countRange[0] ?? 3;
    const maxCount = countRange[1] ?? 5;
    const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));

    for (let i = 0; i < count; i++) {
      let rarity = undefined;
      if (i === 0) {
        rarity = def.loot?.normal?.minRarity || 'rare';
      } else {
        const r = Math.random();
        rarity = r < 0.35 ? 'rare' : 'magic';
      }
      const item = ctx.loot.generate({
        ilvl,
        rarity,
        rank: 'boss',
      });
      if (item) {
        if (!firstKill && item.rarity === 'terma') {
          item.rarity = 'rare';
        }
        items.push(item);
      }
    }

    for (let i = 0; i < items.length; i++) {
      spawnDrop(items[i], i, items.length);
    }
  }

  function subdue() {
    if (!bossState.active && bossState.hp <= 0 && bossState.subdued) {
      return getState();
    }

    const firstKill = !isSavedSubdued() && !bossState.isRematch;
    bossState.active = false;
    bossState.hp = 0;
    bossState.subdued = true;
    bossState.invulnTimer = 0;
    bossState.enraged = false;
    bossState.animState = 'kneel';
    bossState.oathCeremonyTimer = 3.2;

    state.bossActive = false;
    state.bossSubdued = true;

    // Clear adds, telegraphs, and weather hazards immediately
    patternRunner.clear();
    barrierGroup.visible = false;
    invulnMesh.visible = false;

    // Show golden Vajra chains around kneeling Boss
    bossState.setPosition(arena.x, arena.z);
    bossMeshGroup.visible = true;
    chainsGroup.visible = true;

    // Show floating Tibetan mantra syllables around screen edge
    const overlayEl = ensureOathOverlayDom();
    if (overlayEl) {
      overlayEl.style.opacity = '1';
      setTimeout(() => {
        overlayEl.style.opacity = '0';
      }, 3200);
    }

    // Focus camera smoothly on the kneeling Boss
    ctx.cameraRig?.setDialogueFocus?.(
      new THREE.Vector3(bossState.pos.x, bossState.pos.y + 1.4, bossState.pos.z)
    );

    // Persist subdued state in ctx.save ('bosses')
    markSavedSubdued();

    // Set quest flag (e.g. 'boss.migoiKing')
    if (def.oath?.flag) {
      ctx.quests?.setFlag?.(def.oath.flag, true);
    }

    // Unlock protector if configured
    if (def.oath?.protector) {
      ctx.protectors?.unlock?.(def.oath.protector);
      if (ctx.save) {
        const protSave = ctx.save.get('protectors', { unlocked: {} }) || { unlocked: {} };
        if (!protSave.unlocked) protSave.unlocked = {};
        protSave.unlocked[def.oath.protector] = true;
        ctx.save.set('protectors', protSave);
      }
      bus.emit('protector:unlock', { id: def.oath.protector, bossId: def.id });
    }

    // Drop loot (guaranteed Terma on firstKill; 3-5 items with >=1 rare and no Terma on rematch)
    dropBossLoot(firstKill);

    // Emit subjugation & end events
    bus.emit('boss:hp', {
      id: def.id,
      hp: 0,
      maxHp: bossState.maxHp,
      phase: bossState.phase,
      totalPhases: bossState.totalPhases,
    });
    bus.emit('boss:subdued', {
      id: def.id,
      bossId: def.id,
      firstKill,
    });
    bus.emit('boss:end', { id: def.id, reason: 'subdued', firstKill });

    const name = i18n.t(def.nameKey);
    bus.emit('toast', {
      text: i18n.t(firstKill ? 'toast.bossSubdued' : 'toast.bossRematchSubdued', { name }),
    });

    // Open oath dialogue on first subjugation
    if (firstKill && def.oath?.dialogue && ctx.dialogue) {
      ctx.dialogue.open(def.oath.dialogue, {
        speakerKey: def.nameKey,
        focusPos: new THREE.Vector3(bossState.pos.x, bossState.pos.y + 1.4, bossState.pos.z),
      });
    } else {
      setTimeout(() => {
        if (!bossState.active) {
          ctx.cameraRig?.clearDialogueFocus?.();
        }
      }, 2200);
    }

    // Register Oath Stone immediately so interaction queries / E2E tests find it right away
    registerOathStoneInteractable();
    oathStoneGroup.visible = true;

    return getState();
  }

  function reset() {
    const wasActive = bossState.active;
    patternRunner.clear();

    bossState.active = false;
    bossState.hp = bossState.maxHp;
    bossState.phase = 1;
    bossState.invulnTimer = 0;
    bossState.attackTimer = 1.6;
    bossState.attackIndex = 0;
    bossState.animState = 'idle';
    bossState.enraged = false;
    bossState.slowUntil = 0;
    bossState.stunUntil = 0;
    bossState.rootUntil = 0;
    bossState.oathCeremonyTimer = 0;
    bossState.setPosition(arena.x, arena.z);

    state.bossActive = false;
    barrierGroup.visible = false;
    chainsGroup.visible = false;
    invulnMesh.visible = false;

    const overlayEl = document.getElementById('boss-oath-overlay');
    if (overlayEl) overlayEl.style.opacity = '0';

    syncOathStoneVisibility();

    if (wasActive) {
      bus.emit('boss:reset', { id: def.id });
      bus.emit('boss:end', { id: def.id, reason: 'reset' });
    }
    return getState();
  }

  function setHp(fraction) {
    const clamped = Math.max(0, Math.min(1, Number(fraction) || 0));
    if (!bossState.active && clamped > 0) {
      start();
    }
    bossState.invulnTimer = 0;
    bossState.hp = Math.round(bossState.maxHp * clamped);
    bus.emit('boss:hp', {
      id: def.id,
      hp: bossState.hp,
      maxHp: bossState.maxHp,
      phase: bossState.phase,
      totalPhases: bossState.totalPhases,
    });
    if (bossState.hp <= 0) {
      subdue();
    } else {
      checkPhaseTransitions();
    }
    return getState();
  }

  function damage(amount, opts = {}) {
    if (!bossState.active || bossState.hp <= 0) {
      return { dealt: 0, hit: false, killed: false, liberated: false, amount: 0, hp: bossState.hp };
    }
    if (bossState.invulnTimer > 0 && !opts.ignoreInvuln) {
      return {
        dealt: 0,
        hit: false,
        killed: false,
        liberated: false,
        amount: 0,
        hp: bossState.hp,
        immune: true,
      };
    }

    // Apply Boss defense mitigation slightly while keeping damage responsive
    const raw = Math.max(1, Number(amount) || 1);
    const finalDmg = Math.max(1, Math.round(raw));
    bossState.hp = Math.max(0, bossState.hp - finalDmg);
    bus.emit('sfx', { name: 'hit' });

    // Apply CC status from opts.status (with ccResist = 0.75)
    if (opts.status && typeof opts.status === 'object') {
      if (typeof opts.status.root === 'number' && opts.status.root > 0) {
        applyStatus('root', opts.status.root);
      }
      if (typeof opts.status.stun === 'number' && opts.status.stun > 0) {
        applyStatus('stun', opts.status.stun);
      }
      if (opts.status.slow) {
        const sDur =
          typeof opts.status.slow === 'number'
            ? opts.status.slow
            : Number(opts.status.slow.duration) || 1.5;
        applyStatus('slow', sDur);
      }
    }

    // Spawn floating combat text if HUD supports it
    bus.emit('enemy:hit', {
      id: def.id,
      kind: def.id,
      damage: finalDmg,
      type: opts.type || 'magic',
      crit: Boolean(opts.crit),
      source: opts.source || 'player',
      position: {
        x: bossState.pos.x,
        y: bossState.pos.y + bossState.height * 0.85,
        z: bossState.pos.z,
      },
    });
    bus.emit('enemy:damaged', {
      id: def.id,
      kind: def.id,
      rank: 'boss',
      amount: finalDmg,
      crit: Boolean(opts.crit),
      hp: bossState.hp,
      maxHp: bossState.maxHp,
      position: {
        x: bossState.pos.x,
        y: bossState.pos.y + bossState.height * 0.85,
        z: bossState.pos.z,
      },
    });

    bus.emit('boss:hp', {
      id: def.id,
      hp: bossState.hp,
      maxHp: bossState.maxHp,
      phase: bossState.phase,
      totalPhases: bossState.totalPhases,
    });

    if (bossState.hp <= 0) {
      subdue();
      return { dealt: finalDmg, hit: true, killed: true, liberated: true, amount: finalDmg, hp: 0 };
    }

    checkPhaseTransitions();
    return {
      dealt: finalDmg,
      hit: true,
      killed: false,
      liberated: false,
      amount: finalDmg,
      hp: bossState.hp,
    };
  }

  function applyStatus(kind, duration = 1.0, extra = {}) {
    if (!bossState.active || bossState.hp <= 0) return false;
    // Apply Boss CC resistance (ccResist = 0.75 -> 25% effective duration)
    const resistMult = Math.max(0, 1 - (bossState.ccResist ?? 0.75));
    const effectiveDur = Math.max(0.05, (Number(duration) || 0) * resistMult);
    const until = state.elapsed + effectiveDur;

    if (kind === 'slow') {
      bossState.slowUntil = Math.max(bossState.slowUntil, until);
    } else if (kind === 'stun') {
      bossState.stunUntil = Math.max(bossState.stunUntil, until);
    } else if (kind === 'root') {
      bossState.rootUntil = Math.max(bossState.rootUntil, until);
    }
    if (extra.knockback && extra.fromPos) {
      const kb = extra.knockback * resistMult;
      const dx = bossState.pos.x - extra.fromPos.x;
      const dz = bossState.pos.z - extra.fromPos.z;
      const d = Math.hypot(dx, dz) || 1;
      bossState.setPosition(
        bossState.pos.x + (dx / d) * kb,
        bossState.pos.z + (dz / d) * kb
      );
    }
    return true;
  }

  // Listen for player fainting -> reset Boss
  bus.on('player:faint', () => {
    if (bossState.active) {
      reset();
    }
  });

  // Listen for dialogue closing after oath -> release camera focus & hide kneeling boss
  bus.on('dialogue:close', ({ id }) => {
    if (id === def.oath?.dialogue && bossState.subdued && !bossState.active) {
      ctx.cameraRig?.clearDialogueFocus?.();
      chainsGroup.visible = false;
      syncOathStoneVisibility();
    }
  });

  // ---------------------------------------------------------------- 7. Per-Frame Update
  function update(dt) {
    if (state.zone !== arena.map) {
      if (bossState.active) {
        reset();
      }
      return;
    }

    // Pulse Oath Stone ring when visible
    if (oathStoneGroup.visible) {
      oathRingMat.opacity = 0.6 + Math.sin(state.elapsed * 3.2) * 0.22;
    }

    // Handle post-subdue kneeling & chain animation
    if (!bossState.active && bossState.oathCeremonyTimer > 0) {
      bossState.oathCeremonyTimer = Math.max(0, bossState.oathCeremonyTimer - dt);
      for (let i = 0; i < chainRings.length; i++) {
        chainRings[i].rotation.z += dt * (i % 2 === 0 ? 1.2 : -1.2);
      }
      built.anim?.(dt, bossState);
      if (bossState.oathCeremonyTimer === 0 && !state.dialogueOpen) {
        chainsGroup.visible = false;
        syncOathStoneVisibility();
      }
    }

    // Auto-start when player steps inside arena radius (if not yet subdued)
    const pPos = state.player?.position;
    if (
      !bossState.active &&
      !bossState.subdued &&
      pPos &&
      state.mode === 'play' &&
      state.player?.action !== 'faint' &&
      (state.player?.hp ?? 1) > 0
    ) {
      const distToCenter = Math.hypot(pPos.x - arena.x, pPos.z - arena.z);
      if (distToCenter <= arena.r - 0.8) {
        start();
      } else {
        built.anim?.(dt, bossState);
        return;
      }
    }

    if (!bossState.active) return;

    // 1. Clamp Player inside the 5-color prayer-flag arena barrier
    if (pPos) {
      const dx = pPos.x - arena.x;
      const dz = pPos.z - arena.z;
      const dist = Math.hypot(dx, dz);
      const maxPlayerR = arena.r - (ctx.config.PLAYER?.radius || 0.4) - 0.25;
      if (dist > maxPlayerR && dist > 0.001) {
        pPos.x = arena.x + (dx / dist) * maxPlayerR;
        pPos.z = arena.z + (dz / dist) * maxPlayerR;
      }
    }

    // Shimmer barrier segments
    for (let i = 0; i < barrierMats.length; i++) {
      barrierMats[i].opacity = 0.22 + Math.sin(state.elapsed * 3.0 + i * 0.7) * 0.08;
    }

    // 2. Update phase-transition invulnerability timer
    if (bossState.invulnTimer > 0) {
      bossState.invulnTimer = Math.max(0, bossState.invulnTimer - dt);
      invulnMat.opacity = 0.55 * (bossState.invulnTimer / 1.0);
      if (bossState.invulnTimer === 0) {
        invulnMesh.visible = false;
      }
    }

    // 3. Movement & Attack Scheduling
    const isStunned = state.elapsed < bossState.stunUntil;
    const isRooted = state.elapsed < bossState.rootUntil;
    const isSlowed = state.elapsed < bossState.slowUntil;

    if (!isStunned && bossState.invulnTimer <= 0) {
      const phaseDef = getCurrentPhaseDef();
      let moveSpeed = phaseDef.speed ?? 1.4;
      if (isSlowed) moveSpeed *= 0.6;
      if (isRooted) moveSpeed = 0;

      if (pPos) {
        const dx = pPos.x - bossState.pos.x;
        const dz = pPos.z - bossState.pos.z;
        const dist = Math.hypot(dx, dz);
        const targetAngle = Math.atan2(dx, dz);
        bossState.facing += wrapAngle(targetAngle - bossState.facing) * Math.min(1, dt * 6.0);
        bossMeshGroup.rotation.y = bossState.facing + Math.PI;

        if (dist > 3.1 && moveSpeed > 0 && bossState.animState !== 'windup') {
          const step = moveSpeed * dt;
          bossState.setPosition(
            bossState.pos.x + (dx / dist) * step,
            bossState.pos.z + (dz / dist) * step
          );
          if (bossState.animState === 'idle') {
            bossState.animState = 'walk';
          }
        } else if (bossState.animState === 'walk') {
          bossState.animState = 'idle';
        }
      }

      // Schedule next attack from current phase list
      bossState.attackTimer -= dt * (bossState.enraged ? 1.25 : 1.0);
      if (bossState.attackTimer <= 0) {
        const attacks = phaseDef.attacks || ['slam'];
        // Filter out weatherZone if already active
        const available = attacks.filter(
          (a) => !(a === 'weatherZone' && patternRunner.hasWeatherZone())
        );
        const list = available.length > 0 ? available : ['slam'];
        const chosenKey = list[bossState.attackIndex % list.length];
        bossState.attackIndex++;

        const attackFn = def.attacks?.[chosenKey];
        if (typeof attackFn === 'function') {
          const cd = attackFn(bossState, patternRunner.patterns, ctx);
          bossState.attackTimer = typeof cd === 'number' ? cd : (bossState.enraged ? 2.4 : 3.2);
        } else {
          bossState.attackTimer = 2.8;
        }
      }
    }

    // 4. Update active pattern telegraphs, projectiles, and hazards
    patternRunner.update(dt);

    // 5. Update procedural model animation
    built.anim?.(dt, bossState);
  }

  function getState() {
    return {
      id: def.id,
      name: i18n.t(def.nameKey),
      title: i18n.t(def.titleKey),
      active: bossState.active,
      subdued: bossState.subdued,
      hp: bossState.hp,
      maxHp: bossState.maxHp,
      hpFraction: bossState.maxHp > 0 ? bossState.hp / bossState.maxHp : 0,
      phase: bossState.phase,
      totalPhases: bossState.totalPhases,
      invulnerable: bossState.invulnTimer > 0,
      invulnTimer: bossState.invulnTimer,
      enraged: bossState.enraged,
      weatherActive: patternRunner.hasWeatherZone(),
      safeZones: patternRunner.getSafeZones().map((s) => ({ x: s.x, z: s.z, r: s.r })),
      position: { x: bossState.pos.x, y: bossState.pos.y, z: bossState.pos.z },
      arena: { ...arena },
      oathStoneVisible: oathStoneGroup.visible,
    };
  }

  return {
    id: def.id,
    def,
    start,
    update,
    reset,
    subdue,
    setHp,
    isActive() {
      return bossState.active;
    },
    damage,
    applyStatus,
    getState,
    getInternalState() {
      return bossState;
    },
  };
}
