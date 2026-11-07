import { PHARPING_CHAPTER } from './chapters/pharping.js';
import { FINALE_CHAPTER } from './chapters/finale.js';
import { SAMYE_CHAPTER } from './chapters/samye.js';
import { CHIMPHU_CHAPTER } from './chapters/chimphu.js';
import { MANGYUL_CHAPTER } from './chapters/mangyul.js';
import { YARLUNG_CHAPTER } from './chapters/yarlung.js';
// Add enabled chapters here only after their runtime and scene are validated.
export const CHAPTERS = Object.freeze([
  PHARPING_CHAPTER,
  MANGYUL_CHAPTER, YARLUNG_CHAPTER, SAMYE_CHAPTER, CHIMPHU_CHAPTER, FINALE_CHAPTER,
]);

const chaptersById = new Map(CHAPTERS.map(chapter => [chapter.id, chapter]));

export function getChapter(id) {
  return chaptersById.get(id);
}
