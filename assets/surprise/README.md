# Surprise audio and choreography

`track-1.mp3` through `track-4.mp3` are the existing background music.
`love-you-sfx.mp3` is a browser-optimized MP3 made from the replacement audio supplied for this update. Its decoded duration is 3.667 seconds.

The controller primes both audio elements directly inside the user's click so desktop and mobile browsers can authorize playback. The music remains the animation clock. The reveal SFX stays muted and loops until the selected track's `reveal` timestamp, then restarts at zero, becomes audible, and the hero image appears on that same media-clock frame.

The sequence duration is calculated as `reveal + actual SFX duration + exitTail`. `loadedmetadata` updates the fallback duration from the media element itself, so future SFX replacements do not require restoring the old hard-coded 10-second window. Music ducks to 22% during the reveal and both audio elements are paused/reset by the shared cleanup path.

`impactCues` are seconds relative to the reveal and are chosen from the replacement clip's strongest moments. The controller coalesces skipped cues, keeps one capped particle canvas, reuses the existing WebP sticker deck, and preserves the existing desktop/mobile and reduced-motion limits.

Keep `manifest.json` and `js/surprise-assets.js` in sync when changing assets or cues. Validate with `node --check js/surprise.js`, `node --test tests/surprise.test.mjs`, and `node verification/surprise-smoke.cjs`.
