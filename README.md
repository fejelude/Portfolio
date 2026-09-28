# itsmefeje-portfolio
Roblox Developer Portfolio

## Sofra

The public introduction is at `/sofra/about`; the authenticated control panel
remains at `/sofra`. See [SOFRA_RENOVATION.md](SOFRA_RENOVATION.md) for the
architecture review, coordinated bot changes, tests and remaining release gates.
Deployment variables and OAuth setup are in [SOFRA_PANEL_SETUP.md](SOFRA_PANEL_SETUP.md).

## Click me ♡

The former arcade entry is now an audio-timed kawaii Easter egg on the homepage.
Old arcade URLs redirect to `/#surprise`; the button itself never navigates.

- `js/surprise.js`: isolated controller, native audio clock, canvas particles,
  bounded sticker animations, mute/end controls, and cleanup.
- `css/surprise.css`: resting card and temporary overlay styles.
- `assets/surprise/manifest.json`: all 32 supplied images and four full-length tracks.
- `js/surprise-assets.js`: the same manifest embedded for synchronous click startup.
  Update both manifests together when replacing assets.

Tracks are selected randomly without consecutive repeats. The original background
music remains unchanged; the reveal now uses the supplied 3.667-second replacement
sound as a separate optimized MP3. Both streams are primed in the click handler.
At the per-track reveal cue, the effect restarts from zero, the music ducks, and the
selected braided-girl image appears on the same media-clock frame. The sequence
length follows the effect element's actual duration plus a short exit tail instead
of the previous fixed ~10-second sound window.

Images are scaled WebP copies presented in sticker frames, with the original artwork
and attribution marks retained. Supporting artwork uses a shuffled deck so all
images can appear over repeated plays. Blocked, pending, or stalled playback falls
back to a finite visual sequence. Reduced-motion users get a gentle reveal. End,
Escape, leaving the page, or hiding the tab cancels and resets both audio streams
and all animations.
No account, backend, environment variable, or new production dependency is needed.

Run `node --test tests/surprise.test.mjs` for controller regressions.
The Surprise CI workflow also exercises Chromium, Firefox, and WebKit with
Playwright. A real iPhone Safari check is still recommended before merging:
first tap after a cold load, mute/unmute, replay, scroll, rotation, and tab switching.

## Persistent Admin Logs

Visitor activity is recorded by `/api/activity` on every page view and by custom site events. In production, configure durable Redis storage with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so logs survive refreshes, server restarts, deployments, and admin inactivity.

Optional: set `ACTIVITY_LOG_LIMIT` to control retained historical events. The default is `10000`, with a safe range from `500` to `50000`.

Without Upstash, the site still records activity to runtime memory for local development, but the admin panel marks that storage as `Runtime Only` because it is not persistent.

