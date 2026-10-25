import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural CanvasTexture for the whitewashed dome with Boudhanath's iconic
 * saffron/turmeric lotus-petal paint arcs poured from the harmika base.
 * Mapped with top-down polar UVs: center (0.5, 0.5) = top of dome.
 */
function createDomeTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.48;

  // Base whitewashed lime plaster
  g.fillStyle = '#f5f1e8';
  g.fillRect(0, 0, size, size);

  // Subtle lime-wash concentric & mottled texture
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 26;
    const v = 238 + Math.floor(Math.random() * 15);
    g.fillStyle = `rgba(${v}, ${v - 3}, ${v - 10}, 0.14)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Helper to draw a ring of saffron lotus-petal garlands
  function drawLotusRing(innerR, outerR, petals, phaseOffset, strokeWidth, fillAlpha) {
    for (let i = 0; i < petals; i++) {
      const a0 = (i / petals) * Math.PI * 2 + phaseOffset;
      const a1 = ((i + 1) / petals) * Math.PI * 2 + phaseOffset;
      const aMid = (a0 + a1) * 0.5;

      const x0 = cx + Math.cos(a0) * innerR;
      const y0 = cy + Math.sin(a0) * innerR;
      const x1 = cx + Math.cos(a1) * innerR;
      const y1 = cy + Math.sin(a1) * innerR;

      const xTip = cx + Math.cos(aMid) * outerR;
      const yTip = cy + Math.sin(aMid) * outerR;

      const ctrlR = innerR + (outerR - innerR) * 0.78;
      const xC0 = cx + Math.cos(a0 + (aMid - a0) * 0.45) * ctrlR;
      const yC0 = cy + Math.sin(a0 + (aMid - a0) * 0.45) * ctrlR;
      const xC1 = cx + Math.cos(a1 - (a1 - aMid) * 0.45) * ctrlR;
      const yC1 = cy + Math.sin(a1 - (a1 - aMid) * 0.45) * ctrlR;

      // Soft saffron fill inside the petal
      const grad = g.createRadialGradient(cx, cy, innerR * 0.9, cx, cy, outerR);
      grad.addColorStop(0, `rgba(235, 152, 24, ${fillAlpha})`);
      grad.addColorStop(0.75, `rgba(242, 168, 30, ${fillAlpha * 0.75})`);
      grad.addColorStop(1, `rgba(230, 135, 18, ${fillAlpha * 0.15})`);

      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(xC0, yC0, xTip, yTip);
      g.quadraticCurveTo(xC1, yC1, x1, y1);
      g.closePath();
      g.fillStyle = grad;
      g.fill();

      // Rich saffron-ochre poured paint outline arc
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(xC0, yC0, xTip, yTip);
      g.quadraticCurveTo(xC1, yC1, x1, y1);
      g.strokeStyle = '#e08412';
      g.lineWidth = strokeWidth;
      g.lineCap = 'round';
      g.stroke();

      // Brighter marigold highlight core along the arc
      g.strokeStyle = '#f6ae22';
      g.lineWidth = strokeWidth * 0.52;
      g.stroke();

      // Organic paint drips at petal tips
      for (let d = -1; d <= 1; d++) {
        const da = aMid + d * 0.025 + (Math.random() - 0.5) * 0.015;
        const dripLen = (6 + Math.random() * 18) * (d === 0 ? 1.3 : 0.7);
        g.beginPath();
        g.moveTo(cx + Math.cos(da) * (outerR - 4), cy + Math.sin(da) * (outerR - 4));
        g.lineTo(cx + Math.cos(da) * (outerR + dripLen), cy + Math.sin(da) * (outerR + dripLen));
        g.strokeStyle = 'rgba(226, 136, 18, 0.75)';
        g.lineWidth = 3.5 + Math.random() * 3;
        g.stroke();
      }
    }
  }

  // Outer lower lotus ring & upper inner lotus ring
  drawLotusRing(maxR * 0.25, maxR * 0.76, 20, Math.PI / 20, 16, 0.26);
  drawLotusRing(maxR * 0.20, maxR * 0.52, 16, 0, 14, 0.38);

  // Solid saffron collar right around the harmika base
  g.beginPath();
  g.arc(cx, cy, maxR * 0.27, 0, Math.PI * 2);
  g.fillStyle = '#e89119';
  g.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Procedural CanvasTexture for the gilded Harmika face featuring the famous
 * wisdom eyes of the Buddha, the third eye (urna), and the Nepali numeral '1' nose.
 */
function createHarmikaEyesTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');

  // Rich hammered gold-leaf background
  const bgGrad = g.createLinearGradient(0, 0, 0, size);
  bgGrad.addColorStop(0, '#d89b24');
  bgGrad.addColorStop(0.5, '#f2be46');
  bgGrad.addColorStop(1, '#c9891b');
  g.fillStyle = bgGrad;
  g.fillRect(0, 0, size, size);

  // Subtle metallic panelling & rivet lines
  g.strokeStyle = 'rgba(110, 62, 8, 0.22)';
  g.lineWidth = 3;
  for (let i = 1; i < 8; i++) {
    g.beginPath();
    g.moveTo(0, (size / 8) * i);
    g.lineTo(size, (size / 8) * i);
    g.stroke();
  }

  // Top & bottom ornate Tibetan border bands (maroon, turquoise, red, gold)
  g.fillStyle = '#7c1814';
  g.fillRect(0, 0, size, 88);
  g.fillRect(0, size - 70, size, 70);

  g.fillStyle = '#d49b27';
  g.fillRect(0, 82, size, 12);
  g.fillRect(0, size - 76, size, 10);

  // Decorative jewel medallions along the top frieze
  for (let i = 0; i < 12; i++) {
    const mx = (i + 0.5) * (size / 12);
    g.fillStyle = i % 2 === 0 ? '#279396' : '#d93829';
    g.beginPath();
    g.arc(mx, 44, 18, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f7cf65';
    g.lineWidth = 4;
    g.stroke();
  }

  // Side crimson & gold pillar frames
  g.fillStyle = '#8b1e16';
  g.fillRect(0, 0, 38, size);
  g.fillRect(size - 38, 0, 38, size);
  g.strokeStyle = '#f8d26a';
  g.lineWidth = 6;
  g.strokeRect(38, 88, size - 76, size - 158);

  // Helper to draw one Buddha Eye (dir = -1 for left eye on canvas, +1 for right eye)
  function drawEye(cx, cy, dir) {
    g.save();
    g.translate(cx, cy);

    const w = 175;
    const innerX = -dir * w;
    const outerX = dir * w * 1.08;

    // 1. Sclera (luminous ivory white eye opening)
    g.beginPath();
    g.moveTo(innerX, 12);
    g.bezierCurveTo(-dir * 85, -72, dir * 75, -66, outerX, -14);
    g.bezierCurveTo(dir * 75, 58, -dir * 75, 62, innerX, 12);
    g.closePath();
    g.fillStyle = '#faf6ec';
    g.fill();

    // Clip to eye opening to draw the iris and upper half-closed eyelid
    g.save();
    g.clip();

    // Iris & pupil
    const irisX = -dir * 10;
    const irisY = -2;
    const irisGrad = g.createRadialGradient(irisX, irisY, 8, irisX, irisY, 64);
    irisGrad.addColorStop(0, '#090b10');
    irisGrad.addColorStop(0.42, '#0d1018');
    irisGrad.addColorStop(0.48, '#c88c28');
    irisGrad.addColorStop(0.82, '#222b42');
    irisGrad.addColorStop(1, '#0c1018');
    g.fillStyle = irisGrad;
    g.beginPath();
    g.arc(irisX, irisY, 64, 0, Math.PI * 2);
    g.fill();

    // Serene spec highlight on iris
    g.fillStyle = 'rgba(255, 250, 235, 0.65)';
    g.beginPath();
    g.arc(irisX - 18, irisY - 14, 9, 0, Math.PI * 2);
    g.fill();

    // Half-closed upper eyelid (golden-saffron & crimson-rimmed)
    g.beginPath();
    g.moveTo(innerX - dir * 20, 4);
    g.bezierCurveTo(-dir * 70, -24, dir * 70, -22, outerX + dir * 20, -14);
    g.lineTo(outerX + dir * 20, -110);
    g.lineTo(innerX - dir * 20, -110);
    g.closePath();
    const lidGrad = g.createLinearGradient(0, -85, 0, 5);
    lidGrad.addColorStop(0, '#c83423');
    lidGrad.addColorStop(0.55, '#e89d28');
    lidGrad.addColorStop(1, '#f5c756');
    g.fillStyle = lidGrad;
    g.fill();

    // Eyelid fold line
    g.beginPath();
    g.moveTo(innerX, 4);
    g.bezierCurveTo(-dir * 70, -24, dir * 70, -22, outerX, -14);
    g.strokeStyle = '#181412';
    g.lineWidth = 10;
    g.stroke();

    g.restore();

    // Bold sweeping black-indigo upper & lower lash outlines with upturned outer tip
    g.beginPath();
    g.moveTo(innerX - dir * 10, 14);
    g.bezierCurveTo(-dir * 85, -76, dir * 75, -70, outerX + dir * 26, -32);
    g.strokeStyle = '#141210';
    g.lineWidth = 15;
    g.lineCap = 'round';
    g.stroke();

    // Lower lid outline with subtle red-orange inner rim
    g.beginPath();
    g.moveTo(innerX, 12);
    g.bezierCurveTo(-dir * 75, 58, dir * 75, 54, outerX + dir * 12, -18);
    g.strokeStyle = '#b6291b';
    g.lineWidth = 14;
    g.stroke();

    g.beginPath();
    g.moveTo(innerX - dir * 6, 14);
    g.bezierCurveTo(-dir * 75, 64, dir * 75, 60, outerX + dir * 18, -22);
    g.strokeStyle = '#141210';
    g.lineWidth = 11;
    g.stroke();

    // Sweeping brow arch above the eye
    g.beginPath();
    g.moveTo(innerX + dir * 10, -48);
    g.bezierCurveTo(-dir * 70, -124, dir * 80, -118, outerX + dir * 18, -56);
    g.strokeStyle = '#1c1815';
    g.lineWidth = 10;
    g.stroke();

    g.restore();
  }

  drawEye(size * 0.275, size * 0.44, -1);
  drawEye(size * 0.725, size * 0.44, 1);

  // 2. Third Eye (Urna) between the brows
  const urnaX = size * 0.5;
  const urnaY = size * 0.235;
  const urnaGrad = g.createRadialGradient(urnaX - 6, urnaY - 6, 4, urnaX, urnaY, 52);
  urnaGrad.addColorStop(0, '#fff3c4');
  urnaGrad.addColorStop(0.35, '#e63926');
  urnaGrad.addColorStop(0.78, '#8a140e');
  urnaGrad.addColorStop(1, '#181210');
  g.fillStyle = urnaGrad;
  g.beginPath();
  g.arc(urnaX, urnaY, 52, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#f8d268';
  g.lineWidth = 6;
  g.stroke();

  // 3. Curled Nepali Numeral '१' (1) Nose Symbol (Unity / Ek)
  g.save();
  g.translate(size * 0.5, size * 0.52);

  g.beginPath();
  // Start at top bulb between the eyes, curl counter-clockwise at top, sweep down into S-curve tail
  g.moveTo(-8, -32);
  g.bezierCurveTo(-56, -78, 58, -82, 42, -18);
  g.bezierCurveTo(30, 32, -26, 95, -8, 175);
  g.bezierCurveTo(6, 235, 58, 255, 76, 222);
  g.bezierCurveTo(62, 278, -24, 268, -42, 186);
  g.bezierCurveTo(-58, 112, -4, 34, 6, -12);
  g.bezierCurveTo(12, -38, -22, -40, -8, -32);
  g.closePath();

  g.fillStyle = '#fcf8ee';
  g.fill();
  g.strokeStyle = '#161311';
  g.lineWidth = 12;
  g.lineJoin = 'round';
  g.stroke();

  // Top curl center dot
  g.fillStyle = '#c82b1d';
  g.beginPath();
  g.arc(4, -38, 13, 0, Math.PI * 2);
  g.fill();

  g.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Procedural copper/gold embossed prayer wheel texture with stylized Tibetan
 * Lantsa/Uchen mantra bands ("Om Mani Padme Hum").
 */
function createPrayerWheelTexture() {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');

  // Warm hammered copper-gold gradient
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5a381e');
  grad.addColorStop(0.12, '#d89b38');
  grad.addColorStop(0.22, '#a85c24');
  grad.addColorStop(0.5, '#c9782e');
  grad.addColorStop(0.78, '#a85c24');
  grad.addColorStop(0.88, '#d89b38');
  grad.addColorStop(1, '#5a381e');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // Embossed horizontal rings
  g.fillStyle = '#f2c15a';
  g.fillRect(0, 28, w, 10);
  g.fillRect(0, 122, w, 12);
  g.fillRect(0, h - 38, w, 10);

  // Stylized sacred mantra glyphs along two bands
  g.strokeStyle = '#f7d278';
  g.lineWidth = 4;
  const cols = 8;
  const colW = w / cols;
  for (const bandY of [76, 178]) {
    // Top Tibetan head-bar (Uchen line)
    g.beginPath();
    g.moveTo(0, bandY - 18);
    g.lineTo(w, bandY - 18);
    g.stroke();

    for (let i = 0; i < cols; i++) {
      const x = i * colW + 8;
      g.beginPath();
      g.moveTo(x, bandY - 18);
      g.lineTo(x, bandY + 14);
      g.quadraticCurveTo(x + colW * 0.35, bandY + 22, x + colW * 0.55, bandY - 2);
      g.moveTo(x + colW * 0.3, bandY - 18);
      g.lineTo(x + colW * 0.65, bandY + 16);
      g.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/**
 * Creates a 20-corner stepped mandala cross-square 2D THREE.Shape of half-width `w`.
 */
function createMandalaShape(w) {
  const s = new THREE.Shape();
  const a = w * 0.36; // cardinal inner corner
  const b = w * 0.62; // intermediate step
  const c = w * 0.80; // main square corner
  const d = w * 0.91; // intermediate step outer reach
  const e = w * 1.00; // cardinal outer reach

  // Trace perimeter counter-clockwise starting in quadrant (+X, +Y)
  const pts = [
    [e, a], [d, a], [d, b], [c, b], [c, c], [b, c], [b, d], [a, d], [a, e],
    [-a, e], [-a, d], [-b, d], [-b, c], [-c, c], [-c, b], [-d, b], [-d, a], [-e, a],
    [-e, -a], [-d, -a], [-d, -b], [-c, -b], [-c, -c], [-b, -c], [-b, -d], [-a, -d], [-a, -e],
    [a, -e], [a, -d], [b, -d], [b, -c], [c, -c], [c, -b], [d, -b], [d, -a], [e, -a],
  ];

  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    s.lineTo(pts[i][0], pts[i][1]);
  }
  s.closePath();
  return s;
}

/**
 * Helper to extrude a 2D shape horizontally on the XZ plane from y = y0 to y0 + height.
 */
function createMandalaSlabGeometry(halfWidth, height, y0) {
  const shape = createMandalaShape(halfWidth);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.04,
  });
  // ExtrudeGeometry extrudes along +Z; rotate -90 deg around X so it extrudes along +Y
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0, 0);
  return geo;
}

export function createStupa(ctx) {
  const { scene, state, config, colliders, bus } = ctx;
  const S = config.STUPA;
  const W = config.WALL;

  const root = new THREE.Group();
  root.name = 'BoudhanathStupa';
  scene.add(root);

  // Push circular stupa boundary collider
  colliders.push({
    type: 'circle',
    x: 0,
    z: 0,
    r: config.WORLD.stupaColliderRadius,
  });

  // ---------------------------------------------------------------- Materials
  const whitewashMat = new THREE.MeshStandardMaterial({
    color: 0xdcd5c8,
    roughness: 0.92,
    metalness: 0.01,
  });

  const ochreTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd98829,
    roughness: 0.65,
    metalness: 0.08,
  });

  const maroonMat = new THREE.MeshStandardMaterial({
    color: 0x7b1e19,
    roughness: 0.62,
    metalness: 0.05,
  });

  const slateStoneMat = new THREE.MeshStandardMaterial({
    color: 0x6b6761,
    roughness: 0.85,
    metalness: 0.05,
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3b2316,
    roughness: 0.78,
    metalness: 0.05,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4be44,
    roughness: 0.24,
    metalness: 0.88,
  });

  const domeMat = new THREE.MeshStandardMaterial({
    map: createDomeTexture(),
    color: 0xe2dbd0,
    roughness: 0.90,
    metalness: 0.01,
  });

  const harmikaEyeMat = new THREE.MeshStandardMaterial({
    map: createHarmikaEyesTexture(),
    roughness: 0.32,
    metalness: 0.68,
  });

  const wheelMat = new THREE.MeshStandardMaterial({
    map: createPrayerWheelTexture(),
    roughness: 0.34,
    metalness: 0.78,
  });

  // ---------------------------------------------------------------- 1. Three Whitewashed Mandala Terraces
  const whiteGeos = [];
  const ochreGeos = [];
  const maroonGeos = [];
  const stoneGeos = [];
  const goldGeos = [];

  const tierRadii = [S.baseHalf, S.baseHalf - 1.75, S.baseHalf - 3.5]; // 13.0, 11.25, 9.5
  const tierTopY = S.tierCount * S.tierHeight; // 4.8

  for (let t = 0; t < S.tierCount; t++) {
    const y0 = t * S.tierHeight;
    const w = tierRadii[t];

    // Main whitewashed mandala tier body
    whiteGeos.push(createMandalaSlabGeometry(w, S.tierHeight - 0.14, y0));

    // Ochre/terracotta cornice ledge at top of tier
    ochreGeos.push(createMandalaSlabGeometry(w + 0.14, 0.14, y0 + S.tierHeight - 0.14));

    // Low whitewashed parapet rim on the outer edge of each terrace
    const parapetOffsets = [w * 0.79, -w * 0.79];
    for (const sign of [-1, 1]) {
      const pLen = w * 0.42;
      const p1 = new THREE.BoxGeometry(pLen, 0.32, 0.26);
      p1.translate(sign * w * 0.58, y0 + S.tierHeight + 0.16, parapetOffsets[0]);
      whiteGeos.push(p1);

      const p2 = new THREE.BoxGeometry(pLen, 0.32, 0.26);
      p2.translate(sign * w * 0.58, y0 + S.tierHeight + 0.16, parapetOffsets[1]);
      whiteGeos.push(p2);

      const p3 = new THREE.BoxGeometry(0.26, 0.32, pLen);
      p3.translate(parapetOffsets[0], y0 + S.tierHeight + 0.16, sign * w * 0.58);
      whiteGeos.push(p3);

      const p4 = new THREE.BoxGeometry(0.26, 0.32, pLen);
      p4.translate(parapetOffsets[1], y0 + S.tierHeight + 0.16, sign * w * 0.58);
      whiteGeos.push(p4);
    }

    // Small recessed devotional niches on the cardinal & intermediate faces
    for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
      const rot = (dirIdx * Math.PI) / 2;
      for (const offset of [-w * 0.5, w * 0.5]) {
        const niche = new THREE.BoxGeometry(0.75, 0.85, 0.18);
        niche.translate(offset, y0 + S.tierHeight * 0.52, w * 0.91);
        niche.rotateY(rot);
        maroonGeos.push(niche);
      }
    }
  }

  // Four corner miniature chortens (small white stupas with golden spires on the 1st terrace corners)
  const cornerDist = tierRadii[0] * 0.74;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = sx * cornerDist;
      const cz = sz * cornerDist;
      const baseY = S.tierHeight;

      const cBase = new THREE.BoxGeometry(1.5, 0.9, 1.5);
      cBase.translate(cx, baseY + 0.45, cz);
      whiteGeos.push(cBase);

      const cDome = new THREE.SphereGeometry(0.68, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
      cDome.translate(cx, baseY + 0.9, cz);
      whiteGeos.push(cDome);

      const cSpire = new THREE.ConeGeometry(0.32, 1.15, 8);
      cSpire.translate(cx, baseY + 1.95, cz);
      goldGeos.push(cSpire);
    }
  }

  // Cardinal staircases leading up the 3 terraces (grandest on North -Z side)
  for (let d = 0; d < 4; d++) {
    const rot = (d * Math.PI) / 2;
    const isNorth = d === 2; // rot = PI puts +Z geometry onto -Z (North)
    const stairW = isNorth ? 2.8 : 2.1;

    for (let t = 0; t < S.tierCount; t++) {
      const y0 = t * S.tierHeight;
      const w = tierRadii[t];
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        const sh = ((s + 1) / steps) * S.tierHeight;
        const stepDepth = 0.34;
        const zPos = w + (steps - s) * stepDepth * 0.85;
        const stepGeo = new THREE.BoxGeometry(stairW, sh, stepDepth);
        stepGeo.translate(0, y0 + sh * 0.5, zPos);
        stepGeo.rotateY(rot);
        stoneGeos.push(stepGeo);
      }

      // Stepped whitewashed flank walls along the stairs
      for (const side of [-1, 1]) {
        const ramp = new THREE.BoxGeometry(0.32, S.tierHeight * 0.85, 1.55);
        ramp.translate(side * (stairW * 0.5 + 0.16), y0 + S.tierHeight * 0.45, w + 0.65);
        ramp.rotateY(rot);
        whiteGeos.push(ramp);
      }
    }
  }

  // Circular drum plinth under the dome (y = 4.8 to 5.45)
  const drumWhite = new THREE.CylinderGeometry(S.domeRadius + 0.38, S.domeRadius + 0.52, 0.55, 48);
  drumWhite.translate(0, tierTopY + 0.275, 0);
  whiteGeos.push(drumWhite);

  const drumTrim = new THREE.CylinderGeometry(S.domeRadius + 0.45, S.domeRadius + 0.45, 0.16, 48);
  drumTrim.translate(0, tierTopY + 0.56, 0);
  ochreGeos.push(drumTrim);

  // ---------------------------------------------------------------- 2. Great Whitewashed Dome with Saffron Lotus Petals
  const domeGeo = new THREE.SphereGeometry(S.domeRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const domeScaleY = 0.80;
  domeGeo.scale(1, domeScaleY, 1);

  // Remap UVs to top-down polar projection so the saffron lotus petals radiate cleanly from the crown
  const posAttr = domeGeo.attributes.position;
  const uvAttr = domeGeo.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const u = 0.5 + (vx / S.domeRadius) * 0.47;
    const v = 0.5 + (vz / S.domeRadius) * 0.47;
    uvAttr.setXY(i, u, v);
  }
  uvAttr.needsUpdate = true;

  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.position.y = tierTopY + 0.35;
  domeMesh.castShadow = true;
  domeMesh.receiveShadow = true;
  root.add(domeMesh);

  // ---------------------------------------------------------------- 3. Gilded Harmika with Buddha Eyes on All 4 Sides
  const harmikaBaseY = tierTopY + S.domeRadius * domeScaleY - 0.15; // ~11.85
  const harmikaCenterY = harmikaBaseY + S.harmikaHeight * 0.5;

  // Lower white & maroon collar beneath harmika
  const harmikaPlinth = new THREE.BoxGeometry(S.harmikaSize + 0.55, 0.45, S.harmikaSize + 0.55);
  harmikaPlinth.translate(0, harmikaBaseY + 0.15, 0);
  whiteGeos.push(harmikaPlinth);

  const harmikaGeo = new THREE.BoxGeometry(S.harmikaSize, S.harmikaHeight, S.harmikaSize);
  // Material order for BoxGeometry: [+X, -X, +Y, -Y, +Z, -Z]
  const harmikaMaterials = [
    harmikaEyeMat,
    harmikaEyeMat,
    goldMat,
    goldMat,
    harmikaEyeMat,
    harmikaEyeMat,
  ];
  const harmikaMesh = new THREE.Mesh(harmikaGeo, harmikaMaterials);
  harmikaMesh.position.y = harmikaCenterY;
  harmikaMesh.castShadow = true;
  harmikaMesh.receiveShadow = true;
  root.add(harmikaMesh);

  // Ornate cornice & fabric valance above the Buddha eyes
  const harmikaTopY = harmikaBaseY + S.harmikaHeight; // ~15.85
  const cornice1 = new THREE.BoxGeometry(S.harmikaSize + 0.55, 0.28, S.harmikaSize + 0.55);
  cornice1.translate(0, harmikaTopY + 0.14, 0);
  goldGeos.push(cornice1);

  const cornice2 = new THREE.BoxGeometry(S.harmikaSize + 0.82, 0.24, S.harmikaSize + 0.82);
  cornice2.translate(0, harmikaTopY + 0.38, 0);
  maroonGeos.push(cornice2);

  const cornice3 = new THREE.BoxGeometry(S.harmikaSize + 0.96, 0.22, S.harmikaSize + 0.96);
  cornice3.translate(0, harmikaTopY + 0.58, 0);
  goldGeos.push(cornice3);

  // ---------------------------------------------------------------- 4. 13-Step Golden Spire & Umbrella Canopy (to y = 26..29)
  const spireBaseY = harmikaTopY + 0.68; // ~16.53
  const spireTotalH = S.spireTop - spireBaseY; // ~9.47m across 13 steps
  const numSteps = 13;
  const stepH = spireTotalH / numSteps;

  for (let i = 0; i < numSteps; i++) {
    const t = i / (numSteps - 1);
    const rBottom = THREE.MathUtils.lerp(2.45, 0.92, t);
    const rTop = rBottom * 0.92;
    const sy = spireBaseY + i * stepH;

    // Dark recessed collar under each golden ring for crisp step definition
    const collar = new THREE.CylinderGeometry(rBottom * 0.88, rBottom * 0.88, stepH * 0.28, 24);
    collar.translate(0, sy + stepH * 0.14, 0);
    maroonGeos.push(collar);

    // Gilded step ring
    const ring = new THREE.CylinderGeometry(rTop, rBottom, stepH * 0.74, 24);
    ring.translate(0, sy + stepH * 0.63, 0);
    goldGeos.push(ring);
  }

  // Four ornate gilded triangular scroll struts flanking the spire
  for (let d = 0; d < 4; d++) {
    const rot = (d * Math.PI) / 2;
    const strut = new THREE.BoxGeometry(0.22, spireTotalH * 0.96, 0.55);
    // Tilt strut inward (+X rotation tilts top toward -Z / center) to follow spire taper
    strut.rotateX(0.145);
    strut.translate(0, spireBaseY + spireTotalH * 0.47, 1.82);
    strut.rotateY(rot);
    goldGeos.push(strut);
  }

  // Pinnacle neck, Umbrella Canopy (Chattra), Moon/Sun/Jewel Finial (y = 26 to 29)
  const neckH = 0.85;
  const neck = new THREE.CylinderGeometry(0.52, 0.72, neckH, 20);
  neck.translate(0, S.spireTop + neckH * 0.5, 0);
  goldGeos.push(neck);

  const canopyY = S.spireTop + neckH; // ~26.85
  const canopyCone = new THREE.ConeGeometry(2.15, 0.65, 32, 1, true);
  canopyCone.translate(0, canopyY + 0.32, 0);
  goldGeos.push(canopyCone);

  const canopyRim = new THREE.CylinderGeometry(2.18, 2.12, 0.24, 32);
  canopyRim.translate(0, canopyY - 0.05, 0);
  goldGeos.push(canopyRim);

  const canopyUnderside = new THREE.CylinderGeometry(2.05, 0.55, 0.18, 24);
  canopyUnderside.translate(0, canopyY - 0.08, 0);
  maroonGeos.push(canopyUnderside);

  // Hanging golden fringe pendants around the umbrella rim
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const tassel = new THREE.ConeGeometry(0.08, 0.36, 6);
    tassel.rotateX(Math.PI);
    tassel.translate(Math.cos(a) * 2.1, canopyY - 0.32, Math.sin(a) * 2.1);
    goldGeos.push(tassel);
  }

  // Finial (Lotus base + Crescent Moon + Sun Disc + Jewel Top at y = S.pinnacleTop = 29)
  const finialStem = new THREE.CylinderGeometry(0.14, 0.38, 1.15, 16);
  finialStem.translate(0, canopyY + 1.05, 0);
  goldGeos.push(finialStem);

  const crescent = new THREE.TorusGeometry(0.38, 0.08, 8, 20, Math.PI * 1.15);
  crescent.rotateZ(Math.PI * 0.92);
  crescent.translate(0, S.pinnacleTop - 0.72, 0);
  goldGeos.push(crescent);

  const sunOrb = new THREE.SphereGeometry(0.28, 16, 12);
  sunOrb.translate(0, S.pinnacleTop - 0.42, 0);
  goldGeos.push(sunOrb);

  const jewelTip = new THREE.ConeGeometry(0.16, 0.42, 12);
  jewelTip.translate(0, S.pinnacleTop - 0.12, 0);
  goldGeos.push(jewelTip);

  // ---------------------------------------------------------------- 5. Circular Perimeter Wall & North Gate Archway
  const gateAngle = (W.gateAngleDeg * Math.PI) / 180; // -PI/2 (North, -Z)
  const gateHalfSpan = 0.135; // ~7.7 deg each side -> ~5.1m gate opening
  const wallArcSpan = Math.PI * 2 - gateHalfSpan * 2;
  const wallStartAngle = gateAngle + gateHalfSpan;
  const wallSegs = 64;

  // Build curved wall geometry along the arc outside the gate
  const rInner = W.radius - W.thickness * 0.5;
  const rOuter = W.radius + W.thickness * 0.5;
  const rNicheInner = W.radius + W.thickness * 0.08;

  for (let s = 0; s < wallSegs; s++) {
    const a0 = wallStartAngle + (s / wallSegs) * wallArcSpan;
    const a1 = wallStartAngle + ((s + 1) / wallSegs) * wallArcSpan;
    const aMid = (a0 + a1) * 0.5;
    const segLen = (a1 - a0) * W.radius + 0.04;

    // Lower whitewashed wall base (y = 0 to 0.38)
    const baseBox = new THREE.BoxGeometry(W.thickness, 0.38, segLen);
    baseBox.translate(W.radius, 0.19, 0);
    baseBox.rotateY(-aMid);
    whiteGeos.push(baseBox);

    // Recessed dark-maroon backing wall behind the prayer wheels (y = 0.38 to 1.15)
    const backBox = new THREE.BoxGeometry(W.thickness * 0.55, 0.77, segLen);
    backBox.translate(rInner + W.thickness * 0.275, 0.765, 0);
    backBox.rotateY(-aMid);
    maroonGeos.push(backBox);

    // Upper whitewashed lintel & sloped terracotta eave roof (y = 1.15 to 1.48)
    const topBox = new THREE.BoxGeometry(W.thickness + 0.24, 0.22, segLen + 0.02);
    topBox.translate(W.radius + 0.04, 1.26, 0);
    topBox.rotateY(-aMid);
    ochreGeos.push(topBox);

    const roofCap = new THREE.BoxGeometry(W.thickness + 0.36, 0.14, segLen + 0.03);
    roofCap.translate(W.radius + 0.06, 1.42, 0);
    roofCap.rotateY(-aMid);
    stoneGeos.push(roofCap);
  }

  // Grand North Gate (Torana archway at gateAngle = -PI/2, i.e., x = 0, z = -W.radius)
  const gateZ = -W.radius;
  const gatePillarX = Math.sin(gateHalfSpan) * W.radius; // ~2.55m
  for (const side of [-1, 1]) {
    const px = side * gatePillarX;
    const pillar = new THREE.BoxGeometry(0.95, 3.6, 0.95);
    pillar.translate(px, 1.8, gateZ);
    whiteGeos.push(pillar);

    const pillarCap = new THREE.BoxGeometry(1.15, 0.45, 1.15);
    pillarCap.translate(px, 3.75, gateZ);
    maroonGeos.push(pillarCap);
  }

  // Multi-tiered gate lintel and pagoda roof
  const gateSpanW = gatePillarX * 2 + 1.5;
  const gateBeam1 = new THREE.BoxGeometry(gateSpanW, 0.52, 1.15);
  gateBeam1.translate(0, 4.15, gateZ);
  maroonGeos.push(gateBeam1);

  const gateRoof1 = new THREE.BoxGeometry(gateSpanW + 0.9, 0.28, 1.65);
  gateRoof1.translate(0, 4.55, gateZ);
  ochreGeos.push(gateRoof1);

  const gateBeam2 = new THREE.BoxGeometry(gateSpanW * 0.76, 0.48, 0.95);
  gateBeam2.translate(0, 4.92, gateZ);
  whiteGeos.push(gateBeam2);

  const gateRoof2 = new THREE.BoxGeometry(gateSpanW * 0.88, 0.28, 1.4);
  gateRoof2.translate(0, 5.28, gateZ);
  ochreGeos.push(gateRoof2);

  // Golden Dharma Wheel (Dharmachakra) atop the North Gate
  const chakraRing = new THREE.TorusGeometry(0.52, 0.08, 8, 20);
  chakraRing.translate(0, 5.95, gateZ);
  goldGeos.push(chakraRing);

  const chakraHub = new THREE.SphereGeometry(0.16, 10, 8);
  chakraHub.translate(0, 5.95, gateZ);
  goldGeos.push(chakraHub);

  // Merge static stupa geometries by material for low draw calls
  function addMerged(geos, mat, castShadow = true, receiveShadow = true) {
    if (!geos.length) return;
    const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(nonIndexed, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    root.add(mesh);
  }

  addMerged(whiteGeos, whitewashMat, true, true);
  addMerged(ochreGeos, ochreTrimMat, true, true);
  addMerged(maroonGeos, maroonMat, true, true);
  addMerged(stoneGeos, slateStoneMat, true, true);
  addMerged(goldGeos, goldMat, true, false);

  // ---------------------------------------------------------------- 6. 108 Prayer Wheels on the Outer Wall Face
  const wheelCount = W.wheelCount; // 108
  const wheelR = rOuter - 0.02; // 19.28m (outer face of wall, within 1.3m of player at r=20.25)
  const wheelY = 0.76;

  // Build single prayer wheel geometry (cylinder barrel + top/bottom beveled caps)
  const barrelGeo = new THREE.CylinderGeometry(0.145, 0.145, 0.52, 16, 1, false);
  const topCapGeo = new THREE.CylinderGeometry(0.11, 0.165, 0.07, 16);
  topCapGeo.translate(0, 0.285, 0);
  const botCapGeo = new THREE.CylinderGeometry(0.165, 0.11, 0.07, 16);
  botCapGeo.translate(0, -0.285, 0);
  const singleWheelGeo = mergeGeometries([barrelGeo, topCapGeo, botCapGeo], false);

  const wheelInstanced = new THREE.InstancedMesh(singleWheelGeo, wheelMat, wheelCount);
  wheelInstanced.castShadow = true;
  wheelInstanced.receiveShadow = true;
  root.add(wheelInstanced);

  // Wooden niche dividers between wheels (instanced)
  const postGeo = new THREE.BoxGeometry(0.16, 0.77, 0.06);
  const postInstanced = new THREE.InstancedMesh(postGeo, darkWoodMat, wheelCount);
  root.add(postInstanced);

  const wheels = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < wheelCount; i++) {
    const frac = (i + 0.5) / wheelCount;
    const theta = wallStartAngle + frac * wallArcSpan;
    const wx = Math.cos(theta) * wheelR;
    const wz = Math.sin(theta) * wheelR;

    wheels.push({
      x: wx,
      z: wz,
      theta,
      spinAngle: (i * 0.7) % (Math.PI * 2),
      angVel: 0,
      lastMeritAt: -10,
    });

    dummy.position.set(wx, wheelY, wz);
    dummy.rotation.set(0, -theta + wheels[i].spinAngle, 0);
    dummy.updateMatrix();
    wheelInstanced.setMatrixAt(i, dummy.matrix);

    // Niche divider post next to each wheel
    const postTheta = wallStartAngle + (i / wheelCount) * wallArcSpan;
    dummy.position.set(Math.cos(postTheta) * (wheelR - 0.04), wheelY, Math.sin(postTheta) * (wheelR - 0.04));
    dummy.rotation.set(0, -postTheta, 0);
    dummy.updateMatrix();
    postInstanced.setMatrixAt(i, dummy.matrix);
  }
  wheelInstanced.instanceMatrix.needsUpdate = true;
  postInstanced.instanceMatrix.needsUpdate = true;

  // ---------------------------------------------------------------- 7. Flag Anchors & Night String Lights
  const lineCount = 24;
  const flagLines = [];
  const anchorEnds = [];
  const topAnchorPos = new THREE.Vector3(0, S.spireTop - 0.35, 0);

  // 24 radial catenary lines from spire top / harmika out to the perimeter wall & outer terrace
  // Keep angles near 0, PI/2, PI, -PI/2 slightly clear of the 4 Buddha Eye faces so the eyes are unobstructed
  const poleGeos = [];
  for (let i = 0; i < lineCount; i++) {
    const a = (i / lineCount) * Math.PI * 2 + Math.PI / lineCount;
    const isUpper = i % 2 === 0;
    const startR = isUpper ? 1.05 : S.harmikaSize * 0.64;
    const startY = isUpper ? S.spireTop - 0.35 : harmikaTopY + 0.55;
    const start = new THREE.Vector3(Math.cos(a) * startR, startY, Math.sin(a) * startR);

    const endR = W.radius + 0.08;
    const endY = 3.2 + (i % 3) * 0.35;
    const end = new THREE.Vector3(Math.cos(a) * endR, endY, Math.sin(a) * endR);

    const sag = isUpper ? 2.1 : 1.45;
    flagLines.push({
      start,
      end,
      sag,
      flagCount: isUpper ? 38 : 28,
    });
    anchorEnds.push(end);

    // Slim wooden anchor post on top of the perimeter wall for this flag line
    const postH = endY - 1.38;
    const pole = new THREE.CylinderGeometry(0.045, 0.06, postH, 6);
    pole.translate(end.x, 1.38 + postH * 0.5, end.z);
    poleGeos.push(pole);
  }
  addMerged(poleGeos, darkWoodMat, true, false);

  // 4 tall plaza prayer-flag poles (darchor) at intercardinal angles outside stupaColliderRadius
  const darchorRadius = 35.8;
  const darchors = [
    { angle: Math.PI * 0.22, x: Math.cos(Math.PI * 0.22) * darchorRadius, z: Math.sin(Math.PI * 0.22) * darchorRadius },
    { angle: Math.PI * 0.78, x: Math.cos(Math.PI * 0.78) * darchorRadius, z: Math.sin(Math.PI * 0.78) * darchorRadius },
    { angle: -Math.PI * 0.78, x: Math.cos(-Math.PI * 0.78) * darchorRadius, z: Math.sin(-Math.PI * 0.78) * darchorRadius },
    { angle: -Math.PI * 0.22, x: Math.cos(-Math.PI * 0.22) * darchorRadius, z: Math.sin(-Math.PI * 0.22) * darchorRadius },
  ];

  // Collect positions for warm night string-light bulbs along radial lines, harmika cornice & terrace edges
  const bulbPositions = [];
  const tempVec = new THREE.Vector3();

  // Bulbs along the 12 upper radial strands
  for (let i = 0; i < lineCount; i += 2) {
    const line = flagLines[i];
    const bulbsOnLine = 18;
    for (let b = 1; b < bulbsOnLine; b++) {
      const u = b / bulbsOnLine;
      tempVec.lerpVectors(line.start, line.end, u);
      tempVec.y -= 4 * line.sag * u * (1 - u);
      bulbPositions.push(tempVec.clone());
    }
  }

  // Bulbs ringing the harmika cornice
  const hHalf = S.harmikaSize * 0.5 + 0.52;
  const hBulbY = harmikaTopY + 0.42;
  for (let side = 0; side < 4; side++) {
    const rot = (side * Math.PI) / 2;
    for (let k = -4; k <= 4; k++) {
      const p = new THREE.Vector3((k / 4.5) * hHalf, hBulbY, hHalf).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
      bulbPositions.push(p);
    }
  }

  // Bulbs ringing the dome drum & perimeter wall eaves
  const drumBulbCount = 48;
  for (let i = 0; i < drumBulbCount; i++) {
    const a = (i / drumBulbCount) * Math.PI * 2;
    bulbPositions.push(new THREE.Vector3(Math.cos(a) * (S.domeRadius + 0.5), tierTopY + 0.58, Math.sin(a) * (S.domeRadius + 0.5)));
  }

  const wallBulbCount = 72;
  for (let i = 0; i <= wallBulbCount; i++) {
    const a = wallStartAngle + (i / wallBulbCount) * wallArcSpan;
    bulbPositions.push(new THREE.Vector3(Math.cos(a) * (W.radius + 0.46), 1.38, Math.sin(a) * (W.radius + 0.46)));
  }

  const bulbGeo = new THREE.SphereGeometry(0.068, 8, 6);
  const bulbMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.45, 0.38, 0.28),
    toneMapped: false,
  });
  const bulbInstanced = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbPositions.length);
  for (let i = 0; i < bulbPositions.length; i++) {
    dummy.position.copy(bulbPositions[i]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    bulbInstanced.setMatrixAt(i, dummy.matrix);
  }
  bulbInstanced.instanceMatrix.needsUpdate = true;
  root.add(bulbInstanced);

  // ---------------------------------------------------------------- Update Loop (Prayer Wheels & String Lights)
  const spinRadiusSq = W.wheelSpinRadius * W.wheelSpinRadius;
  let lastWheelSfxAt = -10;

  function update(dt) {
    // 1. Update night string-light bulb emissive brightness (blooms when > 0.85)
    const nf = state.time.nightFactor;
    const glow = Math.pow(THREE.MathUtils.clamp((nf - 0.18) / 0.65, 0, 1), 1.4);
    bulbMat.color.setRGB(
      0.38 + glow * 2.45,
      0.32 + glow * 1.65,
      0.22 + glow * 0.62
    );

    // 2. Check player proximity to spin prayer wheels
    const pPos = state.player.position;
    const isMoving = state.player.isMoving;
    const now = state.elapsed;
    let matrixDirty = false;

    for (let i = 0; i < wheelCount; i++) {
      const w = wheels[i];

      if (isMoving) {
        const dx = pPos.x - w.x;
        const dz = pPos.z - w.z;
        const distSq = dx * dx + dz * dz;
        if (distSq <= spinRadiusSq) {
          const wasSlow = w.angVel < 2.2;
          w.angVel = 10.5;

          if (wasSlow && now - w.lastMeritAt >= 5.0) {
            w.lastMeritAt = now;
            bus.emit('merit', { type: 'wheel' });
          }
          if (now - lastWheelSfxAt >= 0.6) {
            lastWheelSfxAt = now;
            bus.emit('sfx', { name: 'wheel' });
          }
        }
      }

      if (w.angVel > 0.01) {
        w.spinAngle = (w.spinAngle + w.angVel * dt) % (Math.PI * 2);
        w.angVel *= Math.exp(-1.35 * dt);
        if (w.angVel <= 0.01) w.angVel = 0;

        dummy.position.set(w.x, wheelY, w.z);
        dummy.rotation.set(0, -w.theta + w.spinAngle, 0);
        dummy.updateMatrix();
        wheelInstanced.setMatrixAt(i, dummy.matrix);
        matrixDirty = true;
      }
    }

    if (matrixDirty) {
      wheelInstanced.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    update,
    flagAnchors: {
      top: topAnchorPos,
      ends: anchorEnds,
      lines: flagLines,
      darchors,
    },
  };
}
