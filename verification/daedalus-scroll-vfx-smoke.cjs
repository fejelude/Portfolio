const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium, firefox, webkit } = require('playwright');

const root = path.resolve(__dirname,'..');
const output = path.resolve(process.env.DAEDALUS_VFX_RESULTS || path.join(__dirname,'daedalus-scroll-vfx-results'));
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript',
  '.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg',
  '.json':'application/json','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    const file = path.resolve(root,'.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});

async function verify(browser, url, engine, mobile, capture) {
  const viewport = mobile ? {width:390,height:844} : {width:1536,height:960};
  const context = await browser.newContext({viewport,deviceScaleFactor:mobile ? 3 : 1,reducedMotion:'reduce',
    hasTouch:mobile,isMobile:mobile && engine !== 'firefox'});
  const page = await context.newPage();
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));
  await page.addInitScript(()=>{
    window.skyTestFrames = [];
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.parentElement?.className === 'daedalus-scroll-sky' &&
          this.canvas === this.canvas.parentElement.firstElementChild) window.skyTestFrames.push(performance.now());
      return clear.apply(this,args);
    };
  });
  await context.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
  const surface = page.locator('.daedalus-scroll-sky');
  const sampleAlpha = () => surface.evaluate(sky=>Math.round(Number(sky.style.backgroundColor.split(',')[3]?.slice(0,-1)) * 255));
  const digest = () => surface.evaluate(sky => {
    let hash = 0;
    for (const c of sky.querySelectorAll('canvas:not([hidden])')) {
      const data = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      for (let i = 0; i < data.length; i += 28) hash = Math.imul((hash ^ data[i]), 16777619);
    }
    return hash;
  });
  const position = (anchor, offset) => page.evaluate(({anchor,offset})=>{
    const bounds = document.querySelector('#tourbillon').getBoundingClientRect();
    const edge = anchor === 'top' ? bounds.top : bounds.bottom;
    window.scrollTo({top:scrollY + edge - innerHeight * offset,behavior:'instant'});
  },{anchor,offset});
  const waitAlpha = (min,max) => page.waitForFunction(({min,max})=>{
    const sky = document.querySelector('.daedalus-scroll-sky');
    if (!sky || sky.hidden) return false;
    const v = Math.round(Number(sky.style.backgroundColor.split(',')[3]?.slice(0,-1)) * 255);
    return min <= v && v <= max;
  },{min,max});

  try {
    await page.goto(url);
    await surface.waitFor({state:'attached'});
    await position('top',1.12);
    await waitAlpha(35,85);
    const approach = await sampleAlpha();
    await position('top',.115);
    await waitAlpha(202,206);
    const stage = await surface.evaluate(sky=>({
      panels:[...sky.querySelectorAll('canvas:not([hidden])')].map(c=>({buffer:[c.width,c.height],css:[c.clientWidth,c.clientHeight]})),
      dpr:devicePixelRatio,allowsPointer:getComputedStyle(sky).pointerEvents,
      accessible:sky.getAttribute('aria-hidden') === 'true',
      fits:document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    }));
    assert.equal(stage.allowsPointer,'none');
    assert.equal(stage.accessible,true);
    assert.equal(stage.fits,true);
    const backingPixels = stage.panels.reduce((total,{buffer:[w,h]})=>total + w * h,0);
    assert.ok(backingPixels <= 1350000);
    assert.ok(backingPixels < 700000,'the foreground article should not use atmospheric buffer pixels');
    if (mobile) assert.ok(stage.panels[0].buffer[0] / stage.panels[0].css[0] > 1.9);
    assert.equal(await page.locator('.ft-card button').first().evaluate(button => {
      const {x,y,width,height} = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(x+width/2,y+height/2));
    }), true, 'canvas must not intercept hit testing');

    const paused = await digest();
    await page.waitForTimeout(300);
    assert.equal(await digest(),paused,'reduced-motion frame must stay still');

    if (capture) {
      await page.locator('.ft-model:not([hidden])').waitFor({state:'visible',timeout:30000});
      const type = mobile ? 'phone' : 'desktop';
      const shots = phase => page.screenshot({path:path.join(output,type+'-'+phase+'.png'),scale:'css'});
      await shots('celestial');
      await surface.evaluate(c=>{c.style.visibility = 'hidden';});
      await shots('baseline');
      await surface.evaluate(c=>{c.style.removeProperty('visibility');});
    }

    // Moving to the same distance on the other side must reproduce the wash.
    await position('bottom',-.18);
    await waitAlpha(36,86);
    assert.ok(Math.abs(await sampleAlpha() - approach) <= 2);
    await position('top',.115);
    await waitAlpha(202,206);
    await page.emulateMedia({reducedMotion:'no-preference'});
    const moving = await digest();
    await page.evaluate(()=>{window.skyTestFrames.length = 0;});
    await page.waitForTimeout(1600);
    const cadence = await page.evaluate(()=>{
      const frames = window.skyTestFrames;
      const elapsed = frames.at(-1) - frames[0];
      return {frames:frames.length,elapsedMs:Math.round(elapsed),paintsPerSecond:Number(((frames.length - 1) * 1000 / elapsed).toFixed(1))};
    });
    assert.notEqual(await digest(),moving,'pixel field should animate');
    assert.ok(cadence.frames > 0);
    if (cadence.frames > 1) assert.ok(cadence.paintsPerSecond <= (mobile ? 26 : 33));

    const pause = page.locator('[data-ft-pause]');
    const liveWatch = await page.locator('[data-ft-stage]').evaluate(stage=>stage.hasAttribute('data-ft-live'));
    const toggle = value => pause.evaluate((button,{live,value})=>{
      // Exercise the live button where WebGL is supported. The fallback has no active button.
      if (live) button.click();
      else button.setAttribute('aria-pressed',value);
    },{live:liveWatch,value});
    await toggle('true');
    await page.waitForFunction(()=>document.querySelector('[data-ft-pause]').getAttribute('aria-pressed') === 'true');
    await page.waitForTimeout(150);
    const stopped = await digest();
    await page.waitForTimeout(300);
    assert.equal(await digest(),stopped);
    await toggle('false');
    assert.equal(await pause.getAttribute('aria-pressed'),'false');

    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
    await surface.waitFor({state:'hidden'});
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    await waitAlpha(202,206);
    assert.equal(await surface.count(),1);
    await position('bottom',-.56);
    await surface.waitFor({state:'hidden',timeout:5000}).catch(async error=>{
      const location = await page.locator('#tourbillon').evaluate(el=>[scrollY,innerHeight,el.getBoundingClientRect().top]);
      throw new Error('Sky did not leave view at ' + location.join(', '),{cause:error});
    });
    assert.ok(await surface.evaluate(sky=>[...sky.querySelectorAll('canvas')].every(c=>c.width === 1 && c.height === 1)));

    await position('top',.115);
    await waitAlpha(202,206);
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));
    await surface.waitFor({state:'detached'});
    assert.deepEqual(exceptions,[]);
    return {engine,mobile,...stage,backingPixels,approach,liveWatch,cadence};
  } finally {
    await context.close();
  }
}

(async()=>{
  await mkdir(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const results = [];
  const engines = process.argv.includes('--cross-engine') ? {chromium,firefox,webkit}
    : process.argv.includes('--desktop-engines') ? {chromium,firefox}
    : process.argv.includes('--firefox') ? {firefox} : {chromium};
  try {
    for (const [engine,launcher] of Object.entries(engines)) {
      const browser = await launcher.launch(engine === 'chromium' ? {args:['--enable-unsafe-swiftshader']} : {});
      try {
        for (const mobile of [false,true]) {
          const result = await verify(browser,'http://127.0.0.1:' + server.address().port,engine,mobile,engine === 'chromium');
          results.push(result);
          console.log(result);
        }
      } finally {
        await browser.close();
      }
    }
    await writeFile(path.join(output,'measurement.json'),JSON.stringify(results,null,2) + '\n');
  } finally {
    server.close();
  }
})().catch(error=>{
  console.error(error);
  process.exitCode = 1;
});
