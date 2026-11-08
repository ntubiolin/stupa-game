import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRemotePilgrims } from '../src/gameplay/remotePilgrims.js';

function createEventBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    emit(event, payload) {
      for (const fn of listeners.get(event) || []) {
        fn(payload);
      }
    },
  };
}

function createTestContext(members) {
  const scene = new THREE.Scene();
  const bus = createEventBus();
  const state = {
    zone: 'stupa',
    elapsed: 1.0,
    uiOpen: false,
    player: {
      position: new THREE.Vector3(0, 0, 0),
    },
  };
  const ctx = {
    scene,
    state,
    bus,
    interactables: [],
    coop: {
      getAllVisiblePilgrims: () => members,
      getMembers: () => members,
    },
  };
  return ctx;
}

const AI_COMPANION_MEMBERS = [
  {
    id: 'ai_tashi_0',
    name: '蓮華行者・扎西',
    level: 5,
    hp: 120,
    maxHp: 120,
    x: -2,
    y: 0,
    z: 3,
    heading: 0,
    zone: 'stupa',
    action: 'idle',
    isAi: true,
    look: {
      robeColor: 0x881337,
      shawlColor: 0xf59e0b,
      hatType: 'lotus',
      auraColor: 0xfbbf24,
    },
  },
  {
    id: 'ai_dolma_1',
    name: '普巴行者・卓瑪',
    level: 6,
    hp: 130,
    maxHp: 130,
    x: 0,
    y: 0,
    z: 3,
    heading: 0,
    zone: 'stupa',
    action: 'idle',
    isAi: true,
    look: {
      robeColor: 0x1e3a8a,
      shawlColor: 0x2dd4bf,
      hatType: 'headband',
      auraColor: 0x2dd4bf,
    },
  },
  {
    id: 'ai_kunga_2',
    name: '金剛行者・貢噶',
    level: 7,
    hp: 140,
    maxHp: 140,
    x: 2,
    y: 0,
    z: 3,
    heading: 0,
    zone: 'stupa',
    action: 'idle',
    isAi: true,
    look: {
      robeColor: 0x7c2d12,
      shawlColor: 0xfde047,
      hatType: 'straw',
      auraColor: 0xf97316,
    },
  },
];

test('Issue #189: all 3 AI companion presets build visible forearm and hand meshes with 0 PointLights', () => {
  const members = AI_COMPANION_MEMBERS.map((m) => ({ ...m, look: { ...m.look } }));
  const ctx = createTestContext(members);
  const remotePilgrims = createRemotePilgrims(ctx);

  remotePilgrims.update(0.016);
  assert.equal(remotePilgrims.getCount(), 3);

  let pointLightCount = 0;
  ctx.scene.traverse((obj) => {
    if (obj.isPointLight) pointLightCount += 1;
  });
  assert.equal(pointLightCount, 0, 'Strictly 0 PointLights allowed in remotePilgrims');

  for (const m of members) {
    const actor = remotePilgrims.getActor(m.id);
    assert.ok(actor, `Actor should exist for ${m.id}`);
    assert.ok(actor.leftForearm, `actor.leftForearm should exist for ${m.id}`);
    assert.ok(actor.rightForearm, `actor.rightForearm should exist for ${m.id}`);
    assert.ok(actor.leftHand, `actor.leftHand should exist for ${m.id}`);
    assert.ok(actor.rightHand, `actor.rightHand should exist for ${m.id}`);

    const leftForearmMesh = actor.root.getObjectByName('LeftForearm');
    const rightForearmMesh = actor.root.getObjectByName('RightForearm');
    const leftHandMesh = actor.root.getObjectByName('LeftHand');
    const rightHandMesh = actor.root.getObjectByName('RightHand');

    assert.ok(leftForearmMesh?.isMesh, 'LeftForearm mesh must exist in hierarchy');
    assert.ok(rightForearmMesh?.isMesh, 'RightForearm mesh must exist in hierarchy');
    assert.ok(leftHandMesh?.isMesh, 'LeftHand mesh must exist in hierarchy');
    assert.ok(rightHandMesh?.isMesh, 'RightHand mesh must exist in hierarchy');

    for (const part of [leftForearmMesh, rightForearmMesh, leftHandMesh, rightHandMesh]) {
      assert.equal(part.visible, true);
      assert.equal(part.material.color.getHex(), 0xd9a17c, 'Forearm and hand must use skinMat color');
    }

    // Check world/actor-local positions in idle so hands are outside torso/skirt radius (|x| > 0.22)
    actor.root.updateMatrixWorld(true);
    const leftHandWorld = new THREE.Vector3();
    const rightHandWorld = new THREE.Vector3();
    leftHandMesh.getWorldPosition(leftHandWorld);
    rightHandMesh.getWorldPosition(rightHandWorld);

    const leftLocalToActor = actor.root.worldToLocal(leftHandWorld.clone());
    const rightLocalToActor = actor.root.worldToLocal(rightHandWorld.clone());

    assert.ok(
      Math.abs(leftLocalToActor.x) > 0.22,
      `LeftHand |x| (${Math.abs(leftLocalToActor.x).toFixed(3)}) must be > 0.22 outside robe in idle`,
    );
    assert.ok(
      Math.abs(rightLocalToActor.x) > 0.22,
      `RightHand |x| (${Math.abs(rightLocalToActor.x).toFixed(3)}) must be > 0.22 outside robe in idle`,
    );
    assert.ok(leftLocalToActor.x < -0.22, 'LeftHand should be on negative X side of actor');
    assert.ok(rightLocalToActor.x > 0.22, 'RightHand should be on positive X side of actor');
  }
});

test('Issue #189: arm and forearm rotations update across idle, walk, run, prostrate, fainted, and coop:remoteSkill', () => {
  const member = {
    ...AI_COMPANION_MEMBERS[0],
    id: 'ai_pose_test',
    x: 0,
    y: 0,
    z: 0,
    action: 'idle',
    fainted: false,
  };
  const ctx = createTestContext([member]);
  const remotePilgrims = createRemotePilgrims(ctx);

  // 1. Idle posture
  remotePilgrims.update(0.05);
  const actor = remotePilgrims.getActor(member.id);
  assert.ok(Math.abs(actor.leftArm.rotation.z - -0.09) < 1e-5);
  assert.ok(Math.abs(actor.rightArm.rotation.z - 0.09) < 1e-5);
  assert.ok(Math.abs(actor.leftForearm.rotation.x - 0.22) < 1e-5);
  assert.ok(Math.abs(actor.rightForearm.rotation.x - 0.22) < 1e-5);

  // 2. Walk posture
  member.action = 'walk';
  actor.walkPhase = 0;
  remotePilgrims.update(0.1);
  assert.notEqual(actor.leftArm.rotation.x, 0, 'Left arm should swing during walk');
  assert.equal(actor.leftArm.rotation.x, -actor.rightArm.rotation.x);
  assert.ok(actor.leftForearm.rotation.x >= 0.28, 'Left forearm should bend during walk');
  assert.ok(actor.rightForearm.rotation.x >= 0.28, 'Right forearm should bend during walk');

  // 3. Run posture
  member.action = 'run';
  const prevPhase = actor.walkPhase;
  remotePilgrims.update(0.1);
  assert.ok(actor.walkPhase > prevPhase + 0.9, 'Run should advance walkPhase faster than walk');
  assert.ok(actor.leftForearm.rotation.x >= 0.28);

  // 4. Prostrate posture
  member.action = 'prostrate';
  remotePilgrims.update(0.05);
  assert.ok(Math.abs(actor.leftArm.rotation.x - 2.4) < 1e-5);
  assert.ok(Math.abs(actor.rightArm.rotation.x - 2.4) < 1e-5);
  assert.ok(Math.abs(actor.leftForearm.rotation.x - 0.2) < 1e-5);
  assert.ok(Math.abs(actor.rightForearm.rotation.x - 0.2) < 1e-5);

  // 5. Fainted posture
  member.action = 'idle';
  member.fainted = true;
  remotePilgrims.update(0.05);
  assert.ok(Math.abs(actor.leftArm.rotation.x - 0.2) < 1e-5);
  assert.ok(Math.abs(actor.leftArm.rotation.z - -0.25) < 1e-5);
  assert.ok(Math.abs(actor.rightArm.rotation.z - 0.25) < 1e-5);
  assert.ok(Math.abs(actor.leftForearm.rotation.x - 0.15) < 1e-5);
  assert.ok(Math.abs(actor.rightForearm.rotation.x - 0.15) < 1e-5);

  // 6. Combat / casting posture via coop:remoteSkill event
  member.fainted = false;
  member.action = 'idle';
  ctx.bus.emit('coop:remoteSkill', {
    peerId: member.id,
    skillId: 'mantra',
    x: 0,
    y: 0,
    z: 0,
  });
  assert.equal(actor.castTimer, 0.55);
  remotePilgrims.update(0.05);
  assert.ok(actor.castTimer > 0);
  assert.ok(Math.abs(actor.leftArm.rotation.x - 0.75) < 1e-5);
  assert.ok(Math.abs(actor.rightArm.rotation.x - 1.15) < 1e-5);
  assert.ok(Math.abs(actor.leftForearm.rotation.x - 0.95) < 1e-5);
  assert.ok(Math.abs(actor.rightForearm.rotation.x - 0.35) < 1e-5);

  // After castTimer expires, returns to idle posture
  remotePilgrims.update(0.6);
  assert.equal(actor.castTimer, 0);
  assert.ok(Math.abs(actor.leftArm.rotation.z - -0.09) < 1e-5);
  assert.ok(Math.abs(actor.leftForearm.rotation.x - 0.22) < 1e-5);
});
