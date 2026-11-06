# Issue #85 · Motion cue technical review

These optional game assets are AI-generated illustrative reconstructions made in Google Flow using Omni 1.1 Flash. V1–V3 use the approved restoration still compositions. V4 uses a separate illustrative dry-spring reference. The game plays the supplied game exports once per cue and places the captions and source labels outside the preserved frame.

Each MP4 has one H.264 video stream in YUV 4:2:0, 640 × 360 pixels, 192 frames at 24 fps, and exactly eight seconds of playback. Each JPEG poster is 640 × 360. MP4s total 2,204,382 bytes and posters total 128,399 bytes. The integrated game media budget should be evaluated with the restoration stills and other story assets.

## Visual review

The four files decoded without errors. Eight evenly spaced frames per shot were reviewed for composition, motion and apparent defects. No embedded captions or visible marks were observed in those samples.

| Cue | Review |
| --- | --- |
| V1 | A gradual camera push brings the scaffolded stupa closer. Caption placement below the frame keeps the foreground work materials visible. |
| V2 | A worker steadies and releases a stone. The hands, block and nearby tools remain legible in the sampled frames. |
| V3 | Yingzhen handles a folder and turns toward the work area. Her hands and the folder sit near the bottom of the composition. |
| V4 | The dry gully stays still apart from a visible warm light shift. Its painterly treatment and geographic details are illustrative. |

## Playback

A cue can declare an optional `video: { src, poster }`. It can also supply an approved `image` for static playback. The player uses the cue image first, then the poster if that image fails. Captions stay available through missing media and the existing cue timer and Next, Finish and Skip controls remain available. Each cue loads its own video. Reduced motion and reported Data Saver preferences start with the static image and expose a per-cue Play motion control.

The player was exercised in a local Chrome desktop and phone-sized touch harness with real H.264 assets. Checks covered first-cue-only requests, playback and pause, seeking, an intentionally aborted V3 request with static fallback, manual completion, reduced-motion default, explicit motion playback, replay and skip. Unit tests additionally cover Data Saver and media stalls.

## Game asset fingerprints

| Game file | Bytes | SHA-256 |
| --- | ---: | --- |
| `V1.mp4` | 635,995 | `46817799c1dc3d81982f71d77f760545331860ae60bf8697e523b4dd010242da` |
| `V1.jpg` | 31,317 | `b5167c8ef5d84abac9dc4ac4ce1ae55c28132122ac774d522bd6d33ee7f7837c` |
| `V2.mp4` | 360,021 | `c806fe108a8cf3680d5ea0bf70fce8c79bd45cffad5ddff13f5af0cf324048ae` |
| `V2.jpg` | 23,397 | `2f7fe3e38c28bda85a994ce7407c029bdb601f1952dd7f19152a1d0617f8f8d5` |
| `V3.mp4` | 330,837 | `5edd1099c4aabbece950d41e2902ac4142c69e8c9720896b779c8525ceb07e20` |
| `V3.jpg` | 28,968 | `951e255a06e05aa10ae650b7acb78f3987229afff9834b5eea050f15a489a18f` |
| `V4.mp4` | 877,529 | `a37b64154dadfd3ec3f46fa80bf431ba0d466c890e997be32a5a8efb6e9acc58` |
| `V4.jpg` | 44,717 | `e97fbfb4bed6955c97837e9e98cf3fe1d054cb8dde505fac72552661362bd814` |
