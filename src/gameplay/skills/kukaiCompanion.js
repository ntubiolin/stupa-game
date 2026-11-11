import * as THREE from 'three';
import { disposeSkillVisual, makeSankosho } from './japanSkillVisuals.js';

function makeKukai() {
  const root = new THREE.Group();
  root.name = 'KukaiCompanion';
  const body = new THREE.Group();
  root.add(body);
  const robe = new THREE.MeshBasicMaterial({ color: 0xb64b30, opacity: 0.86, transparent: true });
  const kesa = new THREE.MeshBasicMaterial({ color: 0xffbd6e, opacity: 0.9, transparent: true });
  const light = new THREE.MeshBasicMaterial({ color: 0xffedc1, opacity: 0.94, transparent: true });
  const umber = new THREE.MeshBasicMaterial({ color: 0x78442c });

  function mesh(geometry, material, x, y, z) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    body.add(part);
    return part;
  }

  mesh(new THREE.CylinderGeometry(0.17, 0.31, 0.86, 14), robe, 0, 0.64, 0);
  mesh(new THREE.CylinderGeometry(0.219, 0.19, 0.49, 14), robe, 0, 1.23, 0);
  const drape = mesh(new THREE.BoxGeometry(0.11, 0.61, 0.045), kesa, 0, 1.19, -0.192);
  drape.rotation.z = 0.62;
  const shoulder = mesh(new THREE.CylinderGeometry(0.205, 0.199, 0.29, 14, 1, true, -0.4, Math.PI), kesa, -0.022, 1.29, 0.001);
  shoulder.rotation.z = -0.33;
  const sleeve = new THREE.CylinderGeometry(0.083, 0.105, 0.37, 9);
  const hand = new THREE.SphereGeometry(0.047, 8, 6);
  for (const side of [-1, 1]) {
    mesh(sleeve, robe, side * 0.246, 1.19, -0.033).rotation.x = 0.62;
    mesh(hand, light, side * 0.234, 1.08, -0.18);
  }

  const vajra = makeSankosho();
  vajra.name = 'KukaiVajra';
  vajra.scale.setScalar(0.37);
  vajra.position.set(-0.237, 1.098, -0.2);
  vajra.rotation.set(-0.42, 0, Math.PI / 2);
  body.add(vajra);

  const beads = new THREE.SphereGeometry(0.017, 6, 6);
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI * 2 / 10;
    mesh(beads, umber, 0.236 + Math.cos(angle) * 0.065, 1.005 + Math.sin(angle) * 0.09, -0.19);
  }
  mesh(new THREE.SphereGeometry(0.145, 15, 12), light, 0, 1.59, 0);
  const eyes = new THREE.SphereGeometry(0.011, 6, 6);
  for (const x of [-0.048, 0.048]) mesh(eyes, umber, x, 1.596, -0.135);

  const foot = new THREE.BoxGeometry(0.093, 0.071, 0.177);
  const feet = [-0.106, 0.106].map((x) => mesh(foot, light, x, 0.116, -0.037));
  const nimbus = mesh(new THREE.TorusGeometry(0.248, 0.022, 7, 40), light, 0, 1.61, 0.13);
  nimbus.material = new THREE.MeshBasicMaterial({ color: 0xffdc92, toneMapped: false });
  const aura = new THREE.Mesh(
    new THREE.RingGeometry(0.43, 0.48, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd589, side: THREE.DoubleSide, transparent: true, depthWrite: false })
  );
  aura.position.y = 0.056;
  aura.rotation.x = -Math.PI / 2;
  root.add(aura);
  return { root, body, feet, aura };
}

export function createKukaiCompanion(ctx, effectGroup, showHealingWave) {
  const { state, bus } = ctx;
  const destination = new THREE.Vector3();
  let companion = null;

  function getPosition() {
    const player = state.player;
    const yaw = player.heading || 0;
    destination.set(
      player.position.x + Math.cos(yaw) * 1.52 + Math.sin(yaw) * 1.24,
      player.position.y,
      player.position.z - Math.sin(yaw) * 1.52 + Math.cos(yaw) * 1.24
    );
    destination.y = ctx.world?.getHeight?.(destination.x, destination.z) ?? player.position.y;
    return destination;
  }

  function dismiss() {
    if (!companion) return;
    disposeSkillVisual(companion.root);
    companion = null;
    ctx.vitals?.removeBuff?.('dogyoNinin');
  }

  function heal(remaining) {
    if (state.player.hp <= 0 || state.player.action === 'faint') return;
    const hp = Math.max(1, Math.round(state.player.maxHp * companion.healPct));
    bus?.emit('vitals:restore', { hp, source: 'dogyoNinin' });
    if (remaining > 0) showHealingWave(companion.root.position);
  }

  function summon({ duration = 12, healingPct = 0.02, enh } = {}) {
    dismiss();
    companion = {
      ...makeKukai(),
      duration,
      remaining: duration,
      healPct: healingPct * (enh === 'a' ? 1.5 : 1),
      healTimer: 2,
      walkPhase: 0,
    };
    companion.root.position.copy(getPosition());
    companion.root.rotation.y = state.player.heading || 0;
    effectGroup.add(companion.root);
    ctx.vitals?.addBuff?.('dogyoNinin', { dmgTakenMult: enh === 'b' ? 0.75 : 0.9 }, duration);
    heal(duration);
    bus?.emit('sfx', { name: 'summon' });
  }

  function update(dt) {
    if (!companion) return;
    const { root, body, feet, aura } = companion;
    companion.remaining -= dt;
    if (companion.remaining <= 0 || state.player.action === 'faint') {
      dismiss();
      return;
    }

    const target = getPosition();
    const dx = target.x - root.position.x;
    const dz = target.z - root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.07) {
      root.rotation.y = Math.atan2(-dx, -dz);
      const travel = Math.min(distance, dt * (5.5 + Math.max(0, distance - 1.5)));
      root.position.x += (dx / distance) * travel;
      root.position.z += (dz / distance) * travel;
      companion.walkPhase += travel * 6;
      const stride = Math.sin(companion.walkPhase) * 0.085;
      feet[0].position.z = -0.037 - stride;
      feet[1].position.z = -0.037 + stride;
      body.position.y = Math.abs(stride) * 0.26;
    } else {
      body.position.y = 0;
      for (const foot of feet) foot.position.z = -0.037;
    }
    root.position.y = ctx.world?.getHeight?.(root.position.x, root.position.z) ?? target.y;
    aura.scale.setScalar(1 + Math.sin(companion.remaining * Math.PI) * 0.15);
    aura.material.opacity = Math.min(0.95, companion.remaining);

    companion.healTimer -= dt;
    while (companion.healTimer <= 0) {
      companion.healTimer += 2;
      heal(companion.remaining);
    }
  }

  function getState() {
    return companion && {
      id: 'kukai',
      remaining: companion.remaining,
      duration: companion.duration,
      position: companion.root.position.toArray(),
    };
  }

  return { summon, dismiss, update, getState };
}
