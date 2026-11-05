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

  function getKindPenalty(item) {
    // Lower score is better: NPC and gate have priority over normal props, which have priority over ground loot
    if (typeof item.priority === 'number') return -item.priority;
    if (item.kind === 'npc') return -10;
    if (item.kind === 'gate') return -5;
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

  function emitPromptIfChanged(target) {
    const nextId = target ? target.id : null;
    const nextLabel = target ? (target.labelKey || target.promptKey) : null;
    if (nextId === lastEmittedId && nextLabel === lastEmittedLabel) return;

    lastEmittedId = nextId;
    lastEmittedLabel = nextLabel;

    if (!target) {
      bus.emit('prompt', null);
    } else {
      const act = typeof target.action === 'string' ? target.action : 'interact';
      bus.emit('prompt', {
        id: target.id,
        action: act,
        labelKey: target.labelKey || target.promptKey || 'prompt.interact',
        params: target.labelParams || target.promptParams,
        keyHint: ACTION_KEY_HINT[act] || 'E',
      });
    }
  }

  function update() {
    if (state.mode !== 'play' || state.player.action === 'prostrate' || state.player.action === 'faint') {
      currentTarget = null;
      state.interactionTarget = null;
      emitPromptIfChanged(null);
      return;
    }

    const px = state.player.position.x;
    const pz = state.player.position.z;
    const h = state.player.heading || 0;
    const fwdX = -Math.sin(h);
    const fwdZ = -Math.cos(h);

    const list = ctx.interactables || [];
    let best = null;
    let bestScore = Infinity;
    let bestByAction = { interact: null, feed: null };
    let bestScoreByAction = { interact: Infinity, feed: Infinity };

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
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

    currentTarget = best;
    state.interactionTarget = best;
    emitPromptIfChanged(best);

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

    // Also allow pressing the specific key ('feed' or 'interact') if a matching target is in range
    if (input.pressed('feed') && bestByAction.feed) {
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
  return api;
}
