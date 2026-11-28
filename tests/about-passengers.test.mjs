import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountAboutPassengers} from '../js/about-passengers.mjs';

test('passenger atlas is confined to the motto row and uses matching pixel cells', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const atlas = readFileSync(new URL('../assets/about/tokyo-passengers.png', import.meta.url));
  assert.match(html, /class="about-motto-row"[\s\S]*?data-about-passengers aria-hidden="true"[\s\S]*?class="about-particle-portrait"/);
  assert.equal(atlas.readUInt32BE(16), 40 * 9);
  assert.equal(atlas.readUInt32BE(20), 48 * 3);
  assert.ok(atlas.length < 24_000);
});

test('animation suspends offscreen and resets to the static pose for reduced motion', async () => {
  const doc = new EventTarget();
  const win = new EventTarget();
  const root = new EventTarget();
  const motion = new EventTarget();
  root.ownerDocument = doc;
  root.style = {};
  root.dataset = {};
  root.setAttribute = name => { root[name] = true; };
  root.removeAttribute = name => { delete root[name]; };
  motion.matches = false;
  const observers = [];
  const timers = new Map();
  let next = 0;
  Object.assign(win, {
    AbortController,
    matchMedia: () => motion,
    performance: {now: () => 0},
    setTimeout: callback => { timers.set(++next, callback); return next; },
    clearTimeout: id => timers.delete(id),
    Image: class { decode() { return Promise.resolve(); } },
    IntersectionObserver: class {
      constructor(notify) { observers.push(notify); }
      observe() {}
      disconnect() {}
    },
  });
  const dispose = mountAboutPassengers(root, win);
  observers[0]([{isIntersecting: true}]);
  await Promise.resolve();
  assert.equal(timers.size, 0);
  observers[1]([{isIntersecting: true}]);
  assert.equal(root.dataset.passengerCel, '8');
  assert.equal(timers.size, 1);
  observers[1]([{isIntersecting: false}]);
  assert.equal(timers.size, 0);
  observers[1]([{isIntersecting: true}]);
  assert.equal(timers.size, 1);
  motion.matches = true;
  motion.dispatchEvent(new Event('change'));
  assert.equal(root.dataset.passengerCel, '0');
  assert.equal(timers.size, 0);
  dispose();
  assert.equal(root['data-passenger-ready'], undefined);
});
