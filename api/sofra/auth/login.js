'use strict';

const { randomToken, setStateCookie, redirectUri, requiredEnv, loadSession, publicBaseUrl } = require('../_auth');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    // If Sofra already has a valid remembered session, do not send the user
    // through Discord OAuth again. This is the normal returning-user path.
    try {
      const existing = await loadSession(request, response);
      if (existing) return response.redirect(302, `${publicBaseUrl(request)}/sofra`);
    } catch {
      // A temporary Discord/Redis hiccup should not prevent a manual sign-in
      // attempt from starting if the user explicitly clicked the button.
    }

    const state = randomToken(24);
    setStateCookie(response, state);
    const authorize = new URL('https://discord.com/oauth2/authorize');
    authorize.searchParams.set('client_id', requiredEnv('DISCORD_CLIENT_ID'));
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('redirect_uri', redirectUri(request));
    authorize.searchParams.set('scope', 'identify guilds');
    authorize.searchParams.set('state', state);
    // Do not force prompt=consent. Discord can reuse the user's existing grant,
    // which avoids repeatedly showing the authorization screen.
    return response.redirect(302, authorize.toString());
  } catch (error) {
    return response.status(500).json({ ok: false, error: error.message || 'Unable to start Discord login.' });
  }
};
