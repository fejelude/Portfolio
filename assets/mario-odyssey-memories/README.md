# Super Mario Odyssey — Childhood Memories (2017)

The third gallery section uses the existing section-header, highlight, gallery-grid and reveal classes. The 17 kingdoms are arranged in the requested progression; the four story memories follow, ending with the escape from the Moon. The original two collections and gallery.js/style.css are byte-for-byte unchanged.

## Image research and permission gate

The manifest records 21 source references, scene targets and planned local WebP filenames. Kingdom names were cross-checked with [Nintendo's exploration guide](https://supermario.nintendo.com/explore/) (indexed, direct fetch unavailable), [Prima-guide kingdom index](https://mario.mtwildwood.net/odyssey/kingdoms/) and [Super Mario Wiki's kingdom list](https://www.mariowiki.com/Super_Mario_Odyssey). The individual Bowser's Kingdom brochure confirms Bowser's Castle. The screenshot file pages and kingdom galleries are leads, not rights grants. Individual image quality, HUD and watermark checks remain necessary before import. Story references include Mario's first encounter with Cappy, the festival, the wedding and the actual lunar escape; for the last entry, choose an escape frame with Peach rather than the subsequent surface scene.

Image searches included Nintendo promotional imagery, MobyGames, game documentation and gaming publications. No third-party screenshot bytes were copied, hotlinked, or claimed as personal captures. [Nintendo's game content guidelines](https://www.nintendo.co.jp/networkservice_guideline/en/) cover certain sharing uses and do not establish that this portfolio may republish another creator's images. Wiki screenshot fair-use notices are context-specific. Thus the current PR deliberately uses clearly labeled source links, not fake screenshots. The original Zelda import workflow and Minecraft image URLs were inspected and left unchanged.

## Activating the photo collection

Obtain appropriate permission for the screenshots and verify each image against its target scene. Place the original permitted image files in a local directory. Create an approvals JSON object keyed by the 21 manifest IDs; each value has `input` (filename relative to the source directory), `credit` (actual creator/rightsholder attribution), `source` (HTTPS provenance URL), `permission` (documented permission covering public portfolio reuse), `description` (accurate visual alt-text detail). Do not fill this with assumed permissions. Use:

```sh
python -m pip install Pillow
python scripts/import-mario-memories.py /path/to/approved-images /path/to/approvals.json
node --test tests/mario-gallery.test.mjs
```

The importer requires exactly 21 records, distinct images, at least 1280×720, near-16:9 framing and JPEG/PNG/WebP input; it outputs local high-quality WebP without upscaling and creates normal gallery-item/gallery-img markup, source credits and metadata. It performs no downloads. The existing gallery script handles reveal, retries, lightbox and navigation. Rights and scene correctness must be checked by a human; dimensions alone cannot establish either. Test actual images on desktop and mobile before merging a photo version.

## Status

Reference section implemented. Actual licensed image assets and their visual/fullscreen verification are pending. The independent PR must not be represented as a completed 21-photo collection. No unrelated project was changed or deployed.
