import { json } from '../_lib/auth.mjs';
import { archivePlayerAsset, getPlayerAssets, uploadPlayerAsset } from '../_lib/player-assets.mjs';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return json(res, 200, { ok: true, result: await getPlayerAssets(req, res) });
    if (req.method === 'POST') return json(res, 200, await uploadPlayerAsset(req, res, req.body && typeof req.body === 'object' ? req.body : {}));
    if (req.method === 'DELETE') return json(res, 200, await archivePlayerAsset(req, res, req.body && typeof req.body === 'object' ? req.body : {}));
    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { ok: false, error: 'Método no permitido.' });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'No se pudo gestionar la fotografía.' });
  }
}
