import { currentSession, json } from '../_lib/auth.mjs';

export default function handler(req, res) {
  const session = currentSession(req);
  if (!session) return json(res, 401, { ok: false });
  return json(res, 200, { ok: true, user: { id: session.id, login: session.login } });
}
