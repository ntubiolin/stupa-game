/**
 * Soft-Targeting System (`src/gameplay/targeting.js`)
 *
 * Acquires the nearest living enemy within a forward cone (default 14m, ±81° / 0.45π rad)
 * relative to `state.player.heading`, falling back to a 2.5m 360° close-range check.
 *
 * Coordinate convention:
 *   heading = 0 faces -Z; forward vector is (-Math.sin(dir), -Math.cos(dir)).
 *   Angle from origin (ox, oz) to target (ex, ez) is Math.atan2(-(ex - ox), -(ez - oz)).
 */
import * as THREE from 'three';

export function createTargeting(ctx) {
  const { state } = ctx;
  const raycaster = new THREE.Raycaster();
  const mouseNdc = new THREE.Vector2();

  function getEnemyXZ(enemy) {
    const p = enemy?.pos || enemy?.position || enemy?.group?.position;
    return {
      x: Number(p?.x) || 0,
      y: Number(p?.y) || 0,
      z: Number(p?.z) || 0,
    };
  }

  function getActiveCandidateList(origin, range, halfAngle, aimHeading) {
    const list = [];
    if (ctx.enemies?.getActiveEnemies) {
      const active = ctx.enemies.getActiveEnemies() || [];
      for (let i = 0; i < active.length; i++) {
        const e = active[i];
        if (e && e.state !== 'liberated' && e.hp > 0) list.push(e);
      }
    } else if (ctx.enemies?.queryCone && origin) {
      const cone = ctx.enemies.queryCone(origin, aimHeading, range, halfAngle) || [];
      for (let i = 0; i < cone.length; i++) {
        const e = cone[i];
        if (e && e.state !== 'liberated' && e.hp > 0) list.push(e);
      }
    }
    const activeBoss = ctx.bosses?.getActiveBoss?.()?.getInternalState?.() || state.boss?.active;
    if (activeBoss && !activeBoss.dead && (activeBoss.hp ?? 1) > 0 && activeBoss.pos) {
      list.push(activeBoss);
    }
    return list;
  }

  function getCursorWorldPoint(origin = state.player?.position) {
    const mouse = ctx.input?.mouse;
    const camera = ctx.camera;
    if (!mouse?.active || !camera || typeof camera.updateMatrixWorld !== 'function') {
      return null;
    }
    mouseNdc.set(Number(mouse.x) || 0, Number(mouse.y) || 0);
    raycaster.setFromCamera(mouseNdc, camera);
    const ray = raycaster.ray;
    const ox = Number(origin?.x ?? state.player?.position?.x) || 0;
    const oy = Number(origin?.y ?? state.player?.position?.y) || 0;
    const oz = Number(origin?.z ?? state.player?.position?.z) || 0;
    const planeY = oy + 0.55;

    let hitX = ox;
    let hitZ = oz;
    if (ray.direction.y < -0.015) {
      const t = (planeY - ray.origin.y) / ray.direction.y;
      if (t > 0 && t < 250) {
        hitX = ray.origin.x + ray.direction.x * t;
        hitZ = ray.origin.z + ray.direction.z * t;
      } else {
        hitX = ray.origin.x + ray.direction.x * 24;
        hitZ = ray.origin.z + ray.direction.z * 24;
      }
    } else {
      const hLen = Math.hypot(ray.direction.x, ray.direction.z);
      if (hLen <= 1e-5) return null;
      hitX = ox + (ray.direction.x / hLen) * 14;
      hitZ = oz + (ray.direction.z / hLen) * 14;
    }
    return new THREE.Vector3(hitX, oy, hitZ);
  }

  function getMouseAimDirection(origin = state.player?.position) {
    const pt = getCursorWorldPoint(origin);
    if (!pt) return null;
    const ox = Number(origin?.x ?? state.player?.position?.x) || 0;
    const oz = Number(origin?.z ?? state.player?.position?.z) || 0;
    const dx = pt.x - ox;
    const dz = pt.z - oz;
    if (dx * dx + dz * dz <= 0.0025) return null;
    return {
      dir: Math.atan2(-dx, -dz),
      point: pt,
    };
  }

  function acquire({ range = 14, halfAngle = Math.PI * 0.45, closeRadius = 2.5, useMouse = true } = {}) {
    const origin = state.player?.position || { x: 0, y: 0, z: 0 };
    const ox = Number(origin.x) || 0;
    const oz = Number(origin.z) || 0;
    const playerHeading = Number(state.player?.heading) || 0;

    const mouseAim = useMouse ? getMouseAimDirection(origin) : null;
    if (mouseAim) {
      // When mouse cursor is active on desktop, aim toward the mouse cursor,
      // with gentle soft-target snapping only within a narrow cone (±24°) around the cursor ray.
      const mouseDir = mouseAim.dir;
      const fwdX = -Math.sin(mouseDir);
      const fwdZ = -Math.cos(mouseDir);
      const cosMouseCone = Math.cos((24 * Math.PI) / 180);
      const candidates = getActiveCandidateList(origin, range, (24 * Math.PI) / 180, mouseDir);

      let bestMouseTarget = null;
      let bestScore = Infinity;
      for (let i = 0; i < candidates.length; i++) {
        const e = candidates[i];
        const ep = getEnemyXZ(e);
        const dx = ep.x - ox;
        const dz = ep.z - oz;
        const dist = Math.hypot(dx, dz);
        if (dist > range || dist <= 1e-4) continue;
        const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
        const cursorDist = Math.hypot(ep.x - mouseAim.point.x, ep.z - mouseAim.point.z);
        if (dot >= cosMouseCone || cursorDist <= 1.8) {
          const score = cursorDist * 0.7 + dist * 0.3;
          if (score < bestScore) {
            bestScore = score;
            bestMouseTarget = e;
          }
        }
      }

      if (bestMouseTarget) {
        const ep = getEnemyXZ(bestMouseTarget);
        if (!bestMouseTarget.position || !(bestMouseTarget.position instanceof THREE.Vector3)) {
          bestMouseTarget.position = new THREE.Vector3(ep.x, ep.y, ep.z);
        } else {
          bestMouseTarget.position.set(ep.x, ep.y, ep.z);
        }
        const dx = ep.x - ox;
        const dz = ep.z - oz;
        const dir = dx * dx + dz * dz > 1e-6 ? Math.atan2(-dx, -dz) : mouseDir;
        return {
          target: bestMouseTarget,
          dir,
          targetPos: bestMouseTarget.position.clone(),
        };
      }

      return {
        target: null,
        dir: mouseDir,
        targetPos: mouseAim.point,
      };
    }

    let bestTarget = null;
    let bestDist = Infinity;

    const fwdX = -Math.sin(playerHeading);
    const fwdZ = -Math.cos(playerHeading);
    const cosHalf = Math.cos(halfAngle);

    // 1. Primary search: nearest living enemy inside the forward cone
    if (ctx.enemies?.queryCone) {
      const coneCandidates = ctx.enemies.queryCone(origin, playerHeading, range, halfAngle) || [];
      for (let i = 0; i < coneCandidates.length; i++) {
        const e = coneCandidates[i];
        if (!e || e.state === 'liberated' || e.hp <= 0) continue;
        const ep = getEnemyXZ(e);
        const dist = Math.hypot(ep.x - ox, ep.z - oz);
        if (dist < bestDist) {
          bestDist = dist;
          bestTarget = e;
        }
      }
    } else if (ctx.enemies?.getActiveEnemies) {
      const active = ctx.enemies.getActiveEnemies() || [];
      for (let i = 0; i < active.length; i++) {
        const e = active[i];
        if (!e || e.state === 'liberated' || e.hp <= 0) continue;
        const ep = getEnemyXZ(e);
        const dx = ep.x - ox;
        const dz = ep.z - oz;
        const dist = Math.hypot(dx, dz);
        if (dist > range) continue;
        if (dist > 1e-4) {
          const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
          if (dot < cosHalf) continue;
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestTarget = e;
        }
      }
    }

    // Also check active Boss in forward cone
    const activeBoss = ctx.bosses?.getActiveBoss?.()?.getInternalState?.() || state.boss?.active;
    if (activeBoss && !activeBoss.dead && (activeBoss.hp ?? 1) > 0 && activeBoss.pos) {
      const ep = getEnemyXZ(activeBoss);
      const dx = ep.x - ox;
      const dz = ep.z - oz;
      const dist = Math.hypot(dx, dz);
      if (dist <= range) {
        const dot = dist > 1e-4 ? (dx / dist) * fwdX + (dz / dist) * fwdZ : 1;
        if ((dot >= cosHalf || dist <= closeRadius) && dist < bestDist) {
          bestDist = dist;
          bestTarget = activeBoss;
        }
      }
    }

    // 2. Fallback search: if no enemy in forward cone, check within 2.5m 360° around player
    if (!bestTarget && closeRadius > 0) {
      const nearCandidates = ctx.enemies?.queryCircle
        ? ctx.enemies.queryCircle(ox, oz, closeRadius)
        : (ctx.enemies?.getActiveEnemies ? ctx.enemies.getActiveEnemies() : []);
      for (let i = 0; i < nearCandidates.length; i++) {
        const e = nearCandidates[i];
        if (!e || e.state === 'liberated' || e.hp <= 0) continue;
        const ep = getEnemyXZ(e);
        const dist = Math.hypot(ep.x - ox, ep.z - oz);
        if (dist <= closeRadius && dist < bestDist) {
          bestDist = dist;
          bestTarget = e;
        }
      }
    }

    if (bestTarget) {
      const ep = getEnemyXZ(bestTarget);
      if (!bestTarget.position || !(bestTarget.position instanceof THREE.Vector3)) {
        bestTarget.position = new THREE.Vector3(ep.x, ep.y, ep.z);
      } else {
        bestTarget.position.set(ep.x, ep.y, ep.z);
      }
      const dx = ep.x - ox;
      const dz = ep.z - oz;
      const dir = (dx * dx + dz * dz > 1e-6)
        ? Math.atan2(-dx, -dz)
        : playerHeading;
      return {
        target: bestTarget,
        dir,
        targetPos: bestTarget.position.clone(),
      };
    }

    return {
      target: null,
      dir: playerHeading,
      targetPos: null,
    };
  }

  const api = {
    update() {},
    acquire,
    getCursorWorldPoint,
    getMouseAimDirection,
    getAimDirection: (origin) => acquire({ range: 14, halfAngle: Math.PI * 0.45 }),
  };

  ctx.targeting = api;
  ctx.debug?.register('targeting', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.targeting = api;
  }

  return api;
}
