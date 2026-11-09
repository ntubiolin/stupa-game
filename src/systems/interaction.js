/**
 * Interaction system — selects the best available interactable in range
 * (distance-weighted, preferring targets in front of the player), emits
 * `prompt` events on change, and dispatches `onInteract()` on input press.
 */
const ACTION_KEY_HINT = {
  interact: 'E',
  feed: 'F',
};

export function createInteraction(ctx) {
  const { state, bus } = ctx;

  let currentTarget = null;
  let lastEmittedId = null;
  let lastEmittedLabel = null;
  let lastEmittedParamsSig = null;
  let lastEmittedSecId = null;
  let lastEmittedSecLabel = null;

  function getKindPenalty(item) {
    // Lower score is better: NPC and gate have priority over normal props, which have priority over ground loot,
    // and ground loot always has priority over Boss rematch Oath Stones.
    if (item.kind === 'oathStone') {
      return typeof item.priority === 'number' ? -item.priority : 25;
    }
    if (typeof item.priority === 'number') return -item.priority;
    if (item.kind === 'npc') return -10;
    if (item.kind === 'gate') return -5;
    if (item.kind === 'questItem' || item.kind === 'questInteract') return -2;
    if (item.kind === 'loot') return 10;
    return 0;
  }

  function scoreItem(item, px, pz, fwdX, fwdZ) {
    if (!item) return Infinity;
    const pos =
      typeof item.getPosition === 'function'
        ? item.getPosition()
        : item.position;
    if (!pos) return Infinity;

    const currentZone = state.zone || 'stupa';
    const itemZone = item.zone || currentZone;
    if (itemZone !== currentZone) return Infinity;
    if (typeof item.isAvailable === 'function' && !item.isAvailable()) return Infinity;
    if (typeof item.enabled === 'function' && !item.enabled()) return Infinity;

    const dx = pos.x - px;
    const dz = pos.z - pz;
    const dist = Math.hypot(dx, dz);
    const radius = item.radius ?? 2.2;
    if (dist > radius) return Infinity;

    // Alignment bonus: dot product with player forward vector (-sin(h), -cos(h))
    let align = 0;
    if (dist > 0.05) {
      align = (dx / dist) * fwdX + (dz / dist) * fwdZ; // -1..1
    }
    // Lower score is better: kind priority offset + normalized distance minus front-facing preference
    return getKindPenalty(item) + (dist / Math.max(0.5, radius)) - align * 0.28;
  }

  function emitPromptIfChanged(target, secondaryTarget = null) {
    const nextId = target ? target.id : null;
    const customLabel =
      target && typeof target.getLabel === 'function' ? target.getLabel() : null;
    const nextLabel = target
      ? customLabel || target.labelKey || target.promptKey
      : null;
    const nextParams = target ? target.labelParams || target.promptParams : undefined;
    const nextParamsSig = nextParams ? JSON.stringify(nextParams) : '';

    const secId = secondaryTarget ? secondaryTarget.id : null;
    const secCustomLabel =
      secondaryTarget && typeof secondaryTarget.getLabel === 'function'
        ? secondaryTarget.getLabel()
        : null;
    const secLabel = secondaryTarget
      ? secCustomLabel || secondaryTarget.labelKey || secondaryTarget.promptKey
      : null;

    if (
      nextId === lastEmittedId &&
      nextLabel === lastEmittedLabel &&
      nextParamsSig === lastEmittedParamsSig &&
      secId === lastEmittedSecId &&
      secLabel === lastEmittedSecLabel
    ) {
      return;
    }

    lastEmittedId = nextId;
    lastEmittedLabel = nextLabel;
    lastEmittedParamsSig = nextParamsSig;
    lastEmittedSecId = secId;
    lastEmittedSecLabel = secLabel;

    if (!target) {
      bus.emit('prompt', null);
    } else {
      const act = typeof target.action === 'string' ? target.action : 'interact';
      const secAct =
        secondaryTarget && typeof secondaryTarget.action === 'string'
          ? secondaryTarget.action
          : 'feed';
      bus.emit('prompt', {
        id: target.id,
        action: act,
        labelKey: target.labelKey || target.promptKey || 'prompt.interact',
        params: nextParams,
        text: customLabel,
        getLabel:
          typeof target.getLabel === 'function' ? () => target.getLabel() : null,
        keyHint: ACTION_KEY_HINT[act] || 'E',
        secondary: secondaryTarget
          ? {
              id: secondaryTarget.id,
              action: secAct,
              labelKey:
                secondaryTarget.labelKey ||
                secondaryTarget.promptKey ||
                'prompt.interact',
              params: secondaryTarget.labelParams || secondaryTarget.promptParams,
              text: secCustomLabel,
              getLabel:
                typeof secondaryTarget.getLabel === 'function'
                  ? () => secondaryTarget.getLabel()
                  : null,
              keyHint: ACTION_KEY_HINT[secAct] || 'F',
            }
          : null,
      });
    }
  }

  function update() {
    if (
      state.mode !== 'play' ||
      state.uiOpen ||
      state.player.action === 'prostrate' ||
      state.player.action === 'faint'
    ) {
      currentTarget = null;
      state.interactionTarget = null;
      state.interactionTargetsByAction = null;
      emitPromptIfChanged(null, null);
      return;
    }

    const px = state.player.position.x;
    const pz = state.player.position.z;
    const h = state.player.heading || 0;
    const fwdX = -Math.sin(h);
    const fwdZ = -Math.cos(h);

    const list = ctx.interactables || [];
    const hasLootInRange = list.some(
      (item) => item?.kind === 'loot' && scoreItem(item, px, pz, fwdX, fwdZ) < Infinity
    );
    let best = null;
    let bestScore = Infinity;
    let bestByAction = { interact: null, feed: null };
    let bestScoreByAction = { interact: Infinity, feed: Infinity };

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (hasLootInRange && item?.kind === 'oathStone') continue;
      const s = scoreItem(item, px, pz, fwdX, fwdZ);
      if (s < bestScore) {
        bestScore = s;
        best = item;
      }
      const act = typeof item?.action === 'string' ? item.action : 'interact';
      if (s < (bestScoreByAction[act] ?? Infinity)) {
        bestScoreByAction[act] = s;
        bestByAction[act] = item;
      }
    }

    const secondary =
      best && best.action === 'interact' && bestByAction.feed
        ? bestByAction.feed
        : best && best.action === 'feed' && bestByAction.interact
          ? bestByAction.interact
          : null;

    currentTarget = best;
    state.interactionTarget = best;
    state.interactionTargetsByAction = bestByAction;
    emitPromptIfChanged(best, secondary);

    const input = ctx.input;
    if (!input) return;

    const triggerInteract = (item) => {
      if (!item) return;
      if (typeof item.onInteract === 'function') item.onInteract();
      else if (typeof item.action === 'function') item.action();
    };

    const bestAct = best ? (typeof best.action === 'string' ? best.action : 'interact') : null;
    if (best && input.pressed(bestAct)) {
      triggerInteract(best);
      // Re-evaluate availability immediately after interacting
      if (
        (typeof best.isAvailable === 'function' && !best.isAvailable()) ||
        (typeof best.enabled === 'function' && !best.enabled())
      ) {
        currentTarget = null;
        state.interactionTarget = null;
        emitPromptIfChanged(null);
      }
      return;
    }

    // Also allow pressing the specific key ('feed' or 'interact') if a matching target is in range.
    // In the Stupa hub zone, pressing 'chant' (KeyR) near a lamp station also triggers quick-lighting ('lampQuick').
    const quickLampChant =
      bestByAction.feed?.kind === 'lampQuick' &&
      (state.zone || 'stupa') === 'stupa' &&
      input.pressed('chant');
    if ((input.pressed('feed') || quickLampChant) && bestByAction.feed) {
      triggerInteract(bestByAction.feed);
    } else if (input.pressed('interact') && bestByAction.interact) {
      triggerInteract(bestByAction.interact);
    }
  }

  const api = {
    update,
    getCurrentTarget() { return currentTarget; },
  };
  ctx.interaction = api;
  ctx.debug?.register?.('interaction', api);
  return api;
}
