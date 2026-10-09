# Checks performed for Sofhia’s Songs

## Passed in the development workspace

- Existing repository baseline: 52 tests passed before edits.
- Final repository suite: **77 tests passed, zero failures** (`node --test
  tests/*.test.* api/sofra/*.test.js`).
- Queue tests: sequential autoplay, skipping locked/failed tracks, stopping after
  the last track, repeat one/all, manual Next, shuffle permutation, Previous
  history, bounded history, empty/1/25 tracks, missing duration, and asset paths.
- Actual audio-controller tests with deterministic platform doubles: gesture
  priming, 600ms ambient/song gating, rapid selection/cancellation, stale promise
  rejection, blocked resume, external pauses, context interruptions, hidden-tab
  ambience suppression, mute isolation, autoplay/finish/restart, AAC fallback,
  failure skipping, buffering, next preload staying paused, Media Session
  controls, listener/source/timer cleanup. These are simulations, not physical
  device observations.
- Birthday clock/art/privacy regression tests; existing modules and birthday
  CSS are unchanged. The album entry is immediately available on the welcome
  screen, independently of birthday audio loading.
- Local HTTP checks: album clean/raw URLs and birthday route return 200 with
  `X-Robots-Tag`; MP3/background/AAC return correct MIME, `206`, the correct
  `Content-Range`, and 256 requested bytes. Existing homepage/Gallery/Sofra routes
  still return 200. These verify the local Vercel-style server, not production.
- Audio decoding and waveform seam: FFmpeg decoded the supplied MP3 to 46.856417
  seconds. The 0.5s crossfade loop has 46.356417 seconds; its mono boundary step
  is `0.00298195`, versus `0.1566467` for the 99th percentile of ordinary
  neighboring-sample changes. No silence/padding was appended. Crossfade unit
  tests verify consecutive original samples at the join and no input mutation.
- Syntax, config JSON, original artwork inspection, and repository diff review.

## Native browser checks on GitHub Actions

The complete album matrix passed in
[Sofhia album CI](https://github.com/fejelude/Portfolio/pull/95/checks).
The workflow runs the full repository suite on both hosts as well. The PR’s
Checks tab links each commit’s results, native logs, and screenshot artifacts.

| Runner | Native browser / viewport | Result |
| --- | --- | --- |
| Linux | Chromium 141 desktop and Pixel 5 touch emulation | Passed |
| Linux | Firefox 142 desktop and narrow configuration variants | Passed |
| macOS 15 | WebKit 26 desktop and iPhone 13 touch emulation | Passed |

These are real browser media decoders and Web Audio graphs, with genuine mobile
taps. They are not physical-device observations. WebKit audio is verified on
macOS; earlier Linux WebKit attempts failed the gain assertion and are not
counted as passed audio checks. Browser verification found and resolved a moving
tap target, WebKit buffering-status recovery, and native ended/seek races when
restarting or switching tracks. The controller also resumes the already
activated native element after its quiet rewind, covering an intermittent
WebKit seek pause; a dedicated regression test exercises that recovery.

Birthday garden CI independently passed its existing three-engine checks,
including the native minute-long timeline, Replay, and mobile/landscape bounds.

`verification/album-smoke.cjs` uses native media and Web Audio in Chromium,
Firefox, and WebKit, with desktop/mobile viewports. It covers cover-to-album,
metadata, controls, actual decoded loop boundary, gain exclusivity, seek, rapid
switching, native ended autoplay, last-song stop/Play again, note dialogs, mute,
external pause/tap resume, 320px/landscape layouts, reduced motion, 0/1/25 tracks,
locked/missing files, delayed downloads, and return to the birthday page.
`Sofhia album CI` runs this script and saves screenshots. The existing birthday
workflow independently runs its complete timeline/Replay/layout checks.

Chromium desktop/mobile/320px and final WebKit iPhone/320px screenshots were
visually reviewed; controls, titles, notes, the full 18-song list and footer fit.
Local browser installation failed because the network returned a non-archive
response for the official Playwright download; the separate cloud preview could
not connect to the local server. Browser execution used GitHub Actions instead.
Those unsuccessful local attempts are not counted as passed checks.

## Still requires a real device / production check

- iPhone Safari: cold-load audio unlock; Safari seeks/ranges; phone lock; incoming
  call; unplugging headphones; actual lock-screen artwork and controls; home-bar
  clearance; device-tilt permission; perceptual listening across several loops.
- Android Chrome: cold-load playback, tab switching, lock, interruption, seek,
  Bluetooth/headphones, tilt, and performance on a mid-range phone.
- Desktop Chrome, Safari, Firefox, and Edge: manual visual/audio review. Engine
  emulation is not the same as native Safari/Edge or physical hardware.
- Slow/offline mobile connection: real stalls, recovery, and blocked auto-resume.
- Production after merge: album and birthday link are live; audio MIME/range
  responses; no public navigation/sitemap link; no overlapping sound; Back and
  Replay; small screens/text zoom; approximately 60fps particles under load.

The PR is deploy-ready on the existing static Vercel host. Production publication
is not claimed until the normal merge/deploy has occurred.
