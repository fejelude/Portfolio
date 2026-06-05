(() => {
  const state = {
    logs: [],
    filtered: [],
    page: 1,
    perPage: 25
  };

  const els = {
    total: document.getElementById('stat-total'),
    sessions: document.getElementById('stat-sessions'),
    arcade: document.getElementById('stat-arcade'),
    source: document.getElementById('stat-source'),
    logsBody: document.getElementById('logs-body'),
    logsState: document.getElementById('logs-state'),
    search: document.getElementById('log-search'),
    prev: document.getElementById('prev-page'),
    next: document.getElementById('next-page'),
    pageLabel: document.getElementById('page-label'),
    refresh: document.getElementById('refresh-logs'),
    devices: document.getElementById('device-breakdown'),
    locations: document.getElementById('location-breakdown'),
    pages: document.getElementById('page-breakdown')
  };

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function formatDate(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString([], {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function locationLabel(log) {
    const parts = [log.location?.city, log.location?.region, log.location?.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Unknown';
  }

  function searchableText(log) {
    return [
      log.type,
      log.path,
      log.title,
      log.ip,
      log.device,
      log.browser,
      log.os,
      locationLabel(log),
      log.details?.simulation,
      log.details?.arcadeTheme
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function countMap(logs, selector) {
    return logs.reduce((acc, log) => {
      const key = selector(log) || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function renderBreakdown(target, data) {
    if (!target) return;
    target.innerHTML = '';

    const entries = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'state-text';
      empty.textContent = 'No data yet.';
      target.appendChild(empty);
      return;
    }

    entries.forEach(([label, count]) => {
      const row = document.createElement('div');
      row.className = 'breakdown-row';

      const name = document.createElement('span');
      name.textContent = label;

      const value = document.createElement('strong');
      value.textContent = String(count);

      row.append(name, value);
      target.appendChild(row);
    });
  }

  function applyFilter() {
    const query = els.search?.value.trim().toLowerCase() || '';
    state.filtered = query
      ? state.logs.filter((log) => searchableText(log).includes(query))
      : [...state.logs];
    state.page = 1;
    renderTable();
  }

  function renderTable() {
    if (!els.logsBody) return;
    els.logsBody.innerHTML = '';

    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    state.page = Math.min(state.page, totalPages);

    if (!state.filtered.length) {
      setText(els.logsState, state.logs.length ? 'No logs match that search.' : 'No activity logs yet.');
      setText(els.pageLabel, 'Page 1');
      if (els.prev) els.prev.disabled = true;
      if (els.next) els.next.disabled = true;
      return;
    }

    setText(els.logsState, '');
    const start = (state.page - 1) * state.perPage;
    const pageLogs = state.filtered.slice(start, start + state.perPage);

    pageLogs.forEach((log) => {
      const row = document.createElement('tr');
      [
        formatDate(log.receivedAt || log.timestamp),
        log.path || '/',
        log.ip || 'Unknown',
        locationLabel(log),
        `${log.device || 'Unknown'} / ${log.os || 'Unknown'}`,
        log.browser || 'Unknown',
        log.type || 'event'
      ].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      els.logsBody.appendChild(row);
    });

    setText(els.pageLabel, `Page ${state.page} of ${totalPages}`);
    if (els.prev) els.prev.disabled = state.page <= 1;
    if (els.next) els.next.disabled = state.page >= totalPages;
  }

  function render(data) {
    const logs = Array.isArray(data.logs) ? data.logs : [];
    state.logs = logs;
    state.filtered = [...logs];

    setText(els.total, String(data.summary?.total ?? logs.length));
    setText(els.sessions, String(data.summary?.sessions ?? 0));
    setText(els.arcade, String(data.summary?.arcadeEvents ?? 0));
    setText(els.source, data.summary?.source === 'upstash' ? 'Redis' : 'Runtime');

    renderBreakdown(els.devices, countMap(logs, (log) => log.device));
    renderBreakdown(els.locations, countMap(logs, locationLabel));
    renderBreakdown(els.pages, countMap(logs, (log) => log.path));
    renderTable();
  }

  async function loadLogs() {
    setText(els.logsState, 'Loading logs...');
    try {
      const response = await fetch('/api/activity?admin=1', {
        credentials: 'same-origin',
        cache: 'no-store'
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Unable to load logs.');
      }

      render(data);
    } catch (error) {
      setText(els.logsState, error.message || 'Unable to load logs.');
      if (els.logsBody) els.logsBody.innerHTML = '';
    }
  }

  els.search?.addEventListener('input', applyFilter);
  els.refresh?.addEventListener('click', loadLogs);
  els.prev?.addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1);
    renderTable();
  });
  els.next?.addEventListener('click', () => {
    state.page += 1;
    renderTable();
  });

  loadLogs();
})();
