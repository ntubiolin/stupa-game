/**
 * Adventure Mode — Guru Rinpoche Terma Caves & Interactive Extraction System (`src/gameplay/termaCaves.js`) — Issue #137
 *
 * Implements:
 *   - 5 Chapter Terma Caves (`pharping`, `mangyul`, `yarlung`, `samye`, `chimphu`):
 *       1. Enter cave / inspect sealed reliquary -> awakens Cave Guardians (`DORMANT` -> `GUARDED`)
 *       2. Defeat all Cave Guardians -> unseals the Terma Reliquary with rainbow light (`GUARDED` -> `UNSEALED`)
 *       3. Interact with the Reliquary (`E`) -> extracts Terma Legendary + Shogser Scroll + Mendrup permanent blessing
 *          + Tertön's Compass (`UNSEALED` -> `EXTRACTED`, with replayable trial option)
 *   - Yeshe Tsogyal's Shogser Scroll Table in `chimphu` (`(6001.8, -15.2)`):
 *       Deciphers all 5 Shogser Scrolls for the Grand Tertön Empowerment (+2 Skill Points, Perm +60 MaxHP, +8 ATK/DEF)
 *   - Strictly 0 PointLights (uses emissive MeshStandardMaterial + AdditiveBlending light pillars & syllable seals).
 *   - Unified persistence via `ctx.save` (`termaCaves` section in `stupa.save.v2`).
 */
import * as THREE from 'three';
import '../i18n/termaCaves.js';
import { i18n } from '../i18n.js';

export const TERMA_CAVE_DEFS = [
  {
    id: 'pharping',
    map: 'pharping',
    x: 1958,
    z: -56,
    rotY: 0.55,
    level: 9,
    triggerRadius: 10.5,
    nameKey: 'termaCave.pharping.name',
    theme: 'rock',
    rockColor: 0x57493e,
    accentColor: 0xf59e0b,
    guards: [
      { kind: 'droughtSprite', rank: 'normal', ox: -3.2, oz: 2.8 },
      { kind: 'droughtSprite', rank: 'normal', ox: 3.2, oz: 2.6 },
      { kind: 'rockSpirit', rank: 'champion', affixes: ['armored'], ox: 0, oz: 3.6 },
    ],
    rewards: {
      legendaryId: 'phurbaSplit',
      ilvl: 10,
      scrollId: 'ch1',
      scrollKey: 'termaScroll.ch1.name',
      mendrupId: 'ch1',
      mendrupKey: 'termaMendrup.ch1.name',
      permanent: { maxHp: 25, atk: 3 },
      unlockCompass: true,
      turquoise: 45,
      essence: 1,
      codex: ['terma', 'terton', 'asuraCave', 'phurba'],
    },
  },
  {
    id: 'mangyul',
    map: 'mangyul',
    x: 2956,
    z: -24,
    rotY: 0.75,
    level: 15,
    triggerRadius: 10.5,
    nameKey: 'termaCave.mangyul.name',
    theme: 'ice',
    rockColor: 0x47687d,
    accentColor: 0x38bdf8,
    guards: [
      { kind: 'snowSprite', rank: 'normal', ox: -3.4, oz: 2.6 },
      { kind: 'hailGhost', rank: 'normal', ox: 3.4, oz: 2.6 },
      { kind: 'avalancheBrute', rank: 'rare', affixes: ['frozen'], ox: 0, oz: 3.8 },
    ],
    rewards: {
      legendaryId: 'tenmaOath',
      ilvl: 16,
      scrollId: 'ch2',
      scrollKey: 'termaScroll.ch2.name',
      mendrupId: 'ch2',
      mendrupKey: 'termaMendrup.ch2.name',
      permanent: { maxHp: 35, def: 4 },
      turquoise: 65,
      essence: 1,
      codex: ['terma', 'twelveTenma'],
    },
  },
  {
    id: 'yarlung',
    map: 'yarlung',
    x: 4052,
    z: -46,
    rotY: -0.65,
    level: 21,
    triggerRadius: 10.5,
    nameKey: 'termaCave.yarlung.name',
    theme: 'crystal',
    rockColor: 0x475569,
    accentColor: 0x2dd4bf,
    guards: [
      { kind: 'nyen', rank: 'normal', ox: -3.2, oz: 2.8 },
      { kind: 'tsen', rank: 'normal', ox: 3.2, oz: 2.8 },
      { kind: 'tsen', rank: 'champion', affixes: ['shielding'], ox: 0, oz: 3.8 },
    ],
    rewards: {
      legendaryId: 'thokchaVajra',
      ilvl: 22,
      scrollId: 'ch3',
      scrollKey: 'termaScroll.ch3.name',
      mendrupId: 'ch3',
      mendrupKey: 'termaMendrup.ch3.name',
      permanent: { maxMp: 20, atk: 4 },
      turquoise: 90,
      essence: 1,
      codex: ['sheldrak', 'terma', 'terton'],
    },
  },
  {
    id: 'samye',
    map: 'samye',
    x: 5058,
    z: 22,
    rotY: -0.8,
    level: 28,
    triggerRadius: 10.5,
    nameKey: 'termaCave.samye.name',
    theme: 'obsidian',
    rockColor: 0x2e2a3b,
    accentColor: 0xfbbf24,
    guards: [
      { kind: 'du', rank: 'normal', ox: -3.4, oz: 2.6 },
      { kind: 'du', rank: 'normal', ox: 3.4, oz: 2.6 },
      { kind: 'gyalpo', rank: 'rare', affixes: ['molten', 'swift'], ox: 0, oz: 3.8 },
    ],
    rewards: {
      legendaryId: 'dakiniMirror',
      ilvl: 29,
      scrollId: 'ch4',
      scrollKey: 'termaScroll.ch4.name',
      mendrupId: 'ch4',
      mendrupKey: 'termaMendrup.ch4.name',
      permanent: { maxHp: 40, atk: 5, def: 5 },
      turquoise: 125,
      essence: 2,
      codex: ['hepori', 'terma', 'eightClasses'],
    },
  },
  {
    id: 'chimphu',
    map: 'chimphu',
    x: 5976,
    z: -28,
    rotY: 0.6,
    level: 32,
    triggerRadius: 9.0,
    nameKey: 'termaCave.chimphu.name',
    theme: 'sacred',
    rockColor: 0x455449,
    accentColor: 0x5eead4,
    guards: [
      { kind: 'du', rank: 'normal', ox: -3.0, oz: 2.5 },
      { kind: 'tsen', rank: 'normal', ox: 3.0, oz: 2.5 },
      { kind: 'gyalpo', rank: 'rare', affixes: ['teleporter', 'shielding'], ox: 0, oz: 3.4 },
    ],
    rewards: {
      legendaryId: 'uddiyanaLotusHat',
      ilvl: 33,
      scrollId: 'ch5',
      scrollKey: 'termaScroll.ch5.name',
      mendrupId: 'ch5',
      mendrupKey: 'termaMendrup.ch5.name',
      permanent: { maxHp: 50, maxMp: 25 },
      skillPoints: 1,
      turquoise: 160,
      essence: 2,
      codex: ['chimphu', 'yesheTsogyal', 'terma', 'terton'],
    },
  },
];

function makeTermaSealTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (!g) return null;

  g.clearRect(0, 0, 256, 256);
  const grad = g.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(251, 191, 36, 0.92)');
  grad.addColorStop(0.55, 'rgba(20, 184, 166, 0.48)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = '#fde68a';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(128, 128, 96, 0, Math.PI * 2);
  g.stroke();

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fef08a';
  g.font = 'bold 58px "Noto Serif Tibetan", "Kailasa", serif';
  g.fillText('ཨོཾ་ཨཱཿ་ཧཱུྃ', 128, 108);
  g.fillStyle = '#5eead4';
  g.font = 'bold 40px "Noto Serif Tibetan", serif';
  g.fillText('གཏེར་མ', 128, 162);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createTermaCaves(ctx) {
  if (ctx.termaCaves) return ctx.termaCaves;
  const { scene, state, bus } = ctx;

  const DEFAULT_SAVE = {
    extracted: {},
    scrolls: [],
    mendrup: [],
    compassUnlocked: false,
    shogserDeciphered: false,
  };

  let savedState = {
    extracted: {},
    scrolls: [],
    mendrup: [],
    compassUnlocked: false,
    shogserDeciphered: false,
  };

  function loadFromSave() {
    const raw = ctx.save ? ctx.save.get('termaCaves', DEFAULT_SAVE) : DEFAULT_SAVE;
    savedState = {
      extracted:
        raw?.extracted && typeof raw.extracted === 'object' ? { ...raw.extracted } : {},
      scrolls: Array.isArray(raw?.scrolls) ? [...new Set(raw.scrolls)] : [],
      mendrup: Array.isArray(raw?.mendrup) ? [...new Set(raw.mendrup)] : [],
      compassUnlocked: Boolean(raw?.compassUnlocked),
      shogserDeciphered: Boolean(raw?.shogserDeciphered),
    };
    syncState();
  }

  function persist() {
    syncState();
    if (ctx.save?.set) {
      ctx.save.set('termaCaves', {
        extracted: { ...savedState.extracted },
        scrolls: [...savedState.scrolls],
        mendrup: [...savedState.mendrup],
        compassUnlocked: savedState.compassUnlocked,
        shogserDeciphered: savedState.shogserDeciphered,
      });
    }
  }

  const caveRuntime = new Map(); // id -> runtime object
  let sealTex = null;

  function syncState() {
    const cavesSnap = {};
    for (const def of TERMA_CAVE_DEFS) {
      const rt = caveRuntime.get(def.id);
      const entry = {
        id: def.id,
        map: def.map,
        x: def.x,
        z: def.z,
        status: rt?.status || (savedState.extracted[def.id] ? 'EXTRACTED' : 'DORMANT'),
        extractedOnce: Boolean(savedState.extracted[def.id]),
        guardsRemaining: rt ? rt.guardIds.size : 0,
      };
      cavesSnap[def.id] = entry;
      cavesSnap[def.map] = entry;
    }
    state.termaCaves = {
      compassUnlocked: savedState.compassUnlocked,
      shogserDeciphered: savedState.shogserDeciphered,
      scrolls: [...savedState.scrolls],
      mendrup: [...savedState.mendrup],
      caves: cavesSnap,
    };
  }

  /**
   * Builds a 3D Cave Grotto & Terma Reliquary Altar for a chapter map (0 PointLights).
   */
  function buildCaveMesh(def) {
    const root = new THREE.Group();
    root.name = `TermaCave_${def.id}`;
    root.rotation.y = def.rotY || 0;

    const rockMat = new THREE.MeshStandardMaterial({
      color: def.rockColor || 0x4b5563,
      roughness: 0.88,
      metalness: 0.1,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: def.accentColor || 0xf59e0b,
      roughness: 0.25,
      metalness: 0.55,
      emissive: def.accentColor || 0xf59e0b,
      emissiveIntensity: 0.85,
      toneMapped: false,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.28,
      metalness: 0.78,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
    });

    // 1. Dark stone cave floor slab & inner dark rock vault dome (zero sky leaks inside)
    const innerVaultMat = new THREE.MeshStandardMaterial({
      color: 0x161922,
      roughness: 0.94,
      metalness: 0.06,
      emissive: 0x0b0e14,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    });
    const caveFloor = new THREE.Mesh(
      new THREE.CircleGeometry(5.8, 24).rotateX(-Math.PI / 2),
      innerVaultMat,
    );
    caveFloor.position.set(0, 0.02, -1.2);
    caveFloor.receiveShadow = true;
    root.add(caveFloor);

    const innerDome = new THREE.Mesh(
      new THREE.SphereGeometry(5.6, 20, 14, Math.PI * 0.92, Math.PI * 1.16, 0, Math.PI * 0.62),
      innerVaultMat,
    );
    innerDome.position.set(0, 0.15, -1.2);
    innerDome.scale.set(1.12, 0.96, 1.14);
    root.add(innerDome);

    const ceilingCap = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 6.2, 1.4, 16),
      innerVaultMat,
    );
    ceilingCap.position.set(0, 5.4, -1.3);
    root.add(ceilingCap);

    // 2. Continuous horseshoe cliff walls & multi-layered vaulted cave roof
    for (let i = 0; i < 7; i++) {
      const ang = -0.05 * Math.PI + (i / 6) * 1.1 * Math.PI;
      const r = 6.1;
      const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(2.7, 1), rockMat);
      crag.position.set(Math.cos(ang) * r, 2.7 + (i % 2) * 0.35, -1.1 - Math.sin(ang) * r);
      crag.scale.set(1.22, 1.42, 1.15);
      crag.rotation.set(i * 0.3, ang, 0);
      crag.castShadow = true;
      crag.receiveShadow = true;
      root.add(crag);
    }

    const leftWall = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 1), rockMat);
    leftWall.position.set(-4.6, 2.5, 1.2);
    leftWall.scale.set(0.95, 1.35, 1.15);

    const rightWall = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 1), rockMat);
    rightWall.position.set(4.6, 2.5, 1.2);
    rightWall.scale.set(0.95, 1.35, 1.15);

    const roofArch = new THREE.Mesh(new THREE.DodecahedronGeometry(5.6, 1), rockMat);
    roofArch.position.set(0, 6.1, -1.6);
    roofArch.scale.set(1.42, 0.46, 1.32);

    const upperPeak = new THREE.Mesh(new THREE.DodecahedronGeometry(4.8, 1), rockMat);
    upperPeak.position.set(0, 8.8, -3.4);
    upperPeak.scale.set(1.32, 0.88, 1.12);

    root.add(leftWall, rightWall, roofArch, upperPeak);

    // 3. Hanging rock & glowing crystal stalactites from the cave ceiling
    const stalGeo = new THREE.ConeGeometry(0.26, 1.35, 6);
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 1.4 - Math.PI * 0.2;
      const sr = i % 2 === 0 ? 4.2 : 2.5;
      const stal = new THREE.Mesh(stalGeo, i % 3 === 0 ? accentMat : rockMat);
      stal.position.set(Math.cos(ang) * sr, 4.75, -1.2 - Math.abs(Math.sin(ang)) * sr);
      stal.rotation.x = Math.PI;
      stal.scale.setScalar(0.75 + (i % 3) * 0.22);
      root.add(stal);
    }

    // 4. Interior floor light pool & slanted entrance light shaft (0 PointLights)
    const caveGlowPool = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: def.accentColor || 0xf59e0b,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    caveGlowPool.position.set(0, 0.035, -1.2);
    root.add(caveGlowPool);

    const entranceShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 2.1, 5.4, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe4a0,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    entranceShaft.position.set(0, 2.5, 0.6);
    entranceShaft.rotation.x = -0.32;
    root.add(entranceShaft);

    // Decorative crystal/ice/obsidian spires flanking cave entrance
    for (const side of [-1, 1]) {
      const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), accentMat);
      spire.scale.set(0.85, 2.3, 0.85);
      spire.position.set(side * 2.6, 1.15, 0.6);
      spire.rotation.z = side * -0.18;
      root.add(spire);
    }

    // Central Terma Reliquary Pedestal & Casket (`伏藏寶龕`)
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.55, 12), rockMat);
    pedestal.position.set(0, 0.275, -1.2);
    root.add(pedestal);

    const casketBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.56, 0.82), goldMat);
    casketBase.position.set(0, 0.82, -1.2);
    root.add(casketBase);

    const casketLid = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.22, 0.88), accentMat);
    casketLid.position.set(0, 1.18, -1.2);
    root.add(casketLid);

    // Floating Terma Relic Core inside casket (visible when unsealed/extracted)
    const relicCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    relicCore.position.set(0, 1.65, -1.2);
    root.add(relicCore);

    // Tibetan Seed Syllable Seal Plaque above casket
    if (!sealTex) sealTex = makeTermaSealTexture();
    const sealMat = new THREE.MeshBasicMaterial({
      map: sealTex || null,
      color: 0xfde047,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const sealPlaque = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), sealMat);
    sealPlaque.position.set(0, 2.35, -1.1);
    root.add(sealPlaque);

    // Ground Mandala Seal Ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const groundRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.25, 36), ringMat);
    groundRing.rotation.x = -Math.PI * 0.5;
    groundRing.position.set(0, 0.06, -1.2);
    root.add(groundRing);

    // Rainbow Extraction Beam Pillar (AdditiveBlending, 0 PointLights)
    const beamGeo = new THREE.CylinderGeometry(0.45, 0.85, 7.5, 20, 1, true);
    beamGeo.translate(0, 3.75, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 0.2, -1.2);
    beamMesh.visible = false;
    root.add(beamMesh);

    return {
      root,
      casketLid,
      relicCore,
      sealPlaque,
      sealMat,
      groundRing,
      ringMat,
      beamMesh,
      beamMat,
    };
  }

  function updateCaveVisuals(rt) {
    if (!rt || !rt.meshes) return;
    const { casketLid, relicCore, sealMat, ringMat, beamMesh, beamMat } = rt.meshes;

    if (rt.status === 'GUARDED') {
      // Locked by obstacles: crimson/amber ward
      sealMat.color.setHex(0xf87171);
      ringMat.color.setHex(0xef4444);
      relicCore.visible = false;
      beamMesh.visible = false;
      casketLid.rotation.x = 0;
      casketLid.position.set(0, 1.18, -1.2);
    } else if (rt.status === 'UNSEALED') {
      // Guardians cleared! Ready for player interaction to extract Terma
      sealMat.color.setHex(0x5eead4);
      ringMat.color.setHex(0xfde047);
      relicCore.visible = true;
      beamMesh.visible = true;
      beamMat.color.setHex(0x2dd4bf);
      beamMat.opacity = 0.48;
      casketLid.rotation.x = -0.35;
      casketLid.position.set(0, 1.24, -1.35);
    } else if (rt.status === 'EXTRACTED') {
      // Opened casket
      sealMat.color.setHex(0xfde68a);
      ringMat.color.setHex(0x38bdf8);
      relicCore.visible = false;
      beamMesh.visible = rt.burstTimer > 0;
      casketLid.rotation.x = -1.05;
      casketLid.position.set(0, 1.32, -1.55);
    } else {
      // DORMANT (awaiting approach/inspection)
      sealMat.color.setHex(0xfbbf24);
      ringMat.color.setHex(0xf59e0b);
      relicCore.visible = !savedState.extracted[rt.def.id];
      beamMesh.visible = !savedState.extracted[rt.def.id];
      beamMat.color.setHex(0xfbbf24);
      beamMat.opacity = 0.22;
      casketLid.rotation.x = 0;
      casketLid.position.set(0, 1.18, -1.2);
    }
  }

  function ensureCaveMesh(rt) {
    if (!rt) return null;
    if (!rt.meshes) {
      rt.meshes = buildCaveMesh(rt.def);
      updateCaveVisuals(rt);
    }
    const parentGroup = ctx.zoneGroups?.[rt.def.map] || scene;
    if (parentGroup && rt.meshes.root.parent !== parentGroup) {
      parentGroup.add(rt.meshes.root);
    }
    rt.meshes.root.visible = (state.zone || 'stupa') === rt.def.map;
    return rt.meshes;
  }

  function refreshCaveElevation(rt) {
    if (!rt) return;
    const y = ctx.world?.getHeight?.(rt.def.x, rt.def.z, rt.def.map) ?? 0;
    rt.y = y;
    if (rt.meshes?.root) {
      rt.meshes.root.position.set(rt.def.x, y, rt.def.z);
    }
    rt.posVec.set(rt.def.x, y, rt.def.z);
  }

  /**
   * Awakens the Cave Guardians for a Terma Cave (`DORMANT` / `EXTRACTED` -> `GUARDED`).
   */
  function awakenCaveGuardians(idOrMap) {
    const rt = findCaveRuntime(idOrMap);
    if (!rt) return false;
    if (rt.status === 'GUARDED' && rt.guardIds.size > 0) return true;

    rt.guardIds.clear();
    const def = rt.def;

    if (ctx.enemies?.spawn) {
      for (let i = 0; i < def.guards.length; i++) {
        const g = def.guards[i];
        const gx = def.x + (g.ox || 0);
        const gz = def.z + (g.oz || 2.5);
        const spawnedId = ctx.enemies.spawn(g.kind, {
          x: gx,
          z: gz,
          level: def.level,
          rank: g.rank || 'normal',
          affixes: g.affixes || [],
          tags: [`termaCave:${def.id}`, 'termaCaveGuard'],
        });
        if (spawnedId) {
          rt.guardIds.add(spawnedId);
        }
      }
    }

    if (rt.guardIds.size === 0) {
      // Fallback if enemy spawner is unavailable in a stub environment
      unsealCave(rt);
      return true;
    }

    rt.status = 'GUARDED';
    updateCaveVisuals(rt);
    syncState();

    const caveName = i18n.t(def.nameKey);
    bus?.emit('sfx', { name: 'boulder' });
    bus?.emit('toast', {
      text: i18n.t('toast.termaCave.ambush', { name: caveName, count: rt.guardIds.size }),
      kind: 'warning',
    });
    bus?.emit('termaCave:awakened', {
      id: def.id,
      map: def.map,
      guards: rt.guardIds.size,
    });
    return true;
  }

  function unsealCave(rt) {
    if (!rt || rt.status === 'UNSEALED') return;
    rt.guardIds.clear();
    rt.status = 'UNSEALED';
    updateCaveVisuals(rt);
    syncState();

    const caveName = i18n.t(rt.def.nameKey);
    bus?.emit('sfx', { name: 'bell' });
    bus?.emit('toast', {
      text: i18n.t('toast.termaCave.unsealed', { name: caveName }),
      kind: 'merit',
    });
    bus?.emit('termaCave:unsealed', { id: rt.def.id, map: rt.def.map });
  }

  /**
   * Interactive extraction when the player presses `E` at an unsealed Terma Cave Reliquary.
   */
  function extractCaveTerma(idOrMap) {
    const rt = findCaveRuntime(idOrMap);
    if (!rt) return null;

    if (rt.status === 'GUARDED' && rt.guardIds.size > 0) {
      bus?.emit('toast', {
        text: i18n.t('toast.termaCave.stillGuarded', { remaining: rt.guardIds.size }),
        kind: 'warning',
      });
      return null;
    }

    const def = rt.def;
    const rw = def.rewards;
    const isFirstTime = !savedState.extracted[def.id];

    rt.status = 'EXTRACTED';
    rt.burstTimer = 2.6;
    ensureCaveMesh(rt);
    if (rt.meshes) {
      rt.meshes.beamMesh.visible = true;
      rt.meshes.beamMat.color.setHex(0xfde047);
      rt.meshes.beamMat.opacity = 0.92;
    }
    updateCaveVisuals(rt);

    const dropPos = {
      x: def.x,
      y: rt.y,
      z: def.z + 1.6,
    };

    const droppedItems = [];

    if (isFirstTime) {
      savedState.extracted[def.id] = true;
      ctx.quests?.setFlag?.(`terma.cave.${def.id}.extracted`, true);

      // 1. Guaranteed Terma Legendary Equipment
      const legItem = ctx.loot?.drop
        ? ctx.loot.drop({
            legendaryId: rw.legendaryId,
            rarity: 'terma',
            ilvl: rw.ilvl,
            pos: dropPos,
          })
        : ctx.loot?.generate?.({
            legendaryId: rw.legendaryId,
            rarity: 'terma',
            ilvl: rw.ilvl,
          });
      if (legItem) droppedItems.push(legItem);

      // 2. Shogser Yellow Parchment Scroll
      if (rw.scrollId && !savedState.scrolls.includes(rw.scrollId)) {
        savedState.scrolls.push(rw.scrollId);
      }

      // 3. Terma Mendrup Permanent Stat Blessing
      if (rw.mendrupId && !savedState.mendrup.includes(rw.mendrupId)) {
        savedState.mendrup.push(rw.mendrupId);
        if (rw.permanent && ctx.vitals?.addPermanent) {
          ctx.vitals.addPermanent(rw.permanent);
        }
        if (rw.skillPoints && ctx.skills?.addPoints) {
          ctx.skills.addPoints(rw.skillPoints);
        }
        bus?.emit('vitals:restore', { hp: 9999, mp: 9999, source: 'termaMendrup' });
      }

      // 4. Tertön's Compass unlock
      if (rw.unlockCompass && !savedState.compassUnlocked) {
        savedState.compassUnlocked = true;
        bus?.emit('toast', {
          text: `${i18n.t('termaRelic.compass.name')}：${i18n.t('termaRelic.compass.desc')}`,
          kind: 'merit',
        });
      }

      // 5. Codex, Terma Essence & Turquoise
      if (Array.isArray(rw.codex)) {
        for (const cId of rw.codex) {
          ctx.codex?.unlock?.(cId);
        }
      }
      ctx.inventory?.addMaterial?.('termaEssence', rw.essence || 1);
      ctx.loot?.addTurquoise?.(rw.turquoise || 50);

      persist();

      const caveName = i18n.t(def.nameKey);
      const legName = i18n.t(`legendary.${rw.legendaryId}.name`);
      const scrollName = i18n.t(rw.scrollKey);
      const mendrupName = i18n.t(rw.mendrupKey);
      const relicsList = `${legName}、${scrollName}、${mendrupName}`;

      bus?.emit('sfx', { name: 'levelup' });
      bus?.emit('toast', {
        text: i18n.t('toast.termaCave.extracted', { name: caveName, relics: relicsList }),
        kind: 'merit',
      });
      bus?.emit('quest:interact', { target: `termaCave.${def.id}`, count: 1 });
      bus?.emit('termaCave:extracted', {
        id: def.id,
        map: def.map,
        firstTime: true,
        items: droppedItems,
        scrolls: [...savedState.scrolls],
      });
    } else {
      // Repeat extraction reward
      const rRarity = Math.random() < 0.35 ? 'terma' : 'rare';
      const rItem = ctx.loot?.drop?.({
        rarity: rRarity,
        ilvl: Math.max(rw.ilvl, state.player?.level || rw.ilvl),
        pos: dropPos,
      });
      if (rItem) droppedItems.push(rItem);

      const essence = rw.essence || 1;
      const turq = Math.round((rw.turquoise || 50) * 0.6);
      ctx.inventory?.addMaterial?.('termaEssence', essence);
      ctx.loot?.addTurquoise?.(turq);
      persist();

      bus?.emit('sfx', { name: 'pickup' });
      bus?.emit('toast', {
        text: i18n.t('toast.termaCave.repeatExtracted', {
          name: i18n.t(def.nameKey),
          essence,
          turquoise: turq,
        }),
        kind: 'merit',
      });
      bus?.emit('termaCave:extracted', {
        id: def.id,
        map: def.map,
        firstTime: false,
        items: droppedItems,
      });
    }

    return {
      caveId: def.id,
      firstTime: isFirstTime,
      items: droppedItems,
      scrollsCount: savedState.scrolls.length,
    };
  }

  function findCaveRuntime(idOrMap) {
    if (!idOrMap) return caveRuntime.get(state.zone);
    if (caveRuntime.has(idOrMap)) return caveRuntime.get(idOrMap);
    for (const rt of caveRuntime.values()) {
      if (rt.def.map === idOrMap) return rt;
    }
    return null;
  }

  // Initialize all 5 Chapter Terma Caves (meshes constructed lazily when zone loads/enters)
  for (const def of TERMA_CAVE_DEFS) {
    const posVec = new THREE.Vector3(def.x, 0, def.z);
    const rt = {
      def,
      y: 0,
      posVec,
      status: savedState.extracted[def.id] ? 'EXTRACTED' : 'DORMANT',
      guardIds: new Set(),
      burstTimer: 0,
      meshes: null,
    };
    caveRuntime.set(def.id, rt);
    if ((state.zone || 'stupa') === def.map) {
      ensureCaveMesh(rt);
    }
    refreshCaveElevation(rt);

    if (Array.isArray(ctx.interactables)) {
      ctx.interactables.push({
        id: `terma-cave-${def.id}`,
        kind: 'termaCave',
        zone: def.map,
        action: 'interact',
        labelKey: 'prompt.termaCave.extract',
        getLabel() {
          const caveName = i18n.t(def.nameKey);
          if (rt.status === 'GUARDED') {
            return i18n.t('prompt.termaCave.sealed', {
              name: caveName,
              remaining: rt.guardIds.size,
            });
          }
          if (rt.status === 'UNSEALED') {
            return i18n.t('prompt.termaCave.extract', { name: caveName });
          }
          if (rt.status === 'EXTRACTED') {
            return i18n.t('prompt.termaCave.rechallenge', { name: caveName });
          }
          return i18n.t('prompt.termaCave.awaken', { name: caveName });
        },
        radius: 3.8,
        getPosition() {
          refreshCaveElevation(rt);
          return rt.posVec;
        },
        isAvailable() {
          return (state.zone || 'stupa') === def.map && !state.uiOpen;
        },
        onInteract() {
          if (rt.status === 'DORMANT' || rt.status === 'EXTRACTED') {
            awakenCaveGuardians(def.id);
            return true;
          }
          if (rt.status === 'GUARDED') {
            bus?.emit('toast', {
              text: i18n.t('toast.termaCave.stillGuarded', { remaining: rt.guardIds.size }),
              kind: 'warning',
            });
            return false;
          }
          if (rt.status === 'UNSEALED') {
            extractCaveTerma(def.id);
            return true;
          }
          return false;
        },
      });
    }
  }

  // Register Yeshe Tsogyal's Shogser Scroll Table in Chimphu (`(6001.8, -15.2)`)
  const scrollTablePos = new THREE.Vector3(6001.8, 0, -15.2);
  function decipherShogserScrolls() {
    if (savedState.shogserDeciphered) {
      bus?.emit('toast', { text: i18n.t('toast.shogserTable.alreadyDone'), kind: 'info' });
      return false;
    }
    if (savedState.scrolls.length < 5) {
      bus?.emit('toast', {
        text: i18n.t('toast.shogserTable.incomplete', { count: savedState.scrolls.length }),
        kind: 'info',
      });
      return false;
    }

    savedState.shogserDeciphered = true;
    ctx.vitals?.addPermanent?.({ maxHp: 60, atk: 8, def: 8 });
    ctx.skills?.addPoints?.(2);
    ctx.inventory?.addMaterial?.('termaEssence', 3);
    ctx.loot?.addTurquoise?.(200);
    ctx.quests?.setFlag?.('terma.shogser.deciphered', true);
    persist();

    bus?.emit('sfx', { name: 'levelup' });
    bus?.emit('toast', {
      text: i18n.t('toast.shogserTable.deciphered'),
      kind: 'merit',
    });
    bus?.emit('termaCave:shogserDeciphered', { scrolls: [...savedState.scrolls] });
    return true;
  }

  if (Array.isArray(ctx.interactables)) {
    ctx.interactables.push({
      id: 'chimphu-shogser-table',
      kind: 'shogserTable',
      zone: 'chimphu',
      action: 'interact',
      labelKey: 'prompt.shogserTable.progress',
      getLabel() {
        if (savedState.shogserDeciphered) {
          return i18n.t('prompt.shogserTable.done');
        }
        if (savedState.scrolls.length >= 5) {
          return i18n.t('prompt.shogserTable.decipher');
        }
        return i18n.t('prompt.shogserTable.progress', { count: savedState.scrolls.length });
      },
      radius: 3.2,
      getPosition() {
        const y = ctx.world?.getHeight?.(6001.8, -15.2, 'chimphu') ?? 0;
        scrollTablePos.set(6001.8, y, -15.2);
        return scrollTablePos;
      },
      isAvailable() {
        return (state.zone || 'stupa') === 'chimphu' && !state.uiOpen;
      },
      onInteract() {
        return decipherShogserScrolls();
      },
    });
  }

  // Listen to enemy liberations to decrement Cave Guardian counters
  bus?.on('enemy:liberated', (payload) => {
    const id = payload?.id;
    const tags = Array.isArray(payload?.tags) ? payload.tags : [];
    for (const rt of caveRuntime.values()) {
      if (rt.status !== 'GUARDED') continue;
      const hadId = id && rt.guardIds.has(id);
      const hadTag = tags.includes(`termaCave:${rt.def.id}`);
      if (hadId || hadTag) {
        if (id) rt.guardIds.delete(id);
        if (rt.guardIds.size === 0) {
          unsealCave(rt);
        } else {
          syncState();
        }
      }
    }
  });

  bus?.on('map:loaded', ({ mapId } = {}) => {
    for (const rt of caveRuntime.values()) {
      if (!mapId || rt.def.map === mapId) {
        if (mapId === rt.def.map) ensureCaveMesh(rt);
        refreshCaveElevation(rt);
      }
    }
  });

  bus?.on('zone:change', ({ to } = {}) => {
    for (const rt of caveRuntime.values()) {
      if (rt.def.map === to) {
        ensureCaveMesh(rt);
        refreshCaveElevation(rt);
      } else {
        if (rt.meshes?.root) rt.meshes.root.visible = false;
        if (rt.status === 'GUARDED') {
          // Reset mid-fight guard state if player leaves the map before finishing
          rt.guardIds.clear();
          rt.status = savedState.extracted[rt.def.id] ? 'EXTRACTED' : 'DORMANT';
          updateCaveVisuals(rt);
        }
      }
    }
    syncState();
  });

  bus?.on('merit:reset', () => {
    savedState = {
      extracted: {},
      scrolls: [],
      mendrup: [],
      compassUnlocked: false,
      shogserDeciphered: false,
    };
    for (const rt of caveRuntime.values()) {
      rt.guardIds.clear();
      rt.status = 'DORMANT';
      updateCaveVisuals(rt);
    }
    persist();
  });

  loadFromSave();
  for (const rt of caveRuntime.values()) {
    rt.status = savedState.extracted[rt.def.id] ? 'EXTRACTED' : 'DORMANT';
    updateCaveVisuals(rt);
  }

  function update(dt) {
    const elapsed = state.elapsed || 0;
    const curZone = state.zone || 'stupa';
    const rt = findCaveRuntime(curZone);
    if (!rt) return;

    ensureCaveMesh(rt);
    refreshCaveElevation(rt);

    // Animate seal ring, floating relic core, and extraction rainbow beam
    const { relicCore, groundRing, sealPlaque, beamMat, beamMesh } = rt.meshes;
    groundRing.rotation.z = elapsed * 0.65;
    if (relicCore.visible) {
      relicCore.rotation.y = elapsed * 1.9;
      relicCore.position.y = 1.62 + Math.sin(elapsed * 3.0) * 0.1;
    }
    sealPlaque.position.y = 2.35 + Math.sin(elapsed * 2.2) * 0.06;

    if (rt.burstTimer > 0) {
      rt.burstTimer = Math.max(0, rt.burstTimer - dt);
      beamMesh.visible = true;
      beamMat.opacity = Math.min(0.95, rt.burstTimer * 0.45);
      if (rt.burstTimer <= 0 && rt.status === 'EXTRACTED') {
        beamMesh.visible = false;
      }
    }

    // Proximity ambush trigger for unextracted DORMANT caves in combat zones
    if (
      rt.status === 'DORMANT' &&
      !savedState.extracted[rt.def.id] &&
      rt.def.map !== 'chimphu' &&
      state.mode === 'play' &&
      !state.uiOpen &&
      state.player?.position
    ) {
      const dist = Math.hypot(
        state.player.position.x - rt.def.x,
        state.player.position.z - rt.def.z
      );
      if (dist <= (rt.def.triggerRadius || 10.5)) {
        awakenCaveGuardians(rt.def.id);
      }
    }

    // Reconcile active enemies in case any guard was removed/cleared externally
    if (rt.status === 'GUARDED' && rt.guardIds.size > 0 && ctx.enemies?.getActiveEnemies) {
      const activeList = ctx.enemies.getActiveEnemies() || [];
      const aliveIds = new Set(
        activeList
          .filter((e) => e && e.hp > 0 && e.state !== 'liberated')
          .map((e) => e.id)
      );
      for (const gid of Array.from(rt.guardIds)) {
        if (!aliveIds.has(gid)) {
          rt.guardIds.delete(gid);
        }
      }
      if (rt.guardIds.size === 0) {
        unsealCave(rt);
      }
    }
  }

  function isCombatActiveInZone(mapId = state.zone) {
    const rt = findCaveRuntime(mapId);
    return Boolean(rt && rt.status === 'GUARDED' && rt.guardIds.size > 0);
  }

  function clearGuards(idOrMap) {
    const rt = findCaveRuntime(idOrMap);
    if (!rt) return false;
    if (ctx.enemies?.getActiveEnemies && ctx.enemies?.damage) {
      const list = [...(ctx.enemies.getActiveEnemies() || [])];
      for (const e of list) {
        if (rt.guardIds.has(e.id) || e.tags?.includes?.(`termaCave:${rt.def.id}`)) {
          ctx.enemies.damage(e.id, 999999, { source: 'debug' });
        }
      }
    }
    unsealCave(rt);
    return true;
  }

  const api = {
    update,
    definitions: TERMA_CAVE_DEFS,
    getState: () => state.termaCaves,
    list: () => TERMA_CAVE_DEFS.map((d) => state.termaCaves?.caves?.[d.id]),
    isCombatActiveInZone,
    hasCompass: () => Boolean(savedState.compassUnlocked),
    unlockCompass: () => {
      savedState.compassUnlocked = true;
      persist();
      return true;
    },
    triggerCave: (idOrMap) => awakenCaveGuardians(idOrMap),
    clearGuards,
    extractCave: (idOrMap) => {
      const rt = findCaveRuntime(idOrMap);
      if (!rt) return null;
      if (rt.status !== 'UNSEALED') unsealCave(rt);
      return extractCaveTerma(rt.def.id);
    },
    collectAllScrolls: () => {
      savedState.scrolls = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
      persist();
      return [...savedState.scrolls];
    },
    decipherScrolls: () => decipherShogserScrolls(),
  };

  ctx.termaCaves = api;
  ctx.debug?.register?.('termaCaves', api);

  return api;
}

export default createTermaCaves;
