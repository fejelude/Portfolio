'use strict';

const { requireInstalledGuildAccess, requireCsrf, botFetch } = require('./_auth');
const { readGuildConfig, writeSection, sanitizeSection } = require('./_config');

const TEXT_CHANNEL_TYPES = new Set([0, 5]);
const CATEGORY_TYPE = 4;

function readBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'object' && !Buffer.isBuffer(request.body)) return request.body;
  try { return JSON.parse(String(request.body)); } catch { return {}; }
}

function channelSummary(channel) {
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parent_id || null,
    position: Number(channel.position || 0)
  };
}

function roleSummary(role, guildId) {
  return {
    id: role.id,
    name: role.name,
    color: Number(role.color || 0),
    position: Number(role.position || 0),
    managed: role.managed === true,
    everyone: role.id === guildId
  };
}

async function readBotGuild(guildId) {
  try {
    const guild = await botFetch(`/guilds/${guildId}?with_counts=true`);
    const [channels, roles] = await Promise.all([
      botFetch(`/guilds/${guildId}/channels`),
      botFetch(`/guilds/${guildId}/roles`)
    ]);
    return {
      installed: true,
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.icon || null,
        memberCount: Number(guild.approximate_member_count || 0),
        presenceCount: Number(guild.approximate_presence_count || 0),
        features: Array.isArray(guild.features) ? guild.features : []
      },
      channels: channels.map(channelSummary).sort((a, b) => a.position - b.position),
      roles: roles.map((role) => roleSummary(role, guildId)).sort((a, b) => b.position - a.position)
    };
  } catch (error) {
    if (error.status === 404 || error.status === 403) {
      return { installed: false, guild: null, channels: [], roles: [] };
    }
    throw error;
  }
}

function validateConfigReferences(section, value, metadata) {
  const channelById = new Map(metadata.channels.map((channel) => [channel.id, channel]));
  const roleById = new Map(metadata.roles.map((role) => [role.id, role]));
  const requireChannel = (id, allowedTypes, label) => {
    if (!id) return;
    const channel = channelById.get(id);
    if (!channel || (allowedTypes && !allowedTypes.has(channel.type))) {
      throw new Error(`${label} is not a valid channel in this server.`);
    }
  };
  const requireRole = (id, label, { assignable = false } = {}) => {
    if (!id) return;
    const role = roleById.get(id);
    if (!role || role.everyone) throw new Error(`${label} is not a valid role in this server.`);
    if (assignable && role.managed) {
      throw new Error(`${label} is managed by Discord or an integration and cannot be configured for this Sofra feature.`);
    }
  };

  if (section === 'welcome') {
    requireChannel(value.channelId, TEXT_CHANNEL_TYPES, 'Welcome channel');
    if (value.enabled && !value.channelId) {
      throw new Error('Enabled welcomes require a welcome channel.');
    }
  }
  if (section === 'levels') {
    requireChannel(value.notificationChannelId, TEXT_CHANNEL_TYPES, 'Level-up channel');
    for (const reward of value.roleRewards) requireRole(reward.roleId, 'Level reward role', { assignable: true });
  }
  if (section === 'automod') {
    for (const item of value.roles) requireRole(item.roleId, 'Automod role', { assignable: true });
    for (const item of value.channels) requireChannel(item.channelId, null, 'Automod channel');
  }
  if (section === 'autorole') {
    requireRole(value.roleId, 'Auto role', { assignable: true });
    if (value.enabled && !value.roleId) {
      throw new Error('Enabled Auto Role requires a role to assign.');
    }
  }
  if (section === 'booster') {
    requireRole(value.roleId, 'Booster role', { assignable: true });
    requireChannel(value.channelId, TEXT_CHANNEL_TYPES, 'Booster thank-you channel');
    if (value.enabled && (!value.roleId || !value.channelId)) {
      throw new Error('Enabled Booster automation requires both a booster role and thank-you channel.');
    }
  }
  if (section === 'modlog') {
    requireChannel(value.channelId, TEXT_CHANNEL_TYPES, 'Log channel');
    if (value.enabled && !value.channelId) {
      throw new Error('Enabled staff logging requires a log channel.');
    }
  }
  if (section === 'tickets') {
    requireChannel(value.panelChannelId, new Set([0]), 'Ticket panel channel');
    requireChannel(value.categoryId, new Set([CATEGORY_TYPE]), 'Ticket category');
    for (const roleId of value.staffRoleIds) requireRole(roleId, 'Ticket staff role');
    if (value.enabled && (!value.panelChannelId || !value.categoryId || value.staffRoleIds.length < 1)) {
      throw new Error('Enabled tickets require a panel channel, ticket category, and at least one staff role.');
    }
    if (value.enabled && !Object.values(value.types || {}).some(Boolean)) {
      throw new Error('Enabled tickets require at least one ticket type.');
    }
  }
}

function ticketPanelPayload(config) {
  const details = [
    ['bug', '🪲', 'Bug Reports', 'Report bugs, glitches, broken systems, exploits, or other game issues.', 3],
    ['report', '⚒️', 'Player Reports', 'Report exploiting, scams, harassment, rule-breaking, or harmful player behavior.', 4],
    ['other', '💬', 'Others', 'Ask private questions or get help with anything that does not fit the other categories.', 2]
  ];
  const active = details.filter(([type]) => config.types?.[type] !== false);
  return {
    embeds: [{
      color: 16033730,
      author: { name: '♡ Sofra Support Center' },
      title: '🎫 How can we help you?',
      description: 'Choose the ticket type that best matches your concern. Sofra will create a private channel visible only to you and the staff team.',
      fields: active.map(([, emoji, label, description]) => ({ name: `${emoji} ${label}`, value: description, inline: false })),
      footer: { text: 'One open ticket per type, per member • Sofra ♡' }
    }],
    components: active.length ? [{
      type: 1,
      components: active.map(([type, emoji, label, , style]) => ({
        type: 2,
        custom_id: `ticket:create:${type}`,
        label,
        emoji: { name: emoji },
        style
      }))
    }] : []
  };
}

async function deleteTicketPanel(config) {
  if (!config?.panelChannelId || !config?.panelMessageId) return;
  await botFetch(`/channels/${config.panelChannelId}/messages/${config.panelMessageId}`, { method: 'DELETE' }).catch(() => undefined);
}

async function reconcileTicketPanel(next, current) {
  if (!next.enabled) {
    await deleteTicketPanel(current);
    return { ...next, panelMessageId: null };
  }

  const payload = ticketPanelPayload(next);
  const sameChannel = current?.panelChannelId === next.panelChannelId;
  if (sameChannel && current?.panelMessageId) {
    try {
      const updated = await botFetch(`/channels/${next.panelChannelId}/messages/${current.panelMessageId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      return { ...next, panelMessageId: updated.id };
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }

  if (current?.panelMessageId) await deleteTicketPanel(current);
  const created = await botFetch(`/channels/${next.panelChannelId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return { ...next, panelMessageId: created.id };
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'PUT'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const guildId = String(request.query?.guildId || '');
  try {
    // Every request re-checks current Discord membership, management permission,
    // and bot presence. A client-supplied guild ID grants no authorization.
    const access = await requireInstalledGuildAccess(request, response, guildId);
    if (!access) return;
    const metadata = await readBotGuild(guildId);
    if (!metadata.installed) {
      return response.status(409).json({ ok: false, error: 'Sofra is no longer installed in this server.' });
    }
    const config = await readGuildConfig(guildId);

    if (request.method === 'GET') {
      return response.status(200).json({
        ok: true,
        guild: access.guild,
        botInstalled: metadata.installed,
        botGuild: metadata.guild,
        channels: metadata.channels,
        roles: metadata.roles,
        config
      });
    }

    if (!requireCsrf(request, response, access.session)) return;
    const body = readBody(request);
    const section = String(body.section || '');
    if (!Object.prototype.hasOwnProperty.call(config, section)) {
      return response.status(400).json({ ok: false, error: 'That Sofra settings section is not supported.' });
    }

    let next = sanitizeSection(section, body.value, config[section]);
    validateConfigReferences(section, next, metadata);
    if (section === 'tickets') next = await reconcileTicketPanel(next, config.tickets);
    await writeSection(guildId, section, next);

    return response.status(200).json({ ok: true, section, value: next, savedAt: Date.now() });
  } catch (error) {
    const status = Number(error.status || 0);
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const message = safeStatus === 500 ? (error.message || 'Sofra Panel could not save this setting.') : (error.message || 'Discord rejected this request.');
    return response.status(safeStatus).json({ ok: false, error: message });
  }
};
