// The letters are actual branches in the SVG, not a font or an overlaid label.
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
  const life = new AbortController(), options = { signal: life.signal };
  let frame = 0, away = false;
  const home = () => doc.body.classList.contains('birthday--home');
  function update() {
    frame = 0;
    if (doc.hidden || away || !home()) { tree.classList.remove('is-visible'); return; }
    const rect = tree.getBoundingClientRect();
    const p = motion.matches ? 1 : scrollProgress(rect.top, rect.height, win.innerHeight);
    tree.dataset.progress = p.toFixed(3);
    tree.classList.toggle('is-growing', !motion.matches);
    tree.classList.toggle('is-visible', rect.top < win.innerHeight && rect.bottom > 0);
    tree.classList.toggle('is-blooming', p > .78);
    for (const path of paths) {
      const amount = growth(p, +path.dataset.start, +path.dataset.end);
      path.style.strokeDashoffset = String(1 - amount);
      path.style.opacity = String(Math.min(1, amount * 20));
    }
    for (const flower of flowers) {
      const amount = growth(p, +flower.dataset.start, +flower.dataset.start + .1);
      flower.style.opacity = String(amount);
      // Scale the inner use so the parent SVG translation stays untouched.
      flower.firstElementChild.style.scale = String(.3 + .7 * amount);
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
