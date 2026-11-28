# Tokyo in Monochrome

## Audit and creative direction

The live desktop and emulated phone homepages, and the supplied recording, show an uninterrupted rose/lavender wash and cherry blossom sprites across About. The wash and sprites have separate owners. The document interpolates palette anchors with smoothstep when its geometry changes. The fixed garden independently follows its viewport envelope, which permitted petals to keep rendering while About was in view.

The existing Tokyo interactive world separates cached architecture from the moving train and weather. The new About environment uses that useful separation with original SVG artwork, a short train pass and CSS scroll-driven depth. It leaves the standalone Tokyo interactive world, portrait V2, ghost, hearts and profile content in place.

## Research and prototype comparison

- The [Ginza photograph from 1955](https://www.koho.metro.tokyo.lg.jp/photo/en/tokyoarchive/imamukashi/city07.html), [Tokyo Street Life archive](https://www.koho.metro.tokyo.lg.jp/photo/en/tokyoarchive/tag22.html) and [Metro Archive](https://metroarchive.jp/) informed overhead cables, rail beams, awnings and the sheltered platform. This is an imagined district.
- [The Boat](https://www.commarts.com/project/23899/the-boat) puts ink artwork, negative space and moving details on different visual planes. The live SBS page remained on its loading view in the cloud session, so the published case study and independently documented scrolling behavior provided the reference. [Awwwards animation](https://www.awwwards.com/websites/animation/), [Lusion's Choo Choo World](https://lusion.co/projects/choo_choo_world/) and [Vandana's portfolio](https://vandanar.design/) were additional references for pacing and using movement to direct attention.
- The [Codrops morphing](https://github.com/codrops/MorphingBackgroundShapes), [paths](https://github.com/codrops/OnScrollPathAnimations/) and [mask](https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/) demos suggested connecting scenes through a continuous reveal. The implementation uses CSS [view timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) and [transform and opacity](https://web.dev/articles/animations-guide) instead of importing a scrolling library.

The [in-page art studies](about-tokyo/art-studies.jpg) compare a low-rise streetscape with awnings and crosswalk details to the elevated railway composition on both layouts. The street added more foreground detail below the portrait. The railway gives the page a clear horizontal line, a stronger left/right silhouette, and a natural reason for motion. The desktop composition frames the portrait with towers and a wide rail span. The separate mobile illustration uses narrower side silhouettes, a shorter canopy and quiet central space. Hand-authored linework and procedural window variations are original. No archive artwork, third-party scene, textures or stock images are distributed.

The vertical inscription uses the requested text `ソフィア、愛してる。` with Japanese language markup, reading top to bottom. `ソフィア` is a phonetic transcription for a name pronounced like Sofia/Sophia. `愛してる` is the conversational Japanese for “I love you.” The sign uses a local nine-character Noto Sans CJK JP subset with its [SIL Open Font License](../assets/about/tokyo-sign-OFL.txt). The label contains no link.

## Rendering and transition

The three About anchors and two locally bounded silver lights replace About's violet wash in the existing document gradient. The SVG treatment clips to the About band, from a small approach above the section through its exit. While the approach enters the viewport, Sofra's existing garden scales its decorative channels with a reversible smoothstep from 78% to 30% viewport position. Sofra keeps its own card treatment, and the celestial and Roblox color stops retain their previous values.

The document wash itself retains its resize-based measurement. The Tokyo plate uses an absolute chapter band, sticky framing, a native view timeline for small vertical depth and opacity where supported, and a static gradient mask fallback. The SVG includes static tonal fades around readable content and frame edges. No continuous JavaScript runs for Tokyo. One finite CSS train pass runs inside a small track strip. A visibility observer, media query and page lifecycle gate it. Reduced motion shows the static illustration. The responsive image uses lazy loading. The selected illustration costs about 8 kB desktop or 5 kB mobile when gzipped, plus about 4.5 kB for the locally subsetted sign font and less than 1 kB for the train.

## Browser evidence

| Layout | Before and after stills through the chapter | Full downward and upward sequence |
| --- | --- | --- |
| Desktop Chromium 1440 × 900 | [Comparison](about-tokyo/desktop-comparison.jpg) | [Scroll recording](about-tokyo/desktop-scroll.webm) |
| Pixel 7 profile, Chromium 393 × 800 at DPR 2 | [Comparison](about-tokyo/phone-comparison.jpg) | [Scroll recording](about-tokyo/phone-scroll.webm) |

Both recordings use the same section-relative start and end, from the Daedalus card through the Roblox build chapter and back. The recordings illustrate the transition. Performance was measured separately without screen capture.

## Regression checks

- Chromium exercised desktop hover and phone tap on the portrait, native vertical swipe over the portrait, reduced motion, the phone/tall art selection, the tablet and landscape layouts, the font load, and the viewport-gated train. Returning from Roblox restored the same measured garden strength at the same approach position. The train had no running CSS animation in Roblox.
- Desktop Firefox exercised hover and the portrait Canvas fallback. Playwright WebKit with an iPhone viewport exercised portrait tap and WebGL. The new layer is pointer-transparent and hidden from assistive technology. The Japanese font contains every glyph in the sign.
- All 87 Node tests passed. The portrait renderer and source, ghost and hearts, standalone Tokyo world, and Daedalus renderer were verified unchanged by diff. Cross-browser verification used desktop browsers and device profiles, with no physical iOS or Android hardware.

## Performance

Chromium ran in CPU-only mode with the portrait's Canvas fallback on both versions. The timed run scrolled from Daedalus through About to the Roblox garage and back in a 3.2-second animation-frame sample. The desktop viewport was 1440 × 900. The phone used a 393 × 800 Pixel 7 profile at DPR 2 and 2× CPU throttling. Each row is the median of three alternating runs. The animation-frame gaps are a presentation proxy. CDP scripting, style, layout and overall task duration cover the full page.

| Profile | Version | p95 gap | Gaps over 25 ms | Long tasks | Script | Style | Layout | CDP tasks | JS heap |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | Main | 33.3 ms | 11 | 0 | 188.2 ms | 149.7 ms | 26.7 ms | 1361.8 ms | 3.15 MiB |
| Desktop | Tokyo | 33.3 ms | 18 | 0 | 176.1 ms | 160.8 ms | 25.5 ms | 1299.0 ms | 3.70 MiB |
| Phone emulation | Main | 33.4 ms | 22 | 3 | 231.4 ms | 211.7 ms | 40.1 ms | 1701.5 ms | 4.38 MiB |
| Phone emulation | Tokyo | 49.9 ms | 22 | 2 | 189.1 ms | 244.4 ms | 38.5 ms | 1528.9 ms | 4.28 MiB |

The full-page scripting and task counters decreased, while style work increased. Desktop p95 held steady with more late frames. Phone p95 worsened in this deliberately constrained configuration, with the same median number of late frames. The results do not establish a hardware-accelerated frame rate. An exploratory SwiftShader run showed multi-second stalls across both versions, so it was unsuitable for comparing the incremental change. Physical device GPU time, GPU memory, battery use, and browser-toolbar behavior remain unmeasured.
