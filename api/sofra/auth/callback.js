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
    const providerError = String(request.query?.error || '');
    const expectedState = parseCookies(request)[STATE_COOKIE] || '';
    clearStateCookie(response);

    // Discord includes state on both successful callbacks and user-denied
    // callbacks. Validate it before trusting any provider response.
    if (!state || !expectedState || state !== expectedState) {
      return response.redirect(302, `${panelUrl}?auth=invalid_state`);
    }

    if (providerError) {
      const status = providerError === 'access_denied' ? 'denied' : 'failed';
      return response.redirect(302, `${panelUrl}?auth=${status}`);
    }
    if (!code) {
      return response.redirect(302, `${panelUrl}?auth=failed`);
    }

    const tokens = await exchangeCode(request, code);
    const user = await discordFetch('/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    await createSession(response, tokens, user);
    return response.redirect(302, `${panelUrl}?auth=success`);
  } catch (error) {
    const providerCode = typeof error?.body === 'object' && error.body
      ? String(error.body.error || error.body.code || '')
      : '';
    console.error('Sofra Discord OAuth callback failed.', {
      status: Number(error?.status || 0) || undefined,
      providerCode: providerCode || undefined,
      message: String(error?.message || 'Unknown OAuth callback error.')
    });
    return response.redirect(302, `${panelUrl}?auth=failed`);
  }
};
