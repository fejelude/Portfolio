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

test("the games surface contains FejeAce and no retired space experience entry points", async () => {
  const files = await Promise.all(["Arcade.html", "index.html", "Gallery.html", "main.js"].map((name) => readFile(path.join(root, name), "utf8")));
  const combined = files.join("\n");
  assert.match(combined, /Play My Games/);
  assert.match(combined, /FejeAce/);
  assert.doesNotMatch(combined, /Orbital Earth|Solar System Explorer|sim=orbital|sim=solar|ISS tracking/);
});

test("production Arcade page loads only the new modular FejeAce entry point", async () => {
  const html = await readFile(path.join(root, "Arcade.html"), "utf8");
  assert.match(html, /js\/fejeace\/main\.mjs/);
  assert.doesNotMatch(html, /three(?:\.module)?\.js|js\/arcade|arcade-games\.js/);
});
