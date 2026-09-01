'use strict';

// Load the existing dashboard logic synchronously, then layer Sofra's
// official universal branding and mobile reliability fixes over it.
document.write('<script src="/sofra-panel-core.js?v=20260901"></' + 'script>');

(() => {
  const SOFRA_OFFICIAL_MEDIA = Object.freeze({
    brand: [
      'https://images-ext-1.discordapp.net/external/iXuJ10mSD28dtzSQj6R7PrgZJSvkEmBx-quRfqgVHgE/https/static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/fb/9e/U1eJq1Kc6FPykBTGeW.mp4',
      'https://static.klipy.com/ii/e7539ef2aad336edaa067c28ee130b3c/fb/9e/U1eJq1Kc6FPykBTGeW.mp4'
    ],
    overview: [
      'https://images-ext-1.discordapp.net/external/HVfTgKuy9F_Nn3g8Hgfqn4l8X73IRqd-W6QGH-l6d9k/https/static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/e3/b6/XOCMlFyxQ6Vzk.mp4',
      'https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/e3/b6/XOCMlFyxQ6Vzk.mp4'
    ],
    welcome: [
      'https://images-ext-1.discordapp.net/external/-8pdUvGwhltnBItSQOPVKZ6RAL3kavUNFhwDeRvHjzA/https/static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/76/02/JOKTPswg70UuvLmU.mp4',
      'https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/76/02/JOKTPswg70UuvLmU.mp4'
    ],
    tickets: [
      'https://images-ext-1.discordapp.net/external/7oD9z5eSjM8rByu9oHxMMuNucr19mjj-DpqPli5yvhY/https/static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/80/64/bKGnacc5.mp4',
      'https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/80/64/bKGnacc5.mp4'
    ],
    levels: [
      'https://images-ext-1.discordapp.net/external/CjA0hlNqqtToPWBIEGjEAR1Uv5PdO_qMATCNfHjtprs/https/static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/49/01/THCweaO9SXtnh.mp4',
      'https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/49/01/THCweaO9SXtnh.mp4'
    ],
    boosters: [
      'https://images-ext-1.discordapp.net/external/clfPvagAK1XqLdRmOjczv3o3xlxrH6_bUZPb8hZMp68/https/static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/ce/c2/8D5ZPqkh66i64Q3fF.mp4',
      'https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/ce/c2/8D5ZPqkh66i64Q3fF.mp4'
    ],
    moderation: [
      'https://images-ext-1.discordapp.net/external/wRsV0D555zcyGBIx2fy2R1JrfbVhpvRUfDfmbCGzRT0/https/static.klipy.com/ii/71b2873e478b9d8d0482ea3ec777ba7f/7f/e5/XTuUicSWZIFin.mp4',
      'https://static.klipy.com/ii/71b2873e478b9d8d0482ea3ec777ba7f/7f/e5/XTuUicSWZIFin.mp4'
    ],
    logs: [
      'https://images-ext-1.discordapp.net/external/rs94NDf7fgbjzUd9kqIgILw7T_nyWWnxclWyMj0Dz5s/https/static.klipy.com/ii/925f17378dd1893b674a723c07535afe/03/1e/tb2QI8A5.mp4',
      'https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/03/1e/tb2QI8A5.mp4'
    ],
    autorole: [
      'https://images-ext-1.discordapp.net/external/2UPm33suyGS833nZJVf1cfgQXpUDv6pHRnIPNHXXcys/https/static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/01/eb/k9oLv1JBJ5sxy9NyxZ8.mp4',
      'https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/01/eb/k9oLv1JBJ5sxy9NyxZ8.mp4'
    ]
  });

  const SOFRA_MEDIA_FALLBACK = Object.freeze({
    brand: 'S', overview: '⌂', welcome: '♡', tickets: '▣', levels: '↗',
    boosters: '✦', moderation: '◇', logs: '≡', autorole: '＋'
  });

  let lastGuildProbeStatus = null;
  let scheduled = false;
  const nativeFetch = window.fetch.bind(window);

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
      .media-slot > video, .sofra-orb > video, .auth-mark > video {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        pointer-events: none;
      }
      .nav-icon > video, .module-icon > video { border-radius: inherit; }
      .auth-gate.connection-retry-mode .security-note { border-color: rgba(244,167,194,.18); }

      @media (max-width: 760px) {
        /* backdrop-filter creates a containing block for fixed descendants on
           mobile browsers. Removing it here keeps Save/Reset at the viewport
           bottom instead of covering the sticky navigation header. */
        .workspace-header {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          background: rgba(23,22,32,.98) !important;
        }
        .mobile-menu {
          width: auto !important;
          min-width: 94px;
          padding: 0 10px !important;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid rgba(255,255,255,.06) !important;
          background: rgba(255,255,255,.025) !important;
          font-size: 17px !important;
        }
        .mobile-menu::after {
          content: 'Sections';
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .01em;
        }
        .header-actions.active {
          position: fixed !important;
          left: 12px !important;
          right: 12px !important;
          bottom: max(12px, env(safe-area-inset-bottom)) !important;
          top: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function fallbackMedia(element, key) {
    if (!element) return;
    element.replaceChildren();
    element.textContent = SOFRA_MEDIA_FALLBACK[key] || '•';
    element.classList.remove('official-media', 'media-loading');
    delete element.dataset.sofraMediaLoading;
  }

  function buildVideo(key, url) {
    const video = document.createElement('video');
    video.src = url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('tabindex', '-1');
    video.dataset.sofraOfficialKey = key;
    video.dataset.sofraOfficialSrc = url;
    return video;
  }

  function playOfficialVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return;
    video.muted = true;
    video.defaultMuted = true;
    const promise = video.play();
    if (promise?.catch) promise.catch(() => undefined);
  }

  function loadOfficialMedia(element, key, sourceIndex = 0) {
    const sources = SOFRA_OFFICIAL_MEDIA[key];
    if (!element || !sources?.[sourceIndex]) {
      fallbackMedia(element, key);
      return;
    }

    const url = sources[sourceIndex];
    const video = buildVideo(key, url);
    let settled = false;
    const timeout = setTimeout(() => fail(), 6500);

    function succeed() {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      video.dataset.sofraReady = '1';
      element.replaceChildren(video);
      element.classList.add('has-media', 'official-media');
      element.classList.remove('media-loading');
      delete element.dataset.sofraMediaLoading;
      playOfficialVideo(video);
    }

    function fail() {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      if (sources[sourceIndex + 1]) loadOfficialMedia(element, key, sourceIndex + 1);
      else fallbackMedia(element, key);
    }

    video.addEventListener('loadeddata', succeed, { once: true });
    video.addEventListener('canplay', succeed, { once: true });
    video.addEventListener('error', fail, { once: true });
    video.load();
  }

  function renderOfficialMedia(element, key) {
    if (!element || !SOFRA_OFFICIAL_MEDIA[key]) return;
    const child = element.firstElementChild;
    if (child?.dataset?.sofraOfficialKey === key && child.dataset.sofraReady === '1') {
      playOfficialVideo(child);
      return;
    }
    if (element.dataset.sofraMediaLoading === key) return;

    // Keep a visible symbol while the animated asset is loading so a failed or
    // throttled media request never leaves an empty square in the interface.
    if (!element.textContent.trim() && !child) element.textContent = SOFRA_MEDIA_FALLBACK[key] || '•';
    element.dataset.sofraMediaLoading = key;
    element.classList.add('media-loading');
    loadOfficialMedia(element, key, 0);
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
    document.querySelectorAll('.sofra-orb, .auth-mark').forEach((element) => {
      renderOfficialMedia(element, 'brand');
    });
    hideAppearanceSection();
    showConnectionRetryState();
  }

  function scheduleOfficialMedia() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyOfficialMedia();
    });
  }

  function resumeOfficialMedia() {
    document.querySelectorAll('video[data-sofra-official-key]').forEach(playOfficialVideo);
  }

  addOfficialMediaStyles();
  applyOfficialMedia();

  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) mobileMenu.setAttribute('aria-label', 'Open Sofra sections');

  document.addEventListener('DOMContentLoaded', () => {
    applyOfficialMedia();
    const observer = new MutationObserver(scheduleOfficialMedia);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeOfficialMedia();
  });
  ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, resumeOfficialMedia, { passive: true });
  });
})();