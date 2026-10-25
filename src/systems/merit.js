/**
 * Merit & achievement system — tracks kora laps, prostrations, butter lamps lit,
 * monkeys fed, prayer wheels spun, combat liberations, mantra chants,
 * and total merit points. Persists in localStorage.
 */
const STORAGE_KEY = 'stupa.merit.v1';

const DEFAULT_WEIGHTS = {
  kora: 108,
  prostration: 27,
  lamp: 18,
  monkey: 12,
  wheel: 3,
  preta: 1,
  tsen: 3,
  migoi: 8,
};

export const ACHIEVEMENTS = [
  { id: 'firstKora', check: (s) => s.kora >= 1 },
  { id: 'threeKora', check: (s) => s.kora >= 3 },
  { id: 'sevenProstrations', check: (s) => s.prostration >= 7 },
  { id: 'prostrations108', check: (s) => s.prostration >= 108 },
  { id: 'firstLamp', check: (s) => s.lamp >= 1 },
  { id: 'lamps21', check: (s) => s.lamp >= 21 },
  { id: 'feed5', check: (s) => s.monkey >= 5 },
  { id: 'wheels108', check: (s) => s.wheel >= 108 },
  { id: 'sunset', check: (s, ctx) => ctx.state.mode === 'play' && ctx.state.time && ctx.state.time.t >= 0.71 && ctx.state.time.t <= 0.79 },
  { id: 'night', check: (s, ctx) => ctx.state.mode === 'play' && ctx.state.time && (ctx.state.time.nightFactor > 0.75 || ctx.state.time.t >= 0.85 || ctx.state.time.t <= 0.15) },
  { id: 'allPractices', check: (s) => s.kora >= 1 && s.prostration >= 1 && s.lamp >= 1 && s.monkey >= 1 },
  { id: 'firstLiberation', check: (s) => (s.totalLiberated || 0) >= 1 },
  { id: 'liberatePreta50', check: (s) => (s.preta || 0) >= 50 },
  { id: 'liberateTsen', check: (s) => (s.tsen || 0) >= 1 },
  { id: 'liberateMigoi', check: (s) => (s.migoi || 0) >= 1 },
  { id: 'level10', check: (s, ctx) => (ctx.state.player?.level || 1) >= 10 },
  { id: 'fullDorje', check: (s, ctx) => (ctx.state.player?.permanent?.atk || 0) >= 20 },
  { id: 'compassion', check: (s) => (s.mantraCasts || 0) >= 1008 },
];

function defaultData() {
  return {
    kora: 0,
    prostration: 0,
    lamp: 0,
    monkey: 0,
    wheel: 0,
    preta: 0,
    tsen: 0,
    migoi: 0,
    totalLiberated: 0,
    mantraCasts: 0,
    points: 0,
    achievements: [],
  };
}

export function createMerit(ctx) {
  const { bus, state, config } = ctx;
  const weights = config?.MERIT?.weights || DEFAULT_WEIGHTS;

  let data = defaultData();
  let koraFraction = 0;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        data = {
          kora: Number(parsed.kora) || 0,
          prostration: Number(parsed.prostration) || 0,
          lamp: Number(parsed.lamp) || 0,
          monkey: Number(parsed.monkey) || 0,
          wheel: Number(parsed.wheel) || 0,
          preta: Number(parsed.preta) || 0,
          tsen: Number(parsed.tsen) || 0,
          migoi: Number(parsed.migoi) || 0,
          totalLiberated: Number(parsed.totalLiberated) || 0,
          mantraCasts: Number(parsed.mantraCasts) || 0,
          points: Number(parsed.points) || 0,
          achievements: Array.isArray(parsed.achievements) ? [...parsed.achievements] : [],
        };
      }
    } catch { /* ignore storage errors */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore storage errors */ }
  }

  load();

  function evaluateAchievements() {
    let unlockedAny = false;
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i];
      if (data.achievements.includes(a.id)) continue;
      if (a.check(data, ctx)) {
        data.achievements.push(a.id);
        unlockedAny = true;
        bus.emit('achievement', { id: a.id });
        bus.emit('toast', {
          key: 'toast.achievement',
          params: { name: { key: `ach.${a.id}` } },
          kind: 'achievement',
        });
      }
    }
    if (unlockedAny) save();
  }

  bus.on('kora:progress', (payload) => {
    if (payload && typeof payload.fraction === 'number') {
      koraFraction = Math.max(0, Math.min(1, payload.fraction));
    }
  });

  bus.on('kora:wrongway', () => {
    bus.emit('toast', { key: 'toast.wrongWay', kind: 'warning' });
  });

  bus.on('merit', (payload) => {
    const type = payload?.type;
    const currentWeights = config?.MERIT?.weights || weights;
    if (!type || !(type in currentWeights)) return;

    const count = Math.max(1, Number(payload.count) || 1);
    if (typeof data[type] === 'number') {
      data[type] += count;
    }
    const pts = (currentWeights[type] || 0) * count;
    data.points += pts;
    save();

    if (type === 'kora') {
      bus.emit('toast', { key: 'toast.koraLap', params: { n: data.kora }, kind: 'merit' });
    } else if (type === 'prostration') {
      bus.emit('toast', { key: 'toast.prostration', params: { n: data.prostration }, kind: 'merit' });
    } else if (type === 'lamp') {
      bus.emit('toast', { key: 'toast.lamp', kind: 'merit' });
    } else if (type === 'monkey') {
      bus.emit('toast', { key: 'toast.monkey', kind: 'merit' });
    }

    evaluateAchievements();
  });

  bus.on('enemy:liberated', (payload) => {
    const kind = payload?.kind;
    if (!kind) return;
    if (typeof data[kind] === 'number') {
      data[kind] += 1;
    }
    data.totalLiberated = (data.totalLiberated || 0) + 1;
    const currentWeights = config?.MERIT?.weights || weights;
    const pts = currentWeights[kind] || 0;
    if (pts > 0) {
      data.points += pts;
    }
    save();
    evaluateAchievements();
  });

  let lastMantraTime = -999;
  function onMantraCast() {
    const now = state.elapsed;
    if (now - lastMantraTime < 0.05) return;
    lastMantraTime = now;
    data.mantraCasts = (data.mantraCasts || 0) + 1;
    save();
    evaluateAchievements();
  }
  bus.on('mantra:cast', onMantraCast);
  bus.on('player:chant', onMantraCast);

  bus.on('level:up', () => evaluateAchievements());
  bus.on('vitals:changed', () => evaluateAchievements());
  bus.on('item:pickup', () => evaluateAchievements());

  function reset() {
    data = defaultData();
    koraFraction = 0;
    save();
    bus.emit('merit:reset');
    bus.emit('toast', { key: 'toast.reset' });
  }

  let checkTimer = 0;
  function update(dt) {
    if (state.mode !== 'play') return;
    checkTimer += dt;
    if (checkTimer >= 1.0) {
      checkTimer = 0;
      evaluateAchievements();
    }
  }

  const api = {
    update,
    reset,
    getStats() {
      return {
        kora: data.kora,
        koraFraction,
        prostration: data.prostration,
        lamp: data.lamp,
        monkey: data.monkey,
        wheel: data.wheel,
        preta: data.preta,
        tsen: data.tsen,
        migoi: data.migoi,
        totalLiberated: data.totalLiberated,
        mantraCasts: data.mantraCasts,
        points: data.points,
        achievements: [...data.achievements],
      };
    },
    getAchievementsList() {
      return ACHIEVEMENTS.map((a) => ({
        id: a.id,
        unlocked: data.achievements.includes(a.id),
      }));
    },
  };

  ctx.merit = api;

  ctx.debug?.register('merit', {
    stats: () => api.getStats(),
    reset: () => api.reset(),
  });

  return api;
}
