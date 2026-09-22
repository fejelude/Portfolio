'use strict';
const { createHash } = require('node:crypto');
const redis = require('./_redis');

function summarizeRuntime(raw, config, now = Date.now()) {
  let runtime;
  try { runtime = JSON.parse(raw || 'null'); } catch { runtime = null; }
  const lastSyncedAt = Number(runtime?.lastSyncedAt);
  const fresh = Number.isFinite(lastSyncedAt) && lastSyncedAt <= now && now - lastSyncedAt < 180_000;
  const sections = {};
  for (const [section, value] of Object.entries(config)) {
    if (section === 'panel' || section === 'updatedAt') continue;
    const hash = createHash('sha256').update(value).digest('hex');
    sections[section] = fresh && runtime?.applied?.[section] === hash ? 'applied' : 'pending';
  }
  return { state: fresh ? 'recently-synced' : 'unknown', lastSyncedAt: fresh ? lastSyncedAt : null, sections };
}

async function readRuntime(guildId) {
  const [raw, config] = await Promise.all([
    redis.get(`sofra:guild:${guildId}:runtime`),
    redis.hgetall(`sofra:guild:${guildId}:config`)
  ]);
  return summarizeRuntime(raw, config);
}

module.exports = { readRuntime, summarizeRuntime };
