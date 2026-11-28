// Serve index.html and clean Interactives URLs on the two local origins.
// node verification/living-mobile-smoke.cjs http://localhost:4274 http://localhost:4273
const assert = require('node:assert/strict');
const { chromium, webkit, firefox, devices } = require('playwright');
const feature = process.argv[2] || 'http://localhost:4274';
const main = process.argv[3] || 'http://localhost:4273';
const targets = [
  ['#hero-terminal', 'signal'],
  ['#feje-pixel-companion', 'signal'],
  ['#collection-next', 'garage'],
  ['.ix-details summary', 'stars'],
  ['.ft-astrolabe', 'dial'],
  ['#sofra-feature-mascot', 'petals'],
  ['[data-about-ghost]', 'hearts'],
  ['.rc-garage .rc-image-frame', 'film'],
  ['.rc-build .rc-image-frame', 'blocks'],
  ['[data-svc-wizard]', 'spell'],
  ['.svc-row--game', 'blocks'],
  ['.svc-row--model', 'dial'],
  ['.svc-row--web', 'signal'],
  ['#learning .bento-card', 'signal'],
  ['#goals .goal-achievement', 'seal'],
  ['#copy-discord', 'relay'],
  ['.footer-bottom', 'signoff'],
];
const origin = url => new URL(url).origin;

async function open(browser, profile, url) {
  const context = await browser.newContext(profile);
  const requests = [], errors = [];
  await context.route('**/*', route => origin(route.request().url()) === origin(url) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.includes('living-')) requests.push(path);
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'load' });
  return { context, page, requests, errors };
}

async function targetPoint(page, selector) {
  const target = page.locator(selector).first();
  await target.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(160);
  const box = await target.boundingBox();
  assert.ok(box?.height && box?.width, selector);
  let y = box.y + box.height * .48;
  const x = box.x + box.width * .48;
  y = Math.min(page.viewportSize().height - 30, Math.max(75, y));
  return { target, x, y };
}

async function tap(page, selector, effect) {
  const { target, x, y } = await targetPoint(page, selector);
  // Footer tap stays on the copyright line. Its real link keeps its own action.
  if (selector === '.footer-bottom') {
    const copy = await target.locator('p').boundingBox();
    await page.touchscreen.tap(copy.x + copy.width / 4, copy.y + copy.height / 2);
  } else await page.touchscreen.tap(x, y);
  const echo = page.locator('.mobile-echo:not([hidden])');
  await echo.waitFor({ state: 'visible', timeout: 1500 });
  assert.equal(await echo.getAttribute('data-mobile-effect'), effect);
  assert.equal(await echo.getAttribute('aria-hidden'), 'true');
  assert.equal(await echo.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  assert.equal(await page.locator('.mobile-echo').count(), 1);
}

async function gestures(page, context) {
  const cdp = await context.newCDPSession(page);
  const point = await targetPoint(page, '.ft-astrolabe');
  const x = Math.round(point.x), y = Math.round(point.y);
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await page.waitForTimeout(520);
  const start = await page.evaluate(() => scrollY);
  await send('touchStart', [{ x, y, id: 0 }]);
  for (const shift of [5, 19, 41, 72, 110]) {
    await send('touchMove', [{ x, y: y - shift, id: 0 }]);
  }
  await send('touchEnd', []);
  await page.waitForTimeout(180);
  assert.ok(await page.evaluate(() => scrollY) > start + 12, 'drag retains native vertical pan');
  assert.equal(await page.locator('.mobile-echo:not([hidden])').count(), 0);

  for (const kind of ['cancel', 'pinch', 'hold']) {
    const { x, y } = await targetPoint(page, '#feje-pixel-companion');
    const a = { x: Math.round(x), y: Math.round(y), id: 0 };
    const b = { x: a.x - 24, y: a.y + 9, id: 1 };
    await send('touchStart', [a]);
    if (kind === 'pinch') {
      await send('touchStart', [a, b]);
      await send('touchMove', [{ ...a, x: a.x + 12 }, { ...b, x: b.x - 12 }]);
    }
    if (kind === 'hold') await page.waitForTimeout(480);
    await send(kind === 'hold' ? 'touchEnd' : 'touchCancel', []);
    assert.equal(await page.locator('.mobile-echo:not([hidden])').count(), 0, kind);
  }
  await page.reload();
}

async function mobile(browser, profile, engine, full = true) {
  const { context, page, requests, errors } = await open(browser, profile, feature);
  try {
    await page.locator('body[data-living-mobile]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.mobile-echo').count(), 0, 'artwork allocation waits for the first qualifying touch');
    const checks = full ? targets : targets.filter((_, index) => index % 4 === 0);
    for (const [selector, effect] of checks) {
      if (selector === '#copy-discord' && engine !== 'chromium') continue;
      try {
        await tap(page, selector, effect);
      } catch (error) {
        throw new Error(engine + ' ' + selector + ' ' + error.message, { cause: error });
      }
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.equal(requests.includes('/js/living-desktop.mjs'), false);
    if (!full) return;

    assert.equal(await page.locator('#collection-name').textContent(), 'Bugatti Tourbillon');
    assert.equal(await page.locator('.ix-details').getAttribute('open'), '');
    assert.equal(await page.locator('#sofra-feature-mascot').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#feje-pixel-companion').getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => /^\d{2}:\d{2}:\d{2}$/.test(document.querySelector('#ft-time').textContent.trim()));
    await tap(page, '[data-svc-wizard]', 'spell');
    if (engine === 'chromium') {
      for (let i = 0; i < 25; i++) await page.locator('[data-svc-wizard]').tap();
      assert.equal(await page.locator('.mobile-echo > i').count(), 4);
      await page.locator('.mobile-echo').waitFor({ state: 'hidden' });
      await gestures(page, context);
    }

    const nextSize = { width: profile.viewport.height, height: profile.viewport.width };
    await page.setViewportSize(nextSize);
    await tap(page, '#hero-terminal', 'signal');
    await page.setViewportSize(profile.viewport);
    await tap(page, '[data-svc-wizard]', 'spell');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.locator('.mobile-echo:not([hidden])').count(), 0);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await tap(page, '#hero-terminal', 'signal');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('body[data-living-mobile]').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.mobile-echo').count(), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.ix-cta').tap();
    await page.waitForURL('**/interactives');
    await page.locator('body[data-living-mobile]').waitFor({ state: 'attached' });
    await tap(page, '.iw-intro-copy', 'stars');
    await page.locator('a[data-iw-card="room"]').tap();
    await page.waitForURL('**/interactives/room');
    assert.equal(await page.locator('body[data-living-mobile]').count(), 0);
  } finally {
    await context.close();
    assert.deepEqual(errors, []);
  }
}

async function inactive(browser, profile, desktop = false) {
  const { context, page, requests, errors } = await open(browser, profile, feature);
  try {
    assert.deepEqual(requests.filter(path => path.includes('living-mobile')), ['/js/living-mobile-entry.mjs']);
    assert.equal(await page.locator('body[data-living-mobile], .mobile-echo').count(), 0);
    if (desktop) {
      await page.locator('body[data-living-desktop]').waitFor({ state: 'attached' });
      await page.locator('.feje-title-row').hover();
      await page.locator('.living-decoration[data-lit]').waitFor({ state: 'attached' });
    } else {
      await page.locator('#collection-next').tap();
      assert.equal(await page.locator('#collection-name').textContent(), 'Bugatti Tourbillon');
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

async function desktopGeometry(browser) {
  const viewport = { width: 1440, height: 900 };
  const readings = [];
  for (const url of [main, feature]) {
    const { context, page } = await open(browser, { viewport, reducedMotion: 'reduce' }, url);
    try {
      readings.push(await page.evaluate(async () => {
        await document.fonts.ready;
        const rects = [...document.querySelectorAll('main section[id], .ft-card, .svc-frame, .contact-box')].map(el => {
          const r = el.getBoundingClientRect();
          return [el.id, r.x, r.y, r.width, r.height];
        });
        return { rects, touch: document.body.hasAttribute('data-mobile-touch'),
          contact: getComputedStyle(document.querySelector('#contact a.method-card')).color };
      }));
    } finally { await context.close(); }
  }
  assert.deepEqual(readings[0], readings[1]);
}

(async () => {
  const engines = process.env.QA_ENGINES?.split(',') || ['chromium', 'webkit', 'firefox'];
  for (const [name, engine] of Object.entries({ chromium, webkit, firefox })) {
    if (!engines.includes(name)) continue;
    const browser = await engine.launch(name === 'chromium' ? {
      executablePath: process.env.QA_CHROMIUM || undefined,
      args: ['--disable-webgl'],
    } : {});
    try {
      if (name === 'chromium') {
        await mobile(browser, { ...devices['Pixel 7'], deviceScaleFactor: 1 }, name);
        await mobile(browser, { ...devices['Pixel 7'], viewport: { width: 320, height: 568 } }, name, false);
        await mobile(browser, { ...devices['iPad Pro 11'], viewport: { width: 1194, height: 834 } }, name, false);
        await inactive(browser, { ...devices['Pixel 7'], reducedMotion: 'reduce' });
      }
      if (name === 'webkit') await mobile(browser, { ...devices['iPhone 13'], deviceScaleFactor: 1 }, name);
      await inactive(browser, { viewport: { width: 1440, height: 900 } }, true);
      await desktopGeometry(browser);
      console.log(name, browser.version(), 'passed');
    } finally { await browser.close(); }
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
