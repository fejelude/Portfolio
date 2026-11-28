// Each tap uses one small, reusable piece of artwork. The motion runs on
// transform and opacity and has no JavaScript render loop.
const targets = [
  ['#home .pixel-shortcut--profile', 'stars', '--shortcut-accent'],
  ['#home .pixel-shortcut--vault', 'signal', '--shortcut-accent'],
  ['#hero-terminal, #feje-pixel-companion, .feje-title-row', 'signal'],
  ['.collection-arrow, [data-collectible-choice], .world-stage:not([data-state="live"]) .world-viewport', 'garage', '--collection-accent'],
  ['.ix-cta, .ix-details summary, .iw-progress, .iw-intro-copy', 'stars'],
  ['.ft-astrolabe, .ft-stage[data-ft-mode="preview"]', 'dial'],
  ['.sofra-feature-mascot, .sofra-feature-primary', 'petals'],
  ['[data-about-ghost], .about-motto-row', 'hearts'],
  ['.rc-garage .rc-image-frame', 'film', '--rc-accent'],
  ['.rc-build .rc-image-frame', 'blocks', '--rc-accent'],
  ['[data-svc-wizard]', 'spell'],
  ['.svc-row--game', 'blocks', '--svc-accent'],
  ['.svc-row--model', 'dial', '--svc-accent'],
  ['.svc-row--web', 'signal', '--svc-accent'],
  ['#learning .bento-card', 'signal'],
  ['#goals .goal-achievement', 'seal', '--achievement-ink'],
  ['#contact .method-card', 'relay'],
  ['.footer-bottom', 'signoff'],
];
const allowed = targets.map(([selector]) => selector).join(',');
const protectedInput = 'input, textarea, select, [contenteditable], .ft-model, .about-particle-canvas, .world-canvas-host canvas';
const slopSquared = 100;
const tapLimit = 440;
const width = 64;
const height = 56;

// Duration in milliseconds, travel of the three small pixels in CSS pixels.
const effects = {
  signal: [280, [[-21, -7], [17, -15], [24, 3]]],
  garage: [330, [[-26, 0], [25, 0], [18, -9]]],
  stars: [440, [[-18, -18], [21, -16], [13, 15]]],
  dial: [410, [[-16, -16], [19, -14], [21, 7]]],
  petals: [480, [[-22, -18], [11, -23], [22, -3]]],
  hearts: [510, [[-20, -20], [2, -24], [22, -16]]],
  film: [340, [[-25, -8], [24, 7], [22, -13]]],
  blocks: [370, [[-15, -14], [16, -17], [22, 8]]],
  spell: [510, [[-17, -22], [19, -21], [25, -5]]],
  seal: [350, [[-17, -12], [21, -14], [19, 9]]],
  relay: [310, [[-20, 0], [19, -8], [23, 6]]],
  signoff: [480, [[-19, -12], [4, -20], [22, -10]]],
};
const runeMotion = {
  garage: ['scaleX(.42)', 'scaleX(1.04)', 'scaleX(1.22)'],
  dial: ['rotate(-26deg)', 'rotate(0deg)', 'rotate(18deg)'],
  petals: ['translateY(4px) scale(.72)', 'translateY(-2px) scale(1)', 'translateY(-8px) scale(.86)'],
  hearts: ['translateY(3px)', 'translateY(-1px)', 'translateY(-9px)'],
  spell: ['scale(.38) rotate(-12deg)', 'scale(1.16)', 'scale(.86) rotate(8deg)'],
};
const poses = {
  signal: ['.feje-pixel-art', -4],
  hearts: ['.about-ghost-sprite', -5],
  spell: ['svg', -6],
};
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

function withinTap(gesture, event) {
  return (event.clientX - gesture.x) ** 2 + (event.clientY - gesture.y) ** 2 <= slopSquared;
}

export function mountLivingMobile(doc = document, win = window) {
  const root = doc.body;
  const controller = new win.AbortController();
  const options = { capture: true, passive: true, signal: controller.signal };
  const small = (win.navigator.deviceMemory && win.navigator.deviceMemory <= 4) ||
    (win.navigator.hardwareConcurrency && win.navigator.hardwareConcurrency <= 4) ||
    win.navigator.connection?.saveData;
  let gesture, echo, marks, current;
  let suspended = false;

  root.dataset.livingMobile = '';

  function clear() {
    gesture = undefined;
    if (!current) return;
    for (const animation of current) animation.cancel();
    current = undefined;
    echo.hidden = true;
  }

  function makeEcho() {
    echo = doc.createElement('span');
    echo.className = 'mobile-echo';
    echo.setAttribute('aria-hidden', 'true');
    echo.hidden = true;
    marks = ['mobile-rune', 'mobile-pixel', 'mobile-pixel', 'mobile-pixel'].map(name => {
      const node = doc.createElement('i');
      node.className = name;
      echo.append(node);
      return node;
    });
    root.append(echo);
  }

  function respond({ host, effect, tint }, x, y) {
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height || x < box.left || x > box.right || y < box.top || y > box.bottom) return;
    clear();
    if (!echo) makeEcho();

    // Leave room for small controls and keep the entire mark inside the viewport.
    // The center is biased toward the exposed edge of the finger.
    const rightEdge = doc.documentElement.clientWidth - width - 2;
    const bottomEdge = win.innerHeight - height - 2;
    const lowX = clamp(box.left - 20, 2, rightEdge);
    const lowY = clamp(box.top - 22, 2, bottomEdge);
    const left = clamp(x - width / 2, lowX, Math.min(rightEdge, box.right + 20 - width));
    const top = clamp(y - height * .66, lowY, Math.min(bottomEdge, box.bottom + 22 - height));
    echo.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    const color = tint && win.getComputedStyle(host).getPropertyValue(tint).trim();
    echo.style.setProperty('--echo-tint', color || '');
    echo.dataset.mobileEffect = effect;
    echo.hidden = false;

    const [duration, vectors] = effects[effect];
    const animations = [];
    const [entry, peak, exit] = runeMotion[effect] ?? ['scale(.65)', 'scale(1)', 'scale(1.18)'];
    animations.push(marks[0].animate([
      { opacity: 0, transform: entry },
      { opacity: .94, transform: peak, offset: .22 },
      { opacity: 0, transform: exit },
    ], { duration, easing: 'cubic-bezier(.22,.7,.3,1)' }));

    for (const [i, [dx, dy]] of vectors.entries()) {
      if (small && i === 2) break;
      animations.push(marks[i + 1].animate([
        { opacity: 0, transform: 'translate(0, 0)' },
        { opacity: 1, transform: `translate(${dx * .72}px, ${dy * .64}px)`, offset: .46 },
        { opacity: 0, transform: `translate(${dx}px, ${dy}px)` },
      ], { duration, easing: 'steps(5, end)' }));
    }

    const pose = poses[effect];
    if (pose) {
      const character = host.querySelector(pose[0]);
      if (character) animations.push(character.animate([
        { translate: '0 0' }, { translate: `0 ${pose[1]}px`, offset: .37 }, { translate: '0 0' },
      ], { duration: duration - 15, easing: 'steps(4, end)' }));
    }
    current = animations;
    animations[0].finished.then(() => {
      if (current === animations) clear();
    }, () => {});
  }

  function down(event) {
    if (event.pointerType !== 'touch' || suspended || doc.hidden) return;
    gesture = undefined;
    if (!event.isPrimary) return clear();
    if (root.hasAttribute('data-motion-paused') || (win.visualViewport?.scale ?? 1) > 1.05) return;
    if (event.target.closest?.(protectedInput)) return;

    const host = event.target.closest?.(allowed);
    if (!host || host.closest('[data-rc-paused]')) return;
    const [, effect, tint] = targets.find(([selector]) => host.matches(selector));
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, host, effect, tint };
  }

  function move(event) {
    if (gesture?.id === event.pointerId && !withinTap(gesture, event)) gesture = undefined;
  }

  function up(event) {
    if (gesture?.id !== event.pointerId) return;
    const tap = gesture;
    gesture = undefined;
    if (withinTap(tap, event) && event.timeStamp - tap.time <= tapLimit && tap.host.isConnected &&
      !doc.getSelection()?.toString()) respond(tap, event.clientX, event.clientY);
  }

  doc.addEventListener('pointerdown', down, options);
  doc.addEventListener('pointermove', move, options);
  doc.addEventListener('pointerup', up, options);
  doc.addEventListener('pointercancel', clear, options);
  doc.addEventListener('visibilitychange', clear, options);
  win.addEventListener('scroll', clear, options);
  win.addEventListener('resize', clear, options);
  win.visualViewport?.addEventListener('resize', clear, options);
  win.addEventListener('pagehide', event => {
    suspended = true;
    clear();
    if (!event.persisted) dispose();
  }, options);
  win.addEventListener('pageshow', () => { suspended = false; }, options);

  function dispose() {
    controller.abort();
    clear();
    echo?.remove();
    delete root.dataset.livingMobile;
  }

  return dispose;
}
