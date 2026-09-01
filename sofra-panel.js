'use strict';

// Load the existing dashboard logic synchronously, then layer Sofra's
// official universal branding, server hub, and mobile reliability fixes over it.
document.write('<script src="/sofra-panel-core.js?v=20260901"></' + 'script>');

(() => {
  // Official animations are self-hosted with the website. The dashboard no
  // longer depends on Discord's proxy or Klipy being reachable at runtime.
  const SOFRA_OFFICIAL_MEDIA = Object.freeze({
    brand: '/assets/sofra/brand.mp4?v=1',
    overview: '/assets/sofra/overview.mp4?v=1',
    welcome: '/assets/sofra/welcome.mp4?v=1',
    tickets: '/assets/sofra/tickets.mp4?v=1',
    levels: '/assets/sofra/levels.mp4?v=1',
    boosters: '/assets/sofra/boosters.mp4?v=1',
    moderation: '/assets/sofra/moderation.mp4?v=1',
    logs: '/assets/sofra/logs.mp4?v=1',
    autorole: '/assets/sofra/autorole.mp4?v=1'
  });

  const SOFRA_MEDIA_FALLBACK = Object.freeze({
    brand: 'S', overview: '⌂', welcome: '♡', tickets: '▣', levels: '↗',
    boosters: '✦', moderation: '◇', logs: '≡', autorole: '＋'
  });

  let lastGuildProbeStatus = null;
  let scheduled = false;
  let serverHubOpen = false;
  let lastSettingsPanel = 'overview';
  const SETTINGS_TITLES = Object.freeze({
    overview: 'Overview', welcome: 'Welcome System', tickets: 'Tickets', levels: 'Levels / XP',
    boosters: 'Boosters', moderation: 'Moderation', logs: 'Logs', autorole: 'Auto Role'
  });
  const nativeFetch = window.fetch.bind(window);

  // Retry the initial guild/session probe on transient Discord/Vercel errors.
  // A temporary outage should never look like the user's remembered session
  // vanished.
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
      .guild-select-wrap { display: none !important; }
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

      .server-manager-launch {
        width: calc(100% - 16px);
        min-width: 0;
        display: grid;
        grid-template-columns: 42px minmax(0,1fr) 24px;
        align-items: center;
        gap: 11px;
        margin: 12px 8px 6px;
        padding: 11px;
        border: 1px solid rgba(242,166,202,.14);
        border-radius: 13px;
        background:
          radial-gradient(circle at 12% 0%, rgba(242,166,202,.11), transparent 38%),
          linear-gradient(135deg, rgba(255,255,255,.035), rgba(201,168,255,.025));
        color: #eee9f0;
        text-align: left;
        cursor: pointer;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
        transition: border-color .16s ease, background .16s ease, transform .16s ease;
      }
      .server-manager-launch:hover,
      .server-manager-launch.is-active {
        border-color: rgba(242,166,202,.28);
        background:
          radial-gradient(circle at 12% 0%, rgba(242,166,202,.16), transparent 40%),
          linear-gradient(135deg, rgba(242,166,202,.07), rgba(201,168,255,.05));
      }
      .server-manager-launch:hover { transform: translateY(-1px); }
      .server-manager-mark {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 12px;
        background-color: rgba(242,166,202,.07);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        color: var(--pink);
        font-weight: 800;
      }
      .server-manager-copy { min-width: 0; }
      .server-manager-copy strong,
      .server-manager-copy small {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .server-manager-copy strong { font-size: 12px; color: #f4eef5; }
      .server-manager-copy small { margin-top: 3px; color: #8f8796; font-size: 9px; }
      .server-manager-arrow {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 8px;
        color: #ad9eae;
        background: rgba(255,255,255,.025);
        font-size: 15px;
      }
      .server-manager-nav .nav-icon { font-size: 16px; }
      .server-manager-nav.active .nav-icon { color: var(--pink); }
      body.server-manager-mode #header-actions { display: none !important; }

      #server-picker.server-manager-surface .picker-heading {
        position: relative;
        overflow: hidden;
        padding: 23px;
        border: 1px solid rgba(242,166,202,.12);
        border-radius: 18px;
        background:
          radial-gradient(circle at 8% 0%, rgba(242,166,202,.11), transparent 34%),
          radial-gradient(circle at 88% 15%, rgba(201,168,255,.08), transparent 30%),
          rgba(33,33,43,.72);
      }
      #server-picker.server-manager-surface .picker-heading::after {
        content: '♡';
        position: absolute;
        right: 22px;
        top: 13px;
        color: rgba(242,166,202,.08);
        font-size: 68px;
        pointer-events: none;
      }
      #server-picker.server-manager-surface .server-grid { margin-top: 13px; }
      #server-picker.server-manager-surface .server-card {
        position: relative;
        overflow: hidden;
        transition: transform .16s ease, border-color .16s ease, background .16s ease;
      }
      #server-picker.server-manager-surface .server-card:hover {
        transform: translateY(-2px);
        border-color: rgba(242,166,202,.18);
        background: rgba(38,37,48,.97);
      }
      #server-picker.server-manager-surface .server-card.current-server {
        border-color: rgba(242,166,202,.32);
        background:
          linear-gradient(135deg, rgba(242,166,202,.07), rgba(201,168,255,.035)),
          var(--surface);
        box-shadow: inset 3px 0 0 rgba(242,166,202,.55), 0 14px 36px rgba(0,0,0,.12);
      }
      #server-picker.server-manager-surface .server-card.current-server::before {
        content: '';
        position: absolute;
        right: 12px;
        top: 12px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #9ce6bd;
        box-shadow: 0 0 12px rgba(126,220,169,.5);
      }

      @media (max-width: 760px) {
        /* backdrop-filter can create a containing block for fixed descendants
           on mobile browsers. Removing it here keeps Save/Reset at the actual
           viewport bottom instead of covering the sticky navigation header. */
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
        .server-manager-launch { margin-top: 9px; }
        #server-picker.server-manager-surface .picker-heading {
          display: grid;
          padding: 18px;
        }
        #server-picker.server-manager-surface .picker-heading::after {
          right: 12px;
          top: 10px;
          font-size: 54px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function fallbackMedia(element, key) {
    if (!element) return;
    element.replaceChildren();
    element.textContent = SOFRA_MEDIA_FALLBACK[key] || '•';
    element.classList.remove('has-media', 'official-media', 'media-loading');
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
    return video;
  }

  function playOfficialVideo(video) {
    if (!video || video.tagName !== 'VIDEO') return;
    video.muted = true;
    video.defaultMuted = true;
    const promise = video.play();
    if (promise?.catch) promise.catch(() => undefined);
  }

  function loadOfficialMedia(element, key) {
    const url = SOFRA_OFFICIAL_MEDIA[key];
    if (!element || !url) {
      fallbackMedia(element, key);
      return;
    }

    const video = buildVideo(key, url);
    let settled = false;
    const timeout = setTimeout(fail, 5000);

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
      fallbackMedia(element, key);
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

    // Always keep a visible symbol while the local animation is loading.
    if (!element.textContent.trim() && !child) element.textContent = SOFRA_MEDIA_FALLBACK[key] || '•';
    element.dataset.sofraMediaLoading = key;
    element.classList.add('media-loading');
    loadOfficialMedia(element, key);
  }

  function hideAppearanceSection() {
    const button = document.querySelector('[data-panel="appearance"]');
    if (!button) return;
    button.hidden = true;
    const title = button.previousElementSibling;
    if (title?.classList.contains('nav-group-title')) title.hidden = true;
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mobileMenu = document.getElementById('mobile-menu');
    sidebar?.classList.remove('open');
    mobileMenu?.setAttribute('aria-expanded', 'false');
  }

  function selectedGuildName() {
    const select = document.getElementById('guild-select');
    if (!select?.value) return null;
    const text = select.options[select.selectedIndex]?.textContent || '';
    return text.replace(/\s*•\s*Add Sofra\s*$/i, '').trim() || null;
  }

  function syncSelectedServerIcon(cards, options, select, guildName) {
    const mark = document.querySelector('#server-manager-launch .server-manager-mark');
    if (!mark) return;

    const selectedIndex = options.findIndex((option) => option.value === select.value);
    const serverIcon = selectedIndex >= 0 ? cards[selectedIndex]?.querySelector('.server-icon') : null;
    const backgroundImage = serverIcon?.style.backgroundImage || '';

    if (backgroundImage && backgroundImage !== 'none') {
      if (mark.style.backgroundImage !== backgroundImage) mark.style.backgroundImage = backgroundImage;
      if (mark.textContent) mark.textContent = '';
      mark.classList.add('has-server-icon');
      return;
    }

    mark.style.backgroundImage = '';
    mark.classList.remove('has-server-icon');
    const fallback = (guildName || 'S').trim().slice(0, 1).toUpperCase() || 'S';
    if (mark.textContent !== fallback) mark.textContent = fallback;
  }

  function customizeServerPickerHeading() {
    const picker = document.getElementById('server-picker');
    if (!picker) return;
    picker.classList.add('server-manager-surface');
    const eyebrow = picker.querySelector('.picker-heading .eyebrow');
    const title = picker.querySelector('.picker-heading h2');
    const copy = picker.querySelector('.picker-heading p');
    if (eyebrow && eyebrow.textContent !== 'SERVER MANAGER') eyebrow.textContent = 'SERVER MANAGER';
    if (title && title.textContent !== 'Choose where Sofra works.') title.textContent = 'Choose where Sofra works.';
    const pickerCopy = 'Open an installed server to manage Sofra, or add her to another server you control. No dropdowns — everything stays visible and easy to scan.';
    if (copy && copy.textContent !== pickerCopy) copy.textContent = pickerCopy;
  }

  function ensureServerManagerUI() {
    const selectWrap = document.querySelector('.guild-select-wrap');
    const select = document.getElementById('guild-select');
    const panelNav = document.querySelector('.panel-nav');
    const overviewButton = document.querySelector('.nav-item[data-panel="overview"]');
    if (!selectWrap || !select || !panelNav || !overviewButton) return;

    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    if (!document.getElementById('server-manager-launch')) {
      const launch = document.createElement('button');
      launch.type = 'button';
      launch.id = 'server-manager-launch';
      launch.className = 'server-manager-launch';
      launch.innerHTML = `
        <span class="server-manager-mark" aria-hidden="true">S</span>
        <span class="server-manager-copy">
          <strong id="server-manager-name">Choose a server</strong>
          <small id="server-manager-status">Manage or install Sofra</small>
        </span>
        <span class="server-manager-arrow" aria-hidden="true">›</span>`;
      launch.setAttribute('aria-label', 'Open server manager');
      launch.addEventListener('click', openServerManager);
      selectWrap.insertAdjacentElement('afterend', launch);
    }

    if (!document.getElementById('server-manager-nav')) {
      const serverNav = document.createElement('button');
      serverNav.type = 'button';
      serverNav.id = 'server-manager-nav';
      serverNav.className = 'nav-item server-manager-nav';
      serverNav.innerHTML = '<span class="nav-icon" aria-hidden="true">▦</span><span>Servers</span>';
      serverNav.addEventListener('click', openServerManager);
      overviewButton.insertAdjacentElement('beforebegin', serverNav);
    }

    // Regular settings categories should leave the server manager and return
    // to the selected server. When no server is selected, keep the user in the
    // server manager instead of showing an unusable settings page.
    document.querySelectorAll('.panel-nav .nav-item[data-panel]').forEach((button) => {
      if (button.dataset.serverHubBound === '1') return;
      button.dataset.serverHubBound = '1';
      button.addEventListener('click', (event) => {
        if (!select.value) {
          event.preventDefault();
          event.stopImmediatePropagation();
          openServerManager();
          return;
        }
        leaveServerManager();
      }, true);
    });

    const serverGrid = document.getElementById('server-grid');
    if (serverGrid && serverGrid.dataset.serverHubBound !== '1') {
      serverGrid.dataset.serverHubBound = '1';
      serverGrid.addEventListener('click', (event) => {
        const manageButton = event.target.closest('button.server-action');
        if (!manageButton) return;
        const card = manageButton.closest('.server-card');
        if (!card) return;

        const cards = [...serverGrid.querySelectorAll('.server-card')];
        const options = [...select.options].filter((option) => option.value);
        const cardIndex = cards.indexOf(card);
        const guildId = card.dataset.guildId || options[cardIndex]?.value || '';
        if (!guildId) return;

        // Route card-based switching through the original hidden select's
        // change handler. That preserves the core unsaved-changes confirmation
        // instead of bypassing it when Servers becomes the primary switcher.
        event.preventDefault();
        event.stopImmediatePropagation();
        if (guildId === select.value) {
          leaveServerManager();
          const activePage = document.querySelector('.panel-page.active')?.dataset.page || lastSettingsPanel;
          const settingsButton = document.querySelector(`.panel-nav .nav-item[data-panel="${activePage}"]`);
          settingsButton?.click();
          return;
        }
        select.value = guildId;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }, true);
    }

    customizeServerPickerHeading();
    syncServerManagerUI();
  }

  function openServerManager() {
    const picker = document.getElementById('server-picker');
    const content = document.getElementById('content');
    const empty = document.getElementById('empty-state');
    const pageTitle = document.getElementById('page-title');
    if (!picker) return;

    const currentSettingsButton = document.querySelector('.panel-nav .nav-item[data-panel].active');
    if (currentSettingsButton?.dataset.panel) lastSettingsPanel = currentSettingsButton.dataset.panel;

    serverHubOpen = true;
    document.body.classList.add('server-manager-mode');
    content?.classList.add('hidden');
    empty?.classList.add('hidden');
    picker.classList.remove('hidden');
    if (pageTitle && pageTitle.textContent !== 'Servers') pageTitle.textContent = 'Servers';

    document.querySelectorAll('.panel-nav .nav-item').forEach((item) => item.classList.remove('active'));
    document.getElementById('server-manager-nav')?.classList.add('active');
    document.getElementById('server-manager-launch')?.classList.add('is-active');
    closeSidebar();
    customizeServerPickerHeading();
    syncServerManagerUI();
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function leaveServerManager() {
    serverHubOpen = false;
    document.body.classList.remove('server-manager-mode');
    document.getElementById('server-manager-nav')?.classList.remove('active');
    document.getElementById('server-manager-launch')?.classList.remove('is-active');
    const picker = document.getElementById('server-picker');
    const content = document.getElementById('content');
    if (document.getElementById('guild-select')?.value) {
      picker?.classList.add('hidden');
      content?.classList.remove('hidden');
    }
  }

  function syncServerManagerUI() {
    const select = document.getElementById('guild-select');
    const launch = document.getElementById('server-manager-launch');
    const name = document.getElementById('server-manager-name');
    const status = document.getElementById('server-manager-status');
    const picker = document.getElementById('server-picker');
    const content = document.getElementById('content');
    if (!select || !launch) return;

    const guildName = selectedGuildName();
    const nextName = guildName || 'Choose a server';
    const nextStatus = guildName ? 'Current server' : 'Manage or install Sofra';
    if (name && name.textContent !== nextName) name.textContent = nextName;
    if (status && status.textContent !== nextStatus) status.textContent = nextStatus;
    if (name) name.title = nextName;
    if (status) status.title = nextStatus;
    launch.setAttribute('aria-label', guildName ? `Open server manager. Current server: ${guildName}` : 'Open server manager');

    const cards = [...document.querySelectorAll('#server-grid .server-card')];
    const options = [...select.options].filter((option) => option.value);
    cards.forEach((card, index) => {
      const guildId = options[index]?.value || '';
      if (guildId) card.dataset.guildId = guildId;
      card.classList.toggle('current-server', Boolean(guildId && guildId === select.value));
    });
    syncSelectedServerIcon(cards, options, select, guildName);

    // Core loadGuild() switches back to content after a successful server load.
    // Detect that transition so our custom Servers tab never remains visually
    // active after Manage is clicked.
    const coreReturnedToContent = select.value && picker?.classList.contains('hidden') && !content?.classList.contains('hidden');
    if (coreReturnedToContent && serverHubOpen) {
      serverHubOpen = false;
      document.body.classList.remove('server-manager-mode');
      document.getElementById('server-manager-nav')?.classList.remove('active');
      launch.classList.remove('is-active');

      const activePage = document.querySelector('.panel-page.active')?.dataset.page || lastSettingsPanel;
      const settingsButton = document.querySelector(`.panel-nav .nav-item[data-panel="${activePage}"]`);
      settingsButton?.classList.add('active');
      const pageTitle = document.getElementById('page-title');
      const restoredTitle = SETTINGS_TITLES[activePage] || SETTINGS_TITLES[lastSettingsPanel] || 'Overview';
      if (pageTitle && pageTitle.textContent !== restoredTitle) pageTitle.textContent = restoredTitle;
    }

    // With no selected server, the existing core picker is the correct landing
    // page. Make that state look and behave like the dedicated Servers category.
    if (!select.value && picker && !picker.classList.contains('hidden')) {
      serverHubOpen = true;
      document.body.classList.add('server-manager-mode');
      document.getElementById('server-manager-nav')?.classList.add('active');
      launch.classList.add('is-active');
      const pageTitle = document.getElementById('page-title');
      if (pageTitle && pageTitle.textContent !== 'Servers') pageTitle.textContent = 'Servers';
    }
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
      ensureServerManagerUI();
      syncServerManagerUI();
    });
  }

  function resumeOfficialMedia() {
    document.querySelectorAll('video[data-sofra-official-key]').forEach(playOfficialVideo);
  }

  addOfficialMediaStyles();
  ensureServerManagerUI();
  applyOfficialMedia();

  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) mobileMenu.setAttribute('aria-label', 'Open Sofra sections');

  document.addEventListener('DOMContentLoaded', () => {
    ensureServerManagerUI();
    applyOfficialMedia();
    syncServerManagerUI();
    const observer = new MutationObserver(scheduleOfficialMedia);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      resumeOfficialMedia();
      syncServerManagerUI();
    }
  });

  ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, resumeOfficialMedia, { passive: true });
  });
})();
