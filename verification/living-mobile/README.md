# FEJELUDE — Living Mobile Experience

## Audit and references

The work started from `main` at `3d7b9db9ca8fa36039a45c08986dd0fd0b3808b5`, the creator wizard merge. I opened the live homepage in Chromium with a Pixel 7 touch profile and reviewed each chapter in the browser. I opened and closed the menu, changed cars, expanded Interactives, toggled Sofra’s mascot and touched the portrait. The live browser used the collectible poster. A separate SwiftShader pass exercised the car and watch renderers and established the before-and-after draw counts.

The homepage’s document-space gradient already blends the chapters by content geometry. Daedalus and Sofra add four bounded canvas bands around their own cards. The collectibles renderer, watch, particle portrait, ghost, wizard, service art, terminal and Interactives worlds each manage their own state. The mobile layer uses the existing touch targets and art around those experiences. The desktop runtime has its own media gate and input handling.

- **Vandana Rajesh.** The phone view invited a tap to drop ink. I tapped the hero and the photographic tray and scrolled through the transition. The portrait develops in the same visual language as the opening. That suggested a recognizable response to contact using whatever material belongs to the section. [Portfolio](https://vandanar.design/)
- **Yehwan Song.** I opened the artist’s site in the touch viewport and reviewed her experiments and account of touchscreens as a creative medium. The short touch on the wizard and ghost rewards curiosity while the existing reading and scrolling remain available. [Artist site](https://yhsong.com/) · [Typographics talk](https://2020.typographics.com/schedule/yehwan-song/) · [Interview](https://clotmag.com/interviews/yehwan-song-crafting-anti-friendly-webs-for-a-more-expressive-internet)
- **Mat Voyce and Davide Perozzi.** I used the mobile viewport to inspect Mat’s layout and reviewed the award case studies for typography, touch-scale layouts and pacing. I used motion around Fejelude’s terminal and pixel character while keeping the name readable. [Mat Voyce](https://matvoyce.tv/) · [Mat Voyce case study](https://good-design.org/projects/mat-voyce/) · [Davide Perozzi portfolio](https://www.awwwards.com/sites/davide-perozzi-portfolio)
- **Lusion, Bruno Simon and The Boat.** The former two use a dedicated world for immersion, and The Boat uses the rhythm of scrolling to carry a reader through a long story. FEJELUDE carries its color from one exhibit into the next and keeps the richer interaction inside its existing 3D and art systems. The browser passes on Lusion and Bruno reached initial mobile states. Their published work supported the rest of the reference comparison. [Lusion](https://lusion.co/) · [Bruno Simon](https://bruno-simon.com/) · [The Boat](https://www.matthuynh.com/stories/theboat-9rw43)
- **Additional references.** The Awwwards mobile, portfolio and animation collections provided comparison across layouts and motion styles. MDN informed gesture cancellation, and web.dev informed the distinction between frame pacing and field Web Vitals. [Mobile](https://www.awwwards.com/websites/mobile/) · [Portfolio](https://www.awwwards.com/websites/portfolio/) · [Animation](https://www.awwwards.com/websites/animation/) · [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) · [Touch action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) · [Animation performance](https://web.dev/articles/animations-guide) · [Web Vitals](https://web.dev/articles/vitals)

## Touch direction

| Chapter | Mobile response |
| --- | --- |
| Introduction | A short terminal signal acknowledges the title and terminal. The existing pixel character takes a small stepped hop when touched. |
| Collectibles | A narrow viewfinder opens on the poster or selector. Its hue follows the car’s frame color. The real exhibit suspends when its viewport leaves the screen. |
| Interactives | Pixel stars answer the home entry and directory’s introduction and progress panel. World cards give visible press feedback inside their existing links. |
| Daedalus | A gold dial turns a fraction of a revolution on a deliberate touch of the astrolabe or poster. The Philippine clock and live watch controls keep their own input. |
| Sofra | A pixel petal and small hearts lift from the mascot in its existing pink palette. The animation pause button still toggles the existing sprite. |
| About | The ghost takes a stepped hop and lifts pink, ink and red hearts around the motto. The portrait remains under its existing particle controller. |
| Roblox | A magenta film mark responds over Dream Garage. Build to Impress uses a small voxel stamp. The existing showcase pause applies to the added callbacks. |
| Commissions | The creator wizard casts a gold star with a short lift. The three services use voxel, dial and code-shaped feedback in their own accent colors. The wizard settles on entry where the browser supports a CSS view timeline. |
| Learning, roadmap and contact | A code signal, completion seal and contact pulse reflect each area’s purpose. Email text has higher contrast and the existing Discord copy action gets a matching confirmation color. |
| Footer | A small lavender signoff responds along the copyright line. The update link keeps its native action. |

## Implementation

The entry checks coarse input, the existing wide-desktop capability query and reduced motion. A touch-only tablet qualifies at any width. A wide hybrid qualifies for the existing desktop interaction mode. The full mobile stylesheet and module load only for eligible motion sessions.

One shared passive Pointer Events path distinguishes a short tap from travel, cancellation, a hold or an additional finger. The response starts on release. Presses on the portrait and live 3D canvases go to their existing controllers. The motion uses one reused 64 × 56 CSS-pixel element with at most four marks, a lower particle count with limited CPU or memory or data saving, and browser-driven transforms and opacity. An optional sprite response uses the same lifetime. Scroll, viewport resizing, tab visibility, motion settings and page transitions clear the active response.

The mobile sky bands retain their sizing, palettes, envelopes and paint budgets and use transforms for scroll position. The original touch opt-in for the automotive renderer stays in place. Once it is running, observation follows the exhibit surface so visible controls do not keep an out-of-view scene drawing.

## Captures and verification

| Evidence | Links |
| --- | --- |
| Paired phone screenshots | [Opening, car, Interactives and Daedalus](opening.webp) · [Sofra, About, Roblox and wizard](projects.webp) · [Services, learning, roadmap and contact](details.webp) |
| Tap-through recordings | [Main](before.mp4) · [Feature](after.mp4) |
| Chromium Performance recordings | [Main scroll profile](before-scroll-trace.json.gz) · [Feature scroll profile](after-scroll-trace.json.gz) |
| Detailed lab numbers and desktop comparison | [Measurements](metrics.json) |
| Browser assertions | [Mobile and desktop smoke test](../living-mobile-smoke.cjs) |

The matched phone screenshots use a 393 × 780 Chromium viewport with emulated touch and graphics fallback. They show the full chapter context shortly after the same touch on each revision. The Performance recordings span native touch scrolls in both directions across Daedalus and Sofra under 4× CPU throttling.

A Chromium Android run covered taps in every chapter, 25 repeated wizard taps, native pan cancellation, multitouch cancellation, a held touch, portrait-to-landscape resizing, simulated tab visibility, reduced motion and the Interactives hub. Additional Chromium sizes covered a 320 CSS-pixel phone and a 1194 CSS-pixel coarse-pointer iPad layout. Linux WebKit’s iPhone profile exercised the same chapter walkthrough and runtime preference changes. Chromium, Firefox and WebKit passed desktop motion and geometry checks. The existing 135 Node tests passed.

A separate Chromium SwiftShader run exercised live car touch dragging and the watch’s two-finger input, aspect ratio, gear inspection and exit. It measured the car’s offscreen drawing while the directory remained visible.

### Measured performance

The fixed Chromium touch profile used 393 × 780 CSS pixels, DPR 2 and the graphics fallback. Measurements used eight native swipe windows and fourteen tap stops, including changes in scroll direction. The normal column reports the medians of two visits. The 4× column describes one CPU-throttled visit per revision.

| Metric | Normal main → feature | 4× CPU main → feature |
| --- | ---: | ---: |
| LCP | 196 → 204 ms | 504 → 364 ms |
| Scripted-visit CLS | 0 → 0 | 0.502 → 0 |
| p95 animation-frame gap during swipes | 16.8 → 16.7 ms | 50.0 → 50.0 ms |
| Sampled gaps over 25 ms | 0 of 624 → 2 of 622, both runs combined | 42 of 234 → 44 of 235 |
| Main-thread task time | 2,090 → 2,057 ms | 9,837 → 9,601 ms |
| JavaScript time | 155 → 173 ms | 901 → 832 ms |
| Long tasks | 1 → 3, both runs combined | 61 → 51 |
| Peak observed Event Timing duration | 104 → 104 ms, median of each visit’s maximum | 224 → 248 ms |
| End-of-visit JavaScript heap | 3.44 → 3.93 MiB | 3.43 → 4.18 MiB |

The throttled baseline’s layout instability was attributed to the Sofra sky canvas repositioning. The feature kept the same visual layout and the measured shift disappeared. The throttled swipe trace still has missed-frame intervals and the slowest interaction took longer in that run. Event Timing here consists of individual observed lab entries. Field INP is outside this sample.

The SwiftShader test registered **45 → 0 car draw calls** during a one-second dwell after the car viewport left the screen. The directory and controls were still visible. Both revisions submitted draws during live car drag and watch interaction.

Ten desktop checkpoints were pixel-identical between revisions in a 1440 × 900 reduced-motion Chromium capture with a fixed clock. Ordinary desktop pointer interactions still loaded and responded in Chromium, Firefox and WebKit. Desktop pages fetched only the mobile capability entry, approximately 0.7 KB gzipped. Eligible sessions loaded approximately 5 KB gzipped for the mobile stylesheet and runtime together.

Physical devices, native iOS Safari chrome, Samsung Internet and in-app browser shells were outside the available device set. Viewport resizing exercised the application’s response to geometry changes. Battery, device thermals, hardware GPU timings and field Web Vitals require real-device or production measurement.
