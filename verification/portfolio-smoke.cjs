// Install Playwright and its browsers before running this script.
const assert = require('node:assert/strict');
const { chromium, firefox, webkit } = require('playwright');
const { startServer } = require('./birthday-server.cjs');

async function smoke(browser, baseURL) {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async value => { window.copiedText = value; } }
    });
  });

  try {
    await page.goto('/');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await skip.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/#main-content');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
    const menu = page.locator('.menu-toggle');
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.equal(await menu.evaluate(node => node === document.activeElement), true);
    await menu.click();
    await page.getByRole('navigation', { name: 'Main navigation' }).getByText('Contact').click();
    await page.waitForURL('**/#contact');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Copy username' }).click();
    assert.equal(await page.evaluate(() => window.copiedText), 'itsmefeje');
    await page.getByText('Discord username copied.').waitFor();

    await page.locator('.hero-capture').click();
    await page.waitForURL('**/Gallery.html#a-premonition');
    assert.equal(await page.locator('.gallery-item').count(), 23);
    const tile = page.getByRole('link', { name: 'Subdued Ceremony', exact: true });
    await tile.focus();
    await page.keyboard.press('Enter');
    const viewer = page.getByRole('dialog');
    await viewer.getByRole('heading', { name: 'Subdued Ceremony' }).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Close');
    await page.keyboard.press('ArrowRight');
    await viewer.getByRole('heading', { name: 'Resolve and Grief' }).waitFor();
    await viewer.getByRole('button', { name: 'Previous' }).click();
    await viewer.getByRole('heading', { name: 'Subdued Ceremony' }).waitFor();
    await page.keyboard.press('Escape');
    await viewer.waitFor({ state: 'hidden' });
    assert.equal(await tile.evaluate(node => node === document.activeElement), true);

    await page.route('**/blades-of-the-yiga.jpg', route => route.abort());
    await tile.click();
    await viewer.getByRole('button', { name: 'Next' }).click();
    await viewer.getByRole('button', { name: 'Next' }).click();
    await viewer.getByRole('button', { name: 'Next' }).click();
    await viewer.getByText('Image unavailable. You can still browse the collection.').waitFor();
    await viewer.getByRole('button', { name: 'Next' }).click();
    await viewer.getByRole('heading', { name: 'A Premonition' }).waitFor();
    await viewer.getByRole('button', { name: 'Close' }).click();

    await page.goto('/sofra/about');
    assert.equal(await page.locator('video').evaluate(video => video.paused), true);
    await page.getByText('Does Sofra need Administrator access?').click();
    await page.getByText('Permissions depend on the features', { exact: false }).waitFor();
    for (const width of [320, 390, 820, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ['/', '/Gallery.html', '/sofra/about', '/404.html']) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, path + ' at ' + width);
      }
    }
    await page.goto('/Arcade.html');
    await page.waitForURL('**/#surprise');
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

(async () => {
  const { server, url } = await startServer();
  try {
    for (const engine of [chromium, firefox, webkit]) {
      const browser = await engine.launch();
      try {
        await smoke(browser, url);
        console.log(engine.name() + ': navigation, clipboard, gallery viewer, recovery, FAQ, responsive widths, and legacy redirect passed');
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
