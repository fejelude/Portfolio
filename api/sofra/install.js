'use strict';

const { requireGuildAccess, botInstallUrl } = require('./_auth');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const guildId = String(request.query?.guildId || '');
  try {
    const access = await requireGuildAccess(request, response, guildId);
    if (!access) return;
    return response.redirect(302, botInstallUrl(guildId));
  } catch {
    return response.status(500).json({ ok: false, error: 'Unable to start Sofra installation.' });
  }
};
