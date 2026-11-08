# Losang map-handoff still (#113)

- Game export: `public/story/losang-map-handoff.webp`, 1664 × 936 (16:9), 97,460 bytes.
- SHA-256: `126b478b555cbc3193f60f4727cfe76f030598d28c7b4f473c3d36136196d5b4`.
- Produced 2026-11-08 with OpenAI built-in image generation using the author's previously approved fictional Losang character reference. The exact underlying model version was not exposed by the tool.
- One generation. The original 1672 × 941 output was normalized to 1664 × 936 and encoded as quality-84 WebP using ImageMagick. No crop, content retouching or upscaling.
- Owner accepted the illustration in the follow-up conversation before integration. Private master, prompt and reference records remain outside the repository.
- AI-generated fictional illustration, not a historical photograph. The folded map is an invented contemporary copy with abstract lines, not an authentic relic, geographic source or navigation map. No readable generated script or baked subtitles are intended.
- Reference permissions were not expanded or changed. No independent legal/commercial-rights certification is made. Cultural and architectural accuracy still require human review.
- Display the full frame with `contain`, including Losang's head, both hands and the map. Localized provenance and dialogue appear below the art. No portrait crop.
- Loaded only for the final Losang dialogue card. Missing media leaves a localized text fallback and the original dialogue/actions. Dismissal releases the image and cannot complete the handoff; accepting it uses the existing story signal and save path.
- The retained 3D Losang character and adventure/ARPG systems are unchanged. Human review and merge remain with the owner.

## Validation

- Local `npm run build`, `npm run check:i18n` and `npm test` passed on 2026-11-08: 2,754 keys per language; 154 tests passed, including five new still lifecycle/provenance tests.
- `scripts/losang-still-browser-test.mjs` covers desktop keyboard and 390px touch layout, lazy loading, language changes, repeated/stale clicks, close/Escape and reopen, image failure, map acceptance, save isolation and resume. It is included in the existing PR CI media suite; screenshots are retained with that suite's artifacts.
- Local Chromium launch was blocked before any UI test by the execution environment's process-socket restriction (`socket() failed: Operation not permitted`), including an approved elevated retry. No local screenshot or in-game visual pass is claimed. PR browser CI and owner visual review remain required.
