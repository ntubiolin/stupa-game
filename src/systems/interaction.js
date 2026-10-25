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

  function scoreItem(item, px, pz, fwdX, fwdZ) {
    if (!item || typeof item.getPosition !== 'function') return Infinity;
    if (typeof item.isAvailable === 'function' && !item.isAvailable()) return Infinity;

    const pos = item.getPosition();
    if (!pos) return Infinity;

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
    // Lower score is better: normalized distance minus front-facing preference
    return (dist / Math.max(0.5, radius)) - align * 0.28;
  }

  function emitPromptIfChanged(target) {
    const nextId = target ? target.id : null;
    const nextLabel = target ? target.labelKey : null;
    if (nextId === lastEmittedId && nextLabel === lastEmittedLabel) return;

    lastEmittedId = nextId;
    lastEmittedLabel = nextLabel;

    if (!target) {
      bus.emit('prompt', null);
    } else {
      bus.emit('prompt', {
        id: target.id,
        action: target.action || 'interact',
        labelKey: target.labelKey || 'prompt.interact',
        keyHint: ACTION_KEY_HINT[target.action] || 'E',
      });
    }
  }

  function update() {
    if (state.mode !== 'play' || state.player.action === 'prostrate') {
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
      const act = item?.action || 'interact';
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

    if (best && input.pressed(best.action || 'interact')) {
      best.onInteract?.();
      // Re-evaluate availability immediately after interacting
      if (typeof best.isAvailable === 'function' && !best.isAvailable()) {
        currentTarget = null;
        state.interactionTarget = null;
        emitPromptIfChanged(null);
      }
      return;
    }

    // Also allow pressing the specific key ('feed' or 'interact') if a matching target is in range
    if (input.pressed('feed') && bestByAction.feed) {
      bestByAction.feed.onInteract?.();
    } else if (input.pressed('interact') && bestByAction.interact) {
      bestByAction.interact.onInteract?.();
    }
  }

  const api = {
    update,
    getCurrentTarget() { return currentTarget; },
  };
  ctx.interaction = api;
  return api;
}
