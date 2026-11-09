import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const contentDir = path.resolve('src/content/articles');
const publicDir = path.resolve('public');
const outputDir = path.join(publicDir, 'social');
await fs.mkdir(outputDir, { recursive: true });

// La tarjeta para X y Open Graph muestra la portada real del artículo.
// Mantener la imagen completa evita cortar retratos, esquemas tácticos y carteles.
async function generateCoverCard(cover, outputFile) {
  if (typeof cover !== 'string' || !cover.startsWith('/') || cover.startsWith('//')) return false;
  if (cover === '/images/editorial-placeholder.svg') return false;

  const imagePath = path.resolve(publicDir, '.' + cover);
  if (!imagePath.startsWith(publicDir + path.sep)) return false;

  try {
    await sharp(imagePath)
      .rotate()
      .resize(1200, 630, { fit: 'contain', background: '#e7e5df' })
      .png({ compressionLevel: 9 })
      .toFile(outputFile);
    return true;
  } catch (error) {
    console.warn(`[social] No se pudo procesar ${cover}: ${error.message}`);
    return false;
  }
}

function frontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  const values = {};
  for (const line of match?.[1]?.split('\n') || []) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    values[key] = value;
  }
  return values;
}

function escapeXml(value = '') {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function wrap(value, max = 25) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

const files = (await fs.readdir(contentDir)).filter((file) => file.endsWith('.md'));
const generatedSlugs = new Set();
for (const file of files) {
  const data = frontmatter(await fs.readFile(path.join(contentDir, file), 'utf8'));
  if (data.draft === 'true' || data.redirectTo) continue;
  const slug = data.slug || file.replace(/\.md$/, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Slug de artículo no válido: ${slug}`);
  }
  generatedSlugs.add(slug);
  const outputFile = path.join(outputDir, `${slug}.png`);
  if (await generateCoverCard(data.image, outputFile)) {
    console.log(`[social] ${slug}: portada del artículo`);
    continue;
  }
  console.warn(`[social] ${slug}: tarjeta editorial de reserva`);
  const titleLines = wrap(data.title || 'ONE SHOT');
  const title = titleLines.map((line, index) => `<text x="72" y="${174 + index * 78}" fill="#20201f" font-family="Arial,Helvetica,sans-serif" font-size="68" font-weight="700">${escapeXml(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#e7e5df"/>
    <line x1="760" y1="52" x2="760" y2="578" stroke="#898780" stroke-width="2"/>
    <rect x="808" y="52" width="320" height="420" fill="#d8d5ce" stroke="#898780" stroke-width="2"/>
    <path d="M808 180h320M808 330h320M915 52v420M1022 52v420" stroke="#898780" stroke-width="2" opacity=".7"/>
    <text x="72" y="82" fill="#65645f" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="6">ONE SHOT / ${escapeXml(data.category || 'ANÁLISIS')}</text>
    ${title}
    <line x1="72" y1="390" x2="690" y2="390" stroke="#898780" stroke-width="2"/>
    <text x="72" y="435" fill="#65645f" font-family="Arial,Helvetica,sans-serif" font-size="17" letter-spacing="4">${escapeXml(data.season || 'FÚTBOL / IDENTIDAD / TÁCTICA')}</text>
    <text x="72" y="540" fill="#20201f" font-family="Arial,Helvetica,sans-serif" font-size="22" letter-spacing="6">SCARFACE2824</text>
    <text x="842" y="535" fill="#8c201d" font-family="Arial,Helvetica,sans-serif" font-size="18" letter-spacing="4">IMAGEN EDITORIAL</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outputFile);
}

for (const file of await fs.readdir(outputDir)) {
  if (file.endsWith('.png') && !generatedSlugs.has(file.replace(/\.png$/, ''))) {
    await fs.rm(path.join(outputDir, file));
  }
}
