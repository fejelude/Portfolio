# Violet Terminal — homepage review notes

## Scope and concept
An original violet dusk rooftop with a sculpted procedural concept car, skyline, destination exhibits, roadmap sculpture and moving shuttle. Existing HTML content, links, public identity, mobile and desktop navigation, activity logger, Discord copy and surprise controller remain. Gallery and Sofra continue to their existing routes. The renderer and stylesheet load only on the homepage. No protected routes, backend code, shared CSS, shared JavaScript, database, OAuth configuration or private assets changed.

## Architecture
- `index.html`: semantic links and text stay accessible without WebGL. The static SVG provides instant visual continuity; an opt-in button is progressively enhanced.
- `css/home-world.css`: all selectors use the homepage body scope. Typography and editorial section treatments replace the previous animated hero buttons and glass-card repetition.
- `js/home-world.mjs`: lazy module load, device/reduced-motion preference checks, semantic destination controls, pointer/keyboard orbit, projected labels, motion/light control, offscreen and visibility gating, context-loss recovery and lifecycle cleanup.
- `js/home-world-renderer.mjs`: hand-authored WebGL1 shader pipeline, deterministic lofted car geometry, batched static solids, separate lamp and shuttle geometry, dusk sky and layered procedural cloud noise, fog, simulated metal environment highlights and floor seams/soft shadow. Camera uses time-correct exponential easing. Three static vertex buffers plus one full-screen triangle: four draw calls per frame. No dependency or npm build migration.
- `assets/home-world/terminal.svg`: original vector fallback, no third-party model, textures or stock photography.

## Reference research (technical patterns, not copied code)
- [Samsy Ninja](https://samsy.ninja/) and [public repositories](https://github.com/samsy): [screen-space projection shader](https://github.com/samsy/glsl-screenspace/blob/master/index.glsl) and [manifest loader](https://github.com/samsy/fetch-loader/blob/master/index.js); informed projected landmarks and deliberate progressive loading. Full live browser interaction not verified.
- [Bruno Simon](https://bruno-simon.com/) / [folio-2025](https://github.com/brunosimon/folio-2025): Game/View.js, Rendering.js and Quality.js use separate camera/render/quality systems, adaptive rendering and compositing, and an event-driven simulation architecture. MIT software license inspected.
- [Neon City Portfolio](https://github.com/rayancheca/neon-city-portfolio): Buildings.tsx and Camera.tsx show destinations as geometry, and delta-based camera follow interpolation; no third-party code or assets used; reuse permission not assumed.
- [Cosmic Portfolio](https://github.com/alwihar/cosmic-portfolio): useDevicePerformance.ts and teleport.ts illustrate capability tiers and explicit destination transitions; reuse permission not assumed.
- [Cyberpunk](https://github.com/erfanezk/Cyberpunk): scene.tsx, neon-towers.tsx illustrate tier-gated environmental lighting and animated modular architecture; MIT software license inspected.
- [Interactive 3D Portfolio](https://github.com/navairgap/3d-portfolio): PortfolioExperience.tsx and pbr.ts demonstrate procedural surface maps, compressed asset loading, controlled camera and postprocessing; MIT software license inspected.
- No third-party code, car design, model, texture or audio has been reused. Existing site fonts/icons are unchanged; the new artwork is original. Do not infer asset licensing from a repository software license.

## Performance and quality
The main scene is ~26,606 static triangles, 96 lamp triangles and 72 shuttle triangles (3.21 MB packed vertex data total); the lower tier's static geometry is ~1.29 MB. Four GPU draw calls, no external 3D asset requests, shadows approximated analytically, adaptive resolution with bounds; desktop dynamically lowers pixel ratio if sustained frame times exceed budget. Mobile, data saver and low-capability users opt in; reduced-motion users also opt in with motion paused. Hidden tabs/offscreen stages stop the RAF. Buffers/programs and listeners are disposed on final pagehide and context failure. No physics, true ray-traced reflections, photorealistic vehicle assets, global illumination, or WebGPU are included in this initial implementation. No measured 60 FPS or GPU memory claim is made.

## Verification
In the connector JavaScript runtime, the exact branch renderer was evaluated: all three vertex batches are finite and deterministic, low-tier geometry is smaller, and 180 frames of 60 Hz interpolation reduced distance to the target to ~0.00000187. Controller JavaScript parsed. Browser workflow and Node tests are provided, not yet independently confirmed passing when this document was written. No access to a local Git checkout or direct browser internet to render the actual repository on this machine. Existing surprise CI is triggered by index changes; none of its source or test assets were altered.

Run from a checkout:
  
    node --check js/home-world.mjs
    node --check js/home-world-renderer.mjs
    node --test tests/home-world.test.mjs
    node --test tests/surprise.test.mjs
    npm install --no-save --package-lock=false playwright@1.62.1
    npx playwright install --with-deps chromium firefox webkit
    node verification/home-world-smoke.cjs

CI uploads screenshots to the home-world-browser-previews artifact. Before/after production screenshots were not captured. Mobile tap/orbit, keyboard landmark navigation, WebGL failover, reduced motion, no-JS content, viewport overflow and context loss need real-browser review. Actual iOS, Android, GPU profiling, performance distribution, authenticated Sofra backend and birthday flow live regression testing remain merge gates. The pull request is a draft until these are verified.
