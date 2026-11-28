# 永遠の春 — Eternal Spring: A Beautiful Goodbye

## Status and scope

Implementation branch from main `de7c6820a7e1e63d7cc468dd88eeb4230ac872a5`, the merge of PR [#198](https://github.com/fejelude/Portfolio/pull/198). This is a review candidate, not a visually accepted release. No merge or explicit deployment has been performed.

Reviewed the archive HTML, CSS, audio module, garden module, archive regression tests, existing smoke harness, prior PR changes, and prior [verification report](archive-garden.md). The earlier garden uses a seeded landscape raster and small reusable CSS sprites; the new version retains its branch contours, crowns, seeds, color ramps, placement rules, flower strip and palette. The old smoke test was still querying the pre-refinement `.petal` selector; it now queries `.garden-fleck`.

The archive HTML and audio module are byte-for-byte identical to the base, as are the music track, font, font license, and Vercel configuration (Git tree blob SHA comparison). No archived personal material, visitor tracking, analytics, requests to identify visitors, or search-index changes are introduced. The local scene attributes are only in-memory markers for testability; they are not sent anywhere.

## Artistic references

- [Aseprite animation documentation](https://aseprite.org/docs/animation/): frame timing, separate layers, and reuse of frames. The implementation uses stepped wing poses, a shared character silhouette and separately posed limbs.
- [Lospec animation tutorials](https://lospec.com/pixel-art-tutorials/tags/animation) and [selective outlining](https://lospec.com/pixel-art-tutorials/tags/selectiveoutlining): compact silhouettes, controlled color clusters, and selective outlines.
- [Hokusai, Cherry Blossoms at Yoshino, The Met](https://www.metmuseum.org/art/collection/search/56138) and [Utamaro, Viewing Cherry Blossoms](https://www.metmuseum.org/art/collection/search/37337): spring canopies and gentle atmospheric depth.
- [Awwwards animation collection](https://www.awwwards.com/websites/animation/): reference for interaction and motion presentation, not a claim of award-level validation.
- [Codrops PixelTransition](https://github.com/codrops/PixelTransition): concept reference for pixel-based transitions; the main Codrops site returned a 403 in this session. No code copied.
- [MDN Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas): cached, integer-coordinate layers and animation-frame scheduling.
- [MDN reduced-motion accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility) and [W3C SCR40](https://www.w3.org/WAI/WCAG21/Techniques/client-side-script/SCR40): static/simplified motion preference handling.

Prior PR #198 cites Rikugien Gardens and Yonder for its composition and atmosphere; those references remain in the prior report. No game sprites or animation frames from any external source are embedded. Full additional game/artistic research, a physical-device review, and award-level comparative visual critique remain outstanding.

## Story and sprite design

The 96 × 72 integer-coordinate stage is reserved in the existing emblem slot and normally displays at 192 × 144 CSS pixels. The fictional boy has dark layered hair, cream skin highlights, a lavender sweater, rosewood shoes, individually shaded trousers and expressive small eyes. The butterfly shares one drawing function across the narrative and memory loop, with four stepped wing-width poses. All artwork is original procedural pixel drawing authored for this feature, using the archive's existing rose, lavender and cream palette; the two SVG studies were generated from the procedural sprite draw commands. No new third-party image license is required; the existing Pixelify font's OFL file is unchanged.

| Active time | Visual beat |
| --- | --- |
| 0–4 s | Holding the butterfly; breathing and blinking |
| 4–8 s | Hands open; butterfly rises along a curved path |
| 8–12 s | Quiet farewell wave and accepting smile |
| 12–16 s | Butterfly departs; boy lowers his arm; pixel reconstruction into the blossom |
| 16–22 s | Five-petal sakura, highlights and soft pulse |
| 22–28 s | Pink kitten, blink, ear/tail motion and hop reaction |
| 28–34 s | Layered pink rose with leaf/stem motion and bloom pulse |
| 34–40 s | Butterfly wing poses, hovering and flight response |

The last 1.15 seconds of each interval use deterministic pixel dispersal and reconstruction instead of a generic crossfade. After 40 seconds the four memories repeat; the introduction is never replayed by the loop. Pointer reactions are ignored during the introduction and transitions. Mouse entry and a deliberate low-displacement pointer tap animate the current memory. Touch handlers are passive and do not capture pointers or cancel scrolling, pinch zoom, selection or audio gestures.

### Prototype comparisons

- [Initial software-raster study](eternal-spring-sprite-study.svg): establishes palette, proportions, poses and four motifs. The holding pose did not make both hands visible enough, and the butterfly's small body/wing ratio needed refinement.
- [Refined software-raster study](eternal-spring-sprite-refined.svg): two hands meet, wing/body proportions scale together, and the boy lowers both arms in the departure pose. An open-wing butterfly frame makes the memory silhouette clearer.

These are direct software-raster sprite previews, **not browser screenshots**. The prototypes were not visually evaluated within the actual page; that required gate is still outstanding. The story is deliberately restrained, and the sprite drawings use stepped procedural poses rather than hand-authored frame atlases.

## Garden architecture and lifecycle

The existing background meadow and distant trees are cached in one canvas per viewport size. Each crown uses its original seed and is cached independently in a cropped tile. Grounded tree limbs have a cropped stepped-pose cache; the raster updates only when their quantized tip offsets change. Crown movement and branch poses use independent phases with a shared low-frequency wind and brief release, farewell and memory-change gusts. At most 12 additional short-lived environmental particles are active, alongside the existing 24 reusable CSS flecks. The drawing cadence is capped near 15 FPS, with one scheduling loop and no continuous background regeneration. Resizing invalidates the scenery caches, not the story clock.

The story module loads independently of the audio module. If loading/drawing fails the original crest remains available. A CSS crest fallback is present without JavaScript. Hidden tabs and page-cache suspension cancel the scheduled frame; reduced motion shows a static sakura and static grove and suppresses drifting flecks. Reduced motion enabled on arrival skips the opening rather than forcing playback. The original archive text and all existing controls remain available.

The no-new-buttons requirement is preserved. A separately discoverable, keyboard-operable pause/stop control for the indefinitely looping decoration is not included; full WCAG 2.2.2 conformance cannot be asserted on this basis. See [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide).

## Verification

### Completed in this session

- Parsed the new JavaScript modules and browser script.
- Executed the three added deterministic timeline/interaction/lifecycle tests using the actual branch JavaScript with a simulated DOM/Canvas and in-memory frame scheduler; all three passed. This is not the Node full suite or a real browser.
- Rendered and visually inspected both original sprite contact sheets through a software raster.
- Compared Git blob SHAs for the HTML, audio module, audio asset, font, license and Vercel configuration; unchanged.
- Verified the branch diff is limited to directly relevant archive code, tests and verification files.

### Real-browser gate

The sandbox could not resolve GitHub or the live site, and the browser could not directly retrieve the branch files. The archive-specific CI was extended to run on this feature branch without opening a PR. The [browser harness](eternal-spring-browser.cjs) captures the story and loop, each sprite and its interaction, landscape/portrait and tablet views, reduced motion, and browser visibility where observable. It also samples before/after Chromium frame intervals, task and scripting counters and heap with a 2× throttled phone profile. The [original audio and privacy smoke harness](memory-archive-smoke.cjs) remains separate and retains its original assertions, with the stale particle selector fixed.

Run locally after installing Playwright and browsers:

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install chromium firefox webkit
node --test tests/memory-archive.test.mjs
MEMORY_ENGINES=chromium,firefox,webkit MEMORY_BASELINE_ROOT=/path/to/base-checkout node verification/eternal-spring-browser.cjs
node verification/memory-archive-smoke.cjs
```

CI run [46157304561](https://github.com/fejelude/Portfolio/actions/runs/46157304561) was in progress when last inspected; its code revision contains all functional changes and the test harness, while subsequent commits add review-only documentation and sprite previews. No real-browser results, full-suite pass, actual before/after measurements, screenshots, videos, or physical-device checks can yet be claimed. The CI artifacts must be reviewed, not merely generated, before opening the requested regular PR. Chromium/Firefox/WebKit lab viewport emulation is not physical Safari, iOS Safari, or Android Chrome testing.

Existing hosting automation may create preview deployments from a branch push; this work did not invoke a deployment action or modify hosting configuration. The user retains merge and production-deployment control.
