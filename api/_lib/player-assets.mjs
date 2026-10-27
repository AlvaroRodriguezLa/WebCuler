import crypto from 'node:crypto';
import sharp from 'sharp';
import { del, put } from '@vercel/blob';
import { authorizedSession } from './auth.mjs';
import { isApprovedPlayerImageUrl } from '../../public/article-blocks.mjs';
import knownAssetKeys from '../../data/player-asset-ids.json' with { type: 'json' };

const API = 'https://api.github.com';
const catalogPath = 'data/player-assets-approved.json';
const maxBytes = 2_800_000;

function config() {
  return {
    owner: process.env.GITHUB_REPOSITORY_OWNER || 'AlvaroRodriguezLa',
    repo: process.env.GITHUB_REPOSITORY_NAME || 'WebCuler',
    branch: process.env.GITHUB_REPOSITORY_BRANCH || 'main',
  };
}

async function github(token, route, options = {}) {
  const response = await fetch(`${API}${route}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers,
    },
  });
  const result = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result?.message || `GitHub respondió con error ${response.status}.`); error.status = response.status; throw error; }
  return result;
}

function repoPrefix({ owner, repo }) { return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`; }

async function readCatalog(token, repo) {
  const encodedPath = catalogPath.split('/').map(encodeURIComponent).join('/');
  try {
    const file = await github(token, `${repoPrefix(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(repo.branch)}`);
    const catalog = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    if (catalog.schemaVersion !== 1 || !catalog.assets || typeof catalog.assets !== 'object') throw new Error('El catálogo de fotos tiene un formato incompatible.');
    return { catalog, sha: file.sha };
  } catch (error) {
    if (error.status !== 404) throw error;
    return { catalog: { schemaVersion: 1, assets: {} }, sha: undefined };
  }
}

async function writeCatalog(token, repo, catalog, sha, message) {
  const encodedPath = catalogPath.split('/').map(encodeURIComponent).join('/');
  const result = await github(token, `${repoPrefix(repo)}/contents/${encodedPath}`, {
    method: 'PUT', body: JSON.stringify({ message, content: Buffer.from(`${JSON.stringify(catalog, null, 2)}\n`).toString('base64'), branch: repo.branch, ...(sha ? { sha } : {}) }),
  });
  return result.commit?.sha || '';
}

function validateAssetKey(value) {
  if (typeof value !== 'string' || !/^tm:\d{1,12}$/.test(value)) throw Object.assign(new Error('Selecciona un ID de jugador válido del catálogo.'), { status: 400 });
  if (!knownAssetKeys.includes(value)) throw Object.assign(new Error('Ese assetKey no existe en el catálogo exportado de PORTOFOLIO.'), { status: 400 });
  return value;
}

export function decodeImage(body) {
  if (!body || typeof body.data !== 'string' || body.data.length > Math.ceil(maxBytes * 4 / 3) + 8) throw Object.assign(new Error('La fotografía debe ocupar como máximo 2,8 MB.'), { status: 413 });
  const data = body.data.replace(/^data:image\/(?:png|jpeg|webp);base64,/, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw Object.assign(new Error('El archivo recibido no es una imagen codificada válida.'), { status: 400 });
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length || bytes.length > maxBytes || bytes.toString('base64') !== data) throw Object.assign(new Error('La fotografía debe ocupar como máximo 2,8 MB.'), { status: 413 });
  return bytes;
}

export async function inspectImage(bytes, declaredType) {
  const metadata = await sharp(bytes, { limitInputPixels: 20_000_000 }).metadata();
  const typeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
  const contentType = typeMap[metadata.format];
  if (!contentType || declaredType !== contentType) throw Object.assign(new Error('El contenido real no coincide con PNG, JPG o WebP.'), { status: 415 });
  if (!metadata.width || !metadata.height || metadata.width > 6000 || metadata.height > 6000) throw Object.assign(new Error('La imagen debe tener como máximo 6.000 × 6.000 píxeles.'), { status: 400 });
  return { contentType, extension: metadata.format === 'jpeg' ? 'jpg' : metadata.format, width: metadata.width, height: metadata.height, hasAlpha: Boolean(metadata.hasAlpha) };
}

export async function getPlayerAssets(req, res) {
  const session = await authorizedSession(req, res);
  const { catalog } = await readCatalog(session.accessToken, config());
  return { schemaVersion: 1, assets: catalog.assets };
}

export async function uploadPlayerAsset(req, res, body) {
  const session = await authorizedSession(req, res);
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw Object.assign(new Error('Falta conectar un Vercel Blob público y configurar BLOB_READ_WRITE_TOKEN en Production y Preview.'), { status: 503 });
  const assetKey = validateAssetKey(body?.assetKey);
  const playerName = String(body?.playerName || '').trim().slice(0, 80);
  const source = String(body?.source || '').trim().slice(0, 240);
  const rightsConfirmed = body?.rightsConfirmed === true;
  if (!playerName || !source || !rightsConfirmed) throw Object.assign(new Error('Indica el nombre, la procedencia y confirma que tienes permiso para publicar esta imagen.'), { status: 400 });
  const bytes = decodeImage(body);
  const image = await inspectImage(bytes, body.contentType);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const { catalog, sha: catalogSha } = await readCatalog(session.accessToken, config());
  const prior = catalog.assets[assetKey];
  const pathname = `players/${assetKey.replace(':', '-')}/${sha}.${image.extension}`;
  const reused = prior?.sha256 === sha && isApprovedPlayerImageUrl(prior.url, assetKey);
  const blob = reused ? { url: prior.url } : await put(pathname, bytes, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: image.contentType, cacheControlMaxAge: 31_536_000 });
  if (!isApprovedPlayerImageUrl(blob.url, assetKey)) {
    if (!reused) await del(blob.url).catch(() => {});
    throw Object.assign(new Error('Vercel Blob devolvió una URL que no coincide con el dominio o ruta permitidos.'), { status: 502 });
  }
  const entry = {
    status: 'approved', playerName, url: blob.url, source, rightsEvidence: 'El administrador confirma que cuenta con permiso para publicar esta fotografía en ONE SHOT.',
    uploadedAt: new Date().toISOString(), uploadedBy: String(session.login || session.name || session.id), sha256: sha,
    contentType: image.contentType, width: image.width, height: image.height, hasAlpha: image.hasAlpha,
    ...(prior?.history?.length ? { history: prior.history } : prior?.url ? { history: [{ url: prior.url, source: prior.source, uploadedAt: prior.uploadedAt, sha256: prior.sha256 }] } : {}),
  };
  catalog.assets[assetKey] = entry;
  try {
    const commit = await writeCatalog(session.accessToken, config(), catalog, catalogSha, `Añadir fotografía autorizada: ${playerName} (${assetKey})`);
    return { ok: true, assetKey, asset: entry, commit, message: 'Fotografía guardada en la biblioteca. El despliegue estático se actualizará automáticamente.' };
  } catch (error) {
    if (!reused) await del(blob.url).catch(() => {});
    throw error;
  }
}

export async function archivePlayerAsset(req, res, body) {
  const session = await authorizedSession(req, res);
  const assetKey = validateAssetKey(body?.assetKey);
  const repo = config();
  const { catalog, sha } = await readCatalog(session.accessToken, repo);
  const asset = catalog.assets[assetKey];
  if (!asset || asset.status !== 'approved') throw Object.assign(new Error('No hay una fotografía activa asociada a ese jugador.'), { status: 404 });
  catalog.assets[assetKey] = { ...asset, status: 'archived', archivedAt: new Date().toISOString() };
  const commit = await writeCatalog(session.accessToken, repo, catalog, sha, `Archivar fotografía: ${asset.playerName} (${assetKey})`);
  return { ok: true, assetKey, commit, message: 'Fotografía archivada; se conserva para no romper despliegues anteriores.' };
}
