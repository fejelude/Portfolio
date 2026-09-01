'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PERMISSIONS,
  hasPermission,
  memberBasePermissions,
  channelPermissions,
  highestRolePosition
} = require('./_discord-permissions');

const GUILD_ID = '123456789012345678';
const BOT_ID = '223456789012345678';
const ROLE_ID = '323456789012345678';

function role(id, position, permissions = 0n) {
  return { id, position, permissions: String(permissions) };
}

test('member base permissions combine everyone and member roles', () => {
  const permissions = memberBasePermissions(GUILD_ID, [
    role(GUILD_ID, 0, PERMISSIONS.VIEW_CHANNEL),
    role(ROLE_ID, 4, PERMISSIONS.SEND_MESSAGES | PERMISSIONS.EMBED_LINKS)
  ], { user: { id: BOT_ID }, roles: [ROLE_ID] });

  assert.equal(hasPermission(permissions, PERMISSIONS.VIEW_CHANNEL), true);
  assert.equal(hasPermission(permissions, PERMISSIONS.SEND_MESSAGES), true);
  assert.equal(hasPermission(permissions, PERMISSIONS.EMBED_LINKS), true);
});

test('channel overwrites follow Discord everyone, role, then member order', () => {
  const base = PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES;
  const permissions = channelPermissions(GUILD_ID, {
    permission_overwrites: [
      { id: GUILD_ID, type: 0, deny: String(PERMISSIONS.SEND_MESSAGES), allow: '0' },
      { id: ROLE_ID, type: 0, deny: '0', allow: String(PERMISSIONS.SEND_MESSAGES) },
      { id: BOT_ID, type: 1, deny: String(PERMISSIONS.VIEW_CHANNEL), allow: '0' }
    ]
  }, { user: { id: BOT_ID }, roles: [ROLE_ID] }, base);

  assert.equal(hasPermission(permissions, PERMISSIONS.SEND_MESSAGES), true);
  assert.equal(hasPermission(permissions, PERMISSIONS.VIEW_CHANNEL), false);
});

test('administrator bypasses channel permission overwrites', () => {
  const permissions = channelPermissions(GUILD_ID, {
    permission_overwrites: [
      { id: GUILD_ID, type: 0, deny: String(PERMISSIONS.VIEW_CHANNEL | PERMISSIONS.SEND_MESSAGES), allow: '0' }
    ]
  }, { user: { id: BOT_ID }, roles: [] }, PERMISSIONS.ADMINISTRATOR);

  assert.equal(hasPermission(permissions, PERMISSIONS.VIEW_CHANNEL), true);
  assert.equal(hasPermission(permissions, PERMISSIONS.SEND_MESSAGES), true);
});

test('highest role position comes from the member role set', () => {
  assert.equal(highestRolePosition([
    role(GUILD_ID, 0), role(ROLE_ID, 8), role('423456789012345678', 12)
  ], { roles: [ROLE_ID] }), 8);
});
