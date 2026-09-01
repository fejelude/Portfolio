'use strict';

const {
  PERMISSIONS,
  hasPermission,
  memberBasePermissions,
  channelCapabilitySummary,
  highestRolePosition
} = require('./_discord-permissions');

const TEXT_CHANNEL_TYPES = new Set([0, 5]);
const CATEGORY_TYPE = 4;
const REQUIRED_SEND_CAPABILITIES = Object.freeze([
  ['viewChannel', 'View Channel'],
  ['sendMessages', 'Send Messages'],
  ['embedLinks', 'Embed Links']
]);

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function sameArray(left, right) {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
}

function sameValue(left, right) {
  return (left ?? null) === (right ?? null);
}

function buildContext(metadata) {
  const validation = metadata?.validation;
  if (!validation) return null;

  const guildId = validation.guildId;
  const rawRoles = Array.isArray(validation.roles) ? validation.roles : [];
  const rawChannels = Array.isArray(validation.channels) ? validation.channels : [];
  const botMember = validation.botMember;
  const actorMember = validation.actorMember;
  const ownerId = validation.ownerId;
  const botBasePermissions = memberBasePermissions(guildId, rawRoles, botMember, false);

  return {
    guildId,
    ownerId,
    botMember,
    actorMember,
    rawRoles,
    rawChannels,
    botBasePermissions,
    botHighestRolePosition: highestRolePosition(rawRoles, botMember),
    actorHighestRolePosition: highestRolePosition(rawRoles, actorMember),
    actorIsOwner: actorMember?.user?.id === ownerId,
    roleById: new Map(rawRoles.map((role) => [role.id, role])),
    channelById: new Map(rawChannels.map((channel) => [channel.id, channel]))
  };
}

function requireChannel(metadata, context, id, allowedTypes, label, { capabilities = [] } = {}) {
  if (!id) return null;
  const summary = (metadata.channels || []).find((channel) => channel.id === id);
  if (!summary || (allowedTypes && !allowedTypes.has(summary.type))) {
    throw invalid(`${label} is not a valid channel in this server.`);
  }

  if (capabilities.length > 0) {
    if (!context) throw invalid('Sofra could not verify her Discord channel permissions. Refresh the panel and try again.');
    const raw = context.channelById.get(id);
    if (!raw) throw invalid(`${label} could not be resolved for permission checks.`);
    const available = channelCapabilitySummary(
      context.guildId,
      raw,
      context.botMember,
      context.botBasePermissions,
    );
    const missing = capabilities
      .filter(([key]) => !available[key])
      .map(([, name]) => name);
    if (missing.length) {
      throw invalid(`Sofra is missing ${missing.join(', ')} in the ${label.toLowerCase()}.`);
    }
  }

  return summary;
}

function requireRole(metadata, context, id, label, {
  normal = false,
  actorHierarchy = false,
  assignable = false
} = {}) {
  if (!id) return null;
  const role = (metadata.roles || []).find((item) => item.id === id);
  if (!role || role.everyone) {
    throw invalid(`${label} is not a valid role in this server.`);
  }
  if ((normal || assignable) && role.managed) {
    throw invalid(`${label} is managed by Discord or an integration and cannot be configured for this Sofra feature.`);
  }

  if (actorHierarchy || assignable) {
    if (!context) throw invalid('Sofra could not verify the Discord role hierarchy. Refresh the panel and try again.');
    const rawRole = context.roleById.get(id);
    if (!rawRole) throw invalid(`${label} could not be resolved for hierarchy checks.`);

    if (!context.actorIsOwner && context.actorHighestRolePosition <= Number(rawRole.position || 0)) {
      throw invalid(`You cannot configure ${label.toLowerCase()} equal to or above your highest Discord role.`);
    }

    if (assignable) {
      if (!hasPermission(context.botBasePermissions, PERMISSIONS.MANAGE_ROLES)) {
        throw invalid('Sofra needs the Manage Roles permission before this role can be assigned automatically.');
      }
      if (context.botHighestRolePosition <= Number(rawRole.position || 0)) {
        throw invalid(`Move Sofra’s highest role above the ${label.toLowerCase()}.`);
      }
    }
  }

  return role;
}

function validateConfigReferences(section, value, current, metadata) {
  const previous = current || {};
  const context = buildContext(metadata);
  const active = value?.enabled === true;

  if (section === 'welcome') {
    if (value.channelId) {
      const needsPermissions = active || !sameValue(value.channelId, previous.channelId);
      requireChannel(metadata, context, value.channelId, TEXT_CHANNEL_TYPES, 'Welcome channel', {
        capabilities: needsPermissions ? REQUIRED_SEND_CAPABILITIES : []
      });
    }
    if (active && !value.channelId) throw invalid('Enabled welcomes require a welcome channel.');
    return;
  }

  if (section === 'levels') {
    if (value.notificationChannelId) {
      const needsPermissions = active || !sameValue(value.notificationChannelId, previous.notificationChannelId);
      requireChannel(metadata, context, value.notificationChannelId, TEXT_CHANNEL_TYPES, 'Level-up channel', {
        capabilities: needsPermissions ? REQUIRED_SEND_CAPABILITIES : []
      });
    }

    const previousRewards = new Map((previous.roleRewards || []).map((reward) => [reward.roleId, Number(reward.requiredLevel)]));
    for (const reward of value.roleRewards || []) {
      const changed = active || previousRewards.get(reward.roleId) !== Number(reward.requiredLevel);
      requireRole(metadata, context, reward.roleId, 'Level reward role', {
        normal: true,
        assignable: changed
      });
    }
    return;
  }

  if (section === 'automod') {
    const previousKeys = new Set((previous.roles || []).map((item) => `${item.roleId}:${item.kind}`));
    for (const item of value.roles || []) {
      requireRole(metadata, context, item.roleId, 'Automod role', {
        normal: true,
        actorHierarchy: !previousKeys.has(`${item.roleId}:${item.kind}`)
      });
    }
    for (const item of value.channels || []) {
      requireChannel(metadata, context, item.channelId, null, 'Automod channel');
    }
    return;
  }

  if (section === 'autorole') {
    if (value.roleId) {
      const changed = active || !sameValue(value.roleId, previous.roleId);
      requireRole(metadata, context, value.roleId, 'Auto role', {
        normal: true,
        assignable: changed
      });
    }
    if (active && !value.roleId) throw invalid('Enabled Auto Role requires a role to assign.');
    return;
  }

  if (section === 'booster') {
    if (value.roleId) {
      const changed = active || !sameValue(value.roleId, previous.roleId);
      requireRole(metadata, context, value.roleId, 'Booster role', {
        normal: true,
        assignable: changed
      });
    }
    if (value.channelId) {
      const needsPermissions = active || !sameValue(value.channelId, previous.channelId);
      requireChannel(metadata, context, value.channelId, TEXT_CHANNEL_TYPES, 'Booster thank-you channel', {
        capabilities: needsPermissions ? REQUIRED_SEND_CAPABILITIES : []
      });
    }
    if (active && (!value.roleId || !value.channelId)) {
      throw invalid('Enabled Booster automation requires both a booster role and thank-you channel.');
    }
    return;
  }

  if (section === 'modlog') {
    if (value.channelId) {
      const needsPermissions = active || !sameValue(value.channelId, previous.channelId);
      requireChannel(metadata, context, value.channelId, TEXT_CHANNEL_TYPES, 'Log channel', {
        capabilities: needsPermissions ? REQUIRED_SEND_CAPABILITIES : []
      });
    }
    if (active && !value.channelId) throw invalid('Enabled staff logging requires a log channel.');
    return;
  }

  if (section === 'tickets') {
    if (!active) return;

    requireChannel(metadata, context, value.panelChannelId, new Set([0]), 'Ticket panel channel', {
      capabilities: REQUIRED_SEND_CAPABILITIES
    });
    requireChannel(metadata, context, value.categoryId, new Set([CATEGORY_TYPE]), 'Ticket category', {
      capabilities: [
        ['viewChannel', 'View Channel'],
        ['manageChannels', 'Manage Channels']
      ]
    });
    for (const roleId of value.staffRoleIds || []) requireRole(metadata, context, roleId, 'Ticket staff role');

    if (!value.panelChannelId || !value.categoryId || (value.staffRoleIds || []).length < 1) {
      throw invalid('Enabled tickets require a panel channel, ticket category, and at least one staff role.');
    }
    if (!Object.values(value.types || {}).some(Boolean)) {
      throw invalid('Enabled tickets require at least one ticket type.');
    }
    if (!context || !hasPermission(context.botBasePermissions, PERMISSIONS.MANAGE_ROLES)) {
      throw invalid('Sofra needs Manage Roles so ticket channel permission overwrites can be created and updated safely.');
    }
    return;
  }

  // Panel appearance has no Discord channel/role references.
}

module.exports = {
  validateConfigReferences,
  REQUIRED_SEND_CAPABILITIES,
  buildContext,
  invalid,
  sameArray
};
