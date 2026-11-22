// Replay the short dance each time the mascot enters view. No user controls.
const mascot = document.getElementById('sofra-feature-mascot');
if (mascot) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = !('IntersectionObserver' in window);
  const sync = () => mascot.classList.toggle('is-greeting', inView && !document.hidden && !motion.matches);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.25 });
    observer.observe(mascot);
    window.addEventListener('pagehide', event => {
      if (!event.persisted) observer.disconnect();
    });
  }
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  sync();
}
