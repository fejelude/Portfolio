'use strict';

// Branding and the server hub load after the dashboard core using ordered defer scripts.

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

  const iconMotion = document.getElementById('icon-motion');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  function renderOfficialMedia(element, key) {
    if (!SOFRA_OFFICIAL_MEDIA[key] || element.closest('.hidden, [hidden]')) return;
    const mode = iconMotion.checked ? 'video' : 'img';
    const current = element.firstElementChild;
    if (current?.localName === mode && current.dataset.sofraKey === key) return;
    if (current?.dataset.sofraFailed === mode) return;

    current?.pause?.();
    const media = document.createElement(mode);
    const poster = '/assets/sofra/' + key + '-poster.webp';
    media.dataset.sofraKey = key;
    media.setAttribute('aria-hidden', 'true');

    if (mode === 'video') {
      media.poster = poster;
      media.src = SOFRA_OFFICIAL_MEDIA[key];
      media.muted = true;
      media.defaultMuted = true;
      media.playsInline = true;
      media.loop = true;
      media.preload = 'none';
    } else {
      media.src = poster;
      media.alt = '';
      media.decoding = 'async';
    }

    media.addEventListener('error', () => {
      if (element.firstElementChild !== media) return;
      const fallback = document.createElement('span');
      fallback.dataset.sofraFailed = mode;
      fallback.textContent = SOFRA_MEDIA_FALLBACK[key];
      element.replaceChildren(fallback);
      element.classList.remove('has-media');
    }, { once: true });
    element.replaceChildren(media);
    element.classList.add('has-media');
  }

  function updateIconPlayback() {
    document.querySelectorAll('video[data-sofra-key]').forEach((video) => {
      if (document.hidden || !iconMotion.checked || video.closest('.hidden, [hidden]')) video.pause();
      else if (video.paused) video.play().catch(() => {});
    });
  }

  function hideAppearanceSection() {
    const button = document.querySelector('[data-panel="appearance"]');
    if (!button) return;
    button.hidden = true;
    const title = button.previousElementSibling;
    if (title?.classList.contains('nav-group-title')) title.hidden = true;
  }

  function selectedGuildName() {
    const select = document.getElementById('guild-select');
    if (!select?.value) return null;
    const text = select.options[select.selectedIndex]?.textContent || '';
    return text.replace(/\s*•\s*Add Sofra\s*$/i, '').trim() || null;
  }

  function paintGuildIcon(element, backgroundImage, guildName) {
    if (!element) return;
    element.classList.remove('has-media', 'official-media', 'media-loading');
    delete element.dataset.sofraMediaLoading;

    if (backgroundImage && backgroundImage !== 'none') {
      if (element.childNodes.length) element.replaceChildren();
      if (element.style.backgroundImage !== backgroundImage) element.style.backgroundImage = backgroundImage;
      element.classList.add('has-server-icon', 'server-guild-icon');
      return;
    }

    if (element.style.backgroundImage) element.style.backgroundImage = '';
    element.classList.remove('has-server-icon', 'server-guild-icon');
    const fallback = (guildName || 'S').trim().slice(0, 1).toUpperCase() || 'S';
    if (element.textContent !== fallback || element.childElementCount) element.textContent = fallback;
  }

  function syncSelectedServerIcon(cards, options, select, guildName) {
    const selectedIndex = options.findIndex((option) => option.value === select.value);
    const serverIcon = selectedIndex >= 0 ? cards[selectedIndex]?.querySelector('.server-icon') : null;
    const backgroundImage = serverIcon?.style.backgroundImage || '';
    paintGuildIcon(document.querySelector('#server-manager-launch .server-manager-mark'), backgroundImage, guildName);
    paintGuildIcon(document.querySelector('.hero-card .hero-logo'), backgroundImage, guildName);
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
      launch.setAttribute('aria-controls', 'server-picker');
      launch.addEventListener('click', openServerManager);
      selectWrap.insertAdjacentElement('afterend', launch);
    }

    if (!document.getElementById('server-manager-nav')) {
      const serverNav = document.createElement('button');
      serverNav.type = 'button';
      serverNav.setAttribute('aria-controls', 'server-picker');
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
    const reauthButton = gate.querySelector('.discord-reauth');
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
    if (reauthButton) reauthButton.classList.remove('hidden');
    if (note) note.textContent = 'You can retry with your current session.';
  }

  function applyOfficialMedia() {
    document.querySelectorAll('[data-icon-key]').forEach((element) => {
      if (element.classList.contains('hero-logo')) return;
      renderOfficialMedia(element, element.dataset.iconKey);
    });
    hideAppearanceSection();
    showConnectionRetryState();
    updateIconPlayback();
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

  iconMotion.addEventListener('change', scheduleOfficialMedia);
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) iconMotion.checked = false;
    scheduleOfficialMedia();
  });
  document.addEventListener('visibilitychange', updateIconPlayback);
})();
