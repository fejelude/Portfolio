import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scrollProgress, growth, initBlossom } from '../js/birthday-blossom.mjs';

test('scroll growth is bounded, monotonic and completes at the end of the section', () => {
  let previous = 0;
  for (let top = 1000; top >= 0; top -= 5) {
    const p = scrollProgress(top, 620, 844);
    assert.ok(p >= previous && p >= 0 && p <= 1); previous = p;
  }
  assert.equal(scrollProgress(844, 620, 844), 0);
  assert.equal(scrollProgress(224, 620, 844), 1);
  assert.equal(growth(.2, .5, .9), 0);
  assert.equal(growth(1, .5, .9), 1);
  assert.ok(Math.abs(growth(.7, .5, .9) - .5) < 1e-12);
});

function fixture() {
  const classSet = new Set();
  const classList = { contains: n => classSet.has(n), remove: n => classSet.delete(n), toggle(n, on) { on ? classSet.add(n) : classSet.delete(n); } };
  const paths = [{ dataset: { start: '0', end: '.32' }, style: {} }, { dataset: { start: '.67', end: '.94' }, style: {} }];
  const budShape = { style: {} }, petals = { style: {} };
  const flowers = [{ dataset: { start: '.3', end: '.54' }, style: {}, querySelector: selector => selector === 'use' ? petals : budShape }];
  const dedication = [{ dataset: { start: '.63', end: '.74' }, style: {} }, { dataset: { start: '.89', end: '1' }, style: {} }];
  const rect = { top: 900, bottom: 1520, height: 620 };
  const tree = { classList, dataset: {}, getBoundingClientRect: () => rect, querySelectorAll: selector => selector.includes('__grow') ? paths : selector.includes('__reveal') ? dedication : flowers };
  let home = true, mutation;
  const doc = Object.assign(new EventTarget(), { hidden: false, body: { classList: { contains: () => home } }, getElementById: () => tree });
  const motion = Object.assign(new EventTarget(), { matches: false });
  const frames = new Map(); let serial = 0;
  const win = Object.assign(new EventTarget(), { innerHeight: 844, matchMedia: () => motion,
    requestAnimationFrame(fn) { frames.set(++serial, fn); return serial; }, cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class { constructor(fn) { mutation = fn; } observe() {} disconnect() {} },
  });
  const flush = () => { const queued = [...frames.values()]; frames.clear(); queued.forEach(fn => fn()); };
  initBlossom(doc, win);
  return { paths, flowers, dedication, budShape, petals, tree, rect, doc, win, motion, frames, flush, setHome(value) { home = value; mutation(); } };
}

test('branches bloom with scroll; reduced motion exposes the full static tree', () => {
  const p = fixture();
  assert.equal(p.paths[1].style.opacity, '0'); assert.equal(p.flowers[0].style.opacity, '0');
  p.rect.top = 200; p.rect.bottom = 820;
  for (let i = 0; i < 20; i++) p.win.dispatchEvent(new Event('scroll'));
  assert.equal(p.frames.size, 1, 'scroll work is coalesced into one frame'); p.flush();
  assert.ok(p.paths.every(path => path.style.strokeDashoffset === '0'));
  assert.equal(p.flowers[0].style.opacity, '1'); assert.equal(p.petals.style.scale, '1');
  assert.equal(p.dedication[1].style.opacity, '1');
  p.rect.top = 900; p.win.dispatchEvent(new Event('scroll')); p.flush();
  assert.equal(p.tree.dataset.progress, '1.000', 'completed dedication remains visible on reverse scrolling');
  assert.equal(p.frames.size, 0, 'there is no perpetual JavaScript animation loop');
  p.rect.top = 900; p.motion.matches = true; p.motion.dispatchEvent(new Event('change')); p.flush();
  assert.equal(p.tree.dataset.progress, '1.000'); assert.equal(p.tree.classList.contains('is-growing'), false);
});

test('leaving home and hiding/navigating away suspend decorative motion', () => {
  const p = fixture(); p.rect.top = 200; p.rect.bottom = 820;
  p.win.dispatchEvent(new Event('scroll')); p.flush(); assert.equal(p.tree.classList.contains('is-visible'), true);
  p.setHome(false); p.flush(); assert.equal(p.tree.classList.contains('is-visible'), false);
  p.setHome(true); p.flush(); p.doc.hidden = true; p.doc.dispatchEvent(new Event('visibilitychange')); p.flush();
  assert.equal(p.tree.classList.contains('is-visible'), false);
  const hide = new Event('pagehide'); hide.persisted = true; p.win.dispatchEvent(hide);
  p.win.dispatchEvent(new Event('scroll')); assert.equal(p.frames.size, 0);
  p.doc.hidden = false; p.win.dispatchEvent(new Event('pageshow')); p.flush();
  assert.equal(p.tree.classList.contains('is-visible'), true);
});

test('buds precede flowers and the age finishes after the name', () => {
  const p = fixture();
  // Choose the section top for an exact progress value under the existing mapping.
  const at = value => { p.rect.top = 844 - 60 - value * (620 - 60); p.win.dispatchEvent(new Event('scroll')); p.flush(); };
  at(.36); assert.ok(Number(p.flowers[0].style.opacity) > 0); assert.equal(p.petals.style.opacity, '0');
  at(.6); assert.equal(p.petals.style.opacity, '1'); assert.equal(p.dedication[0].style.opacity, '0');
  at(.86); assert.equal(p.dedication[0].style.opacity, '1'); assert.equal(p.dedication[1].style.opacity, '0');
  at(.94); assert.ok(Number(p.dedication[1].style.opacity) > 0 && Number(p.dedication[1].style.opacity) < 1);
  at(1); assert.equal(p.dedication[1].style.opacity, '1');
});

test('dedication preserves exact spelling and punctuation below the navigation', () => {
  const html = readFileSync(new URL('../sofhia-franchesca-16.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('birthday__compendium-entry') < html.indexOf('id="birthday-blossom"'));
  assert.doesNotMatch(html, /id="signature"|birthday-blossom__letter/);
  assert.match(html, /aria-label="Sofhia Franchesca Roque, 16"/);
  assert.equal((html.match(/class="birthday-blossom__reveal"/g) || []).length, 3);
  assert.match(html, /birthday-blossom__age birthday-blossom__reveal/);
});
