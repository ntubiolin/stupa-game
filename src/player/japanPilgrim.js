/** White pilgrimage jacket, indigo stole, woven sedge hat, and ringed staff. */
export function createJapanPilgrim(THREE, { body, torso, head, leftArm, rightArm }) {
  const cloth = new THREE.MeshStandardMaterial({ color: 0xf3e9d3, roughness: 0.93 });
  const indigo = new THREE.MeshStandardMaterial({ color: 0x233b5b, roughness: 0.9 });
  const straw = new THREE.MeshStandardMaterial({ color: 0xcfa86e, roughness: 1 });
  const paleStraw = new THREE.MeshStandardMaterial({ color: 0xf0cd92, roughness: 1 });
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x643b27, roughness: 0.7 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xd7aa52, metalness: 0.4, roughness: 0.48 });
  const vermilion = new THREE.MeshStandardMaterial({ color: 0xa13b27, roughness: 0.81 });

  const parts = [];
  function mount(parent, name) {
    const group = new THREE.Group();
    group.name = name;
    parent.add(group);
    parts.push(group);
    return group;
  }
  function mesh(parent, geometry, material, x, y, z) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = true;
    parent.add(part);
    return part;
  }

  const skirt = mount(body, 'PilgrimageHakama');
  const trouser = new THREE.CylinderGeometry(0.18, 0.13, 0.58, 8);
  for (const x of [-0.13, 0.13]) mesh(skirt, trouser, indigo, x, 0.36, 0);

  const jacket = mount(torso, 'PilgrimageJacket');
  mesh(jacket, new THREE.CylinderGeometry(0.245, 0.224, 0.58, 12), cloth, 0, 0.25, 0);
  mesh(jacket, new THREE.CylinderGeometry(0.225, 0.284, 0.28, 12), cloth, 0, -0.13, 0);
  mesh(jacket, new THREE.CylinderGeometry(0.244, 0.248, 0.087, 12), indigo, 0, 0.02, 0);
  const stole = new THREE.BoxGeometry(0.074, 0.43, 0.022);
  for (const side of [-1, 1]) {
    mesh(jacket, stole, indigo, side * 0.086, 0.27, -0.226).rotation.z = side * 0.39;
  }
  mesh(jacket, new THREE.BoxGeometry(0.24, 0.25, 0.094), vermilion, 0, 0.23, 0.234);
  const crest = mesh(jacket, new THREE.TorusGeometry(0.072, 0.012, 6, 18), bronze, 0, 0.24, 0.283);
  crest.rotation.z = Math.PI / 8;
  const bead = new THREE.SphereGeometry(0.025, 6, 5);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 8) * Math.PI;
    mesh(jacket, bead, lacquer, Math.cos(angle) * 0.125, 0.46 - Math.sin(angle) * 0.19, -0.249);
  }

  const hat = mount(head, 'Sugegasa');
  mesh(hat, new THREE.CylinderGeometry(0.055, 0.385, 0.145, 24), straw, 0, 0.32, 0);
  const brim = mesh(hat, new THREE.TorusGeometry(0.376, 0.016, 5, 24), paleStraw, 0, 0.251, 0);
  brim.rotation.x = Math.PI / 2;
  const rib = new THREE.CylinderGeometry(0.006, 0.006, 0.35, 5);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const ridge = mesh(hat, rib, paleStraw, Math.sin(angle) * 0.207, 0.328, Math.cos(angle) * 0.207);
    ridge.rotation.y = angle;
    ridge.rotation.x = Math.PI * 0.37;
  }

  const sleeve = new THREE.CylinderGeometry(0.098, 0.119, 0.285, 9);
  for (const arm of [leftArm, rightArm]) {
    const part = mount(arm.pivot, 'PilgrimageSleeve');
    mesh(part, sleeve, cloth, 0, -0.146, 0);
  }

  const staff = mount(rightArm.hand, 'Shakujo');
  staff.rotation.x = -0.18;
  mesh(staff, new THREE.CylinderGeometry(0.018, 0.024, 1.39, 8), lacquer, 0, 0.16, -0.074);
  const headRing = mesh(staff, new THREE.TorusGeometry(0.097, 0.018, 6, 16), bronze, 0, 0.924, -0.074);
  headRing.scale.y = 1.31;
  const ring = new THREE.TorusGeometry(0.033, 0.009, 5, 9);
  for (const x of [-0.077, 0.077]) {
    mesh(staff, ring, bronze, x, 0.875, -0.074).rotation.y = 0.5;
  }

  return parts;
}
