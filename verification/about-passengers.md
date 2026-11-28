# Tokyo passengers

The motto-side ghost became a miniature cast of original characters for the Tokyo chapter. The courier wears a cropped silver jacket and an asymmetric undercut and reacts with violet static and a muted crimson glance. The archivist wears round glasses and a tobacco vest and opens a ledger with a separate page-turn cel. The platform attendant wears a buttoned oxblood coat with a rail pin and makes a quiet glance with silver signal marks. The sprite atlas is original pixel artwork created for FEJELUDE. It contains no anime frames, official sprites, or third-party character art.

The shared three-quarter bust scale keeps the silhouettes legible without competing with the portrait. Studies of silhouette, restricted palettes and cel timing favored the current face-first framing over full-body sprites, which would have fewer pixels for eyes and props at this size. Ink blocks clear one silhouette before the next reassembles. Idle holds, blinks and each character's gesture are scheduled as separate cels. See [Aseprite animation reference](https://aseprite.org/docs/animation/) and [Lospec tutorials](https://lospec.com/pixel-art-tutorials).

The 13 kB atlas holds 27 frames at 40 × 48 pixels per cel. CSS renders one cell as a pixel-snapped background. The module decodes near the viewport and uses one timeout at a time. It pauses offscreen and in a hidden tab and resumes its existing hold. Reduced motion shows a still courier. Pointer entry triggers the current character's gesture. Touch reacts only to a short stationary tap, leaving vertical pan and pinch zoom native.

The About typography commit retains the warm-silver heading, serif quote, vermilion accent and the `座右の銘` detail. The original Japanese sign, atmosphere, portrait and surrounding showcases are preserved. Only the ghost-specific mobile effect was retired.

## Browser evidence

| Evidence | Capture |
| --- | --- |
| All three characters in the About section | [Screenshot comparison](about-passengers/characters.jpg) |
| Desktop full loop and hover reactions | [Recording](about-passengers/desktop-sequence.webm) |
| Phone full loop and tap reactions | [Recording](about-passengers/phone-sequence.webm) |

Chromium verified the full loop through all three rows on desktop and a Pixel 7 profile as well as desktop pointer entry, mobile taps, native vertical swipe starting on the sprite, return to the first character, offscreen suspension, and portrait hover and tap. The iPad Mini profile, reduced motion, Firefox desktop and WebKit with an iPhone-sized touch profile passed smoke tests. All 87 Node tests passed. Mobile browser checks used emulation. No physical Android or iOS hardware was available.

## Performance

Two matched short Chromium samples per version measured the whole homepage at the motto without video capture, using CPU-only rendering. The Pixel 7 profile used 2× CPU throttling. These short samples do not provide a physical-device or GPU benchmark.

| Profile | Version | p95 frame interval | Gaps over 25 ms | Script time | Main-thread task counter | JS heap at end |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Desktop 1440 × 900 | Ghost | 16.8 ms | 7 | 6.7 ms | 256 ms | 4.62 MiB |
| Desktop 1440 × 900 | Passengers | 16.8 ms | 2 | 6.6 ms | 213 ms | 4.79 MiB |
| Phone emulation 393 × 810 | Ghost | 16.8 ms | 1 | 17.6 ms | 434 ms | 4.18 MiB |
| Phone emulation 393 × 810 | Passengers | 16.8 ms | 0 | 16.5 ms | 336 ms | 3.63 MiB |
