import { defineConfig } from 'vite';

function stupaMultiplayerDevPlugin() {
  const communityStore = {
    lamps: [],
    stupas: [],
    samye: {
      contributedStupas: 324,
      totalKora: 1080,
      totalProstrations: 4320,
      contributors: [],
    },
  };
  const coopRooms = new Map();

  function readJsonBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  }

  function sendJson(res, data, status = 200) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  }

  return {
    name: 'stupa-multiplayer-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.pathname === '/api/community') {
          if (req.method === 'GET') {
            return sendJson(res, { ok: true, data: communityStore });
          }
          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const { action, payload } = body || {};
            if (action === 'lamp' && payload && payload.id) {
              const idx = communityStore.lamps.findIndex((l) => l.id === payload.id);
              if (idx >= 0) communityStore.lamps[idx] = { ...communityStore.lamps[idx], ...payload };
              else communityStore.lamps.unshift(payload);
              if (communityStore.lamps.length > 60) communityStore.lamps.length = 60;
            } else if (action === 'rejoiceLamp' && payload?.id) {
              const target = communityStore.lamps.find((l) => l.id === payload.id);
              if (target) {
                target.rejoiceCount = (Number(target.rejoiceCount) || 0) + 1;
                target.burnBonusSec = (Number(target.burnBonusSec) || 0) + 120;
              }
            } else if (action === 'stupa' && payload && payload.id) {
              const idx = communityStore.stupas.findIndex((s) => s.id === payload.id);
              if (idx >= 0) communityStore.stupas[idx] = { ...communityStore.stupas[idx], ...payload };
              else communityStore.stupas.unshift(payload);
              if (communityStore.stupas.length > 40) communityStore.stupas.length = 40;
            } else if (action === 'rejoiceStupa' && payload?.id) {
              const target = communityStore.stupas.find((s) => s.id === payload.id);
              if (target) {
                target.rejoiceCount = (Number(target.rejoiceCount) || 0) + 1;
              }
            } else if (action === 'samyeContribute' && payload) {
              const addStupas = Math.max(0, Number(payload.stupas) || 0);
              const addKora = Math.max(0, Number(payload.kora) || 0);
              const addPros = Math.max(0, Number(payload.prostrations) || 0);
              communityStore.samye.contributedStupas = Math.min(
                1008,
                communityStore.samye.contributedStupas + addStupas,
              );
              communityStore.samye.totalKora += addKora;
              communityStore.samye.totalProstrations += addPros;
              if (payload.pilgrimName) {
                communityStore.samye.contributors.unshift({
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  pilgrimName: String(payload.pilgrimName).slice(0, 24),
                  stupas: addStupas,
                  kora: addKora,
                  prostrations: addPros,
                  message: String(payload.message || '').slice(0, 80),
                  createdAt: Date.now(),
                });
                if (communityStore.samye.contributors.length > 30) {
                  communityStore.samye.contributors.length = 30;
                }
              }
            }
            return sendJson(res, { ok: true, data: communityStore });
          }
        }

        if (url.pathname === '/api/coop') {
          const now = Date.now();
          if (req.method === 'GET') {
            const roomCode = (url.searchParams.get('room') || '').toUpperCase();
            const since = Number(url.searchParams.get('since')) || 0;
            const room = coopRooms.get(roomCode);
            if (!room) {
              return sendJson(res, { ok: true, members: [], events: [] });
            }
            for (const [pid, m] of room.members.entries()) {
              if (now - m.updatedAt > 12000) room.members.delete(pid);
            }
            room.events = room.events.filter((e) => now - e.ts < 15000);
            return sendJson(res, {
              ok: true,
              room: roomCode,
              hostId: room.hostId,
              dungeonState: room.dungeonState || null,
              members: Array.from(room.members.values()),
              events: room.events.filter((e) => e.ts > since),
            });
          }
          if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const roomCode = String(body?.room || '').toUpperCase();
            if (!roomCode) return sendJson(res, { ok: false }, 400);
            let room = coopRooms.get(roomCode);
            if (!room) {
              room = { hostId: body?.member?.id || null, members: new Map(), events: [], dungeonState: null };
              coopRooms.set(roomCode, room);
            }
            if (body.action === 'leave' && body.peerId) {
              room.members.delete(body.peerId);
              if (room.hostId === body.peerId) {
                const next = room.members.keys().next().value;
                room.hostId = next || null;
              }
            }
            if (body.member && body.member.id) {
              if (!room.hostId) room.hostId = body.member.id;
              room.members.set(body.member.id, { ...body.member, updatedAt: now });
            }
            if (body.dungeonState) {
              room.dungeonState = body.dungeonState;
            }
            if (Array.isArray(body.events)) {
              for (const ev of body.events) {
                room.events.push({ ...ev, ts: ev.ts || now });
              }
              if (room.events.length > 80) {
                room.events = room.events.slice(-80);
              }
            }
            return sendJson(res, {
              ok: true,
              room: roomCode,
              hostId: room.hostId,
              dungeonState: room.dungeonState || null,
              members: Array.from(room.members.values()),
              events: room.events.filter((e) => e.ts > (Number(body.since) || 0)),
            });
          }
        }

        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [stupaMultiplayerDevPlugin()],
  build: {
    chunkSizeWarningLimit: 1200, // three.js alone is ~600 kB
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-three', test: /node_modules[\\/]three/, priority: 30 },
            { name: 'game-data', test: /src[\\/](i18n|data)[\\/]/, priority: 20 },
            { name: 'game-ui', test: /src[\\/]ui[\\/]/, priority: 15 },
            { name: 'game-combat', test: /src[\\/]gameplay[\\/](bosses|dungeon)/, priority: 10 },
          ],
        },
      },
    },
  },
});


