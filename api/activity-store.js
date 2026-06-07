const ACTIVITY_KEY = 'portfolio:activity';
const DEFAULT_MAX_LOGS = 10000;
const MIN_LOGS = 500;
const MAX_LOGS_CAP = 50000;

function configuredLimit() {
  const value = Number(process.env.ACTIVITY_LOG_LIMIT || DEFAULT_MAX_LOGS);
  if (!Number.isFinite(value)) return DEFAULT_MAX_LOGS;
  return Math.max(MIN_LOGS, Math.min(MAX_LOGS_CAP, Math.floor(value)));
}

function hasUpstash() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function storageStatus() {
  const persistent = hasUpstash();
  return {
    source: persistent ? 'upstash' : 'memory',
    persistent,
    limit: configuredLimit(),
    warning: persistent ? '' : 'Persistent Redis storage is not configured; runtime memory logs can be lost on restarts or deployments.'
  };
}

function memoryLogs() {
  if (!globalThis.__portfolioActivityLogs) {
    globalThis.__portfolioActivityLogs = [];
  }
  return globalThis.__portfolioActivityLogs;
}

async function upstashCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Upstash request failed with ${response.status}`);
  }

  return data?.result;
}

async function saveLog(log) {
  const status = storageStatus();
  if (status.persistent) {
    await upstashCommand(['LPUSH', ACTIVITY_KEY, JSON.stringify(log)]);
    await upstashCommand(['LTRIM', ACTIVITY_KEY, 0, status.limit - 1]);
    return status;
  }

  const logs = memoryLogs();
  logs.unshift(log);
  logs.length = Math.min(logs.length, status.limit);
  return status;
}

function decodeLogs(items) {
  return items.map((item) => {
    if (typeof item === 'object' && item !== null) return item;

    try {
      return JSON.parse(item);
    } catch (error) {
      return null;
    }
  }).filter(Boolean);
}

async function readLogs() {
  const status = storageStatus();
  if (status.persistent) {
    const result = await upstashCommand(['LRANGE', ACTIVITY_KEY, 0, status.limit - 1]);
    return {
      ...status,
      logs: decodeLogs(Array.isArray(result) ? result : [])
    };
  }

  return {
    ...status,
    logs: memoryLogs()
  };
}

module.exports = {
  ACTIVITY_KEY,
  configuredLimit,
  hasUpstash,
  readLogs,
  saveLog,
  storageStatus,
  upstashCommand
};
