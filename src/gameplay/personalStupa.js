/**
 * Personal Votive Stupa Builder 3D Meshes, Pilgrim Stupa Groves (`stupa` & `samye` zones),
 * Samye 1,008 Consecration Crown InstancedMesh, and Global Co-op Blessing Hook (Ticket #60).
 *
 * Strictly ZERO PointLights — uses MeshStandardMaterial with emissive & AdditiveBlending meshes.
 */
import * as THREE from 'three';
import '../i18n/stupaBuild.js';
import {
  getPartDef,
  normalizeStupaSpec,
  SAMYE_COOP_MILESTONES,
  getActiveSamyeMilestone,
} from '../data/stupaMaterials.js';

const TWO_PI = Math.PI * 2;
const SAMYE_ORIGIN = { x: 5000, z: 0 };
const SAMYE_WALL_RADIUS = 43.0;
const SAMYE_CROWN_COUNT = 1008;

const FLAG_COLORS = [0x2563eb, 0xf8fafc, 0xdc2626, 0x16a34a, 0xeab308];

let sharedHarmikaEyesTex = null;
let sharedMantraRingTex = null;

function getHarmikaEyesTexture(THREE_NS = THREE) {
  if (sharedHarmikaEyesTex) return sharedHarmikaEyesTex;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  if (!g) return null;

  // Golden background with crimson Tibetan frieze
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.5, '#fbbf24');
  grad.addColorStop(1, '#d97706');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 128);

  g.fillStyle = '#7f1d1d';
  g.fillRect(0, 0, 256, 18);
  g.fillRect(0, 112, 256, 16);

  // Wisdom Eyes (Left & Right)
  function drawWisdomEye(cx, cy) {
    g.save();
    g.translate(cx, cy);
    g.beginPath();
    g.moveTo(-36, 2);
    g.quadraticCurveTo(0, -22, 36, -2);
    g.quadraticCurveTo(0, 20, -36, 2);
    g.closePath();
    g.fillStyle = '#fffbeb';
    g.fill();
    g.lineWidth = 3.5;
    g.strokeStyle = '#1e1b4b';
    g.stroke();

    // Pupil
    g.beginPath();
    g.arc(0, 0, 10, 0, TWO_PI);
    g.fillStyle = '#0f172a';
    g.fill();

    g.beginPath();
    g.arc(-3, -3, 2.5, 0, TWO_PI);
    g.fillStyle = '#ffffff';
    g.fill();
    g.restore();
  }

  drawWisdomEye(78, 62);
  drawWisdomEye(178, 62);

  // Third eye (Urna) & Ekai nose spiral
  g.beginPath();
  g.arc(128, 36, 7, 0, TWO_PI);
  g.fillStyle = '#dc2626';
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = '#fef08a';
  g.stroke();

  g.beginPath();
  g.moveTo(128, 52);
  g.bezierCurveTo(118, 66, 138, 78, 125, 96);
  g.lineWidth = 4;
  g.strokeStyle = '#1e1b4b';
  g.stroke();

  const tex = new THREE_NS.CanvasTexture(canvas);
  if (THREE_NS.SRGBColorSpace) tex.colorSpace = THREE_NS.SRGBColorSpace;
  sharedHarmikaEyesTex = tex;
  return tex;
}

function getMantraRingTexture(THREE_NS = THREE) {
  if (sharedMantraRingTex) return sharedMantraRingTex;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  if (!g) return null;

  g.clearRect(0, 0, 512, 64);
  g.strokeStyle = 'rgba(251, 191, 36, 0.85)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 8);
  g.lineTo(512, 8);
  g.moveTo(0, 56);
  g.lineTo(512, 56);
  g.stroke();

  g.fillStyle = '#fef08a';
  g.font = 'bold 30px "Noto Serif Tibetan", "Noto Serif TC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const syllables = ['ཨོཾ', 'མ', 'ཎི', 'པ', 'དྨེ', 'ཧཱུྃ', 'ཨོཾ', 'མ', 'ཎི', 'པ', 'དྨེ', 'ཧཱུྃ'];
  for (let i = 0; i < syllables.length; i++) {
    const x = ((i + 0.5) / syllables.length) * 512;
    g.fillText(syllables[i], x, 33);
  }

  const tex = new THREE_NS.CanvasTexture(canvas);
  tex.wrapS = THREE_NS.RepeatWrapping;
  if (THREE_NS.SRGBColorSpace) tex.colorSpace = THREE_NS.SRGBColorSpace;
  sharedMantraRingTex = tex;
  return tex;
}

/**
 * Creates a floating CanvasTexture Sprite plaque for a votive stupa or monument.
 */
function createStupaPlaqueSprite(THREE_NS, {
  title = '蓮華吉祥塔',
  pilgrimName = '雪域行者',
  kora = 0,
  prostrations = 0,
  message = '',
  rejoiceCount = 0,
  isOwn = false,
  isMonument = false,
  subtitle = '',
  i18n = null,
} = {}) {
  if (typeof document === 'undefined') {
    return new THREE_NS.Group();
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 208;
  const g = canvas.getContext('2d');
  if (!g) return new THREE_NS.Group();

  // Rounded dark Tibetan plaque with golden double frame
  const pad = 10;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const r = 18;

  g.save();
  g.beginPath();
  g.moveTo(pad + r, pad);
  g.lineTo(pad + w - r, pad);
  g.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
  g.lineTo(pad + w, pad + h - r);
  g.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
  g.lineTo(pad + r, pad + h);
  g.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
  g.lineTo(pad, pad + r);
  g.quadraticCurveTo(pad, pad, pad + r, pad);
  g.closePath();

  const bg = g.createLinearGradient(0, pad, 0, pad + h);
  if (isMonument) {
    bg.addColorStop(0, 'rgba(48, 20, 18, 0.92)');
    bg.addColorStop(1, 'rgba(20, 12, 10, 0.94)');
  } else if (isOwn) {
    bg.addColorStop(0, 'rgba(45, 32, 12, 0.92)');
    bg.addColorStop(1, 'rgba(18, 14, 10, 0.92)');
  } else {
    bg.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
    bg.addColorStop(1, 'rgba(10, 15, 28, 0.92)');
  }
  g.fillStyle = bg;
  g.fill();

  g.lineWidth = isOwn || isMonument ? 4 : 2.5;
  g.strokeStyle = isOwn || isMonument ? '#fbbf24' : 'rgba(251, 191, 36, 0.68)';
  g.stroke();

  // Inner hairline border
  g.strokeStyle = 'rgba(254, 240, 138, 0.22)';
  g.lineWidth = 1;
  g.strokeRect(pad + 8, pad + 8, w - 16, h - 16);

  g.textAlign = 'center';
  g.textBaseline = 'middle';

  if (isMonument) {
    g.fillStyle = '#fde68a';
    g.font = 'bold 28px "Noto Serif TC", Georgia, serif';
    g.fillText(String(title).slice(0, 22), 256, 68);

    g.fillStyle = '#fef3c7';
    g.font = '21px "Noto Sans TC", sans-serif';
    g.fillText(String(subtitle).slice(0, 32), 256, 118);

    g.fillStyle = '#fbbf24';
    g.font = '18px "Noto Sans TC", sans-serif';
    g.fillText('[ E ]', 256, 158);
  } else {
    // Line 1: 🏛️ [Title]
    g.fillStyle = isOwn ? '#fde047' : '#fef08a';
    g.font = 'bold 26px "Noto Serif TC", Georgia, serif';
    const headerText = `🏛️ ${String(title || '蓮華吉祥塔').slice(0, 16)}`;
    g.fillText(headerText, 256, 46);

    // Line 2: 立塔：PilgrimName (繞塔 X · 禮拜 Y)
    const prefix = i18n?.t ? i18n.t('stupaBuild.plaque.pilgrimPrefix') : '立塔：';
    const statsStr = i18n?.t
      ? i18n.t('stupaBuild.plaque.stats', { kora, prostration: prostrations })
      : `繞塔 ${kora} · 禮拜 ${prostrations}`;
    const rejoiceStr = rejoiceCount > 0 ? ` · 🙏${rejoiceCount}` : '';
    g.fillStyle = '#cbd5e1';
    g.font = '19px "Noto Sans TC", sans-serif';
    g.fillText(`${prefix}${String(pilgrimName).slice(0, 12)} (${statsStr})${rejoiceStr}`, 256, 86);

    // Line 3 & 4: "Message"
    const msg = String(message || '').trim();
    if (msg) {
      g.fillStyle = '#fef3c7';
      g.font = 'italic 18px "Noto Serif TC", Georgia, serif';
      const line1 = msg.slice(0, 20);
      const line2 = msg.slice(20, 40);
      if (line2) {
        g.fillText(`「${line1}`, 256, 126);
        g.fillText(`${line2}${msg.length > 40 ? '…' : ''}」`, 256, 156);
      } else {
        g.fillText(`「${line1}」`, 256, 140);
      }
    }
  }
  g.restore();

  const tex = new THREE_NS.CanvasTexture(canvas);
  if (THREE_NS.SRGBColorSpace) tex.colorSpace = THREE_NS.SRGBColorSpace;
  const mat = new THREE_NS.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE_NS.Sprite(mat);
  sprite.scale.set(isMonument ? 3.2 : 2.65, isMonument ? 1.3 : 1.08, 1);
  return sprite;
}

/**
 * Procedural 3D Votive Stupa Builder (`buildVotiveStupaMesh(THREE, spec, opts)`).
 * Builds a ~2.6m tall Tibetan votive stupa (`THREE.Group`) based on `spec = { plinth, dome, spire, ornament }`.
 * Strictly ZERO PointLights!
 */
export function buildVotiveStupaMesh(THREE_NS = THREE, spec = {}, opts = {}) {
  const norm = normalizeStupaSpec(spec);
  const plinthDef = getPartDef('plinth', norm.plinth);
  const domeDef = getPartDef('dome', norm.dome);
  const spireDef = getPartDef('spire', norm.spire);
  const ornamentDef = getPartDef('ornament', norm.ornament);

  const group = new THREE_NS.Group();
  group.name = opts.id ? `VotiveStupa_${opts.id}` : 'VotiveStupa';
  group.userData.spec = { ...norm };

  // ------------------------------------------------ 1. Stepped Plinth (`y = 0 .. 0.92m`)
  const plinthMat = new THREE_NS.MeshStandardMaterial({
    color: plinthDef.color ?? 0xeae6df,
    emissive: plinthDef.emissive ?? 0x000000,
    emissiveIntensity: plinthDef.emissive ? 0.35 : 0.0,
    roughness: plinthDef.tier >= 3 ? 0.35 : 0.72,
    metalness: plinthDef.lotusPetals ? 0.55 : 0.08,
  });

  const trimMat = new THREE_NS.MeshStandardMaterial({
    color: domeDef.trim ?? 0xd97706,
    emissive: domeDef.trim ?? 0xd97706,
    emissiveIntensity: 0.25,
    roughness: 0.32,
    metalness: 0.65,
  });

  // 3 stepped square tiers + lion-throne waist
  const step1 = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(1.68, 0.24, 1.68), plinthMat);
  step1.position.y = 0.12;
  step1.castShadow = true;
  step1.receiveShadow = true;

  const step2 = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(1.42, 0.24, 1.42), plinthMat);
  step2.position.y = 0.36;
  step2.castShadow = true;

  const throneWaist = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(1.16, 0.28, 1.16), plinthMat);
  throneWaist.position.y = 0.62;
  throneWaist.castShadow = true;

  const step3 = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(1.28, 0.14, 1.28), trimMat);
  step3.position.y = 0.83;

  group.add(step1, step2, throneWaist, step3);

  // Optional Vajra Lotus Petals (`vajraLotus`)
  if (plinthDef.lotusPetals) {
    const petalMat = new THREE_NS.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.78,
    });
    const petalGeo = new THREE_NS.ConeGeometry(0.18, 0.32, 5);
    const lotusGroup = new THREE_NS.Group();
    lotusGroup.position.y = 0.86;
    const petalCount = 12;
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * TWO_PI;
      const petal = new THREE_NS.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(a) * 0.58, 0.04, Math.sin(a) * 0.58);
      petal.rotation.z = -Math.cos(a) * 0.42;
      petal.rotation.x = Math.sin(a) * 0.42;
      lotusGroup.add(petal);
    }
    group.add(lotusGroup);
  }

  // ------------------------------------------------ 2. Bumpa Dome + Harmika (`y = 0.90 .. 1.88m`)
  const domeMat = new THREE_NS.MeshStandardMaterial({
    color: domeDef.color ?? 0xf5f3ef,
    emissive: domeDef.emissive ?? domeDef.color ?? 0x000000,
    emissiveIntensity: domeDef.emissive ? 0.48 : 0.06,
    roughness: domeDef.transparent ? 0.15 : 0.52,
    metalness: domeDef.transparent ? 0.35 : 0.1,
    transparent: Boolean(domeDef.transparent),
    opacity: domeDef.transparent ? 0.84 : 1.0,
  });

  // Drum cylinder base of the Bumpa
  const bumpaDrum = new THREE_NS.Mesh(new THREE_NS.CylinderGeometry(0.54, 0.58, 0.28, 20), domeMat);
  bumpaDrum.position.y = 1.04;
  bumpaDrum.castShadow = true;
  group.add(bumpaDrum);

  // Main hemispherical Bumpa dome
  const bumpaDome = new THREE_NS.Mesh(
    new THREE_NS.SphereGeometry(0.56, 20, 14, 0, TWO_PI, 0, Math.PI * 0.62),
    domeMat
  );
  bumpaDome.position.y = 1.18;
  bumpaDome.castShadow = true;
  group.add(bumpaDome);

  // Decorative trim collar ring around Bumpa
  const collarRing = new THREE_NS.Mesh(new THREE_NS.TorusGeometry(0.55, 0.032, 8, 24), trimMat);
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.y = 1.16;
  group.add(collarRing);

  // Inner glowing mandala core if `crystalMandala`
  if (domeDef.transparent) {
    const coreMat = new THREE_NS.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.75,
      blending: THREE_NS.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE_NS.Mesh(new THREE_NS.OctahedronGeometry(0.24, 1), coreMat);
    core.position.y = 1.32;
    group.add(core);
    group.userData.crystalCore = core;
  }

  // Harmika (Eyes Block) at `y = 1.72m`
  const eyesTex = getHarmikaEyesTexture(THREE_NS);
  const harmikaMat = new THREE_NS.MeshStandardMaterial({
    color: eyesTex ? 0xffffff : (domeDef.trim ?? 0xfbbf24),
    map: eyesTex || null,
    emissive: 0xd97706,
    emissiveIntensity: 0.22,
    roughness: 0.38,
    metalness: 0.45,
  });
  const harmika = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(0.42, 0.26, 0.42), harmikaMat);
  harmika.position.y = 1.74;
  harmika.castShadow = true;
  group.add(harmika);

  const harmikaCap = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(0.48, 0.06, 0.48), trimMat);
  harmikaCap.position.y = 1.89;
  group.add(harmikaCap);

  // ------------------------------------------------ 3. Spire (`y = 1.92 .. 2.65m`)
  const spireMat = new THREE_NS.MeshStandardMaterial({
    color: spireDef.color ?? 0x78350f,
    emissive: spireDef.emissive ?? 0x000000,
    emissiveIntensity: spireDef.emissive ? 0.45 : 0.05,
    roughness: spireDef.metalness ? 0.25 : 0.72,
    metalness: spireDef.metalness ?? 0.15,
  });

  const wheelCount = spireDef.wheels || 7;
  const spireHeight = 0.50;
  const spireStartY = 1.93;

  // Central spire shaft
  const shaft = new THREE_NS.Mesh(
    new THREE_NS.ConeGeometry(0.18, spireHeight + 0.08, 12),
    spireMat
  );
  shaft.position.y = spireStartY + spireHeight * 0.5;
  group.add(shaft);

  // Individual Dharma Wheel rings (`7` or `13` tiers)
  for (let i = 0; i < wheelCount; i++) {
    const u = i / Math.max(1, wheelCount - 1);
    const radius = 0.22 * (1 - u * 0.58);
    const ring = new THREE_NS.Mesh(
      new THREE_NS.CylinderGeometry(radius, radius * 1.04, 0.022, 14),
      spireMat
    );
    ring.position.y = spireStartY + u * spireHeight;
    group.add(ring);
  }

  // Finial crown (`goldSunMoon` vs standard lotus bud)
  const finialBaseY = spireStartY + spireHeight + 0.04;
  if (spireDef.sunMoon) {
    const goldFinialMat = new THREE_NS.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.75,
      roughness: 0.18,
      metalness: 0.88,
    });
    // Parasol (Chattra) disc
    const parasol = new THREE_NS.Mesh(new THREE_NS.CylinderGeometry(0.16, 0.19, 0.03, 16), goldFinialMat);
    parasol.position.y = finialBaseY;
    group.add(parasol);

    // Crescent Moon cradle
    const moon = new THREE_NS.Mesh(
      new THREE_NS.TorusGeometry(0.09, 0.022, 8, 16, Math.PI * 1.15),
      goldFinialMat
    );
    moon.rotation.z = Math.PI * 0.92;
    moon.position.y = finialBaseY + 0.09;
    group.add(moon);

    // Sun Disc & Nadabindu flame
    const sunDisc = new THREE_NS.Mesh(new THREE_NS.SphereGeometry(0.055, 12, 10), goldFinialMat);
    sunDisc.position.y = finialBaseY + 0.12;
    group.add(sunDisc);

    const nada = new THREE_NS.Mesh(new THREE_NS.ConeGeometry(0.03, 0.09, 8), goldFinialMat);
    nada.position.y = finialBaseY + 0.20;
    group.add(nada);

    // Subtle Additive Halo around the Sun-Moon finial
    const finialHalo = new THREE_NS.Mesh(
      new THREE_NS.SphereGeometry(0.18, 12, 10),
      new THREE_NS.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.32,
        blending: THREE_NS.AdditiveBlending,
        depthWrite: false,
      })
    );
    finialHalo.position.y = finialBaseY + 0.12;
    group.add(finialHalo);
  } else {
    const finialBud = new THREE_NS.Mesh(new THREE_NS.ConeGeometry(0.06, 0.14, 10), spireMat);
    finialBud.position.y = finialBaseY + 0.05;
    group.add(finialBud);
  }

  // ------------------------------------------------ 4. Sacred Ornaments (`ornament`)
  if (ornamentDef.id === 'prayerFlags') {
    const flagsGroup = new THREE_NS.Group();
    flagsGroup.name = 'Ornament_PrayerFlags';
    const cordMat = new THREE_NS.MeshBasicMaterial({ color: 0xfef3c7 });
    const flagGeo = new THREE_NS.PlaneGeometry(0.11, 0.13);

    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * TWO_PI + Math.PI / 4;
      const topPt = new THREE_NS.Vector3(0, 2.38, 0);
      const botPt = new THREE_NS.Vector3(Math.cos(ang) * 0.92, 0.76, Math.sin(ang) * 0.92);

      // Thin cord mesh connecting spire top to plinth corner
      const dir = new THREE_NS.Vector3().subVectors(botPt, topPt);
      const len = dir.length();
      const cord = new THREE_NS.Mesh(new THREE_NS.CylinderGeometry(0.006, 0.006, len, 4), cordMat);
      cord.position.copy(topPt).addScaledVector(dir, 0.5);
      cord.quaternion.setFromUnitVectors(new THREE_NS.Vector3(0, 1, 0), dir.clone().normalize());
      flagsGroup.add(cord);

      // 5 colored mini lungta flags along each cord
      for (let f = 0; f < 5; f++) {
        const u = 0.18 + f * 0.16;
        const pos = new THREE_NS.Vector3().lerpVectors(topPt, botPt, u);
        const fMat = new THREE_NS.MeshBasicMaterial({
          color: FLAG_COLORS[f % FLAG_COLORS.length],
          side: THREE_NS.DoubleSide,
        });
        const flag = new THREE_NS.Mesh(flagGeo, fMat);
        flag.position.copy(pos);
        flag.position.y -= 0.05;
        flag.rotation.y = -ang + Math.PI / 2;
        flagsGroup.add(flag);
      }
    }
    group.add(flagsGroup);
    group.userData.prayerFlags = flagsGroup;
  } else if (ornamentDef.id === 'butterLamps') {
    const lampsGroup = new THREE_NS.Group();
    lampsGroup.name = 'Ornament_ButterLamps';
    const cupMat = new THREE_NS.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.75,
    });
    const flameMat = new THREE_NS.MeshBasicMaterial({
      color: new THREE_NS.Color(2.2, 1.35, 0.32),
      blending: THREE_NS.AdditiveBlending,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      toneMapped: false,
    });
    const cupGeo = new THREE_NS.CylinderGeometry(0.055, 0.04, 0.06, 8);
    const flameGeo = new THREE_NS.ConeGeometry(0.038, 0.11, 7);

    const lampCount = 8;
    for (let i = 0; i < lampCount; i++) {
      const a = (i / lampCount) * TWO_PI;
      const r = 0.78;
      const lx = Math.cos(a) * r;
      const lz = Math.sin(a) * r;

      const cup = new THREE_NS.Mesh(cupGeo, cupMat);
      cup.position.set(lx, 0.27, lz);
      const flame = new THREE_NS.Mesh(flameGeo, flameMat);
      flame.position.set(lx, 0.35, lz);
      lampsGroup.add(cup, flame);
    }

    // Soft additive ground glow ring around the plinth (Zero PointLights!)
    const glowRing = new THREE_NS.Mesh(
      new THREE_NS.RingGeometry(0.68, 0.98, 24),
      new THREE_NS.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.28,
        blending: THREE_NS.AdditiveBlending,
        side: THREE_NS.DoubleSide,
        depthWrite: false,
      })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.03;
    lampsGroup.add(glowRing);

    group.add(lampsGroup);
    group.userData.butterLamps = lampsGroup;
  } else if (ornamentDef.id === 'mantraHalo') {
    const haloGroup = new THREE_NS.Group();
    haloGroup.name = 'Ornament_MantraHalo';
    haloGroup.position.y = 1.32;

    const mantraTex = getMantraRingTexture(THREE_NS);
    const cylinderMat = new THREE_NS.MeshBasicMaterial({
      color: 0xfef08a,
      map: mantraTex || null,
      transparent: true,
      opacity: 0.88,
      blending: THREE_NS.AdditiveBlending,
      side: THREE_NS.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const mantraBand = new THREE_NS.Mesh(
      new THREE_NS.CylinderGeometry(0.78, 0.78, 0.18, 28, 1, true),
      cylinderMat
    );
    haloGroup.add(mantraBand);

    const goldRingMat = new THREE_NS.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.65,
      blending: THREE_NS.AdditiveBlending,
      depthWrite: false,
    });
    const torus = new THREE_NS.Mesh(new THREE_NS.TorusGeometry(0.78, 0.018, 8, 32), goldRingMat);
    torus.rotation.x = Math.PI / 2;
    haloGroup.add(torus);

    group.add(haloGroup);
    group.userData.mantraHalo = haloGroup;
  }

  // Highlight ring on ground if this is the player's own stupa
  if (opts.isOwn) {
    const ownRing = new THREE_NS.Mesh(
      new THREE_NS.RingGeometry(0.95, 1.18, 32),
      new THREE_NS.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.52,
        blending: THREE_NS.AdditiveBlending,
        side: THREE_NS.DoubleSide,
        depthWrite: false,
      })
    );
    ownRing.rotation.x = -Math.PI / 2;
    ownRing.position.y = 0.025;
    group.add(ownRing);
  }

  // ------------------------------------------------ 5. Overhead Floating Plaque (`THREE.Sprite`)
  if (opts.showPlaque !== false && (opts.title || opts.pilgrimName || opts.message)) {
    const plaque = createStupaPlaqueSprite(THREE_NS, {
      title: opts.title,
      pilgrimName: opts.pilgrimName,
      kora: opts.kora ?? 0,
      prostrations: opts.prostrations ?? 0,
      message: opts.message ?? '',
      rejoiceCount: opts.rejoiceCount ?? 0,
      isOwn: Boolean(opts.isOwn),
      i18n: opts.i18n,
    });
    plaque.position.set(0, 3.18, 0);
    group.add(plaque);
    group.userData.plaqueSprite = plaque;
  }

  return group;
}

/**
 * Builds the 3D Votive Stupa Altar & Samye Co-op Stele Monument (`發願立塔台・桑耶共建碑`).
 */
function buildMonumentAltarMesh(THREE_NS, { title, subtitle, i18n }) {
  const group = new THREE_NS.Group();
  group.name = 'VotiveStupaMonument';

  const stoneMat = new THREE_NS.MeshStandardMaterial({
    color: 0xd6d3d1,
    roughness: 0.75,
    metalness: 0.08,
  });
  const crimsonMat = new THREE_NS.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.65,
    metalness: 0.12,
  });
  const steleSlateMat = new THREE_NS.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x0f172a,
    emissiveIntensity: 0.35,
    roughness: 0.38,
    metalness: 0.25,
  });
  const goldMat = new THREE_NS.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.24,
    metalness: 0.82,
  });

  // 2-tier mandala stone platform
  const base1 = new THREE_NS.Mesh(new THREE_NS.CylinderGeometry(1.55, 1.72, 0.22, 8), stoneMat);
  base1.position.y = 0.11;
  base1.receiveShadow = true;
  const base2 = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(1.6, 0.32, 1.1), crimsonMat);
  base2.position.y = 0.38;
  base2.castShadow = true;
  group.add(base1, base2);

  // Carved Tibetan Inscription Stele (`功德碑`)
  const steleBody = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(1.06, 1.75, 0.26), steleSlateMat);
  steleBody.position.y = 1.41;
  steleBody.castShadow = true;
  group.add(steleBody);

  // Golden frame & Dharma Wheel (Dharmachakra) crest atop the stele
  const roofCap = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(1.26, 0.14, 0.38), goldMat);
  roofCap.position.y = 2.34;
  group.add(roofCap);

  const wheel = new THREE_NS.Mesh(new THREE_NS.TorusGeometry(0.24, 0.035, 10, 24), goldMat);
  wheel.position.y = 2.68;
  const hub = new THREE_NS.Mesh(new THREE_NS.SphereGeometry(0.07, 10, 10), goldMat);
  hub.position.y = 2.68;
  group.add(wheel, hub);
  group.userData.dharmaWheel = wheel;

  // Ground golden beacon ring
  const ring = new THREE_NS.Mesh(
    new THREE_NS.RingGeometry(1.62, 1.82, 32),
    new THREE_NS.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.5,
      blending: THREE_NS.AdditiveBlending,
      side: THREE_NS.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  const plaque = createStupaPlaqueSprite(THREE_NS, {
    title,
    subtitle,
    isMonument: true,
    i18n,
  });
  plaque.position.set(0, 3.45, 0);
  group.add(plaque);
  group.userData.plaqueSprite = plaque;

  return group;
}

/**
 * Builds the merged geometry for a golden lotus consecration crown + miniature finial
 * used in the 1,008-instance `THREE.InstancedMesh` atop Samye's perimeter wall.
 */
function createConsecrationCrownGeometry(THREE_NS) {
  const ringGeo = new THREE_NS.CylinderGeometry(0.28, 0.22, 0.14, 8);
  ringGeo.translate(0, 0.07, 0);
  const jewelGeo = new THREE_NS.OctahedronGeometry(0.16, 0);
  jewelGeo.translate(0, 0.28, 0);

  const geos = [ringGeo, jewelGeo];
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geos) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }

  const posArr = new Float32Array(totalVerts * 3);
  const normArr = new Float32Array(totalVerts * 3);
  const idxArr = new Uint16Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;
  for (const g of geos) {
    posArr.set(g.attributes.position.array, vOffset * 3);
    normArr.set(g.attributes.normal.array, vOffset * 3);
    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) {
        idxArr[iOffset + i] = idx[i] + vOffset;
      }
      iOffset += idx.length;
    }
    vOffset += g.attributes.position.count;
    g.dispose();
  }

  const merged = new THREE_NS.BufferGeometry();
  merged.setAttribute('position', new THREE_NS.BufferAttribute(posArr, 3));
  merged.setAttribute('normal', new THREE_NS.BufferAttribute(normArr, 3));
  merged.setIndex(new THREE_NS.BufferAttribute(idxArr, 1));
  return merged;
}

export function createPersonalStupa(ctx) {
  if (ctx.personalStupa) return ctx.personalStupa;
  const { THREE: THREE_CTX, state, bus, i18n } = ctx;
  const THREE_NS = THREE_CTX || THREE;

  // ------------------------------------------------ 1. Boudhanath (`stupa` zone) Grove & Altar
  const boudhaRoot = new THREE_NS.Group();
  boudhaRoot.name = 'PilgrimStupaGrove_Boudha';
  const stupaZoneGroup = ctx.zoneGroups?.stupa || ctx.stupaGroup || ctx.scene;
  if (stupaZoneGroup) {
    stupaZoneGroup.add(boudhaRoot);
  }

  // Altar at (23.5, 0, -21.5) in `stupa` zone
  const BOUDHA_ALTAR_POS = { x: 23.5, y: 0, z: -21.5 };
  let boudhaMonumentMesh = null;

  // 8 Stupa slots in an arc along radius r = 28..31m, angles -35° .. -75°
  const BOUDHA_SLOTS = [];
  const BOUDHA_ANGLES_DEG = [-35, -39, -46.5, -51.5, -57, -62.5, -68.5, -75];
  const BOUDHA_RADII = [28.4, 29.8, 28.6, 30.6, 28.8, 30.8, 29.0, 30.5];
  for (let i = 0; i < 8; i++) {
    const rad = (BOUDHA_ANGLES_DEG[i] * Math.PI) / 180;
    const r = BOUDHA_RADII[i];
    const x = +(Math.cos(rad) * r).toFixed(2);
    const z = +(Math.sin(rad) * r).toFixed(2);
    BOUDHA_SLOTS.push({
      zone: 'stupa',
      slotIdx: i,
      wx: x,
      wz: z,
      lx: x,
      lz: z,
      heading: Math.atan2(-x, -z),
    });
  }

  // ------------------------------------------------ 2. Samye (`samye` zone) Grove, Monument & 1,008 Crowns
  const samyeRoot = new THREE_NS.Group();
  samyeRoot.name = 'PilgrimStupaGrove_Samye';
  samyeRoot.position.set(SAMYE_ORIGIN.x, 0, SAMYE_ORIGIN.z);

  function ensureSamyeAttached() {
    const samyeZoneGroup = ctx.zoneGroups?.samye;
    if (samyeZoneGroup && samyeRoot.parent !== samyeZoneGroup) {
      samyeZoneGroup.add(samyeRoot);
    }
  }
  ensureSamyeAttached();

  // Monument at world (4984, 0, 48) -> local (-16, 0, 48)
  const SAMYE_MONUMENT_LOCAL = { x: -16, y: 0, z: 48 };
  const SAMYE_MONUMENT_WORLD = {
    x: SAMYE_ORIGIN.x + SAMYE_MONUMENT_LOCAL.x,
    y: 0,
    z: SAMYE_ORIGIN.z + SAMYE_MONUMENT_LOCAL.z,
  };
  let samyeMonumentMesh = null;

  // 10 Pilgrim Votive Stupa slots along outer ceremonial avenue (`r = 49.5m`, flanking south/east outer wall)
  const SAMYE_SLOTS = [];
  const SAMYE_ANGLES_DEG = [78, 70, 62, 54, 46, 38, 30, 22, 14, 6];
  for (let i = 0; i < 10; i++) {
    const rad = (SAMYE_ANGLES_DEG[i] * Math.PI) / 180;
    const r = 49.5;
    const lx = +(Math.cos(rad) * r).toFixed(2);
    const lz = +(Math.sin(rad) * r).toFixed(2);
    SAMYE_SLOTS.push({
      zone: 'samye',
      slotIdx: i,
      lx,
      lz,
      wx: +(SAMYE_ORIGIN.x + lx).toFixed(2),
      wz: +(SAMYE_ORIGIN.z + lz).toFixed(2),
      heading: Math.atan2(-lx, -lz),
    });
  }

  // Golden Consecration Crown Ring (`THREE.InstancedMesh`, count = 1008) atop Samye's perimeter wall (`r = 43.0m`, `y = 3.95m`)
  const crownGeo = createConsecrationCrownGeometry(THREE_NS);
  const crownMat = new THREE_NS.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.88,
  });
  const consecrationCrownsInst = new THREE_NS.InstancedMesh(crownGeo, crownMat, SAMYE_CROWN_COUNT);
  consecrationCrownsInst.name = 'SamyeConsecrationCrowns1008';
  consecrationCrownsInst.frustumCulled = false;
  samyeRoot.add(consecrationCrownsInst);

  const crownDummy = new THREE_NS.Object3D();
  let lastLitCrowns = -1;

  function updateSamyeConsecrationCrowns(contributedCount) {
    const lit = Math.max(0, Math.min(SAMYE_CROWN_COUNT, Math.floor(Number(contributedCount) || 0)));
    if (lit === lastLitCrowns) return;
    lastLitCrowns = lit;

    for (let i = 0; i < SAMYE_CROWN_COUNT; i++) {
      // Start from South entrance (angle = +PI/2) and proceed clockwise around the wall
      const ang = Math.PI * 0.5 + (i / SAMYE_CROWN_COUNT) * TWO_PI;
      crownDummy.position.set(
        Math.cos(ang) * SAMYE_WALL_RADIUS,
        3.95,
        Math.sin(ang) * SAMYE_WALL_RADIUS
      );
      crownDummy.rotation.set(0, -ang, 0);
      const scale = i < lit ? 1.0 : 0.0001;
      crownDummy.scale.setScalar(scale);
      crownDummy.updateMatrix();
      consecrationCrownsInst.setMatrixAt(i, crownDummy.matrix);
    }
    consecrationCrownsInst.instanceMatrix.needsUpdate = true;
    consecrationCrownsInst.userData.contributedStupas = lit;
  }

  // ------------------------------------------------ 3. Colliders & Monument Interactables
  if (Array.isArray(ctx.colliders)) {
    ctx.colliders.push(
      { type: 'circle', zone: 'stupa', x: BOUDHA_ALTAR_POS.x, z: BOUDHA_ALTAR_POS.z, r: 1.35 },
      { type: 'circle', zone: 'samye', x: SAMYE_MONUMENT_WORLD.x, z: SAMYE_MONUMENT_WORLD.z, r: 1.45 }
    );
  }

  // Track dynamic grove stupa meshes, colliders, and interactables
  const activeGroveMeshes = [];
  const animatedOrnaments = [];
  const dynamicStupaInteractables = [];
  const dynamicStupaColliders = [];

  function registerStaticMonuments() {
    if (!Array.isArray(ctx.interactables)) return;
    // Remove any previous monument entries with same id
    for (let i = ctx.interactables.length - 1; i >= 0; i--) {
      const id = ctx.interactables[i]?.id;
      if (id === 'votive-stupa-altar-boudha' || id === 'samye-coop-monument') {
        ctx.interactables.splice(i, 1);
      }
    }

    ctx.interactables.push(
      {
        id: 'votive-stupa-altar-boudha',
        kind: 'shrine',
        priority: 4,
        zone: 'stupa',
        action: 'interact',
        radius: 3.2,
        position: { x: BOUDHA_ALTAR_POS.x, y: 0, z: BOUDHA_ALTAR_POS.z },
        labelKey: 'prompt.openStupaBuilder',
        onInteract() {
          ctx.stupaBuilderUi?.open?.('build');
        },
      },
      {
        id: 'samye-coop-monument',
        kind: 'shrine',
        priority: 4,
        zone: 'samye',
        action: 'interact',
        radius: 3.5,
        position: { x: SAMYE_MONUMENT_WORLD.x, y: 0, z: SAMYE_MONUMENT_WORLD.z },
        labelKey: 'prompt.openSamyeMonument',
        get labelParams() {
          const prog = ctx.community?.getSamyeProgress?.() || { contributedStupas: 324 };
          return { n: prog.contributedStupas };
        },
        onInteract() {
          ctx.stupaBuilderUi?.open?.('samye');
        },
      }
    );
  }

  function rebuildMonumentMeshes() {
    if (boudhaMonumentMesh && boudhaMonumentMesh.parent) {
      boudhaMonumentMesh.parent.remove(boudhaMonumentMesh);
    }
    if (samyeMonumentMesh && samyeMonumentMesh.parent) {
      samyeMonumentMesh.parent.remove(samyeMonumentMesh);
    }

    const t = (k, p) => (i18n?.t ? i18n.t(k, p) : k);
    const prog = ctx.community?.getSamyeProgress?.() || { contributedStupas: 324 };

    boudhaMonumentMesh = buildMonumentAltarMesh(THREE_NS, {
      title: t('stupaBuild.monument.boudhaTitle'),
      subtitle: t('stupaBuild.monument.boudhaSub'),
      i18n,
    });
    boudhaMonumentMesh.position.set(BOUDHA_ALTAR_POS.x, 0, BOUDHA_ALTAR_POS.z);
    boudhaMonumentMesh.rotation.y = Math.atan2(-BOUDHA_ALTAR_POS.x, -BOUDHA_ALTAR_POS.z);
    boudhaRoot.add(boudhaMonumentMesh);

    const samyeY = ctx.world?.getHeight ? ctx.world.getHeight(SAMYE_MONUMENT_WORLD.x, SAMYE_MONUMENT_WORLD.z, 'samye') : 0;
    samyeMonumentMesh = buildMonumentAltarMesh(THREE_NS, {
      title: t('stupaBuild.monument.samyeTitle'),
      subtitle: t('stupaBuild.monument.samyeSub', { n: prog.contributedStupas }),
      i18n,
    });
    samyeMonumentMesh.position.set(SAMYE_MONUMENT_LOCAL.x, samyeY, SAMYE_MONUMENT_LOCAL.z);
    samyeMonumentMesh.rotation.y = 0;
    samyeRoot.add(samyeMonumentMesh);
  }

  // ------------------------------------------------ 4. Samye Global Blessing Hook
  let lastAppliedBlessingTier = -1;

  function refreshSamyeGlobalBlessing(force = false) {
    const prog = ctx.community?.getSamyeProgress?.() || {
      contributedStupas: 324,
      blessingTier: 1,
    };
    const milestone = getActiveSamyeMilestone(prog.contributedStupas);
    const tier = milestone ? milestone.tier : 0;

    state.samyeCoopBlessing = milestone
      ? {
          tier: milestone.tier,
          stupas: prog.contributedStupas,
          nameKey: milestone.nameKey,
          expBonus: milestone.buff.expBonus,
          findBonus: milestone.buff.findBonus,
        }
      : {
          tier: 0,
          stupas: prog.contributedStupas,
          nameKey: null,
          expBonus: 0,
          findBonus: 0,
        };

    updateSamyeConsecrationCrowns(prog.contributedStupas);

    if (!force && tier === lastAppliedBlessingTier) return;
    lastAppliedBlessingTier = tier;

    if (milestone && ctx.vitals?.addBuff) {
      ctx.vitals.addBuff(
        'samyeCoopBlessing',
        {
          expMult: +(1 + milestone.buff.expBonus).toFixed(4),
          findMult: +(1 + milestone.buff.findBonus / 100).toFixed(4),
          expBonus: Math.round(milestone.buff.expBonus * 100),
          findBonus: milestone.buff.findBonus,
        },
        3600
      );
    }
  }

  // ------------------------------------------------ 5. Rejoice & Prostrate at a Pilgrim Stupa
  function handleRejoiceStupa(stupaEntry, slot) {
    if (!stupaEntry) return;
    // Trigger prostration gesture toward the stupa
    bus.emit('player:gesture', {
      name: 'prostrate',
      target: { x: slot.wx, z: slot.wz },
    });

    const didRejoice = ctx.community?.rejoiceStupa
      ? ctx.community.rejoiceStupa(stupaEntry.id)
      : false;

    if (!didRejoice) {
      // Even if already rejoiced earlier, still offer a reverent bow and small merit blessing
      bus.emit('merit', { type: 'prostration', count: 1 });
    }

    bus.emit('sfx', { name: 'bowl' });
    bus.emit('toast', {
      key: 'toast.stupaRejoiced',
      params: {
        name: stupaEntry.pilgrimName || '雪域行者',
        title: stupaEntry.title || '蓮華吉祥塔',
        message: stupaEntry.message || '',
      },
      kind: 'merit',
    });

    // Rebuild grove so the updated rejoice count displays on the floating plaque
    rebuildGrove();
  }

  // ------------------------------------------------ 6. Rebuild Pilgrim Stupa Groves (`stupa` & `samye`)
  let groveRecords = [];

  function clearDynamicGrove() {
    for (const m of activeGroveMeshes) {
      if (m.parent) m.parent.remove(m);
    }
    activeGroveMeshes.length = 0;
    animatedOrnaments.length = 0;

    if (Array.isArray(ctx.interactables)) {
      for (const inter of dynamicStupaInteractables) {
        const idx = ctx.interactables.indexOf(inter);
        if (idx >= 0) ctx.interactables.splice(idx, 1);
      }
    }
    dynamicStupaInteractables.length = 0;

    if (Array.isArray(ctx.colliders)) {
      for (const col of dynamicStupaColliders) {
        const idx = ctx.colliders.indexOf(col);
        if (idx >= 0) ctx.colliders.splice(idx, 1);
      }
    }
    dynamicStupaColliders.length = 0;
    groveRecords = [];
  }

  function getSourceStupaList() {
    const fromCommunity = ctx.community?.getStupas?.() || [];
    if (fromCommunity.length > 0) {
      // Put player's own stupa first so it always occupies the prime #0 slot in both groves
      const own = fromCommunity.filter((s) => s.isOwn);
      const others = fromCommunity.filter((s) => !s.isOwn);
      return [...own, ...others];
    }
    return [
      {
        id: 'fallback-stupa-1',
        pilgrimName: '丹增嘉措',
        title: '蓮華光明塔',
        message: '願見此塔者悉發菩提心，如蓮華不染塵垢，圓滿福慧資糧。',
        kora: 21,
        prostrations: 108,
        spec: { plinth: 'vajraLotus', dome: 'whitePeace', spire: 'goldSunMoon', ornament: 'mantraHalo' },
        rejoiceCount: 36,
        isOwn: false,
      },
      {
        id: 'fallback-stupa-2',
        pilgrimName: '卓瑪央金',
        title: '雪域慈悲塔',
        message: '大悲觀音眷顧雪域眾生，願一切苦難化為清涼甘露。',
        kora: 14,
        prostrations: 64,
        spec: { plinth: 'alabaster', dome: 'redWisdom', spire: 'copperWheels', ornament: 'prayerFlags' },
        rejoiceCount: 24,
        isOwn: false,
      },
    ];
  }

  function rebuildGrove() {
    ensureSamyeAttached();
    clearDynamicGrove();
    rebuildMonumentMeshes();
    registerStaticMonuments();
    refreshSamyeGlobalBlessing(true);

    const list = getSourceStupaList();

    // 1. Populate up to 8 Pilgrim Votive Stupas in `stupa` zone (Boudhanath Plaza)
    const boudhaCount = Math.min(BOUDHA_SLOTS.length, list.length);
    for (let i = 0; i < boudhaCount; i++) {
      const entry = list[i];
      const slot = BOUDHA_SLOTS[i];
      const mesh = buildVotiveStupaMesh(THREE_NS, entry.spec, {
        id: `${entry.id}_boudha`,
        title: entry.title,
        pilgrimName: entry.pilgrimName,
        kora: entry.kora,
        prostrations: entry.prostrations,
        message: entry.message,
        rejoiceCount: entry.rejoiceCount,
        isOwn: entry.isOwn,
        i18n,
      });
      mesh.position.set(slot.lx, 0, slot.lz);
      mesh.rotation.y = slot.heading;
      boudhaRoot.add(mesh);
      activeGroveMeshes.push(mesh);

      if (mesh.userData.mantraHalo || mesh.userData.crystalCore) {
        animatedOrnaments.push(mesh);
      }

      const col = { type: 'circle', zone: 'stupa', x: slot.wx, z: slot.wz, r: 0.95 };
      ctx.colliders?.push(col);
      dynamicStupaColliders.push(col);

      const inter = {
        id: `pilgrim-stupa-boudha-${entry.id}`,
        kind: 'stupa',
        priority: 2,
        zone: 'stupa',
        action: 'interact',
        radius: 2.6,
        position: { x: slot.wx, y: 0, z: slot.wz },
        labelKey: 'prompt.rejoiceStupa',
        labelParams: {
          title: entry.title || '蓮華吉祥塔',
          name: entry.pilgrimName || '雪域行者',
        },
        onInteract: () => handleRejoiceStupa(entry, slot),
      };
      ctx.interactables?.push(inter);
      dynamicStupaInteractables.push(inter);

      groveRecords.push({
        zone: 'stupa',
        slotIdx: i,
        wx: slot.wx,
        wz: slot.wz,
        stupa: { ...entry, spec: normalizeStupaSpec(entry.spec) },
      });
    }

    // 2. Populate up to 10 Pilgrim Votive Stupas in `samye` zone (Outer Ceremonial Avenue)
    const samyeCount = Math.min(SAMYE_SLOTS.length, list.length);
    for (let i = 0; i < samyeCount; i++) {
      const entry = list[i % list.length];
      const slot = SAMYE_SLOTS[i];
      const groundY = ctx.world?.getHeight ? ctx.world.getHeight(slot.wx, slot.wz, 'samye') : 0;
      const mesh = buildVotiveStupaMesh(THREE_NS, entry.spec, {
        id: `${entry.id}_samye_${i}`,
        title: entry.title,
        pilgrimName: entry.pilgrimName,
        kora: entry.kora,
        prostrations: entry.prostrations,
        message: entry.message,
        rejoiceCount: entry.rejoiceCount,
        isOwn: entry.isOwn,
        i18n,
      });
      mesh.position.set(slot.lx, groundY, slot.lz);
      mesh.rotation.y = slot.heading;
      samyeRoot.add(mesh);
      activeGroveMeshes.push(mesh);

      if (mesh.userData.mantraHalo || mesh.userData.crystalCore) {
        animatedOrnaments.push(mesh);
      }

      const col = { type: 'circle', zone: 'samye', x: slot.wx, z: slot.wz, r: 0.95 };
      ctx.colliders?.push(col);
      dynamicStupaColliders.push(col);

      const inter = {
        id: `pilgrim-stupa-samye-${i}-${entry.id}`,
        kind: 'stupa',
        priority: 2,
        zone: 'samye',
        action: 'interact',
        radius: 2.6,
        position: { x: slot.wx, y: groundY, z: slot.wz },
        labelKey: 'prompt.rejoiceStupa',
        labelParams: {
          title: entry.title || '蓮華吉祥塔',
          name: entry.pilgrimName || '雪域行者',
        },
        onInteract: () => handleRejoiceStupa(entry, slot),
      };
      ctx.interactables?.push(inter);
      dynamicStupaInteractables.push(inter);

      groveRecords.push({
        zone: 'samye',
        slotIdx: i,
        wx: slot.wx,
        wz: slot.wz,
        stupa: { ...entry, spec: normalizeStupaSpec(entry.spec) },
      });
    }

    return groveRecords;
  }

  // Initial build
  rebuildGrove();

  // Event listeners to keep groves & Samye 1,008 crowns synced
  bus.on('community:stupaBuilt', () => rebuildGrove());
  bus.on('community:samyeContributed', () => {
    refreshSamyeGlobalBlessing(true);
    rebuildMonumentMeshes();
  });
  bus.on('community:changed', (payload) => {
    if (!payload || payload.type === 'stupa' || payload.type === 'rejoiceStupa' || payload.type === 'import' || payload.type === 'reset' || payload.type === 'sync') {
      rebuildGrove();
    } else if (payload.type === 'samye') {
      refreshSamyeGlobalBlessing(true);
      rebuildMonumentMeshes();
    }
  });
  bus.on('map:loaded', (payload) => {
    if (payload?.mapId === 'samye') {
      rebuildGrove();
    }
  });
  bus.on('zone:change', (payload) => {
    if (payload?.to === 'samye' || payload?.to === 'stupa') {
      ensureSamyeAttached();
      refreshSamyeGlobalBlessing(true);
    }
  });
  i18n?.onChange?.(() => {
    rebuildGrove();
  });

  // ------------------------------------------------ 7. Frame Update (`update(dt)`)
  let blessingRefreshTimer = 0;

  function update(dt) {
    // Rotate golden mantra halos & crystal mandala cores smoothly
    for (let i = 0; i < animatedOrnaments.length; i++) {
      const m = animatedOrnaments[i];
      if (m.userData.mantraHalo) {
        m.userData.mantraHalo.rotation.y += dt * 0.65;
      }
      if (m.userData.crystalCore) {
        m.userData.crystalCore.rotation.y -= dt * 0.9;
      }
    }

    // Rotate monument Dharma Wheels
    if (boudhaMonumentMesh?.userData?.dharmaWheel) {
      boudhaMonumentMesh.userData.dharmaWheel.rotation.z += dt * 0.4;
    }
    if (samyeMonumentMesh?.userData?.dharmaWheel) {
      samyeMonumentMesh.userData.dharmaWheel.rotation.z += dt * 0.4;
    }

    // Periodically keep the Samye Global Co-op Blessing buff refreshed
    blessingRefreshTimer += dt;
    if (blessingRefreshTimer >= 12.0) {
      blessingRefreshTimer = 0;
      refreshSamyeGlobalBlessing(true);
    }
  }

  function getGroveStupas(zoneFilter = null) {
    if (!zoneFilter) return groveRecords.map((r) => ({ ...r }));
    return groveRecords.filter((r) => r.zone === zoneFilter).map((r) => ({ ...r }));
  }

  const api = {
    update,
    rebuildGrove,
    buildVotiveStupaMesh: (spec, opts) => buildVotiveStupaMesh(THREE_NS, spec, opts),
    getGroveStupas,
    refreshSamyeGlobalBlessing: () => refreshSamyeGlobalBlessing(true),
  };

  ctx.personalStupa = api;

  ctx.debug?.register('personalStupa', {
    rebuildGrove: () => api.rebuildGrove(),
    getGroveStupas: (zone) => api.getGroveStupas(zone),
    refreshBlessing: () => api.refreshSamyeGlobalBlessing(),
    getSamyeCrownsCount: () => consecrationCrownsInst.userData.contributedStupas ?? 0,
  });

  return api;
}
