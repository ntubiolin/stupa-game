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
  if (renderer && typeof renderer.compile === 'function' && !ctx.isSoftwareWebGL) {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.75;
    roomEnv.dispose();
    pmremGenerator.dispose();
  }

  // ---------------------------------------------------------------- Fog
  const fogColor = new THREE.Color(0x9ec7eb);
  scene.fog = new THREE.FogExp2(fogColor, 0.0014);

  // ---------------------------------------------------------------- Lights
  const sunLight = new THREE.DirectionalLight(0xfff4dd, 1.55);
  sunLight.castShadow = !ctx.lowSpec;
  const shadowSize = ctx.lowSpec ? 512 : Math.min(config.RENDER.shadowMapSize || 1024, 1024);
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
    uCaveFactor: { value: 0.0 },
    uSubterranean: { value: 0.0 },
    uJapanStyle: { value: 0.0 },
    uTime: { value: 0.0 },
  };

  const skyGeo = new THREE.SphereGeometry(490, ctx.lowSpec ? 24 : 36, ctx.lowSpec ? 16 : 24);
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
      uniform float uCaveFactor;
      uniform float uSubterranean;
      uniform float uJapanStyle;
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
        for (int i = 0; i < 2; i++) {
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

        float outdoorVis = clamp(1.0 - max(uSubterranean, uCaveFactor * 0.92), 0.0, 1.0);

        // Directional sunset/sunrise horizon glow toward the sun azimuth
        vec2 sunHoriz = normalize(uSunDir.xz + vec2(1e-5));
        vec2 dirHoriz = normalize(dir.xz + vec2(1e-5));
        float azimDot = max(0.0, dot(dirHoriz, sunHoriz));
        float horizonBand = exp(-abs(y) * 5.5);
        skyCol += uSunColor * pow(azimDot, 2.2) * horizonBand * (0.28 + 0.45 * uTwilightFactor) * (1.0 - 0.85 * uNightFactor) * outdoorVis;

        // Subtle high-altitude wispy clouds
        if (y > 0.02 && outdoorVis > 0.01) {
          vec3 cloudCoord = vec3(dir.xz / (y + 0.18) * 1.4, 0.0);
          cloudCoord.x += uTime * 0.008;
          cloudCoord.y += uTime * 0.003;
          float c = fbm(cloudCoord);
          float cloudMask = smoothstep(0.38, 0.62, c) * smoothstep(0.02, 0.22, y) * smoothstep(0.95, 0.35, y);
          vec3 cloudLit = mix(vec3(0.96, 0.95, 0.94), uSunColor * 1.05, uTwilightFactor * 0.75);
          cloudLit = mix(cloudLit, vec3(0.16, 0.22, 0.36), uNightFactor * 0.85);
          skyCol = mix(skyCol, cloudLit, cloudMask * 0.28 * outdoorVis);

          // Japanese Yamato-e / Ukiyo-e Bokashi horizontal mist & golden cloud bands (大和繪霞・金雲)
          if (uJapanStyle > 0.5) {
            float kasumiWave = sin(y * 42.0 + sin(dir.x * 5.0 + dir.z * 5.0 + uTime * 0.04) * 1.8);
            float kasumiBand = smoothstep(0.45, 0.92, kasumiWave) * smoothstep(0.01, 0.08, y) * smoothstep(0.28, 0.06, y);
            vec3 kasumiCol = mix(vec3(0.99, 0.93, 0.84), uSunColor * 1.08, 0.45);
            skyCol = mix(skyCol, kasumiCol, kasumiBand * 0.32 * (1.0 - uNightFactor * 0.8) * outdoorVis);
          }
        }

        // Stars (visible at night above the horizon)
        if (uNightFactor > 0.01 && y > 0.0 && outdoorVis > 0.01) {
          float horizonFade = smoothstep(0.02, 0.28, y);
          float s1 = starLayer(dir, 95.0, 0.91, uTime);
          float s2 = starLayer(dir, 165.0, 0.94, uTime * 1.2);
          float stars = (s1 * 0.9 + s2 * 0.65) * horizonFade * uNightFactor;
          // Subtle Milky Way band
          float mwCoord = abs( dir.x * 0.65 + dir.z * 0.55 - dir.y * 0.35 );
          float mw = smoothstep(0.38, 0.0, mwCoord) * noise3(dir * 6.0) * 0.12 * horizonFade * uNightFactor;
          vec3 starCol = mix(vec3(0.82, 0.90, 1.0), vec3(1.0, 0.92, 0.80), hash31(floor(dir * 95.0)));
          skyCol += (starCol * stars + vec3(0.35, 0.48, 0.78) * mw) * outdoorVis;
        }

        // Sun disc and corona (larger painterly Yamato-e vermilion-gold sun disc on Japanese maps!)
        float sunCos = dot(dir, uSunDir);
        float sunVis = smoothstep(-0.08, 0.04, uSunDir.y) * outdoorVis;
        if (sunVis > 0.0 && sunCos > 0.2) {
          float sunHalo = pow(max(0.0, sunCos), 10.0) * 0.28 + pow(max(0.0, sunCos), 64.0) * 0.42;
          float discEdge0 = mix(0.9982, 0.9952, uJapanStyle);
          float discEdge1 = mix(0.9991, 0.9964, uJapanStyle);
          float sunDisc = smoothstep(discEdge0, discEdge1, sunCos);
          vec3 jpSunDiscCol = vec3(1.0, 0.42, 0.24);
          vec3 baseDiscCol = mix(uSunColor * 1.15, vec3(1.15, 1.08, 0.95), smoothstep(0.0, 0.35, uSunDir.y));
          vec3 discCol = mix(baseDiscCol, mix(jpSunDiscCol, vec3(1.05, 0.88, 0.62), smoothstep(0.05, 0.55, uSunDir.y)), uJapanStyle * 0.78);
          skyCol += (uSunColor * sunHalo + discCol * sunDisc * 0.95) * sunVis * smoothstep(-0.04, 0.02, y);
        }

        // Moon disc and cool lunar glow
        float moonCos = dot(dir, uMoonDir);
        float moonVis = smoothstep(-0.06, 0.08, uMoonDir.y) * (0.25 + 0.75 * uNightFactor) * outdoorVis;
        if (moonVis > 0.0 && moonCos > 0.4) {
          float moonHalo = pow(max(0.0, moonCos), 28.0) * 0.22 + pow(max(0.0, moonCos), 140.0) * 0.25;
          float moonDisc = smoothstep(0.9987, 0.9993, moonCos);
          float craters = moonDisc > 0.0 ? (0.84 + 0.16 * noise3(dir * 70.0)) : 1.0;
          vec3 moonCol = vec3(0.78, 0.87, 1.0) * craters;
          skyCol += (vec3(0.40, 0.56, 0.88) * moonHalo + moonCol * moonDisc * 0.95) * moonVis * smoothstep(-0.03, 0.02, y);
        }

        // Subterranean cavern rock vault & glowing mineral veins when inside Terma or deep cave
        float caveMix = max(uSubterranean, uCaveFactor * 0.78);
        if (caveMix > 0.01) {
          float rockNoise = fbm(dir * 11.5 + vec3(0.0, 1.7, 0.0));
          float ridgeNoise = abs(fbm(dir * 23.0) - 0.5) * 2.0;
          vec3 darkRock = mix(vec3(0.028, 0.024, 0.048), vec3(0.075, 0.068, 0.115), rockNoise);
          // Subtle glowing turquoise & amber mineral veins along rock fissures overhead
          float veinMask = smoothstep(0.14, 0.02, ridgeNoise) * smoothstep(-0.05, 0.45, y);
          float pulse = 0.75 + 0.25 * sin(uTime * 1.6 + dir.x * 6.0 + dir.z * 6.0);
          vec3 veinCol = mix(vec3(0.08, 0.58, 0.54), vec3(0.78, 0.48, 0.12), smoothstep(0.35, 0.68, rockNoise));
          vec3 cavernCol = darkRock + veinCol * veinMask * 0.42 * pulse * uSubterranean;
          skyCol = mix(skyCol, cavernCol, caveMix);
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

  // ---------------------------------------------------------------- Seasonal Solar Trajectory & Color Profiles
  const VALID_SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  if (!state.time.season || !VALID_SEASONS.includes(state.time.season)) {
    state.time.season = config.TIME?.defaultSeason || 'spring';
  }

  const SEASON_PROFILES = {
    spring: {
      id: 'spring',
      // Vernal equinox: balanced high sun arc, warm cherry-blossom gold daylight
      elevationScale: 0.88,
      elevationBias: 0.02,
      southSlope: 0.34,
      southOffset: 0.20,
      minSunHeight: 6.0,
      sunIntensityMult: 1.0,
      zenithTint: new THREE.Color(0x4b83d4),
      horizonTint: new THREE.Color(0xfce7f3),
      sunTint: new THREE.Color(0xfff4d6),
      tintWeight: 0.14,
      fogScale: 0.96,
    },
    summer: {
      id: 'summer',
      // Summer solstice: high zenith sun, short compact shadows, longer daylight
      elevationScale: 1.12,
      elevationBias: 0.11,
      southSlope: 0.14,
      southOffset: 0.06,
      minSunHeight: 8.5,
      sunIntensityMult: 1.12,
      zenithTint: new THREE.Color(0x165db0),
      horizonTint: new THREE.Color(0xdbeafe),
      sunTint: new THREE.Color(0xfffbeb),
      tintWeight: 0.16,
      fogScale: 0.84,
    },
    autumn: {
      id: 'autumn',
      // Autumnal equinox -> late autumn: lower southern sun arc, warm amber-gold light, long dramatic temple shadows
      elevationScale: 0.64,
      elevationBias: -0.03,
      southSlope: 0.50,
      southOffset: 0.44,
      minSunHeight: 4.6,
      sunIntensityMult: 0.98,
      zenithTint: new THREE.Color(0x3a68b2),
      horizonTint: new THREE.Color(0xfed7aa),
      sunTint: new THREE.Color(0xffd285),
      tintWeight: 0.28,
      fogScale: 1.05,
    },
    winter: {
      id: 'winter',
      // Winter solstice: low southern sun trajectory, extra-long crisp shadows, pale silver-blue sky
      elevationScale: 0.46,
      elevationBias: -0.08,
      southSlope: 0.64,
      southOffset: 0.60,
      minSunHeight: 3.6,
      sunIntensityMult: 0.88,
      zenithTint: new THREE.Color(0x476899),
      horizonTint: new THREE.Color(0xe2e8f0),
      sunTint: new THREE.Color(0xf1f5f9),
      tintWeight: 0.24,
      fogScale: 1.16,
    },
  };

  function setSeason(nextSeason, { silent = false } = {}) {
    const norm = String(nextSeason || '').trim().toLowerCase();
    if (!VALID_SEASONS.includes(norm)) return false;
    const prev = state.time.season;
    state.time.season = norm;
    updateSkyState(0);
    if (prev !== norm && !silent) {
      ctx.bus?.emit?.('season:change', { season: norm, previous: prev });
    }
    return true;
  }

  function getSeason() {
    return state.time.season || 'spring';
  }

  const smoothstep = (edge0, edge1, x) => {
    const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  let currentShadowFrustumD = 46;
  let timeOverride = null;
  let smoothedCaveFactor = 0;

  const tmpColA = new THREE.Color();
  const tmpColB = new THREE.Color();

  function computeCaveProfile() {
    const zone = state.zone || 'stupa';
    const pPos = state.player?.position;
    const px = pPos ? pPos.x : 0;
    const pz = pPos ? pPos.z : 0;

    if (zone === 'terma') {
      return {
        subterranean: 1.0,
        factor: 1.0,
        ceilingY: 5.5,
        kind: 'terma',
        lightCenter: { x: px || 7000, z: pz || 0 },
      };
    }

    // Check the 5 Chapter Terma Caves (`src/gameplay/termaCaves.js`)
    const termaCaveCoords = {
      pharping: { x: 1958, z: -56, kind: 'lampCave' },
      mangyul: { x: 2956, z: -24, kind: 'crystalCave' },
      yarlung: { x: 4052, z: -46, kind: 'crystalCave' },
      samye: { x: 5058, z: 22, kind: 'asuraCave' },
      chimphu: { x: 5976, z: -28, kind: 'hermitageCave' },
    }[zone];
    if (termaCaveCoords) {
      const dTermaCave = Math.hypot(px - termaCaveCoords.x, pz - termaCaveCoords.z);
      const fTermaCave = 1.0 - smoothstep(4.2, 8.6, dTermaCave);
      if (fTermaCave > 0.01) {
        return {
          subterranean: 0.0,
          factor: fTermaCave,
          ceilingY: 5.0,
          kind: termaCaveCoords.kind,
          lightCenter: { x: termaCaveCoords.x, z: termaCaveCoords.z },
        };
      }
    }

    if (zone === 'pharping') {
      const dYanglesho = Math.hypot(px - 2020, (pz - -46.2) * 1.12);
      const fYanglesho = 1.0 - smoothstep(5.8, 11.5, dYanglesho);
      const dAsura = Math.hypot(px - 1990, (pz - -91.5) * 1.1);
      const fAsura = 1.0 - smoothstep(5.5, 11.0, dAsura);
      if (fYanglesho >= fAsura && fYanglesho > 0.001) {
        return {
          subterranean: 0.0,
          factor: fYanglesho,
          ceilingY: 6.0,
          kind: 'lampCave',
          lightCenter: { x: 2020, z: -45.5 },
        };
      }
      if (fAsura > 0.001) {
        return {
          subterranean: 0.0,
          factor: fAsura,
          ceilingY: 7.4,
          kind: 'asuraCave',
          lightCenter: { x: 1990, z: -88 },
        };
      }
    } else if (zone === 'yarlung') {
      const dSheldrak = Math.hypot((px - 4061.0) * 0.9, (pz - -30.0) * 1.05);
      const fSheldrak = 1.0 - smoothstep(6.2, 11.8, dSheldrak);
      if (fSheldrak > 0.001) {
        return {
          subterranean: 0.0,
          factor: fSheldrak,
          ceilingY: 6.4,
          kind: 'crystalCave',
          lightCenter: { x: 4060, z: -30 },
        };
      }
    } else if (zone === 'chimphu') {
      const zFactor = smoothstep(-18.5, -26.5, pz);
      const xFactor = 1.0 - smoothstep(16.0, 24.0, Math.abs(px - 6000));
      const fChimphu = zFactor * xFactor;
      if (fChimphu > 0.001) {
        return {
          subterranean: 0.0,
          factor: fChimphu,
          ceilingY: 8.2,
          kind: 'hermitageCave',
          lightCenter: { x: 6000, z: -32 },
        };
      }
    }

    return {
      subterranean: 0.0,
      factor: 0.0,
      ceilingY: null,
      kind: 'none',
      lightCenter: null,
    };
  }

  function setTimeOverride({ t = 0.38, speed = 0, transitionSec = 0 } = {}) {
    const targetT = ((Number(t) % 1) + 1) % 1;
    const curT = ((state.time.t % 1) + 1) % 1;
    const dur = Math.max(0, Number(transitionSec) || 0);
    const spd = Number.isFinite(speed) ? Number(speed) : 0;
    const forwardDelta = ((targetT - curT) % 1 + 1) % 1;
    timeOverride = {
      active: true,
      startT: curT,
      targetT,
      forwardDelta,
      speed: spd,
      transitionSec: dur,
      elapsed: 0,
    };
    if (dur <= 0) {
      state.time.t = targetT;
      state.time.speed = spd;
    } else {
      state.time.speed = 0;
    }
    updateSkyState(0);
    return timeOverride;
  }

  function clearTimeOverride() {
    timeOverride = null;
    state.time.speed = 1;
    return true;
  }

  function updateSkyState(dt) {
    if (timeOverride && timeOverride.active && dt > 0) {
      timeOverride.elapsed += dt;
      if (timeOverride.transitionSec > 0 && timeOverride.elapsed < timeOverride.transitionSec) {
        const u = smoothstep(0, timeOverride.transitionSec, timeOverride.elapsed);
        state.time.t = (timeOverride.startT + timeOverride.forwardDelta * u) % 1;
        state.time.speed = 0;
      } else {
        const dayLen = config.TIME?.dayLengthSec || 240;
        if (timeOverride.transitionSec > 0 && timeOverride.elapsed - dt < timeOverride.transitionSec) {
          state.time.t = timeOverride.targetT;
        } else if (timeOverride.speed !== 0) {
          state.time.t = (((state.time.t + (dt * timeOverride.speed) / dayLen) % 1) + 1) % 1;
        } else {
          state.time.t = timeOverride.targetT;
        }
        state.time.speed = timeOverride.speed;
      }
    }
    const t = ((state.time.t % 1) + 1) % 1;
    // t = 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset
    const phi = (t - 0.25) * Math.PI * 2;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    const seasonKey = VALID_SEASONS.includes(state.time.season) ? state.time.season : 'spring';
    const seasonProf = SEASON_PROFILES[seasonKey] || SEASON_PROFILES.spring;

    // Sun moves East (+X) -> South-High (+Y, +Z) -> West (-X) -> Nadir (-Y),
    // with solar declination (altitude & southern arc) modulated by the active season.
    state.time.sunDir.set(
      cosPhi,
      sinPhi * seasonProf.elevationScale + seasonProf.elevationBias,
      sinPhi * seasonProf.southSlope + seasonProf.southOffset
    ).normalize();

    const sunY = state.time.sunDir.y;

    // Smooth night factor: 0 in full day, 1 in full night
    const nightFactor = 1.0 - smoothstep(-0.14, 0.18, sunY);
    state.time.nightFactor = nightFactor;

    // Twilight factor peaks around sunrise/sunset (sunY near 0)
    const twilightFactor = Math.exp(-Math.pow((sunY - 0.02) / 0.19, 2));

    const isJapanZone = state.zone === 'toji' || state.zone === 'koyasan';
    uniforms.uJapanStyle.value = isJapanZone ? 1.0 : 0.0;
    if (typeof document !== 'undefined' && document.body) {
      const targetAesthetic = isJapanZone ? 'japanese' : 'default';
      if (document.body.dataset.zoneAesthetic !== targetAesthetic) {
        document.body.dataset.zoneAesthetic = targetAesthetic;
      }
    }

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

    // Apply subtle seasonal sky & sun color temperature shift during daytime
    const dayTintWeight = (1.0 - nightFactor) * (isJapanZone ? Math.max(0.42, seasonProf.tintWeight * 1.9) : seasonProf.tintWeight);
    if (dayTintWeight > 0.001) {
      uniforms.uZenithColor.value.lerp(seasonProf.zenithTint, dayTintWeight * 0.75);
      uniforms.uHorizonColor.value.lerp(seasonProf.horizonTint, dayTintWeight);
      uniforms.uSunColor.value.lerp(seasonProf.sunTint, dayTintWeight);
    }
    if (isJapanZone && nightFactor < 0.85) {
      // Japanese Yamato-e / Ukiyo-e Bokashi horizon & mid-sky gradation (大和繪・浮世繪暈し色調)
      const jpMidTint =
        seasonKey === 'spring'
          ? 0x7da4d9
          : seasonKey === 'summer'
          ? 0x2e86c1
          : seasonKey === 'autumn'
          ? 0x8e5b82
          : 0x64748b;
      const jpHorizTint =
        seasonKey === 'spring'
          ? 0xfbd5e5
          : seasonKey === 'summer'
          ? 0xc8f2e4
          : seasonKey === 'autumn'
          ? 0xfbbf83
          : 0xe2e8f0;
      uniforms.uMidColor.value.lerp(tmpColA.setHex(jpMidTint), (1.0 - nightFactor) * 0.45);
      uniforms.uHorizonColor.value.lerp(tmpColB.setHex(jpHorizTint), (1.0 - nightFactor) * 0.58);
    }

    hemiLight.color.lerpColors(pA.hemiSky, pB.hemiSky, blend);
    hemiLight.groundColor.lerpColors(pA.hemiGround, pB.hemiGround, blend);
    if (dayTintWeight > 0.001) {
      hemiLight.color.lerp(seasonProf.horizonTint, dayTintWeight * 0.55);
    }
    hemiLight.intensity = THREE.MathUtils.lerp(isJapanZone ? 0.76 : 0.65, 0.42, nightFactor);

    // Fog color & density per map (map.sky or map.atmosphere overrides default)
    const mapDef = ctx.world?.getMap(state.zone);
    const skyCfg = mapDef?.sky || mapDef?.atmosphere;
    if (skyCfg?.fogColor != null && !isJapanZone) {
      scene.fog.color.set(skyCfg.fogColor);
      if (dayTintWeight > 0.001) {
        scene.fog.color.lerp(seasonProf.horizonTint, dayTintWeight * 0.35);
      }
    } else {
      scene.fog.color.lerpColors(pA.fog, pB.fog, blend);
      if (dayTintWeight > 0.001) {
        scene.fog.color.lerp(uniforms.uHorizonColor.value, isJapanZone ? (1.0 - nightFactor) * 0.72 : dayTintWeight * 0.45);
      }
    }
    scene.fog.density = (skyCfg?.fogDensity ?? 0.0022) * seasonProf.fogScale * (isJapanZone ? 1.12 : 1.0);

    // Evaluate cave interior profile (Terma subterranean dungeon or chapter caves)
    const caveProfile = computeCaveProfile();
    const lerpRate = dt > 0 ? Math.min(1, dt * 6.5) : 1;
    if (caveProfile.subterranean > 0.5) {
      smoothedCaveFactor = 1.0;
    } else {
      smoothedCaveFactor += (caveProfile.factor - smoothedCaveFactor) * lerpRate;
      if (smoothedCaveFactor < 0.001) smoothedCaveFactor = 0;
    }
    state.caveFactor = smoothedCaveFactor;
    state.caveCeilingY = caveProfile.ceilingY;
    uniforms.uSubterranean.value = caveProfile.subterranean;
    uniforms.uCaveFactor.value = smoothedCaveFactor;

    // Sun directional light & target placement per zone
    const isStupa = (state.zone === 'stupa');
    const mapOrigin = mapDef?.origin || config.WILD?.origin || { x: 1000, z: 0 };
    const centerX = isStupa ? 0 : mapOrigin.x;
    const centerZ = isStupa ? 0 : mapOrigin.z;

    if (caveProfile.subterranean > 0.5) {
      // Subterranean Terma Cavern Lighting: zero sky, player-centered crisp shadow key + warm/cool dual rim
      const pPos = state.player?.position;
      const lx = pPos ? pPos.x : centerX;
      const lz = pPos ? pPos.z : centerZ;

      const targetD = 30;
      if (targetD !== currentShadowFrustumD) {
        currentShadowFrustumD = targetD;
        sunLight.shadow.camera.left = -targetD;
        sunLight.shadow.camera.right = targetD;
        sunLight.shadow.camera.top = targetD;
        sunLight.shadow.camera.bottom = -targetD;
        sunLight.shadow.camera.updateProjectionMatrix();
      }

      uniforms.uZenithColor.value.setHex(0x06050c);
      uniforms.uMidColor.value.setHex(0x0a0814);
      uniforms.uHorizonColor.value.setHex(0x100d1e);
      uniforms.uGroundColor.value.setHex(0x050409);

      scene.fog.color.setHex(0x0b0916);
      scene.fog.density = 0.0135;

      hemiLight.position.set(lx, 28, lz);
      hemiLight.color.setHex(0x2d6e7e);       // Cool mineral turquoise from ceiling veins
      hemiLight.groundColor.setHex(0x523018); // Warm butter-lamp amber bounce from stone floor
      hemiLight.intensity = 0.68;

      sunLight.color.setHex(0xffdfa8);        // Warm golden butter-lamp & mandala key light
      sunLight.intensity = 1.15;
      sunLight.target.position.set(lx, 0, lz);
      sunLight.position.set(lx + 11, 24, lz + 9);
      sunLight.visible = true;

      moonLight.color.setHex(0x38bdf8);       // Secondary cool cyan-teal crystal rim light
      moonLight.intensity = 0.58;
      moonLight.target.position.set(lx, 0, lz);
      moonLight.position.set(lx - 12, 16, lz - 10);
      moonLight.visible = true;

      scene.environmentIntensity = 0.34;
      renderer.toneMappingExposure = 0.96;
    } else {
      const targetD = isStupa ? 46 : (smoothedCaveFactor > 0.35 ? 36 : 72);
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
      sunLight.intensity = dayStrength * 1.65 * seasonProf.sunIntensityMult;
      sunLight.color.copy(uniforms.uSunColor.value);
      sunLight.target.position.set(centerX, 0, centerZ);
      const sunDist = 75;
      sunLight.position.set(
        centerX + state.time.sunDir.x * sunDist,
        Math.max(seasonProf.minSunHeight, state.time.sunDir.y * sunDist),
        centerZ + state.time.sunDir.z * sunDist
      );

      // Moon directional light (readable cool blue at night)
      const moonDir = uniforms.uMoonDir.value;
      moonLight.color.setHex(0x7ca4ff);
      moonLight.intensity = nightFactor * 0.62;
      moonLight.target.position.set(centerX, 0, centerZ);
      moonLight.position.set(
        centerX + moonDir.x * 60,
        Math.max(22, moonDir.y * 60),
        centerZ + moonDir.z * 60
      );

      scene.environmentIntensity = THREE.MathUtils.lerp(0.55, 0.22, nightFactor);
      renderer.toneMappingExposure = skyCfg?.exposure ?? THREE.MathUtils.lerp(0.88, 0.90, nightFactor);

      // Smoothly blend into atmospheric Cave Interior Lighting when entering chapter caves
      if (smoothedCaveFactor > 0.005) {
        const cf = smoothedCaveFactor;
        const isCrystal = caveProfile.kind === 'crystalCave';
        const isAsura = caveProfile.kind === 'asuraCave';
        const pPos = state.player?.position;
        const cx = pPos ? pPos.x : (caveProfile.lightCenter?.x ?? centerX);
        const cz = pPos ? pPos.z : (caveProfile.lightCenter?.z ?? centerZ);

        // Darken sky backdrop & shift fog to deep cave mist
        tmpColA.setHex(isCrystal ? 0x0b1622 : isAsura ? 0x180d0a : 0x120e0b);
        uniforms.uZenithColor.value.lerp(tmpColA, cf * 0.88);
        uniforms.uMidColor.value.lerp(tmpColA, cf * 0.85);
        uniforms.uHorizonColor.value.lerp(tmpColA, cf * 0.82);
        scene.fog.color.lerp(tmpColA, cf * 0.78);
        scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.0068, cf);

        // Shift hemisphere light to cave stone roof & warm butter-lamp/crystal floor bounce
        tmpColA.setHex(isCrystal ? 0x2c6478 : isAsura ? 0x4a2418 : 0x3b322c);
        tmpColB.setHex(isCrystal ? 0x5c4822 : isAsura ? 0x7c2d12 : 0x6e4219);
        hemiLight.color.lerp(tmpColA, cf);
        hemiLight.groundColor.lerp(tmpColB, cf);
        hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, 0.56, cf);

        // Angle primary shadow light from cave mouth & warm up tone
        tmpColA.setHex(isCrystal ? 0xffe8a3 : isAsura ? 0xff944d : 0xffcf78);
        sunLight.color.lerp(tmpColA, cf * 0.75);
        sunLight.intensity = THREE.MathUtils.lerp(
          sunLight.intensity,
          Math.max(0.78, sunLight.intensity * 0.55),
          cf,
        );
        sunLight.target.position.lerp(new THREE.Vector3(cx, 0, cz), cf);
        sunLight.position.lerp(
          new THREE.Vector3(
            cx + (isCrystal ? -18 : 6),
            20,
            cz + (isCrystal ? -4 : 18),
          ),
          cf,
        );

        // Use moonLight as warm butter-lamp / crystal interior fill light inside the cave
        tmpColB.setHex(isCrystal ? 0x38bdf8 : isAsura ? 0xf97316 : 0xffa938);
        moonLight.color.lerp(tmpColB, cf);
        moonLight.intensity = THREE.MathUtils.lerp(moonLight.intensity, 0.68, cf);
        moonLight.target.position.lerp(new THREE.Vector3(cx, 1.0, cz), cf);
        moonLight.position.lerp(new THREE.Vector3(cx, 8.5, cz - 4), cf);

        scene.environmentIntensity = THREE.MathUtils.lerp(scene.environmentIntensity, 0.30, cf);
        renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure, 0.95, cf);
      }

      sunLight.visible = sunLight.intensity > 0.01;
      moonLight.visible = moonLight.intensity > 0.01;
    }

    // Keep sky dome centered on camera
    skyMesh.position.copy(camera.position);
  }

  // Run once immediately so state.time.sunDir & nightFactor are populated for downstream init
  updateSkyState(0);

  const api = {
    update(dt) {
      updateSkyState(dt);
    },
    setTimeOverride,
    clearTimeOverride,
    getTimeOverride() {
      return timeOverride;
    },
    setSeason,
    getSeason,
  };
  ctx.sky = api;
  ctx.debug?.register?.('sky', api);
  return api;
}
