# Daedalus cinematic preview review

This branch intentionally changes only the Tourbillon presentation, controller, renderer disposal and affected verification scripts. Mechanical geometry, movement mathematics, materials, watch artwork, astrolabe drawing and existing scroll effects remain unchanged.

## Cinematic media
The owner uploaded the source clip to the feature branch. Its Git blob is retained unchanged and renamed to `assets/tourbillon/daedalus-preview.mp4`. Playback is muted by the preview implementation. The uploaded file's audio-stream metadata has not been independently verified. Browser verification and visual review remain required before merge.

## Verification
The existing Tourbillon browser smoke now explicitly enters 3D, checks hidden preview controls, captures desktop/mobile previews, validates repeated exits and fresh canvases, and logs preview-only WebGL context requests and renderer module resource counts. The media check exercises autoplay, loop, viewport suspension, return and reduced motion when the MP4 is present. Existing tests were adjusted to use accessibility preferences instead of manual movement controls. Real-device iOS Safari, native hardware GPU memory and visual review of browser artifacts remain unverified. No numerical performance improvement is asserted until browser results are available.
