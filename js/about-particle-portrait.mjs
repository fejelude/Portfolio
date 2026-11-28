// The original sample stays intact. This matte follows the subject in its
// 256 × 144 composition, so the room can fade without bleaching the face.
const outline = [
  [99,-7],[130,-9],[151,4],[161,23],[165,43],[162,58],[158,70],[169,77],
  [184,81],[201,90],[218,99],[237,105],[263,116],[267,142],[239,146],
  [181,141],[167,137],[153,144],[56,147],[53,121],[57,102],[68,91],
  [84,83],[95,79],[91,72],[88,61],[83,54],[82,43],[86,28],[92,15],
];
const STEP = 1 / 120;
const SPRING = 78;
const DAMPING = 14;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function particleGrid(cssWidth, sourceWidth = 256, sourceHeight = 144, economy = false) {
  const cols = clamp(Math.round(cssWidth / (economy ? 2.2 : 1.82)), 1, economy ? 208 : 352);
  return { cols, rows: Math.max(1, Math.round(cols * sourceHeight / sourceWidth)) };
}

export function portraitMatte(x, y) {
  const u = x * 256, v = y * 144;
  let inside = false, distance = Infinity;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [a,b] = outline[j], [c,d] = outline[i];
    const dx = c - a, dy = d - b;
    if ((b > v) !== (d > v) && u < a + dx * (v - b) / dy) inside = !inside;
    const t = clamp(((u - a) * dx + (v - b) * dy) / (dx * dx + dy * dy), 0, 1);
    const px = u - a - t * dx, py = v - b - t * dy;
    distance = Math.min(distance, px * px + py * py);
  }
  const subject = smooth(-12, 9, Math.sqrt(distance) * (inside ? 1 : -1));
  const frame = smooth(0, .14, x) * (1 - smooth(.82, 1, x)) *
    smooth(0, .16, y) * (1 - smooth(.72, .985, y));
  const room = Math.max(0, 1 - ((x - .51) / .65) ** 2 - ((y - .48) / .71) ** 2);
  return frame * (subject * .94 + room * .072);
}

export class PortraitPhysics {
  constructor(cols, rows, depth) {
    this.cols = cols;
    this.rows = rows;
    this.count = cols * rows;
    this.depth = depth;
    this.dx = new Float32Array(this.count);
    this.dy = new Float32Array(this.count);
    this.vx = new Float32Array(this.count);
    this.vy = new Float32Array(this.count);
    this.active = new Set();
  }

  reset() {
    for (const i of this.active) this.dx[i] = this.dy[i] = this.vx[i] = this.vy[i] = 0;
    this.active.clear();
  }

  step(dt, brush) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, .064);
    const { cols, rows, active } = this;
    if (brush?.strength > 0) {
      const { x, y, radius } = brush;
      for (let row = Math.max(0, Math.floor(y-radius)); row <= Math.min(rows-1, Math.floor(y+radius)); row++) {
        for (let col = Math.max(0, Math.floor(x-radius)); col <= Math.min(cols-1, Math.floor(x+radius)); col++) {
          const i = row * cols + col;
          if ((!this.depth || this.depth[i] > 8) && (col+.5-x)**2 + (row+.5-y)**2 < radius*radius) active.add(i);
        }
      }
    }
    const steps = Math.ceil(dt / STEP), h = dt / steps, drag = Math.exp(-DAMPING * h);
    const cap = Math.max(4, cols * .037);
    for (const i of active) {
      const ox = i % cols + .5, oy = Math.floor(i / cols) + .5;
      const depth = this.depth ? this.depth[i] / 255 : .65;
      let x = this.dx[i], y = this.dy[i], vx = this.vx[i], vy = this.vy[i];
      for (let s = 0; s < steps; s++) {
        let ax = -SPRING * x, ay = -SPRING * y;
        if (brush?.strength > 0) {
          const rx = ox + x - brush.x, ry = oy + y - brush.y;
          const d = Math.sqrt(rx*rx + ry*ry) / brush.radius;
          if (d < 1) {
            // A smooth falloff and a small tangential current give the wake
            // a direction, while translucent edge particles travel farther.
            const push = d * (1-d) * (1-d) * brush.strength * (193 - 80*depth);
            ax += push * (rx - .24*ry + (brush.flowX || 0)*1.6);
            ay += push * (ry + .24*rx + (brush.flowY || 0)*1.6);
          }
        }
        vx = (vx + ax*h)*drag; vy = (vy + ay*h)*drag;
        x += vx*h; y += vy*h;
        const r2 = x*x + y*y;
        if (r2 > cap*cap) {
          const scale = cap / Math.sqrt(r2);
          x *= scale; y *= scale;
          const outward = (vx*x + vy*y) / (cap*cap);
          if (outward > 0) { vx -= outward*x; vy -= outward*y; }
        }
      }
      if (!brush && x*x+y*y < .035**2 && vx*vx+vy*vy < .15**2) {
        this.dx[i] = this.dy[i] = this.vx[i] = this.vy[i] = 0;
        active.delete(i);
      } else {
        this.dx[i] = x; this.dy[i] = y; this.vx[i] = vx; this.vy[i] = vy;
      }
    }
  }
}

// The matte changes slowly compared with the source image. Sample its
// authored contour once and interpolate the soft edge at display density.
const matteWidth = 96, matteHeight = 54;
function sampleMatte() {
  return Float32Array.from({ length: matteWidth*matteHeight }, (_, i) =>
    portraitMatte(i % matteWidth / (matteWidth-1), Math.floor(i / matteWidth) / (matteHeight-1)));
}
function matteAt(matte, x, y) {
  const sx = x*(matteWidth-1), sy = y*(matteHeight-1);
  const col = Math.floor(sx), row = Math.floor(sy), dx = sx-col, dy = sy-row;
  const i = row*matteWidth+col;
  return (matte[i]*(1-dx)+matte[i+1]*dx)*(1-dy) +
    (matte[i+matteWidth]*(1-dx)+matte[i+matteWidth+1]*dx)*dy;
}

function makeField(sample, cache, source, cols, rows, matteGrid) {
  const { width, height } = cache.canvas;
  sample.canvas.width = cols;
  sample.canvas.height = rows;
  sample.imageSmoothingQuality = 'high';
  sample.drawImage(source, 0, 0, cols, rows);
  const input = sample.getImageData(0, 0, cols, rows).data;
  sample.canvas.width = sample.canvas.height = 1;
  const raster = cache.createImageData(width, height), pixels = raster.data;
  const depth = new Uint8Array(cols*rows), palette = [], colorIndex = new Uint16Array(depth.length);
  const x0 = new Uint16Array(depth.length), y0 = new Uint16Array(depth.length);
  const widths = new Uint8Array(depth.length), heights = new Uint8Array(depth.length);
  const sx = width / cols, sy = height / rows;
  for (let col = 0; col < cols; col++) {
    const left = Math.round(col*sx), right = Math.round((col+1)*sx);
    for (let row = 0; row < rows; row++) {
      const i = row*cols+col, p = i*4;
      const matte = matteAt(matteGrid, (col+.5)/cols, (row+.5)/rows);
      const seed = Math.imul(i ^ (i >>> 7) ^ 10331, 1597334677);
      const noise = ((seed ^ (seed >>> 13)) >>> 24) / 255;
      const opacity = Math.round(255 * Math.min(1, matte * (.83 + noise*.28)));
      if (opacity < 4) continue;
      const top = Math.round(row*sy), bottom = Math.round((row+1)*sy);
      const grains = matte < .68 && noise > .52;
      const w = Math.max(1, right-left-(grains && right-left>1 ? 1 : 0));
      const h = Math.max(1, bottom-top-(grains && bottom-top>1 ? 1 : 0));
      const x = left + (noise>.8 ? right-left-w : 0);
      const y = top + (noise>.74 ? bottom-top-h : 0);
      const edge = 1 - Math.min(1, matte);
      const r = Math.min(255, input[p] + Math.round(edge*19));
      const g = Math.min(255, input[p+1] + Math.round(edge*5));
      const b = Math.min(255, input[p+2] + Math.round(edge*25));
      depth[i] = opacity;
      x0[i] = x; y0[i] = y; widths[i] = w; heights[i] = h;
      const key = (r>>3)<<10 | (g>>3)<<5 | b>>3;
      colorIndex[i] = key;
      palette[key] ??= `rgb(${r},${g},${b})`;
      for (let yy = y; yy < y+h; yy++) {
        for (let xx = x; xx < x+w; xx++) {
          const k = (yy*width+xx)*4;
          pixels[k] = r; pixels[k+1] = g; pixels[k+2] = b; pixels[k+3] = opacity;
        }
      }
    }
  }
  cache.putImageData(raster, 0, 0);
  return { depth, palette, colorIndex, x0, y0, widths, heights, sx, sy };
}

// On touch and economy profiles a few neighboring grains travel together.
// They still carry their full cached texture, with fewer moving draw calls.
function motionTiles(field, cols, rows, width, height) {
  const columns = Math.ceil(cols/2), lines = Math.ceil(rows/2), count = columns*lines;
  const depth = new Uint8Array(count), x0 = new Uint16Array(count), y0 = new Uint16Array(count);
  const widths = new Uint8Array(count), heights = new Uint8Array(count);
  for (let y = 0; y < lines; y++) {
    for (let x = 0; x < columns; x++) {
      const i = y*columns+x, col = 2*x, row = 2*y;
      const right = Math.min(col+2,cols), bottom = Math.min(row+2,rows);
      x0[i] = Math.round(col*width/cols); y0[i] = Math.round(row*height/rows);
      widths[i] = Math.round(right*width/cols)-x0[i];
      heights[i] = Math.round(bottom*height/rows)-y0[i];
      for (let yy = row; yy < bottom; yy++) {
        for (let xx = col; xx < right; xx++) depth[i] = Math.max(depth[i],field.depth[yy*cols+xx]);
      }
    }
  }
  return { columns, lines, depth, x0, y0, widths, heights, sx: 2*width/cols, sy: 2*height/rows, tiled: true };
}

export function mountParticlePortrait(root) {
  if (!root) return () => {};
  const doc = root.ownerDocument, win = doc.defaultView, canvas = root.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return () => {};
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = win.matchMedia('(pointer: coarse)');
  const controller = new win.AbortController(), { signal } = controller;
  const listen = (node, event, fn) => node.addEventListener(event, fn, { passive: true, signal });
  const economy = win.navigator.connection?.saveData || (win.navigator.hardwareConcurrency || 4) <= 4;
  const cache = doc.createElement('canvas'), cached = cache.getContext('2d');
  const sample = doc.createElement('canvas').getContext('2d', { willReadFrequently: true });
  let image, source, matte, field, motionField, physics, dirty, box, pointer, touch;
  let frame = 0, last = 0, slow = 0, suspended = false, needsSize = true;
  let visible = !win.IntersectionObserver;
  let nearObserver, observer, resizeObserver;

  const state = value => { if (root.dataset.portraitState !== value) root.dataset.portraitState = value; };
  const allowed = () => visible && !doc.hidden && !suspended && !reduced.matches && !signal.aborted;
  function restore(area) {
    const { x, y, w, h } = area;
    ctx.clearRect(x, y, w, h);
    if (w && h) ctx.drawImage(cache, x, y, w, h, x, y, w, h);
  }
  function rebuild() {
    if (!source || !needsSize || signal.aborted) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(win.devicePixelRatio || 1, economy ? 1.5 : 2, Math.sqrt(760000/(rect.width*rect.height)));
    const width = Math.round(rect.width*dpr), height = Math.round(rect.height*dpr);
    // Give every cell at least one addressable backing pixel.
    const { cols, rows } = particleGrid(Math.min(rect.width, width), source.naturalWidth, source.naturalHeight, economy);
    needsSize = false;
    const tiled = economy || coarse.matches;
    if (field && width === canvas.width && height === canvas.height && cols === field.cols &&
      tiled === Boolean(motionField.tiled)) return;
    canvas.width = cache.width = width;
    canvas.height = cache.height = height;
    field = makeField(sample, cached, source, cols, rows, matte ??= sampleMatte());
    field.cols = cols;
    motionField = tiled ? motionTiles(field, cols, rows, width, height) : field;
    physics = new PortraitPhysics(tiled ? motionField.columns : cols, tiled ? motionField.lines : rows, motionField.depth);
    dirty = undefined;
    restore({ x: 0, y: 0, w: width, h: height });
    root.dataset.portraitParticles = String(cols*rows);
    state('idle');
  }

  function drawMotion() {
    const { depth, palette, colorIndex, x0, y0, widths, heights, sx, sy, tiled } = motionField;
    const { active, dx, dy } = physics;
    let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
    for (const i of active) {
      if (dx[i]**2 + dy[i]**2 < .014) continue;
      const x = Math.round(x0[i] + dx[i]*sx), y = Math.round(y0[i] + dy[i]*sy);
      left = Math.min(left, x0[i], x); top = Math.min(top, y0[i], y);
      right = Math.max(right, Math.max(x0[i], x) + widths[i]);
      bottom = Math.max(bottom, Math.max(y0[i], y) + heights[i]);
    }
    const x = Math.max(0,left), y = Math.max(0,top);
    const area = right > left && bottom > top ? {
      x, y, w: Math.min(canvas.width,right)-x, h: Math.min(canvas.height,bottom)-y,
    } : undefined;
    if (dirty && area) {
      // Restore the old and new wake, then retain only the new footprint.
      const x = Math.min(dirty.x,area.x), y = Math.min(dirty.y,area.y);
      restore({ x, y, w: Math.max(dirty.x+dirty.w,area.x+area.w)-x, h: Math.max(dirty.y+dirty.h,area.y+area.h)-y });
    } else if (dirty || area) restore(dirty || area);
    dirty = area;
    if (!area) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for (const i of active) {
      const movement = dx[i]**2 + dy[i]**2;
      if (movement < .014) continue;
      ctx.globalAlpha = Math.min(.98, movement*.71);
      ctx.fillRect(x0[i], y0[i], widths[i], heights[i]);
    }
    ctx.globalCompositeOperation = 'source-over';
    let glints = 0;
    for (const i of active) {
      const movement = dx[i]**2 + dy[i]**2;
      if (movement < .014) continue;
      const x = Math.round(x0[i]+dx[i]*sx), y = Math.round(y0[i]+dy[i]*sy);
      if (tiled) {
        ctx.globalAlpha = Math.min(1, movement*.71);
        ctx.drawImage(cache, x0[i], y0[i], widths[i], heights[i], x, y, widths[i], heights[i]);
        continue;
      }
      ctx.globalAlpha = depth[i]/255 * Math.min(1, movement*.71);
      ctx.fillStyle = palette[colorIndex[i]];
      if (movement > 4 && (i % 37) === 0 && glints < 18) {
        ctx.fillStyle = i & 1 ? '#d9b8eb' : '#f4b8cf';
        ctx.globalAlpha *= .7;
        glints++;
      }
      ctx.fillRect(x, y, widths[i], heights[i]);
    }
    ctx.globalAlpha = 1;
  }

  function stop() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = last = 0;
    pointer = touch = box = undefined;
    if (dirty) { restore(dirty); dirty = undefined; }
    if (physics) { physics.reset(); state('idle'); }
  }
  function request() {
    if (allowed() && physics && !frame) frame = win.requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (!allowed()) return stop();
    if (last && (economy || slow >= 4) && now-last < 32) return request();
    const started = win.performance.now(), dt = last ? (now-last)/1000 : 1/60;
    last = now;
    const age = pointer ? now-pointer.time : Infinity;
    if (age > 360) pointer = undefined;
    const brush = pointer && { ...pointer, strength: pointer.strength * (1-smooth(120,360,age)) };
    physics.step(dt, brush);
    drawMotion();
    slow = clamp(slow + (win.performance.now()-started > 9 ? 1 : -1), 0, 8);
    if (pointer || physics.active.size) { state('active'); request(); }
    else { last = 0; state('idle'); }
  }

  function release() {
    pointer = touch = box = undefined;
    if (physics?.active.size) request();
  }
  function disturb(event, strength) {
    if (!allowed() || !physics) return;
    box ??= canvas.getBoundingClientRect();
    const x = (event.clientX-box.left)*physics.cols/box.width;
    const y = (event.clientY-box.top)*physics.rows/box.height;
    if (x < 0 || y < 0 || x >= physics.cols || y >= physics.rows) return;
    const r = clamp(box.height * (coarse.matches ? .21 : .18), 25, 71) * physics.cols/box.width;
    pointer = {
      x, y, radius: r, strength, time: win.performance.now(),
      flowX: pointer ? clamp((x-pointer.x)*1.2, -r*.55, r*.55) : 0,
      flowY: pointer ? clamp((y-pointer.y)*1.2, -r*.55, r*.55) : 0,
    };
    request();
  }

  listen(canvas, 'pointerdown', e => {
    if (!allowed() || e.button !== 0) return;
    if (!e.isPrimary) return release();
    if (e.pointerType !== 'touch') return disturb(e, .8);
    if ((win.visualViewport?.scale || 1) > 1.05) return;
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp, drag: false };
  });
  listen(canvas, 'pointermove', e => {
    if (!e.isPrimary) return;
    if (e.pointerType !== 'touch') return disturb(e, 1);
    if (touch?.id !== e.pointerId) return;
    const dx = Math.abs(e.clientX-touch.x), dy = Math.abs(e.clientY-touch.y);
    if (!touch.drag && dy > 10 && dy >= dx*.72) return release();
    if (dx > 10) touch.drag = true;
    if (touch.drag) disturb(e, .9);
  });
  listen(canvas, 'pointerup', e => {
    if (touch?.id !== e.pointerId) return;
    const tap = !touch.drag && e.timeStamp-touch.time < 440;
    touch = undefined;
    if (tap) disturb(e, .95);
    else release();
  });
  listen(canvas, 'pointerleave', e => { if (e.pointerType !== 'touch') release(); });
  listen(canvas, 'pointercancel', release);
  listen(doc, 'pointerdown', e => { if (e.pointerType === 'touch' && !e.isPrimary && touch) release(); });
  listen(win, 'scroll', release);
  listen(win, 'blur', release);

  function load() {
    if (image || signal.aborted) return;
    state('loading');
    image = new win.Image();
    image.decoding = 'async';
    image.onload = () => {
      if (signal.aborted) return;
      source = image;
      if (visible && !doc.hidden && !suspended) rebuild();
    };
    image.onerror = () => state('unavailable');
    image.src = root.dataset.source;
  }
  function sync() {
    root.toggleAttribute('data-portrait-visible', allowed());
    if (!visible || doc.hidden || suspended) return stop();
    load();
    rebuild();
    if (reduced.matches) stop();
  }
  function resize() {
    stop();
    needsSize = true;
    if (visible && !doc.hidden && !suspended) rebuild();
  }
  if (win.IntersectionObserver) {
    nearObserver = new win.IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { load(); nearObserver.disconnect(); }
    }, { rootMargin: '220px 0px' });
    observer = new win.IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    nearObserver.observe(root);
    observer.observe(root);
  } else sync();
  if (win.ResizeObserver) {
    resizeObserver = new win.ResizeObserver(resize);
    resizeObserver.observe(canvas);
  }
  listen(win, 'resize', resize);
  listen(doc, 'visibilitychange', sync);
  listen(reduced, 'change', sync);
  listen(coarse, 'change', resize);
  listen(win, 'pagehide', e => { suspended = true; sync(); if (!e.persisted) dispose(); });
  listen(win, 'pageshow', () => { suspended = false; sync(); });
  function dispose() {
    stop();
    controller.abort();
    nearObserver?.disconnect(); observer?.disconnect(); resizeObserver?.disconnect();
    if (image) image.onload = image.onerror = null;
    root.removeAttribute('data-portrait-visible');
    cache.width = cache.height = 1;
    field = motionField = physics = source = image = matte = undefined;
  }
  return dispose;
}
if (typeof document !== 'undefined') mountParticlePortrait(document.querySelector('[data-particle-portrait]'));
