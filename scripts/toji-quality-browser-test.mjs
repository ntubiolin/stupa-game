// Set STORY_BASE_URL, TOJI_QUALITY_SOURCE, TOJI_QUALITY_LABEL (before/after),
// and optionally TOJI_QUALITY_OUTPUT and BROWSER_CHANNEL. Use --compare to pair captures.
import { runQualityCapture } from './lib/quality-browser-capture.mjs';

await runQualityCapture({
  title: 'Tō-ji before and after',
  envPrefix: 'TOJI_QUALITY',
  defaultOutput: 'artifacts/toji-quality',
  defaultMap: 'toji',
  mapAssets: {
    toji: {
      fallback: 'TojiProceduralLandmarksFallback',
      files: ['toji_gojunoto.glb', 'toji_kondo.glb', 'toji_kodo.glb'],
    },
  },
  views: [
    { id: 'kondo', title: 'Kondō exterior', from: [23, 12, 42], at: [0, 6, 8], time: 0.39 },
    { id: 'yakushi', title: 'Principal Yakushi closeup', from: [0, 4.65, 12], at: [0, 4.75, 7.25], time: 0.39 },
    { id: 'courtyard', title: 'Front courtyard', from: [11.5, 3.6, 36], at: [1, 2.65, 19], time: 0.39 },
    { id: 'night', title: 'Kondō night smoke check', from: [23, 12, 42], at: [0, 6, 8], time: 0.86 },
  ],
});
