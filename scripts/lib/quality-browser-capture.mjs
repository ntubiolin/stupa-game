import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { arch, platform, release } from 'node:os';
import { resolve } from 'node:path';
import { chromium, devices } from 'playwright';
import { TextureUtils } from 'three';
import { adventureBrowserArgs, startAdventureWithInput } from '../adventure-browser-start.mjs';

const season = 'spring';
const frames = { warmup: 45, sample: 90 };
const profiles = [
  ['desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
  ['mobile', { ...devices['Pixel 7 landscape'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 }],
];

function percentile(values, p) {
  return values.toSorted((a, b) => a - b)[Math.ceil(values.length * p) - 1];
}

function summarize(samples, gpu) {
  const intervalMs = samples.map(sample => sample.intervalMs);
  const render = Object.fromEntries(['calls', 'triangles', 'points', 'lines'].map(metric => {
    const values = samples.map(sample => sample.render[metric]);
    return [metric, { p50: percentile(values, 0.5), max: Math.max(...values) }];
  }));
  return {
    sampleCount: samples.length,
    frameMs: {
      p50: percentile(intervalMs, 0.5),
      p95: percentile(intervalMs, 0.95),
      max: Math.max(...intervalMs),
    },
    gpuMs: gpu.length > 0 ? {
      sampleCount: gpu.length,
      p50: percentile(gpu, 0.5),
      p95: percentile(gpu, 0.95),
      max: Math.max(...gpu),
    } : null,
    render,
  };
}

async function readProfile(page) {
  return page.evaluate(() => {
    const { renderer } = window.__stupa;
    const isMobile = document.body.classList.contains('is-mobile-device');
    const isSoftwareWebGL = document.body.classList.contains('low-spec-env');
    const gl = renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      viewport: [innerWidth, innerHeight],
      drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      devicePixelRatio,
      rendererPixelRatio: renderer.getPixelRatio(),
      touchPoints: navigator.maxTouchPoints,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      userAgent: navigator.userAgent,
      isMobile,
      isSoftwareWebGL,
      shadows: renderer.shadowMap.enabled,
      antialias: gl.getContextAttributes().antialias,
      pipeline: isMobile || isSoftwareWebGL ? 'direct' : 'composer-bloom-output',
      webgl: gl.getParameter(gl.VERSION),
      gpuRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      gpuTimerQuerySupported: gl.getSupportedExtensions().includes('EXT_disjoint_timer_query_webgl2'),
    };
  });
}

async function measureView(page, mapGroups) {
  const { textures, memory, ...metrics } = await page.evaluate(async ({ warmup, sample, mapGroups }) => {
    const { renderer, scene, state, camera, sky } = __stupa;
    const { info } = renderer;
    const originalReset = info.reset;
    const gl = renderer.getContext();
    const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const queries = [];
    const gpuSamples = [];
    let disjoint = false;
    const samples = [];
    let priorTime;
    let warm = 0;
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out waiting for rendered game frames')), 90_000);
        info.reset = () => {
          const now = performance.now();
          if (warm < warmup) {
            warm++;
          } else {
            samples.push({ intervalMs: now - priorTime, render: { ...info.render } });
          }
          priorTime = now;
          originalReset();
          if (timer && warm === warmup && samples.length < sample) {
            const query = gl.createQuery();
            if (query) {
              queries.push(query);
              gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
              // The game draws synchronously after info.reset() in this RAF callback.
              queueMicrotask(() => gl.endQuery(timer.TIME_ELAPSED_EXT));
            }
          }
          if (samples.length === sample) {
            clearTimeout(timeout);
            resolve();
          }
        };
      });
      info.reset = originalReset;
      if (timer) {
        // Poll results later so waiting for the GPU does not stall a measured frame.
        const deadline = performance.now() + 3000;
        while (queries.length && performance.now() < deadline) {
          if (gl.getParameter(timer.GPU_DISJOINT_EXT)) {
            disjoint = true;
            break;
          }
          while (queries.length && gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)) {
            const query = queries.shift();
            gpuSamples.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(query);
          }
          if (queries.length) await new Promise(requestAnimationFrame);
        }
      }
    } finally {
      info.reset = originalReset;
      for (const query of queries) gl.deleteQuery(query);
    }

    const textures = new Map();
    let pointLights = 0;
    let activePointLights = 0;
    scene.traverse(object => { if (object.isPointLight) pointLights++; });
    scene.traverseVisible(object => {
      if (object.isPointLight && object.intensity > 0) activePointLights++;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material?.visible) continue;
        const texturesAndUniforms = [
          ...Object.values(material),
          ...Object.values(material.uniforms || {}).map(uniform => uniform.value),
          ...(material.userData.extraTextures || []),
        ];
        for (const texture of texturesAndUniforms) {
          if (!texture?.isTexture || texture.isCubeTexture || texture.isRenderTargetTexture
              || texture.isDataArrayTexture || texture.isData3DTexture || !renderer.properties.has(texture)) continue;
          const allocation = renderer.properties.get(texture).__webglTexture;
          if (allocation && texture.image?.width && texture.image?.height) textures.set(allocation, texture);
        }
      }
    });

    return {
      samples,
      gpuSamples: disjoint ? [] : gpuSamples,
      gpuTimingStatus: !timer ? 'unavailable' : disjoint ? 'disjoint' : gpuSamples.length === sample ? 'complete' : 'incomplete',
      state: { mode: state.mode, zone: state.zone, uiOpen: state.uiOpen, time: state.time.t,
        season: sky.getSeason(), nightFactor: state.time.nightFactor,
        visibleMaps: Object.entries(mapGroups)
          .filter(([, name]) => scene.getObjectByName(name)?.visible).map(([map]) => map) },
      camera: { position: camera.position.toArray(), rotation: camera.quaternion.toArray(),
        fov: camera.fov, aspect: camera.aspect },
      pointLights,
      activePointLights,
      memory: { ...info.memory },
      textures: [...textures.values()].map(texture => ({
        format: texture.format,
        type: texture.type,
        generateMipmaps: texture.generateMipmaps && texture.mipmaps.length === 0,
        levels: (texture.mipmaps.length > 0 ? texture.mipmaps : [texture.image])
          .map(({ width, height }) => [width, height]),
      })),
    };
  }, { ...frames, mapGroups: { stupa: 'StupaZone', wild: 'WildZone', ...mapGroups } });

  let estimatedMaterialTextureBytes = 0;
  let unsupportedTextureCount = 0;
  for (const { format, type, generateMipmaps, levels } of textures) {
    try {
      if (generateMipmaps) {
        let [width, height] = levels[0];
        while (width > 1 || height > 1) {
          width = Math.max(1, Math.floor(width / 2));
          height = Math.max(1, Math.floor(height / 2));
          levels.push([width, height]);
        }
      }
      estimatedMaterialTextureBytes += levels.reduce((bytes, [width, height]) => (
        bytes + TextureUtils.getByteLength(width, height, format, type)
      ), 0);
    } catch {
      unsupportedTextureCount++;
    }
  }
  return {
    ...metrics,
    memory: { ...memory, estimatedMaterialTextureBytes, uploadedMaterialTextures: textures.length, unsupportedTextureCount },
  };
}

function escapeHtml(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const comparisonMetrics = [
  { title: 'Draw calls, median', digits: 0, read: view => view.render.calls.p50 },
  { title: 'Triangles, median', digits: 0, read: view => view.render.triangles.p50 },
  { title: 'Renderer textures', digits: 0, read: view => view.memory.textures },
  { title: 'Material textures, MiB (est.)', digits: 2, read: view => view.memory.estimatedMaterialTextureBytes / (1024 * 1024) },
  { title: 'Frame interval, p95 ms', digits: 2, read: view => view.frameMs.p95 },
  { title: 'GPU render time, p95 ms', digits: 2, read: view => view.gpuTimingStatus === 'complete' ? view.gpuMs.p95 : null },
];

const formatMetric = (value, digits) => value == null ? '—' :
  value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function comparisonTable(metrics) {
  const rows = metrics.map(({ title, digits, before, after, delta }) => {
    const signed = delta > 0 ? '+' : '';
    return `<tr><th scope="row">${title}</th><td>${formatMetric(before, digits)}</td><td>${formatMetric(after, digits)}</td><td>${signed}${formatMetric(delta, digits)}</td></tr>`;
  });
  return `<table><thead><tr><th scope="col">Metric</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Δ</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

async function readPngInfo(dir, file) {
  const bytes = await readFile(resolve(dir, file));
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${dir}/${file}: expected PNG`);
  return {
    size: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)],
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export async function runQualityCapture({
  title, envPrefix, defaultOutput, defaultMap, views, mapAssets, prepareMap,
  mapGroups = { toji: 'Zone_toji' }, sceneSetup,
}) {
  const base = process.env.STORY_BASE_URL || 'http://127.0.0.1:4173';
  const output = resolve(process.env[envPrefix + '_OUTPUT'] || defaultOutput);
  const requiredAssets = Object.values(mapAssets).flatMap(config => config.files);
  const methodology = {
    camera: 'Map-local positions and targets, 55° vertical FOV, fixed after the normal camera-rig update.',
    render: 'Game animation loop in Adventure play mode, including its active post-processing and shadow passes.',
    gpuTime: 'When supported, WebGL timer queries measure GPU elapsed milliseconds over game-render commands. Samples are discarded if the GPU reports a disjoint event.',
    frameIntervals: 'Milliseconds between consecutive submitted game renders after warmup, including browser pacing and any software-renderer throttle. These intervals do not isolate GPU work.',
    textureBytes: 'Estimated decoded allocation of uploaded 2D material textures attached to the visible scene graph, deduplicated by WebGL texture and including mip levels. Excludes render targets, cube maps, driver overhead and hidden maps.',
    ...(sceneSetup && { sceneSetup }),
    device: 'Both runs use Chromium on the same desktop host. Mobile activates the game’s mobile quality settings via Chromium touch, UA, and viewport emulation.',
  };

  async function setView(page, view) {
    await page.evaluate(({ view, season, map }) => {
      const { cameraRig, camera, sky, world } = __stupa;
      const { x, z } = world.getMap(map).origin;
      const { from, at, time } = view;
      const update = cameraRig.update;
      cameraRig.update = (dt) => {
        update(dt);
        camera.position.set(x + from[0], from[1], z + from[2]);
        camera.lookAt(x + at[0], at[1], z + at[2]);
        camera.updateMatrixWorld();
      };
      window.restoreQualityCaptureView = () => {
        cameraRig.update = update;
        sky.clearTimeOverride();
      };
      sky.setSeason(season);
      sky.setTimeOverride({ t: time, speed: 0 });
    }, { view, season, map: view.map || defaultMap });
  }

  async function captureProfile(browser, report, dir, name, options) {
    const context = await browser.newContext(options);
    try {
      const page = await context.newPage();
      const assets = new Map();
      const errors = [];
      const profile = { name, assets: {}, errors, views: [] };
      report.profiles.push(profile);
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('requestfailed', request => {
        errors.push(`${request.url()}: ${request.failure()?.errorText}`);
      });
      page.on('response', response => {
        const url = new URL(response.url());
        if (response.status() >= 400) errors.push(`${response.status()} ${url.pathname}`);
        const file = url.pathname.split('/').at(-1);
        if (url.pathname.startsWith('/models/kukai/') && requiredAssets.includes(file) && response.ok()) {
          assets.set(file, response.body().then(bytes => ({
            bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex'),
          })));
        }
      });
      // The standalone Vite build does not require remote webfonts for canvas captures.
      await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.fulfill({ status: 200, body: '' }));
      await page.goto(`${base}/?mode=adventure&debug`);
      await startAdventureWithInput(page, { mobile: name === 'mobile' });
      await page.addStyleTag({ content: '#ui { visibility: hidden !important }' });
      profile.renderer = await readProfile(page);
      assert.equal(profile.renderer.isMobile, name === 'mobile', `${name}: game quality mode`);
      assert.deepEqual(profile.renderer.viewport, [options.viewport.width, options.viewport.height]);
      assert.equal(profile.renderer.devicePixelRatio, options.deviceScaleFactor);
      if (name === 'mobile') {
        assert(profile.renderer.touchPoints > 0 && profile.renderer.coarsePointer);
        assert.equal(profile.renderer.pipeline, 'direct');
        assert.equal(profile.renderer.shadows, false);
        assert(profile.renderer.rendererPixelRatio <= 1.25, 'Mobile render DPR exceeds 1.25');
      }

      let activeMap;
      for (const view of views) {
        const map = view.map || defaultMap;
        if (activeMap !== map) {
          await prepareMap?.(page, map);
          await page.evaluate(map => __stupa.zones.teleport(map, { skipFade: true }), map);
          await page.waitForFunction(map => __stupa.state.zone === map, map);
          const fallback = mapAssets[map]?.fallback;
          if (fallback) {
            await page.waitForFunction(name => __stupa.scene.getObjectByName(name)?.visible === false,
              fallback, { timeout: 60_000 });
          }
          activeMap = map;
        }
        await setView(page, view);
        try {
          const { samples, gpuSamples, ...metrics } = await measureView(page, mapGroups);
          assert.equal(metrics.state.mode, 'play');
          assert.equal(metrics.state.zone, map);
          assert.equal(metrics.state.uiOpen, false, `${name} ${view.id}: an overlay is open`);
          assert.deepEqual(metrics.state.visibleMaps, [map], `${name} ${view.id}: unexpected visible maps`);
          assert.equal(metrics.state.season, season);
          assert(Math.abs(metrics.state.time - view.time) < 1e-8);
          assert(metrics.state.nightFactor >= (view.time >= 0.8 ? 0.9 : 0) &&
            metrics.state.nightFactor <= (view.time >= 0.8 ? 1 : 0.1), `${view.id}: unexpected night factor`);
          assert(metrics.pointLights <= 3, `${name} ${view.id}: added a PointLight`);
          assert(metrics.activePointLights <= 6, `${name} ${view.id}: global PointLight budget exceeded`);
          assert.equal(samples.length, frames.sample);
          assert.equal(metrics.camera.fov, 55);
          assert(samples.every(sample => sample.render.calls > 0 && sample.render.triangles > 0));
          const file = `${name}-${view.id}.png`;
          const png = await page.locator('#app canvas').screenshot({ path: resolve(dir, file), timeout: 60_000 });
          const summary = summarize(samples, gpuSamples);
          const sha256 = createHash('sha256').update(png).digest('hex');
          profile.views.push({ ...view, file, sha256, ...metrics, ...summary, samples, gpuSamples });
          console.log(`${name} ${view.id}  ${summary.render.calls.p50} calls  ${summary.render.triangles.p50} triangles  ${summary.frameMs.p95.toFixed(1)} ms p95`);
        } finally {
          await page.evaluate(() => window.restoreQualityCaptureView());
        }
      }

      for (const file of requiredAssets) assert(assets.has(file), `${name}: missing model ${file}`);
      profile.assets = Object.fromEntries(await Promise.all([...assets].map(async ([file, data]) => [file, await data])));
      assert.deepEqual(errors, [], `${name}: browser errors`);
    } finally {
      await context.close();
    }
  }

  async function capture() {
    const label = process.env[envPrefix + '_LABEL'] || 'after';
    assert(['before', 'after'].includes(label), envPrefix + '_LABEL must be before or after');
    const source = process.env[envPrefix + '_SOURCE'] || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const dir = resolve(output, label);
    await mkdir(dir, { recursive: true });
    const browser = await chromium.launch({
      headless: true,
      args: adventureBrowserArgs,
      ...(process.env.BROWSER_CHANNEL && { channel: process.env.BROWSER_CHANNEL }),
    });
    const report = {
      label, source, base, season, frames, methodology, capturedAt: new Date().toISOString(),
      host: { platform: platform(), arch: arch(), release: release(), chromium: browser.version() },
      profiles: [],
    };
    try {
      for (const [name, options] of profiles) await captureProfile(browser, report, dir, name, options);
      report.passed = true;
    } catch (error) {
      report.passed = false;
      report.error = error.message;
      throw error;
    } finally {
      await writeFile(resolve(dir, 'report.json'), JSON.stringify(report, null, 2));
      await browser.close();
    }
  }

  function comparisonHtml(before, after, profiles) {
    const profileSections = profiles.map(profile => {
      const { name, renderer, views } = profile;
      const pairs = views.map(view => {
        const figures = ['before', 'after'].map(label => `
          <figure>
            <figcaption>${label === 'before' ? 'Before' : 'After'}</figcaption>
            <a href="${label}/${view.file}"><img src="${label}/${view.file}" loading="lazy" alt="${view.title}, ${label}"></a>
          </figure>`).join('');
        return `<section><h3>${view.title}</h3><div class="pair">${figures}</div>${comparisonTable(view.metrics)}</section>`;
      });
      const label = name === 'mobile' ? 'Mobile emulation' : 'Desktop';
      return `<section id="${name}">
        <h2>${label}</h2>
        <p>${renderer.viewport.join(' × ')} CSS px · ${renderer.drawingBuffer.join(' × ')} render px ·
          ${renderer.pipeline === 'direct' ? 'Direct render' : 'Bloom composer'}</p>
        ${pairs.join('')}
      </section>`;
    });
    return `<!doctype html>
  <html lang="en">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; line-height: 1.5; color: #f4efe7; background: #161817; }
    body { max-width: 1480px; padding: 0 24px 36px; margin: 0 auto; }
    a { color: #ecd29a; }
    h1 { font-size: clamp(2rem, 5vw, 3.6rem); margin-bottom: 0; }
    h2 { margin: 48px 0 4px; }
    h3 { margin: 32px 0 12px; }
    p { max-width: 80ch; }
    nav { display: flex; gap: 16px; flex-wrap: wrap; }
    .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    figure { margin: 0; }
    figcaption { color: #e0d3bb; padding: 4px 0; }
    img { display: block; width: 100%; height: auto; background: #272926; }
    table { width: min(100%, 740px); margin-top: 16px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { padding: 6px; border-bottom: 1px solid #41443d; text-align: right; }
    th:first-child { text-align: left; }
    details { margin-top: 28px; }
    code { overflow-wrap: anywhere; }
  </style>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>Adventure mode, fixed spring daylight and night views. Both profiles ran in Chromium on the same desktop host.</p>
    <nav><a href="#desktop">Desktop</a><a href="#mobile">Mobile emulation</a><a href="comparison.json">Metrics JSON</a></nav>
    <details><summary>Builds and measurement methods</summary>
      <p>Before <code>${escapeHtml(before.source)}</code> · After <code>${escapeHtml(after.source)}</code></p>
      <ul>${Object.values(methodology).map(method => `<li>${escapeHtml(method)}</li>`).join('')}</ul>
      <p><a href="before/report.json">Before report</a> · <a href="after/report.json">After report</a></p>
    </details>
    ${profileSections.join('')}
  </main>
  </html>`;
  }

  async function compare() {
    const beforeDir = resolve(output, 'before');
    const afterDir = resolve(output, 'after');
    const [before, after] = await Promise.all([beforeDir, afterDir].map(async dir =>
      JSON.parse(await readFile(resolve(dir, 'report.json'), 'utf8'))));
    assert(before.passed && after.passed, 'Both capture runs must pass before comparison');
    assert.equal(before.label, 'before');
    assert.equal(after.label, 'after');
    assert.deepEqual(before.host, after.host, 'Use the same browser and host');
    assert.deepEqual(before.frames, after.frames);
    assert.equal(before.season, after.season);
    assert.deepEqual(before.methodology, after.methodology);
    const comparison = {
      before: { source: before.source, capturedAt: before.capturedAt },
      after: { source: after.source, capturedAt: after.capturedAt },
      host: before.host,
      frames: before.frames,
      season,
      methodology,
      profiles: [],
    };

    for (const [name] of profiles) {
      const prior = before.profiles.find(profile => profile.name === name);
      const next = after.profiles.find(profile => profile.name === name);
      assert(prior && next, `${name}: missing profile`);
      assert.deepEqual(prior.renderer, next.renderer, `${name}: renderer profile changed`);
      const profile = { name, renderer: prior.renderer, assets: { before: prior.assets, after: next.assets }, views: [] };
      comparison.profiles.push(profile);

      for (const { id, title, from, at, time, map } of views) {
        const previous = prior.views.find(view => view.id === id);
        const current = next.views.find(view => view.id === id);
        assert(previous && current, `${name} ${id}: missing view`);
        assert.deepEqual(previous.camera, current.camera, `${name} ${id}: camera changed`);
        const file = `${name}-${id}.png`;
        for (const result of [previous, current]) {
          assert.deepEqual(result.from, from);
          assert.deepEqual(result.at, at);
          assert.equal(result.time, time);
          assert.equal(result.map, map);
          assert.equal(result.file, file);
        }
        const [beforeImage, afterImage] = await Promise.all([beforeDir, afterDir].map(dir => readPngInfo(dir, file)));
        assert.deepEqual(beforeImage.size, afterImage.size, `${name} ${id}: image dimensions changed`);
        if (previous.sha256) assert.equal(previous.sha256, beforeImage.sha256, `${name} ${id}: before image changed`);
        if (current.sha256) assert.equal(current.sha256, afterImage.sha256, `${name} ${id}: after image changed`);
        const metrics = comparisonMetrics.map(({ title, digits, read }) => {
          const before = read(previous);
          const after = read(current);
          return { title, digits, before, after, delta: before == null || after == null ? null : after - before };
        });
        profile.views.push({
          id, title, file, size: beforeImage.size, from, at, time, map, metrics,
          sha256: { before: beforeImage.sha256, after: afterImage.sha256 },
        });
      }
    }

    await Promise.all([
      writeFile(resolve(output, 'comparison.json'), JSON.stringify(comparison, null, 2)),
      writeFile(resolve(output, 'index.html'), comparisonHtml(before, after, comparison.profiles)),
    ]);
    console.log(resolve(output, 'index.html'));
  }

  if (process.argv.includes('--compare')) await compare();
  else await capture();
}
