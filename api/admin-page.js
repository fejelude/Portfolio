const { getHeader, isAuthorized, isConfigured } = require('./admin-session');

function shell(title, body, { extra = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Itsmefeje</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin-page">
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
  const alert = message ? `<p class="admin-alert ${message.tone}" id="admin-alert" role="alert">${message.text}</p>` : '';
  return shell('Admin Access', `
  <main class="admin-auth-shell wrap">
    <section class="admin-auth-card">
      <div class="admin-auth-copy">
        <a class="admin-back-link" href="/">Main Website</a>

        <h1>Admin Panel</h1>
        <p class="admin-muted">Sign in to view website activity.</p>
        ${alert}
      </div>
      <div class="admin-auth-access">
        <form class="admin-login-form" method="post" action="/api/admin-auth" data-admin-pad-form>
          <label for="admin-password">Access code</label>
          <input id="admin-password" name="password" type="password" autocomplete="current-password" required${message ? ' aria-describedby="admin-alert"' : ''} />
          <details class="admin-pad" hidden>
            <summary>Use the numeric keypad</summary>
            <div class="admin-keypad" role="group" aria-label="Password keypad">
              <button class="pad-key" type="button" data-pad-key="1">1</button>
              <button class="pad-key" type="button" data-pad-key="2">2</button>
              <button class="pad-key" type="button" data-pad-key="3">3</button>
              <button class="pad-key" type="button" data-pad-key="4">4</button>
              <button class="pad-key" type="button" data-pad-key="5">5</button>
              <button class="pad-key" type="button" data-pad-key="6">6</button>
              <button class="pad-key" type="button" data-pad-key="7">7</button>
              <button class="pad-key" type="button" data-pad-key="8">8</button>
              <button class="pad-key" type="button" data-pad-key="9">9</button>
              <button class="pad-key pad-action" type="button" data-pad-action="clear">Clear</button>
              <button class="pad-key" type="button" data-pad-key="0">0</button>
              <button class="pad-key pad-action" type="button" data-pad-action="backspace">Delete</button>
            </div>
          </details>
          <button class="pad-submit" type="submit">Sign in</button>
        </form>
      </div>
    </section>
  </main>`, {
    extra: '<script src="/js/admin-pad.js"></script>'
  });
}

function setupPage() {
  return shell('Admin Setup', `
  <main class="admin-auth-shell wrap">
    <section class="admin-auth-card">
      <a class="admin-back-link" href="/">Main Website</a>

      <h1>Admin Panel</h1>
      <p class="admin-muted">The built-in website password pad is active. Optional environment overrides can still be added later for a different password or signing key.</p>
    </section>
  </main>`);
}

function dashboardPage() {
  return shell('Admin Panel', `
  <main class="admin-shell wrap">
    <header class="admin-header">
      <div>
        <a class="admin-back-link" href="/">Main Website</a>

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

            <h2>Recent Activity</h2>
          </div>
          <label class="log-search-label">Search logs<input id="log-search" type="search" /></label>
        </div>

        <div class="filter-grid" aria-label="Activity filters">
          <label>Date <input id="filter-date" type="date" /></label>
          <label>Device <select id="filter-device"><option value="">All devices</option></select></label>
          <label>Browser <select id="filter-browser"><option value="">All browsers</option></select></label>
          <label>Location <input id="filter-location" type="search" placeholder="City or country" /></label>
          <label>Page <input id="filter-page" type="search" placeholder="/Arcade.html" /></label>
          <label>Activity <input id="filter-type" type="search" placeholder="page_view" /></label>
        </div>

        <div id="logs-state" class="state-text" role="status">Loading logs…</div>
        <div class="table-wrap" role="region" aria-label="Recent activity table" tabindex="0">
          <table>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Page</th>
                <th scope="col">IP</th>
                <th scope="col">Location</th>
                <th scope="col">Device</th>
                <th scope="col">Browser</th>
                <th scope="col">Event</th>
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

          <h2>Devices</h2>
          <div id="device-breakdown" class="breakdown-list"></div>
        </article>
        <article class="admin-panel">

          <h2>Locations</h2>
          <div id="location-breakdown" class="breakdown-list"></div>
        </article>
        <article class="admin-panel">

          <h2>Pages</h2>
          <div id="page-breakdown" class="breakdown-list"></div>
        </article>
      </aside>
    </section>
  </main>`, {
    extra: '<script src="/js/admin-dashboard.js"></script>'
  });
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');

  const url = new URL(request.url, `https://${getHeader(request, 'host') || 'localhost'}`);
  if (!isConfigured()) return response.status(503).send(setupPage());
  if (!isAuthorized(request)) return response.status(401).send(loginPage(url));

  return response.status(200).send(dashboardPage());
};
