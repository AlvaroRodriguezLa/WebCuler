import { authorizedSession, json } from '../_lib/auth.mjs';

export default async function handler(req, res) {
  try {
    const session = await authorizedSession(req, res);
    return json(res, 200, { ok: true, user: { id: session.id, login: session.login } });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message });
  }
}
