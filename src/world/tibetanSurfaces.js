// Original procedural tiles for the Tibetan chapter architecture. Colors
// multiply each material's existing palette so quest and story grades still apply.
import {
  DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace,
} from 'three';

const TAU = Math.PI * 2;
const fract = value => value - Math.floor(value);
const wave = phase => Math.sin(TAU * phase);
const edge = value => Math.min(fract(value), 1 - fract(value));
const clampByte = value => Math.min(255, Math.max(0, Math.round(value)));

function hash(x, y) {
  const bits = Math.imul(x + 17, 374761393) ^ Math.imul(y + 43, 668265263);
  return (Math.imul(bits ^ (bits >>> 13), 1274126177) >>> 0) / 4294967296;
}

function cloud(u, v, frequency) {
  const x = u * frequency;
  const y = v * frequency;
  const i = Math.floor(x);
  const j = Math.floor(y);
  const sx = fract(x) ** 2 * (3 - 2 * fract(x));
  const sy = fract(y) ** 2 * (3 - 2 * fract(y));
  const nextX = (i + 1) % frequency;
  const nextY = (j + 1) % frequency;
  const lower = hash(i, j) * (1 - sx) + hash(nextX, j) * sx;
  const upper = hash(i, nextY) * (1 - sx) + hash(nextX, nextY) * sx;
  return lower * (1 - sy) + upper * sy - 0.5;
}

function masonry(u, v, rows, columns, weather) {
  const row = Math.floor(v * rows);
  const shift = (row % 2) * 0.5 + hash(5, row) * 0.22;
  const course = u * columns + shift;
  const col = Math.floor(course) % columns;
  const joint = Math.min(edge(v * rows), edge(course));
  const mortar = Math.max(0, 1 - joint * 22);
  const bevel = Math.max(0, 1 - Math.abs(joint - 0.065) * 22);
  return 0.36 + 0.35 * hash(col, row) + weather * 0.32 - mortar * 0.55 + bevel * 0.09;
}

const profiles = {
  plaster: {
    repeat: 1, depth: 0.045, tint: [1, 0.99, 0.97], contrast: 68,
    sample(u, v, weather, grain) {
      // A soft baked contact band under the coping and at the base of walls.
      const foot = Math.max(0, 1 - v * 9) ** 2;
      const eave = Math.max(0, 1 - (1 - v) * 9) ** 2;
      return [0.82 + weather * 0.52 + grain * 0.08 - foot * 0.58 - eave * 0.52,
        0.57 + weather * 0.22 + grain * 0.22];
    },
  },
  masonry: {
    repeat: 1, depth: 0.14, tint: [1, 0.99, 0.97], contrast: 100,
    sample(u, v, weather) {
      const relief = masonry(u, v, 8, 5, weather);
      return [relief + weather * 0.26 + 0.13, relief];
    },
  },
  rock: {
    repeat: 2, depth: 0.17, tint: [1, 0.98, 0.96], contrast: 98,
    sample(u, v, weather, grain) {
      const strata = wave(v * 9 + 0.16 * wave(u * 2) + weather * 0.29);
      const seams = Math.max(0, wave(v * 4 + 0.14 * wave(u)) - 0.55);
      const relief = 0.64 + strata * 0.10 - seams * 0.64 + weather * 0.48;
      return [relief + grain * 0.09, relief + grain * 0.18];
    },
  },
  timber: {
    repeat: 1, depth: 0.05, tint: [1, 0.98, 0.95], contrast: 105,
    sample(u, v, weather) {
      const fiber = wave(u * 21 + wave(v * 2 + u) * 0.37 + weather);
      const narrowFiber = wave(u * 45 + 0.13 * wave(v * 3));
      const seam = Math.max(0, 1 - edge(u * 5) * 24);
      const relief = 0.67 + fiber * 0.14 + narrowFiber * 0.10 - seam * 0.25;
      return [relief + weather * 0.26, relief];
    },
  },
  roof: {
    repeat: 1, depth: 0.12, tint: [1, 0.99, 0.97], contrast: 112,
    sample(u, v, weather) {
      const rib = wave(u * 21) * 0.16;
      const lap = Math.max(0, 1 - edge(v * 8) * 18);
      const relief = 0.68 + rib - lap * 0.31 + weather * 0.20;
      return [relief + weather * 0.19, relief];
    },
  },
  paving: {
    repeat: 1, depth: 0.12, tint: [1, 0.99, 0.96], contrast: 105,
    sample(u, v, weather) {
      const relief = masonry(v, u, 4, 3, weather);
      return [relief + weather * 0.22 + 0.14, relief];
    },
  },
  cloth: {
    repeat: 1, depth: 0.025, tint: [1, 1, 1], contrast: 75,
    sample(u, v, weather) {
      const threads = wave(u * 24) * wave(v * 24) * 0.14;
      const hem = Math.max(0, 1 - Math.min(edge(u), edge(v)) * 42);
      const relief = 0.66 + threads + hem * 0.14;
      return [relief + weather * 0.25 + wave(u * 3) * 0.10, relief];
    },
  },
};

function makeTexture(data, size, repeat, name) {
  const texture = new DataTexture(data, size, size);
  texture.name = name;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.setScalar(repeat);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function buildTiles(surface, repeat, size) {
  const profile = profiles[surface];
  const color = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(color.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const weather = cloud(u, v, 4) + cloud(u, v, 16) * 0.42;
      const grain = hash(x, y) - 0.5;
      const [tone, height] = profile.sample(u, v, weather, grain);
      const offset = (y * size + x) * 4;
      const pigment = Math.min(255, 253 - profile.contrast * (1 - tone));
      for (let channel = 0; channel < 3; channel++) {
        color[offset + channel] = clampByte(pigment * profile.tint[channel]);
      }
      color[offset + 3] = relief[offset + 3] = 255;
      relief[offset] = clampByte(height * 255);
      relief[offset + 1] = clampByte(252 - height * 33 + weather * 12);
      relief[offset + 2] = 255;
    }
  }
  const map = makeTexture(color, size, repeat, `Tibetan ${surface} color`);
  map.colorSpace = SRGBColorSpace;
  const roughnessMap = makeTexture(relief, size, repeat, `Tibetan ${surface} relief`);
  return { map, roughnessMap };
}

export function createTibetanSurfaces(ctx) {
  const lowSpec = ctx.lowSpec || ctx.isMobile || globalThis.matchMedia?.('(pointer: coarse)').matches;
  const tiles = new Map();
  const textures = new Set();
  return {
    textures,
    apply(material, surface) {
      if (!tiles.has(surface)) {
        const tile = buildTiles(surface, profiles[surface].repeat, lowSpec ? 64 : 128);
        tiles.set(surface, tile);
        textures.add(tile.map).add(tile.roughnessMap);
      }
      const { map, roughnessMap } = tiles.get(surface);
      material.map = map;
      material.roughnessMap = roughnessMap;
      if (!lowSpec) {
        material.bumpMap = roughnessMap;
        material.bumpScale = profiles[surface].depth;
      }
      material.needsUpdate = true;
      return material;
    },
  };
}
