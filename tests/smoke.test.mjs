import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const slugify = (input) => input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
assert.equal(slugify('Perfil Faltante: Álex Remiro'), 'perfil-faltante-alex-remiro');
const home = await readFile('src/pages/index.astro', 'utf8');
const article = await readFile('src/pages/articulos/[slug].astro', 'utf8');
const collection = await readFile('src/content.config.ts', 'utf8');
assert.match(home, /Artículo destacado/);
assert.match(article, /getStaticPaths/);
assert.match(collection, /draft: z\.boolean/);
const coverMappings = [
  ['ataque-del-futuro', '/images/articles/ataque-del-futuro/yan-diomande.jpg'],
  ['el-central-de-flick', '/images/articles/el-central-de-flick/micky-van-de-ven.jpg'],
  ['el-sueno-de-musiala', '/images/articles/el-sueno-de-musiala/jamal-musiala.jpg'],
  ['elevar-el-juego', '/images/articles/elevar-el-juego/alessandro-bastoni.png'],
  ['last-dance', '/images/articles/last-dance/leo-messi-last-dance.jpg'],
  ['lateral-derecho', '/images/articles/lateral-derecho/konrad-laimer.jpg'],
  ['oxigeno-pedri', '/images/articles/oxigeno-pedri/kees-smit.jpg'],
  ['fichajes-2026-2027', '/images/articles/fichajes-2026-2027/mercado-2026-27.webp'],
  ['cerrar-el-mercado', '/images/articles/cerrar-el-mercado/cerrar-mercado.webp'],
  ['cerrar-el-mercado-repartir-el-riesgo', '/images/articles/cerrar-el-mercado/cerrar-mercado.webp'],
  ['cerrar-mercado', '/images/articles/cerrar-mercado-kroupi-asllani-lukeba/mercado.webp'],
  ['la-sorpresa', '/images/articles/la-sorpresa/lennart-karl.webp'],
  ['one-shot', '/images/articles/one-shot/opciones-del-barca-2026-27.webp'],
  ['red-flag', '/images/articles/red-flag/red-flag.webp'],
  ['el-tapado', '/images/articles/el-tapado/andreas-schjelderup.webp'],
  ['el-tapado-andreas-schjelderup', '/images/articles/el-tapado/andreas-schjelderup.webp'],
  ['perfil-faltante', '/images/articles/perfil-faltante/fisnik-asllani.webp'],
  ['perfil-faltante-fisnik-asllani', '/images/articles/perfil-faltante/fisnik-asllani.webp'],
  ['segundo-portero', '/images/articles/segundo-portero/alex-remiro.webp'],
  ['segundo-portero-alex-remiro', '/images/articles/segundo-portero/alex-remiro.webp'],
  ['una-idea-que-compite', '/images/articles/identidad/no-somos-club-idea.webp'],
  ['no-somos-un-club-que-juega-al-futbol-somos-una-idea-que-compite', '/images/articles/identidad/no-somos-club-idea.webp'],
  ['cerrar-mercado-kroupi-asllani-lukeba', '/images/articles/cerrar-mercado-kroupi-asllani-lukeba/mercado.webp'],
  ['one-shot-opciones-para-el-9', '/images/articles/one-shot/opciones-del-barca-2026-27.webp'],
];
for (const [slug, cover] of coverMappings) {
  const markdown = await readFile(`src/content/articles/${slug}.md`, 'utf8');
  assert.match(markdown, new RegExp(`^image: ${cover.replaceAll('/', '\\/')}$`, 'm'), `${slug} points to its selected image`);
  await stat(path.join('public', cover.slice(1)));
}
const articleApi = await readFile('api/articles.mjs', 'utf8');
assert.match(articleApi, /listPublished/);
assert.match(articleApi, /listArticleIndex/);
assert.match(articleApi, /deletePublished/);
console.log('smoke tests: ok');
