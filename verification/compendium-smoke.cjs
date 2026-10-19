const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const pw = require('playwright');
const { startServer } = require('./birthday-server.cjs');

(async () => {
  const server = await startServer();
  const output = path.join(__dirname, 'compendium-results');
  await fs.mkdir(output, { recursive: true });
  try {
    for (const engine of (process.env.COMPENDIUM_ENGINES || 'chromium').split(',')) {
      const browser = await pw[engine].launch({ headless: true });
      try {
        for (const mobile of [false, true]) {
          const context = await browser.newContext(mobile && engine === 'webkit' ? pw.devices['iPhone 13'] :
            mobile && engine === 'chromium' ? pw.devices['Pixel 5'] : { viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 }, hasTouch: mobile });
          const page = await context.newPage(), errors = [];
          page.on('pageerror', e => errors.push(e.message));
          const activate = selector => mobile ? page.tap(selector) : page.click(selector);
          await page.goto(server.url + '/compendium');
          await page.locator('.compendium__card').last().waitFor();
          assert.equal(await page.locator('.compendium__card').count(), 9);
          await page.waitForFunction(() => [...document.querySelectorAll('.compendium__card img')].slice(0, 3).every(i => i.complete && i.naturalWidth > 0));
          assert.equal(await page.locator('#compendium-total').textContent(), '09 little worlds');
          const canvas = () => page.$eval('#compendium-sky', e => e.toDataURL());
          await activate('#compendium-motion');
          assert.equal(await page.locator('#compendium-motion').getAttribute('aria-pressed'), 'true');
          const still = await canvas(); await page.waitForTimeout(250); assert.equal(await canvas(), still);
          await activate('#compendium-motion');
          await page.waitForTimeout(120); assert.notEqual(await canvas(), still);
          await activate('.compendium__card');
          await page.locator('#compendium-lightbox').waitFor({ state: 'visible' });
          const source = await page.locator('#compendium-large').getAttribute('src');
          const modalStill = await canvas(); await page.waitForTimeout(250); assert.equal(await canvas(), modalStill);
          await activate('#compendium-next'); assert.notEqual(await page.locator('#compendium-large').getAttribute('src'), source);
          await activate('#compendium-prev'); assert.equal(await page.locator('#compendium-large').getAttribute('src'), source);
          await activate('#compendium-close'); await page.locator('#compendium-lightbox').waitFor({ state: 'hidden' });
          await page.waitForTimeout(800);
          await page.screenshot({ path: path.join(output, `${engine}-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForFunction(() => document.getElementById('compendium-motion').disabled);
          const reduced = await canvas(); await page.waitForTimeout(250); assert.equal(await canvas(), reduced);
          for (const viewport of [{ width: 320, height: 740 }, { width: 844, height: 390 }]) {
            await page.setViewportSize(viewport);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow');
            await page.screenshot({ path: path.join(output, `${engine}-${mobile ? 'touch' : 'mouse'}-${viewport.width}.png`), fullPage: true });
          }
          assert.deepEqual(errors, []);
          await context.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
