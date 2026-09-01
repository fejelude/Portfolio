'use strict';

const { requireSession, getUserGuilds } = require('./_auth');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  try {
    const session = await requireSession(request, response);
    if (!session) return;
    const guilds = (await getUserGuilds(session))
      .filter((guild) => guild.manageable)
      .sort((left, right) => left.name.localeCompare(right.name));
    return response.status(200).json({
      ok: true,
      user: session.user,
      csrf: session.csrf,
      guilds
    });
  } catch (error) {
    return response.status(502).json({ ok: false, error: 'Discord could not be reached. Please try again.' });
  }
};
