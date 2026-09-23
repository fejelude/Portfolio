# Surprise audio and choreography

`reveal-sfx.wav` is the supplied 10.633-second sound effect, preserved unchanged.
`track-1.mp3` through `track-4.mp3` are the existing music, also unchanged.
The browser now plays `celebration-1.mp3` through `celebration-4.mp3`.

Each celebration is a single pre-mixed stream so playback permission, buffering,
mute, and cancellation apply to both music and sound together. The effect starts
at the track's `reveal` timestamp (sample-aligned at 44.1 kHz); the image appears
on the first animation frame at that same media timestamp. Music ducks to 22%
at the reveal. The full effect plays, followed by a 0.7-second fade. Finales are
about 21–25 seconds. Original music and effect are never cut short.

Mix recipe (FFmpeg, replace REVEAL, DELAY_SAMPLES and END for each manifest entry):

```sh
ffmpeg -i track-1.mp3 -i reveal-sfx.wav -filter_complex \
"[0:a]volume='if(lt(t,REVEAL),0.85,0.22)':eval=frame,apad[m];[1:a]volume=0.9,adelay=DELAY_SAMPLES_S:all=1[s];[m][s]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95:level=false:latency=true,atrim=duration=END,afade=t=out:st=FADE_START:d=0.7[a]" \
-map '[a]' -c:a libmp3lame -b:a 128k celebration-1.mp3
```

DELAY_SAMPLES = round(REVEAL × 44100); END = REVEAL + 10.633375 + 0.7;
FADE_START = END - 0.7. Replace `DELAY_SAMPLES_S` with the integer followed by `S` (e.g. `597555S`).

`impactCues` are seconds relative to reveal, chosen from the effect's loud
transients, at least 0.55 seconds apart. The controller uses the media clock,
coalesces skipped cues, and draws fireworks on one capped canvas. Flying images
reuse the existing WebP collection with limits of 20 desktop / 10 mobile;
slow frames reduce the limits. Replays alternate four motion families. Reduced
motion preserves the synchronized reveal with no flying images or fireworks.

Keep `manifest.json` and `js/surprise-assets.js` in sync when changing cues.
Validate with `node --test tests/surprise.test.mjs` and the existing
`node verification/surprise-smoke.cjs` browser suite.
