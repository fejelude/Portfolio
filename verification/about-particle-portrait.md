# About Section — Interactive Particle Portrait

## Visual direction

The current recording showed the source framed as a complete rectangle. In the Vandana recording, the field developed around the face, loose grains described the silhouette, and a local disturbance moved through the material before the portrait recovered. This implementation uses a soft, unframed silhouette with a short directional wake. The face, sunglasses, beanie and expression retain their source tones. Rose and lavender are concentrated in the softer edge grains, wake highlights and surrounding haze.

The 256 × 144 WebP and its bytes are unchanged from `main`. The portrait stays between the motto and introduction. The ghost, hearts and surrounding copy remain on their existing systems.

## Rendering and input

- A feathered matte follows the original source silhouette. The renderer samples the matte at 96 × 54 once and interpolates it over a denser image lattice. The alpha canvas lets the existing About atmosphere show through the edge grains and faint room details.
- The resting image is rendered to a cache from sampled colors and alpha. During motion, the renderer restores the union of the old and new wake bounds. Only displaced grains get redrawn over that patch. A shared moving-color palette limits per-particle allocation. Touch and economy profiles move groups of up to 2 × 2 grains while retaining the same detailed resting cache for their display size.
- The radial and tangential forces act within the pointer radius. Depth scales displacement, a bounded damped spring restores every grain, and settled frames match the resting cache exactly.
- Desktop movement creates a lightly directional wake. On touch, releasing a short tap creates a pulse and a deliberate horizontal drag creates a wake. Vertical pans, browser pinch gestures and text selection around the figure keep their native input path.
- The backing buffer is capped at approximately 760,000 pixels and DPR is limited to 2. Economy profiles use at most 208 columns and a DPR ceiling of 1.5. Sustained expensive frames reduce cadence. The authored CSS haze and sparse edge lights breathe while visible. The canvas draws zero frames while idle or offscreen, and reduced motion pauses the animation systems.
- The canvas optimization reference informed the cached raster and localized restoration approach. [MDN Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) · [MDN touch action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)

## Review captures

| View | Screenshots | Recording |
| --- | --- | --- |
| Desktop | [Rest and cursor wake](portrait-upgrade/desktop.webp) | [Paired cursor interaction](portrait-upgrade/desktop.mp4) |
| Phone | [Rest and touch wake](portrait-upgrade/mobile.webp) | [Paired touch interaction](portrait-upgrade/mobile.mp4) |

The left side of each pair is `main`. The right side is the feature branch. The recordings show the portrait on the local homepage with the same sweep and recovery sequence. The attached reference recordings were used for review.

## Verification and tradeoffs

All 139 Node tests passed. Browser checks passed in Chromium and Firefox desktop, Chromium Android emulation and Linux WebKit iPhone emulation. Chromium also passed at 320 × 568 and 740 × 390. Checks covered the resting matte, visible-only ambience, source loading, touch tap and drag, native vertical panning, exact recovery, reduced motion and idle/offscreen canvas drawing.

The matched Chromium lab sweeps were captured at 1280 × 840 for desktop and 393 × 780 at DPR 2 for mobile. It used the full local homepage, disabled WebGL and blocked third-party requests. The 4× CPU sample used Chromium throttling.

| Measure | Desktop main → feature | Phone main → feature | Phone at 4× CPU main → feature |
| --- | ---: | ---: | ---: |
| Lattice cells, including cells faded into the background | 36,864 → 69,696 | 9,975 → 20,330 | 9,975 → 20,330 |
| Average cached pixels restored per interaction draw | 264,796 → 25,996 | 249,750 → 21,985 | 249,750 → 21,579 |
| p95 animation-frame interval | 16.7 → 16.8 ms | 16.8 → 16.7 ms | 16.8 → 16.8 ms |
| Main-thread task time through sweep and settle | 702 → 969 ms | 489 → 409 ms | 1,592 → 1,438 ms |
| Idle and offscreen canvas draws in the measured windows | 0 → 0 | 0 → 0 | 0 → 0 |

Restored pixels measure cache blits. Moving grain or tile draws are additional. Main-thread task time covers the full page and the recovery window. The denser desktop field raised measured task time even though the sampled frame interval was similar. The original source resolution still sets the limit on facial detail. Physical devices and GPU energy use are outside this test matrix. [Raw measurements](portrait-upgrade/metrics.json)
