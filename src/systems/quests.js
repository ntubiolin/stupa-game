/**
 * Data-Driven Quest System (`src/systems/quests.js`).
 *
 * Manages quest definitions, 9 bus-driven step types (`talk`, `reach`, `liberate`,
 * `collect`, `interact`, `kora`, `light`, `boss`, `event`), reward distribution,
 * persistent save state (`quests` section via `ctx.save`), glowing collectible
 * quest props, 3D world diamond markers, and `getTrackedTargets()`.
 */
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MAPS } from '../data/maps.js';
import { resolveWaypointCoords } from '../gameplay/waypoints.js';
import { DEBUG_QUESTS } from '../data/quests/debug.js';
import { PROLOGUE_QUESTS } from '../data/quests/prologue.js';
import { CH1_QUESTS } from '../data/quests/ch1.js';
import { CH2_QUESTS } from '../data/quests/ch2.js';
import { CH3_QUESTS } from '../data/quests/ch3.js';
import { CH4_QUESTS } from '../data/quests/ch4.js';
import { CH5_QUESTS } from '../data/quests/ch5.js';
import '../i18n/quests.js';
import '../i18n/prologue.js';

function getStepGoal(step) {
  if (!step) return 1;
  if (step.type === 'kora') return Math.max(1, Number(step.laps ?? step.count ?? 1));
  return Math.max(1, Number(step.count ?? 1));
}

function matchEventPayload(payload, matchSpec) {
  if (!matchSpec || typeof matchSpec !== 'object') return true;
  if (!payload || typeof payload !== 'object') return false;
  for (const [k, v] of Object.entries(matchSpec)) {
    if (payload[k] !== v) return false;
  }
  return true;
}

export function createQuests(ctx) {
  const { state, bus, scene, i18n } = ctx;
  const registry = new Map();
  const subscribedCustomEvents = new Set();

  // ---------------------------------------------------------------- Persistent State
  const DEFAULT_SAVE = {
    active: {},
    done: [],
    flags: {},
  };

  let questData = {
    active: {},
    done: [],
    flags: {},
  };

  function loadFromSave() {
    const saved = ctx.save
      ? ctx.save.get('quests', DEFAULT_SAVE)
      : { active: {}, done: [], flags: {} };

    questData = {
      active: (saved?.active && typeof saved.active === 'object' && !Array.isArray(saved.active))
        ? { ...saved.active }
        : {},
      done: Array.isArray(saved?.done) ? [...saved.done] : [],
      flags: (saved?.flags && typeof saved.flags === 'object' && !Array.isArray(saved.flags))
        ? { ...saved.flags }
        : {},
    };
    syncStateMirror();
  }

  function syncStateMirror() {
    state.quests = {
      active: questData.active,
      done: questData.done,
      flags: questData.flags,
    };
  }

  function persist() {
    syncStateMirror();
    if (ctx.save) {
      ctx.save.set('quests', {
        active: questData.active,
        done: questData.done,
        flags: questData.flags,
      });
    }
  }

  loadFromSave();

  // ---------------------------------------------------------------- Collectible Quest Items in 3D World
  const collectibleNodes = [];
  // Each node: { id, questId, item, map, x, z, labelKey, collected, group, mesh, ring }

  function buildCollectibleMesh() {
    const grp = new THREE.Group();
    grp.name = 'QuestCollectible';

    // Golden lotus crystal core
    const coreGeo = new THREE.OctahedronGeometry(0.24, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffdf6b,
      emissive: 0xffa818,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.35,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.55;
    grp.add(core);

    // Lotus petals around base of crystal
    const petalGeo = new THREE.ConeGeometry(0.14, 0.26, 5);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, coreMat);
      petal.position.set(Math.cos(ang) * 0.2, 0.45, Math.sin(ang) * 0.2);
      petal.rotation.z = -Math.cos(ang) * 0.65;
      petal.rotation.x = Math.sin(ang) * 0.65;
      grp.add(petal);
    }

    // Additive ground glow ring (NO PointLight)
    const ringGeo = new THREE.RingGeometry(0.28, 0.52, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.1, 1.65, 0.45),
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.03;
    grp.add(ring);

    // Vertical light pillar
    const pillarGeo = new THREE.CylinderGeometry(0.06, 0.14, 2.2, 12, 1, true);
    pillarGeo.translate(0, 1.1, 0);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.9, 1.5, 0.4),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    grp.add(pillar);

    return { group: grp, core, ring };
  }

  function collectQuestNode(node) {
    if (!node || node.collected) return false;
    node.collected = true;
    node.group.visible = false;
    bus.emit('sfx', { name: 'pickup' });
    bus.emit('toast', {
      key: 'quest.toast.itemPicked',
      params: { name: { key: node.labelKey } },
    });
    bus.emit('quest:item', { item: node.item, count: 1, nodeId: node.id });
    return true;
  }

  function registerQuestCollectibles(questDef) {
    if (!questDef || !Array.isArray(questDef.steps)) return;
    for (const step of questDef.steps) {
      if (step.type !== 'collect' || !Array.isArray(step.spots)) continue;
      step.spots.forEach((spot, idx) => {
        const nodeId = `qitem-${questDef.id}-${step.item}-${idx}`;
        if (collectibleNodes.some((n) => n.id === nodeId)) return;

        const mapId = spot.map || step.map || 'sandbox';
        const { group, core, ring } = buildCollectibleMesh();
        const y = ctx.world?.getHeight(spot.x, spot.z, mapId) ?? 0;
        group.position.set(spot.x, y, spot.z);
        group.visible = false;

        const parentGroup = ctx.zoneGroups?.[mapId] || scene;
        parentGroup.add(group);

        const posVec = new THREE.Vector3(spot.x, y, spot.z);
        const node = {
          id: nodeId,
          questId: questDef.id,
          stepId: step.id,
          item: step.item,
          map: mapId,
          x: spot.x,
          z: spot.z,
          labelKey: spot.labelKey || `quest.item.${step.item}`,
          collected: false,
          group,
          core,
          ring,
        };

        ctx.interactables?.push({
          id: nodeId,
          kind: 'questItem',
          zone: mapId,
          action: 'interact',
          labelKey: 'prompt.pickupQuestItem',
          radius: 2.5,
          getPosition() {
            posVec.set(node.x, ctx.world?.getHeight(node.x, node.z, node.map) ?? 0, node.z);
            return posVec;
          },
          isAvailable() {
            return (
              !node.collected &&
              (state.zone || 'stupa') === node.map &&
              !state.uiOpen &&
              isCollectStepActiveForItem(node.item)
            );
          },
          onInteract() {
            collectQuestNode(node);
          },
        });

        collectibleNodes.push(node);
      });
    }
  }

  function isCollectStepActiveForItem(itemId) {
    for (const [qId, activeEntry] of Object.entries(questData.active)) {
      const qDef = registry.get(qId);
      const step = qDef?.steps?.[activeEntry.step];
      if (step && step.type === 'collect' && step.item === itemId) {
        return true;
      }
    }
    return false;
  }

  function resetCollectiblesForQuest(questId) {
    for (const node of collectibleNodes) {
      if (!questId || node.questId === questId) {
        node.collected = false;
      }
    }
  }

  // ---------------------------------------------------------------- 3D World Target Diamond Marker
  const worldMarkerGroup = new THREE.Group();
  worldMarkerGroup.name = 'QuestWorldMarker';
  worldMarkerGroup.visible = false;

  const diamondGeo = new THREE.OctahedronGeometry(0.28, 0);
  diamondGeo.scale(1, 1.5, 1);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xffe066,
    emissive: 0xffaa18,
    emissiveIntensity: 1.1,
    roughness: 0.2,
    metalness: 0.4,
    toneMapped: false,
  });
  const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
  worldMarkerGroup.add(diamondMesh);

  const groundRingGeo = new THREE.RingGeometry(0.45, 0.65, 28);
  groundRingGeo.rotateX(-Math.PI / 2);
  const groundRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 1.7, 0.45),
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const groundRingMesh = new THREE.Mesh(groundRingGeo, groundRingMat);
  worldMarkerGroup.add(groundRingMesh);

  scene.add(worldMarkerGroup);

  // 3D Ground Guidance Trail (24 golden lotus-ring nodes for circular kora or 8 stepping stones; 0 PointLights)
  const TRAIL_NODE_COUNT = 24;
  const DIRECT_TRAIL_COUNT = 8;
  const questTrailGroup = new THREE.Group();
  questTrailGroup.name = 'QuestGuidanceTrailGroup';
  questTrailGroup.visible = false;
  const trailNodeGeo = new THREE.RingGeometry(0.14, 0.28, 18);
  trailNodeGeo.rotateX(-Math.PI / 2);
  const trailNodes = [];
  for (let i = 0; i < TRAIL_NODE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 1.75, 0.5),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(trailNodeGeo, mat);
    questTrailGroup.add(mesh);
    trailNodes.push({ mesh, mat });
  }
  scene.add(questTrailGroup);

  // ---------------------------------------------------------------- Quest Registration
  function register(questDefs) {
    const list = Array.isArray(questDefs) ? questDefs : [questDefs];
    for (const def of list) {
      if (!def || !def.id) continue;
      registry.set(def.id, def);
      registerQuestCollectibles(def);

      // Subscribe any custom `event` step names on the bus
      if (Array.isArray(def.steps)) {
        for (const step of def.steps) {
          const evName = step.name || step.event;
          if (step.type === 'event' && evName && !subscribedCustomEvents.has(evName)) {
            subscribedCustomEvents.add(evName);
            bus.on(evName, (payload) => {
              handleCustomEventStep(evName, payload);
            });
          }
        }
      }
    }
  }

  register(DEBUG_QUESTS);
  register(PROLOGUE_QUESTS);
  register(CH1_QUESTS);
  register(CH2_QUESTS);
  register(CH3_QUESTS);
  register(CH4_QUESTS);
  register(CH5_QUESTS);

  // Auto-discover chapter i18n (`src/i18n/*.js`) and chapter quests (`src/data/quests/*.js`)
  if (typeof import.meta.glob === 'function') {
    import.meta.glob('../i18n/*.js', { eager: true });
    const chapterQuestModules = import.meta.glob('../data/quests/*.js', { eager: true });
    for (const mod of Object.values(chapterQuestModules)) {
      if (!mod || typeof mod !== 'object') continue;
      for (const val of Object.values(mod)) {
        if (Array.isArray(val)) {
          register(val);
        } else if (val && typeof val === 'object' && typeof val.id === 'string' && Array.isArray(val.steps)) {
          register([val]);
        }
      }
    }
  }

  // Re-parent collectibles when a lazy map finishes building
  bus.on('map:loaded', ({ mapId }) => {
    for (const node of collectibleNodes) {
      if (node.map === mapId) {
        const y = ctx.world?.getHeight(node.x, node.z, mapId) ?? 0;
        node.group.position.set(node.x, y, node.z);
        const zg = ctx.zoneGroups?.[mapId];
        if (zg && node.group.parent !== zg) {
          zg.add(node.group);
        }
      }
    }
  });

  // ---------------------------------------------------------------- Helper Queries
  function hasFlag(flag) {
    return Boolean(questData.flags?.[flag]);
  }

  function isActive(questId) {
    return Boolean(questData.active?.[questId]);
  }

  function isDone(questId) {
    return questData.done.includes(questId);
  }

  function isAtStep(questId, stepIdOrIndex) {
    const entry = questData.active?.[questId];
    if (!entry) return false;
    const def = registry.get(questId);
    if (!def) return false;
    if (typeof stepIdOrIndex === 'number') {
      return entry.step === stepIdOrIndex;
    }
    const curStep = def.steps?.[entry.step];
    return Boolean(curStep && curStep.id === stepIdOrIndex);
  }

  function canStartQuest(def) {
    if (!def) return false;
    if (isActive(def.id) || isDone(def.id)) return false;
    if (def.debugOnly && !ctx.debug?.enabled && state.zone !== 'sandbox') return false;
    const reqFlags = def.requires?.flags || [];
    for (const f of reqFlags) {
      if (!hasFlag(f)) return false;
    }
    return true;
  }

  function checkAutoStartQuests() {
    for (const def of registry.values()) {
      if (!def.autoStart || !canStartQuest(def)) continue;
      if (def.freshStartOnly) {
        const hasAnyQuestHistory =
          Object.keys(questData.active || {}).length > 0 ||
          (questData.done || []).length > 0 ||
          Boolean(questData.flags?.sentinel);
        if (hasAnyQuestHistory) continue;
      }
      start(def.id);
    }
  }

  function getTrackedCount() {
    let count = 0;
    for (const entry of Object.values(questData.active)) {
      if (entry.tracked !== false) count++;
    }
    return count;
  }

  function ensureSandboxStepSetup(questId, stepDef) {
    if (questId === 'debug.sample' && stepDef?.type === 'liberate' && state.zone === 'sandbox') {
      const activeEnemies = ctx.enemies?.list?.() || [];
      if (activeEnemies.length < (stepDef.count || 2)) {
        const needed = (stepDef.count || 2) - activeEnemies.length;
        for (let i = 0; i < needed; i++) {
          ctx.enemies?.spawn?.('preta', 12 + i * 3, { level: 1 });
        }
      }
    }
  }

  // ---------------------------------------------------------------- Core Lifecycle Operations
  function start(questId, opts = {}) {
    const def = registry.get(questId);
    if (!def) {
      console.warn(`[quests] Unknown quest "${questId}"`);
      return false;
    }
    if (opts.forceRestart) {
      reset(questId);
    }
    if (isActive(questId) || isDone(questId)) {
      return false;
    }

    resetCollectiblesForQuest(questId);
    const shouldTrack = getTrackedCount() < 3;
    questData.active[questId] = {
      step: 0,
      progress: 0,
      tracked: shouldTrack,
      interactedTargets: [],
    };
    persist();

    const firstStep = def.steps?.[0];
    const goal = getStepGoal(firstStep);
    ensureSandboxStepSetup(questId, firstStep);

    bus.emit('quest:start', {
      id: questId,
      step: 0,
      stepId: firstStep?.id || null,
      progress: 0,
      goal,
    });
    bus.emit('toast', {
      key: 'quest.toast.started',
      params: { title: { key: def.titleKey } },
    });
    bus.emit('sfx', { name: 'bowl' });
    return true;
  }

  function advanceStepProgress(questId, delta = 1) {
    const entry = questData.active?.[questId];
    const def = registry.get(questId);
    if (!entry || !def) return false;

    const stepDef = def.steps?.[entry.step];
    if (!stepDef) return false;

    const goal = getStepGoal(stepDef);
    entry.progress = Math.max(0, Math.min(goal, (entry.progress || 0) + delta));
    persist();

    bus.emit('quest:progress', {
      id: questId,
      step: entry.step,
      stepId: stepDef.id,
      progress: entry.progress,
      goal,
    });

    if (entry.progress >= goal) {
      completeStep(questId, stepDef.id);
    }
    return true;
  }

  function completeStep(questId, expectedStepId) {
    const entry = questData.active?.[questId];
    const def = registry.get(questId);
    if (!entry || !def) return false;

    const currentStepDef = def.steps?.[entry.step];
    if (expectedStepId && currentStepDef && currentStepDef.id !== expectedStepId) {
      return false;
    }

    entry.step += 1;
    entry.progress = 0;
    entry.interactedTargets = [];

    if (entry.step >= (def.steps?.length || 0)) {
      return complete(questId);
    }

    const nextStepDef = def.steps[entry.step];
    const nextGoal = getStepGoal(nextStepDef);
    persist();

    ensureSandboxStepSetup(questId, nextStepDef);

    bus.emit('quest:progress', {
      id: questId,
      step: entry.step,
      stepId: nextStepDef.id,
      progress: 0,
      goal: nextGoal,
    });
    bus.emit('sfx', { name: 'bell' });
    return true;
  }

  function grantRewards(rewards) {
    if (!rewards || typeof rewards !== 'object') return;

    if (rewards.exp && rewards.exp > 0) {
      ctx.vitals?.addExp?.(rewards.exp);
    }

    if (rewards.turquoise && rewards.turquoise > 0) {
      if (ctx.inventory?.addTurquoise) {
        ctx.inventory.addTurquoise(rewards.turquoise);
      } else {
        state.turquoise = (state.turquoise || 0) + rewards.turquoise;
        bus.emit('currency:changed', { turquoise: state.turquoise, delta: rewards.turquoise });
      }
    }

    const itemSpecs = Array.isArray(rewards.items)
      ? rewards.items
      : rewards.item
        ? [rewards.item]
        : [];
    if (itemSpecs.length > 0) {
      for (let i = 0; i < itemSpecs.length; i++) {
        const spec = itemSpecs[i];
        const item = ctx.loot?.rollItem
          ? ctx.loot.rollItem(spec)
          : ctx.loot?.generate
            ? ctx.loot.generate(spec)
            : {
                uid: `qreward_${Date.now()}_${i}`,
                baseId: spec.baseId || 'bronze_vajra',
                slot: spec.slot || 'mainhand',
                rarity: spec.rarity || 'blessed',
                ilvl: spec.ilvl || 5,
              };
        const addFn = ctx.inventory?.addItem || ctx.inventory?.add;
        if (addFn) {
          const added = addFn.call(ctx.inventory, item);
          if (added === false) {
            bus.emit('loot:drop', {
              item,
              position: state.player?.position,
            });
          } else {
            bus.emit('loot:pickup', { item });
          }
        } else {
          if (!Array.isArray(state.stubBag)) state.stubBag = [];
          state.stubBag.push(item);
          bus.emit('loot:pickup', { item });
        }
      }
    }

    if (Array.isArray(rewards.flags)) {
      for (const f of rewards.flags) {
        setFlag(f, true);
      }
    }

    if (Array.isArray(rewards.codex)) {
      for (const cId of rewards.codex) {
        ctx.codex?.unlock?.(cId);
        bus.emit('codex:unlock', { id: cId });
      }
    }

    if (rewards.waypoint) {
      ctx.waypoints?.unlock?.(rewards.waypoint);
      bus.emit('waypoint:unlock', { mapId: rewards.waypoint });
    }

    if (rewards.skillUnlock) {
      setFlag(`skill.${rewards.skillUnlock}`, true);
      ctx.skills?.unlock?.(rewards.skillUnlock);
      bus.emit('skill:unlock', { id: rewards.skillUnlock });
    }

    if (rewards.protector) {
      setFlag(`protector.${rewards.protector}`, true);
      ctx.allies?.unlock?.(rewards.protector);
      ctx.protectors?.unlock?.(rewards.protector);
      bus.emit('protector:unlock', { id: rewards.protector });
    }

    if (rewards.chapterBanner) {
      bus.emit('chapter:banner', rewards.chapterBanner);
    }
  }

  function complete(questId) {
    const def = registry.get(questId);
    if (!def) return false;
    if (isDone(questId) && !isActive(questId)) return false;

    delete questData.active[questId];
    if (!questData.done.includes(questId)) {
      questData.done.push(questId);
    }
    persist();

    grantRewards(def.rewards);

    bus.emit('sfx', { name: 'levelup' });
    bus.emit('quest:complete', {
      id: questId,
      titleKey: def.titleKey,
      rewards: def.rewards || {},
    });

    const nextQuestId = def.nextQuest || def.rewards?.nextQuest;
    if (nextQuestId && !isActive(nextQuestId) && !isDone(nextQuestId)) {
      start(nextQuestId);
    }

    checkAutoStartQuests();
    return true;
  }

  function reset(questId) {
    if (!questId) {
      questData = { active: {}, done: [], flags: {} };
      resetCollectiblesForQuest(null);
      persist();
      bus.emit('quest:reset', { id: null });
      return true;
    }

    delete questData.active[questId];
    questData.done = questData.done.filter((id) => id !== questId);
    const def = registry.get(questId);
    if (Array.isArray(def?.rewards?.flags)) {
      for (const f of def.rewards.flags) {
        delete questData.flags[f];
      }
    }
    resetCollectiblesForQuest(questId);
    persist();
    bus.emit('quest:reset', { id: questId });
    return true;
  }

  function setFlag(flag, value = true) {
    if (!flag) return;
    if (value) {
      questData.flags[flag] = true;
      persist();
      bus.emit('flag:set', { flag, value: true });
      checkAutoStartQuests();
    } else {
      clearFlag(flag);
    }
  }

  function clearFlag(flag) {
    if (!flag) return;
    delete questData.flags[flag];
    persist();
    bus.emit('flag:set', { flag, value: false });
  }

  function toggleTrack(questId) {
    const entry = questData.active?.[questId];
    if (!entry) return false;
    if (entry.tracked !== false) {
      entry.tracked = false;
    } else {
      if (getTrackedCount() >= 3) {
        // Untrack the first tracked quest to make room
        for (const other of Object.values(questData.active)) {
          if (other.tracked !== false) {
            other.tracked = false;
            break;
          }
        }
      }
      entry.tracked = true;
    }
    persist();
    bus.emit('quest:progress', { id: questId, step: entry.step, progress: entry.progress });
    return entry.tracked;
  }

  // ---------------------------------------------------------------- Step Event Listeners (9 Step Types)
  function forEachActiveStepOfType(type, callback) {
    for (const [qId, entry] of Object.entries({ ...questData.active })) {
      const def = registry.get(qId);
      const step = def?.steps?.[entry.step];
      if (step && step.type === type) {
        callback(qId, entry, step, def);
      }
    }
  }

  // 1. `talk`: { npc }
  function handleTalkEvent(payload = {}) {
    const npcId = payload.npcId || payload.id || payload.npc;
    if (!npcId) return;
    forEachActiveStepOfType('talk', (qId, _entry, step) => {
      if (step.npc === npcId) {
        advanceStepProgress(qId, 1);
      }
    });
  }
  bus.on('npc:talk', handleTalkEvent);
  bus.on('npc:talked', handleTalkEvent);

  // 3. `liberate`: { count, kind?, tag?, rank?, map? }
  bus.on('enemy:liberated', (payload = {}) => {
    const enemyMap = payload.mapId || state.zone;
    const enemyKind = payload.kind;
    const enemyRank = payload.rank || 'normal';
    const enemyTags = Array.isArray(payload.tags) ? payload.tags : [];

    forEachActiveStepOfType('liberate', (qId, _entry, step) => {
      if (step.map && step.map !== enemyMap) return;
      if (step.kind && step.kind !== enemyKind) return;
      if (step.rank && step.rank !== enemyRank) return;
      if (step.tag && !enemyTags.includes(step.tag)) return;
      advanceStepProgress(qId, 1);
    });
  });

  // 4. `collect`: { item, count }
  function handleCollectEvent(payload = {}) {
    const itemId = payload.item || payload.id;
    const count = Number(payload.count ?? 1);
    if (!itemId) return;
    forEachActiveStepOfType('collect', (qId, _entry, step) => {
      if (step.item === itemId) {
        advanceStepProgress(qId, count);
      }
    });
  }
  bus.on('quest:item', handleCollectEvent);
  bus.on('quest:collect', handleCollectEvent);

  // 5. `interact`: { target, count, uniqueId? } (also supports `light` if target === 'lamp')
  bus.on('quest:interact', (payload = {}) => {
    const target = payload.target || payload.id;
    const count = Number(payload.count ?? 1);
    if (target) {
      forEachActiveStepOfType('interact', (qId, entry, step) => {
        if (
          step.target === target ||
          (Array.isArray(step.target) && step.target.includes(target))
        ) {
          const dedupeKey =
            payload.uniqueId ||
            (Array.isArray(step.target) && step.target.length > 1 && target !== step.target[0]
              ? target
              : null);
          if (dedupeKey) {
            if (!Array.isArray(entry.interactedTargets)) {
              entry.interactedTargets = [];
            }
            if (entry.interactedTargets.includes(dedupeKey)) {
              return;
            }
            entry.interactedTargets.push(dedupeKey);
          }
          advanceStepProgress(qId, count);
        }
      });
    }
    if (payload.type === 'lamp' || target === 'lamp') {
      forEachActiveStepOfType('light', (qId, _entry, step) => {
        if (step.map && step.map !== state.zone) return;
        advanceStepProgress(qId, count);
      });
    }
  });

  // 6. `kora` & 7. `light` via `merit` (and direct `kora:lap` / `lamp:lit` aliases)
  bus.on('merit', (payload = {}) => {
    if (payload.source === 'sharedKoraCommunion' || payload.type === 'koraCommunion') return;
    const kind = payload.type || payload.source;
    if (kind === 'kora' && payload.source !== 'sharedKoraCommunion') {
      forEachActiveStepOfType('kora', (qId) => {
        advanceStepProgress(qId, 1);
      });
    } else if (kind === 'lamp') {
      forEachActiveStepOfType('light', (qId, _entry, step) => {
        if (step.map && step.map !== state.zone) return;
        advanceStepProgress(qId, 1);
      });
    }
  });
  bus.on('kora:lap', () => {
    forEachActiveStepOfType('kora', (qId) => {
      advanceStepProgress(qId, 1);
    });
  });
  bus.on('lamp:lit', () => {
    forEachActiveStepOfType('light', (qId, _entry, step) => {
      if (step.map && step.map !== state.zone) return;
      advanceStepProgress(qId, 1);
    });
  });

  // 8. `boss`: { bossId }
  bus.on('boss:subdued', (payload = {}) => {
    const bossId = payload.id || payload.bossId;
    forEachActiveStepOfType('boss', (qId, _entry, step) => {
      if (!step.bossId || step.bossId === bossId) {
        advanceStepProgress(qId, 1);
      }
    });
  });

  // 9. `event`: { name, count, match? }
  function handleCustomEventStep(eventName, payload) {
    forEachActiveStepOfType('event', (qId, entry, step) => {
      if ((step.name || step.event) === eventName && matchEventPayload(payload, step.match)) {
        if (typeof payload?.altarIndex === 'number' && payload.altarIndex >= 0) {
          if (!Array.isArray(entry.interactedTargets)) entry.interactedTargets = [];
          const altarKey = `mangyul-tenma-altar-${payload.altarIndex}`;
          if (!entry.interactedTargets.includes(altarKey)) {
            entry.interactedTargets.push(altarKey);
          }
        }
        const inc = Math.max(1, Number(payload?.increment || payload?.count || 1));
        advanceStepProgress(qId, inc);
      }
    });
  }

  // Reset on `merit:reset`
  bus.on('merit:reset', () => {
    reset();
    if (state.mode === 'play') {
      checkAutoStartQuests();
    }
  });

  // Auto-start initial quest (e.g. prologue.vow) when entering gameplay on a fresh save
  bus.on('game:start', () => {
    checkAutoStartQuests();
  });

  // Trigger Pure Vision Intro Card & chapter opening quest on first arrival in a chapter map
  bus.on('zone:change', ({ to }) => {
    const mapDef = ctx.world?.getMap?.(to);
    const intro = mapDef?.chapterIntro;
    const startQuestDone = Boolean(intro?.startQuest && isDone(intro.startQuest));
    if (intro?.startQuest && !isActive(intro.startQuest) && !startQuestDone) {
      start(intro.startQuest);
    }
    checkAutoStartQuests();
    if (intro && intro.flag && !hasFlag(intro.flag)) {
      if (startQuestDone) {
        setFlag(intro.flag, true);
      } else {
        bus.emit('chapter:intro', intro);
      }
    }
  });

  // ---------------------------------------------------------------- Skip-To Chapter Helper (`__stupa.quests.skipTo`)
  function grantSkipGear(targetLevel) {
    // Ensure the bag has plenty of free slots (cleans up any prior skipTo clutter)
    ctx.inventory?.ensureFreeSlots?.(15, targetLevel);

    const slots = ['mainhand', 'offhand', 'head', 'body', 'hands', 'feet', 'neck', 'ring'];
    const currentEquipped = ctx.inventory?.getEquipped?.() || {};
    const addFn = ctx.inventory?.addItem || ctx.inventory?.add;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const existing = currentEquipped[slot];
      if (existing && (existing.rarity === 'terma' || (existing.ilvl || 1) >= targetLevel)) {
        continue;
      }
      const rarity = i % 2 === 0 ? 'rare' : 'blessed';
      const item = ctx.loot?.generate?.({
        ilvl: targetLevel,
        slot,
        rarity,
      });
      if (!item) continue;
      if (ctx.inventory?.equipDirect) {
        ctx.inventory.equipDirect(item);
      } else if (addFn) {
        addFn.call(ctx.inventory, item);
      }
    }
    ctx.inventory?.equipBest?.();
  }

  function markQuestDoneSilent(qId) {
    delete questData.active[qId];
    if (!questData.done.includes(qId)) {
      questData.done.push(qId);
    }
  }

  function skipTo(chapterId = 'ch1') {
    const norm = String(chapterId || 'ch1').toLowerCase().trim();
    const order = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
    const targetIdx = order.indexOf(norm);
    if (targetIdx === -1) return false;

    if (state.mode !== 'play') {
      if (typeof document !== 'undefined') {
        document.getElementById('btn-begin')?.click();
      }
      state.mode = 'play';
      bus.emit('game:start');
    }

    // 1. Complete Prologue prerequisites
    markQuestDoneSilent('prologue.vow');
    markQuestDoneSilent('prologue.north');
    const prologueFlags = [
      'prologue.vow.done',
      'prologue.north.done',
      'prologue.done',
      'chapter1.unlocked',
    ];
    for (const f of prologueFlags) {
      questData.flags[f] = true;
    }
    const prologueCodex = [
      'boudhanath',
      'kora',
      'prostration',
      'butterLamp',
      'prayerWheel',
      'maniStone',
      'omManiPadmeHum',
      'padmasambhava',
      'jarungKhashor',
      'liberation',
    ];
    for (const cId of prologueCodex) {
      ctx.codex?.unlock?.(cId, { silent: true });
    }
    ctx.waypoints?.unlock?.('stupa', { silent: true });
    ctx.waypoints?.unlock?.('wild', { silent: true });
    ctx.waypoints?.unlock?.('pharping', { silent: true });

    // 2. If skipping to ch2+, complete Chapter 1
    if (targetIdx >= 1) {
      ['ch1.drought', 'ch1.lamps', 'ch1.scrolls', 'ch1.kilaya'].forEach(markQuestDoneSilent);
      [
        'ch1.introSeen',
        'ch1.springs.cleared',
        'ch1.lamps.lit',
        'ch1.scrolls.done',
        'ch1.rain',
        'ch1.done',
        'ch2.unlocked',
        'skill.phurba',
      ].forEach((f) => {
        questData.flags[f] = true;
      });
      ['pharping', 'yangleshoCave', 'asuraCave', 'vajrakilaya', 'phurba', 'droughtLegend'].forEach(
        (cId) => ctx.codex?.unlock?.(cId, { silent: true })
      );
      ctx.skills?.unlock?.('phurba');
      ctx.waypoints?.unlock?.('mangyul', { silent: true });
    }

    // 3. If skipping to ch3+, complete Chapter 2
    if (targetIdx >= 2) {
      ['ch2.envoy', 'ch2.tenma', 'ch2.storm', 'ch2.tibet'].forEach(markQuestDoneSilent);
      [
        'ch2.introSeen',
        'ch2.envoy.done',
        'ch2.tenma.done',
        'ch2.storm.done',
        'ch2.done',
        'ch3.unlocked',
        'skill.vajraBell',
        'protector.tenma',
      ].forEach((f) => {
        questData.flags[f] = true;
      });
      ['trisongDetsen', 'shantarakshita', 'mangyul', 'twelveTenma', 'windhorse', 'latse'].forEach(
        (cId) => ctx.codex?.unlock?.(cId, { silent: true })
      );
      ctx.skills?.unlock?.('vajraBell');
      ctx.protectors?.unlock?.('tenma');
      ctx.allies?.unlock?.('tenma');
      ctx.waypoints?.unlock?.('yarlung', { silent: true });
    }

    // 4. If skipping to ch4+, complete Chapter 3
    if (targetIdx >= 3) {
      ['ch3.valley', 'ch3.sheldrak', 'ch3.yaks', 'ch3.shampo'].forEach(markQuestDoneSilent);
      [
        'ch3.introSeen',
        'ch3.valley.done',
        'ch3.sheldrak.done',
        'ch3.yaks.done',
        'ch3.done',
        'ch4.unlocked',
        'skill.lotusShield',
        'protector.whiteYak',
      ].forEach((f) => {
        questData.flags[f] = true;
      });
      [
        'yarlungValley',
        'yumbulagang',
        'sheldrak',
        'yarlhaShampo',
        'nyen',
        'eightClasses',
      ].forEach((cId) => ctx.codex?.unlock?.(cId, { silent: true }));
      ctx.skills?.unlock?.('lotusShield');
      ctx.protectors?.unlock?.('whiteYak');
      ctx.allies?.unlock?.('whiteYak');
      ctx.waypoints?.unlock?.('samye', { silent: true });
    }

    // 5. If skipping to ch5, complete Chapter 4
    if (targetIdx >= 4) {
      ['ch4.foundation', 'ch4.dayNight', 'ch4.hepori', 'ch4.pehar', 'ch4.samye'].forEach(markQuestDoneSilent);
      [
        'ch4.introSeen',
        'ch4.foundation.done',
        'ch4.dayNight.done',
        'ch4.hepori.done',
        'ch4.pehar.done',
        'ch4.samye.done',
        'ch4.done',
        'ch5.unlocked',
        'skill.vajraGuru',
        'protector.pehar',
      ].forEach((f) => {
        questData.flags[f] = true;
      });
      [
        'samye',
        'samyeMandala',
        'hepori',
        'pehar',
        'samyeName',
        'sevenTestedMen',
        'shantarakshita',
        'trisongDetsen',
      ].forEach((cId) => ctx.codex?.unlock?.(cId, { silent: true }));
      ctx.skills?.unlock?.('vajraGuru');
      ctx.protectors?.unlock?.('pehar');
      ctx.allies?.unlock?.('pehar');
      ctx.waypoints?.unlock?.('chimphu', { silent: true });
      ctx.waypoints?.unlock?.('chimpu', { silent: true });
    }

    persist();

    // Emit flag updates so skills/allies/world react immediately
    for (const f of Object.keys(questData.flags)) {
      bus.emit('flag:set', { flag: f, value: true });
    }

    const levelMap = { ch1: 5, ch2: 10, ch3: 16, ch4: 23, ch5: 30 };
    const minLevel = levelMap[norm] || 5;
    const curLevel = state.player?.level || ctx.vitals?.state?.level || state.vitals?.level || 1;
    if (curLevel < minLevel) {
      if (ctx.vitals?.set) {
        ctx.vitals.set({ level: minLevel });
      } else {
        ctx.vitals?.setLevel?.(minLevel);
      }
    }
    grantSkipGear(Math.max(curLevel, minLevel));

    // Start first quest of target chapter if registered
    const firstQuestMap = {
      ch1: 'ch1.drought',
      ch2: 'ch2.envoy',
      ch3: 'ch3.valley',
      ch4: 'ch4.foundation',
      ch5: 'ch5.tsogyal',
    };
    const qToStart = firstQuestMap[norm];
    if (qToStart && registry.has(qToStart) && !isActive(qToStart) && !isDone(qToStart)) {
      start(qToStart);
    } else {
      checkAutoStartQuests();
    }

    // Clear target chapter's introSeen flag so skipping to a chapter always unfolds its Mural Scroll
    delete questData.flags[`${norm}.introSeen`];

    // Teleport to target chapter map if it exists in MAPS
    const mapTarget = {
      ch1: 'pharping',
      ch2: 'mangyul',
      ch3: 'yarlung',
      ch4: 'samye',
      ch5: 'chimphu',
    }[norm];
    if (mapTarget && ctx.world?.getMap?.(mapTarget)?.id === mapTarget) {
      ctx.zones?.teleport?.(mapTarget, { spawn: 'waypoint' });
    }

    bus.emit('quest:progress', { id: qToStart || norm, step: 0, progress: 0 });
    return {
      chapter: norm,
      level: ctx.vitals?.state?.level || minLevel,
      active: Object.keys(questData.active),
      done: [...questData.done],
    };
  }

  // ---------------------------------------------------------------- NPC Overhead Marker & Tracked Targets
  function getNpcMarker(npcId, npcDef) {
    if (!npcId) return null;

    // Priority 1: Active `talk` step targeting this NPC -> '?' (golden ready-to-talk/turn-in)
    for (const [qId, entry] of Object.entries(questData.active)) {
      const def = registry.get(qId);
      const step = def?.steps?.[entry.step];
      if (step && step.type === 'talk' && step.npc === npcId) {
        return '?';
      }
    }

    // Priority 2: Available quest to start from this NPC -> '!' (golden available)
    for (const def of registry.values()) {
      if (def.giverNpc === npcId && canStartQuest(def)) {
        return '!';
      }
    }
    if (Array.isArray(npcDef?.quests)) {
      for (const qId of npcDef.quests) {
        const def = registry.get(qId);
        if (def && canStartQuest(def)) {
          return '!';
        }
      }
    }

    // Priority 3: Active in-progress quest from this NPC -> '?' (silver in-progress)
    for (const [qId, entry] of Object.entries(questData.active)) {
      const def = registry.get(qId);
      if (!def) continue;
      if (def.giverNpc === npcId || (Array.isArray(npcDef?.quests) && npcDef.quests.includes(qId))) {
        return '?';
      }
    }

    return null;
  }

  function getNpcMarkerColor(npcId, npcDef) {
    if (!npcId) return null;
    for (const [qId, entry] of Object.entries(questData.active)) {
      const def = registry.get(qId);
      const step = def?.steps?.[entry.step];
      if (step && step.type === 'talk' && step.npc === npcId) {
        return 'gold';
      }
    }
    for (const def of registry.values()) {
      if (def.giverNpc === npcId && canStartQuest(def)) {
        return 'gold';
      }
    }
    if (Array.isArray(npcDef?.quests)) {
      for (const qId of npcDef.quests) {
        const def = registry.get(qId);
        if (def && canStartQuest(def)) {
          return 'gold';
        }
      }
    }
    for (const [qId] of Object.entries(questData.active)) {
      const def = registry.get(qId);
      if (!def) continue;
      if (def.giverNpc === npcId || (Array.isArray(npcDef?.quests) && npcDef.quests.includes(qId))) {
        return 'silver';
      }
    }
    return null;
  }

  const PHARPING_SPRING_COORDS = {
    spring1: { x: 1945, z: 10 },
    spring2: { x: 2040, z: 30 },
    spring3: { x: 2010, z: -20 },
  };

  const PHARPING_LAMP_COORDS = [
    { id: 'pharping-lamp-1', x: 2012, z: -42 },
    { id: 'pharping-lamp-2', x: 2028, z: -42 },
    { id: 'pharping-lamp-3', x: 2010, z: -50 },
    { id: 'pharping-lamp-4', x: 2030, z: -50 },
    { id: 'pharping-lamp-5', x: 2014, z: -58 },
    { id: 'pharping-lamp-6', x: 2026, z: -58 },
    { id: 'pharping-lamp-7', x: 2020, z: -61 },
  ];

  const TENMA_ALTAR_COORDS = [
    { index: 0, id: 'mangyul-tenma-altar-0', x: 2988, z: 34 },
    { index: 1, id: 'mangyul-tenma-altar-1', x: 3016, z: 26 },
    { index: 2, id: 'mangyul-tenma-altar-2', x: 2982, z: 18 },
    { index: 3, id: 'mangyul-tenma-altar-3', x: 3020, z: 10 },
    { index: 4, id: 'mangyul-tenma-altar-4', x: 2980, z: 2 },
    { index: 5, id: 'mangyul-tenma-altar-5', x: 3018, z: -6 },
    { index: 6, id: 'mangyul-tenma-altar-6', x: 2982, z: -14 },
    { index: 7, id: 'mangyul-tenma-altar-7', x: 3020, z: -22 },
    { index: 8, id: 'mangyul-tenma-altar-8', x: 2984, z: -30 },
    { index: 9, id: 'mangyul-tenma-altar-9', x: 3018, z: -36 },
    { index: 10, id: 'mangyul-tenma-altar-10', x: 2982, z: -44 },
    { index: 11, id: 'mangyul-tenma-altar-11', x: 3018, z: -46 },
  ];

  const SHELDRAK_PILLAR_COORDS = [
    { x: 4052, z: -56 },
    { x: 4068, z: -56 },
    { x: 4060, z: -46 },
  ];

  function getActiveEnemiesList() {
    return (
      ctx.enemies?.getActiveEnemies?.() ||
      ctx.enemies?.getActive?.() ||
      ctx.enemies?.list?.() ||
      []
    );
  }

  function pickNearestPoint(points, px, pz) {
    let best = null;
    let bestDist = Infinity;
    for (const pt of points) {
      if (!pt || typeof pt.x !== 'number' || typeof pt.z !== 'number') continue;
      const d = Math.hypot(pt.x - px, pt.z - pz);
      if (d < bestDist) {
        bestDist = d;
        best = pt;
      }
    }
    return best;
  }

  function resolveStepWorldCoords(questDef, step, activeEntry = null) {
    if (!step) return null;
    const currentZone = state.zone || 'stupa';
    const px = state.player?.position?.x ?? 0;
    const pz = state.player?.position?.z ?? 0;

    let map = step.map || questDef?.map || currentZone;
    let x = step.x;
    let z = step.z;
    let koraRing = null;

    if (step.type === 'talk' && step.npc) {
      const liveNpc =
        ctx.npcs?.list?.()?.find?.((n) => n.id === step.npc) ||
        ctx.npcs?.getNpc?.(step.npc);
      if (liveNpc) {
        map = liveNpc.map || map;
        x = liveNpc.x;
        z = liveNpc.z;
      }
    } else if (step.type === 'kora') {
      const cx = map === 'samye' ? 5000 : 0;
      const cz = 0;
      const radius = map === 'samye' ? 50 : 22.5;
      const inSameZone = currentZone === map;
      const dx = inSameZone ? px - cx : 0;
      const dz = inSameZone ? pz - cz : radius;
      const playerAngle = Math.hypot(dx, dz) > 0.5 ? Math.atan2(dz, dx) : Math.PI / 2;
      // Clockwise kora in top-down (x, z) increases angle theta (+60 deg lead ahead)
      const leadAngle = playerAngle + Math.PI / 3;
      x = cx + Math.cos(leadAngle) * radius;
      z = cz + Math.sin(leadAngle) * radius;
      koraRing = { cx, cz, radius, playerAngle };
    } else if (step.type === 'light') {
      const candidates = [];
      for (const it of ctx.interactables || []) {
        if (!it || (it.zone || 'stupa') !== map) continue;
        if (it.kind !== 'lamp') continue;
        if (currentZone === map && !state.uiOpen && typeof it.isAvailable === 'function' && !it.isAvailable()) {
          continue;
        }
        const pos = it.getPosition?.();
        if (pos && typeof pos.x === 'number' && typeof pos.z === 'number') {
          candidates.push({ x: pos.x, z: pos.z });
        }
      }
      if (candidates.length === 0 && map === 'stupa') {
        const stations = CONFIG.LAMPS?.stations || [
          { angleDeg: 45, radius: 22.5 },
          { angleDeg: 165, radius: 22.5 },
          { angleDeg: 285, radius: 22.5 },
        ];
        for (const st of stations) {
          const rad = (st.angleDeg * Math.PI) / 180;
          candidates.push({
            x: Math.cos(rad) * st.radius,
            z: Math.sin(rad) * st.radius,
          });
        }
      }
      const nearest = pickNearestPoint(candidates, px, pz);
      if (nearest) {
        x = nearest.x;
        z = nearest.z;
      }
    } else if (step.type === 'interact') {
      const interacted = Array.isArray(activeEntry?.interactedTargets)
        ? activeEntry.interactedTargets
        : [];
      const targetSpecs = Array.isArray(step.target)
        ? step.target
        : Array.isArray(step.targets)
          ? step.targets
          : step.target
            ? [step.target]
            : [];

      const candidates = [];
      for (const it of ctx.interactables || []) {
        if (!it || (it.zone || 'stupa') !== map) continue;
        const matchesSpec = targetSpecs.some(
          (spec) =>
            it.id === spec ||
            it.kind === spec ||
            it.target === spec ||
            it.id === `pharping-${spec}`,
        );
        if (!matchesSpec) continue;
        const alreadyDone = interacted.some(
          (doneId) =>
            it.id === doneId ||
            it.target === doneId ||
            it.id === `pharping-${doneId}`,
        );
        if (alreadyDone) continue;
        if (currentZone === map && !state.uiOpen && typeof it.isAvailable === 'function' && !it.isAvailable()) {
          continue;
        }
        const pos = it.getPosition?.();
        if (pos && typeof pos.x === 'number' && typeof pos.z === 'number') {
          candidates.push({ x: pos.x, z: pos.z });
        }
      }

      if (candidates.length === 0) {
        for (const spec of targetSpecs) {
          if (interacted.includes(spec) || interacted.includes(`pharping-${spec}`)) continue;
          if (PHARPING_SPRING_COORDS[spec]) {
            candidates.push(PHARPING_SPRING_COORDS[spec]);
          } else if (spec === 'yangleshoLamp') {
            for (const lamp of PHARPING_LAMP_COORDS) {
              if (!interacted.includes(lamp.id)) {
                candidates.push(lamp);
              }
            }
          }
        }
      }

      const nearest = pickNearestPoint(candidates, px, pz);
      if (nearest) {
        x = nearest.x;
        z = nearest.z;
      }
    } else if (step.type === 'liberate') {
      const candidates = [];
      for (const e of getActiveEnemiesList()) {
        if (!e || e.dead || e.state === 'dead' || (typeof e.hp === 'number' && e.hp <= 0)) continue;
        if (e.zone && e.zone !== map) continue;
        if (step.kind && e.kind !== step.kind) continue;
        if (!step.kind && step.tag === 'calmed' && e.kind && e.kind !== 'wildYak') continue;
        if (step.rank && e.rank !== step.rank) continue;
        const epos = e.position || e.pos || e.group?.position || e.root?.position;
        if (epos && typeof epos.x === 'number' && typeof epos.z === 'number') {
          candidates.push({ x: epos.x, z: epos.z });
        }
      }
      if (candidates.length === 0 && questDef?.id === 'ch1.drought' && step.id === 'liberate_sprites') {
        for (const [spKey, spCoord] of Object.entries(PHARPING_SPRING_COORDS)) {
          const springIt = (ctx.interactables || []).find((it) => it.id === `pharping-${spKey}`);
          if (!springIt || (currentZone === 'pharping' && !state.uiOpen ? springIt.isAvailable?.() !== false : true)) {
            candidates.push(spCoord);
          }
        }
      }
      const nearest = pickNearestPoint(candidates, px, pz);
      if (nearest) {
        x = nearest.x;
        z = nearest.z;
      }
    } else if (step.type === 'collect') {
      if (step.item === 'termaScrollShard') {
        const shState = ctx.sheldrak?.getState?.();
        if (shState && !shState.solved && Array.isArray(shState.steps) && Array.isArray(shState.targetSteps)) {
          const pillarCandidates = [];
          for (let i = 0; i < shState.steps.length; i++) {
            if (shState.steps[i] !== shState.targetSteps[i] && SHELDRAK_PILLAR_COORDS[i]) {
              pillarCandidates.push(SHELDRAK_PILLAR_COORDS[i]);
            }
          }
          const nearestPillar = pickNearestPoint(pillarCandidates, px, pz);
          if (nearestPillar) {
            x = nearestPillar.x;
            z = nearestPillar.z;
          }
        }
      }
      if (Array.isArray(step.spots)) {
        const uncollected = collectibleNodes.filter(
          (n) => n.questId === questDef.id && n.item === step.item && !n.collected,
        );
        const nearestNode = pickNearestPoint(uncollected, px, pz);
        if (nearestNode) {
          map = nearestNode.map || map;
          x = nearestNode.x;
          z = nearestNode.z;
        } else if (step.spots[0] && (typeof x !== 'number' || typeof z !== 'number')) {
          x = step.spots[0].x;
          z = step.spots[0].z;
        }
      }
    } else if (step.type === 'boss') {
      const targetBossId = step.bossId || step.boss;
      for (const e of getActiveEnemiesList()) {
        if (!e || e.dead || e.state === 'dead' || (typeof e.hp === 'number' && e.hp <= 0)) continue;
        if (e.zone && e.zone !== map) continue;
        if (targetBossId && e.bossId !== targetBossId && e.kind !== targetBossId) continue;
        const epos = e.position || e.pos || e.group?.position || e.root?.position;
        if (epos && typeof epos.x === 'number' && typeof epos.z === 'number') {
          x = epos.x;
          z = epos.z;
          break;
        }
      }
    } else if (step.type === 'event') {
      const evName = step.name || step.event;
      const interacted = Array.isArray(activeEntry?.interactedTargets)
        ? activeEntry.interactedTargets
        : [];

      if (evName === 'escort:arrived') {
        const messengerNpc =
          ctx.npcs?.list?.()?.find?.((n) => n.id === 'messenger') ||
          ctx.npcs?.getNpc?.('messenger');
        if (messengerNpc && typeof messengerNpc.x === 'number' && typeof messengerNpc.z === 'number') {
          map = messengerNpc.map || map;
          x = messengerNpc.x;
          z = messengerNpc.z;
        }
      } else if (evName === 'tenma:oath') {
        map = 'mangyul';
        const candidates = [];
        for (const it of ctx.interactables || []) {
          if (!it || it.kind !== 'tenmaAltar') continue;
          if (interacted.includes(it.id)) continue;
          if (currentZone === 'mangyul' && !state.uiOpen && typeof it.isAvailable === 'function' && !it.isAvailable()) {
            continue;
          }
          const pos = it.getPosition?.();
          if (pos && typeof pos.x === 'number' && typeof pos.z === 'number') {
            candidates.push({ x: pos.x, z: pos.z });
          }
        }
        if (candidates.length === 0) {
          for (const altar of TENMA_ALTAR_COORDS) {
            if (!interacted.includes(altar.id) && !hasFlag(`tenma.altar.${altar.index}`)) {
              candidates.push(altar);
            }
          }
        }
        const nearest = pickNearestPoint(candidates, px, pz);
        if (nearest) {
          x = nearest.x;
          z = nearest.z;
        }
      } else if (evName === 'samye:nightSurvived') {
        map = 'samye';
        const samyeSt = ctx.samye?.getState?.();
        if (samyeSt) {
          if (samyeSt.phase === 'night') {
            const enemyPts = [];
            for (const e of getActiveEnemiesList()) {
              if (!e || e.dead || e.state === 'dead' || (typeof e.hp === 'number' && e.hp <= 0)) continue;
              if (e.zone && e.zone !== 'samye') continue;
              const epos = e.position || e.pos || e.group?.position || e.root?.position;
              if (epos && typeof epos.x === 'number' && typeof epos.z === 'number') {
                enemyPts.push({ x: epos.x, z: epos.z });
              }
            }
            const nearestEnemy = pickNearestPoint(enemyPts, px, pz);
            x = nearestEnemy ? nearestEnemy.x : 5000;
            z = nearestEnemy ? nearestEnemy.z : 0;
          } else {
            const carriedTotal = (samyeSt.carriedStone || 0) + (samyeSt.carriedTimber || 0);
            const needStone = Math.max(0, (samyeSt.stoneQuota || 3) - (samyeSt.stoneDelivered || 0));
            const needTimber = Math.max(0, (samyeSt.timberQuota || 3) - (samyeSt.timberDelivered || 0));
            const canFinishQuota =
              (samyeSt.carriedStone || 0) >= needStone &&
              (samyeSt.carriedTimber || 0) >= needTimber &&
              carriedTotal > 0;
            if (carriedTotal >= (samyeSt.carryCapacity || 5) || canFinishQuota) {
              x = 4966.5;
              z = 52.5;
            } else if ((samyeSt.carriedStone || 0) < needStone) {
              const nearestQuarry = pickNearestPoint(
                [
                  { x: 4940, z: 70 },
                  { x: 5050, z: 75 },
                ],
                px,
                pz,
              );
              x = nearestQuarry.x;
              z = nearestQuarry.z;
            } else {
              x = 5010;
              z = 88;
            }
          }
        }
      } else if (evName === 'hepori:cleared') {
        map = 'samye';
        const heporiEnemies = [];
        for (const e of getActiveEnemiesList()) {
          if (!e || e.dead || e.state === 'dead' || (typeof e.hp === 'number' && e.hp <= 0)) continue;
          if (e.zone && e.zone !== 'samye') continue;
          const epos = e.position || e.pos || e.group?.position || e.root?.position;
          if (epos && epos.x > 5035) {
            heporiEnemies.push({ x: epos.x, z: epos.z });
          }
        }
        const nearest = pickNearestPoint(heporiEnemies, px, pz);
        if (nearest) {
          x = nearest.x;
          z = nearest.z;
        }
      } else if (evName === 'terma:cleared' && currentZone === 'terma' && state.dungeon) {
        map = 'terma';
        const dState = state.dungeon;
        const floorEnemies = [];
        if (dState.floor < 3 && !dState.gateUnlocked) {
          for (const e of getActiveEnemiesList()) {
            if (!e || e.dead || e.state === 'dead' || (typeof e.hp === 'number' && e.hp <= 0)) continue;
            if (e.zone && e.zone !== 'terma') continue;
            const epos = e.position || e.pos || e.group?.position || e.root?.position;
            if (epos && typeof epos.x === 'number' && typeof epos.z === 'number') {
              floorEnemies.push({ x: epos.x, z: epos.z });
            }
          }
        }
        const nearestEnemy = pickNearestPoint(floorEnemies, px, pz);
        if (nearestEnemy) {
          x = nearestEnemy.x;
          z = nearestEnemy.z;
        } else if (dState.exitRoomWorld) {
          x = dState.exitRoomWorld.x;
          z = dState.exitRoomWorld.z;
        }
      }
    }

    if (typeof x !== 'number' || typeof z !== 'number') return null;
    const y = ctx.world?.getHeight(x, z, map) ?? 0;
    return { x, y, z, map, koraRing };
  }

  function resolveCrossMapTransit(coords, currentZone) {
    if (!coords || !currentZone || coords.map === currentZone) return coords;
    const px = state.player?.position?.x ?? 0;
    const pz = state.player?.position?.z ?? 0;
    const curMapDef = MAPS[currentZone] || ctx.world?.getMap?.(currentZone);

    if (currentZone === 'terma') {
      const ex = state.dungeon?.exitRoomWorld || { x: 0, z: 0 };
      const tx = ex.x;
      const tz = ex.z - 4.2;
      return {
        x: tx,
        y: ctx.world?.getHeight(tx, tz, 'terma') ?? 0,
        z: tz,
        map: 'terma',
        destMap: coords.map,
        viaTransit: true,
      };
    }

    if (currentZone === 'stupa') {
      const retPortal = ctx.waypoints?.getReturnPortal?.();
      if (retPortal && retPortal.returnMap === coords.map) {
        return {
          x: retPortal.portalX,
          y: ctx.world?.getHeight(retPortal.portalX, retPortal.portalZ, 'stupa') ?? 0,
          z: retPortal.portalZ,
          map: 'stupa',
          destMap: coords.map,
          viaTransit: true,
        };
      }
      const directGate = (curMapDef?.gates || []).find(
        (g) => (g.to || g.toMap) === coords.map,
      );
      if (directGate) {
        return {
          x: directGate.x,
          y: ctx.world?.getHeight(directGate.x, directGate.z, 'stupa') ?? 0,
          z: directGate.z,
          map: 'stupa',
          destMap: coords.map,
          viaTransit: true,
        };
      }
      const wp = resolveWaypointCoords(curMapDef) || { x: 10, z: -26 };
      return {
        x: wp.x,
        y: ctx.world?.getHeight(wp.x, wp.z, 'stupa') ?? 0,
        z: wp.z,
        map: 'stupa',
        destMap: coords.map,
        viaTransit: true,
      };
    }

    const candidates = [];
    for (const g of curMapDef?.gates || []) {
      if ((g.to || g.toMap) === coords.map) {
        candidates.push({ x: g.x, z: g.z });
      }
    }
    const wp = resolveWaypointCoords(curMapDef);
    if (wp && (candidates.length === 0 || ctx.waypoints?.isUnlocked?.(currentZone))) {
      candidates.push({ x: wp.x, z: wp.z });
    }
    if (candidates.length === 0 && curMapDef?.gates?.[0]) {
      candidates.push({ x: curMapDef.gates[0].x, z: curMapDef.gates[0].z });
    }
    const best = pickNearestPoint(candidates, px, pz);
    if (!best) return coords;
    return {
      x: best.x,
      y: ctx.world?.getHeight(best.x, best.z, currentZone) ?? 0,
      z: best.z,
      map: currentZone,
      destMap: coords.map,
      viaTransit: true,
    };
  }

  function getTrackedTargets(mapFilter) {
    const targets = [];
    const currentZone = state.zone || 'stupa';
    for (const [qId, entry] of Object.entries(questData.active)) {
      if (entry.tracked === false) continue;
      const def = registry.get(qId);
      if (!def) continue;
      const step = def.steps?.[entry.step];
      if (!step) continue;

      let coords = resolveStepWorldCoords(def, step, entry);
      if (!coords) continue;

      if (coords.map !== currentZone && (!mapFilter || mapFilter === currentZone)) {
        coords = resolveCrossMapTransit(coords, currentZone);
      }

      if (!mapFilter || coords.map === mapFilter) {
        targets.push({
          questId: qId,
          stepId: step.id,
          type: step.type,
          x: coords.x,
          y: coords.y,
          z: coords.z,
          map: coords.map,
          destMap: coords.destMap || coords.map,
          viaTransit: Boolean(coords.viaTransit),
          koraRing: coords.koraRing || null,
          labelKey: step.textKey || def.titleKey,
        });
      }
      if (targets.length >= 3) break;
    }
    return targets;
  }

  function getActiveQuestsDetailed() {
    const list = [];
    for (const [qId, entry] of Object.entries(questData.active)) {
      const def = registry.get(qId);
      if (!def) continue;
      const step = def.steps?.[entry.step] || null;
      const goal = getStepGoal(step);
      list.push({
        id: qId,
        def,
        stepIndex: entry.step,
        step,
        progress: entry.progress || 0,
        goal,
        tracked: entry.tracked !== false,
      });
    }
    return list;
  }

  function getCompletedQuestsDetailed() {
    return questData.done
      .map((qId) => registry.get(qId))
      .filter(Boolean);
  }

  // ---------------------------------------------------------------- Frame Update (`reach`, collectibles, 3D marker)
  function update(dt) {
    const t = state.elapsed || 0;
    const px = state.player?.position?.x ?? 0;
    const pz = state.player?.position?.z ?? 0;
    const currentZone = state.zone || 'stupa';

    // 2. Check `reach` steps
    if (state.mode === 'play') {
      forEachActiveStepOfType('reach', (qId, _entry, step) => {
        if (step.map && step.map !== currentZone) return;
        const radius = step.r ?? 3.5;
        const dist = Math.hypot(px - step.x, pz - step.z);
        if (dist <= radius) {
          advanceStepProgress(qId, 1);
        }
      });
    }

    // Animate & toggle collectible quest items (with proximity auto-pickup within 2.0m)
    for (let i = 0; i < collectibleNodes.length; i++) {
      const node = collectibleNodes[i];
      const shouldShow =
        !node.collected &&
        node.map === currentZone &&
        isCollectStepActiveForItem(node.item);
      node.group.visible = shouldShow;
      if (shouldShow) {
        if (state.mode === 'play' && !state.uiOpen) {
          const dist = Math.hypot(px - node.x, pz - node.z);
          if (dist <= 2.0) {
            collectQuestNode(node);
            continue;
          }
        }
        const groundY = ctx.world?.getHeight(node.x, node.z, node.map) ?? 0;
        node.group.position.y = groundY;
        node.core.position.y = 0.56 + Math.sin(t * 3.0 + i) * 0.10;
        node.core.rotation.y = t * 1.8 + i;
        node.ring.rotation.z = -t * 0.8;
      }
    }

    // Animate 3D World Target Diamond Marker & Ground Guidance Trail for the primary tracked quest in current map
    const targets = getTrackedTargets();
    const sameMapTarget = targets.find((tg) => tg.map === currentZone);
    if (sameMapTarget && state.mode === 'play') {
      worldMarkerGroup.visible = true;
      const baseY = ctx.world?.getHeight(sameMapTarget.x, sameMapTarget.z, currentZone) ?? sameMapTarget.y ?? 0;
      worldMarkerGroup.position.set(sameMapTarget.x, baseY, sameMapTarget.z);
      diamondMesh.position.y = 2.65 + Math.sin(t * 3.2) * 0.14;
      diamondMesh.rotation.y = t * 2.2;
      groundRingMesh.position.y = 0.04;
      groundRingMesh.rotation.z = t * 0.9;
      const s = 1.0 + Math.sin(t * 3.2) * 0.08;
      groundRingMesh.scale.set(s, s, 1);

      const dx = sameMapTarget.x - px;
      const dz = sameMapTarget.z - pz;
      const dist = Math.hypot(dx, dz);

      if (sameMapTarget.koraRing) {
        // Full clockwise circle of 24 golden lotus rings around the stupa/monastery (`繞塔一圈`)
        questTrailGroup.visible = true;
        const { cx, cz, radius } = sameMapTarget.koraRing;
        const pdx = px - cx;
        const pdz = pz - cz;
        const pAngle = Math.hypot(pdx, pdz) > 0.5 ? Math.atan2(pdz, pdx) : Math.PI / 2;
        for (let i = 0; i < TRAIL_NODE_COUNT; i++) {
          const frac = i / TRAIL_NODE_COUNT;
          const theta = pAngle + frac * Math.PI * 2;
          const nx = cx + Math.cos(theta) * radius;
          const nz = cz + Math.sin(theta) * radius;
          const ny = (ctx.world?.getHeight(nx, nz, currentZone) ?? 0) + 0.045;
          const node = trailNodes[i];
          node.mesh.visible = true;
          node.mesh.position.set(nx, ny, nz);
          const wave = Math.sin(t * 4.5 - i * 0.52) * 0.5 + 0.5;
          node.mat.opacity = 0.28 + wave * 0.62;
          const scale = 0.92 + wave * 0.36;
          node.mesh.scale.set(scale, scale, 1);
        }
      } else if (dist > 2.8) {
        questTrailGroup.visible = true;
        for (let i = DIRECT_TRAIL_COUNT; i < TRAIL_NODE_COUNT; i++) {
          trailNodes[i].mesh.visible = false;
        }

        // Check if straight segment in 'stupa' cuts through the central stupa collider (r < 20.5m)
        const uClosest = Math.max(0, Math.min(1, (-px * dx - pz * dz) / (dist * dist)));
        const closestDistToOrigin = Math.hypot(px + uClosest * dx, pz + uClosest * dz);
        const curveAroundStupa =
          currentZone === 'stupa' &&
          closestDistToOrigin < 20.5 &&
          Math.hypot(px, pz) > 12 &&
          Math.hypot(sameMapTarget.x, sameMapTarget.z) > 12;

        if (curveAroundStupa) {
          const theta0 = Math.atan2(pz, px);
          const theta1 = Math.atan2(sameMapTarget.z, sameMapTarget.x);
          let deltaTheta = Math.atan2(Math.sin(theta1 - theta0), Math.cos(theta1 - theta0));
          if (Math.abs(deltaTheta) > 2.8 && deltaTheta < 0) {
            deltaTheta += Math.PI * 2;
          }
          const r0 = Math.max(22.0, Math.hypot(px, pz));
          const r1 = Math.max(22.0, Math.hypot(sameMapTarget.x, sameMapTarget.z));
          const arcLen = Math.max(1.0, Math.abs(deltaTheta) * 22.5);
          const maxArcFrac = Math.min(1.0, 18.0 / arcLen);
          for (let i = 0; i < DIRECT_TRAIL_COUNT; i++) {
            const frac = (i + 0.5) / DIRECT_TRAIL_COUNT;
            const stepFrac = frac * maxArcFrac;
            const theta = theta0 + deltaTheta * stepFrac;
            const r = Math.max(22.0, r0 + (r1 - r0) * stepFrac);
            const nx = Math.cos(theta) * r;
            const nz = Math.sin(theta) * r;
            const ny = (ctx.world?.getHeight(nx, nz, currentZone) ?? 0) + 0.045;
            const node = trailNodes[i];
            node.mesh.visible = true;
            node.mesh.position.set(nx, ny, nz);
            const wave = Math.sin(t * 4.2 - i * 0.65) * 0.5 + 0.5;
            node.mat.opacity = (0.22 + wave * 0.58) * (1 - frac * 0.25);
            const scale = 0.85 + wave * 0.32;
            node.mesh.scale.set(scale, scale, 1);
          }
        } else {
          const dirX = dx / dist;
          const dirZ = dz / dist;
          const maxTrailDist = Math.min(dist - 1.1, 16.0);
          const startOffset = 1.4;
          for (let i = 0; i < DIRECT_TRAIL_COUNT; i++) {
            const frac = (i + 0.5) / DIRECT_TRAIL_COUNT;
            const d = startOffset + frac * Math.max(1.2, maxTrailDist - startOffset);
            const nx = px + dirX * d;
            const nz = pz + dirZ * d;
            const ny = (ctx.world?.getHeight(nx, nz, currentZone) ?? 0) + 0.045;
            const node = trailNodes[i];
            node.mesh.visible = true;
            node.mesh.position.set(nx, ny, nz);
            const wave = Math.sin(t * 4.2 - i * 0.65) * 0.5 + 0.5;
            node.mat.opacity = (0.22 + wave * 0.58) * (1 - frac * 0.25);
            const scale = 0.85 + wave * 0.32;
            node.mesh.scale.set(scale, scale, 1);
          }
        }
      } else {
        questTrailGroup.visible = false;
      }
    } else {
      worldMarkerGroup.visible = false;
      questTrailGroup.visible = false;
    }
  }

  const api = {
    update,
    register,
    start,
    complete,
    completeStep,
    reset,
    skipTo,
    setFlag,
    clearFlag,
    hasFlag,
    getFlag: hasFlag,
    isActive,
    isDone,
    isCompleted: isDone,
    isComplete: isDone,
    isAtStep,
    toggleTrack,
    getNpcMarker,
    getNpcMarkerColor,
    getTrackedTargets,
    getActiveQuestsDetailed,
    getCompletedQuestsDetailed,
    getQuestDef(id) {
      return registry.get(id) || null;
    },
    state() {
      return {
        active: JSON.parse(JSON.stringify(questData.active)),
        done: [...questData.done],
        flags: { ...questData.flags },
        trackedTargets: getTrackedTargets(),
      };
    },
  };

  ctx.quests = api;
  ctx.debug?.register('quests', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.quests = api;
  }

  return api;
}
