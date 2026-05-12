/* -- Crystal UI startup: shared settings, navigation, reveal, and interaction utilities. -- */

(() => {
  const STORAGE_KEY = 'fejelude-crystal-settings';
  const DEFAULT_SETTINGS = {
    appearance: 'system',
    intensity: 'standard',
    motion: 'full',
    accent: 'blue'
  };

  const GLASS_BLUR = {
    subtle: '8px',
    standard: '20px',
    rich: '36px'
  };

  const ACCENTS = {
    blue: '#5aa7ff',
    purple: '#a78bfa',
    rose: '#fb7185',
    amber: '#f59e0b',
    teal: '#14b8a6',
    slate: '#94a3b8'
  };

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colorQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const readSettings = () => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch (_) {
      return { ...DEFAULT_SETTINGS };
    }
  };

  const writeSettings = (settings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  };

  const applySettings = (settings = readSettings()) => {
    const root = document.documentElement;
    const resolvedTheme = settings.appearance === 'system'
      ? (colorQuery.matches ? 'dark' : 'light')
      : settings.appearance;
    const resolvedMotion = settings.motion === 'system'
      ? (reduceQuery.matches ? 'off' : 'full')
      : settings.motion;

    root.dataset.theme = resolvedTheme;
    root.dataset.glassIntensity = settings.intensity;
    root.dataset.motion = resolvedMotion;
    root.style.setProperty('--glass-blur', GLASS_BLUR[settings.intensity] || GLASS_BLUR.standard);
    root.style.setProperty('--accent', ACCENTS[settings.accent] || ACCENTS.blue);
    root.style.setProperty('--accent-rgb', hexToRgb(ACCENTS[settings.accent] || ACCENTS.blue));
  };

  const hexToRgb = (hex) => {
    const value = hex.replace('#', '');
    const bigint = parseInt(value, 16);
    return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
  };

  const createSettingsPanel = () => {
    if (document.querySelector('.settings-trigger')) return;

    const navContainer = document.querySelector('.nav-container');
    if (!navContainer) return;

    const trigger = document.createElement('button');
    trigger.className = 'settings-trigger glass-icon-button';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Open appearance settings');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm8.1 3.6c0-.5-.05-1-.14-1.48l2.02-1.55-2-3.46-2.38.96a8.2 8.2 0 0 0-2.56-1.48L14.7 2.43h-4l-.35 2.56a8.2 8.2 0 0 0-2.56 1.48L5.4 5.51l-2 3.46 2.02 1.55A8.33 8.33 0 0 0 5.28 12c0 .5.05 1 .14 1.48L3.4 15.03l2 3.46 2.38-.96c.77.65 1.63 1.15 2.56 1.48l.35 2.56h4l.35-2.56a8.2 8.2 0 0 0 2.56-1.48l2.38.96 2-3.46-2.02-1.55c.09-.48.14-.98.14-1.48Z"/></svg>';

    const panel = document.createElement('aside');
    panel.className = 'settings-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="settings-sheet glass-surface" role="dialog" aria-modal="true" aria-label="Appearance settings">
        <div class="settings-header">
          <div>
            <span class="eyebrow">Crystal UI</span>
            <h2>Appearance Settings</h2>
          </div>
          <button class="settings-close glass-icon-button" type="button" aria-label="Close appearance settings">×</button>
        </div>
        ${optionGroup('Appearance', 'appearance', [
          ['system', 'System'], ['light', 'Light'], ['dark', 'Dark']
        ])}
        ${optionGroup('Glass Intensity', 'intensity', [
          ['subtle', 'Subtle'], ['standard', 'Standard'], ['rich', 'Rich']
        ])}
        ${optionGroup('Motion', 'motion', [
          ['full', 'Full'], ['reduced', 'Reduced'], ['off', 'Off']
        ])}
        <div class="settings-group">
          <p>Accent Color</p>
          <div class="accent-grid" role="radiogroup" aria-label="Accent Color">
            ${Object.keys(ACCENTS).map((key) => `<button type="button" class="accent-swatch" data-setting="accent" data-value="${key}" aria-label="${key}"></button>`).join('')}
          </div>
        </div>
      </div>
    `;

    navContainer.appendChild(trigger);
    document.body.appendChild(panel);

    const close = () => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
      syncControls(readSettings());
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      panel.querySelector('.settings-close')?.focus();
    };

    trigger.addEventListener('click', open);
    panel.querySelector('.settings-close')?.addEventListener('click', close);
    panel.addEventListener('click', (event) => {
      if (event.target === panel) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) close();
    });

    panel.querySelectorAll('[data-setting]').forEach((button) => {
      button.addEventListener('click', () => {
        const settings = readSettings();
        settings[button.dataset.setting] = button.dataset.value;
        writeSettings(settings);
        applySettings(settings);
        syncControls(settings);
      });
    });

    syncControls(readSettings());
  };

  const optionGroup = (label, key, options) => `
    <div class="settings-group">
      <p>${label}</p>
      <div class="segmented-control" role="radiogroup" aria-label="${label}">
        ${options.map(([value, text]) => `<button type="button" data-setting="${key}" data-value="${value}">${text}</button>`).join('')}
      </div>
    </div>
  `;

  const syncControls = (settings) => {
    document.querySelectorAll('[data-setting]').forEach((button) => {
      const active = settings[button.dataset.setting] === button.dataset.value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const initNavigation = () => {
    const header = document.querySelector('.glass-nav');
    const mobileBtn = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');

    const onScroll = () => header?.classList.toggle('is-compressed', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const toggleMobileMenu = (forceClose = false) => {
      if (!mobileBtn || !navLinks) return;
      const isOpen = navLinks.classList.contains('active');
      if (isOpen || forceClose) {
        navLinks.classList.remove('active');
        mobileBtn.classList.remove('open');
        mobileBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      navLinks.classList.add('active');
      mobileBtn.classList.add('open');
      mobileBtn.setAttribute('aria-expanded', 'true');
    };

    mobileBtn?.addEventListener('click', () => toggleMobileMenu(false));

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        toggleMobileMenu(true);
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const section = document.getElementById(href.slice(1));
        if (!section) return;
        event.preventDefault();
        const instant = document.documentElement.dataset.motion === 'off';
        section.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
      });
    });

    document.querySelectorAll('.dropdown').forEach((parent) => {
      const link = parent.querySelector('a');
      link?.addEventListener('click', (event) => {
        const isMobile = window.matchMedia('(hover: none)').matches || navLinks?.classList.contains('active');
        if (!isMobile || parent.classList.contains('touch-active')) return;
        event.preventDefault();
        document.querySelectorAll('.dropdown.touch-active').forEach((item) => {
          if (item !== parent) item.classList.remove('touch-active');
        });
        parent.classList.add('touch-active');
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown.touch-active').forEach((item) => item.classList.remove('touch-active'));
      }
    });
  };

  const initReveal = () => {
    const targets = document.querySelectorAll('.reveal, .scroll-reveal, .hub-copy, .hub-card, .gallery-item, .section-header');
    if (!targets.length) return;
    targets.forEach((target, index) => target.style.setProperty('--reveal-delay', `${Math.min(index * 45, 360)}ms`));

    if (!('IntersectionObserver' in window) || document.documentElement.dataset.motion === 'off') {
      targets.forEach((target) => target.classList.add('active', 'is-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('active', 'is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach((target) => observer.observe(target));
  };

  const initSpotlight = () => {
    document.querySelectorAll('.spotlight-card, .glass-surface, .hub-card, .gallery-item').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
      }, { passive: true });
    });
  };

  const initLazySkeletons = () => {
    document.querySelectorAll('.gallery-img').forEach((img) => {
      const item = img.closest('.gallery-item');
      item?.classList.add('is-loading');
      const loaded = () => item?.classList.remove('is-loading');
      if (img.complete) loaded();
      else img.addEventListener('load', loaded, { once: true });
      img.addEventListener('error', loaded, { once: true });
    });
  };

  const initDiscordCopy = () => {
    const copyDiscord = document.getElementById('copy-discord');
    const discordVal = document.getElementById('discord-val');
    if (!copyDiscord || !discordVal) return;
    copyDiscord.addEventListener('click', () => {
      const originalText = discordVal.textContent;
      const textToCopy = originalText.replace('@ ', '').trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        discordVal.textContent = 'Copied!';
        copyDiscord.classList.add('copied');
        window.setTimeout(() => {
          discordVal.textContent = originalText;
          copyDiscord.classList.remove('copied');
        }, 2000);
      }).catch((error) => console.error('Failed to copy text: ', error));
    });
  };

  const initThirdPartyEffects = () => {
    const logoText = document.querySelector('#nav-logo-text');
    if (logoText && typeof window.ShinyText === 'function') {
      new window.ShinyText(logoText, {
        text: 'Itsmefeje',
        speed: 3,
        color: '#b5b5b5',
        shineColor: '#ffffff',
        pauseOnHover: true
      });
    }

    if (typeof window.initReactBits === 'function') {
      const hasTargets = document.querySelector('.tilted-card, .magnet-btn, .blur-text, .scroll-reveal');
      if (hasTargets) window.initReactBits(document);
    }
  };

  applySettings();
  colorQuery.addEventListener?.('change', () => applySettings(readSettings()));
  reduceQuery.addEventListener?.('change', () => applySettings(readSettings()));

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('page-ready');
    createSettingsPanel();
    initNavigation();
    initReveal();
    initSpotlight();
    initLazySkeletons();
    initDiscordCopy();
    initThirdPartyEffects();

    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());
  });
})();
