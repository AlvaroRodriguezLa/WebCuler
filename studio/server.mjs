import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import os from 'node:os';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { loadLocalDraft, listLocalDrafts, saveLocalArticle } from './article-store.mjs';
import { demoArticle } from '../src/lib/article-blocks/demo.mjs';

const root = process.cwd();
const port = Number(process.env.STUDIO_PORT || 4322);
const astroPort = Number(process.env.ASTRO_PORT || 4321);
const bindHost = process.env.STUDIO_HOST || '0.0.0.0';
const studioDir = path.join(root, 'studio');
const accessCode = process.env.STUDIO_ACCESS_CODE || randomBytes(18).toString('base64url');
const accessCodeHash = createHash('sha256').update(accessCode).digest();
const sessionToken = randomBytes(32).toString('base64url');
const failedLogins = new Map();
const sessionCookie = 'oneshot_local_session';

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }).filter(([key]) => key));
}

function matchesAccessCode(candidate) {
  const digest = createHash('sha256').update(String(candidate || '')).digest();
  return timingSafeEqual(accessCodeHash, digest);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function parseMultipart(req) {
  const contentType = String(req.headers['content-type'] || '');
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('La petición no contiene un boundary multipart válido.');
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const body = await readBody(req);
  const values = new Map();
  let cursor = body.indexOf(boundary) + boundary.length;
  while (cursor >= boundary.length && cursor < body.length) {
    if (body.slice(cursor, cursor + 2).toString() === '--') break;
    if (body.slice(cursor, cursor + 2).toString() === '\r\n') cursor += 2;
    const next = body.indexOf(boundary, cursor);
    if (next < 0) break;
    const part = body.slice(cursor, next - 2);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd < 0) { cursor = next + boundary.length; continue; }
    const headers = part.slice(0, headerEnd).toString('utf8');
    const payload = part.slice(headerEnd + 4);
    const nameMatch = headers.match(/name="([^"]+)"/i);
    if (!nameMatch) { cursor = next + boundary.length; continue; }
    const fileMatch = headers.match(/filename="([^"]*)"/i);
    const typeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
    const value = fileMatch
      ? new File([payload], fileMatch[1], { type: typeMatch?.[1] || 'application/octet-stream' })
      : payload.toString('utf8');
    values.set(nameMatch[1], value);
    cursor = next + boundary.length;
  }
  return { get(name) { return values.get(name); } };
}

function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(payload)); }
async function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
  if (pathname === '/article-blocks.mjs' || pathname === '/article-blocks-editor.js' || pathname === '/article-blocks.css') {
    const publicPath = path.join(root, 'public', pathname.slice(1));
    const content = await readFile(publicPath);
    const type = pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(content);
    return;
  }
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(studioDir, `.${requested}`);
  if (!filePath.startsWith(studioDir) || !existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
  const content = await readFile(filePath); const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' }); res.end(content);
}

const astroCli = path.join(root, 'node_modules', 'astro', 'astro.js');
const astro = spawn(process.execPath, [astroCli, 'dev', '--host', bindHost, '--port', String(astroPort)], { cwd: root, stdio: 'inherit', windowsHide: true });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const loginKey = req.socket.remoteAddress || 'unknown';
    if (req.method === 'POST' && url.pathname === '/api/studio/login') {
      const lock = failedLogins.get(loginKey);
      if (lock?.until > Date.now()) { json(res, 429, { ok: false, error: 'Demasiados intentos. Espera un minuto y vuelve a probar.' }); return; }
      let payload = {};
      try { payload = JSON.parse((await readBody(req)).toString('utf8')); } catch { /* invalid login body */ }
      if (!matchesAccessCode(payload.code)) {
        const attempts = (lock?.attempts || 0) + 1;
        failedLogins.set(loginKey, { attempts, until: attempts >= 8 ? Date.now() + 60_000 : 0 });
        json(res, 401, { ok: false, error: attempts >= 8 ? 'Demasiados intentos. Espera un minuto y vuelve a probar.' : 'El código no es correcto.' });
        return;
      }
      failedLogins.delete(loginKey);
      res.setHeader('Set-Cookie', `${sessionCookie}=${sessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
      json(res, 200, { ok: true });
      return;
    }
    const authenticated = cookies(req)[sessionCookie] === sessionToken;
    if (!authenticated && req.method === 'GET' && (url.pathname === '/' || url.pathname === '/login')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(await readFile(path.join(studioDir, 'login.html')));
      return;
    }
    if (!authenticated && req.method === 'GET' && url.pathname === '/login.js') { await serveStatic(req, res); return; }
    if (!authenticated) { json(res, 401, { ok: false, error: 'Inicia sesión para acceder al Studio.' }); return; }
    if (req.method === 'GET' && req.url === '/api/studio/demo') { json(res, 200, { ok: true, result: demoArticle }); return; }
    if (req.method === 'GET' && url.pathname === '/api/studio/player-assets') {
      const result = JSON.parse(await readFile(path.join(root, 'public/data/player-assets-approved.json'), 'utf8'));
      json(res, 200, result); return;
    }
    if (req.method === 'GET' && new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`).pathname === '/api/articles') {
      const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`); const slug = url.searchParams.get('slug');
      const result = slug ? await loadLocalDraft(root, slug) : await listLocalDrafts(root);
      json(res, 200, { ok: true, result }); return;
    }
    if (req.method === 'POST' && req.url === '/api/articles') { const form = await parseMultipart(req); const publicHost = (req.headers.host || '127.0.0.1').split(':')[0]; const result = await saveLocalArticle(form, { root, shouldPublish: form.get('action') === 'publish', publicHost, astroPort }); json(res, result.ok ? 200 : result.status || 500, result); return; }
    await serveStatic(req, res);
  } catch (error) { json(res, error.status || 500, { ok: false, error: error.message }); }
});
function lanAddresses() {
  return Object.values(os.networkInterfaces()).flatMap((items) => items || []).filter((item) => item.family === 'IPv4' && !item.internal).map((item) => item.address);
}
server.listen(port, bindHost, () => {
  console.log(`Studio local: http://127.0.0.1:${port}`);
  for (const address of lanAddresses()) console.log(`Studio móvil (misma Wi-Fi): http://${address}:${port}`);
  console.log(`Código temporal de acceso: ${accessCode}`);
});
function close() { server.close(); astro.kill(); }
process.on('SIGINT', close); process.on('SIGTERM', close);
