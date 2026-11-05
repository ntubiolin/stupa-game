import '../i18n/codex.js';
import { i18n } from '../i18n.js';
import { MAPS } from '../data/maps.js';
import { createWorldMap, renderZoneRadarCanvas } from './worldmap.js';

const ZOOM_LEVELS = [45, 85]; // meters radius
const REDRAW_INTERVAL = 0.1;  // seconds (10 Hz)

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
      <div class="minimap-ring-frame" title="Click to open Map & Codex (M)">
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

    const frameEl = wrapEl.querySelector('.minimap-ring-frame');
    if (frameEl) {
      frameEl.addEventListener('click', () => {
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
  redraw();

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

    // Throttle canvas redraw to every 0.1s
    redrawAccum += dt;
    if (redrawAccum >= REDRAW_INTERVAL) {
      redrawAccum = 0;
      redraw();
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
