import {mountPixelShortcuts} from './pixel-shortcuts.mjs';
// One visually unframed mascot doubles as the accessible pause/resume control.
const companion = document.getElementById('feje-pixel-companion');
if (companion) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = !('IntersectionObserver' in window);
  let paused = false;
  const controller = new AbortController();
  const { signal } = controller;
  const sync = () => {
    const motionAllowed = !reduced.matches;
    companion.disabled = !motionAllowed;
    companion.setAttribute('aria-pressed', String(paused));
    companion.classList.toggle('is-enhanced', motionAllowed);
    companion.classList.toggle('is-running', motionAllowed && visible && !paused && !document.hidden);
  };
  companion.addEventListener('click', () => { paused = !paused; sync(); }, { signal });
  document.addEventListener('visibilitychange', sync, { signal });
  reduced.addEventListener('change', sync, { signal });
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: .15 });
    observer.observe(companion);
  }
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { observer?.disconnect(); controller.abort(); }
  }, { signal });
  window.addEventListener('pageshow', sync, { signal });
  sync();
}

mountPixelShortcuts();
