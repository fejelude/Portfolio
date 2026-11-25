const TAU = Math.PI * 2;
const gold = '#e8ca8c';
const aqua = '#91ece0';
const silver = '#e0eaf6';
const sapphire = '#729bda';
const colors = [silver, aqua, sapphire, gold];
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (value, size) => ((value % size) + size) % size;
const random = seed => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

// Measure the distance from a broad reading band. A tall card and a short
// section both reach full strength, and direction never changes the curve.
export function skyEnvelope(top, bottom, height) {
  const gap = Math.max(top - height * .72, height * .22 - bottom, 0) / Math.max(1, height);
  return {
    wash: 1 - smooth(0, .58, gap),
    field: 1 - smooth(.025, .43, gap),
    engraving: 1 - smooth(.035, .27, gap),
    meteor: 1 - smooth(0, .14, gap)
  };
}

export function skyScale(area, dpr) {
  return Math.min(dpr, 2.5, Math.sqrt(1_350_000 / Math.max(1, area)));
}

// Only allocate pixels in the four disjoint bands around the watch. This
// avoids redrawing a viewport-sized bitmap underneath the WebGL exhibit.
export function skyBands(w, h, box) {
  const edge = (value, limit) => Math.max(0, Math.min(limit, Math.round(value)));
  const left = edge(box.left - 8,w), right = edge(box.right + 8,w);
  const top = edge(box.top - 8,h), bottom = edge(box.bottom + 8,h);
  return [
    {x:0,y:0,width:left,height:h},
    {x:right,y:0,width:w - right,height:h},
    {x:left,y:0,width:right - left,height:top},
    {x:left,y:bottom,width:right - left,height:h - bottom}
  ];
}

const charts = [
  // Cassiopeia's five-star W, Orion's belt and shoulders, and the Northern Cross.
  { name: 'CASSIOPEIA', points: [[0,.34],[.24,.75],[.48,.3],[.72,.52],[1,.08]], links: [[0,1],[1,2],[2,3],[3,4]] },
  { name: 'ORION', points: [[.22,.08],[.75,0],[.4,.46],[.52,.42],[.63,.39],[.12,.95],[.85,1]],
    links: [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[5,6]] },
  { name: 'CYGNUS', points: [[.65,.05],[.52,.39],[.32,1],[.04,.24],[.98,.62]],
    links: [[0,1],[1,2],[3,1],[1,4]] }
];
// Hand-plotted strokes avoid platform-dependent emoji glyphs.
const zodiac = [
  [[[-6,.5],[-4,-4],[-2,-4],[0,-1],[0,6]],[[0,-1],[2,-4],[4,-4],[6,.5]]], // Aries
  [[[-6,-5],[-4,-2],[-1,-2],[0,-1],[1,-2],[4,-2],[6,-5]],[[0,-1],[-4,1],[-4,5],[0,7],[4,5],[4,1],[0,-1]]], // Taurus
  [[[-5,-6],[5,-6]],[[-5,6],[5,6]],[[-3,-6],[-3,6]],[[3,-6],[3,6]]], // Gemini
  [[[-6,-1],[-3,-4],[2,-4],[5,-2],[5,1],[2,2],[0,0]],[[6,3],[3,6],[-2,6],[-5,4],[-5,1],[-2,0],[0,2]]], // Cancer
  [[[-5,4],[-7,2],[-5,0],[-2,1],[-2,4],[-5,4]], [[-2,1],[-2,-4],[0,-7],[4,-7],[5,-3],[3,3],[3,5],[5,6],[7,4]]], // Leo
  [[[-7,-3],[-5,-3],[-5,4],[-4,-3],[-2,-3],[-2,4],[-1,-3],[1,-3],[1,4],[4,4],[6,2]]], // Virgo
  [[[-6,6],[6,6]],[[-6,1],[-2,1],[-3,-1],[-2,-4],[2,-4],[3,-1],[2,1],[6,1]]], // Libra
  [[[-7,-4],[-5,-4],[-5,4],[-4,-4],[-2,-4],[-2,4],[-1,-4],[1,-4],[1,4],[4,4],[7,1]],[[4,1],[7,1],[7,4]]], // Scorpio
  [[[-5,6],[5,-5]],[[0,-5],[5,-5],[5,0]],[[-5,0],[1,6]]], // Sagittarius
  [[[-6,-5],[-4,-5],[-2,2],[0,-4],[2,-4],[3,2],[5,1],[7,3],[5,6],[1,6]]], // Capricorn
  [[[-7,-2],[-3,-5],[0,-2],[3,-5],[7,-2]],[[-7,4],[-3,1],[0,4],[3,1],[7,4]]], // Aquarius
  [[[-5,-6],[-3,-3],[-3,3],[-5,6]],[[5,-6],[3,-3],[3,3],[5,6]],[[-6,0],[6,0]]] // Pisces
];

function film(doc) {
  const canvas = doc.createElement('canvas');
  const w = canvas.width = 188, h = canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const pixels = ctx.createImageData(w, h), rng = random(712);
  const cells = Float32Array.from({ length: 256 }, rng);
  function noise(x, y) {
    const a = Math.floor(x), b = Math.floor(y);
    const u = smooth(0, 1, x - a), v = smooth(0, 1, y - b);
    const at = (i,j) => cells[wrap(j,16) * 16 + wrap(i,16)];
    return lerp(lerp(at(a,b), at(a+1,b), u), lerp(at(a,b+1), at(a+1,b+1), u), v);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h;
    const cloud = noise(u * 8, v * 6) * .64 + noise(u * 22 + 5, v * 19) * .36;
    const drift = v - .61 + .19 * Math.sin(u * 6.1 + .5) + .12 * (cloud - .5);
    const veil = Math.exp(-Math.abs(drift) * 12) * (.25 + cloud * .65);
    const ridge = Math.exp(-Math.abs(drift - .072 * Math.sin(u * 13)) * 50) * cloud ** 2;
    const dust = smooth(.16, .78, noise(u * 34, v * 26));
    const edge = Math.sin(u * Math.PI) ** 1.35 * Math.sin(v * Math.PI);
    const i = (y * w + x) * 4;
    pixels.data.set([28 + 53 * ridge, 76 + 127 * (veil + ridge) / 2, 121 + 99 * veil,
      edge * (veil * 76 + ridge * 145) * (.51 + dust * .49)], i);
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function makeStars(total) {
  const roll = random(39612);
  return Array.from({ length: total }, (_, i) => ({
    u: roll(), v: roll(), phase: roll(), beat: 2.3 + roll() * 6,
    depth: i % 3, color: i % 8 < 4 ? 0 : i % 4,
    rail: i % 2, shape: i % 17 === 0 ? 2 : i % 5 === 0 ? 1 : 0
  }));
}
function pixelStar(ctx, x, y, shape, color, unit, sx, sy) {
  x = Math.round(x * sx) / sx;
  y = Math.round(y * sy) / sy;
  const dx = Math.round(unit * sx) / sx, dy = Math.round(unit * sy) / sy;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, dx, dy);
  if (shape) {
    ctx.fillRect(x - dx, y, dx * 3, dy);
    ctx.fillRect(x, y - dy, dx, dy * 3);
  }
  if (shape === 2) {
    ctx.fillRect(x - dx * 2, y, dx * 5, dy);
    ctx.fillRect(x, y - dy * 2, dx, dy * 5);
  }
}
function plot(ctx, points, scale = 1) {
  ctx.beginPath();
  points.forEach(([x,y], i) => i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale,y * scale));
  ctx.stroke();
}
function dial(ctx, x, y, radius, time, alpha, direction) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(direction * (.09 + time * .016));
  ctx.globalAlpha = alpha;
  ctx.lineWidth = .8;
  ctx.strokeStyle = gold;
  for (const [size, start, end] of [[1, .09, 6.04], [.93, .13, 6.01], [.72, .16, 6.0], [.58, 2.95, 5.7]]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * size, start, end);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const a = TAU * i / 60, c = Math.cos(a), s = Math.sin(a), inner = i % 5 === 0 ? .74 : .86;
    ctx.moveTo(c * radius * inner, s * radius * inner);
    ctx.lineTo(c * radius * .92, s * radius * .92);
  }
  ctx.stroke();
  if (radius > 33) for (let i = 0; i < zodiac.length; i++) {
    const a = i * TAU / zodiac.length - Math.PI / 2;
    ctx.save();
    ctx.translate(Math.cos(a) * radius * .65, Math.sin(a) * radius * .65);
    ctx.rotate(a + Math.PI / 2);
    ctx.strokeStyle = i % 3 === 0 ? aqua : gold;
    ctx.globalAlpha = alpha * lerp(.59, 1, .5 + .5 * Math.cos(time * .46 + i * .82));
    for (const segment of zodiac[i]) plot(ctx, segment, Math.min(.76, radius / 108));
    ctx.restore();
  }
  ctx.rotate(-direction * time * .037);
  ctx.strokeStyle = aqua;
  ctx.globalAlpha = alpha * .72;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.10, radius * .39, -.36, .2, 5.52);
  ctx.stroke();
  ctx.restore();
}
function chart(ctx, definition, x, y, size, alpha, time, sx, sy) {
  const {points, links, name} = definition;
  ctx.globalAlpha = alpha * .61;
  ctx.strokeStyle = aqua;
  ctx.lineWidth = .75;
  ctx.beginPath();
  for (const [a,b] of links) {
    ctx.moveTo(x + points[a][0] * size, y + points[a][1] * size * .72);
    ctx.lineTo(x + points[b][0] * size, y + points[b][1] * size * .72);
  }
  ctx.stroke();
  points.forEach(([px,py], i) => {
    ctx.globalAlpha = alpha * (.65 + .28 * Math.cos(i * 1.68 + time * .84));
    pixelStar(ctx, x + px * size, y + py * size * .72, i % 3 === 0 ? 1 : 0, silver, 1.5, sx, sy);
  });
  if (size >= 63) {
    ctx.globalAlpha = alpha * .73;
    ctx.fillStyle = gold;
    ctx.font = '9px ui-monospace, monospace';
    ctx.fillText(name, x, y + size * .83 + 11);
  }
}

function createComet(roll, time, {w,h,box}) {
  const life = 1.18 + roll() * .82, left = roll() > .5, offset = roll();
  const above = Math.max(0,box.top - 14), below = Math.max(0,h - box.bottom - 14);
  const upper = above > 105 && (below <= 105 || roll() > .42);
  const band = upper ? above : below;
  const gutter = (left ? box.left : w - box.right) - 9;
  // Follow available sky on narrow screens even when the card fills their height.
  // Pick this path once so it never snaps to a different lane during a scroll.
  const broad = band > 105;
  return {time,life,left,color:roll() > .47 ? gold : aqua,
    x:broad ? .06 + offset * .30 : Math.max(1,gutter * .12) / w,
    y:broad ? ((upper ? 0 : h - below) + band * .19) / h : .08 + offset * .38,
    dx:broad ? .49 : Math.max(2,gutter * .74) / w,
    dy:broad ? Math.min(190,band * .63) / h : .38};
}
function comet(ctx, star, time, frame) {
  const {w,h,level,sx,sy} = frame;
  const p = (time - star.time) / star.life;
  if (p < 0 || p >= 1) return;
  const visible = Math.sin(p * Math.PI) ** .75 * level.meteor * .88;
  for (let i = 25; i >= 0; i--) {
    const t = p - i * .009;
    if (t < 0) continue;
    const position = star.x + t * star.dx;
    const x = (star.left ? position : 1 - position) * w;
    const y = (star.y + t * star.dy) * h;
    ctx.globalAlpha = visible * (1 - i / 26) ** 1.7;
    pixelStar(ctx, x, y, i === 0 ? 2 : 0, i === 0 ? silver : star.color, i < 4 ? 2 : 1.15, sx, sy);
  }
}

function paint(ctx, frame, scene, panel) {
  const {w,h,sx,sy,box,level,scroll} = frame;
  const {time, dust, nebula, shooting} = scene;
  const {wash, field, engraving, meteor} = level;
  const {x:left,y:top,width,height} = panel;
  ctx.setTransform(sx, 0, 0, sy, -left * sx, -top * sy);
  ctx.clearRect(left, top, width, height);
  const narrow = w < 660;
  const margins = [box.left, w - box.right];
  const shift = Math.sin(time * .18);
  ctx.globalAlpha = wash * (.85 + .08 * shift);
  if (nebula) {
    const cw = w * (narrow ? 1.06 : .68), ch = h * .92;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(nebula, -cw * .32 + shift * 17, h * -.05 + scroll * .046, cw, ch);
    ctx.save();
    ctx.translate(w + cw * .30 - shift * 13, h * .20 - scroll * .037);
    ctx.scale(-1,1);
    ctx.drawImage(nebula, 0, 0, cw, ch);
    ctx.restore();
  }
  const goldLight = ctx.createRadialGradient(w * .10,h * .46,0,w * .10,h * .46,w * .35);
  goldLight.addColorStop(0,'#c4934436');
  goldLight.addColorStop(1,'#c4934400');
  ctx.globalAlpha = wash * .72;
  ctx.fillStyle = goldLight;
  ctx.fillRect(left,top,width,height);
  const parallax = [.035 * scroll,.13 * scroll,.24 * scroll];
  for (let i = 0; i < (narrow ? 60 : dust.length); i++) {
    const star = dust[i], far = star.depth === 0;
    const margin = margins[star.rail];
    const lane = star.rail === 0 ? star.u * margin : w - star.u * margin;
    const x = i % 3 === 0 ? star.u * w : lane;
    const y = wrap(star.v * (h + 28) + parallax[star.depth] + time * (far ? .39 : 1), h + 28) - 14;
    if (x < left - 5 || x > left + width + 5 || y < top - 5 || y > top + height + 5) continue;
    const beat = .5 + .5 * Math.cos(time * TAU / star.beat + star.phase * TAU);
    const step = Math.floor(beat * 3.99) / 3;
    ctx.globalAlpha = field * (far ? .30 + .24 * step : .40 + .52 * step);
    pixelStar(ctx, x, y, beat > .42 ? star.shape : 0, colors[star.color], far ? 1 : 1.5, sx, sy);
  }
  if (engraving > 0) {
    for (const [i, margin] of margins.entries()) {
      if ((i === 0 && left > margin + 48) || (i === 1 && left + width < w - margin - 48)) continue;
      const side = i ? w : 0;
      const dir = i ? -1 : 1;
      const rail = side + dir * margin * .48;
      const dialRadius = Math.max(39, Math.min(124, margin * .44));
      const orbitY = h * (i ? .47 : .60) + scroll * (i ? .10 : .16);
      dial(ctx, rail, orbitY, dialRadius, time, engraving * .54, dir);
      const glyph = zodiac[(i ? 10 : 6)];
      ctx.save();
      ctx.translate(side + dir * Math.max(8,margin * .46), orbitY + dialRadius + 18);
      ctx.rotate(Math.sin(time * .26) * .13);
      ctx.globalAlpha = engraving * (.48 + .13 * Math.cos(time * .51 + i));
      ctx.strokeStyle = i ? aqua : gold;
      ctx.lineWidth = 1.2;
      for (const segment of glyph) plot(ctx, segment, narrow ? .66 : 1.1);
      ctx.restore();
      const size = Math.max(22, Math.min(139, margin * .71));
      const x = i ? w - margin * .84 : margin * .143;
      chart(ctx, charts[i], x, h * (i ? .21 : .25) + scroll * .12, size, engraving * .81, time, sx, sy);
    }
    const cygnus = Math.min(104,w * .22);
    chart(ctx, charts[2], w * .62, box.top - cygnus * (narrow ? .79 : 1) - 22,
      cygnus, engraving * .70, time, sx, sy);
  }
  if (shooting && meteor > 0) comet(ctx, shooting, time, frame);
  ctx.globalAlpha = 1;
}

export function mountDaedalusSky(section) {
  const doc = section.ownerDocument, win = doc.defaultView;
  const card = section.querySelector('.ft-card');
  if (!card) return () => {};
  const sky = doc.createElement('div');
  const panels = Array.from({length:4}, () => {
    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = 1;
    sky.append(canvas);
    return {canvas,ctx:canvas.getContext('2d')};
  });
  if (panels.some(panel=>!panel.ctx)) return () => {};
  sky.className = 'daedalus-scroll-sky';
  sky.setAttribute('aria-hidden', 'true');
  sky.hidden = true;
  doc.body.prepend(sky);

  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const pause = section.querySelector('[data-ft-pause]');
  const lifecycle = new win.AbortController(), {signal} = lifecycle;
  const roll = random(91823);
  const scene = {time:0, dust:makeStars(142), nebula:null, shooting:null};
  let nextComet = 2.8;
  let near = !win.IntersectionObserver, suspended = false, dirty = true;
  let frame = 0, lastPaint = null, deadline = 0, needsLayout = true, info, observer, resizer, pauseObserver;
  const stoppedMotion = () => motion.matches || pause?.getAttribute('aria-pressed') === 'true';

  function halt(release = false) {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    lastPaint = null;
    deadline = 0;
    sky.hidden = true;
    if (release) for (const {canvas} of panels) {
      if (canvas.width !== 1 || canvas.height !== 1) canvas.width = canvas.height = 1;
    }
  }

  function request() {
    if (!frame && near && !doc.hidden && !suspended) frame = win.requestAnimationFrame(tick);
  }
  function invalidate() {
    dirty = true;
    request();
  }

  function sample() {
    const h = Math.max(1,win.innerHeight);
    const w = Math.max(1,doc.documentElement.clientWidth);
    const bounds = section.getBoundingClientRect();
    const level = skyEnvelope(bounds.top,bounds.bottom,h);
    info = !level.wash ? null : {
      w,h,level, box:card.getBoundingClientRect(),
      scroll:Math.max(-h * 1.55, Math.min(h * 1.55,bounds.top - h * .23))
    };
    if (info) needsLayout = true;
    dirty = false;
  }

  function placePanels({w,h,box,level}) {
    sky.style.backgroundColor = 'rgba(9, 24, 49, ' + (level.wash * .8).toFixed(4) + ')';
    const bands = skyBands(w,h,box);
    const scale = skyScale(w * h,win.devicePixelRatio || 1);
    for (const [i, panel] of panels.entries()) {
      const {x,y,width,height} = panel.bounds = bands[i];
      const {canvas} = panel;
      canvas.hidden = !width || !height;
      const bw = canvas.hidden ? 1 : Math.max(1,Math.floor(width * scale));
      const bh = canvas.hidden ? 1 : Math.max(1,Math.floor(height * scale));
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
      canvas.style.left = x + 'px';
      canvas.style.top = y + 'px';
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }
    needsLayout = false;
  }

  function tick(now) {
    frame = 0;
    if (dirty) sample();
    if (!info) {
      halt(true);
      return;
    }
    const staticFrame = stoppedMotion() || info.level.field === 0;
    const delay = info.w < 660 ? 1000 / 24 : 1000 / 30;
    if (staticFrame || lastPaint === null || now >= deadline - 1) {
      if (needsLayout) placePanels(info);
      if (!scene.nebula) scene.nebula = film(doc);
      if (!staticFrame && lastPaint !== null) scene.time += Math.min(1,(now - lastPaint) / 1000);
      deadline = lastPaint === null ? now + delay : Math.max(deadline + delay, now + 2);
      lastPaint = staticFrame ? null : now;
      if (scene.shooting && scene.time > scene.shooting.time + scene.shooting.life) scene.shooting = null;
      if (!staticFrame && info.level.meteor > .85 && scene.time >= nextComet) {
        scene.shooting = createComet(roll,scene.time,info);
        nextComet = scene.time + 7.5 + roll() * 10;
      }
      const current = staticFrame && scene.shooting ? {...scene,shooting:null} : scene;
      for (const {canvas,ctx,bounds} of panels) if (!canvas.hidden) {
        paint(ctx,{...info,sx:canvas.width / bounds.width,sy:canvas.height / bounds.height},current,bounds);
      }
      sky.hidden = false;
    }
    if (!staticFrame) request();
  }

  function visibility() {
    if (doc.hidden || suspended) halt();
    else invalidate();
  }
  function dispose() {
    lifecycle.abort();
    observer?.disconnect();
    resizer?.disconnect();
    pauseObserver?.disconnect();
    halt(true);
    sky.remove();
  }
  if (win.IntersectionObserver) {
    observer = new win.IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      if (near) invalidate();
      else halt(true);
    },{rootMargin:'100% 0px'});
    observer.observe(section);
  }
  if (win.ResizeObserver) {
    resizer = new win.ResizeObserver(invalidate);
    resizer.observe(section);
    resizer.observe(card);
  }
  if (pause && win.MutationObserver) {
    pauseObserver = new win.MutationObserver(invalidate);
    pauseObserver.observe(pause,{attributeFilter:['aria-pressed']});
  }
  win.addEventListener('scroll',invalidate,{passive:true,signal});
  win.addEventListener('resize',invalidate,{passive:true,signal});
  win.addEventListener('pagehide',event=>{
    if (!event.persisted) dispose();
    else {
      suspended = true;
      visibility();
    }
  },{signal});
  win.addEventListener('pageshow',()=>{
    suspended = false;
    visibility();
  },{signal});
  doc.addEventListener('visibilitychange',visibility,{signal});
  motion.addEventListener('change',invalidate,{signal});
  request();
  return dispose;
}

if (typeof document !== 'undefined') {
  const section = document.querySelector('#tourbillon');
  if (section) mountDaedalusSky(section);
}
