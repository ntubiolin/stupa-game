/**
 * Great Six-Syllable Mantra (六字大明咒: ཨོཾ་མ་ཎི་པ་དྨེ་ཧཱུྃ) area wave system.
 *
 * Casts a resonant golden lotus mandala wave that expands outward,
 * carrying the six glowing Tibetan syllables and damaging/cleansing
 * wild foes in the Wilderness (consuming MP), or unfolding a peaceful
 * blessing halo in the Stupa plaza.
 *
 * Strict zero-memory-leak pool: all Geometries, Materials, and Textures
 * are allocated ONCE at module init and reused forever.
 */
import * as THREE from 'three';

function createSyllableTexture(syllable) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  if (c) {
    c.clearRect(0, 0, 256, 256);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 118px "Noto Sans Tibetan", "Jomolhari", "Tibetan Machine Uni", "BabelStone Tibetan Slim", "Microsoft Himalaya", serif';

    // Warm golden outer glow
    c.shadowColor = 'rgba(255, 175, 40, 0.95)';
    c.shadowBlur = 28;
    c.fillStyle = '#fff4cc';
    c.fillText(syllable, 128, 128);

    // Warm golden inner glow
    c.shadowColor = 'rgba(255, 215, 80, 1.0)';
    c.shadowBlur = 12;
    c.fillText(syllable, 128, 128);

    // White core
    c.shadowBlur = 0;
    c.fillStyle = '#ffffff';
    c.fillText(syllable, 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createMantra(ctx) {
  const { scene, state, config, bus } = ctx;
  const M = config.MANTRA;

  // ---------------------------------------------------------------- Textures (init once)
  const syllables = M.syllables || ['ཨོཾ', 'མ', 'ཎི', 'པ', 'དྨེ', 'ཧཱུྃ'];
  const syllableTextures = syllables.map(createSyllableTexture);

  // ---------------------------------------------------------------- Shared Geometries (init once)
  const outerRingGeo = new THREE.RingGeometry(
    M.radius * (M.ringInnerRatio ?? 0.88),
    M.radius,
    M.ringSegments ?? 64
  );
  outerRingGeo.rotateX(-Math.PI / 2);

  const innerRingGeo = new THREE.RingGeometry(
    (M.innerRingRadius ?? 2.8) * (M.innerRingInnerRatio ?? 0.84),
    M.innerRingRadius ?? 2.8,
    M.ringSegments ?? 64
  );
  innerRingGeo.rotateX(-Math.PI / 2);

  // ---------------------------------------------------------------- Object Pool (init once)
  const poolSize = M.poolSize ?? 6;
  const pool = [];
  const mantraGroup = new THREE.Group();
  mantraGroup.name = 'MantraEffects';
  scene.add(mantraGroup);

  for (let k = 0; k < poolSize; k++) {
    const waveGroup = new THREE.Group();
    waveGroup.name = `MantraWave_${k}`;
    waveGroup.visible = false;

    const outerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 1.65, 0.45),
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.y = 0.02;
    waveGroup.add(outerRing);

    const innerRingMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.0, 1.5, 0.4),
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.y = 0.025;
    waveGroup.add(innerRing);

    const sprites = [];
    const spriteMats = [];
    for (let i = 0; i < syllables.length; i++) {
      const spriteMat = new THREE.SpriteMaterial({
        map: syllableTextures[i],
        color: new THREE.Color(2.0, 1.55, 0.55),
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, M.spriteHeight ?? 0.85, 0);
      const sScale = M.spriteScale ?? 0.85;
      sprite.scale.set(sScale, sScale, sScale);
      waveGroup.add(sprite);
      sprites.push(sprite);
      spriteMats.push(spriteMat);
    }

    mantraGroup.add(waveGroup);

    pool.push({
      group: waveGroup,
      outerRing,
      outerRingMat,
      innerRing,
      innerRingMat,
      sprites,
      spriteMats,
      active: false,
      t: 0,
      duration: M.duration ?? 0.5,
      startR: M.startRadius ?? 0.5,
      endR: M.radius ?? 6.0,
      origin: new THREE.Vector3(),
    });
  }

  // ---------------------------------------------------------------- Debug Wireframe Loop (init once)
  let showRadiusEnabled = false;
  const wireSegments = 64;
  const wirePositions = new Float32Array(wireSegments * 3);
  for (let i = 0; i < wireSegments; i++) {
    const theta = (i / wireSegments) * Math.PI * 2;
    wirePositions[i * 3] = Math.cos(theta) * (M.radius ?? 6.0);
    wirePositions[i * 3 + 1] = 0.05;
    wirePositions[i * 3 + 2] = Math.sin(theta) * (M.radius ?? 6.0);
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute('position', new THREE.BufferAttribute(wirePositions, 3));
  const wireMat = new THREE.LineBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const debugWire = new THREE.LineLoop(wireGeo, wireMat);
  debugWire.name = 'MantraDebugRadius';
  debugWire.visible = false;
  scene.add(debugWire);

  // ---------------------------------------------------------------- State & Trigger
  let cooldownRemaining = 0;

  function triggerWave(isPeaceful = false) {
    let wave = pool.find((w) => !w.active);
    if (!wave) {
      let maxProgress = -1;
      for (let k = 0; k < pool.length; k++) {
        const w = pool[k];
        const prog = w.t / w.duration;
        if (prog > maxProgress) {
          maxProgress = prog;
          wave = w;
        }
      }
    }
    if (!wave) wave = pool[0];

    wave.active = true;
    wave.t = 0;
    wave.duration = M.duration ?? 0.5;
    wave.startR = M.startRadius ?? 0.5;
    wave.endR = isPeaceful ? (M.stupaRadius ?? 1.5) : (M.radius ?? 6.0);
    wave.origin.copy(state.player.position);
    wave.group.position.copy(wave.origin);
    wave.group.visible = true;

    bus.emit('player:chant', { duration: M.duration ?? 0.5 });
    bus.emit('sfx', { name: 'chant' });

    if (!isPeaceful) {
      bus.emit('mantra:cast', {
        origin: state.player.position.clone(),
        radius: M.radius ?? 6.0,
        power: state.player.atk,
      });
    }
  }

  // ---------------------------------------------------------------- Update
  function update(dt) {
    cooldownRemaining = Math.max(0, cooldownRemaining - dt);

    // Trigger check
    if (state.mode === 'play' && ctx.input?.pressed('chant')) {
      const action = state.player.action;
      const cannotCast = action === 'faint' || action === 'hurt' || action === 'prostrate';
      if (!cannotCast && cooldownRemaining <= 0) {
        if ((state.zone || 'stupa') !== 'wild') {
          // Stupa peaceful chant: no MP spent, no mantra:cast event
          cooldownRemaining = M.stupaCooldown ?? 0.45;
          triggerWave(true);
        } else {
          // Wild zone: spends MP
          const mpCost = M.mpCost ?? 8;
          const spent = ctx.vitals ? ctx.vitals.spendMp(mpCost) : true;
          if (!spent) {
            bus.emit('toast', { key: 'toast.noMp', kind: 'warning' });
            bus.emit('mantra:nomp');
          } else {
            cooldownRemaining = M.cooldown ?? 0.9;
            triggerWave(false);
          }
        }
      }
    }

    // Animate active waves
    for (let k = 0; k < pool.length; k++) {
      const wave = pool[k];
      if (!wave.active) continue;

      wave.t += dt;
      const u = wave.t / wave.duration;
      if (u >= 1) {
        wave.active = false;
        wave.group.visible = false;
        wave.outerRingMat.opacity = 0;
        wave.innerRingMat.opacity = 0;
        for (let i = 0; i < wave.spriteMats.length; i++) {
          wave.spriteMats[i].opacity = 0;
        }
        continue;
      }

      // Smooth expansion: starts fast, reaches endR at u = 1
      const r = THREE.MathUtils.lerp(wave.startR, wave.endR, 1 - Math.pow(1 - u, 2));

      // Golden ring scale and opacity
      const opacity = Math.sin(u * Math.PI);
      wave.outerRingMat.opacity = opacity * 0.95;
      wave.innerRingMat.opacity = opacity * 0.8;

      const scale = r / (M.radius ?? 6.0);
      wave.outerRing.scale.set(scale, 1, scale);
      wave.innerRing.scale.set(scale, 1, scale);

      const rotSpeed = M.rotationSpeed ?? (Math.PI * 0.75);
      wave.outerRing.rotation.y = u * rotSpeed;
      wave.innerRing.rotation.y = -u * rotSpeed * 0.5;

      // 6 syllable sprites
      const sy = M.spriteHeight ?? 0.85;
      const baseSpriteScale = M.spriteScale ?? 0.85;
      for (let i = 0; i < wave.sprites.length; i++) {
        const angle = (i / wave.sprites.length) * Math.PI * 2 + u * rotSpeed;
        const sx = Math.cos(angle) * r;
        const sz = Math.sin(angle) * r;

        wave.sprites[i].position.set(sx, sy, sz);
        wave.spriteMats[i].opacity = opacity;
        const curScale = baseSpriteScale * (0.8 + 0.4 * opacity);
        wave.sprites[i].scale.set(curScale, curScale, curScale);
      }
    }

    // Debug wireframe tracking
    if (showRadiusEnabled) {
      debugWire.visible = true;
      debugWire.position.copy(state.player.position);
    } else {
      debugWire.visible = false;
    }
  }

  const api = {
    update,
    cast() {
      triggerWave(false);
    },
    showRadius(bool = true) {
      showRadiusEnabled = Boolean(bool);
      if (!showRadiusEnabled) debugWire.visible = false;
      return showRadiusEnabled;
    },
    getCooldownFraction() {
      const cd = M.cooldown || 0.9;
      return Math.max(0, Math.min(1, cooldownRemaining / cd));
    },
  };

  ctx.mantra = api;

  ctx.debug?.register('mantra', {
    cast: () => api.cast(),
    showRadius: (bool) => api.showRadius(bool),
  });

  return api;
}
