import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { AssetConfig } from "../js/fejeace/config/AssetConfig.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("every configured FejeAce image and sound exists and is non-empty", async () => {
  const files = [
    AssetConfig.logo,
    AssetConfig.bigJoker,
    ...Object.values(AssetConfig.symbols),
    ...Object.values(AssetConfig.sounds)
  ];
  assert.equal(new Set(files).size, files.length);
  await Promise.all(files.map(async (relativePath) => {
    const absolutePath = path.join(root, relativePath);
    await access(absolutePath);
    assert.ok((await stat(absolutePath)).size > 1_000, `${relativePath} should not be empty`);
  }));
});

test("the games surface contains the Game Arcade and no retired space experience entry points", async () => {
  const files = await Promise.all(["Arcade.html", "index.html", "Gallery.html", "main.js"].map((name) => readFile(path.join(root, name), "utf8")));
  const combined = files.join("\n");
  assert.match(combined, /Game Arcade/);
  assert.match(combined, /Max win 10,000×/i);
  assert.match(combined, /FejeAce/);
  assert.doesNotMatch(combined, /Orbital Earth|Solar System Explorer|sim=orbital|sim=solar|ISS tracking/);
});

test("production Arcade page loads only the new modular FejeAce entry point", async () => {
  const html = await readFile(path.join(root, "Arcade.html"), "utf8");
  assert.match(html, /js\/fejeace\/main\.mjs/);
  assert.doesNotMatch(html, /three(?:\.module)?\.js|js\/arcade|arcade-games\.js/);
});

test("Bonus Buy UI publishes its price, quantity, and locked-bet promise", async () => {
  const [html, main] = await Promise.all([
    readFile(path.join(root, "Arcade.html"), "utf8"),
    readFile(path.join(root, "js/fejeace/main.mjs"), "utf8")
  ]);
  assert.match(html, /data-buy-bonus/);
  assert.match(html, /40\.5× bet/);
  assert.match(html, /min="1" max="99"/);
  assert.match(main, /mode === "free" \? this\.freeSpins\.bet : this\.bet/);
});

test("the round-state label cannot select and overwrite the document body", async () => {
  const html = await readFile(path.join(root, "Arcade.html"), "utf8");
  const hud = await readFile(path.join(root, "js/fejeace/ui/HUDController.mjs"), "utf8");

  assert.match(html, /<body[^>]+data-game-state="IDLE"/);
  assert.match(html, /<span data-game-state-label>READY<\/span>/);
  assert.match(hud, /querySelector\("\[data-game-state-label\]"\)/);
  assert.doesNotMatch(hud, /querySelector\("\[data-game-state\]"\)/);
});

test("the arcade includes iOS Safari viewport, dialog, storage, and CSS compatibility safeguards", async () => {
  const [css, audio, modal, responsive, rng] = await Promise.all([
    "css/arcade.css",
    "js/fejeace/audio/SoundController.mjs",
    "js/fejeace/ui/ModalController.mjs",
    "js/fejeace/ui/ResponsiveController.mjs",
    "js/fejeace/engine/RNG.mjs"
  ].map((name) => readFile(path.join(root, name), "utf8")));

  assert.match(css, /-webkit-mask-composite:\s*xor/);
  assert.match(css, /dialog-fallback-open/);
  assert.match(audio, /getStorage\(\)/);
  assert.match(audio, /sound\.play\(\)/);
  assert.match(modal, /typeof dialog\.showModal/);
  assert.match(responsive, /orientationchange/);
  assert.doesNotMatch(rng, /\.at\(/);
});

test("settings expose functional RNG levels and tiered MAX WIN presentation", async () => {
  const [html, main, animation, config] = await Promise.all([
    "Arcade.html", "js/fejeace/main.mjs", "js/fejeace/ui/AnimationController.mjs",
    "js/fejeace/config/RNGLevelConfig.mjs"
  ].map((name) => readFile(path.join(root, name), "utf8")));
  assert.match(html, /data-setting-rng/);
  assert.match(main, /rngLevel: scenario \? 0 : this\.rngLevel/);
  assert.match(config, /FORCE MAX WIN/);
  assert.match(animation, /MAX WIN/);
});

test("Free Spins stack round wins and present the win tier only after the feature completes", async () => {
  const main = await readFile(path.join(root, "js/fejeace/main.mjs"), "utf8");
  const sequence = main.slice(
    main.indexOf("async runFreeSpinSequence"),
    main.indexOf("async runDevelopmentScenario")
  );
  const loop = sequence.slice(sequence.indexOf("while ("), sequence.indexOf("FREE_SPIN_COMPLETE"));
  const completion = sequence.slice(sequence.indexOf("FREE_SPIN_COMPLETE"));

  assert.match(loop, /this\.freeSpins\.recordWin\(result\.totalWin\)/);
  assert.doesNotMatch(loop, /showWinPresentation/);
  assert.match(completion, /this\.freeSpins\.complete\(\)[\s\S]*showWinPresentation\(completed\.totalWin, completed\.bet\)/);
});

test("synchronous iOS media failures never interrupt gameplay audio calls", async () => {
  const originalWindow = globalThis.window;
  const originalAudio = globalThis.Audio;

  class ThrowingAudio {
    constructor() {
      this.paused = true;
      this.volume = 1;
    }
    set currentTime(_value) { throw new Error("MEDIA_NOT_READY"); }
    play() { throw new Error("PLAYBACK_NOT_ALLOWED"); }
    pause() { throw new Error("MEDIA_NOT_READY"); }
    addEventListener() {}
    cloneNode() { return new ThrowingAudio(); }
  }

  globalThis.window = { sessionStorage: null };
  globalThis.Audio = ThrowingAudio;
  try {
    const { SoundController } = await import("../js/fejeace/audio/SoundController.mjs");
    const sound = new SoundController();
    sound.preload();
    assert.doesNotThrow(() => sound.unlock());
    assert.doesNotThrow(() => sound.play("spin"));
    assert.doesNotThrow(() => sound.stop("spin"));
    assert.doesNotThrow(() => sound.stopAll());
  } finally {
    globalThis.window = originalWindow;
    globalThis.Audio = originalAudio;
  }
});
