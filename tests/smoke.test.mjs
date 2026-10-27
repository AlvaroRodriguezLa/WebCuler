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
  ['cerrar-el-mercado-repartir-el-riesgo', '/images/articles/cerrar-el-mercado-repartir-el-riesgo/cover.webp'],
  ['la-sorpresa', '/images/articles/la-sorpresa/cover.webp'],
  ['one-shot', '/images/articles/one-shot/cover.webp'],
  ['red-flag', '/images/articles/red-flag/cover.webp'],
  ['el-tapado', '/images/articles/el-tapado/cover.webp'],
  ['el-tapado-andreas-schjelderup', '/images/articles/el-tapado-andreas-schjelderup/cover.webp'],
  ['perfil-faltante', '/images/articles/perfil-faltante/cover.webp'],
  ['perfil-faltante-fisnik-asllani', '/images/articles/perfil-faltante-fisnik-asllani/cover.webp'],
  ['segundo-portero', '/images/articles/segundo-portero/cover.webp'],
  ['segundo-portero-alex-remiro', '/images/articles/segundo-portero-alex-remiro/cover.webp'],
  ['una-idea-que-compite', '/images/articles/una-idea-que-compite/cover.webp'],
  ['no-somos-un-club-que-juega-al-futbol-somos-una-idea-que-compite', '/images/articles/identidad/no-somos-club-idea.webp'],
  ['cerrar-mercado-kroupi-asllani-lukeba', '/images/articles/cerrar-mercado-kroupi-asllani-lukeba/cover.webp'],
  ['one-shot-opciones-para-el-9', '/images/articles/one-shot-opciones-para-el-9/cover.webp'],
  ['nueve-total', '/images/articles/nueve-total/cover.webp'],
  ['el-nuevo-raphinha', '/images/articles/el-nuevo-raphinha/cover.webp'],
  ['tercer-central', '/images/articles/tercer-central/cover.webp'],
  ['pieza-clave', '/images/articles/pieza-clave/cover.webp'],
  ['club-hermano', '/images/articles/club-hermano/cover.webp'],
  ['no-hay-vuelta-atras', '/images/articles/no-hay-vuelta-atras/cover.webp'],
  ['el-quinto-medio', '/images/articles/el-quinto-medio/cover.webp'],
  ['tomar-riesgos', '/images/articles/tomar-riesgos/cover.webp'],
  ['tomar-riesgos-julian-kroupi', '/images/articles/tomar-riesgos-julian-kroupi/cover.webp'],
  ['solucion-en-casa', '/images/articles/solucion-en-casa/cover.webp'],
  ['cerrar-mercado', '/images/articles/cerrar-mercado/cover.webp'],
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
