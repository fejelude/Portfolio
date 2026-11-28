# 永遠の春 — Eternal Spring: A Beautiful Goodbye

## Status and scope

Implementation branch from main `de7c6820a7e1e63d7cc468dd88eeb4230ac872a5`, the merge of PR [#198](https://github.com/fejelude/Portfolio/pull/198). This is a review candidate, not a visually accepted release. No merge or explicit deployment has been performed.

Reviewed the archive HTML, CSS, audio module, garden module, archive regression tests, existing smoke harness, prior PR changes, and prior [verification report](archive-garden.md). The earlier garden uses a seeded landscape raster and small reusable CSS sprites; the new version retains its branch contours, crowns, seeds, color ramps, placement rules, flower strip and palette. The old smoke test was still querying the pre-refinement `.petal` selector; it now queries `.garden-fleck`.

The archive HTML changes only the central chrome ornament into a native motion toggle (with the original ornament retained as the no-JavaScript fallback). The approved archive paragraphs, heading, date, footer, navigation and metadata are unchanged. The audio module, music track, font, font license, and Vercel configuration are byte-for-byte identical to the base (Git tree blob SHA comparison). No archived personal material, visitor tracking, analytics, requests to identify visitors, or search-index changes are introduced. The local scene attributes are only in-memory markers for testability; they are not sent anywhere.

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

These are direct software-raster sprite previews, **not browser screenshots**. The initial sprite prototypes were not evaluated within the actual page before choosing the refined poses. The refined poses have now been reviewed in actual Chromium desktop and mobile recordings. The hands, release and wave are readable, and the four memory silhouettes are clear. The story is deliberately restrained, and the sprite drawings use stepped procedural poses rather than hand-authored frame atlases.

## Garden architecture and lifecycle

The existing background meadow and distant trees are cached in one canvas per viewport size. Each crown uses its original seed and is cached independently in a cropped tile. Grounded tree limbs have a cropped stepped-pose cache; the raster updates only when their quantized tip offsets change. Crown movement and branch poses use independent phases with a shared low-frequency wind and brief release, farewell and memory-change gusts. At most 12 additional short-lived environmental particles are active, alongside the existing 24 reusable CSS flecks. The drawing cadence is capped near 15 FPS, with one scheduling loop and no continuous background regeneration. Resizing invalidates the scenery caches, not the story clock.

The story module loads independently of the audio module. If loading/drawing fails the original crest remains available. A CSS crest fallback is present without JavaScript. Hidden tabs and page-cache suspension cancel the scheduled frame; reduced motion shows a static sakura and static grove and suppresses drifting flecks. Reduced motion enabled on arrival skips the opening rather than forcing playback. The original archive text and all existing controls remain available.

The follow-up approval permits a motion control. The existing center ornament becomes a 44 × 44 native button with a pixel sparkle and a pause/resume indicator, visible focus, stable accessible name and `aria-pressed` state. No toolbar or explanatory content was added. The manual control freezes the story, CSS particles and grove together; resumption continues from the frozen beat. Motion gestures do not bubble to the existing audio-unlock listeners. System reduced motion overrides the manual toggle and uses the static blossom. This addresses [W3C Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide), follows [G4 pause/resume](https://www.w3.org/WAI/WCAG22/Techniques/general/G4) and the [ARIA button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/); it is not a full accessibility conformance audit.

## Verification

### Completed in this session

- Parsed the new JavaScript modules and browser script.
- Executed the three added deterministic timeline/interaction/lifecycle tests using the actual branch JavaScript with a simulated DOM/Canvas and in-memory frame scheduler; all three passed. This is not the Node full suite or a real browser.
- Rendered and visually inspected both original sprite contact sheets through a software raster.
- Compared Git blob SHAs for the audio module, audio asset, font, license and Vercel configuration; unchanged. The HTML diff is confined to the central motion toggle.
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

### Browser results and visual review (follow-up)

| Evidence | Results |
| --- | --- |
| [Initial run 46157304561](https://github.com/fejelude/Portfolio/actions/runs/46157304561) | 144/144 Node tests, Chromium desktop and mobile audio, retired-route redirects, retired asset denial and range requests passed; video encoder dependency missing |
| [Full Chromium capture 46157456500](https://github.com/fejelude/Portfolio/actions/runs/46157456500), [artifact 15268625831](https://github.com/fejelude/Portfolio/actions/runs/46157456500/artifacts/15268625831) | Desktop (47.72 s) and phone portrait (47.40 s) completed the full narrative, loop, interactions and dynamic reduced-motion assertions. Landscape reduced-motion short-profile check timed out. |
| [Motion toggle run 46157907996](https://github.com/fejelude/Portfolio/actions/runs/46157907996), [artifact 15268371837](https://github.com/fejelude/Portfolio/actions/runs/46157907996/artifacts/15268371837) | 145/145 Node tests; Chromium desktop and mobile decoded-buffer audio and archive privacy checks passed. Desktop full 49.24 s recording includes all sprite interactions and successful native keyboard pause/resume, frozen canvases and unchanged audio label. The test subsequently asserted reduced-motion state before the media-change event settled. |
| [Corrected all-engine run 46158169316](https://github.com/fejelude/Portfolio/actions/runs/46158169316) | In progress at the time of this report; includes explicit media-query synchronization, fresh static viewport contexts, incremental performance JSON output and independent browser-profile failure collection. |

The two Chromium full-sequence WebMs from artifact 15268625831 and the desktop toggle WebM from artifact 15268371837 were downloaded. Frames sampled across the actual recordings (including intermediate dissolves, the return to sakura, the release/farewell canopy gusts and pointer reactions) were reviewed, not merely their metadata. The archive remains readable and the boy's hands and wave are distinct. The kitten shows a heart/hop, the flowers expand and sparkle, and the butterfly reacts in flight. Tree canopies shift in separate clusters without translating the entire grounded tree. The post-loop landscape screenshot is readable, with no horizontal overflow asserted by the browser. The tiny artwork intentionally uses stepped poses rather than smooth high-frame-rate hand-drawn cels. Full-page landscape screenshots include below-viewport content and the fixed scenery occupies the actual viewport; this is not a physical-device capture.

The following files are in the linked CI artifacts: `chromium-desktop-full-sequence.webm`, `chromium-phone-portrait-full-sequence.webm`, per-phase and per-interaction PNGs, the rotated phone PNG and reduced-motion PNGs. The toggle artifact additionally contains `chromium-desktop-paused.png`. These are GitHub Actions artifacts, subject to the repository's artifact retention policy, not production assets.

The current comparison harness samples two 3.2-second desktop and two 3.2-second 2× CPU-throttled phone opening intervals on each version, without video capture, and saves p95 frame intervals, gaps, scripting/task counters and heap. The earlier failed run did not persist those measurements; no numerical before/after results are claimed until the corrected run produces them. Opening interval samples are not a full-cycle, GPU-power or battery benchmark.

The remaining gate is the corrected all-engine run and review of its final performance and recording artifacts. Chromium/Firefox/WebKit lab viewport emulation is not physical Safari, iOS Safari or Android Chrome testing. No physical-device tests have been performed.

Existing hosting automation may create preview deployments from a branch push; this work did not invoke a deployment action or modify hosting configuration. The user retains merge and production-deployment control.
