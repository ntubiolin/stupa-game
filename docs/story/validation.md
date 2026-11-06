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
CI omits video encoding but keeps all screenshot and gameplay checks. Movement
uses the runner's preinstalled Chrome (`google-chrome --version` is logged),
avoiding a redundant Chromium/font download; local acceptance uses Chrome too.
Movement
checks hold real input until the pose changes, with a 30-second timeout, rather
than assuming a GPU-less runner can render enough frames in 350 milliseconds.
Browser actions are bounded and failures include page text and screenshots;
the full CI job has a ten-minute limit.

## Verified

- Build and i18n pass: 2,186 symmetric keys, 919 data/UI references; no missing keys.
- 32 Node tests pass. Director ordering/duplicates/reentry/clip cancellation,
  every checkpoint reload, malformed/future saves, actual v1 migration,
  preservation of unrelated sections including newer cross-tab adventure data,
  camera bounds/collisions/touch/keyboard focus, reversible art, phone evidence,
  documentary fallback, and photograph tolerance boundaries/assist/capture.
- 14 production-browser scenarios pass, zero uncaught errors. Desktop Chinese and
  mobile English complete prologue → arrival → photography → restoration → Losang
  → map → Pharping vision → return diary → completion through visible controls.
- Touch and keyboard movement change the actual world pose. The flow then uses
  the visible navigation assistance and camera assist, and skips the documentary
  after exercising pause/replay. No debug beat transition completes either flow.
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
| Dawn / high | 57.0 / 85 | 60.0 / 85 | [Legacy](evidence/art-dawn-high-legacy.jpg) · [Cinematic](evidence/art-dawn-high-cinematic.jpg) |
| Dawn / low | 57.8 / 50 | 57.7 / 50 | [Legacy](evidence/art-dawn-low-legacy.jpg) · [Cinematic](evidence/art-dawn-low-cinematic.jpg) |
| Day / high | 57.8 / 85 | 58.5 / 85 | [Legacy](evidence/art-day-high-legacy.jpg) · [Cinematic](evidence/art-day-high-cinematic.jpg) |
| Day / low | 57.7 / 50 | 58.5 / 50 | [Legacy](evidence/art-day-low-legacy.jpg) · [Cinematic](evidence/art-day-low-cinematic.jpg) |
| Dusk / high | 58.5 / 50 | 60.0 / 85 | [Legacy](evidence/art-dusk-high-legacy.jpg) · [Cinematic](evidence/art-dusk-high-cinematic.jpg) |
| Dusk / low | 60.0 / 50 | 60.0 / 50 | [Legacy](evidence/art-dusk-low-legacy.jpg) · [Cinematic](evidence/art-dusk-low-cinematic.jpg) |

All samples have **zero PointLights**. Low disables shadow maps and caps DPR1;
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
