# Approved chapter stills (#114)

Nine owner-approved 16:9 chapter illustrations for Mangyul, Yarlung, Samye, Chimphu and the Finale. These are AI-generated illustrative reconstructions for a fictional narrative, never historical photographs, geographic navigation maps or authenticated relic records. Private masters, review proofs and delivery links are excluded from the repository.

## Production & export provenance

- Produced 2026-11-08 with OpenAI built-in `image_gen`. The exact underlying model version was not exposed by the tool and is not claimed.
- Native generation outputs were `1672 × 941`. Game exports were Lanczos-resampled center-fit to exact 16:9 (`1920 × 1080`, trimming less than one source pixel vertically) and encoded as WebP under the 1 MB per-image budget (`196,848–438,722` bytes). Export dimensions do not imply native `1920 × 1080` generation.
- Only mechanical export processing was applied; no baked captions, UI, logos, watermarks or readable religious script are included.
- Full-frame display (`object-fit: contain`) is required so subjects near the lower or horizontal margins (such as the white yak's front hoof and the outer Mangyul altars) are never cropped. Localized provenance captions and story prose sit below the artwork.
- Each still is lazy-loaded only when its specific chapter card is rendered, disposed on modal close/rerender/page teardown, and falls back to localized text without blocking progression if media fails to load.

## Game exports

| Asset | Card (`bodyKey`) | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `public/story/chapters/01-yarlung-yak-held.webp` | `chapter.yarlung.calm.body` | `1920 × 1080` | `438,722` | `e8f1fb4786fbdeacbb69e410ccd57ab93e935a30e10732b42a68bc338968b1dd` |
| `public/story/chapters/02-yarlung-yak-released.webp` | `chapter.yarlung.release.body` | `1920 × 1080` | `374,030` | `678e6d4bfe2d977376511900dd2cc0c399bf4e4e58a2999197ff7e2e5d0953a8` |
| `public/story/chapters/03-chimphu-cave.webp` | `chapter.chimphu.cave.body` | `1920 × 1080` | `291,208` | `869ca38fb7ae108f2410c423309cd9223ccc2518866a6f66fda6a229f4db3e24` |
| `public/story/chapters/04-chimphu-custody.webp` | `chapter.chimphu.records.body` | `1920 × 1080` | `251,126` | `108d20cedbc10d17ebd8f5ec0f1b5b8a8cee34b947ad3fb59ea04bb4b494a048` |
| `public/story/chapters/05-mangyul-twelve-altars.webp` | `chapter.mangyul.crossing.body` | `1920 × 1080` | `386,618` | `edfb70e0ccec1241a9b005f8f055af57e3975b20005aa6afb2d21edfbd4e231c` |
| `public/story/chapters/06-samye-unfinished.webp` | `chapter.samye.intro` | `1920 × 1080` | `408,444` | `5ac5df12950f7568169f0351f35887341a4dfe0a1179aefda459f03881211da8` |
| `public/story/chapters/07-samye-night-disassembled.webp` | `chapter.samye.rebuild.body` | `1920 × 1080` | `278,500` | `d5ca22feae9cd361b8d4dadafdd2ddffd7aae246d6f82c2f0d519fa6edb3015d` |
| `public/story/chapters/08-samye-morning-restored.webp` | `chapter.samye.hepori.body` | `1920 × 1080` | `382,148` | `5ae8755ff09535d26ff834b289a9b283363fd918c75290735c570ae7ba14ae76` |
| `public/story/chapters/09-finale-butter-lamp.webp` | `chapter.finale.lampPrayer.body` | `1920 × 1080` | `196,848` | `74be5018284ebccb11964b5bdc9ea9cbfd073e0b336e5bdaf63caa4040024ec3` |

## Scene review notes

1. **Yarlung white yak (`01`, `02`)**: Paired compassionate rescue frames with matching coat, horns, four-leg anatomy, camera, river valley and lighting. Only the loose stones around the nearer foreleg shift aside in `02`.
2. **Chimphu cave & custody (`03`, `04`)**: Quiet bare stone cave with a single daylight shaft and no invented inscriptions (`03`), paired with a cloth-wrapped slab and intentionally unreadable inventory folder in storage (`04`). Custody verification and permission belong to the external narrative text, with no claim of an authenticated relic.
3. **Mangyul pass (`05`)**: Winding snowy trail flanked by twelve countable plain stone altar platforms (six on each side) and restrained uninscribed prayer flags.
4. **Samye construction triplet (`06`, `07`, `08`)**: Fixed camera and courtyard footprint across unfinished daytime lower-story work (`06`), night-disassembled upper courses and beams (`07`), and morning construction restored to the same unfinished stage rather than a completed temple (`08`). Informed by `src/world/maps/samye.js`; cultural and architectural fidelity remains subject to human review.
5. **Finale butter lamp (`09`)**: One metal butter lamp with a single warm flame in a plain stone niche at dusk, with no character apparition or inscriptions.
