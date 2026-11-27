// Keep the interaction module and its artwork off touch-only and reduced-motion pages.
const desktop = matchMedia('(width > 900px) and (any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)');
let resources;
let dispose;

function load() {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = new URL('../css/living-desktop.css', import.meta.url);
  sheet.media = desktop.media;

  const css = new Promise((resolve, reject) => {
    sheet.addEventListener('load', resolve, { once: true });
    sheet.addEventListener('error', reject, { once: true });
  });
  document.head.append(sheet);

  return Promise.all([css, import('./living-desktop.mjs')]).catch(() => {
    sheet.remove();
    resources = undefined;
    return [];
  });
}

async function sync() {
  if (!desktop.matches) {
    dispose?.();
    dispose = undefined;
    return;
  }

  const [, runtime] = await (resources ??= load());
  if (desktop.matches && runtime && !dispose) dispose = runtime.mountLivingDesktop();
}

desktop.addEventListener('change', sync);
sync();
