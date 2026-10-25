import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural CanvasTexture for Tibetan woodblock-printed prayer flags (Lungta):
 * fabric weave, decorative border, central Windhorse motif, and rows of Uchen script.
 */
function createPrayerFlagPrintTexture() {
  const w = 256;
  const h = 320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');

  // Base warm white (multiplied by per-instance 5-element flag color)
  g.fillStyle = '#f6f3ec';
  g.fillRect(0, 0, w, h);

  // Subtle woven cotton texture lines
  g.fillStyle = 'rgba(0, 0, 0, 0.04)';
  for (let y = 0; y < h; y += 3) {
    g.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 3) {
    g.fillRect(x, 0, 1, h);
  }

  // Woodblock ink border frame
  g.strokeStyle = 'rgba(28, 22, 18, 0.55)';
  g.lineWidth = 4;
  g.strokeRect(12, 14, w - 24, h - 28);
  g.lineWidth = 2;
  g.strokeRect(18, 20, w - 36, h - 40);

  // Rows of abstract Tibetan Uchen script lines
  g.fillStyle = 'rgba(25, 20, 16, 0.48)';
  const numRows = 14;
  for (let r = 0; r < numRows; r++) {
    const ry = 32 + r * 19;
    // Leave central medallion open for the Windhorse (Lungta)
    const inCenter = r >= 4 && r <= 9;

    // Horizontal Uchen head-bar
    if (!inCenter) {
      g.fillRect(26, ry, w - 52, 2);
    } else {
      g.fillRect(26, ry, 48, 2);
      g.fillRect(w - 74, ry, 48, 2);
    }

    // Syllable strokes hanging below the head-bar
    for (let x = 28; x < w - 32; x += 9) {
      if (inCenter && x > 72 && x < w - 78) continue;
      const charW = 4 + ((x * 7 + r * 13) % 4);
      const charH = 6 + ((x * 3 + r * 5) % 5);
      g.fillRect(x, ry + 2, 2, charH);
      if ((x + r) % 2 === 0) {
        g.fillRect(x + 2, ry + charH, charW - 2, 2);
      }
    }
  }

  // Central Windhorse (Lungta) emblem
  const cx = w * 0.5;
  const cy = h * 0.48;
  g.strokeStyle = 'rgba(25, 20, 16, 0.62)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, 42, 0, Math.PI * 2);
  g.stroke();

  // Stylized galloping horse & wish-fulfilling jewel on its back
  g.fillStyle = 'rgba(25, 20, 16, 0.58)';
  g.beginPath();
  g.ellipse(cx, cy + 4, 20, 10, -0.1, 0, Math.PI * 2);
  g.fill();
  // Neck & head
  g.beginPath();
  g.moveTo(cx + 12, cy);
  g.lineTo(cx + 22, cy - 18);
  g.lineTo(cx + 30, cy - 14);
  g.lineTo(cx + 18, cy + 4);
  g.closePath();
  g.fill();
  // Three flaming jewels (Norbu) on horse's back
  g.beginPath();
  g.arc(cx - 2, cy - 14, 8, 0, Math.PI * 2);
  g.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createPrayerFlags(ctx, anchors) {
  const { scene, state, colliders } = ctx;

  const group = new THREE.Group();
  group.name = 'PrayerFlags';
  scene.add(group);

  // Fallback anchors if stupa returned null
  const lines = anchors?.lines ? [...anchors.lines] : [];
  const darchors = anchors?.darchors || [];

  // Add secondary festoon garlands connecting outer perimeter wall posts & darchor tops
  if (lines.length >= 24) {
    for (let i = 0; i < 24; i++) {
      const next = (i + 1) % 24;
      lines.push({
        start: lines[i].end.clone(),
        end: lines[next].end.clone(),
        sag: 0.48,
        flagCount: 14,
      });
    }
  }

  // ---------------------------------------------------------------- 1. Tall Plaza Flagpoles (Darchor) & Colliders
  const poleGeos = [];
  const baseGeos = [];
  const goldGeos = [];
  const darchorBanners = [];

  for (let i = 0; i < darchors.length; i++) {
    const d = darchors[i];
    const poleH = 14.5;

    // Push circle collider for each plaza flagpole pedestal
    colliders.push({
      type: 'circle',
      x: d.x,
      z: d.z,
      r: 0.75,
    });

    // Stepped stone/whitewashed pedestal
    const b1 = new THREE.CylinderGeometry(0.68, 0.76, 0.55, 12);
    b1.translate(d.x, 0.275, d.z);
    baseGeos.push(b1);

    const b2 = new THREE.CylinderGeometry(0.46, 0.54, 0.5, 12);
    b2.translate(d.x, 0.8, d.z);
    baseGeos.push(b2);

    // Tall timber mast
    const mast = new THREE.CylinderGeometry(0.065, 0.13, poleH, 10);
    mast.translate(d.x, poleH * 0.5 + 0.5, d.z);
    poleGeos.push(mast);

    // Golden finial & canopy ring at mast top
    const topY = poleH + 0.5;
    const ring = new THREE.CylinderGeometry(0.26, 0.18, 0.35, 12);
    ring.translate(d.x, topY, d.z);
    goldGeos.push(ring);

    const spire = new THREE.ConeGeometry(0.14, 0.55, 10);
    spire.translate(d.x, topY + 0.45, d.z);
    goldGeos.push(spire);

    // Connect a long high prayer-flag line from the stupa spire to each tall darchor top
    if (anchors?.top) {
      lines.push({
        start: anchors.top.clone(),
        end: new THREE.Vector3(d.x, topY - 0.2, d.z),
        sag: 2.8,
        flagCount: 46,
      });
    }

    // Vertical segmented 5-color darchor cloth banners along the mast
    const bannerSegments = 15;
    const segH = (poleH - 2.6) / bannerSegments;
    for (let s = 0; s < bannerSegments; s++) {
      darchorBanners.push({
        x: d.x,
        y: topY - 0.6 - s * segH,
        z: d.z,
        w: 0.72,
        h: segH * 0.96,
        colorIdx: s % 5,
        phase: i * 2.1 + s * 0.45,
      });
    }
  }

  if (baseGeos.length) {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xede7dc, roughness: 0.85 });
    const baseMesh = new THREE.Mesh(mergeGeometries(baseGeos, false), baseMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);
  }
  if (poleGeos.length) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.75 });
    const poleMesh = new THREE.Mesh(mergeGeometries(poleGeos, false), poleMat);
    poleMesh.castShadow = true;
    poleMesh.receiveShadow = true;
    group.add(poleMesh);
  }
  if (goldGeos.length) {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf2bc42, roughness: 0.25, metalness: 0.88 });
    const goldMesh = new THREE.Mesh(mergeGeometries(goldGeos, false), goldMat);
    goldMesh.castShadow = true;
    group.add(goldMesh);
  }

  // ---------------------------------------------------------------- 2. Shared Wind Uniforms
  // Note: uWavePhase is integrated cleanly from dt * speed each frame on CPU (and wrapped modulo 2π*100)
  // rather than computing `uTime * (a + b * uWindStrength)` in the vertex shader, which caused severe
  // phase-velocity jitter as `uTime` grew large while `uWindStrength` fluctuated.
  const windUniforms = {
    uSwayTime: { value: 0 },
    uWavePhase: { value: 0 },
    uWindDir: { value: new THREE.Vector2(1, 0.3).normalize() },
    uWindStrength: { value: 0.6 },
  };

  // ---------------------------------------------------------------- 3. Catenary Rope Strings (Swaying in sync with flags)
  const ropeGeos = [];
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const segs = 20;
    const ropePositions = [];
    const ropeSagAttr = [];
    const ropeIndices = [];
    const ropeRadius = 0.014;

    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      p0.lerpVectors(line.start, line.end, u);
      const sagWeight = 4 * u * (1 - u);
      p0.y -= line.sag * sagWeight;

      // 3-sided thin triangular prism cross-section along the catenary
      for (let c = 0; c < 3; c++) {
        const ca = (c / 3) * Math.PI * 2;
        ropePositions.push(
          p0.x + Math.cos(ca) * ropeRadius,
          p0.y + Math.sin(ca) * ropeRadius,
          p0.z
        );
        ropeSagAttr.push(sagWeight * line.sag * 0.22, lIdx * 1.37);
      }

      if (s < segs) {
        const base = s * 3;
        for (let c = 0; c < 3; c++) {
          const cNext = (c + 1) % 3;
          ropeIndices.push(base + c, base + 3 + c, base + cNext);
          ropeIndices.push(base + cNext, base + 3 + c, base + 3 + cNext);
        }
      }
    }

    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(ropePositions, 3));
    rGeo.setAttribute('aRopeSway', new THREE.Float32BufferAttribute(ropeSagAttr, 2));
    rGeo.setIndex(ropeIndices);
    rGeo.computeVertexNormals();
    ropeGeos.push(rGeo);
  }

  if (ropeGeos.length) {
    const mergedRopes = mergeGeometries(ropeGeos, false);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xd8ceb8,
      roughness: 0.9,
    });
    ropeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSwayTime = windUniforms.uSwayTime;
      shader.uniforms.uWindDir = windUniforms.uWindDir;
      shader.uniforms.uWindStrength = windUniforms.uWindStrength;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          attribute vec2 aRopeSway;
          uniform float uSwayTime;
          uniform vec2 uWindDir;
          uniform float uWindStrength;
          `
        )
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `
          #include <begin_vertex>
          float swayAmp = aRopeSway.x * (0.18 + 0.25 * uWindStrength);
          float swayWave = sin(uSwayTime + aRopeSway.y) * 0.65 + cos(uSwayTime * 1.62 + aRopeSway.y * 1.7) * 0.35;
          transformed.x += uWindDir.x * swayAmp * swayWave;
          transformed.z += uWindDir.y * swayAmp * swayWave;
          transformed.y += abs(swayWave) * swayAmp * 0.18;
          `
        );
    };
    const ropeMesh = new THREE.Mesh(mergedRopes, ropeMat);
    group.add(ropeMesh);
  }

  // ---------------------------------------------------------------- 4. Instanced Five-Color Prayer Flags with Vertex Cloth Flutter
  // Traditional Tibetan Lungta 5-element color order: Blue, White, Red, Green, Yellow
  const FLAG_COLORS = [
    new THREE.Color(0x1f5ec9), // Blue (Sky/Space)
    new THREE.Color(0xf4f0e4), // White (Air/Wind)
    new THREE.Color(0xcf2d24), // Red (Fire)
    new THREE.Color(0x238a49), // Green (Water)
    new THREE.Color(0xeab023), // Yellow (Earth)
  ];

  // Collect all flag placements (catenary line flags + vertical darchor banners)
  const flagRecords = [];
  const tangent = new THREE.Vector3();

  for (let lIdx = 0; lIdx < lines.length; lIdx++) {
    const line = lines[lIdx];
    const count = line.flagCount || 30;
    const lineLen = line.start.distanceTo(line.end);
    const flagW = THREE.MathUtils.clamp((lineLen / count) * 0.72, 0.26, 0.46);
    const flagH = flagW * 1.22;

    for (let f = 1; f < count; f++) {
      const u = f / count;
      const du = 0.005;

      p0.lerpVectors(line.start, line.end, u);
      const sagWeight = 4 * u * (1 - u);
      p0.y -= line.sag * sagWeight;

      p1.lerpVectors(line.start, line.end, Math.min(1, u + du));
      p1.y -= line.sag * 4 * (u + du) * (1 - (u + du));

      tangent.subVectors(p1, p0).normalize();

      flagRecords.push({
        pos: p0.clone(),
        tangent: tangent.clone(),
        scaleX: flagW,
        scaleY: flagH,
        color: FLAG_COLORS[(f + lIdx) % 5],
        ropeSwayAmp: sagWeight * line.sag * 0.22,
        ropeSeed: lIdx * 1.37,
        phase: f * 0.83 + lIdx * 2.17,
        isVertical: 0.0,
      });
    }
  }

  // Add the vertical Darchor flagpole banners
  for (let i = 0; i < darchorBanners.length; i++) {
    const b = darchorBanners[i];
    flagRecords.push({
      pos: new THREE.Vector3(b.x, b.y, b.z),
      tangent: new THREE.Vector3(1, 0, 0),
      scaleX: b.w,
      scaleY: b.h,
      color: FLAG_COLORS[b.colorIdx],
      ropeSwayAmp: 0.02,
      ropeSeed: i * 0.5,
      phase: b.phase,
      isVertical: 1.0,
    });
  }

  // Subdivided unit quad: x in [-0.5, 0.5], y in [-1.0, 0.0] (top edge y=0 attached to string)
  const flagGeo = new THREE.PlaneGeometry(1, 1, 5, 6);
  flagGeo.translate(0, -0.5, 0);

  const totalFlags = flagRecords.length;
  const flutterParams = new Float32Array(totalFlags * 4);
  for (let i = 0; i < totalFlags; i++) {
    const rec = flagRecords[i];
    flutterParams[i * 4 + 0] = rec.ropeSwayAmp;
    flutterParams[i * 4 + 1] = rec.ropeSeed;
    flutterParams[i * 4 + 2] = rec.phase;
    flutterParams[i * 4 + 3] = rec.isVertical;
  }
  flagGeo.setAttribute('aFlutter', new THREE.InstancedBufferAttribute(flutterParams, 4));

  const flagMat = new THREE.MeshStandardMaterial({
    map: createPrayerFlagPrintTexture(),
    roughness: 0.76,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  flagMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = windUniforms.uSwayTime;
    shader.uniforms.uWavePhase = windUniforms.uWavePhase;
    shader.uniforms.uWindDir = windUniforms.uWindDir;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
        #include <common>
        attribute vec4 aFlutter;
        uniform float uSwayTime;
        uniform float uWavePhase;
        uniform vec2 uWindDir;
        uniform float uWindStrength;
        `
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        #include <beginnormal_vertex>
        float nPhase = aFlutter.z;
        float nFree = mix(clamp(-position.y, 0.0, 1.0), clamp(position.x + 0.5, 0.0, 1.0), aFlutter.w);
        float nWave = cos(uWavePhase - nFree * 4.8 + position.x * 2.5 + nPhase);
        objectNormal.z += nWave * nFree * 0.45 * uWindStrength;
        objectNormal = normalize(objectNormal);
        `
      )
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        // Transform local vertex into instance space first
        vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);

        // 1. Synchronized rope sway at attachment point
        float swayAmp = aFlutter.x * (0.18 + 0.25 * uWindStrength);
        float ropeSeed = aFlutter.y;
        float swayWave = sin(uSwayTime + ropeSeed) * 0.65 + cos(uSwayTime * 1.62 + ropeSeed * 1.7) * 0.35;
        worldPos.x += uWindDir.x * swayAmp * swayWave;
        worldPos.z += uWindDir.y * swayAmp * swayWave;
        worldPos.y += abs(swayWave) * swayAmp * 0.18;

        // 2. Cloth flutter increasing from attached edge (0) to free edge (1)
        float phase = aFlutter.z;
        float isVert = aFlutter.w;
        float freeEdge = mix(clamp(-position.y, 0.0, 1.0), clamp(position.x + 0.5, 0.0, 1.0), isVert);
        float cornerFlex = pow(freeEdge, 1.35);

        float wave1 = sin(uWavePhase - freeEdge * 4.5 + position.x * 2.8 + phase);
        float wave2 = sin(uWavePhase * 1.63 - freeEdge * 8.2 - position.y * 3.1 + phase * 1.7) * 0.42;
        float flutter = (wave1 + wave2) * cornerFlex * (0.07 + 0.20 * uWindStrength);

        // Steady wind billow pushes free edge downwind and lifts it
        float billow = cornerFlex * (0.06 + 0.18 * uWindStrength) * (0.75 + 0.25 * wave1);
        vec2 perpWind = vec2(-uWindDir.y, uWindDir.x);

        worldPos.x += uWindDir.x * billow + perpWind.x * flutter;
        worldPos.z += uWindDir.y * billow + perpWind.y * flutter;
        worldPos.y += (abs(flutter) * 0.45 + billow * 0.32) * (1.0 - 0.5 * isVert);

        vec4 mvPosition = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;
        `
      );
  };

  const flagInstanced = new THREE.InstancedMesh(flagGeo, flagMat, totalFlags);
  flagInstanced.castShadow = false;
  flagInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const rotMat = new THREE.Matrix4();

  for (let i = 0; i < totalFlags; i++) {
    const rec = flagRecords[i];

    if (rec.isVertical > 0.5) {
      // Vertical darchor banner: attached along left edge (x = -0.5) to pole
      const windAngle = Math.atan2(state.wind.dir.y, state.wind.dir.x);
      dummy.position.copy(rec.pos);
      dummy.rotation.set(0, -windAngle, 0);
      dummy.translateX(rec.scaleX * 0.5 + 0.08);
      dummy.scale.set(rec.scaleX, rec.scaleY, 1);
      dummy.updateMatrix();
    } else {
      // Hanging catenary lungta: local +X aligns with rope tangent, local +Y stays near +Y
      xAxis.copy(rec.tangent).normalize();
      zAxis.crossVectors(xAxis, worldUp);
      if (zAxis.lengthSq() < 1e-4) zAxis.set(0, 0, 1);
      zAxis.normalize();
      yAxis.crossVectors(zAxis, xAxis).normalize();

      rotMat.makeBasis(xAxis, yAxis, zAxis);
      dummy.position.copy(rec.pos);
      dummy.rotation.setFromRotationMatrix(rotMat);
      dummy.scale.set(rec.scaleX, rec.scaleY, 1);
      dummy.updateMatrix();
    }

    flagInstanced.setMatrixAt(i, dummy.matrix);
    flagInstanced.setColorAt(i, rec.color);
  }
  flagInstanced.instanceMatrix.needsUpdate = true;
  if (flagInstanced.instanceColor) flagInstanced.instanceColor.needsUpdate = true;
  group.add(flagInstanced);

  const PHASE_WRAP = Math.PI * 2 * 1000;
  let smoothStrength = state.wind.strength || 0.6;

  return {
    update(dt) {
      // Smooth wind strength slightly and integrate phase incrementally so speed changes never
      // get multiplied by a huge `elapsed` timestamp (which caused violent jitter after ~1 min).
      smoothStrength += (state.wind.strength - smoothStrength) * Math.min(1, dt * 3.5);
      const swayRate = 1.6 + 0.7 * smoothStrength;
      const flutterRate = 5.2 + 3.2 * smoothStrength;

      windUniforms.uSwayTime.value = (windUniforms.uSwayTime.value + dt * swayRate) % PHASE_WRAP;
      windUniforms.uWavePhase.value = (windUniforms.uWavePhase.value + dt * flutterRate) % PHASE_WRAP;
      windUniforms.uWindDir.value.copy(state.wind.dir);
      windUniforms.uWindStrength.value = smoothStrength;
    },
  };
}
