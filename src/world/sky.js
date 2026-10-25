import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Sky dome, sun/moon/stars shader, directional sun & moon lights, hemisphere
 * ambient light, scene environment map (PMREM), fog, and exposure control.
 *
 * Updates `ctx.state.time.sunDir` and `ctx.state.time.nightFactor` each frame.
 */
export function createSky(ctx) {
  const { scene, camera, renderer, state, config } = ctx;

  // ---------------------------------------------------------------- PMREM environment for metallic gold
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.75;
  roomEnv.dispose();
  pmremGenerator.dispose();

  // ---------------------------------------------------------------- Fog
  const fogColor = new THREE.Color(0x9ec7eb);
  scene.fog = new THREE.FogExp2(fogColor, 0.0014);

  // ---------------------------------------------------------------- Lights
  const sunLight = new THREE.DirectionalLight(0xfff4dd, 1.55);
  sunLight.castShadow = true;
  const shadowSize = config.RENDER.shadowMapSize || 2048;
  sunLight.shadow.mapSize.set(shadowSize, shadowSize);
  const d = 46;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 165;
  sunLight.shadow.bias = -0.00045;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const moonLight = new THREE.DirectionalLight(0x7ca4ff, 0.0);
  moonLight.castShadow = false;
  scene.add(moonLight);
  scene.add(moonLight.target);

  const hemiLight = new THREE.HemisphereLight(0x87b9f0, 0x7c6855, 0.85);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // ---------------------------------------------------------------- Sky Dome Shader
  const uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uZenithColor: { value: new THREE.Color(0x144896) },
    uMidColor: { value: new THREE.Color(0x387ec9) },
    uHorizonColor: { value: new THREE.Color(0xa6cce8) },
    uGroundColor: { value: new THREE.Color(0x4c433b) },
    uSunColor: { value: new THREE.Color(0xffe6b8) },
    uNightFactor: { value: 0.0 },
    uTwilightFactor: { value: 0.0 },
    uTime: { value: 0.0 },
  };

  const skyGeo = new THREE.SphereGeometry(490, 48, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir;
      uniform vec3 uMoonDir;
      uniform vec3 uZenithColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      uniform vec3 uSunColor;
      uniform float uNightFactor;
      uniform float uTwilightFactor;
      uniform float uTime;

      varying vec3 vWorldDir;

      // 3D hash for stars and noise
      float hash31(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(
            mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
            mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x),
            f.y
          ),
          mix(
            mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
            mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x),
            f.y
          ),
          f.z
        );
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise3(p);
          p = p * 2.07 + vec3(13.1, 7.7, 19.3);
          a *= 0.5;
        }
        return v;
      }

      float starLayer(vec3 dir, float scale, float density, float time) {
        vec3 p = dir * scale;
        vec3 id = floor(p);
        vec3 f = fract(p) - 0.5;
        float rnd = hash31(id);
        if (rnd < density) return 0.0;
        vec3 offset = (vec3(
          hash31(id + 1.1),
          hash31(id + 2.2),
          hash31(id + 3.3)
        ) - 0.5) * 0.55;
        float d = length(f - offset);
        float size = mix(0.04, 0.11, fract(rnd * 37.0));
        float spark = smoothstep(size, 0.0, d);
        spark = pow(spark, 2.2);
        float twinkle = 0.65 + 0.35 * sin(time * (1.8 + fract(rnd * 13.0) * 3.0) + rnd * 62.8);
        return spark * twinkle * smoothstep(density, 1.0, rnd);
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float y = dir.y;

        // Vertical sky gradient
        float upperT = clamp(y, 0.0, 1.0);
        float midMix = smoothstep(0.0, 0.32, upperT);
        float zenithMix = smoothstep(0.22, 0.92, upperT);
        vec3 skyCol = mix(uHorizonColor, uMidColor, midMix);
        skyCol = mix(skyCol, uZenithColor, zenithMix);

        // Below horizon bounce
        if (y < 0.0) {
          skyCol = mix(uHorizonColor, uGroundColor, smoothstep(0.0, -0.25, y));
        }

        // Directional sunset/sunrise horizon glow toward the sun azimuth
        vec2 sunHoriz = normalize(uSunDir.xz + vec2(1e-5));
        vec2 dirHoriz = normalize(dir.xz + vec2(1e-5));
        float azimDot = max(0.0, dot(dirHoriz, sunHoriz));
        float horizonBand = exp(-abs(y) * 5.5);
        skyCol += uSunColor * pow(azimDot, 2.2) * horizonBand * (0.28 + 0.45 * uTwilightFactor) * (1.0 - 0.85 * uNightFactor);

        // Subtle high-altitude wispy clouds
        if (y > 0.02) {
          vec3 cloudCoord = vec3(dir.xz / (y + 0.18) * 1.4, 0.0);
          cloudCoord.x += uTime * 0.008;
          cloudCoord.y += uTime * 0.003;
          float c = fbm(cloudCoord);
          float cloudMask = smoothstep(0.52, 0.78, c) * smoothstep(0.02, 0.22, y) * smoothstep(0.95, 0.35, y);
          vec3 cloudLit = mix(vec3(0.96, 0.95, 0.94), uSunColor * 1.05, uTwilightFactor * 0.75);
          cloudLit = mix(cloudLit, vec3(0.16, 0.22, 0.36), uNightFactor * 0.85);
          skyCol = mix(skyCol, cloudLit, cloudMask * 0.28);
        }

        // Stars (visible at night above the horizon)
        if (uNightFactor > 0.01 && y > 0.0) {
          float horizonFade = smoothstep(0.02, 0.28, y);
          float s1 = starLayer(dir, 95.0, 0.91, uTime);
          float s2 = starLayer(dir, 165.0, 0.94, uTime * 1.2);
          float stars = (s1 * 0.9 + s2 * 0.65) * horizonFade * uNightFactor;
          // Subtle Milky Way band
          float mwCoord = abs( dir.x * 0.65 + dir.z * 0.55 - dir.y * 0.35 );
          float mw = smoothstep(0.38, 0.0, mwCoord) * fbm(dir * 6.0) * 0.12 * horizonFade * uNightFactor;
          vec3 starCol = mix(vec3(0.82, 0.90, 1.0), vec3(1.0, 0.92, 0.80), hash31(floor(dir * 95.0)));
          skyCol += starCol * stars + vec3(0.35, 0.48, 0.78) * mw;
        }

        // Sun disc and corona
        float sunCos = dot(dir, uSunDir);
        float sunVis = smoothstep(-0.08, 0.04, uSunDir.y);
        if (sunVis > 0.0) {
          float sunHalo = pow(max(0.0, sunCos), 10.0) * 0.28 + pow(max(0.0, sunCos), 64.0) * 0.42;
          float sunDisc = smoothstep(0.9982, 0.9991, sunCos);
          vec3 discCol = mix(uSunColor * 1.15, vec3(1.15, 1.08, 0.95), smoothstep(0.0, 0.35, uSunDir.y));
          skyCol += (uSunColor * sunHalo + discCol * sunDisc * 0.95) * sunVis * smoothstep(-0.04, 0.02, y);
        }

        // Moon disc and cool lunar glow
        float moonCos = dot(dir, uMoonDir);
        float moonVis = smoothstep(-0.06, 0.08, uMoonDir.y) * (0.25 + 0.75 * uNightFactor);
        if (moonVis > 0.0) {
          float moonHalo = pow(max(0.0, moonCos), 28.0) * 0.22 + pow(max(0.0, moonCos), 140.0) * 0.25;
          float moonDisc = smoothstep(0.9987, 0.9993, moonCos);
          float craters = 0.84 + 0.16 * fbm(dir * 70.0);
          vec3 moonCol = vec3(0.78, 0.87, 1.0) * craters;
          skyCol += (vec3(0.40, 0.56, 0.88) * moonHalo + moonCol * moonDisc * 0.95) * moonVis * smoothstep(-0.03, 0.02, y);
        }

        gl_FragColor = vec4(skyCol, 1.0);
      }
    `,
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -1000;
  scene.add(skyMesh);

  // ---------------------------------------------------------------- Palettes for smooth interpolation
  const PALETTE = {
    day: {
      zenith: new THREE.Color(0x144896),
      mid: new THREE.Color(0x3b82c8),
      horizon: new THREE.Color(0xa8cde8),
      ground: new THREE.Color(0x6e6052),
      sun: new THREE.Color(0xfff1d0),
      hemiSky: new THREE.Color(0x88bcf2),
      hemiGround: new THREE.Color(0x8b7660),
      fog: new THREE.Color(0xa6cae3),
    },
    golden: {
      zenith: new THREE.Color(0x223063),
      mid: new THREE.Color(0x9c4b64),
      horizon: new THREE.Color(0xee853c),
      ground: new THREE.Color(0x452d2a),
      sun: new THREE.Color(0xff8b3d),
      hemiSky: new THREE.Color(0xe68a5c),
      hemiGround: new THREE.Color(0x573b34),
      fog: new THREE.Color(0xd67c49),
    },
    dusk: {
      zenith: new THREE.Color(0x0c1330),
      mid: new THREE.Color(0x3d234a),
      horizon: new THREE.Color(0x9e453b),
      ground: new THREE.Color(0x211824),
      sun: new THREE.Color(0xff6b3d),
      hemiSky: new THREE.Color(0x634b78),
      hemiGround: new THREE.Color(0x2b2230),
      fog: new THREE.Color(0x563547),
    },
    night: {
      zenith: new THREE.Color(0x050916),
      mid: new THREE.Color(0x0d1733),
      horizon: new THREE.Color(0x182747),
      ground: new THREE.Color(0x0c1221),
      sun: new THREE.Color(0xff7744),
      hemiSky: new THREE.Color(0x324f85),
      hemiGround: new THREE.Color(0x1d263b),
      fog: new THREE.Color(0x131f3a),
    },
  };

  const smoothstep = (edge0, edge1, x) => {
    const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  let currentShadowFrustumD = 46;

  function updateSkyState(dt) {
    const t = ((state.time.t % 1) + 1) % 1;
    // t = 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset
    const phi = (t - 0.25) * Math.PI * 2;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    // Sun moves East (+X) -> South-High (+Y, +Z) -> West (-X) -> Nadir (-Y)
    state.time.sunDir.set(
      cosPhi,
      sinPhi * 0.88,
      sinPhi * 0.34 + 0.20
    ).normalize();

    const sunY = state.time.sunDir.y;

    // Smooth night factor: 0 in full day, 1 in full night
    const nightFactor = 1.0 - smoothstep(-0.14, 0.18, sunY);
    state.time.nightFactor = nightFactor;

    // Twilight factor peaks around sunrise/sunset (sunY near 0)
    const twilightFactor = Math.exp(-Math.pow((sunY - 0.02) / 0.19, 2));

    uniforms.uSunDir.value.copy(state.time.sunDir);
    uniforms.uMoonDir.value.copy(state.time.sunDir).negate();
    uniforms.uNightFactor.value = nightFactor;
    uniforms.uTwilightFactor.value = twilightFactor;
    uniforms.uTime.value = state.elapsed;

    // Interpolate palette colors across 4 regimes based on sunY
    let pA, pB, blend;
    if (sunY >= 0.06) {
      pA = PALETTE.golden;
      pB = PALETTE.day;
      blend = smoothstep(0.06, 0.42, sunY);
    } else if (sunY >= -0.07) {
      pA = PALETTE.dusk;
      pB = PALETTE.golden;
      blend = smoothstep(-0.07, 0.06, sunY);
    } else {
      pA = PALETTE.night;
      pB = PALETTE.dusk;
      blend = smoothstep(-0.22, -0.07, sunY);
    }

    uniforms.uZenithColor.value.lerpColors(pA.zenith, pB.zenith, blend);
    uniforms.uMidColor.value.lerpColors(pA.mid, pB.mid, blend);
    uniforms.uHorizonColor.value.lerpColors(pA.horizon, pB.horizon, blend);
    uniforms.uGroundColor.value.lerpColors(pA.ground, pB.ground, blend);
    uniforms.uSunColor.value.lerpColors(pA.sun, pB.sun, blend);

    hemiLight.color.lerpColors(pA.hemiSky, pB.hemiSky, blend);
    hemiLight.groundColor.lerpColors(pA.hemiGround, pB.hemiGround, blend);
    hemiLight.intensity = THREE.MathUtils.lerp(0.65, 0.42, nightFactor);

    scene.fog.color.lerpColors(pA.fog, pB.fog, blend);

    // Sun directional light & target placement per zone
    const isWild = (state.zone === 'wild');
    const wildOrigin = config.WILD?.origin || { x: 1000, z: 0 };
    const centerX = isWild ? wildOrigin.x : 0;
    const centerZ = isWild ? wildOrigin.z : 0;

    const targetD = isWild ? 72 : 46;
    if (targetD !== currentShadowFrustumD) {
      currentShadowFrustumD = targetD;
      sunLight.shadow.camera.left = -targetD;
      sunLight.shadow.camera.right = targetD;
      sunLight.shadow.camera.top = targetD;
      sunLight.shadow.camera.bottom = -targetD;
      sunLight.shadow.camera.updateProjectionMatrix();
    }

    hemiLight.position.set(centerX, 50, centerZ);

    const dayStrength = smoothstep(-0.04, 0.25, sunY);
    sunLight.intensity = dayStrength * 1.65;
    sunLight.color.copy(uniforms.uSunColor.value);
    sunLight.target.position.set(centerX, 0, centerZ);
    const sunDist = 75;
    sunLight.position.set(
      centerX + state.time.sunDir.x * sunDist,
      Math.max(6, state.time.sunDir.y * sunDist),
      centerZ + state.time.sunDir.z * sunDist
    );
    sunLight.visible = sunLight.intensity > 0.01;

    // Moon directional light (readable cool blue at night)
    const moonDir = uniforms.uMoonDir.value;
    moonLight.intensity = nightFactor * 0.62;
    moonLight.target.position.set(centerX, 0, centerZ);
    moonLight.position.set(
      centerX + moonDir.x * 60,
      Math.max(22, moonDir.y * 60),
      centerZ + moonDir.z * 60
    );
    moonLight.visible = moonLight.intensity > 0.01;

    // Scale metallic environment map & toneMappingExposure
    scene.environmentIntensity = THREE.MathUtils.lerp(0.55, 0.22, nightFactor);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.88, 0.90, nightFactor);

    // Keep sky dome centered on camera
    skyMesh.position.copy(camera.position);
  }

  // Run once immediately so state.time.sunDir & nightFactor are populated for downstream init
  updateSkyState(0);

  return {
    update(dt) {
      updateSkyState(dt);
    },
  };
}
