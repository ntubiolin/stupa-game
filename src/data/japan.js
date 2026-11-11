/** Ordered pilgrimage route. Map positions use the same origins as campaign coordinates. */
export const JAPAN_CHAPTERS = Object.freeze([
  ['qinglong', 10000],
  ['toji', 7500],
  ['kii', 10500],
  ['koyasan', 8000],
  ['kongobuji', 11000],
  ['okunoin', 11500],
].map(([id, x]) => Object.freeze({ id, mapId: id, origin: Object.freeze({ x, z: 0 }) })));

export const JAPAN_MAP_IDS = Object.freeze(JAPAN_CHAPTERS.map(chapter => chapter.mapId));

export function isJapanMap(id) {
  return JAPAN_MAP_IDS.includes(id);
}
