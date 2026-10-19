// Decorative, silent scene. One bounded canvas; no timers or per-particle DOM.
export const MAX_SPARKS = 48;
export function flightPosition(time, phase, width, height) {
  const a = time * .105 + phase;
  return { x: width * (.5 + .46 * Math.sin(a)), y: height * (.46 + .39 * Math.sin(a * 1.7 + phase)) };
}

export function createScrapbookScene(canvas, toggle, dialog) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return { observeCards() {} };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let width = 1, height = 1, frame = 0, last = 0, time = 0, paused = false, away = false;
  let pointer = null, activeCard = null, observer;
  const sparks = [], seen = new WeakSet();
  const butterflies = Array.from({ length: 5 }, (_, i) => ({ phase: i * 2.39, size: 8 + i % 3 * 3 }));
  const canAnimate = () => !paused && !motion.matches && !document.hidden && !dialog.open && !away;
  toggle.hidden = false;

  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  function sparkle(x, y, count = 1) {
    if (!canAnimate()) return;
    for (let i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
      const angle = Math.random() * Math.PI * 2;
      sparks.push({ x, y, vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 16 - 8, life: 1, size: 1 + Math.random() * 2 });
    }
  }
  function star(x, y, size, alpha) {
    ctx.globalAlpha = alpha; ctx.fillStyle = '#ba759e';
    ctx.beginPath(); ctx.moveTo(x, y - size); ctx.quadraticCurveTo(x + size * .2, y - size * .2, x + size, y);
    ctx.quadraticCurveTo(x + size * .2, y + size * .2, x, y + size);
    ctx.quadraticCurveTo(x - size * .2, y + size * .2, x - size, y);
    ctx.quadraticCurveTo(x - size * .2, y - size * .2, x, y - size); ctx.fill();
  }
  function butterfly(b) {
    const p = flightPosition(time, b.phase, width, height);
    const next = flightPosition(time + .1, b.phase, width, height);
    if (pointer) {
      const dx = p.x - pointer.x, dy = p.y - pointer.y, distance = Math.hypot(dx, dy);
      if (distance < 120 && distance > 0) { p.x += dx / distance * (120 - distance) * .3; p.y += dy / distance * (120 - distance) * .3; }
    }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(next.y - p.y, next.x - p.x) + Math.PI / 2);
    const flap = .3 + Math.abs(Math.sin(time * 5 + b.phase)) * .7;
    ctx.scale(flap, 1); ctx.globalAlpha = .65;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side * b.size, b.size);
      ctx.fillStyle = b.phase % 2 > 1 ? '#d7c3eb' : '#f1b8ce'; ctx.strokeStyle = '#bb89aa'; ctx.lineWidth = .07;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(.3, -1.65, 1.7, -1.3, 1.15, -.2);
      ctx.bezierCurveTo(1.5, .75, .4, 1.1, 0, .2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(.08, .05); ctx.quadraticCurveTo(.6, -.65, 1, -.8); ctx.stroke();
      ctx.fillStyle = '#fff5ed'; ctx.beginPath(); ctx.arc(.85, -.6, .13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.scale(1 / flap, 1); ctx.strokeStyle = '#a26b8e'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 5); ctx.moveTo(0, -3); ctx.quadraticCurveTo(-5, -10, -4, -10);
    ctx.moveTo(0, -3); ctx.quadraticCurveTo(5, -10, 4, -10); ctx.stroke(); ctx.restore();
  }
  function plane() {
    const progress = (time * .022 + .18) % 1;
    const point = u => ({ x: -70 + (width + 140) * u, y: height * (.2 + .09 * Math.sin(u * 8)) });
    const p = point(progress), next = point(progress + .002);
    ctx.globalAlpha = .28; ctx.strokeStyle = '#bb8aaa'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]); ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const q = point(progress - .15 + i * .005); if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(next.y - p.y, next.x - p.x));
    ctx.globalAlpha = .75; ctx.fillStyle = '#fffaf5'; ctx.strokeStyle = '#c29bb8';
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-13, -12); ctx.lineTo(-6, 0); ctx.lineTo(-13, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(17, 0); ctx.lineTo(-13, 12); ctx.stroke(); ctx.restore();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < 22; i++) star(((i * 313 + 79) % 997) / 997 * width, ((i * 173 + 53) % 661) / 661 * height, 2 + i % 3, .12 + .12 * Math.sin(time + i) ** 2);
    for (const b of butterflies.slice(0, width < 600 ? 3 : 5)) butterfly(b);
    plane();
    for (const s of sparks) star(s.x, s.y, s.size, s.life * .6);
    ctx.globalAlpha = 1;
  }
  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now; time += dt;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life -= dt * .8; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life <= 0) sparks.splice(i, 1);
    }
    draw(); frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    const still = paused || motion.matches;
    document.body.classList.toggle('compendium--still', still);
    toggle.setAttribute('aria-pressed', String(still));
    toggle.textContent = motion.matches ? 'reduced motion on' : paused ? 'resume animations' : 'pause animations';
    toggle.disabled = motion.matches;
    if (!canAnimate()) { pointer = null; resetCard(); sparks.length = 0; draw(); }
    else frame = requestAnimationFrame(tick);
  }
  function resetCard() {
    if (activeCard) { activeCard.style.removeProperty('--lean-x'); activeCard.style.removeProperty('--lean-y'); }
    activeCard = null;
  }
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  motion.addEventListener('change', sync);
  fine.addEventListener('change', resetCard);
  document.addEventListener('visibilitychange', sync);
  new MutationObserver(sync).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  addEventListener('pagehide', () => { away = true; sync(); });
  addEventListener('pageshow', () => { away = false; sync(); });
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('pointermove', event => {
    if (!fine.matches || !canAnimate()) return;
    pointer = { x: event.clientX, y: event.clientY };
    const card = event.target.closest('.compendium__card');
    if (card !== activeCard) resetCard();
    if (card) {
      activeCard = card; const r = card.getBoundingClientRect();
      card.style.setProperty('--lean-x', `${((event.clientY - r.top) / r.height - .5) * -5}deg`);
      card.style.setProperty('--lean-y', `${((event.clientX - r.left) / r.width - .5) * 5}deg`);
    }
    if (sparks.length < 16) sparkle(event.clientX, event.clientY);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; resetCard(); });
  addEventListener('scroll', () => { pointer = null; resetCard(); }, { passive: true });
  resize(); sync();
  return {
    observeCards(cards) {
      if (!('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          if (!seen.has(entry.target)) { seen.add(entry.target); const r = entry.boundingClientRect; sparkle(r.left + r.width / 2, r.top, 8); }
          observer.unobserve(entry.target);
        }
      }, { threshold: .08 });
      for (const card of cards) observer.observe(card);
    },
  };
}
