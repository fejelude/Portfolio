(() => {
  const portrait = document.querySelector('.product-portrait video');
  const playback = document.getElementById('motion-toggle');
  const status = document.getElementById('portrait-status');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

  playback.disabled = false;
  playback.addEventListener('click', async () => {
    if (!portrait.paused) {
      portrait.pause();
      return;
    }
    status.hidden = true;
    try {
      await portrait.play();
    } catch (error) {
      if (error.name === 'AbortError') return;
      status.textContent = 'The animation could not play. Try again.';
      status.hidden = false;
    }
  });
  portrait.addEventListener('play', () => { playback.textContent = 'Pause portrait animation'; });
  portrait.addEventListener('pause', () => { playback.textContent = 'Play portrait animation'; });
  preference.addEventListener('change', () => { if (preference.matches) portrait.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) portrait.pause(); });
})();
