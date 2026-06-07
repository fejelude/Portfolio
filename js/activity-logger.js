(() => {
  const SESSION_KEY = 'portfolio-session-id';
  const QUEUE_KEY = 'portfolio-activity-queue';
  const ENDPOINT = '/api/activity';
  const MAX_QUEUE = 30;

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

  function readQueue() {
    try {
      return JSON.parse(window.localStorage.getItem(QUEUE_KEY) || '[]')
        .filter((item) => typeof item === 'string' && item);
    } catch (error) {
      return [];
    }
  }

  function writeQueue(items) {
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
    } catch (error) {}
  }

  function queue(body) {
    const items = readQueue();
    items.push(body);
    writeQueue(items);
  }

  async function post(body) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true
    });

    if (!response.ok) throw new Error('Activity log request failed.');
  }

  async function flushQueue() {
    if (!allowTracking()) return;

    const items = readQueue();
    if (!items.length) return;

    const remaining = [];
    for (const body of items) {
      try {
        await post(body);
      } catch (error) {
        remaining.push(body);
      }
    }
    writeQueue(remaining);
  }

  function send(type, details = {}) {
    if (!allowTracking()) return;

    const body = JSON.stringify(payload(type, details));
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }

    post(body).catch(() => queue(body));
  }

  window.PortfolioActivity = {
    track: send
  };

  window.addEventListener('DOMContentLoaded', () => {
    flushQueue();
    send('page_view', { section: document.body?.classList.contains('arcade-page') ? 'arcade' : 'site' });
  }, { once: true });
})();
