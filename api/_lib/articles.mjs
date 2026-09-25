import { authorizedSession } from './auth.mjs';

const API = 'https://api.github.com';
const rootPath = 'src/content/articles';

function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'articulo';
}

function yaml(value) { return JSON.stringify(value ?? ''); }

function readingTime(text) {
  return Math.max(1, Math.ceil(String(text || '').trim().split(/\s+/).filter(Boolean).length / 220));
}

function toMarkdown(article, image) {
  const optional = (key, value) => value ? `${key}: ${yaml(value)}\n` : '';
  const fields = [
    `title: ${yaml(article.title)}`,
    `slug: ${article.slug}`,
    `date: ${yaml(article.date)}`,
    `excerpt: ${yaml(article.excerpt)}`,
    `image: ${image}`,
    `imageAlt: ${yaml(article.imageAlt || `Imagen editorial para ${article.title}`)}`,
    `category: ${yaml(article.category || 'Análisis')}`,
    `tags: ${JSON.stringify(article.tags || [])}`,
    optional('subtitle', article.subtitle),
    optional('subject', article.subject),
    optional('season', article.season),
    `featured: ${Boolean(article.featured)}`,
    `evergreen: ${Boolean(article.evergreen)}`,
    `draft: ${Boolean(article.draft)}`,
    `readingTime: ${readingTime(article.text)}`,
    `imageFit: ${article.imageFit === 'cover' ? 'cover' : 'contain'}`,
    `imagePosition: ${/^(center|top|bottom|left|right|center top|center bottom|left center|right center)$/.test(article.imagePosition) ? article.imagePosition : 'center'}`,
    optional('archive', article.archive),
  ].filter(Boolean);
  return `---\n${fields.join('\n')}\n---\n\n${String(article.text || '').trim()}\n`;
}

function scalar(value) {
  const input = String(value || '').trim();
  if (input.startsWith('"')) {
    try { return JSON.parse(input); } catch { return input.slice(1, -1); }
  }
  if (input === 'true') return true;
  if (input === 'false') return false;
  if (input.startsWith('[')) {
    try { return JSON.parse(input); } catch { return []; }
  }
  return input;
}

function parseMarkdown(markdown) {
  const match = String(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('El archivo Markdown no tiene frontmatter válido.');
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (field) metadata[field[1]] = scalar(field[2]);
  }
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

export async function listDrafts(req, res) {
  const session = await authorizedSession(req, res);
  const config = repoConfig();
  const files = await github(session.accessToken, `${repoPrefix(config)}/contents/${rootPath}?ref=${encodeURIComponent(config.branch)}`);
  const markdownFiles = Array.isArray(files) ? files.filter((file) => file.type === 'file' && file.name.endsWith('.md')) : [];
  const articles = await Promise.all(markdownFiles.map((file) => readArticle(session.accessToken, config, file.name).catch(() => null)));
  return articles.filter((article) => article?.draft).map(({ text, ...article }) => article)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
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
  if (!['draft', 'publish'].includes(body.action)) throw new Error('Elige si quieres guardar un borrador o publicar el artículo.');
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
  const article = {
    ...body,
    title,
    slug,
    text,
    date: validDate ? inputDate : new Date().toISOString().slice(0, 10),
    excerpt: String(body.excerpt || text.replace(/[#>*_`\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220)),
    category: String(body.category || 'Análisis').slice(0, 100),
    imageAlt: String(body.imageAlt || '').slice(0, 240),
    tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : [],
    featured: Boolean(body.featured),
    evergreen: Boolean(body.evergreen),
    draft: body.action === 'draft',
  };
  const articleFile = `${rootPath}/${slug}.md`;
  const articlePath = `/contents/${articleFile}`;
  const ref = await github(session.accessToken, `${repoPrefix(config)}/git/ref/heads/${encodeURIComponent(config.branch)}`);
  const parent = await github(session.accessToken, `${repoPrefix(config)}/git/commits/${ref.object.sha}`);

  if (body.slug) {
    try {
      const existing = await github(session.accessToken, `${repoPrefix(config)}${articlePath}?ref=${encodeURIComponent(config.branch)}`);
      if (existing?.content) {
        const saved = parseMarkdown(Buffer.from(existing.content, 'base64').toString('utf8'));
        if (!saved.draft) {
          const error = new Error('Los artículos publicados no se editan desde el editor de borradores.');
          error.status = 409;
          throw error;
        }
      }
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  } else {
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
  if (imageData) {
    const uploaded = await github(session.accessToken, `${repoPrefix(config)}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: imageData, encoding: 'base64' }) });
    blobs.push({ path: `public${image}`, mode: '100644', type: 'blob', sha: uploaded.sha });
  }
  const markdownBlob = await github(session.accessToken, `${repoPrefix(config)}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: toMarkdown(article, image), encoding: 'utf-8' }) });
  blobs.push({ path: articleFile, mode: '100644', type: 'blob', sha: markdownBlob.sha });
  const tree = await github(session.accessToken, `${repoPrefix(config)}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree: blobs }) });
  const commit = await github(session.accessToken, `${repoPrefix(config)}/git/commits`, {
    method: 'POST', body: JSON.stringify({ message: `${article.draft ? 'Borrador' : 'Publicar'}: ${title}`, tree: tree.sha, parents: [ref.object.sha] }),
  });
  await github(session.accessToken, `${repoPrefix(config)}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
    method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  const url = `${process.env.PUBLIC_SITE_URL || 'https://alvarorodriguezla.github.io'}/WebCuler/articulos/${slug}/`;
  return { ok: true, draft: article.draft, slug, image, url, commit: commit.sha, message: article.draft ? 'Borrador guardado en GitHub.' : 'Artículo publicado. GitHub Pages empezará a actualizarse en unos instantes.' };
}
