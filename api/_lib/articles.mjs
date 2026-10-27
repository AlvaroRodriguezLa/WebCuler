import { authorizedSession } from './auth.mjs';
import { stripArticleBlocks, validateArticleBlocks } from '../../public/article-blocks.mjs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const API = 'https://api.github.com';
const rootPath = 'src/content/articles';

function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'articulo';
}

function readingTime(text) {
  return Math.max(1, Math.ceil(stripArticleBlocks(text).split(/\s+/).filter(Boolean).length / 220));
}

function asBoolean(value) { return value === true || value === 'true' || value === 'on'; }

function toMarkdown(article, image) {
  const metadata = { ...article };
  delete metadata.text;
  delete metadata.path;
  metadata.image = image;
  metadata.imageAlt = article.imageAlt || `Imagen editorial para ${article.title}`;
  metadata.category = article.category || 'Análisis';
  metadata.tags = Array.isArray(article.tags) ? article.tags : [];
  metadata.featured = Boolean(article.featured);
  metadata.evergreen = Boolean(article.evergreen);
  metadata.draft = Boolean(article.draft);
  metadata.showPlayerPhotos = article.showPlayerPhotos === true;
  metadata.readingTime = readingTime(article.text);
  metadata.imageFit = article.imageFit === 'cover' ? 'cover' : 'contain';
  metadata.imagePosition = /^(center|top|bottom|left|right|center top|center bottom|left center|right center)$/.test(article.imagePosition) ? article.imagePosition : 'center';
  return `---\n${stringifyYaml(metadata, { lineWidth: 0 }).trimEnd()}\n---\n\n${String(article.text || '').trim()}\n`;
}

function parseMarkdown(markdown) {
  const match = String(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('El archivo Markdown no tiene frontmatter válido.');
  const metadata = parseYaml(match[1]) || {};
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('El frontmatter del artículo no es válido.');
  return { ...metadata, text: match[2].trim() };
}

function repoConfig() {
  return {
    owner: process.env.GITHUB_REPOSITORY_OWNER || 'AlvaroRodriguezLa',
    repo: process.env.GITHUB_REPOSITORY_NAME || 'WebCuler',
    branch: process.env.GITHUB_REPOSITORY_BRANCH || 'main',
  };
}

async function github(token, path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.message || `GitHub respondió con error ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return result;
}

function repoPrefix({ owner, repo }) { return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`; }

async function readArticle(token, config, filename) {
  const response = await github(token, `${repoPrefix(config)}/contents/${rootPath}/${encodeURIComponent(filename)}?ref=${encodeURIComponent(config.branch)}`);
  const markdown = Buffer.from(response.content, 'base64').toString('utf8');
  const article = parseMarkdown(markdown);
  return { ...article, path: filename.replace(/\.md$/, '') };
}

async function readRepositoryArticles(session, config) {
  const files = await github(session.accessToken, `${repoPrefix(config)}/contents/${rootPath}?ref=${encodeURIComponent(config.branch)}`);
  const markdownFiles = Array.isArray(files) ? files.filter((file) => file.type === 'file' && file.name.endsWith('.md')) : [];
  return Promise.all(markdownFiles.map((file) => readArticle(session.accessToken, config, file.name).catch(() => null)));
}

export async function listDrafts(req, res) {
  const session = await authorizedSession(req, res);
  const articles = await readRepositoryArticles(session, repoConfig());
  return articles.filter((article) => article?.draft).map(({ text, ...article }) => article)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function listPublished(req, res) {
  const session = await authorizedSession(req, res);
  const articles = await readRepositoryArticles(session, repoConfig());
  return articles.filter((article) => article && !article.draft).map(({ text, ...article }) => article)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function listArticleIndex(req, res) {
  const session = await authorizedSession(req, res);
  const articles = await readRepositoryArticles(session, repoConfig());
  const sorted = articles.filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return {
    drafts: sorted.filter((article) => article.draft).map(({ text, ...article }) => article),
    published: sorted.filter((article) => !article.draft).map(({ text, ...article }) => article),
  };
}

export async function loadPublished(req, res, slug) {
  const session = await authorizedSession(req, res);
  const config = repoConfig();
  const article = await readArticle(session.accessToken, config, `${slugify(slug)}.md`);
  if (article.draft) {
    const error = new Error('Este artículo todavía es un borrador.');
    error.status = 404;
    throw error;
  }
  return article;
}

export async function loadDraft(req, res, slug) {
  const session = await authorizedSession(req, res);
  const config = repoConfig();
  const safeSlug = slugify(slug);
  const article = await readArticle(session.accessToken, config, `${safeSlug}.md`);
  if (!article.draft) {
    const error = new Error('Solo se pueden abrir borradores desde el editor.');
    error.status = 404;
    throw error;
  }
  return article;
}

export async function saveArticle(req, res, body) {
  const session = await authorizedSession(req, res);
  const config = repoConfig();
  if (!body || typeof body !== 'object') throw new Error('No se recibieron los datos del artículo.');
  const title = String(body.title || '').trim();
  const text = String(body.text || '').trim();
  if (!title || !text) throw new Error('Escribe un título y el texto del artículo.');
  if (title.length > 180 || text.length > 100_000) throw new Error('El título o el artículo supera el tamaño permitido.');
  validateArticleBlocks(text);
  if (!['draft', 'publish', 'update'].includes(body.action)) throw new Error('Elige si quieres guardar un borrador, publicar o actualizar el artículo.');
  if (body.action === 'update' && !body.slug) throw new Error('Selecciona un artículo publicado antes de guardar cambios.');
  let slug = slugify(body.slug || title);
  if (body.slug && slug !== body.slug) throw new Error('El identificador del artículo no es válido.');
  let image = String(body.existingImage || '');
  let imageData = '';
  if (body.image?.data && body.image?.name) {
    if (!String(body.image.type).startsWith('image/webp')) throw new Error('La imagen debe llegar optimizada en formato WebP.');
    imageData = String(body.image.data).replace(/^data:image\/webp;base64,/, '');
    const bytes = Buffer.from(imageData, 'base64');
    if (!bytes.length || bytes.length > 3_000_000 || bytes.toString('base64') !== imageData) throw new Error('La imagen debe ocupar menos de 3 MB. Prueba con otra imagen.');
    image = `/uploads/${slug}-${Date.now()}.webp`;
  }
  if (!image) throw new Error('Añade una imagen antes de guardar.');
  if (!/^\/(images|uploads)\/[a-zA-Z0-9._-]+$/.test(image)) throw new Error('La ruta de imagen no es válida.');

  const inputDate = String(body.date || '');
  const parsedDate = new Date(`${inputDate}T12:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(inputDate) && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === inputDate;
  let existingArticle = null;
  if (body.slug) {
    try {
      existingArticle = await readArticle(session.accessToken, config, `${slug}.md`);
      if (body.action === 'update' && existingArticle.draft) {
        const error = new Error('Este artículo es un borrador; guárdalo desde el editor de borradores.');
        error.status = 409;
        throw error;
      }
      if (body.action !== 'update' && !existingArticle.draft) {
        const error = new Error('Los artículos publicados se editan desde la lista de publicados.');
        error.status = 409;
        throw error;
      }
    } catch (error) {
      if (error.status !== 404) throw error;
      if (body.action === 'update') throw error;
    }
  }
  const article = {
    ...(existingArticle || {}),
    title,
    slug,
    text,
    date: validDate ? inputDate : new Date().toISOString().slice(0, 10),
    excerpt: String(body.excerpt || stripArticleBlocks(text).replace(/[#>*_`\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220)),
    category: String(body.category || 'Análisis').slice(0, 100),
    imageAlt: String(body.imageAlt || '').slice(0, 240),
    tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : [],
    featured: asBoolean(body.featured),
    evergreen: asBoolean(body.evergreen),
    draft: body.action === 'draft' ? true : body.action === 'update' ? false : false,
    showPlayerPhotos: body.showPlayerPhotos === true,
    subtitle: String(body.subtitle || '').trim() || undefined,
    subject: String(body.subject || '').trim() || undefined,
    season: String(body.season || '').trim() || undefined,
    archive: String(body.archive || '').trim() || undefined,
    imageFit: body.imageFit === 'cover' ? 'cover' : 'contain',
    imagePosition: String(body.imagePosition || 'center'),
  };
  const articleFile = `${rootPath}/${slug}.md`;
  const articlePath = `/contents/${articleFile}`;
  const ref = await github(session.accessToken, `${repoPrefix(config)}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const parent = await github(session.accessToken, `${repoPrefix(config)}/git/commits/${ref.object.sha}`);

  if (!body.slug) {
    try {
      await github(session.accessToken, `${repoPrefix(config)}${articlePath}?ref=${encodeURIComponent(config.branch)}`);
      const error = new Error('Ya existe un artículo con ese identificador. Cambia el título o abre su borrador.');
      error.status = 409;
      throw error;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }

  const blobs = [];
  if (article.featured && !article.draft) {
    const repositoryFiles = await github(session.accessToken, `${repoPrefix(config)}/contents/${rootPath}?ref=${encodeURIComponent(config.branch)}`);
    const otherArticles = Array.isArray(repositoryFiles)
      ? await Promise.all(repositoryFiles.filter((file) => file.type === 'file' && file.name.endsWith('.md') && file.name !== `${slug}.md`).map((file) => readArticle(session.accessToken, config, file.name).catch(() => null)))
      : [];
    for (const other of otherArticles.filter((entry) => entry && !entry.draft && entry.featured)) {
      const unfeatured = { ...other, featured: false };
      const savedBlob = await github(session.accessToken, `${repoPrefix(config)}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: toMarkdown(unfeatured, other.image), encoding: 'utf-8' }) });
      blobs.push({ path: `${rootPath}/${other.path}.md`, mode: '100644', type: 'blob', sha: savedBlob.sha });
    }
  }
  if (imageData) {
    const uploaded = await github(session.accessToken, `${repoPrefix(config)}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: imageData, encoding: 'base64' }) });
    blobs.push({ path: `public${image}`, mode: '100644', type: 'blob', sha: uploaded.sha });
  }
  const markdownBlob = await github(session.accessToken, `${repoPrefix(config)}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: toMarkdown(article, image), encoding: 'utf-8' }) });
  blobs.push({ path: articleFile, mode: '100644', type: 'blob', sha: markdownBlob.sha });
  const tree = await github(session.accessToken, `${repoPrefix(config)}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree: blobs }) });
  const commit = await github(session.accessToken, `${repoPrefix(config)}/git/commits`, {
    method: 'POST', body: JSON.stringify({ message: `${body.action === 'update' ? 'Editar' : article.draft ? 'Borrador' : 'Publicar'}: ${title}`, tree: tree.sha, parents: [ref.object.sha] }),
  });
  await github(session.accessToken, `${repoPrefix(config)}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
    method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  const url = `${process.env.PUBLIC_SITE_URL || 'https://alvarorodriguezla.github.io'}/WebCuler/articulos/${slug}/`;
  return { ok: true, draft: article.draft, slug, image, url, commit: commit.sha, message: article.draft ? 'Borrador guardado en GitHub.' : body.action === 'update' ? 'Cambios guardados. La web se actualizará en unos instantes.' : 'Artículo publicado. GitHub Pages empezará a actualizarse en unos instantes.' };
}

export async function deletePublished(req, res, slug) {
  const session = await authorizedSession(req, res);
  const config = repoConfig();
  const safeSlug = slugify(slug);
  const articlePath = `${rootPath}/${safeSlug}.md`;
  const current = await github(session.accessToken, `${repoPrefix(config)}/contents/${articlePath}?ref=${encodeURIComponent(config.branch)}`);
  const article = parseMarkdown(Buffer.from(current.content, 'base64').toString('utf8'));
  if (article.draft) {
    const error = new Error('Solo se pueden eliminar artículos publicados desde esta lista.');
    error.status = 409;
    throw error;
  }
  const ref = await github(session.accessToken, `${repoPrefix(config)}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const parent = await github(session.accessToken, `${repoPrefix(config)}/git/commits/${ref.object.sha}`);
  const tree = await github(session.accessToken, `${repoPrefix(config)}/git/trees`, {
    method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree: [{ path: articlePath, mode: '100644', type: 'blob', sha: null }] }),
  });
  const commit = await github(session.accessToken, `${repoPrefix(config)}/git/commits`, {
    method: 'POST', body: JSON.stringify({ message: `Eliminar artículo publicado: ${article.title || safeSlug}`, tree: tree.sha, parents: [ref.object.sha] }),
  });
  await github(session.accessToken, `${repoPrefix(config)}/git/refs/heads/${encodeURIComponent(config.branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  return { ok: true, slug: safeSlug, commit: commit.sha, message: 'Artículo eliminado. La web se actualizará en unos instantes.' };
}
