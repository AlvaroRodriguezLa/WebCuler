import { getCollection } from 'astro:content';
import { categorySlug } from '../config/site';

export async function getPublishedArticles() {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  return articles.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function articlePath(slug: string) {
  return `/articulos/${slug}/`;
}

export function categoryPath(category: string) {
  return `/categorias/${categorySlug(category)}/`;
}

export function readingTime(markdown: string) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
