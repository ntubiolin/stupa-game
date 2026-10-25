/**
 * Butter-lamp offering stations (酥油燈台) — carved stone & timber shrines
 * around the kora path, InstancedMesh brass butter-lamp bowls, custom shader
 * flickering teardrop flames + bloom glow sprites, and 1 PointLight per station.
 */
import { deg, polar } from '../config.js';

const BURN_DURATION = 210; // seconds before a lit lamp gently burns out

function createGlowTexture(THREE) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 245, 200, 1)');
  grad.addColorStop(0.35, 'rgba(255, 180, 60, 0.65)');
  grad.addColorStop(0.7, 'rgba(255, 110, 20, 0.18)');
  grad.addColorStop(1, 'rgba(255, 80, 0, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createLamps(ctx) {
  const { THREE, scene, state, config, bus } = ctx;
  const L = config.LAMPS;
  const stationDefs = L.stations || [];
  const lampsPerStation = L.lampsPerStation || 12;
  const totalLamps = stationDefs.length * lampsPerStation;

  const group = new THREE.Group();
  group.name = 'ButterLampStations';
  (ctx.stupaGroup || scene).add(group);

  // ---------------------------------------------------------------- shared materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6e655c,
    roughness: 0.88,
    metalness: 0.05,
  });
  const woodCrimsonMat = new THREE.MeshStandardMaterial({
    color: 0x6b1d1b,
    roughness: 0.72,
    metalness: 0.08,
  });
  const woodGoldMat = new THREE.MeshStandardMaterial({
    color: 0xc9963b,
    roughness: 0.42,
    metalness: 0.48,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.32,
    metalness: 0.78,
  });
  const gheeMat = new THREE.MeshStandardMaterial({
    color: 0xf2c96b,
    roughness: 0.45,
    metalness: 0.05,
    emissive: 0x553300,
    emissiveIntensity: 0.25,
  });

  // Custom flickering teardrop flame shader (additive, toneMapped: false -> blooms)
  const flameUniforms = {
    uTime: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1, 0) },
    uWindStrength: { value: 0.4 },
  };

  const flameMat = new THREE.ShaderMaterial({
    uniforms: flameUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uWindDir;
      uniform float uWindStrength;
      attribute float aSeed;
      varying vec2 vUv;
      varying float vFlicker;

      void main() {
        vUv = uv;
        float t = uTime * 6.5 + aSeed * 19.3;
        float h = clamp(uv.y, 0.0, 1.0);
        float sway = (sin(t) * 0.6 + sin(t * 2.3 + 1.1) * 0.4) * (0.014 + 0.022 * uWindStrength) * h * h;
        vec3 pos = position;
        // Teardrop taper: wider near bottom, pointed at tip
        float taper = sin(pow(h, 0.62) * 3.14159265);
        pos.x *= taper;
        pos.z *= taper;
        pos.x += sway + uWindDir.x * uWindStrength * 0.018 * h * h;
        pos.z += cos(t * 1.7) * 0.008 * h + uWindDir.y * uWindStrength * 0.018 * h * h;
        pos.y *= 0.92 + 0.14 * sin(t * 1.9);
        vFlicker = 0.88 + 0.18 * sin(t * 2.7);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFlicker;

      void main() {
        float h = clamp(vUv.y, 0.0, 1.0);
        float radial = abs(vUv.x - 0.5) * 2.0;
        float core = smoothstep(0.95, 0.0, radial) * smoothstep(0.0, 0.18, h) * smoothstep(1.0, 0.15, h);
        vec3 innerCol = vec3(2.8, 2.35, 1.45); // HDR warm white-gold for bloom
        vec3 outerCol = vec3(1.85, 0.68, 0.12);
        vec3 col = mix(outerCol, innerCol, smoothstep(0.65, 0.0, radial) * (1.0 - h * 0.55));
        float alpha = core * vFlicker;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(col * vFlicker, alpha);
      }
    `,
  });

  const glowTex = createGlowTexture(THREE);
  const glowSpriteMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffb84d,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  // ---------------------------------------------------------------- instanced lamp bowls
  // Each brass butter-lamp bowl (ting) is a stemmed chalice
  const bowlGeo = new THREE.CylinderGeometry(0.068, 0.042, 0.065, 12);
  bowlGeo.translate(0, 0.032, 0);
  const bowlInstanced = new THREE.InstancedMesh(bowlGeo, brassMat, totalLamps);
  bowlInstanced.castShadow = true;
  bowlInstanced.receiveShadow = true;
  group.add(bowlInstanced);

  const gheeGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.012, 10);
  gheeGeo.translate(0, 0.058, 0);
  const gheeInstanced = new THREE.InstancedMesh(gheeGeo, gheeMat, totalLamps);
  group.add(gheeInstanced);

  // Crossed-plane flame geometry for each lamp
  function createFlameMesh(seed) {
    const plane1 = new THREE.PlaneGeometry(0.075, 0.145, 1, 6);
    plane1.translate(0, 0.072, 0);
    const plane2 = plane1.clone();
    plane2.rotateY(Math.PI / 2);

    // Merge the 2 crossed planes manually
    const p1 = plane1.attributes.position.array;
    const p2 = plane2.attributes.position.array;
    const u1 = plane1.attributes.uv.array;
    const u2 = plane2.attributes.uv.array;
    const idx1 = plane1.index.array;
    const idx2 = plane2.index.array;

    const vertCount = (p1.length + p2.length) / 3;
    const positions = new Float32Array(p1.length + p2.length);
    positions.set(p1, 0);
    positions.set(p2, p1.length);

    const uvs = new Float32Array(u1.length + u2.length);
    uvs.set(u1, 0);
    uvs.set(u2, u1.length);

    const seeds = new Float32Array(vertCount);
    seeds.fill(seed);

    const indices = new Uint16Array(idx1.length + idx2.length);
    indices.set(idx1, 0);
    const offset = p1.length / 3;
    for (let i = 0; i < idx2.length; i++) indices[idx1.length + i] = idx2[i] + offset;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    const mesh = new THREE.Mesh(geo, flameMat);
    return mesh;
  }

  // ---------------------------------------------------------------- build stations
  const stations = [];
  const dummy = new THREE.Object3D();
  let instanceIdx = 0;

  stationDefs.forEach((def, sIdx) => {
    const angle = deg(def.angleDeg);
    const pos = polar(angle, def.radius);
    const stationGroup = new THREE.Group();
    stationGroup.position.set(pos.x, 0, pos.z);
    // Orient table tangent to the kora circle, facing outward toward the walkway
    const facingYaw = Math.atan2(-pos.x, -pos.z) + Math.PI;
    stationGroup.rotation.y = facingYaw;
    group.add(stationGroup);

    // Stone plinth base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.42, 0.88), stoneMat);
    plinth.position.y = 0.21;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    stationGroup.add(plinth);

    // Carved crimson timber cabinet body
    const tableBody = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.48, 0.76), woodCrimsonMat);
    tableBody.position.y = 0.66;
    tableBody.castShadow = true;
    tableBody.receiveShadow = true;
    stationGroup.add(tableBody);

    // Golden lotus frieze band + brass table tray
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.07, 0.80), woodGoldMat);
    frieze.position.y = 0.91;
    stationGroup.add(frieze);

    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.04, 0.72), brassMat);
    tray.position.y = 0.96;
    tray.receiveShadow = true;
    stationGroup.add(tray);

    // Protective Himalayan eave canopy supported by slender corner pillars
    const pillarGeo = new THREE.CylinderGeometry(0.032, 0.036, 0.78, 8);
    const pillarOffsets = [
      [-0.66, 1.35, -0.31],
      [0.66, 1.35, -0.31],
      [-0.66, 1.35, 0.31],
      [0.66, 1.35, 0.31],
    ];
    for (const [px, py, pz] of pillarOffsets) {
      const p = new THREE.Mesh(pillarGeo, woodCrimsonMat);
      p.position.set(px, py, pz);
      p.castShadow = true;
      stationGroup.add(p);
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.06, 0.28, 4), woodCrimsonMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.15, 1, 0.68);
    roof.position.y = 1.86;
    roof.castShadow = true;
    stationGroup.add(roof);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), woodGoldMat);
    finial.position.y = 2.02;
    stationGroup.add(finial);

    // 1 PointLight per station (<= 3 PointLights total in our code)
    const light = new THREE.PointLight(0xff9c38, 0, 7.5, 1.7);
    light.position.set(0, 1.28, 0);
    light.castShadow = false;
    stationGroup.add(light);

    // Arrange 12 lamps in 2 rows × 6 columns on the brass tray (y = 0.98)
    const cols = 6;
    const rows = Math.ceil(lampsPerStation / cols);
    const lampEntries = [];

    stationGroup.updateMatrixWorld(true);

    for (let i = 0; i < lampsPerStation; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const lx = (c - (cols - 1) * 0.5) * 0.21;
      const lz = (r - (rows - 1) * 0.5) * 0.24;
      const ly = 0.98;

      dummy.position.set(lx, ly, lz);
      dummy.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dummy.matrix.premultiply(stationGroup.matrixWorld);

      bowlInstanced.setMatrixAt(instanceIdx, dummy.matrix);
      gheeInstanced.setMatrixAt(instanceIdx, dummy.matrix);
      instanceIdx++;

      const seed = (sIdx * 17 + i * 7.3) % 10;
      const flame = createFlameMesh(seed);
      flame.position.set(lx, ly + 0.062, lz);
      flame.visible = false;
      stationGroup.add(flame);

      const glow = new THREE.Sprite(glowSpriteMat);
      glow.position.set(lx, ly + 0.12, lz);
      glow.scale.set(0.28, 0.28, 1);
      glow.visible = false;
      stationGroup.add(glow);

      lampEntries.push({
        lit: false,
        burnRemaining: 0,
        igniteAnim: 0,
        flame,
        glow,
        seed,
      });
    }

    // Pre-light 2 lamps per station so the shrines beckon warmly at dusk/night
    for (let pre = 0; pre < 2 && pre < lampEntries.length; pre++) {
      const entry = lampEntries[pre];
      entry.lit = true;
      entry.burnRemaining = BURN_DURATION * (0.65 + pre * 0.25);
      entry.igniteAnim = 1;
      entry.flame.visible = true;
      entry.glow.visible = true;
    }

    // Push circle collider for station
    ctx.colliders.push({
      type: 'circle',
      x: pos.x,
      z: pos.z,
      r: 0.88,
      zone: 'stupa',
    });

    const worldPos = new THREE.Vector3(pos.x, 1.0, pos.z);
    const station = {
      id: `lamp-${sIdx}`,
      worldPos,
      light,
      lamps: lampEntries,
      pendingTimers: [],
      countLit() {
        let n = 0;
        for (let i = 0; i < lampEntries.length; i++) if (lampEntries[i].lit) n++;
        return n;
      },
      findNextUnlit() {
        for (let i = 0; i < lampEntries.length; i++) {
          if (!lampEntries[i].lit) return lampEntries[i];
        }
        return null;
      },
    };
    stations.push(station);

    // Register interactable (1 per station)
    ctx.interactables.push({
      id: station.id,
      kind: 'lamp',
      zone: 'stupa',
      getPosition: () => station.worldPos,
      radius: L.interactRadius || 2.2,
      action: 'interact',
      labelKey: 'prompt.lightLamp',
      isAvailable: () => Boolean(station.findNextUnlit()),
      onInteract: () => {
        const nextLamp = station.findNextUnlit();
        if (!nextLamp) {
          bus.emit('toast', { key: 'toast.allLit' });
          return;
        }
        // Trigger pilgrim bow & lighting gesture
        bus.emit('player:gesture', { name: 'light', target: station.worldPos });

        // Ignite the bowl right as the player's hand reaches forward (~0.25s)
        nextLamp.lit = true;
        nextLamp.burnRemaining = BURN_DURATION;
        nextLamp.igniteAnim = 0.01;
        nextLamp.flame.visible = true;
        nextLamp.glow.visible = true;

        bus.emit('sfx', { name: 'light' });
        bus.emit('merit', { type: 'lamp' });

        if (!station.findNextUnlit()) {
          bus.emit('toast', { key: 'toast.allLit' });
        }
      },
    });
  });

  bowlInstanced.instanceMatrix.needsUpdate = true;
  gheeInstanced.instanceMatrix.needsUpdate = true;

  // ---------------------------------------------------------------- update
  function update(dt) {
    if (state.zone && state.zone !== 'stupa') return;

    flameUniforms.uTime.value = state.elapsed;
    flameUniforms.uWindDir.value.copy(state.wind.dir);
    flameUniforms.uWindStrength.value = state.wind.strength;

    const nightFactor = state.time.nightFactor ?? 0;
    const nightBoost = 0.75 + nightFactor * 1.45;

    for (let s = 0; s < stations.length; s++) {
      const st = stations[s];
      let litCount = 0;
      let burnedOutThisFrame = false;

      for (let i = 0; i < st.lamps.length; i++) {
        const entry = st.lamps[i];
        if (!entry.lit) continue;

        entry.burnRemaining -= dt;
        if (entry.burnRemaining <= 0) {
          entry.lit = false;
          entry.burnRemaining = 0;
          entry.igniteAnim = 0;
          entry.flame.visible = false;
          entry.glow.visible = false;
          burnedOutThisFrame = true;
          continue;
        }

        litCount++;
        if (entry.igniteAnim < 1) {
          entry.igniteAnim = Math.min(1, entry.igniteAnim + dt * 3.2);
        }

        // Fade down slightly in the final 10 seconds before burning out
        const fadeOut = Math.min(1, entry.burnRemaining / 10);
        const scale = entry.igniteAnim * (0.35 + 0.65 * fadeOut);
        entry.flame.scale.set(scale, scale, scale);
        const glowScale = 0.26 * scale * (0.92 + 0.08 * Math.sin(state.elapsed * 9 + entry.seed));
        entry.glow.scale.set(glowScale, glowScale, 1);
      }

      if (burnedOutThisFrame && litCount === 0 && state.mode === 'play') {
        bus.emit('toast', { key: 'toast.burnedOut' });
      }

      // Station PointLight intensity scales smoothly with lit lamp count + subtle flicker
      if (litCount === 0) {
        st.light.intensity = 0;
      } else {
        const frac = litCount / lampsPerStation;
        const flicker = 0.92 + 0.08 * Math.sin(state.elapsed * 11.3 + s * 2.1) + 0.04 * Math.cos(state.elapsed * 17.7 + s);
        st.light.intensity = (0.55 + frac * 2.1) * nightBoost * flicker;
        st.light.distance = 5.5 + frac * 4.5 + nightFactor * 2.5;
      }
    }
  }

  return {
    update,
    stations,
  };
}
