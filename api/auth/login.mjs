import crypto from 'node:crypto';
import { cookieHeader, redirect, requestOrigin, requireConfig, STATE_COOKIE } from '../_lib/auth.mjs';

export default function handler(req, res) {
  try {
    requireConfig();
    const state = crypto.randomBytes(24).toString('hex');
    const redirectUri = `${requestOrigin(req)}/api/auth/callback`;
    const params = new URLSearchParams({ client_id: process.env.GITHUB_APP_CLIENT_ID, redirect_uri: redirectUri, state, allow_signup: 'false' });
    res.setHeader('Set-Cookie', cookieHeader(STATE_COOKIE, encodeURIComponent(state), { maxAge: 600 }));
    redirect(res, `https://github.com/login/oauth/authorize?${params}`);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(error.message);
  }
}
