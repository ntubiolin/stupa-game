import * as THREE from 'three';

function glow(color, opacity = 0.88) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  });
}

function halo(parent, radius, thickness, color, segments = 40, y = 0.04) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(radius - thickness, radius, segments), glow(color));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  parent.add(mesh);
  return mesh;
}

export function disposeSkillVisual(object) {
  object.removeFromParent();
  const geometries = new Set();
  const materials = new Set();
  object.traverse((part) => {
    if (part.geometry) geometries.add(part.geometry);
    if (part.material) materials.add(part.material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    material.map?.dispose();
    material.dispose();
  }
}

export function makeSankosho() {
  const vajra = new THREE.Group();
  vajra.name = 'SankoshoProjectile';
  const gold = glow(0xffca63);
  const center = new THREE.Mesh(new THREE.IcosahedronGeometry(0.135, 0), glow(0xfffbdf));
  vajra.add(center);

  const prongGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.065),
    new THREE.Vector3(0.15, 0, 0.19),
    new THREE.Vector3(0.16, 0, 0.33),
    new THREE.Vector3(0.01, 0, 0.49),
  ]), 10, 0.022, 5, false);
  for (const side of [-1, 1]) {
    const crown = new THREE.Group();
    if (side === -1) crown.rotation.y = Math.PI;
    for (let i = 0; i < 3; i++) {
      const prong = new THREE.Mesh(prongGeometry, gold);
      prong.rotation.z = i * Math.PI * 2 / 3;
      crown.add(prong);
    }
    vajra.add(crown);
  }
  return vajra;
}

export function makeFudoSword() {
  const sword = new THREE.Group();
  sword.name = 'FudoFlameSword';
  const flame = new THREE.Shape();
  flame.moveTo(-0.13, 0.38);
  flame.quadraticCurveTo(-0.46, -0.04, -0.13, -0.76);
  flame.quadraticCurveTo(-0.21, -0.37, 0.12, -0.56);
  flame.quadraticCurveTo(0.46, -0.05, 0.15, 0.42);
  flame.quadraticCurveTo(0.02, 0.58, -0.13, 0.38);
  const flameGeometry = new THREE.ShapeGeometry(flame);
  flameGeometry.rotateX(Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const tongue = new THREE.Mesh(flameGeometry, glow(i === 0 ? 0xff7440 : 0xff4024, 0.7));
    tongue.rotation.z = i * Math.PI / 3;
    sword.add(tongue);
  }
  const blade = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), glow(0xffe2a2));
  blade.scale.set(0.078, 0.075, 0.62);
  blade.position.z = -0.19;
  sword.add(blade);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.085, 0.07), glow(0xfdac48));
  guard.position.z = 0.32;
  sword.add(guard);
  return sword;
}

export function makeKomyoMandala() {
  const mandala = new THREE.Group();
  mandala.name = 'KomyoShingonMandala';
  halo(mandala, 1, 0.027, 0xfde498);
  halo(mandala, 0.82, 0.016, 0xffaf5a, 8);
  halo(mandala, 0.24, 0.022, 0xffeeae);
  const petal = new THREE.Shape();
  petal.moveTo(0, 0.13);
  petal.quadraticCurveTo(0.27, 0.43, 0, 0.76);
  petal.quadraticCurveTo(-0.27, 0.43, 0, 0.13);
  const petalGeo = new THREE.ShapeGeometry(petal);
  petalGeo.rotateX(-Math.PI / 2);
  const petalMat = glow(0xe76b45, 0.53);
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(petalGeo, petalMat);
    mesh.rotation.y = i * Math.PI / 4;
    mesh.position.y = 0.038;
    mandala.add(mesh);
  }
  return mandala;
}

const GORIN_COLORS = [0xf9ca71, 0xf5e9d7, 0xec6444, 0x80ddbc, 0xa69af5];

export function makeGorinWave(halfAngle) {
  const wave = new THREE.Group();
  wave.name = 'GorinResonance';
  for (let i = 0; i < GORIN_COLORS.length; i++) {
    const radius = 1 - i * 0.135;
    const geometry = new THREE.RingGeometry(radius - 0.031, radius, 28, 1, -halfAngle + Math.PI / 2, 2 * halfAngle);
    const arc = new THREE.Mesh(geometry, glow(GORIN_COLORS[i]));
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = 0.035 + i * 0.004;
    wave.add(arc);
  }
  return wave;
}

export function makeAjikanWard() {
  const ward = new THREE.Group();
  ward.name = 'AjikanMoonWard';
  const lattice = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.17, 1),
    new THREE.MeshBasicMaterial({ color: 0x92cff7, wireframe: true, transparent: true, opacity: 0.52, depthWrite: false }),
  );
  lattice.position.y = 1;
  ward.add(lattice);
  halo(ward, 1.16, 0.057, 0xc6e7ff, 36, 0.18);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 10), glow(0xe1f3ff));
  moon.position.y = 2.36;
  ward.add(moon);
  return ward;
}

export function makeDiamondRealm() {
  const realm = new THREE.Group();
  realm.name = 'DiamondRealmMandala';
  halo(realm, 1, 0.016, 0xffdc84);
  const outerSquare = halo(realm, 0.95, 0.03, 0xffc75f, 4, 0.05);
  outerSquare.rotation.z = Math.PI / 4;
  const grid = new THREE.BoxGeometry(0.016, 0.016, 1.34);
  const gridMat = glow(0xf5b554);
  for (const offset of [-0.226, 0.226]) {
    const longitudinal = new THREE.Mesh(grid, gridMat);
    longitudinal.position.set(offset, 0.05, 0);
    realm.add(longitudinal);
    const lateral = new THREE.Mesh(grid, gridMat);
    lateral.rotation.y = Math.PI / 2;
    lateral.position.set(0, 0.05, offset);
    realm.add(lateral);
  }
  for (const x of [-0.448, 0, 0.448]) {
    for (const z of [-0.448, 0, 0.448]) {
      const palace = halo(realm, 0.16, 0.02, x === 0 && z === 0 ? 0xfff1b8 : 0xf28a64, 12, 0.066);
      palace.position.set(x, 0.066, z);
      const diamond = halo(realm, 0.085, 0.02, 0xffcb63, 4, 0.076);
      diamond.position.set(x, 0.076, z);
    }
  }
  return realm;
}
