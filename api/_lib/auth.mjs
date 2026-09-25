import crypto from 'node:crypto';

const COOKIE = 'one_shot_session';
const STATE_COOKIE = 'one_shot_oauth_state';

function secretKey() {
  const secret = process.env.STUDIO_SESSION_SECRET;
  if (!secret) throw new Error('Falta configurar STUDIO_SESSION_SECRET en Vercel.');
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decrypt(value) {
  try {
    const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return [part.trim(), ''];
    const value = part.slice(index + 1).trim();
    try { return [part.slice(0, index).trim(), decodeURIComponent(value)]; }
    catch { return [part.slice(0, index).trim(), '']; }
  }).filter(([key]) => key));
}

export function cookieHeader(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  parts.push('Path=/');
  if (options.httpOnly !== false) parts.push('HttpOnly');
  parts.push('SameSite=Lax');
  if (process.env.VERCEL) parts.push('Secure');
  return parts.join('; ');
}

export function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1:4321').split(',')[0];
  return `${protocol}://${host}`;
}

export function publicOrigin(req) {
  return process.env.STUDIO_PUBLIC_URL || requestOrigin(req);
}

export function requireConfig() {
  const required = ['GITHUB_APP_CLIENT_ID', 'GITHUB_APP_CLIENT_SECRET', 'STUDIO_ALLOWED_USER_ID', 'STUDIO_SESSION_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables de Vercel: ${missing.join(', ')}.`);
}

export function currentSession(req) {
  const value = parseCookies(req)[COOKIE];
  return value ? decrypt(value) : null;
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', cookieHeader(COOKIE, '', { maxAge: 0 }));
}

export function clearStateCookie(res) {
  res.setHeader('Set-Cookie', cookieHeader(STATE_COOKIE, '', { maxAge: 0 }));
}

export function clearAuthCookies(res) {
  res.setHeader('Set-Cookie', [
    cookieHeader(COOKIE, '', { maxAge: 0 }),
    cookieHeader(STATE_COOKIE, '', { maxAge: 0 }),
  ]);
}

export function setAuthCookies(res, payload) {
  const value = encrypt({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 });
  res.setHeader('Set-Cookie', [
    cookieHeader(COOKIE, encodeURIComponent(value), { maxAge: 60 * 60 * 24 * 14 }),
    cookieHeader(STATE_COOKIE, '', { maxAge: 0 }),
  ]);
}

export function rotateSession(res, session) {
  const value = encrypt({ ...session, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 });
  res.setHeader('Set-Cookie', cookieHeader(COOKIE, encodeURIComponent(value), { maxAge: 60 * 60 * 24 * 14 }));
}

export function assertSameOrigin(req) {
  if ((req.headers.origin && req.headers.origin !== publicOrigin(req)) || (!req.headers.origin && !['GET', 'HEAD'].includes(req.method))) {
    const error = new Error('Origen de la petición no permitido. Recarga el Studio e inténtalo de nuevo.');
    error.status = 403;
    throw error;
  }
}

export async function authorizedSession(req, res) {
  requireConfig();
  assertSameOrigin(req);
  const session = currentSession(req);
  if (!session || String(session.id) !== String(process.env.STUDIO_ALLOWED_USER_ID)) {
    const error = new Error('Tu sesión ha caducado. Vuelve a entrar con GitHub.');
    error.status = 401;
    throw error;
  }
  if (!session.accessToken) {
    clearSession(res);
    const error = new Error('Vuelve a entrar con GitHub para autorizar la publicación.');
    error.status = 401;
    throw error;
  }
  if (session.tokenExpiresAt && session.tokenExpiresAt < Date.now() + 60_000) {
    if (!session.refreshToken || (session.refreshTokenExpiresAt && session.refreshTokenExpiresAt < Date.now())) {
      clearSession(res);
      const error = new Error('La autorización de GitHub ha caducado. Cierra sesión y vuelve a entrar.');
      error.status = 401;
      throw error;
    }
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_APP_CLIENT_ID, client_secret: process.env.GITHUB_APP_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: session.refreshToken }),
    });
    const renewed = await response.json();
    if (!response.ok || !renewed.access_token) {
      clearSession(res);
      const error = new Error('No se ha podido renovar el acceso a GitHub. Inicia sesión de nuevo.');
      error.status = 401;
      throw error;
    }
    session.accessToken = renewed.access_token;
    session.refreshToken = renewed.refresh_token || session.refreshToken;
    session.tokenExpiresAt = Date.now() + Number(renewed.expires_in || 28800) * 1000;
    session.refreshTokenExpiresAt = Date.now() + Number(renewed.refresh_token_expires_in || 15897600) * 1000;
    rotateSession(res, session);
  }
  return session;
}

export function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

export function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export { COOKIE, STATE_COOKIE };
