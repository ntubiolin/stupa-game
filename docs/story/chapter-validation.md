# Chapter integration validation

Preview branch: `codex/93-pharping`. Human acceptance and merge only; no master merge.
The integration includes independently committed component branches for #91–#98.
Read-only source snapshots remain outside the repository. Fixed dialogue and explicit game
adaptations use the novel/spec revisions recorded in `chapter-roadmap.md`.

## Test entry points
- `npm run build`, `npm run check:i18n`, `npm test`.
- `scripts/pharping-browser-test.mjs`: real desktop/touch Pharping actions, every checkpoint
  reload, retained six sacred-site records, completion and non-destructive replay.
- `scripts/chapter-browser-test.mjs`: later chapters via the visible journal and action
  buttons, every checkpoint reload, original codex records and transient replay.
- `scripts/adventure-compat-test.mjs`: real cast result/projectile/cooldown, equipment effect,
  historical waypoints/maps, codex, root-v1 migration, interleaved saves and local two-tab party.
- `scripts/story-browser-test.mjs`: complete original Demo, phone transcript, manual next
  image, recovery/media fallback and art matrix. Navigation assistance is explicitly used;
  these automated paths do not certify a 15-minute human reading pace.

Browser screenshots and reports are ignored `artifacts/` outputs, published as CI artifacts.
Desktop and emulated touch coverage is not a physical low-end-phone performance claim.
Party tests cover local BroadcastChannel behavior; remote multiplayer service availability
is outside this local fixture. Source-checked text fallback is intentional while #84/#85
final stills/Google Flow clips are pending; no generated deceased voice is used.

## Independent review
AGY invoked with `--model gemini-4-argon-high --output-format json --mode plan --sandbox`.
Two bounded source reviews timed out without findings; raw results are under `.agent/reviews`.
A timeout is not a passing independent review. Final status and any subsequent result will
be recorded with the PR. Lead inspection and independent browser runs remain mandatory.

## Verified local integration

- 74 Node tests; 2,460 keys per language; production build successful.
- Pharping 11 checkpoints and four later chapters (20/11/8/9 checkpoints), desktop and
  touch, reload every step. Repaired key narrative cards rechecked in Yarlung/Samye/Chimphu.
- Finale 16 checkpoints with desktop `end` and touch `retain` decisions; saved choices
  survive reload. Node replay takes the opposite choice without changing the saved original.
- Independent Sol run: actual in-game mode navigation, Tab/Shift+Tab/Space, movement/cast
  blocked behind the menu, quota failure and retry, same-origin equipment/codex persistence.
- Original Demo desktop/touch, all 12 recovery/fallback/Adventure scenarios and 12 native-DPR
  art combinations passed. 0 added PointLights. Headless browser, assisted navigation.
- AGY design-only review succeeded; risks and concrete Sol/lead fixes consolidated in
  `.agent/reviews/chapters-integration.md`.

Component drafts: #101–#108. Their frozen bases keep module diffs reviewable; the full
playable branch contains shared runtime/UI and follow-up review fixes. Do not merge these
review baselines into master independently. Integrator PR is the acceptance candidate.
