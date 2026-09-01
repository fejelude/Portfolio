'use strict';

// Load the existing dashboard logic synchronously, then layer Sofra's
// official universal branding over it. The core file remains unchanged so
// the working settings/forms from the previous redesign stay intact.
document.write('<script src="/sofra-panel-core.js?v=20260901"></' + 'script>');

(() => {
  const SOFRA_OFFICIAL_MEDIA = Object.freeze({
    brand: 'https://static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/fb/9e/U1eJq1Kc6FPykBTGeW.mp4',
    overview: 'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/e3/b6/XOCMlFyxQ6Vzk.mp4',
    welcome: 'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/76/02/JOKTPswg70UuvLmU.mp4',
    tickets: 'https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/80/64/bKGnacc5.mp4',
    levels: 'https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/49/01/THCweaO9SXtnh.mp4',
    boosters: 'https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/ce/c2/8D5ZPqkh66i64Q3fF.mp4',
    moderation: 'https://static.klipy.com/ii/71b2873e478b9d8d0482ea3ec777ba7f/7f/e5/XTuUicSWZIFin.mp4',
    logs: 'https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/03/1e/tb2QI8A5.mp4',
    autorole: 'https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/01/eb/k9oLv1JBJ5sxy9NyxZ8.mp4'
  });

  let lastGuildProbeStatus = null;
  const nativeFetch = window.fetch.bind(window);

  // The panel's first request determines whether the user is signed in. Retry
  // short Discord/Vercel hiccups here too, so a temporary outage never looks
  // like the user's remembered session disappeared.
  window.fetch = async (...args) => {
    const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const isGuildProbe = requestUrl.includes('/api/sofra/guilds');
    const maxAttempts = isGuildProbe ? 3 : 1;
    let response;
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        response = await nativeFetch(...args);
        if (!isGuildProbe || ![429, 500, 502, 503, 504].includes(response.status) || attempt === maxAttempts - 1) break;
      } catch (error) {
        lastError = error;
        if (!isGuildProbe || attempt === maxAttempts - 1) {
          if (isGuildProbe) lastGuildProbeStatus = 503;
          throw error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }

    if (!response && lastError) throw lastError;
    if (isGuildProbe) {
      lastGuildProbeStatus = response.status;
      if (response.ok) localStorage.setItem('sofra:rememberedSession', '1');
      if (response.status === 401) localStorage.removeItem('sofra:rememberedSession');
    }
    return response;
  };

  function addOfficialMediaStyles() {
    if (document.getElementById('sofra-official-media-styles')) return;
    const style = document.createElement('style');
    style.id = 'sofra-official-media-styles';
    style.textContent = `
      [data-panel="appearance"], [data-page="appearance"] { display: none !important; }
      .media-slot, .sofra-orb, .auth-mark { overflow: hidden; }
      .media-slot > video, .sofra-orb > video, .auth-mark > video,
      .media-slot > img, .sofra-orb > img, .auth-mark > img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        pointer-events: none;
      }
      .nav-icon > video, .module-icon > video { border-radius: inherit; }
      .auth-gate.connection-retry-mode .security-note { border-color: rgba(244,167,194,.18); }
    `;
    document.head.appendChild(style);
  }

  function officialMediaNode(key, url) {
    if (/\.mp4(?:$|[?#])/i.test(url)) {
      const video = document.createElement('video');
      video.src = url;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.disablePictureInPicture = true;
      video.setAttribute('aria-hidden', 'true');
      video.setAttribute('tabindex', '-1');
      video.dataset.sofraOfficialKey = key;
      return video;
    }

    const image = document.createElement('img');
    image.src = url;
    image.alt = '';
    image.loading = 'eager';
    image.decoding = 'async';
    image.dataset.sofraOfficialKey = key;
    return image;
  }

  function renderOfficialMedia(element, key) {
    const url = SOFRA_OFFICIAL_MEDIA[key];
    if (!element || !url) return;

    const child = element.firstElementChild;
    if (child && child.dataset?.sofraOfficialKey === key && child.getAttribute('src') === url) return;

    const node = officialMediaNode(key, url);
    element.replaceChildren(node);
    element.classList.add('has-media', 'official-media');
    if (node.tagName === 'VIDEO') node.play().catch(() => undefined);
  }

  function hideAppearanceSection() {
    const button = document.querySelector('[data-panel="appearance"]');
    if (!button) return;
    button.hidden = true;
    const title = button.previousElementSibling;
    if (title?.classList.contains('nav-group-title')) title.hidden = true;
  }

  function showConnectionRetryState() {
    if (![429, 500, 502, 503, 504].includes(lastGuildProbeStatus)) return;
    const gate = document.getElementById('auth-gate');
    if (!gate || gate.classList.contains('hidden')) return;

    const heading = gate.querySelector('.auth-card h1');
    const copy = gate.querySelector('.auth-card > p');
    const button = gate.querySelector('.discord-login');
    const note = gate.querySelector('.security-note');
    if (!heading || !copy || !button) return;

    gate.classList.add('connection-retry-mode');
    heading.textContent = 'Discord is taking a moment.';
    copy.textContent = 'Your Sofra session was not cleared. The dashboard just could not reach Discord right now, so you can retry without authorizing your account again.';
    button.href = '/sofra';
    button.innerHTML = '<span aria-hidden="true">↻</span> Retry connection';
    button.onclick = (event) => {
      event.preventDefault();
      location.reload();
    };
    if (note) note.innerHTML = '<span>♡</span> Temporary connection errors never sign you out of Sofra.';
  }

  function applyOfficialMedia() {
    document.querySelectorAll('[data-icon-key]').forEach((element) => {
      renderOfficialMedia(element, element.dataset.iconKey);
    });

    // These two exist before any Discord server config is loaded, so the
    // official bot logo is visible during boot and on the OAuth sign-in card.
    document.querySelectorAll('.sofra-orb, .auth-mark').forEach((element) => {
      renderOfficialMedia(element, 'brand');
    });

    hideAppearanceSection();
    showConnectionRetryState();
  }

  let scheduled = false;
  function scheduleOfficialMedia() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyOfficialMedia();
    });
  }

  // The wrapper is loaded at the end of <body>, so all panel markup already
  // exists here. Apply immediately so the loading screen never waits for the
  // Discord API before showing Sofra's real logo.
  addOfficialMediaStyles();
  applyOfficialMedia();

  document.addEventListener('DOMContentLoaded', () => {
    applyOfficialMedia();
    const observer = new MutationObserver(scheduleOfficialMedia);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
})();
