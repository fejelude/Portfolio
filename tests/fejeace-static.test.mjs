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
