'use strict';

const {
  STATE_COOKIE,
  parseCookies,
  clearStateCookie,
  exchangeCode,
  discordFetch,
  createSession,
  publicBaseUrl
} = require('../_auth');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const base = (() => {
    try { return publicBaseUrl(request); } catch { return ''; }
  })();
  const panelUrl = `${base}/sofra`;

  try {
    const state = String(request.query?.state || '');
    const code = String(request.query?.code || '');
    const expectedState = parseCookies(request)[STATE_COOKIE] || '';
    clearStateCookie(response);

    if (!code || !state || !expectedState || state !== expectedState) {
      return response.redirect(302, `${panelUrl}?auth=invalid_state`);
    }

    const tokens = await exchangeCode(request, code);
    const user = await discordFetch('/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    await createSession(response, tokens, user);
    return response.redirect(302, `${panelUrl}?auth=success`);
  } catch (error) {
    return response.redirect(302, `${panelUrl}?auth=failed`);
  }
};
