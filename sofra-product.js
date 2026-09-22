'use strict';
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = preference.matches;
const videos = [...document.querySelectorAll('video[data-motion]')];
const button = document.getElementById('motion-toggle');
function updateMotion() {
  videos.forEach((video) => {
    if (paused || document.hidden) video.pause();
    else video.play().catch(() => {});
  });
  button.textContent = paused ? 'Play animations' : 'Pause animations';
  button.setAttribute('aria-pressed', String(paused));
}
button.addEventListener('click', () => { paused = !paused; updateMotion(); });
preference.addEventListener('change', () => { paused = preference.matches; updateMotion(); });
document.addEventListener('visibilitychange', updateMotion);
updateMotion();
