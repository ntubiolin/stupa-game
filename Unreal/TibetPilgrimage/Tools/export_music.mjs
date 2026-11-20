// Render the original score and vocal bank with Chromium's offline Web Audio mixer.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUSIC_TRACKS } from '../../../src/data/music.js';

const tools = dirname(fileURLToPath(import.meta.url));
const root = resolve(tools, '../../..');
const output = resolve(tools, '../Saved/TibetMusic');
const modules = new Set(['/src/config.js', '/src/data/music.js', '/src/systems/music.js', '/src/data/mantraVocalBank.js']);
const ids = Object.keys(MUSIC_TRACKS).filter(id => !/^(story\.|mantra\.|boss\.default$)/.test(id));
const cues = ids.map(id => ({ id, name: id.replaceAll('.', '_'), vars: {} }));
cues.push({ id: 'stupa', name: 'stupa_night', vars: { night: true } });
await mkdir(output, { recursive: true });
const browser = await chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {});
try {
  for (const cue of cues) {
    const page = await browser.newPage();
    await page.route('http://score.local/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<html lang="en"></html>' });
      if (modules.has(path)) return route.fulfill({ path: root + path, contentType: 'text/javascript' });
      return route.abort();
    });
    const errors = [];
    page.on('console', message => { if (message.type() === 'warning') errors.push(message.text()); });
    await page.goto('http://score.local/');
    const download = page.waitForEvent('download', { timeout: 180000 });
    const rendered = await page.evaluate(async ({ id, name, vars }) => {
      const { CONFIG } = await import('/src/config.js');
      const { MUSIC_TRACKS } = await import('/src/data/music.js');
      const { createMusicEngine } = await import('/src/systems/music.js');
      const track = MUSIC_TRACKS[id];
      const rate = 32000;
      const bpm = typeof track.bpm === 'function' ? track.bpm(vars) : track.bpm;
      const frames = Math.round(2 * track.loopBars * track.beatsPerBar * 60 / bpm * rate);
      const blend = Math.floor(rate * 0.25);
      const context = new OfflineAudioContext(2, frames + blend, rate);
      const engine = createMusicEngine({
        ac: context, destination: context.destination, tracks: MUSIC_TRACKS,
        config: { ...CONFIG.MUSIC, volume: CONFIG.MUSIC.volume * CONFIG.MUSIC.defaultMusicVolume },
      });
      engine.play(id, vars, { fade: 0.05 });
      // Advance the live sequencer on the audio clock even when the render is faster than real time.
      for (let t = 0.5; t < (context.length - 128) / rate; t += 0.5) {
        context.suspend(t).then(() => { engine.tick(); return context.resume(); });
      }
      const buffer = await context.startRendering();
      engine.dispose();
      const wav = new ArrayBuffer(44 + frames * 4);
      const view = new DataView(wav);
      const tag = (at, text) => [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
      tag(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
      view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true);
      view.setUint16(32, 4, true); view.setUint16(34, 16, true);
      tag(36, 'data'); view.setUint32(40, frames * 4, true);
      let energy = 0;
      for (let c = 0; c < 2; c++) {
        const samples = buffer.getChannelData(c);
        for (let i = 0; i < frames; i++) {
          // Fold the continuing drone/reverb into the start for a continuous loop seam.
          const mix = Math.min(1, i / blend);
          const sample = i < blend ? samples[i] * mix + samples[frames + i] * (1 - mix) : samples[i];
          energy += sample * sample;
          view.setInt16(44 + 4 * i + 2 * c, 32767 * Math.max(-1, Math.min(1, sample)), true);
        }
      }
      if (!(energy / (2 * frames) > 0.000001)) throw new Error('Silent or invalid score: ' + id);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      link.download = name + '.wav';
      link.click();
      return Math.round(frames / rate);
    }, cue);
    await (await download).saveAs(resolve(output, cue.name + '.wav'));
    if (errors.length) throw new Error(cue.id + ': ' + errors.join(', '));
    console.log(cue.name, rendered + 's');
    await page.close();
  }
  await writeFile(resolve(output, 'cues.json'), JSON.stringify(cues.map(cue => cue.name)));
} finally {
  await browser.close();
}
