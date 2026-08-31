'use strict';

const { randomToken, setStateCookie, redirectUri, requiredEnv } = require('../_auth');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const state = randomToken(24);
    setStateCookie(response, state);
    const authorize = new URL('https://discord.com/oauth2/authorize');
    authorize.searchParams.set('client_id', requiredEnv('DISCORD_CLIENT_ID'));
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('redirect_uri', redirectUri(request));
    authorize.searchParams.set('scope', 'identify guilds');
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('prompt', 'consent');
    return response.redirect(302, authorize.toString());
  } catch (error) {
    return response.status(500).json({ ok: false, error: error.message || 'Unable to start Discord login.' });
  }
};
