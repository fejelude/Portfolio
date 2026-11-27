# FEJELUDE — Living Desktop Experience

## Audit and creative direction

The review started from `main` at `15ed9847f19caeee3a20418e109db121e6d3aed1`. The live homepage matched that revision’s HTML. The desktop browser pass covered the introduction, collectibles selector, navigation disclosure, the exhibition and Sofra handoff, profile, Roblox projects, services, and contact. The cloud browser used the car poster fallback. Local Chromium with SwiftShader supplied the live 3D baseline.

The homepage and Interactives hub are static HTML. The existing document-space wash already interpolates between chapter palettes, and the Daedalus and Sofra skies render in separate bounded 2D canvas bands. The car has its own adaptive WebGL renderer and the watch uses a separate lazy-loaded Three.js renderer. The portrait, terminal, pixel sprites, Roblox scenes, services and surprise already own their controls and visibility behavior. The most useful places to add a response were the frames, artwork and ordinary UI around these systems.

- **Vandana Rajesh.** In the desktop visit, a click deposited ink at the title and movement left a localized wake. Dragging across the photograph produced small marks in its developing-tray treatment. The portfolio uses the material of each scene to explain the gesture. FEJELUDE applies that idea to pixels, engraving, metal and game screenshots. [Portfolio](https://vandanar.design/)
- **Lusion v3 and Bruno Simon.** Their project presentation and playable portfolio reserve space and attention for the central experience. The car and watch remain the center of their exhibits here, with nearby frames providing independent peripheral feedback. [Lusion v3 case study](https://www.awwwards.com/sites/lusion-v3) · [Lusion](https://lusion.co/) · [Bruno Simon](https://bruno-simon.com/)
- **Dennis Snellenberg and abeto’s Messenger.** I looked at local hover feedback, transitions, and how motion guides attention through work. FEJELUDE keeps its controls anchored and moves their accents and artwork. [Dennis Snellenberg](https://dennissnellenberg.com/) · [Messenger developer award](https://www.awwwards.com/sites/messenger)
- **Award galleries and engineering references.** The portfolio and animation galleries informed the comparison across Site of the Day, Site of the Month, Site of the Year, and Developer Award examples. The performance plan uses transform and opacity for animation and separates local lab observations from field measurements. [Awwwards portfolios](https://www.awwwards.com/websites/portfolio/) · [Awwwards animation](https://www.awwwards.com/websites/animation/) · [High-performance CSS animations](https://web.dev/articles/animations-guide) · [Web Vitals](https://web.dev/articles/vitals)

## Desktop changes

| Section | Response |
| --- | --- |
| Introduction and navigation | A terminal read head tracks beneath the name, the pixel companion gives a short stepped acknowledgment, and a narrow highlight runs along the hovered navigation control. The intro aligns with the exhibit viewport and CSS-drawn link arrows render independently of font glyph coverage. |
| Automotive collectibles | An edge reflection borrows the selected car’s palette. The previous and next arrows move inside their existing hit targets. The live renderer suspends when the exhibit viewport exits view, even if its controls and directory entry are still visible. |
| Interactives | Pixel stars respond around the entry button and the project miniatures. The directory’s progress frame gets its own edge highlight and its existing pause control suspends the added artwork. |
| Daedalus Tourbillon | The header gets an engraved gold tracking mark and the cinematic poster catches a sapphire reflection. The reflection disappears during loading and live 3D. |
| Sofra | Small stepped petals respond near the mascot in the existing pink and violet palette. The mascot’s pause control still pauses its artwork. |
| About | A small pixel heart illuminates the edge of the motto region. The portrait and ghost keep their existing behavior. |
| Roblox creations | Dream Garage gets an inspection bracket and Build to Impress gets a voxel grid. The image frames reserve their native proportions on desktop during lazy loading. Showcase pause suspends these new details. |
| Commissions | The blue game tool steps up, the amber model preview magnifies slightly, and the teal web tool shifts like a pixel indicator. Each row’s edge uses its service color. |
| Curriculum, roadmap, and contact | The curriculum icons, completed-goal seals and contact icons respond independently. The contact email has brighter text and the Discord copy action keeps its text feedback with a corresponding border treatment. |

## Implementation

- Desktop effects load only above 900 CSS pixels with fine-pointer and hover capability and a preference for motion. Touch input on a hybrid device clears the desktop response. The capability entry is approximately 0.6 KB gzipped. The interaction module and stylesheet load conditionally.
- A single passive pointer path coalesces positions with one pending animation frame and caps updates on the same surface at 30 per second. CSS interpolates transforms and opacity. Geometry is cached during a local interaction, and visibility, scrolling, resizing, motion preference changes and page lifecycle events clear the effect. Decorations are added on demand, hidden from accessibility APIs and excluded from hit testing.
- Desktop sky bands use transforms to follow the existing card boundaries. The canvas pixel budgets, section envelopes and document-space wash remain in use. The pointer layer creates zero Canvas or WebGL contexts.
- The feature is confined to the homepage and Interactives directory. The branch carries no new runtime dependencies, server changes, protected-route changes, or hosting changes.

## Visual evidence

| Before and after screenshots | Matched desktop recordings |
| --- | --- |
| [Opening, automotive, Interactives and Daedalus](opening.webp) | [Main recording](before.mp4) |
| [Sofra, About, Roblox and services](projects.webp) | [Feature recording](after.mp4) |
| [Curriculum, roadmap, contact and worlds](details.webp) | |

The matched captures use Chromium at 1440 × 900 CSS pixels and the graphics fallback. The white position marker belongs to the capture harness. Separate SwiftShader runs exercised the existing live 3D modes.

## Verification

| Area | Coverage |
| --- | --- |
| Desktop engines | Chromium 158.0.8127.0, Firefox 153.0 and Linux WebKit 26.5. |
| Desktop geometry | 1024 × 768, 1440 × 900, 1920 × 1080, 2560 × 1440 at DPR 2, and 3440 × 1440. The Chromium sweep also emulated the layout and raster scales of 150% and 200% zoom at a 1920 × 1080 display size. |
| Interactions | Per-chapter hover, repeated movement, desktop navigation and focus, native wheel movement and jumps in both directions, reduced-motion changes, resized viewport, simulated visibility changes, touch input on a fine-pointer page, and hub navigation and pause. |
| 3D and existing controls | The car switched collectibles and responded to keyboard orbit and pause. Daedalus entered live 3D, switched to a square frame, inspected its gear train, orbited by keyboard, and returned to the poster. The Manila clock continued updating. |
| Mobile | Android Chromium and iPhone WebKit matched section geometry and exercised the existing navigation and controls. A 1194 × 834 coarse-pointer iPad profile stayed outside desktop mode. Touch-only and reduced-motion sessions never requested the new interaction module or artwork. |
| Repository tests | 134 Node tests passed. Browser assertions are in [living-desktop-smoke.cjs](../living-desktop-smoke.cjs). |

### Measurements

The desktop lab used a 1440 × 900 Chromium viewport, the graphics fallback, blocked third-party requests and the same 11-stop pointer sweep. The normal results are medians of three runs.

| Metric | Main | Feature |
| --- | ---: | ---: |
| Navigation LCP | 184 ms | 184 ms |
| CLS during the scripted visit | 0.649 | 0.011 |
| Sampled rAF gaps above 25 ms | 13 of 227 | 13 of 225 |
| Main-thread task time across pointer samples | 613 ms | 822 ms |
| Script time across pointer samples | 35 ms | 60 ms |
| Long tasks across the visit | 1 | 1 |
| Longest task across the visit | 69 ms | 54 ms |
| Sampled JavaScript heap | 5.45 MiB | 5.24 MiB |

Nine of the eleven stops had a 16.7 ms p95 frame interval in both versions. The watch preview’s p95 moved from 33.4 to 50.0 ms. Services was 33.4 ms in both. The new feedback adds main-thread work, including style updates. In one 4× CPU-throttled pass per revision, there were 33 of 198 sampled gaps above 25 ms on main and 31 of 193 on the feature. Long tasks moved from 24 to 26 while the longest fell from 259 to 173 ms. Those throttled samples are sensitive to machine load.

Layout Instability attribution identified moving decorative sky bands as the dominant CLS source during scripted jumps. Desktop positioning now uses transforms while preserving the same canvas regions and draw budgets.

In the separate 1100 × 700 SwiftShader run, the main revision submitted 175 car draw calls during a directory dwell after the car viewport was offscreen. The feature submitted zero. Both revisions rendered the car on screen and passed the live watch controls. The main trace included a multi-second stall, so the actual sampling windows stretched to 6.28 s and 1.22 s respectively. Draw-call counts establish offscreen suspension. They cannot substitute for hardware GPU timing.

Reduced-motion capture comparison with a fixed clock produced identical section geometry on both phone profiles. On Android, 11 of 11 captures matched pixel for pixel. On iPhone WebKit, 10 of 11 captures matched pixel for pixel, with all differences confined to 3 levels per 8-bit RGB channel.

[Raw lab runs and mobile screenshot comparisons](metrics.json)

Field Core Web Vitals, dedicated-GPU timings, native macOS Safari, physical mobile devices and physical trackpad gestures were outside this environment. The profile samples describe the two local revisions on the same desktop browser. Actual performance varies with graphics hardware, browser, and settings.
