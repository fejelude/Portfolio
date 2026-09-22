// Run with `node verification/sofra-smoke.cjs` after installing Playwright.
// Uses fixtures only. Never connects to Discord or changes real guild settings.
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()] }));
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { DEFAULTS } = require('../api/sofra/_config');
const config = JSON.parse(JSON.stringify(DEFAULTS));
const guild = { id: '123456789012345678', name: 'Moonlight Community', botInstalled: true };
let signedIn = false;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (url.pathname === '/api/sofra/guilds') return signedIn ? json({ user: { username: 'Test manager' }, csrf: 'fixture', guilds: [guild] }) : json({ error: 'Sign in required' }, 401);
  if (url.pathname === '/api/sofra/guild') {
    if (req.method === 'PUT') {
      let body = ''; req.on('data', (part) => { body += part; });
      req.on('end', () => { const { section, value } = JSON.parse(body); config[section] = value; json({ ok: true, section, value }); });
      return;
    }
    return json({ botInstalled: true, guild, botGuild: { ...guild, memberCount: 420 }, config, channels: [{ id: '223456789012345678', name: 'welcome', type: 0 }], roles: [], runtime: { state: 'unknown', sections: {} } });
  }
  const route = { '/': '/index.html', '/sofra': '/SofraPanel.html', '/sofra/about': '/Sofra.html' }[url.pathname] || url.pathname;
  const file = path.resolve(root, `.${route}`);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(error ? 'Not found' : data); });
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const portable = process.env.SOFRA_CHROMIUM_MODULE ? (await import(process.env.SOFRA_CHROMIUM_MODULE)).default : null;
  const browser = await chromium.launch({ headless: true, ...(portable ? { executablePath: await portable.executablePath(), args: portable.args } : {}) });
  const base = `http://127.0.0.1:${server.address().port}`;
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    page.on('pageerror', (error) => errors.push(error.message));
    for (const width of [1440, 390]) {
      signedIn = false;
      config.automod.dryRun = false;
      await page.setViewportSize({ width, height: 960 });
      await page.goto(`${base}/sofra/about`);
      await page.locator('h1').waitFor();
      if (process.env.SOFRA_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SOFRA_SCREENSHOT_DIR, `sofra-public-${width}.png`), fullPage: true });
      const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).map((el) => ({ tag: el.tagName, className: el.className, right: el.getBoundingClientRect().right })).slice(0, 12));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Public page overflow at ${width}: ${JSON.stringify(overflow)}`);
      assert.equal(await page.locator('video').evaluateAll((items) => items.every((v) => v.paused)), true);
      await page.goto(`${base}/sofra`);
      await page.locator('#auth-gate:not(.hidden)').waitFor();
      signedIn = true;
      await page.reload();
      await page.locator('#content:not(.hidden)').waitFor();
      assert.match(await page.locator('#bot-status-text').textContent(), /unknown/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Dashboard overflow at ${width}`);
      if (process.env.SOFRA_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SOFRA_SCREENSHOT_DIR, `sofra-dashboard-${width}.png`), fullPage: true });
      await page.locator('#setup-checklist button').filter({ hasText: 'AutoMod' }).click();
      await page.locator('#automod-dry-run').check();
      await page.locator('#save-button').click();
      await page.waitForFunction(() => !document.querySelector('#save-button').textContent.includes('Saving'));
      assert.equal(config.automod.dryRun, true);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile public page, sign-in gate, fixture dashboard, reduced motion, no horizontal overflow, AutoMod save, no browser errors.');
  } finally { await browser.close(); server.close(); }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
