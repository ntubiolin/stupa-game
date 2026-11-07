import '../i18n/codex.js';
import { i18n } from '../i18n.js';
import { MAPS } from '../data/maps.js';
import { createWorldMap, renderZoneRadarCanvas } from './worldmap.js';

const ZOOM_LEVELS = [45, 85]; // meters radius
const REDRAW_INTERVAL = 0.1;  // seconds (10 Hz)

function drawNorthGateHighlight(canvas, { state }, viewRadiusM) {
  if ((state.zone || 'stupa') !== 'stupa') return;
  const g = canvas.getContext('2d');
  if (!g) return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radiusPx = Math.min(cx, cy) - 4;
  const scale = radiusPx / viewRadiusM;
  const refX = state.player?.position?.x ?? 0;
  const refZ = state.player?.position?.z ?? 0;
  const gateX = cx + (0 - refX) * scale;
  const gateY = cy + (-37 - refZ) * scale;
  const pathY = cy + (-21.5 - refZ) * scale;
  const dx = gateX - cx;
  const dy = gateY - cy;
  const distance = Math.hypot(dx, dy);
  // Preserve the bearing when outside the view, leaving space for the pulse.
  const insetRadius = radiusPx - 13;
  const clampScale = distance > insetRadius ? insetRadius / distance : 1;
  const markerX = cx + dx * clampScale;
  const markerY = cy + dy * clampScale;
  const pulse = (Math.sin(performance.now() / 380) + 1) / 2;

  g.save();
  g.beginPath();
  g.arc(cx, cy, radiusPx - 1, 0, Math.PI * 2);
  g.clip();

  // Match the world radar's north-up, player-centred projection exactly.
  g.beginPath();
  g.moveTo(gateX, pathY);
  g.lineTo(gateX, gateY);
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(135, 30, 43, 0.75)';
  g.shadowColor = '#e8ad42';
  g.shadowBlur = 5;
  g.stroke();
  g.setLineDash([3, 3]);
  g.lineWidth = 1.5;
  g.strokeStyle = '#f5cd72';
  g.stroke();
  g.setLineDash([]);

  g.beginPath();
  g.arc(markerX, markerY, 8 + pulse * 3, 0, Math.PI * 2);
  g.strokeStyle = `rgba(255, 214, 112, ${0.85 - pulse * 0.35})`;
  g.lineWidth = 1.8;
  g.shadowBlur = 6 + pulse * 4;
  g.stroke();
  g.beginPath();
  g.arc(markerX, markerY, 7, 0, Math.PI * 2);
  g.fillStyle = '#511b23';
  g.fill();

  // Draw the torana ourselves so the landmark remains clear without emoji fonts.
  g.beginPath();
  g.moveTo(markerX - 4, markerY + 5);
  g.lineTo(markerX - 4, markerY - 3);
  g.moveTo(markerX + 4, markerY + 5);
  g.lineTo(markerX + 4, markerY - 3);
  g.moveTo(markerX - 6, markerY - 4);
  g.quadraticCurveTo(markerX, markerY - 1, markerX + 6, markerY - 4);
  g.moveTo(markerX - 5, markerY);
  g.lineTo(markerX + 5, markerY);
  g.strokeStyle = '#ffe6a1';
  g.lineWidth = 2;
  g.stroke();
  g.shadowBlur = 0;

  // Keep the whole bilingual pill inside the circle, including at diagonal edges.
  const lang = i18n.getLang?.() || i18n.lang || 'zh';
  const label = lang.startsWith('zh') ? '⛩️ 北門' : '⛩️ North Gate';
  g.font = 'bold 10px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const halfW = g.measureText(label).width / 2 + 7;
  const halfH = 9;
  const safeRadius = radiusPx - 3;
  const maxY = Math.sqrt(Math.max(0, safeRadius ** 2 - (halfW + 3) ** 2)) - halfH;
  const desiredY = markerY + (markerY <= cy ? 23 : -23);
  const labelY = Math.max(cy - maxY, Math.min(cy + maxY, desiredY));
  const chord = Math.sqrt(Math.max(0, safeRadius ** 2 - (Math.abs(labelY - cy) + halfH) ** 2));
  const labelX = Math.max(cx - chord + halfW, Math.min(cx + chord - halfW, markerX));
  g.beginPath();
  g.moveTo(markerX, markerY + (labelY > markerY ? 10 : -10));
  g.lineTo(labelX, labelY);
  g.strokeStyle = '#f5cd72';
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.roundRect(labelX - halfW, labelY - halfH, halfW * 2, halfH * 2, 8);
  g.fillStyle = '#36161f';
  g.fill();
  g.stroke();
  g.fillStyle = '#fff1c5';
  g.fillText(label, labelX, labelY);
  g.restore();
}

export function createMinimap(ctx) {
  if (ctx.minimap) return ctx.minimap;

  const { state, bus } = ctx;

  // Ensure the unified World Map & Codex modal is initialized
  const worldmap = ctx.worldmap || createWorldMap(ctx);

  let zoomIndex = 0; // 0 -> 45m, 1 -> 85m
  let debugMode = false;
  let redrawAccum = REDRAW_INTERVAL; // redraw immediately on first update

  const uiRoot = typeof document !== 'undefined' ? document.getElementById('ui') || document.body : null;
  const playHud = typeof document !== 'undefined' ? document.getElementById('play-hud') : null;
  const mountParent = playHud || uiRoot;

  const wrapEl = typeof document !== 'undefined' ? document.createElement('aside') : null;
  let canvasEl = null;
  let zoneLabelEl = null;
  let zoomBtnEl = null;
  let mapBtnEl = null;
  let recallBtnEl = null;

  if (wrapEl && mountParent) {
    wrapEl.id = 'minimap-wrap';
    wrapEl.className = 'minimap-wrap';
    wrapEl.setAttribute('aria-label', 'Minimap');

    wrapEl.innerHTML = `
      <div class="minimap-ring-frame" title="拖曳可移動位置 · 點擊開啟地圖與圖鑑 (M)">
        <div class="minimap-drag-handle" title="拖曳移動小地圖 / Drag to move" aria-hidden="true">⠿</div>
        <canvas id="minimap-canvas" class="minimap-canvas" width="160" height="160"></canvas>
        <div class="minimap-zone-tag" id="minimap-zone-tag"></div>
      </div>
      <div class="minimap-bar">
        <button type="button" class="minimap-pill" id="minimap-btn-open" title="Map & Codex (M)">
          <span>🗺️</span><kbd>M</kbd>
        </button>
        <button type="button" class="minimap-pill" id="minimap-btn-zoom" title="Toggle Zoom (Tab)">
          <span id="minimap-zoom-text">45m</span><kbd>Tab</kbd>
        </button>
        <button type="button" class="minimap-pill" id="minimap-btn-recall" title="Recall to Stupa (B)">
          <span>🪷</span><kbd>B</kbd>
        </button>
      </div>
    `;

    mountParent.appendChild(wrapEl);

    canvasEl = wrapEl.querySelector('#minimap-canvas');
    zoneLabelEl = wrapEl.querySelector('#minimap-zone-tag');
    zoomBtnEl = wrapEl.querySelector('#minimap-btn-zoom');
    mapBtnEl = wrapEl.querySelector('#minimap-btn-open');
    recallBtnEl = wrapEl.querySelector('#minimap-btn-recall');

    const POS_STORAGE_KEY = 'stupa.minimap.pos.v1';
    function clampAndApplyPosition(left, top) {
      if (!wrapEl || typeof window === 'undefined') return;
      const w = wrapEl.offsetWidth || 174;
      const h = wrapEl.offsetHeight || 206;
      const maxLeft = Math.max(8, window.innerWidth - w - 8);
      const maxTop = Math.max(8, window.innerHeight - h - 8);
      const clampedLeft = Math.min(Math.max(8, Math.round(left)), maxLeft);
      const clampedTop = Math.min(Math.max(8, Math.round(top)), maxTop);
      wrapEl.style.left = `${clampedLeft}px`;
      wrapEl.style.top = `${clampedTop}px`;
      wrapEl.style.right = 'auto';
      wrapEl.style.bottom = 'auto';
      return { left: clampedLeft, top: clampedTop };
    }

    // Restore saved draggable position if present
    try {
      const rawPos = localStorage.getItem(POS_STORAGE_KEY);
      if (rawPos) {
        const parsed = JSON.parse(rawPos);
        if (parsed && typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          requestAnimationFrame(() => clampAndApplyPosition(parsed.left, parsed.top));
        }
      }
    } catch {
      /* ignore storage errors */
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (wrapEl.style.left && wrapEl.style.left !== 'auto') {
          clampAndApplyPosition(parseFloat(wrapEl.style.left) || 8, parseFloat(wrapEl.style.top) || 8);
        }
      });
    }

    const frameEl = wrapEl.querySelector('.minimap-ring-frame');
    let dragState = null;
    let suppressNextClick = false;

    if (frameEl) {
      frameEl.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.stopPropagation();
        const rect = wrapEl.getBoundingClientRect();
        dragState = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          originLeft: rect.left,
          originTop: rect.top,
          moved: false,
        };
        try {
          frameEl.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      });

      frameEl.addEventListener('pointermove', (e) => {
        if (!dragState || e.pointerId !== dragState.pointerId) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        if (!dragState.moved && Math.hypot(dx, dy) > 5) {
          dragState.moved = true;
          wrapEl.classList.add('is-dragging');
        }
        if (dragState.moved) {
          e.preventDefault();
          clampAndApplyPosition(dragState.originLeft + dx, dragState.originTop + dy);
        }
      });

      const finishDrag = (e) => {
        if (!dragState || (e.pointerId !== undefined && e.pointerId !== dragState.pointerId)) return;
        const wasMoved = dragState.moved;
        dragState = null;
        wrapEl.classList.remove('is-dragging');
        try {
          frameEl.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        if (wasMoved) {
          suppressNextClick = true;
          try {
            const left = parseFloat(wrapEl.style.left);
            const top = parseFloat(wrapEl.style.top);
            if (!Number.isNaN(left) && !Number.isNaN(top)) {
              localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ left, top }));
            }
          } catch {
            /* ignore */
          }
        }
      };

      frameEl.addEventListener('pointerup', finishDrag);
      frameEl.addEventListener('pointercancel', finishDrag);

      frameEl.addEventListener('click', (e) => {
        if (suppressNextClick) {
          suppressNextClick = false;
          e.stopPropagation();
          return;
        }
        worldmap.toggle('map');
      });
    }
    if (mapBtnEl) {
      mapBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        worldmap.toggle('map');
      });
    }
    if (zoomBtnEl) {
      zoomBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleZoom();
      });
    }
    if (recallBtnEl) {
      recallBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.waypoints?.startRecall?.();
      });
    }

    // Also inject a Map/Codex button into the top-right utility bar if present
    const utilityBar = document.querySelector('.utility-bar');
    if (utilityBar && !document.getElementById('btn-map-codex-toggle')) {
      const utilBtn = document.createElement('button');
      utilBtn.id = 'btn-map-codex-toggle';
      utilBtn.type = 'button';
      utilBtn.className = 'icon-btn';
      utilBtn.setAttribute('aria-label', 'Map & Codex');
      utilBtn.title = i18n.t('hud.openMapCodex');
      utilBtn.innerHTML = '<span>🗺️</span>';
      utilBtn.addEventListener('click', () => {
        worldmap.toggle('map');
      });
      utilityBar.insertBefore(utilBtn, utilityBar.firstChild);
    }
  }

  function getZoomRadius() {
    return ZOOM_LEVELS[zoomIndex] || 45;
  }

  function updateLabels() {
    const curZone = state.zone || 'stupa';
    const mapDef = MAPS[curZone] || MAPS.stupa;
    if (zoneLabelEl) {
      zoneLabelEl.textContent = mapDef.nameKey ? i18n.t(mapDef.nameKey) : curZone;
    }
    const zoomTextEl = wrapEl?.querySelector('#minimap-zoom-text');
    if (zoomTextEl) {
      zoomTextEl.textContent = `${getZoomRadius()}m`;
    }
  }

  function toggleZoom() {
    zoomIndex = (zoomIndex + 1) % ZOOM_LEVELS.length;
    updateLabels();
    redraw();
    bus.emit('minimap:zoom', { radius: getZoomRadius(), zoomIndex });
    return getZoomRadius();
  }

  function setDebug(val) {
    debugMode = Boolean(val);
    redraw();
    return debugMode;
  }

  function redraw() {
    if (!canvasEl) return;
    renderZoneRadarCanvas(canvasEl, ctx, {
      viewRadiusM: getZoomRadius(),
      centerOnOrigin: false,
      debugAll: debugMode,
    });
    drawNorthGateHighlight(canvasEl, ctx, getZoomRadius());
  }

  bus.on('zone:change', () => {
    updateLabels();
    redraw();
  });

  bus.on('game:start', () => {
    updateLabels();
    redraw();
  });

  i18n.onChange(() => {
    updateLabels();
    redraw();
  });

  updateLabels();
  if (state.mode === 'play') redraw();

  function update(dt) {
    // Handle Tab zoom toggle
    if (ctx.input?.pressed?.('minimapZoom')) {
      toggleZoom();
    }

    // Update the World Map & Codex Modal (handles M key & Esc)
    worldmap.update(dt);

    // Hide minimap when title screen is active or HUD is hidden
    if (wrapEl && !playHud) {
      const show = state.mode === 'play' && !state.hudHidden;
      wrapEl.classList.toggle('is-hidden', !show);
    }

    // Throttle canvas redraw to every 0.1s (skip while on title screen or covered by fullscreen UI)
    redrawAccum += dt;
    if (redrawAccum >= REDRAW_INTERVAL) {
      redrawAccum = 0;
      if (state.mode === 'play' && !state.hudHidden && !state.uiOpen) {
        redraw();
      }
    }
  }

  const api = {
    update,
    redraw,
    toggleZoom,
    getZoom: getZoomRadius,
    debug: setDebug,
    isDebug: () => debugMode,
    canvas: canvasEl,
  };

  ctx.minimap = api;
  ctx.debug?.register?.('minimap', {
    debug: (bool = true) => setDebug(bool),
    toggleZoom: () => toggleZoom(),
    getZoom: () => getZoomRadius(),
    redraw: () => redraw(),
  });

  return api;
}
