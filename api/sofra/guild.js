'use strict';

const { requireInstalledGuildAccess, requireCsrf, botFetch, requiredEnv } = require('./_auth');
const { readGuildConfig, writeSection, sanitizeSection } = require('./_config');
const { validateConfigReferences } = require('./_guild-validation');

const TICKET_PANEL_BANNER = 'https://cdn.discordapp.com/attachments/1489489015269883954/1542155954894807060/file_00000000c470821189498cb6c7c22668.png?ex=6a903427&is=6a8ee2a7&hm=b81ddd90b880a344e24f9a1ef98df817055cd9876bb28d364de8d734647a6bc3&';

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

async function readBotGuild(guildId, actorId = null) {
  try {
    const guild = await botFetch(`/guilds/${guildId}?with_counts=true`);
    const [channels, roles] = await Promise.all([
      botFetch(`/guilds/${guildId}/channels`),
      botFetch(`/guilds/${guildId}/roles`)
    ]);

    let validation = null;
    if (actorId) {
      const botUserId = requiredEnv('DISCORD_CLIENT_ID');
      const [botMember, actorMember] = await Promise.all([
        botFetch(`/guilds/${guildId}/members/${botUserId}`),
        botFetch(`/guilds/${guildId}/members/${actorId}`)
      ]);
      validation = {
        guildId,
        ownerId: guild.owner_id,
        channels,
        roles,
        botMember,
        actorMember
      };
    }

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
      roles: roles.map((role) => roleSummary(role, guildId)).sort((a, b) => b.position - a.position),
      validation
    };
  } catch (error) {
    if (error.status === 404 || error.status === 403) {
      return { installed: false, guild: null, channels: [], roles: [], validation: null };
    }
    throw error;
  }
}

function ticketPanelPayload(config) {
  const details = [
    ['bug', '🪲', 'Bug Reports', 'Report bugs, glitches, broken systems, exploits, or other game issues. Thorough, valid reports may be eligible for approximately **1,000–100,000 Robux**, depending on severity and importance. Critical bugs and exploits receive higher consideration; rewards are not guaranteed.', 3],
    ['report', '⚒️', 'Player Reports', 'Report exploiting, bug abuse, scams, harassment, rule-breaking, or other harmful player behavior.', 4],
    ['other', '💬', 'Others', 'Ask private questions or get help with account/game issues, general support, concerns, or anything that does not fit above.', 2]
  ];
  const active = details.filter(([type]) => config.types?.[type] !== false);
  return {
    embeds: [
      {
        color: 16033730,
        image: { url: TICKET_PANEL_BANNER }
      },
      {
        color: 16033730,
        author: { name: '♡ Sofra Support Center' },
        title: '🎫 How can we help you?',
        description: 'Choose the ticket type that best matches your concern. Sofra will create a private channel visible only to you and the staff team.',
        fields: active.map(([, emoji, label, description]) => ({ name: `${emoji} ${label}`, value: description, inline: false })),
        footer: { text: 'One open ticket per type, per member • Sofra ♡' }
      }
    ],
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

    // GET only needs display metadata. PUT additionally resolves the signed-in
    // member and Sofra herself so channel permissions and role hierarchy can be
    // validated against the same Discord rules the bot uses at runtime.
    const actorId = request.method === 'PUT' ? access.session.user.id : null;
    const metadata = await readBotGuild(guildId, actorId);
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
    validateConfigReferences(section, next, config[section], metadata);
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
