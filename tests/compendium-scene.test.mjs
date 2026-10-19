import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrapbookScene, flightPosition } from '../js/compendium-scene.mjs';

function platform(t, reduced = false) {
  const frames = new Map(), classes = new Set(), events = new EventTarget();
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const fine = Object.assign(new EventTarget(), { matches: true });
  const document = Object.assign(new EventTarget(), { hidden: false, documentElement: new EventTarget(), body: { classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); } } } });
  const toggle = Object.assign(new EventTarget(), { hidden: true, attributes: new Map(), setAttribute(k, v) { this.attributes.set(k, v); } });
  const dialog = Object.assign(new EventTarget(), { open: false });
  let mutation, serial = 0;
  const globals = { document, window: {}, innerWidth: 390, innerHeight: 844, devicePixelRatio: 3,
    matchMedia: query => query.includes('reduced') ? motion : fine,
    addEventListener: events.addEventListener.bind(events),
    requestAnimationFrame: callback => { const id = ++serial; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} },
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  const ctx = new Proxy({}, { get(target, key) { return target[key] ?? (() => {}); } });
  const canvas = { getContext: () => ctx };
  createScrapbookScene(canvas, toggle, dialog);
  return { frames, motion, document, toggle, dialog, events, canvas, classes, mutation: () => mutation() };
}

test('scene respects reduced motion immediately and when the preference changes', t => {
  const p = platform(t, true);
  assert.equal(p.frames.size, 0); assert.equal(p.toggle.disabled, true);
  assert.equal(p.toggle.attributes.get('aria-pressed'), 'true');
  assert.ok(p.canvas.width <= 390 * 1.75 + 1, 'canvas resolution is capped on high-density phones');
  p.motion.matches = false; p.motion.dispatchEvent(new Event('change'));
  assert.equal(p.frames.size, 1); assert.equal(p.toggle.disabled, false);
  p.toggle.dispatchEvent(new Event('click'));
  assert.equal(p.frames.size, 0); assert.ok(p.classes.has('compendium--still'));
  p.motion.matches = true; p.motion.dispatchEvent(new Event('change'));
  p.motion.matches = false; p.motion.dispatchEvent(new Event('change'));
  assert.equal(p.frames.size, 0, 'manual pause survives preference changes');
});

test('hidden tabs, modal images and page navigation cancel the loop without duplicating it', t => {
  const p = platform(t);
  assert.equal(p.frames.size, 1);
  p.document.hidden = true; p.document.dispatchEvent(new Event('visibilitychange')); assert.equal(p.frames.size, 0);
  p.document.hidden = false; p.document.dispatchEvent(new Event('visibilitychange')); assert.equal(p.frames.size, 1);
  p.dialog.open = true; p.mutation(); assert.equal(p.frames.size, 0);
  p.dialog.open = false; p.mutation(); p.mutation(); assert.equal(p.frames.size, 1);
  p.events.dispatchEvent(new Event('pagehide')); assert.equal(p.frames.size, 0);
  p.events.dispatchEvent(new Event('pageshow')); assert.equal(p.frames.size, 1);
  p.toggle.dispatchEvent(new Event('click')); p.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(p.frames.size, 0, 'returning to the tab cannot override pause');
});

test('flight paths remain within the scene at mobile and desktop sizes', () => {
  for (const [width, height] of [[320, 740], [1440, 1000]]) {
    for (let time = 0; time < 3600; time += 7) for (let phase = 0; phase < 12; phase += 2.39) {
      const p = flightPosition(time, phase, width, height);
      assert.ok(p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height);
    }
  }
});
