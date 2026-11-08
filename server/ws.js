/**
 * Zero-Dependency RFC 6455 WebSocket Server & PubSub Hub (`server/ws.js`) — Issue #173
 *
 * Implements native Node `crypto` + `net.Socket` WebSocket upgrade & framing for:
 *  - Instant community butter-lamp / stupa / Samye dedication broadcasts (`community:event`)
 *  - Zone shard pilgrim presence & open-world event replication (`presence:state`, `presence:diff`)
 *  - Co-op party room synchronization (`coop:state`)
 */
import crypto from 'node:crypto';
import { getDefaultStore, sanitizeId, normalizeZone } from './store.js';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
export const MAX_WS_FRAME_BYTES = 32 * 1024;
export const MAX_WS_BUFFER_BYTES = 64 * 1024;
export const MAX_WS_CLIENTS = 256;

export function encodeWsFrame(payload, opcode = 0x01) {
  const data = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf8');
  const len = data.length;

  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | (opcode & 0x0f);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, data]);
}

export function decodeWsFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte0 = buffer[offset];
    const byte1 = buffer[offset + 1];
    const opcode = byte0 & 0x0f;
    const masked = (byte1 & 0x80) !== 0;
    let payloadLen = byte1 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    if (payloadLen > MAX_WS_FRAME_BYTES) {
      return {
        frames: [],
        remaining: Buffer.alloc(0),
        error: 'Frame too large',
      };
    }

    const maskLen = masked ? 4 : 0;
    const totalFrameLen = headerLen + maskLen + payloadLen;
    if (offset + totalFrameLen > buffer.length) break;

    const payloadStart = offset + headerLen + maskLen;
    const payload = Buffer.from(buffer.subarray(payloadStart, payloadStart + payloadLen));

    if (masked) {
      const maskKey = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i & 3];
      }
    }

    frames.push({ opcode, payload });
    offset += totalFrameLen;
  }

  return {
    frames,
    remaining: buffer.subarray(offset),
  };
}

export function attachWebSocketServer(
  httpServer,
  store = getDefaultStore(),
  pathPrefix = '/ws/multiplayer',
) {
  const clients = new Set();

  function sendToClient(client, msgObj) {
    if (!client || client.closed || !client.socket || client.socket.destroyed) return false;
    try {
      const frame = encodeWsFrame(JSON.stringify(msgObj), 0x01);
      client.socket.write(frame);
      return true;
    } catch {
      return false;
    }
  }

  function broadcastAll(msgObj, excludeClient = null) {
    const json = JSON.stringify(msgObj);
    const frame = encodeWsFrame(json, 0x01);
    for (const c of clients) {
      if (c === excludeClient || c.closed || c.socket.destroyed) continue;
      try {
        c.socket.write(frame);
      } catch {
        /* ignore broken pipe */
      }
    }
  }

  function broadcastCommunity(action, payload, state = null) {
    const communityState = state || store.getCommunityState();
    broadcastAll({
      type: 'community:event',
      action,
      payload,
      state: communityState,
      data: communityState,
    });
  }

  function broadcastPresence(shardId, updateBody = {}, result = null, excludeClient = null) {
    if (!shardId) return;
    const senderPeerId = updateBody?.peerId || updateBody?.pilgrim?.id || null;
    const pilgrimSnap =
      result?.pilgrims?.find((p) => p.id === senderPeerId) || updateBody?.pilgrim || null;
    const msgObj = {
      type: 'presence:diff',
      zone: result?.zone || updateBody?.zone || 'stupa',
      shardId,
      peerId: senderPeerId,
      pilgrim: pilgrimSnap,
      pilgrims: result?.pilgrims || [],
      events: Array.isArray(updateBody?.events) ? updateBody.events : [],
      zoneCounts: result?.zoneCounts || {},
      totalOnline: result?.totalOnline ?? 0,
    };
    const frame = encodeWsFrame(JSON.stringify(msgObj), 0x01);
    for (const c of clients) {
      if (c === excludeClient || c.closed || c.socket.destroyed) continue;
      if (senderPeerId && c.peerId === senderPeerId) continue;
      if (c.shardId === shardId || (!c.shardId && c.zone === msgObj.zone)) {
        try {
          c.socket.write(frame);
        } catch {
          /* ignore */
        }
      }
    }
  }

  function broadcastCoop(roomCode, result, _reqBody = null, excludeClient = null) {
    if (!roomCode) return;
    const cleanRoom = String(roomCode).toUpperCase();
    const msgObj = {
      type: 'coop:state',
      ...result,
    };
    const frame = encodeWsFrame(JSON.stringify(msgObj), 0x01);
    for (const c of clients) {
      if (c === excludeClient || c.closed || c.socket.destroyed) continue;
      if (c.room === cleanRoom) {
        try {
          c.socket.write(frame);
        } catch {
          /* ignore */
        }
      }
    }
  }

  function handleClientMessage(client, rawText) {
    let msg;
    try {
      msg = JSON.parse(rawText);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    const type = msg.type;

    if (type === 'ping') {
      sendToClient(client, { type: 'pong', ts: Date.now() });
      return;
    }

    if (type === 'hello') {
      if (msg.peerId) client.peerId = sanitizeId(String(msg.peerId), '') || client.peerId;
      if (msg.zone) client.zone = normalizeZone(String(msg.zone));
      if (msg.room) {
        client.room =
          String(msg.room)
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .toUpperCase()
            .slice(0, 20) || null;
      }

      const pres = msg.pilgrim
        ? store.updatePresence({
            peerId: client.peerId || msg.pilgrim.id,
            zone: client.zone,
            pilgrim: msg.pilgrim,
          })
        : store.getZonePresence({
            zone: client.zone,
            peerId: client.peerId,
          });

      if (pres.shardId) {
        client.shardId = pres.shardId;
        client.zone = pres.zone;
      }

      const communityState = store.getCommunityState();
      sendToClient(client, {
        type: 'community:init',
        ...communityState,
        data: communityState,
      });
      sendToClient(client, {
        type: 'presence:state',
        ...pres,
      });

      if (msg.pilgrim && pres.shardId) {
        broadcastPresence(pres.shardId, { peerId: client.peerId, pilgrim: msg.pilgrim }, pres, client);
      }

      if (client.room) {
        const coopState = store.getCoopRoom({ room: client.room });
        sendToClient(client, {
          type: 'coop:state',
          ...coopState,
        });
      }
      return;
    }

    if (type === 'presence:update') {
      if (msg.peerId || msg.pilgrim?.id) {
        client.peerId =
          sanitizeId(String(msg.peerId || msg.pilgrim.id), '') || client.peerId;
      }
      if (msg.zone || msg.pilgrim?.zone) {
        client.zone = normalizeZone(String(msg.zone || msg.pilgrim.zone));
      }
      const res = store.updatePresence({
        peerId: client.peerId,
        zone: client.zone,
        pilgrim: msg.pilgrim,
        events: msg.events,
        since: msg.since,
      });
      if (res.ok) {
        client.shardId = res.shardId;
        client.zone = res.zone;
        sendToClient(client, {
          type: 'presence:state',
          ...res,
        });
        broadcastPresence(res.shardId, msg, res, client);
      }
      return;
    }

    if (type === 'presence:leave') {
      const targetPeer = sanitizeId(String(msg.peerId || client.peerId || ''), '');
      const prevShard = client.shardId;
      const res = store.leavePresence({ peerId: targetPeer });
      const shardToNotify = res.shardId || prevShard;
      if (shardToNotify) {
        const leaveFrame = encodeWsFrame(
          JSON.stringify({
            type: 'presence:leave',
            peerId: targetPeer,
            zone: res.zone || client.zone,
            shardId: shardToNotify,
            zoneCounts: res.zoneCounts,
            totalOnline: res.totalOnline,
          }),
          0x01,
        );
        for (const c of clients) {
          if (c === client || c.closed || c.socket.destroyed) continue;
          if (c.shardId === shardToNotify) {
            try {
              c.socket.write(leaveFrame);
            } catch {
              /* ignore */
            }
          }
        }
      }
      return;
    }

    if (type === 'coop:sync') {
      if (msg.peerId || msg.member?.id) {
        client.peerId =
          sanitizeId(String(msg.peerId || msg.member.id), '') || client.peerId;
      }
      if (msg.room) {
        client.room =
          String(msg.room)
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .toUpperCase()
            .slice(0, 20) || null;
      }
      const res = store.syncCoopRoom({
        ...msg,
        room: client.room,
        peerId: client.peerId,
      });
      if (res.ok) {
        broadcastCoop(res.room, res);
      }
      return;
    }

    if (type === 'coop:leave') {
      const targetRoom = String(msg.room || client.room || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .toUpperCase()
        .slice(0, 20);
      const targetPeer = sanitizeId(String(msg.peerId || client.peerId || ''), '');
      if (targetRoom && targetPeer) {
        const res = store.leaveCoopRoom({ room: targetRoom, peerId: targetPeer });
        broadcastCoop(targetRoom, res);
      }
      client.room = null;
      return;
    }

    if (type === 'community:action') {
      const state = store.applyCommunityAction(msg.action, msg.payload);
      broadcastCommunity(msg.action, msg.payload, state);
    }
  }

  function cleanupClient(client) {
    if (!client || client.closed) return;
    client.closed = true;
    clients.delete(client);

    if (client.peerId) {
      const prevShard = client.shardId;
      const presRes = store.leavePresence({ peerId: client.peerId });
      const shardToNotify = presRes.shardId || prevShard;
      if (shardToNotify) {
        const leaveFrame = encodeWsFrame(
          JSON.stringify({
            type: 'presence:leave',
            peerId: client.peerId,
            zone: presRes.zone || client.zone,
            shardId: shardToNotify,
            zoneCounts: presRes.zoneCounts,
            totalOnline: presRes.totalOnline,
          }),
          0x01,
        );
        for (const c of clients) {
          if (c.closed || c.socket.destroyed) continue;
          if (c.shardId === shardToNotify) {
            try {
              c.socket.write(leaveFrame);
            } catch {
              /* ignore */
            }
          }
        }
      }

      if (client.room) {
        const coopRes = store.leaveCoopRoom({ room: client.room, peerId: client.peerId });
        broadcastCoop(client.room, coopRes);
      }
    }

    try {
      client.socket.destroy();
    } catch {
      /* ignore */
    }
  }

  if (httpServer && typeof httpServer.on === 'function') {
    httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (!url.pathname.startsWith(pathPrefix)) {
        // Leave non-matching upgrade requests (e.g. Vite HMR) untouched
        return;
      }

      if (clients.size >= MAX_WS_CLIENTS) {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
        return;
      }

      const key = req.headers['sec-websocket-key'];
      if (!key || typeof key !== 'string') {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      const acceptKey = crypto
        .createHash('sha1')
        .update(key.trim() + WS_GUID)
        .digest('base64');

      const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '\r\n',
      ].join('\r\n');

      socket.write(responseHeaders);
      socket.setNoDelay?.(true);

      const initialHead =
        head && head.length > 0 && head.length <= MAX_WS_BUFFER_BYTES
          ? Buffer.from(head)
          : Buffer.alloc(0);

      const client = {
        socket,
        peerId: sanitizeId(url.searchParams.get('peerId') || '', '') || null,
        zone: normalizeZone(url.searchParams.get('zone') || 'stupa'),
        shardId: null,
        room: url.searchParams.get('room')
          ? String(url.searchParams.get('room'))
              .replace(/[^a-zA-Z0-9_-]/g, '')
              .toUpperCase()
              .slice(0, 20) || null
          : null,
        buffer: initialHead,
        closed: false,
      };

      clients.add(client);

      socket.on('data', (chunk) => {
        if (client.closed) return;
        if (client.buffer.length + chunk.length > MAX_WS_BUFFER_BYTES) {
          cleanupClient(client);
          return;
        }
        client.buffer = Buffer.concat([client.buffer, chunk]);
        const { frames, remaining, error } = decodeWsFrames(client.buffer);
        if (error) {
          cleanupClient(client);
          return;
        }
        client.buffer = remaining;

        for (const frame of frames) {
          if (frame.opcode === 0x08) {
            // Close frame
            try {
              socket.write(encodeWsFrame(Buffer.alloc(0), 0x08));
            } catch {
              /* ignore */
            }
            cleanupClient(client);
            return;
          }
          if (frame.opcode === 0x09) {
            // Ping -> Pong
            try {
              socket.write(encodeWsFrame(frame.payload, 0x0a));
            } catch {
              /* ignore */
            }
            continue;
          }
          if (frame.opcode === 0x01) {
            handleClientMessage(client, frame.payload.toString('utf8'));
          }
        }
      });

      socket.on('close', () => cleanupClient(client));
      socket.on('error', () => cleanupClient(client));
      socket.on('end', () => cleanupClient(client));
    });
  }

  return {
    clients,
    broadcastAll,
    broadcastCommunity,
    broadcastPresence,
    broadcastCoop,
    close() {
      for (const c of clients) {
        cleanupClient(c);
      }
      clients.clear();
    },
  };
}
