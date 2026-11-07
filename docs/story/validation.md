# Mirror Demo validation — 2026-11-06

Playable integration: [PR #80](https://github.com/ntubiolin/stupa-game/pull/80), branch `codex/68-mirror-demo`, human merge only. Module review PRs:
[#75](https://github.com/ntubiolin/stupa-game/pull/75) Director,
[#76](https://github.com/ntubiolin/stupa-game/pull/76) camera/art,
[#77](https://github.com/ntubiolin/stupa-game/pull/77) phone,
[#78](https://github.com/ntubiolin/stupa-game/pull/78) documentary,
[#79](https://github.com/ntubiolin/stupa-game/pull/79) photography.
These target the contract branch for focused review; the integration PR is the
single runnable candidate for master acceptance.

## Reproduction

```sh
npm ci
npm run build
npm run check:i18n
npm test
npx playwright install chromium
npm run preview -- --host 127.0.0.1 --port 4173
# another terminal
npm run test:browser
```

For installed Chrome use `BROWSER_CHANNEL=chrome`; override the server with
`STORY_BASE_URL`. Local acceptance used the **production build** at port 4174,
Chrome 156.0.8078.80, macOS, desktop 1440×900 DPR1 and touch-emulated 390×844 DPR2.
Local Playwright runs record both flows under `artifacts/story/video`; screenshots and JSON
are under `artifacts/story`. Generated test output is ignored; compressed review
screenshots and the final JSON are committed under `docs/story/evidence`.
CI omits video encoding but keeps all screenshot and gameplay checks. It
uses the runner's preinstalled Chrome (`google-chrome --version` is logged),
avoiding a redundant Chromium/font download; local acceptance uses Chrome too.
Software-rendered CI journeys select the supported low-quality setting and 0.5
render DPR, retaining the original CSS viewport and all gameplay assertions.
The A/B loop still selects both quality settings but uses 0.5 render DPR on CI.
CI screenshots/metrics are diagnostic, not visual-quality or device-performance
acceptance; the committed art evidence comes from full-resolution local runs.
Movement checks hold real input until the pose changes, with a 30-second timeout, rather
than assuming a GPU-less runner can render enough frames in 350 milliseconds.
Browser actions are bounded and failures include page text and screenshots;
CI runs desktop, mobile, recovery/adventure, and art suites in parallel, each with
a twenty-minute limit. The final `validate` job requires the build and every
browser matrix job to succeed; no scenario or assertion is omitted. Locally,
`npm run test:browser` still runs the whole suite, or set `STORY_SUITE` to one of
`desktop`, `mobile`, `recovery`, `art` to reproduce a CI shard.

## Verified

- Build and i18n pass: 2,190 symmetric keys, 919 data/UI references; no missing keys.
- 40 Node tests pass. Director ordering/duplicates/reentry/clip cancellation,
  every checkpoint reload, malformed/future saves, actual v1 migration,
  preservation of unrelated sections including newer cross-tab adventure data,
  camera bounds/collisions/touch/keyboard focus, reversible art, phone evidence,
  documentary fallback, and photograph tolerance boundaries/assist/capture.
- 14 production-browser scenarios pass, zero uncaught errors. Desktop Chinese and
  mobile English complete prologue → arrival → photography → restoration → Losang
  → map → Pharping vision → return diary → completion through visible controls.
- Touch and keyboard movement change the actual world pose. The flow then uses
  the visible navigation assistance and camera assist, and manually advances all four documentary cues
  after exercising pause/replay (including while paused). No debug beat transition completes either flow.
- Closing/reopening the prologue phone and the final vision card does not strand
  progress. All nine beat save fixtures resume to an actionable state.
- Missing restoration image leaves captions usable and can advance via Skip.
- Pre-existing v2 sections are byte-equivalent in their data before/after story.
- Adventure starts in play mode, equips a generated test item, casts Hum Bolt,
  loads and returns from the original Pharping map, exposes all nine maps and the
  co-op API. Existing adventure bootstrap is moved verbatim to adventure.js.
- Multiplayer internet synchronization was not exercised against production;
  its implementation is unchanged. The local test verifies its runtime remains
  present, not a full network compatibility certification.

## Visual evidence

| Stage | Desktop | Touch / English |
|---|---|---|
| Prologue | [image](evidence/desktop-01-prologue.jpg) | [image](evidence/mobile-01-prologue.jpg) |
| Photograph alignment | [image](evidence/desktop-04-photography.jpg) | [image](evidence/mobile-04-photography.jpg) |
| Restoration record | [image](evidence/desktop-05-documentary.jpg) | [image](evidence/mobile-05-documentary.jpg) |
| Finish reading | [image](evidence/desktop-05b-documentary-last.jpg) | [image](evidence/mobile-05b-documentary-last.jpg) |
| Old map | [image](evidence/desktop-06-map.jpg) | [image](evidence/mobile-06-map.jpg) |
| Vision | [image](evidence/desktop-07-vision.jpg) | [image](evidence/mobile-07-vision.jpg) |
| New diary | [image](evidence/desktop-08-diary.jpg) | [image](evidence/mobile-08-diary.jpg) |
| Completion | [image](evidence/desktop-09-complete.jpg) | [image](evidence/mobile-09-complete.jpg) |

Reviewed screenshots have no clipped actions or overlapping narrative text at
these sizes. The memory image is an AI illustration, explicitly not an archival
photograph; generated geometry and religious depiction remain for human review.

## A/B performance and limits

Same eye pose (0,1.68,31), yaw 0, pitch .34, FOV55. Each sample resets the rolling
counter, waits 1.2 seconds, and captures. Full raw measurements:
[evidence/browser-report.json](evidence/browser-report.json).

| Lighting / quality | Legacy FPS / calls | Cinematic FPS / calls | Paired screenshots |
|---|---|---|---|
| Dawn / high | 57.7 / 85 | 60.0 / 85 | [Legacy](evidence/art-dawn-high-legacy.jpg) · [Cinematic](evidence/art-dawn-high-cinematic.jpg) |
| Dawn / low | 57.7 / 50 | 57.7 / 50 | [Legacy](evidence/art-dawn-low-legacy.jpg) · [Cinematic](evidence/art-dawn-low-cinematic.jpg) |
| Day / high | 57.8 / 85 | 58.5 / 85 | [Legacy](evidence/art-day-high-legacy.jpg) · [Cinematic](evidence/art-day-high-cinematic.jpg) |
| Day / low | 57.7 / 50 | 57.7 / 50 | [Legacy](evidence/art-day-low-legacy.jpg) · [Cinematic](evidence/art-day-low-cinematic.jpg) |
| Dusk / high | 58.5 / 50 | 60.0 / 85 | [Legacy](evidence/art-dusk-high-legacy.jpg) · [Cinematic](evidence/art-dusk-high-cinematic.jpg) |
| Dusk / low | 60.0 / 50 | 60.0 / 50 | [Legacy](evidence/art-dusk-low-legacy.jpg) · [Cinematic](evidence/art-dusk-low-cinematic.jpg) |

All samples have **zero PointLights**. Low disables shadow maps, phone/card backdrop blur, and caps DPR1;
high uses the original capped DPR and directional shadows. These short headless
measurements, with browser capture overhead, are not a guarantee on physical
low-end phones or all laptops. Physical-device testing remains unmeasured.

The approximately 15-minute duration is the intended reading/exploration pace,
not a timer gate or a measured human result. Automated assisted flows finish in
seconds; they establish reachability and layout, not emotional pacing. Human
acceptance should play at a natural pace, read the transcript and six Losang
exchanges, explore the plaza, and watch the 42-second restoration sequence.

## Independent reviews

- Native GPT-6.1 Sol workers used isolated worktrees, followed by lead diff review
  and independently executed tests. Native runtime review found and resolved
  phone/final-vision close softlocks, reset/rain persistence, keyboard focus and
  failed-map retry behavior.
- Antigravity CLI ran `--model gemini-4-argon-high --output-format json --mode plan
  --sandbox`. Initial architecture review completed successfully; all 11 findings
  are consolidated in `.agent/reviews/architecture-resolution.md` with raw JSON.
- Two later integration-review attempts timed out (180s and 300s), returning no
  substantive findings. They are recorded as **timeouts, not PASS**. The first
  independent architecture review and lead/browser validation remain the evidence.
- Existing production-deploy failures predate this work. This change adds a PR
  regression workflow and does not deploy or merge to production.

## User playtest corrections

- [#81](https://github.com/ntubiolin/stupa-game/issues/81) / [PR #86](https://github.com/ntubiolin/stupa-game/pull/86): ordinary keyboard/touch speed is 4 m/s; Shift fast-walk is 6 m/s. Camera substeps collisions and owns its bounded delta, so the world's 50 ms animation cap does not further slow walking on 10 FPS devices.
- [#82](https://github.com/ntubiolin/stupa-game/issues/82) / [PR #88](https://github.com/ntubiolin/stupa-game/pull/88): partial replies and recording acknowledgment persist; the browser test reloads after three replies without a manual save/export, then verifies all seven replies after arrival and after final reload. Legacy history and isolated replay have additional regression coverage.
- [#83](https://github.com/ntubiolin/stupa-game/issues/83) / [PR #87](https://github.com/ntubiolin/stupa-game/pull/87): Next image works while paused; Finish reading completes once, with no mandatory countdown. Full desktop/touch journeys exercise these controls.
- The three review PRs target the fixed `codex/80-feedback-base`; #80 remains the complete integration candidate.
- Asset production requests: [#84 character references and stills](https://github.com/ntubiolin/stupa-game/issues/84), [#85 Google Flow storyboard](https://github.com/ntubiolin/stupa-game/issues/85). These are requests, not delivered new media; the demo retains its existing fallback assets.
- Earlier cloud software-WebGL runs exceeded the ten-minute budget. Run [42212536194](https://github.com/ntubiolin/stupa-game/actions/runs/42212536194) reached desktop completion but not the entire suite. They are not passes. Low quality now also disables phone/card backdrop blur; computed browser styles verify Low removes and High restores blur. Check #80 for the latest exact-head remote status.

The four CI shards are independently runnable: desktop = one full journey,
mobile = one full journey, recovery = twelve saved-state/fallback/adventure
scenarios, and art = all twelve lighting/quality/preset combinations. Together
they retain the fourteen gameplay scenarios and the full A/B matrix.
