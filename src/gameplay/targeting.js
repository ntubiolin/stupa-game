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

  function getEnemyXZ(enemy) {
    const p = enemy?.pos || enemy?.position || enemy?.group?.position;
    return {
      x: Number(p?.x) || 0,
      y: Number(p?.y) || 0,
      z: Number(p?.z) || 0,
    };
  }

  function acquire({ range = 14, halfAngle = Math.PI * 0.45, closeRadius = 2.5 } = {}) {
    const origin = state.player?.position || { x: 0, y: 0, z: 0 };
    const ox = Number(origin.x) || 0;
    const oz = Number(origin.z) || 0;
    const playerHeading = Number(state.player?.heading) || 0;

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
  };

  ctx.targeting = api;
  ctx.debug?.register('targeting', api);
  if (typeof window !== 'undefined' && window.__stupa) {
    window.__stupa.targeting = api;
  }

  return api;
}
