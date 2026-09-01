'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PERMISSIONS } = require('./_discord-permissions');
const { validateConfigReferences } = require('./_guild-validation');

const GUILD_ID = '123456789012345678';
const BOT_ID = '223456789012345678';
const ACTOR_ID = '323456789012345678';
const BOT_ROLE_ID = '423456789012345678';
const ACTOR_ROLE_ID = '523456789012345678';
const TARGET_ROLE_ID = '623456789012345678';
const PANEL_CHANNEL_ID = '723456789012345678';
const CATEGORY_ID = '823456789012345678';

function role(id, position, permissions = 0n, managed = false) {
  return { id, name: id === GUILD_ID ? '@everyone' : `role-${position}`, position, permissions: String(permissions), managed };
}

function channel(id, type, overwrites = []) {
  return { id, name: `channel-${id.slice(-3)}`, type, position: 0, permission_overwrites: overwrites };
}

function metadata({ botPermissions, botPosition = 8, actorPosition = 10, targetPosition = 4, panelOverwrites = [], categoryOverwrites = [] } = {}) {
  const base = botPermissions ?? (
    PERMISSIONS.VIEW_CHANNEL |
    PERMISSIONS.SEND_MESSAGES |
    PERMISSIONS.EMBED_LINKS |
    PERMISSIONS.MANAGE_CHANNELS |
    PERMISSIONS.MANAGE_ROLES
  );
  const roles = [
    role(GUILD_ID, 0, 0n),
    role(BOT_ROLE_ID, botPosition, base),
    role(ACTOR_ROLE_ID, actorPosition, PERMISSIONS.MANAGE_ROLES),
    role(TARGET_ROLE_ID, targetPosition, 0n)
  ];
  const channels = [
    channel(PANEL_CHANNEL_ID, 0, panelOverwrites),
    channel(CATEGORY_ID, 4, categoryOverwrites)
  ];
  return {
    channels: channels.map((item) => ({ id: item.id, name: item.name, type: item.type, position: 0 })),
    roles: roles.map((item) => ({ id: item.id, name: item.name, position: item.position, managed: item.managed, everyone: item.id === GUILD_ID })),
    validation: {
      guildId: GUILD_ID,
      ownerId: '923456789012345678',
      channels,
      roles,
      botMember: { user: { id: BOT_ID }, roles: [BOT_ROLE_ID] },
      actorMember: { user: { id: ACTOR_ID }, roles: [ACTOR_ROLE_ID] }
    }
  };
}

test('active welcome channels must allow Sofra to view, send, and embed', () => {
  const denyEmbed = [{ id: BOT_ID, type: 1, allow: '0', deny: String(PERMISSIONS.EMBED_LINKS) }];
  const meta = metadata({ panelOverwrites: denyEmbed });
  assert.throws(
    () => validateConfigReferences('welcome', {
      enabled: true,
      channelId: PANEL_CHANNEL_ID
    }, { enabled: false, channelId: null }, meta),
    /Embed Links/
  );
});

test('assignable roles require Manage Roles and Sofra above the target role', () => {
  const meta = metadata({ botPosition: 3, targetPosition: 4 });
  assert.throws(
    () => validateConfigReferences('autorole', {
      enabled: true,
      roleId: TARGET_ROLE_ID
    }, { enabled: false, roleId: null }, meta),
    /Move Sofra’s highest role above/
  );
});

test('new automod roles follow actor hierarchy without requiring Sofra above them', () => {
  const meta = metadata({ botPosition: 2, actorPosition: 10, targetPosition: 7 });
  assert.doesNotThrow(() => validateConfigReferences('automod', {
    enabled: true,
    roles: [{ roleId: TARGET_ROLE_ID, kind: 'manager' }],
    channels: []
  }, { enabled: true, roles: [], channels: [] }, meta));
});

test('ticket configuration requires channel access, category management, and Manage Roles', () => {
  const noManageRoles =
    PERMISSIONS.VIEW_CHANNEL |
    PERMISSIONS.SEND_MESSAGES |
    PERMISSIONS.EMBED_LINKS |
    PERMISSIONS.MANAGE_CHANNELS;
  const meta = metadata({ botPermissions: noManageRoles });

  assert.throws(
    () => validateConfigReferences('tickets', {
      enabled: true,
      panelChannelId: PANEL_CHANNEL_ID,
      categoryId: CATEGORY_ID,
      staffRoleIds: [TARGET_ROLE_ID],
      types: { bug: true, report: true, other: true }
    }, {}, meta),
    /Manage Roles/
  );
});

test('disabling an invalid active module is never blocked by stale permissions', () => {
  const meta = metadata({ botPermissions: 0n, botPosition: 1, targetPosition: 8 });
  assert.doesNotThrow(() => validateConfigReferences('autorole', {
    enabled: false,
    roleId: TARGET_ROLE_ID
  }, { enabled: true, roleId: TARGET_ROLE_ID }, meta));
});
