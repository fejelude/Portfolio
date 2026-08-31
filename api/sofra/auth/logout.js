'use strict';

const { destroySession, publicBaseUrl } = require('../_auth');

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ ok: false, error: 'Method not allowed.' });
  }
  await destroySession(request, response);
  let base = '';
  try { base = publicBaseUrl(request); } catch { /* relative redirect is fine */ }
  return response.redirect(302, `${base}/sofra`);
};
