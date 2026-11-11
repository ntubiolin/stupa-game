import { Group, Vector3 } from 'three';
import { isJapanMap } from '../data/japan.js';
import {
  JAPAN_AJIKAN_TRIAL,
  JAPAN_CAMPAIGN_CHAPTERS,
  JAPAN_CAMPAIGN_STEPS,
  JAPAN_WARD_TRIAL,
} from '../data/japanCampaign.js';
import { createCampaignMarker, createCampaignProp, createCampaignRing } from '../gameplay/japanCampaignModels.js';
import { createJapanCampaignTracker } from '../ui/japanCampaign.js';
import '../i18n/japanCampaign.js';

const SAVE_SECTION = 'japanCampaign';
const SAVE_VERSION = 1;
const DIALOGUE_ACCEPTED = 'japan:dialogueAccepted';
const STEP_INDEX = new Map(JAPAN_CAMPAIGN_STEPS.map((step, index) => [step.id, index]));
const CHAPTER_BY_MAP = new Map(JAPAN_CAMPAIGN_CHAPTERS.map(chapter => [chapter.mapId, chapter]));
const BRIDGE_APPROACH = JAPAN_CAMPAIGN_STEPS[STEP_INDEX.get('bridgeApproach')];
const BRIDGE_CHECKPOINTS = [6, 0, -6];

function readSavedProgress(save) {
  const stored = save.dump().sections?.[SAVE_SECTION];
  let count = 0;
  if (stored?.version === SAVE_VERSION && Array.isArray(stored.completedSteps)) {
    while (count < JAPAN_CAMPAIGN_STEPS.length && stored.completedSteps[count] === JAPAN_CAMPAIGN_STEPS[count].id) {
      count++;
    }
  }
  return { count, stored, readOnly: stored?.version > SAVE_VERSION };
}

function dialogueId(step) {
  return `japan.campaign.${step.id}`;
}

function interactableId(step) {
  return `japan-campaign-${step.id}`;
}

export function createJapanCampaign(ctx, { renderTracker } = {}) {
  const { state, bus, save, world, dialogue } = ctx;
  const render = renderTracker ?? (typeof document === 'undefined' ? () => {} : createJapanCampaignTracker(ctx));
  const scenes = new Map();
  const marker = createCampaignMarker();
  const trialRings = new Group();
  const wardDanger = createCampaignRing(0xff7666, JAPAN_WARD_TRIAL.dangerRadius, 0.2);
  const wardSafe = createCampaignRing(0xffdf8f, JAPAN_WARD_TRIAL.outerRadius, 0.13);
  const wardPulse = createCampaignRing(0xffbb73, 1, 0.08);
  wardPulse.visible = false;
  trialRings.visible = false;
  trialRings.add(wardDanger, wardSafe, wardPulse);
  let progress = readSavedProgress(save);
  let trial = null;
  let bridgeStage = 0;
  let bridgeNeedsApproach = true;
  let eastwardCast = 0;
  let dogGuide = null;
  let currentScene = null;

  function currentStep() {
    return JAPAN_CAMPAIGN_STEPS[progress.count] ?? null;
  }

  function distanceFrom(position) {
    return Math.hypot(state.player.position.x - position.x, state.player.position.z - position.z);
  }

  function worldPosition(step) {
    const { x, z } = step.position;
    return { x, y: world.getHeight(x, z, step.mapId), z };
  }

  function notify(key, params) {
    bus.emit('toast', { key: `japan.campaign.${key}`, params });
  }

  function isCurrent(step) {
    return step === currentStep() && state.zone === step.mapId && state.mode === 'play';
  }

  function hasCompleted(step) {
    return STEP_INDEX.get(step.id) < progress.count;
  }

  function advance(step) {
    if (!isCurrent(step) || progress.readOnly) return false;
    const count = progress.count + 1;
    const completedSteps = JAPAN_CAMPAIGN_STEPS.slice(0, count).map(objective => objective.id);
    const stored = { version: SAVE_VERSION, completedSteps };
    const result = save.commitSection(SAVE_SECTION, stored, { expected: progress.stored });
    if (result.error === 'section-conflict') {
      reloadProgress();
      notify('saveUpdated');
      return false;
    }
    if (!result.ok) {
      notify('saveUnavailable');
      return false;
    }
    progress = { count, stored, readOnly: false };
    if (step.id === 'eastwardVow') eastwardCast = 1.4;
    if (step.id === 'bridgeApproach') bridgeNeedsApproach = false;
    if (step.model.endsWith('Dog')) dogGuide = { step, elapsed: 0 };
    bus.emit('sfx', { name: 'bowl' });
    const chapter = CHAPTER_BY_MAP.get(step.mapId);
    const chapterComplete = chapter.steps.at(-1) === step;
    const complete = count === JAPAN_CAMPAIGN_STEPS.length;
    if (chapterComplete) notify('reward', { chapter: { key: chapter.titleKey } });
    bus.emit('japan:progress', { stepId: step.id, mapId: step.mapId, chapterComplete, complete });
    return true;
  }

  function handleInteraction(step) {
    if (!isCurrent(step) || trial || state.uiOpen || distanceFrom(step.position) > step.radius) return;
    if (step.action === 'talk') {
      dialogue.open(dialogueId(step), { npcId: interactableId(step) });
    } else if (step.action === 'ward' || step.action === 'meditate') {
      trial = { step, elapsed: 0, resolveIn: 0, success: false };
      notify(step.action === 'ward' ? 'wardReady' : 'ajikanReady');
    } else {
      advance(step);
    }
  }

  for (const step of JAPAN_CAMPAIGN_STEPS) {
    if (step.action === 'talk') {
      const id = dialogueId(step);
      dialogue.register(id, {
        speakerKey: `japan.campaign.npc.${step.model}`,
        look: 'japan',
        nodes: {
          start: {
            textKey: `japan.campaign.dialogue.${step.id}`,
            choices: [{
              textKey: `japan.campaign.choice.${step.id}`,
              actions: [{ type: 'emit', event: DIALOGUE_ACCEPTED, payload: { stepId: step.id } }],
            }],
          },
        },
      });
    }
    if (['cross', 'walk', 'bow'].includes(step.action)) continue;
    const position = new Vector3(step.position.x, 0, step.position.z);
    ctx.interactables.push({
      id: interactableId(step),
      action: 'interact',
      kind: step.action === 'talk' ? 'npc' : 'questInteract',
      priority: 12,
      zone: step.mapId,
      radius: step.radius,
      labelKey: step.promptKey,
      getPosition() {
        position.y = world.getHeight(position.x, position.z, step.mapId);
        return position;
      },
      isAvailable: () => isCurrent(step) && !trial && !progress.readOnly,
      onInteract: () => handleInteraction(step),
    });
  }

  bus.on(DIALOGUE_ACCEPTED, ({ stepId }) => {
    const step = currentStep();
    if (step?.id === stepId && step.action === 'talk' && dialogue.getCurrent()?.id === dialogueId(step) && distanceFrom(step.position) <= step.radius) {
      advance(step);
    }
  });

  bus.on('merit', ({ type }) => {
    const step = currentStep();
    if (type === 'prostration' && step?.action === 'bow' && distanceFrom(step.position) <= step.radius) advance(step);
  });

  function clearSession() {
    trial = null;
    bridgeStage = 0;
    bridgeNeedsApproach = true;
    eastwardCast = 0;
    dogGuide = null;
  }

  function reloadProgress() {
    clearSession();
    progress = readSavedProgress(save);
    if (dialogue.getCurrent()?.id?.startsWith('japan.campaign.')) dialogue.close();
  }

  bus.on('zone:change', clearSession);
  bus.on('save:imported', reloadProgress);
  bus.on('save:flushed', ({ source }) => {
    if (source === 'reset') reloadProgress();
  });

  function updateWard(dt) {
    const { step } = trial;
    if (trial.resolveIn > 0) {
      trial.resolveIn = Math.max(0, trial.resolveIn - dt);
      if (trial.resolveIn > 0) return;
      const succeeded = trial.success;
      trial = null;
      if (succeeded) advance(step);
      else notify('wardRetry');
      return;
    }
    trial.elapsed += dt;
    if (trial.elapsed < JAPAN_WARD_TRIAL.duration) return;
    const distance = distanceFrom(step.position);
    trial.success = distance >= JAPAN_WARD_TRIAL.dangerRadius && distance <= JAPAN_WARD_TRIAL.outerRadius;
    trial.resolveIn = 0.36;
    bus.emit('sfx', { name: 'bowl' });
  }

  function updateAjikan(dt) {
    const { step } = trial;
    if (distanceFrom(step.position) > JAPAN_AJIKAN_TRIAL.radius || state.player.isJumping) {
      trial = null;
      notify('ajikanRetry');
      return;
    }
    // Small residual movement from approaching the seat settles before the timer starts.
    if (state.player.isMoving) {
      if (trial.elapsed > 0.2) {
        trial = null;
        notify('ajikanRetry');
      } else {
        trial.elapsed = 0;
      }
      return;
    }
    trial.elapsed += dt;
    if (trial.elapsed >= JAPAN_AJIKAN_TRIAL.duration) {
      trial = null;
      advance(step);
    }
  }

  function updateBridge(step) {
    const { x, z } = state.player.position;
    const center = Math.abs(x - step.position.x) < 2.15;
    if (Math.abs(z - BRIDGE_APPROACH.position.z) <= BRIDGE_APPROACH.radius && center) {
      bridgeStage = 0;
      bridgeNeedsApproach = false;
    }
    if (bridgeNeedsApproach) return;
    if (!center && z < 6 && z > -6) {
      bridgeStage = 0;
      bridgeNeedsApproach = true;
      notify('bridgeRetry');
      return;
    }
    const checkpoint = BRIDGE_CHECKPOINTS[bridgeStage];
    if (center && checkpoint !== undefined && Math.abs(z - checkpoint) < 1.4) bridgeStage++;
    if (bridgeStage === BRIDGE_CHECKPOINTS.length && distanceFrom(step.position) <= step.radius) advance(step);
    else if (z <= step.position.z && bridgeStage < BRIDGE_CHECKPOINTS.length) bridgeNeedsApproach = true;
  }

  function activateScene(chapter) {
    if (currentScene?.mapId === chapter?.mapId) return;
    currentScene = null;
    if (!chapter) return;
    const parent = ctx.zoneGroups?.[chapter.mapId];
    if (!parent) return;
    if (!scenes.has(chapter.mapId)) {
      const group = new Group();
      group.name = `JapanCampaign_${chapter.mapId}`;
      const models = chapter.steps.map(step => {
        const model = createCampaignProp(step);
        model.name = interactableId(step);
        const position = worldPosition(step);
        model.position.set(position.x, position.y, position.z);
        group.add(model);
        return { step, model };
      });
      parent.add(group);
      scenes.set(chapter.mapId, { mapId: chapter.mapId, group, models });
    }
    currentScene = scenes.get(chapter.mapId);
    currentScene.group.add(marker, trialRings);
  }

  function updateScene(step, target, dt) {
    if (!currentScene) return;
    const player = state.player.position;
    eastwardCast = Math.max(0, eastwardCast - dt);
    if (dogGuide) dogGuide.elapsed = Math.min(1.5, dogGuide.elapsed + dt);
    for (const { step: objective, model } of currentScene.models) {
      const active = objective === step;
      const done = hasCompleted(objective);
      model.visible = active || done || objective.action === 'talk' || objective.model.endsWith('Dog');
      if (objective.model === 'vajra' && done) model.visible = false;
      if (objective.id === 'finale' && !active && !done) model.visible = false;
      const { seal, flame, tail, thrownVajra } = model.userData;
      if (seal) {
        seal.rotation.y += dt * (active ? 1.8 : 0.55);
        seal.material.emissiveIntensity = done ? 0.8 : 0.36;
      }
      if (flame) {
        flame.visible = done;
        flame.scale.y = 0.14 * (1 + Math.sin(state.elapsed * 12) * 0.1);
      }
      if (tail) {
        tail.rotation.z = Math.sin(state.elapsed * 6) * (done ? 0.28 : 0.12);
        if (done) {
          const next = JAPAN_CAMPAIGN_STEPS[STEP_INDEX.get(objective.id) + 1];
          const dx = next.position.x - objective.position.x;
          const dz = next.position.z - objective.position.z;
          const travel = dogGuide?.step === objective ? dogGuide.elapsed / 1.5 : 1;
          const offset = travel * 4 / Math.hypot(dx, dz);
          const x = objective.position.x + dx * offset;
          const z = objective.position.z + dz * offset;
          const bounce = Math.sin(travel * Math.PI * 12) * Math.sin(travel * Math.PI) * 0.08;
          model.position.set(x, world.getHeight(x, z, objective.mapId) + bounce, z);
          model.rotation.y = Math.atan2(dx, dz);
        } else {
          const { x, y, z } = worldPosition(objective);
          model.position.set(x, y, z);
          model.rotation.y = Math.atan2(player.x - x, player.z - z);
        }
      } else if (objective.action === 'talk') {
        model.rotation.y = Math.atan2(player.x - model.position.x, player.z - model.position.z);
      }
      if (thrownVajra) {
        const flight = 1.4 - eastwardCast;
        thrownVajra.visible = !done || eastwardCast > 0;
        thrownVajra.position.set(done ? flight * 13 : 0, done ? 0.48 + flight * flight * 5 : 0.48, 0);
      }
    }
    marker.visible = Boolean(target) && !trial;
    if (target) {
      marker.position.set(target.x, target.y + (step.action === 'talk' ? 2.38 : 1.36) + Math.sin(state.elapsed * 3.8) * 0.15, target.z);
      marker.children[0].rotation.y += dt * 1.9;
    }
    trialRings.visible = trial?.step.action === 'ward';
    if (trialRings.visible) {
      const { x, y, z } = worldPosition(trial.step);
      trialRings.position.set(x, y + 0.1, z);
      wardDanger.material.opacity = 0.65 + Math.sin(state.elapsed * 7) * 0.15;
      wardPulse.visible = trial.resolveIn > 0;
      if (wardPulse.visible) {
        const radius = 0.8 + (1 - trial.resolveIn / 0.36) * JAPAN_WARD_TRIAL.dangerRadius;
        wardPulse.scale.set(radius, radius, 1);
        wardPulse.material.opacity = trial.resolveIn / 0.36;
      }
    }
  }

  function update(dt) {
    const chapter = state.mode === 'play' && isJapanMap(state.zone) ? CHAPTER_BY_MAP.get(state.zone) : null;
    activateScene(chapter);
    if (!chapter) {
      render({ chapter: null });
      return;
    }
    let step = currentStep();
    if (step?.mapId === chapter.mapId && !state.uiOpen && !progress.readOnly) {
      if (trial?.step === step) {
        if (step.action === 'ward') updateWard(dt);
        else updateAjikan(dt);
      } else if (step.action === 'walk' && distanceFrom(step.position) <= step.radius) {
        advance(step);
      } else if (step.action === 'cross') {
        updateBridge(step);
      }
      step = currentStep();
    }
    const localStep = step?.mapId === chapter.mapId ? step : null;
    const target = localStep ? worldPosition(localStep.action === 'cross' && bridgeNeedsApproach ? BRIDGE_APPROACH : localStep) : null;
    const nextChapter = step && CHAPTER_BY_MAP.get(step.mapId);
    let detailKey = localStep?.hintKey ?? (step ? 'japan.campaign.next' : 'japan.campaign.complete');
    if (trial?.step.action === 'ward') detailKey = 'japan.campaign.wardReady';
    if (trial?.step.action === 'meditate') detailKey = 'japan.campaign.ajikanReady';
    if (localStep?.action === 'cross' && bridgeNeedsApproach) detailKey = 'japan.campaign.bridgeRetry';
    if (progress.readOnly) detailKey = 'japan.campaign.saveUnavailable';
    updateScene(localStep, target, dt);
    render({
      chapter,
      detailKey,
      detailParams: nextChapter ? { chapter: { key: nextChapter.titleKey } } : undefined,
      target,
      progress: chapter.steps.filter(hasCompleted).length,
    });
  }

  function isChapterUnlocked(mapId) {
    const chapter = CHAPTER_BY_MAP.get(mapId);
    return Boolean(chapter && STEP_INDEX.get(chapter.steps[0].id) <= progress.count);
  }

  function getProgress() {
    return {
      completedSteps: JAPAN_CAMPAIGN_STEPS.slice(0, progress.count).map(step => step.id),
      completedChapters: JAPAN_CAMPAIGN_CHAPTERS.filter(chapter => hasCompleted(chapter.steps.at(-1))).map(chapter => chapter.mapId),
      nextStep: currentStep()?.id ?? null,
      nextMap: currentStep()?.mapId ?? null,
      complete: currentStep() === null,
    };
  }

  function getObjectives() {
    return JAPAN_CAMPAIGN_STEPS.map(step => ({
      id: step.id,
      interactableId: ['cross', 'walk', 'bow'].includes(step.action) ? null : interactableId(step),
      action: step.action,
      mapId: step.mapId,
      position: worldPosition(step),
      radius: step.radius,
      active: step === currentStep(),
      complete: hasCompleted(step),
      ...(step.action === 'ward' ? { trial: { ...JAPAN_WARD_TRIAL } } : {}),
      ...(step.action === 'meditate' ? { trial: { ...JAPAN_AJIKAN_TRIAL } } : {}),
      ...(step.action === 'cross' ? { checkpoints: BRIDGE_CHECKPOINTS.map(z => ({ x: step.position.x, z })) } : {}),
    }));
  }

  function getProstrationHeading() {
    const step = currentStep();
    if (step?.action === 'bow' && isCurrent(step) && distanceFrom(step.position) <= step.radius) return 0;
    return undefined;
  }

  const api = { update, getProgress, getObjectives, isChapterUnlocked, getProstrationHeading };
  ctx.japanCampaign = api;
  ctx.debug?.register?.('japanCampaign', { getProgress, getObjectives, isChapterUnlocked });
  return api;
}
