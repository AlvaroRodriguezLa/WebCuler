import { clearSession, json, parseCookies, publicOrigin, redirect, requireConfig, setSession, STATE_COOKIE } from '../_lib/auth.mjs';

export default async function handler(req, res) {
  try {
    requireConfig();
    const url = new URL(req.url, publicOrigin(req));
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    let authState;
    try { authState = JSON.parse(parseCookies(req)[STATE_COOKIE] || '{}'); } catch { authState = {}; }
    if (!code || !state || !authState.state || state !== authState.state || !authState.verifier) return json(res, 400, { ok: false, error: 'La validación de seguridad ha caducado. Vuelve a iniciar sesión.' });
    const redirectUri = `${publicOrigin(req)}/api/auth/callback`;
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_APP_CLIENT_ID, client_secret: process.env.GITHUB_APP_CLIENT_SECRET, code, redirect_uri: redirectUri, code_verifier: authState.verifier }),
    });
    const token = await tokenResponse.json();
    if (!token.access_token) throw new Error('GitHub no ha devuelto un token de acceso.');
    const userResponse = await fetch('https://api.github.com/user', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.access_token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    const user = await userResponse.json();
    if (!user.id || String(user.id) !== String(process.env.STUDIO_ALLOWED_USER_ID)) {
      clearSession(res);
      return redirect(res, '/studio/?error=not-authorized');
    }
    setSession(res, user);
    redirect(res, '/studio/');
  } catch (error) {
    json(res, 500, { ok: false, error: error.message });
  }
}
