import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkArticleBlocks from './src/lib/article-blocks/remark-plugin.mjs';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://1shot-studio.vercel.app',
  base: process.env.BASE_PATH || '',
  output: 'static',
  markdown: { remarkPlugins: [remarkArticleBlocks] },
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
});
