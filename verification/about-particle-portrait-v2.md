# About portrait V2 verification

## Regression and correction

[PR #182](https://github.com/fejelude/Portfolio/pull/182) kept the full composition in a pixel-art frame but rendered moving rectangular blocks. [PR #193](https://github.com/fejelude/Portfolio/pull/193) removed the frame. Its 256 × 144 input was sampled onto a finer lattice, which could not restore photographic detail. The hand-authored polygon, additional edge attenuation and tinted alpha removed much of the room and shirt. The radial background layers remained visible through the missing pixels as a rectangular haze. The mobile 2 × 2 motion groups also made neighboring parts of the image move as tiles.

V2 uses the supplied 1290 × 725 black-and-white photo. The production derivative retains the uncropped composition and source tones at 1120 × 629. The WebP is 32,606 bytes with no EXIF, XMP or ICC chunks. Only the optimized derivative and browser captures are included. A narrow transparent margin around the reconstructed field gives displaced grains room to pass beyond the image edges. The section's existing atmosphere provides the backdrop for that movement.

## Research and prototypes

- [Vandana's portfolio](https://vandanar.design/) was explored directly on desktop. Its photographic interaction keeps areas outside the wake visually stable and lets the image reform in place. V2 applies that localized response with its own monochrome source and movement.
- [Phantom.land](https://tympanus.net/codrops/2025/06/30/invisible-forces-the-making-of-phantom-lands-interactive-grid-and-3d-face-particle-system/) and [UntilLabs](https://tympanus.net/codrops/2025/12/10/simulating-life-in-the-browser-creating-a-living-particle-system-for-the-untillabs-website/) informed independent grain sizing and GPU displacement. [Mathis Biabiany's photographic animation](https://tympanus.net/codrops/2020/10/26/particles-image-animation-from-mathis-biabianys-website/) and [Interactive Particles with Three.js](https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/) informed the use of source-sampled color on each point.
- [Three.js BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html), [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html), and the [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) and [Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) guides were used to compare batching, buffer ownership and localized redraw. The portrait needs one static vertex buffer and one draw per frame, so it uses raw WebGL without loading another graphics library.

The Canvas and GPU prototypes shared a round mark, an unmatted full-composition sampler and the same About layout. Canvas preserved the image but spent more CPU time redrawing individual grains during a wake. WebGL batched them in one draw. The corner-mark treatment drew attention to the containing frame in the phone comparisons, so the open edge was selected. The Canvas implementation remains available as a lower-density fallback with a cached rest image and localized redraws.

## Final interaction

On entry, the points travel a few pixels into place over 460 ms. In the resting state they remain at exact source positions and render no frames. Pointer speed controls the strength and direction of a localized curl. A bounded history of six short pulses lets the wake settle at the original coordinates within 660 ms of the last sample. The GPU shader computes displacement only in the combined wake bounds. A separate render radius and capped pixel ratio bound the cost. Lower-density profiles still move individual round grains.

Deliberate taps and horizontal finger motion trigger wakes. Passive listeners, gesture thresholds and cancellation preserve vertical scrolling and native pinch-to-zoom. Reduced motion gets a still particle portrait. If WebGL is unavailable or its context is lost, Canvas keeps the portrait visible. The optimized source displays while the renderer is loading or when JavaScript is unavailable.

## Matching browser captures

| Layout | Resting section and particle close-up | Interaction recording |
| --- | --- | --- |
| Desktop Chromium, 1280 × 850 | [Three-version comparison](portrait-v2/desktop-comparison.jpg) | [Hover and recovery](portrait-v2/desktop-interaction.webm) |
| Chromium phone emulation, 393 × 780 at DPR 2 | [Three-version comparison](portrait-v2/phone-comparison.jpg) | [Tap, drag and recovery](portrait-v2/phone-interaction.webm) |

All comparisons use the local full homepage at each version. The white ring marks the input location in the recordings.

## Performance

Chromium used SwiftShader in this environment. The desktop test used 1280 × 850 and DPR 1. The Pixel 7 viewport used DPR 2 and 2× CPU throttling. Both used the existing lower-power browser profile. Each row reports the median of three scripted interactions with a 1.45-second animation-frame sample covering the wake and recovery. The CDP scripting and task figures are whole-page counters sampled around that window. The task counter varied more across runs and sometimes exceeded the frame-sampling window. Treat it as context for the reproducibility of the script and frame measurements.

| Profile | Version | p95 animation-frame gap | Gaps over 25 ms | CDP script time | CDP task counter | JS heap at end |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | #182 | 16.8 ms | 1 | 110.7 ms | 3339.3 ms | 4.0 MiB |
| Desktop | #193 | 16.7 ms | 1 | 20.4 ms | 1123.3 ms | 4.5 MiB |
| Desktop | V2 | 33.3 ms | 7 | 22.6 ms | 141.3 ms | 4.6 MiB |
| Phone emulation | #182 | 16.7 ms | 1 | 109.1 ms | 1135.7 ms | 4.3 MiB |
| Phone emulation | #193 | 16.8 ms | 1 | 66.9 ms | 376.8 ms | 3.9 MiB |
| Phone emulation | V2 | 16.7 ms | 0 | 44.2 ms | 246.9 ms | 4.0 MiB |

The mobile V2 sample used less scripting time and had fewer late frames than #193. The desktop result has a frame-pacing tradeoff in software rendering. The median p95 gap was 33.3 ms, despite the lower task counter. The median long-task count was zero in all rows. The instrumentation found zero new portrait draws after recovery, after scrolling the portrait offscreen, and during a native vertical swipe over the portrait. Whole-page JavaScript heap includes the surrounding homepage. Dedicated GPU time, GPU memory, motion-to-photon latency and battery use were outside this setup.

## Regression checks and limits

- Chromium verified desktop hover, phone tap, horizontal drag, native vertical scrolling, resize, a lower-power landscape layout, reduced motion, WebGL-disabled fallback, and deliberately lost WebGL contexts. The automated renderer probes confirmed that a lost context falls back to Canvas on desktop and phone.
- Firefox desktop rendered the Canvas fallback, responded to hover and recovered. WebKit with an iPhone-sized touch profile rendered the WebGL path, responded to a tap and recovered. Both runs reported zero uncaught page errors.
- The About heading, motto, ghost, hearts, body copy and section atmosphere are visible in the comparison captures. The production diff touches the portrait figure, styles, renderer and asset. The navigation, 3D showcases and other homepage files remain at their previous revisions.
- `node --test tests/*.test.mjs` passed all 85 tests. Chromium device profiles are emulation. Physical iOS Safari and Android Chrome devices were unavailable, and hardware-accelerated rendering was outside the lab.
