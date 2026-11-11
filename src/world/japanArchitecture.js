import * as THREE from 'three';

export function buildJapanWaypoint(unlocked) {
  const group = new THREE.Group();
  group.name = 'JapanStoneWaypoint';
  const stone = new THREE.MeshStandardMaterial({ color: 0x7c8078, roughness: 0.94 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x5b6d58, roughness: 0.92 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xeed1a2, emissive: 0xcc681b });
  const ring = new THREE.MeshBasicMaterial({ color: 0xc68c42, transparent: true, depthWrite: false });
  function add(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = material !== ring;
    mesh.receiveShadow = material !== ring;
    group.add(mesh);
    return mesh;
  }
  add(new THREE.CylinderGeometry(0.88, 1.03, 0.23, 8), stone, 0, 0.115, 0);
  add(new THREE.CylinderGeometry(0.24, 0.38, 1.04, 8), stone, 0, 0.75, 0);
  add(new THREE.BoxGeometry(1.0, 0.15, 1.0), stone, 0, 1.34, 0);
  add(new THREE.BoxGeometry(0.61, 0.52, 0.61), paper, 0, 1.64, 0);
  for (const x of [-0.34, 0.34]) {
    for (const z of [-0.34, 0.34]) add(new THREE.BoxGeometry(0.13, 0.56, 0.13), stone, x, 1.65, z);
  }
  add(new THREE.ConeGeometry(0.82, 0.59, 4), roof, 0, 2.12, 0).rotation.y = Math.PI / 4;
  add(new THREE.DodecahedronGeometry(0.14), stone, 0, 2.48, 0);
  const glowRing = add(new THREE.RingGeometry(1.08, 1.15, 32), ring, 0, 0.025, 0);
  glowRing.rotation.x = -Math.PI / 2;
  group.userData = { unlocked, paper, ring };
  setJapanWaypointUnlocked(group, unlocked);
  return group;
}

export function setJapanWaypointUnlocked(group, unlocked) {
  group.userData.paper.emissiveIntensity = unlocked ? 1.3 : 0.18;
  group.userData.ring.opacity = unlocked ? 0.7 : 0.17;
}

// Compact timber route gate used beside the original Tō-ji and Kōya landmarks.
export function addJapanRouteGate(parent, x, y, z) {
  const gate = new THREE.Group();
  gate.name = 'JapanPilgrimageRouteGate';
  gate.position.set(x, y, z);
  const wood = new THREE.MeshStandardMaterial({ color: 0x933d30, roughness: 0.89 });
  const tile = new THREE.MeshStandardMaterial({ color: 0x363d45, roughness: 0.88 });
  function add(geometry, material, dx, dy) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(dx, dy, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    gate.add(mesh);
  }
  for (const dx of [-2.05, 2.05]) {
    add(new THREE.CylinderGeometry(0.23, 0.28, 3.8, 9), wood, dx, 1.9);
    add(new THREE.CylinderGeometry(0.36, 0.41, 0.26, 9), tile, dx, 0.13);
  }
  add(new THREE.BoxGeometry(4.8, 0.27, 0.55), wood, 0, 3.30);
  add(new THREE.BoxGeometry(5.3, 0.36, 1.04), tile, 0, 3.91);
  add(new THREE.BoxGeometry(5.55, 0.18, 0.36), tile, 0, 4.15);
  parent.add(gate);
}
