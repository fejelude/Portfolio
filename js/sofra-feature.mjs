// A single short decorative hello on first view; static art without JavaScript.
const mascot = document.getElementById('sofra-feature-mascot');
if (mascot && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      mascot.classList.add('is-greeting');
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(mascot);
  } else {
    mascot.classList.add('is-greeting');
  }
}
