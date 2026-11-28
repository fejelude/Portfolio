# 東京の記憶 · Memories of Tokyo

## Clipping audit

- [PR #194](https://github.com/fejelude/Portfolio/pull/194) put the photograph on a transparent canvas with 9 CSS px overscan. The vertex shader mapped the displaced centers into that canvas's clip space. At strength peaks and overlapping pulses, a grain could arrive outside the viewport even though its source position was inside the photo. Larger CSS overflow on ancestors cannot extend the WebGL framebuffer.
- The Canvas fallback also clipped each frame to the original wake footprint with an apron of three sample pitches. That apron could restore or clear less than a displaced dot needed. The photo had no silhouette matte. The visible edge came from the renderer.
- [PR #195](https://github.com/fejelude/Portfolio/pull/195) established a document-space wash and a bounded Tokyo illustration. [PR #196](https://github.com/fejelude/Portfolio/pull/196) introduced the motto-side passenger sequence. Both systems remain in place. The new artwork is decorative and pointer-transparent.

## Geometry and rendering

The wake vectors still use the existing directional and tangential terms. Both renderers now soften the sum with a continuous curve above 0.34 times the interaction radius. The result approaches but never reaches 0.52 times the radius, or 44.72 CSS px at the maximum 86 px radius. Normal smaller movements are unchanged. Overscan is that limit plus 5 CSS px, rounded up, to allow a full grain radius and raster rounding. Overscan never changes the image box, sample density, or hit area. The viewport can still naturally crop any content that goes beyond the physical window.

Canvas restores the previous dirty rectangle from its cache, then clears and paints the current rectangle including travel, dot radius and rounding. CSS coordinates are measured on the photograph and offset into the overscan. Canvas uses the measured horizontal and vertical backing ratios after rounding. WebGL still uses one point batch with the expanded logical extent. The 960,000-pixel backing limit includes the guard band. Visibility, reduced motion, context-loss fallback, and zero ongoing portrait redraws at rest retain their existing lifecycle.

Technical references include MDN's [WebGL projection](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_model_view_projection), [WebGL performance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices), [Canvas clipping](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip) and [Canvas caching](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas). [Codrops' point-image tutorial](https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/) and [Vandana's portrait](https://vandanar.design/) informed the separation of resting source positions and local disturbance.

## Artwork and prototypes

I compared open silver marks with a darker asymmetrical ink-corner study in the actual About section. The silver version reads clearly at phone size without making the photograph look like a bordered card. Two detached corner engravings, small joinery-inspired diamonds, and a vermilion initial seal create a visual link to the railway scene. Grains render above the ornaments and pass through them. There is no new mask or frame overlay on the photograph.

Hiroshige's [Sunshower at Nihonbashi](https://www.metmuseum.org/art/collection/search/36977) and [Sudden Shower over Shin-Ōhashi Bridge and Atake](https://www.metmuseum.org/art/collection/search/55433) informed the cropped foreground and quiet margins. [The Boat](https://www.commarts.com/project/23899/the-boat) and Awwwards' animation and portfolio collections were additional references for layered composition. The corner ornaments and aircraft are original SVG illustrations. The aircraft is a fictional twin-engine silhouette informed by a [Japanese aviation heritage reference](https://www.jsme.or.jp/kikaiisan/JMechEH_HP.pdf). It crosses the upper scene once after the existing train using CSS transform and opacity and shares the train's visibility and reduced-motion gate. No third-party artwork is embedded. The existing Japanese inscription, photograph, and font assets remain at their original revisions.

## Browser evidence

| Layout | Before, frame studies and flight | Corners and scroll sequence |
| --- | --- | --- |
| Desktop Chromium | [Studies](about-memories-of-tokyo/desktop-studies.jpg) | [Recording](about-memories-of-tokyo/desktop-scroll-edges.webm) |
| Pixel 7 Chromium profile | [Studies](about-memories-of-tokyo/phone-studies.jpg) | [Recording](about-memories-of-tokyo/phone-scroll-edges.webm) |

[Upper-right corner before and after](about-memories-of-tokyo/corner-close-up.jpg). The flight still advances the timeline for a matched still. The interaction recordings contain scripted edges and a two-direction scroll from Daedalus into Roblox and back.

## Performance

The figures below are whole-page CDP measurements from two short unrecorded Chromium samples per version, with GPU rendering disabled and the portrait in its Canvas fallback. Each sample uses nine top-edge passes or taps and includes recovery. The phone uses a Pixel 7 viewport and 2× CPU throttling. They are diagnostic runs, not physical-device or dedicated GPU timings.

| Layout | Version | p95 frame interval | Gaps over 25 ms | Script | CDP task time | JS heap |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | Before | 33.2 ms | 9 | 130 ms | 599 ms | 4.04 MiB |
| Desktop | After | 16.8 ms | 7 | 179 ms | 835 ms | 4.87 MiB |
| Phone | Before | 16.8 ms | 3 | 123 ms | 837 ms | 4.75 MiB |
| Phone | After | 16.8 ms | 3 | 189 ms | 1206 ms | 4.19 MiB |

Rendering and recovering a larger Canvas footprint increases CPU work in this edge-heavy sample. The backing allocation has the same pixel ceiling. For a 700 × 393 CSS px photograph it is at most 960,000 backing pixels, about 3.66 MiB per nominal RGBA buffer before engine overhead. GPU memory, dedicated GPU time, and physical Android or iOS performance were unavailable.

## Regression checks

- In Chromium, sampled backing-buffer pixels during center, four-edge and four-corner passes. Tested WebGL and forced Canvas independently on desktop and a Pixel 7 profile. Both rendered beyond the photograph, with zero sampled grains reaching the outside framebuffer row or column. The desktop WebGL probe found up to 334 visible pixels beyond 10 CSS px across the edge/corner tests. WebGL recovered byte-for-byte. The Canvas cache recovered exactly on the phone runs. The desktop Canvas readback differed by up to four levels on a handful of channels after localized restore, without an observable resting-image change.
- Checked forced WebGL context loss on desktop, overlapping mouse pulses, normalized touch coordinates, deliberate phone dragging, native vertical scrolling starting on the photo, and reduced-motion suppression of the aircraft. An iPad Mini-sized Chromium profile, desktop Firefox Canvas, and iPhone-sized Playwright WebKit WebGL also passed edge/corner smoke checks. The page-width clip confines narrow-screen overscan to the physical viewport without clipping at the photo border.
- The visual recordings traverse the surrounding chapter boundaries in both directions. The original palette and atmosphere code, railway and passenger logic are outside the diff. The accompanying stills show the written material and ornaments at rest.
- All 88 Node tests passed. The additional test covers the displacement knee, maximum escape distance and backing-buffer budget at desktop and mobile sizes. Browser checks are local lab runs and emulation rather than physical device checks.
