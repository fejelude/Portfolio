// A single quiet reveal; the note stays readable without JS or observer support.
const note = document.getElementById('closing-note');
if (note && 'IntersectionObserver' in window) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const life = new AbortController(), options = { signal: life.signal };
  let revealed = false;
  const reveal = () => {
    revealed = true;
    note.classList.remove('is-waiting');
    observer.disconnect();
  };
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) reveal();
  }, { threshold: .1 });
  const observe = () => {
    if (revealed) return;
    if (motion.matches) { reveal(); return; }
    note.classList.add('is-waiting');
    observer.observe(note);
  };
  motion.addEventListener('change', observe, options);
  addEventListener('pageshow', observe, options);
  addEventListener('pagehide', event => {
    observer.disconnect();
    if (!event.persisted) life.abort();
  }, options);
  observe();
}
