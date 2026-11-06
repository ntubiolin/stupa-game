/**
 * Pilgrim player — procedural low-poly character with full Face & Outfit
 * Customization (`src/data/appearance.js`), camera-relative movement, collision
 * resolution, full prostration (大禮拜) keyframe sequence, interaction gestures,
 * and clockwise kora tracking.
 */
import { deg, polar } from '../config.js';
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  resolveAppearanceColors,
} from '../data/appearance.js';

const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * Math.min(1, t);
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createPlayer(ctx) {
  const { THREE, scene, state, config, bus } = ctx;
  const P = config.PLAYER;
  const W = config.WORLD;

  // ---------------------------------------------------------------- appearance state & persistence
  let appearance = normalizeAppearance(
    ctx.save?.get?.('appearance', DEFAULT_APPEARANCE) || DEFAULT_APPEARANCE
  );
  if (!appearance.name && ctx.coop?.getPilgrimName) {
    appearance.name = ctx.coop.getPilgrimName();
  }
  state.player.appearance = appearance;

  if (ctx.save?.register) {
    ctx.save.register('appearance', () => appearance, DEFAULT_APPEARANCE);
  }

  // ---------------------------------------------------------------- mesh & materials
  const root = new THREE.Group();
  root.name = 'Pilgrim';

  // Body pivot allows pitching/sliding during prostration without disturbing root position
  const body = new THREE.Group();
  root.add(body);

  const robeMaroon = new THREE.MeshStandardMaterial({
    color: 0x7a1c24,
    roughness: 0.76,
    metalness: 0.05,
  });
  const robeSaffron = new THREE.MeshStandardMaterial({
    color: 0xe08a1e,
    roughness: 0.68,
    metalness: 0.08,
  });
  const trimGold = new THREE.MeshStandardMaterial({
    color: 0xd8a648,
    roughness: 0.42,
    metalness: 0.38,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd9a17c,
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1e1815,
    roughness: 0.82,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x2b1d16,
    roughness: 0.85,
  });
  const accentGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xb45309,
    emissiveIntensity: 0.28,
    roughness: 0.32,
    metalness: 0.65,
  });
  const turquoiseMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.22,
    roughness: 0.3,
    metalness: 0.25,
  });
  const coralMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.45,
    metalness: 0.1,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x5c381c,
    roughness: 0.82,
  });

  // Lower robe / skirt
  const skirtGeo = new THREE.CylinderGeometry(0.21, 0.31, 0.74, 12);
  skirtGeo.translate(0, 0.37, 0);
  const skirt = new THREE.Mesh(skirtGeo, robeMaroon);
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  body.add(skirt);

  // Gold hem ring
  const hemGeo = new THREE.CylinderGeometry(0.305, 0.315, 0.05, 12);
  hemGeo.translate(0, 0.06, 0);
  const hem = new THREE.Mesh(hemGeo, trimGold);
  body.add(hem);

  // Torso (pivots at waist y = 0.72 for bowing)
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.72, 0);
  body.add(torsoPivot);

  const torsoGeo = new THREE.CylinderGeometry(0.22, 0.20, 0.52, 12);
  torsoGeo.translate(0, 0.26, 0);
  const torso = new THREE.Mesh(torsoGeo, robeMaroon);
  torso.castShadow = true;
  torso.receiveShadow = true;
  torsoPivot.add(torso);

  // Saffron zen / shawl draped diagonally across chest & left shoulder
  const shawlGeo = new THREE.CylinderGeometry(0.232, 0.215, 0.44, 12, 1, false, -0.4, Math.PI * 1.25);
  shawlGeo.translate(0, 0.28, 0);
  const shawl = new THREE.Mesh(shawlGeo, robeSaffron);
  shawl.castShadow = true;
  torsoPivot.add(shawl);

  const sashGeo = new THREE.TorusGeometry(0.205, 0.028, 8, 16);
  sashGeo.rotateX(Math.PI / 2);
  const sash = new THREE.Mesh(sashGeo, trimGold);
  sash.position.y = 0.03;
  torsoPivot.add(sash);

  // Dynamic torso accessory groups (neck, chest, back)
  const neckGroup = new THREE.Group();
  torsoPivot.add(neckGroup);
  const chestGroup = new THREE.Group();
  torsoPivot.add(chestGroup);
  const backGroup = new THREE.Group();
  torsoPivot.add(backGroup);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.56, 0);
  torsoPivot.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.155, 16, 14);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 0.14;
  head.castShadow = true;
  headGroup.add(head);

  // Subtle 3D nose bridge & ears on head
  const noseGeo = new THREE.ConeGeometry(0.022, 0.048, 6);
  noseGeo.rotateX(-Math.PI * 0.42);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.position.set(0, 0.132, -0.154);
  headGroup.add(noseMesh);

  for (const side of [-1, 1]) {
    const earGeo = new THREE.SphereGeometry(0.032, 8, 8);
    earGeo.scale(0.55, 1.15, 0.75);
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(side * 0.15, 0.135, -0.01);
    headGroup.add(ear);
  }

  // Curved front face canvas patch (-Z side of head sphere)
  const faceCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (faceCanvas) {
    faceCanvas.width = 256;
    faceCanvas.height = 256;
  }
  const faceTex = faceCanvas ? new THREE.CanvasTexture(faceCanvas) : null;
  if (faceTex) {
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.generateMipmaps = false;
    faceTex.minFilter = THREE.LinearFilter;
    faceTex.magFilter = THREE.LinearFilter;
  }
  const facePatchGeo = new THREE.SphereGeometry(
    0.1575,
    18,
    14,
    Math.PI * 1.5 - 0.62,
    1.24,
    Math.PI * 0.24,
    Math.PI * 0.54
  );
  const facePatchMat = new THREE.MeshBasicMaterial({
    map: faceTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const facePatch = new THREE.Mesh(facePatchGeo, facePatchMat);
  facePatch.position.y = 0.14;
  headGroup.add(facePatch);

  // Dynamic hair & headwear groups
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);
  const hatGroup = new THREE.Group();
  headGroup.add(hatGroup);

  // Arms (pivot at shoulders on torsoPivot; -Z is forward)
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.24, 0.45, 0);

    const sleeveGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.28, 10);
    sleeveGeo.translate(0, -0.13, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, side < 0 ? robeSaffron : robeMaroon);
    sleeve.castShadow = true;
    pivot.add(sleeve);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.26, 0);
    pivot.add(forearmPivot);

    const forearmGeo = new THREE.CylinderGeometry(0.052, 0.044, 0.24, 10);
    forearmGeo.translate(0, -0.12, 0);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    const handGeo = new THREE.SphereGeometry(0.048, 8, 8);
    handGeo.scale(0.8, 1.15, 0.9);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(0, -0.25, 0);
    forearmPivot.add(hand);

    torsoPivot.add(pivot);
    return { pivot, forearmPivot, hand };
  }

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Feet / boots peeking under hem
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.1, 0.34, 0);
    const footGeo = new THREE.BoxGeometry(0.1, 0.09, 0.2);
    const foot = new THREE.Mesh(footGeo, bootMat);
    foot.position.set(0, -0.30, -0.03);
    foot.castShadow = true;
    pivot.add(foot);
    body.add(pivot);
    return pivot;
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Subtle lotus-gold ground aura during prostrations & mantra chanting
  const auraGeo = new THREE.RingGeometry(0.32, 0.58, 28);
  auraGeo.rotateX(-Math.PI / 2);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffcf70,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.position.y = 0.02;
  root.add(aura);

  // Overhead Pilgrim Nameplate Sprite
  const nameplateCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (nameplateCanvas) {
    nameplateCanvas.width = 320;
    nameplateCanvas.height = 68;
  }
  const nameplateTex = nameplateCanvas ? new THREE.CanvasTexture(nameplateCanvas) : null;
  if (nameplateTex) {
    nameplateTex.generateMipmaps = false;
    nameplateTex.minFilter = THREE.LinearFilter;
    nameplateTex.magFilter = THREE.LinearFilter;
  }
  const nameplateMat = new THREE.SpriteMaterial({
    map: nameplateTex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const nameplateSprite = new THREE.Sprite(nameplateMat);
  nameplateSprite.position.set(0, 1.92, 0);
  nameplateSprite.scale.set(1.55, 0.33, 1);
  root.add(nameplateSprite);

  let lastNameplateSig = '';
  function updateNameplate() {
    if (!nameplateCanvas || !nameplateTex) return;
    const rawName =
      appearance.name ||
      ctx.coop?.getPilgrimName?.() ||
      ctx.i18n?.t?.('coop.pilgrimName.default') ||
      '雪域行者';
    const lvl = state.player?.level || 1;
    const show = Boolean(appearance.showNameplate) && state.mode === 'play' && !state.customizing;
    nameplateSprite.visible = show;
    const sig = `${show}:${lvl}:${rawName}:${appearance.auraColor}`;
    if (sig === lastNameplateSig) return;
    lastNameplateSig = sig;

    const g = nameplateCanvas.getContext('2d');
    if (!g) return;
    const w = nameplateCanvas.width;
    const h = nameplateCanvas.height;
    g.clearRect(0, 0, w, h);

    g.fillStyle = 'rgba(15, 20, 34, 0.78)';
    g.strokeStyle = 'rgba(251, 191, 36, 0.72)';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(10, 10, w - 20, h - 20, 14);
    g.fill();
    g.stroke();

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 21px "Noto Serif TC", "Outfit", system-ui, sans-serif';
    g.fillStyle = '#fef08a';
    const text = `☸ [Lv.${lvl}] ${rawName}`;
    g.fillText(text.slice(0, 22), w / 2, h / 2 + 1);
    nameplateTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- Procedural Face Texture Painter
  let isEyesClosed = false;
  let blinkTimer = 3.8;

  function drawFaceCanvas(resolved, eyesClosed = false) {
    if (!faceCanvas || !faceTex) return;
    const g = faceCanvas.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, 256, 256);

    const browColor = resolved.hairStyle === 'snow' ? '#64748b' : resolved.hairCss;
    const eyeCss = resolved.eyeCss || '#1a1412';

    // 1. Subtle rosy cheek warmth (stronger when markType === 'blush')
    const blushAlpha = resolved.markType === 'blush' ? 0.42 : 0.16;
    for (const cx of [70, 186]) {
      const grad = g.createRadialGradient(cx, 152, 2, cx, 152, 28);
      grad.addColorStop(0, `rgba(225, 90, 82, ${blushAlpha})`);
      grad.addColorStop(1, 'rgba(225, 90, 82, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, 152, 28, 0, TWO_PI);
      g.fill();
    }

    // 2. Forehead Sacred Marks (markType)
    if (resolved.markType === 'urna') {
      // Golden Urna dot between eyebrows
      g.save();
      g.fillStyle = '#fbbf24';
      g.shadowColor = '#f59e0b';
      g.shadowBlur = 8;
      g.beginPath();
      g.arc(128, 72, 7.5, 0, TWO_PI);
      g.fill();
      g.fillStyle = '#fef9c3';
      g.beginPath();
      g.arc(128, 72, 3.8, 0, TWO_PI);
      g.fill();
      g.restore();
    } else if (resolved.markType === 'sindoor') {
      // Vermilion Tikka droplet
      g.save();
      g.fillStyle = '#dc2626';
      g.strokeStyle = '#fca5a5';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(128, 58);
      g.quadraticCurveTo(138, 72, 128, 81);
      g.quadraticCurveTo(118, 72, 128, 58);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    } else if (resolved.markType === 'wisdomEye') {
      // Vertical Third Wisdom Eye on forehead
      g.save();
      g.strokeStyle = '#fbbf24';
      g.fillStyle = '#7f1d1d';
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(128, 50);
      g.quadraticCurveTo(140, 68, 128, 86);
      g.quadraticCurveTo(116, 68, 128, 50);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#fef08a';
      g.beginPath();
      g.arc(128, 68, 4.2, 0, TWO_PI);
      g.fill();
      g.restore();
    }

    // 3. Eyebrows (browStyle)
    g.save();
    g.strokeStyle = browColor;
    g.fillStyle = browColor;
    g.lineCap = 'round';
    for (const side of [-1, 1]) {
      const bx = 128 + side * 42;
      const by = 92;
      g.beginPath();
      if (resolved.browStyle === 'bold') {
        g.lineWidth = 7.5;
        g.moveTo(bx - side * 19, by + 2);
        g.quadraticCurveTo(bx, by - 7, bx + side * 20, by + 1);
        g.stroke();
      } else if (resolved.browStyle === 'sword') {
        g.lineWidth = 6.2;
        g.moveTo(bx - side * 17, by + 5);
        g.lineTo(bx + side * 21, by - 7);
        g.stroke();
      } else if (resolved.browStyle === 'soft') {
        g.lineWidth = 5.5;
        g.moveTo(bx - side * 14, by);
        g.quadraticCurveTo(bx, by - 5, bx + side * 14, by + 2);
        g.stroke();
      } else {
        // 'gentle' willow arch
        g.lineWidth = 4.6;
        g.moveTo(bx - side * 20, by + 3);
        g.quadraticCurveTo(bx, by - 9, bx + side * 20, by + 4);
        g.stroke();
      }
    }
    g.restore();

    // 4. Eyes (eyeStyle + eyeColor + blink)
    const forceClosed = eyesClosed || resolved.eyeStyle === 'joyful';
    for (const side of [-1, 1]) {
      const ex = 128 + side * 42;
      const ey = 120;
      g.save();
      if (eyesClosed) {
        // Peaceful closed eyelid curve
        g.strokeStyle = '#271914';
        g.lineWidth = 4.2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(ex - 18, ey);
        g.quadraticCurveTo(ex, ey + 9, ex + 18, ey);
        g.stroke();
      } else if (resolved.eyeStyle === 'joyful') {
        // Happy upward smiling crescent eye
        g.strokeStyle = '#231612';
        g.lineWidth = 4.8;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(ex - 18, ey + 5);
        g.quadraticCurveTo(ex, ey - 11, ex + 18, ey + 5);
        g.stroke();
      } else if (resolved.eyeStyle === 'serene') {
        // Half-lidded meditative gaze
        g.fillStyle = '#f8fafc';
        g.beginPath();
        g.moveTo(ex - 18, ey - 1);
        g.lineTo(ex + 18, ey - 1);
        g.quadraticCurveTo(ex, ey + 13, ex - 18, ey - 1);
        g.closePath();
        g.fill();

        g.fillStyle = eyeCss;
        g.beginPath();
        g.arc(ex, ey + 2, 7.5, 0, Math.PI, false);
        g.fill();

        g.strokeStyle = '#1e1410';
        g.lineWidth = 4.2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(ex - 19, ey - 1);
        g.lineTo(ex + 19, ey - 1);
        g.stroke();
      } else {
        // 'bright' | 'resolute' | 'vajra'
        const isVajra = resolved.eyeStyle === 'vajra';
        const isResolute = resolved.eyeStyle === 'resolute';
        const hTop = isResolute ? 9 : 13;
        const hBot = isResolute ? 9 : 12;
        const slant = isVajra ? -4 : isResolute ? -2 : 0;

        // White sclera
        g.fillStyle = '#f8fafc';
        g.beginPath();
        g.moveTo(ex - 19, ey - slant);
        g.quadraticCurveTo(ex, ey - hTop, ex + 19, ey + slant);
        g.quadraticCurveTo(ex, ey + hBot, ex - 19, ey - slant);
        g.closePath();
        g.fill();

        // Colored iris
        g.fillStyle = eyeCss;
        g.beginPath();
        g.arc(ex, ey, isResolute ? 8.2 : 9.5, 0, TWO_PI);
        g.fill();

        // Dark pupil
        g.fillStyle = '#0f0a08';
        g.beginPath();
        g.arc(ex, ey, 4.6, 0, TWO_PI);
        g.fill();

        // Crisp white catchlights
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(ex - 3.2, ey - 3.2, 2.7, 0, TWO_PI);
        g.arc(ex + 3.2, ey + 2.5, 1.4, 0, TWO_PI);
        g.fill();

        // Upper lash line
        g.strokeStyle = '#1c130f';
        g.lineWidth = 4.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(ex - 20, ey - slant + 1);
        g.quadraticCurveTo(ex, ey - hTop - 1, ex + 20, ey + slant + 1);
        g.stroke();
      }
      g.restore();
    }

    // 5. Mouth (mouthStyle)
    g.save();
    g.strokeStyle = '#6e2e26';
    g.fillStyle = '#993b32';
    g.lineWidth = 4.0;
    g.lineCap = 'round';
    const my = 186;
    if (resolved.mouthStyle === 'peaceful') {
      g.beginPath();
      g.moveTo(112, my);
      g.lineTo(144, my);
      g.stroke();
    } else if (resolved.mouthStyle === 'chant') {
      g.beginPath();
      g.ellipse(128, my + 2, 11, 7.5, 0, 0, TWO_PI);
      g.fill();
      g.stroke();
    } else if (resolved.mouthStyle === 'cheerful') {
      g.beginPath();
      g.moveTo(108, my - 3);
      g.quadraticCurveTo(128, my + 14, 148, my - 3);
      g.closePath();
      g.fill();
      g.stroke();
    } else {
      // 'calm' gentle smile
      g.beginPath();
      g.moveTo(110, my - 2);
      g.quadraticCurveTo(128, my + 9, 146, my - 2);
      g.stroke();
    }
    g.restore();

    faceTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- 3D Hair, Hat & Accessory Builders
  function clearGroup(grp) {
    while (grp.children.length > 0) {
      grp.remove(grp.children[0]);
    }
  }

  function rebuildHairAndGear(resolved) {
    clearGroup(hairGroup);
    clearGroup(hatGroup);
    clearGroup(neckGroup);
    clearGroup(chestGroup);
    clearGroup(backGroup);

    const hasFullCrownHat = ['lotus', 'pandita', 'straw'].includes(resolved.hatType);

    // ---------------- 1. Hairstyle (hairGroup) ----------------
    if (resolved.hairStyle === 'shaved') {
      // Ordained monk shaved head: 6 subtle golden-brown ordination dots on forehead crown
      if (!hasFullCrownHat) {
        const dotGeo = new THREE.SphereGeometry(0.008, 6, 6);
        for (const row of [0, 1]) {
          for (const col of [-1, 0, 1]) {
            const dot = new THREE.Mesh(dotGeo, trimGold);
            dot.position.set(col * 0.025, 0.255 + row * 0.018, -0.115 + row * 0.022);
            hairGroup.add(dot);
          }
        }
      }
    } else {
      // Base hair cap covering back and crown
      const capGeo = new THREE.SphereGeometry(0.161, 14, 10, 0, TWO_PI, 0, Math.PI * 0.58);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.y = 0.15;
      cap.rotation.x = 0.34;
      hairGroup.add(cap);

      // Subtle front temple wisps so hair is visible from the front
      for (const side of [-1, 1]) {
        const wispGeo = new THREE.BoxGeometry(0.036, 0.075, 0.035);
        const wisp = new THREE.Mesh(wispGeo, hairMat);
        wisp.position.set(side * 0.128, 0.175, -0.095);
        wisp.rotation.z = side * 0.18;
        hairGroup.add(wisp);
      }

      if (resolved.hairStyle === 'khampa') {
        // Khampa braided crown + red silk cord wrapped around head
        const braidRing = new THREE.Mesh(new THREE.TorusGeometry(0.156, 0.024, 8, 18), hairMat);
        braidRing.rotation.x = Math.PI / 2;
        braidRing.position.y = 0.215;
        hairGroup.add(braidRing);

        const redCord = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 6, 18), coralMat);
        redCord.rotation.x = Math.PI / 2 + 0.08;
        redCord.position.y = 0.225;
        hairGroup.add(redCord);

        // Side red tassel
        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 8), coralMat);
        tassel.position.set(0.155, 0.16, -0.04);
        tassel.rotation.z = -0.25;
        hairGroup.add(tassel);
      } else if (resolved.hairStyle === 'ngakpa' && !hasFullCrownHat) {
        // Ngakpa Yogi high topknot bun + golden ring
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), hairMat);
        bun.position.set(0, 0.33, 0.02);
        hairGroup.add(bun);

        const bunRing = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 6, 14), accentGoldMat);
        bunRing.rotation.x = Math.PI / 2;
        bunRing.position.set(0, 0.285, 0.02);
        hairGroup.add(bunRing);
      } else if (resolved.hairStyle === 'braids') {
        // Twin Tibetan braids hanging down over chest (-Z) so clearly visible from the front!
        for (const side of [-1, 1]) {
          const bGroup = new THREE.Group();
          bGroup.position.set(side * 0.135, 0.08, -0.075);
          for (let seg = 0; seg < 4; seg++) {
            const segMesh = new THREE.Mesh(new THREE.SphereGeometry(0.028 - seg * 0.002, 8, 8), hairMat);
            segMesh.scale.set(0.85, 1.35, 0.85);
            segMesh.position.set(0, -seg * 0.055, -seg * 0.012);
            bGroup.add(segMesh);
          }
          const tie = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.008, 6, 10), coralMat);
          tie.rotation.x = Math.PI / 2;
          tie.position.set(0, -0.19, -0.04);
          bGroup.add(tie);
          hairGroup.add(bGroup);
        }
      } else if (resolved.hairStyle === 'flowing') {
        // Long flowing hair down the back + front shoulder locks
        const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.48, 0.07), hairMat);
        backHair.position.set(0, -0.08, 0.13);
        hairGroup.add(backHair);

        for (const side of [-1, 1]) {
          const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.014, 0.26, 8), hairMat);
          lock.position.set(side * 0.135, -0.02, -0.08);
          lock.rotation.z = side * 0.08;
          hairGroup.add(lock);
        }
      }
    }

    // ---------------- 2. Headwear (hatGroup) ----------------
    if (resolved.hatType === 'lotus') {
      // Padma Lotus Hat (蓮師法帽)
      const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.156, 0.024, 8, 18), accentGoldMat);
      crownRing.rotation.x = Math.PI / 2;
      crownRing.position.y = 0.24;
      hatGroup.add(crownRing);

      const lotusRim = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.16, 0.11, 12), robeMaroon);
      lotusRim.position.y = 0.275;
      hatGroup.add(lotusRim);

      const innerCone = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.22, 10), robeSaffron);
      innerCone.position.y = 0.35;
      hatGroup.add(innerCone);

      const sunMoon = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), accentGoldMat);
      sunMoon.position.y = 0.47;
      hatGroup.add(sunMoon);

      // Front turquoise jewel on brow
      const browGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), turquoiseMat);
      browGem.position.set(0, 0.24, -0.172);
      hatGroup.add(browGem);
    } else if (resolved.hatType === 'pandita') {
      // Tall pointed Pandita scholar hat with long side ear-flaps
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.168, 0.34, 14), robeMaroon);
      cone.position.y = 0.36;
      hatGroup.add(cone);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.162, 0.022, 8, 16), accentGoldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.21;
      hatGroup.add(rim);

      const flapGeo = new THREE.BoxGeometry(0.052, 0.32, 0.022);
      for (const side of [-1, 1]) {
        const flap = new THREE.Mesh(flapGeo, robeSaffron);
        flap.position.set(side * 0.165, 0.05, 0.01);
        flap.rotation.z = side * 0.12;
        hatGroup.add(flap);
      }
    } else if (resolved.hatType === 'straw') {
      // Wide woven bamboo pilgrim hat
      const brim = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.16, 16), trimGold);
      brim.position.y = 0.29;
      hatGroup.add(brim);

      const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 6, 16), robeMaroon);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.22;
      hatGroup.add(band);
    } else if (resolved.hatType === 'headband') {
      // Turquoise & Coral forehead band
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.156, 0.02, 8, 18), robeSaffron);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.215;
      hatGroup.add(band);

      for (const idx of [-2, -1, 0, 1, 2]) {
        const ang = idx * 0.32;
        const gemMat = idx === 0 ? accentGoldMat : Math.abs(idx) === 1 ? turquoiseMat : coralMat;
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), gemMat);
        gem.position.set(Math.sin(ang) * 0.168, 0.215, -Math.cos(ang) * 0.168);
        hatGroup.add(gem);
      }
    } else if (resolved.hatType === 'tiara') {
      // Five-Buddha Tiara (五佛寶冠)
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.156, 0.02, 8, 18), accentGoldMat);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.225;
      hatGroup.add(baseRing);

      for (const idx of [-2, -1, 0, 1, 2]) {
        const ang = idx * 0.36;
        const leafH = idx === 0 ? 0.13 : Math.abs(idx) === 1 ? 0.105 : 0.085;
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.036, leafH, 4), accentGoldMat);
        leaf.position.set(Math.sin(ang) * 0.16, 0.23 + leafH * 0.45, -Math.cos(ang) * 0.16);
        leaf.rotation.y = -ang;
        hatGroup.add(leaf);

        const jewel = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.018, 0),
          idx % 2 === 0 ? turquoiseMat : coralMat
        );
        jewel.position.set(Math.sin(ang) * 0.168, 0.25, -Math.cos(ang) * 0.168);
        hatGroup.add(jewel);
      }
    }

    // ---------------- 3. Neck Mala / Collar (neckGroup) ----------------
    if (resolved.neckType === 'bodhi' || resolved.neckType === 'turquoise') {
      const isTurq = resolved.neckType === 'turquoise';
      const malaRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.165, 0.022, 8, 16),
        isTurq ? turquoiseMat : woodMat
      );
      malaRing.rotation.x = Math.PI * 0.42;
      malaRing.position.set(0, 0.48, -0.03);
      neckGroup.add(malaRing);

      // Central Guru Bead + red tassel on front chest
      const guruBead = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 8, 8),
        isTurq ? coralMat : accentGoldMat
      );
      guruBead.position.set(0, 0.43, -0.195);
      neckGroup.add(guruBead);
    } else if (resolved.neckType === 'goldCollar') {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.032, 8, 18), accentGoldMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.50;
      neckGroup.add(collar);

      const centerGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 0), turquoiseMat);
      centerGem.position.set(0, 0.50, -0.23);
      neckGroup.add(centerGem);
    }

    // ---------------- 4. Chest Amulet (chestGroup) ----------------
    if (resolved.chestType === 'mirror') {
      // Golden Dharma Mirror (Melong)
      const discGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.018, 16);
      discGeo.rotateX(Math.PI / 2);
      const disc = new THREE.Mesh(discGeo, accentGoldMat);
      disc.position.set(0, 0.32, -0.222);
      chestGroup.add(disc);

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), turquoiseMat);
      core.position.set(0, 0.32, -0.232);
      chestGroup.add(core);
    } else if (resolved.chestType === 'gau') {
      // Turquoise Reliquary Box (Gau)
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.115, 0.035), accentGoldMat);
      box.position.set(0, 0.32, -0.22);
      chestGroup.add(box);

      const win = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), turquoiseMat);
      win.position.set(0, 0.32, -0.235);
      chestGroup.add(win);
    }

    // ---------------- 5. Back Gear (backGroup) ----------------
    if (resolved.backType === 'pack') {
      const pack = new THREE.Group();
      pack.position.set(0, 0.28, 0.24);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.22), woodMat);
      box.castShadow = true;
      pack.add(box);

      const rollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.40, 10);
      rollGeo.rotateZ(Math.PI / 2);
      const roll = new THREE.Mesh(rollGeo, robeSaffron);
      roll.position.set(0, 0.27, 0);
      pack.add(roll);
      backGroup.add(pack);
    } else if (resolved.backType === 'scroll') {
      // Terma Scripture Chest
      const chest = new THREE.Group();
      chest.position.set(0, 0.33, 0.22);
      const mainBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.16), robeMaroon);
      mainBox.castShadow = true;
      chest.add(mainBox);

      for (const sx of [-0.16, 0, 0.16]) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.19, 0.17), accentGoldMat);
        band.position.x = sx;
        chest.add(band);
      }
      backGroup.add(chest);
    } else if (resolved.backType === 'scarf') {
      // Celestial Silk Scarf floating arch behind shoulders
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.026, 8, 24, Math.PI * 1.18),
        turquoiseMat
      );
      arch.position.set(0, 0.38, 0.09);
      arch.rotation.z = -0.18;
      backGroup.add(arch);
    }
  }

  function applyAppearance(nextSpec, opts = {}) {
    appearance = normalizeAppearance({ ...appearance, ...(nextSpec || {}) });
    state.player.appearance = appearance;

    const resolved = resolveAppearanceColors(appearance);
    skinMat.color.setHex(resolved.skinHex);
    hairMat.color.setHex(resolved.hairHex);
    robeMaroon.color.setHex(resolved.robeHex);
    robeSaffron.color.setHex(resolved.shawlHex);
    trimGold.color.setHex(resolved.trimHex);
    auraMat.color.setHex(resolved.auraHex);

    // Refresh hurt/slow emissive snapshot colors
    drawFaceCanvas(resolved, isEyesClosed);
    rebuildHairAndGear(resolved);
    lastNameplateSig = '';
    updateNameplate();

    if (appearance.name) {
      if (ctx.coop?.setPilgrimName && ctx.coop.getPilgrimName?.() !== appearance.name) {
        ctx.coop.setPilgrimName(appearance.name);
      }
      if (ctx.community?.setPilgrimName && ctx.community.getPilgrimName?.() !== appearance.name) {
        ctx.community.setPilgrimName(appearance.name);
      }
    }

    if (opts.persist !== false) {
      ctx.save?.set?.('appearance', appearance);
    }
    bus?.emit('appearance:changed', appearance);
    return appearance;
  }

  scene.add(root);

  // ---------------------------------------------------------------- initial state
  const startAngle = deg(P.startAngleDeg);
  const startPos = polar(startAngle, P.startRadius);
  state.player.position.set(startPos.x, 0, startPos.z);
  // Face the stupa at origin (0, 0): direction (-x, -z) => heading = atan2(x, z)
  state.player.heading = Math.atan2(startPos.x, startPos.z);
  state.player.velocity.set(0, 0, 0);
  state.player.isMoving = false;
  state.player.action = 'idle';

  root.position.copy(state.player.position);
  root.rotation.y = state.player.heading;

  // Apply initial appearance
  applyAppearance(appearance, { persist: false });

  // ---------------------------------------------------------------- animation & kora state
  let walkPhase = 0;
  let stepAccum = 0;

  // Prostration state
  const PROSTRATE_DUR = 4.1;
  let prostrateTime = -1;
  let prostrateStartHeading = 0;
  let prostrateTargetHeading = 0;

  // Studio preview pose ('idle' | 'chant' | 'prostrate')
  let previewPose = 'idle';
  let previewPoseTimer = 0;

  // Gesture state ('light' | 'feed')
  let gesture = null; // { name, timer, duration, targetHeading }

  // Mantra chant state
  let chantTimer = 0;
  let chantDuration = 0.5;

  // Hurt & flash state
  let hurtTimer = 0;
  let flashTimer = 0;
  const flashMats = [robeMaroon, robeSaffron, trimGold, skinMat, bootMat];
  const originalEmissives = flashMats.map((m) => ({
    mat: m,
    color: m.emissive.clone(),
    intensity: m.emissiveIntensity,
  }));

  function flashHurt() {
    flashTimer = 0.2;
    for (const item of originalEmissives) {
      item.mat.emissive.setHex(0xff1818);
      item.mat.emissiveIntensity = 0.85;
    }
  }

  let wasSlowed = false;
  function restoreFlash() {
    const isSlowed = state.elapsed < (state.player?.slowUntil || 0);
    for (const item of originalEmissives) {
      if (isSlowed) {
        item.mat.emissive.setHex(0x38bdf8);
        item.mat.emissiveIntensity = 0.45;
      } else {
        item.mat.emissive.copy(item.color);
        item.mat.emissiveIntensity = item.intensity;
      }
    }
    wasSlowed = isSlowed;
  }

  let faintAnimTime = 0;

  bus.on('player:faint', () => {
    faintAnimTime = 0;
    gesture = null;
    prostrateTime = -1;
    chantTimer = 0;
    hurtTimer = 0;
    state.player.velocity.set(0, 0, 0);
    state.player.isMoving = false;
    state.player.action = 'faint';
    applyFaintPose(0);
  });

  bus.on('player:wake', () => {
    faintAnimTime = 0;
    resetPose();
    state.player.action = 'idle';
  });

  bus.on('player:hurt', (payload) => {
    if (state.player.action === 'faint') return;
    const kb =
      payload?.knockback !== undefined
        ? Number(payload.knockback)
        : (config.ENEMIES?.playerKnockback ?? 1.5);
    if (kb > 0 && payload?.sourcePos && state.player.position) {
      const dx = state.player.position.x - payload.sourcePos.x;
      const dz = state.player.position.z - payload.sourcePos.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-4) {
        movePlayerWithCollisions((dx / d) * kb, (dz / d) * kb);
        root.position.copy(state.player.position);
      }
    }
    flashHurt();
    if (state.player.hp > 0) {
      hurtTimer = 0.3;
      state.player.action = 'hurt';
    }
    bus.emit('sfx', { name: 'hurt' });
  });

  bus.on('player:chant', (payload) => {
    if (state.player.action === 'faint') return;
    const dur = payload?.duration ?? (config.MANTRA?.duration ?? 0.5);
    chantTimer = dur;
    chantDuration = dur;
    state.player.action = 'chant';
  });

  bus.on('player:gesture', (payload) => {
    if (!payload || state.player.action === 'prostrate' || state.player.action === 'faint') return;
    const { name, target } = payload;
    let targetHeading = state.player.heading;
    if (target) {
      const dx = target.x - state.player.position.x;
      const dz = target.z - state.player.position.z;
      if (dx * dx + dz * dz > 1e-4) {
        targetHeading = Math.atan2(-dx, -dz);
      }
    }
    gesture = {
      name: name || 'light',
      timer: 0,
      duration: name === 'feed' ? 0.9 : 1.2,
      targetHeading,
    };
    state.player.action = gesture.name;
    state.player.velocity.set(0, 0, 0);
    state.player.isMoving = false;
  });

  // Kora tracking
  const koraTargets = [
    { id: 'stupa', map: 'stupa', x: 0, z: 0, minR: 13.5, maxR: 28 },
    { id: 'samye', map: 'samye', x: 5000, z: 0, minR: 44, maxR: 60 },
  ];
  state.player.koraTargets = koraTargets;

  let activeKoraTargetId = 'stupa';
  let lastTheta = Math.atan2(state.player.position.z, state.player.position.x);
  let koraAccum = 0;          // radians accumulated toward current clockwise lap (0..2π)
  let koraLaps = 0;
  let lastEmittedFraction = 0;
  let ccwWindowAccum = 0;     // negative radian accumulation in recent window
  let wrongWayCooldown = 0;
  let wasInKoraRing = true;

  function findKoraTargetForZone(zone) {
    const z = zone || 'stupa';
    return koraTargets.find((t) => t.map === z) || null;
  }

  bus.on('game:start', () => {
    koraLaps = Number(ctx.merit?.getStats()?.kora) || 0;
  });

  bus.on('merit:reset', () => {
    koraAccum = 0;
    koraLaps = 0;
    lastEmittedFraction = 0;
    ccwWindowAccum = 0;
  });

  bus.on('zone:change', () => {
    gesture = null;
    prostrateTime = -1;
    chantTimer = 0;
    hurtTimer = 0;
    if (flashTimer > 0) {
      flashTimer = 0;
      restoreFlash();
    }
    if (state.player.action !== 'faint') {
      state.player.action = 'idle';
      resetPose();
    }
    const kt = findKoraTargetForZone(state.zone);
    const ox = kt ? kt.x : 0;
    const oz = kt ? kt.z : 0;
    activeKoraTargetId = kt ? kt.id : null;
    koraAccum = 0;
    ccwWindowAccum = 0;
    wasInKoraRing = false;
    lastTheta = Math.atan2(state.player.position.z - oz, state.player.position.x - ox);
    root.position.copy(state.player.position);
    root.rotation.y = state.player.heading;
  });

  const camForward = new THREE.Vector3();
  const camRight = new THREE.Vector3();

  // ---------------------------------------------------------------- collision resolution
  function resolveColliderList(pos, colliders, zoneName, pr, prevX, prevZ) {
    if (!Array.isArray(colliders)) return;
    for (let pass = 0; pass < 3; pass++) {
      let pX = pass === 0 ? prevX : pos.x;
      let pZ = pass === 0 ? prevZ : pos.z;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (!c) continue;
        if ((c.zone || 'stupa') !== zoneName) continue;
        if (c.type === 'circle') {
          const cdx = pos.x - c.x;
          const cdz = pos.z - c.z;
          const minDist = (c.r || 0) + pr;
          const d2 = cdx * cdx + cdz * cdz;
          if (d2 < minDist * minDist) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2);
              const push = (minDist - d) / d;
              pos.x += cdx * push;
              pos.z += cdz * push;
            } else {
              const pdx = pX - c.x;
              const pdz = pZ - c.z;
              const pd = Math.hypot(pdx, pdz);
              if (pd > 1e-6) {
                pos.x = c.x + (pdx / pd) * minDist;
                pos.z = c.z + (pdz / pd) * minDist;
              } else {
                pos.x = c.x + minDist;
              }
            }
            pX = pos.x;
            pZ = pos.z;
          }
        } else if (c.type === 'box') {
          const cx = Math.max(c.minX, Math.min(c.maxX, pos.x));
          const cz = Math.max(c.minZ, Math.min(c.maxZ, pos.z));
          const cdx = pos.x - cx;
          const cdz = pos.z - cz;
          const d2 = cdx * cdx + cdz * cdz;
          if (d2 < pr * pr) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2);
              pos.x = cx + (cdx / d) * pr;
              pos.z = cz + (cdz / d) * pr;
            } else {
              // Player center is inside the box: prefer pushing back toward previous side
              if (pX <= c.minX) pos.x = c.minX - pr;
              else if (pX >= c.maxX) pos.x = c.maxX + pr;
              else if (pZ <= c.minZ) pos.z = c.minZ - pr;
              else if (pZ >= c.maxZ) pos.z = c.maxZ + pr;
              else {
                const dl = Math.abs(pos.x - c.minX);
                const dr = Math.abs(c.maxX - pos.x);
                const dtb = Math.abs(pos.z - c.minZ);
                const dbb = Math.abs(pos.z - c.maxZ);
                const m = Math.min(dl, dr, dtb, dbb);
                if (m === dl) pos.x = c.minX - pr;
                else if (m === dr) pos.x = c.maxX + pr;
                else if (m === dtb) pos.z = c.minZ - pr;
                else pos.z = c.maxZ + pr;
              }
            }
            pX = pos.x;
            pZ = pos.z;
          }
        }
      }
    }
  }

  function resolveCollisions(pos, prevX = pos.x, prevZ = pos.z) {
    const pr = P.radius;
    const currentZone = state.zone || 'stupa';

    if (currentZone !== 'stupa') {
      const mapDef = ctx.world?.getMap(currentZone);
      const wOrigin = mapDef?.origin || config.WILD?.origin || { x: 1000, z: 0 };
      const maxWildR = ((mapDef?.walkRadius ?? config.WILD?.walkRadius) || 70) - pr;
      let dx = pos.x - wOrigin.x;
      let dz = pos.z - wOrigin.z;
      let r = Math.hypot(dx, dz);
      if (r > maxWildR) {
        const s = maxWildR / (r || 1);
        pos.x = wOrigin.x + dx * s;
        pos.z = wOrigin.z + dz * s;
      }

      resolveColliderList(pos, ctx.colliders, currentZone, pr, prevX, prevZ);

      // Keep inside active dungeon rooms/corridors so walls can never be tunneled through
      if (currentZone === 'terma' && ctx.dungeon?.isActive?.() && typeof ctx.dungeon.clampPosition === 'function') {
        ctx.dungeon.clampPosition(pos, pr);
        resolveColliderList(pos, ctx.colliders, currentZone, pr, pos.x, pos.z);
        ctx.dungeon.clampPosition(pos, pr);
      }

      // Keep inside active boss arena barrier
      const bState = state.boss?.active;
      if (bState && !bState.dead && bState.arena && bState.arena.map === currentZone) {
        const bdx = pos.x - bState.arena.x;
        const bdz = pos.z - bState.arena.z;
        const bd = Math.hypot(bdx, bdz);
        const maxBR = Math.max(1, (bState.arena.r || 13.5) - pr - 0.15);
        if (bd > maxBR) {
          pos.x = bState.arena.x + (bdx / bd) * maxBR;
          pos.z = bState.arena.z + (bdz / bd) * maxBR;
        }
      }

      dx = pos.x - wOrigin.x;
      dz = pos.z - wOrigin.z;
      r = Math.hypot(dx, dz);
      if (r > maxWildR) {
        const s = maxWildR / (r || 1);
        pos.x = wOrigin.x + dx * s;
        pos.z = wOrigin.z + dz * s;
      }
      pos.y = ctx.world ? ctx.world.getHeight(pos.x, pos.z) : 0;
      return;
    }

    // 1. Stupa inner boundary
    const minR = W.stupaColliderRadius + pr;
    const maxR = W.walkRadius - pr;
    let r = Math.hypot(pos.x, pos.z);
    if (r < 1e-4) {
      pos.x = 0;
      pos.z = minR;
      r = minR;
    }
    if (r < minR) {
      const s = minR / r;
      pos.x *= s;
      pos.z *= s;
    } else if (r > maxR) {
      const s = maxR / r;
      pos.x *= s;
      pos.z *= s;
    }

    // 2. Dynamic/static colliders from ctx.colliders
    resolveColliderList(pos, ctx.colliders, 'stupa', pr, prevX, prevZ);

    // Re-clamp to outer/inner ring in case obstacle pushed player across boundary
    r = Math.hypot(pos.x, pos.z);
    if (r < minR) {
      pos.x *= minR / r;
      pos.z *= minR / r;
    } else if (r > maxR) {
      pos.x *= maxR / r;
      pos.z *= maxR / r;
    }
    pos.y = 0;
  }

  function movePlayerWithCollisions(dx, dz) {
    const pos = state.player.position;
    const dist = Math.hypot(dx, dz);
    if (dist <= 1e-6) {
      resolveCollisions(pos, pos.x, pos.z);
      return;
    }
    // Sub-step movement so large knockbacks/velocities never tunnel through thin walls
    const maxStep = 0.15;
    const steps = Math.max(1, Math.ceil(dist / maxStep));
    const stepX = dx / steps;
    const stepZ = dz / steps;
    for (let i = 0; i < steps; i++) {
      const prevX = pos.x;
      const prevZ = pos.z;
      pos.x += stepX;
      pos.z += stepZ;
      resolveCollisions(pos, prevX, prevZ);
    }
  }

  // ---------------------------------------------------------------- pose helpers
  function resetPose() {
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    skirt.scale.set(1, 1, 1);
    torsoPivot.position.set(0, 0.72, 0);
    torsoPivot.rotation.set(0, 0, 0);
    headGroup.rotation.set(0, 0, 0);
    leftArm.pivot.rotation.set(0, 0, -0.08);
    rightArm.pivot.rotation.set(0, 0, 0.08);
    leftArm.forearmPivot.rotation.set(0.18, 0, 0);
    rightArm.forearmPivot.rotation.set(0.18, 0, 0);
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
    auraMat.opacity = 0;
  }

  function applyFaintPose(t) {
    resetPose();
    const p1 = smoothstep(0, 0.4, t);
    const p2 = smoothstep(0.4, 1.0, t);

    body.position.y = -0.38 * p1 + 0.50 * p2;
    body.position.z = 0.45 * p2;
    body.rotation.x = -(Math.PI * 0.47) * p2;
    skirt.scale.y = 1 - 0.38 * p1 + 0.38 * p2;

    torsoPivot.rotation.x = -0.5 * p1 * (1 - p2) - 0.05 * p2;
    headGroup.rotation.x = -0.3 * p1 * (1 - p2) - 0.2 * p2;

    leftArm.pivot.rotation.set(0.8 * p1 + 0.4 * p2, -0.4 * (1 - p2) - 0.25 * p2, 0);
    rightArm.pivot.rotation.set(0.8 * p1 + 0.4 * p2, 0.4 * (1 - p2) + 0.25 * p2, 0);
    leftArm.forearmPivot.rotation.set(0.3 * p1 + 0.2 * p2, 0, 0);
    rightArm.forearmPivot.rotation.set(0.3 * p1 + 0.2 * p2, 0, 0);
  }

  function applyProstrationPose(t, turnHeading = true) {
    resetPose();

    if (turnHeading) {
      const turnT = smoothstep(0, 0.45, t);
      state.player.heading = lerpAngle(prostrateStartHeading, prostrateTargetHeading, turnT);
    }

    const auraPulse = smoothstep(0.3, 1.8, t) * (1 - smoothstep(3.1, 4.0, t));
    auraMat.opacity = 0.55 * auraPulse;
    const s = 0.9 + 0.28 * auraPulse;
    aura.scale.set(s, s, s);

    if (t < 0.55) {
      const p = smoothstep(0, 0.55, t);
      leftArm.pivot.rotation.set(2.55 * p, 0.35 * p, -0.08 * (1 - p) + 0.22 * p);
      rightArm.pivot.rotation.set(2.55 * p, -0.35 * p, 0.08 * (1 - p) - 0.22 * p);
      leftArm.forearmPivot.rotation.set(0.18 * (1 - p) + 0.55 * p, 0, 0.35 * p);
      rightArm.forearmPivot.rotation.set(0.18 * (1 - p) + 0.55 * p, 0, -0.35 * p);
      headGroup.rotation.x = 0.12 * p;
    } else if (t < 1.15) {
      const p = smoothstep(0.55, 1.15, t);
      const shX = 2.55 - 1.65 * p;
      leftArm.pivot.rotation.set(shX, 0.35 * (1 - p) - 0.60 * p, 0.22 * (1 - p));
      rightArm.pivot.rotation.set(shX, -0.35 * (1 - p) + 0.60 * p, -0.22 * (1 - p));
      leftArm.forearmPivot.rotation.set(0.55 + 0.85 * p, 0, 0.35 + 0.15 * p);
      rightArm.forearmPivot.rotation.set(0.55 + 0.85 * p, 0, -0.35 - 0.15 * p);
      headGroup.rotation.x = 0.12 - 0.32 * p;
      torsoPivot.rotation.x = -0.12 * p;
    } else if (t < 1.75) {
      const p = smoothstep(1.15, 1.75, t);
      body.position.y = -0.36 * p;
      skirt.scale.y = 1 - 0.38 * p;
      torsoPivot.rotation.x = -0.12 - 0.95 * p;
      headGroup.rotation.x = -0.20 + 0.35 * p;
      leftArm.pivot.rotation.set(0.90 + 0.75 * p, -0.60 * (1 - p), 0);
      rightArm.pivot.rotation.set(0.90 + 0.75 * p, 0.60 * (1 - p), 0);
      leftArm.forearmPivot.rotation.set(1.40 * (1 - p) + 0.15 * p, 0, 0.50 * (1 - p));
      rightArm.forearmPivot.rotation.set(1.40 * (1 - p) + 0.15 * p, 0, -0.50 * (1 - p));
    } else if (t < 3.15) {
      const slide = smoothstep(1.75, 2.45, t);
      const salute = smoothstep(2.45, 2.85, t) * (1 - smoothstep(2.85, 3.15, t));
      body.position.y = -0.36 + 0.52 * slide;
      body.position.z = 0.52 * slide;
      body.rotation.x = -(Math.PI * 0.47) * slide;
      skirt.scale.y = 0.62 + 0.38 * slide;
      torsoPivot.rotation.x = -1.07 * (1 - slide) - 0.05 * slide;
      headGroup.rotation.x = 0.15 - 0.25 * slide;
      leftArm.pivot.rotation.set(1.65 + 1.35 * slide, 0.18 * slide, 0.22 * slide);
      rightArm.pivot.rotation.set(1.65 + 1.35 * slide, -0.18 * slide, -0.22 * slide);
      leftArm.forearmPivot.rotation.set(0.15 + 0.45 * salute, 0, 0.35 * slide);
      rightArm.forearmPivot.rotation.set(0.15 + 0.45 * salute, 0, -0.35 * slide);
    } else {
      const p = smoothstep(3.15, PROSTRATE_DUR, t);
      const inv = 1 - p;
      body.position.y = 0.16 * inv;
      body.position.z = 0.52 * inv;
      body.rotation.x = -(Math.PI * 0.47) * inv;
      torsoPivot.rotation.x = -0.35 * Math.sin(p * Math.PI);
      leftArm.pivot.rotation.set(3.0 * inv + 0.65 * Math.sin(p * Math.PI), -0.35 * Math.sin(p * Math.PI), 0.22 * inv - 0.08 * p);
      rightArm.pivot.rotation.set(3.0 * inv + 0.65 * Math.sin(p * Math.PI), 0.35 * Math.sin(p * Math.PI), -0.22 * inv + 0.08 * p);
      leftArm.forearmPivot.rotation.set(0.18 + 0.8 * Math.sin(p * Math.PI), 0, 0.35 * Math.sin(p * Math.PI));
      rightArm.forearmPivot.rotation.set(0.18 + 0.8 * Math.sin(p * Math.PI), 0, -0.35 * Math.sin(p * Math.PI));
    }
  }

  function applyGesturePose(g) {
    resetPose();
    const p = Math.sin(Math.min(1, g.timer / g.duration) * Math.PI);
    if (g.name === 'light') {
      torsoPivot.rotation.x = -0.28 * p;
      headGroup.rotation.x = -0.18 * p;
      rightArm.pivot.rotation.set(1.25 * p, 0.15 * p, 0.08);
      rightArm.forearmPivot.rotation.set(0.35 * p, 0, 0);
      leftArm.pivot.rotation.set(0.75 * p, -0.45 * p, 0);
      leftArm.forearmPivot.rotation.set(1.1 * p, 0, 0.35 * p);
    } else {
      torsoPivot.rotation.x = -0.14 * p;
      rightArm.pivot.rotation.set(1.45 * p, 0.1 * p, 0.08);
      rightArm.forearmPivot.rotation.set(0.45 * p, 0, 0);
    }
  }

  // ---------------------------------------------------------------- kora tracking
  function updateKora(dt) {
    if (wrongWayCooldown > 0) wrongWayCooldown -= dt;

    const target = findKoraTargetForZone(state.zone);
    if (!target) return;

    const pos = state.player.position;
    const dx = pos.x - target.x;
    const dz = pos.z - target.z;
    const dist = Math.hypot(dx, dz);
    const maxR = target.map === 'stupa' ? Math.max(target.maxR, W.walkRadius || 38) : (target.maxR + 4);
    const minR = Math.max(0, target.minR - 2);
    const inRing = dist >= minR && dist <= maxR;
    const theta = Math.atan2(dz, dx);

    if (activeKoraTargetId !== target.id || !wasInKoraRing) {
      activeKoraTargetId = target.id;
      lastTheta = theta;
      wasInKoraRing = inRing;
      if (!inRing) return;
    }
    if (!inRing) {
      wasInKoraRing = false;
      lastTheta = theta;
      return;
    }
    wasInKoraRing = true;

    const dTheta = wrapAngle(theta - lastTheta);
    lastTheta = theta;

    if (Math.abs(dTheta) < 1e-6 || Math.abs(dTheta) > 0.8) return;

    koraAccum += dTheta;
    if (koraAccum < 0) koraAccum = 0;

    if (dTheta < 0) {
      ccwWindowAccum += -dTheta;
      if (ccwWindowAccum >= deg(25) && wrongWayCooldown <= 0) {
        ccwWindowAccum = 0;
        wrongWayCooldown = 18;
        bus.emit('kora:wrongway', { target: target.id });
      }
    } else {
      ccwWindowAccum = Math.max(0, ccwWindowAccum - dTheta * 2);
    }

    if (koraAccum >= TWO_PI) {
      koraAccum -= TWO_PI;
      koraLaps += 1;
      lastEmittedFraction = koraAccum / TWO_PI;
      bus.emit('kora:progress', { fraction: lastEmittedFraction, laps: koraLaps, target: target.id });
      bus.emit('merit', { type: 'kora', target: target.id });
      bus.emit('kora:lap', { target: target.id, laps: koraLaps });
      bus.emit('sfx', { name: 'bell' });
      return;
    }

    const fraction = Math.max(0, Math.min(1, koraAccum / TWO_PI));
    if (Math.abs(fraction - lastEmittedFraction) >= 0.008) {
      lastEmittedFraction = fraction;
      bus.emit('kora:progress', { fraction, laps: koraLaps, target: target.id });
    }
  }

  // ---------------------------------------------------------------- natural blinking update
  function updateBlink(dt) {
    const shouldClose =
      state.player.action === 'faint' ||
      state.player.action === 'prostrate' ||
      state.player.action === 'chant' ||
      (state.customizing && (previewPose === 'chant' || previewPose === 'prostrate'));

    if (shouldClose) {
      if (!isEyesClosed) {
        isEyesClosed = true;
        drawFaceCanvas(resolveAppearanceColors(appearance), true);
      }
      return;
    }

    blinkTimer -= dt;
    if (blinkTimer <= 0) {
      if (!isEyesClosed) {
        isEyesClosed = true;
        blinkTimer = 0.14;
        drawFaceCanvas(resolveAppearanceColors(appearance), true);
      } else {
        isEyesClosed = false;
        blinkTimer = 3.2 + Math.random() * 2.8;
        drawFaceCanvas(resolveAppearanceColors(appearance), false);
      }
    }
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    const input = ctx.input;
    updateBlink(dt);
    updateNameplate();

    // Studio customization mode (active in either 'intro' or 'play')
    if (state.customizing) {
      previewPoseTimer += dt;
      if (previewPose === 'prostrate') {
        applyProstrationPose(previewPoseTimer % PROSTRATE_DUR, false);
      } else if (previewPose === 'chant') {
        resetPose();
        const breathe = Math.sin(state.elapsed * 2.4);
        torsoPivot.position.y = 0.72 + breathe * 0.012;
        torsoPivot.rotation.x = -0.05;
        leftArm.pivot.rotation.set(0.75, -0.45, 0);
        rightArm.pivot.rotation.set(0.75, 0.45, 0);
        leftArm.forearmPivot.rotation.set(1.1, 0, 0.35);
        rightArm.forearmPivot.rotation.set(1.1, 0, -0.35);
        auraMat.opacity = 0.55 + 0.2 * Math.sin(state.elapsed * 3.2);
        const s = 1.0 + 0.12 * Math.sin(state.elapsed * 3.2);
        aura.scale.set(s, s, s);
      } else {
        resetPose();
        const breathe = Math.sin(state.elapsed * 2.1) * 0.015;
        torsoPivot.position.y = 0.72 + breathe;
      }
      root.position.copy(state.player.position);
      const yawOffset = typeof state.customizePreviewYaw === 'number' ? state.customizePreviewYaw : 0;
      root.rotation.y = state.player.heading + yawOffset;
      return;
    }

    // Outside play mode: idle breathing
    if (state.mode !== 'play') {
      resetPose();
      const breathe = Math.sin(state.elapsed * 2.1) * 0.015;
      torsoPivot.position.y = 0.72 + breathe;
      root.position.copy(state.player.position);
      root.rotation.y = state.player.heading;
      return;
    }

    // 0. Active faint sequence
    if (state.player.action === 'faint') {
      faintAnimTime += dt;
      applyFaintPose(faintAnimTime);
      state.player.velocity.set(0, 0, 0);
      state.player.isMoving = false;
      root.position.copy(state.player.position);
      root.rotation.y = state.player.heading;
      return;
    }

    // 1. Active prostration sequence
    if (prostrateTime >= 0) {
      prostrateTime += dt;
      if (prostrateTime >= PROSTRATE_DUR) {
        prostrateTime = -1;
        resetPose();
        state.player.action = 'idle';
        bus.emit('merit', { type: 'prostration' });
        bus.emit('vitals:restore', {
          hp: config.VITALS?.restore?.prostrationHp ?? 25,
          source: 'prostration',
        });
        bus.emit('sfx', { name: 'bowl' });
      } else {
        applyProstrationPose(prostrateTime, true);
      }
      root.position.copy(state.player.position);
      root.rotation.y = state.player.heading;
      return;
    }

    // 2. Active short gesture ('light' or 'feed')
    if (gesture) {
      gesture.timer += dt;
      state.player.heading = lerpAngle(state.player.heading, gesture.targetHeading, dt * 10);
      if (gesture.timer >= gesture.duration) {
        gesture = null;
        resetPose();
        state.player.action = 'idle';
      } else {
        applyGesturePose(gesture);
        root.position.copy(state.player.position);
        root.rotation.y = state.player.heading;
        return;
      }
    }

    // 3. Start prostration if requested
    if (input && input.pressed('prostrate') && !state.uiOpen) {
      if (ctx.world?.isCombatZone()) {
        bus.emit('toast', { key: 'toast.noProstrateWild', kind: 'warning' });
        return;
      }
      chantTimer = 0;
      prostrateTime = 0;
      prostrateStartHeading = state.player.heading;
      prostrateTargetHeading = Math.atan2(state.player.position.x, state.player.position.z);
      state.player.velocity.set(0, 0, 0);
      state.player.isMoving = false;
      state.player.action = 'prostrate';
      applyProstrationPose(0, true);
      root.position.copy(state.player.position);
      root.rotation.y = state.player.heading;
      return;
    }

    // 4. Camera-relative movement
    const mx = (input && !state.uiOpen && !state.player.lockedMovement) ? input.move.x : 0;
    const my = (input && !state.uiOpen && !state.player.lockedMovement) ? input.move.y : 0;
    const moveMag = Math.min(1, Math.hypot(mx, my));
    const isRun = Boolean(input && input.run && moveMag > 0.1);

    ctx.camera.getWorldDirection(camForward);
    camForward.y = 0;
    if (camForward.lengthSq() < 1e-6) camForward.set(0, 0, -1);
    else camForward.normalize();
    camRight.set(-camForward.z, 0, camForward.x);

    let targetSpeed = moveMag > 0.02 ? (isRun ? P.runSpeed : P.walkSpeed) * moveMag : 0;
    if (state.player.moveSpeedMult && state.player.moveSpeedMult !== 1) {
      targetSpeed *= state.player.moveSpeedMult;
    }
    if (state.elapsed < (state.player.slowUntil || 0)) {
      targetSpeed *= (state.player.slowMultiplier ?? config.VITALS?.slowMultiplier ?? 0.5);
    } else if (state.player.slowMultiplier != null) {
      state.player.slowMultiplier = null;
    }
    const isCastSlow = state.elapsed < (state.player.castSlowUntil || 0);
    if (isCastSlow) {
      targetSpeed *= 0.8;
    }
    if (chantTimer > 0) {
      targetSpeed *= (config.MANTRA?.moveSpeedMult ?? 0.6);
    }
    const desiredVx = (camRight.x * mx + camForward.x * my) * (moveMag > 0 ? targetSpeed / moveMag : 0);
    const desiredVz = (camRight.z * mx + camForward.z * my) * (moveMag > 0 ? targetSpeed / moveMag : 0);

    const accel = moveMag > 0.02 ? 12 : 14;
    const blend = Math.min(1, accel * dt);
    state.player.velocity.x += (desiredVx - state.player.velocity.x) * blend;
    state.player.velocity.z += (desiredVz - state.player.velocity.z) * blend;
    state.player.velocity.y = 0;

    const speed = Math.hypot(state.player.velocity.x, state.player.velocity.z);
    if (speed < 0.02 && moveMag <= 0.02) {
      state.player.velocity.set(0, 0, 0);
    }

    movePlayerWithCollisions(state.player.velocity.x * dt, state.player.velocity.z * dt);

    const isSlowed = state.elapsed < (state.player?.slowUntil || 0);
    if (flashTimer > 0) {
      flashTimer = Math.max(0, flashTimer - dt);
      if (flashTimer === 0) {
        restoreFlash();
      }
    } else {
      if (isSlowed && !wasSlowed) {
        for (const item of originalEmissives) {
          item.mat.emissive.setHex(0x38bdf8);
          item.mat.emissiveIntensity = 0.45;
        }
        wasSlowed = true;
      } else if (!isSlowed && wasSlowed) {
        restoreFlash();
      }
    }

    state.player.isMoving = speed > 0.12;
    state.player.action = state.player.isMoving ? (isRun ? 'run' : 'walk') : 'idle';

    if (hurtTimer > 0) {
      hurtTimer = Math.max(0, hurtTimer - dt);
      state.player.action = 'hurt';
    }

    if (chantTimer > 0) {
      chantTimer = Math.max(0, chantTimer - dt);
      state.player.action = 'chant';
    }

    if (state.player.isMoving && !isCastSlow) {
      const targetHeading = Math.atan2(-state.player.velocity.x, -state.player.velocity.z);
      state.player.heading = lerpAngle(state.player.heading, targetHeading, dt * 11);
    }

    // 5. Walk / run / idle procedural pose
    resetPose();
    if (state.player.isMoving) {
      const freq = isRun ? 10.5 : 6.8;
      walkPhase += dt * freq * Math.min(1.2, speed / P.walkSpeed);
      const swing = Math.sin(walkPhase);
      const bob = Math.abs(Math.cos(walkPhase)) * (isRun ? 0.055 : 0.03);
      body.position.y = bob;
      torsoPivot.rotation.x = isRun ? -0.14 : -0.06;
      torsoPivot.rotation.y = -swing * 0.08;

      const armAmp = isRun ? 0.65 : 0.38;
      leftArm.pivot.rotation.x = swing * armAmp;
      rightArm.pivot.rotation.x = -swing * armAmp;
      leftArm.forearmPivot.rotation.x = 0.25 + Math.max(0, swing) * 0.35;
      rightArm.forearmPivot.rotation.x = 0.25 + Math.max(0, -swing) * 0.35;

      const legAmp = isRun ? 0.55 : 0.35;
      leftLeg.rotation.x = -swing * legAmp;
      rightLeg.rotation.x = swing * legAmp;

      stepAccum += speed * dt;
      const stride = isRun ? 1.55 : 1.25;
      if (stepAccum >= stride) {
        stepAccum %= stride;
        bus.emit('sfx', { name: 'step' });
      }
    } else {
      const breathe = Math.sin(state.elapsed * 2.2);
      torsoPivot.position.y = 0.72 + breathe * 0.012;
      leftArm.pivot.rotation.z = -0.07 - breathe * 0.015;
      rightArm.pivot.rotation.z = 0.07 + breathe * 0.015;
      stepAccum = 0;
    }

    if (isCastSlow && chantTimer <= 0) {
      rightArm.pivot.rotation.set(1.45, -0.05, 0.08);
      rightArm.forearmPivot.rotation.set(0.18, 0, 0);
      leftArm.pivot.rotation.set(0.65, -0.35, 0);
      leftArm.forearmPivot.rotation.set(0.95, 0, 0.25);
    }

    if (chantTimer > 0) {
      torsoPivot.rotation.x = isRun ? -0.08 : -0.04;
      leftArm.pivot.rotation.set(0.75, -0.45, 0);
      rightArm.pivot.rotation.set(0.75, 0.45, 0);
      leftArm.forearmPivot.rotation.set(1.1, 0, 0.35);
      rightArm.forearmPivot.rotation.set(1.1, 0, -0.35);

      const chantProgress = chantDuration > 0 ? chantTimer / chantDuration : 0;
      auraMat.opacity = Math.sin(chantProgress * Math.PI) * 0.75;
    }

    if (hurtTimer > 0) {
      torsoPivot.rotation.x = 0.22;
      headGroup.rotation.x = 0.15;
      body.position.y = -0.04;
      leftArm.pivot.rotation.set(0.35, -0.2, -0.45);
      rightArm.pivot.rotation.set(0.35, 0.2, 0.45);
    }

    root.position.copy(state.player.position);
    root.rotation.y = state.player.heading;

    if (findKoraTargetForZone(state.zone)) {
      updateKora(dt);
    }
  }

  const api = {
    update,
    mesh: root,
    koraTargets,
    resolveCollisions,
    moveWithCollisions: movePlayerWithCollisions,
    getKoraProgress() {
      return { fraction: Math.max(0, Math.min(1, koraAccum / TWO_PI)), laps: koraLaps, target: activeKoraTargetId };
    },
    getAppearance() {
      return { ...appearance };
    },
    setAppearance(nextSpec, opts) {
      return applyAppearance(nextSpec, opts);
    },
    setPreviewPose(poseName) {
      previewPose = poseName || 'idle';
      previewPoseTimer = 0;
    },
    getPreviewPose() {
      return previewPose;
    },
  };
  ctx.player = api;
  return api;
}
