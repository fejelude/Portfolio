// One compositor-driven decoration at a time. Each host keeps its last
// position for the CSS fade-out. Artwork is allocated on first interaction.
const surfaces = [
  ['.feje-title-row', 'terminal', 'bottom'],
  ['#home .pixel-shortcut', 'shortcut', 'inside'],
  ['.desktop-nav-item', 'navigation', 'bottom'],
  ['.world-viewport', 'garage', 'top'],
  ['.ix-cta', 'constellation', 'inside'],
  ['.ft-top', 'engraving', 'bottom'],
  ['.ft-stage[data-ft-mode="preview"]', 'watch', 'inside'],
  ['.sofra-feature-mascot', 'petals', 'inside'],
  ['.profile-header', 'motto', 'bottom'],
  ['.rc-image-frame', 'preview', 'inside'],
  ['.svc-row', 'workbench', 'bottom'],
  ['#learning .bento-card', 'curriculum', 'top'],
  ['#goals .goal-item', 'milestone', 'bottom'],
  ['#contact .method-card', 'contact', 'top'],
  ['.iw-card .iw-art-stage', 'world', 'inside'],
  ['.iw-progress', 'progress', 'top'],
];
const selectors = surfaces.map(([selector]) => selector).join(',');
const updateInterval = 1000 / 30;

export function mountLivingDesktop(doc = document, win = window) {
  const root = doc.body;
  const controller = new win.AbortController();
  const { signal } = controller;
  const listenerOptions = { passive: true, signal };
  const decorations = new Map();
  const resizer = win.ResizeObserver ? new win.ResizeObserver(([entry]) => {
    if (entry.target !== active?.host) return;
    const bounds = active.host.getBoundingClientRect();
    if (bounds.width !== active.bounds.width || bounds.height !== active.bounds.height) clear();
  }) : null;
  const viewport = win.IntersectionObserver ? new win.IntersectionObserver(onVisibility) : null;
  let frame = 0;
  let latest;
  let active;
  let previousTime = 0;
  let suspended = false;

  root.dataset.livingDesktop = '';

  function onVisibility([entry]) {
    if (entry.target === active?.host && !entry.isIntersecting) clear();
  }

  function deactivate() {
    if (!active) return;
    active.art.removeAttribute('data-lit');
    resizer?.unobserve(active.host);
    viewport?.unobserve(active.host);
    active = undefined;
    previousTime = 0;
  }

  function clear() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    latest = undefined;
    deactivate();
  }

  function rest() {
    clear();
    delete root.dataset.livingMouse;
  }

  function decorationFor(host) {
    let decoration = decorations.get(host);
    if (decoration) return decoration;

    const [, effect, alignment] = surfaces.find(([selector]) => host.matches(selector));
    const art = doc.createElement('span');
    art.className = 'living-decoration';
    art.dataset.livingEffect = effect;
    art.setAttribute('aria-hidden', 'true');
    host.append(art);
    decoration = { host, art, alignment };
    decorations.set(host, decoration);
    return decoration;
  }

  function queue() {
    if (!frame) frame = win.requestAnimationFrame(paint);
  }

  function paint(now) {
    frame = 0;
    if (!latest || doc.hidden || suspended) return rest();
    const { target, clientX, clientY } = latest;
    const host = target.closest?.(selectors);
    if (!host?.isConnected || host.closest('[data-rc-paused]') ||
      host.matches('.sofra-feature-mascot[aria-pressed="true"]')) {
      latest = undefined;
      deactivate();
      return;
    }

    const entered = active?.host !== host;
    // Bound style writes. The compositor interpolates between pointer samples
    // and carries the last motion to rest without another JS frame.
    if (!entered && now - previousTime < updateInterval - 1) return queue();

    latest = undefined;
    if (entered) {
      deactivate();
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      active = decorationFor(host);
      active.bounds = bounds;
      // ResizeObserver emits once at registration. Compare to the cached box
      // before clearing so the first observation cannot interrupt an entry.
      resizer?.observe(host);
      viewport?.observe(host);
    }
    const { art, alignment, bounds } = active;
    const x = Math.min(bounds.width, Math.max(0, clientX - bounds.left));
    const y = alignment === 'top' ? 0 : alignment === 'bottom' ? bounds.height :
      Math.min(bounds.height, Math.max(0, clientY - bounds.top));
    const transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    if (art.style.transform !== transform) art.style.transform = transform;
    if (entered) art.dataset.lit = '';
    previousTime = now;
  }

  function move(event) {
    if (event.pointerType !== 'mouse' || doc.hidden || suspended) return;
    if (!root.hasAttribute('data-living-mouse')) root.dataset.livingMouse = '';
    if (event.buttons || root.hasAttribute('data-motion-paused')) return clear();
    latest = event;
    queue();
  }

  // Geometry is cached while the pointer stays on one surface. Any scrolling
  // gives the document atmosphere priority and ends the local reaction.
  doc.addEventListener('pointermove', move, listenerOptions);
  doc.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') clear();
    else rest();
  }, listenerOptions);
  doc.addEventListener('pointercancel', rest, listenerOptions);
  doc.addEventListener('pointerout', event => {
    if (!event.relatedTarget) rest();
  }, listenerOptions);
  doc.addEventListener('visibilitychange', rest, { signal });
  win.addEventListener('scroll', clear, listenerOptions);
  win.addEventListener('resize', clear, listenerOptions);
  win.addEventListener('blur', rest, listenerOptions);
  win.addEventListener('pagehide', event => {
    suspended = true;
    rest();
    if (!event.persisted) dispose();
  }, listenerOptions);
  win.addEventListener('pageshow', () => { suspended = false; }, listenerOptions);

  function dispose() {
    controller.abort();
    rest();
    resizer?.disconnect();
    viewport?.disconnect();
    for (const { art } of decorations.values()) art.remove();
    decorations.clear();
    delete root.dataset.livingDesktop;
  }

  return dispose;
}
