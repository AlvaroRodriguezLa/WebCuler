import { json, verifyEmailOtp } from '../_lib/auth.mjs';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'Método no permitido.' });
  }
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    verifyEmailOtp(req, res, body.code);
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'No se pudo comprobar el código.' });
  }
}
