'use strict';

const redis = require('./_redis');

const CATEGORIES = Object.freeze({
  profanity: 'delete_warn',
  severe_profanity: 'delete_timeout_alert',
  sexual: 'delete_warn',
  sexual_harassment: 'delete_timeout_alert',
  insults: 'delete_warn',
  hate: 'delete_timeout_alert',
  threats: 'delete_timeout_alert',
  toxic: 'warn',
  scam: 'delete_alert',
  spam: 'delete',
  custom: 'delete_warn'
});
const MODERATE_AUTOMOD_CATEGORIES = new Set([
  'profanity',
  'severe_profanity',
  'sexual',
  'sexual_harassment',
  'insults',
  'hate',
  'threats',
  'scam',
  'custom'
]);
const CATEGORY_ACTIONS = new Set(['ignore', 'log', 'warn', 'delete', 'delete_warn', 'delete_timeout', 'delete_timeout_alert', 'delete_kick', 'delete_ban', 'delete_alert', 'strike']);
const PANEL_ICON_KEYS = Object.freeze(['brand', 'overview', 'welcome', 'tickets', 'levels', 'boosters', 'moderation', 'logs', 'autorole', 'appearance']);

const DEFAULTS = Object.freeze({
  welcome: Object.freeze({
    enabled: false,
    channelId: null,
    randomMessages: true,
    messageTemplate: 'Hi {user.mention}! We’re so happy you’re here. Make yourself at home and enjoy {server.name} ♡',
    embedTitle: 'Welcome to {server.name}! 🎀',
    embedDescription: null,
    color: '#f4a7c2',
    imageUrl: null,
    thumbnailMode: 'member'
  }),
  levels: Object.freeze({
    enabled: false,
    notificationChannelId: null,
    xpMin: 15,
    xpMax: 25,
    cooldownSeconds: 60,
    roleRewards: Object.freeze([]),
    boosterMultiplier: 1.5
  }),
  automod: Object.freeze({
    enabled: false,
    mildAction: 'allow',
    linksEnabled: false,
    invitesEnabled: true,
    warningCooldownSeconds: 30,
    escalationThreshold: 4,
    timeoutMinutes: 10,
    strikesEnabled: true,
    roles: Object.freeze([]),
    channels: Object.freeze([]),
    categories: Object.freeze(Object.fromEntries(Object.entries(CATEGORIES).map(([name, action]) => [name, Object.freeze({ enabled: MODERATE_AUTOMOD_CATEGORIES.has(name), action })]))),
    words: Object.freeze([])
  }),
  autorole: Object.freeze({ enabled: false, roleId: null }),
  booster: Object.freeze({ enabled: false, roleId: null, channelId: null }),
  modlog: Object.freeze({ enabled: false, channelId: null }),
  tickets: Object.freeze({
    enabled: true,
    panelChannelId: null,
    panelMessageId: null,
    categoryId: null,
    staffRoleIds: Object.freeze([]),
    types: Object.freeze({ bug: true, report: true, other: true })
  }),
  panel: Object.freeze({
    icons: Object.freeze(Object.fromEntries(PANEL_ICON_KEYS.map((key) => [key, null])))
  })
});

function guildKey(guildId) {
  return `sofra:guild:${guildId}:config`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function text(value, max, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function nullableText(value, max) {
  const normalized = text(value, max, '');
  return normalized || null;
}

function snowflake(value, fallback = null) {
  const normalized = String(value || '').trim();
  return /^\d{17,20}$/.test(normalized) ? normalized : fallback;
}

function boundedInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function uniqueSnowflakes(values, max = 25) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => snowflake(value)).filter(Boolean))].slice(0, max);
}

function safeUrl(value) {
  const raw = nullableText(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

function color(value, fallback = '#f4a7c2') {
  const normalized = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

function normalizeConfig(raw = {}) {
  const out = {};
  for (const [section, defaults] of Object.entries(DEFAULTS)) {
    const value = raw[section] && typeof raw[section] === 'object' ? raw[section] : {};
    out[section] = { ...clone(defaults), ...value };
    if (section === 'automod') {
      out.automod.categories = {
        ...clone(DEFAULTS.automod.categories),
        ...(value.categories && typeof value.categories === 'object' ? value.categories : {})
      };
    }
    if (section === 'tickets') {
      out.tickets.types = {
        ...clone(DEFAULTS.tickets.types),
        ...(value.types && typeof value.types === 'object' ? value.types : {})
      };
    }
    if (section === 'panel') {
      out.panel.icons = { ...clone(DEFAULTS.panel.icons), ...(value.icons && typeof value.icons === 'object' ? value.icons : {}) };
    }
  }
  return out;
}

async function readGuildConfig(guildId) {
  const fields = await redis.hgetall(guildKey(guildId));
  const parsed = {};
  for (const section of Object.keys(DEFAULTS)) {
    if (!fields[section]) continue;
    try { parsed[section] = JSON.parse(fields[section]); } catch { /* malformed field falls back safely */ }
  }
  return normalizeConfig(parsed);
}

async function writeSection(guildId, section, value) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULTS, section)) throw new Error('Unsupported Sofra configuration section.');
  const payload = JSON.stringify(value);
  await redis.hset(guildKey(guildId), {
    [section]: payload,
    updatedAt: String(Date.now())
  });
  return value;
}

function sanitizeWelcome(input, current) {
  const randomMessages = typeof input?.randomMessages === 'boolean'
    ? input.randomMessages
    : current.randomMessages !== false;
  return {
    enabled: input?.enabled === true,
    channelId: snowflake(input?.channelId),
    randomMessages,
    messageTemplate: nullableText(input?.messageTemplate, 1800) || current.messageTemplate || DEFAULTS.welcome.messageTemplate,
    embedTitle: nullableText(input?.embedTitle, 256) || DEFAULTS.welcome.embedTitle,
    embedDescription: nullableText(input?.embedDescription, 4000),
    color: color(input?.color, current.color || DEFAULTS.welcome.color),
    imageUrl: safeUrl(input?.imageUrl),
    thumbnailMode: input?.thumbnailMode === 'none' ? 'none' : 'member'
  };
}

function sanitizeLevels(input) {
  let xpMin = boundedInteger(input?.xpMin, 1, 100, DEFAULTS.levels.xpMin);
  let xpMax = boundedInteger(input?.xpMax, 1, 100, DEFAULTS.levels.xpMax);
  if (xpMin > xpMax) [xpMin, xpMax] = [xpMax, xpMin];
  const roleRewards = Array.isArray(input?.roleRewards)
    ? input.roleRewards
        .map((reward) => ({
          roleId: snowflake(reward?.roleId),
          requiredLevel: boundedInteger(reward?.requiredLevel, 1, 1000, 1)
        }))
        .filter((reward) => reward.roleId)
        .slice(0, 25)
    : [];
  return {
    enabled: input?.enabled === true,
    notificationChannelId: snowflake(input?.notificationChannelId),
    xpMin,
    xpMax,
    cooldownSeconds: boundedInteger(input?.cooldownSeconds, 15, 3600, DEFAULTS.levels.cooldownSeconds),
    roleRewards,
    boosterMultiplier: 1.5
  };
}

function sanitizeAutomod(input, current) {
  const roles = Array.isArray(input?.roles)
    ? input.roles
        .map((item) => ({ roleId: snowflake(item?.roleId), kind: ['bypass', 'manager', 'link', 'invite'].includes(item?.kind) ? item.kind : null }))
        .filter((item) => item.roleId && item.kind)
        .slice(0, 60)
    : [];
  const channels = Array.isArray(input?.channels)
    ? input.channels
        .map((item) => ({ channelId: snowflake(item?.channelId), mode: ['exempt', 'relaxed'].includes(item?.mode) ? item.mode : null }))
        .filter((item) => item.channelId && item.mode)
        .slice(0, 60)
    : [];
  const categories = {};
  for (const [name, defaultAction] of Object.entries(CATEGORIES)) {
    const source = input?.categories?.[name] || current?.categories?.[name] || DEFAULTS.automod.categories[name];
    categories[name] = {
      enabled: source.enabled === true,
      action: CATEGORY_ACTIONS.has(source.action) ? source.action : defaultAction
    };
  }
  return {
    enabled: input?.enabled === true,
    mildAction: ['allow', 'warn', 'delete'].includes(input?.mildAction) ? input.mildAction : 'allow',
    linksEnabled: input?.linksEnabled === true,
    invitesEnabled: input?.invitesEnabled !== false,
    warningCooldownSeconds: boundedInteger(input?.warningCooldownSeconds, 5, 600, 30),
    escalationThreshold: boundedInteger(input?.escalationThreshold, 2, 20, 4),
    timeoutMinutes: boundedInteger(input?.timeoutMinutes, 0, 1440, 10),
    strikesEnabled: input?.strikesEnabled !== false,
    roles,
    channels,
    categories,
    words: Array.isArray(current?.words) ? current.words : []
  };
}

function sanitizeAutoRole(input) {
  return { enabled: input?.enabled === true, roleId: snowflake(input?.roleId) };
}

function sanitizeBooster(input) {
  return {
    enabled: input?.enabled === true,
    roleId: snowflake(input?.roleId),
    channelId: snowflake(input?.channelId)
  };
}

function sanitizeModLog(input) {
  return { enabled: input?.enabled === true, channelId: snowflake(input?.channelId) };
}

function sanitizeTickets(input, current) {
  return {
    enabled: input?.enabled !== false,
    panelChannelId: snowflake(input?.panelChannelId),
    panelMessageId: snowflake(current?.panelMessageId),
    categoryId: snowflake(input?.categoryId),
    staffRoleIds: uniqueSnowflakes(input?.staffRoleIds, 5),
    types: {
      bug: input?.types?.bug !== false,
      report: input?.types?.report !== false,
      other: input?.types?.other !== false
    }
  };
}

function sanitizePanel(input) {
  const icons = {};
  for (const key of PANEL_ICON_KEYS) icons[key] = safeUrl(input?.icons?.[key]);
  return { icons };
}

function sanitizeSection(section, input, current) {
  const base = current || clone(DEFAULTS[section]);
  switch (section) {
    case 'welcome': return sanitizeWelcome(input, base);
    case 'levels': return sanitizeLevels(input, base);
    case 'automod': return sanitizeAutomod(input, base);
    case 'autorole': return sanitizeAutoRole(input, base);
    case 'booster': return sanitizeBooster(input, base);
    case 'modlog': return sanitizeModLog(input, base);
    case 'tickets': return sanitizeTickets(input, base);
    case 'panel': return sanitizePanel(input, base);
    default: throw new Error('Unsupported Sofra configuration section.');
  }
}

module.exports = {
  DEFAULTS,
  CATEGORIES,
  PANEL_ICON_KEYS,
  guildKey,
  readGuildConfig,
  writeSection,
  sanitizeSection,
  snowflake
};
