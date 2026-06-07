const assert = require('node:assert/strict');
const test = require('node:test');

const STORE_PATH = '../api/activity-store';

function loadStore() {
  delete require.cache[require.resolve(STORE_PATH)];
  return require(STORE_PATH);
}

function resetEnvironment() {
  delete process.env.ACTIVITY_LOG_LIMIT;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete globalThis.__portfolioActivityLogs;
  delete globalThis.fetch;
}

function fakeUpstash() {
  const lists = new Map();

  return async (url, options) => {
    assert.equal(url, 'https://example-upstash.test');
    assert.equal(options.headers.Authorization, 'Bearer test-token');

    const [command, key, ...args] = JSON.parse(options.body);
    const name = String(command).toUpperCase();
    const list = lists.get(key) || [];

    if (name === 'LPUSH') {
      list.unshift(args[0]);
      lists.set(key, list);
      return { ok: true, status: 200, json: async () => ({ result: list.length }) };
    }

    if (name === 'LTRIM') {
      lists.set(key, list.slice(Number(args[0]), Number(args[1]) + 1));
      return { ok: true, status: 200, json: async () => ({ result: 'OK' }) };
    }

    if (name === 'LRANGE') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: list.slice(Number(args[0]), Number(args[1]) + 1) })
      };
    }

    return { ok: false, status: 400, json: async () => ({ error: `Unsupported command ${name}` }) };
  };
}

test('Upstash activity logs remain readable after a fresh module load', async () => {
  resetEnvironment();
  process.env.UPSTASH_REDIS_REST_URL = 'https://example-upstash.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.ACTIVITY_LOG_LIMIT = '5000';
  globalThis.fetch = fakeUpstash();

  const firstStore = loadStore();
  const saveStatus = await firstStore.saveLog({ id: 'log-1', type: 'page_view', path: '/' });
  assert.equal(saveStatus.source, 'upstash');
  assert.equal(saveStatus.persistent, true);
  assert.equal(saveStatus.limit, 5000);

  const secondStore = loadStore();
  const read = await secondStore.readLogs();
  assert.equal(read.source, 'upstash');
  assert.equal(read.persistent, true);
  assert.deepEqual(read.logs, [{ id: 'log-1', type: 'page_view', path: '/' }]);
});

test('runtime memory fallback is clearly marked non-persistent', async () => {
  resetEnvironment();

  const store = loadStore();
  const status = await store.saveLog({ id: 'local-log', type: 'page_view' });
  assert.equal(status.source, 'memory');
  assert.equal(status.persistent, false);
  assert.match(status.warning, /not configured/i);

  const read = await store.readLogs();
  assert.equal(read.persistent, false);
  assert.equal(read.logs.length, 1);
  assert.equal(read.logs[0].id, 'local-log');
});

test('activity log retention is bounded to a safe configurable range', () => {
  resetEnvironment();

  let store = loadStore();
  assert.equal(store.configuredLimit(), 10000);

  process.env.ACTIVITY_LOG_LIMIT = '30';
  store = loadStore();
  assert.equal(store.configuredLimit(), 500);

  process.env.ACTIVITY_LOG_LIMIT = '999999';
  store = loadStore();
  assert.equal(store.configuredLimit(), 50000);
});
