'use strict';

const { requireSession, getUserGuilds, getBotGuildIds } = require('./_auth');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const session = await requireSession(request, response);
    if (!session) return;
    const manageable = (await getUserGuilds(session))
      .filter((guild) => guild.manageable)
      .sort((left, right) => left.name.localeCompare(right.name));
    let installationStatusAvailable = true;
    let botGuildIds = null;
    try {
      botGuildIds = await getBotGuildIds();
    } catch {
      // Bot installation is useful metadata, but a failed bot-token probe must
      // not make a valid user session or the whole server picker unavailable.
      // Configuration endpoints still verify installation before exposing data.
      installationStatusAvailable = false;
    }
    const guilds = manageable.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      iconUrl: guild.iconUrl,
      botInstalled: botGuildIds ? botGuildIds.has(guild.id) : null
    }));
    return response.status(200).json({
      ok: true,
      user: session.user,
      csrf: session.csrf,
      guilds,
      installationStatusAvailable
    });
  } catch (error) {
    return response.status(502).json({ ok: false, error: 'Discord could not be reached. Please try again.' });
  }
};
