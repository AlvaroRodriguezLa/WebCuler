import { authorizedSession, json } from '../_lib/auth.mjs';
import { editorHtml } from '../_lib/editor-template.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Método no permitido.' });
  }
  try {
    await authorizedSession(req, res);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.end(editorHtml);
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'No se pudo abrir el editor.' });
  }
}
