import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { validateArticleBlocks } from '../public/article-blocks.mjs';

const execFileAsync = promisify(execFile);

export function slugify(input) {
  return String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'articulo';
}

function yamlString(value) { return JSON.stringify(value ?? ''); }
function excerptFrom(markdown) { return String(markdown).replace(/(^|\n)```(?:oneshot|tactic|tactic-comparison|stats|insight|oneshot-svg)[^\n]*\n[\s\S]*?\n```(?=\n|$)/g, '\n').replace(/[#>*_`\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220); }
function readingTime(markdown) { return Math.max(1, Math.ceil(String(markdown).replace(/(^|\n)```(?:oneshot|tactic|tactic-comparison|stats|insight|oneshot-svg)[^\n]*\n[\s\S]*?\n```(?=\n|$)/g, '\n').trim().split(/\s+/).filter(Boolean).length / 220)); }
function safeFileName(name) { return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-'); }

export function articleMarkdown({ title, slug, date, excerpt, image, imageAlt, category, tags, subtitle, subject, season, featured, evergreen, draft, showPlayerPhotos, imageFit, imagePosition, archive, text }) {
  const tagsYaml = `[${tags.map((tag) => yamlString(tag)).join(', ')}]`;
  return `---\ntitle: ${yamlString(title)}\nslug: ${slug}\ndate: ${yamlString(date)}\nexcerpt: ${yamlString(excerpt)}\nimage: ${image}\nimageAlt: ${yamlString(imageAlt)}\ncategory: ${yamlString(category || 'Análisis')}\ntags: ${tagsYaml}\n${subtitle ? `subtitle: ${yamlString(subtitle)}\n` : ''}${subject ? `subject: ${yamlString(subject)}\n` : ''}${season ? `season: ${yamlString(season)}\n` : ''}featured: ${Boolean(featured)}\nevergreen: ${Boolean(evergreen)}\ndraft: ${Boolean(draft)}\nshowPlayerPhotos: ${Boolean(showPlayerPhotos)}\nreadingTime: ${readingTime(text)}\nimageFit: ${imageFit || 'contain'}\nimagePosition: ${imagePosition || 'center'}\n${archive ? `archive: ${archive}\n` : ''}---\n\n${String(text || '').trim()}\n`;
}

function readScalar(value) {
  const input = String(value || '').trim();
  try { if (input.startsWith('"') || input.startsWith('[')) return JSON.parse(input); } catch { /* preserve legacy plain strings */ }
  if (input === 'true') return true;
  if (input === 'false') return false;
  return input;
}

export function parseLocalArticle(markdown) {
  const match = String(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('El borrador local no tiene frontmatter válido.');
  const article = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (field) article[field[1]] = readScalar(field[2]);
  }
  return { ...article, text: match[2].replace(/^\r?\n/, '').replace(/\r?\n$/, '') };
}

export async function listLocalDrafts(root) {
  const directory = path.join(root, 'src', 'content', 'articles');
  const files = await readdir(directory).catch(() => []);
  const drafts = [];
  for (const filename of files.filter((name) => name.endsWith('.md'))) {
    try {
      const article = parseLocalArticle(await readFile(path.join(directory, filename), 'utf8'));
      if (article.draft === true) drafts.push({ title: article.title, date: article.date, slug: filename.slice(0, -3) });
    } catch { /* malformed unrelated articles stay out of the draft picker */ }
  }
  return drafts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function loadLocalDraft(root, slug) {
  const safeSlug = slugify(slug);
  if (safeSlug !== slug) { const error = new Error('El identificador del borrador no es válido.'); error.status = 400; throw error; }
  const article = parseLocalArticle(await readFile(path.join(root, 'src', 'content', 'articles', `${safeSlug}.md`), 'utf8'));
  if (article.draft !== true) { const error = new Error('Solo se pueden reabrir borradores desde el Studio.'); error.status = 404; throw error; }
  return { ...article, slug: safeSlug };
}

export async function saveLocalArticle(form, { root, shouldPublish = false, publicHost = '127.0.0.1', astroPort = 4321, runGit, getGitConfig } = {}) {
  const title = String(form.get('title') || '').trim();
  const text = String(form.get('text') || '').trim();
  const image = form.get('image');
  const existingImage = String(form.get('existingImage') || '');
  const hasNewImage = image && typeof image.arrayBuffer === 'function' && image.size > 0;
  if (!title || !text || (!hasNewImage && !existingImage)) return { ok: false, status: 400, error: 'Título, texto e imagen son obligatorios.' };
  validateArticleBlocks(text);
  if (title.length > 180 || text.length > 100_000) return { ok: false, status: 400, error: 'El título o el texto supera el tamaño permitido.' };
  if (existingImage && !/^\/(images|uploads)\/[a-zA-Z0-9._-]+$/.test(existingImage)) return { ok: false, status: 400, error: 'La ruta de imagen guardada no es válida.' };
  const slugInput = String(form.get('slug') || '');
  const slug = slugify(slugInput || title);
  if (slugInput && slug !== slugInput) return { ok: false, status: 400, error: 'El identificador del artículo no es válido.' };
  const dateInput = String(form.get('date') || new Date().toISOString().slice(0, 10));
  const parsedDate = new Date(`${dateInput}T12:00:00Z`);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput) && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === dateInput ? dateInput : new Date().toISOString().slice(0, 10);
  const contentDir = path.join(root, 'src', 'content', 'articles');
  const mediaDir = path.join(root, 'src', 'content', 'media');
  const uploadDir = path.join(root, 'public', 'uploads');
  let publicImage = existingImage;
  if (hasNewImage) {
    const originalName = safeFileName(image.name || 'original-image');
    const extension = path.extname(originalName).toLowerCase() || '.jpg';
    const originalPath = path.join(mediaDir, slug, `original${extension}`);
    const uploadName = `${slug}-${Date.now()}`;
    const webPath = `/uploads/${uploadName}.webp`;
    const webFile = path.join(uploadDir, `${uploadName}.webp`);
    publicImage = webPath;
    await mkdir(path.dirname(originalPath), { recursive: true }); await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await image.arrayBuffer());
    await writeFile(originalPath, buffer);
    try { await sharp(buffer).rotate().webp({ quality: 86 }).toFile(webFile); }
    catch { const fallback = `${uploadName}${extension}`; await writeFile(path.join(uploadDir, fallback), buffer); publicImage = `/uploads/${fallback}`; }
    if (!publicImage) publicImage = webPath;
  }
  if (!publicImage) return { ok: false, status: 400, error: 'La ruta de imagen no es válida.' };
  const article = articleMarkdown({
    title, slug, date, excerpt: String(form.get('excerpt') || excerptFrom(text)).trim(), image: publicImage,
    imageAlt: String(form.get('imageAlt') || `Imagen editorial para ${title}`).trim(), category: String(form.get('category') || 'Análisis').trim() || 'Análisis',
    tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean), subtitle: String(form.get('subtitle') || '').trim(), subject: String(form.get('subject') || '').trim(), season: String(form.get('season') || '').trim(),
    featured: form.get('featured') === 'true', evergreen: form.get('evergreen') === 'true', draft: !shouldPublish, showPlayerPhotos: form.get('showPlayerPhotos') === 'true',
    imageFit: String(form.get('imageFit') || 'contain'), imagePosition: String(form.get('imagePosition') || 'center'), archive: String(form.get('archive') || '').trim(), text,
  });
  const markdownPath = path.join(contentDir, `${slug}.md`);
  await mkdir(contentDir, { recursive: true }); await writeFile(markdownPath, article, 'utf8');
  const response = { ok: true, slug, image: publicImage, url: `http://${publicHost}:${astroPort}/articulos/${slug}/`, draft: !shouldPublish, markdownPath: path.relative(root, markdownPath) };
  if (!shouldPublish) return response;
  const git = runGit || ((args) => execFileAsync('git', args, { cwd: root, windowsHide: true }));
  const config = getGitConfig || (async (key) => { try { return (await git(['config', '--get', key])).stdout.trim(); } catch { return ''; } });
  try {
    const gitName = await config('user.name'); const gitEmail = await config('user.email');
    if (!gitName || !gitEmail || gitName === 'Tu nombre' || gitEmail === 'tu-email@ejemplo.com') return { ...response, pushed: false, error: 'El artículo está guardado, pero Git no tiene configurados tu nombre y correo.', command: 'git config --global user.name "Tu nombre"\ngit config --global user.email "tu@email.com"\n\nDespués vuelve a pulsar PUBLICAR Y ENVIAR A GIT.' };
    if (!await config('remote.origin.url')) return { ...response, pushed: false, error: 'El artículo está guardado, pero este repositorio no tiene configurado un remoto origin.', command: 'git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git\ngit push -u origin main\n\nDespués vuelve a pulsar PUBLICAR Y ENVIAR A GIT.' };
    await git(['add', '--', path.relative(root, markdownPath), path.relative(root, uploadDir), path.relative(root, mediaDir)]);
    await git(['commit', '-m', `Publicar: ${title}`]); await git(['push']);
    return { ...response, pushed: true, message: 'Artículo guardado, commit creado y push enviado.' };
  } catch (error) {
    const detail = `${error.stderr || error.message || error}`.toString().trim();
    return { ...response, pushed: false, error: `El artículo está guardado, pero Git no pudo completar la publicación. ${detail}`, command: `git add -- "${path.relative(root, markdownPath)}" "public/uploads" "src/content/media"\ngit commit -m "Publicar: ${title.replaceAll('"', '')}"\ngit push` };
  }
}
