// Serve a frozen production build. Set STORY_BASE_URL, TEMPLE_EXPANSION_SOURCE,
// TEMPLE_EXPANSION_LABEL (before/after), and optionally TEMPLE_EXPANSION_OUTPUT
// and BROWSER_CHANNEL. Use --compare to generate comparison.json and index.html.
import { runQualityCapture } from './lib/quality-browser-capture.mjs';

const cameras = [
  ['toji', 'kodo', 'Tō-ji Kōdō exterior', [14, 7, -14], [0, 4.5, -36]],
  ['toji', 'kodo-dainichi', 'Kōdō principal Dainichi', [0, 4.55, -31.6], [0, 4.55, -36.4]],
  ['toji', 'gojunoto', 'Tō-ji Five-Story Pagoda', [56, 13, 51], [36, 14, 18]],
  ['koyasan', 'daito', 'Kōyasan Konpon Daitō exterior', [-43, 13, 34], [-62, 10, 6]],
  ['koyasan', 'daito-dainichi', 'Konpon Daitō principal Dainichi', [-62, 3.55, 10.5], [-62, 3.55, 6]],
  ['pharping', 'pharping-village', 'Pharping village and well', [-24, 10, 63], [-30, 2.9, 50]],
  ['pharping', 'pharping-cave', 'Pharping Yangleshö Cave', [14, 5.2, -27], [20, 3.5, -44]],
  ['mangyul', 'mangyul-bridge', 'Mangyul Kyirong bridge', [8, 9, 77], [0, 3.3, 67]],
  ['mangyul', 'mangyul-pass', 'Mangyul northern pass', [10, 19, -48], [0, 15, -65]],
  ['yarlung', 'yarlung-bridge', 'Yarlung river crossing', [-16, 10, 55], [0, 3, 39]],
  ['yarlung', 'yarlung-fortress', 'Yarlung Yumbulagang Fortress', [-30, 10.2, 32], [-45, 9.2, 20]],
  ['samye', 'samye-utse', 'Samye monastery and Utse hall', [31, 22, 46], [0, 6, 0]],
  ['chimphu', 'chimphu-terrace', 'Chimphu terrace and cave approach', [12, 11, 5], [0, 8, -19]],
];

await runQualityCapture({
  title: 'Japan temples and Tibet landscapes before and after',
  envPrefix: 'TEMPLE_EXPANSION',
  defaultOutput: 'artifacts/temple-expansion',
  sceneSetup: 'HUD and the combat enemy scene group are hidden in the browser. God mode protects the idle player. First-visit chapter cards are suppressed, and Samye uses monastery stage 4.',
  mapGroups: {
    toji: 'Zone_toji',
    koyasan: 'KoyasanMap',
    pharping: 'PharpingMap',
    mangyul: 'MangyulMap',
    yarlung: 'YarlungMap',
    samye: 'SamyeMap',
    chimphu: 'ChimphuMap',
  },
  mapAssets: {
    toji: {
      fallback: 'TojiProceduralLandmarksFallback',
      files: ['toji_gojunoto.glb', 'toji_kondo.glb', 'toji_kodo.glb'],
    },
    koyasan: {
      fallback: 'DanjoGaran_KonponDaito_Fallback',
      files: ['konpon_daito.glb'],
    },
  },
  views: cameras.flatMap(([map, id, title, from, at]) => [
    { map, id, title, from, at, time: 0.39 },
    { map, id: id + '-night', title: title + ' at night', from, at, time: 0.86 },
  ]),
  prepareMap: (page, map) => page.evaluate(map => {
    const { scene, quests, vitals, world } = __stupa;
    scene.getObjectByName('Enemies').visible = false;
    vitals.god(true);
    const introFlag = world.getMap(map).chapterIntro?.flag;
    if (introFlag) quests.setFlag(introFlag);
    if (map === 'samye') quests.setFlag('ch4.stage.4');
  }, map),
});
