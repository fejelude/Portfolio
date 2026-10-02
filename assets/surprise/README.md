# Surprise audio and choreography

`track-1.mp3` through `track-4.mp3` are the existing background music.
`love-you-sfx.mp3` is a browser-optimized MP3 made from the replacement audio supplied for this update. Its decoded duration is 3.667 seconds.

The controller starts both audio elements directly inside the user's click so desktop and mobile browsers can authorize playback. The SFX is audible from its first play request and the hero image is revealed in the same synchronous click stack; it is never deferred from a muted loop, which is unreliable on iOS. A repeated activation restarts the SFX from zero, while the music remains the animation clock.

The backing track controls the sequence duration, with a metadata-driven fallback if its duration is not ready when the click occurs. Music ducks while the hero is visible, and both audio elements are paused and reset by the shared cleanup path.

`impactCues` are seconds relative to the reveal and are chosen from the replacement clip's strongest moments. The controller coalesces skipped cues, keeps one capped particle canvas, reuses the existing WebP sticker deck, and preserves the existing desktop/mobile and reduced-motion limits.

Keep `manifest.json` and `js/surprise-assets.js` in sync when changing assets or cues. Validate with `node --check js/surprise.js`, `node --test tests/surprise.test.mjs`, and `node verification/surprise-smoke.cjs`.
