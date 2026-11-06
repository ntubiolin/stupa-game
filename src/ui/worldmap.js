import '../i18n/codex.js';
import '../i18n/murals.js';
import { i18n } from '../i18n.js';
import { MAPS } from '../data/maps.js';
import { CODEX_CATEGORIES } from '../data/codex.js';
import { CHAPTER_MURALS, getChapterMural } from '../data/murals.js';
import { MuralScrollCanvas } from './mural/scroll.js';
import { resolveWaypointCoords } from '../gameplay/waypoints.js';

/**
 * World route nodes across all chapters (Hand-drawn / Parchment Himalayan Trail).
 * Coordinates (nx, ny) are normalized 0..1 positions on the parchment route map.
 */
export const WORLD_ROUTE_NODES = [
  {
    id: 'stupa',
    chapter: 0,
    nx: 0.14,
    ny: 0.76,
    nameKey: 'worldNode.stupa.name',
    levelKey: 'worldNode.stupa.level',
    descKey: 'worldNode.stupa.desc',
    labelZh: '博達哈大佛塔 Lv.1',
    connectsTo: ['wild', 'pharping'],
  },
  {
    id: 'wild',
    chapter: 0,
    nx: 0.22,
    ny: 0.48,
    nameKey: 'worldNode.wild.name',
    levelKey: 'worldNode.wild.level',
    descKey: 'worldNode.wild.desc',
    labelZh: '北郊原野 Lv.1–5',
    connectsTo: ['pharping'],
  },
  {
    id: 'pharping',
    chapter: 1,
    nx: 0.31,
    ny: 0.68,
    nameKey: 'worldNode.pharping.name',
    levelKey: 'worldNode.pharping.level',
    descKey: 'worldNode.pharping.desc',
    labelZh: '帕平・揚列雪 Lv.1–8',
    connectsTo: ['mangyul'],
  },
  {
    id: 'mangyul',
    chapter: 2,
    nx: 0.44,
    ny: 0.42,
    nameKey: 'worldNode.mangyul.name',
    levelKey: 'worldNode.mangyul.level',
    descKey: 'worldNode.mangyul.desc',
    labelZh: '芒域山口 Lv.8–15',
    connectsTo: ['yarlung'],
  },
  {
    id: 'yarlung',
    chapter: 3,
    nx: 0.58,
    ny: 0.56,
    nameKey: 'worldNode.yarlung.name',
    levelKey: 'worldNode.yarlung.level',
    descKey: 'worldNode.yarlung.desc',
    labelZh: '雅隆河谷 Lv.15–22',
    connectsTo: ['samye'],
  },
  {
    id: 'samye',
    chapter: 4,
    nx: 0.72,
    ny: 0.38,
    nameKey: 'worldNode.samye.name',
    levelKey: 'worldNode.samye.level',
    descKey: 'worldNode.samye.desc',
    labelZh: '海波日山・桑耶寺 Lv.22–32',
    connectsTo: ['chimphu'],
  },
  {
    id: 'chimphu',
    aliasId: 'chimpu',
    chapter: 5,
    nx: 0.85,
    ny: 0.24,
    nameKey: 'worldNode.chimpu.name',
    levelKey: 'worldNode.chimpu.level',
    descKey: 'worldNode.chimpu.desc',
    labelZh: '青朴修行地 Lv.30–40',
    connectsTo: ['terma'],
  },
  {
    id: 'terma',
    aliasId: 'zangdokPalri',
    chapter: 5,
    nx: 0.88,
    ny: 0.66,
    nameKey: 'worldNode.zangdokPalri.name',
    levelKey: 'worldNode.zangdokPalri.level',
    descKey: 'worldNode.zangdokPalri.desc',
    labelZh: '伏藏秘境 Lv.31–40',
    connectsTo: [],
  },
  {
    id: 'sandbox',
    chapter: 0,
    nx: 0.12,
    ny: 0.24,
    debugOnly: true,
    nameKey: 'worldNode.sandbox.name',
    levelKey: 'worldNode.sandbox.level',
    descKey: 'worldNode.sandbox.desc',
    labelZh: '試煉沙盒 Lv.1',
    connectsTo: ['stupa'],
  },
];

/**
 * Shared 2D radar/map renderer used by both the top-right Minimap and the enlarged Zone Map tab.
 */
export function renderZoneRadarCanvas(canvas, ctx, opts = {}) {
  if (!canvas) return;
  const g = canvas.getContext('2d');
  if (!g) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radiusPx = Math.min(cx, cy) - 4;

  const { state } = ctx;
  const curZone = state.zone || 'stupa';
  const mapDef = MAPS[curZone] || MAPS.stupa;
  const origin = mapDef.origin || { x: 0, z: 0 };
  const walkRadius = mapDef.walkRadius || 38;

  const viewRadiusM =
    opts.viewRadiusM || (curZone === 'terma' && state.dungeon?.showLayout ? 55 : 45);
  const scale = radiusPx / viewRadiusM;
  const centerOnOrigin =
    Boolean(opts.centerOnOrigin) || Boolean(curZone === 'terma' && state.dungeon?.showLayout);
  const debugAll = Boolean(opts.debugAll) || Boolean(curZone === 'terma' && state.dungeon?.showLayout);

  const px = state.player?.position?.x ?? origin.x;
  const pz = state.player?.position?.z ?? origin.z;
  const refX = centerOnOrigin ? origin.x : px;
  const refZ = centerOnOrigin ? origin.z : pz;

  const toCanvas = (wx, wz) => ({
    x: cx + (wx - refX) * scale,
    y: cy + (wz - refZ) * scale,
  });

  g.clearRect(0, 0, width, height);
  g.save();

  // Circular clip
  g.beginPath();
  g.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  g.clip();

  // 1. Background sky/void outside walk boundary
  g.fillStyle = '#181410';
  g.fillRect(0, 0, width, height);

  // 2. Walkable terrain boundary circle
  const origPt = toCanvas(origin.x, origin.z);
  const boundaryPx = walkRadius * scale;
  g.beginPath();
  g.arc(origPt.x, origPt.y, boundaryPx, 0, Math.PI * 2);
  g.fillStyle = mapDef.minimapColor || (curZone === 'stupa' ? '#d9ccb4' : '#6f7c56');
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(234, 179, 8, 0.55)';
  g.stroke();

  // Subtle concentric range rings
  g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(cx, cy, radiusPx * 0.5, 0, Math.PI * 2);
  g.stroke();

  // 3. Zone-specific landmarks
  if (curZone === 'stupa') {
    // Kora stone path ring (r = 21..25)
    g.beginPath();
    g.arc(origPt.x, origPt.y, 23 * scale, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(120, 96, 68, 0.45)';
    g.lineWidth = Math.max(2, 3.2 * scale);
    g.stroke();

    // Stupa outer collider / terraced plinths
    const stupaR = (mapDef.innerRadius || 19.9) * scale;
    g.beginPath();
    g.arc(origPt.x, origPt.y, stupaR, 0, Math.PI * 2);
    g.fillStyle = '#f5efe4';
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = '#9b7b45';
    g.stroke();

    // Concentric dome & harmika
    g.beginPath();
    g.arc(origPt.x, origPt.y, 13.5 * scale, 0, Math.PI * 2);
    g.strokeStyle = '#c5a063';
    g.lineWidth = 1.2;
    g.stroke();

    g.beginPath();
    g.arc(origPt.x, origPt.y, 9.2 * scale, 0, Math.PI * 2);
    g.fillStyle = '#fffcf5';
    g.fill();
    g.strokeStyle = '#d97706';
    g.lineWidth = 1.5;
    g.stroke();

    // Golden spire center
    const harmikaHalf = Math.max(2.5, 2.8 * scale);
    g.fillStyle = '#eab308';
    g.fillRect(origPt.x - harmikaHalf, origPt.y - harmikaHalf, harmikaHalf * 2, harmikaHalf * 2);

    // Butter lamp stands
    const lamps = (ctx.interactables || []).filter(
      (it) => it.kind === 'lamp' && (it.zone || 'stupa') === 'stupa',
    );
    for (const lamp of lamps) {
      const pos = lamp.getPosition?.();
      if (!pos) continue;
      const lp = toCanvas(pos.x, pos.z);
      g.beginPath();
      g.arc(lp.x, lp.y, 2.5, 0, Math.PI * 2);
      g.fillStyle = '#fb923c';
      g.fill();
    }
  } else if (curZone === 'terma' && state.dungeon?.rooms?.length) {
    const dState = state.dungeon;
    const cellPx = 16 * scale;
    const roomSizePx = 13.2 * scale;
    const templateColors = {
      hall: 'rgba(56, 189, 248, 0.42)',
      colonnade: 'rgba(168, 85, 247, 0.42)',
      pool: 'rgba(20, 184, 166, 0.48)',
      corridor: 'rgba(148, 163, 184, 0.40)',
      mandala: 'rgba(251, 191, 36, 0.45)',
      vein: 'rgba(45, 212, 191, 0.52)',
    };

    // Draw background 6x6 grid lines when showLayout is active
    if (dState.showLayout) {
      g.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      g.lineWidth = 1;
      for (let gx = 0; gx < 6; gx++) {
        for (let gz = 0; gz < 6; gz++) {
          const wx = origin.x + (gx - 2.5) * 16;
          const wz = origin.z + (gz - 2.5) * 16;
          const cp = toCanvas(wx, wz);
          g.strokeRect(cp.x - cellPx * 0.5, cp.y - cellPx * 0.5, cellPx, cellPx);
        }
      }
    }

    // Draw doorway corridors connecting rooms
    g.strokeStyle = '#5eead4';
    g.lineWidth = Math.max(3, 4.2 * scale);
    for (const r of dState.rooms) {
      const rp = toCanvas(r.wx, r.wz);
      if (r.doors?.E) {
        const ep = toCanvas(r.wx + 16, r.wz);
        g.beginPath();
        g.moveTo(rp.x, rp.y);
        g.lineTo(ep.x, ep.y);
        g.stroke();
      }
      if (r.doors?.S) {
        const sp = toCanvas(r.wx, r.wz + 16);
        g.beginPath();
        g.moveTo(rp.x, rp.y);
        g.lineTo(sp.x, sp.y);
        g.stroke();
      }
    }

    // Draw each room cell
    for (const r of dState.rooms) {
      const rp = toCanvas(r.wx, r.wz);
      const half = roomSizePx * 0.5;
      g.fillStyle =
        r.role === 'start'
          ? 'rgba(34, 197, 94, 0.58)'
          : r.role === 'boss' || r.role === 'exit'
            ? 'rgba(245, 158, 11, 0.65)'
            : templateColors[r.template] || 'rgba(56, 189, 248, 0.38)';
      g.strokeStyle =
        r.role === 'start'
          ? '#4ade80'
          : r.role === 'boss' || r.role === 'exit'
            ? '#fbbf24'
            : '#38bdf8';
      g.lineWidth = 1.6;
      g.fillRect(rp.x - half, rp.y - half, roomSizePx, roomSizePx);
      g.strokeRect(rp.x - half, rp.y - half, roomSizePx, roomSizePx);

      if (dState.showLayout) {
        g.fillStyle = '#fef08a';
        g.font = `bold ${Math.max(8, Math.round(roomSizePx * 0.42))}px sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const tag =
          r.role === 'start'
            ? 'S'
            : r.role === 'boss'
              ? 'B'
              : r.role === 'exit'
                ? 'G'
                : (r.template || 'H')[0].toUpperCase();
        g.fillText(tag, rp.x, rp.y);
      }
    }

    // Draw Terma Crystal nodes
    for (const c of dState.crystals || []) {
      if (c.broken) continue;
      const cp = toCanvas(c.x, c.z);
      g.beginPath();
      g.arc(cp.x, cp.y, 3.2, 0, Math.PI * 2);
      g.fillStyle = '#2dd4bf';
      g.fill();
      g.strokeStyle = '#fef08a';
      g.lineWidth = 1;
      g.stroke();
    }

    // Draw seed & floor badge at top of radar when showLayout is enabled
    if (dState.showLayout) {
      g.fillStyle = 'rgba(15, 23, 42, 0.85)';
      g.fillRect(cx - 52, 8, 104, 18);
      g.fillStyle = '#5eead4';
      g.font = 'bold 10px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(`S:${dState.seed} F${dState.floor} (${dState.rooms.length}R)`, cx, 17);
    }
  } else {
    // Safe zones in combat maps
    for (const sz of mapDef.safeZones || []) {
      const sp = toCanvas(sz.x, sz.z);
      g.beginPath();
      g.arc(sp.x, sp.y, (sz.r || 10) * scale, 0, Math.PI * 2);
      g.fillStyle = 'rgba(250, 204, 21, 0.12)';
      g.fill();
      g.strokeStyle = 'rgba(250, 204, 21, 0.35)';
      g.lineWidth = 1;
      g.stroke();
    }
  }

  // 4. Shrines & Mani Stone Mounds
  const shrines = ctx.shrines?.list?.() || [];
  for (const s of shrines) {
    if (s.zone && s.zone !== curZone) continue;
    if (!debugAll && s.used && s.hiddenWhenUsed) continue;
    const sp = toCanvas(s.x, s.z);
    g.save();
    g.translate(sp.x, sp.y);
    g.fillStyle = s.used ? '#94a3b8' : '#34d399';
    g.strokeStyle = '#064e3b';
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(0, 0, 4, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  // Mani stones from interactables or wilderness
  const maniInteractables = (ctx.interactables || []).filter(
    (it) =>
      (it.zone || 'stupa') === curZone &&
      (it.kind === 'mani' || (typeof it.id === 'string' && it.id.includes('mani'))),
  );
  for (const m of maniInteractables) {
    const pos = m.getPosition?.();
    if (!pos) continue;
    const mp = toCanvas(pos.x, pos.z);
    g.beginPath();
    g.arc(mp.x, mp.y, 3.5, 0, Math.PI * 2);
    g.fillStyle = '#38bdf8';
    g.fill();
    g.strokeStyle = '#0c4a6e';
    g.lineWidth = 1;
    g.stroke();
  }

  // 5. Gates & Return Portal
  for (const gate of mapDef.gates || []) {
    const gp = toCanvas(gate.x, gate.z);
    g.save();
    g.translate(gp.x, gp.y);
    g.strokeStyle = '#f59e0b';
    g.fillStyle = 'rgba(245, 158, 11, 0.28)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  const returnPortal = ctx.waypoints?.getReturnPortal?.();
  if (returnPortal && curZone === 'stupa') {
    const rp = toCanvas(returnPortal.portalX, returnPortal.portalZ);
    g.save();
    g.translate(rp.x, rp.y);
    g.strokeStyle = '#38bdf8';
    g.fillStyle = 'rgba(56, 189, 248, 0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 5.2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.restore();
  }

  // 6. Waypoint Icon (Cyan/Gold 4-point Star)
  const wpCoords = resolveWaypointCoords(mapDef);
  if (wpCoords) {
    const isUnl = ctx.waypoints?.isUnlocked?.(curZone) ?? (curZone === 'stupa');
    if (isUnl || debugAll || Math.hypot(px - wpCoords.x, pz - wpCoords.z) < viewRadiusM) {
      const wpPt = toCanvas(wpCoords.x, wpCoords.z);
      drawFourPointStar(
        g,
        wpPt.x,
        wpPt.y,
        6.5,
        2.6,
        isUnl ? '#38bdf8' : '#94a3b8',
        isUnl ? '#fde047' : '#475569',
      );
    }
  }

  // 7. NPCs (#fde047 yellow-green/gold dots)
  const npcs = ctx.npcs?.list?.() || [];
  for (const n of npcs) {
    if (n.map !== curZone) continue;
    if (!n.visible && !debugAll) continue;
    const np = toCanvas(n.x, n.z);
    g.beginPath();
    g.arc(np.x, np.y, 4.2, 0, Math.PI * 2);
    g.fillStyle = '#fde047';
    g.fill();
    g.lineWidth = 1.4;
    g.strokeStyle = '#422006';
    g.stroke();
  }

  // 8. Enemies (normal #ef4444, champion #3b82f6, rare #facc15, boss large #a855f7)
  const enemies = ctx.enemies?.getActive?.() || [];
  for (const e of enemies) {
    if (!e || e.dead || e.state === 'dead') continue;
    if (e.zone && e.zone !== curZone) continue;
    const epos = e.pos || e.position || e.root?.position;
    if (!epos) continue;
    const ep = toCanvas(epos.x, epos.z);

    const rank = e.rank || (e.isBoss || e.kind === 'boss' ? 'boss' : 'normal');
    let color = '#ef4444';
    let r = 3.2;
    if (rank === 'boss') {
      color = '#a855f7';
      r = 6.2;
    } else if (rank === 'rare') {
      color = '#facc15';
      r = 4.5;
    } else if (rank === 'champion') {
      color = '#3b82f6';
      r = 4.0;
    }

    g.beginPath();
    g.arc(ep.x, ep.y, r, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.lineWidth = rank === 'boss' ? 1.8 : 1.0;
    g.strokeStyle = rank === 'boss' ? '#f3e8ff' : '#1f2937';
    g.stroke();
  }

  // 9. Tracked Quest Targets (Golden diamond, clamped to circle edge when outside radius!)
  const targets = ctx.quests?.getTrackedTargets?.(curZone) || [];
  for (const t of targets) {
    if (typeof t.x !== 'number' || typeof t.z !== 'number') continue;
    let dx = (t.x - refX) * scale;
    let dy = (t.z - refZ) * scale;
    const dist = Math.hypot(dx, dy);
    const maxR = radiusPx - 8;
    let clamped = false;
    if (dist > maxR && dist > 1e-4) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
      clamped = true;
    }
    drawQuestDiamond(g, cx + dx, cy + dy, clamped ? 5.5 : 6.2);
  }

  // 10. Player Arrow at player position (rotated by -state.player.heading)
  const playerPt = toCanvas(px, pz);
  const heading = state.player?.heading ?? 0;
  g.save();
  g.translate(playerPt.x, playerPt.y);
  g.rotate(-heading);
  g.beginPath();
  g.moveTo(0, -7.5);
  g.lineTo(5.2, 5.8);
  g.lineTo(0, 3.0);
  g.lineTo(-5.2, 5.8);
  g.closePath();
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 1.6;
  g.strokeStyle = '#0f172a';
  g.stroke();
  g.restore();

  g.restore();

  // Outer bezel ring & North 'N' badge
  g.save();
  g.beginPath();
  g.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  g.lineWidth = 2.5;
  g.strokeStyle = '#d4af37';
  g.stroke();

  // North badge at top
  g.fillStyle = '#1c1610';
  g.beginPath();
  g.arc(cx, cy - radiusPx + 8, 8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#d4af37';
  g.lineWidth = 1.2;
  g.stroke();

  g.fillStyle = '#fde047';
  g.font = 'bold 10px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('N', cx, cy - radiusPx + 8.5);
  g.restore();
}

function drawFourPointStar(g, x, y, outerR, innerR, fill, stroke) {
  g.save();
  g.translate(x, y);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) g.moveTo(sx, sy);
    else g.lineTo(sx, sy);
  }
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 1.3;
  g.strokeStyle = stroke;
  g.stroke();
  g.restore();
}

function drawQuestDiamond(g, x, y, size) {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size * 0.8, 0);
  g.lineTo(0, size);
  g.lineTo(-size * 0.8, 0);
  g.closePath();
  g.fillStyle = '#fde047';
  g.fill();
  g.lineWidth = 1.6;
  g.strokeStyle = '#92400e';
  g.stroke();
  g.restore();
}

export function createWorldMap(ctx) {
  if (ctx.worldmap) return ctx.worldmap;

  const { state, bus } = ctx;
  let isOpen = false;
  let activeTab = 'map'; // 'map' | 'world' | 'codex' | 'murals'
  let waypointTeleportMode = false;
  let selectedWorldNodeId = 'stupa';
  let activeCodexCategory = 'all';
  let selectedCodexId = 'boudhanath';
  let selectedMuralChapterId = 'ch1';
  let galleryMural = null;

  // Build Modal DOM
  const uiRoot = typeof document !== 'undefined' ? document.getElementById('ui') || document.body : null;
  const overlayEl = typeof document !== 'undefined' ? document.createElement('div') : null;

  let zoneCanvas = null;
  let routeSvgEl = null;
  let worldNodesLayerEl = null;
  let worldDetailEl = null;
  let worldBannerEl = null;
  let codexFilterEl = null;
  let codexCountEl = null;
  let codexGridEl = null;
  let codexReaderEl = null;
  let muralsSubtitleEl = null;
  let muralsListEl = null;
  let muralsDetailEl = null;
  let muralsCanvasEl = null;
  let zoneSubtitleEl = null;
  let legendListEl = null;

  if (overlayEl && uiRoot) {
    overlayEl.id = 'worldmap-modal';
    overlayEl.className = 'worldmap-modal is-hidden';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');

    overlayEl.innerHTML = `
      <div class="worldmap-modal__backdrop" data-action="close"></div>
      <div class="worldmap-modal__panel">
        <header class="worldmap-modal__header">
          <div class="worldmap-modal__tabs" role="tablist">
            <button type="button" class="worldmap-tab is-active" data-tab="map" role="tab"></button>
            <button type="button" class="worldmap-tab" data-tab="world" role="tab"></button>
            <button type="button" class="worldmap-tab" data-tab="codex" role="tab"></button>
            <button type="button" class="worldmap-tab" data-tab="murals" role="tab"></button>
          </div>
          <button type="button" class="worldmap-modal__close" data-action="close" aria-label="Close">✕</button>
        </header>

        <div class="worldmap-modal__body">
          <!-- TAB 1: Current Zone Map & Legend -->
          <section class="worldmap-view" data-view="map">
            <div class="zone-map-layout">
              <div class="zone-map-canvas-wrap">
                <div class="zone-map-subtitle"></div>
                <canvas class="zone-map-canvas" width="340" height="340"></canvas>
              </div>
              <div class="zone-map-legend">
                <h3 class="zone-map-legend__title"></h3>
                <ul class="zone-map-legend__list"></ul>
              </div>
            </div>
          </section>

          <!-- TAB 2: World Route Map (Parchment Himalayan Trail) -->
          <section class="worldmap-view is-hidden" data-view="world">
            <div class="world-route-banner"></div>
            <div class="world-route-layout">
              <div class="world-route-board">
                <svg class="world-route-svg" viewBox="0 0 800 420" preserveAspectRatio="none"></svg>
                <div class="world-route-nodes"></div>
              </div>
              <aside class="world-route-detail"></aside>
            </div>
          </section>

          <!-- TAB 3: Dharma Codex -->
          <section class="worldmap-view is-hidden" data-view="codex">
            <div class="codex-toolbar">
              <div class="codex-filters"></div>
              <div class="codex-counter"></div>
            </div>
            <div class="codex-layout">
              <div class="codex-grid"></div>
              <article class="codex-reader"></article>
            </div>
          </section>

          <!-- TAB 4: Tibetan Mural Scrolls Gallery -->
          <section class="worldmap-view is-hidden" data-view="murals">
            <div class="mural-gallery-subtitle"></div>
            <div class="mural-gallery-layout">
              <div class="mural-gallery-list"></div>
              <div class="mural-gallery-preview">
                <div class="mural-gallery-stage">
                  <canvas class="mural-gallery-canvas" width="960" height="540"></canvas>
                </div>
                <div class="mural-gallery-detail"></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    uiRoot.appendChild(overlayEl);

    zoneCanvas = overlayEl.querySelector('.zone-map-canvas');
    zoneSubtitleEl = overlayEl.querySelector('.zone-map-subtitle');
    legendListEl = overlayEl.querySelector('.zone-map-legend__list');
    routeSvgEl = overlayEl.querySelector('.world-route-svg');
    worldNodesLayerEl = overlayEl.querySelector('.world-route-nodes');
    worldDetailEl = overlayEl.querySelector('.world-route-detail');
    worldBannerEl = overlayEl.querySelector('.world-route-banner');
    codexFilterEl = overlayEl.querySelector('.codex-filters');
    codexCountEl = overlayEl.querySelector('.codex-counter');
    codexGridEl = overlayEl.querySelector('.codex-grid');
    codexReaderEl = overlayEl.querySelector('.codex-reader');
    muralsSubtitleEl = overlayEl.querySelector('.mural-gallery-subtitle');
    muralsListEl = overlayEl.querySelector('.mural-gallery-list');
    muralsDetailEl = overlayEl.querySelector('.mural-gallery-detail');
    muralsCanvasEl = overlayEl.querySelector('.mural-gallery-canvas');
    if (muralsCanvasEl) {
      galleryMural = new MuralScrollCanvas(muralsCanvasEl, { ctx, chapterId: 'ch1' });
    }

    overlayEl.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-action="close"]');
      if (closeBtn) {
        close();
        return;
      }
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        switchTab(tabBtn.getAttribute('data-tab'));
      }
    });
  }

  function canPlayerTeleportNow() {
    if (waypointTeleportMode) return true;
    return Boolean(ctx.waypoints?.isPlayerNearWaypoint?.());
  }

  function refreshStaticLabels() {
    if (!overlayEl) return;
    const tabMap = overlayEl.querySelector('[data-tab="map"]');
    const tabWorld = overlayEl.querySelector('[data-tab="world"]');
    const tabCodex = overlayEl.querySelector('[data-tab="codex"]');
    const tabMurals = overlayEl.querySelector('[data-tab="murals"]');
    if (tabMap) tabMap.textContent = i18n.t('mapModal.tab.map');
    if (tabWorld) tabWorld.textContent = i18n.t('mapModal.tab.world');
    if (tabCodex) tabCodex.textContent = i18n.t('mapModal.tab.codex');
    if (tabMurals) tabMurals.textContent = i18n.t('mapModal.tab.murals');

    const legendTitle = overlayEl.querySelector('.zone-map-legend__title');
    if (legendTitle) legendTitle.textContent = i18n.t('mapModal.legend.title');
  }

  function renderZoneMapTab() {
    if (!overlayEl || !zoneCanvas) return;
    const curZone = state.zone || 'stupa';
    const mapDef = MAPS[curZone] || MAPS.stupa;
    const zoneName = mapDef.nameKey ? i18n.t(mapDef.nameKey) : curZone;
    const viewR = Math.max(45, (mapDef.walkRadius || 38) + 8);

    if (zoneSubtitleEl) {
      zoneSubtitleEl.textContent = `${i18n.t('mapModal.zone.current', { name: zoneName })} · ${i18n.t('mapModal.zone.zoom', { radius: viewR })}`;
    }

    renderZoneRadarCanvas(zoneCanvas, ctx, {
      viewRadiusM: viewR,
      centerOnOrigin: true,
      debugAll: Boolean(ctx.minimap?.isDebug?.()),
    });

    if (legendListEl) {
      const items = [
        { swatchClass: 'swatch--player', key: 'mapModal.legend.player' },
        { swatchClass: 'swatch--waypoint', key: 'mapModal.legend.waypoint' },
        { swatchClass: 'swatch--quest', key: 'mapModal.legend.quest' },
        { swatchClass: 'swatch--npc', key: 'mapModal.legend.npc' },
        { swatchClass: 'swatch--shrine', key: 'mapModal.legend.shrine' },
        { swatchClass: 'swatch--gate', key: 'mapModal.legend.gate' },
        { swatchClass: 'swatch--enemy-normal', key: 'mapModal.legend.enemyNormal' },
        { swatchClass: 'swatch--enemy-champion', key: 'mapModal.legend.enemyChampion' },
        { swatchClass: 'swatch--enemy-rare', key: 'mapModal.legend.enemyRare' },
        { swatchClass: 'swatch--enemy-boss', key: 'mapModal.legend.enemyBoss' },
      ];
      legendListEl.innerHTML = items
        .map(
          (it) => `
          <li class="zone-map-legend__item">
            <span class="legend-swatch ${it.swatchClass}"></span>
            <span>${i18n.t(it.key)}</span>
          </li>
        `,
        )
        .join('');
    }
  }

  function getVisibleWorldNodes() {
    return WORLD_ROUTE_NODES.filter((n) => {
      if (!n.debugOnly) return true;
      return (
        Boolean(ctx.debug?.enabled) ||
        state.zone === n.id ||
        Boolean(ctx.waypoints?.isUnlocked?.(n.id))
      );
    });
  }

  function renderWorldRouteTab() {
    if (!overlayEl || !worldNodesLayerEl || !routeSvgEl) return;

    const canTp = canPlayerTeleportNow();
    if (worldBannerEl) {
      worldBannerEl.textContent = canTp
        ? i18n.t('mapModal.world.canTeleport')
        : i18n.t('mapModal.world.cannotTeleport');
      worldBannerEl.classList.toggle('is-active-tp', canTp);
    }

    const nodes = getVisibleWorldNodes();
    const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

    // Render connecting SVG paths on parchment
    const pathsHtml = [];
    for (const n of nodes) {
      const x1 = (n.nx * 800).toFixed(1);
      const y1 = (n.ny * 420).toFixed(1);
      for (const targetId of n.connectsTo || []) {
        const target = nodeById[targetId];
        if (!target) continue;
        const x2 = (target.nx * 800).toFixed(1);
        const y2 = (target.ny * 420).toFixed(1);
        const mx = ((Number(x1) + Number(x2)) * 0.5).toFixed(1);
        const my = ((Number(y1) + Number(y2)) * 0.5 - 18).toFixed(1);
        const bothUnlocked =
          Boolean(ctx.waypoints?.isUnlocked?.(n.id)) &&
          Boolean(ctx.waypoints?.isUnlocked?.(target.id));
        pathsHtml.push(
          `<path d="M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}" class="route-edge ${bothUnlocked ? 'is-unlocked' : ''}" />`,
        );
      }
    }
    routeSvgEl.innerHTML = pathsHtml.join('');

    // Render interactive node buttons
    const curZone = state.zone || 'stupa';
    worldNodesLayerEl.innerHTML = nodes
      .map((n) => {
        const isUnl = Boolean(ctx.waypoints?.isUnlocked?.(n.id)) || n.id === 'stupa';
        const isCur = curZone === n.id;
        const isSel = selectedWorldNodeId === n.id;
        const hasMap = Boolean(MAPS[n.id]);
        const name = i18n.t(n.nameKey);
        const lvl = i18n.t(n.levelKey);

        return `
          <button
            type="button"
            class="world-node ${isUnl ? 'is-unlocked' : 'is-locked'} ${isCur ? 'is-current' : ''} ${isSel ? 'is-selected' : ''} ${hasMap ? 'has-map' : 'is-future'}"
            data-node-id="${n.id}"
            style="left: ${(n.nx * 100).toFixed(1)}%; top: ${(n.ny * 100).toFixed(1)}%;"
          >
            <span class="world-node__pin">${isCur ? '🪷' : isUnl ? '✦' : '🔒'}</span>
            <span class="world-node__name">${name}</span>
            <span class="world-node__lvl">${lvl}</span>
          </button>
        `;
      })
      .join('');

    worldNodesLayerEl.querySelectorAll('[data-node-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nodeId = btn.getAttribute('data-node-id');
        selectedWorldNodeId = nodeId;
        const isUnl = Boolean(ctx.waypoints?.isUnlocked?.(nodeId)) || nodeId === 'stupa';
        const hasMap = Boolean(MAPS[nodeId]);

        if (isUnl && !hasMap) {
          bus.emit('toast', { text: i18n.t('prologue.toast.pharpingComingSoon') });
          renderWorldRouteTab();
          return;
        }
        if (canPlayerTeleportNow() && isUnl && hasMap) {
          handleTeleportToNode(nodeId);
          return;
        }
        if (!canPlayerTeleportNow() && isUnl && hasMap && nodeId !== (state.zone || 'stupa')) {
          bus.emit('toast', { text: i18n.t('toast.waypointNeedStand') });
        }
        renderWorldRouteTab();
      });
    });

    renderWorldNodeDetail(nodeById[selectedWorldNodeId] || nodes[0]);
  }

  function renderWorldNodeDetail(node) {
    if (!worldDetailEl || !node) return;
    const isUnl = Boolean(ctx.waypoints?.isUnlocked?.(node.id)) || node.id === 'stupa';
    const isCur = (state.zone || 'stupa') === node.id;
    const hasMap = Boolean(MAPS[node.id]);
    const canTp = canPlayerTeleportNow();

    let statusText = i18n.t('mapModal.world.status.locked');
    if (isCur) statusText = i18n.t('mapModal.world.status.current');
    else if (isUnl && hasMap && canTp) statusText = i18n.t('mapModal.world.status.unlocked');
    else if (isUnl) statusText = i18n.t('mapModal.world.status.unlockedView');
    else if (!hasMap) statusText = i18n.t('mapModal.world.status.unreached');

    const showTpBtn = isUnl && !isCur && (canTp || !hasMap);

    worldDetailEl.innerHTML = `
      <div class="world-detail__header">
        <div class="world-detail__title">${i18n.t(node.nameKey)}</div>
        <div class="world-detail__level">${i18n.t(node.levelKey)}</div>
      </div>
      <div class="world-detail__status ${isUnl ? 'is-unlocked' : 'is-locked'}">${statusText}</div>
      <p class="world-detail__desc">${i18n.t(node.descKey)}</p>
      <div class="world-detail__actions">
        ${
          showTpBtn
            ? `<button type="button" class="world-detail__tp-btn" data-tp-node="${node.id}">${i18n.t('mapModal.world.teleportBtn')}</button>`
            : ''
        }
        <button type="button" class="quest-mural-open-btn" data-mural-node="${node.id}">
          📜 ${i18n.t('mural.ui.viewScroll')}
        </button>
      </div>
    `;

    const tpBtn = worldDetailEl.querySelector('[data-tp-node]');
    if (tpBtn) {
      tpBtn.addEventListener('click', () => {
        handleTeleportToNode(node.id);
      });
    }
    const muralBtn = worldDetailEl.querySelector('[data-mural-node]');
    if (muralBtn) {
      muralBtn.addEventListener('click', () => {
        close();
        ctx.questUi?.openMuralScroll?.(node.id);
      });
    }
  }

  function handleTeleportToNode(mapId) {
    if (!MAPS[mapId]) {
      bus.emit('toast', { text: i18n.t('prologue.toast.pharpingComingSoon') });
      return false;
    }
    close();
    if (ctx.waypoints?.teleportTo) {
      ctx.waypoints.teleportTo(mapId);
    } else if (ctx.zones?.teleport) {
      ctx.zones.teleport(mapId, 'waypoint');
    }
    return true;
  }

  function renderCodexTab() {
    if (!overlayEl || !codexFilterEl || !codexGridEl || !codexReaderEl) return;

    // 1. Category filter pills
    codexFilterEl.innerHTML = CODEX_CATEGORIES.map((cat) => {
      const isAct = activeCodexCategory === cat.id;
      return `
        <button
          type="button"
          class="codex-pill ${isAct ? 'is-active' : ''}"
          data-cat="${cat.id}"
        >${i18n.t(cat.labelKey)}</button>
      `;
    }).join('');

    codexFilterEl.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCodexCategory = btn.getAttribute('data-cat') || 'all';
        renderCodexTab();
      });
    });

    // 2. Collection counter (X / Y)
    const counts = ctx.codex?.count?.() || { unlocked: 1, total: 11 };
    if (codexCountEl) {
      codexCountEl.textContent = i18n.t('codex.collected', counts);
    }

    // 3. Entries grid
    const entries = ctx.codex?.getEntries?.(activeCodexCategory) || [];
    if (entries.length > 0 && !entries.some((e) => e.id === selectedCodexId)) {
      const firstUnlocked = entries.find((e) => e.unlocked) || entries[0];
      selectedCodexId = firstUnlocked.id;
    }

    codexGridEl.innerHTML = entries
      .map((entry) => {
        const isSel = entry.id === selectedCodexId;
        const isUnl = entry.unlocked;
        const tagText =
          entry.tag === 'legend' ? i18n.t('codex.tag.legend') : i18n.t('codex.tag.history');
        return `
          <button
            type="button"
            class="codex-card ${isUnl ? 'is-unlocked' : 'is-locked'} ${isSel ? 'is-selected' : ''}"
            data-codex-card="${entry.id}"
          >
            <div class="codex-card__glyph">${isUnl ? entry.glyph : '？'}</div>
            <div class="codex-card__info">
              <div class="codex-card__title">${isUnl ? entry.title : i18n.t('codex.locked.title')}</div>
              <div class="codex-card__tag ${entry.tag === 'legend' ? 'is-legend' : 'is-history'}">
                ${isUnl ? tagText : '—'}
              </div>
            </div>
          </button>
        `;
      })
      .join('');

    codexGridEl.querySelectorAll('[data-codex-card]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-codex-card');
        selectedCodexId = id;
        if (ctx.codex?.isUnlocked?.(id)) {
          ctx.codex?.markSeen?.(id);
        }
        renderCodexTab();
      });
    });

    // 4. Detail Reader Pane
    const currentEntry = ctx.codex?.getEntry?.(selectedCodexId) || entries[0];
    if (!currentEntry) {
      codexReaderEl.innerHTML = '';
      return;
    }

    if (!currentEntry.unlocked) {
      codexReaderEl.innerHTML = `
        <div class="codex-reader__locked">
          <div class="codex-reader__silhouette">？</div>
          <h3 class="codex-reader__title">${i18n.t('codex.locked.title')}</h3>
          <p class="codex-reader__hint">${i18n.t('codex.locked.hint')}</p>
        </div>
      `;
      return;
    }

    const tagLabel =
      currentEntry.tag === 'legend' ? i18n.t('codex.tag.legend') : i18n.t('codex.tag.history');
    const chapterLabel =
      currentEntry.chapter > 0
        ? i18n.t('codex.chapter.label', { ch: currentEntry.chapter })
        : i18n.t('codex.chapter.prologue');

    const sourcesHtml = (currentEntry.sources || [])
      .map(
        (s) => `
        <li>
          <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="codex-source-link">
            ↗ ${s.label}
          </a>
        </li>
      `,
      )
      .join('');

    codexReaderEl.innerHTML = `
      <div class="codex-reader__header">
        <div class="codex-reader__glyph">${currentEntry.glyph}</div>
        <div class="codex-reader__meta">
          <span class="codex-badge ${currentEntry.tag === 'legend' ? 'is-legend' : 'is-history'}">${tagLabel}</span>
          <span class="codex-chapter">${chapterLabel}</span>
        </div>
        <h3 class="codex-reader__title">${currentEntry.title}</h3>
      </div>
      <div class="codex-reader__body">${currentEntry.body}</div>
      ${
        sourcesHtml
          ? `
        <footer class="codex-reader__sources">
          <h4>${i18n.t('codex.sources.title')}</h4>
          <ul>${sourcesHtml}</ul>
        </footer>
      `
          : ''
      }
    `;
  }

  function renderMuralsTab() {
    if (!overlayEl || !muralsListEl || !muralsDetailEl) return;
    if (muralsSubtitleEl) {
      muralsSubtitleEl.textContent = i18n.t('mural.gallery.subtitle');
    }

    const muralList = Object.values(CHAPTER_MURALS);
    const activeMural = getChapterMural(selectedMuralChapterId) || muralList[0];
    selectedMuralChapterId = activeMural.id;

    muralsListEl.innerHTML = muralList
      .map((m) => {
        const total = m.episodes.length;
        const done = m.episodes.filter((ep) => ctx.quests?.isDone?.(ep.questId)).length;
        const isSel = m.id === selectedMuralChapterId;
        const progText = i18n.t('mural.gallery.progress', { done, total });
        return `
          <button
            type="button"
            class="mural-gallery-card ${isSel ? 'is-selected' : ''} ${done === total ? 'is-complete' : ''}"
            data-mural-ch="${m.id}"
          >
            <div class="mural-gallery-card__title">${i18n.t(m.titleKey)}</div>
            <div class="mural-gallery-card__meta">
              <span>${i18n.t(m.locationKey)}</span>
              <span class="mural-gallery-card__prog">${progText}</span>
            </div>
          </button>
        `;
      })
      .join('');

    muralsListEl.querySelectorAll('[data-mural-ch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedMuralChapterId = btn.getAttribute('data-mural-ch') || 'ch1';
        renderMuralsTab();
      });
    });

    if (galleryMural) {
      galleryMural.setChapter(activeMural.id);
      galleryMural.focusOverview(true);
      galleryMural.start();
    }

    const epButtonsHtml = activeMural.episodes
      .map((ep) => {
        const isDone = Boolean(ctx.quests?.isDone?.(ep.questId));
        const isActive = Boolean(ctx.quests?.isActive?.(ep.questId));
        const cls = isDone ? 'is-painted' : isActive ? 'is-active' : 'is-sketch';
        return `
          <button type="button" class="mural-ep-btn ${cls}" data-gallery-ep="${ep.questId}">
            <span class="mural-ep-btn__num">${ep.num}</span>
            <span>${i18n.t(ep.titleKey)}</span>
          </button>
        `;
      })
      .join('');

    muralsDetailEl.innerHTML = `
      <div class="mural-gallery-detail__top">
        <div>
          <h3 class="mural-gallery-detail__title">${i18n.t(activeMural.titleKey)}</h3>
          <p class="mural-gallery-detail__narration">${i18n.t(activeMural.narrationKey)}</p>
        </div>
        <button type="button" class="mural-enter-btn" data-gallery-open="${activeMural.id}">
          📜 ${i18n.t('mural.gallery.openFull')}
        </button>
      </div>
      <div class="mural-episode-bar">
        <button type="button" class="mural-ep-btn mural-ep-btn--tool" data-gallery-overview="1">
          <span>☸</span>
          <span>${i18n.t('mural.ui.overview')}</span>
        </button>
        ${epButtonsHtml}
      </div>
    `;

    const openBtn = muralsDetailEl.querySelector('[data-gallery-open]');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const chId = openBtn.getAttribute('data-gallery-open');
        close();
        ctx.questUi?.openMuralScroll?.(chId);
      });
    }

    const overviewBtn = muralsDetailEl.querySelector('[data-gallery-overview]');
    if (overviewBtn && galleryMural) {
      overviewBtn.addEventListener('click', () => {
        galleryMural.focusOverview(false);
      });
    }

    muralsDetailEl.querySelectorAll('[data-gallery-ep]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-gallery-ep');
        if (galleryMural && qId) {
          galleryMural.playColoringReveal(qId, { duration: 2.2, immediateFocus: false });
        }
      });
    });
  }

  function switchTab(tab) {
    if (!['map', 'world', 'codex', 'murals'].includes(tab)) tab = 'map';
    activeTab = tab;
    if (!overlayEl) return;

    if (activeTab !== 'murals' && galleryMural) {
      galleryMural.stop();
    }

    overlayEl.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === activeTab);
    });
    overlayEl.querySelectorAll('[data-view]').forEach((sec) => {
      sec.classList.toggle('is-hidden', sec.getAttribute('data-view') !== activeTab);
    });

    if (activeTab === 'map') renderZoneMapTab();
    else if (activeTab === 'world') renderWorldRouteTab();
    else if (activeTab === 'codex') renderCodexTab();
    else if (activeTab === 'murals') renderMuralsTab();
  }

  function open(tab = 'map', opts = {}) {
    if (!overlayEl) return;
    isOpen = true;
    state.uiOpen = true;
    waypointTeleportMode = Boolean(opts.waypointMode);

    if (opts.codexId) {
      selectedCodexId = opts.codexId;
      activeCodexCategory = 'all';
    }
    if (tab === 'world' && !opts.keepSelectedNode) {
      selectedWorldNodeId = state.zone || 'stupa';
    }

    refreshStaticLabels();
    overlayEl.classList.remove('is-hidden');
    switchTab(tab);
    bus.emit('worldmap:opened', { tab: activeTab, waypointMode: waypointTeleportMode });
  }

  function close() {
    if (!isOpen || !overlayEl) return;
    isOpen = false;
    waypointTeleportMode = false;
    galleryMural?.stop();
    overlayEl.classList.add('is-hidden');

    // Keep state.uiOpen true if another modal (such as dialogue) is still active underneath
    const dialogueStillOpen = Boolean(ctx.dialogue?.isOpen?.());
    const questJournalOpen = Boolean(ctx.questUI?.isOpen?.());
    const inventoryOpen = Boolean(ctx.inventoryUI?.isOpen?.());
    state.uiOpen = dialogueStillOpen || questJournalOpen || inventoryOpen;

    bus.emit('worldmap:closed');
  }

  function toggle(defaultTab = 'map') {
    if (isOpen) close();
    else open(defaultTab);
  }

  // Listen to events
  bus.on('codex:open', (payload = {}) => {
    const id = payload.id || 'boudhanath';
    if (ctx.codex?.unlock) {
      ctx.codex.unlock(id);
      ctx.codex.markSeen?.(id);
    }
    open('codex', { codexId: id });
  });

  bus.on('worldmap:open', (payload = {}) => {
    open(payload.tab || 'world', {
      waypointMode: Boolean(payload.waypointMode),
      codexId: payload.codexId,
    });
  });

  bus.on('codex:changed', () => {
    if (isOpen && activeTab === 'codex') renderCodexTab();
  });

  bus.on('waypoint:changed', () => {
    if (isOpen && activeTab === 'world') renderWorldRouteTab();
  });

  i18n.onChange(() => {
    if (isOpen) {
      refreshStaticLabels();
      switchTab(activeTab);
    }
  });

  function update() {
    if (ctx.input?.pressed?.('map')) {
      toggle('map');
    } else if (isOpen && ctx.input?.pressed?.('closeUi')) {
      close();
    }
    if (isOpen && activeTab === 'map') {
      renderZoneMapTab();
    }
  }

  const api = {
    open,
    close,
    toggle,
    switchTab,
    update,
    isOpen: () => isOpen,
    getActiveTab: () => activeTab,
    getSelectedCodexId: () => selectedCodexId,
  };

  ctx.worldmap = api;
  ctx.debug?.register?.('worldmap', api);
  return api;
}
