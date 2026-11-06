/**
 * Composable Boss Attack Patterns (`src/gameplay/bosses/patterns.js`)
 *
 * Provides 8 reusable, composable Boss attack pattern modules with clear red
 * ground telegraph indicators before impact and strictly 0 PointLights:
 *  1. radialAoe        - Circular ground slam telegraph + AoE impact + knockback
 *  2. lineCharge       - Straight line dash telegraph + high-speed charge across arena
 *  3. targetedAoe      - Sequence of N circles spawning under the player's position
 *  4. projectileVolley - Fan of projectiles (boulders/frost) with ground aim telegraphs
 *  5. ringWave         - Expanding frost/shockwave ring from Boss (innerR -> outerR) with safe gap
 *  6. summonAdds       - Spawns minion adds (e.g. 4 mini-migoi at 0.6x scale & HP)
 *  7. weatherZone      - Persistent arena hazard (Blizzard 30% slow + 3 golden Mani safe circles)
 *  8. beam             - Sweeping energy/frost beam with telegraph line
 */
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;

function normalizeAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

export function createPatternRunner(ctx, parentGroup) {
  const { state, bus } = ctx;

  const telegraphGroup = new THREE.Group();
  telegraphGroup.name = 'BossPatternTelegraphs';
  parentGroup.add(telegraphGroup);

  const activeTasks = [];
  const activeProjectiles = [];
  const spawnedAddIds = new Set();
  let activeWeather = null;

  // Shared unit geometries (scaled per instance to avoid allocations)
  const unitCircleGeo = new THREE.CircleGeometry(1.0, 36);
  unitCircleGeo.rotateX(-Math.PI / 2);

  const unitRingGeo = new THREE.RingGeometry(0.92, 1.0, 36);
  unitRingGeo.rotateX(-Math.PI / 2);

  const unitPlaneGeo = new THREE.PlaneGeometry(1.0, 1.0);
  unitPlaneGeo.translate(0, 0.5, 0);
  unitPlaneGeo.rotateX(-Math.PI / 2);

  const boulderGeo = new THREE.DodecahedronGeometry(0.48, 1);
  const boulderMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.65,
    metalness: 0.1,
    emissive: new THREE.Color(0x1e3a8a),
    emissiveIntensity: 0.35,
  });

  const maniStoneGeo = new THREE.CylinderGeometry(0.32, 0.42, 0.55, 8);
  const maniTopGeo = new THREE.ConeGeometry(0.28, 0.35, 8);
  maniTopGeo.translate(0, 0.45, 0);

  function getGroundY(x, z) {
    return ctx.world ? ctx.world.getHeight(x, z) : 0;
  }

  function makeTelegraphDisc(radius, colorHex = 0xef4444) {
    const group = new THREE.Group();
    const borderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 0.28, 0.28),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const fillMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });

    const border = new THREE.Mesh(unitRingGeo, borderMat);
    border.scale.set(radius, 1, radius);
    group.add(border);

    const fill = new THREE.Mesh(unitCircleGeo, fillMat);
    fill.scale.set(0.05, 1, 0.05);
    group.add(fill);

    telegraphGroup.add(group);
    return {
      group,
      border,
      fill,
      borderMat,
      fillMat,
      radius,
      setProgress(p) {
        const clamped = Math.max(0.02, Math.min(1, p));
        fill.scale.set(radius * clamped, 1, radius * clamped);
        fillMat.opacity = 0.2 + clamped * 0.45;
      },
      dispose() {
        telegraphGroup.remove(group);
        borderMat.dispose();
        fillMat.dispose();
      },
    };
  }

  function makeTelegraphLine(width, length) {
    const group = new THREE.Group();
    const fillMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.1, 0.25, 0.25),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(unitPlaneGeo, fillMat);
    mesh.scale.set(width, 1, length);
    group.add(mesh);
    telegraphGroup.add(group);

    return {
      group,
      mesh,
      fillMat,
      setProgress(p) {
        fillMat.opacity = 0.28 + Math.min(1, Math.max(0, p)) * 0.55;
      },
      dispose() {
        telegraphGroup.remove(group);
        fillMat.dispose();
      },
    };
  }

  function dealPlayerDamage(amount, sourcePos, knockback = 0, slowSec = 0) {
    const pPos = state.player?.position;
    if (!pPos || state.bossSubdued) return;
    const bossLevel = Math.max(1, Number(ctx.bosses?.getState?.()?.level || state.boss?.level) || 6);
    const scaledAmount = Math.max(1, Math.round(Number(amount || 10) * (1 + 0.12 * (bossLevel - 1)) * 1.8));
    const hurtKb = knockback > 0 ? Math.min(1.2, knockback * 0.18) : 0;
    if (ctx.vitals?.damage) {
      ctx.vitals.damage(scaledAmount, 'physical', {
        sourcePos,
        source: 'boss',
        slow: slowSec,
        knockback: hurtKb,
      });
    } else if (ctx.player?.damage) {
      ctx.player.damage(scaledAmount, sourcePos);
    } else {
      bus.emit('vitals:damage', {
        amount: scaledAmount,
        type: 'physical',
        sourcePos,
        source: 'boss',
        slow: slowSec,
        knockback: hurtKb,
      });
    }
    if (knockback > 0 && sourcePos && state.player?.velocity) {
      const dx = pPos.x - sourcePos.x;
      const dz = pPos.z - sourcePos.z;
      const d = Math.hypot(dx, dz) || 1;
      state.player.velocity.x += (dx / d) * knockback * 0.65;
      state.player.velocity.z += (dz / d) * knockback * 0.65;
      const vMag = Math.hypot(state.player.velocity.x, state.player.velocity.z);
      if (vMag > 8.5) {
        state.player.velocity.x = (state.player.velocity.x / vMag) * 8.5;
        state.player.velocity.z = (state.player.velocity.z / vMag) * 8.5;
      }
    }
    if (slowSec > 0 && state.player) {
      state.player.slowUntil = Math.max(state.player.slowUntil || 0, state.elapsed + slowSec);
      state.player.slowMultiplier = 0.65;
    }
  }

  // ---------------------------------------------------------------- 1. radialAoe
  function radialAoe(boss, spec = {}) {
    const radius = spec.radius ?? 4.2;
    const windup = spec.windup ?? 1.05;
    const damage = spec.damage ?? 22;
    const knockback = spec.knockback ?? 6.5;
    const cx = spec.x ?? boss.pos.x;
    const cz = spec.z ?? boss.pos.z;
    const cy = getGroundY(cx, cz);

    const disc = makeTelegraphDisc(radius);
    disc.group.position.set(cx, cy + 0.04, cz);
    boss.animState = 'windup';

    activeTasks.push({
      kind: 'radialAoe',
      age: 0,
      duration: windup + 0.35,
      impacted: false,
      update(dt) {
        this.age += dt;
        if (!this.impacted) {
          const p = Math.min(1, this.age / windup);
          disc.setProgress(p);
          if (this.age >= windup) {
            this.impacted = true;
            boss.animState = 'attack';
            bus.emit('sfx', 'boulder');
            ctx.cameraRig?.addShake?.(0.35);

            // Check player hit
            const pPos = state.player?.position;
            if (pPos) {
              const dist = Math.hypot(pPos.x - cx, pPos.z - cz);
              if (dist <= radius + (ctx.config.PLAYER?.radius || 0.4)) {
                dealPlayerDamage(damage, { x: cx, z: cz }, knockback);
              }
            }
            // Flash impact ring
            disc.fillMat.color.setHex(0xfef08a);
            disc.fillMat.opacity = 0.85;
          }
        } else {
          const post = (this.age - windup) / 0.35;
          disc.fillMat.opacity = Math.max(0, 0.85 * (1 - post));
          disc.borderMat.opacity = Math.max(0, 0.9 * (1 - post));
        }
        return this.age >= this.duration;
      },
      cleanup() {
        disc.dispose();
      },
    });
  }

  // ---------------------------------------------------------------- 2. lineCharge
  function lineCharge(boss, spec = {}) {
    const width = spec.width ?? 1.8;
    const length = spec.length ?? 12.0;
    const windup = spec.windup ?? 0.9;
    const chargeDuration = spec.chargeDuration ?? 0.45;
    const damage = spec.damage ?? 24;
    const knockback = spec.knockback ?? 7.0;

    const pPos = state.player?.position || { x: boss.pos.x, z: boss.pos.z + 5 };
    const dx = pPos.x - boss.pos.x;
    const dz = pPos.z - boss.pos.z;
    const angle = Math.atan2(dx, dz);
    const dirX = Math.sin(angle);
    const dirZ = Math.cos(angle);
    const startX = boss.pos.x;
    const startZ = boss.pos.z;
    const cy = getGroundY(startX, startZ);

    boss.facing = angle;
    boss.animState = 'windup';

    const line = makeTelegraphLine(width, length);
    line.group.position.set(startX, cy + 0.04, startZ);
    line.group.rotation.y = angle + Math.PI;

    activeTasks.push({
      kind: 'lineCharge',
      age: 0,
      hitPlayer: false,
      update(dt) {
        this.age += dt;
        if (this.age < windup) {
          line.setProgress(this.age / windup);
          return false;
        }
        const chargeTime = this.age - windup;
        if (chargeTime <= chargeDuration) {
          boss.animState = 'attack';
          const frac = Math.min(1, chargeTime / chargeDuration);
          const nx = startX + dirX * length * frac;
          const nz = startZ + dirZ * length * frac;
          boss.setPosition(nx, nz);

          if (!this.hitPlayer && state.player?.position) {
            const dist = Math.hypot(
              state.player.position.x - boss.pos.x,
              state.player.position.z - boss.pos.z
            );
            if (dist <= width * 0.65 + (ctx.config.PLAYER?.radius || 0.4)) {
              this.hitPlayer = true;
              dealPlayerDamage(damage, boss.pos, knockback);
            }
          }
          line.fillMat.opacity = Math.max(0, 0.7 * (1 - frac));
          return false;
        }
        return true;
      },
      cleanup() {
        line.dispose();
      },
    });
  }

  // ---------------------------------------------------------------- 3. targetedAoe
  function targetedAoe(boss, spec = {}) {
    const count = spec.count ?? 3;
    const interval = spec.interval ?? 0.45;
    const radius = spec.radius ?? 2.4;
    const windup = spec.windup ?? 0.95;
    const damage = spec.damage ?? 18;

    boss.animState = 'attack';
    for (let i = 0; i < count; i++) {
      const delay = i * interval;
      activeTasks.push({
        kind: 'targetedAoeSpawner',
        age: 0,
        spawned: false,
        update(dt) {
          this.age += dt;
          if (!this.spawned && this.age >= delay) {
            this.spawned = true;
            const pPos = state.player?.position || boss.pos;
            radialAoe(boss, {
              x: pPos.x,
              z: pPos.z,
              radius,
              windup,
              damage,
              knockback: 3.5,
            });
            return true;
          }
          return this.spawned;
        },
        cleanup() {},
      });
    }
  }

  // ---------------------------------------------------------------- 4. projectileVolley
  function projectileVolley(boss, spec = {}) {
    const count = spec.count ?? 3;
    const spreadAngle = spec.spreadAngle ?? 0.52; // ~30 deg total fan
    const windup = spec.windup ?? 0.75;
    const speed = spec.speed ?? 11.5;
    const maxDist = spec.range ?? 16.0;
    const damage = spec.damage ?? 16;
    const hitRadius = spec.hitRadius ?? 0.68;

    const pPos = state.player?.position || { x: boss.pos.x, z: boss.pos.z + 6 };
    const baseAngle = Math.atan2(pPos.x - boss.pos.x, pPos.z - boss.pos.z);
    boss.facing = baseAngle;
    boss.animState = 'windup';

    const aimLines = [];
    const angles = [];
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * spreadAngle;
      const a = baseAngle + offset;
      angles.push(a);
      const line = makeTelegraphLine(0.32, maxDist);
      line.group.position.set(boss.pos.x, getGroundY(boss.pos.x, boss.pos.z) + 0.04, boss.pos.z);
      line.group.rotation.y = a + Math.PI;
      aimLines.push(line);
    }

    activeTasks.push({
      kind: 'projectileVolley',
      age: 0,
      fired: false,
      update(dt) {
        this.age += dt;
        if (!this.fired) {
          const p = Math.min(1, this.age / windup);
          for (const l of aimLines) l.setProgress(p);
          if (this.age >= windup) {
            this.fired = true;
            boss.animState = 'attack';
            bus.emit('sfx', 'boulder');
            for (const a of angles) {
              const mesh = new THREE.Mesh(boulderGeo, boulderMat);
              const startX = boss.pos.x + Math.sin(a) * 1.1;
              const startZ = boss.pos.z + Math.cos(a) * 1.1;
              const startY = getGroundY(startX, startZ) + 1.25;
              mesh.position.set(startX, startY, startZ);
              telegraphGroup.add(mesh);
              activeProjectiles.push({
                mesh,
                x: startX,
                y: startY,
                z: startZ,
                vx: Math.sin(a) * speed,
                vz: Math.cos(a) * speed,
                traveled: 0,
                maxDist,
                damage,
                hitRadius,
              });
            }
            return true;
          }
          return false;
        }
        return true;
      },
      cleanup() {
        for (const l of aimLines) l.dispose();
      },
    });
  }

  // ---------------------------------------------------------------- 5. ringWave
  function ringWave(boss, spec = {}) {
    const innerR = spec.innerR ?? 1.8;
    const outerR = spec.outerR ?? 12.5;
    const windup = spec.windup ?? 0.9;
    const expandDuration = spec.expandDuration ?? 1.35;
    const damage = spec.damage ?? 19;
    const slowSec = spec.slowSec ?? 2.2;
    const ringThickness = spec.thickness ?? 1.25;
    // Safe angular gap (65 degrees) toward a random angle so player can dodge through the gap or outrun
    const gapAngle = spec.gapAngle ?? (Math.random() * TWO_PI - Math.PI);
    const gapHalfWidth = spec.gapHalfWidth ?? 0.58; // ~66 deg total safe gap

    const cx = boss.pos.x;
    const cz = boss.pos.z;
    const cy = getGroundY(cx, cz);
    boss.animState = 'windup';

    // Build segmented ring with a visible safe gap
    const arcLen = TWO_PI - gapHalfWidth * 2;
    const arcStart = gapAngle + gapHalfWidth + Math.PI / 2;

    const teleGeo = new THREE.RingGeometry(innerR, outerR, 40, 1, arcStart, arcLen);
    teleGeo.rotateX(-Math.PI / 2);
    const teleMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const teleMesh = new THREE.Mesh(teleGeo, teleMat);
    teleMesh.position.set(cx, cy + 0.035, cz);
    telegraphGroup.add(teleMesh);

    const waveGeo = new THREE.RingGeometry(0.88, 1.0, 44, 1, arcStart, arcLen);
    waveGeo.rotateX(-Math.PI / 2);
    const waveMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.5, 1.8, 2.6), // bright frost cyan
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.position.set(cx, cy + 0.06, cz);
    waveMesh.scale.set(innerR, 1, innerR);
    waveMesh.visible = false;
    telegraphGroup.add(waveMesh);

    activeTasks.push({
      kind: 'ringWave',
      age: 0,
      hitPlayer: false,
      soundPlayed: false,
      update(dt) {
        this.age += dt;
        if (this.age < windup) {
          teleMat.opacity = 0.16 + (this.age / windup) * 0.28;
          return false;
        }
        if (!this.soundPlayed) {
          this.soundPlayed = true;
          boss.animState = 'attack';
          bus.emit('sfx', 'frost');
          waveMesh.visible = true;
          teleMat.opacity = 0.12;
        }
        const t = (this.age - windup) / expandDuration;
        if (t <= 1) {
          const curR = innerR + (outerR - innerR) * t;
          waveMesh.scale.set(curR, 1, curR);
          waveMat.opacity = 0.92 * (1 - t * 0.35);

          if (!this.hitPlayer && state.player?.position) {
            const dx = state.player.position.x - cx;
            const dz = state.player.position.z - cz;
            const dist = Math.hypot(dx, dz);
            if (Math.abs(dist - curR) <= ringThickness * 0.55) {
              const pAngle = Math.atan2(dx, dz);
              const diff = Math.abs(normalizeAngle(pAngle - gapAngle));
              if (diff > gapHalfWidth) {
                this.hitPlayer = true;
                dealPlayerDamage(damage, { x: cx, z: cz }, 3.0, slowSec);
              }
            }
          }
          return false;
        }
        return true;
      },
      cleanup() {
        telegraphGroup.remove(teleMesh);
        telegraphGroup.remove(waveMesh);
        teleGeo.dispose();
        teleMat.dispose();
        waveGeo.dispose();
        waveMat.dispose();
      },
    });
  }

  // ---------------------------------------------------------------- 6. summonAdds
  function summonAdds(boss, spec = {}) {
    const count = spec.count ?? 4;
    const kind = spec.kind ?? 'migoi';
    const scale = spec.scale ?? 0.6;
    const hpRatio = spec.hpRatio ?? 0.45;
    const radiusOffset = spec.radiusOffset ?? 4.2;
    const windup = spec.windup ?? 0.85;

    // Limit active adds so arena never overflows
    const activeEnemies = ctx.enemies?.getActiveEnemies?.() || [];
    let currentAddCount = 0;
    for (const e of activeEnemies) {
      if (e.bossAddOf === boss.id && e.hp > 0) currentAddCount++;
    }
    const toSpawn = Math.max(0, Math.min(count, 4 - currentAddCount));
    if (toSpawn <= 0) return;

    const discs = [];
    const spawnCoords = [];
    for (let i = 0; i < toSpawn; i++) {
      const a = (i / toSpawn) * TWO_PI + 0.4;
      const sx = boss.pos.x + Math.cos(a) * radiusOffset;
      const sz = boss.pos.z + Math.sin(a) * radiusOffset;
      const sy = getGroundY(sx, sz);
      spawnCoords.push({ x: sx, y: sy, z: sz });
      const disc = makeTelegraphDisc(1.2, 0x38bdf8);
      disc.group.position.set(sx, sy + 0.04, sz);
      discs.push(disc);
    }

    boss.animState = 'roar';
    activeTasks.push({
      kind: 'summonAdds',
      age: 0,
      spawned: false,
      update(dt) {
        this.age += dt;
        const p = Math.min(1, this.age / windup);
        for (const d of discs) d.setProgress(p);
        if (!this.spawned && this.age >= windup) {
          this.spawned = true;
          for (const pos of spawnCoords) {
            const eid = ctx.enemies?.spawn?.(kind, {
              position: pos,
              level: Math.max(1, (boss.level || boss.bossDef?.level || 5) - 2),
              noSplit: true,
            });
            if (eid) {
              spawnedAddIds.add(eid);
              const list = ctx.enemies?.getActiveEnemies?.() || [];
              const inst = list.find((e) => e.id === eid);
              if (inst) {
                inst.bossAddOf = boss.id;
                inst.group.scale.setScalar(scale);
                inst.radius *= scale;
                inst.height *= scale;
                inst.maxHp = Math.max(18, Math.round(inst.maxHp * hpRatio));
                inst.hp = inst.maxHp;
                inst.state = 'chase';
              }
            }
          }
          return true;
        }
        return this.spawned;
      },
      cleanup() {
        for (const d of discs) d.dispose();
      },
    });
  }

  // ---------------------------------------------------------------- 7. weatherZone
  function weatherZone(boss, spec = {}) {
    if (activeWeather) return; // Already active for this phase

    const arena = boss.arena || boss.bossDef?.arena || { x: boss.pos.x, z: boss.pos.z, r: 14 };
    const slowMult = spec.slowMult ?? 0.7; // 30% slow
    const safeRadius = spec.safeRadius ?? 2.8;
    const safeCount = spec.safeCount ?? 3;

    const weatherGroup = new THREE.Group();
    weatherGroup.name = 'BossWeatherZone';
    telegraphGroup.add(weatherGroup);

    // Subtle icy blizzard ring across the arena floor
    const arenaFloorGeo = new THREE.RingGeometry(0.5, arena.r - 0.3, 48);
    arenaFloorGeo.rotateX(-Math.PI / 2);
    const arenaFloorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const arenaFloorMesh = new THREE.Mesh(arenaFloorGeo, arenaFloorMat);
    const centerY = getGroundY(arena.x, arena.z);
    arenaFloorMesh.position.set(arena.x, centerY + 0.02, arena.z);
    weatherGroup.add(arenaFloorMesh);

    // 3 warm golden Mani stone safe circles where the player is NOT slowed
    const safeZones = [];
    const safeRingGeo = new THREE.RingGeometry(safeRadius - 0.18, safeRadius, 36);
    safeRingGeo.rotateX(-Math.PI / 2);
    const safeFillGeo = new THREE.CircleGeometry(safeRadius - 0.18, 36);
    safeFillGeo.rotateX(-Math.PI / 2);

    const safeRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 1.75, 0.4),
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const safeFillMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.75,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 0.55,
    });

    for (let i = 0; i < safeCount; i++) {
      const a = (i / safeCount) * TWO_PI - Math.PI / 2;
      const dist = arena.r * 0.54;
      const sx = arena.x + Math.cos(a) * dist;
      const sz = arena.z + Math.sin(a) * dist;
      const sy = getGroundY(sx, sz);

      const sGrp = new THREE.Group();
      sGrp.position.set(sx, sy + 0.035, sz);

      const rMesh = new THREE.Mesh(safeRingGeo, safeRingMat);
      const fMesh = new THREE.Mesh(safeFillGeo, safeFillMat);
      const cairn = new THREE.Mesh(maniStoneGeo, stoneMat);
      cairn.position.y = 0.27;
      const cairnTop = new THREE.Mesh(maniTopGeo, stoneMat);
      sGrp.add(rMesh, fMesh, cairn, cairnTop);
      weatherGroup.add(sGrp);

      safeZones.push({ x: sx, y: sy, z: sz, r: safeRadius, group: sGrp });
    }

    // Swirling snow particles inside arena (Points, 0 PointLight)
    const snowCount = 90;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      const a = Math.random() * TWO_PI;
      const r = Math.sqrt(Math.random()) * (arena.r - 0.5);
      snowPos[i * 3] = arena.x + Math.cos(a) * r;
      snowPos[i * 3 + 1] = centerY + 0.4 + Math.random() * 4.5;
      snowPos[i * 3 + 2] = arena.z + Math.sin(a) * r;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const snowPoints = new THREE.Points(snowGeo, snowMat);
    weatherGroup.add(snowPoints);

    activeWeather = {
      group: weatherGroup,
      safeZones,
      slowMult,
      age: 0,
      update(dt) {
        this.age += dt;
        safeFillMat.opacity = 0.2 + Math.sin(this.age * 3.5) * 0.06;

        // Swirl snow particles
        const arr = snowGeo.attributes.position.array;
        for (let i = 0; i < snowCount; i++) {
          const idx = i * 3;
          const dx = arr[idx] - arena.x;
          const dz = arr[idx + 2] - arena.z;
          const ang = Math.atan2(dz, dx) + dt * 1.4;
          const rad = Math.hypot(dx, dz);
          arr[idx] = arena.x + Math.cos(ang) * rad;
          arr[idx + 2] = arena.z + Math.sin(ang) * rad;
          arr[idx + 1] -= dt * 1.8;
          if (arr[idx + 1] < centerY + 0.2) {
            arr[idx + 1] = centerY + 4.5;
          }
        }
        snowGeo.attributes.position.needsUpdate = true;

        // Check if player is inside any golden Mani safe circle
        const pPos = state.player?.position;
        if (pPos && state.player) {
          let inSafeCircle = false;
          for (const sz of safeZones) {
            if (Math.hypot(pPos.x - sz.x, pPos.z - sz.z) <= sz.r) {
              inSafeCircle = true;
              break;
            }
          }
          state.player.inManiSafeZone = inSafeCircle;
          if (!inSafeCircle) {
            state.player.slowUntil = Math.max(state.player.slowUntil || 0, state.elapsed + 0.15);
            state.player.slowMultiplier = slowMult;
          } else if (state.player.slowMultiplier === slowMult) {
            state.player.slowUntil = 0;
            state.player.slowMultiplier = null;
          }
        }
      },
      dispose() {
        if (state.player) {
          state.player.inManiSafeZone = false;
          if (state.player.slowMultiplier === slowMult) {
            state.player.slowUntil = 0;
            state.player.slowMultiplier = null;
          }
        }
        telegraphGroup.remove(weatherGroup);
        arenaFloorGeo.dispose();
        arenaFloorMat.dispose();
        safeRingGeo.dispose();
        safeFillGeo.dispose();
        safeRingMat.dispose();
        safeFillMat.dispose();
        stoneMat.dispose();
        snowGeo.dispose();
        snowMat.dispose();
      },
    };
  }

  // ---------------------------------------------------------------- 8. beam
  function beam(boss, spec = {}) {
    const width = spec.width ?? 1.1;
    const length = spec.length ?? 13.0;
    const windup = spec.windup ?? 0.85;
    const sweepDuration = spec.sweepDuration ?? 1.2;
    const sweepAngle = spec.sweepAngle ?? 1.25; // radians swept
    const damage = spec.damage ?? 20;

    const pPos = state.player?.position || { x: boss.pos.x, z: boss.pos.z + 5 };
    const centerAngle = Math.atan2(pPos.x - boss.pos.x, pPos.z - boss.pos.z);
    const startAngle = centerAngle - sweepAngle * 0.5;
    boss.facing = startAngle;
    boss.animState = 'windup';

    const line = makeTelegraphLine(width, length);
    const cy = getGroundY(boss.pos.x, boss.pos.z);
    line.group.position.set(boss.pos.x, cy + 0.05, boss.pos.z);
    line.group.rotation.y = startAngle + Math.PI;

    activeTasks.push({
      kind: 'beam',
      age: 0,
      lastHitAt: -1,
      update(dt) {
        this.age += dt;
        if (this.age < windup) {
          line.setProgress(this.age / windup);
          return false;
        }
        const t = (this.age - windup) / sweepDuration;
        if (t <= 1) {
          boss.animState = 'attack';
          const curAngle = startAngle + sweepAngle * t;
          boss.facing = curAngle;
          line.group.position.set(boss.pos.x, getGroundY(boss.pos.x, boss.pos.z) + 0.05, boss.pos.z);
          line.group.rotation.y = curAngle + Math.PI;
          line.fillMat.color.setRGB(0.6, 1.9, 2.8);
          line.fillMat.opacity = 0.85;

          if (state.player?.position && this.age - this.lastHitAt > 0.45) {
            const dx = state.player.position.x - boss.pos.x;
            const dz = state.player.position.z - boss.pos.z;
            const bx = Math.sin(curAngle);
            const bz = Math.cos(curAngle);
            const proj = dx * bx + dz * bz;
            const perp = Math.abs(dx * bz - dz * bx);
            if (proj >= 0 && proj <= length && perp <= width * 0.6) {
              this.lastHitAt = this.age;
              dealPlayerDamage(damage, boss.pos, 2.5, 1.2);
            }
          }
          return false;
        }
        return true;
      },
      cleanup() {
        line.dispose();
      },
    });
  }

  // ---------------------------------------------------------------- Runner Update & Cleanup
  function update(dt) {
    // 1. Update active pattern tasks
    for (let i = activeTasks.length - 1; i >= 0; i--) {
      const task = activeTasks[i];
      const done = task.update(dt);
      if (done) {
        task.cleanup?.();
        activeTasks.splice(i, 1);
      }
    }

    // 2. Update active projectiles
    const pPos = state.player?.position;
    const pRadius = ctx.config.PLAYER?.radius || 0.4;
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
      const proj = activeProjectiles[i];
      const stepX = proj.vx * dt;
      const stepZ = proj.vz * dt;
      proj.x += stepX;
      proj.z += stepZ;
      proj.traveled += Math.hypot(stepX, stepZ);
      proj.y = getGroundY(proj.x, proj.z) + 0.75;
      proj.mesh.position.set(proj.x, proj.y, proj.z);
      proj.mesh.rotation.x += dt * 5.0;
      proj.mesh.rotation.z += dt * 3.5;

      let hit = false;
      if (pPos) {
        const dist = Math.hypot(pPos.x - proj.x, pPos.z - proj.z);
        if (dist <= proj.hitRadius + pRadius) {
          hit = true;
          dealPlayerDamage(proj.damage, { x: proj.x, z: proj.z }, 3.5, 1.5);
        }
      }
      if (hit || proj.traveled >= proj.maxDist) {
        telegraphGroup.remove(proj.mesh);
        activeProjectiles.splice(i, 1);
      }
    }

    // 3. Update active weather zone
    if (activeWeather) {
      activeWeather.update(dt);
    }
  }

  function clear() {
    for (const t of activeTasks) {
      t.cleanup?.();
    }
    activeTasks.length = 0;

    for (const p of activeProjectiles) {
      telegraphGroup.remove(p.mesh);
    }
    activeProjectiles.length = 0;

    if (activeWeather) {
      activeWeather.dispose();
      activeWeather = null;
    }

    // Remove any remaining summoned minion adds
    if (ctx.enemies?.getActiveEnemies) {
      const list = ctx.enemies.getActiveEnemies();
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (spawnedAddIds.has(e.id) || e.bossAddOf) {
          e.hp = 0;
          e.group.visible = false;
          if (e.group.parent) e.group.parent.remove(e.group);
          list.splice(i, 1);
        }
      }
    }
    spawnedAddIds.clear();
  }

  // Allow Six-Syllable Mantra (`mantra:cast`) to dispel active boss volley projectiles within radius
  bus.on('mantra:cast', (ev) => {
    if (!activeProjectiles.length) return;
    const ox = ev?.origin?.x ?? state.player?.position?.x ?? 0;
    const oz = ev?.origin?.z ?? state.player?.position?.z ?? 0;
    const r = (ev?.radius ?? 6.5) + 1.0;
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
      const p = activeProjectiles[i];
      if (Math.hypot(p.x - ox, p.z - oz) <= r) {
        telegraphGroup.remove(p.mesh);
        activeProjectiles.splice(i, 1);
      }
    }
  });

  function coneSlam(boss, spec = {}) {
    return radialAoe(boss, {
      ...spec,
      radius: spec.radius ?? 4.8,
    });
  }

  function groundHazard(boss, spec = {}) {
    const radius = spec.radius ?? 2.8;
    const duration = spec.duration ?? 6.0;
    const tickDamage = spec.tickDamage ?? 8;
    const tickInterval = spec.tickInterval ?? 0.85;
    const cx = spec.x ?? boss.pos.x;
    const cz = spec.z ?? boss.pos.z;
    const cy = getGroundY(cx, cz);

    const disc = makeTelegraphDisc(radius, spec.color || 0xdc2626);
    disc.group.position.set(cx, cy + 0.03, cz);
    disc.setProgress(1);

    activeTasks.push({
      kind: 'groundHazard',
      age: 0,
      duration,
      tickAccum: 0,
      update(dt) {
        this.age += dt;
        this.tickAccum += dt;
        disc.fillMat.opacity = 0.25 + 0.12 * Math.sin(this.age * 5.0);
        if (this.tickAccum >= tickInterval) {
          this.tickAccum -= tickInterval;
          const pPos = state.player?.position;
          if (pPos) {
            const dist = Math.hypot(pPos.x - cx, pPos.z - cz);
            if (dist <= radius + (ctx.config.PLAYER?.radius || 0.4)) {
              dealPlayerDamage(tickDamage, { x: cx, z: cz }, 0);
            }
          }
        }
        return this.age >= this.duration;
      },
      cleanup() {
        disc.dispose();
      },
    });
  }

  const patternMap = {
    radialAoe,
    coneSlam,
    groundHazard,
    lineCharge,
    targetedAoe,
    projectileVolley,
    ringWave,
    summonAdds,
    weatherZone,
    beam,
  };

  return {
    patterns: patternMap,
    startPattern(spec = {}, bossOverride) {
      const fn = patternMap[spec.type];
      if (typeof fn !== 'function') return null;
      const bossObj =
        bossOverride ||
        ctx.bosses?.getActiveBoss?.()?.getInternalState?.() || {
          pos: { x: state.player?.position?.x ?? 0, y: 0, z: state.player?.position?.z ?? 0 },
          facing: 0,
        };
      return fn(bossObj, spec);
    },
    update,
    clear,
    hasWeatherZone() {
      return Boolean(activeWeather);
    },
    getSafeZones() {
      return activeWeather ? activeWeather.safeZones : [];
    },
  };
}
