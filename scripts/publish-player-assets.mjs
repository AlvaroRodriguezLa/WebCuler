import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isApprovedPlayerImageUrl } from '../public/article-blocks.mjs';

const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, 'data/player-assets-approved.json'), 'utf8'));
if (catalog.schemaVersion !== 1 || !catalog.assets || typeof catalog.assets !== 'object') throw new Error('data/player-assets-approved.json debe tener schemaVersion 1 y assets.');
const assets = {};
for (const [assetKey, item] of Object.entries(catalog.assets)) {
  if (!/^tm:\d+$/.test(assetKey)) throw new Error(`ID de jugador no válido: ${assetKey}`);
  if (item?.status !== 'approved') continue;
  if (!String(item.source || '').trim() || !String(item.rightsEvidence || '').trim() || !isApprovedPlayerImageUrl(item.url, assetKey)) throw new Error(`${assetKey}: falta procedencia, declaración de permiso o URL pública de Blob válida.`);
  assets[assetKey] = { status: 'approved', url: item.url };
}
await mkdir(path.join(root, 'public/data'), { recursive: true });
await writeFile(path.join(root, 'public/data/player-assets-approved.json'), `${JSON.stringify({ schemaVersion: 1, assets }, null, 2)}\n`);
console.log(`Published ${Object.keys(assets).length} user-supplied player assets.`);
