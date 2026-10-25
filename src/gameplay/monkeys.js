/**
 * Rhesus macaques (獼猴) — procedural low-poly monkeys that wander the kora plaza
 * or perch atop the prayer-wheel wall, sit & scratch, rest at night, and hop
 * excitedly to catch & eat tossed bananas.
 */
import { polar } from '../config.js';

const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * Math.min(1, t);
}

export function createMonkeys(ctx) {
  const { THREE, scene, state, config, bus } = ctx;
  const M = config.MONKEYS;
  const W = config.WORLD;
  const WALL = config.WALL;
  const count = M.count || 5;

  const group = new THREE.Group();
  group.name = 'Monkeys';
  (ctx.stupaGroup || scene).add(group);

  // ---------------------------------------------------------------- shared materials & geometries
  const furMat = new THREE.MeshStandardMaterial({
    color: 0x8b6f56,
    roughness: 0.85,
    metalness: 0.02,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xa98f76,
    roughness: 0.85,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xd98c7e,
    roughness: 0.68,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x1b1410,
    roughness: 0.3,
  });
  const bananaMat = new THREE.MeshStandardMaterial({
    color: 0xf5d130,
    roughness: 0.45,
    emissive: 0x3d2e00,
    emissiveIntensity: 0.2,
  });

  function buildMonkeyRig() {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    // Hips / body pivot
    const body = new THREE.Group();
    body.position.y = 0.24;
    rig.add(body);

    const torsoGeo = new THREE.CylinderGeometry(0.11, 0.125, 0.30, 10);
    const torso = new THREE.Mesh(torsoGeo, furMat);
    torso.position.y = 0.12;
    torso.castShadow = true;
    torso.receiveShadow = true;
    body.add(torso);

    const bellyGeo = new THREE.SphereGeometry(0.105, 10, 8);
    bellyGeo.scale(0.85, 1.15, 0.65);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, 0.11, -0.045);
    body.add(belly);

    // Head
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.30, -0.03);
    body.add(headPivot);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), furMat);
    skull.position.y = 0.06;
    skull.castShadow = true;
    headPivot.add(skull);

    // Pinkish rhesus macaque muzzle/face on -Z side
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), faceMat);
    muzzle.scale.set(0.95, 0.85, 0.78);
    muzzle.position.set(0, 0.045, -0.072);
    headPivot.add(muzzle);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.017, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.036, 0.075, -0.115);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.036, 0.075, -0.115);
    headPivot.add(leftEye, rightEye);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.038, 8, 6);
    earGeo.scale(0.45, 1.0, 0.85);
    const leftEar = new THREE.Mesh(earGeo, faceMat);
    leftEar.position.set(-0.11, 0.065, -0.01);
    const rightEar = new THREE.Mesh(earGeo, faceMat);
    rightEar.position.set(0.11, 0.065, -0.01);
    headPivot.add(leftEar, rightEar);

    // Limbs
    function makeLimb(x, y, z, len) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const geo = new THREE.CylinderGeometry(0.032, 0.026, len, 8);
      geo.translate(0, -len * 0.5, 0);
      const mesh = new THREE.Mesh(geo, furMat);
      mesh.castShadow = true;
      pivot.add(mesh);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), faceMat);
      paw.position.y = -len;
      pivot.add(paw);
      body.add(pivot);
      return pivot;
    }

    const leftArm = makeLimb(-0.12, 0.24, -0.02, 0.23);
    const rightArm = makeLimb(0.12, 0.24, -0.02, 0.23);
    const leftLeg = makeLimb(-0.085, 0.02, 0.02, 0.20);
    const rightLeg = makeLimb(0.085, 0.02, 0.02, 0.20);

    // Articulated tail (2 segments curving upward behind +Z)
    const tailBase = new THREE.Group();
    tailBase.position.set(0, 0.04, 0.10);
    body.add(tailBase);

    const tSeg1Geo = new THREE.CylinderGeometry(0.022, 0.026, 0.22, 8);
    tSeg1Geo.translate(0, 0.11, 0);
    const tSeg1 = new THREE.Mesh(tSeg1Geo, furMat);
    tSeg1.rotation.x = 0.85;
    tSeg1.castShadow = true;
    tailBase.add(tSeg1);

    const tailTip = new THREE.Group();
    tailTip.position.set(0, 0.14, 0.16);
    tailBase.add(tailTip);

    const tSeg2Geo = new THREE.CylinderGeometry(0.016, 0.022, 0.18, 8);
    tSeg2Geo.translate(0, 0.09, 0);
    const tSeg2 = new THREE.Mesh(tSeg2Geo, furMat);
    tSeg2.rotation.x = 0.35;
    tailTip.add(tSeg2);

    // Held banana (visible while eating)
    const heldBanana = createBananaMesh();
    heldBanana.position.set(0, -0.22, -0.04);
    heldBanana.visible = false;
    rightArm.add(heldBanana);

    return {
      root,
      rig,
      body,
      headPivot,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      tailBase,
      tailTip,
      heldBanana,
    };
  }

  function createBananaMesh() {
    const g = new THREE.Group();
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.11, 7), bananaMat);
    seg1.rotation.z = 0.28;
    seg1.position.set(-0.01, 0.04, 0);
    const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.016, 0.11, 7), bananaMat);
    seg2.rotation.z = -0.28;
    seg2.position.set(-0.01, -0.04, 0);
    g.add(seg1, seg2);
    return g;
  }

  // ---------------------------------------------------------------- spawn monkeys
  // First 2 monkeys perch on the stupa prayer-wheel wall (radius = WALL.radius, y = WALL.height);
  // remaining 3 monkeys roam the walkable plaza ring.
  const monkeys = [];

  for (let i = 0; i < count; i++) {
    const isWallMonkey = i < 2;
    const startAngle = (i / count) * TWO_PI + 0.55;
    const startR = isWallMonkey ? WALL.radius : 24 + (i % 3) * 3.2;
    const p = polar(startAngle, startR);
    const baseY = isWallMonkey ? WALL.height : 0;

    const parts = buildMonkeyRig();
    parts.root.position.set(p.x, baseY, p.z);
    const initialHeading = Math.atan2(p.x, p.z) + Math.PI; // face outward toward pilgrims
    parts.root.rotation.y = initialHeading;
    group.add(parts.root);

    // Flying banana projectile for this monkey
    const flyingBanana = createBananaMesh();
    flyingBanana.visible = false;
    group.add(flyingBanana);

    const m = {
      id: `monkey-${i}`,
      index: i,
      isWallMonkey,
      baseY,
      wallAngle: startAngle,
      targetWallAngle: startAngle,
      position: parts.root.position,
      heading: initialHeading,
      parts,
      state: 'sit',       // 'wander' | 'sit' | 'scratch' | 'sleep' | 'chase' | 'eat'
      stateTimer: 1.5 + i * 1.1,
      animPhase: i * 2.3,
      targetPos: new THREE.Vector3(p.x, baseY, p.z),
      cooldown: 0,
      projectile: {
        active: false,
        mesh: flyingBanana,
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        t: 0,
        duration: 0.68,
      },
    };

    monkeys.push(m);

    // Register interactable
    ctx.interactables.push({
      id: m.id,
      kind: 'monkey',
      zone: 'stupa',
      getPosition: () => m.position,
      radius: M.interactRadius || 5,
      action: 'feed',
      labelKey: 'prompt.feedMonkey',
      isAvailable: () => m.cooldown <= 0 && !m.projectile.active && m.state !== 'eat' && m.state !== 'chase',
      onInteract: () => feedMonkey(m),
    });
  }

  function pickNextTarget(m) {
    if (m.isWallMonkey) {
      // Hop along the top of the circular prayer-wheel wall
      const delta = (Math.random() - 0.5) * 0.65;
      m.targetWallAngle = m.wallAngle + delta;
      const p = polar(m.targetWallAngle, WALL.radius);
      m.targetPos.set(p.x, WALL.height, p.z);
      return;
    }

    // Pick a point on the plaza walkway away from obstacles
    const curTheta = Math.atan2(m.position.z, m.position.x);
    const nextTheta = curTheta + (Math.random() - 0.5) * 0.9;
    const minR = W.stupaColliderRadius + 1.8;
    const maxR = Math.min(W.walkRadius - 2.5, 33.5);
    const nextR = minR + Math.random() * (maxR - minR);
    const p = polar(nextTheta, nextR);
    m.targetPos.set(p.x, 0, p.z);
  }

  function feedMonkey(m) {
    if (m.cooldown > 0 || m.projectile.active) return;

    // Trigger player toss gesture
    bus.emit('player:gesture', { name: 'feed', target: m.position });

    const pPos = state.player.position;
    m.projectile.active = true;
    m.projectile.t = 0;
    m.projectile.duration = 0.65;
    m.projectile.start.set(pPos.x, pPos.y + 1.15, pPos.z);

    if (m.isWallMonkey) {
      // Land banana on the wall rim slightly ahead of the perched monkey
      const landAngle = m.wallAngle + (Math.random() - 0.5) * 0.14;
      m.targetWallAngle = landAngle;
      const lp = polar(landAngle, WALL.radius);
      m.projectile.end.set(lp.x, WALL.height + 0.08, lp.z);
      m.targetPos.set(lp.x, WALL.height, lp.z);
    } else {
      // Land banana midway between player and monkey, clamped to walkable plaza
      const mx = (pPos.x * 0.35 + m.position.x * 0.65) + (Math.random() - 0.5) * 0.8;
      const mz = (pPos.z * 0.35 + m.position.z * 0.65) + (Math.random() - 0.5) * 0.8;
      const r = Math.hypot(mx, mz) || 22;
      const clampedR = Math.max(W.stupaColliderRadius + 0.9, Math.min(W.walkRadius - 1.2, r));
      const lx = (mx / r) * clampedR;
      const lz = (mz / r) * clampedR;
      m.projectile.end.set(lx, 0.08, lz);
      m.targetPos.set(lx, 0, lz);
    }

    m.projectile.mesh.position.copy(m.projectile.start);
    m.projectile.mesh.visible = true;

    m.state = 'chase';
    m.stateTimer = 3.0;

    bus.emit('sfx', { name: 'monkey' });
    bus.emit('merit', { type: 'monkey' });
    bus.emit('vitals:restore', {
      mp: config.VITALS?.restore?.monkeyMp ?? 10,
      source: 'monkey',
    });
    bus.emit('monkey:fed', { position: m.position.clone() });
  }

  function resolvePlazaMonkeyCollision(pos) {
    const minR = W.stupaColliderRadius + 0.55;
    const maxR = W.walkRadius - 0.8;
    const r = Math.hypot(pos.x, pos.z) || minR;
    if (r < minR) {
      pos.x *= minR / r;
      pos.z *= minR / r;
    } else if (r > maxR) {
      pos.x *= maxR / r;
      pos.z *= maxR / r;
    }

    const colliders = ctx.colliders || [];
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!c || (c.zone || 'stupa') !== 'stupa') continue;
      if (c && c.type === 'circle') {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const minDist = (c.r || 0) + 0.35;
        const d2 = dx * dx + dz * dz;
        if (d2 < minDist * minDist) {
          const d = Math.sqrt(d2) || 0.001;
          pos.x = c.x + (dx / d) * minDist;
          pos.z = c.z + (dz / d) * minDist;
        }
      }
    }
  }

  function applyMonkeyPose(m, dt, speed) {
    const p = m.parts;
    p.rig.position.set(0, 0, 0);
    p.body.position.set(0, 0.24, 0);
    p.body.rotation.set(0, 0, 0);
    p.headPivot.rotation.set(0, 0, 0);
    p.leftArm.rotation.set(0, 0, 0);
    p.rightArm.rotation.set(0, 0, 0);
    p.leftLeg.rotation.set(0, 0, 0);
    p.rightLeg.rotation.set(0, 0, 0);
    p.heldBanana.visible = false;

    const tailSway = Math.sin(state.elapsed * 2.6 + m.index * 1.7);
    p.tailBase.rotation.z = tailSway * 0.22;
    p.tailTip.rotation.z = Math.cos(state.elapsed * 3.4 + m.index) * 0.28;

    if (m.state === 'wander' || m.state === 'chase') {
      const rate = m.state === 'chase' ? 14 : 9.5;
      m.animPhase += dt * rate;
      const s = Math.sin(m.animPhase);
      const hop = Math.abs(s) * (m.state === 'chase' ? 0.14 : 0.07);
      p.rig.position.y = hop;
      // Quadruped scamper pitch
      p.body.rotation.x = 0.55;
      p.headPivot.rotation.x = -0.45;
      p.leftArm.rotation.x = -0.55 + s * 0.65;
      p.rightArm.rotation.x = -0.55 - s * 0.65;
      p.leftLeg.rotation.x = -0.35 - s * 0.65;
      p.rightLeg.rotation.x = -0.35 + s * 0.65;
    } else if (m.state === 'eat') {
      m.animPhase += dt * 11;
      const bounce = Math.abs(Math.sin(m.animPhase * 0.7)) * 0.11;
      p.rig.position.y = bounce;
      p.body.position.y = 0.19;
      p.body.rotation.x = 0.12;
      p.leftLeg.rotation.x = -1.1;
      p.rightLeg.rotation.x = -1.1;
      // Right hand brings banana to mouth repeatedly
      const munch = Math.sin(m.animPhase * 1.4);
      p.rightArm.rotation.set(-1.75 + munch * 0.22, -0.35, -0.2);
      p.leftArm.rotation.set(-1.35 - munch * 0.18, 0.35, 0.2);
      p.headPivot.rotation.x = 0.18 + munch * 0.12;
      p.heldBanana.visible = true;
    } else if (m.state === 'scratch') {
      m.animPhase += dt * 16;
      p.body.position.y = 0.18;
      p.body.rotation.x = 0.18;
      p.leftLeg.rotation.x = -1.15;
      p.rightLeg.rotation.x = -1.15;
      p.leftArm.rotation.set(-0.35, 0, 0.12);
      // Right arm scratches head/side rapidly
      p.rightArm.rotation.set(-2.1 + Math.sin(m.animPhase) * 0.28, 0, -0.45);
      p.headPivot.rotation.z = 0.22;
      p.headPivot.rotation.x = 0.08 * Math.sin(m.animPhase);
    } else if (m.state === 'sleep') {
      // Curled up resting at night
      const breathe = Math.sin(state.elapsed * 1.6 + m.index) * 0.015;
      p.body.position.y = 0.14 + breathe;
      p.body.rotation.x = 0.78;
      p.headPivot.rotation.x = 0.45;
      p.leftLeg.rotation.x = -1.35;
      p.rightLeg.rotation.x = -1.35;
      p.leftArm.rotation.set(-1.1, 0.3, 0);
      p.rightArm.rotation.set(-1.1, -0.3, 0);
    } else {
      // 'sit' idle, looking around curiously
      p.body.position.y = 0.18;
      p.body.rotation.x = 0.16;
      p.leftLeg.rotation.x = -1.15;
      p.rightLeg.rotation.x = -1.15;
      p.leftArm.rotation.set(-0.32, 0.12, 0.08);
      p.rightArm.rotation.set(-0.32, -0.12, -0.08);
      p.headPivot.rotation.y = Math.sin(state.elapsed * 1.4 + m.index * 2.1) * 0.45;
      p.headPivot.rotation.x = Math.cos(state.elapsed * 1.1 + m.index) * 0.12;
    }
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    if (state.zone && state.zone !== 'stupa') return;

    const nightFactor = state.time.nightFactor ?? 0;

    for (let i = 0; i < monkeys.length; i++) {
      const m = monkeys[i];
      if (m.cooldown > 0) m.cooldown = Math.max(0, m.cooldown - dt);

      // Update flying banana parabola if active
      if (m.projectile.active) {
        const proj = m.projectile;
        proj.t += dt / proj.duration;
        if (proj.t >= 1) {
          proj.t = 1;
          proj.active = false;
          proj.mesh.visible = false;
        } else {
          const u = proj.t;
          proj.mesh.position.lerpVectors(proj.start, proj.end, u);
          proj.mesh.position.y += 4 * u * (1 - u) * 1.65;
          proj.mesh.rotation.x += dt * 9;
          proj.mesh.rotation.z += dt * 7;
        }
      }

      // State transitions
      m.stateTimer -= dt;
      let speed = 0;

      if (m.state === 'chase') {
        const dx = m.targetPos.x - m.position.x;
        const dz = m.targetPos.z - m.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25 && !m.projectile.active) {
          m.position.x = m.targetPos.x;
          m.position.z = m.targetPos.z;
          m.state = 'eat';
          m.stateTimer = 3.2;
          m.cooldown = 10.0;
          // Turn toward player while munching happily
          const px = state.player.position.x - m.position.x;
          const pz = state.player.position.z - m.position.z;
          m.heading = Math.atan2(-px, -pz);
        } else if (dist > 0.04) {
          speed = 3.4;
          const step = Math.min(dist, speed * dt);
          if (m.isWallMonkey) {
            const dAngle = wrapAngle(m.targetWallAngle - m.wallAngle);
            m.wallAngle += Math.sign(dAngle) * Math.min(Math.abs(dAngle), (speed / WALL.radius) * dt);
            const wp = polar(m.wallAngle, WALL.radius);
            m.position.set(wp.x, WALL.height, wp.z);
          } else {
            m.position.x += (dx / dist) * step;
            m.position.z += (dz / dist) * step;
            resolvePlazaMonkeyCollision(m.position);
          }
          m.heading = lerpAngle(m.heading, Math.atan2(-dx, -dz), dt * 12);
        }
      } else if (m.state === 'eat') {
        if (m.stateTimer <= 0) {
          m.state = 'sit';
          m.stateTimer = 2.5 + Math.random() * 2.5;
        }
      } else if (m.state === 'wander') {
        const dx = m.targetPos.x - m.position.x;
        const dz = m.targetPos.z - m.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.25 || m.stateTimer <= 0) {
          m.state = Math.random() < 0.35 ? 'scratch' : 'sit';
          m.stateTimer = 2.2 + Math.random() * 3.5;
        } else {
          speed = m.isWallMonkey ? 1.35 : 1.65;
          const step = Math.min(dist, speed * dt);
          if (m.isWallMonkey) {
            const dAngle = wrapAngle(m.targetWallAngle - m.wallAngle);
            m.wallAngle += Math.sign(dAngle) * Math.min(Math.abs(dAngle), (speed / WALL.radius) * dt);
            const wp = polar(m.wallAngle, WALL.radius);
            m.position.set(wp.x, WALL.height, wp.z);
          } else {
            m.position.x += (dx / dist) * step;
            m.position.z += (dz / dist) * step;
            resolvePlazaMonkeyCollision(m.position);
          }
          m.heading = lerpAngle(m.heading, Math.atan2(-dx, -dz), dt * 8);
        }
      } else {
        // 'sit', 'scratch', or 'sleep'
        if (m.stateTimer <= 0) {
          // At night monkeys mostly curl up and rest
          if (nightFactor > 0.65 && Math.random() < 0.72) {
            m.state = 'sleep';
            m.stateTimer = 4.0 + Math.random() * 4.0;
          } else {
            const roll = Math.random();
            if (roll < 0.48) {
              pickNextTarget(m);
              m.state = 'wander';
              m.stateTimer = 4.5 + Math.random() * 3.0;
            } else if (roll < 0.72) {
              m.state = 'scratch';
              m.stateTimer = 1.8 + Math.random() * 1.6;
            } else {
              m.state = 'sit';
              m.stateTimer = 2.5 + Math.random() * 3.0;
            }
          }
        }
      }

      m.position.y = m.baseY;
      m.parts.root.position.copy(m.position);
      m.parts.root.rotation.y = m.heading;
      applyMonkeyPose(m, dt, speed);
    }
  }

  return {
    update,
    monkeys,
  };
}
