/* -- Core startup logic: lighter effects, cleaner navigation, and safe interactions. -- */

(() => {
  const isHome = location.pathname === '/' || /\/index\.html$/i.test(location.pathname);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const lowMemory = Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4;
  const lowCpu = Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4;
  const compactViewport = window.matchMedia('(max-width: 900px)').matches;
  const lightweightMode = reducedMotion || coarsePointer || saveData || lowMemory || lowCpu || compactViewport;

  window.__fejePerformanceProfile = Object.freeze({ lightweightMode, reducedMotion, isHome });

  // The fullscreen LiquidEther WebGL simulation was the most expensive effect
  // on the portfolio homepage. Keep the same dark/purple atmosphere with a
  // first-paint CSS background instead of continuously rendering a fluid sim.
  if (isHome && typeof window.LiquidEther === 'function') {
    const style = document.createElement('style');
    style.id = 'feje-performance-layer';
    style.textContent = `
      #liquid-ether-bg.feje-static-ether {
        background:
          radial-gradient(circle at 18% 18%, rgba(67,56,202,.19), transparent 35%),
          radial-gradient(circle at 82% 26%, rgba(59,7,100,.23), transparent 38%),
          radial-gradient(circle at 52% 88%, rgba(92,54,160,.10), transparent 36%),
          linear-gradient(180deg, #080810 0%, #07070d 54%, #050508 100%);
      }
      #liquid-ether-bg.feje-static-ether::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, rgba(255,255,255,.015), transparent 26%, rgba(167,139,250,.018) 62%, transparent 82%);
        pointer-events: none;
      }
      main > section:not(.hero-section) {
        content-visibility: auto;
        contain-intrinsic-size: 760px;
      }
      .blur-text, .tilted-card, .magnet-btn { will-change: auto !important; }
    `;
    document.head.appendChild(style);

    window.LiquidEther = function LightweightPortfolioEther(container) {
      container?.classList.add('feje-static-ether');
      return {
        pause() {},
        resume() {},
        destroy() {}
      };
    };
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const logoText = document.querySelector('#nav-logo-text');
  const profile = window.__fejePerformanceProfile || { lightweightMode: false, reducedMotion: false, isHome: false };
  const allowDecorativeMotion = !profile.lightweightMode && !profile.isHome;

  const navLinks = document.querySelector('.nav-links');

  function simplifyDesktopNavigation(nav) {
    if (!nav) return;

    // Learning and Goals remain full sections on the homepage, but they do not
    // need permanent top-level navigation. This keeps the desktop header from
    // looking like a row of unrelated buttons.
    [...nav.children].forEach((item) => {
      if (!(item instanceof HTMLAnchorElement)) return;
      const href = item.getAttribute('href') || '';
      if (href === '#learning' || href === '#goals' || href.endsWith('#learning') || href.endsWith('#goals')) {
        item.remove();
      }
    });

    // Replace the multi-link Live Simulations dropdown with one clear Arcade
    // destination. The Arcade hub already exposes the individual simulations.
    const simulationDropdown = nav.querySelector(':scope > .dropdown');
    if (simulationDropdown) {
      const arcadeLink = document.createElement('a');
      arcadeLink.href = 'Arcade.html';
      arcadeLink.className = 'nav-arcade-link';
      arcadeLink.textContent = 'Arcade';
      simulationDropdown.replaceWith(arcadeLink);
    }

    if (!nav.querySelector('.sofra-panel-link')) {
      const sofraLink = document.createElement('a');
      sofraLink.href = '/sofra';
      sofraLink.className = 'sofra-panel-link';
      sofraLink.innerHTML = '<span aria-hidden="true">♡</span> Sofra Panel';
      const contactLink = nav.querySelector('.btn-primary');
      nav.insertBefore(sofraLink, contactLink || null);
    }
  }

  simplifyDesktopNavigation(navLinks);

  const navStyle = document.createElement('style');
  navStyle.id = 'feje-clean-nav-style';
  navStyle.textContent = `
    .nav-links .sofra-panel-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 13px;
      border-radius: 999px;
      color: #ffe9f3;
      border: 1px solid rgba(244,167,194,.22);
      background: linear-gradient(135deg, rgba(244,167,194,.13), rgba(198,168,255,.09));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 8px 26px rgba(244,167,194,.06);
    }
    .nav-links .sofra-panel-link span {
      color: #f8bfd5;
      font-size: 1rem;
      filter: drop-shadow(0 0 8px rgba(244,167,194,.35));
    }
    .nav-links .sofra-panel-link:hover {
      color: #fff;
      border-color: rgba(255,203,225,.42);
      background: linear-gradient(135deg, rgba(244,167,194,.22), rgba(198,168,255,.14));
      box-shadow: 0 10px 30px rgba(244,167,194,.12);
    }
    .nav-links .nav-arcade-link { white-space: nowrap; }
    @media (min-width: 901px) {
      .nav-links { gap: clamp(12px, 1.5vw, 24px); }
      .nav-links > a { white-space: nowrap; }
    }
  `;
  document.head.appendChild(navStyle);

  if (logoText && typeof window.ShinyText === 'function' && allowDecorativeMotion) {
    new window.ShinyText(logoText, {
      text: 'Itsmefeje',
      speed: 3,
      color: '#b5b5b5',
      shineColor: '#ffffff',
      pauseOnHover: true
    });
  } else if (logoText) {
    logoText.textContent = 'Itsmefeje';
  }

  // Tilt/magnet/blur effects are decorative. On touch, reduced-motion, data
  // saver, or lower-power devices, skipping their RAF listeners makes the site
  // noticeably calmer without removing any content or functionality.
  if (allowDecorativeMotion && typeof window.initReactBits === 'function') {
    const hasReactBitsTargets = document.querySelector('.tilted-card, .magnet-btn, .blur-text, .scroll-reveal');
    if (hasReactBitsTargets) window.initReactBits(document);
  } else {
    document.querySelectorAll('.reveal, .scroll-reveal').forEach((el) => el.classList.add('active'));
  }

  const revealTargets = document.querySelectorAll('.reveal');
  if (allowDecorativeMotion && revealTargets.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('active'));
  }

  // Spotlight tracking is useful on a mouse, but touchmove listeners on every
  // card add needless work while scrolling. Limit it to full desktop mode.
  if (allowDecorativeMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.spotlight-card').forEach((card) => {
      let ticking = false;
      card.addEventListener('mousemove', (event) => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
          card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
          ticking = false;
        });
      }, { passive: true });
    });
  }

  const mobileBtn = document.querySelector('.mobile-toggle');

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

  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      toggleMobileMenu(true);

      if (!href || href === '#') {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: profile.reducedMotion ? 'auto' : 'smooth' });
        return;
      }
      if (href.length <= 1) return;

      const section = document.getElementById(href.slice(1));
      if (!section) return;
      event.preventDefault();
      section.scrollIntoView({ behavior: profile.reducedMotion ? 'auto' : 'smooth' });
    });
  });

  const copyDiscord = document.getElementById('copy-discord');
  const discordVal = document.getElementById('discord-val');
  if (copyDiscord && discordVal) {
    copyDiscord.addEventListener('click', () => {
      const textToCopy = discordVal.textContent.replace('@ ', '').trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = discordVal.textContent;
        discordVal.textContent = 'Copied!';
        copyDiscord.classList.add('copied');
        copyDiscord.style.pointerEvents = 'none';
        setTimeout(() => {
          discordVal.textContent = originalText;
          copyDiscord.classList.remove('copied');
          copyDiscord.style.pointerEvents = 'auto';
        }, 2000);
      }).catch((error) => {
        console.error('Failed to copy text:', error);
      });
    });
  }
});
