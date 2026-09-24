import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const slugify = (input) => input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
assert.equal(slugify('Perfil Faltante: Álex Remiro'), 'perfil-faltante-alex-remiro');
const home = await readFile('src/pages/index.astro', 'utf8');
const article = await readFile('src/pages/articulos/[slug].astro', 'utf8');
const collection = await readFile('src/content.config.ts', 'utf8');
assert.match(home, /Artículo destacado/);
assert.match(article, /getStaticPaths/);
assert.match(collection, /draft: z\.boolean/);
console.log('smoke tests: ok');
