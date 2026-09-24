import crypto from 'node:crypto';

const COOKIE = 'one_shot_session';
const STATE_COOKIE = 'one_shot_oauth_state';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

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
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
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

export function requireConfig() {
  const required = ['GITHUB_APP_CLIENT_ID', 'GITHUB_APP_CLIENT_SECRET', 'STUDIO_ALLOWED_USER_ID', 'STUDIO_SESSION_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables de Vercel: ${missing.join(', ')}.`);
}

export function currentSession(req) {
  const value = parseCookies(req)[COOKIE];
  return value ? decrypt(value) : null;
}

export function setSession(res, user) {
  const value = encrypt({ id: user.id, login: user.login, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 });
  res.setHeader('Set-Cookie', cookieHeader(COOKIE, encodeURIComponent(value), { maxAge: 60 * 60 * 24 * 14 }));
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', cookieHeader(COOKIE, '', { maxAge: 0 }));
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

export { COOKIE, STATE_COOKIE, base64url };
