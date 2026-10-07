# Sofhia’s little garden

Open `/sofhia-franchesca-16`. This is an independent static HTML page using the
repository’s existing Vercel `cleanUrls` setting. No framework, build step,
production dependency, navigation link, analytics script, or environment variable
is added. Existing pages and route rules are preserved.

## Change the greeting

Edit `js/birthday-config.mjs`:

- `name`, `greeting`, `message`, `wish`, `date`, and `signature` control the copy.
- Update the equivalent static fallback, document metadata, and accessible
  bouquet description in `sofhia-franchesca-16.html` when changing the recipient.
- `stages` contains chapter end times, in seconds: `[10, 32, 47, 57, 60]`.
  Individual flower, paper, and ribbon choreography is proportionally remapped
  within those chapters. Keep values increasing, with the last equal to
  `duration`. The commissioned version must remain exactly 60 seconds.
- `phases` provides the five short captions during the sequence.

## Change the song

Replace `assets/birthday/song.mp3`, or change `audio` in the config **and** the
HTML `<source>` so preloading uses the same file. Keep `type="audio/mpeg"` and
`preload="auto"`. Check the actual duration with `ffprobe` and decode it with
`ffmpeg` before shipping. A longer or substantially shorter replacement needs
an explicit timing decision; don’t silently crop, stretch, or fade it.

The supplied MP3 is preserved byte-for-byte. FFprobe reports **59.454694s**;
Chromium decodes **59.418413s** after encoder padding. The audio’s `currentTime`
drives the story until `ended`. A short silent, resumable coda covers the exact
remaining fraction to 60s. The message appears on the first animation frame at
or after 60s. Pauses, buffering, and hidden time do not advance the story.
The final scene stays indefinitely; Replay starts another full minute.

## Artwork and fonts

`js/birthday-art.mjs` draws the original grove, 18 independently opening flowers,
foliage, paper folds, tying ribbon, and pooled particles. No reference image,
game artwork, character, game logo, or reference-video frame is shipped.
`bouquet.webp` is the original artwork’s completed frame for the no-JS or
unsupported-canvas fallback. Regenerate it after editing the art.

The small, self-hosted Pixelify Sans and Noto Emoji font subsets are covered by
the adjacent OFL license files. No runtime third-party fonts or images are needed.

## Verify locally

```sh
node --test tests/*.test.* api/sofra/*.test.js
npm install --no-save --package-lock=false playwright@1.56.1
npx playwright install --with-deps chromium firefox webkit
node verification/birthday-smoke.cjs
```

The browser suite starts its own range-capable static server, runs simulated
interruption/replay cases on three engines, and plays a complete real minute in
Chromium. Results go to `verification/birthday-results/`; the new path-scoped CI
workflow retains them as an artifact. These verification dependencies are not
part of the deployed site. A Linux WebKit media run may need a virtual audio
output and GStreamer codecs; CI includes a virtual sink.

See `verification/birthday/TESTING.md` for actual results and remaining device
checks. The repository currently has no sitemap or sitemap generator, and no
sitewide link includes this route. If a sitemap is introduced later, explicitly
exclude this filename. Both clean and `.html` URLs have page-specific noindex
metadata/headers. This is an unlisted surprise, not access control.
