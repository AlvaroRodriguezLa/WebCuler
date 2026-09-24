import rss from '@astrojs/rss';
import { getPublishedArticles } from '../lib/content';
import { siteConfig } from '../config/site';

export async function GET(context) {
  const articles = await getPublishedArticles();
  return rss({
    title: siteConfig.name,
    description: siteConfig.description,
    site: context.site || siteConfig.baseUrl,
    items: articles.map(({ data }) => ({ title: data.title, description: data.excerpt, pubDate: data.date, link: `/articulos/${data.slug}/` })),
  });
}
