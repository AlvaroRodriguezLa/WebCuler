import { authorizedSession, json } from '../_lib/auth.mjs';
import { demoArticle } from '../../src/lib/article-blocks/demo.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'Método no permitido.' });
  }
  try {
    await authorizedSession(req, res);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return json(res, 200, { ok: true, result: demoArticle });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'No se pudo cargar la demostración.' });
  }
}
