import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * High-resolution procedural CanvasTexture for the circular kora plaza flagstones.
 * Uses polar concentric courses of weathered Kathmandu stone, radial joints,
 * and warm brick-stone kora path inlays.
 */
function createPlazaPavingTexture(texSize = 1024) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = texSize;
  canvas.height = texSize;
  const g = canvas.getContext('2d');
  if (texSize !== size) g.scale(texSize / size, texSize / size);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.49;

  // Base warm grey-ochre stone mortar tone
  g.fillStyle = '#8b8377';
  g.fillRect(0, 0, size, size);

  // Subtle organic dirt/patina mottling
  const speckleCount = texSize < 512 ? 150 : texSize < 1024 ? 400 : 900;
  for (let i = 0; i < speckleCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 28;
    const v = 122 + Math.floor(Math.random() * 35);
    g.fillStyle = `rgba(${v}, ${v - 5}, ${v - 12}, 0.14)`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Concentric courses of flagstones from r = 18m out to r = 42m
  const ringCount = 26;
  const innerStart = maxR * 0.42;
  const ringStep = (maxR - innerStart) / ringCount;

  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const r0 = innerStart + rIdx * ringStep;
    const r1 = r0 + ringStep;
    const rMid = (r0 + r1) * 0.5;

    // Accentuate walking kora rings with warm terracotta/sandstone bands
    const isAccentRing = rIdx === 3 || rIdx === 12 || rIdx === 21;
    const baseHue = isAccentRing ? [168, 128, 102] : [152, 144, 132];

    const segs = Math.floor((2 * Math.PI * rMid) / 14);
    for (let s = 0; s < segs; s++) {
      const a0 = (s / segs) * Math.PI * 2 + (rIdx % 2) * (Math.PI / segs);
      const a1 = ((s + 1) / segs) * Math.PI * 2 + (rIdx % 2) * (Math.PI / segs);

      const jitter = ((s * 17 + rIdx * 31) % 19) - 9;
      const cr = baseHue[0] + jitter;
      const cg = baseHue[1] + jitter;
      const cb = baseHue[2] + jitter;

      g.beginPath();
      g.arc(cx, cy, r1 - 1.2, a0 + 0.004, a1 - 0.004, false);
      g.arc(cx, cy, r0 + 1.2, a1 - 0.004, a0 + 0.004, true);
      g.closePath();
      g.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      g.fill();
    }

    // Dark mortar circle between rings
    g.beginPath();
    g.arc(cx, cy, r0, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(62, 56, 49, 0.55)';
    g.lineWidth = 2.0;
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Tiling stone/cobble texture for the outer ground beyond the buildings.
 */
function createOuterGroundTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');

  g.fillStyle = '#6c655a';
  g.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 16) {
    const offset = (y / 16) % 2 === 0 ? 0 : 16;
    for (let x = 0; x < size; x += 32) {
      const shade = 98 + ((x * 7 + y * 13) % 22);
      g.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade - 14})`;
      g.fillRect((x + offset) % size + 1, y + 1, 29, 13);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}

/**
 * Deterministic pseudo-random helper in [0, 1).
 */
function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function createEnvironment(ctx) {
  const { scene, state, config, colliders } = ctx;
  const W = config.WORLD;

  const root = new THREE.Group();
  root.name = 'Environment';
  (ctx.stupaGroup || scene).add(root);

  // ---------------------------------------------------------------- 1. Ground & Circular Kora Flagstone Plaza
  const outerGroundGeo = new THREE.CircleGeometry(W.groundRadius, 64);
  outerGroundGeo.rotateX(-Math.PI / 2);
  const outerGroundMat = new THREE.MeshStandardMaterial({
    map: createOuterGroundTexture(),
    roughness: 0.92,
    metalness: 0.02,
  });
  const outerGroundMesh = new THREE.Mesh(outerGroundGeo, outerGroundMat);
  outerGroundMesh.receiveShadow = true;
  root.add(outerGroundMesh);

  // High-detail flagstone kora plaza disc out to buildingsInnerRadius + 2.5m
  const plazaR = W.buildingsInnerRadius + 2.5; // 42.5m
  const plazaGeo = new THREE.CircleGeometry(plazaR, 96);
  plazaGeo.rotateX(-Math.PI / 2);
  plazaGeo.translate(0, 0.015, 0);
  const plazaMat = new THREE.MeshStandardMaterial({
    map: createPlazaPavingTexture(ctx.isSoftwareWebGL ? 256 : ctx.isMobile ? 512 : 1024),
    roughness: 0.86,
    metalness: 0.04,
  });
  const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
  plazaMesh.receiveShadow = true;
  root.add(plazaMesh);

  // Raised stone sidewalk curb around the outer perimeter of the walkable kora ring
  const curbGeo = new THREE.RingGeometry(W.buildingsInnerRadius - 0.55, W.buildingsInnerRadius + 3.0, 72);
  curbGeo.rotateX(-Math.PI / 2);
  curbGeo.translate(0, 0.12, 0);
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x82796d, roughness: 0.88 });
  const curbMesh = new THREE.Mesh(curbGeo, curbMat);
  curbMesh.receiveShadow = true;
  root.add(curbMesh);

  // ---------------------------------------------------------------- 2. Ring of Newari & Tibetan Buildings around Plaza
  const facadeMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x9e3a2b, roughness: 0.84 }), // Newari brick red
    new THREE.MeshStandardMaterial({ color: 0xf0eae0, roughness: 0.82 }), // Lime whitewash
    new THREE.MeshStandardMaterial({ color: 0xd89336, roughness: 0.80 }), // Golden ochre
    new THREE.MeshStandardMaterial({ color: 0xc46d43, roughness: 0.84 }), // Warm terracotta
    new THREE.MeshStandardMaterial({ color: 0x7e211c, roughness: 0.78 }), // Monastery crimson
  ];

  const facadeBuckets = facadeMaterials.map(() => []);
  const woodGeos = [];
  const roofGeos = [];
  const goldGeos = [];
  const awningBuckets = [[], [], [], []]; // maroon, saffron, royal blue, forest green
  const unlitWindowGeos = [];
  const litWindowStages = [[], [], []]; // 3 groups of night-lit windows with slightly different warmth/thresholds
  const lanternPositions = [];

  const buildingRingCount = 40;
  const ringRadius = W.buildingsInnerRadius; // 40m

  for (let i = 0; i < buildingRingCount; i++) {
    const r1 = seededRandom(i * 11.3 + 1.0);
    const r2 = seededRandom(i * 23.7 + 2.0);
    const r3 = seededRandom(i * 37.1 + 3.0);

    const sectorSpan = (Math.PI * 2) / buildingRingCount;
    const angle = i * sectorSpan;

    // Leave narrow visual alleyways every few buildings
    const hasAlley = i % 5 === 0;
    const angularFill = hasAlley ? 0.78 : 0.96;
    const width = ringRadius * sectorSpan * angularFill;
    const depth = 6.2 + r1 * 2.4;

    // Grand Tibetan Monastery (Gompa) on the North side (around angle = -PI/2, i.e. i = 30)
    const isMonastery = i === 30;
    const floors = isMonastery ? 4 : 3 + Math.floor(r2 * 3); // 3 to 5 storeys
    const floorH = isMonastery ? 3.2 : 2.75;
    const totalH = floors * floorH;

    const matIdx = isMonastery ? 4 : Math.floor(r3 * 4);
    const centerR = ringRadius + depth * 0.5;

    // Local helper to orient a box in the building's local frame (-Z facing inward toward stupa)
    const placeBox = (w, h, d, lx, ly, lz) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.translate(lx, ly, lz);
      g.rotateY(-angle + Math.PI * 0.5);
      g.translate(Math.cos(angle) * centerR, 0, Math.sin(angle) * centerR);
      return g;
    };

    // Main building block
    facadeBuckets[matIdx].push(placeBox(width, totalH, depth, 0, totalH * 0.5, 0));

    // Carved dark wooden cornice bands between storeys
    for (let f = 1; f <= floors; f++) {
      woodGeos.push(placeBox(width + 0.24, 0.22, depth + 0.24, 0, f * floorH, 0));
    }

    // Ground-floor dark wooden shopfront / colonnade recess
    woodGeos.push(placeBox(width * 0.88, 2.25, 0.25, 0, 1.15, -depth * 0.5 - 0.05));

    // Sloped shop awning on ground floor
    if (!hasAlley || isMonastery) {
      const awnIdx = isMonastery ? 0 : i % 4;
      const awn = new THREE.BoxGeometry(width * 0.9, 0.14, 1.35);
      awn.rotateX(0.28);
      awn.translate(0, 2.65, -depth * 0.5 - 0.58);
      awn.rotateY(-angle + Math.PI * 0.5);
      awn.translate(Math.cos(angle) * centerR, 0, Math.sin(angle) * centerR);
      awningBuckets[awnIdx].push(awn);

      // Hanging warm night lantern under shop awning
      const lanternR = ringRadius - 0.65;
      lanternPositions.push(
        new THREE.Vector3(Math.cos(angle) * lanternR, 2.38, Math.sin(angle) * lanternR)
      );
    }

    // Windows across upper storeys (Newari carved wooden frames + window panes)
    const cols = isMonastery ? 4 : 3;
    const colSpacing = (width * 0.76) / Math.max(1, cols - 1);

    for (let f = 1; f < floors; f++) {
      const wy = f * floorH + floorH * 0.52;

      // Occasional projecting wooden balcony on 2nd or 3rd floor
      if ((i + f) % 3 === 0) {
        woodGeos.push(placeBox(width * 0.56, 0.72, 0.65, 0, f * floorH + 0.42, -depth * 0.5 - 0.25));
      }

      for (let c = 0; c < cols; c++) {
        const wx = (c - (cols - 1) * 0.5) * colSpacing;
        const wz = -depth * 0.5 - 0.06;

        // Carved wooden window frame
        woodGeos.push(placeBox(0.92, 1.24, 0.16, wx, wy, wz));

        // Window glass pane (subset lights up warmly at night)
        const winSeed = seededRandom(i * 97 + f * 31 + c * 13);
        const paneGeo = placeBox(0.68, 0.98, 0.18, wx, wy, wz - 0.02);
        if (winSeed < 0.62) {
          const stage = (i + f + c) % 3;
          litWindowStages[stage].push(paneGeo);
        } else {
          unlitWindowGeos.push(paneGeo);
        }
      }
    }

    // Rooftop architecture: parapet walls, rooftop café/terrace pergolas, or monastery golden roof
    if (isMonastery) {
      const pagodaRoof = placeBox(width + 1.2, 0.55, depth + 1.2, 0, totalH + 0.28, 0);
      goldGeos.push(pagodaRoof);
      const upperHall = placeBox(width * 0.65, 2.4, depth * 0.65, 0, totalH + 1.4, 0);
      facadeBuckets[4].push(upperHall);
      const topGoldRoof = placeBox(width * 0.78, 0.5, depth * 0.78, 0, totalH + 2.8, 0);
      goldGeos.push(topGoldRoof);
    } else {
      // Front rooftop parapet wall
      facadeBuckets[matIdx].push(placeBox(width, 0.75, 0.28, 0, totalH + 0.375, -depth * 0.5 + 0.14));
      // Terracotta roof penthouse / stairwell shed on part of the roof
      const shedW = width * (0.45 + 0.25 * r1);
      roofGeos.push(placeBox(shedW, 2.1, depth * 0.55, (r2 - 0.5) * width * 0.25, totalH + 1.05, depth * 0.15));
    }

    // Second outer ring of background buildings (at r ≈ 52m) to fill narrow alley gaps and add skyline depth
    if (i % 2 === 0) {
      const backR = ringRadius + 11.5;
      const backH = totalH + (r1 - 0.3) * 3.5;
      const backW = width * 1.65;
      const backGeo = new THREE.BoxGeometry(backW, backH, 6.5);
      backGeo.translate(0, backH * 0.5, 0);
      backGeo.rotateY(-angle - sectorSpan * 0.5 - Math.PI * 0.5);
      backGeo.translate(Math.cos(angle + sectorSpan * 0.5) * backR, 0, Math.sin(angle + sectorSpan * 0.5) * backR);
      facadeBuckets[(matIdx + 1) % 4].push(backGeo);
    }
  }

  // Merge and add building meshes
  for (let m = 0; m < facadeMaterials.length; m++) {
    if (!facadeBuckets[m].length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(facadeBuckets[m], false), facadeMaterials[m]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x361f14, roughness: 0.82 });
  if (woodGeos.length) {
    const woodMesh = new THREE.Mesh(mergeGeometries(woodGeos, false), woodMat);
    woodMesh.castShadow = true;
    woodMesh.receiveShadow = true;
    root.add(woodMesh);
  }

  const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x8c462b, roughness: 0.85 });
  if (roofGeos.length) {
    const roofMesh = new THREE.Mesh(mergeGeometries(roofGeos, false), roofTileMat);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    root.add(roofMesh);
  }

  const goldRoofMat = new THREE.MeshStandardMaterial({ color: 0xf0ba3c, roughness: 0.26, metalness: 0.86 });
  if (goldGeos.length) {
    const goldMesh = new THREE.Mesh(mergeGeometries(goldGeos, false), goldRoofMat);
    goldMesh.castShadow = true;
    root.add(goldMesh);
  }

  const awningColors = [0x8b1e19, 0xd9821e, 0x1e4c8a, 0x256338];
  for (let a = 0; a < awningBuckets.length; a++) {
    if (!awningBuckets[a].length) continue;
    const mat = new THREE.MeshStandardMaterial({ color: awningColors[a], roughness: 0.78 });
    const mesh = new THREE.Mesh(mergeGeometries(awningBuckets[a], false), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  // Unlit windows
  if (unlitWindowGeos.length) {
    const unlitMat = new THREE.MeshStandardMaterial({ color: 0x1a222d, roughness: 0.35, metalness: 0.25 });
    root.add(new THREE.Mesh(mergeGeometries(unlitWindowGeos, false), unlitMat));
  }

  // Night-lit window materials (3 warmth variations so windows turn on gradually through dusk)
  const litWindowMaterials = [
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.22, 0.28), toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.22, 0.28), toneMapped: false }),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.22, 0.28), toneMapped: false }),
  ];

  for (let s = 0; s < 3; s++) {
    if (!litWindowStages[s].length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(litWindowStages[s], false), litWindowMaterials[s]);
    root.add(mesh);
  }

  // Hanging shopfront lanterns around the plaza
  const lanternGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.28, 8);
  const lanternMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.65, 0.28, 0.16),
    toneMapped: false,
  });
  const lanternInstanced = new THREE.InstancedMesh(lanternGeo, lanternMat, lanternPositions.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < lanternPositions.length; i++) {
    dummy.position.copy(lanternPositions[i]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lanternInstanced.setMatrixAt(i, dummy.matrix);
  }
  lanternInstanced.instanceMatrix.needsUpdate = true;
  root.add(lanternInstanced);

  // ---------------------------------------------------------------- 2b. North Monastery Mountain Gate Archway (北側山門牌樓)
  const gateGroup = new THREE.Group();
  gateGroup.name = 'NorthMountainGate';
  gateGroup.position.set(0, 0, -37.2);

  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xede7dc, roughness: 0.90 });
  const maroonTrimMat = new THREE.MeshStandardMaterial({ color: 0x7c1e19, roughness: 0.72 });
  const gateWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.80 });
  const gateTileMat = new THREE.MeshStandardMaterial({ color: 0x48413b, roughness: 0.76 });
  const gateGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf5bf42, roughness: 0.32, metalness: 0.68,
    emissive: 0xc47816, emissiveIntensity: 0.28,
  });
  const gateFlameMat = new THREE.MeshBasicMaterial({ color: 0xffd480, toneMapped: false });
  const gateGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffbd59, toneMapped: false, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const gatePlasterGeos = [];
  const gateMaroonGeos = [];
  const gateWoodGeos = [];
  const gateTileGeos = [];
  const gateGoldGeos = [];
  const gateFlameGeos = [];
  const gateGlowGeos = [];

  // Bake static ornament into material batches: no extra lights or per-frame work.
  function gateBox(bucket, w, h, d, x, y, z = 0, tilt = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.rotateX(tilt);
    geo.translate(x, y, z);
    bucket.push(geo);
  }
  function gateOrb(bucket, x, y, z, sx, sy = sx, sz = sx) {
    const geo = new THREE.SphereGeometry(1, 12, 8);
    geo.scale(sx, sy, sz);
    geo.translate(x, y, z);
    bucket.push(geo);
  }
  function gateRod(bucket, from, to, radius = 0.035) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    const geo = new THREE.CylinderGeometry(radius, radius, direction.length(), 8);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), direction.normalize()
    ));
    geo.translate(...a.add(b).multiplyScalar(0.5).toArray());
    bucket.push(geo);
  }

  const pillarX = 2.6;
  const pillarH = 4.8;
  for (const s of [-1, 1]) {
    for (const [x, h, width, radius] of [[pillarX, pillarH, 0.92, 0.58], [4.1, 3.8, 0.76, 0.48]]) {
      const px = s * x;
      gateBox(gatePlasterGeos, width, 0.42, width, px, 0.21);
      gateBox(gateMaroonGeos, width * 0.94, 0.16, width * 0.94, px, 0.50);
      gateBox(gatePlasterGeos, width * 0.73, h - 0.78, width * 0.73, px, (0.58 + h - 0.20) / 2);
      gateBox(gateMaroonGeos, width * 0.9, 0.20, width * 0.9, px, h - 0.10);
      gateBox(gateGoldGeos, width, 0.14, width, px, h + 0.07);
      colliders?.push({ type: 'circle', x: px, z: -37.2, r: radius, zone: 'stupa' });
    }
  }

  // Three bays, with lower side roofs and stacked projecting Tibetan brackets.
  function gateRoof(cx, y, width, depth) {
    gateBox(gateMaroonGeos, width, 0.16, depth, cx, y);
    for (const side of [-1, 1]) {
      gateBox(gateTileGeos, width, 0.16, depth * 0.56, cx, y + 0.28, side * depth * 0.23, side * 0.27);
      gateBox(gateGoldGeos, width + 0.08, 0.08, 0.09, cx, y + 0.10, side * depth * 0.50);
      for (const end of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(cx + end * (width / 2 - 0.42), y + 0.12, side * depth / 2),
          new THREE.Vector3(cx + end * width / 2, y + 0.23, side * (depth / 2 + 0.08)),
          new THREE.Vector3(cx + end * (width / 2 + 0.16), y + 0.52, side * (depth / 2 + 0.13)),
        ]);
        gateGoldGeos.push(new THREE.TubeGeometry(curve, 8, 0.065, 6, false));
      }
      // Raised tile seams make the sloping planes readable from ground level.
      for (let x = cx - width / 2 + 0.2; x < cx + width / 2; x += 0.36) {
        gateBox(gateTileGeos, 0.045, 0.06, depth * 0.56, x, y + 0.38, side * depth * 0.23, side * 0.27);
      }
    }
    gateBox(gateGoldGeos, width * 0.85, 0.10, 0.14, cx, y + 0.51);
  }
  for (const [cx, height, width] of [[0, pillarH, 5.8], [-3.35, 3.8, 1.9], [3.35, 3.8, 1.9]]) {
    gateBox(gateWoodGeos, width, 0.42, 0.86, cx, height + 0.35);
    gateBox(gateGoldGeos, width, 0.07, 0.92, cx, height + 0.18);
    for (let x = cx - width / 2 + 0.3; x < cx + width / 2; x += 0.65) {
      for (let tier = 0; tier < 3; tier++) {
        gateBox(tier % 2 ? gateGoldGeos : gateMaroonGeos,
          0.24 + tier * 0.17, 0.12, 1.0 + tier * 0.18, x, height + 0.60 + tier * 0.13);
      }
    }
    gateRoof(cx, height + 1.0, width + 0.55, 1.9);
  }
  gateRoof(0, pillarH + 1.65, 4.9, 1.55);

  // Gold-framed south-facing plaque with an embossed auspicious wheel motif.
  gateBox(gateGoldGeos, 3.14, 0.79, 0.10, 0, pillarH + 0.35, 0.52);
  gateBox(gateMaroonGeos, 2.96, 0.61, 0.12, 0, pillarH + 0.35, 0.59);
  for (const x of [-1.08, -0.72, 0.72, 1.08]) {
    const diamond = new THREE.BoxGeometry(0.12, 0.12, 0.035);
    diamond.rotateZ(Math.PI / 4);
    diamond.translate(x, pillarH + 0.35, 0.67);
    gateGoldGeos.push(diamond);
  }
  function gateWheel(x, y, z, radius) {
    const rim = new THREE.TorusGeometry(radius, radius * 0.09, 8, 32);
    rim.translate(x, y, z);
    gateGoldGeos.push(rim);
    gateOrb(gateGoldGeos, x, y, z, radius * 0.22);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      gateRod(gateGoldGeos, [x, y, z], [x + Math.sin(a) * radius, y + Math.cos(a) * radius, z], radius * 0.055);
    }
  }
  gateWheel(0, pillarH + 0.35, 0.70, 0.23);
  const crestY = pillarH + 2.95;
  gateWheel(0, crestY, 0.08, 0.70);
  gateBox(gateGoldGeos, 3.3, 0.14, 0.48, 0, pillarH + 2.24);
  for (const s of [-1, 1]) {
    gateOrb(gateGoldGeos, s * 1.20, crestY - 0.44, 0, 0.46, 0.23, 0.18);
    gateOrb(gateGoldGeos, s * 0.94, crestY - 0.21, 0, 0.14, 0.30, 0.13);
    gateOrb(gateGoldGeos, s * 0.82, crestY + 0.03, 0, 0.22, 0.13, 0.12);
    for (const z of [-0.12, 0.12]) {
      gateRod(gateGoldGeos, [s * 1.44, crestY - 0.55, z], [s * 1.02, crestY - 0.62, z], 0.07);
      gateRod(gateGoldGeos, [s * 0.94, crestY + 0.10, z], [s * 1.07, crestY + 0.40, z], 0.035);
      gateRod(gateGoldGeos, [s * 1.02, crestY + 0.28, z], [s * 0.90, crestY + 0.39, z], 0.025);
    }
  }

  // Inlaid stone runner: flush with the plaza, leaving the central passage clear.
  gateBox(gateMaroonGeos, 3.6, 0.012, 15.7, 0, 0.026, 7.85);
  for (const x of [-1.87, 1.87]) gateBox(gateGoldGeos, 0.14, 0.012, 15.7, x, 0.032, 7.85);
  for (const z of [0.09, 15.61]) gateBox(gateGoldGeos, 3.6, 0.008, 0.12, 0, 0.036, z);
  for (const z of [2.0, 5.8, 9.6, 13.4]) {
    const ring = new THREE.RingGeometry(0.38, 0.43, 32);
    ring.rotateX(-Math.PI / 2);
    ring.translate(0, 0.04, z);
    gateGoldGeos.push(ring);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const petal = new THREE.CircleGeometry(1, 12);
      petal.scale(0.13, 0.30, 1);
      petal.rotateZ(-a);
      petal.rotateX(-Math.PI / 2);
      petal.translate(Math.sin(a) * 0.38, 0.04, z - Math.cos(a) * 0.38);
      gateGoldGeos.push(petal);
    }
  }

  // Four pairs of low lotus butter lamps, sharing baked geometry and materials.
  for (const z of [13.2, 8.7, 4.2, 1.0]) {
    for (const s of [-1, 1]) {
      const x = s * 2.8;
      gateBox(gatePlasterGeos, 0.52, 0.22, 0.52, x, 0.11, z);
      gateBox(gateGoldGeos, 0.30, 0.52, 0.30, x, 0.46, z);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        gateOrb(gateGoldGeos, x + Math.cos(a) * 0.19, 0.76, z + Math.sin(a) * 0.19, 0.12, 0.17, 0.12);
      }
      gateOrb(gateFlameGeos, x, 0.95, z, 0.12, 0.24, 0.12);
      gateOrb(gateGlowGeos, x, 0.97, z, 0.32, 0.40, 0.32);
      colliders?.push({ type: 'circle', x, z: z - 37.2, r: 0.32, zone: 'stupa' });
    }
  }

  // Darchen poles and five-colour Gyaltsen banners, reaching 9.6 metres.
  const flagColors = [0x2454af, 0xf7efda, 0xbb3028, 0x2c854a, 0xf3c33b];
  const flagBuckets = flagColors.map(() => []);
  for (const s of [-1, 1]) {
    const x = s * 3.8;
    gateBox(gatePlasterGeos, 0.74, 0.44, 0.74, x, 0.22, 1.6);
    gateRod(gateWoodGeos, [x, 0.44, 1.6], [x, 9.2, 1.6], 0.095);
    for (const y of [0.55, 3.0, 6.0, 9.0]) {
      gateBox(gateGoldGeos, 0.23, 0.12, 0.23, x, y, 1.6);
    }
    gateOrb(gateFlameGeos, x, 9.32, 1.6, 0.15, 0.28, 0.15);
    gateOrb(gateGlowGeos, x, 9.32, 1.6, 0.31, 0.40, 0.31);
    for (let i = 0; i < 5; i++) {
      const banner = new THREE.CylinderGeometry(0.28, 0.28, 0.40, 16);
      banner.translate(x, 8.65 - i * 0.42, 1.6);
      flagBuckets[i].push(banner);
      const rim = new THREE.TorusGeometry(0.29, 0.035, 6, 16);
      rim.rotateX(Math.PI / 2);
      rim.translate(x, 8.86 - i * 0.42, 1.6);
      gateGoldGeos.push(rim);
    }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      gateRod(gateGoldGeos, [x + Math.cos(a) * 0.25, 6.75, 1.6 + Math.sin(a) * 0.25],
        [x + Math.cos(a) * 0.25, 6.35, 1.6 + Math.sin(a) * 0.25], 0.025);
    }
    const garland = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 9.05, 1.6),
      new THREE.Vector3(s * 2.6, 7.25, 1.25),
      new THREE.Vector3(s * 0.6, pillarH + 2.05, 0.7),
    ]);
    gateGoldGeos.push(new THREE.TubeGeometry(garland, 24, 0.018, 4, false));
    for (let i = 0; i < 15; i++) {
      const t = (i + 0.5) / 15;
      const point = garland.getPoint(t);
      const tangent = garland.getTangent(t);
      const flag = new THREE.PlaneGeometry(0.24, 0.34);
      flag.rotateZ(Math.atan2(tangent.y, tangent.x));
      flag.translate(point.x, point.y - 0.19, point.z);
      flagBuckets[i % 5].push(flag);
    }
    colliders?.push({ type: 'circle', x, z: -35.6, r: 0.46, zone: 'stupa' });
  }

  // Red-gold lanterns below the central and side lintels, all self-illuminated.
  for (const [x, y] of [[-1.65, 4.25], [1.65, 4.25], [-3.35, 3.28], [3.35, 3.28]]) {
    gateRod(gateGoldGeos, [x, y + 0.32, 0], [x, y + 0.75, 0], 0.025);
    gateOrb(gateMaroonGeos, x, y, 0, 0.26, 0.36, 0.26);
    gateOrb(gateFlameGeos, x, y, 0, 0.21, 0.25, 0.28);
    for (const dy of [-0.30, 0.30]) gateBox(gateGoldGeos, 0.46, 0.09, 0.46, x, y + dy);
    gateRod(gateGoldGeos, [x, y - 0.32, 0], [x, y - 0.62, 0], 0.04);
    gateOrb(gateGlowGeos, x, y, 0, 0.43, 0.53, 0.43);
  }

  const batches = [
    [gatePlasterGeos, plasterMat], [gateMaroonGeos, maroonTrimMat],
    [gateWoodGeos, gateWoodMat], [gateTileGeos, gateTileMat], [gateGoldGeos, gateGoldMat],
    [gateFlameGeos, gateFlameMat], [gateGlowGeos, gateGlowMat],
    ...flagBuckets.map((geos, i) => [geos, new THREE.MeshStandardMaterial({
      color: flagColors[i], roughness: 0.92, side: THREE.DoubleSide,
    })]),
  ];
  for (const [geos, material] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), material);
    mesh.castShadow = material.isMeshStandardMaterial;
    mesh.receiveShadow = material.isMeshStandardMaterial;
    gateGroup.add(mesh);
    for (const geo of geos) geo.dispose();
  }

  // Soft radial halo behind the open-spoked wheel; no opaque disc hiding the crest.
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = haloCanvas.height = 64;
  const haloCtx = haloCanvas.getContext('2d');
  const haloGradient = haloCtx.createRadialGradient(32, 32, 3, 32, 32, 32);
  haloGradient.addColorStop(0, 'rgba(255, 216, 134, 0.65)');
  haloGradient.addColorStop(0.45, 'rgba(255, 186, 64, 0.3)');
  haloGradient.addColorStop(1, 'rgba(255, 160, 32, 0)');
  haloCtx.fillStyle = haloGradient;
  haloCtx.fillRect(0, 0, 64, 64);
  const haloTexture = new THREE.CanvasTexture(haloCanvas);
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.MeshBasicMaterial({
    map: haloTexture, toneMapped: false, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  halo.position.set(0, crestY, -0.16);
  gateGroup.add(halo);

  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffc369, toneMapped: false, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const portalAura = new THREE.Mesh(new THREE.RingGeometry(1, 1.06, 64), auraMat);
  portalAura.scale.set(2.0, 2.15, 1);
  portalAura.position.set(0, 2.2, 0);
  gateGroup.add(portalAura);
  const thresholdGlow = new THREE.Mesh(new THREE.RingGeometry(1.65, 2.1, 64), auraMat);
  thresholdGlow.rotation.x = -Math.PI / 2;
  thresholdGlow.scale.y = 0.52;
  thresholdGlow.position.set(0, 0.045, 0);
  gateGroup.add(thresholdGlow);

  root.add(gateGroup);

  // ---------------------------------------------------------------- 2c. South Grove Mountain Gate Archway (南側祈願塔林山門牌樓)
  const southGateGroup = gateGroup.clone();
  southGateGroup.name = 'SouthGroveGate';
  southGateGroup.position.set(0, 0, 37.2);
  southGateGroup.rotation.y = Math.PI;
  root.add(southGateGroup);

  if (colliders) {
    for (const s of [-1, 1]) {
      for (const [x, radius] of [[pillarX, 0.58], [4.1, 0.48]]) {
        colliders.push({
          type: 'circle',
          x: s * x,
          z: 37.2,
          r: radius,
          zone: 'stupa',
        });
      }
      colliders.push({
        type: 'circle',
        x: s * 3.8,
        z: 35.6,
        r: 0.46,
        zone: 'stupa',
      });
      for (const lz of [13.2, 8.7, 4.2, 1.0]) {
        colliders.push({
          type: 'circle',
          x: s * 2.8,
          z: 37.2 - lz,
          r: 0.32,
          zone: 'stupa',
        });
      }
    }
  }

  // ---------------------------------------------------------------- 3. Kathmandu Valley Hills & Distant Himalayan Peaks
  const hillSegs = 96;
  const hillInnerR = 112;
  const hillOuterR = 158;
  const hillPositions = [];
  const hillColors = [];
  const hillIndices = [];

  for (let i = 0; i <= hillSegs; i++) {
    const a = (i / hillSegs) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    // Layered trigonometric ridges for natural valley rim profile
    const ridge =
      14 +
      8.5 * Math.sin(a * 5.0 + 0.8) +
      5.2 * Math.cos(a * 11.0 - 1.4) +
      3.0 * Math.sin(a * 19.0 + 2.1);

    // Inner base vertex
    hillPositions.push(ca * hillInnerR, -0.5, sa * hillInnerR);
    hillColors.push(0.20, 0.28, 0.22);

    // Ridge crest vertex
    hillPositions.push(ca * hillOuterR, ridge, sa * hillOuterR);
    hillColors.push(0.24, 0.34, 0.30);

    if (i < hillSegs) {
      const b = i * 2;
      hillIndices.push(b, b + 2, b + 1);
      hillIndices.push(b + 1, b + 2, b + 3);
    }
  }

  const hillGeo = new THREE.BufferGeometry();
  hillGeo.setAttribute('position', new THREE.Float32BufferAttribute(hillPositions, 3));
  hillGeo.setAttribute('color', new THREE.Float32BufferAttribute(hillColors, 3));
  hillGeo.setIndex(hillIndices);
  hillGeo.computeVertexNormals();
  const hillMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  root.add(new THREE.Mesh(hillGeo, hillMat));

  // Towering Snow-Capped Himalayan Range along the northern horizon (-Z, angle in [-PI*0.92, -PI*0.08])
  const himalayaPeaks = 38;
  const himGeos = [];
  for (let i = 0; i < himalayaPeaks; i++) {
    const u = i / (himalayaPeaks - 1);
    const a = -Math.PI * 0.92 + u * Math.PI * 0.84;
    const dist = 240 + (i % 3) * 18;
    const env = Math.sin(u * Math.PI); // tallest near North / North-East (Langtang / Ganesh Himal)
    const peakH = 38 + env * 58 + Math.abs(Math.sin(i * 4.3)) * 22;
    const peakR = 26 + (i % 4) * 6;

    const cone = new THREE.ConeGeometry(peakR, peakH, 5, 2);
    // Color snow line above 55% height using vertex colors
    const pos = cone.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const vy = pos.getY(v) + peakH * 0.5;
      const isSnow = vy > peakH * 0.46;
      if (isSnow) {
        cols[v * 3 + 0] = 0.88;
        cols[v * 3 + 1] = 0.91;
        cols[v * 3 + 2] = 0.97;
      } else {
        cols[v * 3 + 0] = 0.25;
        cols[v * 3 + 1] = 0.31;
        cols[v * 3 + 2] = 0.44;
      }
    }
    cone.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    cone.rotateY(i * 0.9);
    cone.translate(Math.cos(a) * dist, peakH * 0.5 - 4, Math.sin(a) * dist);
    himGeos.push(cone);
  }

  const himMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
  });
  root.add(new THREE.Mesh(mergeGeometries(himGeos, false), himMat));

  // ---------------------------------------------------------------- 4. Flock of Pigeons (Circling & Ground Pecking)
  // Build low-poly pigeon geometry: body + head + tail + left/right wings (wings have |x| > 0.05 for shader flap)
  const bodyGeo = new THREE.ConeGeometry(0.075, 0.30, 6);
  bodyGeo.rotateX(Math.PI * 0.5);
  const headGeo = new THREE.SphereGeometry(0.052, 6, 5);
  headGeo.translate(0, 0.055, 0.13);
  const wingL = new THREE.BoxGeometry(0.24, 0.015, 0.13);
  wingL.translate(-0.15, 0.02, 0.0);
  const wingR = new THREE.BoxGeometry(0.24, 0.015, 0.13);
  wingR.translate(0.15, 0.02, 0.0);

  const pigeonGeo = mergeGeometries([bodyGeo, headGeo, wingL, wingR], false);

  const pigeonCount = 44;
  const pigeonFlapAttr = new Float32Array(pigeonCount * 2); // [flapAmp, phase]
  const pigeons = [];

  for (let i = 0; i < pigeonCount; i++) {
    const isFlying = i < 28;
    const angle = (i / pigeonCount) * Math.PI * 2 + seededRandom(i * 7.1) * 0.5;
    const radius = isFlying
      ? 14.5 + seededRandom(i * 13.3) * 18.0
      : 23.5 + seededRandom(i * 19.7) * 11.5;
    const baseY = isFlying ? 5.2 + seededRandom(i * 29.1) * 10.5 : 0.09;

    pigeons.push({
      isFlying,
      angle,
      radius,
      baseY,
      speed: isFlying ? (0.32 + seededRandom(i * 3.7) * 0.22) * (i % 2 === 0 ? 1 : -1) : 0.04,
      phase: seededRandom(i * 41.2) * Math.PI * 2,
      hopTimer: 0,
      x: Math.cos(angle) * radius,
      y: baseY,
      z: Math.sin(angle) * radius,
      heading: angle + Math.PI * 0.5,
    });

    pigeonFlapAttr[i * 2 + 0] = isFlying ? 1.0 : 0.08;
    pigeonFlapAttr[i * 2 + 1] = pigeons[i].phase;
  }

  pigeonGeo.setAttribute('aFlap', new THREE.InstancedBufferAttribute(pigeonFlapAttr, 2));

  const pigeonUniforms = { uTime: { value: 0 } };
  const pigeonMat = new THREE.MeshStandardMaterial({
    color: 0x7c8796,
    roughness: 0.75,
  });
  pigeonMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = pigeonUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute vec2 aFlap;
        uniform float uTime;
        `
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        float wingMask = smoothstep(0.05, 0.24, abs(position.x));
        float flap = sin(uTime * 15.5 + aFlap.y) * aFlap.x;
        transformed.y += wingMask * flap * 0.14;
        `
      );
  };

  const pigeonInstanced = new THREE.InstancedMesh(pigeonGeo, pigeonMat, pigeonCount);
  pigeonInstanced.castShadow = true;
  root.add(pigeonInstanced);

  // ---------------------------------------------------------------- Update Loop (Windows, Lanterns, Pigeons)
  function update(dt) {
    if (state.zone && state.zone !== 'stupa') return;

    const t = state.elapsed;
    const nf = state.time.nightFactor;

    // 1. Update night-lit windows (warm golden glow above bloom threshold 0.85 at night)
    for (let s = 0; s < 3; s++) {
      const threshold = 0.15 + s * 0.14;
      const wGlow = Math.pow(THREE.MathUtils.clamp((nf - threshold) / (0.85 - threshold), 0, 1), 1.3);
      const warmTint = 1.0 - s * 0.08;
      litWindowMaterials[s].color.setRGB(
        0.16 + wGlow * 2.15,
        0.19 + wGlow * 1.42 * warmTint,
        0.24 + wGlow * 0.62 * warmTint
      );
    }

    // 2. Update shopfront hanging lanterns
    const lGlow = Math.pow(THREE.MathUtils.clamp((nf - 0.12) / 0.6, 0, 1), 1.2);
    lanternMat.color.setRGB(
      0.55 + lGlow * 2.35,
      0.22 + lGlow * 1.15,
      0.12 + lGlow * 0.35
    );

    // 3. Update circling & ground pigeons
    pigeonUniforms.uTime.value = t;
    const pPos = state.player.position;

    for (let i = 0; i < pigeonCount; i++) {
      const p = pigeons[i];

      if (p.isFlying) {
        p.angle += p.speed * dt;
        const rWave = p.radius + Math.sin(t * 0.6 + p.phase) * 1.8;
        p.x = Math.cos(p.angle) * rWave;
        p.z = Math.sin(p.angle) * rWave;
        p.y = p.baseY + Math.sin(t * 1.4 + p.phase) * 0.9;
        p.heading = -p.angle + (p.speed > 0 ? 0 : Math.PI);

        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.heading, p.speed > 0 ? 0.22 : -0.22);
        dummy.scale.setScalar(1);
      } else {
        // Ground pigeon: pecks gently, or flutters away briefly if player walks right up to it
        const dx = p.x - pPos.x;
        const dz = p.z - pPos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 9.0) {
          p.hopTimer = 1.2;
          p.angle += 0.25 * dt;
          p.x = Math.cos(p.angle) * p.radius;
          p.z = Math.sin(p.angle) * p.radius;
        }

        if (p.hopTimer > 0) {
          p.hopTimer = Math.max(0, p.hopTimer - dt);
          p.y = 0.09 + Math.sin(p.hopTimer * Math.PI / 1.2) * 0.95;
        } else {
          p.y = 0.09;
        }

        const peckPitch = p.hopTimer > 0 ? -0.2 : Math.max(0, Math.sin(t * 4.5 + p.phase)) * 0.35;
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(peckPitch, p.phase + Math.sin(t * 0.7 + p.phase) * 0.5, 0);
        dummy.scale.setScalar(0.92);
      }

      dummy.updateMatrix();
      pigeonInstanced.setMatrixAt(i, dummy.matrix);
    }
    pigeonInstanced.instanceMatrix.needsUpdate = true;
  }

  return { update };
}
