import { JAPAN_CHAPTERS } from './japan.js';

const chapters = {
  qinglong: [
    ['initiation', [-9, 25], 'talk', 'huiguo'],
    ['sankosho', [0, 18], 'interact', 'vajra'],
    ['eastwardVow', [7, 18], 'interact', 'altar'],
  ],
  toji: [
    ['kukaiToji', [-9, 42], 'talk', 'kukai'],
    ['yakushi', [0, 20], 'interact', 'altar'],
    ['rittaiMandala', [0, -24], 'interact', 'mandala'],
    ['wardEarth', [-22, 32], 'ward', 'ward'],
    ['wardFire', [20, 26], 'ward', 'ward'],
    ['wardWind', [-21, -18], 'ward', 'ward'],
  ],
  kii: [
    ['kariba', [0, 42], 'talk', 'kariba'],
    ['blackDog', [-10, 29], 'interact', 'blackDog'],
    ['whiteDog', [12, 8], 'interact', 'whiteDog'],
    ['niu', [0, -22], 'talk', 'niu'],
    ['mountainPact', [0, -30], 'interact', 'altar'],
  ],
  koyasan: [
    ['kukaiGaran', [-54, 30], 'talk', 'kukai'],
    ['pineVajra', [-40, -8], 'interact', 'vajra'],
    ['petalPagoda', [-57, 21], 'walk', 'petal'],
    ['petalMiedo', [-44, 25], 'walk', 'petal'],
    ['petalKondo', [-27, 20], 'walk', 'petal'],
    ['lotusMandala', [-40, 16], 'interact', 'mandala'],
  ],
  kongobuji: [
    ['kukaiGarden', [-9, 24], 'talk', 'kukai'],
    ['ajikan', [0, 15], 'meditate', 'mandala'],
    ['westDragon', [-16, 1], 'interact', 'dragon'],
    ['eastDragon', [16, 1], 'interact', 'dragon'],
  ],
  okunoin: [
    ['kukaiOkunoin', [-5, 44], 'talk', 'kukai'],
    ['bridgeApproach', [0, 9], 'interact', 'altar'],
    ['bridgeCrossing', [0, -9], 'cross', 'altar'],
    ['personalLamp', [6, -26], 'interact', 'lamp'],
    ['mausoleumBow', [0, -47], 'bow', 'altar'],
    ['finale', [0, -47], 'talk', 'kukai'],
  ],
};

export const JAPAN_CAMPAIGN_CHAPTERS = JAPAN_CHAPTERS.map(({ mapId, origin }) => ({
  mapId,
  titleKey: `japan.campaign.chapter.${mapId}`,
  steps: chapters[mapId].map(([id, [x, z], action, model]) => ({
    id,
    mapId,
    position: { x: origin.x + x, z: origin.z + z },
    action,
    model,
    radius: action === 'talk' ? 3.4 : action === 'bow' ? 3.3 : 2.55,
    promptKey: `japan.campaign.prompt.${id}`,
    hintKey: `japan.campaign.hint.${id}`,
  })),
}));

export const JAPAN_CAMPAIGN_STEPS = JAPAN_CAMPAIGN_CHAPTERS.flatMap(chapter => chapter.steps);

// A bell-paced wave gives players time to retreat on either keyboard or touch.
export const JAPAN_WARD_TRIAL = Object.freeze({ duration: 2.4, dangerRadius: 4.5, outerRadius: 11 });
export const JAPAN_AJIKAN_TRIAL = Object.freeze({ duration: 3, radius: 2.8 });
