'use strict';

function redisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
  if (!url || !token) {
    throw new Error('Sofra Panel storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
  }
  return { url, token };
}

async function request(path, body) {
  const { url, token } = redisConfig();
  const response = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) throw new Error(`Redis request failed with HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload?.error) throw new Error(`Redis error: ${payload.error}`);
  return payload;
}

async function command(args) {
  return (await request('', args)).result;
}

async function transaction(commands) {
  const payload = await request('/multi-exec', commands);
  if (!Array.isArray(payload)) throw new Error('Redis transaction returned an invalid response.');
  const failed = payload.find((item) => item?.error);
  if (failed) throw new Error(`Redis error: ${failed.error}`);
  return payload.map((item) => item?.result);
}

async function get(key) {
  return command(['GET', key]);
}

async function set(key, value, options = {}) {
  const args = ['SET', key, value];
  if (Number.isInteger(options.ex) && options.ex > 0) args.push('EX', String(options.ex));
  return command(args);
}

async function del(key) {
  return command(['DEL', key]);
}

async function hgetall(key) {
  const result = await command(['HGETALL', key]);
  if (!result) return {};
  if (!Array.isArray(result)) return result;
  const object = {};
  for (let index = 0; index < result.length; index += 2) object[result[index]] = result[index + 1];
  return object;
}

async function hset(key, values) {
  const args = ['HSET', key];
  for (const [field, value] of Object.entries(values)) args.push(field, value);
  return command(args);
}

module.exports = { command, transaction, get, set, del, hgetall, hset };
