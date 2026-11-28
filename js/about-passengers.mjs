// [atlas column, hold time in ms]. Long holds cost no frames or timers between cels.
const blink = [[0, 1800], [1, 110], [0, 1500]];
const courier = [[2, 115], [3, 210], [4, 130]];
const archivist = [[2, 130], [3, 240], [4, 145], [3, 175], [2, 140]];
const attendant = [[2, 150], [3, 235], [4, 190]];
const gestures = [courier, archivist, attendant];
const exit = [[5, 80], [6, 80], [7, 90], [8, 90]];
const entry = [[8, 90], [7, 90], [6, 80], [5, 80]];
const tapDistance = 10;

export function mountAboutPassengers(root, win = root?.ownerDocument.defaultView) {
  if (!root || !win?.IntersectionObserver) return () => {};
  const doc = root.ownerDocument;
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const life = new win.AbortController();
  const options = { passive: true, signal: life.signal };
  let loaded = false, near = false, visible = false, suspended = false;
  let timer, touch, run, frame = 0, row = 0, reacting = false, activatedAt = -Infinity;
  let remaining = 0, deadline = 0;

  function paint(column) {
    root.style.backgroundPosition = `${column * 12.5}% ${row * 50}%`;
    root.dataset.passengerRow = String(row);
    root.dataset.passengerCel = String(column);
  }

  const playing = () => visible && loaded && !doc.hidden && !suspended && !motion.matches;
  const pose = () => [...entry, ...blink, ...gestures[row], [0, 2000], ...exit];
  function queue(delay) {
    remaining = delay;
    deadline = win.performance.now() + delay;
    timer = win.setTimeout(advance, delay);
  }

  function advance() {
    timer = undefined;
    if (!playing()) return;
    if (frame === run.length) {
      if (!reacting) row = (row + 1) % gestures.length;
      frame = 0;
      // A reaction returns the same passenger to its idle pose.
      run = reacting ? pose().slice(entry.length) : pose();
      reacting = false;
    }
    const [cel, hold] = run[frame++];
    paint(cel);
    queue(hold);
  }

  function sync() {
    if (!playing()) {
      if (timer !== undefined) {
        remaining = Math.max(0, deadline - win.performance.now());
        win.clearTimeout(timer);
        timer = undefined;
      }
      touch = undefined;
      if (motion.matches && loaded) {
        row = 0;
        run = undefined;
        reacting = false;
        paint(0);
      }
      return;
    }
    if (timer !== undefined) return;
    if (run) queue(remaining);
    else {
      run = pose();
      frame = 0;
      advance();
    }
  }

  const preload = new win.IntersectionObserver(([event]) => {
    if (!event.isIntersecting || near) return;
    near = true;
    preload.disconnect();
    const image = new win.Image();
    image.src = new URL('../assets/about/tokyo-passengers.png', import.meta.url).href;
    image.decode().then(() => {
      if (life.signal.aborted) return;
      loaded = true;
      // Set the first cell before showing the background.
      paint(motion.matches ? 0 : 8);
      root.setAttribute('data-passenger-ready', '');
      sync();
    }, () => {});
  }, { rootMargin: '240px 0px' });
  preload.observe(root);
  const visibility = new win.IntersectionObserver(([event]) => {
    visible = event.isIntersecting;
    sync();
  }, { threshold: .15 });
  visibility.observe(root);

  function react() {
    const now = win.performance.now();
    if (!playing() || reacting || frame <= entry.length || frame > run.length - exit.length ||
      now - activatedAt < 1400) return;
    activatedAt = now;
    win.clearTimeout(timer);
    reacting = true;
    run = [...gestures[row], [0, 420]];
    frame = 0;
    advance();
  }

  root.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') react();
  }, options);
  root.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && event.isPrimary && playing()) {
      touch = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
    }
  }, options);
  function isTap(event) {
    return touch?.id === event.pointerId &&
      Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < tapDistance;
  }
  root.addEventListener('pointermove', event => {
    if (touch?.id === event.pointerId && !isTap(event)) touch = undefined;
  }, options);
  root.addEventListener('pointerup', event => {
    if (isTap(event) && event.timeStamp - touch.time < 450) react();
    touch = undefined;
  }, options);
  root.addEventListener('pointercancel', () => { touch = undefined; }, options);
  doc.addEventListener('visibilitychange', sync, options);
  motion.addEventListener('change', sync, options);
  win.addEventListener('pagehide', event => {
    suspended = true;
    sync();
    if (!event.persisted) dispose();
  }, options);
  win.addEventListener('pageshow', () => { suspended = false; sync(); }, options);

  function dispose() {
    life.abort();
    win.clearTimeout(timer);
    preload.disconnect();
    visibility.disconnect();
    root.removeAttribute('data-passenger-ready');
  }
  return dispose;
}

if (typeof document !== 'undefined') {
  mountAboutPassengers(document.querySelector('[data-about-passengers]'));
}
