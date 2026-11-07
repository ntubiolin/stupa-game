/**
 * 3D Remote Pilgrims & Co-op Resonance VFX (`src/gameplay/remotePilgrims.js`) — Issue #61
 *
 * Renders procedural 3D Pilgrim models for all active Co-op teammates (`ctx.coop.getMembers()`)
 * in the current zone (Strictly 0 PointLights):
 *   - Maroon/indigo/saffron robes, lotus crown / headband / straw hat, mala prayer beads,
 *     golden chest emblem, and an unmistakable glowing ground lotus ring under their feet.
 *   - Overhead `THREE.Sprite` (`CanvasTexture`) nameplate with `[Lv.X] Name` + HP bar
 *     (turns crimson with `[按 E 甘露救援]` when fainted).
 *   - Smooth position & heading interpolation (`lerp`) + walk/run/prostrate/faint animations.
 *   - Remote Skill VFX (`coop:remoteSkill`) & Double-Layered Golden/Turquoise Mandala Lotus Wave
 *     (`r = 12m`) when Six-Syllable Mantra Resonance (`coop:resonance`) triggers!
 *   - Proximity interactable (`2.8m`) so pressing `E` (or casting Mantra) revives a fainted ally.
 */
import * as THREE from 'three';
import '../i18n/coop.js';
import { i18n } from '../i18n.js';

const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * Math.min(1, t);
}

export function createRemotePilgrims(ctx) {
  if (ctx.remotePilgrims) return ctx.remotePilgrims;
  const { scene, state, bus } = ctx;

  const group = new THREE.Group();
  group.name = 'RemotePilgrims';
  scene.add(group);

  const vfxGroup = new THREE.Group();
  vfxGroup.name = 'CoopResonanceVFX';
  scene.add(vfxGroup);

  // Map<member.id, actorRecord>
  const actors = new Map();
  const activeVfx = [];

  // Shared materials for common accents (Strictly 0 PointLights)
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd9a17c,
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x1e1815,
    roughness: 0.85,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.7,
  });
  const beadMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
    roughness: 0.4,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x2b1d16,
    roughness: 0.85,
  });

  function drawNameplateCanvas(canvas, member) {
    const g = canvas.getContext('2d');
    if (!g) return;
    const w = canvas.width;
    const h = canvas.height;
    g.clearRect(0, 0, w, h);

    const isFainted = Boolean(member.fainted);
    const hpRatio = Math.max(0, Math.min(1, (member.hp || 0) / Math.max(1, member.maxHp || 100)));

    // Pill background
    g.fillStyle = isFainted ? 'rgba(69, 10, 10, 0.88)' : 'rgba(15, 23, 42, 0.82)';
    g.strokeStyle = isFainted ? '#f87171' : member.isHost ? '#fbbf24' : '#2dd4bf';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(8, 8, w - 16, h - 16, 14);
    g.fill();
    g.stroke();

    // Name & Level
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 22px "Noto Serif TC", system-ui, sans-serif';
    g.fillStyle = isFainted ? '#fca5a5' : '#fef08a';
    const rolePrefix = member.isHost ? '👑 ' : member.isAi ? '☸ ' : '🤝 ';
    const label = `${rolePrefix}[Lv.${member.level || 1}] ${member.name || 'Pilgrim'}`;
    g.fillText(label.slice(0, 22), w / 2, 30);

    // HP Bar track
    const barX = 28;
    const barY = 50;
    const barW = w - 56;
    const barH = 12;
    g.fillStyle = 'rgba(15, 23, 42, 0.95)';
    g.fillRect(barX, barY, barW, barH);

    // HP Bar fill
    g.fillStyle = isFainted ? '#ef4444' : hpRatio > 0.35 ? '#10b981' : '#f59e0b';
    g.fillRect(barX + 1, barY + 1, Math.max(0, (barW - 2) * hpRatio), barH - 2);

    // Fainted revive prompt or role subtitle
    if (isFainted) {
      g.font = 'bold 17px "Noto Serif TC", system-ui, sans-serif';
      g.fillStyle = '#fecaca';
      g.fillText(i18n.t('coop.nameplate.fainted'), w / 2, 76);
    } else {
      g.font = '15px "Noto Serif TC", system-ui, sans-serif';
      g.fillStyle = '#99f6e4';
      g.fillText(`${Math.round(member.hp || 0)} / ${Math.round(member.maxHp || 100)} HP`, w / 2, 76);
    }
  }

  function buildPilgrimActor(member) {
    const root = new THREE.Group();
    root.name = `RemotePilgrim_${member.id}`;

    const body = new THREE.Group();
    root.add(body);

    const look = member.look || {};
    const robeMat = new THREE.MeshStandardMaterial({
      color: look.robeColor || 0x881337,
      roughness: 0.72,
      metalness: 0.08,
    });
    const shawlMat = new THREE.MeshStandardMaterial({
      color: look.shawlColor || 0xf59e0b,
      roughness: 0.65,
      metalness: 0.1,
    });

    // 1. Lower Robe / Skirt + Golden Hem
    const skirtGeo = new THREE.CylinderGeometry(0.21, 0.32, 0.74, 12);
    skirtGeo.translate(0, 0.37, 0);
    const skirt = new THREE.Mesh(skirtGeo, robeMat);
    skirt.castShadow = true;
    body.add(skirt);

    const hemGeo = new THREE.CylinderGeometry(0.31, 0.325, 0.05, 12);
    hemGeo.translate(0, 0.06, 0);
    const hem = new THREE.Mesh(hemGeo, goldMat);
    body.add(hem);

    // 2. Torso Pivot + Saffron/Turquoise Shawl + Golden Chest Emblem + Mala Beads
    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 0.72, 0);
    body.add(torsoPivot);

    const torsoGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.52, 12);
    torsoGeo.translate(0, 0.26, 0);
    const torso = new THREE.Mesh(torsoGeo, robeMat);
    torso.castShadow = true;
    torsoPivot.add(torso);

    const shawlGeo = new THREE.CylinderGeometry(
      0.235,
      0.218,
      0.44,
      12,
      1,
      false,
      -0.4,
      Math.PI * 1.25,
    );
    shawlGeo.translate(0, 0.28, 0);
    const shawl = new THREE.Mesh(shawlGeo, shawlMat);
    torsoPivot.add(shawl);

    // Waist Sash
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.208, 0.028, 8, 16), goldMat);
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 0.03;
    torsoPivot.add(sash);

    // Golden Chest Dharma Emblem (Gau / Mirror)
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), goldMat);
    emblem.position.set(0, 0.34, -0.22);
    torsoPivot.add(emblem);

    // Prayer Beads (Mala garland around collar)
    const mala = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 6, 14), beadMat);
    mala.rotation.x = Math.PI * 0.42;
    mala.position.set(0, 0.48, -0.03);
    torsoPivot.add(mala);

    // 3. Head + Hat / Lotus Crown / Headband
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.56, 0);
    torsoPivot.add(headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), skinMat);
    head.position.y = 0.14;
    headGroup.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.162, 12, 10, 0, TWO_PI, 0, Math.PI * 0.58),
      hairMat,
    );
    hair.position.y = 0.15;
    hair.rotation.x = 0.35;
    headGroup.add(hair);

    const hatType = look.hatType || 'lotus';
    if (hatType === 'lotus') {
      const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.024, 8, 16), goldMat);
      crownRing.rotation.x = Math.PI / 2;
      crownRing.position.y = 0.25;
      headGroup.add(crownRing);

      const lotusTop = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 6), shawlMat);
      lotusTop.position.y = 0.34;
      headGroup.add(lotusTop);
    } else if (hatType === 'straw') {
      const brim = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.16, 14), goldMat);
      brim.position.y = 0.29;
      headGroup.add(brim);
    } else {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.022, 8, 16), shawlMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.21;
      headGroup.add(band);
    }

    // 4. Arms & Legs
    function makeArm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.24, 0.45, 0);
      const sleeveGeo = new THREE.CylinderGeometry(0.068, 0.055, 0.36, 8);
      sleeveGeo.translate(0, -0.18, 0);
      const sleeve = new THREE.Mesh(sleeveGeo, side < 0 ? shawlMat : robeMat);
      pivot.add(sleeve);
      torsoPivot.add(pivot);
      return pivot;
    }
    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);

    function makeLeg(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.1, 0.34, 0);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.2), bootMat);
      foot.position.set(0, -0.3, -0.03);
      pivot.add(foot);
      body.add(pivot);
      return pivot;
    }
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);

    // 5. Ground Lotus Ring under feet (0 PointLights, AdditiveBlending)
    const ringMat = new THREE.MeshBasicMaterial({
      color: look.auraColor || 0x2dd4bf,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const lotusRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.6, 28), ringMat);
    lotusRing.rotation.x = -Math.PI / 2;
    lotusRing.position.y = 0.03;
    root.add(lotusRing);

    // 6. Overhead Nameplate Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 96;
    drawNameplateCanvas(canvas, member);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const nameplate = new THREE.Sprite(spriteMat);
    nameplate.position.set(0, 2.25, 0);
    nameplate.scale.set(2.1, 0.63, 1);
    root.add(nameplate);

    root.position.set(member.x || 0, member.y || 0, member.z || 0);
    root.rotation.y = member.heading || 0;
    group.add(root);

    return {
      id: member.id,
      root,
      body,
      torsoPivot,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      robeMat,
      shawlMat,
      lotusRing,
      ringMat,
      nameplate,
      canvas,
      tex,
      walkPhase: Math.random() * TWO_PI,
      lastSignature: '',
      data: { ...member },
    };
  }

  // ---------------------------------------------------------------- Skill & Resonance VFX (0 PointLights)
  function spawnTeammateMantraWave(x, y, z, colorHex = 0xfbbf24, maxRadius = 6.0, duration = 0.7) {
    const ringGeo = new THREE.RingGeometry(0.35, 0.55, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.position.set(x, (y || 0) + 0.08, z);
    vfxGroup.add(mesh);

    activeVfx.push({
      mesh,
      mat: ringMat,
      geo: ringGeo,
      elapsed: 0,
      duration,
      maxScale: maxRadius / 0.5,
    });
  }

  function spawnResonanceMandalaVfx(payload) {
    const px = payload?.x ?? state.player?.position?.x ?? 0;
    const py = payload?.y ?? state.player?.position?.y ?? 0;
    const pz = payload?.z ?? state.player?.position?.z ?? 0;
    const tx = payload?.partnerX ?? px + 2.0;
    const tz = payload?.partnerZ ?? pz + 2.0;
    const midX = (px + tx) * 0.5;
    const midZ = (pz + tz) * 0.5;

    // Layer 1: Golden Outer Lotus Wave (expands to r = 12m)
    spawnTeammateMantraWave(midX, py, midZ, 0xfbbf24, 12.0, 1.05);
    // Layer 2: Turquoise Inner Mandala Wave (expands to r = 9.5m)
    spawnTeammateMantraWave(midX, py + 0.04, midZ, 0x2dd4bf, 9.5, 0.95);
    // Layer 3: Player & Partner harmonic rings
    spawnTeammateMantraWave(px, py + 0.06, pz, 0xfde047, 6.5, 0.75);
    spawnTeammateMantraWave(tx, py + 0.06, tz, 0x5eead4, 6.5, 0.75);
  }

  bus?.on('coop:remoteSkill', (payload) => {
    if (!payload) return;
    if (payload.skillId === 'mantra') {
      spawnTeammateMantraWave(payload.x || 0, payload.y || 0, payload.z || 0, 0xfbbf24, 6.0, 0.65);
    } else {
      spawnTeammateMantraWave(payload.x || 0, payload.y || 0, payload.z || 0, 0x38bdf8, 2.2, 0.35);
    }
  });

  bus?.on('coop:resonance', (payload) => {
    spawnResonanceMandalaVfx(payload);
  });

  bus?.on('coop:memberHurt', (payload) => {
    if (!payload) return;
    spawnTeammateMantraWave(payload.x || 0, payload.y || 0, payload.z || 0, 0xef4444, 1.35, 0.28);
  });

  // ---------------------------------------------------------------- Fainted Ally Revive Interactable
  const revivePosVec = new THREE.Vector3();
  function findNearestFaintedActor(maxDist = 2.8) {
    const pPos = state.player?.position;
    if (!pPos) return null;
    let best = null;
    let bestD = maxDist;
    for (const actor of actors.values()) {
      if (!actor.root.visible || !actor.data?.fainted) continue;
      const d = Math.hypot(pPos.x - actor.root.position.x, pPos.z - actor.root.position.z);
      if (d <= bestD) {
        bestD = d;
        best = actor;
      }
    }
    return best;
  }

  if (Array.isArray(ctx.interactables)) {
    ctx.interactables.push({
      id: 'coop-revive-teammate',
      kind: 'coopRevive',
      action: 'interact',
      labelKey: 'coop.prompt.revive',
      radius: 2.8,
      getLabel() {
        const target = findNearestFaintedActor(2.8);
        return i18n.t('coop.prompt.revive', { name: target?.data?.name || 'Pilgrim' });
      },
      getPosition() {
        const target = findNearestFaintedActor(12.0);
        if (target) {
          revivePosVec.copy(target.root.position);
        } else {
          revivePosVec.set(99999, 0, 99999);
        }
        return revivePosVec;
      },
      isAvailable() {
        return !state.uiOpen && Boolean(findNearestFaintedActor(2.8));
      },
      onInteract() {
        const target = findNearestFaintedActor(2.8);
        if (!target) return false;
        return Boolean(ctx.coop?.reviveMember?.(target.id));
      },
    });
  }

  // ---------------------------------------------------------------- Frame Update
  function update(dt) {
    const members = ctx.coop?.getMembers?.() || [];
    const activeIds = new Set();

    for (const m of members) {
      activeIds.add(m.id);
      let actor = actors.get(m.id);
      if (!actor) {
        actor = buildPilgrimActor(m);
        actors.set(m.id, actor);
      }

      actor.data = m;
      const inSameZone = (m.zone || 'stupa') === state.zone;
      actor.root.visible = inSameZone;
      if (!inSameZone) continue;

      // Smoothly interpolate position & heading
      const lerpFactor = Math.min(1, dt * 10);
      const targetY =
        ctx.world?.getHeight && m.zone === state.zone
          ? ctx.world.getHeight(m.x, m.z)
          : m.y || 0;
      const moveDist = Math.hypot(m.x - actor.root.position.x, m.z - actor.root.position.z);
      if (moveDist > 20) {
        actor.root.position.set(m.x, targetY, m.z);
      } else {
        actor.root.position.x += (m.x - actor.root.position.x) * lerpFactor;
        actor.root.position.y += (targetY - actor.root.position.y) * lerpFactor;
        actor.root.position.z += (m.z - actor.root.position.z) * lerpFactor;
      }
      actor.root.rotation.y = lerpAngle(actor.root.rotation.y, m.heading || 0, Math.min(1, dt * 12));

      // Hurt emissive flash on robe & shawl
      if (m.hurt && !m.fainted) {
        actor.robeMat?.emissive?.setHex(0xef4444);
        if (actor.robeMat) actor.robeMat.emissiveIntensity = 0.75;
        actor.shawlMat?.emissive?.setHex(0xfca5a5);
        if (actor.shawlMat) actor.shawlMat.emissiveIntensity = 0.6;
      } else {
        actor.robeMat?.emissive?.setHex(0x000000);
        if (actor.robeMat) actor.robeMat.emissiveIntensity = 0;
        actor.shawlMat?.emissive?.setHex(0x000000);
        if (actor.shawlMat) actor.shawlMat.emissiveIntensity = 0;
      }

      // Limb & posture animation
      const isMoving = m.action === 'walk' || m.action === 'run' || moveDist > 0.04;
      if (m.fainted) {
        actor.body.rotation.x = Math.PI * 0.46;
        actor.body.position.y = 0.12;
        actor.ringMat.color.setHex(0xef4444);
        actor.ringMat.opacity = 0.55 + Math.sin((state.elapsed || 0) * 5) * 0.25;
      } else if (m.action === 'prostrate') {
        actor.body.rotation.x = Math.PI * 0.42;
        actor.body.position.y = 0.15;
        actor.ringMat.color.setHex(0xfbbf24);
        actor.ringMat.opacity = 0.75;
      } else {
        actor.body.rotation.x = m.hurt ? -0.18 : 0;
        actor.ringMat.color.setHex(m.hurt ? 0xf87171 : m.look?.auraColor || 0x2dd4bf);
        actor.ringMat.opacity = 0.55 + Math.sin((state.elapsed || 0) * 2.5) * 0.15;

        if (isMoving) {
          const speed = m.action === 'run' ? 10 : 6.5;
          actor.walkPhase += dt * speed;
          const swing = Math.sin(actor.walkPhase) * 0.48;
          actor.leftArm.rotation.x = swing;
          actor.rightArm.rotation.x = -swing;
          actor.leftLeg.rotation.x = -swing * 0.8;
          actor.rightLeg.rotation.x = swing * 0.8;
          actor.body.position.y = Math.abs(Math.sin(actor.walkPhase)) * 0.05;
        } else {
          actor.leftArm.rotation.x *= 0.85;
          actor.rightArm.rotation.x *= 0.85;
          actor.leftLeg.rotation.x *= 0.85;
          actor.rightLeg.rotation.x *= 0.85;
          actor.body.position.y = 0;
        }
      }

      // Redraw overhead nameplate only when values change
      const sig = `${i18n.lang}|${m.name}|${m.level}|${Math.round(m.hp)}|${Math.round(m.maxHp)}|${m.fainted}|${m.isHost}`;
      if (sig !== actor.lastSignature) {
        actor.lastSignature = sig;
        drawNameplateCanvas(actor.canvas, m);
        actor.tex.needsUpdate = true;
      }
    }

    // Remove actors who left the party
    for (const [id, actor] of actors.entries()) {
      if (!activeIds.has(id)) {
        group.remove(actor.root);
        actor.tex?.dispose?.();
        actor.nameplate?.material?.dispose?.();
        actors.delete(id);
      }
    }

    // Update active Resonance & Skill VFX rings
    for (let i = activeVfx.length - 1; i >= 0; i--) {
      const v = activeVfx[i];
      v.elapsed += dt;
      const t = Math.min(1, v.elapsed / v.duration);
      const scale = 1 + (v.maxScale - 1) * t;
      v.mesh.scale.setScalar(scale);
      v.mat.opacity = 0.9 * (1 - t);
      if (t >= 1) {
        vfxGroup.remove(v.mesh);
        v.geo.dispose();
        v.mat.dispose();
        activeVfx.splice(i, 1);
      }
    }
  }

  function getMeshes() {
    return Array.from(actors.values())
      .filter((a) => a.root.visible)
      .map((a) => ({
        id: a.id,
        name: a.data?.name,
        zone: a.data?.zone,
        fainted: Boolean(a.data?.fainted),
        x: Number(a.root.position.x.toFixed(2)),
        y: Number(a.root.position.y.toFixed(2)),
        z: Number(a.root.position.z.toFixed(2)),
        mesh: a.root,
      }));
  }

  const api = {
    update,
    getMeshes,
    getCount: () => getMeshes().length,
    spawnResonanceMandalaVfx,
  };

  ctx.remotePilgrims = api;
  ctx.debug?.register?.('remotePilgrims', api);
  if (typeof window !== 'undefined') {
    window.__stupa = window.__stupa || {};
    window.__stupa.remotePilgrims = api;
  }

  return api;
}

export default createRemotePilgrims;
