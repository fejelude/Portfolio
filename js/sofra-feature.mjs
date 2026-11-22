// Autoplay while in view, with no visible extra motion UI. The art itself
// is a keyboard/touch pause control for the indefinite decorative loop.
const mascot = document.getElementById('sofra-feature-mascot');
if (mascot) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = !('IntersectionObserver' in window);
  let paused = false;
  const controller = new AbortController();
  const { signal } = controller;
  const sync = () => {
    mascot.disabled = motion.matches;
    mascot.setAttribute('aria-pressed', String(paused));
    mascot.classList.toggle('is-enhanced', !motion.matches);
    mascot.classList.toggle('is-running', !motion.matches && visible && !paused && !document.hidden);
  };
  mascot.addEventListener('click', () => { paused = !paused; sync(); }, { signal });
  document.addEventListener('visibilitychange', sync, { signal });
  motion.addEventListener('change', sync, { signal });
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: .15 });
    observer.observe(mascot);
  }
  window.addEventListener('pagehide', event => {
    if (!event.persisted) { observer?.disconnect(); controller.abort(); }
  }, { signal });
  window.addEventListener('pageshow', sync, { signal });
  sync();
}
