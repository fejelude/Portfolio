/* A short, audio-clocked party. No dependencies, navigation, or persistent styles. */
(() => {
  'use strict';
  const trigger = document.getElementById('surprise-trigger');
  const assets = window.FejeSurpriseAssets;
  if (!trigger || !assets?.tracks?.length) return;
  const status = document.getElementById('surprise-status');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = matchMedia('(pointer: coarse)');
  const audio = new Audio();
  audio.preload = 'auto';
  let active = null;
  let previousTrack = -1;
  let nextTrack = 0;
  let warmed = false;
  let deck = [];
  const cache = new Map();
  const words = ['KAWAII!! ♡', 'YIPPEEEE', 'hehe :3', '♡♡♡', 'SURPRISE!!', 'WAHHH'];
  const colors = ['#ff8fcb', '#ffcee9', '#d0a5ff', '#99e6ff', '#fff2ba', '#ffffff'];
  const random = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  function warmImage(src) {
    if (cache.has(src)) return;
    const img = new Image();
    img.src = src;
    if (img.decode) img.decode().catch(() => {});
    cache.set(src, img);
  }
  function pickNext() {
    const choices = assets.tracks.map((_, i) => i).filter(i => i !== previousTrack);
    nextTrack = choices[Math.floor(Math.random() * choices.length)] ?? 0;
    audio.src = assets.tracks[nextTrack].src;
    if (warmed) audio.load();
  }
  function warm() {
    if (warmed) return;
    warmed = true;
    audio.load();
    warmImage(assets.hero);
    assets.images.forEach(({src}) => warmImage(src));
  }
  function drawImageCard(src, parent, className) {
    const img = document.createElement('img');
    img.className = className;
    img.src = src;
    img.alt = '';
    img.draggable = false;
    // A failed decorative image must never leave a broken-image icon.
    img.addEventListener('error', () => img.remove(), { once: true });
    parent.append(img);
    return img;
  }
  function node(tag, className, parent, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text) el.textContent = text;
    parent.append(el);
    return el;
  }
  function animate(run, element, frames, options) {
    if (typeof element.animate !== 'function') return null;
    const animation = element.animate(frames, options);
    run.animations.add(animation);
    animation.onfinish = () => run.animations.delete(animation);
    return animation;
  }
  function finish(announce = true) {
    const run = active;
    if (!run) return;
    active = null;
    cancelAnimationFrame(run.raf);
    run.abort.abort();
    run.animations.forEach(a => a.cancel());
    const returnFocus = run.controls.contains(document.activeElement);
    run.overlay.remove();
    document.body.classList.remove('kawaii-active');
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    trigger.removeAttribute('aria-disabled');
    trigger.removeAttribute('aria-busy');
    if (announce) status.textContent = 'hehe you found it ♡ Click again for another surprise.';
    if (returnFocus) trigger.focus({ preventScroll: true });
    previousTrack = run.trackIndex;
    pickNext();
  }
  function start() {
    if (active) return;
    warm();
    const track = assets.tracks[nextTrack];
    // Keep play() in the actual click call stack: never await asset preparation here.
    audio.currentTime = 0;
    audio.muted = false;
    let playResult;
    try { playResult = audio.play(); } catch (_) { playResult = Promise.reject(_); }
    const reduced = motion.matches;
    const mobile = touch.matches || innerWidth < 700;
    const overlay = node('div', 'kawaii-world', document.body);
    overlay.dataset.reduced = String(reduced);
    overlay.dataset.variant = String(nextTrack);
    const light = node('div', 'kawaii-light', overlay);
    light.setAttribute('aria-hidden', 'true');
    const canvas = node('canvas', 'kawaii-canvas', overlay);
    canvas.setAttribute('aria-hidden', 'true');
    const stickers = node('div', 'kawaii-stickers', overlay);
    stickers.setAttribute('aria-hidden', 'true');
    const burst = node('div', 'kawaii-burst', overlay);
    burst.setAttribute('aria-hidden', 'true');
    const ring = node('div', 'kawaii-ring', overlay);
    ring.setAttribute('aria-hidden', 'true');
    const reveal = node('div', 'kawaii-reveal', overlay);
    reveal.setAttribute('aria-hidden', 'true');
    const heroWrap = node('div', 'kawaii-hero-wrap', reveal);
    drawImageCard(assets.hero, heroWrap, 'kawaii-hero');
    node('h2', '', reveal, 'SURPRISEEE!! 💖');
    node('p', '', reveal, 'hehe you found it ♡');
    const controls = node('div', 'kawaii-controls', overlay);
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Surprise controls');
    const time = node('span', 'kawaii-time', controls, '♡');
    time.setAttribute('aria-hidden', 'true');
    const mute = node('button', '', controls, 'Mute');
    mute.type = 'button';
    mute.setAttribute('aria-pressed', 'false');
    const close = node('button', '', controls, 'End ✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'End surprise');
    const now = performance.now();
    const run = active = {
      overlay, controls, canvas, stickers, reveal, heroWrap, burst, ring, reduced, mobile,
      track, trackIndex: nextTrack, duration: track.duration, ctx: canvas.getContext('2d'),
      abort: new AbortController(), animations: new Set(), particles: [], cards: [],
      raf: 0, born: now, lastFrame: now, lastAdvance: now, lastAudio: 0,
      elapsed: 0, clock: 'pending', silentStart: now, silentOffset: 0,
      lastSpawn: 0, lastSticker: -1, lastWord: 0, lastTrail: 0,
      cue: 0, variant: nextTrack, cardCap: mobile ? 10 : 20,
      revealed: false, cap: reduced ? 12 : mobile ? 72 : 150,
      width: innerWidth, height: innerHeight, slowFrames: 0, hadControlFocus: false,
    };
    trigger.setAttribute('aria-disabled', 'true');
    trigger.setAttribute('aria-busy', 'true');
    document.body.classList.add('kawaii-active');
    status.textContent = 'Surprise started. Use Mute or End to control it.';
    const signal = run.abort.signal;
    function silent() {
      if (active !== run || run.clock === 'silent') return;
      audio.pause();
      run.clock = 'silent';
      run.silentOffset = run.elapsed;
      run.silentStart = performance.now();
      mute.textContent = 'Sound unavailable';
      mute.disabled = true;
      status.textContent = 'Sound could not play. The visual surprise will continue.';
    }
    Promise.resolve(playResult).then(() => {
      if (active !== run || run.clock === 'silent') return;
      run.clock = 'audio';
      run.lastAdvance = performance.now();
      if (Number.isFinite(audio.duration) && audio.duration > 0) run.duration = audio.duration;
    }).catch(silent);
    audio.addEventListener('error', silent, { signal });
    // Playback ending and the animation clock share the same cleanup path.
    audio.addEventListener('ended', () => { if (active === run) finish(); }, { signal });
    mute.addEventListener('click', () => {
      audio.muted = !audio.muted;
      mute.textContent = audio.muted ? 'Unmute' : 'Mute';
      mute.setAttribute('aria-pressed', String(audio.muted));
    }, { signal });
    close.addEventListener('click', () => finish(), { signal });
    controls.addEventListener('focusin', () => { run.hadControlFocus = true; }, { signal });
    controls.addEventListener('focusout', () => { run.hadControlFocus = false; }, { signal });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') finish(); }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) finish(false); }, { signal });
    window.addEventListener('pagehide', () => finish(false), { signal });
    window.addEventListener('resize', () => resize(run), { signal, passive: true });
    window.visualViewport?.addEventListener('resize', () => resize(run), { signal, passive: true });
    window.addEventListener('pointermove', e => {
      if (run.reduced || performance.now() - run.lastTrail < 55 || run.elapsed > run.duration - 2) return;
      run.lastTrail = performance.now();
      emit(run, e.clientX, e.clientY, 2, 'trail');
    }, { signal, passive: true });
    resize(run);
    const rect = trigger.getBoundingClientRect();
    emit(run, rect.left + rect.width / 2, rect.top + rect.height / 2, reduced ? 8 : mobile ? 30 : 50, 'burst');
    if (!reduced) animate(run, trigger, [
      { transform: 'scale(1)' }, { transform: 'scale(.9, 1.08)' },
      { transform: 'scale(1.08, .96)' }, { transform: 'scale(1)' },
    ], { duration: 460, easing: 'ease-out' });
    function frame(timestamp) {
      if (active !== run) return;
      const dt = Math.min((timestamp - run.lastFrame) / 1000, .05);
      if (timestamp - run.lastFrame > 30) run.slowFrames++;
      else run.slowFrames = Math.max(0, run.slowFrames - 1);
      if (run.slowFrames > 35) { run.cap = Math.max(run.reduced ? 12 : 30, Math.floor(run.cap * .8)); run.cardCap = Math.max(4, run.cardCap - 2); run.slowFrames = 0; }
      run.lastFrame = timestamp;
      if (run.clock === 'audio') {
        const current = audio.currentTime;
        if (current > run.lastAudio + .001) { run.lastAdvance = timestamp; run.lastAudio = current; }
        run.elapsed = current;
        if (timestamp - run.lastAdvance > 3000) silent();
      } else if (run.clock === 'pending') {
        if (timestamp - run.born > 4000) silent();
      }
      if (run.clock === 'silent') run.elapsed = run.silentOffset + (timestamp - run.silentStart) / 1000;
      const t = run.elapsed;
      if (t >= run.duration) { finish(); return; }
      const fade = clamp((run.duration - t) / 2.1);
      const intensity = (run.reduced ? .3 : clamp(t / 4, .1, 1)) * fade;
      overlay.style.setProperty('--intensity', intensity.toFixed(3));
      overlay.style.setProperty('--fade', fade.toFixed(3));
      time.textContent = run.clock === 'pending' ? '♡' : `${Math.ceil(run.duration - t)}s ♡`;
      if (run.clock !== 'pending' && !run.reduced && t < run.duration - 2.6) {
        if (t - run.lastSpawn > .13) {
          run.lastSpawn = t;
          emit(run, random(0, run.width), random(run.height * .35, run.height + 25), t < 3 ? 2 : 4, 'float');
          if (t > 3 && Math.random() < .075) emit(run, -80, random(run.height * .15, run.height * .8), 1, 'giant');
        }
        if (t > .8 && t - run.lastSticker > (run.revealed ? (mobile ? .42 : .22) : .8)) { run.lastSticker = t; sticker(run); }
        if (t > 3 && t - run.lastWord > 2.1) { run.lastWord = t; word(run); }
      }
      if (!run.revealed && run.clock !== 'pending' && t >= track.reveal) revealPeak(run);
      // All visual hits use the same media clock as the pre-mixed sound effect.
      // Consume skipped cues once after a delayed frame; never catch up in a storm.
      const cues = assets.impactCues || [0];
      let hit = false;
      while (run.revealed && run.cue < cues.length && t >= track.reveal + cues[run.cue]) {
        run.cue++; hit = true;
      }
      if (hit && !run.reduced && t < run.duration - .8) celebrate(run);
      draw(run, dt);
      run.raf = requestAnimationFrame(frame);
    }
    run.raf = requestAnimationFrame(frame);
  }
  function resize(run) {
    const v = window.visualViewport;
    run.width = Math.round(v?.width || innerWidth);
    run.height = Math.round(v?.height || innerHeight);
    const dpr = Math.min(devicePixelRatio || 1, run.mobile ? 1.5 : 2);
    run.canvas.width = Math.round(run.width * dpr);
    run.canvas.height = Math.round(run.height * dpr);
    if (run.ctx) run.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function emit(run, x, y, count, mode) {
    if (!run.ctx) return;
    for (let i = 0; i < count && run.particles.length < run.cap; i++) {
      const angle = random(-Math.PI, Math.PI);
      const speed = random(60, 270);
      const type = mode === 'giant' ? 'heart' : ['heart', 'heart', 'star', 'confetti', 'petal'][Math.floor(random(0, 5))];
      run.particles.push({
        x, y, vx: mode === 'burst' ? Math.cos(angle) * speed : mode === 'giant' ? run.width / 1.8 : random(-45, 45),
        vy: mode === 'burst' ? Math.sin(angle) * speed - 50 : mode === 'giant' ? -45 : random(-80, -170),
        size: mode === 'giant' ? random(85, 140) : mode === 'trail' ? random(5, 12) : random(6, 23),
        life: 0, ttl: run.reduced ? 3 : mode === 'burst' ? random(1, 2.5) : mode === 'trail' ? .7 : mode === 'giant' ? 2.4 : random(3, 6),
        spin: random(-2.5, 2.5), angle: random(0, 6.28), color: colors[Math.floor(random(0, colors.length))],
        alpha: random(.4, .95), phase: random(0, 6.28), type, mode,
      });
    }
  }
  function draw(run, dt) {
    const c = run.ctx;
    if (!c) return;
    c.clearRect(0, 0, run.width, run.height);
    run.particles = run.particles.filter(p => p.life < p.ttl);
    for (const p of run.particles) {
      p.life += dt;
      if (!run.reduced) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.angle += p.spin * dt;
        if (p.mode === 'firework') { p.vy += 100 * dt; p.vx *= Math.exp(-.8 * dt); }
      }
      const wave = run.reduced || p.mode === 'firework' ? 0 : Math.sin(p.life * 2 + p.phase) * 13;
      c.save(); c.translate(p.x + wave, p.y); c.rotate(run.reduced ? 0 : p.angle); c.scale(p.size, p.size);
      c.globalAlpha = p.alpha * clamp((p.ttl - p.life) / .7);
      c.fillStyle = p.color;
      // Only a few foreground hearts use blur; never blur the entire page.
      if (p.mode === 'giant') { c.globalAlpha *= .4; if ('filter' in c) c.filter = 'blur(2px)'; }
      c.beginPath();
      if (p.type === 'spark') { c.arc(0, 0, .65, 0, Math.PI * 2);
      } else if (p.type === 'heart') {
        c.moveTo(0, .7); c.bezierCurveTo(-1.3, -.05, -.8, -1, 0, -.42); c.bezierCurveTo(.8, -1, 1.3, -.05, 0, .7);
      } else if (p.type === 'star') {
        c.moveTo(0, -1); c.quadraticCurveTo(.15, -.15, .8, 0); c.quadraticCurveTo(.15, .15, 0, 1); c.quadraticCurveTo(-.15, .15, -.8, 0); c.quadraticCurveTo(-.15, -.15, 0, -1);
      } else if (p.type === 'petal') {
        c.moveTo(0, -.7); c.bezierCurveTo(1, -.5, .7, .7, 0, .65); c.bezierCurveTo(-.7, .4, -.3, -.3, 0, -.7);
      } else c.rect(-.25, -.6, .5, 1.2);
      c.fill(); c.restore();
    }
  }
  function nextImage() {
    if (!deck.length) deck = shuffle(assets.images.map(i => i.src).filter(src => src !== assets.hero));
    return deck.pop();
  }
  function sticker(run) {
    run.cards = run.cards.filter(c => c.isConnected);
    if (run.cards.length >= run.cardCap) return;
    const img = drawImageCard(nextImage(), run.stickers, 'kawaii-sticker');
    run.cards.push(img);
    const size = clamp(run.width * .1, 66, 126) + 8;
    const left = Math.random() < .5;
    const x = left ? random(12, run.width * .18) : random(run.width * .75, run.width - size - 12);
    const y = random(90, Math.max(100, run.height - size - 55));
    const rotate = random(-28, 28);
    // Four motion families: radial blast, confetti rain, crossfire and fountain.
    if (run.revealed) {
      const variant = run.variant;
      const angle = random(0, Math.PI * 2);
      const radius = Math.max(run.width, run.height) * .65;
      let sx = run.width / 2 - size / 2, sy = run.height / 2 - size / 2;
      let ex = sx + Math.cos(angle) * radius, ey = sy + Math.sin(angle) * radius;
      if (variant === 1) { sx = random(0, run.width - size); sy = -size; ex = sx + random(-120, 120); ey = run.height + size; }
      if (variant === 2) { sx = left ? -size : run.width; sy = random(90, run.height - size); ex = left ? run.width : -size; ey = sy + random(-180, 180); }
      if (variant === 3) { sx = random(0, run.width - size); sy = run.height; ex = sx + random(-180, 180); ey = -size; }
      const a = animate(run, img, [
        { transform: `translate(${sx}px, ${sy}px) rotate(${rotate}deg) scale(.3)`, opacity: 0 },
        { transform: `translate(${sx + (ex-sx)*.22}px, ${sy + (ey-sy)*.22}px) rotate(${-rotate}deg) scale(1.15)`, opacity: 1, offset: .2 },
        { transform: `translate(${sx + (ex-sx)*.75}px, ${sy + (ey-sy)*.75}px) rotate(${rotate*2}deg) scale(1)`, opacity: 1, offset: .75 },
        { transform: `translate(${ex}px, ${ey}px) rotate(${rotate*3}deg) scale(.65)`, opacity: 0 },
      ], { duration: random(1800, 2900), easing: 'linear' });
      if (a) a.onfinish = () => { run.animations.delete(a); img.remove(); }; else img.remove();
      return;
    }
    const a = animate(run, img, [
      { transform: `translate(${x}px, ${y + 65}px) rotate(${rotate - 15}deg) scale(.2)`, opacity: 0 },
      { transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(1.08)`, opacity: 1, offset: .18 },
      { transform: `translate(${x + (left ? 8 : -8)}px, ${y - 20}px) rotate(${rotate + 7}deg) scale(1)`, opacity: 1, offset: .68 },
      { transform: `translate(${x}px, ${y - 90}px) rotate(${rotate - 10}deg) scale(.8)`, opacity: 0 },
    ], { duration: random(2500, 3500), easing: 'ease-in-out' });
    if (a) a.onfinish = () => { run.animations.delete(a); img.remove(); };
    else img.remove();
  }
  function word(run) {
    const el = node('span', 'kawaii-word', run.stickers, words[Math.floor(random(0, words.length))]);
    const x = random(16, Math.max(17, run.width - 220));
    const y = Math.random() < .5 ? random(85, run.height * .22) : random(run.height * .78, run.height - 45);
    const a = animate(run, el, [
      { transform: `translate(${x}px, ${y}px) scale(.4) rotate(-12deg)`, opacity: 0 },
      { transform: `translate(${x}px, ${y - 12}px) scale(1.1) rotate(5deg)`, opacity: 1, offset: .22 },
      { transform: `translate(${x}px, ${y - 35}px) scale(1) rotate(-4deg)`, opacity: 0 },
    ], { duration: 1800, easing: 'ease-out' });
    if (a) a.onfinish = () => { run.animations.delete(a); el.remove(); }; else el.remove();
  }
  function celebrate(run) {
    const count = run.mobile ? 22 : 36;
    // Reclaim old confetti before adding sparks; the total stays inside the budget.
    run.particles.splice(0, Math.max(0, run.particles.length + count * 2 - run.cap));
    for (let side = 0; side < 2; side++) {
      const x = run.width * (side ? random(.68, .9) : random(.1, .32));
      const y = run.height * random(.18, .6);
      for (let i = 0; i < count && run.particles.length < run.cap; i++) {
        const angle = i / count * Math.PI * 2;
        const speed = random(95, run.mobile ? 200 : 290);
        run.particles.push({x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
          size: random(2, 4), life: 0, ttl: random(.8, 1.6), spin: 0, angle: 0,
          color: colors[(i + run.variant) % colors.length], alpha: 1, phase: 0,
          type: 'spark', mode: 'firework'});
      }
    }
    for (let i = 0; i < (run.mobile ? 3 : 6); i++) sticker(run);
    if (run.cue % 3 === 1) word(run);
    // Pulse just the artwork, never the full-screen backdrop.
    if (run.elapsed > run.track.reveal + .85) animate(run, run.heroWrap, [
      { transform: 'scale(1)' }, { transform: 'scale(1.055)', offset: .25 }, { transform: 'scale(1)' },
    ], { duration: 360, easing: 'ease-out' });
  }
  function revealPeak(run) {
    run.revealed = true;
    run.reveal.style.visibility = 'visible';
    run.reveal.style.opacity = 'var(--fade)';
    status.textContent = 'SURPRISEEE! hehe you found it ♡';
    if (run.reduced) {
      animate(run, run.heroWrap, [{ opacity: 0 }, { opacity: 1 }], { duration: 650 });
      return;
    }
    // Make room for a finite peak burst without exceeding the particle budget.
    run.particles.splice(0, Math.min(run.particles.length, Math.floor(run.cap * .35)));
    emit(run, run.width / 2, run.height / 2, Math.floor(run.cap * .35), 'burst');
    animate(run, run.heroWrap, [
      { transform: 'scale(.8) rotate(-7deg)', opacity: 1 },
      { transform: 'scale(1.09) rotate(2deg)', opacity: 1, offset: .55 },
      { transform: 'scale(.97) rotate(-1deg)', opacity: 1, offset: .78 },
      { transform: 'scale(1)', opacity: 1 },
    ], { duration: 850, easing: 'cubic-bezier(.18,.7,.25,1)' });
    animate(run, run.burst, [{ opacity: 0 }, { opacity: .9, offset: .15 }, { opacity: 0 }], { duration: 1300 });
    animate(run, run.ring, [{ transform: 'scale(.2)', opacity: .9 }, { transform: 'scale(9)', opacity: 0 }], { duration: 1100, easing: 'ease-out' });
    animate(run, run.canvas, [{ transform: 'translate(0)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(0)' }], { duration: 240 });
  }
  trigger.addEventListener('click', start);
  trigger.addEventListener('pointerenter', warm, { once: true });
  trigger.addEventListener('focus', warm, { once: true });
  // Near-viewport preparation does not delay the initial portfolio render.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { warm(); observer.disconnect(); }
    }, { rootMargin: '600px' });
    observer.observe(trigger);
  }
  const onMotionChange = () => { if (active) finish(); };
  if (motion.addEventListener) motion.addEventListener('change', onMotionChange);
  else motion.addListener(onMotionChange);
  pickNext();
})();
