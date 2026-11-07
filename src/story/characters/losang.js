// Original procedural study for the narrative demo. Dimensions are in metres.
export function createLosang(THREE) {
  const group = new THREE.Group();
  group.name = 'Losang';
  const torso = new THREE.Group();
  torso.position.y = .90;
  group.add(torso);

  const geometries = new Set();
  const materials = new Set();
  function material(color, options = {}) {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .95, ...options });
    materials.add(value);
    return value;
  }
  function mesh(parent, geometry, surface) {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, surface);
    parent.add(object);
    return object;
  }
  function surface(points, indices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  function volume(parent, surfaceMaterial, center, scale) {
    const object = mesh(parent, sphere, surfaceMaterial);
    object.position.set(...center);
    object.scale.set(...scale);
    return object;
  }
  function limb(parent, surfaceMaterial, start, end, width, depth) {
    const axis = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
    const center = start.map((value, index) => (value + end[index]) / 2);
    const object = volume(parent, surfaceMaterial, center, [width, axis.length() / 2 + width * .62, depth]);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    return object;
  }

  // Cross sections are listed from hem/chin to top. Vary the folds around
  // the circumference so they flow between sections without separate ridges.
  function drape(parent, surfaceMaterial, sections, sides, sculpt) {
    const points = [];
    const indices = [];
    for (const [row, [y, width, depth, offsetZ, fold = 0]] of sections.entries()) {
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2;
        const ripple = 1 + fold * (Math.cos(7 * angle + y * 1.8) + .45 * Math.sin(11 * angle - y * 2));
        const x = width * Math.sin(angle) * ripple;
        const z = offsetZ + depth * Math.cos(angle) * ripple;
        points.push(sculpt ? sculpt(x, y, z, angle) : [x, y, z]);
        if (row === sections.length - 1) continue;
        const a = row * sides + side;
        const b = row * sides + (side + 1) % sides;
        indices.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
    // Use separate vertices on the caps so the rim does not pull the
    // fabric normals downward or flatten the chin above its edge.
    const bottom = points.length;
    points.push(...points.slice(0, sides), ...points.slice(-sides));
    const top = bottom + sides;
    for (let side = 1; side < sides - 1; side++) {
      indices.push(bottom, bottom + side + 1, bottom + side, top, top + side, top + side + 1);
    }
    return mesh(parent, surface(points, indices), surfaceMaterial);
  }
  function band(parent, surfaceMaterial, pairs) {
    const indices = [];
    for (let i = 0; i < pairs.length - 1; i++) {
      const a = 2 * i;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    return mesh(parent, surface(pairs.flat(), indices), surfaceMaterial);
  }

  const robe = material(0x72373d);
  const wrap = material(0x934a47, { side: THREE.DoubleSide });
  const innerCloth = material(0xa4744c, { side: THREE.DoubleSide });
  const hem = material(0x512a34);
  const shoes = material(0x302a28);
  const skin = material(0xac7e5d);
  const skinShadow = material(0x8f614c);
  const hair = material(0x70655d);
  const eyes = material(0x40312b);
  const paper = material(0xb79c6d, { side: THREE.DoubleSide });
  const paperLight = material(0xc5ad80, { side: THREE.DoubleSide });

  for (const side of [-1, 1]) {
    const shoe = volume(group, shoes, [.100 * side, .044, .041], [.072, .044, .122]);
    shoe.rotation.y = .12 * side;
    volume(group, hem, [.100 * side, .106, .002], [.050, .063, .057]);
  }
  drape(group, robe, [
    [.115, .225, .151, -.019, .105],
    [.182, .232, .146, -.016, .115],
    [.43, .206, .131, -.014, .11],
    [.66, .182, .121, -.014, .08],
    [.88, .166, .122, -.014, .06],
    [.94, .156, .112, -.014, .05],
  ], 40, (x, y, z, angle) => [x, y + .015 * Math.sin(2 * angle) * (1 - y), z]);
  drape(group, hem, [
    [.858, .169, .124, -.012, .06],
    [.880, .172, .125, -.012, .06],
    [.912, .168, .122, -.012, .05],
  ], 32);

  drape(torso, robe, [
    [-.04, .155, .113, -.013, .045],
    [.09, .167, .123, -.013, .047],
    [.23, .176, .130, -.022, .032],
    [.35, .189, .114, -.031, .033],
    [.408, .149, .089, -.025, .025],
    [.442, .079, .068, -.016, .015],
  ], 32);
  volume(torso, skin, [.005, .455, .002], [.054, .084, .054]);
  band(torso, innerCloth, [
    [[-.082, .410, .047], [-.062, .441, .036]],
    [[-.038, .382, .076], [-.026, .414, .063]],
    [[.004, .365, .088], [.010, .396, .075]],
    [[.052, .383, .076], [.045, .416, .062]],
    [[.101, .407, .048], [.086, .430, .041]],
  ]);

  // One panel runs from the shoulder across the front; a second panel
  // follows it across the back to complete the silhouette from either side.
  band(torso, wrap, [
    [[-.192, .337, .035], [-.093, .434, .045]],
    [[-.161, .299, .084], [-.070, .410, .094]],
    [[-.117, .261, .118], [-.022, .371, .116]],
    [[-.059, .223, .132], [.039, .316, .118]],
    [[.012, .185, .117], [.106, .257, .093]],
    [[.094, .142, .095], [.151, .214, .068]],
    [[.152, .117, .052], [.175, .181, .021]],
  ]);
  band(torso, wrap, [
    [[-.192, .337, .035], [-.093, .434, .045]],
    [[-.194, .345, -.054], [-.080, .428, -.078]],
    [[-.147, .297, -.115], [-.036, .387, -.131]],
    [[-.091, .253, -.143], [.024, .344, -.153]],
    [[-.018, .211, -.153], [.082, .295, -.144]],
    [[.062, .166, -.129], [.128, .249, -.118]],
    [[.132, .122, -.090], [.166, .195, -.078]],
    [[.152, .117, .052], [.175, .181, .021]],
  ]);

  limb(torso, wrap, [-.163, .345, -.010], [-.203, .139, .035], .075, .072);
  limb(torso, robe, [.159, .339, -.012], [.204, .135, .029], .069, .068);
  for (const side of [-1, 1]) {
    limb(torso, robe, [.202 * side, .142, .033], [.130 * side, .140, .183], .064, .054);
    limb(torso, hem, [.140 * side, .141, .156], [.124 * side, .142, .186], .047, .044);
    limb(torso, skin, [.126 * side, .140, .183], [.107 * side, .143, .235], .033, .025);
  }

  // Offset the head forward a little to suggest the posture of an older man.
  const head = new THREE.Group();
  head.position.set(.008, .605, .019);
  head.rotation.set(.07, -.085, .035);
  torso.add(head);
  drape(head, skin, [
    [-.112, .032, .039, .023],
    [-.096, .056, .054, .016],
    [-.071, .067, .066, .007],
    [-.039, .079, .069, .004],
    [-.007, .078, .067, .004],
    [.023, .082, .073, .001],
    [.059, .078, .071, -.006],
    [.089, .061, .059, -.009],
    [.110, .035, .039, -.013],
    [.119, .006, .009, -.014],
  ], 40, (x, y, z, angle) => {
    if (Math.cos(angle) <= 0) return [x, y, z];
    const bridge = Math.exp(-((x / .017) ** 2) - (((y + .018) / .038) ** 2)) * .023;
    const cheeks = Math.exp(-(((Math.abs(x) - .045) / .019) ** 2) - (((y + .033) / .023) ** 2)) * .008;
    return [x, y, z + bridge + cheeks];
  });
  for (const side of [-1, 1]) {
    const ear = volume(head, skin, [.078 * side, -.021, -.004], [.017, .033, .019]);
    ear.rotation.z = -.15 * side;
    volume(head, skinShadow, [.088 * side, -.020, .007], [.007, .018, .008]);
    const brow = volume(head, hair, [.036 * side, .016, .067], [.022, .005, .008]);
    brow.rotation.z = -.13 * side;
    volume(head, skinShadow, [.035 * side, -.007, .068], [.023, .008, .007]);
    volume(head, eyes, [.035 * side, -.005, .074], [.013, .0025, .003]);
    volume(head, skin, [.010 * side, -.041, .084], [.010, .007, .012]);
  }
  volume(head, skinShadow, [0, -.070, .071], [.026, .0035, .004]);

  // The existing prop is represented as folded paper. Creases sit in the
  // geometry and the faded linework carries no legible or invented script.
  const map = new THREE.Group();
  map.position.set(0, .151, .227);
  map.rotation.set(-.55, -.07, .08);
  torso.add(map);
  const left = [[-.119, -.043, .003], [0, -.051, .012], [-.125, .049, -.002], [0, .050, .011]];
  const right = [[0, -.051, .012], [.122, -.043, -.004], [0, .050, .011], [.117, .046, .003]];
  const fold = [0, 1, 2, 1, 3, 2];
  mesh(map, surface(left, fold), paper);
  mesh(map, surface(right, fold), paperLight);
  const inkGeometry = new THREE.BufferGeometry().setFromPoints([
    [-.092, .023, .005], [-.061, .010, .008],
    [-.061, .010, .008], [-.046, -.013, .010],
    [-.046, -.013, .010], [-.009, -.021, .014],
    [-.009, -.021, .014], [.020, -.010, .013],
    [.020, -.010, .013], [.040, .015, .011],
    [.040, .015, .011], [.089, .022, .008],
    [-.089, -.027, .007], [-.074, -.026, .009],
    [.055, -.027, .009], [.093, -.021, .006],
  ].map(point => new THREE.Vector3(...point)));
  const ink = new THREE.LineBasicMaterial({ color: 0x755747 });
  geometries.add(inkGeometry);
  materials.add(ink);
  map.add(new THREE.LineSegments(inkGeometry, ink));
  for (const side of [-1, 1]) {
    limb(torso, skin, [.115 * side, .157, .243], [.094 * side, .160, .256], .011, .011);
  }

  let breath = 0;
  return {
    group,
    update(dt) {
      breath = (breath + dt * 1.65) % (Math.PI * 2);
      torso.scale.y = 1 + .004 * Math.sin(breath);
    },
    dispose() {
      group.removeFromParent();
      group.clear();
      for (const geometry of geometries) geometry.dispose();
      for (const surfaceMaterial of materials) surfaceMaterial.dispose();
      geometries.clear();
      materials.clear();
    },
  };
}
