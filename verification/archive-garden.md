# Sakura garden verification

## Art direction

The live archive had rhythmically repeated diagonal branches and isolated rectangular blossoms. The desktop treatment now frames the original window with asymmetric cherry trees, tapered rosewood limbs, lavender midtones, pale blossom tips and gaps between the boughs. A lower-contrast grove, two meadow bands and a few scattered blossoms give the trees depth. The phone composition puts the strongest canopy detail around the date and uses narrow branch silhouettes along the margins. The window, copy, emblem location and music controls retain their original layout.

The crest and flower strip use original pixel sprites. Five-petal highlights, small rose sprites and two-lobed hearts carry the same palette into the moving layer. Petals follow a curved fall with a brief fold. Hearts and rose sprites rise on slower paths. A few offset sparkles appear and recede. The atmosphere remains decorative and pointer-transparent.

The [Lospec tree studies](https://lospec.com/pixel-art-tutorials/tags/trees) informed the use of clustered color and selective highlights. [Rikugien Gardens](https://www.gotokyo.org/en/spot/ev163/index.html) informed the layered canopies and weeping branch shapes. [Aseprite's animation documentation](https://aseprite.org/docs/animation/) informed the staggered sprite beats. [Yonder](https://www.rylandsanmiguel.com/portfolio/yonder/) offered a reference for quiet atmospheric motion. All of the new artwork is original Canvas drawing and CSS created for the archive. No reference art is embedded.

## Rendering and verification

The grove is deterministic, rasterized once at the current viewport size, and repainted in an animation frame only when viewport dimensions change. The backing canvas is around 165,000 pixels at wide sizes and smaller on phones. Five tiny sprite images are reused by at most 24 decorative elements, with 20 visible in the phone layout. CSS moves those elements and the existing crest. The animated elements pause when hidden or in the page cache. Reduced motion retains the painted artwork and disables the drifting layer and crest animation. The audio code and its original track retain their previous behavior.

Visual checks covered Chromium desktop at 1440 × 960, a 1024 × 720 laptop, a 390 × 844 phone, an 844 × 390 phone landscape, and tablet layouts at 768 × 1024 and 1180 × 820. Chromium also checked resize in both directions, reduced motion, playback, mute, and pause. WebKit passed the phone music and reduced-motion checks. Desktop Firefox rendered the garden and honored reduced motion. Playback remained paused in that Firefox lab profile on both the baseline and the refined branch. These are lab viewport profiles. Physical iOS and Android devices were unavailable. The full Node suite passed 88 tests.

| Profile | Before and after still | Before and after motion |
| --- | --- | --- |
| Desktop landscape | [Comparison](archive-garden/desktop-comparison.jpg) | [Recording](archive-garden/desktop-motion.webm) |
| Phone portrait | [Comparison](archive-garden/phone-comparison.jpg) | [Recording](archive-garden/phone-motion.webm) |

The baseline is current main. The recordings show the public archive notice and use muted capture.

## Performance

Two 3.2-second Chromium idle samples per version used CPU-only rendering, without video capture. The phone profile used 2× CPU throttling. These are whole-page measurements. Dedicated GPU timings and device power use were outside this setup.

| Profile | Version | p95 frame interval | Gaps over 24 ms | Scripting | Main-thread task counter | JS heap |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | Before | 16.7 ms | 0 | 7.1–8.4 ms | 167–196 ms | 2.15–2.18 MiB |
| Desktop | After | 16.7–16.8 ms | 1–4 | 5.5–6.6 ms | 207–233 ms | 2.24–2.52 MiB |
| Phone | Before | 16.8 ms | 0–1 | 12.3–14.8 ms | 317–388 ms | 2.21–2.29 MiB |
| Phone | After | 16.8 ms | 0–1 | 9.3–10.9 ms | 340–353 ms | 2.33–2.34 MiB |

The denser artwork and extra sprite layers increase desktop raster allocation and measured task time. The new desktop canvas is 498 × 332 compared with 360 × 240, or approximately 0.63 MiB versus 0.33 MiB for an RGBA image before browser overhead. Phone p95 was steady and measured scripting decreased.
