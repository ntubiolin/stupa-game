import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Deterministic height function for the highland wilderness.
 * Keeps gate, spawn, chorten, and mani stones cleanly flat at y = 0,
 * while creating natural rolling alpine terrain that rises into foothills.
 */
export function computeWildernessHeight(x, z, wildConfig) {
  const origin = wildConfig.origin || { x: 1000, z: 0 };
  const dx = x - origin.x;
  const dz = z - origin.z;
  const r = Math.hypot(dx, dz);

  const t = wildConfig.terrain || {};
  const w1 = Math.sin(dx * (t.wave1FreqX || 0.052) + 1.2) * Math.cos(dz * (t.wave1FreqZ || 0.048) - 0.7) * (t.wave1Amp || 2.2);
  const w2 = Math.sin(dx * (t.wave2FreqX || 0.11) - dz * (t.wave2FreqZ || 0.08) + 2.3) * (t.wave2Amp || 1.1);
  const w3 = Math.cos(dx * (t.wave3FreqX || 0.025) + dz * (t.wave3FreqZ || 0.035)) * (t.wave3Amp || 1.5);
  let h = w1 + w2 + w3;

  // Flatten factor around key structures
  let flatWeight = 1.0;

  // 1. South gate & safe zone around (1000, 60)
  const gateX = wildConfig.wildGate.x;
  const gateZ = wildConfig.wildGate.z;
  const dGate = Math.hypot(x - gateX, z - (gateZ - 3));
  if (dGate < 14) {
    flatWeight = Math.min(flatWeight, Math.max(0, (dGate - 4) / 10));
  }

  // 2. Chorten at center (1000, 0)
  const dChorten = r;
  if (dChorten < 8) {
    flatWeight = Math.min(flatWeight, Math.max(0, (dChorten - 2.5) / 5.5));
  }

  // 3. Mani stones
  const maniList = wildConfig.maniStones || [];
  for (let i = 0; i < maniList.length; i++) {
    const ms = maniList[i];
    const dMani = Math.hypot(x - ms.x, z - ms.z);
    if (dMani < 9) {
      flatWeight = Math.min(flatWeight, Math.max(0, (dMani - 3) / 6));
    }
  }

  // Outer rim rises into surrounding foothills
  const rimR = t.rimRadius || 58;
  if (r > rimR) {
    const rim = (r - rimR) / 28;
    h += rim * rim * (t.rimAmp || 14);
  }

  const smoothFlat = flatWeight * flatWeight * (3 - 2 * flatWeight);
  h *= smoothFlat;

  return h;
}

/**
 * Deterministic pseudo-random number generator with fixed seed.
 */
function createSeededRng(seed = 12345) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createWilderness(ctx) {
  const { scene, state, config, colliders, bus } = ctx;
  const W = config.WILD;
  const origin = W.origin;

  const group = new THREE.Group();
  group.name = 'Wilderness';
  (ctx.wildGroup || scene).add(group);

  const getHeight = (x, z) => computeWildernessHeight(x, z, W);

  // ---------------------------------------------------------------- 1. Materials
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xede6d8, roughness: 0.90 });
  const maroonMat = new THREE.MeshStandardMaterial({ color: 0x7c1e19, roughness: 0.72 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.80 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x48413b, roughness: 0.76 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5bf42, roughness: 0.28, metalness: 0.84 });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x5e5a54, roughness: 0.86, metalness: 0.05 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6962, roughness: 0.92, metalness: 0.04 });

  // ---------------------------------------------------------------- 2. Subdivided Highland Steppe Terrain
  const tCfg = W.terrain || { size: 180, segments: 96 };
  const terrainGeo = new THREE.PlaneGeometry(tCfg.size, tCfg.size, tCfg.segments, tCfg.segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  const vertexCount = posAttr.count;
  const colorAttr = new Float32Array(vertexCount * 3);

  // Palette colors for alpine steppe
  const grassCol = new THREE.Color(0x82845c);  // dry alpine ochre-green
  const scrubCol = new THREE.Color(0x9a8856);  // steppe straw/gravel
  const slateCol = new THREE.Color(0x625e58);  // exposed mountain slate
  const snowCol = new THREE.Color(0xdee5ee);   // perimeter frost/snow dusting

  for (let i = 0; i < vertexCount; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wx = lx + origin.x;
    const wz = lz + origin.z;
    const y = getHeight(wx, wz);
    posAttr.setY(i, y);

    const r = Math.hypot(lx, lz);
    let c = new THREE.Color();
    const noise = Math.sin(wx * 0.12) * Math.cos(wz * 0.14) * 0.5 + 0.5;

    if (y > 7.5) {
      c.lerpColors(slateCol, snowCol, Math.min(1, (y - 7.5) / 8));
    } else if (y > 3.0) {
      c.lerpColors(scrubCol, slateCol, Math.min(1, (y - 3.0) / 4.5));
    } else {
      c.lerpColors(grassCol, scrubCol, noise);
      if (r < 10) {
        // Subtle worn path/plaza tone around center
        c.lerp(new THREE.Color(0xa4967d), 0.35);
      }
    }

    colorAttr[i * 3 + 0] = c.r;
    colorAttr[i * 3 + 1] = c.g;
    colorAttr[i * 3 + 2] = c.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(origin.x, 0, origin.z);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // ---------------------------------------------------------------- 3. Distant Himalayan Mountain Peaks Ring
  const mCfg = W.mountains || { count: 24, innerRadius: 125, outerRadius: 180, minHeight: 38, maxHeight: 75 };
  const mountainGeos = [];
  const mPeaks = mCfg.count;

  for (let i = 0; i < mPeaks; i++) {
    const a = (i / mPeaks) * Math.PI * 2;
    const dist = mCfg.innerRadius + ((i * 37) % 19) * 2.2;
    const px = origin.x + Math.cos(a) * dist;
    const pz = origin.z + Math.sin(a) * dist;
    const peakH = mCfg.minHeight + ((i * 53) % 29) * 1.35;
    const peakR = 24 + ((i * 17) % 11) * 1.4;

    const cone = new THREE.ConeGeometry(peakR, peakH, 6, 2);
    const cPos = cone.attributes.position;
    const cCols = new Float32Array(cPos.count * 3);

    for (let v = 0; v < cPos.count; v++) {
      const vy = cPos.getY(v) + peakH * 0.5;
      const isSnow = vy > peakH * 0.44;
      if (isSnow) {
        cCols[v * 3 + 0] = 0.90;
        cCols[v * 3 + 1] = 0.94;
        cCols[v * 3 + 2] = 0.99;
      } else {
        cCols[v * 3 + 0] = 0.28;
        cCols[v * 3 + 1] = 0.30;
        cCols[v * 3 + 2] = 0.32;
      }
    }
    cone.setAttribute('color', new THREE.BufferAttribute(cCols, 3));
    cone.translate(px, peakH * 0.5 - 2, pz);
    cone.rotateY((i * 1.7) % Math.PI);
    mountainGeos.push(cone);
  }

  if (mountainGeos.length) {
    const mMeshGeo = mergeGeometries(mountainGeos, false);
    const mMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
    });
    const mMesh = new THREE.Mesh(mMeshGeo, mMat);
    group.add(mMesh);
  }

  // ---------------------------------------------------------------- 4. Return Mountain Gate (返回佛塔山門)
  const gateX = W.wildGate.x;
  const gateZ = W.wildGate.z;
  const gateY = getHeight(gateX, gateZ);

  const wildGateGroup = new THREE.Group();
  wildGateGroup.name = 'ReturnMountainGate';
  wildGateGroup.position.set(gateX, gateY, gateZ);

  const gPlaster = [];
  const gMaroon = [];
  const gWood = [];
  const gTile = [];
  const gGold = [];

  const gPillarX = 2.2;
  const gPillarH = 3.4;

  for (const s of [-1, 1]) {
    const px = s * gPillarX;
    // Stone base plinth
    const base = new THREE.BoxGeometry(0.88, 0.45, 0.88);
    base.translate(px, 0.225, 0);
    gPlaster.push(base);

    // Maroon band
    const band = new THREE.BoxGeometry(0.82, 0.12, 0.82);
    band.translate(px, 0.51, 0);
    gMaroon.push(band);

    // Pillar shaft
    const shaft = new THREE.BoxGeometry(0.68, gPillarH - 0.7, 0.68);
    shaft.translate(px, 0.57 + (gPillarH - 0.7) * 0.5, 0);
    gPlaster.push(shaft);

    // Capital necking & golden capital
    const neck = new THREE.BoxGeometry(0.78, 0.14, 0.78);
    neck.translate(px, gPillarH - 0.07, 0);
    gMaroon.push(neck);

    const cap = new THREE.BoxGeometry(0.86, 0.12, 0.86);
    cap.translate(px, gPillarH + 0.06, 0);
    gGold.push(cap);

    // Colliders for the two wild gate pillars
    colliders.push({
      type: 'circle',
      x: gateX + px,
      z: gateZ,
      r: 0.55,
      zone: 'wild',
    });
  }

  // Timber lintel & bracket tier
  const gLintel = new THREE.BoxGeometry(5.6, 0.36, 0.76);
  gLintel.translate(0, gPillarH + 0.30, 0);
  gWood.push(gLintel);

  const gBrackets = new THREE.BoxGeometry(5.8, 0.26, 0.92);
  gBrackets.translate(0, gPillarH + 0.61, 0);
  gMaroon.push(gBrackets);

  // Inscription plaque facing North into wilderness (-Z)
  const gPlaque = new THREE.BoxGeometry(2.4, 0.55, 0.12);
  gPlaque.translate(0, gPillarH + 0.30, -0.42);
  gMaroon.push(gPlaque);

  const gPlaqueRim = new THREE.BoxGeometry(2.48, 0.62, 0.08);
  gPlaqueRim.translate(0, gPillarH + 0.30, -0.40);
  gGold.push(gPlaqueRim);

  // Multi-tier roof & golden crest
  const gRoof1 = new THREE.BoxGeometry(6.4, 0.20, 1.45);
  gRoof1.translate(0, gPillarH + 0.84, 0);
  gTile.push(gRoof1);

  const gRoof2 = new THREE.BoxGeometry(5.0, 0.28, 1.15);
  gRoof2.translate(0, gPillarH + 1.08, 0);
  gTile.push(gRoof2);

  const gWheel = new THREE.CylinderGeometry(0.36, 0.36, 0.10, 16);
  gWheel.rotateX(Math.PI / 2);
  gWheel.translate(0, gPillarH + 1.55, 0);
  gGold.push(gWheel);

  const gWheelHub = new THREE.SphereGeometry(0.12, 10, 8);
  gWheelHub.translate(0, gPillarH + 1.55, 0);
  gGold.push(gWheelHub);

  for (const s of [-1, 1]) {
    const dBody = new THREE.BoxGeometry(0.38, 0.24, 0.16);
    dBody.translate(s * 0.68, gPillarH + 1.36, 0);
    gGold.push(dBody);

    const dHead = new THREE.BoxGeometry(0.14, 0.22, 0.14);
    dHead.translate(s * 0.52, gPillarH + 1.54, 0);
    gGold.push(dHead);
  }

  if (gPlaster.length) {
    const m = new THREE.Mesh(mergeGeometries(gPlaster, false), plasterMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gMaroon.length) {
    const m = new THREE.Mesh(mergeGeometries(gMaroon, false), maroonMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gWood.length) {
    const m = new THREE.Mesh(mergeGeometries(gWood, false), woodMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gTile.length) {
    const m = new THREE.Mesh(mergeGeometries(gTile, false), tileMat);
    m.castShadow = true;
    m.receiveShadow = true;
    wildGateGroup.add(m);
  }
  if (gGold.length) {
    const m = new THREE.Mesh(mergeGeometries(gGold, false), goldMat);
    m.castShadow = true;
    wildGateGroup.add(m);
  }

  group.add(wildGateGroup);

  // ---------------------------------------------------------------- 5. Small Tibetan Chorten (小佛塔)
  const chortenX = W.chorten?.x ?? 1000;
  const chortenZ = W.chorten?.z ?? 0;
  const chortenY = getHeight(chortenX, chortenZ);

  const chortenGroup = new THREE.Group();
  chortenGroup.name = 'TibetanChorten';
  chortenGroup.position.set(chortenX, chortenY, chortenZ);

  const chPlaster = [];
  const chMaroon = [];
  const chGold = [];

  // Three square stepped plinths
  const plinth1 = new THREE.BoxGeometry(3.6, 0.45, 3.6);
  plinth1.translate(0, 0.225, 0);
  chPlaster.push(plinth1);

  const plinth2 = new THREE.BoxGeometry(3.0, 0.38, 3.0);
  plinth2.translate(0, 0.64, 0);
  chPlaster.push(plinth2);

  const plinth3 = new THREE.BoxGeometry(2.4, 0.32, 2.4);
  plinth3.translate(0, 0.99, 0);
  chPlaster.push(plinth3);

  // Maroon trim band between plinth and dome
  const domeBase = new THREE.CylinderGeometry(1.22, 1.34, 0.22, 16);
  domeBase.translate(0, 1.26, 0);
  chMaroon.push(domeBase);

  // Rounded whitewashed dome (Bumba)
  const dome = new THREE.SphereGeometry(1.15, 18, 14);
  dome.scale(1.08, 0.92, 1.08);
  dome.translate(0, 2.15, 0);
  chPlaster.push(dome);

  // Harmika cube
  const harmika = new THREE.BoxGeometry(0.85, 0.65, 0.85);
  harmika.translate(0, 3.12, 0);
  chPlaster.push(harmika);

  const harmikaTrim = new THREE.BoxGeometry(0.92, 0.12, 0.92);
  harmikaTrim.translate(0, 3.48, 0);
  chGold.push(harmikaTrim);

  // 13-tier conical spire
  const spire = new THREE.ConeGeometry(0.55, 1.85, 14);
  spire.translate(0, 4.45, 0);
  chGold.push(spire);

  // Golden umbrella (chhatra) & pinnacle drop
  const umbrella = new THREE.CylinderGeometry(0.68, 0.45, 0.14, 14);
  umbrella.translate(0, 5.42, 0);
  chGold.push(umbrella);

  const finial = new THREE.SphereGeometry(0.16, 10, 8);
  finial.scale(0.8, 1.5, 0.8);
  finial.translate(0, 5.75, 0);
  chGold.push(finial);

  if (chPlaster.length) {
    const m = new THREE.Mesh(mergeGeometries(chPlaster, false), plasterMat);
    m.castShadow = true;
    m.receiveShadow = true;
    chortenGroup.add(m);
  }
  if (chMaroon.length) {
    const m = new THREE.Mesh(mergeGeometries(chMaroon, false), maroonMat);
    m.castShadow = true;
    m.receiveShadow = true;
    chortenGroup.add(m);
  }
  if (chGold.length) {
    const m = new THREE.Mesh(mergeGeometries(chGold, false), goldMat);
    m.castShadow = true;
    chortenGroup.add(m);
  }

  colliders.push({
    type: 'circle',
    x: chortenX,
    z: chortenZ,
    r: W.chorten?.colliderRadius || 1.8,
    zone: 'wild',
  });

  group.add(chortenGroup);

  // ---------------------------------------------------------------- 6. Mani Stone Mounds (3 stations)
  const maniPoles = [];
  const maniStonesData = [];
  const maniList = W.maniStones || [];

  const maniSlateGeos = [];
  const maniWoodGeos = [];
  const maniGoldGeos = [];

  for (let mIdx = 0; mIdx < maniList.length; mIdx++) {
    const ms = maniList[mIdx];
    const my = getHeight(ms.x, ms.z);
    const mPos = new THREE.Vector3(ms.x, my, ms.z);
    maniStonesData.push({
      x: ms.x,
      z: ms.z,
      radius: ms.radius || 4,
      position: mPos,
    });

    // Collider for the solid stone cairn center
    colliders.push({
      type: 'circle',
      x: ms.x,
      z: ms.z,
      r: 1.6,
      zone: 'wild',
    });

    // Procedural stack of 12 carved slate slabs forming a cairn
    for (let s = 0; s < 14; s++) {
      const u = s / 13;
      const slabW = 1.6 - u * 0.9 + ((s * 7) % 5) * 0.08;
      const slabD = 1.3 - u * 0.7 + ((s * 11) % 4) * 0.06;
      const slabH = 0.12 + ((s * 3) % 4) * 0.03;
      const slabY = my + s * 0.11;

      const slab = new THREE.BoxGeometry(slabW, slabH, slabD);
      const angle = ((s * 2.3) % (Math.PI * 2));
      slab.rotateY(angle);
      slab.translate(
        ms.x + Math.sin(s * 1.7) * 0.15,
        slabY + slabH * 0.5,
        ms.z + Math.cos(s * 1.7) * 0.15
      );
      maniSlateGeos.push(slab);
    }

    // Leaning carved mantra tablets around the cairn
    for (let t = 0; t < 5; t++) {
      const ta = (t / 5) * Math.PI * 2 + 0.3;
      const tablet = new THREE.BoxGeometry(0.55, 0.42, 0.08);
      tablet.rotateX(0.24);
      tablet.rotateY(ta);
      tablet.translate(
        ms.x + Math.cos(ta) * 0.95,
        my + 0.22,
        ms.z + Math.sin(ta) * 0.95
      );
      maniSlateGeos.push(tablet);
    }

    // Central tall wooden prayer flag pole (Darchor)
    const poleH = 7.0;
    const mast = new THREE.CylinderGeometry(0.06, 0.12, poleH, 8);
    mast.translate(ms.x, my + poleH * 0.5, ms.z);
    maniWoodGeos.push(mast);

    const poleTop = new THREE.ConeGeometry(0.14, 0.48, 8);
    poleTop.translate(ms.x, my + poleH + 0.24, ms.z);
    maniGoldGeos.push(poleTop);

    maniPoles.push(new THREE.Vector3(ms.x, my + poleH, ms.z));
  }

  if (maniSlateGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(maniSlateGeos, false), slateMat);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  if (maniWoodGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(maniWoodGeos, false), woodMat);
    m.castShadow = true;
    group.add(m);
  }
  if (maniGoldGeos.length) {
    const m = new THREE.Mesh(mergeGeometries(maniGoldGeos, false), goldMat);
    m.castShadow = true;
    group.add(m);
  }

  // 6b. Subtle golden/turquoise glowing aura ring on each Mani stone mound (no PointLight)
  const maniAuras = [];
  const auraRingGeo = new THREE.RingGeometry(1.5, 3.6, 32);
  auraRingGeo.rotateX(-Math.PI / 2);

  for (let mIdx = 0; mIdx < maniList.length; mIdx++) {
    const ms = maniList[mIdx];
    const my = getHeight(ms.x, ms.z);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x4eedc2, // turquoise-gold glow
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const auraMesh = new THREE.Mesh(auraRingGeo, auraMat);
    auraMesh.position.set(ms.x, my + 0.04, ms.z);
    group.add(auraMesh);

    maniAuras.push({
      mesh: auraMesh,
      mat: auraMat,
      x: ms.x,
      z: ms.z,
    });
  }

  let maniTimer = 0;

  // ---------------------------------------------------------------- 7. Procedural Highland Boulders (18–25 rocks)
  const bCfg = W.boulders || { count: 22, minRadius: 1.1, maxRadius: 2.3 };
  const boulderGeos = [];
  const rng = createSeededRng(7789);
  const placedBoulders = [];

  let attempts = 0;
  while (placedBoulders.length < bCfg.count && attempts < 200) {
    attempts++;
    const a = rng() * Math.PI * 2;
    const rad = 14 + rng() * 46; // between 14m and 60m from origin
    const bx = origin.x + Math.cos(a) * rad;
    const bz = origin.z + Math.sin(a) * rad;

    // Reject if too close to gate
    if (Math.hypot(bx - gateX, bz - gateZ) < 14) continue;
    // Reject if too close to chorten
    if (Math.hypot(bx - chortenX, bz - chortenZ) < 8) continue;

    // Reject if too close to mani stones
    let nearMani = false;
    for (let m = 0; m < maniList.length; m++) {
      if (Math.hypot(bx - maniList[m].x, bz - maniList[m].z) < 7) {
        nearMani = true;
        break;
      }
    }
    if (nearMani) continue;

    // Reject if too close to another placed boulder
    let nearOther = false;
    for (let o = 0; o < placedBoulders.length; o++) {
      if (Math.hypot(bx - placedBoulders[o].x, bz - placedBoulders[o].z) < 6) {
        nearOther = true;
        break;
      }
    }
    if (nearOther) continue;

    const bRadius = bCfg.minRadius + rng() * (bCfg.maxRadius - bCfg.minRadius);
    const by = getHeight(bx, bz);

    placedBoulders.push({ x: bx, z: bz, r: bRadius });

    // Push circle collider
    colliders.push({
      type: 'circle',
      x: bx,
      z: bz,
      r: bRadius * 0.9,
      zone: 'wild',
    });

    // Deformed low-poly rock geometry
    const rockGeo = new THREE.DodecahedronGeometry(bRadius, 0);
    const rPos = rockGeo.attributes.position;
    for (let v = 0; v < rPos.count; v++) {
      const jx = 1.0 + (rng() - 0.5) * 0.35;
      const jy = 0.85 + (rng() - 0.5) * 0.3;
      const jz = 1.0 + (rng() - 0.5) * 0.35;
      rPos.setXYZ(v, rPos.getX(v) * jx, rPos.getY(v) * jy, rPos.getZ(v) * jz);
    }
    rockGeo.computeVertexNormals();
    rockGeo.rotateX(rng() * Math.PI);
    rockGeo.rotateY(rng() * Math.PI);
    rockGeo.translate(bx, by + bRadius * 0.55, bz);
    boulderGeos.push(rockGeo);
  }

  if (boulderGeos.length) {
    const bMeshGeo = mergeGeometries(boulderGeos, false);
    const bMesh = new THREE.Mesh(bMeshGeo, rockMat);
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    group.add(bMesh);
  }

  // ---------------------------------------------------------------- 8. Prayer Flag Strings Connecting Landmarks
  const flagLines = [
    // Chorten to Mani Stones
    { start: new THREE.Vector3(chortenX, chortenY + 5.3, chortenZ), end: maniPoles[0], sag: 1.6 },
    { start: new THREE.Vector3(chortenX, chortenY + 5.3, chortenZ), end: maniPoles[1], sag: 1.8 },
    { start: new THREE.Vector3(chortenX, chortenY + 5.3, chortenZ), end: maniPoles[2], sag: 1.7 },
    // Mani Stone to Gate posts
    { start: maniPoles[0], end: new THREE.Vector3(gateX - gPillarX, gateY + gPillarH + 0.3, gateZ), sag: 2.1 },
    { start: maniPoles[1], end: new THREE.Vector3(gateX + gPillarX, gateY + gPillarH + 0.3, gateZ), sag: 2.2 },
  ];

  const flagColors = [
    new THREE.Color(0x1a5fb4), // blue
    new THREE.Color(0xf6f5f4), // white
    new THREE.Color(0xc01c28), // red
    new THREE.Color(0x2ec27e), // green
    new THREE.Color(0xf6d32d), // yellow
  ];

  const flagGeos = [];
  const ropePositions = [];
  const ropeIndices = [];
  let ropeVCount = 0;

  for (let lIdx = 0; lIdx < flagLines.length; lIdx++) {
    const line = flagLines[lIdx];
    const segs = 36;
    let prevPt = null;

    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const pt = new THREE.Vector3().lerpVectors(line.start, line.end, u);
      pt.y -= 4 * u * (1 - u) * line.sag;

      ropePositions.push(pt.x, pt.y, pt.z);
      if (s > 0) {
        ropeIndices.push(ropeVCount - 1, ropeVCount);
      }
      ropeVCount++;

      // Attach miniature fluttering flag quad every few points
      if (s > 1 && s < segs - 1 && s % 2 === 0) {
        const flagGeo = new THREE.PlaneGeometry(0.32, 0.24);
        flagGeo.rotateX(0.18);
        flagGeo.translate(pt.x, pt.y - 0.12, pt.z);
        const col = flagColors[(lIdx * 3 + s) % 5];
        const cAttr = new Float32Array(flagGeo.attributes.position.count * 3);
        for (let k = 0; k < flagGeo.attributes.position.count; k++) {
          cAttr[k * 3 + 0] = col.r;
          cAttr[k * 3 + 1] = col.g;
          cAttr[k * 3 + 2] = col.b;
        }
        flagGeo.setAttribute('color', new THREE.BufferAttribute(cAttr, 3));
        flagGeos.push(flagGeo);
      }
      prevPt = pt;
    }
  }

  // Thin rope line
  const ropeGeo = new THREE.BufferGeometry();
  ropeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ropePositions, 3));
  ropeGeo.setIndex(ropeIndices);
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x4a3d31 });
  const ropeLine = new THREE.LineSegments(ropeGeo, ropeMat);
  group.add(ropeLine);

  if (flagGeos.length) {
    const flagsGeo = mergeGeometries(flagGeos, false);
    const flagsMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
    const flagsMesh = new THREE.Mesh(flagsGeo, flagsMat);
    group.add(flagsMesh);
  }

  // ---------------------------------------------------------------- API & exports
  const spawnPoint = new THREE.Vector3(W.wildGate.spawnPos.x, getHeight(W.wildGate.spawnPos.x, W.wildGate.spawnPos.z), W.wildGate.spawnPos.z);
  const gatePosition = new THREE.Vector3(W.wildGate.x, getHeight(W.wildGate.x, W.wildGate.z), W.wildGate.z);

  const api = {
    group,
    getHeight,
    spawnPoint,
    gatePosition,
    maniStones: maniStonesData,
    zones: W.zones,
    update(dt) {
      if (state.zone && state.zone !== 'wild') {
        maniTimer = 0;
        return;
      }

      let nearAnyMani = false;
      const pPos = state.player?.position;
      const maniRadius = config.VITALS?.restore?.maniRadius ?? 4;

      if (pPos) {
        for (let i = 0; i < maniAuras.length; i++) {
          const a = maniAuras[i];
          const dist = Math.hypot(pPos.x - a.x, pPos.z - a.z);
          const isNear = dist <= maniRadius;
          if (isNear) nearAnyMani = true;

          // Pulse brighter & faster when player is within 4m
          const pulseSpeed = isNear ? 4.2 : 1.8;
          const baseAlpha = isNear ? 0.52 : 0.22;
          const pulseAmp = isNear ? 0.28 : 0.10;
          a.mat.opacity = baseAlpha + pulseAmp * Math.sin(state.elapsed * pulseSpeed + i * 1.5);
          const s = 1.0 + (isNear ? 0.05 : 0.02) * Math.sin(state.elapsed * pulseSpeed);
          a.mesh.scale.set(s, s, s);
        }
      }

      if (nearAnyMani) {
        maniTimer += dt;
        const interval = config.VITALS?.restore?.maniInterval ?? 1.0;
        if (maniTimer >= interval) {
          maniTimer -= interval;
          bus.emit('vitals:restore', {
            mp: config.VITALS?.restore?.maniMp ?? 1,
            source: 'mani',
          });
        }
      } else {
        maniTimer = 0;
      }
    },
  };

  ctx.wilderness = api;
  return api;
}
