# Independent review consolidation — #91–#98

AGY `gemini-4-argon-high` JSON, read-only: two source-heavy calls timed out; bounded design
review returned ARCHITECTURALLY_SOUND_WITH_BOUNDED_RISKS. This is a design review, not a
claim that Gemini audited the implementation. Raw responses retained alongside this file.

- Cross-tab read/merge/write has no browser-wide atomic lock. Existing synchronous API and
  eager commits retained; sequential interleaving is tested, genuinely simultaneous writers
  remain a documented limitation. No remote synchronization claims.
- Story baseline is cloned; unknown story/root fields pass unchanged through Adventure.
  Failed commits/replay isolation covered by Node and browser tests.
- Lead fixed staged-scene disposal on resume failure and on a restore exception.
- Sol independent integration review found native keydown interception of dialog Tab/Space:
  fixed in #92, physically tested keyboard plus gameplay input blocking.
- Sol found title-link flush bypass: lead now prevents navigation and displays the save error.
- Sol found Chimphu scatter hidden by immediate stupa return: keep cave during diary, including
  reload framing, then return on completion.
- Sol found physical interactions hiding required narrative: explicit cards now show Chimphu
  keeper/custody, Yarlung calming/guardian, Samye builder and finale custody text. Animation
  follows confirmation; these retain their physical approach targets.
- Dynamic translation audit found Samye/finale summary and diary button keys absent; added
  bilingual keys and a registry-wide check including all scripted cards and codex ids.

No merge performed. Source text fallback remains intentional pending approved media.
