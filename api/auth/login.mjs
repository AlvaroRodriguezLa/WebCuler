import crypto from 'node:crypto';
import { cookieHeader, redirect, requestOrigin, requireConfig, STATE_COOKIE } from '../_lib/auth.mjs';

export default function handler(req, res) {
  try {
    requireConfig();
    const state = crypto.randomBytes(24).toString('hex');
    const verifier = crypto.randomBytes(48).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const redirectUri = `${requestOrigin(req)}/api/auth/callback`;
    const params = new URLSearchParams({ client_id: process.env.GITHUB_APP_CLIENT_ID, redirect_uri: redirectUri, state, code_challenge: challenge, code_challenge_method: 'S256', allow_signup: 'false' });
    res.setHeader('Set-Cookie', cookieHeader(STATE_COOKIE, encodeURIComponent(JSON.stringify({ state, verifier })), { maxAge: 600 }));
    redirect(res, `https://github.com/login/oauth/authorize?${params}`);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(error.message);
  }
}
