(() => {
  const SESSION_KEY = 'portfolio-session-id';
  const ENDPOINT = '/api/activity';

  function allowTracking() {
    return navigator.doNotTrack !== '1' && window.doNotTrack !== '1';
  }

  function getSessionId() {
    try {
      let id = window.localStorage.getItem(SESSION_KEY);
      if (!id) {
        id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (error) {
      return '';
    }
  }

  function deviceType() {
    const width = window.innerWidth || 0;
    if (width <= 767) return 'Mobile';
    if (width <= 1024) return 'Tablet';
    return 'Desktop';
  }

  function payload(type, details = {}) {
    return {
      type,
      path: `${window.location.pathname}${window.location.search}`,
      title: document.title,
      referrer: document.referrer,
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
      device: deviceType(),
      viewport: {
        width: window.innerWidth || null,
        height: window.innerHeight || null
      },
      ...details
    };
  }

  function send(type, details = {}) {
    if (!allowTracking()) return;

    const body = JSON.stringify(payload(type, details));
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true
    }).catch(() => {});
  }

  window.PortfolioActivity = {
    track: send
  };

  window.addEventListener('DOMContentLoaded', () => {
    send('page_view', { section: document.body?.classList.contains('arcade-page') ? 'arcade' : 'site' });
  }, { once: true });
})();
