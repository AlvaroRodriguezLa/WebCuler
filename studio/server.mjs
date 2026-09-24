import { createServer } from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const port = 4322;
const astroPort = 4321;
const studioDir = path.join(root, 'studio');
const contentDir = path.join(root, 'src', 'content', 'articles');
const mediaDir = path.join(root, 'src', 'content', 'media');
const uploadDir = path.join(root, 'public', 'uploads');

function slugify(input) {
  return input.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'articulo';
}
function yamlString(value) { return JSON.stringify(value ?? ''); }
function excerptFrom(markdown) { return markdown.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 220); }
function readingTime(markdown) { return Math.max(1, Math.ceil(markdown.trim().split(/\s+/).filter(Boolean).length / 220)); }
function safeFileName(name) { return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-'); }

function articleMarkdown({ title, slug, date, excerpt, image, imageAlt, category, tags, subtitle, subject, season, featured, evergreen, draft, imageFit, imagePosition, archive, text }) {
  const tagsYaml = `[${tags.map((tag) => yamlString(tag)).join(', ')}]`;
  return `---\ntitle: ${yamlString(title)}\nslug: ${slug}\ndate: ${yamlString(date)}\nexcerpt: ${yamlString(excerpt)}\nimage: ${image}\nimageAlt: ${yamlString(imageAlt)}\ncategory: ${yamlString(category || 'Análisis')}\ntags: ${tagsYaml}\n${subtitle ? `subtitle: ${yamlString(subtitle)}\n` : ''}${subject ? `subject: ${yamlString(subject)}\n` : ''}${season ? `season: ${yamlString(season)}\n` : ''}featured: ${Boolean(featured)}\nevergreen: ${Boolean(evergreen)}\ndraft: ${Boolean(draft)}\nreadingTime: ${readingTime(text)}\nimageFit: ${imageFit || 'contain'}\nimagePosition: ${imagePosition || 'center'}\n${archive ? `archive: ${archive}\n` : ''}---\n\n${text.trim()}\n`;
}

async function runGit(args) { return execFileAsync('git', args, { cwd: root, windowsHide: true }); }

async function saveArticle(form, shouldPublish) {
  const title = String(form.get('title') || '').trim();
  const text = String(form.get('text') || '').trim();
  const image = form.get('image');
  if (!title || !text || !image || typeof image.arrayBuffer !== 'function' || image.size === 0) return { ok: false, status: 400, error: 'Título, texto e imagen son obligatorios.' };
  const slug = slugify(String(form.get('slug') || title));
  const date = String(form.get('date') || new Date().toISOString().slice(0, 10));
  const category = String(form.get('category') || 'Análisis').trim() || 'Análisis';
  const excerpt = String(form.get('excerpt') || excerptFrom(text)).trim();
  const imageAlt = String(form.get('imageAlt') || `Imagen editorial para ${title}`).trim();
  const tags = String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  const originalName = safeFileName(image.name || 'original-image');
  const extension = path.extname(originalName).toLowerCase() || '.jpg';
  const originalPath = path.join(mediaDir, slug, `original${extension}`);
  const uploadName = `${slug}-${Date.now()}`;
  const webPath = `/uploads/${uploadName}.webp`;
  const webFile = path.join(uploadDir, `${uploadName}.webp`);
  await mkdir(path.dirname(originalPath), { recursive: true }); await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await image.arrayBuffer());
  await writeFile(originalPath, buffer);
  let publicImage = webPath;
  try { await sharp(buffer).rotate().webp({ quality: 86 }).toFile(webFile); }
  catch { const fallback = `${uploadName}${extension}`; await writeFile(path.join(uploadDir, fallback), buffer); publicImage = `/uploads/${fallback}`; }
  const article = articleMarkdown({ title, slug, date, excerpt, image: publicImage, imageAlt, category, tags, subtitle: String(form.get('subtitle') || '').trim(), subject: String(form.get('subject') || '').trim(), season: String(form.get('season') || '').trim(), featured: form.get('featured') === 'true', evergreen: form.get('evergreen') === 'true', draft: !shouldPublish, imageFit: String(form.get('imageFit') || 'contain'), imagePosition: String(form.get('imagePosition') || 'center'), archive: String(form.get('archive') || '').trim(), text });
  const markdownPath = path.join(contentDir, `${slug}.md`);
  await mkdir(contentDir, { recursive: true }); await writeFile(markdownPath, article, 'utf8');
  const response = { ok: true, slug, url: `http://127.0.0.1:${astroPort}/articulos/${slug}/`, draft: !shouldPublish, markdownPath: path.relative(root, markdownPath) };
  if (!shouldPublish) return response;
  try {
    await runGit(['add', '--', path.relative(root, markdownPath), path.relative(root, uploadDir), path.relative(root, mediaDir)]);
    await runGit(['commit', '-m', `Publicar: ${title}`]); await runGit(['push']);
    return { ...response, pushed: true, message: 'Artículo guardado, commit creado y push enviado.' };
  } catch (error) {
    const detail = `${error.stderr || error.message || error}`.toString().trim();
    return { ...response, pushed: false, error: `El artículo está guardado, pero Git no pudo completar la publicación. ${detail}`, command: `git add -- "${path.relative(root, markdownPath)}" "public/uploads" "src/content/media" && git commit -m "Publicar: ${title.replaceAll('"', '')}" && git push` };
  }
}

function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(payload)); }
async function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(studioDir, `.${requested}`);
  if (!filePath.startsWith(studioDir) || !existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
  const content = await readFile(filePath); const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' }); res.end(content);
}

const astroCli = path.join(root, 'node_modules', 'astro', 'astro.js');
const astro = spawn(process.execPath, [astroCli, 'dev', '--host', '127.0.0.1', '--port', String(astroPort)], { cwd: root, stdio: 'inherit', windowsHide: true });
const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/articles') { const form = await req.formData(); const result = await saveArticle(form, form.get('action') === 'publish'); json(res, result.ok ? 200 : result.status || 500, result); return; }
    await serveStatic(req, res);
  } catch (error) { json(res, 500, { ok: false, error: error.message }); }
});
server.listen(port, '127.0.0.1', () => console.log(`Studio local: http://127.0.0.1:${port}`));
function close() { server.close(); astro.kill(); }
process.on('SIGINT', close); process.on('SIGTERM', close);
