const { getHeader, isAuthorized, isConfigured } = require('./admin-session');

function shell(title, body, { extra = '', bodyClass = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Itsmefeje</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin-page ${bodyClass}">
  <div class="admin-grid-bg" aria-hidden="true"></div>
  <div class="admin-scanline" aria-hidden="true"></div>
  ${body}
  ${extra}
</body>
</html>`;
}

function authMessage(url) {
  if (url.searchParams.has('setup')) {
    return {
      tone: 'warning',
      text: 'Server password is not configured yet.'
    };
  }

  if (url.searchParams.has('cooldown')) {
    const seconds = Math.max(1, Number(url.searchParams.get('cooldown')) || 60);
    return {
      tone: 'danger',
      text: `Too many failed attempts. Try again in ${seconds}s.`
    };
  }

  if (url.searchParams.has('error')) {
    return {
      tone: 'danger',
      text: 'Access denied. Check the password and try again.'
    };
  }

  return null;
}

function loginPage(url) {
  const message = authMessage(url);
  const alert = message ? `<p class="admin-alert ${message.tone}" role="alert">${message.text}</p>` : '';
  return shell('Admin Access', `
  <main class="admin-auth-shell">
    <section class="admin-auth-card admin-access-card ${message?.tone === 'danger' ? 'has-error' : ''}">
      <div class="admin-orbit" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="admin-auth-copy">
        <a class="admin-back-link" href="/">Main Website</a>
        <span class="admin-kicker">Restricted Access</span>
        <h1>Admin Panel</h1>
        <p class="admin-muted">Enter the private access password to unlock website activity monitoring.</p>
        ${alert}
      </div>
      <div class="admin-auth-access">
        <form class="admin-login-form" method="post" action="/api/admin-auth" data-admin-pad-form>
          <label class="admin-pad-label" id="admin-password-label">Access Code</label>
          <input id="admin-password" class="admin-pad-native" name="password" type="password" autocomplete="off" inputmode="numeric" aria-labelledby="admin-password-label" tabindex="-1" />
          <div class="admin-pad" data-code-length="8">
            <div class="admin-code-display" aria-hidden="true">
              <span class="code-slot" data-code-slot></span>
              <span class="code-slot" data-code-slot></span>
              <span class="code-slot" data-code-slot></span>
              <span class="code-slot" data-code-slot></span>
              <span class="code-slot" data-code-slot></span>
              <span class="code-slot" data-code-slot></span>
              <span class="code-slot" data-code-slot></span>
              <span class="code-slot" data-code-slot></span>
            </div>
            <p class="pad-status" data-pad-status role="status" aria-live="polite">AWAITING ACCESS CODE</p>
            <div class="admin-keypad" aria-label="Password keypad">
              <button class="pad-key" type="button" data-pad-key="1">1</button>
              <button class="pad-key" type="button" data-pad-key="2">2</button>
              <button class="pad-key" type="button" data-pad-key="3">3</button>
              <button class="pad-key" type="button" data-pad-key="4">4</button>
              <button class="pad-key" type="button" data-pad-key="5">5</button>
              <button class="pad-key" type="button" data-pad-key="6">6</button>
              <button class="pad-key" type="button" data-pad-key="7">7</button>
              <button class="pad-key" type="button" data-pad-key="8">8</button>
              <button class="pad-key" type="button" data-pad-key="9">9</button>
              <button class="pad-key pad-action" type="button" data-pad-action="clear">CLR</button>
              <button class="pad-key" type="button" data-pad-key="0">0</button>
              <button class="pad-key pad-action" type="button" data-pad-action="backspace">DEL</button>
            </div>
            <button class="pad-submit" type="submit" data-pad-submit disabled>Unlock Console</button>
          </div>
        </form>
        <p class="admin-microcopy">Server-side validation. Signed session. Private logs.</p>
      </div>
    </section>
  </main>`, {
    extra: '<script src="/js/admin-pad.js"></script>'
  });
}

function setupPage() {
  return shell('Admin Setup', `
  <main class="admin-auth-shell">
    <section class="admin-auth-card">
      <a class="admin-back-link" href="/">Main Website</a>
      <span class="admin-kicker">Access Ready</span>
      <h1>Admin Panel</h1>
      <p class="admin-muted">The built-in website password pad is active. Optional environment overrides can still be added later for a different password or signing key.</p>
    </section>
  </main>`);
}

function dashboardPage({ unlocked = false } = {}) {
  return shell('Admin Panel', `
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <a class="admin-back-link" href="/">Main Website</a>
        <span class="admin-kicker">Secure Console</span>
        <h1>Admin Panel</h1>
      </div>
      <div class="admin-actions">
        <button id="refresh-logs" type="button">Refresh</button>
        <form method="post" action="/api/admin-auth">
          <input type="hidden" name="action" value="logout" />
          <button type="submit" class="secondary">Logout</button>
        </form>
      </div>
    </header>

    <section class="summary-grid" aria-label="Summary">
      <article class="summary-card"><span>Total Events</span><strong id="stat-total">--</strong></article>
      <article class="summary-card"><span>Unique Sessions</span><strong id="stat-sessions">--</strong></article>
      <article class="summary-card"><span>Arcade Activity</span><strong id="stat-arcade">--</strong></article>
      <article class="summary-card"><span>Security Events</span><strong id="stat-security">--</strong></article>
      <article class="summary-card"><span>Storage</span><strong id="stat-source">--</strong></article>
    </section>

    <section class="admin-grid">
      <article class="admin-panel activity-panel">
        <div class="panel-heading">
          <div>
            <span class="admin-kicker">Live Logger</span>
            <h2>Recent Activity</h2>
          </div>
          <input id="log-search" type="search" placeholder="Search logs" />
        </div>

        <div class="filter-grid" aria-label="Activity filters">
          <label>Date <input id="filter-date" type="date" /></label>
          <label>Device <select id="filter-device"><option value="">All devices</option></select></label>
          <label>Browser <select id="filter-browser"><option value="">All browsers</option></select></label>
          <label>Location <input id="filter-location" type="search" placeholder="City or country" /></label>
          <label>Page <input id="filter-page" type="search" placeholder="/Arcade.html" /></label>
          <label>Activity <input id="filter-type" type="search" placeholder="page_view" /></label>
        </div>

        <div id="logs-state" class="state-text">Loading logs...</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Page</th>
                <th>IP</th>
                <th>Location</th>
                <th>Device</th>
                <th>Browser</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody id="logs-body"></tbody>
          </table>
        </div>
        <div class="pagination-row">
          <button id="prev-page" type="button" class="secondary">Previous</button>
          <span id="page-label">Page 1</span>
          <button id="next-page" type="button" class="secondary">Next</button>
        </div>
      </article>

      <aside class="breakdown-stack">
        <article class="admin-panel">
          <span class="admin-kicker">Visitors</span>
          <h2>Devices</h2>
          <div id="device-breakdown" class="breakdown-list"></div>
        </article>
        <article class="admin-panel">
          <span class="admin-kicker">Geo</span>
          <h2>Locations</h2>
          <div id="location-breakdown" class="breakdown-list"></div>
        </article>
        <article class="admin-panel">
          <span class="admin-kicker">Traffic</span>
          <h2>Pages</h2>
          <div id="page-breakdown" class="breakdown-list"></div>
        </article>
      </aside>
    </section>
  </main>
  ${unlocked ? '<div class="unlock-flash" aria-hidden="true"><span>ACCESS GRANTED</span></div>' : ''}`, {
    extra: '<script src="/js/admin-dashboard.js"></script>',
    bodyClass: unlocked ? 'admin-unlocked' : ''
  });
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');

  const url = new URL(request.url, `https://${getHeader(request, 'host') || 'localhost'}`);
  if (!isConfigured()) return response.status(503).send(setupPage());
  if (!isAuthorized(request)) return response.status(401).send(loginPage(url));

  return response.status(200).send(dashboardPage({ unlocked: url.searchParams.has('unlocked') }));
};
