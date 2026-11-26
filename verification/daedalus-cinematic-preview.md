# Daedalus cinematic preview review

This branch intentionally changes only the Tourbillon presentation, controller, renderer disposal and affected verification scripts. Mechanical geometry, movement mathematics, materials, watch artwork, astrolabe drawing and existing scroll effects remain unchanged.

## Merge blocker
The supplied eight-second MP4 is not present in this branch. The local attachment is 5,050,199 bytes, H.264 910×512 at 30 fps with AAC. Repository access is through a text-only connector; direct Git transport from the local attachment workspace was unavailable. Add the exact original clip at `assets/tourbillon/daedalus-preview.mp4` (or stream-copy the video and remove audio without re-encoding). The existing observatory poster is used when media is absent, blocked or reduced motion is enabled. The dedicated CI media check must pass before merge.

## Verification
The existing Tourbillon browser smoke now explicitly enters 3D, checks hidden preview controls, captures desktop/mobile previews, validates repeated exits and fresh canvases, and logs preview-only WebGL context requests and renderer module resource counts. The media check exercises autoplay, loop, viewport suspension, return and reduced motion when the MP4 is present. Existing tests were adjusted to use accessibility preferences instead of manual movement controls. Real-device iOS Safari, native hardware GPU memory and visual review of browser artifacts remain unverified. No numerical performance improvement is asserted until browser results are available.
