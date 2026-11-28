// Touch-only tablets participate at any width. Wide hybrids use the existing
// desktop system, while a compact hybrid can still respond to a finger.
const touch = matchMedia('(any-pointer: coarse)');
const desktop = matchMedia('(width > 900px) and (any-hover: hover) and (any-pointer: fine)');
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const eligible = () => touch.matches && !desktop.matches;
let resources;
let dispose;

function load() {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = new URL('../css/living-mobile.css', import.meta.url);
  const css = new Promise((resolve, reject) => {
    sheet.addEventListener('load', resolve, { once: true });
    sheet.addEventListener('error', reject, { once: true });
  });
  document.head.append(sheet);
  return Promise.all([css, import('./living-mobile.mjs')]).catch(() => {
    sheet.remove();
    resources = undefined;
    return [];
  });
}

async function sync() {
  document.body.toggleAttribute('data-mobile-touch', eligible());
  if (!eligible() || !motion.matches) {
    dispose?.();
    dispose = undefined;
    return;
  }
  const [, runtime] = await (resources ??= load());
  if (eligible() && motion.matches && runtime && !dispose) {
    dispose = runtime.mountLivingMobile();
  }
}
for (const media of [touch, desktop, motion]) media.addEventListener('change', sync);
sync();
