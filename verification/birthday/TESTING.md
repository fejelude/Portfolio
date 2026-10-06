# Birthday garden verification

Verified October 6, 2026. **No physical-device testing was performed.**

## Repository and references

The repository is a static HTML/CSS/JavaScript site with Vercel serverless APIs.
It has no package manifest, bundler, application router, sitemap, or sitemap
generator. Existing `cleanUrls`, redirects, rewrites, pages, and dependencies
remain unchanged. Only two route-specific noindex header entries are added to
`vercel.json`; everything else is new, birthday-specific code or verification.

All nine attachments were available: five JPEGs, three 12.033-second reference
clips, and the supplied MP3. Images and sampled video frames informed the pixel
window borders, pink palette, blossom atmosphere, and hanging star decorations.
The clips contain pink UI collages and Pinterest loading/end frames; they are
not used as site assets. The finished grove and bouquet are original canvas art.

The original MP3 is unchanged:

```
FFprobe duration: 59.454694 seconds
Chromium decoded duration: 59.418413 seconds
SHA-256: 1cd80df76b0d9fd2d252e6da7ada4d598ec04b67e8081a583f73bbb493068545
```

## Actual results

| Check | Result | Evidence / method |
| --- | --- | --- |
| Full 60-second progression | Passed | Played the actual MP3 at normal speed in Chromium 141.0.7390.37, with a real pause and continuation. Inspected story checkpoints at 10, 32, 47, 57, and 59s. |
| Reveal at 1:00 | Passed within one render frame | Native audits measured **60.014113s** locally and **60.007913s** in CI. The message remained hidden at 59s. Native track ended at 59.418413s; the remaining fraction was a silent coda. |
| Audio startup and synchronization | Passed in Chromium | Real playback started from START, `currentTime` progressed, and no media error occurred. The media clock remained authoritative during playback. |
| Audio before motion permission | Passed with simulated permission API | START invoked `play()` before requesting motion permission. A permission promise deliberately left unresolved did not delay real audio playback. Physical iOS permission UI was not tested. |
| Pause/resume | Passed | Native audio held exactly at the paused position; visuals resumed. Separate controlled-clock cases held media and silent fallback during pauses. |
| Late aborted playback promise | Passed in simulation | An earlier pending play rejected with AbortError after a media failure; it could not interrupt the new silent fallback or display an incorrect continuation overlay. |
| Background/blocked resume | Passed in simulation | Simulated `visibilitychange`, 9s hidden time, and rejected automatic resume. Story held its position; Tap to continue resumed from there. |
| Buffering/stalled playback | Passed in simulation | Dispatched waiting/playing events with controlled media time; visuals froze and resumed at matching positions. Ordinary buffering did not select silent fallback. |
| Slow initial download | Passed with delayed HTTP response | Delayed the song response 5s in Chromium. START became available after its brief initial grace period, the story held at 0 while waiting, then real playback began. Not a physical weak-network test. |
| Missing audio | Passed | Intercepted the actual MP3 URL with HTTP 404; the silent timeline retained a full minute and revealed only at its end. |
| Replay | Passed | Three successive replay runs per desktop/mobile context; initial and final controls reset, story returned to 0, and no duplicate reveal occurred. Clock reset also tested over ten runs. |
| Skipped frames / final states | Passed | Clock jumped across chapter boundaries; all completed stems, blooms, filler, folds, bow, and tag remained correct, and reveal stayed hidden below 60. |
| Reduced motion | Passed in Chromium emulation | 320×568 viewport, reduced-motion setting, silent audio fallback, pause/resume, and full progression; fewer/calmer particles and no parallax. |
| Mobile / desktop layout | Passed in Chromium emulation | 390×844 portrait at DPR 1 and 3, 1440×1000 desktop, 844×390 landscape, plus 320×568 reduced-motion layout; no horizontal overflow or out-of-bounds normal-size controls. |
| Enlarged text / zoom support | Passed in emulation | Doubled root font size at 390×844. START and Replay remained reachable, text was readable, no horizontal overflow. No restrictive viewport zoom setting. |
| No JavaScript | Passed | JavaScript-disabled context rendered the original bouquet and birthday card, with no unusable buttons. |
| Canvas unavailable | Passed | Disabled 2D contexts; meaningful static card appeared. |
| Console errors | Passed in Chromium | None during real playback, chapter/replay tests, portrait/desktop screenshots, or enlarged-text checks. |
| Audio decode | Passed | FFmpeg decoded the actual MP3 without errors. No compatibility result established a need for an AAC fallback. |
| MIME / HTTP range | Passed locally | Actual asset URL returned audio/mpeg and HTTP 206 with the expected Content-Range for bytes 0–255 from the range-capable verification server. |
| noindex / route isolation | Passed | HTML robots metadata and both clean/.html route headers checked; all four existing HTML pages have no link to the new route. |
| Sitemap exclusion | Passed for current repo | No sitemap or generator exists; the route is not added to either. Future generators must exclude it explicitly. |
| Existing-site regressions | Passed | All **52** Node tests passed, including existing Surprise/Sofra/API tests. Existing static routes and arcade redirect resolved on the local verification host. Existing HTML/CSS/JS/API files are unchanged. |
| Cross-browser automation | Passed in CI | Chromium 141.0.7390.37, Firefox 142.0.1, and WebKit 26.0 passed the controlled chapter/coda, interruption, replay, reduced-motion, responsive-layout, missing-audio, and static-fallback suite. The actual full MP3 was tested separately in Chromium. [Successful run](https://github.com/fejelude/Portfolio/actions/runs/37546678710). |
| Vercel deployment | Builds passed | Both connected Vercel projects reported successful preview deployments for this branch. The preview redirected to Vercel sign-in, so deployed page rendering, response headers, and audio range behavior could not be inspected. |

The first CI run exposed an unreliable simulated coda assertion in WebKit.
The test now defines its performance clock explicitly and waits for completed
animation frames. The full cross-browser rerun passed; production animation
code did not need a change. Firefox/WebKit could not run in the local container,
so their results above come from the GitHub Actions Ubuntu runner.

## Unverified environments

- Actual iPhone Safari and Chrome on Android, phone locking, incoming calls,
  physical tilt sensors, and system audio interruption behavior.
- Native macOS Safari, Windows Edge, physical safe-area/browser-bar behavior,
  and frame performance on a mid-range phone.
- Full native MP3 playback in Firefox and WebKit. Their automated timing and
  interruption tests used controlled media; real full-track playback was
  verified in Chromium. Linux WebKit automation is not physical iPhone Safari.
- Vercel preview rendering, response headers, MIME, and range behavior remain
  unverified because the preview requires Vercel sign-in. Production is not
  changed by creating this PR.

## Review artifacts

- [Mobile welcome](welcome-mobile.png)
- [Mobile celebration](final-mobile.png)
- [Desktop celebration](final-desktop.png)
- [200% text celebration](zoom-final.png)

The native audio audit observed `playing → pause → playing → pause/ended → reveal`.
The full browser command and reproducible simulated cases are in
`verification/birthday-smoke.cjs`. CI retains the additional chapter, landscape,
reduced-motion, no-JS, and native-run screenshots as an artifact.
