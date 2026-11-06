// ============================================================================
// Boss: Storm of the Twelve Tenma (十二丹瑪之風暴) — Chapter 2 Mangyul Pass
// Auto-discovered by src/gameplay/bosses/index.js via import.meta.glob('./*.js')
// Concept: Not a single goddess, but the blizzard storm manifested by all
// Twelve Tenma together — a swirling vortex with 12 orbiting light orbs.
// Upon subjugation, the blizzard clears and 12 translucent female silhouettes
// appear in a circle around the arena, bowing in sequence to swear their oath.
// Performance constraint: ZERO PointLights (emissive / MeshBasicMaterial only).
// ============================================================================

import * as THREE from 'three';

const ARENA_X = 3000;
const ARENA_Z = -65;
const ARENA_R = 18;

// 12 orb colors (icy cyan, snow white, violet lightning, pale gold, glacial blue)
const ORB_COLORS = [
  0x7dd3fc, 0xe0f2fe, 0xc084fc, 0x38bdf8,
  0x93c5fd, 0xfef08a, 0x67e8f9, 0xa5b4fc,
  0xbae6fd, 0xd8b4fe, 0x7dd3fc, 0xf0f9ff,
];

// 4 corner weather orbs in Phase 2 (relative to arena center)
const CORNER_WEATHER_DEFS = [
  { orbIdx: 0, type: 'hail', dx: -9.5, dz: -9.5, color: 0x38bdf8 },
  { orbIdx: 3, type: 'avalanche', dx: 9.5, dz: -9.5, color: 0xe0f2fe },
  { orbIdx: 6, type: 'fog', dx: -9.5, dz: 9.5, color: 0x94a3b8 },
  { orbIdx: 9, type: 'lightning', dx: 9.5, dz: 9.5, color: 0xc084fc },
];

function buildTenmaStormModel() {
  const group = new THREE.Group();
  group.name = 'Boss_TenmaStorm';
  const materials = [];
  const geometries = [];
  const trackGeo = (g) => {
    geometries.push(g);
    return g;
  };
  const trackMat = (m) => {
    materials.push(m);
    return m;
  };

  // ── 1. Swirling Blizzard Vortex Core (visible during combat) ──
  const vortexGroup = new THREE.Group();
  group.add(vortexGroup);

  const funnelOuterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      flatShading: true,
    })
  );
  const funnelInnerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.3,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      flatShading: true,
    })
  );

  // Inverted tornado funnel cones + swirling ice rings
  const lowerFunnel = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(1.65, 3.6, 10, 1, true)),
    funnelOuterMat
  );
  lowerFunnel.rotation.x = Math.PI;
  lowerFunnel.position.y = 1.85;
  vortexGroup.add(lowerFunnel);

  const upperFunnel = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.6, 2.8, 12, 1, true)),
    funnelOuterMat
  );
  upperFunnel.rotation.x = Math.PI;
  upperFunnel.position.y = 3.4;
  vortexGroup.add(upperFunnel);

  const coreCrystal = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.85, 1)),
    funnelInnerMat
  );
  coreCrystal.scale.set(0.85, 1.65, 0.85);
  coreCrystal.position.y = 2.2;
  vortexGroup.add(coreCrystal);

  // 3 concentric spinning blizzard torus rings
  const vortexRings = [];
  const ringRadii = [1.35, 2.05, 2.65];
  const ringHeights = [1.1, 2.25, 3.45];
  for (let i = 0; i < 3; i++) {
    const rGeo = trackGeo(new THREE.TorusGeometry(ringRadii[i], 0.08, 6, 24));
    rGeo.rotateX(Math.PI / 2);
    const rMesh = new THREE.Mesh(rGeo, funnelInnerMat);
    rMesh.position.y = ringHeights[i];
    vortexGroup.add(rMesh);
    vortexRings.push(rMesh);
  }

  // ── 2. 12 Glowing Light Orbs (orbit core; 4 detach to corners in Phase 2) ──
  const orbGroup = new THREE.Group();
  group.add(orbGroup);

  const orbCoreGeo = trackGeo(new THREE.SphereGeometry(0.26, 10, 8));
  const orbHaloGeo = trackGeo(new THREE.OctahedronGeometry(0.42, 0));
  const cornerRingGeo = trackGeo(new THREE.RingGeometry(2.2, 2.5, 24));
  cornerRingGeo.rotateX(-Math.PI / 2);

  const orbs = [];
  for (let i = 0; i < 12; i++) {
    const hex = ORB_COLORS[i % ORB_COLORS.length];
    const oGrp = new THREE.Group();
    const coreMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: hex,
      })
    );
    const haloMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.48,
        flatShading: true,
      })
    );
    const ringMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    const cMesh = new THREE.Mesh(orbCoreGeo, coreMat);
    const hMesh = new THREE.Mesh(orbHaloGeo, haloMat);
    const groundRing = new THREE.Mesh(cornerRingGeo, ringMat);
    groundRing.position.y = -1.2;
    groundRing.visible = false;

    oGrp.add(cMesh, hMesh, groundRing);
    orbGroup.add(oGrp);

    orbs.push({
      index: i,
      group: oGrp,
      coreMesh: cMesh,
      haloMesh: hMesh,
      groundRing,
      detached: false,
      weatherType: null,
      cornerDx: 0,
      cornerDz: 0,
      curLx: 0,
      curLy: 2.0,
      curLz: 0,
      hazardTimer: 0.6,
    });
  }

  // ── 3. 12 Translucent Female Silhouettes (revealed upon subjugation) ──
  const silhouettesGroup = new THREE.Group();
  silhouettesGroup.visible = false;
  group.add(silhouettesGroup);

  const silhouetteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xbbe8ff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.2,
      transparent: true,
      opacity: 0.82,
      flatShading: true,
    })
  );
  const crownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      flatShading: true,
    })
  );

  const robeGeo = trackGeo(new THREE.ConeGeometry(0.36, 1.35, 7));
  const torsoGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.22, 0.55, 7));
  const headGeo = trackGeo(new THREE.SphereGeometry(0.16, 8, 8));
  const crownGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.24, 5));
  const scarfGeo = trackGeo(new THREE.TorusGeometry(0.32, 0.035, 5, 12, Math.PI * 1.2));

  const silhouettes = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const rad = 5.2;
    const sHolder = new THREE.Group();
    sHolder.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
    // Face inward toward the center/player
    sHolder.rotation.y = Math.atan2(-Math.cos(angle), -Math.sin(angle));

    const upperBody = new THREE.Group();
    upperBody.position.y = 0.95;

    const robe = new THREE.Mesh(robeGeo, silhouetteMat);
    robe.position.y = 0.68;
    sHolder.add(robe);

    const torso = new THREE.Mesh(torsoGeo, silhouetteMat);
    torso.position.y = 0.25;
    const head = new THREE.Mesh(headGeo, silhouetteMat);
    head.position.y = 0.68;
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.9;
    const scarf = new THREE.Mesh(scarfGeo, silhouetteMat);
    scarf.position.set(0, 0.38, -0.08);
    scarf.rotation.z = -0.25;

    upperBody.add(torso, head, crown, scarf);
    sHolder.add(upperBody);
    silhouettesGroup.add(sHolder);

    silhouettes.push({
      index: i,
      holder: sHolder,
      upperBody,
      bowProgress: 0,
    });
  }

  return {
    group,
    materials,
    geometries,
    vortexGroup,
    lowerFunnel,
    upperFunnel,
    coreCrystal,
    vortexRings,
    orbs,
    silhouettesGroup,
    silhouettes,
  };
}

export const TENMA_STORM_BOSS = {
  id: 'tenmaStorm',
  nameKey: 'boss.tenmaStorm.name',
  titleKey: 'boss.tenmaStorm.title',
  level: 16,
  hp: 3600,
  def: 24,
  speed: 2.2,
  radius: 1.55,
  arena: {
    map: 'mangyul',
    x: ARENA_X,
    z: ARENA_Z,
    r: ARENA_R,
  },
  oath: {
    dialogue: 'boss.tenmaStorm.oath',
    protector: 'tenma',
    flag: 'boss.tenmaStorm',
    flags: ['boss.tenmaStorm', 'protector.tenma'],
  },
  phases: [
    // ── Phase 1 (100%–60%): Ice Ring Wave (with gap) + Ice Shard Barrage ──
    {
      threshold: 1.0,
      moveSpeed: 2.2,
      preferCenter: false,
      patterns: [
        {
          type: 'ringWave',
          cooldown: 4.2,
          windup: 0.95,
          maxRadius: 15.0,
          expandSpeed: 9.0,
          ringThickness: 1.35,
          gapAngleRad: 0.95,
          damage: 20,
          color: 0x38bdf8,
        },
        {
          type: 'projectileVolley',
          cooldown: 2.9,
          windup: 0.65,
          count: 7,
          spreadRad: 1.25,
          speed: 10.5,
          damage: 14,
          kind: 'redArrow',
          color: 0x7dd3fc,
        },
        {
          type: 'targetedAoe',
          cooldown: 3.8,
          windup: 0.85,
          count: 3,
          radius: 2.2,
          spread: 3.2,
          damage: 16,
          slow: 1.5,
          color: 0x67e8f9,
        },
      ],
    },

    // ── Phase 2 (60%–25%): 4 Light Orbs detach to arena corners casting mini weather trials ──
    {
      threshold: 0.6,
      moveSpeed: 1.7,
      preferCenter: true,
      patterns: [
        {
          type: 'ringWave',
          cooldown: 4.8,
          windup: 0.95,
          maxRadius: 15.5,
          expandSpeed: 9.5,
          ringThickness: 1.35,
          gapAngleRad: 0.9,
          damage: 22,
          color: 0x38bdf8,
        },
        {
          type: 'projectileVolley',
          cooldown: 3.2,
          windup: 0.65,
          count: 9,
          spreadRad: 1.45,
          speed: 11.0,
          damage: 15,
          kind: 'redArrow',
          color: 0x7dd3fc,
        },
      ],
    },

    // ── Phase 3 (25%–0%): Whiteout weatherZone + Periodic Avalanche Line Charges ──
    {
      threshold: 0.25,
      moveSpeed: 2.6,
      preferCenter: false,
      patterns: [
        {
          type: 'weatherZone',
          cooldown: 11.0,
          windup: 1.0,
          radius: 17.5,
          duration: 8.0,
          tickInterval: 0.85,
          damage: 8,
          slow: 1.2,
          safeZoneCount: 3,
          safeZoneRadius: 2.8,
          color: 0x38bdf8,
          safeColor: 0x34d399,
        },
        {
          type: 'lineCharge',
          cooldown: 3.8,
          windup: 0.9,
          length: 16.0,
          width: 2.8,
          dashDuration: 0.48,
          damage: 26,
          color: 0xe0f2fe,
        },
        {
          type: 'ringWave',
          cooldown: 4.6,
          windup: 0.9,
          maxRadius: 16.0,
          expandSpeed: 10.0,
          ringThickness: 1.4,
          gapAngleRad: 0.88,
          damage: 22,
          color: 0x7dd3fc,
        },
      ],
    },
  ],

  buildModel() {
    return buildTenmaStormModel();
  },

  onStart(boss, ctx, patternRunner, built) {
    return this.onSpawn(boss, ctx, patternRunner, built);
  },

  onSpawn(boss, _ctx, _patternRunner, built) {
    boss.phase2ToastShown = false;
    boss.subdueElapsed = 0;
    if (built) {
      built.vortexGroup.visible = true;
      built.silhouettesGroup.visible = false;
      for (const orb of built.orbs) {
        orb.detached = false;
        orb.weatherType = null;
        orb.groundRing.visible = false;
      }
    }
  },

  onPhaseEnter(phaseNum, boss, ctx, _phaseDef, _patternRunner, built) {
    if (!built) return;
    const { i18n, bus } = ctx;

    if (phaseNum === 2) {
      // Detach 4 of the 12 light orbs to the 4 corners of the arena
      for (const cDef of CORNER_WEATHER_DEFS) {
        const orb = built.orbs[cDef.orbIdx];
        if (orb) {
          orb.detached = true;
          orb.weatherType = cDef.type;
          orb.cornerDx = cDef.dx;
          orb.cornerDz = cDef.dz;
          orb.hazardTimer = 0.8;
          orb.groundRing.visible = true;
        }
      }
      if (!boss.phase2ToastShown) {
        boss.phase2ToastShown = true;
        const msg = i18n?.t
          ? i18n.t('boss.tenmaStorm.phase2Toast')
          : '用六字咒將光點送回漩渦';
        if (ctx.hud?.toast) ctx.hud.toast(msg);
        else if (ctx.toast?.show) ctx.toast.show(msg);
        else bus?.emit?.('toast', { text: msg });
        bus?.emit?.('boss:tenmaPhase2Orbs', { activeOrbs: 4 });
      }
    } else if (phaseNum === 3) {
      // Return any remaining corner orbs to the vortex for the Phase 3 whiteout finale
      for (const orb of built.orbs) {
        orb.detached = false;
        orb.weatherType = null;
        orb.groundRing.visible = false;
      }
    }
  },

  onMantraCast(payload, boss, ctx, _patternRunner, built) {
    if (!built || boss.phase !== 2) return;
    const pPos = payload?.origin || ctx.state?.player?.position;
    const castRadius = (payload?.radius || 4.8) + 2.8;
    const forceAll = Boolean(payload?.forceAll);

    let returnedCount = 0;
    for (const orb of built.orbs) {
      if (!orb.detached) continue;
      // Corner orb world position
      const orbWx = ARENA_X + orb.cornerDx;
      const orbWz = ARENA_Z + orb.cornerDz;
      const dist = pPos ? Math.hypot(pPos.x - orbWx, pPos.z - orbWz) : 999;
      if (forceAll || dist <= castRadius) {
        orb.detached = false;
        orb.weatherType = null;
        orb.groundRing.visible = false;
        returnedCount++;
      }
    }

    // If the player cast Mantra inside the arena during Phase 2 but was slightly outside corner range,
    // also allow returning the closest detached orb within 11m so Mantra counterplay feels responsive
    if (returnedCount === 0 && pPos) {
      let closestOrb = null;
      let closestDist = 11.0;
      for (const orb of built.orbs) {
        if (!orb.detached) continue;
        const d = Math.hypot(pPos.x - (ARENA_X + orb.cornerDx), pPos.z - (ARENA_Z + orb.cornerDz));
        if (d <= closestDist) {
          closestDist = d;
          closestOrb = orb;
        }
      }
      if (closestOrb) {
        closestOrb.detached = false;
        closestOrb.weatherType = null;
        closestOrb.groundRing.visible = false;
        returnedCount++;
      }
    }

    if (returnedCount > 0) {
      const remaining = built.orbs.filter((o) => o.detached).length;
      ctx.bus?.emit?.('sfx', { name: 'chime' });
      ctx.bus?.emit?.('boss:tenmaOrbReturned', { returnedCount, remaining });
      const msg =
        remaining > 0
          ? (ctx.i18n?.t
              ? ctx.i18n.t('boss.tenmaStorm.orbReturned')
              : 'Tenma orb returned ({n} remaining)'
            ).replace('{n}', String(remaining))
          : ctx.i18n?.t
            ? ctx.i18n.t('boss.tenmaStorm.allOrbsReturned')
            : 'All four weather orbs have returned to the vortex!';
      if (ctx.hud?.toast) ctx.hud.toast(msg);
      else if (ctx.toast?.show) ctx.toast.show(msg);
      else ctx.bus?.emit?.('toast', { text: msg });
    }
  },

  onSubdue(boss, ctx, patternRunner, built) {
    return this.onSubdued(boss, ctx, patternRunner, built);
  },

  onSubdued(boss, _ctx, _patternRunner, built) {
    boss.subdueElapsed = 0;
    if (!built) return;
    // Clear the blizzard vortex and reveal the 12 Tenma female silhouettes in a circle around the arena
    built.vortexGroup.visible = false;
    for (const orb of built.orbs) {
      orb.detached = false;
      orb.groundRing.visible = false;
    }
    built.silhouettesGroup.visible = true;
    // Place the boss group at arena center so the 12 silhouettes form a perfect circle around the pass latse
    if (typeof boss.setPosition === 'function') {
      boss.setPosition(ARENA_X, ARENA_Z);
    } else if (boss.pos) {
      boss.pos.x = ARENA_X;
      boss.pos.z = ARENA_Z;
    }
    if (boss.group) {
      boss.group.position.set(boss.pos.x, boss.pos.y, boss.pos.z);
      boss.group.rotation.y = 0;
    }
  },

  getExtraState(_boss, _patternRunner, _ctx, built) {
    return {
      detachedOrbs: built ? built.orbs.filter((o) => o.detached).length : 0,
      silhouettesVisible: Boolean(built?.silhouettesGroup?.visible),
      vortexVisible: Boolean(built?.vortexGroup?.visible),
      silhouetteCount: built?.silhouettes?.length || 0,
    };
  },

  onUpdate(dt, boss, ctx, patternRunner, built) {
    if (!built) return;
    const elapsed = ctx.state?.elapsed || 0;
    const pPos = ctx.state?.player?.position;

    // ── Subdued State: 12 Translucent Female Silhouettes Bowing in Sequence ──
    if (boss.state === 'subdued' || (boss.subdued && !boss.active)) {
      boss.subdueElapsed = (boss.subdueElapsed || 0) + dt;
      built.vortexGroup.visible = false;
      built.silhouettesGroup.visible = true;

      for (let i = 0; i < built.silhouettes.length; i++) {
        const s = built.silhouettes[i];
        const delay = i * 0.14;
        const localT = Math.max(0, boss.subdueElapsed - delay);
        const bowAmt = Math.min(1, localT * 2.2);
        // Bow forward respectfully ( ~32 degrees ) with gentle float
        s.upperBody.rotation.x = bowAmt * 0.55;
        s.holder.position.y = Math.sin(elapsed * 2.5 + i * 0.5) * 0.06;

        // Float each corresponding light orb above its goddess silhouette
        const orb = built.orbs[i];
        if (orb) {
          orb.group.position.set(
            s.holder.position.x,
            2.15 + Math.sin(elapsed * 3 + i) * 0.08,
            s.holder.position.z
          );
        }
      }
      return;
    }

    // ── Combat State: Animate Swirling Blizzard Vortex & 12 Orbs ──
    built.lowerFunnel.rotation.y += dt * 4.5;
    built.upperFunnel.rotation.y -= dt * 3.6;
    built.coreCrystal.rotation.y += dt * 2.8;
    built.coreCrystal.position.y = 2.2 + Math.sin(elapsed * 4.0) * 0.16;

    for (let r = 0; r < built.vortexRings.length; r++) {
      const ring = built.vortexRings[r];
      ring.rotation.z += dt * (r % 2 === 0 ? 5.2 : -4.4);
      ring.rotation.x = Math.sin(elapsed * 3 + r) * 0.18;
    }

    // Update each of the 12 light orbs (either orbiting core or detached at arena corner in Phase 2)
    for (let i = 0; i < built.orbs.length; i++) {
      const orb = built.orbs[i];
      orb.haloMesh.rotation.y += dt * 3.5;
      orb.haloMesh.rotation.x += dt * 2.2;

      if (orb.detached && boss.phase === 2) {
        // World corner target -> local relative to boss.pos
        const targetLx = ARENA_X + orb.cornerDx - boss.pos.x;
        const targetLz = ARENA_Z + orb.cornerDz - boss.pos.z;
        const targetLy = 1.35 + Math.sin(elapsed * 3.5 + i) * 0.15;
        orb.curLx += (targetLx - orb.curLx) * Math.min(1, dt * 5.0);
        orb.curLz += (targetLz - orb.curLz) * Math.min(1, dt * 5.0);
        orb.curLy += (targetLy - orb.curLy) * Math.min(1, dt * 5.0);
        // Counter-rotate by -boss.heading because boss.group is rotated by boss.heading
        const cosH = Math.cos(-boss.heading);
        const sinH = Math.sin(-boss.heading);
        const rx = orb.curLx * cosH - orb.curLz * sinH;
        const rz = orb.curLx * sinH + orb.curLz * cosH;
        orb.group.position.set(rx, orb.curLy, rz);
        orb.groundRing.visible = true;

        // Cast mini weather hazard from this active corner orb
        orb.hazardTimer -= dt;
        if (orb.hazardTimer <= 0 && pPos) {
          if (orb.weatherType === 'hail') {
            orb.hazardTimer = 2.4;
            patternRunner?.startPattern({
              type: 'targetedAoe',
              windup: 0.85,
              count: 1,
              radius: 1.9,
              spread: 1.5,
              damage: 12,
              slow: 1.2,
              color: 0x38bdf8,
            });
          } else if (orb.weatherType === 'avalanche') {
            orb.hazardTimer = 3.2;
            ctx.projectiles?.spawn?.('boulder', {
              startPos: {
                x: ARENA_X + orb.cornerDx,
                y: boss.pos.y + 2.2,
                z: ARENA_Z + orb.cornerDz,
              },
              targetPos: { x: pPos.x, y: pPos.y, z: pPos.z },
              damage: 14,
              flightDuration: 1.0,
              hitRadius: 1.6,
              arcHeight: 3.2,
              magic: false,
            });
          } else if (orb.weatherType === 'fog') {
            orb.hazardTimer = 2.8;
            // Mini chilling mist pulse around player if far from safe center
            const dFromOrb = Math.hypot(
              pPos.x - (ARENA_X + orb.cornerDx),
              pPos.z - (ARENA_Z + orb.cornerDz)
            );
            if (dFromOrb <= 9.0) {
              ctx.bus?.emit?.('vitals:damage', {
                amount: 4,
                type: 'magic',
                slow: 1.2,
                ignoreInvuln: true,
                knockback: 0,
                sourcePos: { x: ARENA_X + orb.cornerDx, y: boss.pos.y, z: ARENA_Z + orb.cornerDz },
              });
            }
          } else if (orb.weatherType === 'lightning') {
            orb.hazardTimer = 2.6;
            patternRunner?.startPattern({
              type: 'targetedAoe',
              windup: 0.75,
              count: 1,
              radius: 1.75,
              spread: 1.0,
              damage: 13,
              color: 0xc084fc,
            });
          }
        }
      } else {
        // Orbit around the blizzard vortex core
        orb.groundRing.visible = false;
        const orbitAngle = elapsed * 2.2 + (i / 12) * Math.PI * 2;
        const orbitRadius = 1.85 + (i % 3) * 0.45;
        const targetLx = Math.cos(orbitAngle) * orbitRadius;
        const targetLz = Math.sin(orbitAngle) * orbitRadius;
        const targetLy = 1.15 + ((i % 4) * 0.65) + Math.sin(elapsed * 3.2 + i) * 0.14;
        orb.curLx += (targetLx - orb.curLx) * Math.min(1, dt * 8.0);
        orb.curLz += (targetLz - orb.curLz) * Math.min(1, dt * 8.0);
        orb.curLy += (targetLy - orb.curLy) * Math.min(1, dt * 8.0);
        orb.group.position.set(orb.curLx, orb.curLy, orb.curLz);
      }
    }
  },

  onCleanup(_boss, _ctx, _patternRunner, built) {
    if (!built) return;
    for (const g of built.geometries || []) g.dispose?.();
    for (const m of built.materials || []) m.dispose?.();
  },
};

export function registerTenmaStormDialogue(ctx) {
  if (!ctx?.dialogue?.register) return;
  ctx.dialogue.register('boss.tenmaStorm.oath', {
    id: 'boss.tenmaStorm.oath',
    nodes: {
      start: {
        speaker: 'boss.tenmaStorm',
        speakerKey: 'boss.tenmaStorm.name',
        look: 'yogini',
        textKey: 'boss.tenmaStorm.oath.n1',
        next: 'n2',
      },
      n2: {
        speaker: 'boss.tenmaStorm',
        speakerKey: 'boss.tenmaStorm.name',
        look: 'yogini',
        textKey: 'boss.tenmaStorm.oath.n2',
        next: 'n3',
      },
      n3: {
        speaker: 'boss.tenmaStorm',
        speakerKey: 'boss.tenmaStorm.name',
        look: 'yogini',
        textKey: 'boss.tenmaStorm.oath.n3',
        choices: [
          {
            textKey: 'boss.tenmaStorm.oath.accept',
            actions: [
              { type: 'setFlag', flag: 'boss.tenmaStorm', value: true },
              { type: 'setFlag', flag: 'protector.tenma', value: true },
              { type: 'codexUnlock', entryId: 'twelveTenma' },
            ],
            next: null,
          },
        ],
      },
    },
  });
}

export default TENMA_STORM_BOSS;
