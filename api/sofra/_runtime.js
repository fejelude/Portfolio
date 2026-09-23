'use strict';
const { createHash } = require('node:crypto');
const redis = require('./_redis');

const HEARTBEAT_KEY = 'sofra:runtime:heartbeat';
const HEARTBEAT_FRESH_MS = 180_000;

function summarizeRuntime(raw, config, now = Date.now(), heartbeatRaw = null) {
  let runtime;
  try { runtime = JSON.parse(raw || 'null'); } catch { runtime = null; }

  const guildSyncedAt = Number(runtime?.lastSyncedAt);
  const legacyFresh = Number.isFinite(guildSyncedAt) && guildSyncedAt <= now && now - guildSyncedAt < HEARTBEAT_FRESH_MS;
  const heartbeatAt = Number(heartbeatRaw);
  const heartbeatFresh = Number.isFinite(heartbeatAt) && heartbeatAt > 0 && heartbeatAt <= now && now - heartbeatAt < HEARTBEAT_FRESH_MS;
  const botFresh = heartbeatFresh || legacyFresh;

  const sections = {};
  for (const [section, value] of Object.entries(config)) {
    if (section === 'panel' || section === 'updatedAt') continue;
    const hash = createHash('sha256').update(value).digest('hex');
    sections[section] = botFresh && runtime?.applied?.[section] === hash ? 'applied' : 'pending';
  }

  return {
    state: botFresh ? 'recently-synced' : 'unknown',
    lastSyncedAt: botFresh && Number.isFinite(guildSyncedAt) ? guildSyncedAt : null,
    sections
  };
}

async function readRuntime(guildId) {
  const [raw, config, heartbeat] = await Promise.all([
    redis.get(`sofra:guild:${guildId}:runtime`),
    redis.hgetall(`sofra:guild:${guildId}:config`),
    redis.get(HEARTBEAT_KEY)
  ]);
  return summarizeRuntime(raw, config, Date.now(), heartbeat);
}

module.exports = { HEARTBEAT_KEY, readRuntime, summarizeRuntime };
