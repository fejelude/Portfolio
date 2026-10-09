# Sofhia’s Songs

The album is a buildless page at `/sofhias-songs-67` on the existing Vercel host.
The birthday finale adds one link when its existing Replay button appears. No
bouquet, clock, birthday audio, Replay handler, homepage, or nav code changed.

## Edit the album

All content is in **`js/album-config.mjs`**. Add, remove, or reorder entries in
`ALBUM.tracks`; no HTML, CSS, or controller change is needed. It supports empty,
single-track, 18-track, and larger albums. Keep each `id` unique.

```js
{
  id: 'my-first-song',
  title: 'Your real song title',
  audio: '/assets/album/first-song.mp3',
  fallbackAudio: '/assets/album/first-song.m4a', // optional AAC fallback
  cover: '/assets/album/first-cover.webp',      // optional
  duration: 183,                              // optional seconds
  note: 'A short dedication for Sofhia. ♡',    // optional
  lyrics: 'First line\nSecond line',           // optional, plain text
  placeholder: false,
}
```

Upload your file into `assets/album/` and edit its path in the entry. Remove
`duration` to read the audio’s metadata. The current track’s decoded duration
always wins over the supplied number. Omit `cover` to use the album cover.
Omit `note` and `lyrics` to remove the heart and dialog. Both may be present;
newlines are preserved. For unfinished songs set `audio: ''`: they display
“Coming soon 🔒” and are skipped, including in shuffle and repeat.

The 18 supplied placeholders play the same original **8-second bell sample**,
with MP3 and AAC copies, so every control is testable. They are not the final
songs. Set `placeholder: false` when replacing each sample. The sample banner
disappears when no entry is a placeholder. Short-duration differences in MP3
metadata reflect codec padding; the actual playback duration is used.

Change `title`, `subtitle`, `artist`, `closingMessage`, `cover`, `mediaCover`, and
`entryButtonText` in the same config. The birthday page imports that entry text.
`mediaCover` is a square PNG/JPEG/WebP for lock-screen artwork; SVG covers use
the album’s PNG fallback. An individual track can also supply `mediaCover`.

Replace `background.mp3`, or change `backgroundMusic` in the config. The attached
source is preserved byte-for-byte: 46.89 seconds in the container, 46.856 seconds
decoded. A 0.5-second tail/head crossfade produces a 46.356-second repeating
buffer without padding or a timer-driven restart. `loopCrossfade` and
`backgroundVolume` (default `0.4`) are adjustable. `unlockAudio` should remain the
small sample, which primes the same song audio element inaudibly on OPEN ITT.

## Playback and hosting

The OPEN ITT gesture resumes Web Audio and primes the native song element before
any async decoding or screen transition. A single HTMLAudioElement plays songs;
a second, always-paused element preloads the next. Other duration probes use
metadata only. The loop uses a decoded Web Audio BufferSource with `loop=true`.
Background fades down over 600ms; the song stays gated at zero and rewinds its
inaudible startup time before it becomes audible. The ambient gate is forced to
zero before the song gate opens. Pausing/ending restores ambience, except while
hidden or muted. Buffering keeps ambience silent. Media Session supports headset
and lock-screen controls; an interruption or blocked resume offers an explicit
Tap to continue. No preferences or playback position are written to storage.

Vercel’s existing `cleanUrls: true` serves the new HTML at the requested URL;
there is no build, dependency, secret, or new hosting service. Static MP3/AAC
files use `audio/mpeg`/`audio/mp4` and native byte-range serving. Preserve this
behavior if moving hosting. Use relative same-origin audio files (recommended);
cross-origin audio requires appropriate CORS headers for the Web Audio graph.

Only the birthday page links here. Both album URLs have robots meta/header
`noindex, nofollow`, and the album is absent from public navigation and sitemaps.
This is an **unlisted static gift**, not authenticated access control: someone
who knows the URL can open it. Referrer gating would break the existing birthday
page’s `no-referrer` policy and browser Back, so it is deliberately not used.

Merge the PR through the repository’s normal Vercel integration to publish
`https://fejelude.xyz/sofhias-songs-67`. A PR alone does not change production.

## Verify

```sh
node --test tests/*.test.* api/sofra/*.test.js
node verification/birthday-server.cjs
# Open http://127.0.0.1:8766/sofhias-songs-67
```

Browser automation uses the existing repo’s Playwright convention:

```sh
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install --with-deps chromium firefox webkit
node verification/album-smoke.cjs
node verification/birthday-smoke.cjs
```

See **`verification/album/TESTING.md`** for checks actually performed and explicit
limits. CI uploads native browser screenshots as an Actions artifact. Real
phones and physical Safari/Edge checks remain distinct from engine emulation.

All new cover/thumbnail art is original pixel geometry. No reference image,
brand, game asset, or third-party melody is included in the album artwork or
sample song. The existing birthday fonts/renderers keep their existing licenses.
