function material(THREE, color, emissive = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, emissive, emissiveIntensity: emissive ? 0.22 : 0 });
}

function limb(THREE, mat, radius, length) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.8, length, 7), mat);
  mesh.castShadow = true;
  return mesh;
}

export function buildKappaModel(THREE) {
  const root = new THREE.Group(); const bodyRoot = new THREE.Group(); root.add(bodyRoot);
  const green = material(THREE, 0x477a4b, 0x102a16); const shellMat = material(THREE, 0x59452b); const beakMat = material(THREE, 0xd6b34b);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), green); body.position.y = 0.72; body.scale.y = 1.15; bodyRoot.add(body);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), shellMat); shell.position.set(0, 0.77, 0.26); shell.rotation.x = -Math.PI / 2; bodyRoot.add(shell);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 10, 8), green); head.position.y = 1.25; bodyRoot.add(head);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.035, 12), beakMat); dish.position.y = 1.55; bodyRoot.add(dish);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), beakMat); beak.position.set(0, 1.23, -0.3); beak.rotation.x = -Math.PI / 2; bodyRoot.add(beak);
  const leftArm = limb(THREE, green, .055, .48); leftArm.position.set(-.42,.8,0); leftArm.rotation.z=-.5;
  const rightArm = limb(THREE, green, .055, .48); rightArm.position.set(.42,.8,0); rightArm.rotation.z=.5; bodyRoot.add(leftArm,rightArm);
  return { root, bodyRoot, leftArm, rightArm, materials:[green,shellMat], baseColor:new THREE.Color(0x477a4b), baseEmissive:new THREE.Color(0x102a16), animate(e,dt,t){ bodyRoot.position.y=Math.sin(t*4)*.04; leftArm.rotation.x=Math.sin(t*5)*.35; rightArm.rotation.x=-Math.sin(t*5)*.35; } };
}

export function buildTenguModel(THREE) {
  const root=new THREE.Group(); const bodyRoot=new THREE.Group(); root.add(bodyRoot);
  const robe=material(THREE,0x3e2723); const red=material(THREE,0xa93226,0x2b0604); const wing=material(THREE,0x171514);
  const torso=new THREE.Mesh(new THREE.ConeGeometry(.45,1.25,8),robe); torso.position.y=.72; bodyRoot.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,10,8),red); head.position.y=1.48; bodyRoot.add(head);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.075,.58,8),red); nose.position.set(0,1.48,-.43); nose.rotation.x=-Math.PI/2; bodyRoot.add(nose);
  const wings=[]; for(const side of [-1,1]) { const w=new THREE.Mesh(new THREE.ConeGeometry(.5,1.35,5),wing); w.position.set(side*.48,.95,.2); w.rotation.z=side*.65; bodyRoot.add(w); wings.push(w); }
  return {root,bodyRoot,materials:[robe,red],baseColor:new THREE.Color(0x3e2723),baseEmissive:new THREE.Color(0x2b0604),animate(e,dt,t){bodyRoot.position.y=.08+Math.sin(t*3)*.1; wings[0].rotation.y=Math.sin(t*5)*.25; wings[1].rotation.y=-Math.sin(t*5)*.25;}};
}

export function buildAkaOniModel(THREE) {
  const root=new THREE.Group(); const bodyRoot=new THREE.Group(); root.add(bodyRoot);
  const red=material(THREE,0x9f3028,0x2d0704); const horn=material(THREE,0xe1c287); const cloth=material(THREE,0x332d2b);
  const body=new THREE.Mesh(new THREE.SphereGeometry(.72,10,8),red); body.position.y=1.12; body.scale.y=1.25; bodyRoot.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.43,10,8),red); head.position.y=2.02; bodyRoot.add(head);
  for(const side of [-1,1]) { const h=new THREE.Mesh(new THREE.ConeGeometry(.1,.48,7),horn); h.position.set(side*.22,2.38,0); h.rotation.z=side*.18; bodyRoot.add(h); }
  const club=new THREE.Mesh(new THREE.CylinderGeometry(.16,.1,1.7,7),cloth); club.position.set(.75,1.1,0); club.rotation.z=.25; bodyRoot.add(club);
  return {root,bodyRoot,materials:[red,cloth],baseColor:new THREE.Color(0x9f3028),baseEmissive:new THREE.Color(0x2d0704),animate(e,dt,t){bodyRoot.position.y=Math.abs(Math.sin(t*2.4))*.035; club.rotation.x=e.state==='windup'?-1.1:Math.sin(t*2)*.08;}};
}
