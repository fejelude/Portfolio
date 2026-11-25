# Sofra — Sakura Kawaii Ambient VFX

## Art direction
A dusky hanami garden framing the existing project card: strawberry-cream highlights, sakura and rose pink, lavender, pearl white and a restrained baby-blue sparkle. Original hand-plotted pixel matrices depict notched petals, blossoms, shaded hearts, ribbons, lavender cats (blink and tail frames), strawberries and stars. No emoji, imported sprites or proprietary character assets. Floral sprays occupy the viewport edges at two parallax depths, complemented by small card-corner garlands in open horizontal bands, with more distant particles and independent oscillations; a rare shooting heart has a short fading pixel trail.

References studied before implementation: [GO TOKYO hanami and hanafubuki](https://www.gotokyo.org/en/story/guide/the-japanese-cherry-blossom-trees/index.html); [Japan Guide cherry blossoms](https://www.japan-guide.com/e/e2011.html); [Paulo Dos Reis, Animations/sprites](https://www.behance.net/gallery/45738323/Animationssprites) for a dusk palette, silhouette framing and drifting blossoms; [pixel icon color and shading reference](https://ko-fi.com/s/73739aad12), and [pixel sprite animation technique](https://spritecanvas.com/pixel-art-animation/) for limited palettes and unsmoothed edges. Only broad artistic principles were used; all code and glyph matrices are original.

## Scope and lifecycle
The only homepage markup changes load an independent stylesheet and module. The Sofra card and mascot markup/style/behavior, links, service status and Daedalus code are unchanged. The new aria-hidden, pointer-transparent fixed layer uses the existing foreground stacking convention. Four disjoint canvas panels exclude the card with five pixels of clearance; wash is behind content. A reversible smoothstep envelope measures the Sofra section and attenuates its own effects by (1 - Daedalus wash × (1 - Sofra ownership))², using the existing celestial envelope formula and a smooth .70-to-.25 viewport-height handoff. This gives Daedalus priority while approaching and lets Sofra take over when its section enters the reading band. The Daedalus implementation remains untouched. A 112-particle fixed pool (70 on narrow screens) and capped backing scale bound work; 24/30 target paint cadence, integer backing-pixel sprite dimensions, visibility/IntersectionObserver suspension, 1x1 released buffers outside range, static reduced-motion frame, and pagehide/BFCache cleanup. No new dependencies or controls.

## Verification
Unit tests cover direction symmetry, activation, celestial suppression, nonoverlapping canvas bands, pixel budget, seeded sprites and finite poses. Dedicated CI runs Chromium, Firefox and WebKit in desktop and 390px/DPR3 configurations, captures baseline (same camera/scroll with only the overlay hidden), active, reduced-motion, leaving, celestial and return views, and checks hit-testing, static/moving frame digests, cadence, buffer release and lifecycle. The actual card regression and Daedalus smoke suites remain unchanged. A mobile WebKit emulation is not a physical iPhone test. Review CI screenshots and measurements before merge; no deployment is performed by this change.

## Local verification completed

The exact committed JavaScript, CSS and unit-test files were recovered into the local runtime and verified against their Git blob SHA-1s. Node 22 syntax checking passed, and all three committed unit tests passed (0 failures). An independent numerical sweep covered 3,003 envelope samples and 448 particle poses; a further 1,001 adjacent-section handoff samples showed continuous monotonic activation (maximum adjacent strength change 0.002069).

An isolated Chromium browser fixture using the exact feature JS/CSS and a representative Sofra card was visually inspected on desktop and emulated phone. This fixture is not the deployed homepage and does not reproduce the real mascot or Daedalus renderer.

| Metric | Desktop 1440 × 900, DPR 1 | Phone 390 × 844, DPR 3 |
| --- | ---: | ---: |
| Active canvas backing pixels | 669,075 | 542,606 |
| Measured paint cadence | 30.00/s | 24.12/s |
| Mid-handoff intensity (section top at 52% viewport) | 0.1239 | 0.1236 |
| Reduced-motion bitmap stability | Pass | Pass |
| Animated bitmap change | Pass | Pass |
| Link hit-testing | Pass | Pass |
| Offscreen buffer release | Pass | Pass |
| BFCache lifecycle and disposal | Pass | Pass |
| Browser exceptions | 0 | 0 |

Both inspected frames showed unobstructed card content, readable pink atmosphere, edge garlands, cats, bows, blossoms and dispersed petals. Repository-wide browser tests and actual-homepage screenshots remain a CI review gate because direct GitHub clone and loopback HTTP navigation are unavailable in this runtime. The isolated browser test injected the exact committed source and stylesheet into an in-memory fixture; no real iPhone or Safari engine performance was measured locally.
