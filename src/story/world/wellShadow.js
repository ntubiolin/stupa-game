import * as THREE from 'three';
import { seededRandom } from '../../world/mapBase.js';

const up = new THREE.Vector3(0, 1, 0);

export function createWellShadow(group, floor) {
  const root = new THREE.Group();
  root.name = 'WellShadow';
  root.position.set(1970, floor, 53);
  group.add(root);

  const figure = new THREE.Group();
  root.add(figure);
  const skin = new THREE.MeshStandardMaterial({
    color: 0x252630, roughness: 1, transparent: true,
    emissive: 0x312932, emissiveIntensity: 0.36,
  });
  const vine = new THREE.MeshStandardMaterial({ color: 0x705942, roughness: 1, transparent: true });
  const face = new THREE.MeshBasicMaterial({ color: 0x97837b, transparent: true });
  const shell = new THREE.IcosahedronGeometry(1, 1);
  const joint = new THREE.SphereGeometry(1, 10, 7);
  function shape(geometry, material, position, scale) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    figure.add(mesh);
    return mesh;
  }

  const body = shape(shell, skin, [0, 1.36, -1.64], [0.86, 1.32, 0.68]);
  body.rotation.x = 0.35;
  const head = shape(shell, skin, [0, 2.44, -0.99], [0.55, 0.6, 0.49]);
  head.rotation.set(0.31, -0.09, -0.12);
  const brow = shape(joint, skin, [0, 2.42, -0.59], [0.51, 0.15, 0.18]);
  brow.rotation.z = -0.08;
  for (const side of [-1, 1]) {
    shape(joint, face, [side * 0.24, 2.32 + side * 0.025, -0.503], [0.057, 0.023, 0.022]);
    const knee = shape(shell, skin, [side * 0.78, 0.47, -1.56], [0.51, 0.51, 0.69]);
    knee.rotation.y = side * 0.55;
    shape(shell, skin, [side * 0.9, 0.18, -0.99], [0.39, 0.27, 0.47]);
  }

  // Branches around the hunched shoulders suggest the novel's dried vines.
  for (let i = 0; i < 4; i++) {
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 17 }, (_, j) => {
        const t = j / 16;
        const angle = t * 5.4 + i * 1.57;
        const radius = Math.sin(t * Math.PI * 0.86) * 0.69 + 0.13;
        return new THREE.Vector3(Math.cos(angle) * radius, 0.43 + t * 1.83, -1.48 + Math.sin(angle) * radius + t * 0.25);
      }),
    );
    figure.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 22, 0.029, 5, false), vine));
  }

  const armGeometry = new THREE.CapsuleGeometry(0.22, 1, 5, 9);
  const shoulder = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const palm = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const arms = [-1, 1].map((side) => ({
    side, upper: shape(armGeometry, skin, [0, 0, 0], [1, 1, 1]),
    lower: shape(armGeometry, skin, [0, 0, 0], [1, 1, 1]),
    hand: shape(joint, skin, [0, 0, 0], [0.25, 0.18, 0.31]),
    fingers: Array.from({ length: 3 }, () => shape(joint, skin, [0, 0, 0], [0.044, 0.12, 0.07])),
  }));
  function poseSegment(mesh, start, end, width) {
    direction.subVectors(end, start);
    mesh.position.copy(start).lerp(end, 0.5);
    mesh.scale.set(width, direction.length() / 1.28, width);
    mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  }

  const count = 110;
  const positions = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', positions);
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
    color: 0xba9a7a, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false,
  }));
  dust.name = 'ShadowDust';
  dust.frustumCulled = false;
  root.add(dust);
  const rng = seededRandom(91);
  const motes = Array.from({ length: count }, () => [rng() * 2 - 1, rng() * 2.45, rng() * 2 - 1]);

  return {
    set(present, release, time) {
      root.visible = present && release < 1;
      if (!root.visible) return;
      const open = THREE.MathUtils.smoothstep(release, 0.02, 0.48);
      const fade = 1 - THREE.MathUtils.smoothstep(release, 0.32, 0.92);
      figure.visible = fade > 0;
      skin.opacity = fade;
      vine.opacity = fade;
      face.opacity = fade * 0.72;
      figure.position.y = Math.sin(time * 1.5) * 0.033 - release * 0.32;
      for (const { side, upper, lower, hand, fingers } of arms) {
        shoulder.set(side * 0.59, 1.87, -1.3);
        elbow.set(side * (1.2 + open * 0.35), 0.94 + open * 0.18, -0.45 - open * 0.3);
        palm.set(side * (0.76 + open * 0.89), 0.94 + open * 0.57, 0.87 - open * 1.15);
        poseSegment(upper, shoulder, elbow, 1.28);
        poseSegment(lower, elbow, palm, 0.91);
        hand.position.copy(palm);
        for (let i = 0; i < fingers.length; i++) {
          fingers[i].position.copy(palm);
          fingers[i].position.x += (i - 1) * 0.11;
          fingers[i].position.y -= 0.105;
          fingers[i].position.z += 0.22 - open * 0.09;
        }
      }
      dust.visible = release > 0.12;
      if (!dust.visible) return;
      dust.material.opacity = Math.sin(Math.PI * release) * 0.83;
      for (let i = 0; i < count; i++) {
        const [x, y, z] = motes[i];
        positions.setXYZ(i,
          x * (1 + release * 1.8) + release * 0.7,
          y + release * (1.2 + Math.sin(i) * 0.47),
          z * (0.8 + release) - 0.84);
      }
      positions.needsUpdate = true;
    },
  };
}
