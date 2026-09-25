import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { importArchive } from '../scripts/import-archive.mjs';

const article = {
  title: 'Artículo de prueba', slug: 'articulo-de-prueba', published_base: true, canonical: true,
  status: 'verified-from-attached-publication', date: '2026-06-18', category: 'Identidad', excerpt: 'Extracto de prueba.',
  tags: ['Barça'], sourceTweetIds: ['1234567890123456789'], sourceTweetUrls: ['https://x.com/test/status/1234567890123456789'],
  source_visual: 'references/published_base/articulo-de-prueba.jpg', source_pdf: null,
  evergreen: true, featured: false, body: 'Texto canónico, sin reescritura.\n\nSegundo párrafo.',
};

async function fixture(t, { articles = [article], prepared = [], sourceAssets = [] } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'one-shot-import-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const output = path.join(root, 'project');
  await mkdir(path.join(source, 'data'), { recursive: true });
  await mkdir(path.join(source, 'docs'), { recursive: true });
  await writeFile(path.join(source, 'data/published_base_manifest.json'), JSON.stringify({ articles }));
  const sections = articles.map((record, index) => `## ${index + 1}. ${record.title}\n\n\`\`\`yaml\nslug: "${record.slug}"\n\`\`\`\n\n### Texto publicado\n\n${record.body}\n\n### Regla de importación\n\n- Mantener la fuente.\n`).join('\n');
  await writeFile(path.join(source, 'docs/PUBLICACIONES_BASE_CANONICAS.md'), sections);
  for (const asset of sourceAssets) {
    const target = path.join(source, ...asset.path.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, asset.contents ?? 'test-image-bytes');
  }
  for (const item of prepared) {
    const target = path.join(source, 'src/content/articles', `${item.slug}.md`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `---\n${item.frontmatter}\n---\n\n${item.body}\n`);
  }
  return { source, output };
}

test('A/B: imports a canonical article from an otherwise empty collection, then re-imports without duplicates', async (t) => {
  const paths = await fixture(t);
  const first = await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  const second = await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  const files = await readdir(path.join(paths.output, 'src/content/articles'));
  assert.equal(first.importedCanonical, 1);
  assert.equal(second.importedCanonical, 0);
  assert.equal(second.alreadyExisting, 1);
  assert.equal(files.filter((file) => file.endsWith('.md')).length, 1);
});

test('C: an identical canonical source remains byte-for-byte unchanged on re-import', async (t) => {
  const paths = await fixture(t);
  await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  const file = path.join(paths.output, 'src/content/articles/articulo-de-prueba.md');
  const before = await readFile(file);
  await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  assert.deepEqual(await readFile(file), before);
});

test('C2: formatting-only Markdown differences are treated as the same published text', async (t) => {
  const paths = await fixture(t);
  const directory = path.join(paths.output, 'src/content/articles');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${article.slug}.md`), `---\ntitle: Artículo de prueba\nslug: ${article.slug}\ndate: "2026-06-18"\ncategory: Identidad\ndraft: false\n---\n\n**Texto canónico, sin reescritura.**\n\nSegundo párrafo.\n`);
  const report = await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  assert.equal(report.canonicalOverrides, 0);
  assert.equal(report.conflicts.length, 0);
  assert.equal(report.updated, 1);
});

test('D: a canonical slug collision is reported and the previous article is backed up before replacement', async (t) => {
  const paths = await fixture(t);
  const directory = path.join(paths.output, 'src/content/articles');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${article.slug}.md`), `---\ntitle: Versión previa\nslug: ${article.slug}\ndate: "2026-09-24"\ncategory: Identidad\ndraft: false\n---\n\nTexto previo distinto.\n`);
  const report = await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  const imported = await readFile(path.join(directory, `${article.slug}.md`), 'utf8');
  const backups = await readdir(path.join(paths.output, 'data/archive-import-conflicts'));
  assert.equal(report.canonicalOverrides, 1);
  assert.ok(report.conflicts.some((conflict) => conflict.slug === article.slug));
  assert.match(imported, /Texto canónico, sin reescritura/);
  assert.equal(backups.length, 1);
});

test('E: prepared drafts are retained as source material but not imported as public articles', async (t) => {
  const paths = await fixture(t, { prepared: [{
    slug: 'borrador-no-publico',
    frontmatter: 'title: Borrador\nslug: borrador-no-publico\ndate: "2026-06-19"\ncategory: Identidad\ndraft: true',
    body: 'Este texto debe permanecer como borrador.',
  }] });
  const report = await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  await assert.rejects(readFile(path.join(paths.output, 'src/content/articles/borrador-no-publico.md')));
  assert.equal(report.draftsNotPublished, 1);
  assert.equal(report.importedCanonical, 1);
  assert.ok(await readFile(path.join(paths.output, 'data/archive-source/articles/borrador-no-publico.md')));
});

test('F: a missing source image warns but does not stop the article import', async (t) => {
  const paths = await fixture(t);
  article.source_visual = 'references/published_base/missing.jpg';
  t.after(() => { article.source_visual = 'references/published_base/articulo-de-prueba.jpg'; });
  const report = await importArchive({ sourcePath: paths.source, outputRoot: paths.output });
  const imported = await readFile(path.join(paths.output, 'src/content/articles/articulo-de-prueba.md'), 'utf8');
  assert.equal(report.importedCanonical, 1);
  assert.ok(report.warnings.some((warning) => warning.includes('Missing legacy visual')));
  assert.match(imported, /image: \/images\/editorial-placeholder\.svg/);
});

test('G: an invalid manifest fails with a clear validation error', async (t) => {
  const paths = await fixture(t);
  await writeFile(path.join(paths.source, 'data/published_base_manifest.json'), JSON.stringify({ articles: 'not-an-array' }));
  await assert.rejects(importArchive({ sourcePath: paths.source, outputRoot: paths.output }), /Manifest must contain an articles array/);
});
