# Compendium images

These are the nine original screenshots provided for the birthday Compendium,
stored without changes in `full/`. The `thumbs/` directory contains optimized
WebP previews, one per original screenshot.

The gallery displays previews first and opens the original image when a card
is selected. The image order, paths and optional captions live in
`js/compendium-data.mjs`. Captions are intentionally empty until provided.

| Item | Full-resolution image | Thumbnail |
| --- | --- | --- |
| 01 | `full/01.jpeg` | `thumbs/01.webp` |
| 02 | `full/02.jpeg` | `thumbs/02.webp` |
| 03 | `full/03.png` | `thumbs/03.webp` |
| 04 | `full/04.png` | `thumbs/04.webp` |
| 05 | `full/05.jpeg` | `thumbs/05.webp` |
| 06 | `full/06.jpeg` | `thumbs/06.webp` |
| 07 | `full/07.jpeg` | `thumbs/07.webp` |
| 08 | `full/08.jpeg` | `thumbs/08.webp` |
| 09 | `full/09.jpeg` | `thumbs/09.webp` |

Run `node --test tests/compendium.test.mjs` to verify the gallery
configuration and image file presence.
