// The existing scroll-grown tree frames a staged birthday dedication.
export const clamp = value => Math.max(0, Math.min(1, value));
export const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export function scrollProgress(top, height, viewportHeight) {
  return height > 60 ? clamp((viewportHeight - top - 60) / (height - 60)) : 1;
}
export function growth(progress, start, end) {
  return ease((progress - start) / (end - start));
}

export function initBlossom(doc = document, win = window) {
  const tree = doc.getElementById('birthday-blossom');
  if (!tree) return;
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const paths = [...tree.querySelectorAll('.birthday-blossom__grow')];
  const flowers = [...tree.querySelectorAll('.birthday-blossom__bloom')];
  const dedication = [...tree.querySelectorAll('.birthday-blossom__reveal')];
  const life = new AbortController(), options = { signal: life.signal };
  let frame = 0, away = false, completed = false;
  const home = () => doc.body.classList.contains('birthday--home');
  function update() {
    frame = 0;
    if (doc.hidden || away || !home()) { tree.classList.remove('is-visible'); return; }
    const rect = tree.getBoundingClientRect();
    const raw = motion.matches || completed ? 1 : scrollProgress(rect.top, rect.height, win.innerHeight);
    const p = raw >= .999 ? 1 : raw;
    if (p === 1) completed = true;
    tree.dataset.progress = p.toFixed(3);
    tree.classList.toggle('is-growing', !motion.matches);
    tree.classList.toggle('is-visible', rect.top < win.innerHeight && rect.bottom > 0);
    tree.classList.toggle('is-blooming', p > .94);
    for (const path of paths) {
      const amount = growth(p, +path.dataset.start, +path.dataset.end);
      path.style.strokeDashoffset = String(1 - amount);
      path.style.opacity = String(Math.min(1, amount * 20));
    }
    for (const flower of flowers) {
      const start = +flower.dataset.start;
      const bud = growth(p, start, start + .07);
      const bloom = growth(p, start + .07, +flower.dataset.end);
      flower.style.opacity = String(bud);
      const budShape = flower.querySelector('.birthday-blossom__bud');
      const petals = flower.querySelector('use');
      budShape.style.opacity = String(1 - bloom);
      petals.style.opacity = String(bloom);
      petals.style.scale = String(.35 + .65 * bloom);
    }
    for (const part of dedication) {
      const amount = growth(p, +part.dataset.start, +part.dataset.end);
      part.style.opacity = String(amount);
      part.style.translate = `0 ${(1 - amount) * 6}px`;
    }
  }
  function schedule() { if (!frame && !away) frame = win.requestAnimationFrame(update); }
  win.addEventListener('scroll', schedule, { ...options, passive: true });
  win.addEventListener('resize', schedule, { ...options, passive: true });
  motion.addEventListener('change', schedule, options);
  doc.addEventListener('visibilitychange', schedule, options);
  const observer = new win.MutationObserver(schedule);
  observer.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
  win.addEventListener('pagehide', event => {
    away = true; win.cancelAnimationFrame(frame); frame = 0; tree.classList.remove('is-visible');
    if (!event.persisted) { life.abort(); observer.disconnect(); }
  }, options);
  win.addEventListener('pageshow', () => { away = false; schedule(); }, options);
  update();
}

if (typeof document !== 'undefined') initBlossom();
