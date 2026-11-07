import { getChapterMural, getMuralEpisodeByQuest } from '../../data/murals.js';

/**
 * Procedural Tibetan Temple Mural Scroll Renderer & Animation Engine (`src/ui/mural/scroll.js`).
 *
 * Combines:
 *   1. Offline-painted Tibetan mural cutout sprites (`/murals/*.webp`)
 *   2. Automatic client-side generation of `白描粉本` (chalk-primed sepia ink underdrawing)
 *      from each sprite so uncompleted quests appear as authentic mural sketches
 *   3. Procedural mineral-pigment landscape (mountain ridge dividers, scroll clouds,
 *      fish-scale wave rivers, butter lamps, liberation rays, aged plaster & cracks)
 *   4. Camera pan tour (`章節開場畫卷`) & wet-brush radial coloring reveal (`完成任務、逐段上色`)
 */

const VIRTUAL_W = 1600;
const VIRTUAL_H = 900;

const PALETTE = {
  mal: '#4e9384',
  malL: '#86bfa8',
  malD: '#2c6656',
  azu: '#2f5597',
  azuL: '#6f93c6',
  azuD: '#1f3a72',
  cin: '#b8352a',
  crim: '#7a2420',
  min: '#e07a2e',
  orp: '#e2b03f',
  och: '#a8743a',
  chalk: '#efe6d2',
  gold: '#d2a84e',
  ink: '#3a1f14',
};

// ---------------------------------------------------------------------------
// Sprite Cache & Automatic "白描粉本" (Ink Underdrawing) Generator
// ---------------------------------------------------------------------------
const spriteCache = new Map();

function buildSketchCanvas(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);

  const imgData = g.getImageData(0, 0, w, h);
  const src = imgData.data;
  const out = g.createImageData(w, h);
  const dst = out.data;

  // Compute luminance buffer for Sobel edge detection
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    const a = src[i + 3] / 255;
    const l = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    lum[p] = l * a + 255 * (1 - a);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const idx = p * 4;
      const a = src[idx + 3];
      if (a < 16) continue;

      let grad = 0;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        const gx =
          -lum[p - w - 1] + lum[p - w + 1] -
          2 * lum[p - 1] + 2 * lum[p + 1] -
          lum[p + w - 1] + lum[p + w + 1];
        const gy =
          -lum[p - w - 1] - 2 * lum[p - w] - lum[p - w + 1] +
          lum[p + w - 1] + 2 * lum[p + w] + lum[p + w + 1];
        grad = Math.abs(gx) + Math.abs(gy);
      }

      const l = lum[p];
      const darkLine = Math.max(0, Math.min(1, (112 - l) / 72));
      const edgeLine = Math.max(0, Math.min(1, (grad - 42) / 150)) * 0.85;
      const ink = Math.max(darkLine, edgeLine);

      // Blend between warm chalk underdrawing (粉本) and deep sepia ink (墨線)
      dst[idx] = Math.round(236 * (1 - ink) + 54 * ink);
      dst[idx + 1] = Math.round(225 * (1 - ink) + 29 * ink);
      dst[idx + 2] = Math.round(202 * (1 - ink) + 18 * ink);
      dst[idx + 3] = Math.round(a * (0.46 + 0.54 * ink));
    }
  }

  g.putImageData(out, 0, 0);
  return c;
}

export function ensureMuralSprite(id, onLoad) {
  if (spriteCache.has(id)) {
    const entry = spriteCache.get(id);
    if (!entry.ready && onLoad) entry.waiters.push(onLoad);
    return entry;
  }
  const entry = { id, img: null, sketch: null, ready: false, waiters: onLoad ? [onLoad] : [] };
  spriteCache.set(id, entry);

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      entry.img = img;
      entry.ready = true;
      for (const fn of entry.waiters.splice(0)) fn(entry);
    };
    img.onerror = () => {
      entry.ready = false;
    };
    img.src = `/murals/${id}.webp`;
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Cached Aged Plaster & Crack Overlay Canvas (1600 × 900)
// ---------------------------------------------------------------------------
let cachedPlasterCanvas = null;

function getPlasterOverlay() {
  if (cachedPlasterCanvas || typeof document === 'undefined') return cachedPlasterCanvas;
  const c = document.createElement('canvas');
  c.width = VIRTUAL_W;
  c.height = VIRTUAL_H;
  const g = c.getContext('2d');

  let seed = 108;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = (a, b) => a + (b - a) * rnd();

  // Subtle warm mineral blotches & soot aging
  for (let i = 0; i < 180; i++) {
    const x = R(0, VIRTUAL_W);
    const y = R(0, VIRTUAL_H);
    const r = R(40, 220);
    const warm = rnd() > 0.45;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, warm ? 'rgba(92, 58, 28, 0.045)' : 'rgba(255, 242, 210, 0.04)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Hairline plaster cracks
  g.strokeStyle = 'rgba(52, 30, 18, 0.28)';
  g.lineWidth = 1.1;
  for (let i = 0; i < 9; i++) {
    let x = R(80, VIRTUAL_W - 80);
    let y = R(60, VIRTUAL_H - 60);
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 11; k++) {
      x += R(-42, 42);
      y += R(-14, 42);
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // Aged butter-lamp smoke vignette around edges
  const vig = g.createRadialGradient(
    VIRTUAL_W * 0.5, VIRTUAL_H * 0.5, VIRTUAL_H * 0.35,
    VIRTUAL_W * 0.5, VIRTUAL_H * 0.5, VIRTUAL_W * 0.62
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(38, 20, 10, 0.36)');
  g.fillStyle = vig;
  g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

  cachedPlasterCanvas = c;
  return c;
}

// ---------------------------------------------------------------------------
// Procedural Drawing Helpers (Ridges, Clouds, Rivers, Decor, Cartouches)
// ---------------------------------------------------------------------------
function drawRidgeBand(g, ridge) {
  const { yBase, peaks } = ridge;
  for (const [px, py, hw, snow] of peaks) {
    const grad = g.createLinearGradient(px, py, px, yBase);
    grad.addColorStop(0, PALETTE.malD);
    grad.addColorStop(0.38, PALETTE.mal);
    grad.addColorStop(1, PALETTE.malL);

    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(px - hw, yBase);
    g.lineTo(px, py);
    g.lineTo(px + hw, yBase);
    g.closePath();
    g.fill();

    if (snow) {
      const sh = (yBase - py) * 0.42;
      const sw = hw * 0.42;
      g.fillStyle = PALETTE.chalk;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + sw, py + sh);
      g.quadraticCurveTo(px, py + sh * 0.78, px - sw, py + sh);
      g.closePath();
      g.fill();

      g.strokeStyle = PALETTE.azuL;
      g.lineWidth = 2.2;
      g.stroke();
    }

    // Inner Tibetan mural contour lines
    g.strokeStyle = 'rgba(44, 102, 86, 0.65)';
    g.lineWidth = 1.3;
    for (const k of [0.16, 0.32]) {
      const off = (yBase - py) * k;
      g.beginPath();
      g.moveTo(px - hw + off * 1.15, yBase);
      g.lineTo(px, py + off);
      g.lineTo(px + hw - off * 1.15, yBase);
      g.stroke();
    }

    // Outer ink ridge line
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(px - hw, yBase);
    g.lineTo(px, py);
    g.lineTo(px + hw, yBase);
    g.stroke();

    // Paired grass tufts along ridge slopes
    g.lineWidth = 1.1;
    for (let k = 0.12; k < 0.9; k += 0.11) {
      for (const side of [-1, 1]) {
        const tx = px + side * hw * k;
        const ty = py + (yBase - py) * k;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(tx - 3 * side, ty - 5);
        g.moveTo(tx, ty);
        g.lineTo(tx + 2 * side, ty - 6);
        g.stroke();
      }
    }
  }
}

function drawScrollCloud(g, cloud, time) {
  const { x, y, w, lobes = 6, scale = 1 } = cloud;
  const driftX = x + Math.sin(time * 0.45 + x * 0.01) * 8;
  const driftY = y + Math.cos(time * 0.35 + y * 0.02) * 3;

  const pts = [];
  for (let i = 0; i < lobes; i++) {
    const t = lobes > 1 ? i / (lobes - 1) : 0.5;
    const r = (15 + 11 * Math.sin(t * Math.PI)) * scale;
    const cx = driftX + t * w;
    const cy = driftY - Math.sin(t * Math.PI) * 11 * scale;
    pts.push([cx, cy, r]);
  }

  for (const [cx, cy, r] of pts) {
    const grad = g.createRadialGradient(cx, cy + r * 0.15, r * 0.25, cx, cy, r);
    grad.addColorStop(0, PALETTE.chalk);
    grad.addColorStop(0.68, PALETTE.chalk);
    grad.addColorStop(1, PALETTE.azuL);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = PALETTE.ink;
    g.lineWidth = 1.2;
    g.stroke();

    // Inner curl
    g.strokeStyle = PALETTE.azuL;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(cx, cy + r * 0.08, r * 0.48, 0.2, Math.PI * 1.35);
    g.stroke();
  }

  // Cloud tail band
  g.fillStyle = PALETTE.chalk;
  g.beginPath();
  g.moveTo(driftX - 14 * scale, driftY + 8 * scale);
  g.quadraticCurveTo(driftX + w * 0.5, driftY + 22 * scale, driftX + w + 14 * scale, driftY + 8 * scale);
  g.closePath();
  g.fill();
  g.strokeStyle = PALETTE.ink;
  g.lineWidth = 1.2;
  g.stroke();
}

function drawRiver(g, river, time) {
  const { x0, y0, x1, y1, width = 64 } = river;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);

  g.save();
  g.translate(x0, y0);
  g.rotate(ang);

  g.fillStyle = PALETTE.azu;
  g.fillRect(0, -width / 2, len, width);

  g.strokeStyle = PALETTE.ink;
  g.lineWidth = 2.0;
  g.beginPath();
  g.moveTo(0, -width / 2);
  g.lineTo(len, -width / 2);
  g.moveTo(0, width / 2);
  g.lineTo(len, width / 2);
  g.stroke();

  // Animated fish-scale wave crests (魚鱗水波)
  const rows = 4;
  const flow = (time * 18) % 28;
  g.strokeStyle = PALETTE.chalk;
  g.lineWidth = 1.5;
  for (let r = 0; r < rows; r++) {
    const yy = -width / 2 + (r + 0.6) * (width / rows);
    g.beginPath();
    for (let x = -28 + (r % 2) * 14 + flow; x < len; x += 28) {
      g.moveTo(x, yy);
      g.quadraticCurveTo(x + 7, yy - 8, x + 14, yy);
    }
    g.stroke();
  }

  g.restore();
}

function drawPath(g, pathDef) {
  const { points, width = 16 } = pathDef;
  if (!points || points.length < 2) return;
  g.save();
  g.strokeStyle = 'rgba(239, 230, 210, 0.52)';
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    g.lineTo(points[i][0], points[i][1]);
  }
  g.stroke();
  g.restore();
}

function drawEpisodeDecor(g, decorList, mode, time) {
  if (!Array.isArray(decorList)) return;
  const isSketch = mode === 'sketch';

  for (const d of decorList) {
    if (d.type === 'crackedEarth') {
      g.save();
      if (isSketch) {
        g.fillStyle = 'rgba(236, 225, 202, 0.32)';
        g.strokeStyle = PALETTE.ink;
      } else {
        const grad = g.createRadialGradient(d.x, d.y, 20, d.x, d.y, d.rx);
        grad.addColorStop(0, '#c47a45');
        grad.addColorStop(1, '#9c5531');
        g.fillStyle = grad;
        g.strokeStyle = PALETTE.ink;
      }
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // Cracks inside drought earth
      g.strokeStyle = isSketch ? 'rgba(58,31,20,0.45)' : '#5e2c18';
      g.lineWidth = 1.2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const cx = d.x + Math.cos(a) * d.rx * 0.45;
        const cy = d.y + Math.sin(a) * d.ry * 0.45;
        g.beginPath();
        g.moveTo(cx - 18, cy - 4);
        g.lineTo(cx, cy + 5);
        g.lineTo(cx + 16, cy - 2);
        g.stroke();
      }
      g.restore();
    } else if (d.type === 'springs') {
      for (const [sx, sy] of d.points || []) {
        g.save();
        g.fillStyle = isSketch ? 'rgba(236, 225, 202, 0.4)' : PALETTE.azu;
        g.strokeStyle = PALETTE.ink;
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(sx, sy, 34, 13, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        if (!isSketch) {
          g.strokeStyle = PALETTE.chalk;
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(sx - 18, sy);
          g.quadraticCurveTo(sx - 9, sy - 5, sx, sy);
          g.quadraticCurveTo(sx + 9, sy - 5, sx + 18, sy);
          g.stroke();
        }
        g.restore();
      }
    } else if (d.type === 'butterLamps') {
      const { x, y, count = 7, spacing = 32 } = d;
      for (let i = 0; i < count; i++) {
        const lx = x + i * spacing;
        const ly = y + (i % 2) * 5;
        g.save();
        g.fillStyle = isSketch ? PALETTE.chalk : PALETTE.gold;
        g.strokeStyle = PALETTE.ink;
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(lx - 7, ly);
        g.lineTo(lx + 7, ly);
        g.lineTo(lx + 3.5, ly + 7);
        g.lineTo(lx - 3.5, ly + 7);
        g.closePath();
        g.fill();
        g.stroke();

        // Flame
        const flicker = isSketch ? 0 : Math.sin(time * 7 + i * 1.3) * 1.5;
        g.fillStyle = isSketch ? 'rgba(236,225,202,0.5)' : PALETTE.min;
        g.strokeStyle = isSketch ? PALETTE.ink : PALETTE.cin;
        g.beginPath();
        g.moveTo(lx, ly - 1);
        g.quadraticCurveTo(lx - 5, ly - 8, lx + flicker * 0.4, ly - 15 - flicker);
        g.quadraticCurveTo(lx + 5, ly - 8, lx, ly - 1);
        g.fill();
        g.stroke();
        g.restore();
      }
    } else if (d.type === 'goldenAura') {
      if (isSketch) {
        g.save();
        g.strokeStyle = 'rgba(58, 31, 20, 0.35)';
        g.setLineDash([6, 6]);
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(d.x, d.y, d.r * 0.72, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      } else {
        const pulse = 1 + 0.04 * Math.sin(time * 2.2);
        const r = d.r * pulse;
        const grad = g.createRadialGradient(d.x, d.y, r * 0.15, d.x, d.y, r);
        grad.addColorStop(0, 'rgba(255, 243, 184, 0.62)');
        grad.addColorStop(0.55, 'rgba(255, 214, 102, 0.26)');
        grad.addColorStop(1, 'rgba(255, 214, 102, 0)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(d.x, d.y, r, 0, Math.PI * 2);
        g.fill();
      }
    } else if (d.type === 'liberationRays') {
      const cols = ['#f6f1e4', '#f2c14e', '#b8352a', '#4e9384', '#2f5597'];
      g.save();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.24 + Math.sin(time * 1.5 + i) * 0.02;
        g.fillStyle = isSketch ? 'rgba(236, 225, 202, 0.25)' : cols[i];
        g.globalAlpha = isSketch ? 0.5 : 0.65;
        g.beginPath();
        g.moveTo(d.x, d.y);
        g.lineTo(d.x + Math.cos(a - 0.055) * d.r, d.y + Math.sin(a - 0.055) * d.r);
        g.lineTo(d.x + Math.cos(a + 0.055) * d.r, d.y + Math.sin(a + 0.055) * d.r);
        g.closePath();
        g.fill();
        if (isSketch) {
          g.strokeStyle = 'rgba(58, 31, 20, 0.4)';
          g.lineWidth = 1;
          g.stroke();
        }
      }
      g.restore();
    } else if (d.type === 'rain') {
      g.save();
      g.strokeStyle = isSketch ? 'rgba(58, 31, 20, 0.28)' : 'rgba(145, 192, 238, 0.78)';
      g.lineWidth = 1.6;
      const offset = isSketch ? 0 : (time * 90) % 36;
      for (let i = 0; i < 42; i++) {
        const rx = d.x + ((i * 73) % d.w);
        const ry = d.y + (((i * 47) + offset) % d.h);
        g.beginPath();
        g.moveTo(rx, ry);
        g.lineTo(rx - 5, ry + 15);
        g.stroke();
      }
      g.restore();
    } else if (d.type === 'prayerFlags') {
      const { x0, y0, x1, y1 } = d;
      const cols = [PALETTE.azu, PALETTE.chalk, PALETTE.cin, PALETTE.mal, PALETTE.orp];
      g.save();
      g.strokeStyle = PALETTE.ink;
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 + 28, x1, y1);
      g.stroke();

      const steps = 16;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const fx = (1 - t) * x0 + t * x1;
        const fy = (1 - t) * y0 + t * y1 + 4 * t * (1 - t) * 28;
        g.fillStyle = isSketch ? PALETTE.chalk : cols[i % cols.length];
        g.fillRect(fx - 6, fy, 12, 14);
        g.strokeRect(fx - 6, fy, 12, 14);
      }
      g.restore();
    } else if (d.type === 'vajraCord') {
      g.save();
      g.strokeStyle = isSketch ? PALETTE.ink : PALETTE.gold;
      g.lineWidth = isSketch ? 1.8 : 3.2;
      g.beginPath();
      g.moveTo(d.x0, d.y0);
      g.quadraticCurveTo((d.x0 + d.x1) * 0.5, Math.min(d.y0, d.y1) - 38, d.x1, d.y1);
      g.stroke();
      g.restore();
    }
  }
}

function drawEpisodeSprites(g, sprites, mode, time, onAssetLoaded) {
  if (!Array.isArray(sprites)) return;
  const isSketch = mode === 'sketch';

  for (const s of sprites) {
    const entry = ensureMuralSprite(s.id, onAssetLoaded);
    if (!entry.ready || !entry.img) continue;

    if (isSketch && !s.isVision && !entry.sketch) {
      try {
        entry.sketch = buildSketchCanvas(entry.img);
      } catch {
        entry.sketch = entry.img;
      }
    }
    const source = isSketch && !s.isVision ? (entry.sketch || entry.img) : entry.img;
    const nw = entry.img.naturalWidth || entry.img.width || 1;
    const nh = entry.img.naturalHeight || entry.img.height || 1;
    const drawH = s.h || 180;
    const drawW = drawH * (nw / nh);

    g.save();
    g.translate(s.x, s.y);
    if (s.flipX) g.scale(-1, 1);

    if (s.isVision) {
      // Golden Pure Vision shimmer behind Guru Rinpoche
      g.shadowColor = 'rgba(255, 218, 95, 0.82)';
      g.shadowBlur = 20 + 6 * Math.sin(time * 2.4);
    }

    g.globalAlpha = s.alpha ?? 1.0;
    g.drawImage(source, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
    g.restore();
  }
}

function drawCartouche(g, ep, stateMode, i18n, sealScale = 1, isHighlighted = false) {
  const { x, y } = ep.cartouche || { x: ep.focus.x - 160, y: ep.focus.y + 120 };
  const title = i18n ? i18n.t(ep.titleKey) : ep.titleKey;
  const statusKey =
    stateMode === 'painted'
      ? 'mural.ui.status.painted'
      : stateMode === 'active'
      ? 'mural.ui.status.active'
      : 'mural.ui.status.sketch';
  const statusLabel = i18n ? i18n.t(statusKey) : stateMode;

  g.save();
  g.font = '700 15px "Noto Serif TC", "Songti TC", serif';
  const titleW = g.measureText(title).width;
  const badgeW = Math.max(58, statusLabel.length * 12 + 14);
  const boxW = Math.max(250, Math.min(440, titleW + badgeW + 52));
  const boxH = 44;

  // Box background
  g.fillStyle = stateMode === 'sketch' ? 'rgba(232, 222, 200, 0.82)' : 'rgba(244, 236, 216, 0.95)';
  g.strokeStyle = isHighlighted ? '#ffd86b' : stateMode === 'painted' ? PALETTE.gold : PALETTE.och;
  g.lineWidth = isHighlighted ? 3.5 : 2.5;
  g.fillRect(x, y, boxW, boxH);
  g.strokeRect(x, y, boxW, boxH);

  // Inner crimson hairline border
  g.strokeStyle = stateMode === 'sketch' ? 'rgba(58, 31, 20, 0.45)' : PALETTE.crim;
  g.lineWidth = 1.0;
  g.strokeRect(x + 3.5, y + 3.5, boxW - 7, boxH - 7);

  // Status pill on right
  const pillX = x + boxW - badgeW - 8;
  const pillY = y + 8;
  g.fillStyle =
    stateMode === 'painted'
      ? 'rgba(184, 53, 42, 0.16)'
      : stateMode === 'active'
      ? 'rgba(226, 176, 63, 0.28)'
      : 'rgba(58, 31, 20, 0.10)';
  g.fillRect(pillX, pillY, badgeW, 16);
  g.font = '600 11px "Outfit", "Noto Serif TC", sans-serif';
  g.fillStyle =
    stateMode === 'painted'
      ? PALETTE.cin
      : stateMode === 'active'
      ? '#7a4b08'
      : '#5e493a';
  g.textAlign = 'center';
  g.fillText(statusLabel, pillX + badgeW * 0.5, pillY + 12);

  // Title & Tibetan subtitle
  g.textAlign = 'left';
  g.font = '700 15px "Noto Serif TC", "Songti TC", serif';
  g.fillStyle = PALETTE.ink;
  g.fillText(title, x + 22, y + 20);

  g.font = '12px "Kailasa", "Noto Serif Tibetan", serif';
  g.fillStyle = stateMode === 'sketch' ? 'rgba(58, 31, 20, 0.65)' : PALETTE.crim;
  g.fillText(ep.tibetan || '', x + 22, y + 36);

  // Numbered circular seal medallion on left edge
  g.save();
  g.translate(x, y + boxH * 0.5);
  g.scale(sealScale, sealScale);
  g.fillStyle = stateMode === 'painted' ? PALETTE.cin : stateMode === 'active' ? PALETTE.min : '#6e5849';
  g.strokeStyle = PALETTE.gold;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(0, 0, 15, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  g.fillStyle = PALETTE.chalk;
  g.font = '700 15px "Noto Serif TC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ep.num, 0, 1);
  g.restore();

  g.restore();
}

// ---------------------------------------------------------------------------
// MuralScrollCanvas Controller Class
// ---------------------------------------------------------------------------
export class MuralScrollCanvas {
  constructor(canvas, { ctx, chapterId = 'ch1' } = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.chapterId = chapterId;
    this.mural = getChapterMural(chapterId);

    this.cam = { x: VIRTUAL_W * 0.5, y: VIRTUAL_H * 0.5, zoom: 1.0 };
    this.targetCam = { x: VIRTUAL_W * 0.5, y: VIRTUAL_H * 0.5, zoom: 1.0 };
    this.focusedEpisodeIndex = -1;

    // Active coloring animation state: { questId, progress: 0..1, duration }
    this.reveal = null;
    // Pan tour state: { active, index, timer }
    this.tour = { active: false, index: 0, timer: 0 };

    this.time = 0;
    this._raf = null;
    this._lastTs = 0;
    this._running = false;
    this._overrideStates = null; // optional Map/object questId -> 'sketch' | 'painted' | 'active'
  }

  setChapter(chapterOrMap) {
    this.mural = getChapterMural(chapterOrMap);
    this.chapterId = this.mural.id;
    if (this._running) {
      this._preloadChapterSprites();
    }
  }

  _preloadChapterSprites() {
    if (!this.mural) return;
    for (const ep of this.mural.episodes) {
      for (const s of ep.sprites || []) {
        ensureMuralSprite(s.id, () => this.renderOnce());
      }
    }
  }

  setOverrideStates(mapOrObj) {
    this._overrideStates = mapOrObj || null;
    this.renderOnce();
  }

  getEpisodeState(epOrIndexOrQuestId) {
    let ep = epOrIndexOrQuestId;
    if (typeof epOrIndexOrQuestId === 'number') {
      ep = this.mural?.episodes?.[epOrIndexOrQuestId];
    } else if (typeof epOrIndexOrQuestId === 'string') {
      ep = this.mural?.episodes?.find((e) => e.questId === epOrIndexOrQuestId) || { questId: epOrIndexOrQuestId };
    }
    if (!ep || !ep.questId) return 'sketch';
    if (this._overrideStates && ep.questId in this._overrideStates) {
      return this._overrideStates[ep.questId];
    }
    const quests = this.ctx?.quests;
    if (!quests) return 'sketch';
    if (quests.isDone?.(ep.questId)) return 'painted';
    if (quests.isActive?.(ep.questId)) return 'active';
    return 'sketch';
  }

  focusOverview(immediate = false) {
    this.tour.active = false;
    this.focusedEpisodeIndex = -1;
    this.targetCam = { x: VIRTUAL_W * 0.5, y: VIRTUAL_H * 0.5, zoom: 1.0 };
    if (immediate) {
      this.cam = { ...this.targetCam };
    }
  }

  areAllSpritesReady() {
    if (!this.mural?.episodes) return true;
    for (const ep of this.mural.episodes) {
      for (const sp of ep.sprites || []) {
        const entry = ensureMuralSprite(sp.id, () => this.renderOnce());
        if (!entry.ready) return false;
      }
    }
    return true;
  }

  focusEpisode(indexOrQuestId, immediate = false) {
    let index = indexOrQuestId;
    if (typeof indexOrQuestId === 'string') {
      index = this.mural?.episodes?.findIndex((e) => e.questId === indexOrQuestId) ?? -1;
    }
    const ep = this.mural?.episodes?.[index];
    if (!ep) {
      this.focusOverview(immediate);
      return;
    }
    this.tour.active = false;
    this.focusedEpisodeIndex = index;
    const zoom = ep.focus?.zoom ?? 1.4;
    const halfW = (VIRTUAL_W * 0.5) / zoom;
    const halfH = (VIRTUAL_H * 0.5) / zoom;
    const cx = Math.max(halfW, Math.min(VIRTUAL_W - halfW, ep.focus.x));
    const cy = Math.max(halfH, Math.min(VIRTUAL_H - halfH, ep.focus.y));
    this.targetCam = { x: cx, y: cy, zoom };
    if (immediate) {
      this.cam = { ...this.targetCam };
    }
  }

  startPanTour() {
    if (!this.mural?.episodes?.length) return;
    const ep0 = this.mural.episodes[0];
    this.focusEpisode(0, false);
    this.tour = { active: true, index: 0, timer: 0, currentQuestId: ep0?.questId || null };
  }

  playColoringReveal(questId, { duration = 2.4, immediateFocus = false, onComplete = null } = {}) {
    const idx = this.mural.episodes.findIndex((e) => e.questId === questId);
    if (idx === -1) return;
    this.tour.active = false;
    this.focusEpisode(idx, immediateFocus);
    this.reveal = {
      questId,
      index: idx,
      progress: 0,
      duration: Math.max(0.4, duration),
      onComplete,
    };
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._preloadChapterSprites();
    this._lastTs = performance.now();
    const tick = (now) => {
      if (!this._running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - this._lastTs) / 1000));
      this._lastTs = now;
      this.update(dt);
      this.draw();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this._running = false;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  renderOnce() {
    if (!this._running) {
      if (!this.canvas || (this.canvas.isConnected && !this.canvas.offsetParent)) return;
      this.draw();
    }
  }

  update(dt) {
    this.time += dt;

    // Pan tour progression
    if (this.tour.active && this.mural?.episodes?.length) {
      this.tour.timer += dt;
      if (this.tour.timer >= 2.35) {
        this.tour.timer = 0;
        this.tour.index++;
        if (this.tour.index < this.mural.episodes.length) {
          this.focusEpisode(this.tour.index, false);
          this.tour.active = true;
        } else {
          this.focusOverview(false);
        }
      }
    }

    // Smooth camera damping
    const k = 1 - Math.exp(-dt * 4.2);
    this.cam.x += (this.targetCam.x - this.cam.x) * k;
    this.cam.y += (this.targetCam.y - this.cam.y) * k;
    this.cam.zoom += (this.targetCam.zoom - this.cam.zoom) * k;

    // Coloring reveal progression
    if (this.reveal) {
      this.reveal.progress += dt / this.reveal.duration;
      if (this.reveal.progress >= 1) {
        const doneCb = this.reveal.onComplete;
        this.reveal = null;
        if (typeof doneCb === 'function') doneCb();
      }
    }
  }

  draw() {
    const canvas = this.canvas;
    if (!canvas || !this.mural) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    const cw = canvas.width;
    const ch = canvas.height;
    g.save();
    g.scale(cw / VIRTUAL_W, ch / VIRTUAL_H);

    // Apply camera pan & zoom around center of virtual canvas
    g.translate(VIRTUAL_W * 0.5, VIRTUAL_H * 0.5);
    g.scale(this.cam.zoom, this.cam.zoom);
    g.translate(-this.cam.x, -this.cam.y);

    const { theme } = this.mural;

    // 1. Ground & Sky Base
    const groundGrad = g.createLinearGradient(0, 220, 0, VIRTUAL_H);
    groundGrad.addColorStop(0, theme.groundTop || PALETTE.malD);
    groundGrad.addColorStop(1, theme.groundBot || PALETTE.mal);
    g.fillStyle = groundGrad;
    g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    const skyGrad = g.createLinearGradient(0, 0, 0, 260);
    skyGrad.addColorStop(0, theme.skyTop || PALETTE.azuD);
    skyGrad.addColorStop(1, theme.skyBot || PALETTE.azuL);
    g.fillStyle = skyGrad;
    g.fillRect(0, 0, VIRTUAL_W, 265);

    // Optional Day/Night split for Chapter 4 Samye
    if (theme.dayNightSplit) {
      const nightGrad = g.createLinearGradient(VIRTUAL_W * 0.45, 0, VIRTUAL_W * 0.65, 0);
      nightGrad.addColorStop(0, 'rgba(13, 22, 54, 0)');
      nightGrad.addColorStop(1, 'rgba(13, 22, 54, 0.82)');
      g.fillStyle = nightGrad;
      g.fillRect(0, 0, VIRTUAL_W, 265);

      // Stars on night side
      g.fillStyle = PALETTE.gold;
      for (let i = 0; i < 28; i++) {
        const sx = VIRTUAL_W * 0.55 + ((i * 97) % (VIRTUAL_W * 0.43));
        const sy = 18 + ((i * 53) % 165);
        g.beginPath();
        g.arc(sx, sy, (i % 3 === 0 ? 2.2 : 1.4), 0, Math.PI * 2);
        g.fill();
      }
    }

    // 2. Upper Ridge Band
    if (this.mural.ridges?.[0]) {
      drawRidgeBand(g, this.mural.ridges[0]);
    }

    // 3. Scroll Clouds
    for (const c of this.mural.clouds || []) {
      drawScrollCloud(g, c, this.time);
    }

    // 4. Paths & Middle Ridge Band
    for (const p of this.mural.paths || []) {
      drawPath(g, p);
    }
    for (let i = 1; i < (this.mural.ridges?.length || 0); i++) {
      drawRidgeBand(g, this.mural.ridges[i]);
    }

    // 5. Rivers
    for (const r of this.mural.rivers || []) {
      drawRiver(g, r, this.time);
    }

    // 6. Scattered Malachite Grass Tufts & Tibetan Ground Inscriptions
    g.strokeStyle = PALETTE.malD;
    g.lineWidth = 1.0;
    for (let i = 0; i < 48; i++) {
      const gx = 35 + ((i * 173) % (VIRTUAL_W - 70));
      const gy = 290 + ((i * 137) % (VIRTUAL_H - 320));
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx - 3, gy - 7);
      g.moveTo(gx, gy);
      g.lineTo(gx, gy - 9);
      g.moveTo(gx, gy);
      g.lineTo(gx + 3, gy - 7);
      g.stroke();
    }

    g.save();
    g.font = '13px "Kailasa", "Noto Serif Tibetan", serif';
    g.fillStyle = 'rgba(58, 31, 20, 0.55)';
    for (const ins of this.mural.inscriptions || []) {
      g.fillText(ins.text, ins.x, ins.y);
    }
    g.restore();

    // 7. Episodes (Sketch vs Painted vs Live Wet-Brush Coloring Reveal)
    const i18n = this.ctx?.i18n;
    const onAsset = () => this.renderOnce();

    for (let idx = 0; idx < this.mural.episodes.length; idx++) {
      const ep = this.mural.episodes[idx];
      const baseState = this.getEpisodeState(ep);
      const isRevealing = this.reveal && this.reveal.questId === ep.questId;
      const isFocused = this.focusedEpisodeIndex === idx;

      if (isRevealing) {
        const p = Math.max(0, Math.min(1, this.reveal.progress));
        const eased = 1 - Math.pow(1 - p, 3);
        const maxR = Math.hypot(ep.region?.rx || 360, ep.region?.ry || 260) * 1.15;
        const r = eased * maxR;
        const cx = ep.focus.x;
        const cy = ep.focus.y;

        // Underlayer: 白描粉本 (Sketch)
        drawEpisodeDecor(g, ep.decor, 'sketch', this.time);
        drawEpisodeSprites(g, ep.sprites, 'sketch', this.time, onAsset);

        // Clipped Overlayer: 礦物設色 (Painted) inside expanding organic wet-brush wave
        g.save();
        g.beginPath();
        const segs = 48;
        for (let s = 0; s <= segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          const wobble =
            Math.sin(a * 7 + this.time * 4) * 14 +
            Math.cos(a * 13 - this.time * 3) * 8;
          const rr = Math.max(0, r + wobble * Math.sin(p * Math.PI));
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr;
          if (s === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.clip();

        drawEpisodeDecor(g, ep.decor, 'painted', this.time);
        drawEpisodeSprites(g, ep.sprites, 'painted', this.time, onAsset);
        g.restore();

        // Advancing golden-cinnabar pigment brush rim & gold dust motes
        if (p < 0.96) {
          g.save();
          g.strokeStyle = 'rgba(242, 193, 78, 0.85)';
          g.lineWidth = 4.0 * (1 - p * 0.5);
          g.shadowColor = 'rgba(224, 122, 46, 0.85)';
          g.shadowBlur = 16;
          g.beginPath();
          for (let s = 0; s <= segs; s++) {
            const a = (s / segs) * Math.PI * 2;
            const wobble =
              Math.sin(a * 7 + this.time * 4) * 14 +
              Math.cos(a * 13 - this.time * 3) * 8;
            const rr = Math.max(0, r + wobble * Math.sin(p * Math.PI));
            const px = cx + Math.cos(a) * rr;
            const py = cy + Math.sin(a) * rr;
            if (s === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.closePath();
          g.stroke();

          // Shimmering gold leaf motes along wave-front
          g.fillStyle = '#ffe885';
          for (let m = 0; m < 18; m++) {
            const ma = (m / 18) * Math.PI * 2 + this.time * 0.9;
            const mr = r + Math.sin(m * 3.7 + this.time * 5) * 18;
            g.beginPath();
            g.arc(cx + Math.cos(ma) * mr, cy + Math.sin(ma) * mr, 2.6, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
        }

        const sealBounce =
          p < 0.65
            ? 0.85
            : 1 + 0.28 * Math.sin(((p - 0.65) / 0.35) * Math.PI);
        drawCartouche(g, ep, p > 0.5 ? 'painted' : 'sketch', i18n, sealBounce, true);
      } else {
        const renderMode = baseState === 'painted' ? 'painted' : 'sketch';

        // Subtle golden brush ring for active quest episode
        if (baseState === 'active') {
          g.save();
          const pulse = 0.35 + 0.2 * Math.sin(this.time * 3.0);
          const grad = g.createRadialGradient(
            ep.focus.x, ep.focus.y, 20,
            ep.focus.x, ep.focus.y, Math.max(ep.region?.rx || 240, 200) * 0.75
          );
          grad.addColorStop(0, `rgba(255, 224, 120, ${pulse * 0.45})`);
          grad.addColorStop(1, 'rgba(255, 224, 120, 0)');
          g.fillStyle = grad;
          g.beginPath();
          g.arc(ep.focus.x, ep.focus.y, Math.max(ep.region?.rx || 240, 200) * 0.75, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }

        drawEpisodeDecor(g, ep.decor, renderMode, this.time);
        drawEpisodeSprites(g, ep.sprites, renderMode, this.time, onAsset);
        drawCartouche(g, ep, baseState, i18n, 1.0, isFocused || baseState === 'active');
      }
    }

    // 8. Aged Plaster, Cracks & Brocade Frame
    const plaster = getPlasterOverlay();
    if (plaster) {
      g.drawImage(plaster, 0, 0);
    }

    // Brocade inner border on virtual canvas
    g.strokeStyle = '#6e1d17';
    g.lineWidth = 12;
    g.strokeRect(6, 6, VIRTUAL_W - 12, VIRTUAL_H - 12);
    g.strokeStyle = PALETTE.gold;
    g.lineWidth = 3;
    g.strokeRect(14, 14, VIRTUAL_W - 28, VIRTUAL_H - 28);
    g.strokeStyle = PALETTE.azu;
    g.lineWidth = 4;
    g.strokeRect(19, 19, VIRTUAL_W - 38, VIRTUAL_H - 38);

    g.restore();
  }
}

export { getChapterMural, getMuralEpisodeByQuest };
