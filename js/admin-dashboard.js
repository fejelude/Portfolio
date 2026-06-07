(() => {
  const state = {
    logs: [],
    filtered: [],
    page: 1,
    perPage: 25,
    storageWarning: ''
  };

  const els = {
    total: document.getElementById('stat-total'),
    sessions: document.getElementById('stat-sessions'),
    arcade: document.getElementById('stat-arcade'),
    security: document.getElementById('stat-security'),
    source: document.getElementById('stat-source'),
    logsBody: document.getElementById('logs-body'),
    logsState: document.getElementById('logs-state'),
    search: document.getElementById('log-search'),
    prev: document.getElementById('prev-page'),
    next: document.getElementById('next-page'),
    pageLabel: document.getElementById('page-label'),
    refresh: document.getElementById('refresh-logs'),
    date: document.getElementById('filter-date'),
    device: document.getElementById('filter-device'),
    browser: document.getElementById('filter-browser'),
    location: document.getElementById('filter-location'),
    page: document.getElementById('filter-page'),
    type: document.getElementById('filter-type'),
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

  function logDateValue(log) {
    const date = new Date(log.receivedAt || log.timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
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

  function setOptions(select, values) {
    if (!select) return;
    const current = select.value;
    const label = select.options[0]?.textContent || 'All';
    select.innerHTML = '';

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = label;
    select.appendChild(empty);

    values
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

    select.value = values.includes(current) ? current : '';
  }

  function applyFilter() {
    const query = els.search?.value.trim().toLowerCase() || '';
    const date = els.date?.value || '';
    const device = els.device?.value || '';
    const browser = els.browser?.value || '';
    const location = els.location?.value.trim().toLowerCase() || '';
    const page = els.page?.value.trim().toLowerCase() || '';
    const type = els.type?.value.trim().toLowerCase() || '';

    state.filtered = state.logs.filter((log) => {
      if (query && !searchableText(log).includes(query)) return false;
      if (date && logDateValue(log) !== date) return false;
      if (device && log.device !== device) return false;
      if (browser && log.browser !== browser) return false;
      if (location && !locationLabel(log).toLowerCase().includes(location)) return false;
      if (page && !(log.path || '').toLowerCase().includes(page)) return false;
      if (type && !(log.type || '').toLowerCase().includes(type)) return false;
      return true;
    });
    state.page = 1;
    renderTable();
  }

  function renderTable() {
    if (!els.logsBody) return;
    els.logsBody.innerHTML = '';

    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    state.page = Math.min(state.page, totalPages);

    if (!state.filtered.length) {
      const emptyText = state.logs.length ? 'No logs match that search.' : 'No activity logs yet.';
      setText(els.logsState, state.storageWarning ? `${emptyText} ${state.storageWarning}` : emptyText);
      setText(els.pageLabel, 'Page 1');
      if (els.prev) els.prev.disabled = true;
      if (els.next) els.next.disabled = true;
      return;
    }

    setText(els.logsState, state.storageWarning);
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
    const storage = data.storage || data.summary || {};
    state.logs = logs;
    state.filtered = [...logs];
    state.storageWarning = storage.persistent === false && storage.warning ? storage.warning : '';

    setText(els.total, String(data.summary?.total ?? logs.length));
    setText(els.sessions, String(data.summary?.sessions ?? 0));
    setText(els.arcade, String(data.summary?.arcadeEvents ?? 0));
    setText(els.security, String(data.summary?.securityEvents ?? 0));
    setText(els.source, storage.persistent ? 'Persistent Redis' : 'Runtime Only');

    setOptions(els.device, [...new Set(logs.map((log) => log.device).filter(Boolean))]);
    setOptions(els.browser, [...new Set(logs.map((log) => log.browser).filter(Boolean))]);
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
  [els.date, els.device, els.browser, els.location, els.page, els.type].forEach((control) => {
    control?.addEventListener('input', applyFilter);
    control?.addEventListener('change', applyFilter);
  });
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
