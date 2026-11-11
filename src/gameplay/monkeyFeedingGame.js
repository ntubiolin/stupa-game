import '../i18n/monkeyGame.js';

export const MONKEY_FRUITS = Object.freeze([
  Object.freeze({ id: 'banana', emoji: '🍌' }),
  Object.freeze({ id: 'apple', emoji: '🍎' }),
  Object.freeze({ id: 'peach', emoji: '🍑' }),
]);

const SAVE_SECTION = 'monkeyGame';

export function updateMonkeyGameProgress(current, result) {
  return {
    bestScore: Math.max(Number(current?.bestScore) || 0, Number(result?.correct) || 0),
    plays: (Number(current?.plays) || 0) + 1,
  };
}

export function createMonkeyFeedingSession({ rounds = 5, random = Math.random } = {}) {
  const requests = [];
  for (let i = 0; i < rounds; i++) {
    let index = Math.floor(random() * MONKEY_FRUITS.length);
    if (i > 0 && MONKEY_FRUITS[index].id === requests[i - 1]) index = (index + 1) % MONKEY_FRUITS.length;
    requests.push(MONKEY_FRUITS[index].id);
  }
  let round = 0;
  let correct = 0;
  let affection = 0;
  let finished = rounds <= 0;

  return {
    choose(fruitId) {
      if (finished || !MONKEY_FRUITS.some(fruit => fruit.id === fruitId)) return null;
      const accepted = fruitId === requests[round];
      if (accepted) {
        correct += 1;
        affection += 2;
      } else {
        affection = Math.max(0, affection - 1);
      }
      round += 1;
      finished = round >= rounds;
      return { accepted, finished, ...this.getState() };
    },
    getState() {
      return {
        round,
        rounds,
        correct,
        affection,
        finished,
        request: finished ? null : requests[round],
      };
    },
  };
}

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById('monkey-game-styles')) return;
  const style = document.createElement('style');
  style.id = 'monkey-game-styles';
  style.textContent = `
    .monkey-game { position:fixed; inset:0; z-index:920; display:grid; place-items:center; padding:18px; background:rgba(10,12,10,.76); backdrop-filter:blur(7px); pointer-events:auto; }
    .monkey-game.is-hidden { display:none; }
    .monkey-game__card { width:min(560px,94vw); border:1px solid rgba(238,195,108,.55); border-radius:20px; padding:24px; color:#fff8e8; background:linear-gradient(155deg,rgba(36,48,31,.97),rgba(27,19,23,.98)); box-shadow:0 24px 70px #000b; text-align:center; }
    .monkey-game__title { margin:0 0 8px; color:#ffe3a2; font:700 1.55rem var(--font-serif,serif); }
    .monkey-game__text { color:#e6ddca; line-height:1.55; }
    .monkey-game__request { margin:18px 0 8px; font-size:1.18rem; font-weight:700; }
    .monkey-game__fruits,.monkey-game__actions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:18px; }
    .monkey-game button { min-height:44px; padding:10px 16px; border-radius:12px; border:1px solid #e3bd70; color:#fff8e8; background:#57442e; font-weight:600; font-size:.95rem; font-family:inherit; cursor:pointer; touch-action:manipulation; }
    .monkey-game button:hover,.monkey-game button:focus-visible { background:#765d37; outline:3px solid rgba(255,221,142,.35); outline-offset:2px; }
    .monkey-game__fruit { min-width:128px; font-size:1.05rem !important; }
    .monkey-game__fruit span { display:block; font-size:2rem; margin-bottom:3px; }
    .monkey-game__feedback { min-height:1.6em; margin:10px 0 0; color:#ffd98c; }
    @media(max-width:480px){.monkey-game__card{padding:19px 14px}.monkey-game__fruit{min-width:92px;flex:1;padding:9px 6px!important}}
  `;
  document.head?.appendChild(style);
}

export function createMonkeyFeedingGame(ctx, { onFeed, random = Math.random } = {}) {
  const { state, bus, i18n, save } = ctx;
  let target = null;
  let session = null;
  let open = false;
  let rewarded = false;
  let feedbackKey = null;
  let opener = null;
  let saved = save?.get?.(SAVE_SECTION, { bestScore: 0, plays: 0 }) || { bestScore: 0, plays: 0 };
  let root = null;

  if (typeof document !== 'undefined') {
    injectStyles();
    root = document.createElement('div');
    root.id = 'monkey-feeding-game';
    root.className = 'monkey-game is-hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'monkey-game-title');
    document.body.appendChild(root);
  }

  const t = (key, params) => i18n?.t?.(key, params) ?? key;
  function fruitName(id) { return t(`monkey.fruit.${id}`); }

  function close() {
    if (!open) return false;
    state.uiOpen = false;
    open = false;
    target = null;
    session = null;
    root?.classList.add('is-hidden');
    if (opener?.isConnected !== false) opener?.focus?.();
    opener = null;
    return true;
  }

  function rewardOnce() {
    if (rewarded || !target) return false;
    const didFeed = onFeed?.(target) !== false;
    if (didFeed) rewarded = true;
    return didFeed;
  }

  function saveResult(result) {
    saved = updateMonkeyGameProgress(saved, result);
    save?.set?.(SAVE_SECTION, saved);
  }

  function start() {
    session = createMonkeyFeedingSession({ rounds: 5, random });
    feedbackKey = null;
    render();
  }

  function choose(fruitId) {
    const result = session?.choose(fruitId);
    if (!result) return null;
    feedbackKey = result.accepted ? 'monkey.game.correct' : 'monkey.game.wrong';
    if (result.finished) {
      saveResult(result);
      if (result.correct > 0) rewardOnce();
    }
    render();
    return result;
  }

  function quickFeed() {
    rewardOnce();
    close();
  }

  function render() {
    if (!root || !open) return;
    const s = session?.getState();
    root.dataset.screen = !s ? 'intro' : s.finished ? 'result' : 'round';
    if (!s) {
      root.innerHTML = `<section class="monkey-game__card"><h2 class="monkey-game__title" id="monkey-game-title">${t('monkey.game.title')}</h2><p class="monkey-game__text">${t('monkey.game.subtitle')}</p><div class="monkey-game__actions"><button data-action="start">${t('monkey.game.start')}</button><button data-action="quick">${t('monkey.game.quick')}</button><button data-action="close">${t('monkey.game.close')}</button></div></section>`;
    } else if (s.finished) {
      root.innerHTML = `<section class="monkey-game__card"><h2 class="monkey-game__title" id="monkey-game-title">${t('monkey.game.resultTitle')}</h2><p class="monkey-game__text">${t('monkey.game.result',{ correct:s.correct,total:s.rounds,affection:s.affection,best:saved.bestScore })}</p><p class="monkey-game__feedback">${t(s.correct > 0 && rewarded ? 'monkey.game.rewarded' : 'monkey.game.noReward')}</p><div class="monkey-game__actions"><button data-action="start">${t('monkey.game.replay')}</button><button data-action="close">${t('monkey.game.close')}</button></div></section>`;
    } else {
      const fruitButtons = MONKEY_FRUITS.map((fruit, index) => `<button class="monkey-game__fruit" data-fruit="${fruit.id}" aria-label="${index + 1}. ${fruitName(fruit.id)}"><span aria-hidden="true">${fruit.emoji}</span>${index + 1}. ${fruitName(fruit.id)}</button>`).join('');
      root.innerHTML = `<section class="monkey-game__card"><h2 class="monkey-game__title" id="monkey-game-title">${t('monkey.game.title')}</h2><p class="monkey-game__text">${t('monkey.game.round',{round:s.round+1,total:s.rounds})}</p><p class="monkey-game__request">${t('monkey.game.request',{fruit:fruitName(s.request)})}</p><p class="monkey-game__text">${t('monkey.game.score',{affection:s.affection,correct:s.correct})}</p><div class="monkey-game__fruits">${fruitButtons}</div><p class="monkey-game__feedback" aria-live="polite">${feedbackKey?t(feedbackKey):''}</p><div class="monkey-game__actions"><button data-action="close">${t('monkey.game.close')}</button></div></section>`;
    }
    root.querySelector('button')?.focus?.();
  }

  function show(monkey) {
    if (!monkey || open || state.uiOpen) return false;
    if (!root) return onFeed?.(monkey) !== false;
    target = monkey;
    opener = document.activeElement;
    saved = save?.get?.(SAVE_SECTION, { bestScore: 0, plays: 0 }) || { bestScore: 0, plays: 0 };
    session = null;
    rewarded = false;
    feedbackKey = null;
    open = true;
    state.uiOpen = true;
    root.classList.remove('is-hidden');
    render();
    return true;
  }

  root?.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (!button) return;
    if (button.dataset.fruit) choose(button.dataset.fruit);
    else if (button.dataset.action === 'start') start();
    else if (button.dataset.action === 'quick') quickFeed();
    else if (button.dataset.action === 'close') close();
  });
  root?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    const index = Number(event.key) - 1;
    if (session && index >= 0 && index < MONKEY_FRUITS.length) {
      event.preventDefault();
      event.stopPropagation();
      choose(MONKEY_FRUITS[index].id);
      return;
    }
    if (event.key === 'Tab') {
      const controls = [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(control => !control.disabled && control.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        event.stopPropagation();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        event.stopPropagation();
        first.focus();
      }
    }
  });
  root?.addEventListener('click', event => { if (event.target === root) close(); });
  bus?.on?.('zone:change', close);
  bus?.on?.('save:imported', () => {
    close();
    saved = save?.get?.(SAVE_SECTION, { bestScore: 0, plays: 0 }) || { bestScore: 0, plays: 0 };
  });
  i18n?.onChange?.(() => { if (open) render(); });

  return {
    open: show,
    close,
    update() {
      if (open && ctx.input?.pressed?.('closeUi')) close();
    },
    isOpen: () => open,
    choose,
    start,
    getState: () => session?.getState() || null,
    getBestScore: () => Number(saved.bestScore) || 0,
  };
}
