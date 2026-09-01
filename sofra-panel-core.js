'use strict';

const CATEGORY_META = {
  profanity: ['Profanity', '🗯️'], severe_profanity: ['Severe Profanity', '⚠️'], sexual: ['Sexual / Explicit', '🔞'],
  sexual_harassment: ['Sexual Harassment', '🚷'], insults: ['Insults / Harassment', '💢'], hate: ['Hate / Slurs', '🚫'],
  threats: ['Threatening Language', '🛡️'], toxic: ['Toxic / Aggressive', '💬'], scam: ['Scam / Suspicious', '🔗'],
  spam: ['Spam Language', '📨'], custom: ['Custom Blacklist', '📝']
};
const CATEGORY_ACTIONS = ['ignore','log','warn','delete','delete_warn','delete_timeout','delete_timeout_alert','delete_kick','delete_ban','delete_alert','strike'];
const DEFAULT_ICONS = Object.freeze({
  brand: 'S',
  overview: '⌂',
  welcome: '♡',
  tickets: '▣',
  levels: '↗',
  boosters: '✦',
  moderation: '◇',
  logs: '≡',
  autorole: '＋',
  appearance: '✿'
});
const PANEL_ICON_KEYS = Object.freeze(Object.keys(DEFAULT_ICONS));
const PAGE_TITLES = {
  overview:'Overview',
  welcome:'Welcome System',
  tickets:'Tickets',
  levels:'Levels / XP',
  boosters:'Boosters',
  moderation:'Moderation',
  logs:'Logs',
  autorole:'Auto Role',
  appearance:'Appearance'
};
const PAGE_SECTIONS = {
  welcome:'welcome',
  tickets:'tickets',
  levels:'levels',
  boosters:'booster',
  moderation:'automod',
  logs:'modlog',
  autorole:'autorole',
  appearance:'panel'
};
const TEXT_TYPES = new Set([0,5]);
const state = { user:null, csrf:null, guilds:[], guildId:null, metadata:null, config:null, saved:null, activePage:'overview', dirty:new Set(), loading:false };
const $ = (id) => document.getElementById(id);
const clone = (value) => JSON.parse(JSON.stringify(value));
const selectedValues = (select) => [...select.selectedOptions].map((option) => option.value).filter(Boolean);

function toast(message, kind='success') {
  const item = document.createElement('div');
  item.className = `toast ${kind}`;
  item.textContent = message;
  $('toast-stack').appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function confirmAction(title, message) {
  return new Promise((resolve) => {
    $('confirm-title').textContent = title;
    $('confirm-message').textContent = message;
    $('confirm-modal').classList.remove('hidden');
    const finish = (value) => {
      $('confirm-modal').classList.add('hidden');
      $('confirm-accept').onclick = null;
      $('confirm-cancel').onclick = null;
      resolve(value);
    };
    $('confirm-accept').onclick = () => finish(true);
    $('confirm-cancel').onclick = () => finish(false);
  });
}

async function api(url, options={}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type':'application/json', ...(options.headers || {}) },
    credentials:'same-origin'
  });
  let payload = null;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function showAuth() {
  $('auth-gate').classList.remove('hidden');
  $('app-shell').classList.add('hidden');
}
function showApp() {
  $('auth-gate').classList.add('hidden');
  $('app-shell').classList.remove('hidden');
}
function finishBoot() {
  $('boot-screen').classList.add('done');
  setTimeout(() => $('boot-screen')?.remove(), 380);
}

function normalizeMediaUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  if (host === 'giphy.com' || host === 'www.giphy.com') {
    const embed = url.pathname.match(/^\/embed\/([a-zA-Z0-9]+)$/);
    if (embed) return `https://media.giphy.com/media/${embed[1]}/giphy.gif`;
    if (url.pathname.startsWith('/gifs/')) {
      const tail = url.pathname.split('/').filter(Boolean).pop() || '';
      const id = tail.split('-').pop();
      if (/^[a-zA-Z0-9]+$/.test(id)) return `https://media.giphy.com/media/${id}/giphy.gif`;
    }
  }
  return url.toString();
}

function renderMediaElement(element, key, icons=state.config?.panel?.icons || {}) {
  if (!element) return;
  const fallback = DEFAULT_ICONS[key] || '•';
  const mediaUrl = normalizeMediaUrl(icons?.[key]);
  element.classList.remove('has-media');
  element.replaceChildren();
  if (!mediaUrl) {
    element.textContent = fallback;
    return;
  }
  const image = document.createElement('img');
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.src = mediaUrl;
  image.addEventListener('error', () => {
    element.classList.remove('has-media');
    element.replaceChildren();
    element.textContent = fallback;
  }, { once:true });
  element.classList.add('has-media');
  element.appendChild(image);
}

function applyPanelMedia(root=document, icons=state.config?.panel?.icons || {}) {
  root.querySelectorAll?.('[data-icon-key]').forEach((element) => renderMediaElement(element, element.dataset.iconKey, icons));
}

function panelIconsFromInputs() {
  return Object.fromEntries(PANEL_ICON_KEYS.map((key) => [key, $(`panel-icon-${key}`)?.value.trim() || null]));
}

function renderAppearancePreviews() {
  const icons = panelIconsFromInputs();
  document.querySelectorAll('[data-icon-preview]').forEach((element) => renderMediaElement(element, element.dataset.iconPreview, icons));
}

async function initialize() {
  buildCategoryCards();
  bindStaticEvents();
  try {
    const data = await api('/api/sofra/guilds');
    state.user = data.user;
    state.csrf = data.csrf;
    state.guilds = data.guilds || [];
    renderUser();
    renderGuildOptions();
    renderServerPicker();
    showApp();
    const remembered = localStorage.getItem('sofra:lastGuild');
    const installed = state.guilds.filter((guild) => guild.botInstalled);
    const initial = state.guilds.some((guild) => guild.id === remembered && guild.botInstalled)
      ? remembered
      : (installed.length === 1 ? installed[0].id : null);
    if (initial) {
      $('guild-select').value = initial;
      await loadGuild(initial);
    } else {
      renderEmpty();
    }
    const auth = new URLSearchParams(location.search).get('auth');
    if (auth === 'success') toast('Signed in with Discord. Welcome to Sofra Panel ♡');
    if (auth === 'failed' || auth === 'invalid_state') toast('Discord sign-in did not complete. Please try again.', 'error');
    if (auth) history.replaceState({}, '', location.pathname);
  } catch (error) {
    if (error.status === 401) showAuth();
    else { showAuth(); toast(error.message, 'error'); }
  } finally {
    finishBoot();
  }
}

function renderUser() {
  $('user-name').textContent = state.user?.globalName || state.user?.username || 'Discord user';
  if (state.user?.avatar) {
    $('user-avatar').style.backgroundImage = `url(https://cdn.discordapp.com/avatars/${state.user.id}/${state.user.avatar}.png?size=64)`;
  }
}

function renderGuildOptions() {
  const select = $('guild-select');
  select.innerHTML = '<option value="">Choose a server</option>';
  for (const guild of state.guilds) {
    const option = document.createElement('option');
    option.value = guild.id;
    option.textContent = `${guild.name}${guild.botInstalled ? '' : ' • Add Sofra'}`;
    select.appendChild(option);
  }
}

function renderServerPicker() {
  const grid = $('server-grid');
  grid.innerHTML = '';
  if (!state.guilds.length) {
    grid.innerHTML = '<div class="server-empty card">No servers were found where you currently have Manage Server, Administrator, or owner access.</div>';
  }
  for (const guild of state.guilds) {
    const card = document.createElement('article');
    card.className = 'server-card card';
    const iconStyle = guild.iconUrl ? ` style="background-image:url('${escapeHtml(guild.iconUrl)}')"` : '';
    card.innerHTML = `<div class="server-icon"${iconStyle}>${escapeHtml(guild.name.slice(0, 1).toUpperCase())}</div><div class="server-details"><h3>${escapeHtml(guild.name)}</h3><span class="install-state ${guild.botInstalled ? 'installed' : ''}">${guild.botInstalled ? 'Sofra installed' : 'Sofra not installed'}</span></div>${guild.botInstalled ? '<button class="btn pink server-action">Manage</button>' : `<a class="btn ghost server-action" href="/api/sofra/install?guildId=${encodeURIComponent(guild.id)}" target="_blank" rel="noopener">Add Sofra</a>`}`;
    if (guild.botInstalled) {
      card.querySelector('.server-action').onclick = () => {
        $('guild-select').value = guild.id;
        loadGuild(guild.id);
      };
    } else {
      card.querySelector('.server-action').addEventListener('click', () => startInstallCheck(guild.id));
    }
    grid.appendChild(card);
  }
}

async function refreshGuilds(quiet=false) {
  try {
    const data = await api('/api/sofra/guilds');
    state.user = data.user;
    state.csrf = data.csrf;
    state.guilds = data.guilds || [];
    renderGuildOptions();
    renderServerPicker();
    if (!quiet) toast('Server installation status refreshed.');
    return state.guilds;
  } catch (error) {
    if (!quiet) toast(error.message, 'error');
    return [];
  }
}

function startInstallCheck(guildId) {
  let checks = 0;
  const timer = setInterval(async () => {
    checks += 1;
    const guilds = await refreshGuilds(true);
    const guild = guilds.find((item) => item.id === guildId);
    if (guild?.botInstalled) {
      clearInterval(timer);
      toast(`Sofra is now installed in ${guild.name}.`);
      $('guild-select').value = guildId;
      await loadGuild(guildId);
    } else if (checks >= 20) {
      clearInterval(timer);
    }
  }, 3000);
}

async function loadGuild(guildId) {
  if (!guildId) {
    state.guildId = null;
    state.metadata = null;
    state.config = null;
    state.saved = null;
    state.dirty.clear();
    renderEmpty();
    return;
  }
  const selected = state.guilds.find((guild) => guild.id === guildId);
  if (!selected?.botInstalled) {
    $('guild-select').value = state.guildId || '';
    renderEmpty();
    toast('Add Sofra to this server before opening its configuration.', 'error');
    return;
  }
  state.loading = true;
  $('content').classList.add('hidden');
  $('empty-state').classList.remove('hidden');
  $('empty-state').querySelector('h2').textContent = 'Loading server…';
  $('empty-state').querySelector('p').textContent = 'Fetching live channels, roles, and Sofra settings.';
  try {
    const data = await api(`/api/sofra/guild?guildId=${encodeURIComponent(guildId)}`);
    state.guildId = guildId;
    state.metadata = data;
    state.config = data.config;
    state.saved = clone(data.config);
    state.dirty.clear();
    localStorage.setItem('sofra:lastGuild', guildId);
    renderAll();
    if (!data.botInstalled) toast('Sofra is not installed in this server yet. Settings are read-only until the bot is added.', 'error');
  } catch (error) {
    toast(error.message, 'error');
    renderEmpty();
  } finally {
    state.loading = false;
  }
}

function renderEmpty() {
  $('content').classList.add('hidden');
  $('server-picker').classList.remove('hidden');
  $('empty-state').classList.add('hidden');
  applyPanelMedia();
  updateHeaderActions();
}

function renderAll() {
  $('empty-state').classList.add('hidden');
  $('server-picker').classList.add('hidden');
  $('content').classList.remove('hidden');
  renderOverview();
  renderWelcome();
  renderAutomod();
  renderTickets();
  renderLevels();
  renderBooster();
  renderModlog();
  renderAutoRole();
  renderPanelAppearance();
  applyPanelMedia();
  updateHeaderActions();
}

function setOptions(select, items, selected, placeholder='Not configured') {
  const selectedSet = new Set(Array.isArray(selected) ? selected : [selected].filter(Boolean));
  const multiple = select.multiple;
  select.innerHTML = '';
  if (!multiple) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    select.appendChild(empty);
  }
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.label;
    option.selected = selectedSet.has(item.id);
    select.appendChild(option);
  }
}

function channelItems(predicate=()=>true) {
  return (state.metadata?.channels || []).filter(predicate).map((channel) => ({ id:channel.id, label:`# ${channel.name}` }));
}
function roleItems() {
  return (state.metadata?.roles || []).filter((role) => !role.everyone).map((role) => ({ id:role.id, label:`@ ${role.name}${role.managed ? ' • managed' : ''}` }));
}
function assignableRoleItems() {
  return (state.metadata?.roles || []).filter((role) => !role.everyone && !role.managed).map((role) => ({ id:role.id, label:`@ ${role.name}` }));
}

function renderOverview() {
  const meta = state.metadata;
  const cfg = state.config;
  $('overview-guild-name').textContent = meta.botGuild?.name || meta.guild?.name || 'Discord server';
  $('bot-status-dot').className = meta.botInstalled ? 'online' : 'offline';
  $('bot-status-text').textContent = meta.botInstalled ? 'Sofra connected' : 'Sofra not installed';
  $('stat-members').textContent = meta.botGuild?.memberCount?.toLocaleString?.() || '—';
  $('stat-channels').textContent = String(meta.channels?.length || 0);
  $('stat-roles').textContent = String(meta.roles?.length || 0);

  const modules = [
    ['Welcome','welcome',cfg.welcome.enabled],
    ['Tickets','tickets',cfg.tickets.enabled],
    ['Levels / XP','levels',cfg.levels.enabled],
    ['Boosters','boosters',cfg.booster.enabled],
    ['Moderation','moderation',cfg.automod.enabled],
    ['Logs','logs',cfg.modlog.enabled],
    ['Auto Role','autorole',cfg.autorole.enabled]
  ];
  $('stat-modules').textContent = `${modules.filter(([, ,on]) => on).length}/${modules.length}`;
  const grid = $('module-grid');
  grid.innerHTML = '';
  for (const [name,page,on] of modules) {
    const card = document.createElement('article');
    card.className = 'module-card card';
    card.innerHTML = `<div class="module-card-head"><div class="module-title"><span class="module-icon media-slot" data-icon-key="${page}">${DEFAULT_ICONS[page]}</span><h3>${escapeHtml(name)}</h3></div><span class="module-state ${on ? 'on' : ''}">${on ? 'Enabled' : 'Disabled'}</span></div><p>${on ? 'Configured and currently active.' : 'Open this module to configure it.'}</p>`;
    card.onclick = () => navigate(page);
    grid.appendChild(card);
  }
  applyPanelMedia(grid);
}

function renderWelcome() {
  const c = state.config.welcome;
  const randomMessages = c.randomMessages !== false;
  $('welcome-enabled').checked = c.enabled;
  setOptions($('welcome-channel'), channelItems((x) => TEXT_TYPES.has(x.type)), c.channelId);
  $('welcome-random-messages').checked = randomMessages;
  $('welcome-message').value = c.messageTemplate || '';
  $('welcome-message').disabled = randomMessages;
  $('welcome-description').value = c.embedDescription || '';
  $('welcome-description').disabled = randomMessages;
  $('welcome-title').value = c.embedTitle || '';
  $('welcome-color').value = /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#f2a6ca';
  $('welcome-image').value = c.imageUrl || '';
  $('welcome-thumbnail').value = c.thumbnailMode || 'member';
  const help = $('welcome-message-help');
  if (help) help.textContent = randomMessages
    ? 'Random mode is active. Sofra chooses from her built-in welcome pool; your custom message is kept here for later.'
    : 'Supports {user.mention}, {user.name}, {server.name}, {server.member_count}, {user.avatar}, {server.icon}';
  renderWelcomePreview();
}
function renderWelcomePreview() {
  if (!state.config) return;
  const guild = state.metadata?.botGuild?.name || state.metadata?.guild?.name || 'Your Server';
  const replace = (text) => String(text || '')
    .replaceAll('{server.name}', guild)
    .replaceAll('{server.member_count}', String(state.metadata?.botGuild?.memberCount || 128))
    .replaceAll('{user.mention}', '@newmember')
    .replaceAll('{user.name}', 'newmember')
    .replaceAll('{user.avatar}', '')
    .replaceAll('{server.icon}', '');
  const randomMessages = $('welcome-random-messages')?.checked !== false;
  const title = replace($('welcome-title').value || 'Welcome to {server.name}! 🎀');
  const body = randomMessages
    ? '♡ Sofra will choose a different cute welcome from her built-in message pool for this member.'
    : replace($('welcome-description').value || $('welcome-message').value || 'Welcome ♡');
  const color = $('welcome-color').value || '#f2a6ca';
  const image = normalizeMediaUrl($('welcome-image').value);
  $('welcome-preview').style.borderLeftColor = color;
  $('welcome-preview').innerHTML = `<div class="preview-author">♡ Sofra Welcomes You</div><div class="preview-title">${escapeHtml(title)}</div><div class="preview-body">${escapeHtml(body)}</div>${image ? `<img class="preview-image" src="${escapeHtml(image)}" alt="Welcome preview image">` : ''}<div class="preview-footer">Sofra ♡ Welcome • Today</div>`;
}

function buildCategoryCards() {
  const grid = $('automod-categories');
  for (const [name,[label,emoji]] of Object.entries(CATEGORY_META)) {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `<div class="category-top"><label><input type="checkbox" data-category-enabled="${name}"><span>${emoji} ${escapeHtml(label)}</span></label></div><select data-category-action="${name}">${CATEGORY_ACTIONS.map((action) => `<option value="${action}">${action.replaceAll('_',' ')}</option>`).join('')}</select>`;
    grid.appendChild(card);
  }
}

function renderAutomod() {
  const c = state.config.automod;
  $('automod-enabled').checked = c.enabled;
  $('automod-mild').value = c.mildAction;
  $('automod-links').checked = c.linksEnabled;
  $('automod-invites').checked = c.invitesEnabled;
  $('automod-strikes').checked = c.strikesEnabled;
  $('automod-warning-cooldown').value = c.warningCooldownSeconds;
  $('automod-threshold').value = c.escalationThreshold;
  $('automod-timeout').value = c.timeoutMinutes;
  for (const name of Object.keys(CATEGORY_META)) {
    const setting = c.categories?.[name] || {};
    document.querySelector(`[data-category-enabled="${name}"]`).checked = setting.enabled === true;
    document.querySelector(`[data-category-action="${name}"]`).value = setting.action || 'delete_warn';
  }
  const byKind = (kind) => (c.roles || []).filter((x) => x.kind === kind).map((x) => x.roleId);
  const byMode = (mode) => (c.channels || []).filter((x) => x.mode === mode).map((x) => x.channelId);
  const roles = assignableRoleItems();
  const channels = channelItems();
  setOptions($('automod-manager-roles'), roles, byKind('manager'));
  setOptions($('automod-bypass'), roles, byKind('bypass'));
  setOptions($('automod-link-roles'), roles, byKind('link'));
  setOptions($('automod-invite-roles'), roles, byKind('invite'));
  setOptions($('automod-exempt'), channels, byMode('exempt'));
  setOptions($('automod-relaxed'), channels, byMode('relaxed'));
}

function renderTickets() {
  const c = state.config.tickets;
  $('tickets-enabled').checked = c.enabled !== false;
  setOptions($('tickets-panel-channel'), channelItems((x) => x.type === 0), c.panelChannelId);
  setOptions($('tickets-category'), channelItems((x) => x.type === 4), c.categoryId, 'Choose a category');
  setOptions($('tickets-staff'), roleItems(), c.staffRoleIds || []);
  $('ticket-type-bug').checked = c.types?.bug !== false;
  $('ticket-type-report').checked = c.types?.report !== false;
  $('ticket-type-other').checked = c.types?.other !== false;
}

function renderLevels() {
  const c = state.config.levels;
  $('levels-enabled').checked = c.enabled;
  $('levels-xp-min').value = c.xpMin;
  $('levels-xp-max').value = c.xpMax;
  $('levels-cooldown').value = c.cooldownSeconds;
  setOptions($('levels-channel'), channelItems((x) => TEXT_TYPES.has(x.type)), c.notificationChannelId);
  renderRoleRewards(c.roleRewards || []);
}
function renderRoleRewards(rewards) {
  const root = $('role-rewards');
  root.innerHTML = '';
  rewards.forEach(addRoleRewardRow);
  if (!rewards.length) {
    const empty = document.createElement('div');
    empty.className = 'info-box';
    empty.textContent = 'No role rewards yet. Add one when you want Sofra to grant a role at a specific level.';
    root.appendChild(empty);
  }
}
function addRoleRewardRow(reward={roleId:'',requiredLevel:1}) {
  const root = $('role-rewards');
  if (root.children.length === 1 && root.firstElementChild?.classList.contains('info-box')) root.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'reward-row';
  row.innerHTML = `<label>Reward role<select class="reward-role"></select></label><label>Level<input class="reward-level" type="number" min="1" max="1000" value="${Number(reward.requiredLevel || 1)}"></label><button class="remove-reward" title="Remove reward">×</button>`;
  root.appendChild(row);
  setOptions(row.querySelector('.reward-role'), assignableRoleItems(), reward.roleId, 'Choose role');
  row.querySelectorAll('select,input').forEach((el) => el.addEventListener('change', () => markDirty('levels')));
  row.querySelector('.remove-reward').onclick = () => { row.remove(); markDirty('levels'); };
}

function renderBooster() {
  const c = state.config.booster;
  $('booster-enabled').checked = c.enabled;
  setOptions($('booster-role'), assignableRoleItems(), c.roleId);
  setOptions($('booster-channel'), channelItems((x) => TEXT_TYPES.has(x.type)), c.channelId);
}
function renderModlog() {
  const c = state.config.modlog;
  $('modlog-enabled').checked = c.enabled;
  setOptions($('modlog-channel'), channelItems((x) => TEXT_TYPES.has(x.type)), c.channelId);
}
function renderAutoRole() {
  const c = state.config.autorole;
  $('autorole-enabled').checked = c.enabled;
  setOptions($('autorole-role'), assignableRoleItems(), c.roleId);
}
function renderPanelAppearance() {
  const icons = state.config.panel?.icons || {};
  for (const key of PANEL_ICON_KEYS) {
    const input = $(`panel-icon-${key}`);
    if (input) input.value = icons[key] || '';
  }
  renderAppearancePreviews();
}

function collect(section) {
  if (section === 'welcome') {
    return {
      enabled:$('welcome-enabled').checked,
      channelId:$('welcome-channel').value || null,
      randomMessages:$('welcome-random-messages').checked,
      messageTemplate:$('welcome-message').value,
      embedTitle:$('welcome-title').value,
      embedDescription:$('welcome-description').value || null,
      color:$('welcome-color').value,
      imageUrl:$('welcome-image').value || null,
      thumbnailMode:$('welcome-thumbnail').value
    };
  }
  if (section === 'levels') {
    return {
      enabled:$('levels-enabled').checked,
      notificationChannelId:$('levels-channel').value || null,
      xpMin:Number($('levels-xp-min').value),
      xpMax:Number($('levels-xp-max').value),
      cooldownSeconds:Number($('levels-cooldown').value),
      roleRewards:[...document.querySelectorAll('.reward-row')].map((row) => ({
        roleId:row.querySelector('.reward-role').value,
        requiredLevel:Number(row.querySelector('.reward-level').value)
      })).filter((x) => x.roleId),
      boosterMultiplier:1.5
    };
  }
  if (section === 'automod') {
    const roles = [
      ...selectedValues($('automod-manager-roles')).map((roleId) => ({roleId,kind:'manager'})),
      ...selectedValues($('automod-bypass')).map((roleId) => ({roleId,kind:'bypass'})),
      ...selectedValues($('automod-link-roles')).map((roleId) => ({roleId,kind:'link'})),
      ...selectedValues($('automod-invite-roles')).map((roleId) => ({roleId,kind:'invite'}))
    ];
    const channels = [
      ...selectedValues($('automod-exempt')).map((channelId) => ({channelId,mode:'exempt'})),
      ...selectedValues($('automod-relaxed')).map((channelId) => ({channelId,mode:'relaxed'}))
    ];
    const categories = {};
    for (const name of Object.keys(CATEGORY_META)) {
      categories[name] = {
        enabled:document.querySelector(`[data-category-enabled="${name}"]`).checked,
        action:document.querySelector(`[data-category-action="${name}"]`).value
      };
    }
    return {
      enabled:$('automod-enabled').checked,
      mildAction:$('automod-mild').value,
      linksEnabled:$('automod-links').checked,
      invitesEnabled:$('automod-invites').checked,
      warningCooldownSeconds:Number($('automod-warning-cooldown').value),
      escalationThreshold:Number($('automod-threshold').value),
      timeoutMinutes:Number($('automod-timeout').value),
      strikesEnabled:$('automod-strikes').checked,
      roles,
      channels,
      categories,
      words:state.config.automod.words || []
    };
  }
  if (section === 'tickets') {
    return {
      enabled:$('tickets-enabled').checked,
      panelChannelId:$('tickets-panel-channel').value || null,
      panelMessageId:state.config.tickets.panelMessageId || null,
      categoryId:$('tickets-category').value || null,
      staffRoleIds:selectedValues($('tickets-staff')).slice(0,5),
      types:{
        bug:$('ticket-type-bug').checked,
        report:$('ticket-type-report').checked,
        other:$('ticket-type-other').checked
      }
    };
  }
  if (section === 'booster') return { enabled:$('booster-enabled').checked, roleId:$('booster-role').value || null, channelId:$('booster-channel').value || null };
  if (section === 'modlog') return { enabled:$('modlog-enabled').checked, channelId:$('modlog-channel').value || null };
  if (section === 'autorole') return { enabled:$('autorole-enabled').checked, roleId:$('autorole-role').value || null };
  if (section === 'panel') return { icons:panelIconsFromInputs() };
  return null;
}

function markDirty(section) {
  if (!state.config || !section) return;
  state.dirty.add(section);
  updateHeaderActions();
  if (section === 'welcome') renderWelcomePreview();
  if (section === 'panel') renderAppearancePreviews();
}

function updateHeaderActions() {
  const section = PAGE_SECTIONS[state.activePage];
  const dirty = section && state.dirty.has(section);
  const canSave = Boolean(state.config && section);
  $('save-button').classList.toggle('hidden', !canSave);
  $('reset-button').classList.toggle('hidden', !canSave);
  $('unsaved-pill').classList.toggle('hidden', !dirty);
  $('header-actions').classList.toggle('active', canSave);
  $('save-button').disabled = !dirty || !state.metadata?.botInstalled;
  $('reset-button').disabled = !dirty;
}

async function saveCurrent() {
  const section = PAGE_SECTIONS[state.activePage];
  if (!section || !state.dirty.has(section)) return;
  let value = collect(section);
  if (section === 'tickets' && state.saved.tickets.enabled !== false && value.enabled === false) {
    const ok = await confirmAction('Disable the ticket system?', 'Sofra will remove the current ticket panel. Existing ticket channels are not deleted.');
    if (!ok) return;
  }
  $('save-button').disabled = true;
  $('save-button').textContent = 'Saving…';
  try {
    const result = await api(`/api/sofra/guild?guildId=${encodeURIComponent(state.guildId)}`, {
      method:'PUT',
      headers:{'x-sofra-csrf':state.csrf},
      body:JSON.stringify({section,value})
    });
    state.config[section] = clone(result.value);
    state.saved[section] = clone(result.value);
    state.dirty.delete(section);
    toast(section === 'panel' ? 'Panel appearance saved across this server.' : 'Changes saved. Sofra will pick them up automatically.');
    if (section === 'tickets') renderTickets();
    if (section === 'welcome') renderWelcome();
    if (section === 'automod') renderAutomod();
    if (section === 'levels') renderLevels();
    if (section === 'booster') renderBooster();
    if (section === 'autorole') renderAutoRole();
    if (section === 'panel') {
      renderPanelAppearance();
      applyPanelMedia();
    }
    renderOverview();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    $('save-button').textContent = 'Save changes';
    updateHeaderActions();
  }
}

function resetCurrent() {
  const section = PAGE_SECTIONS[state.activePage];
  if (!section || !state.dirty.has(section)) return;
  state.config[section] = clone(state.saved[section]);
  state.dirty.delete(section);
  if (section === 'welcome') renderWelcome();
  if (section === 'levels') renderLevels();
  if (section === 'automod') renderAutomod();
  if (section === 'tickets') renderTickets();
  if (section === 'booster') renderBooster();
  if (section === 'modlog') renderModlog();
  if (section === 'autorole') renderAutoRole();
  if (section === 'panel') {
    renderPanelAppearance();
    applyPanelMedia();
  }
  updateHeaderActions();
  toast('Unsaved changes reset.');
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('mobile-menu').setAttribute('aria-expanded', 'false');
}
function toggleSidebar() {
  const open = !$('sidebar').classList.contains('open');
  $('sidebar').classList.toggle('open', open);
  $('mobile-menu').setAttribute('aria-expanded', String(open));
}

function navigate(page) {
  if (!PAGE_TITLES[page]) return;
  state.activePage = page;
  document.querySelectorAll('.panel-page').forEach((el) => el.classList.toggle('active', el.dataset.page === page));
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.panel === page));
  $('page-title').textContent = PAGE_TITLES[page];
  closeSidebar();
  updateHeaderActions();
  window.scrollTo({top:0,behavior:'smooth'});
}

function bindStaticEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.panel)));
  $('mobile-menu').addEventListener('click', toggleSidebar);
  $('sidebar-scrim').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });

  $('save-button').addEventListener('click', saveCurrent);
  $('reset-button').addEventListener('click', resetCurrent);
  $('add-role-reward').addEventListener('click', () => { addRoleRewardRow(); markDirty('levels'); });
  $('guild-select').addEventListener('change', async (event) => {
    const next = event.target.value;
    if (state.dirty.size) {
      const ok = await confirmAction('Switch servers?', 'You have unsaved changes. Switching servers will discard them.');
      if (!ok) {
        event.target.value = state.guildId || '';
        return;
      }
    }
    await loadGuild(next);
  });
  $('refresh-guilds').addEventListener('click', () => refreshGuilds());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.guilds.some((guild) => !guild.botInstalled)) refreshGuilds(true);
  });

  const sectionByControl = {
    welcome:['welcome-enabled','welcome-channel','welcome-random-messages','welcome-message','welcome-title','welcome-description','welcome-color','welcome-image','welcome-thumbnail'],
    automod:['automod-enabled','automod-mild','automod-links','automod-invites','automod-strikes','automod-warning-cooldown','automod-threshold','automod-timeout','automod-manager-roles','automod-bypass','automod-link-roles','automod-invite-roles','automod-exempt','automod-relaxed'],
    tickets:['tickets-enabled','tickets-panel-channel','tickets-category','tickets-staff','ticket-type-bug','ticket-type-report','ticket-type-other'],
    levels:['levels-enabled','levels-xp-min','levels-xp-max','levels-cooldown','levels-channel'],
    booster:['booster-enabled','booster-role','booster-channel'],
    modlog:['modlog-enabled','modlog-channel'],
    autorole:['autorole-enabled','autorole-role'],
    panel:PANEL_ICON_KEYS.map((key) => `panel-icon-${key}`)
  };
  for (const [section,ids] of Object.entries(sectionByControl)) {
    for (const id of ids) {
      const el = $(id);
      ['change','input'].forEach((eventName) => el?.addEventListener(eventName, () => markDirty(section)));
    }
  }

  $('welcome-random-messages')?.addEventListener('change', () => {
    const randomMessages = $('welcome-random-messages').checked;
    $('welcome-message').disabled = randomMessages;
    $('welcome-description').disabled = randomMessages;
    const help = $('welcome-message-help');
    if (help) help.textContent = randomMessages
      ? 'Random mode is active. Sofra chooses from her built-in welcome pool; your custom message is kept here for later.'
      : 'Supports {user.mention}, {user.name}, {server.name}, {server.member_count}, {user.avatar}, {server.icon}';
    renderWelcomePreview();
  });

  document.querySelectorAll('[data-category-enabled],[data-category-action]').forEach((el) => el.addEventListener('change', () => markDirty('automod')));
  ['welcome-message','welcome-title','welcome-description','welcome-color','welcome-image','welcome-thumbnail'].forEach((id) => $(id)?.addEventListener('input', renderWelcomePreview));
  PANEL_ICON_KEYS.forEach((key) => $(`panel-icon-${key}`)?.addEventListener('input', renderAppearancePreviews));

  document.querySelectorAll('.option-search').forEach((input) => input.addEventListener('input', () => {
    const target = $(input.dataset.target);
    const query = input.value.trim().toLowerCase();
    [...target.options].forEach((option) => {
      option.hidden = Boolean(query && !option.textContent.toLowerCase().includes(query));
    });
  }));

  window.addEventListener('beforeunload', (event) => {
    if (state.dirty.size) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', initialize);
