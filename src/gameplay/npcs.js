/**
 * Procedural 3D NPC Builder & Runtime System (`src/gameplay/npcs.js`).
 *
 * Supports 8 distinct cultural/story looks (`lama`, `merchant`, `artisan`, `villager`,
 * `noble`, `abbot`, `yogini`, `vision`), smooth turning toward the player, idle
 * animations (`pray`, `stand`, `work`), conditional `showIf` visibility, conditional
 * dialogue resolution, overhead quest markers (`!` / `?`), and debug showcase spawning.
 *
 * Zero PointLights are used (adhering strictly to the <= 6 PointLight budget).
 */
import * as THREE from 'three';
import { NPCS, NPC_LOOKS } from '../data/npcs.js';
import { createShop } from '../ui/shop.js';
import { createCrafting } from '../ui/crafting.js';
import '../i18n/quests.js';
import '../i18n/prologue.js';

const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * Math.min(1, t);
}

// ---------------------------------------------------------------- Shared Marker & Label Textures
let markerTextures = null;

function createMarkerTexture(symbol, colorHex = '#ffd84a', isSilver = false) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  if (c) {
    c.clearRect(0, 0, 128, 128);

    // Subtle dark-gold or silver diamond backing badge
    c.save();
    c.translate(64, 66);
    c.rotate(Math.PI / 4);
    c.fillStyle = 'rgba(20, 12, 28, 0.82)';
    c.strokeStyle = isSilver ? 'rgba(203, 213, 225, 0.92)' : 'rgba(255, 216, 74, 0.92)';
    c.lineWidth = 5;
    c.beginPath();
    c.roundRect(-30, -30, 60, 60, 8);
    c.fill();
    c.stroke();
    c.restore();

    // Glowing golden or silver symbol (! or ?)
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '900 68px "Outfit", "Noto Serif TC", Georgia, serif';
    c.shadowColor = isSilver ? 'rgba(148, 163, 184, 0.95)' : 'rgba(255, 190, 40, 0.95)';
    c.shadowBlur = 16;
    c.fillStyle = colorHex;
    c.fillText(symbol, 64, 68);

    c.shadowBlur = 0;
    c.fillStyle = isSilver ? '#f1f5f9' : '#fff9e6';
    c.fillText(symbol, 64, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function getMarkerTextures() {
  if (!markerTextures) {
    markerTextures = {
      '!': createMarkerTexture('!', '#ffd84a', false),
      '?': createMarkerTexture('?', '#ffd84a', false),
      '?_silver': createMarkerTexture('?', '#cbd5e1', true),
    };
  }
  return markerTextures;
}

function createLabelSprite(text) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    c.clearRect(0, 0, 256, 64);
    c.fillStyle = 'rgba(16, 11, 25, 0.82)';
    c.strokeStyle = 'rgba(238, 195, 108, 0.7)';
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(8, 8, 240, 48, 12);
    c.fill();
    c.stroke();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 22px "Outfit", "Noto Serif TC", sans-serif';
    c.fillStyle = '#fde68a';
    c.fillText(text, 128, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
}

/**
 * Procedural 3D NPC model builder supporting all 8 looks:
 * `lama` | `merchant` | `artisan` | `villager` | `noble` | `abbot` | `yogini` | `vision`
 */
export function buildNpc(look = 'lama', opts = {}) {
  const isVision = look === 'vision';
  const group = new THREE.Group();
  group.name = `NPC_${look}`;

  const body = new THREE.Group();
  group.add(body);

  // Palette per look
  const palettes = {
    lama: {
      skirt: 0x7a1c24,
      torso: 0x7a1c24,
      shawl: 0xe08a1e,
      sash: 0xd8a648,
      skin: 0xd9a17c,
      hair: 0x221a16,
    },
    merchant: {
      skirt: 0x224852,
      torso: 0x285460,
      shawl: 0xc85a28,
      sash: 0xd9b36c,
      skin: 0xd49b74,
      hair: 0x1e1612,
    },
    artisan: {
      skirt: 0x5c3a24,
      torso: 0x8e4c24,
      shawl: 0x3b2314,
      sash: 0xc8963e,
      skin: 0xd1956c,
      hair: 0x1a1412,
    },
    villager: {
      skirt: 0x5c5246,
      torso: 0x726555,
      shawl: 0x354b6e,
      sash: 0xb89c64,
      skin: 0xd8a07a,
      hair: 0x1e1814,
    },
    noble: {
      skirt: 0x42164b,
      torso: 0x581c62,
      shawl: 0xb82937,
      sash: 0xf0c254,
      skin: 0xdfb08c,
      hair: 0x181216,
    },
    abbot: {
      skirt: 0xc96414,
      torso: 0xe07c18,
      shawl: 0xf4a828,
      sash: 0x9e1b24,
      skin: 0xc98d66,
      hair: 0x1e1815,
    },
    yogini: {
      skirt: 0xf2eee6,
      torso: 0xf7f4ee,
      shawl: 0x3898d4,
      sash: 0x38c6b8,
      skin: 0xe5b898,
      hair: 0x16121a,
    },
    vision: {
      skirt: 0xffdf78,
      torso: 0xffe694,
      shawl: 0xffc84a,
      sash: 0xfff0b8,
      skin: 0xffe89e,
      hair: 0xffd260,
    },
  };

  const pal = palettes[look] || palettes.lama;

  function makeMat(hex, opts = {}) {
    if (isVision) {
      return new THREE.MeshStandardMaterial({
        color: hex,
        emissive: new THREE.Color(opts.emissive ?? 0xffa822),
        emissiveIntensity: opts.emissiveIntensity ?? 0.92,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: opts.opacity ?? 0.68,
        depthWrite: false,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: hex,
      roughness: opts.roughness ?? 0.72,
      metalness: opts.metalness ?? 0.08,
    });
  }

  const skirtMat = makeMat(pal.skirt);
  const torsoMat = makeMat(pal.torso);
  const shawlMat = makeMat(pal.shawl);
  const sashMat = makeMat(pal.sash, { roughness: 0.42, metalness: 0.35 });
  const skinMat = makeMat(pal.skin, { roughness: 0.62, metalness: 0.02, opacity: 0.74 });
  const hairMat = makeMat(pal.hair, { roughness: 0.85 });
  const bootMat = makeMat(0x281c16, { roughness: 0.85 });

  // Lower robe / skirt
  const skirtRadiusBottom = look === 'yogini' ? 0.34 : (look === 'noble' ? 0.33 : 0.31);
  const skirtGeo = new THREE.CylinderGeometry(0.21, skirtRadiusBottom, 0.74, 12);
  skirtGeo.translate(0, 0.37, 0);
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.castShadow = !isVision;
  skirt.receiveShadow = !isVision;
  body.add(skirt);

  // Decorative hem ring
  const hemGeo = new THREE.CylinderGeometry(skirtRadiusBottom - 0.005, skirtRadiusBottom + 0.005, 0.055, 12);
  hemGeo.translate(0, 0.06, 0);
  const hem = new THREE.Mesh(hemGeo, sashMat);
  body.add(hem);

  // Torso pivot
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.72, 0);
  body.add(torsoPivot);

  const torsoTopR = look === 'yogini' ? 0.195 : 0.22;
  const torsoGeo = new THREE.CylinderGeometry(torsoTopR, 0.20, 0.52, 12);
  torsoGeo.translate(0, 0.26, 0);
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.castShadow = !isVision;
  torso.receiveShadow = !isVision;
  torsoPivot.add(torso);

  // Shawl / lapel / apron per look
  if (look === 'artisan') {
    // Craftsman leather front apron
    const apronGeo = new THREE.BoxGeometry(0.32, 0.68, 0.08);
    const apron = new THREE.Mesh(apronGeo, shawlMat);
    apron.position.set(0, 0.08, -0.19);
    apron.castShadow = true;
    torsoPivot.add(apron);
  } else {
    const shawlGeo = new THREE.CylinderGeometry(torsoTopR + 0.014, 0.215, 0.44, 12, 1, false, -0.4, Math.PI * 1.28);
    shawlGeo.translate(0, 0.28, 0);
    const shawl = new THREE.Mesh(shawlGeo, shawlMat);
    shawl.castShadow = !isVision;
    torsoPivot.add(shawl);
  }

  // Waist sash
  const sashGeo = new THREE.TorusGeometry(0.208, 0.03, 8, 16);
  sashGeo.rotateX(Math.PI / 2);
  const sash = new THREE.Mesh(sashGeo, sashMat);
  sash.position.y = 0.03;
  torsoPivot.add(sash);

  // Head group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.56, 0);
  torsoPivot.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.155, 14, 12);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 0.14;
  head.castShadow = !isVision;
  headGroup.add(head);

  // Subtle eyebrows/eyes ONLY for non-vision NPCs (vision explicitly has NO facial details)
  if (!isVision) {
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1210 });
    const eyeGeo = new THREE.SphereGeometry(0.016, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.052, 0.15, -0.142);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.052, 0.15, -0.142);
    headGroup.add(leftEye, rightEye);
  }

  // Arms
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (torsoTopR + 0.025), 0.45, 0);

    const sleeveGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.28, 10);
    sleeveGeo.translate(0, -0.13, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, side < 0 ? shawlMat : torsoMat);
    sleeve.castShadow = !isVision;
    pivot.add(sleeve);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.26, 0);
    pivot.add(forearmPivot);

    const forearmGeo = new THREE.CylinderGeometry(0.052, 0.044, 0.24, 10);
    forearmGeo.translate(0, -0.12, 0);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.castShadow = !isVision;
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

  // Boots (hidden or ghostly for vision)
  if (!isVision) {
    for (const side of [-1, 1]) {
      const footGeo = new THREE.BoxGeometry(0.1, 0.09, 0.2);
      const foot = new THREE.Mesh(footGeo, bootMat);
      foot.position.set(side * 0.1, 0.045, -0.03);
      foot.castShadow = true;
      body.add(foot);
    }
  }

  // ---------------------------------------------------------------- Look-Specific Headgear & Props
  let handProp = null;
  let haloRing = null;
  let bodyHalo = null;

  if (look === 'lama') {
    // Yellow Pandita hat curved crest + mala/prayer wheel
    const hatMat = makeMat(0xe8a824, { roughness: 0.55 });
    const hatBaseGeo = new THREE.CylinderGeometry(0.162, 0.168, 0.11, 12);
    const hatBase = new THREE.Mesh(hatBaseGeo, hatMat);
    hatBase.position.y = 0.23;
    headGroup.add(hatBase);

    const crestGeo = new THREE.BoxGeometry(0.06, 0.18, 0.28);
    const crest = new THREE.Mesh(crestGeo, hatMat);
    crest.position.set(0, 0.31, 0.02);
    crest.rotation.x = -0.2;
    headGroup.add(crest);

    // Hand-held prayer wheel in right hand
    const wheelGroup = new THREE.Group();
    const stickGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6);
    const stick = new THREE.Mesh(stickGeo, makeMat(0x4a2c18));
    wheelGroup.add(stick);
    const drumGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.11, 10);
    const drum = new THREE.Mesh(drumGeo, sashMat);
    drum.position.y = 0.09;
    wheelGroup.add(drum);
    wheelGroup.position.set(0, -0.26, -0.04);
    wheelGroup.rotation.x = Math.PI / 2;
    rightArm.forearmPivot.add(wheelGroup);
    handProp = drum;
  } else if (look === 'merchant') {
    // Fur-brimmed dome hat
    const furMat = makeMat(0x422a1b, { roughness: 0.9 });
    const crownMat = makeMat(0xc44d26, { roughness: 0.65 });
    const brimGeo = new THREE.TorusGeometry(0.155, 0.045, 8, 16);
    brimGeo.rotateX(Math.PI / 2);
    const brim = new THREE.Mesh(brimGeo, furMat);
    brim.position.y = 0.22;
    headGroup.add(brim);

    const crownGeo = new THREE.SphereGeometry(0.145, 12, 10, 0, TWO_PI, 0, Math.PI * 0.55);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.22;
    headGroup.add(crown);

    // Wooden cargo pack on back (+Z is back)
    const packGroup = new THREE.Group();
    packGroup.position.set(0, 0.28, 0.25);
    const woodMat = makeMat(0x6e4726, { roughness: 0.82 });
    const boxGeo = new THREE.BoxGeometry(0.38, 0.48, 0.24);
    const packBox = new THREE.Mesh(boxGeo, woodMat);
    packBox.castShadow = true;
    packGroup.add(packBox);

    // Rolled cloth bundle on top of cargo pack
    const rollGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.42, 10);
    rollGeo.rotateZ(Math.PI / 2);
    const roll = new THREE.Mesh(rollGeo, makeMat(0x2b7a78));
    roll.position.set(0, 0.29, 0);
    packGroup.add(roll);
    torsoPivot.add(packGroup);
  } else if (look === 'artisan') {
    // Hair + craftsman headband
    const hairCapGeo = new THREE.SphereGeometry(0.16, 12, 10, 0, TWO_PI, 0, Math.PI * 0.55);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.y = 0.15;
    headGroup.add(hairCap);

    const bandGeo = new THREE.TorusGeometry(0.156, 0.022, 6, 16);
    bandGeo.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(bandGeo, makeMat(0xc88a32));
    band.position.y = 0.20;
    headGroup.add(band);

    // Crafting hammer in right hand
    const hammerGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.30, 6);
    const handle = new THREE.Mesh(handleGeo, makeMat(0x5c3a1e));
    hammerGroup.add(handle);
    const headBlockGeo = new THREE.BoxGeometry(0.07, 0.07, 0.16);
    const headBlock = new THREE.Mesh(headBlockGeo, sashMat);
    headBlock.position.y = 0.13;
    hammerGroup.add(headBlock);
    hammerGroup.position.set(0, -0.25, -0.05);
    hammerGroup.rotation.x = Math.PI / 2;
    rightArm.forearmPivot.add(hammerGroup);
    handProp = hammerGroup;
  } else if (look === 'villager') {
    // Woven cloth headscarf wrap
    const scarfMat = makeMat(0xd6c7ae, { roughness: 0.8 });
    const wrapGeo = new THREE.TorusGeometry(0.152, 0.038, 8, 16);
    wrapGeo.rotateX(Math.PI / 2);
    const wrap = new THREE.Mesh(wrapGeo, scarfMat);
    wrap.position.y = 0.22;
    headGroup.add(wrap);

    const topClothGeo = new THREE.SphereGeometry(0.152, 12, 8, 0, TWO_PI, 0, Math.PI * 0.5);
    const topCloth = new THREE.Mesh(topClothGeo, scarfMat);
    topCloth.position.y = 0.18;
    headGroup.add(topCloth);
  } else if (look === 'noble') {
    // Ornate gold collar & tall silk ministerial turban hat with turquoise gem
    const collarGeo = new THREE.TorusGeometry(0.215, 0.038, 8, 16);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, sashMat);
    collar.position.y = 0.50;
    torsoPivot.add(collar);

    const turbanGeo = new THREE.CylinderGeometry(0.175, 0.155, 0.22, 14);
    const turban = new THREE.Mesh(turbanGeo, makeMat(0x9e1c2e, { roughness: 0.45 }));
    turban.position.y = 0.28;
    headGroup.add(turban);

    const goldRingGeo = new THREE.TorusGeometry(0.168, 0.022, 8, 16);
    goldRingGeo.rotateX(Math.PI / 2);
    const goldRing = new THREE.Mesh(goldRingGeo, sashMat);
    goldRing.position.y = 0.23;
    headGroup.add(goldRing);

    const gemGeo = new THREE.OctahedronGeometry(0.038, 0);
    const gem = new THREE.Mesh(gemGeo, makeMat(0x38d9c8, { roughness: 0.25, metalness: 0.4 }));
    gem.position.set(0, 0.28, -0.17);
    headGroup.add(gem);
  } else if (look === 'abbot') {
    // Śāntarakṣita style: tall pointed Indian Pandita hat with long side ear-flaps
    const panditaMat = makeMat(0xa61c24, { roughness: 0.55 });
    const coneGeo = new THREE.ConeGeometry(0.168, 0.34, 14);
    const cone = new THREE.Mesh(coneGeo, panditaMat);
    cone.position.y = 0.36;
    headGroup.add(cone);

    const rimGeo = new THREE.TorusGeometry(0.162, 0.022, 8, 16);
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, sashMat);
    rim.position.y = 0.21;
    headGroup.add(rim);

    // Long pandita lappets hanging down past shoulders
    const flapGeo = new THREE.BoxGeometry(0.055, 0.32, 0.02);
    for (const side of [-1, 1]) {
      const flap = new THREE.Mesh(flapGeo, panditaMat);
      flap.position.set(side * 0.165, 0.06, 0.02);
      flap.rotation.z = side * 0.12;
      headGroup.add(flap);
    }
  } else if (look === 'yogini') {
    // Yeshe Tsogyal style: long dark hair flowing down back + turquoise crown + celestial scarf
    const hairCapGeo = new THREE.SphereGeometry(0.162, 14, 10, 0, TWO_PI, 0, Math.PI * 0.6);
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.y = 0.15;
    hairCap.rotation.x = 0.25;
    headGroup.add(hairCap);

    const longHairGeo = new THREE.BoxGeometry(0.24, 0.52, 0.07);
    const longHair = new THREE.Mesh(longHairGeo, hairMat);
    longHair.position.set(0, -0.10, 0.13);
    headGroup.add(longHair);

    // Five-leaf turquoise & gold tiara
    const tiaraGeo = new THREE.TorusGeometry(0.155, 0.02, 8, 16);
    tiaraGeo.rotateX(Math.PI / 2);
    const tiara = new THREE.Mesh(tiaraGeo, makeMat(0xeec36c, { metalness: 0.45, roughness: 0.3 }));
    tiara.position.y = 0.23;
    headGroup.add(tiara);

    // Graceful floating celestial scarf arch behind shoulders
    const scarfArchGeo = new THREE.TorusGeometry(0.34, 0.026, 8, 24, Math.PI * 1.15);
    const scarfArch = new THREE.Mesh(scarfArchGeo, makeMat(0x5bc0be, { roughness: 0.4 }));
    scarfArch.position.set(0, 0.38, 0.10);
    scarfArch.rotation.z = -0.18;
    torsoPivot.add(scarfArch);
  } else if (look === 'vision') {
    // Guru Rinpoche Pure Vision:
    // 1. Lotus Hat (Padma Zhu) silhouette with sun-moon finial
    const crownBaseGeo = new THREE.CylinderGeometry(0.175, 0.16, 0.14, 14);
    const crownBase = new THREE.Mesh(crownBaseGeo, shawlMat);
    crownBase.position.y = 0.24;
    headGroup.add(crownBase);

    const lotusRimGeo = new THREE.CylinderGeometry(0.21, 0.17, 0.10, 12);
    const lotusRim = new THREE.Mesh(lotusRimGeo, sashMat);
    lotusRim.position.y = 0.27;
    headGroup.add(lotusRim);

    const spireGeo = new THREE.ConeGeometry(0.055, 0.18, 10);
    const spire = new THREE.Mesh(spireGeo, sashMat);
    spire.position.y = 0.39;
    headGroup.add(spire);

    // 2. Khatvanga trident staff silhouette along left side
    const staffGroup = new THREE.Group();
    staffGroup.position.set(-0.28, 0.42, -0.06);
    staffGroup.rotation.z = 0.14;

    const shaftGeo = new THREE.CylinderGeometry(0.016, 0.014, 1.35, 8);
    const shaft = new THREE.Mesh(shaftGeo, sashMat);
    staffGroup.add(shaft);

    const vaseGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const vase = new THREE.Mesh(vaseGeo, shawlMat);
    vase.position.y = 0.52;
    staffGroup.add(vase);

    // Trident prongs
    const centerProngGeo = new THREE.ConeGeometry(0.022, 0.18, 6);
    const centerProng = new THREE.Mesh(centerProngGeo, sashMat);
    centerProng.position.y = 0.72;
    staffGroup.add(centerProng);

    for (const s of [-1, 1]) {
      const sideProng = new THREE.Mesh(centerProngGeo, sashMat);
      sideProng.position.set(s * 0.055, 0.69, 0);
      sideProng.rotation.z = -s * 0.22;
      staffGroup.add(sideProng);
    }
    body.add(staffGroup);

    // 3. Soft golden ground halo ring + body mandorla halo (AdditiveBlending, NO PointLight)
    const groundHaloGeo = new THREE.RingGeometry(0.42, 0.78, 36);
    groundHaloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.0, 1.55, 0.45),
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    haloRing = new THREE.Mesh(groundHaloGeo, haloMat);
    haloRing.position.y = 0.03;
    group.add(haloRing);

    const bodyHaloGeo = new THREE.RingGeometry(0.46, 0.68, 36);
    const bodyHaloMat = haloMat.clone();
    bodyHaloMat.opacity = 0.48;
    bodyHalo = new THREE.Mesh(bodyHaloGeo, bodyHaloMat);
    bodyHalo.position.set(0, 1.08, 0.14);
    body.add(bodyHalo);
  }

  // Optional sutra scroll pack on back (e.g. Indian messenger carrying Vajrakilaya texts)
  if (opts?.prop === 'sutraPack') {
    const packGroup = new THREE.Group();
    packGroup.position.set(0, 0.30, 0.21);
    const frameMat = makeMat(0x4a2c18, { roughness: 0.82 });
    const wrapClothMat = makeMat(0xb87d1e, { roughness: 0.55 });
    const strapMat = makeMat(0x7c1e19, { roughness: 0.65 });

    const packBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.18), frameMat);
    packBox.castShadow = true;
    packGroup.add(packBox);

    // 3 stacked horizontal Tibetan pecha sutra bundles wrapped in saffron silk
    for (let s = 0; s < 3; s++) {
      const pecha = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.085, 0.14), wrapClothMat);
      pecha.position.set(0, -0.11 + s * 0.11, 0.02);
      pecha.castShadow = true;
      packGroup.add(pecha);

      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.095, 0.15), strapMat);
      ribbon.position.set(0, -0.11 + s * 0.11, 0.02);
      packGroup.add(ribbon);
    }
    torsoPivot.add(packGroup);
  }

  function animate(t, dt, idleMode = 'stand', isConversing = false) {
    // Reset base transforms
    torsoPivot.position.y = 0.72;
    torsoPivot.rotation.set(0, 0, 0);
    headGroup.rotation.set(0, 0, 0);
    leftArm.pivot.rotation.set(0, 0, -0.08);
    rightArm.pivot.rotation.set(0, 0, 0.08);
    leftArm.forearmPivot.rotation.set(0, 0, 0);
    rightArm.forearmPivot.rotation.set(0, 0, 0);

    if (isVision) {
      // Pure vision levitation & radiant mandala pulse
      const floatY = 0.24 + Math.sin(t * 1.8) * 0.11;
      body.position.y = floatY;

      // Serene mudra pose
      leftArm.pivot.rotation.set(0.45, -0.25, -0.1);
      leftArm.forearmPivot.rotation.set(0.85, 0, 0.2);
      rightArm.pivot.rotation.set(0.65, 0.35, 0.1);
      rightArm.forearmPivot.rotation.set(1.05, 0, -0.25);

      if (haloRing) {
        haloRing.rotation.z = t * 0.35;
        haloRing.material.opacity = 0.52 + Math.sin(t * 2.4) * 0.18;
      }
      if (bodyHalo) {
        bodyHalo.rotation.z = -t * 0.25;
        const s = 1.0 + Math.sin(t * 2.1) * 0.05;
        bodyHalo.scale.set(s, s, 1);
      }
      return;
    }

    body.position.y = 0;
    const breathe = Math.sin(t * 2.1);

    if (idleMode === 'pray') {
      // Joined palms (Anjali mudra) or spinning hand prayer wheel + gentle chanting bow
      const bow = (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.09;
      torsoPivot.position.y = 0.72 + breathe * 0.01;
      torsoPivot.rotation.x = bow;
      headGroup.rotation.x = bow * 1.2 + Math.sin(t * 3.2) * 0.03;

      leftArm.pivot.rotation.set(0.68, -0.42, 0);
      leftArm.forearmPivot.rotation.set(1.05, 0, 0.32);
      if (handProp && look === 'lama') {
        rightArm.pivot.rotation.set(0.52, 0.18, 0.08);
        rightArm.forearmPivot.rotation.set(0.82, Math.sin(t * 4.5) * 0.15, -0.12);
        handProp.rotation.y = t * 5.5;
      } else {
        rightArm.pivot.rotation.set(0.68, 0.42, 0);
        rightArm.forearmPivot.rotation.set(1.05, 0, -0.32);
      }
    } else if (idleMode === 'work') {
      // Rhythmic crafting / hammering motion
      const strike = Math.sin(t * 4.2);
      torsoPivot.position.y = 0.72 + Math.abs(strike) * 0.015;
      torsoPivot.rotation.x = 0.08 + Math.max(0, strike) * 0.06;
      leftArm.pivot.rotation.set(0.55, -0.3, 0);
      leftArm.forearmPivot.rotation.set(0.9, 0, 0.2);
      rightArm.pivot.rotation.set(0.65 + strike * 0.35, 0.15, 0.08);
      rightArm.forearmPivot.rotation.set(0.75 - strike * 0.28, 0, -0.1);
    } else if (idleMode === 'walk') {
      const stride = Math.sin(t * 6.5);
      body.position.y = Math.abs(Math.cos(t * 6.5)) * 0.035;
      torsoPivot.rotation.x = 0.09;
      leftArm.pivot.rotation.set(stride * 0.42, 0, -0.08);
      rightArm.pivot.rotation.set(-stride * 0.42, 0, 0.08);
    } else if (idleMode === 'rest') {
      // Sitting down to catch breath during escort rest
      body.position.y = -0.28;
      torsoPivot.position.y = 0.70 + Math.sin(t * 3.8) * 0.02;
      torsoPivot.rotation.x = 0.24;
      headGroup.rotation.x = 0.18;
      leftArm.pivot.rotation.set(0.55, -0.2, -0.1);
      rightArm.pivot.rotation.set(0.55, 0.2, 0.1);
    } else {
      // 'stand'
      torsoPivot.position.y = 0.72 + breathe * 0.012;
      leftArm.pivot.rotation.z = -0.08 - breathe * 0.015;
      rightArm.pivot.rotation.z = 0.08 + breathe * 0.015;
      headGroup.rotation.y = isConversing ? 0 : Math.sin(t * 0.7) * 0.12;
    }
  }

  return {
    group,
    body,
    torsoPivot,
    headGroup,
    leftArm,
    rightArm,
    haloRing,
    bodyHalo,
    look,
    isVision,
    animate,
  };
}

/**
 * Evaluate conditional dialogue array or string on an NPC definition.
 */
export function resolveNpcDialogueId(ctx, dialogueField) {
  if (!dialogueField) return null;
  if (typeof dialogueField === 'string') return dialogueField;
  if (!Array.isArray(dialogueField)) return null;

  for (let i = 0; i < dialogueField.length; i++) {
    const entry = dialogueField[i];
    if (!entry) continue;
    if (!entry.if) return entry.id;

    const cond = entry.if;
    let ok = true;

    if (cond.flag) {
      const flags = Array.isArray(cond.flag) ? cond.flag : [cond.flag];
      for (const f of flags) {
        if (!ctx.quests?.hasFlag(f)) { ok = false; break; }
      }
    }
    if (ok && cond.notFlag) {
      const flags = Array.isArray(cond.notFlag) ? cond.notFlag : [cond.notFlag];
      for (const f of flags) {
        if (ctx.quests?.hasFlag(f)) { ok = false; break; }
      }
    }
    if (ok && cond.questActive) {
      if (!ctx.quests?.isActive(cond.questActive)) ok = false;
    }
    if (ok && cond.questDone) {
      if (!ctx.quests?.isDone(cond.questDone)) ok = false;
    }
    if (ok && cond.questStep) {
      if (typeof cond.questStep === 'string') {
        const [qId, stepId] = cond.questStep.split(':');
        if (!ctx.quests?.isAtStep(qId, stepId)) ok = false;
      } else if (typeof cond.questStep === 'object') {
        if (!ctx.quests?.isAtStep(cond.questStep.id, cond.questStep.step)) ok = false;
      }
    }

    if (ok) return entry.id;
  }
  return null;
}

export function createNpcs(ctx) {
  const { state, bus, scene } = ctx;
  const instances = new Map();
  const showcaseGroup = new THREE.Group();
  showcaseGroup.name = 'NPCShowcaseGroup';
  scene.add(showcaseGroup);
  const showcaseModels = [];

  if (!ctx.shop) createShop(ctx);
  if (!ctx.crafting) createCrafting(ctx);

  function isNpcVisible(def) {
    if (def.debugOnly && !ctx.debug?.enabled && state.zone !== 'sandbox') {
      return false;
    }
    if (def.visibleWhenFlag && !ctx.quests?.hasFlag(def.visibleWhenFlag)) {
      return false;
    }
    if (!def.showIf) return true;
    if (def.showIf.flag && !ctx.quests?.hasFlag(def.showIf.flag)) {
      return false;
    }
    if (def.showIf.notFlag && ctx.quests?.hasFlag(def.showIf.notFlag)) {
      return false;
    }
    return true;
  }

  function spawnNpcFromDef(def) {
    if (instances.has(def.id)) return instances.get(def.id);

    const resolvedLook = def.look === 'monk' ? 'lama' : (def.look || 'lama');
    const model = buildNpc(resolvedLook, { prop: def.prop });
    const y = ctx.world?.getHeight(def.x, def.z, def.map) ?? 0;
    const defaultHeading = def.heading ?? def.facing ?? Math.PI;
    model.group.position.set(def.x, y, def.z);
    model.group.rotation.y = defaultHeading;

    // Overhead quest marker (! or ?)
    const textures = getMarkerTextures();
    const markerMat = new THREE.SpriteMaterial({
      map: textures['!'],
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const markerSprite = new THREE.Sprite(markerMat);
    markerSprite.position.set(0, 2.38, 0);
    markerSprite.scale.set(0.62, 0.62, 1);
    markerSprite.visible = false;
    model.group.add(markerSprite);

    // Attach to map's zoneGroup if available, else scene
    const parentGroup = ctx.zoneGroups?.[def.map] || scene;
    parentGroup.add(model.group);

    // Push collider ONLY for non-vision NPCs
    let collider = null;
    if (def.look !== 'vision') {
      collider = {
        type: 'circle',
        x: def.x,
        z: def.z,
        r: 0.48,
        zone: def.map,
        npcId: def.id,
      };
      ctx.colliders.push(collider);
    }

    const worldPos = new THREE.Vector3(def.x, y, def.z);
    const interactable = {
      id: `npc-${def.id}`,
      npcId: def.id,
      kind: 'npc',
      zone: def.map,
      action: 'interact',
      labelKey: 'prompt.talk',
      radius: def.radius ?? def.interactRadius ?? 2.8,
      getPosition() {
        worldPos.set(def.x, ctx.world?.getHeight(def.x, def.z, def.map) ?? 0, def.z);
        return worldPos;
      },
      isAvailable() {
        return (state.zone || 'stupa') === def.map && !state.uiOpen && isNpcVisible(def);
      },
      onInteract() {
        const dialogueId = resolveNpcDialogueId(ctx, def.dialogue ?? def.dialogueId);
        if (dialogueId && ctx.dialogue) {
          ctx.dialogue.open(dialogueId, {
            npcId: def.id,
            speaker: def.nameKey,
            look: resolvedLook,
          });
        }
        bus.emit('npc:talk', { npcId: def.id, dialogueId });
      },
    };
    ctx.interactables.push(interactable);

    const inst = {
      id: def.id,
      def,
      model,
      group: model.group,
      markerSprite,
      markerMat,
      markerState: null,
      collider,
      interactable,
      currentHeading: defaultHeading,
      defaultHeading,
      phaseOffset: (instances.size * 1.37) % TWO_PI,
    };

    instances.set(def.id, inst);
    return inst;
  }

  // Register initial NPCs from data/npcs.js
  for (const def of NPCS) {
    spawnNpcFromDef(def);
  }

  // Re-attach NPCs into newly ensured zoneGroups when a map finishes loading
  bus.on('map:loaded', ({ mapId }) => {
    for (const inst of instances.values()) {
      if (inst.def.map === mapId) {
        const y = ctx.world?.getHeight(inst.def.x, inst.def.z, mapId) ?? 0;
        inst.group.position.set(inst.def.x, y, inst.def.z);
        const zg = ctx.zoneGroups?.[mapId];
        if (zg && inst.group.parent !== zg) {
          zg.add(inst.group);
        }
      }
    }
  });

  /**
   * Debug helper: spawn all 8 NPC looks side-by-side in front of the player
   * (or at a clean row in the current map) for visual inspection and screenshots.
   */
  function spawnAllLooks(options = {}) {
    clearShowcase();
    const mapId = state.zone || 'stupa';
    const px = options.x ?? state.player?.position?.x ?? 0;
    const pz = options.z ?? ((state.player?.position?.z ?? 0) - 4.2);
    const spacing = options.spacing ?? 1.45;
    const totalWidth = (NPC_LOOKS.length - 1) * spacing;
    const startX = px - totalWidth * 0.5;

    const results = [];
    for (let i = 0; i < NPC_LOOKS.length; i++) {
      const look = NPC_LOOKS[i];
      const x = startX + i * spacing;
      const z = pz;
      const y = ctx.world?.getHeight(x, z, mapId) ?? 0;

      const model = buildNpc(look);
      model.group.position.set(x, y, z);
      // Face +Z (toward a camera/player standing south of the row)
      model.group.rotation.y = Math.PI;

      const labelSprite = createLabelSprite(look);
      if (labelSprite) {
        labelSprite.position.set(0, 2.35, 0);
        model.group.add(labelSprite);
      }

      showcaseGroup.add(model.group);
      const idle = look === 'lama' ? 'pray' : (look === 'artisan' ? 'work' : 'stand');
      showcaseModels.push({ look, model, idle, x, y, z });
      results.push({ look, x: Number(x.toFixed(2)), z: Number(z.toFixed(2)) });
    }
    return results;
  }

  function clearShowcase() {
    while (showcaseGroup.children.length > 0) {
      showcaseGroup.remove(showcaseGroup.children[0]);
    }
    showcaseModels.length = 0;
  }

  function update(dt) {
    const t = state.elapsed || 0;
    const activeZone = state.zone || 'stupa';
    const playerPos = state.player?.position;
    const activeDialogueNpcId = ctx.dialogue?.getCurrent?.()?.npcId || null;
    const textures = getMarkerTextures();

    for (const inst of instances.values()) {
      const { def, model, group, collider, markerSprite, markerMat } = inst;
      const visible = isNpcVisible(def);
      const inZone = def.map === activeZone;

      group.visible = visible && inZone;
      if (collider) {
        collider.zone = visible ? def.map : '__hidden__';
      }
      if (!visible || !inZone) continue;

      // Position & ground height sync (supports moving escort NPCs)
      const groundY = ctx.world?.getHeight(def.x, def.z, def.map) ?? 0;
      group.position.set(def.x, groundY, def.z);
      if (collider) {
        collider.x = def.x;
        collider.z = def.z;
      }

      // Smooth turn toward player when conversing or within 4.0m (unless walking/locked heading)
      let targetHeading = def.heading ?? inst.defaultHeading;
      const isConversing = activeDialogueNpcId === def.id;
      if (playerPos && def.idle !== 'walk' && !def.lockHeading) {
        const dx = playerPos.x - def.x;
        const dz = playerPos.z - def.z;
        const dist = Math.hypot(dx, dz);
        if (isConversing || dist < 4.0) {
          // Forward vector in this engine is (-sin(h), -cos(h))
          targetHeading = Math.atan2(-dx, -dz);
        }
      }
      inst.currentHeading = lerpAngle(inst.currentHeading, targetHeading, dt * 7.5);
      group.rotation.y = inst.currentHeading;

      // Idle animation
      model.animate(t + inst.phaseOffset, dt, def.idle || 'stand', isConversing);

      // Update overhead quest marker (! golden, ? silver for active, ? golden for ready-to-turn-in)
      const markerType = ctx.quests?.getNpcMarker?.(def.id, def) || null;
      const markerColor = ctx.quests?.getNpcMarkerColor?.(def.id, def) || (markerType ? 'gold' : null);
      inst.markerState = markerType;
      inst.markerColor = markerColor;
      const texKey =
        markerType === '?' && markerColor === 'silver' ? '?_silver' : markerType;
      if (texKey && textures[texKey]) {
        markerSprite.visible = true;
        if (markerMat.map !== textures[texKey]) {
          markerMat.map = textures[texKey];
          markerMat.needsUpdate = true;
        }
        markerSprite.position.y = 2.36 + Math.sin(t * 3.2 + inst.phaseOffset) * 0.08;
      } else {
        markerSprite.visible = false;
      }
    }

    // Animate showcase models if present
    for (let i = 0; i < showcaseModels.length; i++) {
      const item = showcaseModels[i];
      item.model.animate(t + i * 0.7, dt, item.idle, false);
    }

    ctx.shop?.update?.(dt);
    ctx.crafting?.update?.(dt);
  }

  const api = {
    update,
    buildNpc,
    spawnNpc: spawnNpcFromDef,
    spawnAllLooks,
    clearShowcase,
    getNpc(id) {
      return instances.get(id)?.def || null;
    },
    getById(id) {
      return instances.get(id)?.def || null;
    },
    get(id) {
      return instances.get(id) || null;
    },
    getInstance(id) {
      return instances.get(id) || null;
    },
    list() {
      return Array.from(instances.values()).map((inst) => {
        const marker =
          ctx.quests?.getNpcMarker?.(inst.id, inst.def) ?? inst.markerState;
        const markerColor =
          ctx.quests?.getNpcMarkerColor?.(inst.id, inst.def) ??
          inst.markerColor ??
          (marker ? 'gold' : null);
        return {
          id: inst.id,
          map: inst.def.map,
          look: inst.def.look,
          x: inst.def.x,
          z: inst.def.z,
          visible: isNpcVisible(inst.def),
          marker,
          markerColor,
        };
      });
    },
  };

  ctx.npcs = api;
  ctx.debug?.register('npcs', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.npcs = api;
  }

  return api;
}
