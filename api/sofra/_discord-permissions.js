'use strict';

const PERMISSIONS = Object.freeze({
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  EMBED_LINKS: 1n << 14n,
  MANAGE_ROLES: 1n << 28n
});

function bits(value) {
  try { return BigInt(value || 0); } catch { return 0n; }
}

function hasPermission(permissions, permission) {
  const value = bits(permissions);
  return (value & PERMISSIONS.ADMINISTRATOR) === PERMISSIONS.ADMINISTRATOR ||
    (value & permission) === permission;
}

function hasPermissions(permissions, required) {
  return required.every((permission) => hasPermission(permissions, permission));
}

function memberBasePermissions(guildId, roles, member, owner = false) {
  if (owner) return PERMISSIONS.ADMINISTRATOR;
  const roleById = new Map((roles || []).map((role) => [role.id, role]));
  let permissions = bits(roleById.get(guildId)?.permissions);
  for (const roleId of member?.roles || []) {
    permissions |= bits(roleById.get(roleId)?.permissions);
  }
  return permissions;
}

function applyOverwrite(permissions, overwrite) {
  if (!overwrite) return permissions;
  const deny = bits(overwrite.deny);
  const allow = bits(overwrite.allow);
  return (permissions & ~deny) | allow;
}

function channelPermissions(guildId, channel, member, basePermissions) {
  let permissions = bits(basePermissions);
  if (hasPermission(permissions, PERMISSIONS.ADMINISTRATOR)) return permissions;

  const overwrites = Array.isArray(channel?.permission_overwrites) ? channel.permission_overwrites : [];
  permissions = applyOverwrite(
    permissions,
    overwrites.find((overwrite) => overwrite.type === 0 && overwrite.id === guildId),
  );

  const memberRoles = new Set(member?.roles || []);
  let roleDeny = 0n;
  let roleAllow = 0n;
  for (const overwrite of overwrites) {
    if (overwrite.type !== 0 || overwrite.id === guildId || !memberRoles.has(overwrite.id)) continue;
    roleDeny |= bits(overwrite.deny);
    roleAllow |= bits(overwrite.allow);
  }
  permissions = (permissions & ~roleDeny) | roleAllow;

  return applyOverwrite(
    permissions,
    overwrites.find((overwrite) => overwrite.type === 1 && overwrite.id === member?.user?.id),
  );
}

function highestRolePosition(roles, member) {
  const held = new Set(member?.roles || []);
  let highest = 0;
  for (const role of roles || []) {
    if (held.has(role.id)) highest = Math.max(highest, Number(role.position || 0));
  }
  return highest;
}

function channelCapabilitySummary(guildId, channel, member, basePermissions) {
  const permissions = channelPermissions(guildId, channel, member, basePermissions);
  return Object.freeze({
    viewChannel: hasPermission(permissions, PERMISSIONS.VIEW_CHANNEL),
    sendMessages: hasPermission(permissions, PERMISSIONS.SEND_MESSAGES),
    embedLinks: hasPermission(permissions, PERMISSIONS.EMBED_LINKS),
    manageChannels: hasPermission(permissions, PERMISSIONS.MANAGE_CHANNELS)
  });
}

module.exports = {
  PERMISSIONS,
  bits,
  hasPermission,
  hasPermissions,
  memberBasePermissions,
  channelPermissions,
  highestRolePosition,
  channelCapabilitySummary
};
