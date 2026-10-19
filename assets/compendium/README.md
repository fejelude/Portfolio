# Compendium assets — merge gate

The Compendium layout, behavior, and links are in this branch. The nine original
user-provided screenshots and nine optimized WebP thumbnail files must also be
committed before merging this draft PR. They are supplied separately in the
Compendium asset archive because the GitHub connection cannot upload binary
conversation attachments.

Extract the archive at the **root of this branch**, retaining these paths:

- `assets/compendium/full/01.jpeg` through `09.jpeg`, except `03.png` and `04.png`
- `assets/compendium/thumbs/01.webp` through `09.webp`

Original captures are preserved byte-for-byte in `full/`. Smaller WebP
thumbnails make the grid fast. The lightbox loads original full-resolution files.
No captions are invented. To change image order, paths, or optional captions,
edit `js/compendium-data.mjs`.

Run `node --test tests/compendium.test.mjs` after committing the assets.
The asset-existence test is intentionally a merge gate, not a passing placeholder.
