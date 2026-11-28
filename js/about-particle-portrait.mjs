const PULSE_COUNT = 6;
const LIFETIME = .66;
const ENTRANCE = .46;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Both renderers share this movement limit. Allow a full point radius and
// pixel rounding at the surface edge, even with every pulse overlapping.
const TRAVEL_KNEE = .34;
const TRAVEL_LIMIT = .52;

export function portraitSurface(width, height, preferredDpr) {
  const radius = clamp(height * .22, 27, 86);
  const limit = radius * TRAVEL_LIMIT;
  const bleed = Math.ceil(limit + 5);
  const outputWidth = width + 2 * bleed;
  const outputHeight = height + 2 * bleed;
  const dpr = Math.min(preferredDpr, Math.sqrt(960000 / (outputWidth * outputHeight)));
  return {
    radius, limit, bleed, outputWidth, outputHeight,
    width: Math.max(1, Math.floor(outputWidth * dpr)),
    height: Math.max(1, Math.floor(outputHeight * dpr)),
  };
}

export function limitedTravel(distance, radius) {
  const knee = radius * TRAVEL_KNEE;
  const room = radius * (TRAVEL_LIMIT - TRAVEL_KNEE);
  const beyond = distance - knee;
  return beyond <= 0 ? distance : knee + room * beyond / (room + beyond);
}

export function particleGrid(width, sourceWidth, sourceHeight, economy, canvasFallback) {
  const pitch = canvasFallback ? (economy ? 3 : 2.7) : (economy ? 1.92 : 1.62);
  const limit = canvasFallback ? 250 : 420;
  const cols = clamp(Math.round(width / pitch), 1, Math.min(limit, sourceWidth));
  return { cols, rows: Math.min(sourceHeight, Math.max(1, Math.round(cols * sourceHeight / sourceWidth))) };
}

export function pulseFalloff(distanceSquared, age) {
  if (distanceSquared >= 1 || age <= 0 || age >= LIFETIME) return 0;
  const life = age / LIFETIME;
  return (1 - distanceSquared) ** 2 * 12 * life * (1 - life) ** 3;
}

function noise(index, seed) {
  const n = Math.imul(index ^ (index >>> 7) ^ seed, 1597334677);
  return ((n ^ (n >>> 13)) >>> 0) / 4294967295;
}

function makeField(source, width, height, inset, economy, fallback) {
  const { cols, rows } = particleGrid(width, source.naturalWidth, source.naturalHeight, economy, fallback);
  const sampler = source.ownerDocument.createElement('canvas');
  sampler.width = cols;
  sampler.height = rows;
  const ctx = sampler.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, cols, rows);
  const samples = ctx.getImageData(0, 0, cols, rows).data;
  sampler.width = sampler.height = 1;

  // Jitter in both axes without changing the sampled photographic tones.
  const sx = width / cols, sy = height / rows;
  const data = new Float32Array(cols * rows * 6);
  for (let i = 0; i < cols * rows; i++) {
    const x = i % cols, y = Math.floor(i / cols);
    const p = i * 6;
    data[p] = inset + (x + .5 + (noise(i, 6397) - .5) * .36) * sx;
    data[p + 1] = inset + (y + .5 + (noise(i, 13177) - .5) * .36) * sy;
    data[p + 2] = .25 + noise(i, 10331) * .75;
    data[p + 3] = samples[i * 4] / 255;
    data[p + 4] = samples[i * 4 + 1] / 255;
    data[p + 5] = samples[i * 4 + 2] / 255;
  }
  return { data, cols, rows, sx, sy, inset };
}

function makeGpuRenderer(gl) {
  const program = gl.createProgram();
  const vertex = `
    attribute vec3 grain;
    attribute vec3 tone;
    uniform vec2 extent;
    uniform float radius, inverseRadiusSquared, pitch, dpr, assembly;
    uniform vec4 wake;
    uniform vec4 pulses[${PULSE_COUNT}];
    uniform vec2 directions[${PULSE_COUNT}];
    varying vec3 color;

    void main() {
      vec2 point = grain.xy;
      vec2 displacement = vec2(0.0);
      if (assembly > 0.0) {
        vec2 separation = vec2(grain.z - .625, .5 - fract(grain.z * 19.3));
        displacement = separation * 9.0 * assembly;
      }
      if (all(greaterThanEqual(point, wake.xy)) && all(lessThanEqual(point, wake.zw))) {
        for (int i = 0; i < ${PULSE_COUNT}; i++) {
          vec4 pulse = pulses[i];
          if (pulse.z <= 0.0) continue;
          vec2 r = point - pulse.xy;
          float t = 1.0 - dot(r,r) * inverseRadiusSquared;
          if (t <= 0.0) continue;
          vec2 curl = vec2(-r.y, r.x);
          displacement += (r * .47 + curl * .62 + directions[i] * radius * .18)
            * (t * t * pulse.z * mix(.52, 1.25, grain.z));
        }
      }
      float knee = radius * ${TRAVEL_KNEE};
      float room = radius * ${TRAVEL_LIMIT - TRAVEL_KNEE};
      float distanceSquared = dot(displacement, displacement);
      if (distanceSquared > knee * knee) {
        float distance = sqrt(distanceSquared);
        float beyond = distance - knee;
        displacement *= (knee + room * beyond / (room + beyond)) / distance;
      }
      gl_Position = vec4((point + displacement) / extent * vec2(2.,-2.) + vec2(-1.,1.), 0., 1.);
      gl_PointSize = pitch * (1.53 + .28 * grain.z) * dpr;
      color = tone;
    }`;
  const fragment = `
    precision mediump float;
    varying vec3 color;
    void main() {
      vec2 offset = gl_PointCoord - .5;
      float coverage = 1.0 - smoothstep(.133225, .25, dot(offset, offset));
      gl_FragColor = vec4(color, coverage);
    }`;
  const shaders = [];
  const buffer = gl.createBuffer();
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Portrait shader unavailable');
  } catch (error) {
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    throw error;
  } finally {
    for (const shader of shaders) gl.deleteShader(shader);
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  for (const [name, offset] of [['grain', 0], ['tone', 12]]) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset);
  }
  const uniforms = Object.fromEntries(['extent', 'radius', 'inverseRadiusSquared', 'pitch', 'dpr', 'assembly', 'wake', 'pulses[0]', 'directions[0]']
    .map(name => [name, gl.getUniformLocation(program, name)]));
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  const timedPulses = new Float32Array(PULSE_COUNT * 4);
  let count = 0, radius;
  return {
    rebuild(field, width, height, dpr, reach) {
      radius = reach;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(uniforms.extent, width, height);
      gl.uniform1f(uniforms.dpr, dpr);
      gl.uniform1f(uniforms.radius, radius);
      gl.uniform1f(uniforms.inverseRadiusSquared, 1 / (radius*radius));
      gl.uniform1f(uniforms.pitch, field.sx);
      gl.bufferData(gl.ARRAY_BUFFER, field.data, gl.STATIC_DRAW);
      count = field.data.length / 6;
    },
    draw(now, assembly, pulses, directions) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      // Age and bounds are uniform across the cloud. Resolve them once per
      // frame so undisturbed vertices can bypass the entire wake calculation.
      let left = 1, top = 1, right = 0, bottom = 0;
      timedPulses.set(pulses);
      for (let i = 0; i < pulses.length; i += 4) {
        const gain = pulseFalloff(0, now - pulses[i+2]) * pulses[i+3];
        timedPulses[i+2] = gain;
        if (!gain) continue;
        const x = pulses[i], y = pulses[i+1];
        if (left > right) { left = x; top = y; right = x; bottom = y; }
        left = Math.min(left, x-radius);
        top = Math.min(top, y-radius);
        right = Math.max(right, x+radius);
        bottom = Math.max(bottom, y+radius);
      }
      gl.uniform1f(uniforms.assembly, assembly);
      gl.uniform4f(uniforms.wake, left, top, right, bottom);
      gl.uniform4fv(uniforms['pulses[0]'], timedPulses);
      gl.uniform2fv(uniforms['directions[0]'], directions);
      gl.drawArrays(gl.POINTS, 0, count);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

function makeCanvasRenderer(canvas, ctx) {
  const cache = canvas.ownerDocument.createElement('canvas');
  const cached = cache.getContext('2d');
  let field, scaleX, scaleY, radius, dirty, colors;

  function paint(target, left, top, right, bottom, active) {
    const { cols, rows, data, sx, sy, inset } = field;
    const fromX = Math.max(0, Math.floor((left-inset)/sx)-2);
    const toX = Math.min(cols, Math.ceil((right-inset)/sx)+2);
    const fromY = Math.max(0, Math.floor((top-inset)/sy)-2);
    const toY = Math.min(rows, Math.ceil((bottom-inset)/sy)+2);
    for (let row = fromY; row < toY; row++) {
      for (let col = fromX; col < toX; col++) {
        const i = (row*cols+col)*6;
        let x = data[i], y = data[i+1];
        const depth = data[i+2];
        for (const pulse of active) {
          const rx = data[i] - pulse.x, ry = data[i+1] - pulse.y;
          const distance = (rx*rx + ry*ry)/(radius*radius);
          if (distance >= 1) continue;
          const f = (1-distance)**2 * pulse.gain * (.52 + .73*depth);
          x += (.47*rx - .62*ry + pulse.dx*radius*.18) * f;
          y += (.47*ry + .62*rx + pulse.dy*radius*.18) * f;
        }
        const dx = x - data[i], dy = y - data[i+1];
        if (dx*dx + dy*dy > (radius*TRAVEL_KNEE)**2) {
          const distance = Math.hypot(dx, dy);
          const ratio = limitedTravel(distance, radius) / distance;
          x = data[i] + dx*ratio;
          y = data[i+1] + dy*ratio;
        }
        target.fillStyle = colors[i/6];
        target.beginPath();
        target.arc(x, y, sx*(.70 + .14*depth), 0, 2*Math.PI);
        target.fill();
      }
    }
  }
  return {
    rebuild(next, width, height, dpr, reach) {
      field = next;
      const { data } = field;
      const palette = new Map();
      colors = Array.from({ length: data.length/6 }, (_, index) => {
        const i = index*6;
        const r = Math.round(data[i+3]*255), g = Math.round(data[i+4]*255), b = Math.round(data[i+5]*255);
        const key = (r << 16) | (g << 8) | b;
        if (!palette.has(key)) palette.set(key, `rgb(${r},${g},${b})`);
        return palette.get(key);
      });
      scaleX = canvas.width / width;
      scaleY = canvas.height / height;
      radius = reach;
      dirty = undefined;
      cache.width = canvas.width;
      cache.height = canvas.height;
      cached.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      paint(cached, 0, 0, width, height, []);
      ctx.drawImage(cache, 0, 0);
    },
    draw(now, assembly, pulses, directions) {
      if (dirty) {
        const [x, y, w, h] = dirty;
        ctx.clearRect(x, y, w, h);
        ctx.drawImage(cache, x, y, w, h, x, y, w, h);
        dirty = undefined;
      }
      const active = [];
      let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
      for (let i = 0; i < PULSE_COUNT; i++) {
        const gain = pulseFalloff(0, now - pulses[i*4+2]) * pulses[i*4+3];
        if (!gain) continue;
        const x = pulses[i*4], y = pulses[i*4+1];
        active.push({ x, y, gain, dx: directions[i*2], dy: directions[i*2+1] });
        left = Math.min(left, x - radius);
        top = Math.min(top, y - radius);
        right = Math.max(right, x + radius);
        bottom = Math.max(bottom, y + radius);
      }
      if (!active.length) return;
      // Wake bounds describe original positions. Clear and restore all
      // pixels they can travel into, including the antialiased dot edge.
      const apron = radius * TRAVEL_LIMIT + field.sx + 2;
      const x = Math.max(0, Math.floor((left-apron)*scaleX));
      const y = Math.max(0, Math.floor((top-apron)*scaleY));
      const w = Math.min(canvas.width, Math.ceil((right+apron)*scaleX)) - x;
      const h = Math.min(canvas.height, Math.ceil((bottom+apron)*scaleY)) - y;
      dirty = [x,y,w,h];
      ctx.clearRect(x,y,w,h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x,y,w,h);
      ctx.clip();
      ctx.scale(scaleX,scaleY);
      paint(ctx, x/scaleX, y/scaleY, (x+w)/scaleX, (y+h)/scaleY, active);
      ctx.restore();
    },
    dispose() { cache.width = cache.height = 1; },
  };
}

export function mountParticlePortrait(root) {
  if (!root) return () => {};
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const source = root.querySelector('img');
  let canvas = root.querySelector('canvas');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = win.matchMedia('(pointer: coarse)');
  const controller = new win.AbortController();
  const listen = (node, event, fn) => node.addEventListener(event, fn, { passive: true, signal: controller.signal });
  const economy = win.navigator.connection?.saveData || (win.navigator.hardwareConcurrency || 4) <= 4;
  const pulses = new Float32Array(PULSE_COUNT * 4);
  const directions = new Float32Array(PULSE_COUNT * 2);
  const start = win.performance.now();
  const seconds = (time = win.performance.now()) => (time - start) / 1000;

  let renderer, backend, rect, touch, previous, lastSize;
  let bleed = 0;
  let frame = 0, lastDraw = 0, nextPulse = 0, end = 0, entrance = 0;
  let visible = !win.IntersectionObserver;
  let suspended = false, initialized = false, forceCanvas = false;
  let observer, resizeObserver;

  const canRender = () => visible && !doc.hidden && !suspended && !controller.signal.aborted;
  const canAnimate = () => canRender() && !reduced.matches;
  const state = value => { if (root.dataset.portraitState !== value) root.dataset.portraitState = value; };

  function request() {
    if (!frame && canAnimate()) frame = win.requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = 0;
    const now = seconds(time);
    if (!canAnimate()) return stop();
    if (now >= end) return stop();
    if (backend === 'canvas' && time - lastDraw < 29) return request();
    lastDraw = time;
    const remaining = entrance ? clamp((entrance - now) / ENTRANCE, 0, 1) : 0;
    renderer.draw(now, remaining * remaining, pulses, directions);
    request();
  }

  function stop() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = nextPulse = lastDraw = 0;
    rect = touch = previous = undefined;
    if (end && renderer) {
      pulses.fill(0);
      renderer.draw(seconds(), 0, pulses, directions);
      state('idle');
    }
    end = entrance = 0;
  }

  function useCanvas() {
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    backend = 'canvas';
    return makeCanvasRenderer(canvas, ctx);
  }

  function initialize() {
    // Reduced motion gets the same still reconstruction without a new GPU context.
    const gl = forceCanvas || reduced.matches ? null : canvas.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power',
    });
    if (gl) {
      try {
        const gpu = makeGpuRenderer(gl);
        backend = 'webgl';
        listen(canvas, 'webglcontextlost', () => {
          if (backend !== 'webgl') return;
          renderer = undefined;
          stop();
          forceCanvas = true;
          lastSize = undefined;
          delete root.dataset.portraitRenderer;
          rebuild();
        });
        return gpu;
      } catch {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    }
    return useCanvas();
  }

  function rebuild() {
    rect = undefined;
    if (!canRender() || !source.complete || !source.naturalWidth) return;
    const bounds = root.getBoundingClientRect();
    if (bounds.width < 2 || bounds.height < 2) return;
    const basic = economy || coarse.matches;
    const surface = portraitSurface(bounds.width, bounds.height,
      Math.min(win.devicePixelRatio || 1, basic ? 1.55 : 2));
    const signature = [bounds.width, bounds.height, surface.width, surface.height, basic].join(':');
    if (signature === lastSize && renderer) return;
    stop();
    renderer ??= initialize();
    if (!renderer) return;
    lastSize = signature;
    bleed = surface.bleed;
    root.style.setProperty('--portrait-bleed', bleed + 'px');
    canvas.width = surface.width;
    canvas.height = surface.height;
    const dpr = Math.min(surface.width / surface.outputWidth, surface.height / surface.outputHeight);
    const field = makeField(source, bounds.width, bounds.height, surface.bleed, basic, backend === 'canvas');
    renderer.rebuild(field, surface.outputWidth, surface.outputHeight, dpr, surface.radius);

    const now = seconds();
    const enter = !initialized && backend === 'webgl' && canAnimate();
    initialized = true;
    if (enter) entrance = end = now + ENTRANCE;
    renderer.draw(now, enter ? 1 : 0, pulses, directions);
    root.dataset.portraitRenderer = backend;
    root.dataset.portraitParticles = String(field.cols * field.rows);
    state(enter ? 'entrance' : 'idle');
    if (enter) request();
  }

  function disturb(event, strength) {
    if (!canAnimate() || !renderer) return;
    rect ??= root.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const now = seconds();
    const elapsed = previous ? now - previous.time : Infinity;
    const dx = previous ? x - previous.x : 0, dy = previous ? y - previous.y : 0;
    const travel = Math.hypot(dx, dy);
    if (x < 0 || y < 0 || x > rect.width || y > rect.height || elapsed < .070) return;
    const speed = elapsed < .18 ? Math.min(1, travel / (600 * elapsed)) : 0;
    if (previous && travel < 2 && elapsed < .17) return;
    previous = { x, y, time: now };
    const slot = nextPulse++ % PULSE_COUNT;
    pulses.set([x + bleed, y + bleed, now, strength * (.66 + .34 * speed)], slot * 4);
    directions.set(travel ? [dx / travel * speed, dy / travel * speed] : [0, 0], slot * 2);
    end = now + LIFETIME;
    state('active');
    request();
  }

  const release = () => { rect = touch = previous = undefined; };
  listen(root, 'pointerenter', e => {
    if (e.pointerType !== 'touch') disturb(e, .56);
  });
  listen(root, 'pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || !canAnimate()) return;
    if (e.pointerType !== 'touch') return disturb(e, 1);
    if ((win.visualViewport?.scale || 1) > 1.05) return;
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp, drag: false };
  });
  listen(root, 'pointermove', e => {
    if (!e.isPrimary) return;
    if (e.pointerType !== 'touch') return disturb(e, .86);
    if (touch?.id !== e.pointerId) return;
    const dx = Math.abs(e.clientX-touch.x), dy = Math.abs(e.clientY-touch.y);
    if (!touch.drag && dy >= 10 && dy >= dx*.8) return release();
    if (dx >= 12 && dx >= dy*1.5) touch.drag = true;
    if (touch.drag) disturb(e, .88);
  });
  listen(root, 'pointerup', e => {
    if (touch?.id !== e.pointerId) return;
    if (!touch.drag && e.timeStamp - touch.time < 440 && Math.hypot(e.clientX-touch.x, e.clientY-touch.y) < 10) {
      disturb(e, 1.2);
    }
    release();
  });
  listen(root, 'pointerleave', e => { if (e.pointerType !== 'touch') release(); });
  listen(root, 'pointercancel', release);
  listen(doc, 'pointerdown', e => { if (e.pointerType === 'touch' && !e.isPrimary) release(); });
  listen(win, 'scroll', release);
  listen(win, 'blur', release);
  listen(source, 'load', rebuild);
  listen(source, 'error', () => state('unavailable'));
  listen(win, 'resize', rebuild);
  listen(coarse, 'change', rebuild);

  function sync() {
    if (canRender()) rebuild();
    if (!canAnimate()) stop();
  }
  listen(reduced, 'change', sync);
  listen(doc, 'visibilitychange', sync);
  listen(win, 'pagehide', e => {
    suspended = true;
    if (e.persisted) sync();
    else dispose();
  });
  listen(win, 'pageshow', () => { suspended = false; sync(); });
  if (win.IntersectionObserver) {
    observer = new win.IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(root);
  }
  if (win.ResizeObserver) {
    resizeObserver = new win.ResizeObserver(rebuild);
    resizeObserver.observe(root);
  }
  sync();

  function dispose() {
    stop();
    controller.abort();
    observer?.disconnect();
    resizeObserver?.disconnect();
    renderer?.dispose();
    renderer = undefined;
    delete root.dataset.portraitRenderer;
    root.style.removeProperty('--portrait-bleed');
    canvas.width = canvas.height = 1;
  }
  return dispose;
}

if (typeof document !== 'undefined') mountParticlePortrait(document.querySelector('[data-particle-portrait]'));
