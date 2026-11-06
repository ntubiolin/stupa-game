# Mirror Demo contracts / ADR-001

Scope: Epic #68, Stories #69–#74. Human review and merge only. Sources read in full on 2026-11-06: the linked plan and novel. Original wording is used for core dialogue, English is an adaptation. No finale spoilers.

## Isolation decision

`src/main.js` is the lead-owned launcher. Existing bootstrap moves unchanged to `src/adventure.js`; selecting adventure lazy-loads it. Narrative loads `src/story/runtime.js` with a fresh ctx/event bus and only shared world factories, save service, i18n, and debug. Switching modes performs a document navigation after save flush. This prevents adventure constructor/listener/serializer side effects, not merely combat HUD hiding. Story uses only `ctx.save` section `story`; adventure registrations never run in story. Existing player/camera/combat/map APIs stay intact.

## Shared APIs (frozen before parallel implementation)

- ctx: THREE, scene, camera, renderer, config, bus, i18n, save, debug, state, colliders, interactables, zoneGroups, stupaGroup, world. state has mode='story', zone, uiOpen, elapsed, time, wind, player.position/heading. Runtime owns initialization/world switching.
- `createStoryDirector(ctx)` -> ctx.story: `start()`, `signal(name,payload={})`, `getState()` (snapshot), `grantEvidence(id)`, `reset()`, `skipTo(beatId)` (debug), `playClip(id)`, `update(dt)`. No DOM/world dependencies.
- Canonical ordered beats: `prologue`, `arrival`, `photography`, `restoration`, `losang`, `map`, `vision`, `return`, `complete`. Signals: `prologue:complete`, `arrival:explored`, `photo:matched`, `documentary:complete` (clipId=restoration), `losang:complete`, `map:opened`, `vision:restored`, `return:read`. Validate against current beat; duplicates harmless. Beat events: `story:beat-start` {beat}, `story:beat-complete` {beat}, `story:evidence` {id}, `story:clip-play` {id}, `story:clip-end` {id,reason}. Bridge clip-end in director; replay cannot skip unrelated beat.
- Save `story`: version=1, beat, evidence[], choices{}, flags{}, clipsSeen[], elapsedSeconds. Evidence IDs: `train-recording`, `restoration-record`, `stone-record`, `old-map`, `new-diary`. No writes to other sections. Safe resume restarts beat, never restores an in-flight modal.
- `createNarrativeCamera(ctx)` -> ctx.storyCamera: `update(dt)`, `getPose()` -> {x,y,z,yaw,pitch,fov}, `setPose(pose)`, `setEnabled(bool)`, `dispose()`. Position is eye position; yaw=0 looks -Z, pitch positive looks up. Runtime sets zone and player ground position. UI sets state.uiOpen; camera blocks motion when true. Keyboard WASD/arrows, mouse drag, touch move/look. Own input listeners (no adventure input).
- `createCinematicArt(ctx)` -> ctx.storyArt: `update(dt)` (AFTER sky), `setPreset('cinematic'|'legacy')`, `setLighting('dawn'|'day'|'dusk')`, `setQuality('high'|'low')`, `getState()`, `dispose()`. Snapshot material values, reversible A/B. Zero PointLights.
- `createPhone(ctx)` -> ctx.phone: `open(tab='messages')`, `close()`, `isOpen()`, `update(dt)`, `dispose()`. Uses director snapshots/events. Phone completes prologue through explicit sequential choices and exposes unlocked evidence; runtime handles other world beats. `story:phone-open` {tab} optional. Register own `src/i18n/storyPhone.js`. UI owns only its modal and releases uiOpen on close. DO NOT auto-open during construction; runtime requests prologue phone after director.start().
- `createDocumentary(ctx)` -> ctx.documentary: `play(id)`, `pause()`, `resume()`, `skip()`, `close()`, `isOpen()`, `update(dt)`, `dispose()`. Listen story:clip-play. Emit story:clip-end once per session, reason complete/skip/cancel (cancel must not advance). Lazy cues, missing video/image text fallback. Pause and accessible replay.
- `createMemorySystem(ctx)` -> ctx.memory: `open()`, `close()`, `isOpen()`, `update(dt)`, `dispose()`. Real camera pose comparison and explicit capture signals `ctx.story.signal('photo:matched')`. Export pure evaluatePose(pose,target,tolerance). Touch assist changes actual camera pose, cannot bypass evaluator. Target canonical {x:0,y:1.68,z:31,yaw:0,pitch:0.34,fov:55}; tolerance position 2.5m, yaw .13rad, pitch .13rad, fov 8deg. Camera can set pose. Parent owns scene signpost and navigation.

## Ownership and merge plan

Lead: main/adventure/runtime, menu, world story interactions, package/scripts/CI, ARCHITECTURE/README, integration tests and final review.
A #69: storyDirector.js, data/story/beats.js, tests/storyDirector.test.mjs, i18n/storyDirector.js. Then D #72/#73 sequential tasks in separate branches: documentary + photography.
B #70: story/cinematicArt.js, story/narrativeCamera.js, story camera CSS, i18n/storyArt.js, tests/cinematic*.mjs; no existing shared world edits.
C #71: ui/story/phone.js + phone.css, data/story/phone*.js, i18n/storyPhone.js, tests/phone*.mjs; source novel local read-only /private/tmp/stupa-sources/novel.txt.
Each worktree branches from contract commit. No shared-file writes by workers. Each issue gets branch/PR; #72 and #73 separate commits/branches. Lead cherry-picks reviewed commits into integration branch, module PRs compare to contract base branch. Integration PR targets master; no merge occurs.

## Pacing, media, provenance

15-minute target at reading/exploration pace, never force a 15-minute timer. Provide optional reading, observation, accessible journey shortcuts; record actual automated path and do not call that a 15-minute human playtest. Media is original illustrative reconstruction, explicitly not archival photography. No imitation Tibetan glyphs, no invented spoken recording. Local cue sheets use stills, subtitles and procedural ambience; no network requirement. Initial story assets <= 2 MB, each lazy image <= 1 MB, total demo media <= 8 MB.

## Validation

Build + i18n on every component. Node tests for state transitions, save validation and photo thresholds. Lead runs independent whole-flow desktop/touch browser tests, restart/resume, keyboard, missing media, adventure regressions, same-pose A/B at 3 lighting x 2 quality settings, PointLight/draw calls/frame timing. AGY architecture reviews read-only with gemini-4-argon-high JSON output; results consolidated under .agent/reviews. No production deployment needed for preview.

### Integration refinements

`createSave(ctx,{writableSections:['story']})` is an optional write scope supplied
only by narrative. Before flushing it refreshes unrelated stored sections, so
an older story snapshot cannot roll back newer adventure progression in another
tab. The default adventure service API/behavior remains intact. Root save v1
migration and cross-tab preservation have independent regression tests.

Runtime owns modal arbitration; all UI is closed before a beat changes and
`uiOpen` is recomputed from actual modal visibility. Prologue and final vision
cards retain a visible reopening route. Restart flushes only story and reloads
the document to reset one-way shared-map effects such as Pharping rain.

Optional photo memory overlay is a labeled AI reconstruction, not historical
geometric evidence. The line guide uses game-world coordinates; acceptance is
based on actual camera pose, not the generated illustration.
