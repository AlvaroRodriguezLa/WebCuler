import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import sharp from 'sharp';
import { decodeEnrichedBlock, renderArticleBlock, renderEnrichedMarkdown, validateArticleBlocks } from '../public/article-blocks.mjs';
import remarkArticleBlocks, { createRemarkArticleBlocks } from '../src/lib/article-blocks/remark-plugin.mjs';
import { listLocalDrafts, loadLocalDraft, parseLocalArticle, saveLocalArticle } from '../studio/article-store.mjs';
import { decodeImage, inspectImage } from '../api/_lib/player-assets.mjs';
import knownAssetKeys from '../data/player-asset-ids.json' with { type: 'json' };

const source = await readFile('tests/fixtures/one_shot_433_demo.md', 'utf8');
assert.equal(knownAssetKeys.length, 47689);
assert.ok(knownAssetKeys.includes('tm:357565'));
const blocks = validateArticleBlocks(source);
assert.deepEqual(blocks.map(({ language }) => language), ['tactic-comparison', 'stats', 'insight']);
assert.equal(blocks[0].block.left.players.find(({ name }) => name === 'Pedri').x, 33);
assert.equal(blocks[0].block.right.players.find(({ name }) => name === 'Rodri').y, 80);
assert.match(blocks[0].block.right.connectionStyles.join(','), /dashed/);

const preview = renderEnrichedMarkdown(source);
assert.equal((preview.match(/<svg\b/g) || []).length, 2);
assert.equal((preview.match(/<article class="stat-card"/g) || []).length, 3);
assert.ok(preview.indexOf('tactical-comparison') < preview.indexOf('stat-cards'));
assert.ok(preview.indexOf('stat-cards') < preview.indexOf('editorial-callout'));
assert.match(preview, /<h2>1\. Por qué pedimos recuperar el 4-3-3/);
assert.match(preview, /DATOS DE DEMOSTRACIÓN|Tarjetas explicativas/);

const tactic = decodeEnrichedBlock('tactic', JSON.stringify({
  schemaVersion: 1, title: 'Centro del campo',
  players: [{ id: 'rodri', name: 'Rodri', x: 50, y: 78 }, { id: 'pedri', name: 'Pedri', x: 31, y: 55 }, { id: 'gavi', name: 'Gavi', x: 69, y: 55 }],
  connections: [{ from: 'rodri', to: 'pedri', style: 'dashed' }],
}));
const tacticHtml = renderArticleBlock(tactic);
assert.match(tacticHtml, /Rodri/); assert.match(tacticHtml, /cx="180" cy="392\.16"/); assert.match(tacticHtml, /is-dashed/);
assert.throws(() => decodeEnrichedBlock('tactic', JSON.stringify({ schemaVersion: 1, players: [{ id: 'x', name: 'X', x: 50, y: 50 }, { id: 'x', name: 'Y', x: 60, y: 60 }] })), /IDs.*únicos/);
assert.throws(() => decodeEnrichedBlock('tactic', JSON.stringify({ schemaVersion: 1, players: [{ id: 'x', name: 'X', x: 50, y: 50 }], connections: [{ from: 'x', to: 'missing' }] })), /IDs existentes/);

const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" role="img" aria-label="Campo"><rect x="1" y="1" width="98" height="58" fill="#173c31"/><circle cx="50" cy="30" r="8" fill="#fff"/><text x="50" y="50" text-anchor="middle">Rodri</text></svg>';
const svgBlock = decodeEnrichedBlock('oneshot-svg', safeSvg);
assert.match(renderArticleBlock(svgBlock), /oneshot-svg-figure/);
for (const unsafe of [
  safeSvg.replace('</svg>', '<script>alert(1)</script></svg>'),
  safeSvg.replace('<rect ', '<rect onload="alert(1)" '),
  safeSvg.replace('</svg>', '<image href="https://example.com/x.png"/></svg>'),
  safeSvg.replace('</svg>', '<foreignObject><div>HTML</div></foreignObject></svg>'),
  safeSvg.replace('<svg ', '<svg style="fill:url(https://x)" '),
]) assert.throws(() => decodeEnrichedBlock('oneshot-svg', unsafe), /oneshot-svg/);
assert.throws(() => decodeEnrichedBlock('stats', '{"schemaVersion":1,"items":[{"value":"x","label":"y",}]}'), /JSON no válido/);
assert.throws(() => decodeEnrichedBlock('stats', '{"items":[]}'), /schemaVersion/);
const invalidWithText = renderEnrichedMarkdown('Texto antes.\n\n```stats\n{bad}\n```\n\nTexto después.');
assert.match(invalidWithText, /Texto antes/); assert.match(invalidWithText, /Bloque stats no válido · línea 3/); assert.match(invalidWithText, /Texto después/);
assert.throws(() => validateArticleBlocks('```tactic\n{bad}\n```'), /JSON no válido/);

const processor = await createMarkdownProcessor({ remarkPlugins: [remarkArticleBlocks] });
const publishedHtml = (await processor.render(source)).code;
assert.equal((publishedHtml.match(/<svg\b/g) || []).length, 2);
assert.equal((publishedHtml.match(/<article class="stat-card"/g) || []).length, 3);
assert.match(publishedHtml, /<strong>3<\/strong>/);
for (const enabled of [false, true]) {
  const tree = { type: 'root', children: [{ type: 'code', lang: 'tactic', value: JSON.stringify({ schemaVersion: 1, title: 'Foto', playerAppearance: 'portrait', players: [{ id: 'rodri', name: 'Rodri', assetKey: 'tm:357565', x: 50, y: 70 }] }) }] };
  createRemarkArticleBlocks({ playerAssets: { schemaVersion: 1, assets: { 'tm:357565': { status: 'approved', url: `https://store.public.blob.vercel-storage.com/players/tm-357565/${'b'.repeat(64)}.png` } } } })(tree, { path: 'demo.md', data: { astro: { frontmatter: { showPlayerPhotos: enabled } } } });
  assert.equal(/<image\b/.test(tree.children[0].value), enabled, 'Astro renderer follows the article frontmatter photo toggle');
}
const svgPublished = (await processor.render(`\`\`\`oneshot-svg\n${safeSvg}\n\`\`\``)).code;
assert.match(svgPublished, /oneshot-svg-figure/);

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'oneshot-article-store-'));
try {
  await mkdir(path.join(temporaryRoot, 'src', 'content', 'articles'), { recursive: true });
  await mkdir(path.join(temporaryRoot, 'public', 'uploads'), { recursive: true });
  const draftData = new FormData();
  for (const [key, value] of Object.entries({ title: 'Demo v1 — integración', text: source, existingImage: '/images/editorial-placeholder.svg', action: 'draft', category: 'Análisis', tags: 'Barça, táctica', date: '2026-10-26', imageFit: 'contain', imagePosition: 'center', showPlayerPhotos: 'true' })) draftData.set(key, value);
  const draft = await saveLocalArticle(draftData, { root: temporaryRoot, publicHost: '192.168.1.17' });
  assert.equal(draft.ok, true); assert.equal(draft.draft, true);
  const saved = parseLocalArticle(await readFile(path.join(temporaryRoot, 'src', 'content', 'articles', `${draft.slug}.md`), 'utf8'));
  assert.equal(saved.text, source.trim());
  assert.equal(saved.showPlayerPhotos, true, 'the per-article photo toggle is stored in frontmatter');
  assert.deepEqual(validateArticleBlocks(saved.text).map(({ language }) => language), ['tactic-comparison', 'stats', 'insight']);
  assert.deepEqual((await listLocalDrafts(temporaryRoot)).map(({ slug }) => slug), [draft.slug]);
  const reopened = await loadLocalDraft(temporaryRoot, draft.slug);
  assert.equal(reopened.title, 'Demo v1 — integración'); assert.equal(reopened.image, '/images/editorial-placeholder.svg'); assert.equal(reopened.text, source.trim());

  const publishData = new FormData();
  for (const [key, value] of Object.entries({ title: 'Demo v1 — publicación simulada', text: source, existingImage: '/images/editorial-placeholder.svg', action: 'publish', date: '2026-10-26' })) publishData.set(key, value);
  const gitCalls = [];
  const published = await saveLocalArticle(publishData, {
    root: temporaryRoot, shouldPublish: true,
    runGit: async (args) => { gitCalls.push(args); return { stdout: '', stderr: '' }; },
    getGitConfig: async (key) => ({ 'user.name': 'Integration Test', 'user.email': 'integration@example.invalid', 'remote.origin.url': 'mock://never-push' }[key] || ''),
  });
  assert.equal(published.pushed, true, JSON.stringify(published)); assert.ok(gitCalls.some((args) => args[0] === 'push'));
  const finalArticle = parseLocalArticle(await readFile(path.join(temporaryRoot, 'src', 'content', 'articles', `${published.slug}.md`), 'utf8'));
  assert.equal(finalArticle.draft, false); assert.equal(finalArticle.text, source.trim());
  assert.deepEqual((await listLocalDrafts(temporaryRoot)).map(({ slug }) => slug), [draft.slug]);
  assert.throws(() => validateArticleBlocks('```tactic\n{bad}\n```'));

for (const format of ['png', 'jpeg', 'webp']) {
  const bytes = await sharp({ create: { width: 48, height: 72, channels: 4, background: { r: 30, g: 80, b: 58, alpha: format === 'png' ? 0.5 : 1 } } }).toFormat(format).toBuffer();
  const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[format];
  assert.equal((await inspectImage(bytes, mime)).contentType, mime, `${format} user photos pass the server's content inspection`);
  assert.deepEqual(decodeImage({ data: bytes.toString('base64') }), bytes);
  await assert.rejects(inspectImage(bytes, 'image/png' === mime ? 'image/jpeg' : 'image/png'), /no coincide/);
}
await assert.rejects(inspectImage(decodeImage({ data: Buffer.from('<svg/>').toString('base64') }), 'image/png'), /corrupt header|unsupported image format/);
} finally { await rm(temporaryRoot, { recursive: true, force: true }); }

console.log('article publisher integration tests: ok');
