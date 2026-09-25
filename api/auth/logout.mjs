import { assertSameOrigin, clearSession, json } from '../_lib/auth.mjs';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Método no permitido.' });
  }
  try { assertSameOrigin(req); } catch (error) { return json(res, 403, { ok: false, error: error.message }); }
  clearSession(res);
  json(res, 200, { ok: true });
}
