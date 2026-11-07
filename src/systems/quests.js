/**
 * Data-Driven Quest System (`src/systems/quests.js`).
 *
 * Manages quest definitions, 9 bus-driven step types (`talk`, `reach`, `liberate`,
 * `collect`, `interact`, `kora`, `light`, `boss`, `event`), reward distribution,
 * persistent save state (`quests` section via `ctx.save`), glowing collectible
 * quest props, 3D world diamond markers, and `getTrackedTargets()`.
 */
import * as THREE from 'three';
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

        ctx.interactables.push({
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
            if (node.collected) return;
            node.collected = true;
            node.group.visible = false;
            bus.emit('sfx', { name: 'pickup' });
            bus.emit('toast', {
              key: 'quest.toast.itemPicked',
              params: { name: { key: node.labelKey } },
            });
            bus.emit('quest:item', { item: node.item, count: 1, nodeId: node.id });
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
      if (def.autoStart && canStartQuest(def)) {
        start(def.id);
      }
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
    const kind = payload.type || payload.source;
    if (kind === 'kora') {
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
    forEachActiveStepOfType('event', (qId, _entry, step) => {
      if ((step.name || step.event) === eventName && matchEventPayload(payload, step.match)) {
        const inc = Math.max(1, Number(payload?.increment || payload?.count || 1));
        advanceStepProgress(qId, inc);
      }
    });
  }

  // Reset on `merit:reset`
  bus.on('merit:reset', () => {
    reset();
  });

  // Trigger Pure Vision Intro Card & chapter opening quest on first arrival in a chapter map
  bus.on('zone:change', ({ to }) => {
    const mapDef = ctx.world?.getMap?.(to);
    const intro = mapDef?.chapterIntro;
    if (intro?.startQuest && !isActive(intro.startQuest) && !isDone(intro.startQuest)) {
      start(intro.startQuest);
    }
    checkAutoStartQuests();
    if (intro && intro.flag && !hasFlag(intro.flag)) {
      bus.emit('chapter:intro', intro);
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

  function resolveStepWorldCoords(questDef, step) {
    if (!step) return null;
    let map = step.map || questDef.map || state.zone || 'stupa';
    let x = step.x;
    let z = step.z;

    if (step.type === 'talk' && step.npc) {
      const npcDef = ctx.npcs?.getNpc?.(step.npc);
      if (npcDef) {
        map = npcDef.map || map;
        x = npcDef.x;
        z = npcDef.z;
      }
    } else if (step.type === 'collect' && Array.isArray(step.spots)) {
      // Point to the first uncollected spot for this quest step
      const uncollected = collectibleNodes.find(
        (n) => n.questId === questDef.id && n.item === step.item && !n.collected
      );
      if (uncollected) {
        map = uncollected.map;
        x = uncollected.x;
        z = uncollected.z;
      } else if (step.spots[0]) {
        x = step.spots[0].x;
        z = step.spots[0].z;
      }
    }

    if (typeof x !== 'number' || typeof z !== 'number') return null;
    const y = ctx.world?.getHeight(x, z, map) ?? 0;
    return { x, y, z, map };
  }

  function getTrackedTargets(mapFilter) {
    const targets = [];
    for (const [qId, entry] of Object.entries(questData.active)) {
      if (entry.tracked === false) continue;
      const def = registry.get(qId);
      if (!def) continue;
      const step = def.steps?.[entry.step];
      if (!step) continue;

      const coords = resolveStepWorldCoords(def, step);
      if (coords && (!mapFilter || coords.map === mapFilter)) {
        targets.push({
          questId: qId,
          stepId: step.id,
          type: step.type,
          x: coords.x,
          y: coords.y,
          z: coords.z,
          map: coords.map,
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

    // Animate & toggle collectible quest items
    for (let i = 0; i < collectibleNodes.length; i++) {
      const node = collectibleNodes[i];
      const shouldShow =
        !node.collected &&
        node.map === currentZone &&
        isCollectStepActiveForItem(node.item);
      node.group.visible = shouldShow;
      if (shouldShow) {
        const groundY = ctx.world?.getHeight(node.x, node.z, node.map) ?? 0;
        node.group.position.y = groundY;
        node.core.position.y = 0.56 + Math.sin(t * 3.0 + i) * 0.10;
        node.core.rotation.y = t * 1.8 + i;
        node.ring.rotation.z = -t * 0.8;
      }
    }

    // Animate 3D World Target Diamond Marker for the primary tracked quest in current map
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
    } else {
      worldMarkerGroup.visible = false;
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
