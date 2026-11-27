// Start the site on a local HTTP server, then run:
// node verification/living-desktop-smoke.cjs http://localhost:4174
const assert = require('node:assert/strict');
const { chromium, firefox, webkit, devices } = require('playwright');
const home = process.argv[2] || 'http://localhost:4174';
const engineFilter = process.env.QA_ENGINES?.split(',') || ['chromium', 'firefox', 'webkit'];
const chapterTargets = [
  ['.feje-title-row', 'terminal'],
  ['.world-viewport', 'garage'],
  ['.ix-cta', 'constellation'],
  ['.ft-top', 'engraving'],
  ['.ft-stage', 'watch'],
  ['.sofra-feature-mascot', 'petals'],
  ['.profile-header', 'motto'],
  ['.rc-garage .rc-image-frame', 'preview'],
  ['.rc-build .rc-image-frame', 'preview'],
  ['.svc-row--model', 'workbench'],
  ['#learning .bento-card', 'curriculum'],
  ['#goals .goal-item', 'milestone'],
  ['#copy-discord', 'contact'],
];

async function newPage(browser, profile) {
  const context = await browser.newContext(profile);
  const requests = [];
  const errors = [];
  await context.route('**/*', route => route.request().url().startsWith(home) ? route.continue() : route.abort());
  const page = await context.newPage();
  page.on('request', req => {
    const path = new URL(req.url()).pathname;
    if (path.includes('living-desktop')) requests.push(path);
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(home);
  return { page, context, requests, errors };
}

async function react(page, selector, effect) {
  const target = page.locator(selector).first();
  await target.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const bounds = await target.boundingBox();
  assert.ok(bounds?.width && bounds?.height, selector + ' is visible');
  const x = bounds.x + bounds.width * .56;
  const y = bounds.y + Math.min(bounds.height * .48, page.viewportSize().height - bounds.y - 32);
  await page.mouse.move(x - 9, y);
  await page.mouse.move(x, y);
  const decoration = target.locator('.living-decoration[data-living-effect="' + effect + '"]');
  await decoration.waitFor({ state: 'attached' });
  await page.waitForFunction(el => el.hasAttribute('data-lit'), await decoration.elementHandle());
  assert.equal(await decoration.getAttribute('aria-hidden'), 'true');
  assert.equal(await decoration.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
  assert.equal(await page.locator('.living-decoration[data-lit]').count(), 1);
  return decoration;
}

async function desktop(browser, profile, engine, comprehensive = false) {
  const { page, context, errors } = await newPage(browser, profile);
  try {
    await page.locator('body[data-living-desktop]').waitFor({ state: 'attached' });
    const targets = comprehensive ? chapterTargets : chapterTargets.filter((_, index) => index % 3 === 0);
    for (const [selector, effect] of targets) await react(page, selector, effect);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
    if (!comprehensive) return;

    await page.locator('#collection-next').click();
    await page.waitForFunction(() => document.querySelector('#collection-name').textContent === 'Bugatti Tourbillon');
    await page.locator('.ix-details summary').click();
    assert.equal(await page.locator('.ix-details').getAttribute('open'), '');
    await page.locator('#sofra-feature-mascot').click();
    assert.equal(await page.locator('#sofra-feature-mascot').getAttribute('aria-pressed'), 'true');
    await page.locator('#sofra-feature-mascot').click();
    assert.equal(await page.locator('#sofra-feature-mascot').getAttribute('aria-pressed'), 'false');
    await page.waitForFunction(() => [...document.querySelectorAll('.sofra-sakura-sky canvas')].some(
      canvas => !canvas.hidden && canvas.style.transform.startsWith('translate(')
    ));
    await page.waitForFunction(() => /^\d\d:\d\d:\d\d$/.test(document.querySelector('#ft-time').textContent.trim()));
    for (const selector of ['.desktop-nav-item[aria-expanded]', '#feje-pixel-companion', '#copy-discord']) {
      const control = page.locator(selector);
      await control.press('Tab');
      assert.ok(await page.evaluate(() => document.activeElement.matches(':focus-visible')));
    }

    await react(page, '.feje-title-row', 'terminal');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.locator('.living-decoration[data-lit]').count(), 0);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await react(page, '.feje-title-row', 'terminal');

    if (engine === 'chromium') {
      // Real CDP touch input on the same fine-pointer page.
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 20, y: 150 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal(await page.locator('.living-decoration[data-lit]').count(), 0);
      await react(page, '.feje-title-row', 'terminal');
    }

    await page.setViewportSize({ width: 880, height: 720 });
    await page.locator('body[data-living-desktop]').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.living-decoration').count(), 0);
    await page.setViewportSize(profile.viewport);
    await react(page, '.feje-title-row', 'terminal');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('body[data-living-desktop]').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.living-decoration').count(), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await page.locator('.ix-cta').click();
    await page.waitForURL('**/interactives');
    await page.locator('body[data-living-desktop]').waitFor({ state: 'attached' });
    await react(page, '.iw-card .iw-art-stage', 'world');
    assert.equal(await page.locator('a[data-iw-card]').count(), 6);
    await page.locator('#iw-motion').click();
    assert.equal(await page.locator('body').getAttribute('data-motion-paused'), '');
    assert.equal(await page.locator('.living-decoration:visible').count(), 0);
    await page.locator('a[data-iw-card="room"]').click();
    await page.waitForURL('**/interactives/room');
    assert.equal(await page.locator('body[data-living-desktop]').count(), 0);
  } finally {
    await context.close();
    assert.deepEqual(errors, []);
  }
}

async function inactive(browser, profile) {
  const { page, context, requests, errors } = await newPage(browser, profile);
  try {
    for (const selector of ['#home', '#tourbillon', '#about', '#services', '#contact']) {
      await page.locator(selector).evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.mouse.move(145, 165);
    }
    assert.equal(await page.locator('[data-living-desktop], .living-decoration').count(), 0);
    assert.deepEqual(requests, ['/js/living-desktop-entry.mjs']);
    if (!await page.evaluate(() => matchMedia('(any-pointer: fine)').matches)) {
      const positioned = await page.locator('.sofra-sakura-sky canvas, .daedalus-scroll-sky canvas').evaluateAll(
        canvases => canvases.some(canvas => canvas.style.transform)
      );
      assert.equal(positioned, false);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('#collection-next').click();
    assert.equal(await page.locator('#collection-name').textContent(), 'Bugatti Tourbillon');
    await page.locator('.ix-cta').click();
    await page.waitForURL('**/interactives');
    assert.equal(await page.locator('[data-living-desktop], .living-decoration').count(), 0);
    assert.deepEqual(requests, ['/js/living-desktop-entry.mjs', '/js/living-desktop-entry.mjs']);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

(async () => {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    if (!engineFilter.includes(name)) continue;
    const browser = await engine.launch(name === 'chromium' ? {
      args: ['--disable-webgl'],
      executablePath: process.env.QA_CHROMIUM || undefined,
    } : {});
    try {
      await desktop(browser, { viewport: { width: 1440, height: 900 } }, name, true);
      if (name === 'chromium') {
        for (const [width, height, scale] of [[1024, 768, 1], [1920, 1080, 1], [2560, 1440, 2], [3440, 1440, 1]]) {
          await desktop(browser, { viewport: { width, height }, deviceScaleFactor: scale }, name);
        }
        // 1920 × 1080 at the CSS viewport and DPR of 150% and 200% zoom.
        await desktop(browser, { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 }, name);
        await desktop(browser, { viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 }, name);
        await inactive(browser, devices['Pixel 7']);
        await inactive(browser, { ...devices['iPad Pro 11'], viewport: { width: 1194, height: 834 } });
      }
      if (name === 'webkit') await inactive(browser, devices['iPhone 13']);
      await inactive(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      console.log(name, browser.version(), 'passed');
    } finally {
      await browser.close();
    }
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
