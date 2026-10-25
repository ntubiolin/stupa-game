/**
 * Pilgrim player — procedural low-poly character in maroon & saffron robes,
 * camera-relative movement, collision resolution, full prostration (大禮拜)
 * keyframe sequence, interaction gestures, and clockwise kora tracking.
 */
import { deg, polar } from '../config.js';

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

  // ---------------------------------------------------------------- mesh
  const root = new THREE.Group();
  root.name = 'Pilgrim';

  // Body pivot allows pitching/sliding during prostration without disturbing root position
  const body = new THREE.Group();
  root.add(body);

  const robeMaroon = new THREE.MeshStandardMaterial({
    color: 0x7a1c24,
    roughness: 0.78,
    metalness: 0.04,
  });
  const robeSaffron = new THREE.MeshStandardMaterial({
    color: 0xe08a1e,
    roughness: 0.7,
    metalness: 0.06,
  });
  const trimGold = new THREE.MeshStandardMaterial({
    color: 0xd8a648,
    roughness: 0.45,
    metalness: 0.35,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd9a17c,
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1e1815,
    roughness: 0.85,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x2b1d16,
    roughness: 0.85,
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

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.56, 0);
  torsoPivot.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.155, 14, 12);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 0.14;
  head.castShadow = true;
  headGroup.add(head);

  // Hair cap (faces -Z, so back of head is +Z)
  const hairGeo = new THREE.SphereGeometry(0.16, 14, 10, 0, TWO_PI, 0, Math.PI * 0.58);
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.y = 0.15;
  hair.rotation.x = -0.35;
  headGroup.add(hair);

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

  // Subtle lotus-gold ground aura during prostrations
  const auraGeo = new THREE.RingGeometry(0.32, 0.55, 24);
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

  // ---------------------------------------------------------------- animation & kora state
  let walkPhase = 0;
  let stepAccum = 0;

  // Prostration state
  const PROSTRATE_DUR = 4.1;
  let prostrateTime = -1;
  let prostrateStartHeading = 0;
  let prostrateTargetHeading = 0;

  // Gesture state ('light' | 'feed')
  let gesture = null; // { name, timer, duration, targetHeading }

  // Mantra chant state
  let chantTimer = 0;
  let chantDuration = 0.5;

  bus.on('player:chant', (payload) => {
    const dur = payload?.duration ?? (config.MANTRA?.duration ?? 0.5);
    chantTimer = dur;
    chantDuration = dur;
    state.player.action = 'chant';
  });

  bus.on('player:gesture', (payload) => {
    if (!payload || state.player.action === 'prostrate') return;
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
  let lastTheta = Math.atan2(state.player.position.z, state.player.position.x);
  let koraAccum = 0;          // radians accumulated toward current clockwise lap (0..2π)
  let koraLaps = 0;
  let lastEmittedFraction = 0;
  let ccwWindowAccum = 0;     // negative radian accumulation in recent window
  let wrongWayCooldown = 0;

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
    state.player.action = 'idle';
    resetPose();
    lastTheta = Math.atan2(state.player.position.z, state.player.position.x);
    root.position.copy(state.player.position);
    root.rotation.y = state.player.heading;
  });

  const camForward = new THREE.Vector3();
  const camRight = new THREE.Vector3();

  // ---------------------------------------------------------------- collision resolution
  function resolveCollisions(pos) {
    const pr = P.radius;
    const currentZone = state.zone || 'stupa';

    if (currentZone === 'wild') {
      const wOrigin = config.WILD?.origin || { x: 1000, z: 0 };
      const maxWildR = (config.WILD?.walkRadius || 70) - pr;
      let dx = pos.x - wOrigin.x;
      let dz = pos.z - wOrigin.z;
      let r = Math.hypot(dx, dz);
      if (r > maxWildR) {
        const s = maxWildR / (r || 1);
        pos.x = wOrigin.x + dx * s;
        pos.z = wOrigin.z + dz * s;
      }

      const colliders = ctx.colliders;
      if (Array.isArray(colliders)) {
        for (let i = 0; i < colliders.length; i++) {
          const c = colliders[i];
          if (!c) continue;
          if ((c.zone || 'stupa') !== 'wild') continue;
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
                pos.x = c.x + minDist;
              }
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
                const dl = Math.abs(pos.x - c.minX);
                const dr = Math.abs(c.maxX - pos.x);
                const dtb = Math.abs(pos.z - c.minZ);
                const dbb = Math.abs(c.maxZ - pos.z);
                const m = Math.min(dl, dr, dtb, dbb);
                if (m === dl) pos.x = c.minX - pr;
                else if (m === dr) pos.x = c.maxX + pr;
                else if (m === dtb) pos.z = c.minZ - pr;
                else pos.z = c.maxZ + pr;
              }
            }
          }
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
      pos.y = ctx.wilderness ? ctx.wilderness.getHeight(pos.x, pos.z) : 0;
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
    const colliders = ctx.colliders;
    if (Array.isArray(colliders)) {
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (!c) continue;
        if ((c.zone || 'stupa') !== 'stupa') continue;
        if (c.type === 'circle') {
          const dx = pos.x - c.x;
          const dz = pos.z - c.z;
          const minDist = (c.r || 0) + pr;
          const d2 = dx * dx + dz * dz;
          if (d2 < minDist * minDist) {
            const d = Math.sqrt(d2) || 0.001;
            const push = (minDist - d) / d;
            pos.x += dx * push;
            pos.z += dz * push;
          }
        } else if (c.type === 'box') {
          const cx = Math.max(c.minX, Math.min(c.maxX, pos.x));
          const cz = Math.max(c.minZ, Math.min(c.maxZ, pos.z));
          const dx = pos.x - cx;
          const dz = pos.z - cz;
          const d2 = dx * dx + dz * dz;
          if (d2 < pr * pr) {
            if (d2 > 1e-6) {
              const d = Math.sqrt(d2);
              pos.x = cx + (dx / d) * pr;
              pos.z = cz + (dz / d) * pr;
            } else {
              // Inside box: push out to nearest edge
              const dl = Math.abs(pos.x - c.minX);
              const dr = Math.abs(c.maxX - pos.x);
              const dtb = Math.abs(pos.z - c.minZ);
              const dbb = Math.abs(c.maxZ - pos.z);
              const m = Math.min(dl, dr, dtb, dbb);
              if (m === dl) pos.x = c.minX - pr;
              else if (m === dr) pos.x = c.maxX + pr;
              else if (m === dtb) pos.z = c.minZ - pr;
              else pos.z = c.maxZ + pr;
            }
          }
        }
      }
    }

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

  // ---------------------------------------------------------------- pose helpers
  function resetPose() {
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    skirt.scale.set(1, 1, 1);
    torsoPivot.position.set(0, 0.72, 0);
    torsoPivot.rotation.set(0, 0, 0);
    headGroup.rotation.set(0, 0, 0);
    leftArm.pivot.rotation.set(0, 0, 0.08);
    rightArm.pivot.rotation.set(0, 0, -0.08);
    leftArm.forearmPivot.rotation.set(-0.18, 0, 0);
    rightArm.forearmPivot.rotation.set(-0.18, 0, 0);
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
    auraMat.opacity = 0;
  }

  /**
   * Full Tibetan prostration (大禮拜) keyframe animation over t in [0, PROSTRATE_DUR]:
   *  0.00 - 0.55s : Turn toward stupa, bring palms together above crown (body)
   *  0.55 - 1.15s : Lower joined hands to forehead → throat → heart (speech & mind)
   *  1.15 - 1.75s : Drop to knees, bow torso, touch hands to ground
   *  1.75 - 2.65s : Slide forward flat on the ground, arms stretched ahead toward stupa
   *  2.65 - 3.15s : Hold full prostration, touch forehead, palms together above head
   *  3.15 - 4.10s : Push back to knees and rise gracefully to standing
   */
  function applyProstrationPose(t) {
    resetPose();

    const turnT = smoothstep(0, 0.45, t);
    state.player.heading = lerpAngle(prostrateStartHeading, prostrateTargetHeading, turnT);

    // Aura glow peaks while flat on ground
    const auraPulse = smoothstep(0.3, 1.8, t) * (1 - smoothstep(3.1, 4.0, t));
    auraMat.opacity = 0.45 * auraPulse;
    const s = 0.9 + 0.25 * auraPulse;
    aura.scale.set(s, s, s);

    if (t < 0.55) {
      // Phase 1: Raise hands in lotus mudra above crown
      const p = smoothstep(0, 0.55, t);
      leftArm.pivot.rotation.set(-2.55 * p, 0.35 * p, 0.18 * (1 - p));
      rightArm.pivot.rotation.set(-2.55 * p, -0.35 * p, -0.18 * (1 - p));
      leftArm.forearmPivot.rotation.set(-0.55 * p, 0, -0.25 * p);
      rightArm.forearmPivot.rotation.set(-0.55 * p, 0, 0.25 * p);
      headGroup.rotation.x = -0.12 * p;
    } else if (t < 1.15) {
      // Phase 2: Crown -> Forehead -> Throat -> Heart (anjali mudra at chest)
      const p = smoothstep(0.55, 1.15, t);
      const shX = -2.55 + 1.65 * p; // -2.55 -> -0.90
      leftArm.pivot.rotation.set(shX, 0.35 + 0.25 * p, 0);
      rightArm.pivot.rotation.set(shX, -0.35 - 0.25 * p, 0);
      leftArm.forearmPivot.rotation.set(-0.55 - 0.85 * p, 0, -0.25 - 0.25 * p);
      rightArm.forearmPivot.rotation.set(-0.55 - 0.85 * p, 0, 0.25 + 0.25 * p);
      headGroup.rotation.x = -0.12 + 0.32 * p;
      torsoPivot.rotation.x = 0.12 * p;
    } else if (t < 1.75) {
      // Phase 3: Kneel down and place hands forward on the ground
      const p = smoothstep(1.15, 1.75, t);
      body.position.y = -0.36 * p;
      skirt.scale.y = 1 - 0.38 * p;
      torsoPivot.rotation.x = 0.12 + 0.95 * p;
      headGroup.rotation.x = 0.20 - 0.35 * p;
      leftArm.pivot.rotation.set(-0.90 - 0.75 * p, 0.60 * (1 - p), 0);
      rightArm.pivot.rotation.set(-0.90 - 0.75 * p, -0.60 * (1 - p), 0);
      leftArm.forearmPivot.rotation.set(-1.40 * (1 - p) - 0.15 * p, 0, -0.50 * (1 - p));
      rightArm.forearmPivot.rotation.set(-1.40 * (1 - p) - 0.15 * p, 0, 0.50 * (1 - p));
    } else if (t < 3.15) {
      // Phase 4 & 5: Slide forward into full prostration (body flat on ground, arms extended to -Z)
      const slide = smoothstep(1.75, 2.45, t);
      const salute = smoothstep(2.45, 2.85, t) * (1 - smoothstep(2.85, 3.15, t));
      body.position.y = -0.36 + 0.52 * slide; // keep body just above ground when pitched 90 deg
      body.position.z = -0.52 * slide;
      body.rotation.x = (Math.PI * 0.47) * slide;
      skirt.scale.y = 0.62 + 0.38 * slide;
      torsoPivot.rotation.x = 1.07 * (1 - slide) + 0.05 * slide;
      headGroup.rotation.x = -0.15 + 0.25 * slide;
      // Arms stretched straight overhead (along -Z in world)
      leftArm.pivot.rotation.set(-1.65 - 1.35 * slide, 0.18 * slide, 0);
      rightArm.pivot.rotation.set(-1.65 - 1.35 * slide, -0.18 * slide, 0);
      leftArm.forearmPivot.rotation.set(-0.15 - 0.45 * salute, 0, -0.25 * slide);
      rightArm.forearmPivot.rotation.set(-0.15 - 0.45 * salute, 0, 0.25 * slide);
    } else {
      // Phase 6: Rise back from ground -> kneel -> stand with palms at heart
      const p = smoothstep(3.15, PROSTRATE_DUR, t);
      const inv = 1 - p;
      body.position.y = 0.16 * inv;
      body.position.z = -0.52 * inv;
      body.rotation.x = (Math.PI * 0.47) * inv;
      torsoPivot.rotation.x = 0.35 * Math.sin(p * Math.PI);
      leftArm.pivot.rotation.set(-3.0 * inv - 0.65 * Math.sin(p * Math.PI), 0.35 * Math.sin(p * Math.PI), 0.08 * p);
      rightArm.pivot.rotation.set(-3.0 * inv - 0.65 * Math.sin(p * Math.PI), -0.35 * Math.sin(p * Math.PI), -0.08 * p);
      leftArm.forearmPivot.rotation.set(-0.18 - 0.8 * Math.sin(p * Math.PI), 0, 0);
      rightArm.forearmPivot.rotation.set(-0.18 - 0.8 * Math.sin(p * Math.PI), 0, 0);
    }
  }

  function applyGesturePose(g) {
    resetPose();
    const p = Math.sin(Math.min(1, g.timer / g.duration) * Math.PI);
    if (g.name === 'light') {
      // Reverent bow and right hand reaching forward to offer flame
      torsoPivot.rotation.x = 0.28 * p;
      headGroup.rotation.x = 0.18 * p;
      rightArm.pivot.rotation.set(-1.25 * p, -0.15 * p, -0.08);
      rightArm.forearmPivot.rotation.set(-0.35 * p, 0, 0);
      leftArm.pivot.rotation.set(-0.75 * p, 0.45 * p, 0);
      leftArm.forearmPivot.rotation.set(-1.1 * p, 0, -0.35 * p);
    } else {
      // 'feed' — underhand toss gesture
      torsoPivot.rotation.x = 0.14 * p;
      rightArm.pivot.rotation.set(-1.45 * p, -0.1 * p, -0.08);
      rightArm.forearmPivot.rotation.set(-0.45 * p, 0, 0);
    }
  }

  // ---------------------------------------------------------------- kora tracking
  function updateKora(dt) {
    if (wrongWayCooldown > 0) wrongWayCooldown -= dt;

    const pos = state.player.position;
    const theta = Math.atan2(pos.z, pos.x);
    const dTheta = wrapAngle(theta - lastTheta);
    lastTheta = theta;

    if (Math.abs(dTheta) < 1e-6 || Math.abs(dTheta) > 0.8) return;

    // Clockwise kora = theta INCREASING (dTheta > 0)
    koraAccum += dTheta;
    if (koraAccum < 0) koraAccum = 0;

    // Track counter-clockwise movement window (~25 deg = 0.436 rad)
    if (dTheta < 0) {
      ccwWindowAccum += -dTheta;
      if (ccwWindowAccum >= deg(25) && wrongWayCooldown <= 0) {
        ccwWindowAccum = 0;
        wrongWayCooldown = 18; // throttle reminder
        bus.emit('kora:wrongway');
      }
    } else {
      ccwWindowAccum = Math.max(0, ccwWindowAccum - dTheta * 2);
    }

    // Completed a full clockwise lap?
    if (koraAccum >= TWO_PI) {
      koraAccum -= TWO_PI;
      koraLaps += 1;
      lastEmittedFraction = koraAccum / TWO_PI;
      bus.emit('kora:progress', { fraction: lastEmittedFraction, laps: koraLaps });
      bus.emit('merit', { type: 'kora' });
      bus.emit('sfx', { name: 'bell' });
      return;
    }

    const fraction = Math.max(0, Math.min(1, koraAccum / TWO_PI));
    if (Math.abs(fraction - lastEmittedFraction) >= 0.008) {
      lastEmittedFraction = fraction;
      bus.emit('kora:progress', { fraction, laps: koraLaps });
    }
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    const input = ctx.input;

    // Outside play mode: idle breathing
    if (state.mode !== 'play') {
      resetPose();
      const breathe = Math.sin(state.elapsed * 2.1) * 0.015;
      torsoPivot.position.y = 0.72 + breathe;
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
        applyProstrationPose(prostrateTime);
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
    if (input && input.pressed('prostrate')) {
      if (state.zone === 'wild') {
        bus.emit('toast', { key: 'toast.noProstrateWild', kind: 'warning' });
        return;
      }
      chantTimer = 0;
      prostrateTime = 0;
      prostrateStartHeading = state.player.heading;
      // Face the stupa at (0, 0): vector from player to stupa is (-x, -z) => heading = atan2(x, z)
      prostrateTargetHeading = Math.atan2(state.player.position.x, state.player.position.z);
      state.player.velocity.set(0, 0, 0);
      state.player.isMoving = false;
      state.player.action = 'prostrate';
      applyProstrationPose(0);
      root.position.copy(state.player.position);
      root.rotation.y = state.player.heading;
      return;
    }

    // 4. Camera-relative movement
    const mx = input ? input.move.x : 0;
    const my = input ? input.move.y : 0;
    const moveMag = Math.min(1, Math.hypot(mx, my));
    const isRun = Boolean(input && input.run && moveMag > 0.1);

    ctx.camera.getWorldDirection(camForward);
    camForward.y = 0;
    if (camForward.lengthSq() < 1e-6) camForward.set(0, 0, -1);
    else camForward.normalize();
    // Right vector on XZ plane: forward × up(0,1,0) = (-camForward.z, 0, camForward.x)
    camRight.set(-camForward.z, 0, camForward.x);

    let targetSpeed = moveMag > 0.02 ? (isRun ? P.runSpeed : P.walkSpeed) * moveMag : 0;
    if (state.elapsed < (state.player.slowUntil || 0)) {
      targetSpeed *= (config.VITALS?.slowMultiplier ?? 0.5);
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

    state.player.position.x += state.player.velocity.x * dt;
    state.player.position.z += state.player.velocity.z * dt;
    resolveCollisions(state.player.position);

    state.player.isMoving = speed > 0.12;
    state.player.action = state.player.isMoving ? (isRun ? 'run' : 'walk') : 'idle';

    if (chantTimer > 0) {
      chantTimer = Math.max(0, chantTimer - dt);
      state.player.action = 'chant';
    }

    if (state.player.isMoving) {
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
      torsoPivot.rotation.x = isRun ? 0.14 : 0.06;
      torsoPivot.rotation.y = swing * 0.08;

      const armAmp = isRun ? 0.65 : 0.38;
      leftArm.pivot.rotation.x = swing * armAmp;
      rightArm.pivot.rotation.x = -swing * armAmp;
      leftArm.forearmPivot.rotation.x = -0.25 - Math.max(0, -swing) * 0.35;
      rightArm.forearmPivot.rotation.x = -0.25 - Math.max(0, swing) * 0.35;

      const legAmp = isRun ? 0.55 : 0.35;
      leftLeg.rotation.x = -swing * legAmp;
      rightLeg.rotation.x = swing * legAmp;

      // Footstep SFX cadence
      stepAccum += speed * dt;
      const stride = isRun ? 1.55 : 1.25;
      if (stepAccum >= stride) {
        stepAccum %= stride;
        bus.emit('sfx', { name: 'step' });
      }
    } else {
      const breathe = Math.sin(state.elapsed * 2.2);
      torsoPivot.position.y = 0.72 + breathe * 0.012;
      leftArm.pivot.rotation.z = 0.07 + breathe * 0.015;
      rightArm.pivot.rotation.z = -0.07 - breathe * 0.015;
      stepAccum = 0;
    }

    if (chantTimer > 0) {
      // Posed upper body with joined palms in Anjali Mudra at heart/chest
      torsoPivot.rotation.x = isRun ? 0.08 : 0.04;
      leftArm.pivot.rotation.set(-0.75, 0.45, 0);
      rightArm.pivot.rotation.set(-0.75, -0.45, 0);
      leftArm.forearmPivot.rotation.set(-1.1, 0, -0.35);
      rightArm.forearmPivot.rotation.set(-1.1, 0, 0.35);

      const chantProgress = chantDuration > 0 ? chantTimer / chantDuration : 0;
      auraMat.opacity = Math.sin(chantProgress * Math.PI) * 0.75;
    }

    root.position.copy(state.player.position);
    root.rotation.y = state.player.heading;

    // 6. Kora angle tracking (only active in stupa plaza)
    if ((state.zone || 'stupa') === 'stupa') {
      updateKora(dt);
    }
  }

  return {
    update,
    mesh: root,
    getKoraProgress() {
      return { fraction: Math.max(0, Math.min(1, koraAccum / TWO_PI)), laps: koraLaps };
    },
  };
}
