import * as THREE from 'three';

const bronze = 0xbd8135;
const ivory = 0xffe3ad;
const lacquer = 0x802c24;
const ink = 0x27232a;

function mesh(root, geometry, color, x, y, z, emissive = 0) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.74, emissive: color, emissiveIntensity: emissive });
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  root.add(part);
  return part;
}

function box(root, width, height, depth, color, x, y, z) {
  return mesh(root, new THREE.BoxGeometry(width, height, depth), color, x, y, z);
}

function cylinder(root, top, bottom, height, color, x, y, z, vertices = 14) {
  return mesh(root, new THREE.CylinderGeometry(top, bottom, height, vertices), color, x, y, z);
}

function ellipsoid(root, width, height, depth, color, x, y, z) {
  const part = mesh(root, new THREE.SphereGeometry(1, 12, 8), color, x, y, z);
  part.scale.set(width, height, depth);
  return part;
}

function rod(root, from, to, thickness, color) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  const part = cylinder(root, thickness, thickness, a.distanceTo(b), color, mid.x, mid.y, mid.z, 8);
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return part;
}

const characters = {
  huiguo: { robe: 0x814b34, inner: 0xefe2c1, drape: 0xc7833b, skin: 0xbb8566 },
  kukai: { robe: 0x27242d, inner: 0xe8ddd1, drape: 0xa1764b, skin: 0xcf9974 },
  kariba: { robe: 0x344b4b, inner: 0x96906e, drape: 0x986743, skin: 0xa87351 },
  niu: { robe: 0xa94432, inner: 0xe8d6bf, drape: 0xcd8060, skin: 0xe1af8d },
};

function createCharacter(id) {
  const root = new THREE.Group();
  const { robe, inner, drape, skin } = characters[id];
  const hunter = id === 'kariba';
  const goddess = id === 'niu';
  cylinder(root, 0.31, goddess ? 0.51 : 0.39, hunter ? 0.39 : 0.86, robe, 0, hunter ? 0.65 : 0.52, 0).scale.z = 0.68;
  cylinder(root, 0.33, 0.27, 0.59, robe, 0, 1.17, 0).scale.z = 0.65;
  for (const side of [-1, 1]) {
    ellipsoid(root, 0.125, 0.06, 0.21, ink, side * 0.14, 0.065, 0.055);
    if (hunter) cylinder(root, 0.12, 0.095, 0.56, ink, side * 0.16, 0.34, 0);
    const sleeve = cylinder(root, 0.13, goddess ? 0.24 : 0.17, goddess ? 0.67 : 0.5, robe, side * 0.35, 1.12, 0.02);
    sleeve.rotation.z = side * 0.22;
    ellipsoid(root, 0.065, 0.092, 0.071, skin, side * 0.38, goddess ? 0.83 : 0.91, 0.10);
    const collar = box(root, 0.074, 0.31, 0.044, inner, side * 0.065, 1.39, 0.19);
    collar.rotation.z = side * -0.44;
    ellipsoid(root, 0.034, 0.058, 0.035, skin, side * 0.17, 1.62, 0.01);
    ellipsoid(root, 0.027, 0.012, 0.012, ink, side * 0.06, 1.65, 0.151);
  }
  cylinder(root, 0.075, 0.096, 0.11, skin, 0, 1.48, 0);
  ellipsoid(root, 0.17, 0.2, 0.15, skin, 0, 1.65, 0);
  ellipsoid(root, 0.033, 0.044, 0.035, skin, 0, 1.615, 0.146);
  const sash = cylinder(root, 0.311, 0.312, 0.1, drape, 0, 0.9, 0);
  sash.scale.z = 0.71;

  if (goddess) {
    ellipsoid(root, 0.18, 0.13, 0.157, ink, 0, 1.755, -0.015);
    ellipsoid(root, 0.17, 0.43, 0.1, ink, 0, 1.43, -0.14);
    box(root, 0.37, 0.028, 0.018, bronze, 0, 1.75, 0.142);
    ellipsoid(root, 0.035, 0.046, 0.022, bronze, 0, 1.73, 0.157);
    box(root, 0.42, 0.06, 0.025, inner, 0, 0.83, 0.231);
  } else if (hunter) {
    ellipsoid(root, 0.172, 0.12, 0.147, ink, 0, 1.75, -0.014);
    box(root, 0.33, 0.043, 0.039, inner, 0, 1.738, 0.13);
    const strap = box(root, 0.082, 0.72, 0.034, drape, 0, 1.17, 0.215);
    strap.rotation.z = 0.64;
    const bow = mesh(root, new THREE.TorusGeometry(0.47, 0.024, 8, 18, Math.PI), drape, 0.48, 1.06, -0.04);
    bow.rotation.z = -Math.PI / 2;
    bow.scale.set(1, 0.6, 1);
    rod(root, [0.48, 0.59, -0.04], [0.48, 1.53, -0.04], 0.009, inner);
  } else {
    const kesa = box(root, 0.25, 0.77, 0.045, drape, -0.13, 1.13, 0.21);
    kesa.rotation.z = -0.34;
    for (let i = 0; i < 7; i++) {
      const x = -0.15 + i * 0.05;
      ellipsoid(root, 0.018, 0.018, 0.018, bronze, x, 1.23 + x * x * 3, 0.255);
    }
    if (id === 'huiguo') {
      ellipsoid(root, 0.095, 0.035, 0.023, 0xbab6ac, 0, 1.57, 0.146);
      ellipsoid(root, 0.041, 0.073, 0.036, 0xbab6ac, 0, 1.51, 0.149);
    }
  }
  return root;
}

function createDog(id) {
  const root = new THREE.Group();
  const coat = id === 'blackDog' ? 0x2c2d33 : 0xe7dfd0;
  const marks = id === 'blackDog' ? 0xb17954 : 0xf7e9c4;
  ellipsoid(root, 0.23, 0.23, 0.46, coat, 0, 0.49, -0.02);
  ellipsoid(root, 0.18, 0.24, 0.21, coat, 0, 0.66, 0.28);
  ellipsoid(root, 0.16, 0.15, 0.16, coat, 0, 0.79, 0.42);
  ellipsoid(root, 0.108, 0.083, 0.148, marks, 0, 0.726, 0.54);
  ellipsoid(root, 0.065, 0.047, 0.04, ink, 0, 0.75, 0.665);
  for (const side of [-1, 1]) {
    const ear = mesh(root, new THREE.ConeGeometry(0.088, 0.21, 4), coat, side * 0.115, 0.949, 0.39);
    ear.rotation.z = -side * 0.21;
    ellipsoid(root, 0.022, 0.023, 0.018, ink, side * 0.103, 0.81, 0.525);
    for (const z of [-0.27, 0.26]) cylinder(root, 0.064, 0.054, 0.37, coat, side * 0.129, 0.23, z);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.62, -0.39);
  const curl = mesh(tail, new THREE.TorusGeometry(0.155, 0.049, 8, 14, 4.7), coat, 0, 0.145, -0.02);
  curl.rotation.y = Math.PI / 2;
  root.add(tail);
  root.userData.tail = tail;
  return root;
}

export function createCampaignRing(color, radius, width = 0.075) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - width, radius, 64),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

function lotus(root, color, y) {
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const petal = mesh(root, new THREE.SphereGeometry(1, 10, 6), color, Math.cos(angle) * 0.36, y, Math.sin(angle) * 0.36, 0.32);
    petal.scale.set(0.25, 0.04, 0.11);
    petal.rotation.y = -angle;
  }
}

export function createCampaignProp(step) {
  const { model, id } = step;
  if (characters[model]) return createCharacter(model);
  if (model === 'blackDog' || model === 'whiteDog') return createDog(model);
  const root = new THREE.Group();
  if (model === 'petal' || model === 'mandala') {
    const ajikan = id === 'ajikan';
    const ring = createCampaignRing(ajikan ? 0xe9f6ff : ivory, ajikan ? 2.8 : 0.87);
    ring.position.y = 0.08;
    root.add(ring);
    cylinder(root, 0.62, 0.66, 0.08, ajikan ? 0x515568 : lacquer, 0, 0.075, 0);
    if (ajikan) {
      const moon = cylinder(root, 0.49, 0.49, 0.035, 0xe9f6ff, 0, 0.125, 0, 36);
      moon.material.emissiveIntensity = 0.28;
      const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (canvas) {
        canvas.width = 128;
        canvas.height = 128;
        const g = canvas.getContext('2d');
        if (g) {
          g.fillStyle = '#e9f6ff';
          g.fillRect(0, 0, 128, 128);
          g.font = 'bold 76px serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#403751';
          g.fillText('अ', 64, 70);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          moon.material.map = texture;
          moon.material.color.setHex(0xffffff);
        }
      }
    } else {
      lotus(root, ivory, 0.15);
    }
    return root;
  }
  if (model === 'lamp') {
    cylinder(root, 0.39, 0.46, 0.18, lacquer, 0, 0.1, 0);
    cylinder(root, 0.25, 0.13, 0.16, bronze, 0, 0.27, 0);
    cylinder(root, 0.018, 0.029, 0.1, ink, 0, 0.39, 0);
    const flame = ellipsoid(root, 0.065, 0.14, 0.065, 0xffa02c, 0, 0.52, 0);
    flame.material.emissiveIntensity = 2.5;
    flame.visible = false;
    root.userData.flame = flame;
    return root;
  }
  if (model === 'ward' || model === 'dragon') {
    cylinder(root, 0.49, 0.65, 0.19, 0x3a4a54, 0, 0.095, 0, 8);
    const seal = mesh(root, new THREE.OctahedronGeometry(0.34), model === 'dragon' ? 0x8bced4 : 0xe8ac5b, 0, 0.49, 0, 0.38);
    root.userData.seal = seal;
    return root;
  }
  if (id === 'bridgeApproach' || id === 'bridgeCrossing' || id === 'mausoleumBow') return root;
  box(root, 0.9, 0.25, 0.68, lacquer, 0, 0.14, 0);
  box(root, 1.05, 0.07, 0.82, 0x492d25, 0, 0.31, 0);
  if (model === 'vajra' || id === 'eastwardVow') {
    const vajra = new THREE.Group();
    cylinder(vajra, 0.058, 0.058, 0.46, bronze, 0, 0, 0);
    for (const side of [-1, 1]) {
      ellipsoid(vajra, 0.093, 0.066, 0.093, bronze, 0, side * 0.17, 0);
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        const x = Math.cos(angle) * 0.109;
        const z = Math.sin(angle) * 0.109;
        rod(vajra, [0, side * 0.16, 0], [x, side * 0.28, z], 0.027, bronze);
        rod(vajra, [x, side * 0.28, z], [0, side * 0.4, 0], 0.022, bronze);
      }
    }
    vajra.position.y = 0.48;
    vajra.rotation.z = Math.PI / 2;
    root.add(vajra);
    if (id === 'eastwardVow') root.userData.thrownVajra = vajra;
  } else {
    lotus(root, ivory, 0.37);
  }
  return root;
}

export function createCampaignMarker() {
  const root = new THREE.Group();
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.23),
    new THREE.MeshBasicMaterial({ color: 0xffd077, depthTest: false })
  );
  diamond.renderOrder = 20;
  root.add(diamond);
  return root;
}
