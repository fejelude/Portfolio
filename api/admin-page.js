function getEnvToken() {
  return process.env.ADMIN_ACCESS_TOKEN || '';
}

function getHeader(request, name) {
  const headers = request.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, pair) => {
    const index = pair.indexOf('=');
    if (index === -1) return cookies;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function isAuthorized(request) {
  const token = getEnvToken();
  if (!token) return false;

  const cookies = parseCookies(getHeader(request, 'cookie'));
  if (cookies.portfolio_admin === token) return true;

  const auth = getHeader(request, 'authorization');
  return auth === `Bearer ${token}`;
}

function shell(title, body, extra = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Itsmefeje</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin-page">
  ${body}
  ${extra}
</body>
</html>`;
}

function loginPage(errorMessage = '') {
  const error = errorMessage ? `<p class="admin-alert" role="alert">${errorMessage}</p>` : '';
  return shell('Admin Sign In', `
  <main class="admin-auth-shell">
    <section class="admin-auth-card">
      <a class="admin-back-link" href="/Arcade.html">Back to Arcade</a>
      <span class="admin-kicker">Restricted</span>
      <h1>Admin Panel</h1>
      <p class="admin-muted">Sign in to view private website activity.</p>
      ${error}
      <form class="admin-login-form" method="post" action="/api/admin-auth">
        <label for="admin-token">Access token</label>
        <input id="admin-token" name="token" type="password" autocomplete="current-password" required />
        <button type="submit">Continue</button>
      </form>
    </section>
  </main>`);
}

function setupPage() {
  return shell('Admin Setup', `
  <main class="admin-auth-shell">
    <section class="admin-auth-card">
      <a class="admin-back-link" href="/Arcade.html">Back to Arcade</a>
      <span class="admin-kicker">Setup Required</span>
      <h1>Admin Panel</h1>
      <p class="admin-muted">Set <code>ADMIN_ACCESS_TOKEN</code> in Vercel before this route can unlock private logs.</p>
    </section>
  </main>`);
}

function dashboardPage() {
  return shell('Admin Panel', `
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <a class="admin-back-link" href="/Arcade.html">Back to Arcade</a>
        <span class="admin-kicker">Restricted</span>
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
      <article class="summary-card"><span>Sessions</span><strong id="stat-sessions">--</strong></article>
      <article class="summary-card"><span>Arcade Activity</span><strong id="stat-arcade">--</strong></article>
      <article class="summary-card"><span>Storage</span><strong id="stat-source">--</strong></article>
    </section>

    <section class="admin-grid">
      <article class="admin-panel">
        <div class="panel-heading">
          <h2>Recent Visitors</h2>
          <input id="log-search" type="search" placeholder="Search logs" />
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
  </main>`, '<script src="/js/admin-dashboard.js"></script>');
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');

  const token = getEnvToken();
  if (!token) return response.status(503).send(setupPage());

  const url = new URL(request.url, `https://${getHeader(request, 'host') || 'localhost'}`);
  if (!isAuthorized(request)) {
    const message = url.searchParams.has('error') ? 'Invalid access token.' : '';
    return response.status(401).send(loginPage(message));
  }

  return response.status(200).send(dashboardPage());
};
