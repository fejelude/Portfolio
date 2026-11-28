// The landscape scrolls with the chapter. Only a small train sprite needs
// a clock, and only while its strip is visible in the foreground tab.
export function mountAboutTokyo(scene) {
  if (!scene) return () => {};
  const doc = scene.ownerDocument;
  const win = doc.defaultView;
  const track = scene.querySelector('.about-tokyo-track');
  if (!win.IntersectionObserver || !track) return () => {};

  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const lifecycle = new win.AbortController();
  const { signal } = lifecycle;
  let visible = false;
  let suspended = false;

  function sync() {
    scene.toggleAttribute('data-train-visible', visible && !doc.hidden && !suspended && !motion.matches);
  }

  const observer = new win.IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .6;
    sync();
  }, { threshold: .6 });
  observer.observe(track);

  function dispose() {
    lifecycle.abort();
    observer.disconnect();
    scene.removeAttribute('data-train-visible');
  }

  doc.addEventListener('visibilitychange', sync, { signal });
  motion.addEventListener('change', sync, { signal });
  win.addEventListener('pagehide', event => {
    if (!event.persisted) return dispose();
    suspended = true;
    sync();
  }, { signal });
  win.addEventListener('pageshow', () => { suspended = false; sync(); }, { signal });
  return dispose;
}

if (typeof document !== 'undefined') mountAboutTokyo(document.querySelector('[data-about-tokyo]'));
