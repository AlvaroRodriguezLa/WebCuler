import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANONICAL_DOC = 'docs/PUBLICACIONES_BASE_CANONICAS.md';
const MANIFEST = 'data/published_base_manifest.json';
const PLACEHOLDER = '/images/editorial-placeholder.svg';

const text = (value) => String(value ?? '').replace(/\r\n?/g, '\n');
const contentHash = (value) => createHash('sha256')
  .update(text(value).replace(/\*\*(.*?)\*\*/gs, '$1').replace(/__(.*?)__/gs, '$1').trim().replace(/\s+/g, ' '))
  .digest('hex');
const safeSlug = (slug) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const asStringArray = (value) => Array.isArray(value) ? value.map((item) => String(item)) : [];

function safeRelative(value, label = 'path') {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty relative path.`);
  const normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  return normalized.replace(/^\.\//, '');
}

async function resolveInside(root, relative, label = 'path') {
  const safe = safeRelative(relative, label);
  const candidate = path.resolve(root, ...safe.split('/'));
  const rootPath = path.resolve(root);
  if (candidate !== rootPath && !candidate.startsWith(`${rootPath}${path.sep}`)) throw new Error(`Unsafe ${label}: ${relative}`);
  return candidate;
}

async function extractZip(zipPath) {
  const absoluteZip = path.resolve(zipPath);
  const listing = spawnSync('tar', ['-tf', absoluteZip], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (listing.error) throw new Error(`Could not inspect ZIP archive: ${listing.error.message}`);
  if (listing.status !== 0) throw new Error(`Could not list ZIP archive: ${listing.stderr || listing.stdout}`.trim());
  const entries = listing.stdout.split(/\r?\n/).filter(Boolean);
  if (entries.length > 20_000) throw new Error('Archive has an unusually large number of entries.');
  for (const entry of entries) safeRelative(entry.replace(/\/$/, ''), 'ZIP entry');

  const details = spawnSync('tar', ['-tvf', absoluteZip], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (details.status !== 0) throw new Error(`Could not validate ZIP entry types: ${details.stderr || details.stdout}`.trim());
  if (details.stdout.split(/\r?\n/).some((line) => /^[lh]/.test(line))) throw new Error('Symbolic links and hard links are not accepted in migration archives.');

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'one-shot-archive-'));
  const extracted = spawnSync('tar', ['-xf', absoluteZip, '-C', temporaryRoot], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (extracted.status !== 0) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw new Error(`Could not extract ZIP archive: ${extracted.stderr || extracted.stdout}`.trim());
  }
  return { root: temporaryRoot, cleanup: () => rm(temporaryRoot, { recursive: true, force: true }) };
}

async function findSourceRoot(root) {
  const candidates = [root, path.join(root, 'scarface_web_migration_v6')];
  for (const candidate of candidates) {
    try {
      await stat(path.join(candidate, MANIFEST));
      await stat(path.join(candidate, CANONICAL_DOC));
      return candidate;
    } catch { /* Try the next supported source layout. */ }
  }
  throw new Error(`Migration source must contain ${MANIFEST} and ${CANONICAL_DOC}.`);
}

function parseCanonicalDocument(source) {
  const sections = text(source).split(/(?=^##\s+\d+\.\s+)/m).filter((section) => /^##\s+\d+\.\s+/m.test(section));
  const records = new Map();
  for (const section of sections) {
    const title = section.match(/^##\s+\d+\.\s+(.+)\s*$/m)?.[1]?.trim();
    const slug = section.match(/^slug:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
    const marker = section.match(/^### Texto publicado\s*\r?\n/m);
    if (!title || !slug || !marker) continue;
    const bodyStart = marker.index + marker[0].length;
    const remainder = section.slice(bodyStart);
    const stop = remainder.search(/^###\s+/m);
    const body = remainder.slice(0, stop < 0 ? undefined : stop).trim();
    if (!safeSlug(slug) || !body) throw new Error(`Canonical document has an invalid or empty article: ${slug || title}`);
    if (records.has(slug)) throw new Error(`Canonical document contains duplicate slug: ${slug}`);
    records.set(slug, { title, slug, body });
  }
  return records;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.articles)) throw new Error('Manifest must contain an articles array.');
  const slugs = new Set();
  const records = manifest.articles.filter((article) => article?.canonical === true && article?.published_base === true);
  for (const article of records) {
    if (!safeSlug(article.slug)) throw new Error(`Invalid manifest slug: ${article.slug}`);
    if (slugs.has(article.slug)) throw new Error(`Manifest contains duplicate canonical slug: ${article.slug}`);
    slugs.add(article.slug);
    if (!article.title || !/^\d{4}-\d{2}-\d{2}$/.test(String(article.date)) || !article.category || !article.body?.trim()) {
      throw new Error(`Canonical manifest entry is missing title, valid date, category, or body: ${article.slug}`);
    }
    if (article.source_visual && typeof article.source_visual !== 'string') throw new Error(`Invalid source_visual for ${article.slug}.`);
    if (article.source_pdf && typeof article.source_pdf !== 'string') throw new Error(`Invalid source_pdf for ${article.slug}.`);
  }
  return records;
}

async function walkMarkdown(directory) {
  try { await stat(directory); } catch { return []; }
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(absolute));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolute);
  }
  return files;
}

function parseArticleMarkdown(raw, file) {
  const source = text(raw);
  const match = source.match(/^---\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) throw new Error(`Invalid frontmatter in ${file}`);
  let data;
  try { data = parseYaml(match[1]); } catch (error) { throw new Error(`Invalid YAML frontmatter in ${file}: ${error.message}`); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Frontmatter must be an object in ${file}`);
  return { data, body: source.slice(match[0].length).trim(), raw: source };
}

function excerptFrom(body) {
  const firstParagraph = text(body).split(/\n\s*\n/).find((part) => part.trim()) || '';
  const plain = firstParagraph.replace(/^#{1,6}\s+/gm, '').replace(/[*_`>#\[\]]/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length <= 220) return plain;
  return `${plain.slice(0, 217).replace(/\s+\S*$/, '')}…`;
}

function metadataFor(record, prepared = {}) {
  const tags = asStringArray(record.tags ?? prepared.tags);
  return {
    title: String(record.title ?? prepared.title),
    slug: String(record.slug ?? prepared.slug),
    date: String(record.date ?? prepared.date ?? ''),
    excerpt: String(record.excerpt ?? prepared.excerpt ?? excerptFrom(record.body)),
    image: String(record.image ?? PLACEHOLDER),
    imageAlt: String(record.imageAlt ?? prepared.imageAlt ?? `Imagen editorial para ${record.title ?? prepared.title}`),
    category: String(record.category ?? prepared.category ?? 'Análisis'),
    tags,
    draft: Boolean(record.draft ?? prepared.draft ?? false),
    evergreen: Boolean(record.evergreen ?? prepared.evergreen ?? false),
    featured: Boolean(record.featured ?? prepared.featured ?? false),
    ...(record.season ?? prepared.season ? { season: String(record.season ?? prepared.season) } : {}),
    ...(record.subject ?? prepared.subject ? { subject: String(record.subject ?? prepared.subject) } : {}),
    ...(record.archive ?? prepared.archive ? { archive: String(record.archive ?? prepared.archive) } : {}),
    imageFit: String(record.imageFit ?? prepared.imageFit ?? 'contain'),
    imagePosition: String(record.imagePosition ?? prepared.imagePosition ?? 'center'),
    sourceTweetIds: asStringArray(record.sourceTweetIds ?? prepared.sourceTweetIds),
    sourceTweetUrls: asStringArray(record.sourceTweetUrls ?? prepared.sourceTweetUrls),
    legacyVisuals: [],
    canonical: Boolean(record.canonical ?? record.canonical === true),
    publishedBase: Boolean(record.published_base ?? prepared.publishedBase ?? prepared.published_base ?? false),
    migrationStatus: String(record.status ?? prepared.migrationStatus ?? 'archive-import'),
  };
}

async function copyWithoutOverwrite(source, destination) {
  const bytes = await readFile(source);
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await writeFile(destination, bytes, { flag: 'wx' });
    return { copied: true, same: false, path: destination };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await readFile(destination);
    if (existing.equals(bytes)) return { copied: false, same: true, path: destination };
    const extension = path.extname(destination);
    const stem = extension ? destination.slice(0, -extension.length) : destination;
    const alternate = `${stem}-${createHash('sha256').update(bytes).digest('hex').slice(0, 8)}${extension}`;
    try {
      await writeFile(alternate, bytes, { flag: 'wx' });
      return { copied: true, same: false, path: alternate, conflict: destination };
    } catch (alternateError) {
      if (alternateError.code !== 'EEXIST') throw alternateError;
      const prior = await readFile(alternate);
      if (prior.equals(bytes)) return { copied: false, same: true, path: alternate, conflict: destination };
      throw new Error(`Asset conflict cannot be resolved safely: ${destination}`);
    }
  }
}

async function candidateCover(sourceRoot, record, prepared) {
  const folder = path.join(sourceRoot, 'public', 'images', 'articles', record.slug);
  try {
    const files = await readdir(folder, { withFileTypes: true });
    const cover = files.filter((entry) => entry.isFile() && /\.(?:avif|jpe?g|png|webp)$/i.test(entry.name) && !/legacy|original/i.test(entry.name))
      .sort((a, b) => Number(/cover|hero|main/i.test(b.name)) - Number(/cover|hero|main/i.test(a.name)))[0];
    if (cover) return path.join(folder, cover.name);
  } catch { /* No prepared image folder. */ }

  const supplied = record.cover ?? record.image ?? prepared.image;
  if (typeof supplied === 'string' && supplied.startsWith('/')) {
    const relative = safeRelative(supplied.replace(/^\//, ''), 'image path');
    if (!/legacy|original/i.test(relative)) {
      const candidate = path.join(sourceRoot, 'public', ...relative.split('/'));
      try { if ((await lstat(candidate)).isFile()) return candidate; } catch { /* Missing cover is handled as a warning. */ }
    }
  }
  return undefined;
}

async function installAssets(sourceRoot, outputRoot, record, metadata, prepared, report) {
  const slugDir = path.join(outputRoot, 'public', 'images', 'articles', record.slug);
  const publicLegacy = [];
  const sourceRefs = [record.source_visual, record.source_pdf].filter(Boolean);
  const preparedLegacy = record.canonical ? [] : asStringArray(prepared.legacyVisuals);
  const candidateSource = await candidateCover(sourceRoot, record, prepared);
  if (candidateSource) {
    const extension = path.extname(candidateSource).toLowerCase() || '.webp';
    const copied = await copyWithoutOverwrite(candidateSource, path.join(slugDir, `cover${extension}`));
    metadata.image = `/images/articles/${record.slug}/${path.basename(copied.path)}`;
    if (copied.conflict) report.warnings.push(`Cover collision for ${record.slug}; kept existing file and used a content-addressed copy.`);
  }

  const legacyInputs = [...new Set([...sourceRefs, ...preparedLegacy])];
  const copiedHashes = new Set();
  for (const [index, reference] of legacyInputs.entries()) {
    let sourceFile;
    let originalReference;
    try {
      if (reference.startsWith('/')) {
        const relative = safeRelative(reference.slice(1), 'legacy visual path');
        sourceFile = path.join(sourceRoot, 'public', ...relative.split('/'));
        originalReference = `public/${relative}`;
      } else {
        originalReference = safeRelative(reference, 'legacy visual path');
        sourceFile = await resolveInside(sourceRoot, originalReference, 'legacy visual path');
      }
      if (!(await lstat(sourceFile)).isFile()) throw new Error('not a file');
    } catch {
      report.warnings.push(`Missing legacy visual for ${record.slug}: ${reference}`);
      continue;
    }

    const digest = createHash('sha256').update(await readFile(sourceFile)).digest('hex');
    if (copiedHashes.has(digest)) continue;
    copiedHashes.add(digest);

    const referenceName = originalReference.startsWith('references/published_base/')
      ? originalReference.slice('references/published_base/'.length)
      : path.posix.join(record.slug, path.basename(originalReference));
    const referenceCopy = await copyWithoutOverwrite(sourceFile, path.join(outputRoot, 'references', 'published_base', ...referenceName.split('/')));
    const extension = path.extname(sourceFile).toLowerCase();
    const filename = extension === '.pdf' ? `original-${index + 1}.pdf` : `legacy-${index + 1}${extension || '.bin'}`;
    const publicCopy = await copyWithoutOverwrite(sourceFile, path.join(slugDir, filename));
    publicLegacy.push(`/images/articles/${record.slug}/${path.basename(publicCopy.path)}`);
    if (referenceCopy.conflict || publicCopy.conflict) report.warnings.push(`An existing asset differed from the archive for ${record.slug}; both copies were preserved.`);
  }

  if (metadata.image === PLACEHOLDER && publicLegacy.some((item) => /\.(?:avif|jpe?g|png|webp)$/i.test(item))) {
    metadata.image = publicLegacy.find((item) => /\.(?:avif|jpe?g|png|webp)$/i.test(item));
    metadata.imageFit = 'contain';
  }
  if (!candidateSource && metadata.image !== PLACEHOLDER && !publicLegacy.includes(metadata.image)) {
    metadata.image = publicLegacy.find((item) => /\.(?:avif|jpe?g|png|webp)$/i.test(item)) || PLACEHOLDER;
  }
  metadata.legacyVisuals = publicLegacy;
  if (!candidateSource && !publicLegacy.some((item) => /\.(?:avif|jpe?g|png|webp)$/i.test(item))) {
    report.warnings.push(`No cover or image source for ${record.slug}; using the site placeholder.`);
  }
}

function serializeArticle(metadata, body) {
  const frontmatter = stringifyYaml(metadata, { lineWidth: 0 }).trimEnd();
  return `---\n${frontmatter}\n---\n\n${text(body).trim()}\n`;
}

function aliasArticle(existing, destinationSlug) {
  const data = { ...existing.data, draft: true, canonical: false, publishedBase: false, redirectTo: destinationSlug };
  return serializeArticle(data, existing.body);
}

async function copyArchiveSources(sourceRoot, outputRoot, report) {
  const copies = [
    [MANIFEST, MANIFEST],
    ['data/article_source_map.csv', 'data/article_source_map.csv'],
    ['data/x_tweets_inventory.csv', 'data/x_tweets_inventory.csv'],
    [CANONICAL_DOC, CANONICAL_DOC],
    ['README_IMPORT.md', 'docs/archive-source/README_IMPORT.md'],
    ['docs/ARTICLE_INDEX.md', 'docs/archive-source/ARTICLE_INDEX.md'],
    ['docs/EDITORIAL_DECISIONS.md', 'docs/archive-source/EDITORIAL_DECISIONS.md'],
    ['docs/PUBLICACIONES_BASE_CANONICAS_BATCH3.md', 'docs/archive-source/PUBLICACIONES_BASE_CANONICAS_BATCH3.md'],
    ['docs/PUBLICACIONES_BASE_CANONICAS_BATCH4.md', 'docs/archive-source/PUBLICACIONES_BASE_CANONICAS_BATCH4.md'],
  ];
  for (const [sourceRelative, targetRelative] of copies) {
    const source = path.join(sourceRoot, ...sourceRelative.split('/'));
    try {
      if (!(await lstat(source)).isFile()) continue;
      const result = await copyWithoutOverwrite(source, path.join(outputRoot, ...targetRelative.split('/')));
      if (result.conflict) report.warnings.push(`Preserved existing source file; incoming copy saved as ${path.basename(result.path)}.`);
    } catch { /* Optional supporting files are reported only when explicitly required. */ }
  }

  const refs = path.join(sourceRoot, 'references', 'published_base');
  for (const source of await walkFiles(refs)) {
    const relative = path.relative(sourceRoot, source);
    const target = path.join(outputRoot, ...relative.split(path.sep));
    const result = await copyWithoutOverwrite(source, target);
    if (result.conflict) report.warnings.push(`Preserved existing source reference and saved incoming copy as ${path.basename(result.path)}.`);
  }

  const otherReferences = await walkFiles(path.join(sourceRoot, 'references'));
  for (const source of otherReferences) {
    const relative = path.relative(path.join(sourceRoot, 'references'), source);
    if (relative.split(path.sep)[0] === 'published_base') continue;
    const target = path.join(outputRoot, 'references', 'design-source', path.basename(relative));
    const result = await copyWithoutOverwrite(source, target);
    if (result.conflict) report.warnings.push(`Preserved existing design reference and saved incoming copy as ${path.basename(result.path)}.`);
  }

  const articleSources = await walkMarkdown(path.join(sourceRoot, 'src', 'content', 'articles'));
  for (const source of articleSources) {
    const target = path.join(outputRoot, 'data', 'archive-source', 'articles', path.basename(source));
    const result = await copyWithoutOverwrite(source, target);
    if (result.conflict) report.warnings.push(`Preserved prior migration source for ${path.basename(source)}; incoming copy was retained separately.`);
  }
  report.sourceMarkdownFiles = articleSources.length;
}

async function walkFiles(directory) {
  try { await stat(directory); } catch { return []; }
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function backupConflict(outputRoot, slug, existingRaw, report) {
  const name = `${slug}.${contentHash(existingRaw).slice(0, 10)}.md`;
  const destination = path.join(outputRoot, 'data', 'archive-import-conflicts', name);
  await mkdir(path.dirname(destination), { recursive: true });
  try { await writeFile(destination, existingRaw, { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (!(await readFile(destination, 'utf8')).trimEnd().endsWith(text(existingRaw).trimEnd())) throw new Error(`Conflict backup already differs: ${destination}`);
  }
  report.backups.push(path.relative(outputRoot, destination).replaceAll(path.sep, '/'));
}

async function readExistingArticles(outputRoot) {
  const directory = path.join(outputRoot, 'src', 'content', 'articles');
  const bySlug = new Map();
  for (const file of await walkMarkdown(directory)) {
    const parsed = parseArticleMarkdown(await readFile(file, 'utf8'), file);
    if (!safeSlug(parsed.data.slug)) continue;
    const entry = { ...parsed, file, slug: parsed.data.slug, hash: contentHash(parsed.body), tweetIds: asStringArray(parsed.data.sourceTweetIds) };
    if (bySlug.has(entry.slug)) throw new Error(`Current content contains duplicate slug: ${entry.slug}`);
    bySlug.set(entry.slug, entry);
  }
  return bySlug;
}

function bodyFromPrepared(parsed, file) {
  if (!parsed.body) throw new Error(`Prepared article has an empty body: ${file}`);
  return parsed.body;
}

async function buildCandidates(sourceRoot, report) {
  const manifestPath = path.join(sourceRoot, ...MANIFEST.split('/'));
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) { throw new Error(`Cannot read manifest ${MANIFEST}: ${error.message}`); }
  const canonicalRecords = validateManifest(manifest);
  const canonicalText = parseCanonicalDocument(await readFile(path.join(sourceRoot, ...CANONICAL_DOC.split('/')), 'utf8'));
  const preparedFiles = await walkMarkdown(path.join(sourceRoot, 'src', 'content', 'articles'));
  const preparedEntries = [];
  for (const file of preparedFiles) preparedEntries.push({ file, ...parseArticleMarkdown(await readFile(file, 'utf8'), file) });
  const canonicalSlugs = new Set();
  const candidates = [];
  for (const article of canonicalRecords) {
    const master = canonicalText.get(article.slug);
    if (!master) throw new Error(`Canonical document is missing manifest article ${article.slug}.`);
    if (master.title !== article.title) report.warnings.push(`Title differs between canonical document and manifest for ${article.slug}; canonical document title wins.`);
    if (contentHash(master.body) !== contentHash(article.body)) report.warnings.push(`Body differs between canonical document and manifest for ${article.slug}; canonical document text wins.`);
    canonicalSlugs.add(article.slug);
    let prepared = {};
    const preparedMatch = preparedEntries.find((entry) => entry.data.slug === article.slug);
    if (preparedMatch) prepared = preparedMatch.data;
    const record = { ...article, title: master.title, slug: master.slug, body: master.body, canonical: true, published_base: true };
    candidates.push({ record, metadata: metadataFor(record, prepared), body: master.body, canonical: true, source: `canonical:${article.slug}`, prepared });
  }

  const seenPreparedSlugs = new Set();
  for (const parsed of preparedEntries) {
    const { file } = parsed;
    const slug = parsed.data.slug;
    if (!safeSlug(slug)) throw new Error(`Invalid slug in prepared article ${file}: ${slug}`);
    if (canonicalSlugs.has(slug)) continue;
    if (parsed.data.draft === true) { report.draftsNotPublished += 1; continue; }
    if (seenPreparedSlugs.has(slug)) throw new Error(`Prepared migration articles contain duplicate slug: ${slug}`);
    seenPreparedSlugs.add(slug);
    if (!parsed.data.title || !/^\d{4}-\d{2}-\d{2}$/.test(String(parsed.data.date ?? ''))) throw new Error(`Prepared article is missing title or valid date: ${file}`);
    const record = { ...parsed.data, title: String(parsed.data.title), slug, body: bodyFromPrepared(parsed, file), canonical: false, published_base: false };
    candidates.push({ record, metadata: metadataFor(record, parsed.data), body: record.body, canonical: false, source: `prepared:${slug}`, prepared: parsed.data });
  }
  report.canonicalDetected = canonicalRecords.length;
  report.preparedReady = candidates.filter((candidate) => !candidate.canonical).length;
  return candidates;
}

async function importCandidate(sourceRoot, outputRoot, candidate, existing, report) {
  const { record, metadata, body, canonical } = candidate;
  const target = existing.get(record.slug);
  const bodyHash = contentHash(body);
  if (target?.data.redirectTo) {
    if (target.data.redirectTo === record.slug) {
      report.alreadyExisting += 1;
      return;
    }
    report.conflicts.push({ slug: record.slug, reason: `slug is already an alias to ${target.data.redirectTo}` });
    return;
  }

  if (target && target.hash !== bodyHash) {
    if (!canonical) {
      report.conflicts.push({ slug: record.slug, reason: 'a different article already uses this slug; existing content was preserved' });
      return;
    }
    if (target.data.canonical === true || target.data.publishedBase === true || target.data.published_base === true) {
      report.conflicts.push({ slug: record.slug, reason: 'existing canonical article has different text; no overwrite was made' });
      return;
    }
    await backupConflict(outputRoot, record.slug, target.raw, report);
    report.conflicts.push({ slug: record.slug, reason: 'canonical source replaced a non-canonical reconstruction after saving a full backup' });
    report.canonicalOverrides += 1;
  }

  const aliases = [];
  const tweetIds = new Set(asStringArray(record.sourceTweetIds));
  for (const entry of existing.values()) {
    if (entry.slug === record.slug || entry.data.redirectTo) continue;
    const sharesSource = entry.tweetIds.some((tweetId) => tweetIds.has(tweetId));
    if (entry.hash === bodyHash || sharesSource) aliases.push(entry);
  }

  await installAssets(sourceRoot, outputRoot, record, metadata, candidate.prepared, report);
  if (target && target.hash === bodyHash && (target.data.canonical === true || target.data.publishedBase === true)) {
    report.alreadyExisting += 1;
    if (target.raw !== serializeArticle(metadata, body)) report.conflicts.push({ slug: record.slug, reason: 'existing canonical article has local metadata edits; those edits were preserved' });
    return;
  }
  const outputPath = target?.file ?? path.join(outputRoot, 'src', 'content', 'articles', `${record.slug}.md`);
  const serialized = serializeArticle(metadata, body);
  if (target && target.hash === bodyHash && target.raw === serialized) {
    report.alreadyExisting += 1;
  } else {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized);
    if (target) report.updated += 1;
    else if (canonical) report.importedCanonical += 1;
    else report.importedPrepared += 1;
  }

  existing.set(record.slug, { ...parseArticleMarkdown(serialized, outputPath), file: outputPath, slug: record.slug, hash: bodyHash, tweetIds: asStringArray(metadata.sourceTweetIds) });
  for (const alias of aliases) {
    if (alias.body && alias.data.draft === true && alias.data.redirectTo === record.slug) continue;
    if (alias.hash !== bodyHash) await backupConflict(outputRoot, alias.slug, alias.raw, report);
    const redirected = aliasArticle(alias, record.slug);
    await writeFile(alias.file, redirected);
    existing.set(alias.slug, { ...parseArticleMarkdown(redirected, alias.file), file: alias.file, slug: alias.slug, hash: contentHash(alias.body), tweetIds: alias.tweetIds });
    report.aliases.push({ from: alias.slug, to: record.slug });
  }
}

function printReport(report) {
  console.log(`Canonical publications detected: ${report.canonicalDetected}`);
  console.log(`Canonical articles imported: ${report.importedCanonical}`);
  console.log(`Prepared publications imported: ${report.importedPrepared}`);
  console.log(`Already present / unchanged: ${report.alreadyExisting}`);
  console.log(`Existing articles updated: ${report.updated}`);
  console.log(`Canonical overrides with backup: ${report.canonicalOverrides}`);
  console.log(`Prepared items kept out due to conflicts: ${report.conflicts.filter((item) => !item.reason.startsWith('canonical source replaced')).length}`);
  console.log(`Drafts kept unpublished: ${report.draftsNotPublished}`);
  console.log(`Historical URLs redirected: ${report.aliases.length}`);
  console.log(`Source Markdown files preserved: ${report.sourceMarkdownFiles}`);
  console.log(`Backups saved: ${report.backups.length}`);
  console.log(`Warnings: ${report.warnings.length}`);
  for (const conflict of report.conflicts) console.log(`CONFLICT ${conflict.slug}: ${conflict.reason}`);
  for (const warning of report.warnings) console.log(`WARNING ${warning}`);
}

export async function importArchive({ sourcePath, outputRoot = PROJECT_ROOT } = {}) {
  if (!sourcePath) throw new Error('Pass an extracted migration directory or a .zip archive.');
  const absoluteSource = path.resolve(sourcePath);
  const sourceStat = await stat(absoluteSource);
  const extracted = sourceStat.isFile() ? await extractZip(absoluteSource) : undefined;
  const sourceRoot = await findSourceRoot(extracted?.root ?? absoluteSource);
  const report = {
    canonicalDetected: 0, importedCanonical: 0, preparedReady: 0, importedPrepared: 0, alreadyExisting: 0, updated: 0,
    canonicalOverrides: 0, draftsNotPublished: 0, sourceMarkdownFiles: 0, aliases: [], backups: [], conflicts: [], warnings: [],
  };
  try {
    const candidates = await buildCandidates(sourceRoot, report);
    await copyArchiveSources(sourceRoot, outputRoot, report);
    const existing = await readExistingArticles(outputRoot);
    for (const candidate of candidates) await importCandidate(sourceRoot, outputRoot, candidate, existing, report);
    printReport(report);
    return report;
  } finally {
    await extracted?.cleanup();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await importArchive({ sourcePath: process.argv[2] });
  } catch (error) {
    console.error(`Archive import failed: ${error.message}`);
    process.exitCode = 1;
  }
}
