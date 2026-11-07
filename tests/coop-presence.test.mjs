import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoop } from '../src/systems/coop.js';

// Mock BroadcastChannel for multi-instance synchronous relay in Node tests
const channelsByName = new Map();
class MockBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    if (!channelsByName.has(name)) {
      channelsByName.set(name, new Set());
    }
    channelsByName.get(name).add(this);
  }
  postMessage(data) {
    const peers = channelsByName.get(this.name);
    if (!peers) return;
    const cloned = JSON.parse(JSON.stringify(data));
    for (const ch of peers) {
      if (ch !== this && typeof ch.onmessage === 'function') {
        ch.onmessage({ data: cloned });
      }
    }
  }
  close() {
    channelsByName.get(this.name)?.delete(this);
  }
}

globalThis.BroadcastChannel = MockBroadcastChannel;

function createMockBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
      return () => {};
    },
    emit(event, payload) {
      const list = listeners.get(event) || [];
      for (const fn of list) fn(payload);
    },
  };
}

function createPeerCtx({ name = 'Pilgrim', zone = 'stupa', x = 0, z = 0 } = {}) {
  const bus = createMockBus();
  const state = {
    mode: 'play',
    zone,
    elapsed: 10,
    player: {
      level: 5,
      hp: 80,
      maxHp: 100,
      mp: 40,
      maxMp: 60,
      exp: 0,
      atk: 15,
      heading: 0,
      action: 'idle',
      position: {
        x,
        y: 0,
        z,
        set(nx, ny, nz) {
          this.x = nx;
          this.y = ny;
          this.z = nz;
        },
      },
    },
  };
  const enemies = new Map();
  const ctx = {
    state,
    bus,
    vitals: {
      addExp(amount) {
        state.player.exp += amount;
      },
    },
    enemies: {
      spawnMock(id, kind = 'preta', hp = 50, exp = 20, ex = 10, ez = 10) {
        const record = {
          id,
          kind,
          hp,
          maxHp: hp,
          exp,
          state: 'chase',
          pos: { x: ex, y: 0, z: ez },
        };
        enemies.set(id, record);
        return record;
      },
      getActiveEnemies() {
        return Array.from(enemies.values());
      },
      damage(id, amount, opts = {}) {
        const e = enemies.get(id);
        if (!e || e.hp <= 0) return { dealt: 0, liberated: false };
        const dealt = opts.execute ? e.hp : Math.min(e.hp, amount);
        e.hp -= dealt;
        bus.emit('enemy:hit', {
          id: e.id,
          kind: e.kind,
          damage: dealt,
          source: opts.source || 'player',
          fromCoop: Boolean(opts.fromCoop),
          position: { ...e.pos },
        });
        if (e.hp <= 0) {
          e.state = 'liberated';
          ctx.vitals.addExp(e.exp);
          bus.emit('enemy:liberated', {
            id: e.id,
            kind: e.kind,
            exp: e.exp,
            fromCoop: Boolean(opts.fromCoop),
            position: { ...e.pos },
          });
        }
        return { dealt, liberated: e.hp <= 0 };
      },
    },
  };
  const coop = createCoop(ctx);
  coop.setPilgrimName(name);
  return { ctx, coop, bus, state };
}

test('Ambient zone presence syncs across Stupa & Wilderness without needing a room code', () => {
  channelsByName.clear();
  const peerA = createPeerCtx({ name: '蓮華扎西', zone: 'stupa', x: 12, z: 0 });
  const peerB = createPeerCtx({ name: '普巴卓瑪', zone: 'stupa', x: 14, z: 2 });

  peerA.coop.update(0.2);
  peerB.coop.update(0.2);

  // Both peers see each other as ambient pilgrims in stupa without creating or joining any room
  assert.equal(peerA.coop.getState().active, false);
  assert.equal(peerB.coop.getState().active, false);
  assert.equal(peerA.coop.getZonePilgrims().length, 1);
  assert.equal(peerA.coop.getZonePilgrims()[0].name, '普巴卓瑪');
  assert.equal(peerA.coop.getZonePilgrims()[0].isAmbient, true);

  assert.equal(peerB.coop.getZonePilgrims().length, 1);
  assert.equal(peerB.coop.getZonePilgrims()[0].name, '蓮華扎西');
  assert.equal(peerA.coop.getTotalOnline(), 2);
  assert.equal(peerA.coop.getZoneCounts().stupa, 2);

  // When peerB moves to 'wild', peerA in 'stupa' no longer sees peerB in stupa, until peerA also enters 'wild'
  peerB.state.zone = 'wild';
  peerB.coop.update(0.2);
  assert.equal(peerA.coop.getZonePilgrims().length, 0);
  assert.equal(peerA.coop.getZoneCounts().stupa, 1);
  assert.equal(peerA.coop.getZoneCounts().wild, 1);

  peerA.state.zone = 'wild';
  peerA.coop.update(0.2);
  assert.equal(peerA.coop.getZonePilgrims().length, 1);
  assert.equal(peerB.coop.getZonePilgrims().length, 1);
});

test('Wilderness combat sync replicates enemy:hit -> enemy:damage and shares 100% + bonus liberation EXP', () => {
  channelsByName.clear();
  const peerA = createPeerCtx({ name: '行者甲', zone: 'wild', x: 1000, z: 20 });
  const peerB = createPeerCtx({ name: '行者乙', zone: 'wild', x: 1003, z: 21 });

  peerA.coop.update(0.2);
  peerB.coop.update(0.2);

  // Spawn an enemy with 50 HP and 40 EXP in both wilderness instances
  const enemyA = peerA.ctx.enemies.spawnMock('wild_preta_1', 'preta', 50, 40, 1002, 22);
  const enemyB = peerB.ctx.enemies.spawnMock('wild_preta_1', 'preta', 50, 40, 1002, 22);

  // Peer A deals 20 damage -> replicated to Peer B's enemy!
  peerA.ctx.enemies.damage('wild_preta_1', 20, { source: 'mantra' });
  assert.equal(enemyA.hp, 30);
  assert.equal(enemyB.hp, 30);

  // Peer B deals the finishing 30 damage -> liberates on both peers, granting 100% base EXP (40) + 15% co-op bonus (6) = 46 EXP to both!
  peerB.ctx.enemies.damage('wild_preta_1', 30, { source: 'mantra' });
  assert.equal(enemyB.hp, 0);
  assert.equal(enemyA.hp, 0);
  assert.equal(peerB.state.player.exp, 46);
  assert.equal(peerA.state.player.exp, 46);
});

test('Dharma emotes broadcast across zone presence and Shared Kora Communion triggers after 8s of walking Kora together', () => {
  channelsByName.clear();
  const peerA = createPeerCtx({ name: '阿難', zone: 'stupa', x: 15, z: 0 });
  const peerB = createPeerCtx({ name: '迦葉', zone: 'stupa', x: 18, z: 2 });

  peerA.coop.update(0.2);
  peerB.coop.update(0.2);

  // 1. Dharma Emote broadcast
  let receivedEmote = null;
  peerB.bus.on('coop:emote', (payload) => {
    receivedEmote = payload;
  });

  const emote = peerA.coop.sendEmote('mantra');
  assert.ok(emote);
  assert.equal(emote.id, 'mantra');
  assert.ok(receivedEmote);
  assert.equal(receivedEmote.emoteId, 'mantra');
  assert.equal(receivedEmote.isSelf, false);
  assert.equal(peerB.coop.getZonePilgrims()[0].emote?.id, 'mantra');

  // 2. Shared Kora Communion (two pilgrims within 15m in stupa while walking Kora for 8.0s)
  peerA.state.player.action = 'walk';
  peerA.state.player.hp = 60;
  peerA.state.player.mp = 20;

  let koraMeritAwarded = 0;
  let communionToast = null;
  peerA.bus.on('merit', (m) => {
    if (m.type === 'kora') koraMeritAwarded += m.count;
  });
  peerA.bus.on('toast', (t) => {
    if (t.key === 'toast.sharedKoraCommunion') communionToast = t;
  });

  peerA.coop.update(4.0);
  assert.equal(koraMeritAwarded, 0);
  peerA.coop.update(4.2);

  assert.equal(koraMeritAwarded, 1);
  assert.ok(communionToast);
  assert.equal(peerA.coop.getState().koraCommunionCount, 1);
  assert.ok(peerA.state.player.hp > 60);
  assert.ok(peerA.state.player.mp > 20);
});
